
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import Header from './components/Header';
import GenerationForm from './components/GenerationForm';
import ManualEntryForm from './components/ManualEntryForm';
import QuestionList from './components/QuestionList';
import QuestionEditor from './components/QuestionEditor';
import { EduCBTQuestion, QuestionType } from './types';
import { generateEduCBTQuestions, repairQuestionOptions, generateTeachingMaterial } from './geminiService';
import { exportQuestionsToExcel, downloadExcelTemplate, importQuestionsFromExcel } from './utils/exportUtils';
import { shuffleQuestions, shuffleAllOptions } from './utils/shuffleUtils';

const App: React.FC = () => {
  const [view, setView] = useState<'landing' | 'admin' | 'exercise'>('landing');
  const [adminMode, setAdminMode] = useState<'manual' | 'ai'>('manual');
  const [questions, setQuestions] = useState<EduCBTQuestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [activeToken, setActiveToken] = useState('');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [showExplanation, setShowExplanation] = useState(false);
  const [showNavDrawer, setShowNavDrawer] = useState(false);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  
  const [showMaterialIntro, setShowMaterialIntro] = useState(false);
  const [splitWidth, setSplitWidth] = useState(60); 
  const [isResizing, setIsResizing] = useState(false);
  const [isImportingLanding, setIsImportingLanding] = useState(false);

  // Exercise Interaction States
  const [userAnswer, setUserAnswer] = useState<any>(null);
  const [hasChecked, setHasChecked] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);

  // Text Zoom States
  const [questionZoom, setQuestionZoom] = useState(2); 
  const [optionsZoom, setOptionsZoom] = useState(2); 

  const questionSizeClasses = ["text-lg", "text-xl", "text-2xl", "text-3xl", "text-4xl", "text-5xl"];
  const optionsSizeClasses = ["text-base", "text-lg", "text-xl", "text-2xl", "text-3xl", "text-4xl"];

  const [exerciseSettings, setExerciseSettings] = useState({
    shuffleQuestions: false,
    shuffleOptions: false,
    duration: 60 
  });

  const activeQuestionsSorted = useMemo(() => 
    questions.filter(q => !q.isDeleted).sort((a,b) => a.order - b.order), 
  [questions]);

  const [displayQuestions, setDisplayQuestions] = useState<EduCBTQuestion[]>([]);

  const startResizing = useCallback(() => setIsResizing(true), []);
  const stopResizing = useCallback(() => setIsResizing(false), []);
  const resize = useCallback((e: MouseEvent) => {
    if (isResizing) {
      const newWidth = (e.clientX / window.innerWidth) * 100;
      if (newWidth > 25 && newWidth < 75) setSplitWidth(newWidth);
    }
  }, [isResizing]);

  useEffect(() => {
    window.addEventListener('mousemove', resize);
    window.addEventListener('mouseup', stopResizing);
    return () => {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
    };
  }, [resize, stopResizing]);

  const resetInteraction = useCallback((index: number, qs: EduCBTQuestion[]) => {
    if (!qs[index]) return;
    const q = qs[index];
    setHasChecked(false);
    setIsCorrect(null);
    setShowExplanation(false);
    
    // Initialize default answer structure based on type
    if (q.type === QuestionType.MCMA) setUserAnswer([]);
    else if (q.type === QuestionType.BenarSalah || q.type === QuestionType.SesuaiTidakSesuai) {
      setUserAnswer(new Array(q.options.length).fill(null));
    }
    else setUserAnswer(null);
  }, []);

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminPassword === "admin123") {
      setView('admin');
      setShowAdminLogin(false);
      setAdminPassword('');
    } else { alert("Password Salah!"); }
  };

  const handleLandingExcelImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsImportingLanding(true);
    try {
      const importedQuestions = await importQuestionsFromExcel(file);
      setQuestions(prev => [...prev, ...importedQuestions]);
      if (importedQuestions.length > 0) {
        const token = importedQuestions[0].quizToken;
        setActiveToken(token);
        alert(`Berhasil mengimpor ${importedQuestions.length} soal. Mengalihkan ke Manajemen Soal...`);
        setView('admin'); 
      }
    } catch (err) {
      alert("Gagal memproses file Excel. Pastikan format kolom benar.");
    } finally {
      setIsImportingLanding(false);
      e.target.value = '';
    }
  };

  const handleStartExercise = () => {
    if (!activeToken) return alert("Masukkan Token Latihan!");
    
    const inputToken = activeToken.toUpperCase();
    let filteredQuestions = activeQuestionsSorted.filter(q => q.quizToken === inputToken);
    
    if (filteredQuestions.length === 0) {
      return alert(`Token "${inputToken}" tidak ditemukan.`);
    }
    
    let processed = [...filteredQuestions];
    if (exerciseSettings.shuffleQuestions) processed = shuffleQuestions(processed);
    if (exerciseSettings.shuffleOptions) processed = shuffleAllOptions(processed);
    
    setDisplayQuestions(processed);
    setCurrentQuestionIndex(0);
    resetInteraction(0, processed);

    const firstQ = processed[0];
    if (firstQ?.teachingMaterial) {
      setShowMaterialIntro(true);
    } else {
      setShowMaterialIntro(false);
    }
    
    setView('exercise');
  };

  const checkAnswer = async () => {
    const q = displayQuestions[currentQuestionIndex];
    let correct = false;

    if (q.type === QuestionType.PilihanGanda) {
      correct = userAnswer === q.correctAnswer;
    } else if (q.type === QuestionType.MCMA) {
      const sortedUser = [...(userAnswer || [])].sort();
      const sortedCorrect = [...(q.correctAnswer || [])].sort();
      correct = JSON.stringify(sortedUser) === JSON.stringify(sortedCorrect);
    } else if (q.type === QuestionType.BenarSalah || q.type === QuestionType.SesuaiTidakSesuai) {
      correct = JSON.stringify(userAnswer) === JSON.stringify(q.correctAnswer);
    } else if (q.type === QuestionType.Isian) {
      correct = String(userAnswer).trim().toLowerCase() === String(q.correctAnswer).trim().toLowerCase();
    } else {
      correct = true;
    }

    setIsCorrect(correct);
    setHasChecked(true);
  };

  const handleGenerateMaterial = async () => {
    if (activeQuestionsSorted.length === 0) return;
    setLoading(true);
    try {
      const material = await generateTeachingMaterial(activeQuestionsSorted);
      setQuestions(prev => prev.map(q => {
        if (activeQuestionsSorted.some(aq => aq.id === q.id)) {
          return { ...q, teachingMaterial: material };
        }
        return q;
      }));
      alert("Materi ajar berhasil disusun!");
    } catch (e) {
      alert("Gagal menyusun materi ajar.");
    } finally {
      setLoading(false);
    }
  };

  const handleExportQuestions = () => {
    if (activeQuestionsSorted.length === 0) return alert("Tidak ada soal untuk diekspor.");
    exportQuestionsToExcel(activeQuestionsSorted, exerciseSettings);
  };

  const formatRichText = (text: string) => {
    if (!text) return "";
    let html = text;
    const kw = window as any;
    if (kw.katex) {
      html = html.replace(/\$\$(.*?)\$\$/gs, (match, formula) => {
        try { return kw.katex.renderToString(formula, { displayMode: true, throwOnError: false }); } catch (e) { return match; }
      });
      html = html.replace(/\$(.*?)\$/g, (match, formula) => {
        try { return kw.katex.renderToString(formula, { displayMode: false, throwOnError: false }); } catch (e) { return match; }
      });
    }
    const lines = html.split('\n');
    let inTable = false;
    let tableRows: string[] = [];
    let processedLines: string[] = [];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('|') && line.endsWith('|')) {
        inTable = true;
        tableRows.push(line);
      } else {
        if (inTable && tableRows.length >= 2) {
          processedLines.push(renderTable(tableRows));
          inTable = false;
          tableRows = [];
        }
        processedLines.push(lines[i]);
      }
    }
    if (inTable && tableRows.length >= 2) processedLines.push(renderTable(tableRows));
    html = processedLines.join('\n');
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\*(.*?)\*/g, '<em>$1</em>');
    html = html.replace(/\n\n\n/g, '<br/><br/><br/>').replace(/\n\n/g, '<br/><br/>').replace(/\n/g, '<br/>');
    return html;
  };

  const renderTable = (rows: string[]): string => {
    const tableData = rows.map(row => row.split('|').filter((_, idx, arr) => idx > 0 && idx < arr.length - 1).map(cell => cell.trim()));
    if (tableData.length < 2) return rows.join('\n');
    const headers = tableData[0];
    const body = tableData.slice(2);
    const headerHtml = `<thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>`;
    const bodyHtml = `<tbody>${body.map(row => `<tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>`).join('')}</tbody>`;
    return `<div class="markdown-table-container"><table class="markdown-table">${headerHtml}${bodyHtml}</table></div>`;
  };

  if (view === 'landing') return (
    <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-6 text-center">
      {showAdminLogin && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/90 backdrop-blur-md p-4">
          <div className="bg-white p-10 rounded-[2.5rem] w-full max-w-sm shadow-2xl animate-slide-in">
            <h3 className="text-2xl font-black mb-6 text-slate-900 uppercase tracking-tight">Admin Gate</h3>
            <form onSubmit={handleAdminLogin} className="space-y-6">
              <input autoFocus type="password" placeholder="Key Code" className="w-full p-5 bg-slate-50 border-2 rounded-2xl font-black text-center text-xl tracking-[0.3em]" value={adminPassword} onChange={e => setAdminPassword(e.target.value)} />
              <div className="grid grid-cols-2 gap-3">
                <button type="button" onClick={() => setShowAdminLogin(false)} className="py-4 bg-slate-100 rounded-2xl font-black text-xs uppercase text-slate-400">Cancel</button>
                <button type="submit" className="py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase shadow-xl shadow-indigo-100">Unlock</button>
              </div>
            </form>
          </div>
        </div>
      )}
      <div className="w-full max-w-4xl flex flex-col items-center">
        <div className="flex items-center gap-3 mb-12">
           <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center text-3xl font-black text-white shadow-2xl">E</div>
           <div className="text-left">
             <h1 className="text-4xl font-black text-white uppercase tracking-tighter">EduExercise Pro</h1>
             <p className="text-indigo-400 font-bold text-xs uppercase tracking-widest">Classroom AI Suite</p>
           </div>
        </div>
        <div className="w-full bg-white rounded-[3rem] shadow-2xl p-10 md:p-16 border border-white/20 space-y-12">
           <div className="space-y-2">
             <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Mulai Latihan Klasikal</h2>
             <p className="text-slate-400 font-bold text-sm uppercase tracking-widest">Masukkan Token Latihan</p>
           </div>
           <div className="max-w-md mx-auto space-y-4">
             <input type="text" placeholder="INPUT TOKEN" className="w-full p-6 bg-slate-50 border-4 border-slate-100 rounded-[2rem] font-black text-center text-3xl uppercase tracking-[0.5em] focus:border-indigo-500 transition-all outline-none" value={activeToken} onChange={e => setActiveToken(e.target.value.toUpperCase())} onKeyDown={e => e.key === 'Enter' && handleStartExercise()} />
             <button onClick={handleStartExercise} className="w-full py-6 bg-indigo-600 text-white rounded-[2rem] font-black text-lg uppercase tracking-widest shadow-2xl hover:bg-indigo-700 active:scale-95 transition-all">Buka Sesi Belajar</button>
           </div>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto pt-6 border-t border-slate-100">
              <div className="text-left space-y-4">
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Panel Persiapan Guru</p>
                 <div className="grid grid-cols-2 gap-3">
                    <button onClick={downloadExcelTemplate} className="flex flex-col items-center justify-center gap-2 p-4 bg-slate-50 hover:bg-white border-2 border-slate-100 hover:border-indigo-200 rounded-3xl transition-all group">
                       <span className="text-2xl group-hover:scale-110 transition-transform">📥</span>
                       <span className="text-[9px] font-black text-slate-500 uppercase">Template</span>
                    </button>
                    <label className={`flex flex-col items-center justify-center gap-2 p-4 bg-slate-50 hover:bg-white border-2 border-slate-100 hover:border-indigo-200 rounded-3xl transition-all group cursor-pointer ${isImportingLanding ? 'opacity-50' : ''}`}>
                       <span className="text-2xl group-hover:scale-110 transition-transform">{isImportingLanding ? '⏳' : '📤'}</span>
                       <span className="text-[9px] font-black text-slate-500 uppercase">{isImportingLanding ? 'Loading...' : 'Upload Soal'}</span>
                       <input type="file" className="hidden" accept=".xlsx, .xls" onChange={handleLandingExcelImport} disabled={isImportingLanding} />
                    </label>
                 </div>
              </div>
              <div className="text-left space-y-4">
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Kontrol Akses</p>
                 <button onClick={() => setShowAdminLogin(true)} className="w-full h-[100px] flex items-center justify-center gap-3 bg-slate-900 hover:bg-slate-800 text-white rounded-3xl transition-all shadow-xl">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
                    <span className="text-xs font-black uppercase tracking-widest">Manajemen Soal</span>
                 </button>
              </div>
           </div>
        </div>
      </div>
    </div>
  );

  if (view === 'exercise') {
    if (showMaterialIntro) {
      const material = displayQuestions.find(q => q.teachingMaterial)?.teachingMaterial || "";
      return (
        <div className="min-h-screen bg-indigo-950 flex flex-col overflow-hidden text-white">
          <header className="p-8 flex justify-between items-center border-b border-white/10">
            <div className="flex items-center gap-4">
               <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center text-2xl">📚</div>
               <div>
                 <h2 className="text-xl font-black uppercase tracking-tight">Materi Pengantar</h2>
                 <p className="text-indigo-400 text-[10px] font-bold uppercase tracking-widest">Kajian Konsep Sebelum Latihan</p>
               </div>
            </div>
            <button onClick={() => setView('landing')} className="px-6 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-[10px] font-black uppercase transition-all">Tutup</button>
          </header>
          <main className="flex-grow p-12 md:p-20 overflow-y-auto">
            <div className="max-w-5xl mx-auto space-y-12">
               <div className="prose prose-invert prose-2xl max-w-none font-medium leading-relaxed rich-content" dangerouslySetInnerHTML={{ __html: formatRichText(material) }}></div>
            </div>
          </main>
          <footer className="p-10 flex justify-center border-t border-white/10 bg-indigo-900/50 backdrop-blur-md">
             <button onClick={() => setShowMaterialIntro(false)} className="px-16 py-6 bg-indigo-500 hover:bg-indigo-400 text-white rounded-[2rem] font-black text-xl uppercase tracking-widest shadow-2xl transition-all active:scale-95 flex items-center gap-4">
               <span>Mulai Latihan Soal</span>
               <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
             </button>
          </footer>
        </div>
      );
    }
    const q = displayQuestions[currentQuestionIndex];
    if (!q) return <div>Soal tidak tersedia.</div>;
    const isEssay = q.type === QuestionType.Isian || q.type === QuestionType.Uraian;
    const isTable = q.type === QuestionType.BenarSalah || q.type === QuestionType.SesuaiTidakSesuai;
    const isMCMA = q.type === QuestionType.MCMA;
    return (
      <div className={`min-h-screen bg-white flex flex-col overflow-hidden ${isResizing ? 'select-none cursor-col-resize' : ''}`}>
        {showNavDrawer && (
          <div className="fixed inset-0 z-[100] flex">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowNavDrawer(false)}></div>
            <div className="relative w-80 bg-white h-full shadow-2xl flex flex-col animate-slide-in">
              <div className="p-8 bg-indigo-600 text-white flex justify-between items-center">
                 <h3 className="text-xl font-black uppercase">Navigasi</h3>
                 <button onClick={() => setShowNavDrawer(false)} className="p-2 hover:bg-white/20 rounded-xl"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"/></svg></button>
              </div>
              <div className="flex-grow p-6 overflow-y-auto space-y-4">
                 <button onClick={() => setShowMaterialIntro(true)} className="w-full py-4 bg-indigo-50 text-indigo-700 rounded-xl font-black uppercase text-xs border border-indigo-100">Buka Materi Ajar</button>
                 <div className="grid grid-cols-4 gap-3">
                   {displayQuestions.map((_, i) => (
                     <button key={i} onClick={() => { setCurrentQuestionIndex(i); resetInteraction(i, displayQuestions); setShowNavDrawer(false); }} className={`aspect-square rounded-xl flex items-center justify-center font-black text-sm border-2 transition-all ${currentQuestionIndex === i ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-slate-50 border-slate-100 text-slate-400 hover:border-indigo-300'}`}>
                       {i + 1}
                     </button>
                   ))}
                 </div>
              </div>
            </div>
          </div>
        )}
        <header className="bg-white border-b px-8 py-5 flex justify-between items-center z-50">
          <div className="flex items-center gap-6">
            <button onClick={() => setShowNavDrawer(true)} className="p-4 bg-slate-100 text-slate-600 rounded-2xl hover:bg-indigo-100 transition-all">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6h16M4 12h16M4 18h16"/></svg>
            </button>
            <div>
              <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">{q.subject}</h1>
              <p className="text-xs font-bold text-indigo-500 uppercase tracking-widest">{q.quizToken} • SOAL {currentQuestionIndex + 1} DARI {displayQuestions.length}</p>
            </div>
          </div>
          <button onClick={() => setView('landing')} className="px-8 py-3 bg-rose-50 text-rose-600 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-rose-100 transition-all">Keluar</button>
        </header>
        <main className="flex-grow flex flex-col lg:flex-row overflow-hidden relative">
          <div style={{ width: `${splitWidth}%` }} className="hidden lg:block overflow-y-auto p-8 md:p-12 lg:p-16 border-r border-slate-100 relative group/left">
            <div className="absolute top-6 right-8 flex gap-2 opacity-0 group-hover/left:opacity-100 transition-opacity z-10">
               <button onClick={() => setQuestionZoom(Math.max(0, questionZoom - 1))} className="w-10 h-10 bg-slate-100 hover:bg-indigo-100 text-slate-600 rounded-xl font-black flex items-center justify-center border border-slate-200">A-</button>
               <button onClick={() => setQuestionZoom(Math.min(questionSizeClasses.length - 1, questionZoom + 1))} className="w-10 h-10 bg-slate-100 hover:bg-indigo-100 text-slate-600 rounded-xl font-black flex items-center justify-center border border-slate-200">A+</button>
            </div>
            <div className="max-w-4xl mx-auto space-y-10">
              <div className="flex items-center gap-3">
                 <span className="px-5 py-2 bg-indigo-900 text-white rounded-full text-[11px] font-black uppercase tracking-[0.2em]">{q.type}</span>
                 <span className="px-5 py-2 bg-amber-100 text-amber-700 rounded-full text-[11px] font-black uppercase tracking-[0.2em]">LEVEL {q.level}</span>
              </div>
              {/* Diubah dari font-bold ke font-medium */}
              <div className={`prose max-w-none font-medium text-slate-800 leading-relaxed transition-all duration-300 rich-content ${questionSizeClasses[questionZoom]}`} dangerouslySetInnerHTML={{ __html: formatRichText(q.text) }}></div>
              {q.image && <div className="rounded-[3rem] border-8 border-slate-50 overflow-hidden shadow-2xl mt-12"><img src={q.image} className="w-full h-auto object-contain" alt="Stimulus" /></div>}
            </div>
          </div>
          <div onMouseDown={startResizing} className={`hidden lg:flex w-2 bg-slate-50 cursor-col-resize hover:bg-indigo-500/20 transition-all group items-center justify-center relative z-20 ${isResizing ? 'bg-indigo-600' : ''}`}>
            <div className={`w-0.5 h-12 bg-slate-300 rounded-full group-hover:bg-indigo-400 ${isResizing ? 'bg-white' : ''}`}></div>
          </div>
          <div style={{ width: window.innerWidth >= 1024 ? `${100 - splitWidth}%` : '100%' }} className="flex-grow overflow-y-auto bg-slate-50/50 p-8 md:p-12 space-y-8 relative group/right">
            <div className="absolute top-6 right-8 flex gap-2 opacity-0 group-hover/right:opacity-100 transition-opacity z-10">
               <button onClick={() => setOptionsZoom(Math.max(0, optionsZoom - 1))} className="w-10 h-10 bg-white hover:bg-indigo-50 text-slate-600 rounded-xl font-black flex items-center justify-center border border-slate-200">A-</button>
               <button onClick={() => setOptionsZoom(Math.min(optionsSizeClasses.length - 1, optionsZoom + 1))} className="w-10 h-10 bg-white hover:bg-indigo-50 text-slate-600 rounded-xl font-black flex items-center justify-center border border-slate-200">A+</button>
            </div>
            <div className="lg:hidden space-y-6 mb-8 border-b pb-8">
               {/* Diubah dari font-bold ke font-medium */}
               <div className={`prose font-medium text-slate-800 rich-content ${questionSizeClasses[questionZoom]}`} dangerouslySetInnerHTML={{ __html: formatRichText(q.text) }}></div>
               {q.image && <img src={q.image} className="w-full h-auto rounded-2xl" />}
            </div>
            <div className="space-y-4">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Pilihan Jawaban</h3>
              {isTable && (
                <div className="bg-white rounded-[2rem] border-4 border-slate-100 overflow-hidden shadow-sm">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50 border-b-4 border-slate-100">
                      <tr>
                        <th className="p-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Pernyataan</th>
                        <th className="p-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center w-32">Pilih</th>
                      </tr>
                    </thead>
                    <tbody>
                      {q.options.map((opt, i) => {
                        const correctVal = Array.isArray(q.correctAnswer) ? q.correctAnswer[i] : null;
                        const userVal = Array.isArray(userAnswer) ? userAnswer[i] : null;
                        const isUserRowWrong = hasChecked && userVal !== null && userVal !== correctVal;
                        return (
                          <tr key={i} className={`border-b border-slate-50 last:border-0 transition-colors hover:bg-slate-50 ${isUserRowWrong ? 'bg-rose-50' : (hasChecked ? 'bg-emerald-50/20' : '')}`}>
                            {/* Diubah dari font-bold ke font-normal */}
                            <td className={`p-5 font-normal text-slate-700 transition-all duration-300 ${optionsSizeClasses[optionsZoom]}`} dangerouslySetInnerHTML={{ __html: formatRichText(opt) }} />
                            <td className="p-5 text-center">
                              <div className="flex gap-2 justify-center">
                                 <button disabled={hasChecked} onClick={() => { const next = [...(userAnswer || [])]; next[i] = true; setUserAnswer(next); }} className={`w-10 h-10 rounded-xl font-black text-xs transition-all border-2 ${userAnswer?.[i] === true ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-slate-200 text-slate-400'} ${hasChecked && correctVal === true ? 'ring-4 ring-emerald-500 ring-offset-2 !bg-emerald-600 !text-white !border-emerald-600' : ''}`}>{q.type === QuestionType.BenarSalah ? 'B' : 'S'}</button>
                                 <button disabled={hasChecked} onClick={() => { const next = [...(userAnswer || [])]; next[i] = false; setUserAnswer(next); }} className={`w-10 h-10 rounded-xl font-black text-xs transition-all border-2 ${userAnswer?.[i] === false ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-slate-200 text-slate-400'} ${hasChecked && correctVal === false ? 'ring-4 ring-emerald-500 ring-offset-2 !bg-emerald-600 !text-white !border-emerald-600' : ''}`}>{q.type === QuestionType.BenarSalah ? 'S' : 'TS'}</button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
              {(!isEssay && !isTable) && q.options.map((opt, i) => {
                 const isOptCorrect = (q.type === QuestionType.PilihanGanda && q.correctAnswer === i) || (q.type === QuestionType.MCMA && Array.isArray(q.correctAnswer) && q.correctAnswer.includes(i));
                 const isSelected = isMCMA ? (Array.isArray(userAnswer) && userAnswer.includes(i)) : userAnswer === i;
                 const isUserWrong = hasChecked && isSelected && !isOptCorrect;
                 return (
                   <button key={i} disabled={hasChecked} onClick={() => { if (isMCMA) { const next = [...(userAnswer || [])]; if (next.includes(i)) setUserAnswer(next.filter(x => x !== i)); else setUserAnswer([...next, i]); } else { setUserAnswer(i); } }} className={`w-full text-left p-4 rounded-[1.5rem] border-4 flex items-center gap-4 transition-all duration-300 ${isSelected ? 'border-indigo-600 ring-4 ring-indigo-50' : 'border-white'} ${hasChecked && isOptCorrect ? 'bg-emerald-50 border-emerald-500 scale-[1.02] shadow-xl' : (isUserWrong ? 'bg-rose-50 border-rose-500' : 'bg-white shadow-sm')}`}>
                      <div className={`w-10 h-10 shrink-0 rounded-xl flex items-center justify-center transition-all ${isSelected ? 'bg-indigo-600 text-white' : (hasChecked && isOptCorrect ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-400')}`}>
                        {isMCMA ? (isSelected ? <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg> : <div className="w-5 h-5 border-2 border-slate-300 rounded-md"></div>) : <span className="text-base font-black">{String.fromCharCode(65+i)}</span>}
                      </div>
                      {/* Diubah dari font-bold ke font-normal */}
                      <div className={`font-normal flex-grow transition-all duration-300 ${hasChecked && isOptCorrect ? 'text-emerald-900' : (isUserWrong ? 'text-rose-900' : 'text-slate-700')} ${optionsSizeClasses[optionsZoom]}`} dangerouslySetInnerHTML={{ __html: formatRichText(opt) }} />
                   </button>
                 );
               })}
               {isEssay && (
                 <div className="space-y-6">
                    {q.type === QuestionType.Isian ? (
                      <div className={`bg-white p-8 rounded-[2rem] border-4 shadow-sm space-y-4 transition-all ${hasChecked ? (isCorrect ? 'border-emerald-500 bg-emerald-50' : 'border-rose-500 bg-rose-50') : 'border-slate-100'}`}>
                        <div className="flex items-center gap-3"><span className="text-2xl">✍️</span><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ketik Jawaban Siswa</span></div>
                        <input disabled={hasChecked} type="text" className="w-full h-16 bg-white border-2 border-indigo-200 rounded-xl flex items-center px-6 font-black text-xl outline-none focus:border-indigo-600 transition-all" placeholder="Ketik di sini..." value={userAnswer || ''} onChange={e => setUserAnswer(e.target.value)} />
                      </div>
                    ) : (
                      <div className="bg-white p-10 rounded-[2.5rem] border-4 border-slate-100 shadow-sm space-y-6 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-5"><svg className="w-32 h-32" fill="currentColor" viewBox="0 0 24 24"><path d="M7.127 22.562l-7.127-1.414 1.414-7.128 15.116-11.020 5.713 5.713-15.116 12.849zm-4.767-2.528l3.62.718 11.23-9.544-4.337-4.338-10.513 7.664.001 5.5zm16.101-13.013l3.182-3.181 2.546 2.546-3.182 3.182-2.546-2.547z"/></svg></div>
                        <div className="flex items-center gap-4"><div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center font-black">?</div><h4 className="text-lg font-black text-slate-900 uppercase tracking-tight">Analisis Uraian Bersama</h4></div>
                        <textarea disabled={hasChecked} className="w-full min-h-[150px] p-6 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl font-medium text-slate-600 outline-none focus:border-indigo-400" placeholder="Guru dapat menulis poin-poin jawaban siswa di sini untuk didiskusikan..." value={userAnswer || ''} onChange={e => setUserAnswer(e.target.value)} />
                      </div>
                    )}
                 </div>
               )}
            </div>
            <div className="space-y-4 pt-6">
              {!hasChecked ? (
                <button onClick={checkAnswer} disabled={userAnswer === null || (Array.isArray(userAnswer) && userAnswer.every(x => x === null))} className="w-full py-5 bg-indigo-600 text-white rounded-[2rem] font-black text-lg uppercase tracking-[0.3em] shadow-2xl hover:bg-indigo-700 disabled:opacity-30 disabled:grayscale transition-all flex items-center justify-center gap-4"><span>✅</span>Periksa Jawaban</button>
              ) : (
                <div className="space-y-4 animate-slide-in">
                   {isCorrect ? (
                     <div className="p-6 bg-emerald-600 text-white rounded-[2rem] text-center font-black text-xl shadow-xl flex items-center justify-center gap-4"><span className="text-3xl">🎉</span>JAWABAN BENAR! KERJA BAGUS!</div>
                   ) : (
                     <div className="p-6 bg-rose-600 text-white rounded-[2rem] shadow-xl space-y-3">
                        <div className="flex items-center gap-4 font-black text-xl"><span className="text-3xl">❌</span>JAWABAN KURANG TEPAT</div>
                     </div>
                   )}
                   {!showExplanation ? (
                     <button onClick={() => setShowExplanation(true)} className="w-full py-5 bg-slate-900 text-white rounded-[2rem] font-black text-lg uppercase tracking-[0.3em] shadow-2xl hover:bg-indigo-600 transition-all flex items-center justify-center gap-4 group"><span>✨</span>Tampilkan Pembahasan</button>
                   ) : (
                     <div className="p-8 rounded-[2.5rem] discussion-gradient border-4 border-indigo-100 shadow-2xl animate-slide-in space-y-6"><div className="flex items-center gap-5 border-b border-indigo-100 pb-5"><div className="w-14 h-14 shrink-0 bg-indigo-600 rounded-2xl flex items-center justify-center text-xl">💡</div><div><h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Langkah Penyelesaian</h3><p className="text-indigo-600 font-black text-[10px] uppercase tracking-widest">Solusi Berbasis Konsep</p></div></div><div className={`prose max-w-none text-slate-700 leading-relaxed font-normal explanation-text transition-all duration-300 ${optionsSizeClasses[optionsZoom]}`} dangerouslySetInnerHTML={{ __html: formatRichText(q.explanation || 'Pembahasan belum tersedia.') }}></div></div>
                   )}
                </div>
              )}
            </div>
          </div>
        </main>
        <footer className="bg-white border-t px-8 py-6 flex justify-between items-center z-40">
           <button disabled={currentQuestionIndex === 0} onClick={() => { const idx = currentQuestionIndex - 1; setCurrentQuestionIndex(idx); resetInteraction(idx, displayQuestions); }} className="px-10 py-5 bg-slate-100 rounded-[2rem] font-black text-xs uppercase text-slate-500 disabled:opacity-20">Kembali</button>
           <div className="flex items-center gap-6"><span className="text-lg font-black text-slate-900">{currentQuestionIndex + 1} / {displayQuestions.length}</span></div>
           <button onClick={() => { if (currentQuestionIndex < displayQuestions.length - 1) { const idx = currentQuestionIndex + 1; setCurrentQuestionIndex(idx); resetInteraction(idx, displayQuestions); } else { setView('landing'); } }} className="px-10 py-5 bg-indigo-600 text-white rounded-[2rem] font-black text-xs uppercase shadow-xl">{currentQuestionIndex < displayQuestions.length - 1 ? 'Berikutnya' : 'Selesai'}</button>
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Header />
      <div className="bg-slate-900 text-white px-8 py-3 flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
        <div className="flex items-center gap-3"><span className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></span><span>Admin Workspace</span></div>
        <div className="flex gap-4 items-center">
          {activeQuestionsSorted.length > 0 && (
            <>
              <button onClick={handleGenerateMaterial} className="bg-amber-600 hover:bg-amber-700 px-4 py-1.5 rounded-lg flex items-center gap-2 transition-all shadow-lg">
                <span>✨</span><span>Susun Materi Ajar</span>
              </button>
              <button onClick={handleExportQuestions} className="bg-emerald-600 hover:bg-emerald-700 px-4 py-1.5 rounded-lg flex items-center gap-2 transition-all shadow-lg">
                <span>📑</span><span>Ekspor ke Excel</span>
              </button>
            </>
          )}
          <button onClick={() => setView('landing')} className="bg-rose-600 hover:bg-rose-700 px-4 py-1.5 rounded-lg transition-all font-black">Exit Admin</button>
        </div>
      </div>
      <main className="max-w-7xl mx-auto p-6 w-full grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-5 space-y-6">
          <div className="flex bg-slate-200 p-1 rounded-2xl">
            <button onClick={() => setAdminMode('manual')} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${adminMode === 'manual' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}>✍️ Input Manual</button>
            <button onClick={() => setAdminMode('ai')} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${adminMode === 'ai' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500'}`}>✨ Generate AI</button>
          </div>
          <div className="bg-white p-8 rounded-3xl shadow-sm border">
            {adminMode === 'manual' ? <ManualEntryForm onAdd={(q) => setQuestions(p => [...p, q])} defaultSubject="Bahasa Indonesia" defaultPhase="Fase C" defaultToken={activeToken || "LAT1"} /> : <GenerationForm onGenerate={async (c) => { setLoading(true); try { const r = await generateEduCBTQuestions(c); setQuestions(p => [...p, ...r]); setActiveToken(c.quizToken.toUpperCase()); } finally {setLoading(false);} }} onImportJson={(imported) => setQuestions(prev => [...prev, ...imported])} isLoading={loading} examSettings={exerciseSettings} setExamSettings={setExerciseSettings} />}
          </div>
        </div>
        <div className="lg:col-span-7">
          <div className="flex justify-between items-center mb-6"><h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Bank Soal ({activeQuestionsSorted.length})</h3>{activeQuestionsSorted.some(q => q.teachingMaterial) && <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-lg text-[9px] font-black uppercase tracking-widest">✅ Materi Tersedia</span>}</div>
          <QuestionList questions={activeQuestionsSorted} onEdit={q=>setEditingId(q.id)} onDelete={id=>setQuestions(p=>p.map(it=>it.id===id?{...it,isDeleted:true}:it))} onMagicRepair={async (id) => { const q = questions.find(it => it.id === id); if (q) { setLoading(true); try { const r = await repairQuestionOptions(q); setQuestions(p => p.map(it => it.id === id ? r : it)); } finally { setLoading(false); } } }} isMagicLoading={loading} />
        </div>
      </main>
      {editingId && <QuestionEditor question={questions.find(q=>q.id===editingId)!} onSave={u=>{setQuestions(p=>p.map(q=>q.id===u.id?u:q));setEditingId(null);}} onClose={()=>setEditingId(null)} />}
    </div>
  );
};

export default App;
