import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
  Plus, Upload, Database, History, Download, Copy, Trash2, 
  CheckCircle, FileText, Calendar, Tag, GraduationCap, 
  LayoutTemplate, ChevronDown, X, RefreshCcw, Clock, 
  Search, MoreHorizontal, ArrowRight, Layers, UserCircle
} from 'lucide-react';
import { SessionRecord, StorageStats, storage } from '../services/storageService';
import { Part } from '../types';
import { Button } from '../components/Button';
import { Logo } from '../components/Logo';
import { Tooltip } from '../components/Tooltip';

// --- Helper Functions ---
function timeAgo(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + "y ago";
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + "mo ago";
  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + "d ago";
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + "h ago";
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + "m ago";
  return "just now";
}

// --- Modals ---

const DeleteConfirmationModal = ({ 
  onCancel, 
  onConfirm 
}: { 
  onCancel: () => void; 
  onConfirm: () => void; 
}) => {
  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl shadow-2xl max-w-sm w-full mx-4 animate-scale-in">
        <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mb-4 border border-red-500/20">
          <Trash2 size={24} className="text-red-500" />
        </div>
        <h3 className="text-lg font-bold text-white mb-2">Delete Session?</h3>
        <p className="text-zinc-400 text-sm mb-6 leading-relaxed">This action cannot be undone. All student scripts and annotations will be permanently removed.</p>
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={onCancel}>Cancel</Button>
          <Button variant="danger" onClick={onConfirm}>Delete Permanently</Button>
        </div>
      </div>
    </div>,
    document.body
  );
};

const StorageManagerModal = ({ 
  onClose,
  onClearCache
}: { 
  onClose: () => void,
  onClearCache: () => Promise<void>
}) => {
  const [stats, setStats] = useState<StorageStats | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshStats = async () => {
    setLoading(true);
    const s = await storage.getStorageStats();
    setStats(s);
    setLoading(false);
  };

  useEffect(() => {
    refreshStats();
  }, []);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleClear = async () => {
    if (confirm("Clear all processed image cache? This will not delete original scripts.")) {
      await onClearCache();
      refreshStats();
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-md animate-fade-in">
      <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-3xl shadow-2xl max-w-md w-full mx-4 animate-scale-in">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center border border-zinc-700">
              <Database size={20} className="text-rose-500" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white leading-none">Storage</h3>
              <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mt-1">Local Disk Usage</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-full text-zinc-500 transition-colors"><X size={20}/></button>
        </div>

        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center space-y-4">
            <div className="animate-spin w-8 h-8 border-2 border-rose-500 border-t-transparent rounded-full" />
          </div>
        ) : stats && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-zinc-950/50 p-4 rounded-2xl border border-zinc-800">
                <p className="text-[10px] font-black text-zinc-600 uppercase mb-1">Sessions</p>
                <p className="text-xl font-bold text-white">{stats.sessionCount}</p>
              </div>
              <div className="bg-zinc-950/50 p-4 rounded-2xl border border-zinc-800">
                <p className="text-[10px] font-black text-zinc-600 uppercase mb-1">Cache</p>
                <p className="text-xl font-bold text-rose-500">{formatBytes(stats.cacheSize)}</p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                 <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Total</span>
                 <span className="text-sm font-bold text-white">{formatBytes(stats.totalSize)}</span>
              </div>
              <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-rose-600 rounded-full" 
                  style={{ width: `${Math.min(100, (stats.totalSize / (100 * 1024 * 1024)) * 100)}%` }} 
                />
              </div>
            </div>

            <div className="pt-4 border-t border-zinc-800 flex flex-col gap-3">
              <Button variant="secondary" className="w-full" onClick={handleClear} icon={<RefreshCcw size={16}/>}>Clear Cache</Button>
              <Button variant="ghost" className="w-full text-zinc-500" onClick={onClose}>Close</Button>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};

// --- Main Component ---

export interface SetupScreenProps {
  greeting: string;
  onNewSession: () => void;
  sessionName: string;
  onSessionNameChange: (name: string) => void;
  graderName: string;
  onGraderNameChange: (name: string) => void;
  level: string;
  onLevelChange: (level: string) => void;
  part: Part;
  onPartChange: (part: Part) => void;
  savedSessions: SessionRecord[];
  onResumeSession: (session: SessionRecord) => void;
  onDeleteSession: (id: string, e: React.MouseEvent) => void;
  sessionToDelete: string | null;
  onCancelDeleteSession: () => void;
  onConfirmDeleteSession: () => void;
  onDuplicateSession: (session: SessionRecord, e: React.MouseEvent) => void;
  onExportSession: (session: SessionRecord, e: React.MouseEvent) => void;
  onImportSession: (e: React.ChangeEvent<HTMLInputElement>) => void;
  devModeUnlocked: boolean;
  onLogoClick: () => void;
  showStorageManager: boolean;
  onShowStorageManager: (show: boolean) => void;
  onClearCache: () => Promise<void>;
}

export const SetupScreen: React.FC<SetupScreenProps> = ({
  greeting,
  onNewSession,
  sessionName,
  onSessionNameChange,
  graderName,
  onGraderNameChange,
  level,
  onLevelChange,
  part,
  onPartChange,
  savedSessions,
  onResumeSession,
  onDeleteSession,
  sessionToDelete,
  onCancelDeleteSession,
  onConfirmDeleteSession,
  onDuplicateSession,
  onExportSession,
  onImportSession,
  devModeUnlocked,
  onLogoClick,
  showStorageManager,
  onShowStorageManager,
  onClearCache
}) => {
  const importInputRef = useRef<HTMLInputElement>(null);
  const [historySearch, setHistorySearch] = useState('');

  // Form level determination for Part availability
  const isLowerForm = level.includes('Form 1') || level.includes('Form 2') || level.includes('Form 3');
  const availableParts: Part[] = isLowerForm ? ['1', '2'] : ['1', '2', '3'];

  // Handle auto-reset of part if user switches to a form where current part is invalid
  useEffect(() => {
    if (!availableParts.includes(part)) {
      onPartChange('1');
    }
  }, [level, part, availableParts, onPartChange]);

  const levels = [
    { id: 'Form 1 (A2 Revise)', label: 'Form 1', sub: 'A2 Revise' },
    { id: 'Form 2 (A2 High)', label: 'Form 2', sub: 'A2 High' },
    { id: 'Form 3 (B1 Low)', label: 'Form 3', sub: 'B1 Low' },
    { id: 'Form 4 (B1 Mid)', label: 'Form 4', sub: 'B1 Mid' },
    { id: 'Form 5 (B1 High)', label: 'Form 5', sub: 'B1 High' },
  ];

  const filteredSessions = savedSessions.filter(s => 
    s.name.toLowerCase().includes(historySearch.toLowerCase()) || 
    s.level.toLowerCase().includes(historySearch.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-200 selection:bg-rose-500/30 font-sans flex flex-col relative overflow-hidden">
      
      {/* Background Decor */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] text-rose-600 animate-pulse-glow">
          <Logo size="100%" className="opacity-10" />
        </div>
        <div className="absolute inset-0 bg-noise z-10"></div>
      </div>

      {/* Navbar */}
      <header className="px-6 py-5 flex items-center justify-between border-b border-zinc-900/50 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-3 cursor-pointer group" onClick={onLogoClick}>
            <Logo size={28} className="text-rose-600 transition-transform group-hover:scale-110" />
            <h1 className="font-bold text-lg tracking-tight text-white hidden sm:block">Rambutan</h1>
        </div>
        <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => onShowStorageManager(true)} icon={<Database size={14}/>}>Storage</Button>
            <Button variant="secondary" size="sm" onClick={() => importInputRef.current?.click()} icon={<Upload size={14}/>}>Import</Button>
        </div>
      </header>

      <div className="flex-1 max-w-[1600px] w-full mx-auto p-4 md:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 relative z-10">
        
        {/* Left Col: Create Session */}
        <div className="lg:col-span-7 flex flex-col space-y-8 animate-fade-in-up">
            <div className="space-y-1">
                <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight">{greeting}.</h2>
                <p className="text-zinc-500 font-medium">Ready to grade some essays?</p>
            </div>

            <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-3xl p-1 md:p-2 backdrop-blur-sm">
                <div className="bg-zinc-950/80 border border-zinc-800/50 rounded-2xl p-6 md:p-8 space-y-8 shadow-2xl backdrop-blur-xl">
                    
                    {/* Session Name Input */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1 flex items-center gap-2">
                                <Tag size={12}/> Session Name
                            </label>
                            <input 
                                type="text" 
                                className="w-full bg-transparent border-b-2 border-zinc-800 px-0 py-2 text-xl md:text-2xl font-bold text-white focus:outline-none focus:border-rose-500 placeholder-zinc-800 transition-colors" 
                                placeholder="e.g. 5 Alpha Mid-Term" 
                                value={sessionName}
                                onChange={e => onSessionNameChange(e.target.value)}
                                autoFocus
                            />
                        </div>
                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1 flex items-center gap-2">
                                <UserCircle size={12}/> Grader Name
                            </label>
                            <input 
                                type="text" 
                                className="w-full bg-transparent border-b-2 border-zinc-800 px-0 py-2 text-xl md:text-2xl font-bold text-white focus:outline-none focus:border-emerald-500 placeholder-zinc-800 transition-colors" 
                                placeholder="Your Name" 
                                value={graderName}
                                onChange={e => onGraderNameChange(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Level Selector */}
                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1 flex items-center gap-2">
                                <GraduationCap size={12} /> Level
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                                {levels.map((l) => (
                                    <button
                                        key={l.id}
                                        onClick={() => onLevelChange(l.id)}
                                        className={`relative px-3 py-2.5 rounded-xl border text-left transition-all ${
                                            level === l.id 
                                            ? 'bg-zinc-800/80 border-zinc-600 ring-1 ring-zinc-500 shadow-lg backdrop-blur-sm' 
                                            : 'bg-zinc-900/40 border-zinc-800 text-zinc-500 hover:bg-zinc-800/60 hover:border-zinc-700'
                                        }`}
                                    >
                                        <div className={`text-sm font-bold ${level === l.id ? 'text-white' : 'text-zinc-400'}`}>{l.label}</div>
                                        <div className="text-[10px] font-medium opacity-60 uppercase">{l.sub}</div>
                                        {level === l.id && <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]"></div>}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Part Selector */}
                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1 flex items-center gap-2">
                                <Layers size={12} /> Part
                            </label>
                            <div className="grid grid-cols-1 gap-2">
                                {(['1', '2', '3'] as Part[]).map((p) => {
                                    const isDisabled = !availableParts.includes(p);
                                    const isSelected = part === p;
                                    return (
                                        <button
                                            key={p}
                                            disabled={isDisabled}
                                            onClick={() => onPartChange(p)}
                                            className={`flex items-center px-4 py-3 rounded-xl border transition-all ${
                                                isDisabled
                                                ? 'opacity-30 cursor-not-allowed bg-zinc-900 border-zinc-800'
                                                : isSelected
                                                    ? 'bg-zinc-800/80 border-zinc-600 ring-1 ring-zinc-500 shadow-lg backdrop-blur-sm'
                                                    : 'bg-zinc-900/40 border-zinc-800 hover:bg-zinc-800/60 hover:border-zinc-700'
                                            }`}
                                        >
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-lg mr-4 border ${
                                                isSelected ? 'bg-zinc-200 text-zinc-900 border-white shadow-sm' : 'bg-zinc-800 text-zinc-500 border-zinc-700'
                                            }`}>
                                                {p}
                                            </div>
                                            <div className="text-left">
                                                <div className={`text-xs font-bold uppercase tracking-wide ${isSelected ? 'text-white' : 'text-zinc-400'}`}>Part {p}</div>
                                                <div className="text-[10px] text-zinc-600">
                                                    {p === '1' ? 'Short Communicative Message' : p === '2' ? 'Guided Writing' : 'Extended Writing'}
                                                </div>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    <div className="pt-4">
                         <Button 
                            className="w-full py-4 text-base rounded-xl font-bold shadow-xl shadow-rose-900/20 active:scale-[0.99] transition-transform" 
                            onClick={() => sessionName ? onNewSession() : alert('Please enter a session name.')}
                            icon={<ArrowRight size={20} />}
                         >
                            Start Grading
                         </Button>
                    </div>
                </div>
            </div>
        </div>

        {/* Right Col: History */}
        <div className="lg:col-span-5 flex flex-col h-full min-h-[500px] animate-fade-in-up" style={{ animationDelay: '100ms' }}>
            <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-3xl p-6 flex flex-col h-full backdrop-blur-xl">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-sm font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                        <History size={14} /> History
                    </h2>
                    <div className="relative group">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-zinc-400" />
                        <input 
                            type="text" 
                            placeholder="Search..." 
                            value={historySearch}
                            onChange={(e) => setHistorySearch(e.target.value)}
                            className="bg-zinc-950 border border-zinc-800 rounded-full py-1.5 pl-9 pr-4 text-xs font-medium text-white placeholder-zinc-700 focus:outline-none focus:border-zinc-600 w-32 focus:w-48 transition-all"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-3">
                    {filteredSessions.length > 0 ? (
                        filteredSessions.map(s => {
                            const progress = s.students.length > 0 ? Math.round((s.students.filter(st => (Object.values(st.scores) as number[]).some(sc => sc > 0)).length / s.students.length) * 100) : 0;
                            return (
                                <div 
                                    key={s.id}
                                    onClick={() => onResumeSession(s)}
                                    className="group relative bg-zinc-900/50 border border-zinc-800 hover:border-zinc-700 rounded-2xl p-4 pb-5 cursor-pointer transition-all hover:shadow-lg hover:bg-zinc-800/80 overflow-hidden"
                                >
                                    <div className="flex justify-between items-start mb-3">
                                        <div>
                                            <h3 className="font-bold text-zinc-200 group-hover:text-white truncate max-w-[200px]">{s.name}</h3>
                                            <p className="text-[10px] text-zinc-500 mt-1 flex items-center gap-2">
                                                <Clock size={10} /> {timeAgo(s.createdAt)}
                                            </p>
                                        </div>
                                        <div className={`px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-tight shadow-sm border ${
                                            progress === 100 
                                            ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' 
                                            : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                                        }`}>
                                            {progress === 100 ? 'Completed' : `${progress}%`}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 mb-4">
                                        <span className="text-[10px] font-bold bg-zinc-950 px-2 py-1 rounded border border-zinc-800 text-zinc-400">{s.level.split('(')[0].trim()}</span>
                                        <span className="text-[10px] font-bold bg-zinc-950 px-2 py-1 rounded border border-zinc-800 text-zinc-400">Part {s.part}</span>
                                        <span className="text-[10px] font-bold text-zinc-600 px-1">{s.students.length} students</span>
                                    </div>

                                    {/* Hover Actions */}
                                    <div className="absolute bottom-4 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-zinc-800/90 rounded-lg p-1 border border-zinc-700 shadow-xl backdrop-blur-sm z-10">
                                        <Tooltip content="Duplicate">
                                            <button onClick={(e) => onDuplicateSession(s, e)} className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-700 rounded-md"><Copy size={12}/></button>
                                        </Tooltip>
                                        <Tooltip content="Export">
                                            <button onClick={(e) => onExportSession(s, e)} className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-700 rounded-md"><Download size={12}/></button>
                                        </Tooltip>
                                        <div className="w-px h-3 bg-zinc-700 mx-1"></div>
                                        <Tooltip content="Delete">
                                            <button onClick={(e) => onDeleteSession(s.id, e)} className="p-1.5 text-zinc-400 hover:text-rose-500 hover:bg-rose-500/10 rounded-md"><Trash2 size={12}/></button>
                                        </Tooltip>
                                    </div>
                                    
                                    {/* Progress Bar Background */}
                                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-zinc-800/30 overflow-hidden group-hover:h-1.5 transition-all">
                                        <div 
                                          className={`h-full transition-all duration-500 ease-out ${progress === 100 ? 'bg-emerald-500' : 'bg-rose-600 opacity-60 group-hover:opacity-100'}`} 
                                          style={{ width: `${progress}%` }} 
                                        />
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="flex flex-col items-center justify-center h-48 text-zinc-600 border-2 border-dashed border-zinc-800 rounded-2xl">
                            <History size={24} className="mb-2 opacity-50" />
                            <span className="text-xs font-medium">No sessions found</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
      </div>

      {/* Hidden Import */}
      <input type="file" ref={importInputRef} onChange={onImportSession} className="hidden" accept=".rambutan" />
      
      {/* Modals */}
      {sessionToDelete && <DeleteConfirmationModal onCancel={onCancelDeleteSession} onConfirm={onConfirmDeleteSession} />}
      {showStorageManager && <StorageManagerModal onClose={() => onShowStorageManager(false)} onClearCache={onClearCache} />}
      
      {/* Dev Mode Badge */}
      {devModeUnlocked && (
        <div className="fixed bottom-4 left-4 z-50 animate-fade-in">
          <div className="bg-rose-600 text-white text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded shadow-lg border border-white/20">DEV</div>
        </div>
      )}
    </div>
  );
};