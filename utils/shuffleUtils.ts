
import { EduCBTQuestion, QuestionType } from "../types";

export const shuffleArray = <T>(array: T[]): T[] => {
  const result = [...array];
  // Fisher-Yates Shuffle Algorithm
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  
  // Jika hasil acak sama persis dengan input (mungkin terjadi pada array kecil), 
  // coba acak sekali lagi secara sederhana jika elemen > 1
  if (result.length > 1 && JSON.stringify(result) === JSON.stringify(array)) {
    result.reverse();
    const last = result.pop()!;
    result.unshift(last);
  }
  
  return result;
};

export const shuffleQuestions = (questions: EduCBTQuestion[]): EduCBTQuestion[] => {
  if (questions.length <= 1) return questions;
  // Kita hanya mengacak urutan elemen dalam array, tanpa mengubah properti 'order' internal soal
  return shuffleArray(questions);
};

export const shuffleQuestionOptions = (q: EduCBTQuestion): EduCBTQuestion => {
  if (!q.options || q.options.length <= 1) return q;
  // Jangan acak tipe isian atau uraian yang tidak punya opsi
  if (q.type === QuestionType.Isian || q.type === QuestionType.Uraian) return q;

  const n = q.options.length;
  const originalIndices = Array.from({ length: n }, (_, i) => i);
  const shuffledIndices = shuffleArray(originalIndices);

  const newOptions = shuffledIndices.map(i => q.options[i]);
  let newCorrectAnswer = q.correctAnswer;

  if (q.type === QuestionType.PilihanGanda) {
    if (typeof q.correctAnswer === 'number') {
      newCorrectAnswer = shuffledIndices.indexOf(q.correctAnswer);
    }
  } else if (q.type === QuestionType.MCMA) {
    if (Array.isArray(q.correctAnswer)) {
      newCorrectAnswer = (q.correctAnswer as number[])
        .map(oldIdx => shuffledIndices.indexOf(oldIdx))
        .sort((a, b) => a - b);
    }
  } else if (q.type === QuestionType.BenarSalah || q.type === QuestionType.SesuaiTidakSesuai) {
    if (Array.isArray(q.correctAnswer)) {
      // Petakan kembali array boolean berdasarkan posisi opsi yang baru
      newCorrectAnswer = shuffledIndices.map(i => (q.correctAnswer as boolean[])[i]);
    }
  }

  return { ...q, options: newOptions, correctAnswer: newCorrectAnswer };
};

export const shuffleAllOptions = (questions: EduCBTQuestion[]): EduCBTQuestion[] => {
  return questions.map(q => shuffleQuestionOptions(q));
};
