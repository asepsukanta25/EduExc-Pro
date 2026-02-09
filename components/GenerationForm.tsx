
import React, { useState } from 'react';
import { GenerationConfig, QuestionType, EduCBTQuestion } from '../types';
import { downloadExcelTemplate, importQuestionsFromExcel } from '../utils/exportUtils';

interface Props {
  onGenerate: (config: GenerationConfig) => void;
  onImportJson: (questions: EduCBTQuestion[]) => void;
  isLoading: boolean;
  examSettings: {
    shuffleQuestions: boolean;
    shuffleOptions: boolean;
    duration: number;
  };
  setExamSettings: React.Dispatch<React.SetStateAction<{
    shuffleQuestions: boolean;
    shuffleOptions: boolean;
    duration: number;
  }>>;
}

const GenerationForm: React.FC<Props> = ({ onGenerate, onImportJson, isLoading, examSettings, setExamSettings }) => {
  const [formData, setFormData] = useState<GenerationConfig>({
    subject: 'Bahasa Indonesia',
    phase: 'Fase C',
    material: '',
    typeCounts: {
      [QuestionType.PilihanGanda]: 5,
      [QuestionType.MCMA]: 0,
      [QuestionType.BenarSalah]: 0,
      [QuestionType.SesuaiTidakSesuai]: 0,
      [QuestionType.Isian]: 0,
      [QuestionType.Uraian]: 0,
    },
    levelCounts: { 'L1': 2, 'L2': 2, 'L3': 1 },
    quizToken: '',
    referenceText: '',
    specialInstructions: ''
  });

  const [refFileName, setRefFileName] = useState<string | null>(null);
  const [refPreview, setRefPreview] = useState<string | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isImportingExcel, setIsImportingExcel] = useState(false);

  const handleExcelImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsImportingExcel(true);
    try {
      const questions = await importQuestionsFromExcel(file);
      onImportJson(questions);
      alert(`Berhasil mengimpor ${questions.length} soal dari Excel.`);
    } catch (err) {
      alert("Gagal memproses file Excel. Pastikan format kolom benar.");
    } finally {
      setIsImportingExcel(false);
      e.target.value = ''; // Reset input
    }
  };

  const handleFileReference = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setRefFileName(file.name);
    setIsExtracting(true);
    try {
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = (evt) => {
          const base64 = (evt.target?.result as string).split(',')[1];
          setFormData(prev => ({ ...prev, referenceImage: { data: base64, mimeType: file.type }, referenceText: '' }));
          setRefPreview(evt.target?.result as string);
        };
        reader.readAsDataURL(file);
      } else if (file.type === "application/pdf") {
        const pdfJS = (window as any).pdfjsLib;
        pdfJS.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfJS.getDocument({ data: arrayBuffer }).promise;
        let fullText = "";
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          fullText += content.items.map((item: any) => item.str).join(" ") + "\n";
        }
        setFormData(prev => ({ ...prev, referenceText: fullText, referenceImage: undefined }));
      } else if (file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
        const mammoth = (window as any).mammoth;
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        setFormData(prev => ({ ...prev, referenceText: result.value, referenceImage: undefined }));
      } else {
        const text = await file.text();
        setFormData(prev => ({ ...prev, referenceText: text, referenceImage: undefined }));
      }
    } catch (err) { alert("Gagal membaca dokumen."); } finally { setIsExtracting(false); }
  };

  const totalTypes = (Object.values(formData.typeCounts) as number[]).reduce((a, b) => (a || 0) + (b || 0), 0);
  const totalLevels = (Object.values(formData.levelCounts) as number[]).reduce((a, b) => (a || 0) + (b || 0), 0);
  const isMismatch = totalTypes !== totalLevels;

  return (
    <div className="space-y-8">
      <form onSubmit={(e) => { e.preventDefault(); onGenerate(formData); }} className="space-y-6">
        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 space-y-4">
          <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest border-b border-slate-800 pb-2">AI Generation Engine</h4>
          <div className="grid grid-cols-2 gap-4">
            <label className="flex items-center gap-3 bg-slate-800/50 p-3 rounded-xl border border-slate-700 cursor-pointer group">
              <input type="checkbox" checked={examSettings.shuffleQuestions} onChange={e => setExamSettings({...examSettings, shuffleQuestions: e.target.checked})} className="w-5 h-5 accent-indigo-500" />
              <span className="text-[10px] font-bold text-slate-300 uppercase">Acak Soal</span>
            </label>
            <label className="flex items-center gap-3 bg-slate-800/50 p-3 rounded-xl border border-slate-700 cursor-pointer group">
              <input type="checkbox" checked={examSettings.shuffleOptions} onChange={e => setExamSettings({...examSettings, shuffleOptions: e.target.checked})} className="w-5 h-5 accent-indigo-500" />
              <span className="text-[10px] font-bold text-slate-300 uppercase">Acak Opsi</span>
            </label>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100">
            <label className="block text-[10px] font-black text-blue-700 uppercase mb-2">Mata Pelajaran</label>
            <input required type="text" className="w-full px-4 py-2 rounded-lg border border-blue-200 bg-white text-sm font-bold outline-none" value={formData.subject} onChange={(e) => setFormData({ ...formData, subject: e.target.value })} />
          </div>
          <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100">
            <label className="block text-[10px] font-black text-blue-700 uppercase mb-2">Token Paket</label>
            <input required type="text" className="w-full px-4 py-2 rounded-lg border border-blue-200 bg-white text-sm font-bold outline-none uppercase" value={formData.quizToken} onChange={(e) => setFormData({ ...formData, quizToken: e.target.value.toUpperCase() })} />
          </div>
        </div>

        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
          <div className="flex justify-between items-center mb-2">
            <label className="block text-[10px] font-black text-slate-500 uppercase">Referensi Dokumen (AI)</label>
            {(refFileName || refPreview) && (
              <button type="button" onClick={() => { 
                setRefFileName(null); 
                setRefPreview(null); 
                setFormData(p => ({...p, referenceText: '', referenceImage: undefined})); 
              }} className="text-[9px] font-bold text-rose-500 hover:underline">Hapus</button>
            )}
          </div>
          
          <label className={`flex flex-col items-center justify-center p-4 border-2 border-dashed rounded-xl cursor-pointer transition-all ${isExtracting ? 'bg-indigo-50 border-indigo-300' : 'bg-white border-slate-200 hover:border-indigo-400'}`}>
            {isExtracting ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-xs font-bold text-indigo-600 uppercase">Menganalisis...</span>
              </div>
            ) : refPreview ? (
              <div className="flex flex-col items-center gap-2">
                <img src={refPreview} className="h-20 w-auto rounded border shadow-sm" alt="Preview" />
                <span className="text-[10px] font-black text-indigo-600 uppercase tracking-tight">Terlampir: {refFileName}</span>
              </div>
            ) : (
              <>
                <svg className="w-6 h-6 text-slate-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                <span className="text-[10px] font-bold text-slate-600 uppercase">Klik Upload Referensi Soal</span>
              </>
            )}
            <input type="file" className="hidden" accept=".pdf, .docx, .txt, .jpg, .jpeg, .png, .webp" onChange={handleFileReference} />
          </label>
        </div>

        <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100">
          <label className="block text-[10px] font-black text-emerald-800 uppercase mb-2">Materi Utama / CP</label>
          <textarea required rows={2} className="w-full px-4 py-2 rounded-lg border border-emerald-200 bg-white text-sm font-medium outline-none" value={formData.material} onChange={(e) => setFormData({ ...formData, material: e.target.value })} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-amber-50/50 p-4 rounded-xl border border-amber-100">
            <label className="block text-[10px] font-black text-amber-800 uppercase mb-3 tracking-widest">Level Kognitif</label>
            <div className="flex gap-2">
              {['L1', 'L2', 'L3'].map(lvl => (
                <div key={lvl} className="flex-1 bg-white p-2 rounded-xl border border-amber-200 text-center shadow-sm">
                  <span className="block text-[10px] font-black text-amber-600 mb-1">{lvl}</span>
                  <input type="number" min={0} className="w-full bg-transparent text-center font-black text-base outline-none text-slate-700" value={formData.levelCounts[lvl]} onChange={(e) => setFormData({...formData, levelCounts: {...formData.levelCounts, [lvl]: parseInt(e.target.value) || 0}})} />
                </div>
              ))}
            </div>
          </div>

          <div className="bg-yellow-50/50 p-4 rounded-xl border border-yellow-100">
            <div className="flex justify-between items-center mb-3">
              <label className="block text-[10px] font-black text-yellow-800 uppercase tracking-widest">Tipe Soal</label>
              <span className="text-[10px] font-black bg-yellow-200 text-yellow-900 px-2 py-0.5 rounded-full">Total: {totalTypes}</span>
            </div>
            <div className="space-y-2 max-h-[140px] overflow-y-auto pr-2 scrollbar-thin">
              {Object.values(QuestionType).map(type => (
                <div key={type} className="flex items-center justify-between gap-3 bg-white px-3 py-2 rounded-xl border border-yellow-200 shadow-sm hover:border-yellow-400 transition-colors">
                  <span className="text-[10px] font-bold text-slate-600 uppercase leading-tight flex-grow">{type}</span>
                  <input type="number" min={0} className="w-12 bg-yellow-50 text-center font-black text-sm outline-none rounded-lg py-0.5 border border-yellow-100 text-yellow-800" value={formData.typeCounts[type]} onChange={(e) => setFormData({...formData, typeCounts: {...formData.typeCounts, [type]: parseInt(e.target.value) || 0}})} />
                </div>
              ))}
            </div>
          </div>
        </div>

        <button disabled={isLoading || totalTypes === 0 || isMismatch} type="submit" className="w-full py-4 px-6 rounded-2xl font-black text-base uppercase tracking-widest text-white shadow-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 transition-all">
          {isLoading ? 'MENYUSUN...' : '✨ GENERATE SOAL AI'}
        </button>
      </form>

      <div className="border-t pt-8 space-y-4">
        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Bulk Operations (Excel)</h4>
        <div className="grid grid-cols-2 gap-4">
          <button 
            type="button" 
            onClick={downloadExcelTemplate}
            className="flex flex-col items-center justify-center p-4 bg-slate-50 border border-slate-200 rounded-2xl hover:bg-white hover:border-indigo-400 transition-all group"
          >
            <span className="text-xl mb-1 group-hover:scale-110 transition-transform">📥</span>
            <span className="text-[9px] font-black text-slate-600 uppercase tracking-wider">Download Template</span>
          </button>
          <label className={`flex flex-col items-center justify-center p-4 cursor-pointer bg-slate-50 border border-slate-200 rounded-2xl hover:bg-white hover:border-indigo-400 transition-all group ${isImportingExcel ? 'opacity-50' : ''}`}>
            <span className="text-xl mb-1 group-hover:scale-110 transition-transform">📤</span>
            <span className="text-[9px] font-black text-slate-600 uppercase tracking-wider">{isImportingExcel ? 'Mengimpor...' : 'Import Excel'}</span>
            <input type="file" className="hidden" accept=".xlsx, .xls" onChange={handleExcelImport} disabled={isImportingExcel} />
          </label>
        </div>
      </div>
    </div>
  );
};

export default GenerationForm;
