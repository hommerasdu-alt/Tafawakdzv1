import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Calculator as CalculatorIcon, 
  Plus, 
  Trash2, 
  RotateCcw, 
  CheckCircle2, 
  TrendingUp,
  ChevronLeft,
  X
} from 'lucide-react';

interface SubjectEntry {
  id: string;
  name: string;
  coefficient: number;
  grade: number;
}

const GradeCalculator: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const [entries, setEntries] = React.useState<SubjectEntry[]>([
    { id: '1', name: 'اللغة العربية', coefficient: 3, grade: 10 },
    { id: '2', name: 'الرياضيات', coefficient: 3, grade: 10 },
    { id: '3', name: 'اللغة الفرنسية', coefficient: 2, grade: 10 },
  ]);

  const addEntry = () => {
    setEntries([...entries, { id: Math.random().toString(), name: 'مادة جديدة', coefficient: 1, grade: 10 }]);
  };

  const removeEntry = (id: string) => {
    setEntries(entries.filter(e => e.id !== id));
  };

  const updateEntry = (id: string, field: keyof SubjectEntry, value: any) => {
    setEntries(entries.map(e => e.id === id ? { ...e, [field]: value } : e));
  };

  const calculateAverage = () => {
    const totalPoints = entries.reduce((acc, curr) => acc + (curr.grade * curr.coefficient), 0);
    const totalCoefficients = entries.reduce((acc, curr) => acc + curr.coefficient, 0);
    return totalCoefficients > 0 ? (totalPoints / totalCoefficients).toFixed(2) : '0.00';
  };

  const average = calculateAverage();
  const isPassed = parseFloat(average) >= 10;

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-3xl overflow-hidden shadow-2xl flex flex-col border-2 border-dz-gold gold-3d max-h-[90vh]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-dz-green p-6 text-white flex items-center justify-between border-b-2 border-dz-gold">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-dz-gold rounded-xl flex items-center justify-center text-dz-green-dark shadow-lg gold-3d">
                <CalculatorIcon size={24} />
              </div>
              <div>
                <h2 className="text-xl font-black">حساب المعدل الفصلي</h2>
                <p className="text-[10px] font-black text-emerald-100 opacity-80 uppercase tracking-widest">Grade Calculator Tool</p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="w-10 h-10 rounded-xl bg-black/10 flex items-center justify-center hover:bg-black/20 transition-all"
            >
              <X size={20} />
            </button>
          </div>

          <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
            {/* Main Calculator Area */}
            <div className="flex-1 p-6 overflow-y-auto custom-scrollbar mx-[2px]">
              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-12 gap-4 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest mx-[2px]">
                  <div className="col-span-5 text-center">المادة</div>
                  <div className="col-span-3 text-center">المعامل</div>
                  <div className="col-span-3 text-center">العلامة</div>
                  <div className="col-span-1"></div>
                </div>

                {entries.map((entry) => (
                  <motion.div 
                    layout
                    key={entry.id}
                    className="grid grid-cols-12 gap-4 bg-dz-bg dark:bg-black/20 p-3 rounded-2xl border border-dz-gold/10 items-center hover:border-dz-gold/30 transition-all"
                  >
                    <div className="col-span-5">
                      <input 
                        type="text" 
                        value={entry.name}
                        onChange={(e) => updateEntry(entry.id, 'name', e.target.value)}
                        className="w-full bg-transparent border-none focus:ring-0 text-sm font-black text-dz-dark dark:text-white text-center"
                        placeholder="اسم المادة"
                      />
                    </div>
                    <div className="col-span-3">
                      <input 
                        type="number" 
                        value={entry.coefficient}
                        onChange={(e) => updateEntry(entry.id, 'coefficient', parseFloat(e.target.value) || 0)}
                        className="w-full bg-white dark:bg-slate-800 border-2 border-dz-gold/20 rounded-lg py-1 text-center text-sm font-black text-dz-green focus:border-dz-green transition-all"
                        min="1"
                      />
                    </div>
                    <div className="col-span-3">
                      <input 
                        type="number" 
                        value={entry.grade}
                        onChange={(e) => updateEntry(entry.id, 'grade', parseFloat(e.target.value) || 0)}
                        className="w-full bg-white dark:bg-slate-800 border-2 border-dz-gold/20 rounded-lg py-1 text-center text-sm font-black text-dz-green focus:border-dz-green transition-all"
                        min="0"
                        max="20"
                        step="0.25"
                      />
                    </div>
                    <div className="col-span-1 flex justify-center">
                      <button 
                        onClick={() => removeEntry(entry.id)}
                        className="text-rose-500 hover:text-rose-600 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </motion.div>
                ))}

                <button 
                  onClick={addEntry}
                  className="mt-4 flex items-center justify-center gap-2 py-4 border-2 border-dashed border-dz-gold/30 rounded-2xl text-dz-gold hover:border-dz-gold hover:bg-dz-gold/5 transition-all font-black text-xs"
                >
                  <Plus size={16} />
                  <span>إضافة مادة جديدة</span>
                </button>
              </div>
            </div>

            {/* Results Sidebar */}
            <div className="w-full lg:w-80 bg-dz-bg dark:bg-black/20 border-r-2 border-dz-gold/10 p-6 flex flex-col items-center justify-center text-center relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-dz-gold/5 rounded-full -mr-16 -mt-16 blur-2xl"></div>
              
              <div className="relative z-10">
                <div className={`w-32 h-32 rounded-full border-4 ${isPassed ? 'border-dz-green bg-dz-green/10' : 'border-rose-500 bg-rose-500/10'} flex flex-col items-center justify-center mb-6 gold-3d mx-auto`}>
                  <span className="text-[10px] font-black uppercase opacity-60">المعدل</span>
                  <span className={`text-3xl font-black ${isPassed ? 'text-dz-green' : 'text-rose-500'}`}>{average}</span>
                  <span className="text-[10px] font-black">/ 20</span>
                </div>

                <h3 className={`text-xl font-black mb-2 ${isPassed ? 'text-dz-green' : 'text-rose-500'} flex items-center justify-center gap-2`}>
                  {isPassed ? (
                    <>
                      <CheckCircle2 size={24} />
                      ناجح بإذن الله
                    </>
                  ) : (
                    <>
                      <TrendingUp size={24} className="rotate-180" />
                      تحتاج للمزيد
                    </>
                  )}
                </h3>
                
                <p className="text-xs font-black text-slate-500 dark:text-emerald-100/40 mb-8 leading-relaxed">
                  {isPassed 
                    ? 'أحسنت! استمر في هذا التفوق وعزز مهاراتك أكثر.' 
                    : 'لا تقلق، هذا مجرد توقع. شد حيلك في الاختبارات القادمة!'}
                </p>

                <div className="flex flex-col gap-3 w-full">
                  <button 
                    onClick={() => setEntries([
                      { id: '1', name: 'اللغة العربية', coefficient: 3, grade: 10 },
                      { id: '2', name: 'الرياضيات', coefficient: 3, grade: 10 },
                      { id: '3', name: 'اللغة الفرنسية', coefficient: 2, grade: 10 },
                    ])}
                    className="flex items-center justify-center gap-2 py-3 px-6 bg-slate-200 dark:bg-slate-800 rounded-xl text-xs font-black text-slate-600 dark:text-emerald-100 hover:bg-slate-300 transition-all gold-3d"
                  >
                    <RotateCcw size={14} />
                    إعادة تعيين
                  </button>
                  <button 
                    onClick={onClose}
                    className="flex items-center justify-center gap-2 py-3 px-6 bg-dz-green text-white rounded-xl text-xs font-black hover:bg-dz-green-dark transition-all gold-3d"
                  >
                    حفظ النتيجة
                  </button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default GradeCalculator;
