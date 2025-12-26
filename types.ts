
export type GradingMode = 'content' | 'communicative' | 'organisation' | 'language' | 'general' | 'select' | 'stamper';
export type Part = '1' | '2' | '3';

export interface Point {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Annotation {
  id: string;
  mode: GradingMode;
  pageIndex: number;
  // Content mode: dot (points) or rect (errors like LOG, MP)
  // Others: rect
  type: 'dot' | 'rect' | 'stamp'; 
  
  // For Dot type
  x?: number;
  y?: number;
  
  // For Rect type (supports multiple areas for multiline selections)
  rects?: Rect[]; 

  text?: string; // Comment
  code?: string; // For errors (SP, GR, LOG, CON, etc.)
  correction?: string; // For correction suggestion
  number?: number; // For content points sequence
  isElaboration?: boolean; // For content sub-points (e.g. 1a, 1b)

  // For Stamp type
  stampData?: {
    scores: StudentScore;
    total: number;
    grader: string;
    date: string;
  };
}

export interface StudentScore {
  content: number;
  communicative: number;
  organisation: number;
  language: number;
}

export interface Student {
  id: string;
  name: string;
  images: string[]; // Base64 data URLs of essay pages
  annotations: Annotation[];
  scores: StudentScore;
  justifications: {
    content: string;
    communicative: string;
    organisation: string;
    language: string;
  };
  timeSpent: number; // in seconds
}

export interface SessionData {
  name: string;
  graderName?: string; // Added grader name
  level: string;
  part: Part;
  taskDescription: string;
  students: Student[];
  createdAt: string;
  lastStudentIndex?: number;
  lastImageIndex?: number;
}

export interface RubricRow {
  score: number;
  desc: string;
}

export interface ErrorCode {
  code: string;
  label: string;
  mode: GradingMode;
  description?: string;
}