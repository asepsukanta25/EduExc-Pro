
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

        const rows = jsonData.slice(1);
        const questions: EduCBTQuestion[] = rows.map((row: any, index: number) => {
          const type = row[1] || QuestionType.PilihanGanda;
          let correctAnswer: any = row[11];

          if (type === QuestionType.PilihanGanda) {
            const charCode = String(row[11]).trim().toUpperCase().charCodeAt(0);
            correctAnswer = charCode - 65; 
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

/**
 * Fungsi untuk mencetak Lembar Jawaban (LJK)
 */
export const printAnswerSheet = (questions: EduCBTQuestion[], subject: string) => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const content = generateAnswerSheetHtml(questions, subject);
  
  printWindow.document.write(`
    <html>
      <head>
        <title>Lembar Jawaban - ${subject}</title>
        <style>
          body { font-family: 'Arial', sans-serif; padding: 20px; color: #333; line-height: 1.4; }
          .header { margin-bottom: 30px; border-bottom: 2px solid #000; padding-bottom: 15px; }
          .header-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          .header-table td { padding: 5px; font-weight: bold; font-size: 14px; }
          .title { text-align: center; text-decoration: underline; font-size: 20px; margin: 20px 0; font-weight: bold; }
          .section-title { font-weight: bold; margin: 20px 0 10px 0; border-bottom: 1px solid #ccc; padding-bottom: 5px; font-size: 14px; text-transform: uppercase; }
          
          /* Grid for bubbles */
          .bubble-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
          .bubble-item { display: flex; align-items: center; gap: 8px; font-size: 13px; margin-bottom: 4px; }
          .bubbles { display: flex; gap: 5px; }
          .bubble { width: 22px; height: 22px; border: 1.5px solid #000; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: bold; }
          
          /* Essay and filling */
          .isian-item { margin-bottom: 10px; font-size: 13px; display: flex; align-items: center; }
          .isian-line { flex-grow: 1; border-bottom: 1px dotted #000; min-height: 20px; margin-left: 10px; }
          .uraian-item { margin-bottom: 20px; font-size: 13px; }
          .uraian-box { border: 1.5px solid #000; width: 100%; height: 100px; margin-top: 5px; }
          
          @media print {
            body { padding: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        ${content}
        <script>
          window.onload = () => { window.print(); window.close(); };
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
};

const generateAnswerSheetHtml = (questions: EduCBTQuestion[], subject: string) => {
  // Sort questions by order first to ensure correct numbering
  const sortedQuestions = [...questions].sort((a, b) => (a.order || 0) - (b.order || 0));

  const pgQuestions = sortedQuestions.filter(q => q.type === QuestionType.PilihanGanda || q.type === QuestionType.MCMA);
  const tfQuestions = sortedQuestions.filter(q => q.type === QuestionType.BenarSalah || q.type === QuestionType.SesuaiTidakSesuai);
  const isianQuestions = sortedQuestions.filter(q => q.type === QuestionType.Isian);
  const uraianQuestions = sortedQuestions.filter(q => q.type === QuestionType.Uraian);

  let html = `
    <div class="header">
      <table class="header-table">
        <tr>
          <td width="20%">Mata Pelajaran</td>
          <td width="30%">: ${subject.toUpperCase()}</td>
          <td width="15%">Nama Siswa</td>
          <td width="35%">: ....................................................</td>
        </tr>
        <tr>
          <td>Waktu</td>
          <td>: 60 Menit</td>
          <td>Kelas</td>
          <td>: ....................................................</td>
        </tr>
      </table>
    </div>

    <div class="title">LEMBAR JAWABAN</div>
  `;

  if (pgQuestions.length > 0) {
    html += `<div class="section-title">I. SOAL PILIHAN GANDA / JAMAK</div>`;
    html += `<div class="bubble-grid">`;
    pgQuestions.forEach((q) => {
      html += `
        <div class="bubble-item">
          <span style="width: 25px; font-weight: bold;">${q.order}.</span>
          <div class="bubbles">
            <div class="bubble">A</div>
            <div class="bubble">B</div>
            <div class="bubble">C</div>
            <div class="bubble">D</div>
            <div class="bubble">E</div>
          </div>
        </div>
      `;
    });
    html += `</div>`;
  }

  if (tfQuestions.length > 0) {
    html += `<div class="section-title">II. SOAL BENAR/SALAH ATAU SESUAI</div>`;
    html += `<div class="bubble-grid">`;
    tfQuestions.forEach((q) => {
      const isTF = q.type === QuestionType.BenarSalah;
      html += `
        <div class="bubble-item">
          <span style="width: 25px; font-weight: bold;">${q.order}.</span>
          <div class="bubbles">
            <div class="bubble" style="width: 40px; border-radius: 10px;">${isTF ? 'B' : 'S'}</div>
            <div class="bubble" style="width: 40px; border-radius: 10px;">${isTF ? 'S' : 'TS'}</div>
          </div>
        </div>
      `;
    });
    html += `</div>`;
  }

  if (isianQuestions.length > 0) {
    html += `<div class="section-title">III. SOAL ISIAN SINGKAT</div>`;
    isianQuestions.forEach((q) => {
      html += `
        <div class="isian-item">
          <span style="width: 25px; font-weight: bold;">${q.order}.</span>
          <span class="isian-line"></span>
        </div>
      `;
    });
  }

  if (uraianQuestions.length > 0) {
    html += `<div class="section-title">IV. SOAL URAIAN</div>`;
    uraianQuestions.forEach((q) => {
      html += `
        <div class="uraian-item">
          <span style="font-weight: bold;">${q.order}.</span>
          <div class="uraian-box"></div>
        </div>
      `;
    });
  }

  return html;
};

export const downloadAnswerSheetPdf = async (questions: EduCBTQuestion[], subject: string) => {
  const container = document.createElement('div');
  container.style.width = '210mm'; // A4 Width
  container.style.padding = '20px';
  container.style.backgroundColor = '#fff';
  container.style.position = 'absolute';
  container.style.left = '-9999px';
  
  // Reuse the same styling as print
  container.innerHTML = `
    <style>
      .header { margin-bottom: 30px; border-bottom: 2px solid #000; padding-bottom: 15px; font-family: Arial; }
      .header-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
      .header-table td { padding: 5px; font-weight: bold; font-size: 14px; }
      .title { text-align: center; text-decoration: underline; font-size: 20px; margin: 20px 0; font-weight: bold; font-family: Arial; }
      .section-title { font-weight: bold; margin: 20px 0 10px 0; border-bottom: 1px solid #ccc; padding-bottom: 5px; font-size: 14px; text-transform: uppercase; font-family: Arial; }
      .bubble-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; font-family: Arial; }
      .bubble-item { display: flex; align-items: center; gap: 8px; font-size: 13px; margin-bottom: 4px; }
      .bubbles { display: flex; gap: 5px; }
      .bubble { width: 22px; height: 22px; border: 1.5px solid #000; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: bold; }
      .isian-item { margin-bottom: 10px; font-size: 13px; font-family: Arial; display: flex; align-items: center; }
      .isian-line { flex-grow: 1; border-bottom: 1px dotted #000; min-height: 20px; margin-left: 10px; }
      .uraian-item { margin-bottom: 20px; font-size: 13px; font-family: Arial; }
      .uraian-box { border: 1.5px solid #000; width: 100%; height: 100px; margin-top: 5px; }
    </style>
    ${generateAnswerSheetHtml(questions, subject)}
  `;
  
  document.body.appendChild(container);
  
  try {
    // @ts-ignore
    const canvas = await window.html2canvas(container, { scale: 2 });
    const imgData = canvas.toDataURL('image/png');
    
    // @ts-ignore
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF('p', 'mm', 'a4');
    const imgWidth = 210;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    
    pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
    pdf.save(`Lembar_Jawaban_${subject.replace(/\s+/g, '_')}.pdf`);
  } catch (err) {
    console.error("PDF Generation failed", err);
  } finally {
    document.body.removeChild(container);
  }
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
