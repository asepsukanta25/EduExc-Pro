
import React, { useState } from 'react';
import { EduCBTQuestion, QuestionType } from '../types';
import ImageControl from './ImageControl';

interface Props {
  onAdd: (q: EduCBTQuestion) => void;
  defaultSubject: string;
  defaultPhase: string;
  defaultToken: string;
}

const ManualEntryForm: React.FC<Props> = ({ onAdd, defaultSubject, defaultPhase, defaultToken }) => {
  const [q, setQ] = useState<Partial<EduCBTQuestion>>({
    type: QuestionType.PilihanGanda,
    level: 'L2',
    text: '',
    options: ['', '', '', '', ''],
    optionImages: [null, null, null, null, null],
    correctAnswer: 0,
    explanation: '',
    material: '',
    quizToken: defaultToken,
    subject: defaultSubject,
    phase: defaultPhase
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!q.text) return alert("Teks soal tidak boleh kosong!");
    
    const newQuestion: EduCBTQuestion = {
      ...q as EduCBTQuestion,
      id: `q_manual_${Date.now()}`,
      isDeleted: false,
      createdAt: Date.now(),
      order: 1,
      options: q.options || [],
      optionImages: q.optionImages || undefined,
      quizToken: q.quizToken?.toUpperCase() || "TOKEN"
    };
    
    onAdd(newQuestion);
    setQ({ ...q, text: '', options: ['', '', '', '', ''], optionImages: [null, null, null, null, null], explanation: '' });
    alert("Soal berhasil ditambahkan ke daftar!");
  };

  const isTableType = q.type === QuestionType.BenarSalah || q.type === QuestionType.SesuaiTidakSesuai;
  const isEssayType = q.type === QuestionType.Isian || q.type === QuestionType.Uraian;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
        <h3 className="text-xs font-black text-indigo-600 uppercase tracking-[0.2em] mb-4">Form Input Soal Manual</h3>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-black text-slate-500 uppercase mb-2">Tipe Soal</label>
            <select 
              className="w-full px-4 py-2 bg-white text-slate-900 border border-slate-300 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500"
              value={q.type}
              onChange={(e) => setQ({...q, type: e.target.value as QuestionType, correctAnswer: e.target.value.includes('MCMA') ? [] : (e.target.value.includes('Salah') ? [false, false, false, false, false] : 0)})}
            >
              {Object.values(QuestionType).map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-black text-slate-500 uppercase mb-2">Level Kognitif</label>
            <select 
              className="w-full px-4 py-2 bg-white text-slate-900 border border-slate-300 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500"
              value={q.level}
              onChange={(e) => setQ({...q, level: e.target.value})}
            >
              <option value="L1">L1 (Pemahaman)</option>
              <option value="L2">L2 (Aplikasi)</option>
              <option value="L3">L3 (Penalaran/HOTS)</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-black text-slate-500 uppercase mb-2">Teks Soal / Stimulus</label>
          <textarea 
            rows={4}
            className="w-full px-4 py-3 bg-white text-slate-900 border border-slate-300 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Tuliskan pertanyaan Anda di sini..."
            value={q.text}
            onChange={(e) => setQ({...q, text: e.target.value})}
          />
        </div>

        <ImageControl 
          label="Gambar Stimulus (Opsional)" 
          currentImage={q.image} 
          onImageChange={(url) => setQ({...q, image: url})} 
        />

        {!isEssayType && (
          <div className="space-y-4 pt-2">
            <label className="block text-[10px] font-black text-slate-500 uppercase">{isTableType ? 'Daftar Pernyataan' : 'Pilihan Jawaban'}</label>
            {q.options?.map((opt, i) => (
              <div key={i} className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
                <div className="flex items-center gap-3">
                  <button 
                    type="button"
                    onClick={() => {
                      if (q.type === QuestionType.PilihanGanda) setQ({...q, correctAnswer: i});
                      else if (q.type === QuestionType.MCMA) {
                        const current = Array.isArray(q.correctAnswer) ? q.correctAnswer : [];
                        setQ({...q, correctAnswer: current.includes(i) ? current.filter(x => x !== i) : [...current, i]});
                      } else if (isTableType) {
                        const current = Array.isArray(q.correctAnswer) ? q.correctAnswer : [false, false, false, false, false];
                        const next = [...current]; next[i] = !next[i];
                        setQ({...q, correctAnswer: next});
                      }
                    }}
                    className={`w-8 h-8 shrink-0 rounded-lg flex items-center justify-center text-[10px] font-black border-2 transition-all ${
                      (q.type === QuestionType.PilihanGanda && q.correctAnswer === i) || 
                      (q.type === QuestionType.MCMA && Array.isArray(q.correctAnswer) && q.correctAnswer.includes(i)) ||
                      (isTableType && Array.isArray(q.correctAnswer) && q.correctAnswer[i])
                      ? 'bg-emerald-500 border-emerald-500 text-white shadow-md' 
                      : 'bg-white border-slate-200 text-slate-400'
                    }`}
                  >
                    {String.fromCharCode(65+i)}
                  </button>
                  <input 
                    type="text" 
                    className="flex-grow px-3 py-1.5 bg-white text-slate-900 border border-slate-200 rounded-lg text-xs font-bold"
                    placeholder={`Opsi ${String.fromCharCode(65+i)}`}
                    value={opt}
                    onChange={(e) => {
                      const next = [...(q.options || [])];
                      next[i] = e.target.value;
                      setQ({...q, options: next});
                    }}
                  />
                </div>
                <div className="pl-11">
                   <input 
                    type="text" 
                    className="w-full px-3 py-1.5 bg-white text-slate-900 border border-slate-200 rounded-lg text-[9px] font-bold"
                    placeholder="URL Gambar Opsi (Opsional)"
                    value={q.optionImages?.[i] || ''}
                    onChange={(e) => {
                      const nextImgs = [...(q.optionImages || [null, null, null, null, null])];
                      nextImgs[i] = e.target.value || null;
                      setQ({...q, optionImages: nextImgs});
                    }}
                  />
                </div>
              </div>
            ))}
            <p className="text-[9px] text-slate-400 italic mt-1">* Klik huruf A-E untuk menandai jawaban yang BENAR.</p>
          </div>
        )}

        <div>
          <label className="block text-[10px] font-black text-slate-500 uppercase mb-2">Pembahasan (Opsional)</label>
          <textarea 
            rows={2}
            className="w-full px-4 py-2 bg-white text-slate-900 border border-slate-300 rounded-xl text-xs font-medium italic outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Berikan alasan atau kunci analisis..."
            value={q.explanation}
            onChange={(e) => setQ({...q, explanation: e.target.value})}
          />
        </div>

        <button 
          type="submit"
          className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all"
        >
          Tambahkan Soal ke Daftar
        </button>
      </div>
    </form>
  );
};

export default ManualEntryForm;
