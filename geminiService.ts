
import { GoogleGenAI, Type } from "@google/genai";
import { EduCBTQuestion, GenerationConfig, QuestionType } from "./types";

const SYSTEM_INSTRUCTION = `
Persona: Pakar Kurikulum Nasional Indonesia & Spesialis Pembelajaran Bermakna.
Tugas: Membuat bank soal HOTS berkualitas tinggi lengkap dengan PEMBAHASAN LANGKAH-DEMI-LANGKAH (Cara Menjawab).

### ATURAN PEMBAHASAN (PENTING) ###
Setiap soal WAJIB memiliki penjelasan di properti "explanation" dengan struktur yang sangat rapi dan lega:
1. **Analisis Masalah**: Identifikasi apa yang ditanyakan dan informasi kunci.
2. **Langkah Penyelesaian**: Cara menjawab secara bertahap. Gunakan poin-poin (1., 2., 3. atau -) dan pastikan setiap langkah berada di baris baru.
3. **Kesimpulan**: Mengapa pilihan tersebut benar.

Gunakan TRIPLE NEWLINE (\n\n\n) di antara setiap bagian besar (Analisis, Langkah, Kesimpulan).
Gunakan DOUBLE NEWLINE (\n\n) di antara setiap poin langkah-langkah penyelesaian agar tidak terlihat padat.

### ATURAN STRUKTUR DATA ###
1. "type": Gunakan string PERSIS seperti ini: "Pilihan Ganda", "Pilihan Jamak (MCMA)", "(Benar/Salah)", "(Sesuai/Tidak Sesuai)", "ISIAN", "URAIAN".
2. "correctAnswer": 
   - Pilihan Ganda: index (0-4).
   - MCMA: array index [0, 2].
   - T/F atau Sesuai/Tidak Sesuai: array boolean [true, false, true]. Pastikan jumlah elemen array sama dengan jumlah opsi pernyataan.
`;

async function smartGeminiCall(payload: any, maxRetries = 4) {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  let lastError: any;
  const models = ['gemini-3-pro-preview', 'gemini-3-flash-preview'];

  for (const modelName of models) {
    for (let i = 0; i < maxRetries; i++) {
      try {
        const response = await ai.models.generateContent({
          ...payload,
          model: modelName
        });
        return response;
      } catch (error: any) {
        lastError = error;
        await new Promise(r => setTimeout(r, 1000));
      }
    }
  }
  throw lastError;
}

export const generateTeachingMaterial = async (questions: EduCBTQuestion[]): Promise<string> => {
  const context = questions.map(q => `[Soal ${q.order} - ${q.type}]: ${q.text}`).join("\n");
  const prompt = `
    TUGAS: BUATKAN MATERI AJAR (RINGKASAN KONSEP) UNTUK PRESENTASI DI KELAS.
    Materi ini harus merangkum seluruh konsep kunci yang diuji dalam soal-soal berikut:
    
    DAFTAR SOAL:
    ${context}

    FORMAT OUTPUT:
    - Gunakan Markdown yang rapi.
    - Buat dalam poin-poin yang mudah dibaca di layar proyektor (font besar).
    - Sertakan Rumus (menggunakan format $...$ atau $$...$$) jika relevan.
    - Struktur: Judul Materi, Konsep Kunci, Tips & Trik Menjawab Soal Sejenis.
    - Hindari teks yang terlalu padat. Gunakan setidaknya dua baris kosong (\n\n\n) di antara setiap sub-judul materi.
  `;

  const response = await smartGeminiCall({
    contents: [{ text: prompt }],
    config: {
      systemInstruction: "Anda adalah dosen ahli yang membuat slide presentasi yang sangat jelas dan bermakna."
    }
  });

  return response.text || "Gagal menyusun materi.";
};

export const repairQuestionOptions = async (q: EduCBTQuestion): Promise<EduCBTQuestion> => {
  const prompt = `
    TUGAS: LENGKAPI OPSI JAWABAN AND PEMBAHASAN LANGKAH-DEMI-LANGKAH.
    Soal: ${q.text}
    Tipe: ${q.type}
    Kunci Jawaban Saat Ini: ${JSON.stringify(q.correctAnswer)}
  `;

  const response = await smartGeminiCall({
    contents: [{ text: prompt }],
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          options: { type: Type.ARRAY, items: { type: Type.STRING } },
          explanation: { type: Type.STRING }
        },
        required: ["options", "explanation"]
      }
    }
  });

  const parsed = JSON.parse(response.text || "{}");
  return {
    ...q,
    options: parsed.options || [],
    explanation: parsed.explanation || q.explanation
  };
};

export const generateEduCBTQuestions = async (config: GenerationConfig): Promise<EduCBTQuestion[]> => {
  const typeDetails = Object.entries(config.typeCounts)
    .filter(([_, count]) => count > 0)
    .map(([type, count]) => `- ${type}: ${count} soal`)
    .join("\n");

  const levelDetails = Object.entries(config.levelCounts)
    .filter(([_, count]) => count > 0)
    .map(([lvl, count]) => `- Level ${lvl}: ${count} soal`)
    .join("\n");

  const totalTarget = Object.values(config.typeCounts).reduce((a, b) => a + (b || 0), 0);

  const promptText = `
    BUATKAN TOTAL ${totalTarget} SOAL LATIHAN DENGAN RINCIAN BERIKUT:
    
    KOMPOSISI TIPE SOAL:
    ${typeDetails}

    KOMPOSISI LEVEL KOGNITIF:
    ${levelDetails}

    SPESIFIKASI UMUM:
    Mata Pelajaran: ${config.subject}
    Fase/Kelas: ${config.phase}
    Materi Utama: ${config.material}
    Token: ${config.quizToken}

    INSTRUKSI KHUSUS: 
    - Setiap soal harus unik dan memiliki CARA MENJAWAB yang detail dalam bagian pembahasan (explanation).
    - Gunakan spasi antar bagian (paragraf) yang sangat jelas (\n\n\n) dalam pembahasan.
    ${config.referenceText ? `\nREFERENSI MATERI:\n${config.referenceText}` : ''}
    ${config.specialInstructions ? `\nCATATAN TAMBAHAN DARI USER:\n${config.specialInstructions}` : ''}
  `;

  const parts: any[] = [{ text: promptText }];
  if (config.referenceImage) {
    parts.push({ inlineData: { data: config.referenceImage.data, mimeType: config.referenceImage.mimeType } });
  }

  const response = await smartGeminiCall({
    contents: { parts },
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            type: { type: Type.STRING },
            level: { type: Type.STRING },
            text: { type: Type.STRING },
            explanation: { type: Type.STRING },
            material: { type: Type.STRING },
            quizToken: { type: Type.STRING },
            order: { type: Type.INTEGER },
            options: { type: Type.ARRAY, items: { type: Type.STRING } },
            correctAnswer: { type: Type.STRING },
          },
          required: ["type", "level", "text", "correctAnswer", "explanation", "material", "quizToken", "order", "options"]
        }
      }
    }
  });

  const parsed = JSON.parse(response.text || "[]");
  
  return parsed.map((q: any) => {
    let sanitizedAnswer = q.correctAnswer;
    try {
      let rawAns = String(q.correctAnswer).trim();
      
      if (q.type === "Pilihan Ganda") {
        sanitizedAnswer = parseInt(rawAns.replace(/[^0-9]/g, '')) || 0;
      } else if (q.type === "Pilihan Jamak (MCMA)") {
        // Jika formatnya string "0,2" ubah ke [0,2]
        if (!rawAns.startsWith('[')) {
          sanitizedAnswer = rawAns.split(',').map(x => parseInt(x.trim())).filter(x => !isNaN(x));
        } else {
          sanitizedAnswer = JSON.parse(rawAns);
        }
      } else if (q.type === "(Benar/Salah)" || q.type === "(Sesuai/Tidak Sesuai)") {
        // Logika ekstra hati-hati untuk Benar/Salah
        let clean = rawAns.toLowerCase();
        if (clean.startsWith('[')) {
          sanitizedAnswer = JSON.parse(clean);
        } else {
          // Tangani format "Benar, Salah, Benar"
          sanitizedAnswer = clean.split(',').map(part => {
            const p = part.trim();
            return p === 'true' || p === 'benar' || p === 'b' || p === 'sesuai' || p === 's';
          });
        }
        
        // Pastikan jumlah jawaban sama dengan jumlah opsi
        if (Array.isArray(sanitizedAnswer) && q.options && sanitizedAnswer.length < q.options.length) {
          while (sanitizedAnswer.length < q.options.length) sanitizedAnswer.push(false);
        }
      }
    } catch (e) {
      console.warn("Gagal mensanitasi jawaban:", e);
      sanitizedAnswer = q.type.includes('Pilihan Ganda') ? 0 : [];
    }

    return {
      ...q,
      correctAnswer: sanitizedAnswer,
      id: `q_${Date.now()}_${Math.random()}`,
      isDeleted: false,
      createdAt: Date.now(),
      options: q.options || [],
      subject: config.subject,
      phase: config.phase,
      material: q.material || config.material,
      quizToken: q.quizToken || config.quizToken
    };
  });
};

export const generateExplanationForQuestion = async (q: any): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Tuliskan PEMBAHASAN LANGKAH-DEMI-LANGKAH (Cara Menjawab) yang sangat detail untuk soal berikut: ${JSON.stringify(q)}. Pastikan setiap bagian (Analisis, Langkah, Kesimpulan) dipisahkan oleh setidaknya tiga baris baru (\n\n\n) agar tampilan di aplikasi sangat lega dan nyaman dibaca.`
  });
  return response.text?.trim() || "Penjelasan tidak tersedia.";
};
