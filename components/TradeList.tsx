import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Trade, TradeOutcome, TradeDirection, OptionType, StrategyProfile, AiAnalysisResponse } from '../types';
import { ChevronDown, ChevronUp, Bot, Edit2, Trash2, ArrowUpRight, ArrowDownRight, Clock, AlertCircle, CheckCircle, Calendar, Sparkles, Target, Upload, FileSpreadsheet, FileJson, TrendingUp, Grid, List, CalendarDays, ChevronLeft, ChevronRight, Activity, ShieldAlert, Zap, ExternalLink, ThumbsUp, ThumbsDown, BarChart2, BrainCircuit, Image as ImageIcon, Share2, Loader2, Database, CloudUpload, X, FlaskConical, CircleDollarSign, Lightbulb, GraduationCap, Minus, Maximize2, MessageSquare, Briefcase } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
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

// ... existing AiCoachReport ...
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
  const [analyzingPeriod, setAnalyzingPeriod] = useState<string | null>(null);

  const [viewMode, setViewMode] = useState<'list' | 'calendar' | 'week'>('list');
  const [currentDate, setCurrentDate] = useState(new Date()); // For Calendar/Week navigation
  
  const [isSharing, setIsSharing] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Track folded/collapsed AI Analysis sections
  const [collapsedAi, setCollapsedAi] = useState<Set<string>>(new Set());

  // Deep Linking Effect: Scroll to and expand trade when highlightedTradeId changes
  useEffect(() => {
      if (highlightedTradeId) {
          // 1. Force List View
          setViewMode('list');
          // 2. Expand the trade
          setExpandedId(highlightedTradeId);
          // 3. Scroll into view after a brief delay to allow render
          setTimeout(() => {
              const el = document.getElementById(`trade-${highlightedTradeId}`);
              if (el) {
                  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  // Add a flash effect (optional, via CSS class manipulation or just strict focus)
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

  const sortedTrades = useMemo(() => {
      return [...trades].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [trades]);

  // Group trades by Date string for List View
  const tradesByDate = useMemo(() => {
      return sortedTrades.reduce((acc, trade) => {
        const d = new Date(trade.date);
        if (isNaN(d.getTime())) return acc; 
        const dateObj = new Date(trade.date + 'T00:00:00'); // Force local midnight
        const dateStr = dateObj.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        
        if (!acc[dateStr]) acc[dateStr] = [];
        acc[dateStr].push(trade);
        return acc;
      }, {} as Record<string, Trade[]>);
  }, [sortedTrades]);

  // Group trades by Week for Week View
  const tradesByWeek = useMemo(() => {
      return sortedTrades.reduce((acc, trade) => {
          const d = new Date(trade.date);
          if(isNaN(d.getTime())) return acc;
          const day = d.getDay();
          const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is sunday
          const monday = new Date(d.setDate(diff));
          monday.setHours(0,0,0,0);
          const key = monday.toISOString().split('T')[0]; // "2024-05-20"
          
          if (!acc[key]) acc[key] = [];
          acc[key].push(trade);
          return acc;
      }, {} as Record<string, Trade[]>);
  }, [sortedTrades]);

  // Group trades by Month for Calendar (Monthly) View
  const tradesByMonth = useMemo(() => {
      return sortedTrades.reduce((acc, trade) => {
          const d = new Date(trade.date);
          if(isNaN(d.getTime())) return acc;
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; // "2024-05"
          if (!acc[key]) acc[key] = [];
          acc[key].push(trade);
          return acc;
      }, {} as Record<string, Trade[]>);
  }, [sortedTrades]);

  const handleAnalyzeDay = async (dateStr: string, dayTrades: Trade[]) => {
    setAnalyzingDay(dateStr);
    const result = await analyzeBatch(dayTrades, `Single Trading Day (${dateStr})`, strategyProfile, apiKey);
    setDailyAnalysis(prev => ({ ...prev, [dateStr]: result }));
    setAnalyzingDay(null);
  };

  // Generic function to analyze a batch of trades for a period (Week/Month)
  const handleAnalyzePeriod = async (periodKey: string, periodTitle: string, periodTrades: Trade[]) => {
      setAnalyzingPeriod(periodKey);
      const result = await analyzeBatch(periodTrades, periodTitle, strategyProfile, apiKey);
      setPeriodReports(prev => ({ ...prev, [periodKey]: result }));
      setAnalyzingPeriod(null);
  }
  
  const handleExportCSV = () => exportToCSV(trades);
  const handleExportJSON = () => exportToJSON(trades, strategyProfile);
  
  const handleShareImage = async () => {
      setIsSharing(true);
      try {
          // Add a small delay to allow UI to settle (if needed)
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

  // --- Helper to parse Grade for Badges ---
  const getAiGrade = (feedbackString?: string): { grade: number | string, color: string } | null => {
      if (!feedbackString) return null;
      try {
          const data = JSON.parse(feedbackString) as AiAnalysisResponse;
          const grade = data.grade;
          
          // Handle numeric grade
          if (typeof grade === 'number') {
              if (grade >= 90) return { grade, color: 'text-emerald-400 border-emerald-500 bg-emerald-500/20' };
              if (grade >= 75) return { grade, color: 'text-blue-400 border-blue-500 bg-blue-500/20' };
              if (grade >= 50) return { grade, color: 'text-amber-400 border-amber-500 bg-amber-500/20' };
              return { grade, color: 'text-red-500 border-red-500 bg-red-500/20' };
          }
          
          // Fallback for old string grades
          if (typeof grade === 'string') {
               if (['A', 'A+', 'A-'].includes(grade)) return { grade, color: 'text-emerald-400 border-emerald-500 bg-emerald-500/20' };
               if (['B', 'B+', 'B-'].includes(grade)) return { grade, color: 'text-blue-400 border-blue-500 bg-blue-500/20' };
               if (['C', 'C+'].includes(grade)) return { grade, color: 'text-amber-400 border-amber-500 bg-amber-500/20' };
               return { grade, color: 'text-red-500 border-red-500 bg-red-500/20' };
          }
      } catch (e) { return null; }
      return null;
  };

  // --- Helper: Get Best Score for Display (AI Grade > Manual Rating) ---
  const getDisplayScore = (t: Trade) => {
      const ai = getAiGrade(t.aiFeedback);
      if (ai) return { val: ai.grade, color: ai.color };
      
      // Fallback to manual Discipline Rating (1-5) converted to percentage
      if (t.disciplineRating) {
           const pct = t.disciplineRating * 20;
           let color = 'text-slate-400 border-slate-600 bg-slate-800'; 
           if (pct >= 80) color = 'text-emerald-400 border-emerald-500 bg-emerald-500/20';
           else if (pct >= 60) color = 'text-blue-400 border-blue-500 bg-blue-500/20';
           else if (pct >= 40) color = 'text-amber-400 border-amber-500 bg-amber-500/20';
           else color = 'text-red-500 border-red-500 bg-red-500/20';
           return { val: pct, color };
      }
      return null;
  }

  const getRoiPercentage = (t: Trade) => {
    if (!t.entryPrice || !t.exitPrice) return null;
    let diff;
    if (t.direction === TradeDirection.LONG) {
      diff = t.exitPrice - t.entryPrice;
    } else {
      diff = t.entryPrice - t.exitPrice;
    }
    return (diff / t.entryPrice) * 100;
  };

  // --- Render AI Feedback UI (Prop Desk Style) ---
  const renderAiFeedback = (feedbackString: string, isFolded: boolean) => {
    if (!feedbackString) return null;

    let data: AiAnalysisResponse;
    try {
      data = JSON.parse(feedbackString);
    } catch (e) {
      return (
        <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700 text-sm text-slate-300 leading-relaxed">
           {feedbackString}
        </div>
      );
    }

    // Determine Grade Color
    const getGradeColor = (g: number | string) => {
        if (typeof g === 'number') {
            if (g >= 90) return 'text-emerald-400 border-emerald-500 bg-emerald-500/10';
            if (g >= 70) return 'text-blue-400 border-blue-500 bg-blue-500/10';
            if (g >= 50) return 'text-amber-400 border-amber-500 bg-amber-500/10';
            return 'text-red-500 border-red-500 bg-red-500/10';
        }
       // Fallback for strings
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
                     <span className={`text-xs font-black uppercase px-2 py-0.5 rounded border ${gradeStyle}`}>
                        Grade: {data.grade}{typeof data.grade === 'number' ? '%' : ''}
                     </span>
                     <span className="text-xs text-slate-400 font-medium truncate max-w-[200px] md:max-w-md">
                        {data.marketTrend} • {data.strategyAudit.rulesFollowed ? 'Rules OK' : 'Rules Broken'}
                     </span>
                </div>
                <span className="text-[10px] text-slate-500 uppercase font-bold hidden sm:block">Click chevron to expand</span>
            </div>
        );
    }

    return (
        <div className="bg-slate-900 rounded-xl border border-slate-700 overflow-hidden shadow-inner">
           {/* Header Bar */}
           <div className="bg-slate-950/50 p-4 border-b border-slate-800 flex justify-between items-center">
              <div className="flex items-center gap-3">
                 <Bot size={18} className="text-indigo-400"/>
                 <h4 className="text-indigo-200 font-bold uppercase text-xs tracking-wider">Prop Desk Report Card</h4>
              </div>
              {data.marketTrend && (
                 <div className="flex items-center gap-2 bg-slate-800 px-3 py-1 rounded-full border border-slate-700">
                    <Activity size={12} className="text-slate-400"/>
                    <span className="text-[10px] font-bold text-slate-300 uppercase">{data.marketTrend}</span>
                 </div>
              )}
           </div>

           <div className="p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
               
               {/* Left: Grade */}
               <div className="lg:col-span-3 flex flex-col items-center justify-center border-b lg:border-b-0 lg:border-r border-slate-800 pb-6 lg:pb-0 lg:pr-6">
                   <span className="text-[10px] uppercase font-bold text-slate-500 mb-2 tracking-widest">Execution Score</span>
                   <div className={`w-28 h-28 rounded-full flex flex-col items-center justify-center border-4 ${gradeStyle} shadow-lg mb-2 relative`}>
                      <span className="text-4xl font-black">{data.grade}</span>
                      {typeof data.grade === 'number' && <span className="text-xs font-bold opacity-70">%</span>}
                   </div>
                   <div className="flex gap-2 text-[10px] font-bold uppercase mt-2">
                       <span className={`px-2 py-0.5 rounded ${data.strategyAudit.rulesFollowed ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                          {data.strategyAudit.rulesFollowed ? 'Rules OK' : 'Rules Broken'}
                       </span>
                   </div>
               </div>

               {/* Right: Analysis */}
               <div className="lg:col-span-9 space-y-5">
                   
                   {/* Reality Check Block */}
                   <div>
                       <h5 className="flex items-center gap-2 text-xs font-bold text-blue-400 uppercase mb-2">
                           <TrendingUp size={14}/> Reality Check
                       </h5>
                       <p className="text-sm text-slate-300 bg-blue-900/10 border-l-2 border-blue-500 p-3 rounded-r-lg italic leading-relaxed">
                           {data.realityCheck.replace(/^"|"$/g, '')}
                       </p>
                   </div>

                   {/* Strategy Audit Grid */}
                   <div className="grid grid-cols-2 gap-4">
                       <div className="bg-slate-800/50 p-3 rounded border border-slate-700/50">
                           <span className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Timing</span>
                           <div className="flex items-center gap-2">
                               <Clock size={14} className={data.strategyAudit.timing === 'Perfect' ? 'text-emerald-400' : 'text-amber-400'}/>
                               <span className="text-sm font-medium text-white">{data.strategyAudit.timing}</span>
                           </div>
                       </div>
                       <div className="bg-slate-800/50 p-3 rounded border border-slate-700/50">
                           <span className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Direction</span>
                           <div className="flex items-center gap-2">
                               <Target size={14} className={data.strategyAudit.direction === 'With Trend' ? 'text-emerald-400' : 'text-amber-400'}/>
                               <span className="text-sm font-medium text-white">{data.strategyAudit.direction}</span>
                           </div>
                       </div>
                   </div>

                   {/* Coach Command */}
                   <div>
                       <h5 className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase mb-2">
                           <Zap size={14}/> Coach's Command
                       </h5>
                       <div className="text-sm text-emerald-100 bg-emerald-900/20 border border-emerald-500/20 p-3 rounded-lg flex items-start gap-3">
                           <ShieldAlert size={18} className="shrink-0 mt-0.5 text-emerald-500"/>
                           <span className="font-medium">{data.coachCommand}</span>
                       </div>
                   </div>
                   
                   {/* Sources */}
                   {data.sources && data.sources.length > 0 && (
                       <div className="flex gap-2 flex-wrap mt-2">
                           {data.sources.map((src, i) => (
                               <span key={i} className="text-[10px] flex items-center bg-slate-800 text-slate-500 px-2 py-1 rounded border border-slate-700">
                                   <ExternalLink size={10} className="mr-1"/> {src}
                               </span>
                           ))}
                       </div>
                   )}

               </div>
           </div>
        </div>
    );
  };

  return (
    <div className="space-y-6 pb-20 md:pb-0" id="journal-share-container">
      
      {/* Lightbox for Charts */}
      <ImageModal src={previewImage} onClose={() => setPreviewImage(null)} />

      {/* Header / Controls */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-900 p-4 rounded-xl border border-slate-800 shadow-lg">
          <div className="flex items-center gap-2 bg-slate-800 p-1 rounded-lg border border-slate-700">
              <button 
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded flex items-center justify-center transition-all ${viewMode === 'list' ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                  title="List View"
              >
                  <List size={18} />
              </button>
              <button 
                  onClick={() => setViewMode('week')}
                  className={`p-2 rounded flex items-center justify-center transition-all ${viewMode === 'week' ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                  title="Week View"
              >
                  <Grid size={18} />
              </button>
              <button 
                  onClick={() => setViewMode('calendar')}
                  className={`p-2 rounded flex items-center justify-center transition-all ${viewMode === 'calendar' ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                  title="Monthly View"
              >
                  <Calendar size={18} />
              </button>
          </div>

          <div className="flex items-center gap-2">
              <button onClick={handleExportCSV} className="p-2 bg-slate-800 border border-slate-700 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition" title="Export CSV">
                  <FileSpreadsheet size={18} />
              </button>
              <button onClick={handleExportJSON} className="p-2 bg-slate-800 border border-slate-700 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition" title="Export JSON">
                  <FileJson size={18} />
              </button>
              {onSyncPush && (
                  <button 
                      onClick={onSyncPush} 
                      disabled={isSyncing}
                      className="p-2 bg-indigo-900/30 border border-indigo-500/30 rounded-lg hover:bg-indigo-900/50 text-indigo-400 hover:text-indigo-300 transition disabled:opacity-50" 
                      title="Force Cloud Sync"
                  >
                      {isSyncing ? <Loader2 size={18} className="animate-spin"/> : <CloudUpload size={18} />}
                  </button>
              )}
              {navigator.share && (
                  <button onClick={handleShareData} className="p-2 bg-slate-800 border border-slate-700 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition" title="Share Backup">
                      <Share2 size={18} />
                  </button>
              )}
              <button 
                  onClick={handleShareImage}
                  disabled={isSharing}
                  className="p-2 bg-emerald-900/30 border border-emerald-500/30 rounded-lg hover:bg-emerald-900/50 text-emerald-400 hover:text-emerald-300 transition"
                  title="Share Snapshot"
              >
                  {isSharing ? <Loader2 size={18} className="animate-spin"/> : <ImageIcon size={18}/>}
              </button>
          </div>
      </div>

      {/* VIEW: LIST (Grouped by Date) */}
      {viewMode === 'list' && (
        <div className="space-y-8 animate-fade-in">
            {Object.keys(tradesByDate).length === 0 ? (
                <div className="text-center p-12 bg-slate-900 rounded-2xl border border-slate-800 border-dashed">
                    <Database size={48} className="mx-auto text-slate-600 mb-4"/>
                    <p className="text-slate-500 font-medium">No mission logs found. Start trading.</p>
                </div>
            ) : (
                Object.entries(tradesByDate).map(([dateStr, dayTrades]) => {
                    const dailyPnL = dayTrades.reduce((acc, t) => acc + (t.pnl || 0), 0);
                    const dailyWinRate = (dayTrades.filter(t => t.outcome === TradeOutcome.WIN).length / dayTrades.filter(t => t.outcome !== TradeOutcome.OPEN).length) * 100 || 0;
                    
                    return (
                        <div key={dateStr} className="space-y-4">
                            
                            {/* Date Header */}
                            <div className="flex items-center justify-between sticky top-0 bg-slate-950/80 backdrop-blur-md p-3 z-20 border-b border-slate-800 shadow-sm">
                                <div className="flex items-center gap-4">
                                    <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                                        <CalendarDays size={16} className="text-indigo-500"/> {dateStr}
                                    </h3>
                                    <span className={`text-xs font-mono font-bold ${dailyPnL >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                        {dailyPnL >= 0 ? '+' : ''}₹{dailyPnL.toFixed(1)}
                                    </span>
                                </div>
                                <div className="flex gap-2">
                                    <span className="text-[10px] font-bold text-slate-500 bg-slate-900 px-2 py-1 rounded border border-slate-800">
                                        Win Rate: {Math.round(dailyWinRate)}%
                                    </span>
                                    {analyzingDay === dateStr ? (
                                        <button disabled className="text-[10px] font-bold text-indigo-400 flex items-center bg-indigo-900/20 px-2 py-1 rounded border border-indigo-500/30">
                                            <Loader2 size={12} className="animate-spin mr-1"/> Analyzing...
                                        </button>
                                    ) : !dailyAnalysis[dateStr] ? (
                                        <button onClick={() => handleAnalyzeDay(dateStr, dayTrades)} className="text-[10px] font-bold text-slate-400 hover:text-indigo-400 flex items-center bg-slate-900 hover:bg-slate-800 px-2 py-1 rounded border border-slate-800 transition">
                                            <Bot size={12} className="mr-1"/> Analyze Day
                                        </button>
                                    ) : (
                                        <span className="text-[10px] font-bold text-emerald-400 flex items-center bg-emerald-900/20 px-2 py-1 rounded border border-emerald-500/30">
                                            <CheckCircle size={12} className="mr-1"/> Analysis Ready
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Daily AI Report */}
                            {dailyAnalysis[dateStr] && (
                                <AiCoachReport report={dailyAnalysis[dateStr]} title={`Daily Debrief: ${dateStr}`} />
                            )}

                            {/* Trade Cards */}
                            <div className="space-y-2">
                                {dayTrades.map(trade => {
                                    const isExpanded = expandedId === trade.id;
                                    const displayScore = getDisplayScore(trade);
                                    
                                    return (
                                        <div 
                                            id={`trade-${trade.id}`}
                                            key={trade.id} 
                                            className={`bg-slate-900 rounded-xl border transition-all duration-300 relative overflow-hidden group ${isExpanded ? 'border-indigo-500 shadow-lg shadow-indigo-900/20' : 'border-slate-800 hover:border-slate-700'}`}
                                        >
                                            {/* Left Stripe Indicator */}
                                            <div className={`absolute left-0 top-0 bottom-0 w-1 ${trade.outcome === TradeOutcome.WIN ? 'bg-emerald-500' : trade.outcome === TradeOutcome.LOSS ? 'bg-red-500' : trade.outcome === TradeOutcome.BREAK_EVEN ? 'bg-yellow-500' : 'bg-slate-500'}`}></div>

                                            {/* Main Card Content (Strict 2-Row Compact Layout) */}
                                            <div className="p-3 pl-5 cursor-pointer" onClick={() => toggleExpand(trade.id)}>
                                                
                                                {/* Row 1: Time, Instrument, Direction | Score & PnL */}
                                                <div className="flex justify-between items-center mb-2">
                                                    <div className="flex items-center gap-2 overflow-hidden">
                                                        <span className="text-[11px] font-mono font-bold text-slate-400 whitespace-nowrap">
                                                            {trade.entryTime} {trade.exitTime ? `- ${trade.exitTime}` : ''}
                                                        </span>
                                                        <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded border ${trade.direction === TradeDirection.LONG ? 'bg-blue-900/20 text-blue-400 border-blue-500/20' : 'bg-amber-900/20 text-amber-400 border-amber-500/20'}`}>
                                                            {trade.direction}
                                                        </span>
                                                        <span className="text-[11px] font-bold text-white uppercase truncate">{trade.instrument}</span>
                                                        {displayScore && (
                                                            <span className={`text-[10px] font-black px-1.5 py-0.5 rounded border flex items-center gap-1 ${displayScore.color}`}>
                                                                Desc Score : {displayScore.val}{typeof displayScore.val === 'number' ? '%' : ''}
                                                            </span>
                                                        )}
                                                    </div>

                                                    <div className="text-right whitespace-nowrap">
                                                        {trade.outcome === TradeOutcome.OPEN ? (
                                                            <span className="text-[10px] font-black bg-slate-800 text-slate-300 px-2 py-0.5 rounded uppercase tracking-wider animate-pulse border border-slate-700">OPEN</span>
                                                        ) : (
                                                            <span className={`text-sm font-black font-mono ${trade.pnl && trade.pnl > 0 ? 'text-emerald-400' : trade.pnl && trade.pnl < 0 ? 'text-red-400' : 'text-slate-400'}`}>
                                                                {trade.pnl && trade.pnl > 0 ? '+' : ''}{trade.pnl !== undefined ? `₹${trade.pnl.toFixed(1)}` : '---'}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Row 2: Details | ROI */}
                                                <div className="flex justify-between items-center">
                                                    <div className="text-[10px] text-slate-500 flex items-center gap-2 overflow-hidden whitespace-nowrap">
                                                        {trade.optionType && (
                                                            <span className="font-mono text-slate-400">{trade.strikePrice} <span className={trade.optionType === OptionType.CE ? "text-emerald-500/80" : "text-red-500/80"}>{trade.optionType}</span></span>
                                                        )}
                                                        <span className="opacity-50">•</span>
                                                        <span>Qty: {trade.quantity}</span>
                                                        {trade.setupName && (
                                                            <>
                                                                <span className="opacity-50">•</span>
                                                                <span className="truncate max-w-[100px] text-slate-400">{trade.setupName}</span>
                                                            </>
                                                        )}
                                                    </div>

                                                    <div className="flex items-center gap-2">
                                                        {trade.outcome !== TradeOutcome.OPEN && trade.entryPrice && trade.exitPrice && (
                                                            <span className={`text-[10px] font-bold ${getRoiPercentage(trade)! >= 0 ? 'text-emerald-500/70' : 'text-red-500/70'}`}>
                                                                {getRoiPercentage(trade)?.toFixed(1)}%
                                                            </span>
                                                        )}
                                                        <ChevronDown size={14} className={`text-slate-600 transition-transform ${isExpanded ? 'rotate-180' : ''}`}/>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Expanded Details */}
                                            {isExpanded && (
                                                <div className="bg-slate-900/50 border-t border-slate-800 p-5 space-y-6 animate-fade-in">
                                                    
                                                    {/* Images */}
                                                    {(trade.chartImage || trade.oiImage) && (
                                                        <div className="flex gap-4 overflow-x-auto pb-2">
                                                            {trade.chartImage && (
                                                                <div className="relative group shrink-0 cursor-pointer" onClick={(e) => { e.stopPropagation(); setPreviewImage(trade.chartImage!); }}>
                                                                    <p className="text-[10px] text-slate-500 mb-1 uppercase font-bold">Chart</p>
                                                                    <img src={trade.chartImage} alt="Chart" className="h-24 rounded border border-slate-700 transition hover:scale-105" />
                                                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center rounded">
                                                                        <Maximize2 size={20} className="text-white"/>
                                                                    </div>
                                                                </div>
                                                            )}
                                                            {trade.oiImage && (
                                                                <div className="relative group shrink-0 cursor-pointer" onClick={(e) => { e.stopPropagation(); setPreviewImage(trade.oiImage!); }}>
                                                                    <p className="text-[10px] text-slate-500 mb-1 uppercase font-bold">OI Data</p>
                                                                    <img src={trade.oiImage} alt="OI" className="h-24 rounded border border-slate-700 transition hover:scale-105" />
                                                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center rounded">
                                                                        <Maximize2 size={20} className="text-white"/>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                    
                                                    {/* Narrative */}
                                                    <div className="bg-slate-950/30 p-4 rounded-lg border border-slate-800">
                                                        <p className="text-xs text-slate-400 mb-2"><span className="text-slate-500 font-bold uppercase">Logic:</span> {trade.entryReason}</p>
                                                        {trade.exitReason && <p className="text-xs text-slate-400"><span className="text-slate-500 font-bold uppercase">Exit:</span> {trade.exitReason}</p>}
                                                    </div>

                                                    {/* Live Mission Timeline (ReadOnly) */}
                                                    {((trade.notes && trade.notes.length > 0) || trade.entryReason) && (
                                                        <div className="border border-slate-800 rounded-lg overflow-hidden">
                                                            <div className="bg-slate-900/50 p-2 border-b border-slate-800 flex items-center gap-2">
                                                                <MessageSquare size={12} className="text-indigo-400"/>
                                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Mission Timeline</span>
                                                            </div>
                                                            <div className="p-3 bg-slate-950/30 space-y-2 max-h-[200px] overflow-y-auto custom-scrollbar">
                                                                
                                                                {/* INJECTED ENTRY REASON AS FIRST TIMELINE ITEM */}
                                                                {trade.entryReason && (
                                                                    <div className="flex gap-2 text-xs border-l-2 border-indigo-500 pl-2">
                                                                        <span className="text-indigo-400 font-mono text-[10px] whitespace-nowrap pt-0.5">[{trade.entryTime}]</span>
                                                                        <div>
                                                                            <span className="text-[9px] font-bold text-indigo-500 uppercase mr-1">LOGIC</span>
                                                                            <span className="text-indigo-200 font-medium">{trade.entryReason}</span>
                                                                        </div>
                                                                    </div>
                                                                )}

                                                                {trade.notes?.map((n, i) => (
                                                                    <div key={n.id || i} className="flex gap-2 text-xs pl-2.5">
                                                                        <span className="text-slate-600 font-mono text-[10px] whitespace-nowrap pt-0.5">[{n.timestamp}]</span>
                                                                        <span className={`${n.type === 'emotion' ? 'text-purple-400' : n.type === 'market' ? 'text-amber-400' : 'text-slate-300'}`}>
                                                                            {n.content}
                                                                        </span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* AI ANALYSIS SECTION */}
                                                    <div className="border-t border-slate-800 pt-4">
                                                        <div className="flex justify-between items-center mb-4">
                                                            <div className="flex items-center gap-2">
                                                                <Sparkles size={16} className="text-indigo-400" />
                                                                <h4 className="text-sm font-bold text-white uppercase tracking-wider">Coach's Analysis</h4>
                                                            </div>
                                                            <div className="flex gap-2">
                                                                    {/* Toggle Fold Button */}
                                                                    {trade.aiFeedback && (
                                                                        <button 
                                                                            onClick={(e) => { e.stopPropagation(); toggleAiFold(trade.id); }} 
                                                                            className="p-1.5 text-slate-400 hover:text-white bg-slate-800 rounded border border-slate-700 transition"
                                                                            title={collapsedAi.has(trade.id) ? "Expand Report" : "Collapse Report"}
                                                                        >
                                                                            {collapsedAi.has(trade.id) ? <ChevronDown size={14}/> : <ChevronUp size={14}/>}
                                                                        </button>
                                                                    )}
                                                                    
                                                                    {/* Trash Analysis Button */}
                                                                    {trade.aiFeedback && onDeleteAiAnalysis && (
                                                                        <button 
                                                                            onClick={(e) => { e.stopPropagation(); onDeleteAiAnalysis(trade.id); }} 
                                                                            className="p-1.5 text-slate-400 hover:text-red-400 bg-slate-800 rounded border border-slate-700 transition"
                                                                            title="Delete Analysis"
                                                                        >
                                                                            <Trash2 size={14}/>
                                                                        </button>
                                                                    )}

                                                                    {/* Run Analysis Button */}
                                                                    {!trade.aiFeedback && !readOnly && (
                                                                        <button 
                                                                            onClick={(e) => { e.stopPropagation(); onAnalyze(trade); }}
                                                                            disabled={analyzingTradeId !== null}
                                                                            className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded font-bold transition flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                                                                        >
                                                                            {analyzingTradeId === trade.id ? <Bot size={14} className="animate-spin mr-1"/> : <Bot size={14} className="mr-1"/>}
                                                                            {analyzingTradeId === trade.id ? 'Analyzing...' : 'Run Reality Check'}
                                                                        </button>
                                                                    )}
                                                            </div>
                                                        </div>

                                                        {/* Render the Feedback */}
                                                        {trade.aiFeedback ? renderAiFeedback(trade.aiFeedback, collapsedAi.has(trade.id)) : (
                                                            <div className="text-center py-6 bg-slate-800/30 rounded border border-dashed border-slate-700">
                                                                <p className="text-xs text-slate-500 italic">No AI analysis yet. Run a check to see if you followed your rules.</p>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Footer Actions */}
                                                    {!readOnly && (
                                                        <div className="flex justify-end gap-3 border-t border-slate-800 pt-4" data-html2canvas-ignore>
                                                            <button onClick={(e) => { e.stopPropagation(); onEdit(trade); }} className="text-xs flex items-center text-slate-400 hover:text-white transition">
                                                                <Edit2 size={14} className="mr-1"/> Edit Log
                                                            </button>
                                                            <button onClick={(e) => { e.stopPropagation(); onDelete(trade.id); }} className="text-xs flex items-center text-red-500/70 hover:text-red-500 transition">
                                                                <Trash2 size={14} className="mr-1"/> Delete
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })
            )}
        </div>
      )}

      {/* VIEW: WEEKLY SUMMARY */}
      {viewMode === 'week' && (
          <div className="space-y-8 animate-fade-in">
              {Object.keys(tradesByWeek).length === 0 ? (
                  <div className="text-center p-12 bg-slate-900 rounded-2xl border border-slate-700 border-dashed">
                      <Grid size={48} className="mx-auto text-slate-600 mb-4"/>
                      <p className="text-slate-500 font-medium">No weekly data available yet.</p>
                  </div>
              ) : (
                  Object.entries(tradesByWeek).map(([weekStart, weekTrades]) => {
                      const totalPnL = weekTrades.reduce((acc, t) => acc + (t.pnl || 0), 0);
                      const wins = weekTrades.filter(t => t.outcome === TradeOutcome.WIN).length;
                      const count = weekTrades.filter(t => t.outcome !== TradeOutcome.OPEN).length;
                      const winRate = count > 0 ? Math.round((wins/count) * 100) : 0;
                      
                      // Daily Data for Mini Chart
                      const dailyData = weekTrades.reduce((acc, t) => {
                          if(t.outcome === TradeOutcome.OPEN) return acc;
                          const d = t.date; // already YYYY-MM-DD
                          const existing = acc.find(item => item.date === d);
                          if(existing) existing.pnl += (t.pnl || 0);
                          else acc.push({ date: d, pnl: t.pnl || 0 });
                          return acc;
                      }, [] as {date: string, pnl: number}[]).sort((a,b) => a.date.localeCompare(b.date));

                      const analysisKey = `week_${weekStart}`;

                      return (
                          <div key={weekStart} className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden shadow-lg mb-6">
                              <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-950/50">
                                  <div>
                                      <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                                          <Calendar size={16} className="text-indigo-500"/> Week of {new Date(weekStart).toLocaleDateString(undefined, {month:'short', day:'numeric'})}
                                      </h3>
                                      <div className="flex gap-3 mt-1 text-xs font-mono">
                                          <span className={`${totalPnL >= 0 ? 'text-emerald-400' : 'text-red-400'} font-bold`}>
                                              {totalPnL >= 0 ? '+' : ''}₹{totalPnL.toFixed(1)}
                                          </span>
                                          <span className="text-slate-500">|</span>
                                          <span className="text-blue-400">{count} Trades</span>
                                          <span className="text-slate-500">|</span>
                                          <span className="text-amber-400">{winRate}% Win</span>
                                      </div>
                                  </div>
                                  
                                  {analyzingPeriod === analysisKey ? (
                                      <button disabled className="text-[10px] font-bold text-indigo-400 flex items-center bg-indigo-900/20 px-3 py-1.5 rounded border border-indigo-500/30">
                                          <Loader2 size={12} className="animate-spin mr-1"/> Analyzing Week...
                                      </button>
                                  ) : !periodReports[analysisKey] ? (
                                      <button onClick={() => handleAnalyzePeriod(analysisKey, `Weekly Performance (${weekStart})`, weekTrades)} className="text-[10px] font-bold text-slate-300 hover:text-white flex items-center bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded border border-slate-700 transition">
                                          <Bot size={12} className="mr-1"/> Analyze Week
                                      </button>
                                  ) : (
                                      <span className="text-[10px] font-bold text-emerald-400 flex items-center bg-emerald-900/20 px-3 py-1.5 rounded border border-emerald-500/30">
                                          <CheckCircle size={12} className="mr-1"/> Analysis Ready
                                      </span>
                                  )}
                              </div>

                              {periodReports[analysisKey] && (
                                  <div className="p-4 border-b border-slate-800 bg-slate-900/30">
                                      <AiCoachReport report={periodReports[analysisKey]} title="Weekly Performance Review" />
                                  </div>
                              )}

                              <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-6">
                                  {/* Mini Chart */}
                                  <div className="h-32 w-full bg-slate-950/30 rounded-lg border border-slate-800 p-2">
                                      <ResponsiveContainer width="100%" height="100%">
                                          <BarChart data={dailyData}>
                                              <XAxis dataKey="date" hide />
                                              <Tooltip 
                                                  contentStyle={{background: '#0f172a', border: '1px solid #334155', fontSize: '10px'}} 
                                                  cursor={{fill: 'transparent'}}
                                                  formatter={(val: number) => [`₹${val.toFixed(0)}`, 'PnL']}
                                              />
                                              <Bar dataKey="pnl" radius={[2, 2, 0, 0]}>
                                                  {dailyData.map((entry, index) => (
                                                      <Cell key={`cell-${index}`} fill={entry.pnl >= 0 ? '#10B981' : '#EF4444'} />
                                                  ))}
                                              </Bar>
                                          </BarChart>
                                      </ResponsiveContainer>
                                  </div>

                                  {/* Trade List Snippet */}
                                  <div className="space-y-2">
                                      {weekTrades.slice(0, 5).map(t => (
                                          <div key={t.id} onClick={() => toggleExpand(t.id)} className="flex justify-between items-center text-xs p-2 rounded hover:bg-slate-800 cursor-pointer border border-transparent hover:border-slate-700 transition">
                                              <div className="flex items-center gap-2">
                                                  <span className={`w-1.5 h-1.5 rounded-full ${t.outcome === TradeOutcome.WIN ? 'bg-emerald-500' : t.outcome === TradeOutcome.LOSS ? 'bg-red-500' : 'bg-slate-500'}`}></span>
                                                  <span className="text-slate-300 font-mono">{t.date.slice(5)}</span>
                                                  <span className="font-bold text-white">{t.instrument}</span>
                                              </div>
                                              <span className={`font-mono font-bold ${t.pnl && t.pnl > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                                  {t.pnl ? `₹${t.pnl.toFixed(0)}` : '-'}
                                              </span>
                                          </div>
                                      ))}
                                      {weekTrades.length > 5 && (
                                          <div className="text-center pt-1">
                                              <span className="text-[10px] text-slate-500 uppercase font-bold">+ {weekTrades.length - 5} more trades</span>
                                          </div>
                                      )}
                                  </div>
                              </div>
                          </div>
                      );
                  })
              )}
          </div>
      )}

      {/* VIEW: MONTHLY SUMMARY (Replaces Calendar) */}
      {viewMode === 'calendar' && (
          <div className="space-y-8 animate-fade-in">
              {Object.keys(tradesByMonth).length === 0 ? (
                  <div className="text-center p-12 bg-slate-900 rounded-2xl border border-slate-700 border-dashed">
                      <Calendar size={48} className="mx-auto text-slate-600 mb-4"/>
                      <p className="text-slate-500 font-medium">No monthly data available yet.</p>
                  </div>
              ) : (
                  Object.entries(tradesByMonth).map(([monthKey, monthTrades]) => {
                      const totalPnL = monthTrades.reduce((acc, t) => acc + (t.pnl || 0), 0);
                      const wins = monthTrades.filter(t => t.outcome === TradeOutcome.WIN).length;
                      const losses = monthTrades.filter(t => t.outcome === TradeOutcome.LOSS).length;
                      const count = monthTrades.filter(t => t.outcome !== TradeOutcome.OPEN).length;
                      const winRate = count > 0 ? Math.round((wins/count) * 100) : 0;
                      
                      const grossProfit = monthTrades.reduce((acc, t) => (t.pnl && t.pnl > 0 ? acc + t.pnl : acc), 0);
                      const grossLoss = Math.abs(monthTrades.reduce((acc, t) => (t.pnl && t.pnl < 0 ? acc + t.pnl : acc), 0));
                      const pf = grossLoss === 0 ? grossProfit : grossProfit / grossLoss;

                      const [year, month] = monthKey.split('-');
                      const monthName = new Date(parseInt(year), parseInt(month)-1).toLocaleString('default', { month: 'long', year: 'numeric' });
                      const analysisKey = `month_${monthKey}`;

                      return (
                          <div key={monthKey} className="bg-gradient-to-br from-slate-900 to-indigo-950/20 rounded-2xl border border-slate-700 shadow-xl mb-8 overflow-hidden">
                              <div className="p-6 border-b border-slate-700/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                  <div>
                                      <h3 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-2">
                                          <Briefcase size={20} className="text-blue-400"/> {monthName}
                                      </h3>
                                      <div className="flex gap-4 mt-2">
                                          <div className="flex flex-col">
                                              <span className="text-[10px] text-slate-500 uppercase font-bold">Net PnL</span>
                                              <span className={`text-lg font-mono font-black ${totalPnL >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                                  {totalPnL >= 0 ? '+' : ''}₹{totalPnL.toFixed(1)}
                                              </span>
                                          </div>
                                          <div className="flex flex-col">
                                              <span className="text-[10px] text-slate-500 uppercase font-bold">Profit Factor</span>
                                              <span className="text-lg font-mono font-bold text-white">{pf.toFixed(2)}x</span>
                                          </div>
                                          <div className="flex flex-col">
                                              <span className="text-[10px] text-slate-500 uppercase font-bold">Win Rate</span>
                                              <span className="text-lg font-mono font-bold text-amber-400">{winRate}%</span>
                                          </div>
                                      </div>
                                  </div>

                                  {analyzingPeriod === analysisKey ? (
                                      <button disabled className="px-4 py-2 bg-indigo-600/20 border border-indigo-500/30 text-indigo-300 rounded-lg text-xs font-bold uppercase flex items-center">
                                          <Loader2 size={14} className="animate-spin mr-2"/> Generative Audit...
                                      </button>
                                  ) : !periodReports[analysisKey] ? (
                                      <button onClick={() => handleAnalyzePeriod(analysisKey, `Monthly Review (${monthName})`, monthTrades)} className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold uppercase tracking-wider shadow-lg shadow-indigo-900/30 transition flex items-center gap-2">
                                          <Sparkles size={14}/> Generate Month Report
                                      </button>
                                  ) : (
                                      <span className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-lg text-xs font-bold uppercase flex items-center">
                                          <CheckCircle size={14} className="mr-2"/> Report Ready
                                      </span>
                                  )}
                              </div>

                              {periodReports[analysisKey] && (
                                  <div className="p-6 bg-slate-900/50 border-b border-slate-800">
                                      <AiCoachReport report={periodReports[analysisKey]} title={`Chief's Monthly Debrief: ${monthName}`} />
                                  </div>
                              )}

                              {/* Breakdown Grid */}
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-slate-800 bg-slate-900/30">
                                  <div className="p-4 text-center">
                                      <span className="block text-[10px] text-slate-500 font-bold uppercase mb-1">Total Trades</span>
                                      <span className="text-xl font-bold text-white">{count}</span>
                                  </div>
                                  <div className="p-4 text-center">
                                      <span className="block text-[10px] text-slate-500 font-bold uppercase mb-1">Winners</span>
                                      <span className="text-xl font-bold text-emerald-400">{wins}</span>
                                  </div>
                                  <div className="p-4 text-center">
                                      <span className="block text-[10px] text-slate-500 font-bold uppercase mb-1">Losers</span>
                                      <span className="text-xl font-bold text-red-400">{losses}</span>
                                  </div>
                                  <div className="p-4 text-center">
                                      <span className="block text-[10px] text-slate-500 font-bold uppercase mb-1">Avg Win/Loss</span>
                                      <span className="text-sm font-bold text-slate-300">
                                          <span className="text-emerald-400">₹{wins > 0 ? (grossProfit/wins).toFixed(0) : 0}</span> / <span className="text-red-400">₹{losses > 0 ? (grossLoss/losses).toFixed(0) : 0}</span>
                                      </span>
                                  </div>
                              </div>
                          </div>
                      );
                  })
              )}
          </div>
      )}

    </div>
  );
};

export default TradeList;