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
  appreciation?: string;
  advice?: string;
  note?: string;
}

const getAppraisal = (grade: number | string) => {
  const g = typeof grade === 'string' ? parseFloat(grade) : grade;
  if (isNaN(g)) return { appreciation: '-', advice: '-' };
  
  if (g >= 18) return { appreciation: 'نتائج ممتازة', advice: 'نتائج ممتازة ومرضية واصل' };
  if (g >= 15) return { appreciation: 'نتائج جيدة', advice: 'نتائج جيدة ومشجعة واصل' };
  if (g >= 14) return { appreciation: 'نتائج حسنة', advice: 'واصل الاجتهاد و المثابرة' };
  if (g >= 12) return { appreciation: 'نتائج حسنة', advice: 'نتائج مقبولة بامكانك تحسينها' };
  if (g >= 10) return { appreciation: 'نتائج متوسطة', advice: 'بمقدورك تحقيق نتائج أفضل' };
  if (g >= 5) return { appreciation: 'نتائج دون الوسط', advice: 'ينقصك الحرص و التركيز' };
  return { appreciation: 'نتائج غير مقبول', advice: 'احذر التهاون' };
};

export default function TeacherSpace({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [dragActive, setDragActive] = React.useState(false);
  const [extractedData, setExtractedData] = React.useState<StudentGrade[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);

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
      let workbook;
      const arrayBuffer = await file.arrayBuffer();
      
      if (file.name.toLowerCase().endsWith('.csv')) {
        // Handle Arabic encoding (Windows-1256) which is common in Algerian CSV exports
        let decoder = new TextDecoder('utf-8');
        let content = decoder.decode(arrayBuffer);
        
        // If UTF-8 doesn't show Arabic characters but we expect them, or if it has replacement chars
        if (!/[\u0600-\u06FF]/.test(content) || content.includes('')) {
          try {
            const arabicDecoder = new TextDecoder('windows-1256');
            const arabicContent = arabicDecoder.decode(arrayBuffer);
            // If Windows-1256 produces Arabic where UTF-8 didn't, use it
            if (/[\u0600-\u06FF]/.test(arabicContent)) {
              content = arabicContent;
            }
          } catch (e) {
            console.error('Arabic decoding failed:', e);
          }
        }
        workbook = XLSX.read(content, { type: 'string' });
      } else {
        workbook = XLSX.read(arrayBuffer);
      }

      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      
      // Get all rows as dynamic arrays
      const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" }) as any[][];

      if (rows.length <= 7) {
        throw new Error('الملف لا يحتوي على بيانات كافية (يجب أن يتجاوز 7 أسطر لتروية المؤسسة)');
      }

      // Skip exactly 7 lines as requested (Metadata). Start processing from line 8.
      // Often line 8/9 are headers, data usually starts around line 10 in these Algerian templates.
      const dataRows = rows.slice(7); 
      
      // Dynamic column identification
      let nomIdx = -1;
      let prenomIdx = -1;
      let gradeIdx = -1;

      // Find the header row (looking for "nom", "prenom", "matricule", or "/" in line 8 or 9)
      const headerCandidates = dataRows.slice(0, 3);
      let skipRows = 0;

      for (let r = 0; r < headerCandidates.length; r++) {
        const row = headerCandidates[r];
        for (let c = 0; c < row.length; c++) {
          const val = String(row[c]).toLowerCase();
          if (val.includes('nom') || val.includes('اللقب')) nomIdx = c;
          if (val.includes('prenom') || val.includes('الاسم')) prenomIdx = c;
          if (val.includes('09') || val.includes('المعدل') || val.includes('moyenne') || val.includes('/20')) gradeIdx = c;
        }
        if (nomIdx !== -1 || gradeIdx !== -1) {
          skipRows = r + 1; // Skip the header row(s) too
          break;
        }
      }

      // Fallbacks if detection failed on header
      if (nomIdx === -1) nomIdx = 1; // Algerian templates often have Nom at Col B
      if (prenomIdx === -1) prenomIdx = 2; // Prenom at Col C
      if (gradeIdx === -1) gradeIdx = 7; // Average often at Col H (Idx 7)

      const finalRows = dataRows.slice(skipRows);

      const formattedData: StudentGrade[] = finalRows
        .filter(row => row.length > 0 && row[nomIdx] !== undefined && String(row[nomIdx]).trim() !== "")
        .map((row, idx) => {
          // Combine Nom and Prenom if separate
          const lastName = row[nomIdx] ? String(row[nomIdx]).trim() : '';
          const firstName = prenomIdx !== -1 && row[prenomIdx] ? String(row[prenomIdx]).trim() : '';
          const fullName = firstName ? `${lastName} ${firstName}` : lastName;

          // Find grade by searching for the numeric value in the detected grade column
          let grade = 0;
          if (gradeIdx !== -1 && row[gradeIdx] !== undefined) {
            const parsed = parseFloat(String(row[gradeIdx]).replace(',', '.'));
            grade = !isNaN(parsed) ? parsed : 0;
          }

          const appraisals = getAppraisal(grade);
          return {
            id: (idx + 1).toString(),
            name: fullName || 'غير معروف',
            grade: grade,
            appreciation: appraisals.appreciation,
            advice: appraisals.advice,
            note: '' 
          };
        });

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
      { 'اسم التلميذ': 'محمد بلقاسم', 'النقطة': 19.25, 'التقدير': 'نتائج ممتازة', 'الإرشادات': 'نتائج ممتازة ومرضية واصل' },
      { 'اسم التلميذ': 'فاطمة الزهراء', 'النقطة': 16.5, 'التقدير': 'نتائج جيدة', 'الإرشادات': 'نتائج جيدة ومشجعة واصل' },
      { 'اسم التلميذ': 'أحمد سعيد', 'النقطة': 12.25, 'التقدير': 'نتائج حسنة', 'الإرشادات': 'نتائج مقبولة بامكانك تحسينها' },
      { 'اسم التلميذ': 'كمال يونس', 'النقطة': 9.5, 'التقدير': 'نتائج متوسطة', 'الإرشادات': 'بمقدورك تحقيق نتائج أفضل' },
      { 'اسم التلميذ': 'سارة علوي', 'النقطة': 3.75, 'التقدير': 'نتائج دون الوسط', 'الإرشادات': 'ينقصك الحرص والتركيز' },
      { 'اسم التلميذ': 'ياسين بن علي', 'النقطة': 14.75, 'التقدير': 'نتائج حسنة', 'الإرشادات': 'واصل الاجتهاد و المثابرة' },
      { 'اسم التلميذ': 'ليلى مراد', 'النقطة': 0, 'التقدير': 'نتائج غير مقبول', 'الإرشادات': 'احذر التهاون' }
    ];
    const ws = XLSX.utils.json_to_sheet(sampleData);
    
    // Set column widths for better visibility
    ws['!cols'] = [
      { wch: 25 }, // Name
      { wch: 10 }, // Grade
      { wch: 20 }, // Appraisal
      { wch: 35 }  // Advice
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "قائمة النقاط");
    XLSX.writeFile(wb, "نموذج_حجز_النقاط_تفوّق.xlsx");
  };

  const downloadResults = () => {
    if (extractedData.length === 0) return;

    const exportData = extractedData.map(student => ({
      'الترتيب': student.id,
      'اسم التلميذ': student.name,
      'النقطة (/20)': student.grade,
      'التقدير': student.appreciation,
      'الإرشادات': student.advice
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    
    // Set column widths
    ws['!cols'] = [
      { wch: 8 },  // ID
      { wch: 25 }, // Name
      { wch: 12 }, // Grade
      { wch: 20 }, // Appraisal
      { wch: 40 }  // Advice
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "النتائج المستخرجة");
    XLSX.writeFile(wb, `نتائج_النقاط_المستخرجة_${new Date().toLocaleDateString('ar-DZ').replace(/\//g, '-')}.xlsx`);
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
                        'يقوم النظام تلقائياً بتوليد التقديرات والإرشادات بناءً على العلامة.',
                        'يمكنك تعديل الأسماء أو النقاط يدوياً وتحديث الأوصاف تلقائياً.'
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
                             onClick={downloadResults}
                             className="p-2 text-dz-green hover:bg-dz-green/10 rounded-lg transition-colors border border-dz-green/20"
                             title="تحميل النتائج كملف Excel"
                           >
                             <Download size={16} />
                           </button>
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
                              <th className="px-4 py-4">الترتيب</th>
                              <th className="px-4 py-4 text-right">اسم التلميذ</th>
                              <th className="px-4 py-4">النقطة (/20)</th>
                              <th className="px-4 py-4">التقديرات</th>
                              <th className="px-4 py-4">الإرشادات</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-dz-gold/5">
                            {extractedData.map((student, idx) => (
                              <tr key={student.id} className="hover:bg-dz-bg/30 dark:hover:bg-white/5 transition-colors">
                                <td className="px-4 py-4 text-xs font-black text-slate-400">{student.id}</td>
                                <td className="px-4 py-4 text-xs font-black text-dz-dark dark:text-white text-right">
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
                                <td className="px-4 py-4">
                                  <div className="flex items-center justify-center gap-2">
                                    <input 
                                      type="number" 
                                      step="0.25"
                                      min="0"
                                      max="20"
                                      value={student.grade}
                                      onChange={(e) => {
                                        const newData = [...extractedData];
                                        const val = e.target.value;
                                        newData[idx].grade = val;
                                        const appraisals = getAppraisal(val);
                                        newData[idx].appreciation = appraisals.appreciation;
                                        newData[idx].advice = appraisals.advice;
                                        setExtractedData(newData);
                                      }}
                                      className={`w-16 p-1.5 rounded-lg border-2 text-center font-black text-xs ${
                                        Number(student.grade) >= 10 ? 'border-dz-green/20 bg-dz-green/5 text-dz-green' : 'border-red-200 bg-red-50 text-red-500'
                                      }`}
                                    />
                                  </div>
                                </td>
                                <td className="px-4 py-4">
                                   <span className={`text-[11px] font-black px-3 py-1 rounded-full ${
                                     Number(student.grade) >= 16 ? 'bg-dz-green text-white' : 
                                     Number(student.grade) >= 12 ? 'bg-dz-gold/20 text-dz-green-dark' :
                                     Number(student.grade) >= 10 ? 'bg-dz-gold/10 text-dz-dark' : 'bg-red-100 text-red-600'
                                   }`}>
                                     {student.appreciation}
                                   </span>
                                </td>
                                <td className="px-4 py-4 text-[11px] font-bold text-slate-500 dark:text-emerald-100/70 text-right">
                                  {student.advice}
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
