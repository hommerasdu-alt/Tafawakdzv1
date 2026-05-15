import React from 'react';
import { ChevronLeft, BookMarked } from 'lucide-react';
import { motion } from 'motion/react';

interface Level {
  id: string;
  name: string;
  color: string;
  years: { id: string; label: string }[];
}

interface FilterSelectProps {
  levels: Level[];
  selectedYear: string | null;
  onSelectYear: (yearId: string) => void;
  expandedLevel: string | null;
  onToggleLevel: (levelId: string | null) => void;
}

const FilterSelect: React.FC<FilterSelectProps> = ({ 
  levels, 
  selectedYear, 
  onSelectYear, 
  expandedLevel, 
  onToggleLevel 
}) => {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl text-dz-dark dark:text-emerald-50 shadow-xl border-2 border-dz-gold overflow-hidden">
      <div className="px-6 py-5 text-center bg-dz-green text-white border-b-2 border-dz-gold">
         <h2 className="text-lg font-black flex items-center justify-center gap-2">
            بنك الاختبارات
            <BookMarked size={18} className="text-dz-gold" />
         </h2>
      </div>
      <nav className="flex flex-col">
        {levels.map((level) => {
          const isExpanded = expandedLevel === level.id;
          const containsSelectedYear = level.years.some(y => y.id === selectedYear);
          
          return (
            <div key={level.id} className="flex flex-col border-b border-dz-gold/10">
              <button 
                onClick={() => onToggleLevel(isExpanded ? null : level.id)} 
                className={`flex items-center justify-center gap-4 px-5 py-4 hover:bg-emerald-50 dark:hover:bg-dz-green-dark/20 transition-all group relative mx-[2px] ${isExpanded || containsSelectedYear ? 'bg-emerald-50/50 dark:bg-dz-green-dark/30' : ''}`}
              >
                <ChevronLeft size={14} className={`text-dz-gold transition-transform shrink-0 ${isExpanded ? 'rotate-[-90deg]' : 'group-hover:-translate-x-1'}`} />
                <span className={`text-[13px] font-black text-center transition-colors ${isExpanded || containsSelectedYear ? 'text-dz-green' : 'text-dz-dark dark:text-emerald-50'}`}>{level.name}</span>
              </button>
              {(isExpanded || containsSelectedYear) && (
                <motion.div 
                  initial={containsSelectedYear ? { height: "auto", opacity: 1 } : { height: 0, opacity: 0 }} 
                  animate={{ height: "auto", opacity: 1 }} 
                  className="bg-emerald-50/30 dark:bg-black/20 overflow-hidden"
                >
                  {level.years.map(year => (
                    <button 
                      key={year.id} 
                      onClick={() => onSelectYear(year.id)} 
                      className={`w-full flex items-center justify-center gap-4 px-8 py-2.5 hover:bg-white dark:hover:bg-dz-green-dark/40 transition-colors text-center relative mx-[2px] ${selectedYear === year.id ? 'text-dz-green font-black' : 'text-dz-green-dark dark:text-emerald-200/70 font-black'}`}
                    >
                      {selectedYear === year.id && <div className="absolute right-0 top-0 bottom-0 w-1 bg-dz-green" />}
                      <ChevronLeft size={12} className={`opacity-0 transition-opacity shrink-0 ${selectedYear === year.id ? 'opacity-100' : ''}`} />
                      <span className="text-xs">{year.label}</span>
                    </button>
                  ))}
                </motion.div>
              )}
            </div>
          );
        })}
      </nav>
    </div>
  );
};

export default FilterSelect;
