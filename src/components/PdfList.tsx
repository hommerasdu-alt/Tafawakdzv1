import React from 'react';
import { 
  FileText, 
  SortAsc, 
  CalendarDays, 
  Download, 
  Award, 
  ChevronRight, 
  ChevronLeft,
  AlertTriangle,
  Check,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { mapCodeToYear } from '../utils';

import PdfViewer from './PdfViewer';

interface RemoteFile {
  id: string | number;
  name: string;
  originalName?: string;
  year: string;
  hasCorrection: boolean;
  url: string;
  cycle: string;
  annee?: string;
  levelYear: string;
  subject: string;
  category: string;
}

interface Subject {
  id: string;
  arabicName: string;
  icon: any;
}

interface CategoryItemProps {
  category: { label: string; defaultCount: number };
  isOpen: boolean;
  onToggle: (isOpen: boolean) => void;
  selectedYear: string | null;
  selectedSubject: Subject | undefined;
  subjects: Subject[];
  remoteFiles: RemoteFile[];
  getDirectDownloadLink: (url: string) => string;
  onViewPdf: (url: string, name: string) => void;
  onConfirmDownload: (url: string, name: string) => void;
  getYearLabel: (id: string | null) => string;
}

const CategoryItem: React.FC<CategoryItemProps> = ({ 
  category, 
  isOpen, 
  onToggle, 
  selectedYear, 
  selectedSubject,
  subjects,
  remoteFiles,
  getDirectDownloadLink,
  onViewPdf,
  onConfirmDownload,
  getYearLabel
}) => {
  const [currentPage, setCurrentPage] = React.useState(1);
  const [sortBy, setSortBy] = React.useState<'name' | 'year'>('name');
  const [filterType, setFilterType] = React.useState<'all' | 'devoir' | 'examen' | 'correction'>('all');
  const ITEMS_PER_PAGE = 20;

  const categoryFiles = React.useMemo(() => remoteFiles.filter(f => {
    const matchesYear = f.levelYear === selectedYear;
    const matchesSubject = f.subject === selectedSubject?.id || f.subject === selectedSubject?.arabicName;
    const matchesCategory = f.category === category.label;
    return matchesYear && matchesSubject && matchesCategory;
  }), [remoteFiles, selectedYear, selectedSubject, category.label]);

  const stats = React.useMemo(() => {
    const total = categoryFiles.length > 0 ? categoryFiles.length : category.defaultCount;
    const withCorrection = categoryFiles.filter(f => f.hasCorrection).length;
    
    // Cycle detection
    let cycle = 'عام';
    if (selectedYear?.includes('ap')) cycle = 'الابتدائي';
    else if (selectedYear?.includes('am')) cycle = 'المتوسط';
    else if (selectedYear?.includes('as')) cycle = 'الثانوي';

    let trimester = '1';
    if (category.label.includes('الأول')) trimester = '1';
    else if (category.label.includes('الثاني')) trimester = '2';
    else if (category.label.includes('الثالث')) trimester = '3';

    return { 
      total, 
      withCorrection, 
      cycle,
      level: selectedYear || 'عام',
      subject: selectedSubject?.arabicName || 'غير معروف',
      trimester
    };
  }, [categoryFiles, category, selectedYear, selectedSubject]);

  const count = stats.total;

  const displayFiles = React.useMemo(() => {
    let files: any[] = [];
    if (categoryFiles.length > 0) {
      files = categoryFiles;
    } else {
      const subjectName = selectedSubject?.arabicName;
      // Define realistic years for placeholders (2020-2024)
      const years = [2024, 2023, 2022, 2021, 2020];
      files = years.map(num => ({
        id: `placeholder-${num}`,
        name: `الموضوع رقم ${num - 2006} - ${subjectName} - ${category.label.split('-')[1] || category.label}`,
        year: `${num}`,
        hasCorrection: num % 2 !== 0,
        url: '#',
        isPlaceholder: true,
        category: category.label
      }));
    }

    // Apply Filter
    let filtered = [...files];
    if (filterType !== 'all') {
      filtered = filtered.filter(f => {
        const name = f.name.toLowerCase();
        const cat = (f.category || '').toLowerCase();
        if (filterType === 'devoir') return name.includes('فرض') || cat.includes('فروض') || cat.includes('devoir');
        if (filterType === 'examen') return name.includes('اختبار') || cat.includes('اختبارات') || cat.includes('exam');
        if (filterType === 'correction') return f.hasCorrection || name.includes('تصحيح') || name.includes('correction') || name.includes('إجابة');
        return true;
      });
    }

    return filtered.sort((a, b) => {
      if (sortBy === 'year') {
        return b.year.localeCompare(a.year);
      }
      return a.name.localeCompare(b.name, 'ar');
    });
  }, [categoryFiles, selectedSubject, category.label, sortBy, filterType]);

  const isExamen = false; // Unified category
  const sectionColor = 'dz-green';
  const SectionIcon = FileText;

  return (
    <div className="flex flex-col">
      <motion.div 
        whileHover={{ x: -10 }}
        onClick={() => {
          onToggle(!isOpen);
          setCurrentPage(1);
          setFilterType('all');
        }}
        className={`${isOpen ? `bg-${sectionColor}/10 border-${sectionColor}` : 'bg-dz-green dark:bg-dz-green-dark'} py-3 px-4 flex items-center justify-between text-white transition-all cursor-pointer group shadow-xl border-b border-dz-gold/10`}
      >
          <div className="flex-1 text-center flex items-center justify-center gap-2 sm:gap-4 overflow-hidden">
            <span className={`${isOpen ? `text-${sectionColor}` : 'text-white'} text-[clamp(9px,2.5vw,14px)] font-black transition-colors leading-tight break-words py-1`}>
              {selectedSubject?.arabicName} - {category.label}
            </span>
            <div className="flex items-center gap-2">
              <span className={`bg-black/20 text-white/70 text-[9px] font-black px-2 py-0.5 rounded-full border border-white/10 flex items-center gap-1 transition-all shrink-0 ${isOpen ? `bg-${sectionColor} text-white` : 'group-hover:bg-dz-gold group-hover:text-dz-green-dark'}`}>
                <span>{count}</span>
              </span>
            </div>
          </div>
         <div className="w-8 h-8 flex items-center justify-center shrink-0">
            <SectionIcon size={16} className={`${isOpen ? `text-${sectionColor} animate-pulse` : 'text-white/60 group-hover:text-white'} transition-colors`} />
         </div>
      </motion.div>

      {isOpen && (
        <motion.div 
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          className={`bg-white dark:bg-dark-bg border-x-2 border-${sectionColor}/30 overflow-hidden`}
        >
          <div className={`flex flex-col border-b border-${sectionColor}/20 bg-dz-bg dark:bg-dark-bg/50`}>
            <div className="flex items-center justify-center gap-2 p-3 pb-1.5 flex-wrap">

              {[
                { id: 'all', label: 'الكل' },
                { id: 'devoir', label: 'فروض' },
                { id: 'examen', label: 'اختبارات' },
                { id: 'correction', label: 'تصحيح' }
              ].map(filter => (
                <button 
                  key={filter.id}
                  onClick={(e) => { e.stopPropagation(); setFilterType(filter.id as any); setCurrentPage(1); }}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all ${filterType === filter.id ? 'bg-dz-gold text-dz-green-dark shadow-md' : 'bg-white dark:bg-slate-800 border border-dz-gold/30 text-dz-dark dark:text-white hover:bg-dz-gold/10'}`}
                >
                </button>
              ))}
            </div>
            
            <div className="flex items-center justify-center gap-2 p-3 pt-1.5">

              <button 
                onClick={(e) => { e.stopPropagation(); setSortBy('name'); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black transition-all ${sortBy === 'name' ? 'bg-dz-green text-white gold-3d' : 'bg-white dark:bg-slate-800 border border-dz-gold/30 text-dz-dark dark:text-white hover:bg-emerald-50 dark:hover:bg-dz-green-dark/30'}`}
              >
                <SortAsc size={12} />
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); setSortBy('year'); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black transition-all ${sortBy === 'year' ? 'bg-dz-green text-white gold-3d' : 'bg-white dark:bg-slate-800 border border-dz-gold/30 text-dz-dark dark:text-white hover:bg-emerald-50 dark:hover:bg-dz-green-dark/30'}`}
              >
                <CalendarDays size={12} />
              </button>
            </div>
          </div>

          {displayFiles.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE).map((file: any) => (
            <div key={file.id} className={`p-3 mx-2 mb-2 rounded-xl flex items-center justify-between border border-dz-bg dark:border-dark-border hover:bg-${sectionColor}/10 transition-colors group/pdf shadow-sm ${file.isPlaceholder ? 'opacity-60' : ''}`}>
              <div 
                className="flex items-center gap-4 text-[clamp(8px,2vw,12px)] font-black flex-1 cursor-pointer"
                onClick={() => {
                  if (file.isPlaceholder || file.url === '#') {
                    alert('هذا الملف غير متوفر حالياً. سيتم توفيره قريباً!');
                  } else {
                    onViewPdf(getDirectDownloadLink(file.url), file.name);
                  }
                }}
              >
                <div className="flex-1 flex flex-col items-center justify-center gap-1 group-hover/pdf:scale-105 transition-transform text-dz-dark dark:text-emerald-50">
                  <span className={`text-${sectionColor} font-black text-[clamp(9px,1.5vw,11px)]`}>{file.year}</span>
                  <div className={`w-1 h-3 bg-${sectionColor}/40`} />
                  <span className="flex items-center justify-center gap-1 group-hover/pdf:text-dz-gold transition-colors text-center max-w-full overflow-hidden">
                    {(file.name.toLowerCase().includes('اختبار') || file.name.toLowerCase().includes('examen')) ? <Award size={12} className={`text-dz-gold shrink-0`} /> : <FileText size={12} className={`text-dz-green shrink-0`} />}
                    <span className="truncate text-[clamp(8px,1.8vw,11px)]">{file.name}</span>
                    {file.hasCorrection && <Check size={10} className="text-emerald-500 shrink-0" />}
                  </span>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    if (file.isPlaceholder || file.url === '#') {
                      alert('هذا الملف غير متوفر حالياً. سيتم توفيره قريباً!');
                    } else {
                      onViewPdf(getDirectDownloadLink(file.url), file.name);
                    }
                  }}
                  className={`w-8 h-8 rounded flex items-center justify-center transition-all gold-3d ${file.isPlaceholder || file.url === '#' ? 'bg-slate-200 text-slate-400 cursor-pointer' : `bg-${sectionColor}/20 dark:bg-${sectionColor}/10 text-${sectionColor} hover:bg-${sectionColor} hover:text-white`}`}
                  title={file.url === '#' ? 'غير متوفر حالياً' : 'معاينة'}
                >
                  <FileText size={14} />
                </button>
                <div 
                  onClick={(e) => {
                    e.stopPropagation();
                    if (file.isPlaceholder || file.url === '#') {
                      alert('هذا الملف غير متوفر حالياً. سيتم توفيره قريباً!');
                    } else {
                      onConfirmDownload(getDirectDownloadLink(file.url), file.name);
                    }
                  }}
                  className={`w-8 h-8 rounded flex items-center justify-center shadow-lg transition-all gold-3d ${file.isPlaceholder || file.url === '#' ? 'bg-slate-200 text-slate-400 cursor-pointer' : `bg-${sectionColor} hover:scale-110 cursor-pointer`}`}
                  title={file.url === '#' ? 'غير متوفر حالياً' : 'تحميل'}
                >
                  <Download size={14} className={file.url === '#' ? 'text-slate-400' : 'text-white'} />
                </div>
              </div>
            </div>
          ))}

          {displayFiles.length > ITEMS_PER_PAGE && (
            <div className="p-4 flex items-center justify-center gap-4 border-t border-dz-gold/20 bg-dz-bg dark:bg-dark-bg/80 relative">
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-dz-gold/50 to-transparent" />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (currentPage > 1) setCurrentPage(prev => prev - 1);
                }}
                disabled={currentPage === 1}
                className="p-2 rounded-lg bg-dz-green text-white disabled:opacity-30 transition-all gold-3d hover:scale-110 active:scale-95"
              >
                <ChevronRight size={18} />
              </button>
              
              <span className="text-[11px] font-black text-dz-green-dark dark:text-dz-gold tracking-widest bg-white/50 dark:bg-black/20 px-4 py-2 rounded-full border border-dz-gold/10">
                الصفحة {currentPage} من {Math.ceil(displayFiles.length / ITEMS_PER_PAGE)}
              </span>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (currentPage < Math.ceil(displayFiles.length / ITEMS_PER_PAGE)) setCurrentPage(prev => prev + 1);
                }}
                disabled={currentPage === Math.ceil(displayFiles.length / ITEMS_PER_PAGE)}
                className="p-2 rounded-lg bg-dz-green text-white disabled:opacity-30 transition-all gold-3d hover:scale-110 active:scale-95"
              >
                <ChevronLeft size={18} />
              </button>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
};

interface PdfListProps {
  selectedYear: string | null;
  selectedSubjectId: string | null;
  subjects: Subject[];
  remoteFiles: RemoteFile[];
  getDirectDownloadLink: (url: string) => string;
  expandedCategoryIdx: number | null;
  setExpandedCategoryIdx: (idx: number | null) => void;
  onBackToSubjects: () => void;
  getYearLabel: (id: string | null) => string;
}

const PdfList: React.FC<PdfListProps> = ({
  selectedYear,
  selectedSubjectId,
  subjects,
  remoteFiles,
  getDirectDownloadLink,
  expandedCategoryIdx,
  setExpandedCategoryIdx,
  onBackToSubjects,
  getYearLabel
}) => {
  const selectedSubject = subjects.find(s => s.id === selectedSubjectId);
  const [viewerInfo, setViewerInfo] = React.useState<{ url: string, name: string } | null>(null);
  const [confirmDownload, setConfirmDownload] = React.useState<{ url: string, name: string } | null>(null);
  const [sqlFiles, setSqlFiles] = React.useState<RemoteFile[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [fetchError, setFetchError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const fetchSqlFiles = async () => {
      if (!selectedSubject) return;
      setIsLoading(true);
      setFetchError(null);
    try {
      const response = await fetch(`/api/sujets/${selectedSubject.id}`);
      if (!response.ok) {
        throw new Error(`Server returned ${response.status}: ${response.statusText}`);
      }
      
      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        console.error("Invalid JSON response:", text.substring(0, 200));
        throw new Error("Erreur de configuration. Si vous êtes sur Vercel, vérifiez que l'API est déployée correctement.");
      }
      
      const formatName = (f: any) => {
        const c = (f.cycle || f.Cycle || '').toLowerCase().replace(/\s+/g, '_');
        const a = (f.annee || f.Année || f.code_niveau || '').toLowerCase().replace(/\s+/g, '_');
        const m = (f.matiere || f.Matière || '').toLowerCase().replace(/\s+/g, '_');
        return `tafawakdz_${c}_${a}_${m}`;
      };

      const formattedFiles = data.map((item: any, index: number) => {
        const fileName = (item.reference_pdf || item.nom_pdf || "").toLowerCase();
        const path = (item.chemin_complet || "").toLowerCase();
        const trimesterVal = (item.trimestre || item.Trimesttre || "").toString().toLowerCase();
        
        const inferredYear = mapCodeToYear(item.code_niveau, item.cycle) || 
                            mapCodeToYear(item.annee, item.cycle) || 
                            mapCodeToYear(path, item.cycle) || 
                            selectedYear;

        // Refined Category and Trimester Detection
        let category = "فروض و إختبارات الفصل الأول";
        const textToSearch = `${trimesterVal} ${path} ${fileName}`.toLowerCase();
        
        const isDoc = trimesterVal.includes('document') || 
                      textToSearch.includes('docs') || 
                      textToSearch.includes('document') || 
                      textToSearch.includes('مستندات') || 
                      textToSearch.includes('وثائق') || 
                      textToSearch.includes('ملخص') || 
                      textToSearch.includes('ملخصات');

        const isTrimester2 = trimesterVal.includes('2') || 
                             trimesterVal.includes('ثاني') || 
                             textToSearch.includes('trimestre-2') || 
                             textToSearch.includes('trimestre 2') || 
                             path.includes('/t2/') || 
                             path.includes('/f2/') || 
                             path.includes('/trimestre-2/') || 
                             /\b(t2|f2|2eme|2ème)\b/.test(textToSearch);
                             
        const isTrimester3 = trimesterVal.includes('3') || 
                             trimesterVal.includes('ثالث') || 
                             textToSearch.includes('trimestre-3') || 
                             textToSearch.includes('trimestre 3') || 
                             path.includes('/t3/') || 
                             path.includes('/f3/') || 
                             path.includes('/trimestre-3/') || 
                             /\b(t3|f3|3eme|3ème)\b/.test(textToSearch);
        
        if (isDoc) {
          category = "مستندات تعليمية";
        } else if (isTrimester2) {
          category = "فروض و إختبارات الفصل الثاني";
        } else if (isTrimester3) {
          category = "فروض و إختبارات الفصل الثالث";
        } else {
          category = "فروض و إختبارات الفصل الأول";
        }

        const hasCorrection = fileName.includes('cor') || 
                             fileName.includes('sol') || 
                             fileName.includes('حل') || 
                             fileName.includes('إجابة') || 
                             fileName.includes('نموذج') || 
                             path.includes('correction') ||
                             path.includes('تصحيح') ||
                             path.includes('إجابة');

        return {
          id: `api-${index}`,
          name: item.reference_pdf || item.nom_pdf || formatName(item),
          originalName: item.reference_pdf || item.nom_pdf,
          url: item.lien_direct || item.lien_direct_drive || '#',
          year: item.code_niveau || item.annee || '',
          cycle: item.cycle || '',
          annee: item.annee || '',
          levelYear: inferredYear && inferredYear !== 'null' ? inferredYear : selectedYear,
          subject: selectedSubjectId,
          category: category,
          trimestre: item.trimestre || (isTrimester2 ? 'الفصل 2' : isTrimester3 ? 'الفصل 3' : 'الفصل 1'),
          hasCorrection: hasCorrection
        };
      });
      console.log(`✅ Loaded ${formattedFiles.length} files. Categories:`, 
        formattedFiles.reduce((acc: any, f) => { acc[f.category] = (acc[f.category] || 0) + 1; return acc; }, {})
      );
      setSqlFiles(formattedFiles);
    } catch (error: any) {
      console.error('Error fetching SQL files:', error);
      setFetchError(error.message === 'Failed to fetch' ? 'فشل الاتصال بالخادم. يرجى التحقق من اتصالك بالإنترنت.' : `خطأ في جلب البيانات: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
    };
    fetchSqlFiles();
  }, [selectedSubject, selectedYear]);

  const allFiles = React.useMemo(() => [...remoteFiles, ...sqlFiles], [remoteFiles, sqlFiles]);

  const categories = [
    { label: "فروض و إختبارات الفصل الأول", defaultCount: selectedSubjectId === 'all' ? 18 : 0 },
    { label: "فروض و إختبارات الفصل الثاني", defaultCount: selectedSubjectId === 'all' ? 115 : 0 },
    { label: "فروض و إختبارات الفصل الثالث", defaultCount: selectedSubjectId === 'all' ? 44 : 0 },
    { label: "مستندات تعليمية", defaultCount: 0 }
  ];

  return (
    <div className="flex flex-col gap-4 pb-10">
      {isLoading && (
        <div className="bg-dz-gold/10 p-4 rounded-xl text-dz-gold text-center animate-pulse font-black border border-dz-gold/20">
          جاري جلب البيانات من القاعدة...
        </div>
      )}

      {fetchError && (
        <div className="bg-red-500/10 p-4 rounded-xl text-red-500 text-center font-black border border-red-500/20 flex flex-col gap-2">
          <div className="flex items-center justify-center gap-2">
            <AlertTriangle size={18} />
            <span>{fetchError}</span>
          </div>
          <button 
            onClick={() => window.location.reload()}
            className="text-[10px] bg-red-500 text-white px-4 py-1 rounded-full self-center hover:bg-red-600 transition-colors"
          >
            إعادة المحاولة
          </button>
        </div>
      )}

      <div className="flex flex-col gap-1 rounded-2xl overflow-hidden shadow-2xl border-2 border-dz-gold bg-white dark:bg-slate-900">
        <div className="bg-dz-green py-8 px-10 text-center text-white relative overflow-hidden">
          <div className="absolute top-0 left-0 w-32 h-32 bg-white/5 rounded-full -ml-16 -mt-16 blur-2xl"></div>
          <div className="mt-4 flex items-center justify-center gap-4 text-[10px] font-black">
             <span className="bg-white/20 px-3 py-1 rounded-full border border-white/10">فروض واختبارات</span>
             <span className="bg-white/20 px-3 py-1 rounded-full border border-white/10">دروس وملخصات</span>
          </div>
        </div>
        
        <div className="p-8 text-center border-b border-dz-gold/10">
          <p className="text-dz-dark dark:text-emerald-50 text-sm font-black leading-relaxed max-w-2xl mx-auto italic">
            كل ما يشمل مادة {selectedSubject?.arabicName} لمستوى {getYearLabel(selectedYear)} من ملفات اختبار و فرض و كذلك وثائق للتلميذ والأستاذ والعديد من الملخصات والقصاصات المساعدة على التعلم
          </p>
        </div>
      </div>
      
      <div className="flex flex-col gap-4 mt-4">
        {categories.map((category, idx) => (
          <div key={idx} className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-dz-gold overflow-hidden shadow-lg group">
            <CategoryItem 
              category={category} 
              isOpen={expandedCategoryIdx === idx} 
              onToggle={(isOpen) => setExpandedCategoryIdx(isOpen ? idx : null)} 
              selectedYear={selectedYear} 
              selectedSubject={selectedSubject}
              subjects={subjects}
              remoteFiles={allFiles} 
              getDirectDownloadLink={getDirectDownloadLink} 
              onViewPdf={(url, name) => setViewerInfo({ url, name })}
              onConfirmDownload={(url, name) => setConfirmDownload({ url, name })}
              getYearLabel={getYearLabel}
            />
          </div>
        ))}
      </div>

      <button 
        onClick={onBackToSubjects} 
        className="mt-6 flex items-center gap-2 text-dz-green-dark dark:text-dz-gold hover:text-dz-green transition-colors font-black text-sm self-center px-4"
      >
        <ChevronLeft className="rotate-180" size={16} />
        <span>العودة قائمة المواد</span>
      </button>

      {viewerInfo && (
        <PdfViewer 
          isOpen={!!viewerInfo}
          url={viewerInfo.url}
          name={viewerInfo.name}
          onClose={() => setViewerInfo(null)}
          onDownload={() => {
            setViewerInfo(null);
            setConfirmDownload({ url: viewerInfo.url, name: viewerInfo.name });
          }}
        />
      )}

      <AnimatePresence>
        {confirmDownload && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
            onClick={() => setConfirmDownload(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl flex flex-col border-2 border-dz-gold gold-3d"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-8 flex flex-col items-center text-center">
                <div className="w-20 h-20 bg-dz-gold/10 rounded-full flex items-center justify-center mb-6 gold-3d border-2 border-dz-gold/20">
                  <Download size={40} className="text-dz-gold" />
                </div>
                
                <h3 className="text-xl font-black text-dz-dark dark:text-white mb-4">تـأكيـد الـتحميل</h3>
                <p className="text-sm text-dz-green-dark dark:text-emerald-100/60 font-black leading-relaxed">
                  هل أنت متأكد من رغبتك في تحميل ملف: <br/>
                  <span className="text-dz-green italic">"{confirmDownload.name}"</span>؟
                </p>
              </div>

              <div className="flex border-t-2 border-dz-gold/20">
                <button
                  onClick={() => setConfirmDownload(null)}
                  className="flex-1 px-6 py-5 font-black text-xs text-dz-green-dark dark:text-emerald-50 hover:bg-dz-bg dark:hover:bg-dz-green-dark/20 transition-colors uppercase tracking-widest flex items-center justify-center gap-2 border-l-2 border-dz-gold/20"
                >
                  <X size={16} />
                  لا، إلغاء
                </button>
                <button
                  onClick={() => {
                    window.open(confirmDownload.url, '_blank');
                    setConfirmDownload(null);
                  }}
                  className="flex-1 px-6 py-5 font-black text-xs text-white bg-dz-green hover:bg-dz-green-dark transition-colors uppercase tracking-widest flex items-center justify-center gap-2"
                >
                  <Check size={16} />
                  نعم، تحميل
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PdfList;
