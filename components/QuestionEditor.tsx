
import React, { useState } from 'react';
import { EduCBTQuestion, QuestionType } from '../types';
import ImageControl from './ImageControl';
import { generateExplanationForQuestion } from '../geminiService';

interface Props {
  question: EduCBTQuestion;
  onSave: (updated: EduCBTQuestion) => void;
  onClose: () => void;
}

const QuestionEditor: React.FC<Props> = ({ question, onSave, onClose }) => {
  const [edited, setEdited] = useState<EduCBTQuestion>(({ 
    ...question,
    optionImages: question.optionImages || new Array(question.options.length).fill(null),
    tfLabels: question.tfLabels || (question.type === QuestionType.BenarSalah ? { true: 'Benar', false: 'Salah' } : (question.type === QuestionType.SesuaiTidakSesuai ? { true: 'Sesuai', false: 'Tidak Sesuai' } : undefined))
  }));

  const [isGeneratingExpl, setIsGeneratingExpl] = useState(false);

  const handleCorrectAnswerChange = (idx: number) => {
    if (edited.type === QuestionType.PilihanGanda) {
      setEdited({ ...edited, correctAnswer: idx });
    } else if (edited.type === QuestionType.MCMA) {
      const current = Array.isArray(edited.correctAnswer) ? (edited.correctAnswer as number[]) : [];
      const updated = current.includes(idx) ? current.filter(i => i !== idx) : [...current, idx];
      setEdited({ ...edited, correctAnswer: updated });
    } else if (edited.type === QuestionType.BenarSalah || edited.type === QuestionType.SesuaiTidakSesuai) {
      const current = Array.isArray(edited.correctAnswer) ? (edited.correctAnswer as boolean[]) : edited.options.map(() => false);
      const updated = [...current];
      updated[idx] = !updated[idx];
      setEdited({ ...edited, correctAnswer: updated });
    }
  };

  const handleGenerateAIExplanation = async () => {
    if (!edited.text) {
      alert("Teks soal harus diisi terlebih dahulu.");
      return;
    }
    
    setIsGeneratingExpl(true);
    try {
      const aiExplanation = await generateExplanationForQuestion(edited);
      setEdited(prev => ({ ...prev, explanation: aiExplanation }));
    } catch (err) {
      alert("Gagal generate pembahasan. Coba lagi nanti.");
    } finally {
      setIsGeneratingExpl(false);
    }
  };

  const isTableType = edited.type === QuestionType.BenarSalah || edited.type === QuestionType.SesuaiTidakSesuai;
  const isEssayType = edited.type === QuestionType.Isian || edited.type === QuestionType.Uraian;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md">
      <div className="bg-white w-full max-w-6xl max-h-[95vh] rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col border border-slate-200">
        <div className="px-8 py-5 border-b flex justify-between items-center bg-slate-50">
          <div>
            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Editor Spesialis Soal</h2>
            <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mt-1">Sesuaikan Detail Konten & Metadata</p>
          </div>
          <button onClick={onClose} className="p-2 bg-white border rounded-xl text-slate-400 hover:text-rose-500 hover:border-rose-100 transition-all shadow-sm">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="flex-grow overflow-y-auto p-6 md:p-10 space-y-8">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 bg-slate-100 p-6 rounded-[2rem] border border-slate-200 shadow-inner">
             <div className="md:col-span-2">
               <label className="block text-[9px] font-black uppercase text-slate-400 mb-1.5 tracking-widest">Tipe Soal</label>
               <select className="w-full px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500" value={edited.type} onChange={e => setEdited({...edited, type: e.target.value})}>
                 {Object.values(QuestionType).map(t => <option key={t} value={t}>{t}</option>)}
               </select>
             </div>
             <div>
               <label className="block text-[9px] font-black uppercase text-slate-400 mb-1.5 tracking-widest">Level</label>
               <select className="w-full px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500" value={edited.level} onChange={e => setEdited({...edited, level: e.target.value})}>
                 <option value="L1">L1</option>
                 <option value="L2">L2</option>
                 <option value="L3">L3</option>
               </select>
             </div>
             <div>
               <label className="block text-[9px] font-black uppercase text-slate-400 mb-1.5 tracking-widest">Urutan</label>
               <input type="number" className="w-full px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500 text-center" value={edited.order} onChange={e => setEdited({...edited, order: parseInt(e.target.value) || 0})} />
             </div>
             <div>
               <label className="block text-[9px] font-black uppercase text-slate-400 mb-1.5 tracking-widest">Token</label>
               <input type="text" className="w-full px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500 uppercase" value={edited.quizToken} onChange={e => setEdited({...edited, quizToken: e.target.value.toUpperCase()})} />
             </div>
             <div className="md:col-span-2">
               <label className="block text-[9px] font-black uppercase text-slate-400 mb-1.5 tracking-widest">Materi</label>
               <input type="text" className="w-full px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500" value={edited.material} onChange={e => setEdited({...edited, material: e.target.value})} />
             </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-7 space-y-6">
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-2 tracking-widest">Teks Soal / Stimulus</label>
                <textarea 
                  rows={8} 
                  className="w-full p-5 rounded-[2rem] border-2 border-slate-200 bg-white text-slate-900 text-base font-medium focus:ring-4 focus:ring-indigo-50 focus:border-indigo-400 outline-none transition-all shadow-sm" 
                  value={edited.text} 
                  onChange={(e) => setEdited({...edited, text: e.target.value})} 
                  placeholder="Ketikkan teks soal di sini..."
                />
              </div>
              <ImageControl label="Gambar Stimulus (URL / HTML)" currentImage={edited.image} onImageChange={(img) => setEdited({...edited, image: img})} />
              
              {isEssayType && (
                <div className="bg-emerald-50 p-6 rounded-[2.5rem] border border-emerald-100 shadow-sm">
                  <label className="block text-[10px] font-black uppercase text-emerald-700 mb-3 tracking-widest">Kunci Jawaban (Pedoman Penskoran)</label>
                  <textarea 
                    rows={4} 
                    className="w-full p-5 rounded-2xl border border-emerald-200 bg-white text-slate-900 text-sm font-bold outline-none focus:ring-4 focus:ring-emerald-100 transition-all" 
                    value={typeof edited.correctAnswer === 'string' ? edited.correctAnswer : ''} 
                    onChange={(e) => setEdited({...edited, correctAnswer: e.target.value})}
                    placeholder="Masukkan jawaban yang benar atau pedoman penilaian..."
                  />
                  <p className="text-[9px] text-emerald-600 mt-3 font-black italic uppercase tracking-tight">Kunci ini digunakan AI sebagai referensi saat mengoreksi jawaban siswa.</p>
                </div>
              )}
            </div>

            <div className="lg:col-span-5 space-y-6">
              {!isEssayType && (
                <div className="bg-white rounded-[2.5rem] border border-slate-200 p-6 shadow-sm">
                  <div className="flex justify-between items-center mb-4">
                    <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest">{isTableType ? 'Pernyataan Tabel' : 'Opsi Jawaban'}</label>
                    <button onClick={() => {
                      const newOptions = [...edited.options, ""];
                      const newOptionImages = [...(edited.optionImages || []), null];
                      let newAns: any = edited.correctAnswer;
                      if (isTableType) {
                        const currentArray = Array.isArray(edited.correctAnswer) ? (edited.correctAnswer as boolean[]) : [];
                        newAns = [...currentArray, false];
                      }
                      setEdited({...edited, options: newOptions, optionImages: newOptionImages, correctAnswer: newAns});
                    }} className="text-[10px] font-black text-indigo-600 hover:bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100 transition-all uppercase tracking-tight">+ Tambah</button>
                  </div>

                  <div className="space-y-4">
                    {edited.options.map((opt, i) => {
                      const isActive = isTableType 
                        ? (Array.isArray(edited.correctAnswer) && edited.correctAnswer[i] === true)
                        : edited.type === QuestionType.MCMA 
                          ? (Array.isArray(edited.correctAnswer) && (edited.correctAnswer as any[]).map(x => Number(x)).includes(i))
                          : (Number(edited.correctAnswer) === i);
                      
                      const optImg = edited.optionImages?.[i];

                      return (
                        <div key={i} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                          <div className="flex items-center gap-3">
                            <button 
                              type="button" 
                              onClick={() => handleCorrectAnswerChange(i)} 
                              className={`w-10 h-10 shrink-0 rounded-xl flex items-center justify-center text-[10px] font-black border-2 transition-all ${
                                isActive 
                                ? 'bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-100' 
                                : isTableType 
                                  ? 'bg-rose-500 border-rose-500 text-white shadow-lg shadow-rose-100' 
                                  : 'bg-white border-slate-200 text-slate-400'
                              }`}
                            >
                              {isTableType ? (isActive ? 'B' : 'S') : String.fromCharCode(65+i)}
                            </button>
                            <input type="text" className="flex-grow bg-white text-slate-900 border-b border-slate-200 focus:border-indigo-400 outline-none text-xs font-bold p-1 rounded" value={opt} onChange={(e) => {
                              const newOps = [...edited.options]; newOps[i] = e.target.value; setEdited({...edited, options: newOps});
                            }} placeholder={`Teks Opsi ${String.fromCharCode(65+i)}`} />
                            <button onClick={() => {
                              const newOps = [...edited.options]; newOps.splice(i, 1);
                              const newOpsImgs = [...(edited.optionImages || [])]; newOpsImgs.splice(i, 1);
                              let newAns: any = edited.correctAnswer;
                              if (isTableType && Array.isArray(newAns)) {
                                 const arr = [...newAns]; arr.splice(i, 1); newAns = arr;
                              }
                              setEdited({...edited, options: newOps, optionImages: newOpsImgs, correctAnswer: newAns});
                            }} className="p-2 text-slate-300 hover:text-rose-500 transition-colors"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7" /></svg></button>
                          </div>
                          
                          <div className="pl-13 space-y-2">
                             <input 
                               type="text" 
                               className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[9px] font-bold outline-none focus:border-indigo-300"
                               placeholder="URL Gambar Opsi (Opsional)"
                               value={optImg || ''}
                               onChange={(e) => {
                                 const nextImgs = [...(edited.optionImages || [])];
                                 nextImgs[i] = e.target.value || null;
                                 setEdited({...edited, optionImages: nextImgs});
                               }}
                             />
                             {optImg && (
                               <div className="relative w-20 h-20 rounded-lg border bg-white overflow-hidden group">
                                 <img src={optImg} className="w-full h-full object-contain" alt="Preview" />
                                 <button 
                                   onClick={() => {
                                     const nextImgs = [...(edited.optionImages || [])];
                                     nextImgs[i] = null;
                                     setEdited({...edited, optionImages: nextImgs});
                                   }}
                                   className="absolute inset-0 bg-rose-500/80 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-[8px] font-black uppercase"
                                 >Hapus</button>
                               </div>
                             )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              
              <div className="bg-amber-50 p-6 rounded-[2.5rem] border border-amber-100 shadow-sm">
                <div className="flex justify-between items-center mb-4">
                  <label className="block text-[10px] font-black uppercase text-amber-700 tracking-widest">Pembahasan & Analisis HOTS</label>
                  <button 
                    type="button"
                    disabled={isGeneratingExpl}
                    onClick={handleGenerateAIExplanation}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all shadow-md ${
                      isGeneratingExpl 
                      ? 'bg-slate-200 text-slate-400 cursor-not-allowed' 
                      : 'bg-amber-600 text-white hover:bg-amber-700'
                    }`}
                  >
                    {isGeneratingExpl ? 'Menganalisis...' : '✨ Analisis AI'}
                  </button>
                </div>
                <textarea rows={6} className="w-full p-5 rounded-2xl border border-amber-200 bg-white text-slate-900 text-xs font-medium italic outline-none focus:ring-4 focus:ring-amber-100 transition-all shadow-inner" value={edited.explanation} onChange={(e) => setEdited({...edited, explanation: e.target.value})} placeholder="Penjelasan jawaban..." />
              </div>
            </div>
          </div>
        </div>

        <div className="px-8 py-6 border-t flex justify-end gap-4 bg-slate-50">
          <button onClick={onClose} className="px-6 py-3 text-xs font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-colors">Batalkan</button>
          <button onClick={() => onSave(edited)} className="px-10 py-4 bg-indigo-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-2xl shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all">Simpan Perubahan</button>
        </div>
      </div>
    </div>
  );
};

export default QuestionEditor;
