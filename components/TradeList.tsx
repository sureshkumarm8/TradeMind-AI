
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Trade, TradeOutcome, TradeDirection, OptionType, StrategyProfile, AiAnalysisResponse } from '../types';
import { ChevronDown, ChevronUp, Bot, Edit2, Trash2, ArrowUpRight, ArrowDownRight, Clock, AlertCircle, CheckCircle, Calendar, Sparkles, Target, Upload, FileSpreadsheet, FileJson, TrendingUp, Grid, List, CalendarDays, ChevronLeft, ChevronRight, Activity, ShieldAlert, Zap, ExternalLink, ThumbsUp, ThumbsDown, BarChart2, BrainCircuit, Image as ImageIcon, Share2, Loader2, Database, CloudUpload, X, FlaskConical, CircleDollarSign, Lightbulb, GraduationCap, Minus, Maximize2, Ban } from 'lucide-react';
import { analyzeBatch } from '../services/geminiService';
import { exportToCSV, exportToJSON, shareBackupData } from '../services/dataService';
import { shareElementAsImage } from '../services/shareService';

interface TradeListProps {
  trades: Trade[];
  strategyProfile: StrategyProfile;
  apiKey?: string;
  onEdit: (trade: Trade) => void;
  onDelete: (id: string) => void;
  onAnalyze: (trade: Trade) => void;
  onDeleteAiAnalysis?: (id: string) => void;
  onImport: (trades: Trade[]) => void;
  analyzingTradeId: string | null;
  readOnly?: boolean;
  onSyncPush?: () => void;
  isSyncing?: boolean;
  highlightedTradeId?: string | null; // New prop for Deep Linking
}

// Helper: Image Modal (Reused) - Portal Version
const ImageModal = ({ src, onClose }: { src: string | null, onClose: () => void }) => {
    if (!src) return null;
    return createPortal(
        <div className="fixed inset-0 z-[9999] bg-black/95 flex items-center justify-center p-4 backdrop-blur-md animate-fade-in" onClick={onClose}>
            <button onClick={onClose} className="absolute top-4 right-4 p-3 bg-slate-800 rounded-full text-white hover:bg-slate-700 transition border border-slate-700">
                <X size={24} />
            </button>
            <img src={src} className="max-w-full max-h-[90vh] rounded-lg shadow-2xl border border-slate-700 object-contain" onClick={(e) => e.stopPropagation()} />
        </div>,
        document.body
    );
};

// --- NEW COMPONENT: Tactical Dossier Report ---
const AiCoachReport = ({ report, title }: { report: string, title: string }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    
    if (!report) return null;

    // Rudimentary Markdown Parser for the specific structure returned by Gemini
    // Expects: ### Header \n Content
    const sections = report.split('###').filter(s => s.trim().length > 0);

    // Extract a "Grade" if present for the header teaser
    const gradeMatch = report.match(/Grade\s*([A-F][+-]?)/i);
    const detectedGrade = gradeMatch ? gradeMatch[1] : null;

    return (
        <div className={`group relative rounded-2xl border transition-all duration-500 overflow-hidden mb-6 ${isExpanded ? 'bg-slate-900/80 border-indigo-500/40 shadow-2xl shadow-indigo-900/20' : 'bg-slate-900 border-slate-800 hover:border-indigo-500/30 hover:shadow-lg cursor-pointer'}`}>
            
            {/* --- HEADER STRIP (Always Visible) --- */}
            <div 
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-4 flex items-center justify-between relative z-10 bg-slate-950/50 backdrop-blur-sm"
            >
                <div className="flex items-center gap-4">
                    {/* Icon Box */}
                    <div className={`p-2.5 rounded-xl border transition-all duration-300 ${isExpanded ? 'bg-indigo-600 text-white border-indigo-400 shadow-indigo-500/50 shadow-lg' : 'bg-slate-800 text-indigo-400 border-slate-700 group-hover:bg-slate-700 group-hover:text-white'}`}>
                        <BrainCircuit size={20} className={!isExpanded ? "animate-pulse" : ""} />
                    </div>

                    <div>
                        <h3 className="text-white font-black text-sm uppercase tracking-wide flex items-center gap-2">
                            {title}
                            {!isExpanded && <span className="flex h-2 w-2 relative"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span></span>}
                        </h3>
                        <div className="flex items-center gap-3 mt-1">
                            <p className="text-[10px] text-slate-400 font-mono font-medium uppercase tracking-wider">
                                {isExpanded ? 'INTELLIGENCE BRIEFING OPEN' : 'CLASSIFIED INSIGHTS READY'}
                            </p>
                            {detectedGrade && !isExpanded && (
                                <span className={`text-[10px] font-black px-2 py-0.5 rounded border ${['A','A+'].includes(detectedGrade) ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30'}`}>
                                    GRADE: {detectedGrade}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {!isExpanded && (
                        <span className="text-[10px] font-bold text-indigo-400 uppercase mr-2 opacity-0 group-hover:opacity-100 transition-opacity transform translate-x-2 group-hover:translate-x-0 duration-300">
                            Read Dossier
                        </span>
                    )}
                    <button className={`p-2 rounded-full border transition-all duration-300 ${isExpanded ? 'bg-slate-800 text-white border-slate-600 rotate-180' : 'bg-transparent text-slate-500 border-slate-800 group-hover:border-slate-600 group-hover:text-white'}`}>
                        <ChevronDown size={16} />
                    </button>
                </div>
                
                {/* Progress Bar visual at bottom of header when collapsed */}
                {!isExpanded && (
                    <div className="absolute bottom-0 left-0 h-[2px] bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500 w-full opacity-50 group-hover:opacity-100 transition-opacity"></div>
                )}
            </div>

            {/* --- EXPANDED CONTENT (The Dossier) --- */}
            <div className={`overflow-hidden transition-all duration-500 ease-in-out ${isExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}`}>
                <div className="p-6 pt-2 bg-gradient-to-b from-slate-950/50 to-slate-900/50">
                    
                    {/* Decorative Grid Lines */}
                    <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none"></div>

                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 relative z-10">
                        {sections.map((section, idx) => {
                            const lines = section.trim().split('\n');
                            const rawTitle = lines[0].trim();
                            const content = lines.slice(1).join('\n').trim();
                            
                            // Determine Styling based on content content
                            let icon = <Activity size={18} />;
                            let containerStyle = "bg-slate-800/40 border-slate-700/50";
                            let titleColor = "text-slate-300";
                            let iconBg = "bg-slate-700/50 text-slate-400";

                            if (rawTitle.includes('Market Sync') || rawTitle.includes('Sync')) {
                                icon = <Target size={18} />;
                                containerStyle = "bg-blue-900/10 border-blue-500/20 shadow-[0_4px_20px_-10px_rgba(59,130,246,0.3)]";
                                titleColor = "text-blue-300";
                                iconBg = "bg-blue-500/20 text-blue-400";
                            } else if (rawTitle.includes('Execution Grade') || rawTitle.includes('Grade')) {
                                icon = <GraduationCap size={18} />;
                                containerStyle = "bg-emerald-900/10 border-emerald-500/20 shadow-[0_4px_20px_-10px_rgba(16,185,129,0.3)]";
                                titleColor = "text-emerald-300";
                                iconBg = "bg-emerald-500/20 text-emerald-400";
                            } else if (rawTitle.includes('Pro Tip') || rawTitle.includes('Tip')) {
                                icon = <Lightbulb size={18} />;
                                containerStyle = "bg-amber-900/10 border-amber-500/30 shadow-[0_4px_20px_-10px_rgba(245,158,11,0.2)]";
                                titleColor = "text-amber-300";
                                iconBg = "bg-amber-500/20 text-amber-400";
                            }

                            return (
                                <div 
                                    key={idx} 
                                    className={`p-5 rounded-2xl border backdrop-blur-sm flex flex-col relative group/card transition-transform hover:-translate-y-1 duration-300 ${containerStyle} ${idx === sections.length - 1 && sections.length % 3 !== 0 ? 'md:col-span-2 lg:col-span-1' : ''}`}
                                >
                                    <div className="flex items-center gap-3 mb-3 border-b border-white/5 pb-3">
                                        <div className={`p-1.5 rounded-lg ${iconBg}`}>
                                            {icon}
                                        </div>
                                        <h4 className={`font-black text-xs uppercase tracking-wider ${titleColor}`}>
                                            {rawTitle.replace(/[\u{1F300}-\u{1F6FF}]/gu, '')}
                                        </h4> 
                                    </div>
                                    <div className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap font-medium">
                                        {content}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    
                    {/* Footer Signature */}
                    <div className="mt-6 flex justify-between items-center text-[10px] text-slate-500 font-mono uppercase border-t border-slate-800 pt-4">
                         <span>AI Neural Audit Complete</span>
                         <span>Confidential</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

const TradeList: React.FC<TradeListProps> = ({ trades, strategyProfile, apiKey, onEdit, onDelete, onAnalyze, onDeleteAiAnalysis, onImport, analyzingTradeId, readOnly = false, onSyncPush, isSyncing, highlightedTradeId }) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  
  // Daily Analysis Cache
  const [dailyAnalysis, setDailyAnalysis] = useState<Record<string, string>>({});
  const [analyzingDay, setAnalyzingDay] = useState<string | null>(null);

  // Period Analysis Cache (Week/Month) with Persistence
  const [periodReports, setPeriodReports] = useState<Record<string, string>>(() => {
      try {
          return JSON.parse(localStorage.getItem('tradeMind_periodReports') || '{}');
      } catch { return {}; }
  });
  const [isAnalyzingPeriod, setIsAnalyzingPeriod] = useState(false);

  const [viewMode, setViewMode] = useState<'list' | 'calendar' | 'week'>('list');
  const [currentDate, setCurrentDate] = useState(new Date()); // For Calendar/Week navigation
  
  const [isSharing, setIsSharing] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Track folded/collapsed AI Analysis sections
  const [collapsedAi, setCollapsedAi] = useState<Set<string>>(new Set());

  // Deep Linking Effect
  useEffect(() => {
      if (highlightedTradeId) {
          setViewMode('list');
          setExpandedId(highlightedTradeId);
          setTimeout(() => {
              const el = document.getElementById(`trade-${highlightedTradeId}`);
              if (el) {
                  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  el.classList.add('ring-2', 'ring-indigo-500', 'ring-offset-2', 'ring-offset-slate-950');
                  setTimeout(() => el.classList.remove('ring-2', 'ring-indigo-500', 'ring-offset-2', 'ring-offset-slate-950'), 2000);
              }
          }, 100);
      }
  }, [highlightedTradeId]);

  // Persist Period Reports
  useEffect(() => {
      localStorage.setItem('tradeMind_periodReports', JSON.stringify(periodReports));
  }, [periodReports]);

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const toggleAiFold = (id: string) => {
      const newSet = new Set(collapsedAi);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      setCollapsedAi(newSet);
  };

  const sortedTrades = [...trades].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Group trades by Date
  const tradesByDate = sortedTrades.reduce((acc, trade) => {
    const dateObj = new Date(trade.date + 'T00:00:00');
    const dateStr = dateObj.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    if (!acc[dateStr]) acc[dateStr] = [];
    acc[dateStr].push(trade);
    return acc;
  }, {} as Record<string, Trade[]>);

  const handleAnalyzeDay = async (dateStr: string, dayTrades: Trade[]) => {
    setAnalyzingDay(dateStr);
    const result = await analyzeBatch(dayTrades, `Single Trading Day (${dateStr})`, strategyProfile, apiKey);
    setDailyAnalysis(prev => ({ ...prev, [dateStr]: result }));
    setAnalyzingDay(null);
  };

  const handleAnalyzePeriod = async (periodKey: string, periodTitle: string, periodTrades: Trade[]) => {
      setIsAnalyzingPeriod(true);
      const result = await analyzeBatch(periodTrades, periodTitle, strategyProfile, apiKey);
      setPeriodReports(prev => ({ ...prev, [periodKey]: result }));
      setIsAnalyzingPeriod(false);
  }
  
  const handleExportCSV = () => exportToCSV(trades);
  const handleExportJSON = () => exportToJSON(trades, strategyProfile);
  
  const handleShareImage = async () => {
      setIsSharing(true);
      try {
          await new Promise(r => setTimeout(r, 100));
          await shareElementAsImage('journal-share-container', `trademind_journal_${viewMode}.png`);
      } catch (e) {
          alert("Failed to share image. Please try again.");
      } finally {
          setIsSharing(false);
      }
  }

  const handleShareData = async () => {
      setIsSharing(true);
      try {
          await shareBackupData(trades, strategyProfile);
      } catch(e) {
          alert("Failed to share data file.");
      } finally {
          setIsSharing(false);
      }
  }

  const getAiGrade = (feedbackString?: string): { grade: number | string, color: string } | null => {
      if (!feedbackString) return null;
      try {
          const data = JSON.parse(feedbackString) as AiAnalysisResponse;
          const grade = data.grade;
          if (typeof grade === 'number') {
              if (grade >= 90) return { grade, color: 'text-emerald-400 border-emerald-500 bg-emerald-500/20' };
              if (grade >= 75) return { grade, color: 'text-blue-400 border-blue-500 bg-blue-500/20' };
              if (grade >= 50) return { grade, color: 'text-amber-400 border-amber-500 bg-amber-500/20' };
              return { grade, color: 'text-red-500 border-red-500 bg-red-500/20' };
          }
          if (typeof grade === 'string') {
               if (['A', 'A+', 'A-'].includes(grade)) return { grade, color: 'text-emerald-400 border-emerald-500 bg-emerald-500/20' };
               if (['B', 'B+', 'B-'].includes(grade)) return { grade, color: 'text-blue-400 border-blue-500 bg-blue-500/20' };
               if (['C', 'C+'].includes(grade)) return { grade, color: 'text-amber-400 border-amber-500 bg-amber-500/20' };
               return { grade, color: 'text-red-500 border-red-500 bg-red-500/20' };
          }
      } catch (e) { return null; }
      return null;
  };

  const getRoiPercentage = (t: Trade) => {
    if (t.outcome === TradeOutcome.SKIPPED) return null;
    if (!t.entryPrice || !t.exitPrice) return null;
    let diff;
    if (t.direction === TradeDirection.LONG) {
      diff = t.exitPrice - t.entryPrice;
    } else {
      diff = t.entryPrice - t.exitPrice;
    }
    return (diff / t.entryPrice) * 100;
  };

  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  const getStartOfWeek = (d: Date) => {
      const date = new Date(d);
      const day = date.getDay();
      const diff = date.getDate() - day + (day === 0 ? -6 : 1);
      return new Date(date.setDate(diff));
  }
  const prevWeek = () => {
      const d = new Date(currentDate);
      d.setDate(d.getDate() - 7);
      setCurrentDate(d);
  }
  const nextWeek = () => {
       const d = new Date(currentDate);
      d.setDate(d.getDate() + 7);
      setCurrentDate(d);
  }

  const renderAiFeedback = (feedbackString: string, isFolded: boolean) => {
    if (!feedbackString) return null;
    let data: AiAnalysisResponse;
    try {
      data = JSON.parse(feedbackString);
    } catch (e) {
      return (
        <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700 text-sm text-slate-300 leading-relaxed">{feedbackString}</div>
      );
    }
    const getGradeColor = (g: number | string) => {
        if (typeof g === 'number') {
            if (g >= 90) return 'text-emerald-400 border-emerald-500 bg-emerald-500/10';
            if (g >= 70) return 'text-blue-400 border-blue-500 bg-blue-500/10';
            if (g >= 50) return 'text-amber-400 border-amber-500 bg-amber-500/10';
            return 'text-red-500 border-red-500 bg-red-500/10';
        }
       if (['A', 'A+', 'A-'].includes(g as string)) return 'text-emerald-400 border-emerald-500 bg-emerald-500/10';
       if (['B', 'B+', 'B-'].includes(g as string)) return 'text-blue-400 border-blue-500 bg-blue-500/10';
       if (['C', 'C+'].includes(g as string)) return 'text-amber-400 border-amber-500 bg-amber-500/10';
       return 'text-red-500 border-red-500 bg-red-500/10';
    };
    const gradeStyle = getGradeColor(data.grade);
    if (isFolded) {
        return (
            <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-700 flex items-center justify-between">
                <div className="flex items-center gap-4">
                     <span className={`text-xs font-black uppercase px-2 py-0.5 rounded border ${gradeStyle}`}>Grade: {data.grade}{typeof data.grade === 'number' ? '%' : ''}</span>
                     <span className="text-xs text-slate-400 font-medium truncate max-w-[200px] md:max-w-md">{data.marketTrend} • {data.strategyAudit.rulesFollowed ? 'Rules OK' : 'Rules Broken'}</span>
                </div>
                <span className="text-[10px] text-slate-500 uppercase font-bold hidden sm:block">Click chevron to expand</span>
            </div>
        );
    }
    return (
        <div className="bg-slate-900 rounded-xl border border-slate-700 overflow-hidden shadow-inner">
           <div className="bg-slate-950/50 p-4 border-b border-slate-800 flex justify-between items-center">
              <div className="flex items-center gap-3"><Bot size={18} className="text-indigo-400"/><h4 className="text-indigo-200 font-bold uppercase text-xs tracking-wider">Prop Desk Report Card</h4></div>
              {data.marketTrend && (<div className="flex items-center gap-2 bg-slate-800 px-3 py-1 rounded-full border border-slate-700"><Activity size={12} className="text-slate-400"/><span className="text-[10px] font-bold text-slate-300 uppercase">{data.marketTrend}</span></div>)}
           </div>
           <div className="p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
               <div className="lg:col-span-3 flex flex-col items-center justify-center border-b lg:border-b-0 lg:border-r border-slate-800 pb-6 lg:pb-0 lg:pr-6"><span className="text-[10px] uppercase font-bold text-slate-500 mb-2 tracking-widest">Execution Score</span><div className={`w-28 h-28 rounded-full flex flex-col items-center justify-center border-4 ${gradeStyle} shadow-lg mb-2 relative`}><span className="text-4xl font-black">{data.grade}</span>{typeof data.grade === 'number' && <span className="text-xs font-bold opacity-70">%</span>}</div><div className="flex gap-2 text-[10px] font-bold uppercase mt-2"><span className={`px-2 py-0.5 rounded ${data.strategyAudit.rulesFollowed ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>{data.strategyAudit.rulesFollowed ? 'Rules OK' : 'Rules Broken'}</span></div></div>
               <div className="lg:col-span-9 space-y-5">
                   <div><h5 className="flex items-center gap-2 text-xs font-bold text-blue-400 uppercase mb-2"><TrendingUp size={14}/> Reality Check</h5><p className="text-sm text-slate-300 bg-blue-900/10 border-l-2 border-blue-500 p-3 rounded-r-lg italic leading-relaxed">{data.realityCheck.replace(/^"|"$/g, '')}</p></div>
                   <div className="grid grid-cols-2 gap-4"><div className="bg-slate-800/50 p-3 rounded border border-slate-700/50"><span className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Timing</span><div className="flex items-center gap-2"><Clock size={14} className={data.strategyAudit.timing === 'Perfect' ? 'text-emerald-400' : 'text-amber-400'}/><span className="text-sm font-medium text-white">{data.strategyAudit.timing}</span></div></div><div className="bg-slate-800/50 p-3 rounded border border-slate-700/50"><span className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Direction</span><div className="flex items-center gap-2"><Target size={14} className={data.strategyAudit.direction === 'With Trend' ? 'text-emerald-400' : 'text-amber-400'}/><span className="text-sm font-medium text-white">{data.strategyAudit.direction}</span></div></div></div>
                   <div><h5 className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase mb-2"><Zap size={14}/> Coach's Command</h5><div className="text-sm text-emerald-100 bg-emerald-900/20 border border-emerald-500/20 p-3 rounded-lg flex items-start gap-3"><ShieldAlert size={18} className="shrink-0 mt-0.5 text-emerald-500"/><span className="font-medium">{data.coachCommand}</span></div></div>
                   {data.sources && data.sources.length > 0 && (<div className="flex gap-2 flex-wrap mt-2">{data.sources.map((src, i) => (<span key={i} className="text-[10px] flex items-center bg-slate-800 text-slate-500 px-2 py-1 rounded border border-slate-700"><ExternalLink size={10} className="mr-1"/> {src}</span>))}</div>)}
               </div>
           </div>
        </div>
    );
  };

  const renderWeeklyView = () => {
      const startOfWeek = getStartOfWeek(currentDate);
      const weekDays = [];
      const weekTrades: Trade[] = [];
      for (let i = 0; i < 5; i++) {
          const d = new Date(startOfWeek);
          d.setDate(startOfWeek.getDate() + i);
          weekDays.push(d);
          const year = d.getFullYear();
          const month = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          const dateStr = `${year}-${month}-${day}`;
          weekTrades.push(...trades.filter(t => t.date === dateStr));
      }
      const weekKey = `week_${weekDays[0].toISOString().split('T')[0]}`;
      const weeklyReport = periodReports[weekKey];
      return (
          <div className="animate-fade-in space-y-4">
              <div className="flex justify-between items-center bg-slate-800 p-3 rounded-xl border border-slate-700" data-html2canvas-ignore>
                  <button onClick={prevWeek} className="p-2 hover:bg-slate-700 rounded-full text-slate-400 hover:text-white"><ChevronLeft size={20}/></button>
                  <div className="text-center"><h3 className="text-white font-bold text-lg">{startOfWeek.toLocaleDateString(undefined, {month:'short', day:'numeric'})} - {weekDays[4].toLocaleDateString(undefined, {month:'short', day:'numeric', year:'numeric'})}</h3><div className="flex justify-center mt-1">{!weeklyReport && weekTrades.length > 0 && (<button onClick={() => handleAnalyzePeriod(weekKey, "Weekly Performance Review", weekTrades)} disabled={isAnalyzingPeriod} className="text-[10px] text-indigo-400 border border-indigo-500/30 px-2 py-0.5 rounded bg-indigo-900/10 hover:bg-indigo-900/20 transition flex items-center">{isAnalyzingPeriod ? <Loader2 size={10} className="animate-spin mr-1"/> : <Bot size={10} className="mr-1"/>}Analyze Week</button>)}{weeklyReport && (<span className="text-[10px] text-emerald-500 font-bold flex items-center"><CheckCircle size={10} className="mr-1"/> Analysis Ready</span>)}</div></div>
                  <button onClick={nextWeek} className="p-2 hover:bg-slate-700 rounded-full text-slate-400 hover:text-white"><ChevronRight size={20}/></button>
              </div>
              {weeklyReport && (<AiCoachReport report={weeklyReport} title="Weekly Coach's Report" />)}
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  {weekDays.map((dayObj, idx) => {
                      const year = dayObj.getFullYear();
                      const month = String(dayObj.getMonth() + 1).padStart(2, '0');
                      const day = String(dayObj.getDate()).padStart(2, '0');
                      const dateStr = `${year}-${month}-${day}`;
                      const dayTrades = trades.filter(t => t.date === dateStr);
                      const dayPnL = dayTrades.reduce((acc, t) => acc + (t.pnl || 0), 0);
                      const todayStr = new Date().toLocaleDateString('en-CA');
                      const isToday = todayStr === dateStr;
                      return (
                          <div key={idx} className={`bg-slate-800 rounded-xl border ${isToday ? 'border-indigo-500 shadow-indigo-500/20 shadow-lg' : 'border-slate-700'} flex flex-col h-auto min-h-[120px] md:min-h-[300px]`}>
                              <div className={`p-3 border-b ${isToday ? 'bg-indigo-900/20 border-indigo-500/30' : 'bg-slate-900/50 border-slate-700'} rounded-t-xl`}>
                                  <div className="flex justify-between items-center mb-1"><span className={`text-sm font-bold ${isToday ? 'text-indigo-400' : 'text-slate-400'}`}>{dayObj.toLocaleDateString(undefined, {weekday:'short'})}</span><span className="text-xs text-slate-500">{dayObj.getDate()}</span></div>
                                  <div className={`text-lg font-bold ${dayPnL > 0 ? 'text-emerald-400' : dayPnL < 0 ? 'text-red-400' : 'text-slate-500'}`}>{dayTrades.length > 0 ? `₹${dayPnL.toFixed(0)}` : '-'}</div>
                              </div>
                              <div className="p-2 flex-1 space-y-2 overflow-y-auto custom-scrollbar">
                                  {dayTrades.length === 0 ? (<div className="h-full flex items-center justify-center text-slate-600 text-xs italic min-h-[50px]">No Trades</div>) : (dayTrades.map(t => (<div key={t.id} onClick={() => onEdit(t)} className="bg-slate-900 p-2 rounded border border-slate-700 hover:border-slate-500 cursor-pointer group transition"><div className="flex justify-between text-xs mb-1"><span className={t.direction === TradeDirection.LONG ? 'text-blue-400' : 'text-amber-400'}>{t.direction}</span><span className="text-slate-500">{t.entryTime}</span></div><div className={`font-mono font-bold text-sm ${t.outcome === TradeOutcome.SKIPPED ? 'text-slate-500' : t.pnl && t.pnl > 0 ? 'text-emerald-400' : 'text-red-400'}`}>{t.outcome === TradeOutcome.SKIPPED ? 'SKIPPED' : t.pnl ? `₹${t.pnl.toFixed(0)}` : 'OPEN'}</div><div className="text-[10px] text-slate-500 truncate mt-1 group-hover:text-slate-300">{t.entryReason}</div></div>)))}
                              </div>
                          </div>
                      );
                  })}
              </div>
          </div>
      )
  }
  
  const renderCalendar = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });
    const monthKey = `month_${year}_${month}`;
    const monthlyReport = periodReports[monthKey];
    const monthTrades = trades.filter(t => {
        const parts = t.date.split('-');
        return parseInt(parts[1]) - 1 === month && parseInt(parts[0]) === year;
    });
    const days = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(new Date(year, month, i));
    return (
        <div className="animate-fade-in space-y-4">
             <div className="flex justify-between items-center bg-slate-800 p-3 rounded-xl border border-slate-700" data-html2canvas-ignore>
                  <button onClick={prevMonth} className="p-2 hover:bg-slate-700 rounded-full text-slate-400 hover:text-white"><ChevronLeft size={20}/></button>
                  <div className="text-center"><h3 className="text-white font-bold text-lg">{monthName}</h3><div className="flex justify-center mt-1">{!monthlyReport && monthTrades.length > 0 && (<button onClick={() => handleAnalyzePeriod(monthKey, "Monthly Performance Review", monthTrades)} disabled={isAnalyzingPeriod} className="text-[10px] text-indigo-400 border border-indigo-500/30 px-2 py-0.5 rounded bg-indigo-900/10 hover:bg-indigo-900/20 transition flex items-center">{isAnalyzingPeriod ? <Loader2 size={10} className="animate-spin mr-1"/> : <Bot size={10} className="mr-1"/>}Analyze Month</button>)}{monthlyReport && (<span className="text-[10px] text-emerald-500 font-bold flex items-center"><CheckCircle size={10} className="mr-1"/> Analysis Ready</span>)}</div></div>
                  <button onClick={nextMonth} className="p-2 hover:bg-slate-700 rounded-full text-slate-400 hover:text-white"><ChevronRight size={20}/></button>
             </div>
             {monthlyReport && (<AiCoachReport report={monthlyReport} title="Monthly Coach's Report" />)}
             <div className="bg-slate-800 p-2 md:p-6 rounded-xl border border-slate-700 shadow-lg">
                <div className="grid grid-cols-7 gap-1 md:gap-4 text-center mb-4">{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (<div key={d} className="text-xs md:text-sm text-slate-400 font-bold uppercase tracking-wider">{d}</div>))}</div>
                <div className="grid grid-cols-7 gap-1 md:gap-4">
                    {days.map((d, idx) => {
                        if (!d) return <div key={idx} className="bg-transparent aspect-square"></div>;
                        const dYear = d.getFullYear();
                        const dMonth = String(d.getMonth() + 1).padStart(2, '0');
                        const dDay = String(d.getDate()).padStart(2, '0');
                        const dateStr = `${dYear}-${dMonth}-${dDay}`;
                        const dayTrades = trades.filter(t => t.date === dateStr);
                        const dayPnL = dayTrades.reduce((acc, t) => acc + (t.pnl || 0), 0);
                        const hasTrades = dayTrades.length > 0;
                        const todayStr = new Date().toLocaleDateString('en-CA');
                        const isToday = todayStr === dateStr;
                        let bgClass = "bg-slate-900 border-slate-800 hover:border-slate-600";
                        if (hasTrades) {
                            bgClass = dayPnL > 0 ? "bg-emerald-500/10 border-emerald-500/30 hover:bg-emerald-500/20 hover:border-emerald-500/50" : dayPnL < 0 ? "bg-red-500/10 border-red-500/30 hover:bg-red-500/20 hover:border-red-500/50" : "bg-slate-700 border-slate-600";
                            if (dayTrades.every(t => t.outcome === TradeOutcome.SKIPPED)) bgClass = "bg-slate-800 border-slate-600 opacity-60";
                        }
                        if (isToday) bgClass += " ring-1 ring-indigo-500";
                        return (
                            <div key={idx} className={`aspect-square rounded-md md:rounded-xl border flex flex-col items-center justify-center p-0.5 md:p-1 relative transition cursor-default ${bgClass}`}><span className={`text-xs md:text-sm ${hasTrades ? 'text-white font-bold' : 'text-slate-600'} ${isToday ? 'text-indigo-400' : ''}`}>{d.getDate()}</span>{hasTrades && (<span className={`text-[9px] md:text-xs font-mono font-medium mt-0.5 md:mt-1 leading-none ${dayPnL >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{dayPnL >= 0 ? '+' : ''}{Math.abs(dayPnL) >= 1000 ? (dayPnL/1000).toFixed(1) + 'k' : dayPnL.toFixed(0)}</span>)}</div>
                        )
                    })}
                </div>
            </div>
        </div>
    );
  };

  if (trades.length === 0) {
      return (
          <div className="text-center py-20 animate-fade-in-up"><div className="bg-slate-800 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-slate-700 shadow-xl"><Target size={48} className="text-slate-500" /></div><h3 className="text-2xl font-bold text-white mb-2">Journal Empty</h3><p className="text-slate-400 mb-8">Start by logging your first mission or restore a backup.</p><div className="flex justify-center gap-4"><button onClick={() => onEdit({} as Trade)} className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2 rounded-lg font-bold transition shadow-lg shadow-indigo-900/50 flex items-center"><Activity size={18} className="mr-2"/> Log First Trade</button></div></div>
      )
  }

  return (
    <div className="space-y-6 pb-20 animate-fade-in">
       <ImageModal src={previewImage} onClose={() => setPreviewImage(null)} />
       <div className="bg-slate-900/80 backdrop-blur-md p-2 rounded-xl border border-slate-700 sticky top-14 md:top-20 z-20 flex flex-wrap gap-2 justify-between items-center shadow-lg" data-html2canvas-ignore><div className="flex bg-slate-800/50 p-1 rounded-lg"><button onClick={() => setViewMode('list')} className={`px-3 md:px-4 py-2 rounded-md text-xs font-bold transition flex items-center ${viewMode === 'list' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}><List size={14} className="mr-0 md:mr-2"/> <span className="hidden md:inline">List</span></button><button onClick={() => setViewMode('week')} className={`px-3 md:px-4 py-2 rounded-md text-xs font-bold transition flex items-center ${viewMode === 'week' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}><Grid size={14} className="mr-0 md:mr-2"/> <span className="hidden md:inline">Week</span></button><button onClick={() => setViewMode('calendar')} className={`px-3 md:px-4 py-2 rounded-md text-xs font-bold transition flex items-center ${viewMode === 'calendar' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}><CalendarDays size={14} className="mr-0 md:mr-2"/> <span className="hidden md:inline">Month</span></button></div><div className="flex gap-1 md:gap-2">{onSyncPush && (<button onClick={onSyncPush} disabled={isSyncing} className="p-2 text-indigo-400 hover:text-white bg-indigo-900/20 hover:bg-indigo-900/40 rounded-lg border border-indigo-500/20 hover:border-indigo-500/50 transition disabled:opacity-50 flex items-center gap-1" title="Save to Cloud">{isSyncing ? <Loader2 size={16} className="animate-spin"/> : <CloudUpload size={16}/>}<span className="text-[10px] font-bold uppercase hidden sm:block">{isSyncing ? 'Saving' : 'Save'}</span></button>)}<button onClick={handleShareImage} disabled={isSharing} className="p-2 text-slate-400 hover:text-indigo-400 bg-slate-800/50 hover:bg-slate-800 rounded-lg border border-transparent hover:border-indigo-500/30 transition disabled:opacity-50" title="Share Snapshot">{isSharing ? <Loader2 size={16} className="animate-spin"/> : <Share2 size={16}/>}</button><button onClick={handleShareData} disabled={isSharing} className="p-2 text-slate-400 hover:text-purple-400 bg-slate-800/50 hover:bg-slate-800 rounded-lg border border-transparent hover:border-purple-500/30 transition disabled:opacity-50" title="Share Data File"><Database size={16}/></button><button onClick={handleExportCSV} className="p-2 text-slate-400 hover:text-emerald-400 bg-slate-800/50 hover:bg-slate-800 rounded-lg border border-transparent hover:border-emerald-500/30 transition" title="Backup (CSV)"><FileSpreadsheet size={16}/></button><button onClick={handleExportJSON} className="p-2 text-slate-400 hover:text-blue-400 bg-slate-800/50 hover:bg-slate-800 rounded-lg border border-transparent hover:border-blue-500/30 transition" title="Backup (JSON)"><FileJson size={16}/></button></div></div>
       <div id="journal-share-container" className="p-1 rounded-xl bg-slate-950">{viewMode === 'calendar' && renderCalendar()}{viewMode === 'week' && renderWeeklyView()}{viewMode === 'list' && (Object.entries(tradesByDate) as [string, Trade[]][]).map(([dateStr, dayTrades]) => (<div key={dateStr} className="space-y-4 mb-4"><div className="flex items-center justify-between sticky top-[6.5rem] md:top-[5.5rem] z-10 bg-slate-950/90 backdrop-blur py-2 border-b border-indigo-500/20" data-html2canvas-ignore><div className="flex items-center gap-3"><div className="w-2 h-8 bg-indigo-500 rounded-r-lg"></div><h3 className="text-white font-bold text-sm uppercase tracking-wide truncate max-w-[150px] md:max-w-none">{dateStr}</h3><span className="text-xs text-slate-500 font-mono">({dayTrades.length})</span></div><div className="flex items-center gap-2"><span className={`text-xs font-mono font-bold ${dayTrades.reduce((a,t)=>a+(t.pnl||0),0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{dayTrades.reduce((a,t)=>a+(t.pnl||0),0) >= 0 ? '+' : ''}₹{dayTrades.reduce((a,t)=>a+(t.pnl||0),0).toFixed(2)}</span>{dailyAnalysis[dateStr] ? (<button onClick={() => alert(dailyAnalysis[dateStr])} className="text-[10px] bg-emerald-900 text-emerald-300 border border-emerald-700 px-2 py-1 rounded">View Report</button>) : (<button onClick={() => handleAnalyzeDay(dateStr, dayTrades)} className="text-[10px] bg-indigo-900/50 text-indigo-300 border border-indigo-700 px-2 py-1 rounded flex items-center hover:bg-indigo-900 transition">{analyzingDay === dateStr ? <Bot size={12} className="mr-1 animate-spin"/> : <BrainCircuit size={12} className="mr-1"/>}{analyzingDay === dateStr ? 'Analyzing...' : 'Audit Day'}</button>)}</div></div>{dayTrades.map((trade) => {
                   const isOpen = trade.outcome === TradeOutcome.OPEN;
                   const isWin = trade.outcome === TradeOutcome.WIN;
                   const isSkipped = trade.outcome === TradeOutcome.SKIPPED;
                   const isExpanded = expandedId === trade.id;
                   const aiGrade = getAiGrade(trade.aiFeedback);
                   const isAnalyzing = analyzingTradeId === trade.id;
                   const roi = getRoiPercentage(trade);
                   const isRealMoney = trade.executionType === 'REAL';
                   const stripColor = isSkipped ? 'bg-slate-600' : isOpen ? 'bg-slate-600' : isWin ? 'bg-emerald-500' : trade.outcome === TradeOutcome.BREAK_EVEN ? 'bg-amber-500' : 'bg-red-500';
                   return (
                     <div id={`trade-${trade.id}`} key={trade.id} className={`bg-slate-800 rounded-xl border ${isExpanded ? 'border-indigo-500 ring-1 ring-indigo-500/50' : 'border-slate-700'} overflow-hidden transition-all duration-300 hover:shadow-xl relative pl-2 group`}>
                       <div className={`absolute top-0 bottom-0 left-0 w-2 ${stripColor} transition-all`}></div>
                       <div className="p-4 cursor-pointer" onClick={() => toggleExpand(trade.id)}>
                           <div className="flex justify-between items-start">
                               <div className="flex items-start gap-3">
                                   <div className={`mt-1 p-2 rounded-lg ${isSkipped ? 'bg-slate-500/10 text-slate-400' : trade.direction === TradeDirection.LONG ? 'bg-blue-500/10 text-blue-400' : 'bg-amber-500/10 text-amber-400'}`}>
                                       {isSkipped ? <Ban size={20}/> : trade.direction === TradeDirection.LONG ? <ArrowUpRight size={20}/> : <ArrowDownRight size={20}/>}
                                   </div>
                                   <div>
                                       <div className="flex items-center gap-2 flex-wrap">
                                           <h4 className={`font-bold text-base ${isSkipped ? 'text-slate-400' : 'text-white'}`}>
                                               {trade.strikePrice ? `${trade.strikePrice} ${trade.optionType}` : trade.instrument}
                                           </h4>
                                           <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${isSkipped ? 'bg-slate-700 text-slate-400' : trade.optionType === OptionType.CE ? 'bg-green-900 text-green-300' : trade.optionType === OptionType.PE ? 'bg-red-900 text-red-300' : 'bg-indigo-900 text-indigo-300'}`}>
                                               {trade.optionType}
                                           </span>
                                           {isRealMoney && !isSkipped && (<span className="flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded uppercase bg-amber-500/20 text-amber-400 border border-amber-500/30"><CircleDollarSign size={10} /> Real</span>)}
                                           {aiGrade && !isExpanded && (<span className={`text-[10px] font-black px-1.5 py-0.5 rounded border shadow-sm ${aiGrade.color}`}>Grade: {aiGrade.grade}{typeof aiGrade.grade === 'number' ? '%' : ''}</span>)}
                                           {isSkipped && <span className="text-[10px] font-black px-1.5 py-0.5 rounded border border-slate-600 bg-slate-700/50 text-slate-400">SKIPPED MISSION</span>}
                                       </div>
                                       <div className="flex items-center gap-2 md:gap-3 mt-1 text-slate-400 text-xs font-mono flex-wrap">
                                           <span className="flex items-center"><Clock size={12} className="mr-1"/> {trade.entryTime}</span>
                                           <span className="hidden md:inline">|</span>
                                           {roi !== null && (<><span className={`${roi > 0 ? 'text-emerald-400' : roi < 0 ? 'text-red-400' : 'text-slate-400'}`}>{roi > 0 ? '+' : ''}{roi.toFixed(1)}%</span><span className="hidden md:inline">|</span></>)}
                                           {!isSkipped && <span>{trade.quantity} Qty</span>}
                                           {!isSkipped && <span className="hidden md:inline">|</span>}
                                           <span className={isSkipped ? 'text-slate-500' : trade.pnl && trade.pnl > 0 ? 'text-emerald-400' : 'text-red-400'}>
                                               {isSkipped ? 'NO TRADE' : isOpen ? 'HOLDING' : `₹${trade.pnl?.toFixed(2)}`}
                                           </span>
                                       </div>
                                   </div>
                               </div>
                               <div className="text-right">{isAnalyzing ? (<div className="flex items-center gap-2 bg-indigo-900/30 px-3 py-1.5 rounded-full border border-indigo-500/30 animate-pulse"><BrainCircuit size={14} className="text-indigo-400 animate-spin"/><span className="text-[10px] font-bold text-indigo-300 uppercase hidden md:inline">Syncing...</span></div>) : (<div className="flex items-center gap-2"><div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider hidden sm:block">{trade.setupName || 'No Setup'}</div>{isExpanded ? <ChevronUp size={16} className="text-slate-500"/> : <ChevronDown size={16} className="text-slate-500"/>}</div>)}</div>
                           </div>
                       </div>
                       {isExpanded && (
                           <div className="bg-slate-900/50 border-t border-slate-800 p-5 space-y-6 animate-fade-in">
                               {(trade.chartImage || trade.oiImage) && (<div className="flex gap-4 overflow-x-auto pb-2">{trade.chartImage && (<div className="relative group shrink-0 cursor-pointer" onClick={() => setPreviewImage(trade.chartImage!)}><p className="text-[10px] text-slate-500 mb-1 uppercase font-bold">Chart</p><img src={trade.chartImage} alt="Chart" className="h-24 rounded border border-slate-700 transition hover:scale-105" /></div>)}{trade.oiImage && (<div className="relative group shrink-0 cursor-pointer" onClick={() => setPreviewImage(trade.oiImage!)}><p className="text-[10px] text-slate-500 mb-1 uppercase font-bold">OI Data</p><img src={trade.oiImage} alt="OI" className="h-24 rounded border border-slate-700 transition hover:scale-105" /></div>)}</div>)}
                               <div className="bg-slate-950/30 p-4 rounded-lg border border-slate-800"><p className="text-xs text-slate-400 mb-2"><span className="text-slate-500 font-bold uppercase">{isSkipped ? 'Observation Log:' : 'Log/Logic:'}</span> {trade.entryReason}</p>{trade.exitReason && <p className="text-xs text-slate-400"><span className="text-slate-500 font-bold uppercase">Exit:</span> {trade.exitReason}</p>}</div>
                               <div className="border-t border-slate-800 pt-4">
                                   <div className="flex justify-between items-center mb-4"><div className="flex items-center gap-2"><Sparkles size={16} className="text-indigo-400" /><h4 className="text-sm font-bold text-white uppercase tracking-wider">{isSkipped ? "Decision Audit" : "Coach's Analysis"}</h4></div><div className="flex gap-2">{trade.aiFeedback && (<button onClick={(e) => { e.stopPropagation(); toggleAiFold(trade.id); }} className="p-1.5 text-slate-400 hover:text-white bg-slate-800 rounded border border-slate-700 transition" title={collapsedAi.has(trade.id) ? "Expand Report" : "Collapse Report"}>{collapsedAi.has(trade.id) ? <ChevronDown size={14}/> : <ChevronUp size={14}/>}</button>)}{trade.aiFeedback && onDeleteAiAnalysis && (<button onClick={(e) => { e.stopPropagation(); onDeleteAiAnalysis(trade.id); }} className="p-1.5 text-slate-400 hover:text-red-400 bg-slate-800 rounded border border-slate-700 transition" title="Delete Analysis"><Trash2 size={14}/></button>)}{!trade.aiFeedback && !readOnly && (<button onClick={(e) => { e.stopPropagation(); onAnalyze(trade); }} disabled={analyzingTradeId !== null} className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded font-bold transition flex items-center disabled:opacity-50 disabled:cursor-not-allowed">{analyzingTradeId === trade.id ? <Bot size={14} className="animate-spin mr-1"/> : <Bot size={14} className="mr-1"/>}{analyzingTradeId === trade.id ? 'Analyzing...' : isSkipped ? 'Audit Decision' : 'Run Reality Check'}</button>)}</div></div>
                                   {trade.aiFeedback ? renderAiFeedback(trade.aiFeedback, collapsedAi.has(trade.id)) : (<div className="text-center py-6 bg-slate-800/30 rounded border border-dashed border-slate-700"><p className="text-xs text-slate-500 italic">{isSkipped ? "Audit your decision to see if staying out was the right move." : "No AI analysis yet. Run a check to see if you followed your rules."}</p></div>)}
                               </div>
                               {!readOnly && (<div className="flex justify-end gap-3 border-t border-slate-800 pt-4" data-html2canvas-ignore><button onClick={(e) => { e.stopPropagation(); onEdit(trade); }} className="text-xs flex items-center text-slate-400 hover:text-white transition"><Edit2 size={14} className="mr-1"/> Edit Log</button><button onClick={(e) => { e.stopPropagation(); onDelete(trade.id); }} className="text-xs flex items-center text-red-500/70 hover:text-red-500 transition"><Trash2 size={14} className="mr-1"/> Delete</button></div>)}
                           </div>
                       )}
                     </div>
                   );
                 })}</div>))}
       </div>
    </div>
  );
};
export default TradeList;
