
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
  type: 'dot' | 'rect' | 'stamp';

  x?: number;
  y?: number;

  rects?: Rect[];

  text?: string;
  code?: string;
  correction?: string;
  number?: number;
  isElaboration?: boolean;

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
  realName: string;
  part: Part;
  isCover?: boolean;
  images: string[];
  annotations: Annotation[];
  scores: StudentScore;
  justifications: {
    content: string;
    communicative: string;
    organisation: string;
    language: string;
  };
  timeSpent: number;
}

export interface SessionData {
  name: string;
  graderName?: string;
  level: string;
  parts: Part[];
  taskDescriptions: Record<Part, string>;
  taskImages: Record<Part, string>;
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