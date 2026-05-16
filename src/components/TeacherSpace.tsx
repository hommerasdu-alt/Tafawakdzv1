import React from 'react';
import { 
  Users, 
  FileSpreadsheet, 
  Upload, 
  CheckCircle, 
  AlertCircle, 
  FileText,
  Download,
  Trash2,
  ChevronLeft,
  GraduationCap,
  Save,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import * as XLSX from 'xlsx';

interface StudentGrade {
  id: string;
  name: string;
  grade: number | string;
  note?: string;
}

export default function TeacherSpace({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [dragActive, setDragActive] = React.useState(false);
  const [extractedData, setExtractedData] = React.useState<StudentGrade[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);
  const [headerMap, setHeaderMap] = React.useState<Record<string, string>>({
    name: '',
    grade: ''
  });

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const processFile = async (file: File) => {
    setIsLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const json = XLSX.utils.sheet_to_json(worksheet) as any[];

      if (json.length === 0) {
        throw new Error('الملف فارغ أو غير صالح');
      }

      // Try to auto-detect headers
      const firstRow = json[0];
      const keys = Object.keys(firstRow);
      
      let nameKey = keys.find(k => k.toLowerCase().includes('name') || k.includes('اسم') || k.includes('لقب'));
      let gradeKey = keys.find(k => k.toLowerCase().includes('grade') || k.toLowerCase().includes('mark') || k.toLowerCase().includes('score') || k.includes('نقطة') || k.includes('علامة') || k.includes('معدل'));

      if (!nameKey || !gradeKey) {
        // Just take first two columns if no match
        nameKey = keys[0];
        gradeKey = keys[1];
      }

      const formattedData: StudentGrade[] = json.map((row, idx) => ({
        id: (idx + 1).toString(),
        name: row[nameKey!] || 'غير معروف',
        grade: row[gradeKey!] || 0,
        note: row['ملاحظة'] || row['note'] || ''
      }));

      setExtractedData(formattedData);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء معالجة الملف');
    } finally {
      setIsLoading(false);
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const clearData = () => {
    setExtractedData([]);
    setSuccess(false);
    setError(null);
  };

  const downloadSample = () => {
    const sampleData = [
      { 'اسم التلميذ': 'محمد بلقاسم', 'النقطة': 18.5, 'ملاحظة': 'ممتاز' },
      { 'اسم التلميذ': 'فاطمة الزهراء', 'النقطة': 15.0, 'ملاحظة': 'جيد جدا' },
      { 'اسم التلميذ': 'أحمد سعيد', 'النقطة': 12.0, 'ملاحظة': 'قريب من الجيد' }
    ];
    const ws = XLSX.utils.json_to_sheet(sampleData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "النقاط");
    XLSX.writeFile(wb, "نموذج_حجز_النقاط.xlsx");
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[120] flex items-center justify-center p-4 md:p-10 bg-black/60 backdrop-blur-md"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            className="bg-white dark:bg-slate-900 w-full max-w-5xl h-[85vh] rounded-3xl overflow-hidden shadow-2xl border-4 border-dz-gold gold-3d flex flex-col"
            onClick={(e) => e.stopPropagation()}
            dir="rtl"
          >
            {/* Header */}
            <div className="bg-dz-green py-6 px-8 text-white relative overflow-hidden flex items-center justify-between shrink-0">
              <div className="flex items-center gap-4 relative z-10">
                <div className="w-12 h-12 bg-dz-gold rounded-2xl flex items-center justify-center shadow-lg gold-3d transform -rotate-3 text-dz-green-dark">
                  <Users size={24} />
                </div>
                <div>
                  <h2 className="text-2xl font-black">فضاء الأستاذ</h2>
                  <p className="text-xs font-bold text-emerald-100 uppercase tracking-widest mt-0.5">Teacher Management Workspace</p>
                </div>
              </div>
              
              <button 
                onClick={onClose}
                className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 transition-all text-white border border-white/20"
              >
                <ChevronLeft size={24} />
              </button>
              
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32 blur-3xl"></div>
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-dz-gold/10 rounded-full -ml-16 -mb-16 blur-2xl"></div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Right Column: Actions and Upload */}
                <div className="lg:col-span-1 flex flex-col gap-6">
                  <div className="bg-dz-bg dark:bg-white/5 p-6 rounded-3xl border-2 border-dz-gold/20">
                    <h3 className="text-lg font-black text-dz-dark dark:text-white mb-4 flex items-center gap-3">
                      <FileSpreadsheet className="text-dz-green" />
                      حجز النقاط آلياً
                    </h3>
                    <p className="text-xs font-bold text-slate-500 mb-6 leading-relaxed">
                      قم برفع ملف إكسل (Excel) يحتوي على أسماء التلاميذ ونقاطهم ليتم استخراجها وتنظيمها تلقائياً.
                    </p>

                    <div 
                      className={`relative border-2 border-dashed rounded-2xl p-8 transition-all flex flex-col items-center gap-3 text-center ${
                        dragActive ? 'border-dz-green bg-dz-green/5' : 'border-slate-300 dark:border-slate-700 hover:border-dz-gold'
                      }`}
                      onDragEnter={handleDrag}
                      onDragLeave={handleDrag}
                      onDragOver={handleDrag}
                      onDrop={handleDrop}
                    >
                      <input 
                        type="file" 
                        id="excel-upload" 
                        className="hidden" 
                        accept=".xlsx, .xls, .csv"
                        onChange={handleChange}
                      />
                      <label 
                        htmlFor="excel-upload"
                        className="w-14 h-14 bg-dz-gold/10 text-dz-gold rounded-full flex items-center justify-center cursor-pointer hover:scale-110 transition-transform"
                      >
                        <Upload size={28} />
                      </label>
                      <div className="flex flex-col gap-1">
                        <span className="text-[13px] font-black text-dz-dark dark:text-white">اسحب ملف الإكسل هنا</span>
                        <span className="text-[10px] font-bold text-slate-400">أو اضغط للمـتصفح</span>
                      </div>
                      
                      {isLoading && (
                        <div className="absolute inset-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm flex items-center justify-center rounded-2xl">
                          <div className="w-10 h-10 border-4 border-dz-green border-t-transparent rounded-full animate-spin"></div>
                        </div>
                      )}
                    </div>

                    <div className="mt-6 flex flex-col gap-2">
                      <button 
                        onClick={downloadSample}
                        className="w-full flex items-center justify-center gap-2 p-3 bg-white dark:bg-slate-800 border-2 border-dz-gold text-dz-dark dark:text-white rounded-xl text-xs font-black hover:bg-slate-50 transition-all gold-3d"
                      >
                        <Download size={14} />
                        تحميل نموذج ملف إكسل
                      </button>
                    </div>
                  </div>

                  <div className="bg-dz-green/5 dark:bg-white/5 p-6 rounded-3xl border-2 border-dz-gold/10">
                    <h4 className="text-sm font-black text-dz-dark dark:text-white mb-4 flex items-center gap-2">
                      <Info size={16} className="text-dz-gold" />
                      تعليمات الاستخدام
                    </h4>
                    <ul className="flex flex-col gap-3">
                      {[
                        'تأكد أن العمود الأول يحتوي على أسماء التلاميذ.',
                        'العمود الثاني يجب أن يحتوي على النقاط المسجلة.',
                        'المنصة تدعم صيغ .xlsx و .xls و .csv.',
                        'يمكنك تعديل الأسماء أو النقاط يدوياً بعد الاستخراج.'
                      ].map((tip, i) => (
                        <li key={i} className="flex gap-2 text-[11px] font-bold text-slate-600 dark:text-emerald-100/70">
                          <span className="text-dz-gold">•</span>
                          {tip}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Left Column: Data Preview */}
                <div className="lg:col-span-2 flex flex-col gap-6">
                  {extractedData.length > 0 ? (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="bg-white dark:bg-slate-800 rounded-3xl border-2 border-dz-gold shadow-xl flex flex-col overflow-hidden h-full"
                    >
                      <div className="p-5 border-b-2 border-dz-gold/10 flex items-center justify-between bg-dz-bg dark:bg-dz-green-dark/20">
                        <div className="flex items-center gap-3">
                          <h3 className="text-lg font-black text-dz-dark dark:text-white">قائمة النقاط المستخرجة</h3>
                          <span className="bg-dz-green text-white text-[10px] font-black px-2 py-0.5 rounded-full">{extractedData.length} تلميذ</span>
                        </div>
                        <div className="flex items-center gap-2">
                           <button 
                             onClick={clearData}
                             className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors border border-red-200"
                             title="مسح البيانات"
                           >
                             <Trash2 size={16} />
                           </button>
                           <button 
                             onClick={() => {
                               setSuccess(true);
                               setTimeout(() => setSuccess(false), 3000);
                             }}
                             className="flex items-center gap-2 px-4 py-2 bg-dz-green text-white rounded-xl text-xs font-black shadow-md hover:bg-dz-green-dark transition-all gold-3d"
                           >
                             <Save size={16} />
                             حفظ الكل
                           </button>
                        </div>
                      </div>

                      <div className="flex-1 overflow-x-auto">
                        <table className="w-full text-center">
                          <thead className="bg-slate-50 dark:bg-white/5 text-[11px] font-black uppercase text-dz-green-dark dark:text-dz-gold border-b-2 border-dz-gold/10">
                            <tr>
                              <th className="px-6 py-4">الترتيب</th>
                              <th className="px-6 py-4 text-right">اسم التلميذ</th>
                              <th className="px-6 py-4">النقطة (/20)</th>
                              <th className="px-6 py-4">الملاحظة</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-dz-gold/5">
                            {extractedData.map((student, idx) => (
                              <tr key={student.id} className="hover:bg-dz-bg/30 dark:hover:bg-white/5 transition-colors">
                                <td className="px-6 py-4 text-xs font-black text-slate-400">{student.id}</td>
                                <td className="px-6 py-4 text-xs font-black text-dz-dark dark:text-white text-right">
                                  <input 
                                    type="text" 
                                    value={student.name}
                                    onChange={(e) => {
                                      const newData = [...extractedData];
                                      newData[idx].name = e.target.value;
                                      setExtractedData(newData);
                                    }}
                                    className="bg-transparent border-none focus:ring-0 w-full text-right font-black"
                                  />
                                </td>
                                <td className="px-6 py-4">
                                  <div className="flex items-center justify-center gap-2">
                                    <input 
                                      type="number" 
                                      step="0.25"
                                      min="0"
                                      max="20"
                                      value={student.grade}
                                      onChange={(e) => {
                                        const newData = [...extractedData];
                                        newData[idx].grade = e.target.value;
                                        setExtractedData(newData);
                                      }}
                                      className={`w-16 p-1.5 rounded-lg border-2 text-center font-black text-xs ${
                                        Number(student.grade) >= 10 ? 'border-dz-green/20 bg-dz-green/5 text-dz-green' : 'border-red-200 bg-red-50 text-red-500'
                                      }`}
                                    />
                                  </div>
                                </td>
                                <td className="px-6 py-4 text-[10px] font-bold text-slate-500">
                                  <input 
                                    type="text" 
                                    placeholder="أضف ملاحظة..."
                                    value={student.note || ''}
                                    onChange={(e) => {
                                      const newData = [...extractedData];
                                      newData[idx].note = e.target.value;
                                      setExtractedData(newData);
                                    }}
                                    className="bg-transparent border-none focus:ring-0 text-center w-full italic"
                                  />
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </motion.div>
                  ) : (
                    <div className="bg-dz-bg dark:bg-white/5 rounded-3xl border-2 border-dashed border-dz-gold/20 flex flex-col items-center justify-center p-20 text-center gap-6 h-full">
                       <div className="w-24 h-24 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center shadow-xl border-4 border-dz-gold/20">
                          <GraduationCap size={48} className="text-slate-300 dark:text-slate-700" />
                       </div>
                       <div className="flex flex-col gap-2 max-w-sm mx-auto">
                          <h3 className="text-xl font-black text-dz-dark dark:text-white">لا توجد بيانات حالياً</h3>
                          <p className="text-sm font-bold text-slate-500 leading-relaxed">
                            بمجرد قيامك برفع ملف الإكسل، ستظهر هنا قائمة التلاميذ المنظمة لإتمام عملية الحجز آلياً.
                          </p>
                       </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer Overlay for status */}
            <AnimatePresence>
               {success && (
                <motion.div 
                  initial={{ y: 50, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 50, opacity: 0 }}
                  className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-dz-green text-white px-8 py-3 rounded-2xl shadow-2xl flex items-center gap-3 z-[130] border-2 border-white/20 gold-3d font-black text-sm"
                >
                  <CheckCircle size={20} />
                  <span>تمت معالجة البيانات وبدء عملية الحجز بنجاح!</span>
                </motion.div>
               )}
               {error && (
                <motion.div 
                  initial={{ y: 50, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 50, opacity: 0 }}
                  className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-red-600 text-white px-8 py-3 rounded-2xl shadow-2xl flex items-center gap-3 z-[130] border-2 border-white/20 gold-3d font-black text-sm"
                >
                  <AlertCircle size={20} />
                  <span>خطأ: {error}</span>
                </motion.div>
               )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
