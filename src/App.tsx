import React from 'react';
import { 
  BookOpen, 
  Calculator, 
  Atom, 
  Microscope, 
  Cpu, 
  Languages, 
  Globe, 
  Palmtree, 
  Search,
  User,
  Users,
  GraduationCap,
  ChevronLeft,
  ChevronRight,
  BookMarked,
  Library,
  Award,
  Video,
  FileText,
  SortAsc,
  CalendarDays,
  Download,
  Check as LucideCheck,
  Mail,
  X,
  Music,
  Palette,
  Landmark,
  Moon,
  Sparkles,
  Lightbulb,
  Database
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { mapCodeToYear } from './utils';

interface Level {
  id: string;
  name: string;
  color: string;
  years: { id: string; label: string }[];
}

interface RemoteFile {
  id: string | number;
  name: string;
  originalName?: string;
  year: string;
  hasCorrection: boolean;
  url: string;
  cycle: string;
  annee: string;
  levelYear: string;
  subject: string;
  category: string;
}

import siteData from './site_data.json';
import FilterSelect from './components/FilterSelect';
import PdfList from './components/PdfList';
import GradeCalculator from './components/GradeCalculator';
import AiTutor from './components/AiTutor';
import DatabaseDashboard from './components/DatabaseDashboard';
import TeacherSpace from './components/TeacherSpace';

interface Subject {
  id: string;
  arabicName: string;
  icon: any;
  levels: string[];
}

const iconMap: Record<string, any> = {
  Calculator,
  BookOpen,
  Atom,
  Microscope,
  Globe,
  Moon,
  Lightbulb,
  Languages,
  Cpu,
  Landmark,
  Palmtree,
  Sparkles,
  Palette,
  Music,
  Library
};

const levels = siteData.levels as Level[];
const subjects = (siteData.subjects as any[]).map(s => ({
  ...s,
  icon: iconMap[s.icon] || BookOpen
})) as Subject[];

const nationalExams = siteData.nationalExams;

const levelImages: Record<string, string> = {
  primary: 'https://images.unsplash.com/photo-1516534775068-ba3e84529ec1?auto=format&fit=crop&q=80&w=800',
  middle: 'https://images.unsplash.com/photo-1544377193-33dcf4d68fb5?auto=format&fit=crop&q=80&w=800',
  secondary: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&q=80&w=800'
};

export default function App() {
  const [selectedYear, setSelectedYear] = React.useState<string | null>(null);
  const [selectedSubjectId, setSelectedSubjectId] = React.useState<string | null>(null);
  const [expandedCategoryIdx, setExpandedCategoryIdx] = React.useState<number | null>(null);
  const [expandedLevel, setExpandedLevel] = React.useState<string | null>(null);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [remoteFiles, setRemoteFiles] = React.useState<RemoteFile[]>([]);
  const [isDarkMode, setIsDarkMode] = React.useState(false);
  const [currentTheme, setCurrentTheme] = React.useState<'default' | 'blue' | 'purple' | 'red' | 'nocturne' | 'custom'>('default');
  const [customColors, setCustomColors] = React.useState({
    primary: '#059669',
    bg: '#ecfdf5',
    text: '#022c22',
    card: '#ffffff'
  });
  const [isCalculatorOpen, setIsCalculatorOpen] = React.useState(false);
  const [isSearchOpen, setIsSearchOpen] = React.useState(false);
  const [apiSearchResults, setApiSearchResults] = React.useState<any[]>([]);
  const [recentViews, setRecentViews] = React.useState<any[]>([]);
  const [activeNav, setActiveNav] = React.useState<string | null>(null);
  const [statsData, setStatsData] = React.useState<any[]>([]);
  const [isDbDashboardOpen, setIsDbDashboardOpen] = React.useState(false);
  const [isTeacherSpaceOpen, setIsTeacherSpaceOpen] = React.useState(false);
  const [homeFilesPage, setHomeFilesPage] = React.useState(1);
  const ITEMS_PER_PAGE_HOME = 20;

  const getGlobalCount = () => {
    const total = statsData.reduce((acc, curr) => acc + curr.count, 0);
    if (total === 0) return null;
    return total.toLocaleString() + '+';
  };

  const fetchStats = React.useCallback(async (retries = 3) => {
    try {
      console.log('📡 Fetching stats...');
      const resp = await fetch('/api/stats');
      if (resp.ok) {
        const data = await resp.json();
        console.log('✅ Stats fetched:', data.length, 'records');
        setStatsData(data);
      } else {
        console.warn(`⚠️ Stats fetch returned ${resp.status}: ${resp.statusText}`);
        if (retries > 0) {
          console.log(`🔄 Retrying stats fetch... (${retries} left)`);
          setTimeout(() => fetchStats(retries - 1), 2000);
        }
      }
    } catch (e) {
      console.error('❌ Stats fetch failed:', e);
      if (retries > 0 && e instanceof TypeError) {
        console.log(`🔄 Retrying stats fetch after network error... (${retries} left)`);
        setTimeout(() => fetchStats(retries - 1), 3000);
      }
    }
  }, []);

  React.useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  React.useEffect(() => {
    const saved = localStorage.getItem('recent_views');
    if (saved) setRecentViews(JSON.parse(saved));
  }, []);

  const addToRecent = (file: any) => {
    const updated = [file, ...recentViews.filter(f => f.url !== file.url)].slice(0, 5);
    setRecentViews(updated);
    localStorage.setItem('recent_views', JSON.stringify(updated));
  };

  const fetchApiSearch = async (val: string) => {
    if (val.length < 2) {
      setApiSearchResults([]);
      return;
    }
    try {
      const resp = await fetch(`/api/search?q=${encodeURIComponent(val)}`);
      if (resp.ok) {
        const data = await resp.json();
        setApiSearchResults(data);
      }
    } catch (e) {
      console.error('Search failed', e);
    }
  };

  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (isSearchOpen && searchQuery.length >= 2) {
        fetchApiSearch(searchQuery);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery, isSearchOpen]);

  const filteredSubjects = React.useMemo(() => {
    if (!selectedYear) return [];
    const levelId = levels.find(l => l.years.some(y => y.id === selectedYear))?.id;
    return subjects.filter(s => s.levels.includes(levelId || ''));
  }, [selectedYear]);

  React.useEffect(() => {
    if (isDarkMode) {
      document.body.classList.add('dark');
    } else {
      document.body.classList.remove('dark');
    }
  }, [isDarkMode]);

  React.useEffect(() => {
    if (currentTheme === 'default') {
      document.documentElement.removeAttribute('data-theme');
      ['--primary', '--primary-dark', '--bg-main', '--text-base', '--accent', '--card-bg'].forEach(p => document.documentElement.style.removeProperty(p));
    } else if (currentTheme === 'nocturne') {
      document.documentElement.setAttribute('data-theme', 'nocturne');
      setIsDarkMode(true);
      ['--primary', '--primary-dark', '--bg-main', '--text-base', '--accent', '--card-bg'].forEach(p => document.documentElement.style.removeProperty(p));
    } else if (currentTheme === 'custom') {
      document.documentElement.setAttribute('data-theme', 'custom');
      document.documentElement.style.setProperty('--primary', customColors.primary);
      document.documentElement.style.setProperty('--primary-dark', customColors.primary + 'cc'); 
      document.documentElement.style.setProperty('--bg-main', customColors.bg);
      document.documentElement.style.setProperty('--text-base', customColors.text);
      document.documentElement.style.setProperty('--card-bg', customColors.card);
      document.documentElement.style.setProperty('--accent', '#D4AF37');
    } else {
      document.documentElement.setAttribute('data-theme', currentTheme);
      ['--primary', '--primary-dark', '--bg-main', '--text-base', '--accent', '--card-bg'].forEach(p => document.documentElement.style.removeProperty(p));
    }
  }, [currentTheme, customColors]);

  React.useEffect(() => {
    const fetchFiles = async () => {
      const repo = import.meta.env.VITE_GITHUB_REPO;
      const branch = import.meta.env.VITE_GITHUB_BRANCH || 'main';
      if (!repo) {
        // Fallback to local API search for "latest" topics
        const fetchFallback = async (retries = 2) => {
          try {
            const resp = await fetch('/api/search?q=202'); // Search for things likely having "202" (years)
            if (resp.ok) {
              const data = await resp.json();
              const formatName = (f: any) => {
                const c = (f.cycle || '').toLowerCase().replace(/\s+/g, '_');
                const a = (f.annee || '').toLowerCase().replace(/\s+/g, '_');
                const m = (f.matiere || '').toLowerCase().replace(/\s+/g, '_');
                return `tafawakdz_${c}_${a}_${m}`;
              };

              setRemoteFiles(data.map((f: any, i: number) => ({
                id: `api-${i}`,
                name: formatName(f),
                originalName: f.reference_pdf,
                year: f.code_niveau,
                levelYear: mapCodeToYear(f.code_niveau) || mapCodeToYear(f.chemin_complet) || '',
                url: f.lien_direct_drive,
                subject: f.matiere,
                cycle: f.cycle || '',
                annee: f.annee || '',
                trimestre: f.trimestre || '',
                category: 'مواضيع مختارة'
              })));
            } else if (retries > 0) {
              setTimeout(() => fetchFallback(retries - 1), 2000);
            }
          } catch (e) {
            console.error('Local fallback fetch failed', e);
            if (retries > 0) setTimeout(() => fetchFallback(retries - 1), 3000);
          }
        };
        fetchFallback();
        return;
      }
      try {
        const response = await fetch(`https://raw.githubusercontent.com/${repo}/${branch}/files.json`);
        if (response.ok) {
          const data = await response.json();
          setRemoteFiles(data);
        }
      } catch (error) {
        console.error('Error fetching files:', error);
      }
    };
    fetchFiles();
  }, []);

  const getDirectDownloadLink = (url: string) => {
    if (!url || url === '#' || url.includes('/folders/')) return url;
    const fileIdMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || url.match(/id=([a-zA-Z0-9_-]+)/);
    if (fileIdMatch && fileIdMatch[1]) {
      return `https://drive.google.com/uc?id=${fileIdMatch[1]}&export=download`;
    }
    return url;
  };

  const searchResults = React.useMemo(() => {
    if (searchQuery.length < 2) return [];
    const query = searchQuery.toLowerCase();
    const results: any[] = [];
    levels.forEach(level => {
      level.years.forEach(year => {
        if (year.label.includes(query) || year.id.includes(query)) {
          results.push({ type: 'year', id: year.id, label: year.label, levelName: level.name, icon: BookMarked });
        }
        subjects.forEach(subj => {
          if (subj.arabicName.includes(query)) {
            results.push({ type: 'subject', yearId: year.id, subjectId: subj.id, label: `${subj.arabicName} - ${year.label}`, levelName: level.name, icon: subj.icon });
          }
        });
      });
    });
    return results.slice(0, 8);
  }, [searchQuery]);

  const currentLevelId = React.useMemo(() => {
    if (!selectedYear) return null;
    return levels.find(l => l.years.some(y => y.id === selectedYear))?.id;
  }, [selectedYear]);

  const getSubjectFileCount = React.useCallback((subjectId: string) => {
    if (!selectedYear) return 0;
    
    // 1. Try to find the count in statsData (fetched from /api/stats)
    if (statsData.length > 0) {
      // Find all stats for the current year and subject (ignore trimestre for global subject count)
      const subjectStats = statsData.filter(s => 
        (s.annee === selectedYear || s.cycle === selectedYear) && 
        s.matiere === subjectId
      );
      
      const totalCount = subjectStats.reduce((acc, curr) => acc + curr.count, 0);
      if (totalCount > 0) return totalCount;
    }

    // 2. Try to count real remote files as secondary source
    const realCount = remoteFiles.filter(f => 
      (f.levelYear === selectedYear || f.year === selectedYear) && 
      (f.subject === subjectId)
    ).length;

    if (realCount > 0) return realCount;

    // 3. Last fallback to estimation for consistency of UI
    const hash = (selectedYear + subjectId).split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return 120 + (hash % 150);
  }, [selectedYear, remoteFiles, statsData]);

  React.useEffect(() => {
    setSelectedSubjectId(null);
    setExpandedCategoryIdx(null);
  }, [selectedYear]);

  React.useEffect(() => {
    setExpandedCategoryIdx(null);
  }, [selectedSubjectId]);

  const getYearLabel = (id: string | null) => {
    if (!id) return '';
    for (const level of levels) {
      const year = level.years.find(y => y.id === id);
      if (year) return year.label;
    }
    return id.toUpperCase();
  };

  return (
    <div className="min-h-screen flex flex-col font-sans selection:bg-dz-green selection:text-white bg-dz-bg dark:bg-dark-bg transition-colors duration-300 relative overflow-x-hidden" dir="rtl">
      {/* Global Nocturne Background Effect */}
      <AnimatePresence>
        {isDarkMode && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 pointer-events-none z-0"
          >
             <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_0%,rgba(30,58,138,0.08)_0%,transparent_50%)]"></div>
             <div className="absolute top-20 left-10 w-4 h-4 bg-dz-gold/10 blur-xl animate-pulse"></div>
             <div className="absolute bottom-40 right-20 w-8 h-8 bg-dz-green/5 blur-2xl animate-pulse"></div>
             {/* Subtle twinkling stars for the whole background */}
             {[...Array(40)].map((_, i) => (
                <div 
                  key={i} 
                  className="absolute w-px h-px bg-white rounded-full opacity-10 animate-pulse"
                  style={{ 
                    left: `${Math.random() * 100}%`, 
                    top: `${Math.random() * 100}%`,
                    animationDelay: `${Math.random() * 10}s`
                  }}
                ></div>
             ))}
          </motion.div>
        )}
      </AnimatePresence>

      <header className="fixed top-0 left-0 right-0 z-50 glass-crystal">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 h-20 flex items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-4">
            <div 
              onClick={() => { setSelectedYear(null); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
              className="w-10 h-10 bg-dz-green rounded-xl flex items-center justify-center text-white cursor-pointer shadow-lg shadow-dz-green/20 transition-transform hover:scale-105 gold-3d"
            >
              <BookMarked size={20} />
            </div>
            <div className="flex flex-col">
              <button 
                onClick={() => { setSelectedYear(null); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                className="text-xl font-black text-dz-dark dark:text-white hover:text-dz-green transition-colors leading-none"
              >
                تـفوق <span className="text-dz-green">ديـزاد</span>
              </button>
              <span className="text-[9px] uppercase font-bold text-dz-green-dark dark:text-emerald-400 tracking-tighter mt-1">TAFAWAK.DZ PORTAL</span>
            </div>
          </div>

          <AnimatePresence>
            {isDarkMode && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 pointer-events-none overflow-hidden z-0"
              >
                <div className="absolute top-0 right-0 w-64 h-64 bg-dz-gold/5 blur-3xl -mr-32 -mt-32 rounded-full"></div>
                <div className="absolute top-0 left-1/2 w-full h-[1px] bg-gradient-to-r from-transparent via-dz-gold/20 to-transparent -translate-x-1/2"></div>
                <div className="flex gap-2 justify-center mt-2 opacity-20">
                  {[...Array(20)].map((_, i) => (
                    <motion.div 
                      key={i}
                      animate={{ opacity: [0.2, 0.8, 0.2] }}
                      transition={{ duration: 2 + Math.random() * 3, repeat: Infinity, delay: Math.random() * 5 }}
                      className="w-0.5 h-0.5 bg-white rounded-full"
                      style={{ 
                        position: 'absolute', 
                        left: `${Math.random() * 100}%`, 
                        top: `${Math.random() * 80}px` 
                      }}
                    />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <nav className="hidden lg:flex items-center gap-6 text-[11px] uppercase tracking-widest font-black text-dz-dark dark:text-emerald-50">
            <button onClick={() => setSelectedYear(null)} className={`${!selectedYear ? 'text-dz-green border-b-2 border-dz-green' : ''} px-2 pb-1 hover:text-dz-green transition-all cursor-pointer`}>الرئيسية</button>
            
            <button 
              onClick={() => setIsTeacherSpaceOpen(true)}
              className="px-2 pb-1 hover:text-dz-green transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Users size={14} className="text-dz-gold" />
              <span>فضاء الأستاذ</span>
            </button>
            
            {levels.map(level => (
              <div 
                key={level.id} 
                className="relative"
                onMouseEnter={() => setActiveNav(level.id)}
                onMouseLeave={() => setActiveNav(null)}
              >
                <button 
                  className={`flex items-center gap-1.5 hover:text-dz-green transition-colors pb-1 cursor-pointer ${activeNav === level.id ? 'text-dz-green' : ''}`}
                  onClick={() => {
                    const el = document.getElementById(level.id);
                    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    setSelectedYear(null);
                  }}
                >
                  <span>{level.name}</span>
                  <ChevronRight size={12} className={`rotate-90 transition-transform duration-300 ${activeNav === level.id ? 'rotate-[270deg] text-dz-gold' : ''}`} />
                </button>
                
                <AnimatePresence>
                  {activeNav === level.id && (
                    <motion.div 
                      initial={{ opacity: 0, y: 15, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 15, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                      className="absolute top-full right-0 mt-3 bg-white dark:bg-slate-900 border-2 border-dz-gold/30 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] p-2 min-w-[240px] overflow-hidden z-[60] gold-3d"
                    >
                      <div className="bg-dz-green/5 dark:bg-white/5 p-3 mb-2 rounded-xl text-center">
                        <span className="text-[9px] font-black text-dz-gold uppercase tracking-tighter">اختر السنة الدراسية</span>
                      </div>
                      <div className="flex flex-col gap-0.5">
                        {level.years.map(year => (
                          <button
                            key={year.id}
                            onClick={() => {
                              setSelectedYear(year.id);
                              setActiveNav(null);
                              window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                            className={`flex items-center justify-between p-3.5 rounded-xl hover:bg-dz-green hover:text-white transition-all text-right group/item relative overflow-hidden ${selectedYear === year.id ? 'bg-dz-green/10 text-dz-green shadow-inner' : ''}`}
                          >
                            <span className="font-black text-[12px] relative z-10 transition-colors">{year.label}</span>
                            <div className="flex items-center gap-2 relative z-10">
                              {selectedYear === year.id && <LucideCheck size={14} className="text-dz-green group-hover/item:text-white" />}
                              <ChevronLeft size={14} className={`text-dz-gold transition-all duration-300 ${selectedYear === year.id ? 'opacity-100' : 'opacity-0 group-hover/item:opacity-100 group-hover/item:-translate-x-1 group-hover/item:text-white'}`} />
                            </div>
                            <div className="absolute inset-0 bg-dz-gold/10 opacity-0 group-hover/item:opacity-20 transition-opacity"></div>
                          </button>
                        ))}
                      </div>
                      <div className="mt-2 pt-2 border-t border-dz-gold/10 px-3 pb-1">
                         <div className="flex items-center gap-2 text-[8px] font-bold text-slate-400">
                            <Sparkles size={10} className="text-dz-gold animate-pulse" />
                            <span>محتوى تعليمي محدث يومياً</span>
                         </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
            
            <div 
              className="relative"
              onMouseEnter={() => setActiveNav('exams-bank')}
              onMouseLeave={() => setActiveNav(null)}
            >
              <button className={`flex items-center gap-1.5 hover:text-dz-green transition-colors pb-1 cursor-pointer ${activeNav === 'exams-bank' ? 'text-dz-green' : ''}`}>
                <span>بنك الفروض</span>
                <ChevronRight size={12} className={`rotate-90 transition-transform duration-300 ${activeNav === 'exams-bank' ? 'rotate-[270deg] text-dz-gold' : ''}`} />
              </button>
              <AnimatePresence>
                {activeNav === 'exams-bank' && (
                  <motion.div 
                    initial={{ opacity: 0, y: 15, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 15, scale: 0.95 }}
                    className="absolute top-full right-0 mt-3 bg-white dark:bg-slate-900 border-2 border-dz-gold/30 rounded-2xl shadow-2xl p-2 min-w-[240px] z-[60] gold-3d"
                  >
                    <div className="bg-dz-green/5 dark:bg-white/5 p-3 mb-2 rounded-xl text-center">
                        <span className="text-[9px] font-black text-dz-gold uppercase tracking-tighter">بنــك مـواضيع الـفروض والاختبـارات</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      {[
                        { label: 'فروض الابتدائي', icon: Award, id: 'primary' },
                        { label: 'فروض المتوسط', icon: GraduationCap, id: 'middle' },
                        { label: 'فروض الثانوي', icon: BookOpen, id: 'secondary' },
                        { label: 'امتحانات البكالوريا', icon: Sparkles, id: '3as' }
                      ].map((item, i) => (
                        <button 
                          key={i} 
                          onClick={() => {
                             if (item.id === '3as') setSelectedYear('3as');
                             else {
                                const el = document.getElementById(item.id);
                                if (el) el.scrollIntoView({ behavior: 'smooth' });
                             }
                             setActiveNav(null);
                          }}
                          className="flex items-center gap-3 p-3 rounded-xl hover:bg-dz-green hover:text-white transition-all text-right group/ex"
                        >
                          <div className="w-8 h-8 rounded-lg bg-dz-gold/10 flex items-center justify-center text-dz-gold group-hover/ex:bg-white/20 group-hover/ex:text-white">
                            <item.icon size={16} />
                          </div>
                          <span className="font-bold text-[11px]">{item.label}</span>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </nav>

          <div className="flex items-center gap-2 md:gap-4">
            <div className="relative group/theme">
              <button 
                className="p-2.5 rounded-xl border-2 border-dz-gold/30 hover:border-dz-gold bg-white/50 dark:bg-slate-800/50 text-dz-dark dark:text-dz-gold transition-all gold-3d"
                title="تغییر لون المظهر"
              >
                <Palette size={20} />
              </button>
              <div className="absolute top-full left-0 md:left-auto md:right-0 mt-3 hidden group-hover/theme:flex flex-col gap-3 p-4 bg-white dark:bg-slate-900 border-2 border-dz-gold rounded-2xl shadow-2xl z-[70] min-w-[220px] gold-3d animate-in fade-in slide-in-from-top-2">
                <span className="text-[11px] font-black text-slate-400 border-b border-slate-100 dark:border-white/5 pb-2 text-center">ألوان المظهر الجاهزة</span>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { id: 'default', label: 'أخضر', color: 'bg-emerald-500', border: 'border-emerald-200' },
                    { id: 'blue', label: 'أزرق', color: 'bg-blue-600', border: 'border-blue-200' },
                    { id: 'purple', label: 'أرجواني', color: 'bg-purple-600', border: 'border-purple-200' },
                    { id: 'red', label: 'أحمر', color: 'bg-red-600', border: 'border-red-200' },
                    { id: 'nocturne', label: 'ليلي', color: 'bg-slate-900', border: 'border-dz-gold' }
                  ].map((th) => (
                    <button
                      key={th.id}
                      onClick={() => setCurrentTheme(th.id as any)}
                      className={`flex flex-col items-center gap-2 p-2 rounded-xl transition-all hover:scale-105 border-2 ${currentTheme === th.id ? 'border-dz-gold bg-dz-gold/5' : 'border-transparent hover:bg-slate-50 dark:hover:bg-white/5'}`}
                    >
                      <div className={`w-10 h-6 rounded-md ${th.color} shadow-inner border ${th.border}`}></div>
                      <span className="text-[10px] font-black">{th.label}</span>
                    </button>
                  ))}
                </div>

                <div className="mt-2 flex flex-col gap-3 pt-2 border-t border-slate-100 dark:border-white/5">
                  <span className="text-[11px] font-black text-slate-400 text-center">تخصيص يدوي</span>
                  
                  <div className="flex flex-col gap-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[9px] font-bold text-slate-500">الخلفية</span>
                      <input 
                        type="color" 
                        value={customColors.bg} 
                        onChange={(e) => {
                          setCustomColors(prev => ({ ...prev, bg: e.target.value }));
                          setCurrentTheme('custom');
                        }}
                        className="w-6 h-6 rounded border-none cursor-pointer p-0 bg-transparent"
                      />
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[9px] font-bold text-slate-500">النصوص</span>
                      <input 
                        type="color" 
                        value={customColors.text} 
                        onChange={(e) => {
                          setCustomColors(prev => ({ ...prev, text: e.target.value }));
                          setCurrentTheme('custom');
                        }}
                        className="w-6 h-6 rounded border-none cursor-pointer p-0 bg-transparent"
                      />
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[9px] font-bold text-slate-500">الأزرار</span>
                      <input 
                        type="color" 
                        value={customColors.primary} 
                        onChange={(e) => {
                          setCustomColors(prev => ({ ...prev, primary: e.target.value }));
                          setCurrentTheme('custom');
                        }}
                        className="w-6 h-6 rounded border-none cursor-pointer p-0 bg-transparent"
                      />
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[9px] font-bold text-slate-500">خلفية الكروت</span>
                      <input 
                        type="color" 
                        value={customColors.card} 
                        onChange={(e) => {
                          setCustomColors(prev => ({ ...prev, card: e.target.value }));
                          setCurrentTheme('custom');
                        }}
                        className="w-6 h-6 rounded border-none cursor-pointer p-0 bg-transparent"
                      />
                    </div>
                  </div>
                  
                  {currentTheme === 'custom' && (
                    <button 
                      onClick={() => setCurrentTheme('default')}
                      className="mt-1 text-[8px] font-bold text-dz-green hover:underline text-center"
                    >
                      إعادة التعيين للإفتراضي
                    </button>
                  )}
                </div>
              </div>
            </div>

            <button 
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2.5 rounded-xl border-2 border-dz-gold/30 hover:border-dz-gold bg-white/50 dark:bg-slate-800/50 text-dz-dark dark:text-dz-gold transition-all gold-3d"
            >
              {isDarkMode ? <Lightbulb size={20} /> : <Moon size={20} />}
            </button>

            <button 
              onClick={() => setIsDbDashboardOpen(!isDbDashboardOpen)}
              className={`p-2.5 rounded-xl border-2 transition-all gold-3d ${isDbDashboardOpen ? 'bg-dz-gold text-dz-green-dark border-dz-gold' : 'border-dz-gold/30 hover:border-dz-gold bg-white/50 dark:bg-slate-800/50 text-dz-dark dark:text-dz-gold'}`}
              title="لوحة تحكم قاعدة البيانات"
            >
              <Database size={20} />
            </button>
            
            <div className="relative group hidden md:block">
               <button 
                onClick={() => setIsSearchOpen(true)}
                className="flex items-center gap-3 px-5 py-2.5 border-2 border-dz-gold/50 bg-white dark:bg-slate-800 rounded-xl text-[11px] font-black text-dz-dark dark:text-white hover:border-dz-green transition-all shadow-sm"
              >
                <Search size={16} className="text-dz-green" />
                <span>بحث ذكي...</span>
              </button>
            </div>

            <div className="w-10 h-10 rounded-xl border-2 border-dz-gold flex items-center justify-center p-1 cursor-pointer hover:scale-105 transition-transform gold-3d">
               <div className="w-full h-full rounded-lg bg-dz-green flex items-center justify-center text-white text-[10px] font-black">
                  TD
                </div>
            </div>
          </div>
        </div>
      </header>

      <div className="h-20"></div> {/* Spacer for fixed header */}

      <main className="flex-1 w-full max-w-7xl mx-auto px-2 md:px-6 py-12">
        {!selectedYear ? (
          <div className="flex flex-col gap-12">
            {isDbDashboardOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mb-8"
              >
                <DatabaseDashboard stats={statsData} onSync={fetchStats} />
              </motion.div>
            )}

            <motion.div 
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }} 
              className="text-center mb-8 px-6"
            >
              <h2 className="text-4xl lg:text-6xl font-black mb-6 text-dz-dark dark:text-white">
                بوابة تـفوق <span className="text-dz-green">ديـزاد</span> التعليمية
              </h2>
              <p className="text-sm text-slate-600 dark:text-emerald-100/70 font-black tracking-wide max-w-2xl mx-auto">
                بنك الفروض والاختبارات الأول في الجزائر - كل ما يحتاجه التلميذ والأستاذ في مكان واحد
              </p>
            </motion.div>

            {/* Level Selection Grid - Main Portal Structure */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 justify-items-center">
              {levels.map((level) => (
                <motion.div 
                  key={level.id}
                  whileHover={{ y: -10 }}
                  className="bg-dz-card dark:bg-slate-900 border-2 border-dz-gold rounded-3xl overflow-hidden shadow-xl gold-3d flex flex-col group max-w-sm md:max-w-none w-full"
                >
                  <div className="bg-dz-green py-10 px-8 text-center text-white relative overflow-hidden h-44 flex flex-col items-center justify-center">
                    {/* Background images hidden as requested */}
                    {/* <div 
                      className="absolute inset-0 z-0 opacity-55 bg-cover bg-center group-hover:scale-110 transition-transform duration-700" 
                      style={{ backgroundImage: `url(${levelImages[level.id]})` }}
                    ></div> */}
                    <div className="absolute inset-0 bg-gradient-to-t from-dz-green/95 via-dz-green/40 to-transparent z-10"></div>
                    <div className="relative z-20 flex flex-col items-center">
                      <BookMarked size={48} className="mb-3 text-dz-gold drop-shadow-lg" />
                      <h3 className="text-2xl font-black drop-shadow-md">{level.name}</h3>
                    </div>
                  </div>
                  
                  <div className="p-6 flex flex-col gap-3">
                    {level.years.map(year => (
                      <button 
                        key={year.id} 
                        onClick={() => setSelectedYear(year.id)}
                        className="w-full text-center p-3 sm:p-4 rounded-xl hover:bg-dz-bg dark:hover:bg-dz-green-dark/20 transition-all font-black text-xs sm:text-sm text-dz-dark dark:text-emerald-50 flex items-center justify-center gap-3 group/btn border border-dz-gold/10 hover:border-dz-gold/50"
                      >
                        <ChevronLeft size={16} className="text-dz-gold opacity-0 group-hover/btn:opacity-100 group-hover/btn:-translate-x-1 transition-all" />
                        <span>{year.label}</span>
                      </button>
                    ))}
                  </div>
                  
                  <div className="mt-auto p-4 bg-dz-bg dark:bg-black/20 border-t border-dz-gold/10 text-center">
                    <span className="text-[10px] font-black text-dz-green uppercase tracking-widest">تـصفح الـقـسم الـكـامـل</span>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* National Exams Section */}
            <div className="mt-12 px-2">
              <div className="flex items-center gap-4 mb-8">
                <h3 className="text-xl font-black text-dz-dark dark:text-white flex items-center gap-3">
                  <Award className="text-dz-gold" />
                  الامتحانات الوطنية
                </h3>
                <div className="flex-1 h-px bg-dz-gold/20"></div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {nationalExams.map((exam) => (
                  <motion.div
                    key={exam.id}
                    whileHover={{ scale: 1.05 }}
                    onClick={() => setSelectedYear(exam.year.toLowerCase())}
                    className="bg-dz-green-dark p-6 rounded-2xl border-2 border-dz-gold text-white group cursor-pointer relative overflow-hidden shadow-lg gold-3d text-center mx-[2px]"
                  >
                    <h4 className="text-[clamp(11px,2.5vw,18px)] font-black mb-1">{exam.label}</h4>
                    <p className="text-[clamp(8px,1.5vw,10px)] text-dz-gold font-black tracking-widest uppercase">{exam.year}</p>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Latest Files Section - New Feature like dzexams.com */}
            <div className="mt-12">
               <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-black text-dz-dark dark:text-white flex items-center gap-3">
                  <Sparkles className="text-dz-gold" />
                  أحدث المواضيع المضافة
                </h3>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black text-slate-400">إجمالي: {remoteFiles.length} ملف</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {remoteFiles.length > 0 ? (
                  remoteFiles.slice((homeFilesPage - 1) * ITEMS_PER_PAGE_HOME, homeFilesPage * ITEMS_PER_PAGE_HOME).map((file, i) => (
                    <motion.div 
                      key={file.id}
                      whileHover={{ y: -5 }}
                      className="bg-white dark:bg-slate-900 p-4 rounded-2xl border-2 border-dz-gold/20 shadow-lg gold-3d flex flex-col gap-3 group mx-[2px]"
                    >
                      <div className="flex items-center justify-between">
                         <div className="w-8 h-8 rounded-lg bg-dz-green/10 flex items-center justify-center text-dz-green group-hover:bg-dz-green group-hover:text-white transition-colors">
                            <FileText size={16} />
                         </div>
                         <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{file.year}</span>
                      </div>
                      <h4 className="text-[clamp(9px,1.5vw,12px)] font-black text-dz-dark dark:text-white truncate text-center">{file.name}</h4>
                      <div className="mt-auto pt-3 border-t border-dz-gold/10 flex items-center justify-center gap-4">
                         <span className="text-[9px] font-black text-dz-gold">{file.subject}</span>
                         <a 
                          href={file.url} 
                          target="_blank" 
                          rel="noreferrer"
                          className="p-1.5 bg-dz-bg dark:bg-dz-green-dark/30 rounded-lg text-dz-green hover:bg-dz-green hover:text-white transition-colors"
                        >
                            <Download size={12} />
                         </a>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  [1,2,3,4].map(i => (
                    <div key={i} className="animate-pulse bg-dz-gold/5 h-32 rounded-2xl border-2 border-dashed border-dz-gold/10"></div>
                  ))
                )}
              </div>

              {remoteFiles.length > ITEMS_PER_PAGE_HOME && (
                <div className="mt-8 flex items-center justify-center gap-4 bg-white/50 dark:bg-dz-dark/30 p-4 rounded-2xl border-2 border-dz-gold/10">
                  <button
                    onClick={() => setHomeFilesPage(prev => Math.max(1, prev - 1))}
                    disabled={homeFilesPage === 1}
                    className="p-2 rounded-xl bg-dz-green text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all gold-3d hover:scale-110"
                  >
                    <ChevronRight size={20} />
                  </button>
                  
                  <span className="text-xs font-black text-dz-dark dark:text-dz-gold px-6 py-2 bg-white dark:bg-slate-800 rounded-lg border border-dz-gold/20 shadow-sm">
                    الصفحة {homeFilesPage} من {Math.ceil(remoteFiles.length / ITEMS_PER_PAGE_HOME)}
                  </span>

                  <button
                    onClick={() => setHomeFilesPage(prev => Math.min(Math.ceil(remoteFiles.length / ITEMS_PER_PAGE_HOME), prev + 1))}
                    disabled={homeFilesPage === Math.ceil(remoteFiles.length / ITEMS_PER_PAGE_HOME)}
                    className="p-2 rounded-xl bg-dz-green text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all gold-3d hover:scale-110"
                  >
                    <ChevronLeft size={20} />
                  </button>
                </div>
              )}
            </div>

{/* Detailed Stats Table - Hidden as requested */}
            {/* statsData.length > 0 && (
              <div className="mt-12 bg-white dark:bg-slate-900 border-2 border-dz-gold/20 rounded-3xl overflow-hidden shadow-xl gold-3d">
                <div className="bg-dz-green/10 p-6 border-b border-dz-gold/10">
                  <h3 className="text-xl font-black text-dz-dark dark:text-white flex items-center gap-3">
                    <Database className="text-dz-gold" />
                    إحصائيات الملفات المتوفرة
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-center">
                    <thead className="bg-dz-bg dark:bg-dz-green-dark/20 text-dz-green-dark dark:text-dz-gold text-[10px] font-black uppercase tracking-widest">
                      <tr>
                        <th className="px-6 py-4">الطور</th>
                        <th className="px-6 py-4">السنة</th>
                        <th className="px-6 py-4">المادة</th>
                        <th className="px-6 py-4">عدد الملفات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-dz-gold/10">
                      {statsData.slice(0, 20).map((stat, i) => (
                        <tr key={i} className="hover:bg-dz-bg/50 dark:hover:bg-white/5 transition-colors">
                          <td className="px-6 py-4 text-xs font-bold text-dz-dark dark:text-white">{stat.cycle}</td>
                          <td className="px-6 py-4 text-xs font-bold text-dz-dark dark:text-white">{stat.annee}</td>
                          <td className="px-6 py-4 text-xs font-bold text-dz-dark dark:text-white">{stat.matiere}</td>
                          <td className="px-6 py-4 text-xs font-black text-dz-green text-left">
                            <span className="bg-dz-green/10 px-3 py-1 rounded-full">{stat.count}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {statsData.length > 20 && (
                  <div className="p-4 bg-dz-bg/30 text-center border-t border-dz-gold/5">
                    <span className="text-[10px] font-bold text-slate-400 italic">يتم عرض أول 20 نتيجة فقط...</span>
                  </div>
                )}
              </div>
            ) */}
            {/* Decorative stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-12 py-12 border-t-2 border-dz-gold/10">
              {[
                { label: 'ملف تعليمي', value: getGlobalCount() || '111,000+', color: 'text-dz-green', icon: Library, bg: 'bg-dz-green/10' },
                { label: 'مواضيع مقترحة', value: '45,000+', color: 'text-dz-gold', icon: Lightbulb, bg: 'bg-dz-gold/10' },
                { label: 'فروض واختبارات', value: '89,000+', color: 'text-dz-green-dark', icon: Award, bg: 'bg-dz-green-dark/10' },
                { label: 'حلول نموذجية', value: '32,000+', color: 'text-amber-600', icon: LucideCheck, bg: 'bg-amber-100' }
              ].map((stat, i) => (
                <div key={i} className="bg-white dark:bg-slate-900 p-8 rounded-3xl border-2 border-dz-gold/10 text-center shadow-[0_10px_30px_rgba(0,0,0,0.05)] gold-3d group hover:border-dz-gold/30 transition-all duration-300">
                  <div className={`w-12 h-12 ${stat.bg} ${stat.color} rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform`}>
                    <stat.icon size={24} />
                  </div>
                  <div className={`text-3xl font-black ${stat.color} mb-2`}>{stat.value}</div>
                  <div className="text-xs font-black text-slate-600 dark:text-slate-400">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-12 gap-8">
            <main className="col-span-12 lg:col-span-9 flex flex-col gap-3 order-2 lg:order-1">
              {/* Breadcrumbs */}
              <nav className="flex items-center gap-2 text-[10px] font-black text-dz-green-dark dark:text-emerald-300/60 mb-2 px-2 overflow-x-auto whitespace-nowrap">
                <button onClick={() => setSelectedYear(null)} className="hover:text-dz-green transition-colors flex items-center gap-1">الرئيسية <ChevronLeft size={12} /></button>
              </nav>

              {!selectedSubjectId ? (
                <>
                  <div className="bg-dz-green py-10 px-8 text-center text-white gold-3d relative overflow-hidden rounded-2xl shadow-xl border-2 border-dz-gold/20 mb-6">
                    <div className="absolute inset-0 bg-gradient-to-t from-dz-green/95 via-dz-green/50 to-transparent z-10"></div>
                  </div>
                  
                  <div className="bg-dz-green-dark p-4 text-center text-emerald-100 text-xs italic rounded-xl border-2 border-dz-gold shadow-lg mt-4 mb-2">
                    « يسألك الناس عن الساعة قل إنما علمها عند الله وما يدريك لعل الساعة تكون قريبا - الأحزاب »
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mt-2 px-2 pb-4">
                    {filteredSubjects.map((subj, index) => (
                      <motion.div 
                        key={subj.id} 
                        whileHover={{ scale: 1.02, y: -2 }} 
                        onClick={() => setSelectedSubjectId(subj.id)} 
                        className="flex bg-white dark:bg-slate-900 border-2 border-dz-gold rounded-xl overflow-hidden h-16 group shadow-lg cursor-pointer gold-3d hover:border-dz-green transition-all max-w-[320px] sm:max-w-none w-full my-1 mx-[2px]"
                      >
                        <div className="w-12 flex flex-col items-center justify-center border-l dark:border-dz-gold border-dz-gold bg-dz-bg dark:bg-dz-green-dark/30 group-hover:bg-dz-green transition-colors">
                          <span className="text-dz-green dark:text-dz-gold font-black text-[clamp(9px,2vw,11px)] group-hover:text-white transition-colors">{getSubjectFileCount(subj.id)}</span>
                        </div>
                        <div className="flex-1 flex items-center justify-center px-4">
                          <span className="text-dz-dark dark:text-white font-black text-[clamp(10px,2.5vw,13px)] text-center group-hover:text-dz-green transition-colors leading-tight">{subj.arabicName}</span>
                        </div>
                        <div className="w-12 bg-dz-green flex items-center justify-center group-hover:bg-dz-green-dark transition-colors">
                          <subj.icon size={20} className="text-white group-hover:scale-110 transition-transform" />
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </>
              ) : (
                <PdfList 
                  selectedYear={selectedYear}
                  selectedSubjectId={selectedSubjectId}
                  subjects={filteredSubjects}
                  remoteFiles={remoteFiles}
                  getDirectDownloadLink={getDirectDownloadLink}
                  expandedCategoryIdx={expandedCategoryIdx}
                  setExpandedCategoryIdx={setExpandedCategoryIdx}
                  onBackToSubjects={() => setSelectedSubjectId(null)}
                  getYearLabel={getYearLabel}
                />
              )}
            </main>

            <aside className="col-span-12 lg:col-span-3 flex flex-col gap-4 order-1 lg:order-2">
              <FilterSelect 
                levels={levels}
                selectedYear={selectedYear}
                onSelectYear={setSelectedYear}
                expandedLevel={expandedLevel}
                onToggleLevel={setExpandedLevel}
              />
              
              <div className="bg-dz-green-dark p-6 rounded-2xl border-2 border-dz-gold shadow-xl text-white">
                    <h4 className="text-[clamp(11px,2vw,14px)] font-black text-dz-gold mb-4 border-b border-white/10 pb-2 text-center">روابط سريعة</h4>
                <div className="flex flex-col gap-3">
                  {[
                    { label: 'بنك الفروض', icon: Library, action: () => setSelectedYear('1am') },
                    { label: 'فضاء الأستاذ', icon: Users, action: () => setIsTeacherSpaceOpen(true) },
                    { label: 'الكتب المدرسية', icon: BookOpen, action: () => {} },
                    { label: 'حساب المعدل', icon: Calculator, action: () => setIsCalculatorOpen(true) },
                    { label: 'نتائج الامتحانات', icon: Award, action: () => {} }
                  ].map((item, i) => (
                    <button 
                      key={i} 
                      onClick={item.action}
                      className="flex items-center justify-between text-[11px] font-black hover:text-dz-gold transition-colors text-right group"
                    >
                      <div className="flex items-center gap-3">
                        <item.icon size={16} className="text-dz-gold" />
                        <span>{item.label}</span>
                      </div>
                      <ChevronLeft size={12} className="group-hover:-translate-x-1 transition-transform" />
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-around p-5 bg-white dark:bg-slate-900 rounded-xl text-dz-green-dark border-2 border-dz-gold shadow-lg gold-3d overflow-hidden">
                 <button className="hover:text-dz-gold dark:text-dz-gold transition-all hover:scale-110"><Video size={18} /></button>
                 <button className="hover:text-dz-gold dark:text-dz-gold transition-all hover:scale-110"><Library size={18} /></button>
                 <button className="hover:text-dz-gold dark:text-dz-gold transition-all hover:scale-110"><Award size={18} /></button>
                 <button className="text-lg font-black hover:text-dz-gold dark:text-dz-gold transition-all hover:scale-110">$</button>
                 <button className="hover:text-dz-gold dark:text-dz-gold transition-all hover:scale-110"><Mail size={18} /></button>
              </div>

              {/* Recent Views Section */}
              <AnimatePresence>
                {recentViews.length > 0 && (
                  <motion.div 
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="bg-white dark:bg-slate-900 p-6 rounded-2xl border-2 border-dz-gold shadow-xl"
                  >
                    <h4 className="text-[clamp(9px,1.5vw,11px)] font-black text-dz-gold mb-4 uppercase tracking-widest border-b border-dz-gold/10 pb-2 text-center">شوهد مؤخراً</h4>
                    <div className="flex flex-col gap-3">
                      {recentViews.map((file, i) => (
                        <a 
                          key={i} 
                          href={file.url} 
                          target="_blank" 
                          rel="noreferrer"
                        className="flex items-center justify-center gap-3 group text-center mx-[2px]"
                      >
                        <div className="w-8 h-8 rounded-lg bg-dz-bg dark:bg-dz-green-dark/30 flex items-center justify-center text-dz-green group-hover:bg-dz-green group-hover:text-white transition-all shrink-0">
                          <FileText size={14} />
                        </div>
                        <div className="flex flex-col items-center min-w-0">
                          <span className="text-[10px] font-black text-dz-dark dark:text-white truncate w-full">{file.name}</span>
                          <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">{file.subject}</span>
                        </div>
                      </a>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </aside>
          </div>
        )}
      </main>

      <footer className="bg-dz-green-dark dark:bg-black border-t-2 border-dz-gold mt-20 text-white shadow-2xl relative">
        {/* Modals and Overlays */}
        <GradeCalculator isOpen={isCalculatorOpen} onClose={() => setIsCalculatorOpen(false)} />
        <TeacherSpace isOpen={isTeacherSpaceOpen} onClose={() => setIsTeacherSpaceOpen(false)} />
        <AiTutor />
        
        {/* Search Modal */}
        <AnimatePresence>
          {isSearchOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[110] flex items-start justify-center p-4 md:p-20 bg-black/60 backdrop-blur-md"
              onClick={() => setIsSearchOpen(false)}
            >
              <motion.div
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -20, opacity: 0 }}
                className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl border-2 border-dz-gold gold-3d"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-6 border-b-2 border-dz-gold/10 flex items-center gap-4">
                  <Search size={24} className="text-dz-green" />
                  <input 
                    autoFocus
                    type="text" 
                    placeholder="ابحث عن مادة، سنة، أو موضوع..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex-1 bg-transparent border-none focus:ring-0 text-lg font-black text-dz-dark dark:text-white"
                  />
                  <button onClick={() => setIsSearchOpen(false)} className="p-2 hover:bg-dz-bg rounded-lg">
                    <X size={20} />
                  </button>
                </div>
                
                <div className="max-h-[60vh] overflow-y-auto p-4 flex flex-col gap-2">
                  {/* Results from metadata search */}
                  {searchResults.map((result: any, i) => (
                    <button
                      key={`meta-${i}`}
                      onClick={() => {
                        if (result.type === 'year') setSelectedYear(result.id);
                        if (result.type === 'subject') {
                          setSelectedYear(result.yearId);
                          setSelectedSubjectId(result.subjectId);
                        }
                        setIsSearchOpen(false);
                      }}
                      className="flex items-center justify-center gap-4 p-3 rounded-xl hover:bg-dz-bg dark:hover:bg-dz-green-dark/30 transition-all text-center group border border-transparent hover:border-dz-gold/20 mx-[2px]"
                    >
                      <div className="w-10 h-10 rounded-lg bg-dz-gold/10 flex items-center justify-center text-dz-gold group-hover:bg-dz-gold group-hover:text-dz-green-dark transition-all">
                        <result.icon size={18} />
                      </div>
                      <div className="flex-1 flex flex-col items-center">
                        <span className="text-[clamp(10px,2vw,14px)] font-black text-dz-dark dark:text-white">{result.label}</span>
                        <span className="text-[9px] uppercase font-bold text-dz-green-dark dark:text-emerald-400 opacity-60">{result.levelName}</span>
                      </div>
                      <ChevronLeft size={16} className="text-dz-gold opacity-0 group-hover:opacity-100 transition-all" />
                    </button>
                  ))}

                  {/* Results from CSV API */}
                  {apiSearchResults.length > 0 && (
                    <div className="mt-4 mb-2 px-4">
                      <span className="text-[9px] font-black text-dz-gold uppercase tracking-widest">نتائج من قاعدة البيانات</span>
                    </div>
                  )}
                  
                  {apiSearchResults.map((result: any, i) => {
                    const formatName = (f: any) => {
                      const c = (f.cycle || f.Cycle || '').toLowerCase().replace(/\s+/g, '_');
                      const a = (f.annee || f.Année || f.code_niveau || '').toLowerCase().replace(/\s+/g, '_');
                      const m = (f.matiere || f.Matière || '').toLowerCase().replace(/\s+/g, '_');
                      return `tafawakdz_${c}_${a}_${m}`;
                    };
                    const displayName = formatName(result);

                    return (
                      <a
                        key={`api-${i}`}
                        href={result.lien_direct_drive}
                        target="_blank"
                        rel="noreferrer"
                        onClick={() => {
                          addToRecent({
                            id: `search-${i}`,
                            name: displayName,
                            url: result.lien_direct_drive,
                            subject: result.matiere,
                            year: result.code_niveau
                          });
                          setIsSearchOpen(false);
                        }}
                        className="flex items-center justify-center gap-4 p-3 rounded-xl hover:bg-dz-bg dark:hover:bg-dz-green-dark/30 transition-all text-center group border border-transparent hover:border-dz-gold/20 mx-[2px]"
                      >
                        <div className="w-10 h-10 rounded-lg bg-dz-green/10 flex items-center justify-center text-dz-green group-hover:bg-dz-green group-hover:text-white transition-all">
                          <FileText size={18} />
                        </div>
                        <div className="flex-1 flex flex-col items-center min-w-0">
                          <span className="text-[clamp(10px,2vw,14px)] font-black text-dz-dark dark:text-white truncate max-w-[300px]">
                            {displayName}
                            {result.trimestre && <span className="text-[7px] bg-dz-green/10 text-dz-green px-1.5 py-0.5 rounded mr-2 align-middle">{result.trimestre}</span>}
                          </span>
                          <span className="text-[9px] uppercase font-bold text-slate-400">{result.matiere} - {result.code_niveau}</span>
                        </div>
                        <Download size={14} className="text-dz-gold opacity-0 group-hover:opacity-100 transition-all" />
                      </a>
                    );
                  })}

                  {searchResults.length === 0 && apiSearchResults.length === 0 && searchQuery.length >= 2 && (
                    <div className="p-12 text-center flex flex-col items-center gap-4 text-slate-400">
                      <GraduationCap size={48} className="opacity-20" />
                      <p className="font-black text-sm">لم نجد نتائج مطابقة لبحثك...</p>
                    </div>
                  )}

                  {searchQuery.length < 2 && (
                    <div className="p-12 text-center flex flex-col items-center gap-4 text-slate-400">
                      <Search size={48} className="opacity-20" />
                      <p className="font-black text-sm">ابدأ الكتابة للبحث في بنك المواضيع (أكثر من 30,000 ملف)...</p>
                    </div>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="absolute inset-0 bg-gradient-to-b from-dz-green-dark/50 to-transparent pointer-events-none" />
        <div className="max-w-7xl mx-auto px-12 py-16 flex flex-col md:flex-row justify-between items-start gap-16 relative z-10">
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-dz-gold rounded-lg flex items-center justify-center shadow-lg gold-3d">
                <BookMarked size={20} className="text-dz-green-dark" />
              </div>
              <h1 className="text-xl font-black leading-none uppercase">تفوق <span className="text-dz-gold">ديزاد</span></h1>
            </div>
            <p className="text-[13px] text-emerald-100 dark:text-emerald-200/60 max-w-xs leading-relaxed font-black">المنصة التعليمية الأولى في الجزائر لتوفير المواضيع التعليمية والحلول النموذجية لجميع المستويات.</p>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-16 text-center">
            <div className="flex flex-col gap-4">
              <span className="text-[10px] uppercase font-black tracking-[0.2em] text-dz-gold">المنصة</span>
              <a href="#" className="text-sm font-black text-emerald-100 hover:text-dz-gold transition-colors">عن المنصة</a>
              <a href="#" className="text-sm font-black text-emerald-100 hover:text-dz-gold transition-colors">مساعدة</a>
            </div>
            <div className="flex flex-col gap-4 text-center">
              <span className="text-[10px] uppercase font-black tracking-[0.2em] text-dz-gold">تواصل معنا</span>
              <a href="mailto:contact@tafawak.dz" className="text-sm font-black text-emerald-100 hover:text-dz-gold transition-colors flex items-center justify-center gap-2">
                <Mail size={14} />
                contact@tafawak.dz
              </a>
            </div>
          </div>
        </div>
        <div className="border-t border-dz-gold/20 py-8 bg-black/40 text-center relative z-10">
          <div className="max-w-7xl mx-auto px-12 flex flex-col md:flex-row justify-between items-center gap-6 text-[10px] font-black uppercase tracking-[0.3em] text-emerald-200">
            <p>© {new Date().getFullYear()} TAFAWAK.DZ - جميع الحقوق محفوظة</p>
            <div className="flex items-center gap-6">
               <a href="#" className="hover:text-dz-gold transition-colors">سياسة الخصوصية</a>
               <a href="#" className="hover:text-dz-gold transition-colors">شروط الاستخدام</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
