import React from 'react';
import { X, Download, Maximize2, Minimize2, ExternalLink, Printer, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface PdfViewerProps {
  url: string;
  name: string;
  isOpen: boolean;
  onClose: () => void;
  onDownload: () => void;
}

const PdfViewer: React.FC<PdfViewerProps> = ({ url, name, isOpen, onClose, onDownload }) => {
  const [isFullscreen, setIsFullscreen] = React.useState(false);

  // In production, Google Drive links need /view or /preview instead of /uc?id=...&export=download for viewing
  const getEmbedUrl = (originalUrl: string) => {
    if (originalUrl.includes('drive.google.com')) {
      const fileIdMatch = originalUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || originalUrl.match(/id=([a-zA-Z0-9_-]+)/);
      if (fileIdMatch && fileIdMatch[1]) {
        return `https://drive.google.com/file/d/${fileIdMatch[1]}/preview`;
      }
    }
    return originalUrl;
  };

  const handlePrint = () => {
    const iframe = document.querySelector('iframe');
    if (iframe) {
      try {
        iframe.contentWindow?.print();
      } catch (e) {
        // Fallback if cross-origin prevents direct print call
        window.open(url, '_blank')?.print();
      }
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className={`bg-white dark:bg-slate-900 w-full h-full max-w-6xl rounded-2xl overflow-hidden shadow-2xl flex flex-col border border-dz-gold/30 ${isFullscreen ? 'fixed inset-0 z-[101] max-w-none rounded-none' : ''}`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="h-16 px-6 flex items-center justify-between border-b border-dz-gold/20 bg-dz-green dark:bg-dz-green-dark text-white">
              <div className="flex items-center gap-4 flex-1 truncate">
                <span className="font-black text-sm md:text-base truncate">{name}</span>
              </div>
              
              <div className="flex items-center gap-2">
                <button 
                  onClick={onDownload}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors group"
                  title="تحميل"
                >
                  <Download size={20} className="group-hover:scale-110 transition-transform" />
                </button>
                <button 
                  onClick={handlePrint}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors group"
                  title="طباعة"
                >
                  <Printer size={20} className="group-hover:scale-110 transition-transform" />
                </button>
                <button 
                  onClick={() => window.open(url, '_blank')}
                  className="hidden sm:block p-2 hover:bg-white/10 rounded-lg transition-colors group"
                  title="فتح في نافذة جديدة"
                >
                  <ExternalLink size={20} className="group-hover:scale-110 transition-transform" />
                </button>
                <button 
                  onClick={() => setIsFullscreen(!isFullscreen)}
                  className="hidden sm:block p-2 hover:bg-white/10 rounded-lg transition-colors group"
                  title="ملء الشاشة"
                >
                  {isFullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
                </button>
                <div className="w-px h-6 bg-white/20 mx-2" />
                <button 
                  onClick={onClose}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X size={24} />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 bg-slate-100 dark:bg-slate-800 relative flex flex-col items-center justify-center">
              <iframe 
                src={getEmbedUrl(url)} 
                className="w-full h-full border-none z-10"
                title={name}
              />
              <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center z-0">
                  <div className="w-16 h-16 bg-dz-gold/10 rounded-full flex items-center justify-center mb-4 border-2 border-dz-gold/20">
                    <FileText size={32} className="text-dz-gold animate-bounce" />
                  </div>
                  <h4 className="text-lg font-black text-dz-dark dark:text-white mb-2">جاري تحميل المعاينة...</h4>
                  <p className="text-xs text-slate-500 max-w-xs mb-6 font-bold">إذا لم يظهر الملف خلال ثوانٍ، قد يكون متصفحك يمنع المعاينة التلقائية.</p>
                  <button 
                    onClick={() => window.open(url, '_blank')}
                    className="flex items-center gap-2 px-6 py-3 bg-dz-green text-white rounded-xl font-black text-sm shadow-xl hover:scale-105 transition-transform"
                  >
                    <ExternalLink size={18} />
                    فتح الملف في نافذة مستقلة
                  </button>
              </div>
            </div>

            {/* Footer / Info */}
            <div className="h-12 px-6 bg-dz-bg dark:bg-dz-dark flex items-center justify-between text-[10px] font-black text-dz-green-dark dark:text-emerald-100 uppercase tracking-widest border-t border-dz-gold/20">
               <span>TAFAWAK.DZ PREVIEWER</span>
               <div className="flex items-center gap-4">
                  <span className="hidden sm:inline">نظام معاينة ذكي</span>
                  <div className="w-2 h-2 rounded-full bg-dz-gold animate-pulse" />
               </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PdfViewer;
