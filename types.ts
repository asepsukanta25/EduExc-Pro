
export enum QuestionType {
  PilihanGanda = 'Pilihan Ganda',
  MCMA = 'Pilihan Jamak (MCMA)',
  BenarSalah = '(Benar/Salah)',
  SesuaiTidakSesuai = '(Sesuai/Tidak Sesuai)',
  Isian = 'ISIAN',
  Uraian = 'URAIAN'
}

export type EduCBTQuestion = {
  id: string;
  type: string;
  level: string;
  subject: string;
  phase: string;
  material: string;
  text: string;
  explanation: string;
  options: string[];
  correctAnswer: any;
  optionsDisplay?: 'list' | 'grid'; // New property for layout control
  tfLabels?: {
    true: string;
    false: string;
  };
  isDeleted: boolean;
  createdAt: number;
  order: number;
  quizToken: string;
  image?: string; 
  optionImages?: (string | null)[];
  isRegenerating?: boolean;
  teachingMaterial?: string; // Properti baru untuk menyimpan materi ajar per token
};

export interface StudentInfo {
  name: string;
  className: string;
  school: string;
  birthDate: string;
  token: string;
}

export interface ExamResponse {
  questionId: string;
  answer: any;
  isCorrect: boolean;
  score: number;
  maxScore: number;
  feedback?: string; 
}

export interface GenerationConfig {
  subject: string;
  phase: string;
  material: string;
  typeCounts: Record<string, number>;
  levelCounts: Record<string, number>;
  quizToken: string;
  referenceText?: string;
  referenceImage?: {
    data: string; // base64 string
    mimeType: string;
  };
  specialInstructions?: string;
}
