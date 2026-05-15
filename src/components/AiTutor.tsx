import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  Send, 
  X, 
  User, 
  Bot, 
  Loader2,
  ChevronLeft,
  GraduationCap
} from 'lucide-react';
import { GoogleGenAI } from "@google/genai";

const AiTutor: React.FC = () => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [messages, setMessages] = React.useState<{ role: 'user' | 'bot'; text: string }[]>([
    { role: 'bot', text: 'مرحباً بك! أنا مساعدك الذكي في منصة تفوق ديزاد. كيف يمكنني مساعدتك في دراستك اليوم؟' }
  ]);
  const [input, setInput] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setInput('');
    setIsLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: (process as any).env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: userMessage,
        config: {
          systemInstruction: "أنت مساعد تعليمي ذكي لمنصة 'تفوق ديزاد' (Tafawak DZ) التعليمية في الجزائر. مهمتك هي مساعدة التلاميذ والأساتذة في فهم الدروس، حل التمارين، وتقديم النصائح الدراسية وفق المنهاج التعليمي الجزائري. تحدث باللغة العربية الفصحى وبأسلوب مشجع ومبسط. إذا سألك تلميذ عن مادة معينة، حاول شرح المفاهيم الأساسية له.",
        }
      });

      const botText = response.text || 'عذراً، حدث خطأ ما. حاول مرة أخرى.';
      setMessages(prev => [...prev, { role: 'bot', text: botText }]);
    } catch (error) {
      console.error('AI Error:', error);
      setMessages(prev => [...prev, { role: 'bot', text: 'عذراً، واجهت مشكلة في الاتصال. يرجى المحاولة لاحقاً.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Floating Toggle Button */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsOpen(true)}
        className="fixed bottom-8 left-8 z-[90] w-16 h-16 bg-dz-gold text-dz-green-dark rounded-2xl flex items-center justify-center shadow-2xl gold-3d overflow-hidden group"
      >
        <div className="absolute inset-0 bg-dz-green opacity-0 group-hover:opacity-10 transition-opacity"></div>
        <Sparkles size={28} className="relative z-10" />
        <div className="absolute -top-1 -right-1 w-4 h-4 bg-dz-green rounded-full border-2 border-white animate-pulse"></div>
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 50, x: -50 }}
            animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 50, x: -50 }}
            className="fixed bottom-28 left-8 z-[100] w-full max-w-[400px] h-[600px] bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border-2 border-dz-gold flex flex-col gold-3d overflow-hidden"
          >
            {/* Header */}
            <div className="bg-dz-green p-5 text-white flex items-center justify-between border-b-2 border-dz-gold">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-dz-gold rounded-xl flex items-center justify-center text-dz-green-dark shadow-lg gold-3d">
                  <Bot size={24} />
                </div>
                <div>
                  <h3 className="text-sm font-black">مساعد تفوق الذكي</h3>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></span>
                    <span className="text-[10px] font-black text-emerald-100 uppercase tracking-widest">AI Tutor Online</span>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-black/10 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Chat Messages */}
            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-6 flex flex-col gap-4 bg-dz-bg dark:bg-black/20 custom-scrollbar"
            >
              {messages.map((msg, i) => (
                <div 
                  key={i} 
                  className={`flex items-start gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shadow-sm gold-3d ${
                    msg.role === 'user' ? 'bg-dz-green text-white' : 'bg-dz-gold text-dz-green-dark'
                  }`}>
                    {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                  </div>
                  <div className={`max-w-[80%] p-4 rounded-2xl text-xs font-black leading-relaxed shadow-sm ${
                    msg.role === 'user' 
                      ? 'bg-dz-green text-white rounded-tl-none' 
                      : 'bg-white dark:bg-slate-800 text-dz-dark dark:text-white rounded-tr-none border border-dz-gold/10'
                  }`}>
                    {msg.text}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex items-center gap-2 text-dz-gold text-[10px] font-black px-12">
                  <Loader2 size={12} className="animate-spin" />
                  جاري التفكير...
                </div>
              )}
            </div>

            {/* Input Area */}
            <div className="p-4 bg-white dark:bg-slate-900 border-t-2 border-dz-gold/10">
              <div className="relative flex items-center gap-2">
                <input 
                  type="text" 
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="اسألني عن أي مادة أو درس..."
                  className="flex-1 bg-dz-bg dark:bg-black/30 border-2 border-dz-gold/20 rounded-2xl py-3 px-5 text-xs font-black text-dz-dark dark:text-white focus:border-dz-green transition-all"
                />
                <button 
                  onClick={handleSend}
                  disabled={isLoading || !input.trim()}
                  className="w-12 h-12 bg-dz-green text-white rounded-2xl flex items-center justify-center shadow-lg gold-3d hover:bg-dz-green-dark disabled:opacity-50 disabled:grayscale transition-all"
                >
                  <Send size={18} />
                </button>
              </div>
              <p className="text-[9px] text-center mt-3 text-slate-400 font-black flex items-center justify-center gap-1.5">
                <GraduationCap size={12} />
                مدعوم بتقنيات Gemini AI من مؤسسة تفوق
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default AiTutor;
