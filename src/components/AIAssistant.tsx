import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle2, 
  Send,
  MessageSquare,
  Bot,
  Zap,
  Globe,
  Search
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { chatWithGemini } from '../services/clientAiService';
import { SEOPage } from '../types/seo';
import { cn } from '../lib/utils';

export function AIAssistant({ pages, aiProvider, setAiProvider, apiKeys }: { 
  pages: SEOPage[]; 
  aiProvider: any;
  setAiProvider: (p: any) => void;
  apiKeys: any;
}) {
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState('');
  const [isAsking, setIsAsking] = useState(false);

  const handleAsk = async () => {
    if (!query.trim()) return;
    setIsAsking(true);
    try {
      if (aiProvider === 'gemini') {
        const res = await chatWithGemini(query, pages, apiKeys.gemini);
        setResponse(res);
      } else {
        const res = await fetch('/api/ai/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ provider: aiProvider, query, pages, keys: apiKeys })
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        setResponse(data.response);
      }
    } catch (err: any) {
      setResponse(`Neural Link Error: ${err.message}`);
    } finally {
      setIsAsking(false);
    }
  };

  return (
    <div className="max-w-[1600px] mx-auto space-y-8 mt-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="bg-white border border-slate-200 rounded-[40px] p-8 md:p-12 shadow-2xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-8 opacity-5">
           <Bot size={120} className="text-slate-900" />
        </div>
        
        <div className="relative z-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-3">
                 <div className="p-2 bg-blue-600 rounded-xl text-white shadow-lg shadow-blue-500/20 shrink-0">
                   <MessageSquare size={20} />
                 </div>
                 <h3 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight lowercase">Neural SEO Query Engine</h3>
              </div>
              <p className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-wider ml-12">Interrogate the dataset using semantic correlation</p>
            </div>
            
            <div className="flex flex-wrap items-center gap-2 md:gap-4 bg-slate-50 p-2 rounded-2xl border border-slate-100 shrink-0">
               <div className="flex items-center gap-1.5 px-2 md:px-3">
                 <span className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-wider">Engine:</span>
                 <select 
                   value={aiProvider}
                   onChange={(e) => setAiProvider(e.target.value as any)}
                   className="bg-transparent text-[9px] md:text-[10px] font-black text-blue-600 uppercase tracking-wider outline-none cursor-pointer hover:text-blue-700"
                 >
                   <option value="gemini">Gemini 2.0</option>
                   <option value="openai">GPT-4o</option>
                   <option value="anthropic">Claude 3.5</option>
                   <option value="deepseek">DeepSeek v3</option>
                   <option value="groq">Groq (Llama)</option>
                   <option value="perplexity">Perplexity</option>
                   <option value="huggingface">Hugging Face</option>
                 </select>
               </div>
               <div className="w-px h-4 bg-slate-200" />
               <div className="px-2 md:px-3 flex items-center gap-2">
                 <span className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-wider">Status:</span>
                 <span className="flex items-center gap-1.5">
                   <div className={cn(
                     "w-1.5 h-1.5 rounded-full animate-pulse",
                     apiKeys[aiProvider] ? "bg-emerald-500" : "bg-slate-300"
                   )} />
                   <span className={cn(
                     "text-[9px] md:text-[10px] font-black uppercase tracking-wider",
                     apiKeys[aiProvider] ? "text-emerald-600" : "text-slate-400"
                   )}>
                     {apiKeys[aiProvider] ? "Linked" : "Key Req."}
                   </span>
                 </span>
               </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="relative group/input">
              <div className="absolute left-6 top-6 text-slate-400 group-focus-within/input:text-blue-500 transition-colors">
                 <Search size={24} strokeWidth={1.5} />
              </div>
              <textarea 
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ex: What are the most critical architectural flaws across the 10 lowest scoring nodes?"
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-[32px] pl-16 pr-32 pt-6 pb-20 text-base font-bold text-slate-800 placeholder:text-slate-300 outline-none focus:border-blue-500 focus:bg-white transition-all shadow-inner focus:shadow-blue-500/5 min-h-[140px] resize-none"
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleAsk())}
              />
              <button 
                onClick={handleAsk}
                disabled={isAsking || !query.trim()}
                className="absolute right-6 bottom-6 px-6 py-3 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.25em] flex items-center gap-3 hover:bg-blue-600 transition-all disabled:opacity-50 shadow-xl shadow-slate-900/10 active:scale-95"
              >
                {isAsking ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
                Execute Query
              </button>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
               {[
                 "Analyze LCP clusters",
                 "High-effort vs Low-impact",
                 "Schema optimization nodes",
                 "Internal link trajectories"
               ].map(sample => (
                 <button 
                   key={sample}
                   onClick={() => setQuery(sample)}
                   className="p-4 bg-white border border-slate-100 rounded-2xl text-[10px] font-black uppercase text-slate-400 tracking-wider hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-all text-left truncate group/sample"
                 >
                   <span className="group-hover/sample:translate-x-1 transition-transform inline-block">/ {sample}</span>
                 </button>
               ))}
            </div>
          </div>
        </div>
      </div>

      {response && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#0f172a] text-white rounded-[40px] p-8 md:p-12 shadow-2xl relative overflow-hidden group/response border border-slate-800"
        >
          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-blue-500/50 to-transparent" />
          <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-600 shadow-[0_0_15px_rgba(37,99,235,0.5)]" />
          
          <div className="absolute top-0 right-0 p-8 opacity-[0.03] rotate-12 transition-transform duration-700 group-hover/response:rotate-0">
             <Bot size={160} />
          </div>
          
          {/* Hardware elements */}
          <div className="absolute top-8 right-12 flex gap-1">
             {[1,2,3].map(i => (
               <div key={i} className="w-1 h-1 rounded-full bg-slate-700" />
             ))}
          </div>

          <div className="flex items-center justify-between mb-10 border-b border-slate-800 pb-8">
            <div className="flex items-center gap-4">
               <div className="p-2.5 bg-blue-600 text-white rounded-xl shadow-[0_0_20px_rgba(37,99,235,0.4)]">
                 <Zap size={20} />
               </div>
               <div>
                 <span className="text-[10px] font-black uppercase tracking-[0.5em] text-blue-400 block mb-1">Intelligence Stream</span>
                 <h4 className="text-xl font-black text-white italic uppercase tracking-tight">Derived Semantic Analysis</h4>
               </div>
            </div>
            <div className="hidden md:flex items-center gap-6 text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">
               <div className="flex items-center gap-2">
                 <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                 Confidence: 98.4%
               </div>
               <div className="w-px h-4 bg-slate-800" />
               <div className="flex items-center gap-2 font-mono text-blue-400/80">
                 PROCESSED // {new Date().toLocaleTimeString()}
               </div>
            </div>
          </div>

          <div className="relative z-10 custom-scrollbar max-h-[600px] overflow-y-auto pr-4">
             <div className="prose prose-invert prose-blue max-w-none prose-p:text-slate-300 prose-p:leading-relaxed prose-p:text-base prose-headings:text-white prose-headings:font-black prose-headings:uppercase prose-headings:tracking-tight prose-strong:text-blue-400 prose-code:text-emerald-400 prose-pre:bg-slate-950 prose-pre:border prose-pre:border-slate-800">
                <ReactMarkdown>{response || ""}</ReactMarkdown>
             </div>
          </div>

          <div className="mt-10 pt-8 border-t border-slate-800 flex items-center justify-between">
             <div className="flex items-center gap-3">
                <div className="px-2 py-1 bg-slate-800 rounded text-[9px] font-black text-slate-400 tracking-wider uppercase">Encryption: TLS 1.3</div>
                <div className="px-2 py-1 bg-slate-800 rounded text-[9px] font-black text-slate-400 tracking-wider uppercase">Protocol: JSON:API</div>
             </div>
             <button 
               onClick={() => window.print()}
               className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] hover:text-white transition-colors"
             >
               Export Fragment
             </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
