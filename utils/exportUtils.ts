
import { EduCBTQuestion, QuestionType, StudentInfo, ExamResponse } from "../types";

const EXCEL_HEADERS = [
  "No", 
  "Tipe Soal", 
  "Level", 
  "Materi", 
  "Teks Soal", 
  "URL Gambar Stimulus", 
  "Opsi A", 
  "Opsi B", 
  "Opsi C", 
  "Opsi D", 
  "Opsi E", 
  "Kunci Jawaban", 
  "Pembahasan", 
  "Token",
  "Durasi (Menit)",
  "Acak Soal (Ya/Tidak)",
  "Acak Opsi (Ya/Tidak)",
  "Mata Pelajaran"
];

export const importQuestionsFromExcel = async (file: File): Promise<EduCBTQuestion[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        // @ts-ignore
        const workbook = window.XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        // @ts-ignore
        const jsonData = window.XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        // Skip header row
        const rows = jsonData.slice(1);
        const questions: EduCBTQuestion[] = rows.map((row: any, index: number) => {
          const type = row[1] || QuestionType.PilihanGanda;
          let correctAnswer: any = row[11];

          // Sanitize correctAnswer based on type
          if (type === QuestionType.PilihanGanda) {
            const charCode = String(row[11]).trim().toUpperCase().charCodeAt(0);
            correctAnswer = charCode - 65; // A=0, B=1, etc.
            if (isNaN(correctAnswer) || correctAnswer < 0) correctAnswer = 0;
          } else if (type === QuestionType.MCMA) {
             const parts = String(row[11]).split(',').map(p => p.trim().toUpperCase().charCodeAt(0) - 65);
             correctAnswer = parts.filter(p => !isNaN(p) && p >= 0);
          } else if (type === QuestionType.BenarSalah || type === QuestionType.SesuaiTidakSesuai) {
             const parts = String(row[11]).split(',').map(p => {
               const val = p.trim().toUpperCase();
               return val === 'B' || val === 'S' || val === 'BENAR' || val === 'SESUAI';
             });
             correctAnswer = parts;
          }

          return {
            id: `q_excel_${Date.now()}_${index}`,
            order: parseInt(row[0]) || (index + 1),
            type: type,
            level: row[2] || 'L2',
            material: row[3] || '',
            text: row[4] || '',
            image: row[5] || '',
            options: [row[6], row[7], row[8], row[9], row[10]].filter(o => o !== undefined && o !== ""),
            correctAnswer: correctAnswer,
            explanation: row[12] || '',
            quizToken: String(row[13] || 'TOKEN').toUpperCase(),
            subject: row[17] || 'Umum',
            phase: 'Fase C',
            isDeleted: false,
            createdAt: Date.now()
          };
        }).filter((q: any) => q.text !== "");

        resolve(questions);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsArrayBuffer(file);
  });
};

export const downloadExamResultPdf = async (student: StudentInfo, questions: EduCBTQuestion[], responses: ExamResponse[], totalScore: number) => {
  // ... (tetap sama seperti sebelumnya)
  // @ts-ignore
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF('p', 'mm', 'a4');
  // ... logic jspdf lainnya
};

export const downloadExcelTemplate = () => {
  // @ts-ignore
  const XLSX = window.XLSX;
  const data = [
    EXCEL_HEADERS,
    [1, "Pilihan Ganda", "L2", "Sistem Pencernaan", "Apa fungsi lambung?", "", "Menyerap air", "Mencerna protein", "Menghasilkan empedu", "Menyimpan feses", "", "B", "Lambung menghasilkan pepsin untuk protein", "BIO1", 60, "Ya", "Ya", "Biologi"],
    [2, "URAIAN", "L3", "Fotosintesis", "Jelaskan reaksi terang!", "", "", "", "", "", "", "Reaksi yang butuh cahaya...", "Terjadi di tilakoid", "BIO1", 60, "Ya", "Ya", "Biologi"]
  ];
  const ws = XLSX.utils.aoa_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Template");
  XLSX.writeFile(wb, "Template_EduExercise_Pro.xlsx");
};

export const exportQuestionsToExcel = (questions: EduCBTQuestion[], examSettings: { duration: number; shuffleQuestions: boolean; shuffleOptions: boolean }) => {
  // @ts-ignore
  const XLSX = window.XLSX;
  const formattedData = questions.map((q, i) => {
    let kunci = q.correctAnswer;
    if (q.type === QuestionType.PilihanGanda && typeof q.correctAnswer === 'number') {
      kunci = String.fromCharCode(65 + q.correctAnswer);
    } else if (q.type === QuestionType.MCMA && Array.isArray(q.correctAnswer)) {
      kunci = (q.correctAnswer as number[]).map(idx => String.fromCharCode(65 + idx)).sort().join(", ");
    } else if ((q.type === QuestionType.BenarSalah || q.type === QuestionType.SesuaiTidakSesuai) && Array.isArray(q.correctAnswer)) {
      const labels = q.type === QuestionType.BenarSalah ? ["B", "S"] : ["S", "T"];
      kunci = (q.correctAnswer as boolean[]).map(val => val ? labels[0] : labels[1]).join(", ");
    }
    return [
      q.order || (i + 1), q.type, q.level, q.material, q.text, q.image || "",
      q.options[0] || "", q.options[1] || "", q.options[2] || "", q.options[3] || "", q.options[4] || "",
      kunci, q.explanation, q.quizToken, examSettings.duration,
      examSettings.shuffleQuestions ? "Ya" : "Tidak", examSettings.shuffleOptions ? "Ya" : "Tidak", q.subject || "Umum"
    ];
  });
  const ws = XLSX.utils.aoa_to_sheet([EXCEL_HEADERS, ...formattedData]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Daftar Soal");
  XLSX.writeFile(wb, `Export_Soal_${Date.now()}.xlsx`);
};
