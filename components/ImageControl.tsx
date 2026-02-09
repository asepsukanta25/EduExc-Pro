
import React, { useState, useEffect } from 'react';

interface Props {
  currentImage?: string;
  onImageChange: (url: string | undefined) => void;
  label: string;
}

const ImageControl: React.FC<Props> = ({ currentImage, onImageChange, label }) => {
  const [urlInput, setUrlInput] = useState(currentImage || '');
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
    setUrlInput(currentImage || '');
  }, [currentImage]);

  const extractSrcFromHtml = (input: string): string => {
    const trimmed = input.trim();
    // Jika input terlihat seperti tag HTML (diawali <)
    if (trimmed.startsWith('<')) {
      const srcMatch = trimmed.match(/src=["']([^"']+)["']/);
      return srcMatch ? srcMatch[1] : trimmed;
    }
    return trimmed;
  };

  const handleApplyUrl = () => {
    setImgError(false);
    const finalUrl = extractSrcFromHtml(urlInput);
    if (finalUrl) {
      onImageChange(finalUrl);
      // Update input field dengan URL bersih yang diekstrak
      if (finalUrl !== urlInput) setUrlInput(finalUrl);
    } else {
      onImageChange(undefined);
    }
  };

  const openExternalTool = () => {
    window.open('https://id.imgbb.com/', '_blank');
  };

  const isNotDirectLink = urlInput.trim().length > 0 && 
                          !urlInput.startsWith('<') && 
                          urlInput.includes('ibb.co/') && 
                          !urlInput.match(/\.(jpg|jpeg|png|gif|webp|bmp)$/i) && 
                          !urlInput.includes('i.ibb.co');

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{label}</label>
        {currentImage && (
          <button 
            onClick={() => {
              onImageChange(undefined);
              setUrlInput('');
              setImgError(false);
            }}
            className="text-[10px] font-bold text-rose-500 hover:underline"
          >
            Hapus Gambar
          </button>
        )}
      </div>

      <div className="space-y-3">
        {currentImage && (
          <div className={`relative group w-full min-h-[150px] rounded-xl overflow-hidden border-2 flex items-center justify-center transition-all ${imgError ? 'border-rose-200 bg-rose-50' : 'border-slate-200 bg-slate-50'}`}>
            {!imgError ? (
              <img 
                src={currentImage} 
                className="max-w-full max-h-48 object-contain" 
                alt="Preview" 
                onError={() => setImgError(true)}
              />
            ) : (
              <div className="p-6 text-center">
                <svg className="w-10 h-10 text-rose-300 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <p className="text-[11px] font-black text-rose-600 uppercase">Gambar Gagal Dimuat</p>
                <p className="text-[9px] text-rose-400 mt-1">Pastikan menggunakan <b>Direct Link</b> atau <b>Kode HTML</b> yang benar</p>
              </div>
            )}
            {!imgError && (
              <div className="absolute inset-0 bg-slate-900/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                 <span className="bg-white/90 px-3 py-1 rounded-full text-[10px] font-black text-slate-700 shadow-sm uppercase">Pratinjau Gambar</span>
              </div>
            )}
          </div>
        )}

        <div className="flex flex-col gap-2">
          {isNotDirectLink && (
            <div className="p-2 bg-amber-50 border border-amber-200 rounded-lg text-[9px] text-amber-700 font-bold leading-tight">
              ⚠️ Link terdeteksi sebagai halaman web. Jika menggunakan ImgBB, salin bagian <b>"HTML Full Linked"</b> lalu tempel di sini, atau ambil <b>"Direct Link"</b>.
            </div>
          )}
          
          <div className="flex gap-2">
            <input 
              type="text" 
              placeholder="Tempel URL Gambar atau Kode HTML <img src='...'>" 
              className={`flex-grow px-4 py-2 text-xs font-medium rounded-xl border outline-none transition-all shadow-sm ${isNotDirectLink ? 'border-amber-300 bg-amber-50' : 'border-slate-200 focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400'}`}
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleApplyUrl()}
            />
            <button 
              type="button"
              onClick={handleApplyUrl}
              className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-indigo-700 active:scale-95 transition-all shadow-md"
            >
              Pasang
            </button>
          </div>
          
          <button 
            type="button"
            onClick={openExternalTool}
            className="w-full py-2.5 px-4 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-emerald-100 transition-all group"
          >
            <svg className="w-4 h-4 group-hover:animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
            Ubah Gambar Menjadi HTML
          </button>
          <div className="text-[9px] text-slate-400 font-medium text-center space-y-1">
            <p>* Anda dapat menempelkan kode &lt;img&gt; langsung dari hasil upload ImgBB.</p>
            <p className="text-indigo-500 font-bold">Sistem akan otomatis mengambil URL dari atribut src.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageControl;
