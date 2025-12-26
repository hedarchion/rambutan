
import { SessionData } from '../types';

const DB_NAME = 'RambutanDB';
const DB_VERSION = 2; // Incremented version to add the processed_images store
const STORE_NAME = 'sessions';
const PROCESSED_STORE_NAME = 'processed_images';

export interface SessionRecord extends SessionData {
  id: string;
}

export interface StorageStats {
  sessionSize: number;
  cacheSize: number;
  totalSize: number;
  sessionCount: number;
}

class StorageService {
  private db: IDBDatabase | null = null;

  private async getDB(): Promise<IDBDatabase> {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(PROCESSED_STORE_NAME)) {
          // Key format: "sessionId-studentId-imageIndex"
          db.createObjectStore(PROCESSED_STORE_NAME);
        }
      };

      request.onsuccess = (event) => {
        this.db = (event.target as IDBOpenDBRequest).result;
        resolve(this.db!);
      };

      request.onerror = (event) => {
        reject((event.target as IDBOpenDBRequest).error);
      };
    });
  }

  async saveSession(session: SessionRecord): Promise<void> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.put(session);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (err) {
      console.error("IndexedDB Save Error:", err);
    }
  }

  async getAllSessions(): Promise<SessionRecord[]> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();

        request.onsuccess = () => {
          const results = request.result as SessionRecord[];
          resolve(results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
        };
        request.onerror = () => reject(request.error);
      });
    } catch (err) {
      console.error("IndexedDB Retrieval Error:", err);
      return [];
    }
  }

  async deleteSession(id: string): Promise<void> {
    try {
      const db = await this.getDB();
      // Cleanup routine: Delete session and its orphaned processed images
      await this.deleteProcessedImagesForSession(id);
      
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.delete(id);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (err) {
      console.error("IndexedDB Delete Error:", err);
    }
  }

  // --- Processed Image Cache Methods ---

  async saveProcessedImage(key: string, data: string): Promise<void> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([PROCESSED_STORE_NAME], 'readwrite');
        const store = transaction.objectStore(PROCESSED_STORE_NAME);
        const request = store.put(data, key);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (err) {
      console.error("Cache Save Error:", err);
    }
  }

  async getProcessedImage(key: string): Promise<string | null> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([PROCESSED_STORE_NAME], 'readonly');
        const store = transaction.objectStore(PROCESSED_STORE_NAME);
        const request = store.get(key);
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error);
      });
    } catch (err) {
      console.error("Cache Retrieval Error:", err);
      return null;
    }
  }

  async deleteProcessedImagesForSession(sessionId: string): Promise<void> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([PROCESSED_STORE_NAME], 'readwrite');
        const store = transaction.objectStore(PROCESSED_STORE_NAME);
        const request = store.openKeyCursor();

        request.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest<IDBCursor>).result;
          if (cursor) {
            const key = cursor.key as string;
            if (key.startsWith(`${sessionId}-`)) {
              store.delete(key);
            }
            cursor.continue();
          } else {
            resolve();
          }
        };
        request.onerror = () => reject(request.error);
      });
    } catch (err) {
      console.error("Cache Session Cleanup Error:", err);
    }
  }

  async clearAllProcessedImages(): Promise<void> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([PROCESSED_STORE_NAME], 'readwrite');
        const store = transaction.objectStore(PROCESSED_STORE_NAME);
        const request = store.clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (err) {
      console.error("Cache Clear Error:", err);
    }
  }

  // --- Storage Statistics ---

  async getStorageStats(): Promise<StorageStats> {
    try {
      const db = await this.getDB();
      let sessionSize = 0;
      let cacheSize = 0;
      let sessionCount = 0;

      const getStoreSize = (storeName: string): Promise<number> => {
        return new Promise((resolve) => {
          let size = 0;
          const tx = db.transaction([storeName], 'readonly');
          const store = tx.objectStore(storeName);
          const request = store.openCursor();
          request.onsuccess = (event) => {
            const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
            if (cursor) {
              const value = cursor.value;
              // Very rough estimate of size in bytes
              size += JSON.stringify(value).length * 2; 
              cursor.continue();
            } else {
              resolve(size);
            }
          };
          request.onerror = () => resolve(0);
        });
      };

      const getCount = (storeName: string): Promise<number> => {
        return new Promise((resolve) => {
          const tx = db.transaction([storeName], 'readonly');
          const store = tx.objectStore(storeName);
          const request = store.count();
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => resolve(0);
        });
      };

      sessionSize = await getStoreSize(STORE_NAME);
      cacheSize = await getStoreSize(PROCESSED_STORE_NAME);
      sessionCount = await getCount(STORE_NAME);

      return {
        sessionSize,
        cacheSize,
        totalSize: sessionSize + cacheSize,
        sessionCount
      };
    } catch (err) {
      console.error("Stats Error:", err);
      return { sessionSize: 0, cacheSize: 0, totalSize: 0, sessionCount: 0 };
    }
  }
}

export const storage = new StorageService();
