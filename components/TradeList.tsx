import React, { useState, useRef } from 'react';
import { Trade, TradeOutcome, TradeDirection, OptionType, StrategyProfile, AiAnalysisResponse } from '../types';
import { ChevronDown, ChevronUp, Bot, Edit2, Trash2, ArrowUpRight, ArrowDownRight, Clock, AlertCircle, CheckCircle, Calendar, Sparkles, Target, Upload, FileSpreadsheet, FileJson, TrendingUp, Grid, List, CalendarDays, ChevronLeft, ChevronRight, Activity, ShieldAlert, Zap, ExternalLink, ThumbsUp, ThumbsDown, BarChart2, BrainCircuit, Image as ImageIcon } from 'lucide-react';
import { analyzeBatch } from '../services/geminiService';
import { exportToCSV, exportToJSON } from '../services/dataService';

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
}

const TradeList: React.FC<TradeListProps> = ({ trades, strategyProfile, apiKey, onEdit, onDelete, onAnalyze, onDeleteAiAnalysis, onImport, analyzingTradeId, readOnly = false }) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [dailyAnalysis, setDailyAnalysis] = useState<Record<string, string>>({});
  const [analyzingDay, setAnalyzingDay] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'calendar' | 'week'>('list');
  const [currentDate, setCurrentDate] = useState(new Date()); // For Calendar/Week navigation
  
  // Track folded/collapsed AI Analysis sections
  const [collapsedAi, setCollapsedAi] = useState<Set<string>>(new Set());

  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Group trades by Date string for List View
  const tradesByDate = sortedTrades.reduce((acc, trade) => {
    const d = new Date(trade.date);
    if (isNaN(d.getTime())) return acc; 

    const dateStr = d.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
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
  
  const handleExportCSV = () => exportToCSV(trades);
  const handleExportJSON = () => exportToJSON(trades, strategyProfile);
  
  const handleImportClick = () => fileInputRef.current?.click();
  
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
      const { importData } = await import('../services/dataService');
      const { trades: importedTrades } = await importData(file);
      if (importedTrades && importedTrades.length > 0) {
        if (confirm(`Found ${importedTrades.length} trades in file. This will merge with your existing data. Continue?`)) {
            onImport(importedTrades);
        }
      } else {
        alert("No trades found in this file.");
      }
    } catch (error) {
      alert("Failed to import file: " + error);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // --- Helper to parse Grade for Badges ---
  const getAiGrade = (feedbackString?: string): { grade: string, color: string } | null => {
      if (!feedbackString) return null;
      try {
          const data = JSON.parse(feedbackString) as AiAnalysisResponse;
          if (data.grade) {
               if (['A', 'A+', 'A-'].includes(data.grade)) return { grade: data.grade, color: 'text-emerald-400 border-emerald-500 bg-emerald-500/20' };
               if (['B', 'B+', 'B-'].includes(data.grade)) return { grade: data.grade, color: 'text-blue-400 border-blue-500 bg-blue-500/20' };
               if (['C', 'C+'].includes(data.grade)) return { grade: data.grade, color: 'text-amber-400 border-amber-500 bg-amber-500/20' };
               return { grade: data.grade, color: 'text-red-500 border-red-500 bg-red-500/20' };
          }
      } catch (e) { return null; }
      return null;
  };

  // --- Calendar/Week Navigation ---
  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  
  const getStartOfWeek = (d: Date) => {
      const date = new Date(d);
      const day = date.getDay();
      const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is sunday
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
    const getGradeColor = (g: string) => {
       if (['A', 'A+', 'A-'].includes(g)) return 'text-emerald-400 border-emerald-500 bg-emerald-500/10';
       if (['B', 'B+', 'B-'].includes(g)) return 'text-blue-400 border-blue-500 bg-blue-500/10';
       if (['C', 'C+'].includes(g)) return 'text-yellow-400 border-yellow-500 bg-yellow-500/10';
       return 'text-red-500 border-red-500 bg-red-500/10';
    };
    
    const gradeStyle = getGradeColor(data.grade);

    if (isFolded) {
        return (
            <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-700 flex items-center justify-between">
                <div className="flex items-center gap-4">
                     <span className={`text-xs font-black uppercase px-2 py-0.5 rounded border ${gradeStyle}`}>
                        Grade: {data.grade}
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
                   <span className="text-[10px] uppercase font-bold text-slate-500 mb-2 tracking-widest">Execution Grade</span>
                   <div className={`w-24 h-24 rounded-full flex items-center justify-center border-4 text-5xl font-black ${gradeStyle} shadow-lg mb-2`}>
                      {data.grade}
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
                           "{data.realityCheck}"
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

  // --- Week View Logic ---
  const renderWeeklyView = () => {
      const startOfWeek = getStartOfWeek(currentDate);
      const weekDays = [];
      for (let i = 0; i < 5; i++) { // Mon-Fri
          const d = new Date(startOfWeek);
          d.setDate(startOfWeek.getDate() + i);
          weekDays.push(d);
      }

      return (
          <div className="animate-fade-in">
              <div className="flex justify-between items-center mb-6 bg-slate-800 p-3 rounded-xl border border-slate-700">
                  <button onClick={prevWeek} className="p-2 hover:bg-slate-700 rounded-full text-slate-400 hover:text-white"><ChevronLeft size={20}/></button>
                  <h3 className="text-white font-bold text-lg">
                      {startOfWeek.toLocaleDateString(undefined, {month:'short', day:'numeric'})} - {weekDays[4].toLocaleDateString(undefined, {month:'short', day:'numeric', year:'numeric'})}
                  </h3>
                  <button onClick={nextWeek} className="p-2 hover:bg-slate-700 rounded-full text-slate-400 hover:text-white"><ChevronRight size={20}/></button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  {weekDays.map((day, idx) => {
                      const dateStr = day.toISOString().split('T')[0];
                      const dayTrades = trades.filter(t => t.date === dateStr);
                      const dayPnL = dayTrades.reduce((acc, t) => acc + (t.pnl || 0), 0);
                      const isToday = new Date().toISOString().split('T')[0] === dateStr;

                      return (
                          <div key={idx} className={`bg-slate-800 rounded-xl border ${isToday ? 'border-indigo-500 shadow-indigo-500/20 shadow-lg' : 'border-slate-700'} flex flex-col h-full min-h-[300px]`}>
                              <div className={`p-3 border-b ${isToday ? 'bg-indigo-900/20 border-indigo-500/30' : 'bg-slate-900/50 border-slate-700'} rounded-t-xl`}>
                                  <div className="flex justify-between items-center mb-1">
                                      <span className={`text-sm font-bold ${isToday ? 'text-indigo-400' : 'text-slate-400'}`}>
                                          {day.toLocaleDateString(undefined, {weekday:'short'})}
                                      </span>
                                      <span className="text-xs text-slate-500">{day.getDate()}</span>
                                  </div>
                                  <div className={`text-lg font-bold ${dayPnL > 0 ? 'text-emerald-400' : dayPnL < 0 ? 'text-red-400' : 'text-slate-500'}`}>
                                      {dayTrades.length > 0 ? `₹${dayPnL.toFixed(0)}` : '-'}
                                  </div>
                              </div>
                              
                              <div className="p-2 flex-1 space-y-2 overflow-y-auto custom-scrollbar">
                                  {dayTrades.length === 0 ? (
                                      <div className="h-full flex items-center justify-center text-slate-600 text-xs italic">No Trades</div>
                                  ) : (
                                      dayTrades.map(t => (
                                          <div key={t.id} onClick={() => onEdit(t)} className="bg-slate-900 p-2 rounded border border-slate-700 hover:border-slate-500 cursor-pointer group transition">
                                              <div className="flex justify-between text-xs mb-1">
                                                  <span className={t.direction === TradeDirection.LONG ? 'text-blue-400' : 'text-amber-400'}>{t.direction}</span>
                                                  <span className="text-slate-500">{t.entryTime}</span>
                                              </div>
                                              <div className={`font-mono font-bold text-sm ${t.pnl && t.pnl > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                                  {t.pnl ? `₹${t.pnl.toFixed(0)}` : 'OPEN'}
                                              </div>
                                              <div className="text-[10px] text-slate-500 truncate mt-1 group-hover:text-slate-300">
                                                  {t.entryReason}
                                              </div>
                                          </div>
                                      ))
                                  )}
                              </div>
                          </div>
                      );
                  })}
              </div>
          </div>
      )
  }
  
  // --- Calendar View Logic ---
  const renderCalendar = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });
    
    const days = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(new Date(year, month, i));

    return (
        <div className="animate-fade-in">
             <div className="flex justify-between items-center mb-6 bg-slate-800 p-3 rounded-xl border border-slate-700">
                  <button onClick={prevMonth} className="p-2 hover:bg-slate-700 rounded-full text-slate-400 hover:text-white"><ChevronLeft size={20}/></button>
                  <h3 className="text-white font-bold text-lg">{monthName}</h3>
                  <button onClick={nextMonth} className="p-2 hover:bg-slate-700 rounded-full text-slate-400 hover:text-white"><ChevronRight size={20}/></button>
             </div>

             <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg">
                <div className="grid grid-cols-7 gap-4 text-center mb-4">
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                            <div key={d} className="text-sm text-slate-400 font-bold uppercase tracking-wider">{d}</div>
                        ))}
                </div>
                <div className="grid grid-cols-7 gap-4">
                    {days.map((d, idx) => {
                        if (!d) return <div key={idx} className="bg-transparent aspect-square"></div>;
                        
                        const dateStr = d.toISOString().split('T')[0];
                        const dayTrades = trades.filter(t => t.date === dateStr);
                        const dayPnL = dayTrades.reduce((acc, t) => acc + (t.pnl || 0), 0);
                        const hasTrades = dayTrades.length > 0;
                        const isToday = new Date().toISOString().split('T')[0] === dateStr;
                        
                        let bgClass = "bg-slate-900 border-slate-800 hover:border-slate-600";
                        if (hasTrades) {
                            bgClass = dayPnL > 0 
                                ? "bg-emerald-500/10 border-emerald-500/30 hover:bg-emerald-500/20 hover:border-emerald-500/50" 
                                : dayPnL < 0 
                                    ? "bg-red-500/10 border-red-500/30 hover:bg-red-500/20 hover:border-red-500/50" 
                                    : "bg-slate-700 border-slate-600";
                        }
                        if (isToday) bgClass += " ring-1 ring-indigo-500";

                        return (
                            <div key={idx} className={`aspect-square rounded-xl border flex flex-col items-center justify-center p-1 relative transition cursor-default ${bgClass}`}>
                                <span className={`text-sm ${hasTrades ? 'text-white font-bold' : 'text-slate-600'} ${isToday ? 'text-indigo-400' : ''}`}>{d.getDate()}</span>
                                {hasTrades && (
                                    <span className={`text-xs font-mono font-medium mt-1 ${dayPnL >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                        {dayPnL >= 0 ? '+' : ''}{Math.abs(dayPnL) >= 1000 ? (dayPnL/1000).toFixed(1) + 'k' : dayPnL.toFixed(0)}
                                    </span>
                                )}
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    );
  };

  if (trades.length === 0) {
      return (
          <div className="text-center py-20 animate-fade-in-up">
              <div className="bg-slate-800 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-slate-700 shadow-xl">
                  <Target size={48} className="text-slate-500" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">Journal Empty</h3>
              <p className="text-slate-400 mb-8">Start by logging your first mission or restore a backup.</p>
              
              <div className="flex justify-center gap-4">
                  <button onClick={handleImportClick} className="bg-slate-800 hover:bg-slate-700 text-white px-6 py-2 rounded-lg font-bold transition border border-slate-600 flex items-center">
                     <Upload size={18} className="mr-2"/> Restore Data
                  </button>
                  <button onClick={() => onEdit({} as Trade)} className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2 rounded-lg font-bold transition shadow-lg shadow-indigo-900/50 flex items-center">
                     <Activity size={18} className="mr-2"/> Log First Trade
                  </button>
              </div>
          </div>
      )
  }

  return (
    <div className="space-y-6 pb-20 animate-fade-in">
       {/* Hidden File Input */}
       <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".json,.csv" />
       
       {/* Toolbar */}
       <div className="bg-slate-900/80 backdrop-blur-md p-2 rounded-xl border border-slate-700 sticky top-20 z-20 flex justify-between items-center shadow-lg">
           <div className="flex bg-slate-800/50 p-1 rounded-lg">
               <button onClick={() => setViewMode('list')} className={`px-4 py-2 rounded-md text-xs font-bold transition flex items-center ${viewMode === 'list' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}>
                   <List size={14} className="mr-2"/> List
               </button>
               <button onClick={() => setViewMode('week')} className={`px-4 py-2 rounded-md text-xs font-bold transition flex items-center ${viewMode === 'week' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}>
                   <Grid size={14} className="mr-2"/> Week
               </button>
               <button onClick={() => setViewMode('calendar')} className={`px-4 py-2 rounded-md text-xs font-bold transition flex items-center ${viewMode === 'calendar' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}>
                   <CalendarDays size={14} className="mr-2"/> Month
               </button>
           </div>
           
           <div className="flex gap-2">
               <button onClick={handleExportCSV} className="p-2 text-slate-400 hover:text-emerald-400 bg-slate-800/50 hover:bg-slate-800 rounded-lg border border-transparent hover:border-emerald-500/30 transition" title="Backup (CSV)">
                   <FileSpreadsheet size={18}/>
               </button>
               <button onClick={handleExportJSON} className="p-2 text-slate-400 hover:text-blue-400 bg-slate-800/50 hover:bg-slate-800 rounded-lg border border-transparent hover:border-blue-500/30 transition" title="Backup (JSON)">
                   <FileJson size={18}/>
               </button>
               <button onClick={handleImportClick} className="p-2 text-slate-400 hover:text-indigo-400 bg-slate-800/50 hover:bg-slate-800 rounded-lg border border-transparent hover:border-indigo-500/30 transition" title="Restore Data">
                   <Upload size={18}/>
               </button>
           </div>
       </div>

       {viewMode === 'calendar' && renderCalendar()}
       {viewMode === 'week' && renderWeeklyView()}
       
       {/* List View */}
       {viewMode === 'list' && (Object.entries(tradesByDate) as [string, Trade[]][]).map(([dateStr, dayTrades]) => (
         <div key={dateStr} className="space-y-4">
             <div className="flex items-center justify-between sticky top-[5.5rem] z-10 bg-slate-950/90 backdrop-blur py-2 border-b border-indigo-500/20">
                 <div className="flex items-center gap-3">
                     <div className="w-2 h-8 bg-indigo-500 rounded-r-lg"></div>
                     <h3 className="text-white font-bold text-sm uppercase tracking-wide">{dateStr}</h3>
                     <span className="text-xs text-slate-500 font-mono">({dayTrades.length})</span>
                 </div>
                 
                 <div className="flex items-center gap-2">
                    <span className={`text-xs font-mono font-bold ${dayTrades.reduce((a,t)=>a+(t.pnl||0),0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {dayTrades.reduce((a,t)=>a+(t.pnl||0),0) >= 0 ? '+' : ''}₹{dayTrades.reduce((a,t)=>a+(t.pnl||0),0).toFixed(2)}
                    </span>
                    {dailyAnalysis[dateStr] ? (
                       <button onClick={() => alert(dailyAnalysis[dateStr])} className="text-[10px] bg-emerald-900 text-emerald-300 border border-emerald-700 px-2 py-1 rounded">View Report</button>
                    ) : (
                       <button onClick={() => handleAnalyzeDay(dateStr, dayTrades)} className="text-[10px] bg-indigo-900/50 text-indigo-300 border border-indigo-700 px-2 py-1 rounded flex items-center hover:bg-indigo-900 transition">
                           {analyzingDay === dateStr ? <Bot size={12} className="mr-1 animate-spin"/> : <BrainCircuit size={12} className="mr-1"/>}
                           {analyzingDay === dateStr ? 'Analyzing...' : 'Audit Day'}
                       </button>
                    )}
                 </div>
             </div>

             {dayTrades.map((trade) => {
               const isOpen = trade.outcome === TradeOutcome.OPEN;
               const isWin = trade.outcome === TradeOutcome.WIN;
               const isExpanded = expandedId === trade.id;
               const aiGrade = getAiGrade(trade.aiFeedback);
               const isAnalyzing = analyzingTradeId === trade.id;
               
               // "Outcome Strip" Color
               const stripColor = isOpen ? 'bg-slate-600' : isWin ? 'bg-emerald-500' : trade.outcome === TradeOutcome.BREAK_EVEN ? 'bg-amber-500' : 'bg-red-500';

               return (
                 <div key={trade.id} className={`bg-slate-800 rounded-xl border ${isExpanded ? 'border-indigo-500 ring-1 ring-indigo-500/50' : 'border-slate-700'} overflow-hidden transition-all duration-300 hover:shadow-xl relative pl-2 group`}>
                   
                   {/* Colored Strip */}
                   <div className={`absolute top-0 bottom-0 left-0 w-2 ${stripColor} transition-all`}></div>

                   {/* Main Card */}
                   <div className="p-4 cursor-pointer" onClick={() => toggleExpand(trade.id)}>
                       <div className="flex justify-between items-start">
                           <div className="flex items-start gap-3">
                               <div className={`mt-1 p-2 rounded-lg ${trade.direction === TradeDirection.LONG ? 'bg-blue-500/10 text-blue-400' : 'bg-amber-500/10 text-amber-400'}`}>
                                   {trade.direction === TradeDirection.LONG ? <ArrowUpRight size={20}/> : <ArrowDownRight size={20}/>}
                               </div>
                               <div>
                                   <div className="flex items-center gap-2">
                                       <h4 className="text-white font-bold text-base">{trade.instrument}</h4>
                                       <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${trade.optionType === OptionType.CE ? 'bg-green-900 text-green-300' : trade.optionType === OptionType.PE ? 'bg-red-900 text-red-300' : 'bg-indigo-900 text-indigo-300'}`}>
                                           {trade.optionType}
                                       </span>
                                       {aiGrade && !isExpanded && (
                                            <span className={`ml-2 text-[10px] font-black px-1.5 py-0.5 rounded border shadow-sm ${aiGrade.color}`}>
                                                Grade: {aiGrade.grade}
                                            </span>
                                       )}
                                   </div>
                                   <div className="flex items-center gap-3 mt-1 text-slate-400 text-xs font-mono">
                                       <span className="flex items-center"><Clock size={12} className="mr-1"/> {trade.entryTime}</span>
                                       <span>|</span>
                                       <span>{trade.quantity} Qty</span>
                                       <span>|</span>
                                       <span className={trade.pnl && trade.pnl > 0 ? 'text-emerald-400' : 'text-red-400'}>
                                           {isOpen ? 'HOLDING' : `₹${trade.pnl?.toFixed(2)}`}
                                       </span>
                                   </div>
                               </div>
                           </div>
                           <div className="text-right">
                               {isAnalyzing ? (
                                   <div className="flex items-center gap-2 bg-indigo-900/30 px-3 py-1.5 rounded-full border border-indigo-500/30 animate-pulse">
                                       <BrainCircuit size={14} className="text-indigo-400 animate-spin"/>
                                       <span className="text-[10px] font-bold text-indigo-300 uppercase">Syncing...</span>
                                   </div>
                               ) : (
                                   <div className="flex items-center gap-2">
                                        <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{trade.setupName || 'No Setup'}</div>
                                        {isExpanded ? <ChevronUp size={16} className="text-slate-500"/> : <ChevronDown size={16} className="text-slate-500"/>}
                                   </div>
                               )}
                           </div>
                       </div>
                   </div>

                   {/* Expanded Details */}
                   {isExpanded && (
                       <div className="bg-slate-900/50 border-t border-slate-800 p-5 space-y-6 animate-fade-in">
                           
                           {/* Stats Grid */}
                           <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                               <div className="bg-slate-800 p-3 rounded border border-slate-700">
                                   <span className="text-[10px] text-slate-500 uppercase font-bold">Entry Price</span>
                                   <div className="text-blue-400 font-mono font-bold">₹{trade.entryPrice}</div>
                               </div>
                               <div className="bg-slate-800 p-3 rounded border border-slate-700">
                                   <span className="text-[10px] text-slate-500 uppercase font-bold">Exit Price</span>
                                   <div className="text-blue-400 font-mono font-bold">{trade.exitPrice || '-'}</div>
                               </div>
                               <div className="bg-slate-800 p-3 rounded border border-slate-700">
                                   <span className="text-[10px] text-slate-500 uppercase font-bold">Nifty Spot</span>
                                   <div className="text-emerald-400 font-mono font-bold text-xs">
                                       {trade.niftyEntryPrice || '?'} <span className="text-slate-600">→</span> {trade.niftyExitPrice || '?'}
                                   </div>
                               </div>
                               <div className="bg-slate-800 p-3 rounded border border-slate-700">
                                   <span className="text-[10px] text-slate-500 uppercase font-bold">Points / Time</span>
                                   <div className="text-white font-mono font-bold text-xs">
                                       {trade.spotPointsCaptured} pts <span className="text-slate-600">|</span> {trade.tradeDurationMins}m
                                   </div>
                               </div>
                           </div>

                           {/* Images */}
                           {(trade.chartImage || trade.oiImage) && (
                               <div className="flex gap-4 overflow-x-auto pb-2">
                                   {trade.chartImage && (
                                       <div className="relative group shrink-0">
                                           <p className="text-[10px] text-slate-500 mb-1 uppercase font-bold">Chart</p>
                                           <img src={trade.chartImage} alt="Chart" className="h-24 rounded border border-slate-700 cursor-zoom-in transition hover:scale-105" onClick={() => {const w = window.open(""); w?.document.write(`<img src="${trade.chartImage}" style="max-width:100%"/>`)}}/>
                                       </div>
                                   )}
                                   {trade.oiImage && (
                                       <div className="relative group shrink-0">
                                           <p className="text-[10px] text-slate-500 mb-1 uppercase font-bold">OI Data</p>
                                           <img src={trade.oiImage} alt="OI" className="h-24 rounded border border-slate-700 cursor-zoom-in transition hover:scale-105" onClick={() => {const w = window.open(""); w?.document.write(`<img src="${trade.oiImage}" style="max-width:100%"/>`)}}/>
                                       </div>
                                   )}
                               </div>
                           )}

                           {/* Checklist & Psychology */}
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                               <div>
                                   <h5 className="text-xs font-bold text-indigo-400 uppercase mb-3 flex items-center"><CheckCircle size={14} className="mr-2"/> Strategy Checklist</h5>
                                   <ul className="space-y-2">
                                       {trade.systemChecks && Object.entries(trade.systemChecks).map(([key, val]) => (
                                           <li key={key} className="flex items-center text-xs text-slate-300">
                                               <div className={`w-3 h-3 rounded-full mr-2 ${val ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                                               <span className="capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                                           </li>
                                       ))}
                                       {!trade.systemChecks && <li className="text-xs text-slate-500 italic">No checklist data</li>}
                                   </ul>
                               </div>
                               <div>
                                   <h5 className="text-xs font-bold text-amber-400 uppercase mb-3 flex items-center"><ShieldAlert size={14} className="mr-2"/> Psychology & Tags</h5>
                                   <div className="flex flex-wrap gap-2 mb-3">
                                       {trade.confluences?.map((c,i) => <span key={i} className="text-[10px] px-2 py-1 rounded bg-emerald-900/30 text-emerald-400 border border-emerald-900">{c}</span>)}
                                       {trade.mistakes?.map((m,i) => <span key={i} className="text-[10px] px-2 py-1 rounded bg-red-900/30 text-red-400 border border-red-900">{m}</span>)}
                                   </div>
                                   <div className="flex items-center gap-2 text-xs text-slate-400">
                                       <span>Discipline:</span>
                                       <div className="flex">
                                           {Array.from({length:5}).map((_,i) => (
                                               <Zap key={i} size={12} className={i < (trade.disciplineRating || 0) ? "text-yellow-400 fill-yellow-400" : "text-slate-700"} />
                                           ))}
                                       </div>
                                   </div>
                               </div>
                           </div>
                           
                           {/* Narrative */}
                           <div className="bg-slate-950/30 p-4 rounded-lg border border-slate-800">
                               <p className="text-xs text-slate-400 mb-2"><span className="text-slate-500 font-bold uppercase">Logic:</span> {trade.entryReason}</p>
                               {trade.exitReason && <p className="text-xs text-slate-400"><span className="text-slate-500 font-bold uppercase">Exit:</span> {trade.exitReason}</p>}
                           </div>

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
                               <div className="flex justify-end gap-3 border-t border-slate-800 pt-4">
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
       ))}
    </div>
  );
};

export default TradeList;