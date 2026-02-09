
import React, { useState } from 'react';
import { EduCBTQuestion, QuestionType } from '../types';

interface Props {
  questions: EduCBTQuestion[];
  onEdit: (q: EduCBTQuestion) => void;
  onDelete: (id: string) => void;
  onRestore?: (id: string) => void;
  onRegenerate?: (id: string, instructions?: string) => void;
  onQuickUpdate?: (id: string, field: 'order' | 'quizToken', value: string | number) => void;
  onChangeType?: (id: string, newType: QuestionType) => void;
  onMagicRepair?: (id: string) => void;
  isMagicLoading?: boolean;
  isTrashView?: boolean;
}

const QuestionList: React.FC<Props> = ({ 
  questions, onEdit, onDelete, onRestore, onRegenerate, onQuickUpdate, onChangeType, onMagicRepair, isMagicLoading, isTrashView = false 
}) => {
  const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({});

  const isOptionCorrect = (q: EduCBTQuestion, index: number): boolean => {
    if (q.type === QuestionType.PilihanGanda) return q.correctAnswer === index;
    if (q.type === QuestionType.MCMA) return Array.isArray(q.correctAnswer) && (q.correctAnswer as number[]).includes(index);
    if (q.type === QuestionType.BenarSalah || q.type === QuestionType.SesuaiTidakSesuai) return Array.isArray(q.correctAnswer) && (q.correctAnswer as boolean[])[index] === true;
    return false;
  };

  const handleImgError = (id: string) => {
    setImgErrors(prev => ({ ...prev, [id]: true }));
  };

  const formatRichText = (text: string) => {
    if (!text) return "";
    let html = text;

    // 1. KaTeX
    // @ts-ignore
    if (window.katex) {
      html = html.replace(/\$\$(.*?)\$\$/gs, (match, formula) => {
        try {
          // @ts-ignore
          return window.katex.renderToString(formula, { displayMode: true, throwOnError: false });
        } catch (e) { return match; }
      });
      html = html.replace(/\$(.*?)\$/g, (match, formula) => {
        try {
          // @ts-ignore
          return window.katex.renderToString(formula, { displayMode: false, throwOnError: false });
        } catch (e) { return match; }
      });
    }

    // 2. Markdown Tables
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
    if (inTable && tableRows.length >= 2) {
      processedLines.push(renderTable(tableRows));
    }
    html = processedLines.join('\n');

    // 3. Markdown Basic
    html = html
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>');
    
    // 4. Line Breaks
    html = html
      .replace(/\n\n\n/g, '<br/><br/><br/>')
      .replace(/\n\n/g, '<br/><br/>')
      .replace(/\n/g, '<br/>');

    return html;
  };

  const renderTable = (rows: string[]): string => {
    const tableData = rows.map(row => 
      row.split('|')
         .filter((_, idx, arr) => idx > 0 && idx < arr.length - 1)
         .map(cell => cell.trim())
    );

    if (tableData.length < 2) return rows.join('\n');

    const headers = tableData[0];
    const body = tableData.slice(2);

    const headerHtml = `<thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>`;
    const bodyHtml = `<tbody>${body.map(row => `<tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>`).join('')}</tbody>`;

    return `<div class="markdown-table-container"><table class="markdown-table">${headerHtml}${bodyHtml}</table></div>`;
  };

  return (
    <div className="space-y-6">
      {questions.map((q) => {
        const isObjective = q.type !== QuestionType.Isian && q.type !== QuestionType.Uraian;
        const needsRepair = isObjective && q.options.length === 0;

        return (
          <div key={q.id} className={`bg-white rounded-[2rem] border shadow-sm overflow-hidden transition-all hover:shadow-md ${isTrashView ? 'opacity-70' : 'border-slate-200'} ${needsRepair ? 'ring-2 ring-rose-500 ring-offset-2' : ''}`}>
            <div className="bg-slate-50/80 px-6 py-3 border-b flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="px-2 py-1 bg-slate-900 text-white rounded-lg text-[10px] font-black">#{q.order}</div>
                <span className="text-[10px] font-black px-2 py-1 bg-indigo-100 text-indigo-700 rounded-lg uppercase tracking-wider">{q.type}</span>
                <span className="text-[10px] font-black px-2 py-1 bg-amber-100 text-amber-700 rounded-lg uppercase">{q.level}</span>
              </div>
              <div className="flex gap-2">
                {!isTrashView ? (
                  <>
                    {needsRepair && (
                      <button disabled={isMagicLoading} onClick={() => onMagicRepair?.(q.id)} className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 text-white rounded-xl hover:bg-amber-600 shadow-sm transition-all">
                        <span className="text-[9px] font-black uppercase tracking-tight">Auto Fix</span>
                        <span className="text-xs">✨</span>
                      </button>
                    )}
                    <button onClick={() => onEdit(q)} className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all active:scale-95">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                      <span className="text-[9px] font-black uppercase tracking-widest">Edit Soal</span>
                    </button>
                    <button onClick={() => onDelete(q.id)} className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all" title="Hapus">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </>
                ) : (
                  <button onClick={() => onRestore?.(q.id)} className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-[9px] font-black uppercase">Pulihkan</button>
                )}
              </div>
            </div>

            <div className="p-6 space-y-5">
              {/* Diubah dari font-medium ke font-normal */}
              <div className="prose prose-slate max-w-none text-slate-800 font-normal leading-relaxed rich-content" dangerouslySetInnerHTML={{ __html: formatRichText(q.text) }}></div>
              
              {q.image && !imgErrors[q.id] && (
                <div className="max-w-md border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
                  <img src={q.image} className="w-full h-auto object-contain max-h-[300px]" alt="Stimulus" onError={() => handleImgError(q.id)} />
                </div>
              )}

              {needsRepair ? (
                <div className="p-6 bg-rose-50 border border-rose-100 rounded-[2rem] text-center">
                  <p className="text-[10px] font-black text-rose-600 uppercase tracking-widest">Data Opsi Kosong - Perlu Diperbaiki</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {q.options.map((opt, i) => {
                    const isCorrect = isOptionCorrect(q, i);
                    return (
                      <div key={i} className={`p-4 rounded-2xl border-2 flex items-center gap-4 transition-all ${isCorrect ? 'bg-emerald-50 border-emerald-500/30' : 'bg-slate-50 border-slate-100'}`}>
                        <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-black transition-all ${isCorrect ? 'bg-emerald-500 text-white' : 'bg-white text-slate-400 border border-slate-200'}`}>{String.fromCharCode(65+i)}</span>
                        {/* Diubah dari font-bold ke font-normal */}
                        <span className="text-xs font-normal text-slate-700" dangerouslySetInnerHTML={{ __html: formatRichText(opt) }} />
                        {isCorrect && <svg className="ml-auto w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>}
                      </div>
                    );
                  })}
                </div>
              )}
              
              {q.explanation && (
                <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex gap-3 items-start">
                  <div className="bg-amber-100 p-1 rounded-lg"><svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></div>
                  <div>
                    <span className="font-black uppercase block mb-1 text-[9px] tracking-wider text-amber-700">Analisis Pakar:</span>
                    {/* Diubah dari font-medium ke font-normal */}
                    <div className="text-[10px] font-normal text-amber-800 leading-relaxed italic explanation-text" dangerouslySetInnerHTML={{ __html: formatRichText(q.explanation) }}></div>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default QuestionList;
