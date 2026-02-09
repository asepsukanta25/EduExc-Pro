
import React from 'react';
import { EduCBTQuestion } from '../types';

interface Props {
  questions: EduCBTQuestion[];
}

const JsonPreview: React.FC<Props> = ({ questions }) => {
  const [copied, setCopied] = React.useState(false);
  
  if (questions.length === 0) return null;

  const jsonStr = JSON.stringify(questions, null, 2);

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonStr);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `educbt_questions_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-slate-900 rounded-xl overflow-hidden shadow-xl">
      <div className="bg-slate-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500"></div>
          <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
          <div className="w-3 h-3 rounded-full bg-green-500"></div>
          <span className="ml-2 text-xs font-mono text-slate-400">edu-cbt-export.json</span>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={handleCopy}
            className="text-xs font-semibold px-3 py-1 bg-slate-700 text-slate-300 rounded hover:bg-slate-600 transition-colors flex items-center gap-1"
          >
            {copied ? 'Copied!' : 'Copy JSON'}
          </button>
          <button 
            onClick={handleDownload}
            className="text-xs font-semibold px-3 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-500 transition-colors flex items-center gap-1"
          >
            Download File
          </button>
        </div>
      </div>
      <div className="p-4 max-h-[600px] overflow-auto">
        <pre className="text-xs font-mono text-green-400 leading-relaxed">
          {jsonStr}
        </pre>
      </div>
    </div>
  );
};

export default JsonPreview;
