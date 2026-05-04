import React, { useState, useEffect, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { 
  BarChart3, 
  Search, 
  AlertCircle, 
  CheckCircle2, 
  Layout, 
  Link as LinkIcon, 
  FileText, 
  Sparkles,
  RefreshCw,
  ChevronRight,
  ChevronLeft,
  Globe,
  Download,
  Twitter,
  Facebook,
  Linkedin,
  Share2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Helper for tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Types
import { SEOPage, AuditStats } from './types/seo';
import { generateGeminiInsights, chatWithGemini } from './services/clientAiService';

export default function App() {
  const [url, setUrl] = useState('');
  const [maxPages, setMaxPages] = useState(1000);
  const [depth, setDepth] = useState(10);
  const [isAuditing, setIsAuditing] = useState(false);
  const [currentCrawlingUrl, setCurrentCrawlingUrl] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [pages, setPages] = useState<SEOPage[]>([]);
  const [stats, setStats] = useState<AuditStats | null>(null);
  const [selectedPage, setSelectedPage] = useState<SEOPage | null>(null);
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'pages' | 'ai'>('overview');

  const chartData = useMemo(() => {
    if (!stats) return [];
    return [
      { name: 'Critical', value: stats.criticalIssues, color: '#ef4444' },
      { name: 'Warnings', value: stats.warningIssues, color: '#f59e0b' },
      { name: 'Healthy', value: pages.filter(p => p.issues.length === 0).length, color: '#10b981' }
    ].filter(d => d.value > 0);
  }, [stats, pages]);
  const [pageSearch, setPageSearch] = useState('');
  const [compareUrls, setCompareUrls] = useState<string[]>([]);
  const [isComparing, setIsComparing] = useState(false);
  const [aiProvider, setAiProvider] = useState<'gemini' | 'openai' | 'anthropic' | 'groq' | 'huggingface' | 'deepseek' | 'perplexity'>('gemini');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const filteredPages = useMemo(() => {
    return pages.filter(p => !pageSearch || p.url.toLowerCase().includes(pageSearch.toLowerCase()) || (pageSearch === 'critical' && p.issues.some(i => i.type === 'critical')));
  }, [pages, pageSearch]);

  const totalPages = Math.ceil(filteredPages.length / pageSize);
  const paginatedPages = filteredPages.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const toggleCompare = (url: string) => {
    setCompareUrls(prev => 
      prev.includes(url) ? prev.filter(u => u !== url) : [...prev, url].slice(0, 2)
    );
  };

  useEffect(() => {
    const timer = setInterval(async () => {
      if (isAuditing) {
        const res = await fetch('/api/audit/status');
        const data = await res.json();
        setProgress(data.progress);
        if (!data.is_running) {
          setIsAuditing(false);
          fetchResults();
        }
      }
    }, 2000);
    return () => clearInterval(timer);
  }, [isAuditing]);

  const startAudit = async () => {
    setIsAuditing(true);
    setProgress(0);
    setCurrentCrawlingUrl(url);
    await fetch('/api/audit/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, depth, maxPages })
    });
  };

  const fetchResults = async () => {
    const res = await fetch('/api/audit/results');
    const data = await res.json();
    setPages(data.pages);
    setStats(data.stats);
    
    // Trigger AI Insight if stats are available
    if (data.stats && data.pages.length > 0) {
      triggerAI(data.stats, data.pages);
    }
  };

  const triggerAI = async (currentStats: AuditStats, currentPages: SEOPage[]) => {
    setIsGeneratingAI(true);
    try {
      if (aiProvider === 'gemini') {
        const insight = await generateGeminiInsights(currentStats, currentPages);
        setAiInsight(insight);
      } else {
        const res = await fetch('/api/ai/insights', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            provider: aiProvider, 
            stats: currentStats, 
            pages: currentPages
          })
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        setAiInsight(data.insight);
      }
    } catch (e: any) {
      console.error("AI Insight failed", e);
      setAiInsight(`AI Generation failed: ${e.message || "Unknown error"}`);
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const handleExport = () => {
    const data = { stats, pages, timestamp: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `seo-audit-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadPDF = () => {
    if (!stats || pages.length === 0) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Header
    doc.setFontSize(22);
    doc.setTextColor(15, 23, 42); 
    doc.text('SEO Intelligence Report', 14, 22);
    
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(`Generated on ${new Date().toLocaleString()}`, 14, 30);
    doc.text(`Domain: ${url}`, 14, 35);
    
    // Executive Summary
    doc.setFontSize(16);
    doc.setTextColor(59, 130, 246);
    doc.text('Executive Summary', 14, 48);

    const avgScore = Math.round(pages.reduce((acc, p) => acc + p.score, 0) / pages.length);
    
    autoTable(doc, {
      startY: 55,
      head: [['KPI', 'Metric Value', 'Assessment']],
      body: [
        ['Total Audit Scope', `${pages.length} Pages`, 'Verified'],
        ['Critical Vulnerabilities', stats.criticalIssues.toString(), stats.criticalIssues > 0 ? 'URGENT' : 'SECURE'],
        ['SEO Health Index', `${avgScore}%`, avgScore > 80 ? 'EXCELLENT' : 'OPTIMIZATION NEEDED'],
        ['Performance Baseline', pages.some(p => p.performance) ? 'Authenticated' : 'Pending Sync'],
      ],
      headStyles: { fillColor: [15, 23, 42] },
    });

    // AI Strategic Insights
    if (aiInsight) {
      doc.addPage();
      doc.setFontSize(16);
      doc.setTextColor(59, 130, 246);
      doc.text('AI Strategic Roadmap', 14, 20);
      
      doc.setFontSize(10);
      doc.setTextColor(51, 65, 85);
      // Clean markdown slightly for simple text rendering
      const cleanInsight = aiInsight
        .replace(/###/g, '')
        .replace(/##/g, '')
        .replace(/#/g, '')
        .replace(/\*\*/g, '')
        .trim();
        
      const splitText = doc.splitTextToSize(cleanInsight, pageWidth - 28);
      doc.text(splitText, 14, 32);
    }

    // Detailed Page Audit
    doc.addPage();
    doc.setFontSize(16);
    doc.setTextColor(59, 130, 246);
    doc.text('Granular SEO Topography', 14, 20);

    autoTable(doc, {
      startY: 28,
      head: [['Pathname', 'Score', 'Performance', 'Issue Count']],
      body: pages.map(p => [
        p.url.replace(url, '') || '/',
        `${p.score}%`,
        p.performance?.performanceScore ? `${p.performance.performanceScore}%` : 'N/A',
        (p.issues?.length || 0).toString()
      ]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [59, 130, 246] },
      alternateRowStyles: { fillColor: [248, 250, 252] }
    });

    doc.save(`seo-intelligence-report-${new Date().getTime()}.pdf`);
  };

  const resetData = async () => {
    await fetch('/api/audit/reset', { method: 'POST' });
    setPages([]);
    setStats(null);
    setUrl('');
  };

  return (
    <div className="dashboard-grid">
      {/* Sidebar - Geometric Balance styling */}
      <aside className="bg-[#0f172a] text-white py-8 border-r border-[#e2e8f0] flex flex-col h-screen sticky top-0 overflow-y-auto custom-scrollbar">
        <div className="px-6 pb-10 flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-sm flex items-center justify-center font-black text-sm italic">S</div>
          <div className="font-black text-xl tracking-tighter">
            SEO<span className="text-[#3b82f6]">AGENT.</span>
          </div>
        </div>

        <div className="px-6 mb-8">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">Core Analysis</div>
          <nav className="flex flex-col gap-1">
            <button 
              onClick={() => setActiveTab('overview')}
              className={cn(
                "px-4 py-3 flex items-center gap-3 text-xs font-bold uppercase tracking-widest text-left transition-all rounded",
                activeTab === 'overview' ? "bg-blue-500 text-white shadow-lg shadow-blue-500/20" : "text-slate-400 hover:bg-white/5 hover:text-white"
              )}
            >
              <BarChart3 size={16} />
              Overview
            </button>
            <button 
              onClick={() => setActiveTab('pages')}
              className={cn(
                "px-4 py-3 flex items-center gap-3 text-xs font-bold uppercase tracking-widest text-left transition-all rounded",
                activeTab === 'pages' ? "bg-blue-500 text-white shadow-lg shadow-blue-500/20" : "text-slate-400 hover:bg-white/5 hover:text-white"
              )}
            >
              <Search size={16} />
              Crawler
            </button>
            <button 
              onClick={() => setActiveTab('ai')}
              className={cn(
                "px-4 py-3 flex items-center gap-3 text-xs font-bold uppercase tracking-widest text-left transition-all rounded",
                activeTab === 'ai' ? "bg-blue-500 text-white shadow-lg shadow-blue-500/20" : "text-slate-400 hover:bg-white/5 hover:text-white"
              )}
            >
              <Sparkles size={16} />
              AI Insights
            </button>
          </nav>
        </div>

        <div className="px-6 mb-8 pt-8 border-t border-white/5">
          <div className="flex items-center justify-between mb-4">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">AI Engine</div>
            <div className="px-1.5 py-0.5 bg-blue-500/10 text-blue-400 rounded text-[8px] font-black uppercase tracking-tighter border border-blue-500/20">
              {aiProvider} active
            </div>
          </div>
          <select 
            value={aiProvider}
            onChange={(e) => setAiProvider(e.target.value as any)}
            className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-[10px] font-bold text-white uppercase tracking-widest outline-none cursor-pointer hover:bg-white/10 transition-all mb-4"
          >
            <option value="gemini" className="bg-[#0f172a]">Gemini 2.0 Flash</option>
            <option value="openai" className="bg-[#0f172a]">OpenAI GPT-4o</option>
            <option value="anthropic" className="bg-[#0f172a]">Claude 3.5 Sonnet</option>
            <option value="deepseek" className="bg-[#0f172a]">DeepSeek V3</option>
            <option value="perplexity" className="bg-[#0f172a]">Perplexity Sonar</option>
            <option value="groq" className="bg-[#0f172a]">Groq (Llama 3.1)</option>
            <option value="huggingface" className="bg-[#0f172a]">Hugging Face</option>
          </select>
        </div>


        <div className="px-6 mb-8 pt-8 border-t border-white/5">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4 flex justify-between items-center">
            <span>Crawl Status</span>
            {isAuditing && <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />}
          </div>
          <div className="space-y-4">
            <div className="bg-white/5 p-3 rounded border border-white/5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-slate-400">Total Progress</span>
                <span className="text-[10px] font-black text-blue-400">{progress}%</span>
              </div>
              <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  className="h-full bg-blue-500"
                />
              </div>
            </div>
            
            {stats && (
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2 bg-slate-800/50 rounded text-center">
                  <div className="text-[8px] font-bold text-slate-500 uppercase tracking-tighter">Errors</div>
                  <div className={cn("text-xs font-black", stats.criticalIssues > 0 ? "text-rose-400" : "text-emerald-400")}>{stats.criticalIssues}</div>
                </div>
                <div className="p-2 bg-slate-800/50 rounded text-center">
                  <div className="text-[8px] font-bold text-slate-500 uppercase tracking-tighter">Healthy</div>
                  <div className="text-xs font-black text-blue-400">{pages.filter(p => p.score >= 90).length}</div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mt-auto px-6 py-6 border-t border-white/5">
           <div className="flex flex-col gap-4">
             <div className="flex items-center gap-3">
               <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-400">
                 <Globe size={14} />
               </div>
               <div>
                 <div className="text-[10px] font-black text-white">System Optimized</div>
                 <div className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">v2.4.0 Engine</div>
               </div>
             </div>
             
             <button 
               onClick={resetData}
               className="w-full flex items-center justify-center gap-2 py-2 border border-white/10 rounded text-slate-500 hover:text-rose-500 hover:border-rose-500 hover:bg-rose-500/5 transition-all text-[10px] font-bold uppercase tracking-widest"
             >
               <RefreshCw size={12} />
               Purge Diagnostics
             </button>
           </div>
        </div>
      </aside>

      {/* Main Panel */}
      <div className="flex flex-col h-screen overflow-hidden">
        {/* Header - Minimal Geometric Header */}
        <header className="h-16 bg-white border-b border-[#e2e8f0] flex items-center justify-between px-8 shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-[#64748b] text-[10px] font-bold uppercase tracking-[0.2em]">Target:</span>
            <div className="font-mono bg-slate-100 px-3 py-1 rounded text-xs text-[#1e293b] border border-slate-200">
              {url || 'https://domain.io'}
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {stats && (
              <>
                <button
                  onClick={handleExport}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider text-slate-600 hover:bg-slate-100 transition-colors border border-slate-200"
                >
                  <Download size={14} />
                  Export JSON
                </button>
                <div className="flex items-center gap-3 border-r border-slate-200 pr-4 h-8">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest leading-none">Share Audit:</span>
                  <ShareButtons url={url} title="Full Site Audit" />
                </div>
              </>
            )}
            {isAuditing && (
               <div className="flex flex-col items-end">
                 <div className="text-[10px] font-bold text-blue-600 animate-pulse uppercase tracking-tighter">
                   Crawling D{depth} (Lim {maxPages}) ... {progress}%
                 </div>
                 {currentCrawlingUrl && (
                   <div className="text-[8px] text-slate-400 font-mono truncate max-w-[150px]">
                     {currentCrawlingUrl}
                   </div>
                 )}
               </div>
            )}
            
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded p-0.5 px-2">
              <div className="flex items-center gap-1 border-r border-slate-200 pr-2 mr-1">
                <span className="text-[9px] font-bold text-slate-400 uppercase">Limit:</span>
                <input 
                  type="number" 
                  value={maxPages} 
                  onChange={(e) => setMaxPages(parseInt(e.target.value) || 1)}
                  className="w-14 bg-transparent text-[10px] font-bold outline-none"
                />
              </div>
              <div className="flex items-center gap-1 border-r border-slate-200 pr-2 mr-1">
                <span className="text-[9px] font-bold text-slate-400 uppercase">Depth:</span>
                <input 
                  type="number" 
                  value={depth} 
                  onChange={(e) => setDepth(parseInt(e.target.value) || 1)}
                  className="w-8 bg-transparent text-[10px] font-bold outline-none"
                />
              </div>
              <input 
                type="text" 
                placeholder="Audit URL..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="bg-transparent px-3 py-1 text-sm outline-none w-48 font-medium"
              />
              <button 
                onClick={startAudit}
                disabled={isAuditing || !url}
                className="bg-[#3b82f6] text-white px-4 py-1 rounded-sm font-bold text-xs uppercase tracking-wider hover:bg-blue-600 disabled:opacity-50 transition-all flex items-center gap-2 shadow-sm"
              >
                {isAuditing ? <RefreshCw className="animate-spin" size={12} /> : 'Audit'}
              </button>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto p-8">
          <AnimatePresence mode="wait">
            {activeTab === 'overview' && (
              <motion.div 
                key="overview"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="max-w-6xl mx-auto space-y-8"
              >
                {stats ? (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
                      <MetricCard label="Health Score" value={stats.averageScore} sub="/100" />
                      <MetricCard label="Pages Indexed" value={stats.totalPages} />
                      <MetricCard label="T2C Ratio" value={stats.totalPages > 0 ? (pages.reduce((acc, p) => acc + (p.textToCodeRatio || 0), 0) / stats.totalPages).toFixed(1) : 0} sub="avg %" />
                      <MetricCard label="Alt Health" value={stats.totalPages > 0 ? (pages.reduce((acc, p) => acc + (p.imageMetrics?.missingAltPercent || 0), 0) / stats.totalPages).toFixed(0) : 0} sub="% missing" />
                      <MetricCard label="Critical" value={stats.criticalIssues} isError={stats.criticalIssues > 0} />
                      <MetricCard label="Density" value={stats.totalPages > 0 ? (stats.totalLinks / stats.totalPages).toFixed(1) : 0} sub="links/p" />
                    </div>

                    {pages.some(p => !p.performance || !p.imageMetrics) && (
                      <div className="bg-amber-50 border border-amber-200 p-4 rounded flex items-center gap-3 text-amber-800 text-xs font-medium">
                        <AlertCircle size={16} />
                        Neural Data Sync required: Re-run the audit to populate performance indices and advanced image accessibility metrics.
                      </div>
                    )}

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                      <div className="lg:col-span-2 bg-white border border-[#e2e8f0] p-6 rounded shadow-sm">
                        <div className="flex justify-between items-center mb-8">
                           <h3 className="text-xs font-bold uppercase tracking-widest text-[#64748b]">Page Score Distribution</h3>
                           <div className="flex gap-2">
                              <span className="w-2 h-2 bg-blue-500 rounded-full" />
                              <span className="text-[10px] font-bold text-slate-400">SEO SCORE</span>
                           </div>
                        </div>
                        <div className="h-[300px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={pages}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                              <XAxis dataKey="url" hide />
                              <YAxis domain={[0, 100]} stroke="#94a3b8" fontSize={10} axisLine={false} tickLine={false} />
                              <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', borderRadius: '4px' }} />
                              <Bar dataKey="score" fill="#3b82f6" radius={[2, 2, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      <div className="lg:col-span-2 bg-white border border-[#e2e8f0] p-6 rounded shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 right-0">
                          <div className="bg-emerald-500 text-white text-[8px] font-black uppercase tracking-widest px-6 py-1 rotate-45 translate-x-4 translate-y-2 shadow-sm">
                            V2.0 Update
                          </div>
                        </div>
                        <div className="flex justify-between items-center mb-8 pr-12">
                           <h3 className="text-xs font-bold uppercase tracking-widest text-[#64748b]">Performance Index (Core Web Vitals)</h3>
                           <div className="flex gap-2">
                              <span className="w-2 h-2 bg-emerald-500 rounded-full" />
                              <span className="text-[10px] font-bold text-slate-400">PERFORMANCE SCORE</span>
                           </div>
                        </div>
                        <div className="h-[300px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={pages}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                              <XAxis dataKey="url" hide />
                              <YAxis domain={[0, 100]} stroke="#94a3b8" fontSize={10} axisLine={false} tickLine={false} />
                              <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', borderRadius: '4px' }} />
                              <Bar dataKey="performance.performanceScore" fill="#10b981" radius={[2, 2, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      <div className="lg:col-span-1 bg-white border border-[#e2e8f0] p-6 rounded shadow-sm">
                        <div className="flex justify-between items-center mb-8">
                           <h3 className="text-xs font-bold uppercase tracking-widest text-[#64748b]">Issue Severity</h3>
                           <div className="flex gap-2">
                              <span className="w-2 h-2 bg-rose-500 rounded-full" />
                              <span className="text-[10px] font-bold text-slate-400">DISTRIBUTION</span>
                           </div>
                        </div>
                        <div className="h-[300px]">
                          {chartData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie
                                  data={chartData}
                                  innerRadius={60}
                                  outerRadius={80}
                                  paddingAngle={5}
                                  dataKey="value"
                                >
                                  {chartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                  ))}
                                </Pie>
                                <Tooltip 
                                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                              </PieChart>
                            </ResponsiveContainer>
                          ) : (
                            <div className="h-full flex items-center justify-center text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50/50 rounded border border-dashed border-slate-200">
                              No data points found
                            </div>
                          )}
                        </div>
                        <div className="mt-4 space-y-2">
                          {chartData.map((d) => (
                            <div key={d.name} className="flex items-center justify-between text-[10px] font-black uppercase tracking-tighter">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                                <span className="text-slate-400">{d.name}</span>
                              </div>
                              <span className="text-slate-700">{d.value}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                        <div className="bg-[#f8fafc] border border-[#3b82f6] p-6 rounded relative overflow-hidden transition-all hover:shadow-lg">
                          <div className="flex justify-between items-center mb-4">
                            <div className="flex items-center gap-3">
                              <div className="text-[10px] font-black text-blue-600 uppercase tracking-widest">RAG Intelligence Roadmap</div>
                              <div className="px-2 py-0.5 bg-blue-100 text-[8px] font-black uppercase text-blue-600 rounded-full border border-blue-200">
                                Powered by {aiProvider}
                              </div>
                            </div>
                            {isGeneratingAI && (
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold text-blue-500 animate-pulse italic">Thinking...</span>
                                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" />
                              </div>
                            )}
                          </div>
                          
                          <div className="text-sm font-medium leading-relaxed text-slate-700 relative z-10">
                            {aiInsight ? (
                              <div className="markdown-body prose prose-sm prose-slate max-w-none">
                                <ReactMarkdown>{aiInsight}</ReactMarkdown>
                              </div>
                            ) : (
                              <p className="italic opacity-60">Complete audit to initiate neural analysis of SEO topography.</p>
                            )}
                          </div>
                          
                          <div className="mt-8 flex gap-4">
                            <button 
                              onClick={() => setActiveTab('pages')}
                              className="text-[10px] font-black uppercase text-blue-600 hover:underline tracking-widest"
                            >
                              Analyze Architecture &rarr;
                            </button>
                            <button 
                              onClick={handleExport}
                              className="text-[10px] font-black uppercase text-slate-400 hover:text-slate-900 tracking-widest flex items-center gap-1"
                            >
                              <Download size={10} /> Export Audit
                            </button>
                            <button 
                              onClick={handleDownloadPDF}
                              className="text-[10px] font-black uppercase text-blue-600 hover:text-blue-700 tracking-widest flex items-center gap-1"
                            >
                              <FileText size={10} /> Download SEO Report
                            </button>
                            <div className="flex items-center gap-2 border-l border-slate-200 pl-4 h-4">
                              <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Share Report:</span>
                              <ShareButtons url={url} title="Full Site Audit" />
                            </div>
                          </div>
                          <Sparkles className="absolute -right-4 -bottom-4 text-blue-500/10 w-32 h-32 rotate-12" />
                        </div>

                        <div className="bg-white border border-[#e2e8f0] p-6 rounded shadow-sm">
                          <h3 className="text-xs font-bold uppercase tracking-widest text-[#64748b] mb-6">Sitewide Assets</h3>
                          <div className="space-y-4">
                            <div className="flex items-center justify-between p-3 bg-slate-50 rounded border border-slate-100">
                              <div className="flex items-center gap-3">
                                <FileText size={16} className={stats.hasRobots ? "text-green-500" : "text-amber-500"} />
                                <span className="text-[11px] font-bold text-slate-700">robots.txt</span>
                              </div>
                              <span className={cn(
                                "text-[10px] font-black uppercase px-2 py-0.5 rounded-full",
                                stats.hasRobots ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                              )}>
                                {stats.hasRobots ? 'Detected' : 'Missing'}
                              </span>
                            </div>

                            <div className="flex items-center justify-between p-3 bg-slate-50 rounded border border-slate-100">
                              <div className="flex items-center gap-3">
                                <Globe size={16} className={stats.hasSitemap ? "text-green-500" : "text-amber-500"} />
                                <span className="text-[11px] font-bold text-slate-700">sitemap.xml</span>
                              </div>
                              <span className={cn(
                                "text-[10px] font-black uppercase px-2 py-0.5 rounded-full",
                                stats.hasSitemap ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                              )}>
                                {stats.hasSitemap ? 'Detected' : 'Missing'}
                              </span>
                            </div>

                            <div className="flex items-center justify-between p-3 bg-slate-50 rounded border border-slate-100">
                              <div className="flex items-center gap-3">
                                <CheckCircle2 size={16} className="text-blue-500" />
                                <span className="text-[11px] font-bold text-slate-700">Canonicalization</span>
                              </div>
                              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                                {pages.filter(p => p.canonical).length}/{pages.length} Pages
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="bg-white border border-[#e2e8f0] p-6 rounded shadow-sm">
                           <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-6">Technical Health Distribution</div>
                           <div className="h-[220px]">
                             {stats && (stats.criticalIssues > 0 || stats.warningIssues > 0 || pages.some(p => p.score >= 90)) ? (
                               <ResponsiveContainer width="100%" height="100%">
                                 <PieChart>
                                   <Pie
                                     data={[
                                       { name: 'Critical', value: stats.criticalIssues },
                                       { name: 'Warning', value: stats.warningIssues },
                                       { name: 'Optimized', value: pages.filter(p => p.score >= 90).length }
                                     ].filter(d => d.value > 0)}
                                     innerRadius={55}
                                     outerRadius={75}
                                     paddingAngle={4}
                                     dataKey="value"
                                     stroke="none"
                                   >
                                     <Cell fill="#ef4444" />
                                     <Cell fill="#f59e0b" />
                                     <Cell fill="#10b981" />
                                   </Pie>
                                   <Tooltip
                                     contentStyle={{ 
                                       border: 'none', 
                                       borderRadius: '8px', 
                                       boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                                       fontSize: '10px',
                                       fontWeight: 'bold'
                                     }}
                                   />
                                   <Legend 
                                     verticalAlign="bottom" 
                                     height={36}
                                     iconType="circle"
                                     formatter={(value) => <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">{value}</span>}
                                   />
                                 </PieChart>
                               </ResponsiveContainer>
                             ) : (
                               <div className="h-full flex items-center justify-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                 Awaiting health metrics...
                               </div>
                             )}
                           </div>
                        </div>
                      </div>
                   </>
                ) : (
                  <div className="flex flex-col items-center justify-center py-32 space-y-4">
                    <div className="w-16 h-16 bg-white border border-slate-200 rounded-2xl flex items-center justify-center text-slate-300">
                      <Layout size={32} strokeWidth={1} />
                    </div>
                    <div className="text-center">
                      <h3 className="font-bold text-slate-900">No telemetry data</h3>
                      <p className="text-sm text-slate-400">Initialize an audit to generate the site graph</p>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'pages' && (
              <motion.div 
                key="pages"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-white border border-[#e2e8f0] rounded shadow-sm overflow-hidden"
              >
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                  <div className="flex items-center gap-6">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-slate-900">Node Matrix — {pages.length} Pages</h3>
                    {compareUrls.length > 0 && (
                      <div className="flex items-center gap-3 animate-in fade-in slide-in-from-left-2 transition-all">
                        <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded uppercase">{compareUrls.length} Selected</span>
                        {compareUrls.length === 2 && (
                          <button 
                            className="text-[10px] font-black uppercase bg-blue-600 text-white px-3 py-1 rounded shadow-sm hover:bg-blue-700"
                            onClick={() => setIsComparing(true)}
                          >
                            Execute Comparison
                          </button>
                        )}
                        <button 
                          className="text-[10px] font-black uppercase text-slate-400 hover:text-slate-600"
                          onClick={() => setCompareUrls([])}
                        >
                          Clear
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 bg-white border border-slate-200 rounded px-3 py-1.5 focus-within:border-blue-500 transition-colors">
                    <Search size={14} className="text-slate-400" />
                    <input 
                      type="text" 
                      placeholder="Filter by URL or status..." 
                      className="text-[11px] font-medium outline-none w-48"
                      value={pageSearch}
                      onChange={(e) => setPageSearch(e.target.value)}
                    />
                  </div>
                </div>
                <div 
                  id="top-scrollbar"
                  className="overflow-x-auto custom-scrollbar h-3 bg-slate-50 border-b border-slate-100" 
                  onScroll={(e) => {
                    const tableContainer = document.getElementById('audit-table-container');
                    if (tableContainer) tableContainer.scrollLeft = e.currentTarget.scrollLeft;
                  }}
                >
                  <div style={{ width: '1200px' }} className="h-[1px]" />
                </div>

                <div 
                  id="audit-table-container"
                  className="max-h-[750px] overflow-auto custom-scrollbar"
                  onScroll={(e) => {
                    const topScroll = document.getElementById('top-scrollbar');
                    if (topScroll) topScroll.scrollLeft = e.currentTarget.scrollLeft;
                  }}
                >
                  <table className="w-full text-left border-collapse min-w-[1200px]">
                    <thead className="bg-[#f8fafc] text-xs font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap sticky top-0 z-10">
                      <tr>
                        <th className="px-4 py-4 border-b border-[#e2e8f0] w-12 text-center bg-[#f8fafc]">Compare</th>
                        <th className="px-8 py-4 border-b border-[#e2e8f0] bg-[#f8fafc]">Endpoint</th>
                        <th className="px-6 py-4 border-b border-[#e2e8f0] bg-[#f8fafc]">Health Index</th>
                        <th className="px-6 py-4 border-b border-[#e2e8f0] bg-[#f8fafc]">T2C Ratio</th>
                        <th className="px-6 py-4 border-b border-[#e2e8f0] bg-[#f8fafc]">Image Health</th>
                        <th className="px-6 py-4 border-b border-[#e2e8f0] bg-[#f8fafc]">Detections</th>
                        <th className="px-6 py-4 border-b border-[#e2e8f0] bg-[#f8fafc] text-center">Share</th>
                        <th className="px-6 py-4 border-b border-[#e2e8f0] text-right min-w-[160px] pr-10 bg-[#f8fafc]">Utility</th>
                      </tr>
                    </thead>
                    <tbody>
                    {paginatedPages.map((page, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 transition-colors group">
                        <td className="px-4 py-5 border-b border-slate-100 text-center">
                          <input 
                            type="checkbox"
                            checked={compareUrls.includes(page.url)}
                            onChange={() => toggleCompare(page.url)}
                            disabled={!compareUrls.includes(page.url) && compareUrls.length >= 2}
                            className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-8 py-5 border-b border-slate-100">
                          <p className="font-mono text-xs text-slate-900 break-all">{page.url}</p>
                          <p className="text-[10px] text-slate-400 mt-1 uppercase font-bold">{page.title.substring(0, 50)}</p>
                        </td>
                        <td className="px-6 py-5 border-b border-slate-100">
                          <div className={cn(
                            "inline-block px-3 py-1 rounded-sm text-xs font-black",
                            page.score >= 80 ? "bg-emerald-100 text-emerald-800" :
                            page.score >= 50 ? "bg-amber-100 text-amber-800" :
                            "bg-rose-100 text-rose-800"
                          )}>
                            {page.score}
                          </div>
                        </td>
                        <td className="px-6 py-5 border-b border-slate-100 whitespace-nowrap">
                          <div className="text-[10px] font-bold text-slate-700">{page.textToCodeRatio}%</div>
                        </td>
                        <td className="px-6 py-5 border-b border-slate-100 whitespace-nowrap min-w-[120px]">
                          {page.imageMetrics ? (
                            <div className="flex flex-col">
                              <div className="text-[10px] font-bold text-slate-700">
                                {page.imageMetrics.total} img
                              </div>
                              <div className={cn(
                                "text-[9px] font-black uppercase",
                                page.imageMetrics.missingAltPercent === 0 ? "text-emerald-600" :
                                page.imageMetrics.missingAltPercent < 20 ? "text-amber-600" :
                                "text-rose-600"
                              )}>
                                {page.imageMetrics.missingAltPercent}% No Alt
                              </div>
                            </div>
                          ) : (
                            <span className="text-[10px] text-slate-300 italic">N/A</span>
                          )}
                        </td>
                        <td className="px-6 py-5 border-b border-slate-100 whitespace-nowrap">
                           <div className="flex gap-2">
                             {page.issues.filter(i => i.type === 'critical').length > 0 && (
                               <span className="text-[9px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-100 uppercase">Critical</span>
                             )}
                             {page.issues.filter(i => i.type === 'warning').length > 0 && (
                               <span className="text-[9px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100 uppercase">Warning</span>
                             )}
                           </div>
                        </td>
                        <td className="px-6 py-5 border-b border-slate-100 whitespace-nowrap">
                          <ShareButtons url={page.url} title={page.title} />
                        </td>
                        <td className="px-6 py-5 border-b border-slate-100 text-right whitespace-nowrap min-w-[160px] pr-10">
                          <button 
                            onClick={() => setSelectedPage(page)}
                            className="text-[10px] font-black uppercase text-blue-600 hover:underline tracking-widest flex items-center justify-end gap-2 ml-auto"
                          >
                            Trace <ChevronRight size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
                
                {/* Pagination Controls */}
                <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row justify-between items-center gap-4">
                  <div className="flex items-center gap-4">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none">
                      Showing {filteredPages.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}-{Math.min(currentPage * pageSize, filteredPages.length)} of {filteredPages.length} Records
                    </span>
                    <select 
                      value={pageSize}
                      onChange={(e) => {
                        setPageSize(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                      className="bg-white border border-slate-200 rounded px-2 py-1 text-[9px] font-black text-slate-600 outline-none focus:border-blue-500 uppercase tracking-widest cursor-pointer"
                    >
                      {[10, 25, 50, 100].map(size => (
                        <option key={size} value={size}>{size} / Frame</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="flex items-center gap-1.5">
                    <button 
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="p-1.5 px-3 bg-white border border-slate-200 rounded text-[9px] font-black text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed uppercase tracking-widest transition-colors flex items-center gap-1"
                    >
                      <ChevronLeft size={12} /> Prev
                    </button>
                    
                    <div className="flex items-center gap-1">
                      {totalPages > 0 && Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum = 1;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }
                        
                        return (
                          <button
                            key={pageNum}
                            onClick={() => setCurrentPage(pageNum)}
                            className={cn(
                              "w-8 h-8 rounded text-[10px] font-black transition-all flex items-center justify-center",
                              currentPage === pageNum 
                                ? "bg-blue-600 text-white shadow-sm" 
                                : "bg-white text-slate-500 hover:bg-slate-50 border border-slate-200"
                            )}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                    </div>
                    
                    <button 
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages || totalPages === 0}
                      className="p-1.5 px-3 bg-white border border-slate-200 rounded text-[9px] font-black text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed uppercase tracking-widest transition-colors flex items-center gap-1"
                    >
                      Next <ChevronRight size={12} />
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'ai' && <AIAssistant pages={pages} aiProvider={aiProvider} setAiProvider={setAiProvider} />}
          </AnimatePresence>
        </main>
      </div>

      {/* Page Detail Panel - Geometric Design */}
      <AnimatePresence>
        {selectedPage && (
          <div className="fixed inset-0 z-[100] flex justify-end">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedPage(null)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" 
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'tween', duration: 0.3 }}
              className="relative w-full max-w-xl bg-white h-full shadow-2xl p-10 overflow-y-auto border-l border-slate-200"
            >
              <div className="mb-12 flex justify-between items-start">
                <div>
                  <div className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-4">Inspection Report</div>
                  <h2 className="text-2xl font-bold tracking-tight text-slate-900 mb-2 leading-tight">{selectedPage.title}</h2>
                  <p className="font-mono text-xs text-slate-400 break-all">{selectedPage.url}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Share Page</span>
                  <ShareButtons url={selectedPage.url} title={selectedPage.title} />
                </div>
              </div>

                <div className="grid grid-cols-3 gap-4 mb-12">
                  <div className="p-4 bg-slate-50 border border-slate-100 rounded">
                    <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Health</div>
                    <div className="text-2xl font-black text-slate-900">{selectedPage.score}%</div>
                  </div>
                  <div className="p-4 bg-slate-50 border border-slate-100 rounded">
                    <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Latency</div>
                    <div className="text-2xl font-black text-slate-900">{selectedPage.loadTime}ms</div>
                  </div>
                  <div className="p-4 bg-slate-50 border border-slate-100 rounded">
                    <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Text/Code</div>
                    <div className="text-2xl font-black text-slate-900">{selectedPage.textToCodeRatio}%</div>
                  </div>
                </div>
              
              <div className="space-y-12">
                {selectedPage.performance && (
                  <section>
                    <h4 className="text-[11px] font-bold uppercase tracking-widest text-slate-900 mb-6 border-b border-slate-100 pb-2 flex justify-between items-center">
                      <span>Performance Signals</span>
                      <span className={cn(
                        "px-2 py-0.5 rounded text-[9px] font-black uppercase",
                        selectedPage.performance.performanceScore >= 90 ? "bg-green-100 text-green-700" :
                        selectedPage.performance.performanceScore >= 50 ? "bg-amber-100 text-amber-700" :
                        "bg-rose-100 text-rose-700"
                      )}>
                        {selectedPage.performance.performanceScore} PS Score
                      </span>
                    </h4>
                    <div className="grid grid-cols-2 gap-y-6 gap-x-8">
                      <SpeedMetric 
                        label="FCP" 
                        value={`${selectedPage.performance.fcp}s`} 
                        sub="First Contentful Paint" 
                        status={selectedPage.performance.fcp <= 1.8 ? 'good' : 'warning'} 
                      />
                      <SpeedMetric 
                        label="LCP" 
                        value={`${selectedPage.performance.lcp}s`} 
                        sub="Largest Contentful Paint" 
                        status={selectedPage.performance.lcp <= 2.5 ? 'good' : 'warning'} 
                      />
                      <SpeedMetric 
                        label="CLS" 
                        value={selectedPage.performance.cls.toString()} 
                        sub="Cumulative Layout Shift" 
                        status={selectedPage.performance.cls <= 0.1 ? 'good' : 'warning'} 
                      />
                      <SpeedMetric 
                        label="TBT" 
                        value={`${selectedPage.performance.tbt}ms`} 
                        sub="Total Blocking Time" 
                        status={selectedPage.performance.tbt <= 200 ? 'good' : 'warning'} 
                      />
                    </div>
                  </section>
                )}

                <section>
                   <h4 className="text-[11px] font-bold uppercase tracking-widest text-slate-900 mb-6 border-b border-slate-100 pb-2">Technical Issues</h4>
                   <div className="space-y-3">
                    {selectedPage.issues.map((issue, i) => (
                      <div key={i} className={cn(
                        "p-4 rounded-sm border flex gap-4",
                        issue.type === 'critical' ? "bg-rose-50 border-rose-100" : 
                        issue.type === 'warning' ? "bg-amber-50 border-amber-100" :
                        "bg-blue-50 border-blue-100"
                      )}>
                        <div className={cn(
                          "w-1.5 h-auto rounded-full shrink-0",
                          issue.type === 'critical' ? "bg-rose-600" : 
                          issue.type === 'warning' ? "bg-amber-600" :
                          "bg-blue-600"
                        )} />
                        <div>
                          <p className="font-bold text-xs text-slate-900 mb-1">{issue.message}</p>
                          <p className="text-[9px] font-bold uppercase text-slate-400 tracking-tighter">{issue.category}</p>
                        </div>
                      </div>
                    ))}
                    {selectedPage.issues.length === 0 && <p className="text-sm text-slate-400 italic">No critical issues identified.</p>}
                  </div>
                </section>

                <section>
                  <h4 className="text-[11px] font-bold uppercase tracking-widest text-slate-900 mb-6 border-b border-slate-100 pb-2">Page Structure</h4>
                  <div className="space-y-6">
                    <div className="space-y-2">
                       <span className="text-[9px] font-bold text-slate-400 uppercase">Title Element</span>
                       <p className="text-sm text-slate-900 leading-relaxed font-medium">{selectedPage.title || 'NULL'}</p>
                    </div>
                    <div className="space-y-2">
                       <span className="text-[9px] font-bold text-slate-400 uppercase">Meta Description</span>
                       <p className="text-sm text-slate-600 leading-relaxed italic border-l-2 border-slate-100 pl-4">"{selectedPage.description || 'No description found.'}"</p>
                    </div>
                  </div>
                </section>

                <section>
                  <h4 className="text-[11px] font-bold uppercase tracking-widest text-slate-900 mb-6 border-b border-slate-100 pb-2 flex justify-between items-center">
                    <span>Visual Assets & Accessibility</span>
                    {selectedPage.imageMetrics && (
                      <span className="text-[10px] font-black text-slate-400">
                        {selectedPage.imageMetrics.total} IMAGES
                      </span>
                    )}
                  </h4>
                  {selectedPage.imageMetrics && (
                    <div className="grid grid-cols-4 gap-2 mb-6">
                      <div className="p-3 bg-slate-50 border border-slate-100 rounded text-center">
                        <div className="text-[8px] font-black text-slate-400 uppercase mb-1">Total</div>
                        <div className="text-sm font-black text-slate-900">{selectedPage.imageMetrics.total}</div>
                      </div>
                      <div className="p-3 bg-slate-50 border border-slate-100 rounded text-center">
                        <div className="text-[8px] font-black text-slate-400 uppercase mb-1">Missing Alt</div>
                        <div className={cn("text-sm font-black", selectedPage.imageMetrics.missingAlt > 0 ? "text-rose-600" : "text-emerald-600")}>
                          {selectedPage.imageMetrics.missingAlt}
                        </div>
                      </div>
                      <div className="p-3 bg-slate-50 border border-slate-100 rounded text-center">
                        <div className="text-[8px] font-black text-slate-400 uppercase mb-1">% Missing</div>
                        <div className={cn("text-sm font-black", selectedPage.imageMetrics.missingAltPercent > 20 ? "text-rose-600" : "text-emerald-600")}>
                          {selectedPage.imageMetrics.missingAltPercent}%
                        </div>
                      </div>
                      <div className="p-3 bg-slate-50 border border-slate-100 rounded text-center">
                        <div className="text-[8px] font-black text-slate-400 uppercase mb-1">Generic Alt</div>
                        <div className={cn("text-sm font-black", selectedPage.imageMetrics.genericAlt > 0 ? "text-amber-600" : "text-slate-900")}>
                          {selectedPage.imageMetrics.genericAlt}
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="space-y-3 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
                    {selectedPage.images.map((img, i) => (
                      <div key={i} className="flex gap-4 p-3 bg-slate-50 border border-slate-100 rounded group hover:border-blue-200 transition-colors">
                        <div className="w-16 h-16 bg-slate-200 rounded overflow-hidden shrink-0 flex items-center justify-center border border-slate-100">
                          {img.src ? (
                            <img src={img.src} alt={img.alt} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            <Layout className="text-slate-400" size={16} />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className={cn(
                              "text-[8px] font-black uppercase px-1.5 py-0.5 rounded",
                              img.altQuality === 'good' ? "bg-emerald-100 text-emerald-700" :
                              img.altQuality === 'generic' ? "bg-amber-100 text-amber-700" :
                              "bg-rose-100 text-rose-700"
                            )}>
                              {img.altQuality} Quality
                            </span>
                            <div className="text-[8px] font-mono text-slate-400 truncate max-w-[150px] opacity-0 group-hover:opacity-100 transition-opacity">
                              {img.src.split('/').pop()}
                            </div>
                          </div>
                          <p className={cn(
                            "text-xs font-medium leading-normal",
                            img.altQuality === 'missing' ? "text-slate-300 italic" : "text-slate-700"
                          )}>
                            {img.alt || "No alternative text provided"}
                          </p>
                          {img.altQuality === 'generic' && (
                            <p className="text-[9px] text-amber-600 font-bold mt-1 uppercase tracking-tighter">Improvement suggested: Make alt more descriptive</p>
                          )}
                        </div>
                      </div>
                    ))}
                    {selectedPage.images.length === 0 && (
                      <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-100 rounded">
                        <Layout className="text-slate-200 mb-2" size={24} />
                        <p className="text-xs text-slate-400 font-medium tracking-tight">No images found on this page</p>
                      </div>
                    )}
                  </div>
                </section>

                <section>
                  <h4 className="text-[11px] font-bold uppercase tracking-widest text-slate-900 mb-6 border-b border-slate-100 pb-2">Link Topography</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-blue-50/50 border border-blue-100 rounded">
                       <div className="text-[9px] font-bold text-blue-600 uppercase tracking-widest mb-1">Internal Nodes</div>
                       <div className="text-xl font-black text-blue-900">{selectedPage.links.internal.length}</div>
                    </div>
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded">
                       <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">External Exit Points</div>
                       <div className="text-xl font-black text-slate-900">{selectedPage.links.external.length}</div>
                    </div>
                  </div>
                  <div className="mt-4 max-h-40 overflow-y-auto border border-slate-100 rounded p-2 text-[10px] font-mono text-slate-500 bg-slate-50">
                     {selectedPage.links.external.slice(0, 10).map((l, i) => <div key={i} className="truncate">{l}</div>)}
                     {selectedPage.links.external.length > 10 && <div>+ {selectedPage.links.external.length - 10} more external links</div>}
                  </div>
                </section>

                <section>
                  <h4 className="text-[11px] font-bold uppercase tracking-widest text-slate-900 mb-6 border-b border-slate-100 pb-2">Header Hierarchy</h4>
                  <div className="space-y-4">
                    {['h1', 'h2', 'h3'].map((tag) => (
                      <div key={tag}>
                        <div className="text-[9px] font-black text-slate-400 uppercase mb-2">{tag.toUpperCase()} Tags ({selectedPage.headers[tag as keyof typeof selectedPage.headers].length})</div>
                        <div className="space-y-1">
                          {selectedPage.headers[tag as keyof typeof selectedPage.headers].map((h, i) => (
                            <div key={i} className="text-xs text-slate-700 bg-slate-50 px-3 py-1.5 border-l-2 border-slate-200">
                              {h}
                            </div>
                          ))}
                          {selectedPage.headers[tag as keyof typeof selectedPage.headers].length === 0 && <span className="text-[10px] text-slate-300 italic">None detected</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                <section>
                  <h4 className="text-[11px] font-bold uppercase tracking-widest text-slate-900 mb-6 border-b border-slate-100 pb-2">Page Archetype & Keywords</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedPage.keywords.map((kw, i) => (
                      <span key={i} className="px-2 py-1 bg-slate-100 text-slate-600 text-[10px] font-bold uppercase rounded border border-slate-200">
                        {kw}
                      </span>
                    ))}
                    {selectedPage.keywords.length === 0 && <span className="text-[10px] text-slate-300 italic">No keywords detected</span>}
                  </div>
                </section>

                <section>
                  <h4 className="text-[11px] font-bold uppercase tracking-widest text-slate-900 mb-6 border-b border-slate-100 pb-2 flex justify-between items-center">
                    <span>SERP & Social Simulation</span>
                    <div className="flex gap-2">
                      <Search size={12} className="text-slate-400" />
                      <Twitter size={12} className="text-slate-400" />
                      <Facebook size={12} className="text-slate-400" />
                    </div>
                  </h4>
                  <div className="space-y-8">
                    {/* Google Search Mock */}
                    <div className="max-w-md">
                      <div className="text-[11px] text-slate-500 mb-1 flex items-center gap-1">
                        {selectedPage.url.replace('https://', '')} <ChevronRight size={8} />
                      </div>
                      <div className="text-blue-700 text-lg hover:underline cursor-pointer font-medium mb-1 truncate">
                        {selectedPage.title}
                      </div>
                      <div className="text-sm text-slate-700 line-clamp-2 leading-relaxed">
                        {selectedPage.description || "The description of this page is missing. Search engines will automatically generate a snippet from the page content."}
                      </div>
                    </div>

                    {/* Social Card Mock */}
                    <div className="border border-slate-200 rounded-xl overflow-hidden max-w-sm shadow-sm">
                      <div className={cn("aspect-[1.91/1] bg-slate-100 flex items-center justify-center relative", !selectedPage.ogTags['og:image'] && "bg-slate-200")}>
                        {selectedPage.ogTags['og:image'] ? (
                          <img src={selectedPage.ogTags['og:image']} alt="Social card" className="object-cover w-full h-full" />
                        ) : (
                          <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">OG IMAGE MISSING</div>
                        )}
                        <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/50 backdrop-blur-md rounded text-[8px] text-white font-bold uppercase tracking-widest">
                          {selectedPage.url.startsWith('http') ? new URL(selectedPage.url).hostname : 'PAGE'}
                        </div>
                      </div>
                      <div className="p-4 bg-slate-50 border-t border-slate-200">
                        <div className="text-[10px] text-slate-400 uppercase font-black tracking-tighter mb-1 truncate uppercase">
                          {selectedPage.ogTags['og:site_name'] || (selectedPage.url.startsWith('http') ? new URL(selectedPage.url).hostname : 'Domain')}
                        </div>
                        <div className="font-bold text-sm text-slate-900 mb-1 truncate">{selectedPage.ogTags['og:title'] || selectedPage.title}</div>
                        <div className="text-xs text-slate-600 line-clamp-2 leading-snug">{selectedPage.ogTags['og:description'] || selectedPage.description}</div>
                      </div>
                    </div>
                  </div>
                </section>

                <section>
                  <h4 className="text-[11px] font-bold uppercase tracking-widest text-slate-900 mb-6 border-b border-slate-100 pb-2">Structured Data (Schema.org)</h4>
                  <div className="space-y-4">
                    {selectedPage.structuredData && selectedPage.structuredData.length > 0 ? (
                      selectedPage.structuredData.map((sd, i) => (
                        <div key={i} className="bg-slate-50 border border-slate-200 rounded p-4 font-mono text-[10px] overflow-hidden">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-bold text-blue-600 uppercase tracking-tighter">@{sd['@type'] || 'Unknown Type'}</span>
                            <span className="text-slate-400">Context: {sd['@context']}</span>
                          </div>
                          <div className="max-h-32 overflow-y-auto whitespace-pre-wrap text-slate-700">
                            {JSON.stringify(sd, null, 2)}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-100 rounded">
                        <Sparkles className="text-slate-200 mb-2" size={24} />
                        <p className="text-xs text-slate-400 font-medium tracking-tight">No semantic markup detected</p>
                      </div>
                    )}
                  </div>
                </section>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Comparison Modal */}
      <AnimatePresence>
        {isComparing && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 md:p-12">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsComparing(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" 
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-5xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <div className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Head-to-Head Comparison</div>
                <button onClick={() => setIsComparing(false)} className="text-slate-400 hover:text-slate-600 pb-1 text-xl">&times;</button>
              </div>
              <div className="overflow-y-auto p-8">
                <div className="grid grid-cols-3 gap-12">
                   <div className="space-y-12">
                      <div className="h-20" />
                      <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest h-8 flex items-center">SEO Score</div>
                      <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest h-8 flex items-center">Perf. Index</div>
                      <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest h-8 flex items-center">Load Time</div>
                      <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest h-8 flex items-center">Word Count</div>
                      <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest h-8 flex items-center">Critical Issues</div>
                      <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest h-8 flex items-center">LCP</div>
                      <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest h-8 flex items-center">Text/Code</div>
                      <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest h-8 flex items-center">Alt Health</div>
                   </div>

                   {compareUrls.map(url => pages.find(p => p.url === url)).map((page, i) => page && (
                     <div key={i} className="space-y-12">
                        <div className="h-20">
                          <p className="font-mono text-[10px] text-slate-400 truncate mb-1">{page.url}</p>
                          <h4 className="font-bold text-slate-900 line-clamp-2 leading-tight">{page.title}</h4>
                        </div>
                        <div className={cn("text-2xl font-black h-8 flex items-center", page.score === Math.max(...compareUrls.map(u => pages.find(p => p.url === u)?.score || 0)) ? "text-emerald-600" : "text-slate-900")}>{page.score}</div>
                        <div className={cn("text-2xl font-black h-8 flex items-center", page.performance.performanceScore === Math.max(...compareUrls.map(u => pages.find(p => p.url === u)?.performance.performanceScore || 0)) ? "text-emerald-600" : "text-slate-900")}>{page.performance.performanceScore}</div>
                        <div className={cn("text-xl font-bold h-8 flex items-center", page.loadTime === Math.min(...compareUrls.map(u => pages.find(p => p.url === u)?.loadTime || 0)) ? "text-emerald-600" : "text-slate-700")}>{page.loadTime}ms</div>
                        <div className={cn("text-xl font-bold h-8 flex items-center", page.wordCount === Math.max(...compareUrls.map(u => pages.find(p => p.url === u)?.wordCount || 0)) ? "text-emerald-600" : "text-slate-700")}>{page.wordCount}</div>
                        <div className={cn("text-xl font-bold h-8 flex items-center", page.issues.filter(it => it.type === 'critical').length === Math.min(...compareUrls.map(u => pages.find(p => p.url === u)?.issues.filter(it => it.type === 'critical').length || 0)) ? "text-emerald-600" : "text-rose-600")}>{page.issues.filter(it => it.type === 'critical').length}</div>
                        <div className={cn("text-xl font-bold h-8 flex items-center", page.performance.lcp === Math.min(...compareUrls.map(u => pages.find(p => p.url === u)?.performance.lcp || 0)) ? "text-emerald-600" : "text-slate-700")}>{page.performance.lcp}s</div>
                        <div className={cn("text-xl font-bold h-8 flex items-center", page.textToCodeRatio === Math.max(...compareUrls.map(u => pages.find(p => p.url === u)?.textToCodeRatio || 0)) ? "text-emerald-600" : "text-slate-700")}>{page.textToCodeRatio}%</div>
                        <div className={cn("text-xl font-bold h-8 flex items-center", (page.imageMetrics?.missingAltPercent || 0) === Math.min(...compareUrls.map(u => pages.find(p => p.url === u)?.imageMetrics?.missingAltPercent || 0)) ? "text-emerald-600" : "text-slate-700")}>
                          {page.imageMetrics ? `${100 - page.imageMetrics.missingAltPercent}%` : 'N/A'}
                        </div>
                     </div>
                   ))}
                </div>
              </div>
              <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-center">
                <button 
                  onClick={() => setIsComparing(false)}
                  className="bg-slate-900 text-white px-8 py-3 rounded-full font-bold text-xs uppercase tracking-widest hover:bg-slate-800 transition-all"
                >
                  Exit Comparison
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ShareButtons({ url, title, className }: { url: string, title: string, className?: string }) {
  const shareText = `SEO Audit for ${title}`;
  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(shareText);

  const shares = [
    { 
      name: 'Twitter', 
      icon: <Twitter size={16} />, 
      url: `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`,
      color: 'text-sky-500 hover:text-sky-600 hover:bg-sky-50'
    },
    { 
      name: 'Facebook', 
      icon: <Facebook size={16} />, 
      url: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      color: 'text-blue-600 hover:text-blue-700 hover:bg-blue-50'
    },
    { 
      name: 'LinkedIn', 
      icon: <Linkedin size={16} />, 
      url: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
      color: 'text-blue-700 hover:text-blue-800 hover:bg-blue-50'
    }
  ];

  return (
    <div className={cn("flex items-center gap-1.5 opacity-100", className)}>
      {shares.map(s => (
        <a 
          key={s.name}
          href={s.url}
          target="_blank"
          rel="noopener noreferrer"
          className={cn("transition-all p-1.5 rounded-full border border-slate-100 hover:border-slate-300 flex items-center justify-center bg-white shadow-sm", s.color)}
          title={`Share on ${s.name}`}
          onClick={(e) => e.stopPropagation()}
        >
          {s.icon}
        </a>
      ))}
    </div>
  );
}

function SpeedMetric({ label, value, sub, status }: { label: string, value: string, sub: string, status: 'good' | 'warning' }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">{label}</span>
        <div className={cn(
          "w-2 h-2 rounded-full",
          status === 'good' ? "bg-emerald-500" : "bg-amber-500"
        )} />
      </div>
      <div className="text-base font-black text-slate-900">{value}</div>
      <div className="text-[9px] font-bold text-slate-400 uppercase leading-none tracking-tight">{sub}</div>
    </div>
  );
}

function MetricCard({ label, value, sub, isError }: { label: string, value: string | number, sub?: string, isError?: boolean }) {
  return (
    <div className="bg-white p-6 border border-[#e2e8f0] rounded shadow-sm hover:shadow-md transition-shadow">
      <div className="text-[10px] font-bold text-[#64748b] uppercase tracking-widest mb-3">{label}</div>
      <div className={cn("text-3xl font-black tracking-tight", isError ? "text-rose-600" : "text-[#0f172a]")}>
        {value}
        {sub && <span className="text-xs font-medium text-slate-400 ml-1">{sub}</span>}
      </div>
    </div>
  );
}

function AIAssistant({ pages, aiProvider, setAiProvider }: { 
  pages: SEOPage[], 
  aiProvider: 'gemini' | 'openai' | 'anthropic' | 'groq' | 'huggingface' | 'deepseek' | 'perplexity', 
  setAiProvider: (p: 'gemini' | 'openai' | 'anthropic' | 'groq' | 'huggingface' | 'deepseek' | 'perplexity') => void
}) {
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const askAI = async () => {
    if (!query) return;
    setLoading(true);
    try {
      if (aiProvider === 'gemini') {
        const response = await chatWithGemini(query, pages);
        setResponse(response);
      } else {
        const res = await fetch('/api/ai/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            provider: aiProvider, 
            query, 
            pages
          })
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        setResponse(data.response);
      }
    } catch (e: any) {
      setResponse(`System Error: ${e.message || "Neural pathways interrupted."}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto pt-10 space-y-12">
      <div className="text-center space-y-3">
        <div className="flex items-center justify-center gap-2 mb-2">
          <div className="text-[10px] font-black text-blue-600 uppercase tracking-[0.3em]">Neural Interface</div>
          <div className="h-px w-8 bg-blue-100" />
          <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest border border-slate-200 px-2 py-0.5 rounded-full bg-slate-50 capitalize">
            {aiProvider}
          </div>
        </div>
        <h2 className="text-3xl font-black text-slate-900 tracking-tight">Query Intelligence</h2>
        <p className="text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
          Access the RAG-powered knowledge base to extract strategic optimizations and performance insights.
        </p>
      </div>

      <div className="bg-white border border-[#e2e8f0] p-10 rounded shadow-xl space-y-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 flex gap-2">
           <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-full shadow-sm">
             <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
             <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
               Active: {aiProvider.charAt(0).toUpperCase() + aiProvider.slice(1)}
             </span>
           </div>
        </div>

        <div className="flex flex-col gap-4">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Consult the RAG Engine</label>
          <input 
            type="text" 
            placeholder="Ask about site performance, keyword density, or accessibility gaps..."
            className="bg-slate-50 border border-slate-200 rounded px-6 py-5 text-sm font-medium focus:border-blue-500 outline-none transition-all placeholder:opacity-50"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && askAI()}
          />
          <div className="flex gap-4">
            <button 
              onClick={askAI}
              className="flex-1 bg-[#0f172a] text-white px-8 py-4 rounded font-bold text-xs uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center justify-center gap-3 shadow-lg shadow-slate-900/10"
            >
              {loading ? <RefreshCw className="animate-spin" size={14} /> : <Sparkles size={14} />}
              {loading ? `Synthesizing with ${aiProvider}...` : `Query ${aiProvider}`}
            </button>
            
            <div className="flex items-center gap-4 px-6 bg-slate-50 border border-slate-200 rounded shrink-0">
               <div className="flex flex-col">
                  <span className="text-[8px] font-bold text-slate-400 uppercase">Temp</span>
                  <span className="text-[10px] font-black text-slate-900">0.7</span>
               </div>
               <div className="w-px h-6 bg-slate-200" />
               <div className="flex flex-col">
                  <span className="text-[8px] font-bold text-slate-400 uppercase">Tokens</span>
                  <span className="text-[10px] font-black text-slate-900">2048</span>
               </div>
            </div>
          </div>
        </div>

        {response && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-8 bg-slate-900 text-white rounded-lg border-l-4 border-blue-500 text-sm leading-relaxed relative"
          >
            <div className="absolute top-4 right-4 flex gap-2">
               <div className="w-2 h-2 rounded-full bg-red-400/50" />
               <div className="w-2 h-2 rounded-full bg-amber-400/50" />
               <div className="w-2 h-2 rounded-full bg-emerald-400/50" />
            </div>
            <div className="font-mono text-[10px] text-blue-400 mb-4 uppercase tracking-widest font-black opacity-60 flex items-center gap-2">
               <div className="w-3 h-[1px] bg-blue-500" />
               Intelligence Output v2.4.0 • {aiProvider}
            </div>
            <div className="prose prose-invert prose-sm max-w-none opacity-90 transition-all">
               <ReactMarkdown>{response}</ReactMarkdown>
            </div>
          </motion.div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pb-20">
        <div className="bg-[#1e293b] text-white p-6 rounded relative overflow-hidden group hover:bg-[#202d41] transition-all cursor-default">
           <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-4">Diagnostic Storage</div>
           <div className="text-xs space-y-1 text-slate-300 font-mono">
              <div className="flex justify-between border-b border-white/5 pb-1 mb-1"><span>Graph Nodes</span><span>{pages.length} Pages</span></div>
              <div className="flex justify-between"><span>Vector Cache</span><span>{pages.length * 12} Indices</span></div>
           </div>
           <Layout className="absolute -right-4 -bottom-4 text-white/5 w-20 h-20 group-hover:scale-110 transition-transform" />
        </div>
        
        <div className="bg-white border border-[#e2e8f0] p-6 rounded shadow-sm hover:shadow-md transition-all">
           <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-4">Model Config</div>
           <div className="text-xs space-y-2 text-slate-700 font-bold tracking-tight">
              <div className="flex justify-between items-center bg-slate-50 p-2 rounded">
                 <span className="text-[10px] uppercase text-slate-400">Context Window</span>
                 <span className="font-black">2.1M Tokens</span>
              </div>
              <div className="flex justify-between items-center bg-slate-50 p-2 rounded">
                 <span className="text-[10px] uppercase text-slate-400">Safety Filters</span>
                 <span className="font-black text-emerald-600 font-mono">STRICT_ACTIVE</span>
              </div>
           </div>
        </div>

        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white p-6 rounded shadow-lg shadow-blue-500/10">
           <div className="text-[9px] font-bold text-blue-200 uppercase tracking-widest mb-4">Neural Latency</div>
           <div className="flex items-end gap-2 mb-4">
              <div className="text-3xl font-black">1.4</div>
              <div className="text-xs font-bold text-blue-200 pb-1 uppercase tracking-tighter">ms/token</div>
           </div>
           <div className="flex gap-1">
              {[0.4, 0.6, 0.3, 0.8, 0.5, 0.9, 0.4].map((v, i) => (
                <div key={i} className="flex-1 h-8 bg-white/20 rounded-t-sm self-end" style={{ height: `${v * 100}%` }} />
              ))}
           </div>
        </div>
      </div>
    </div>
  );
}
