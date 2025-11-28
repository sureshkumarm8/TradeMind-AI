import React, { useState, useRef } from 'react';
import { Trade, TradeOutcome, TradeDirection, OptionType, StrategyProfile } from '../types';
import { ChevronDown, ChevronUp, Bot, Edit2, Trash2, ArrowUpRight, ArrowDownRight, Clock, AlertCircle, CheckCircle, Calendar, Sparkles, Target, Upload, FileSpreadsheet, FileJson, TrendingUp, Grid, List, CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { analyzeBatch } from '../services/geminiService';
import { exportToCSV, exportToJSON } from '../services/dataService';

interface TradeListProps {
  trades: Trade[];
  strategyProfile: StrategyProfile;
  apiKey?: string;
  onEdit: (trade: Trade) => void;
  onDelete: (id: string) => void;
  onAnalyze: (trade: Trade) => void;
  onImport: (trades: Trade[]) => void;
  isAnalyzing: boolean;
  readOnly?: boolean;
}

const TradeList: React.FC<TradeListProps> = ({ trades, strategyProfile, apiKey, onEdit, onDelete, onAnalyze, onImport, isAnalyzing, readOnly = false }) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [dailyAnalysis, setDailyAnalysis] = useState<Record<string, string>>({});
  const [analyzingDay, setAnalyzingDay] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'calendar' | 'week'>('list');
  const [currentDate, setCurrentDate] = useState(new Date()); // For Calendar/Week navigation
  const fileInputRef = useRef<HTMLInputElement>(null);

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
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
      <div className="text-center py-24 bg-slate-800/50 rounded-2xl border border-slate-700 border-dashed text-slate-500">
         <div className="mb-6 flex flex-col items-center">
            <div className="bg-slate-800 p-4 rounded-full mb-4">
                <Upload size={32} className="text-slate-600"/>
            </div>
            <p className="text-lg font-medium text-slate-300 mb-2">Your journal is empty</p>
            <p className="text-sm mb-6 max-w-xs mx-auto">Start logging your Nifty trades or import data to get analysis.</p>
            {!readOnly && (
              <>
                <button 
                    onClick={handleImportClick}
                    className="inline-flex items-center text-sm bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2.5 rounded-lg transition font-medium shadow-lg shadow-indigo-900/20"
                >
                    <Upload size={16} className="mr-2"/> Import JSON / CSV
                </button>
                <input 
                    type="file" ref={fileInputRef} onChange={handleFileChange} 
                    className="hidden" accept=".json,.csv"
                />
              </>
            )}
         </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Control Center Toolbar */}
      <div className="bg-slate-800 p-2 rounded-xl border border-slate-700 flex flex-col md:flex-row justify-between items-center gap-4 shadow-lg sticky top-24 z-20">
         
         {/* View Toggles */}
         <div className="flex bg-slate-900 rounded-lg p-1 border border-slate-800 w-full md:w-auto">
             <button 
                onClick={() => setViewMode('list')}
                className={`flex-1 md:flex-none px-4 py-2 rounded-md transition text-sm font-medium flex items-center justify-center gap-2 ${viewMode === 'list' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
             >
                <List size={16} /> List
             </button>
             <button 
                onClick={() => setViewMode('week')}
                className={`flex-1 md:flex-none px-4 py-2 rounded-md transition text-sm font-medium flex items-center justify-center gap-2 ${viewMode === 'week' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
             >
                <CalendarDays size={16} /> Week
             </button>
             <button 
                onClick={() => setViewMode('calendar')}
                className={`flex-1 md:flex-none px-4 py-2 rounded-md transition text-sm font-medium flex items-center justify-center gap-2 ${viewMode === 'calendar' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
             >
                <Grid size={16} /> Month
             </button>
         </div>

         {/* Data Actions */}
         {!readOnly && (
           <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
              <button onClick={handleExportJSON} className="flex items-center text-xs font-bold bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg border border-slate-600 transition whitespace-nowrap" title="Backup Full Data">
                  <FileJson size={14} className="mr-2"/> Backup
              </button>
              <button onClick={handleExportCSV} className="flex items-center text-xs font-bold bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 px-4 py-2 rounded-lg border border-emerald-500/30 transition whitespace-nowrap" title="Export for Excel">
                  <FileSpreadsheet size={14} className="mr-2"/> Excel
              </button>
              <button onClick={handleImportClick} className="flex items-center text-xs font-bold bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 px-4 py-2 rounded-lg border border-blue-500/30 transition whitespace-nowrap">
                  <Upload size={14} className="mr-2"/> Import
              </button>
              <input 
                  type="file" ref={fileInputRef} onChange={handleFileChange} 
                  className="hidden" accept=".json,.csv"
              />
           </div>
         )}
      </div>

      {viewMode === 'calendar' && renderCalendar()}
      {viewMode === 'week' && renderWeeklyView()}
      
      {viewMode === 'list' && (
         // List View
         <>
         {(Object.entries(tradesByDate) as [string, Trade[]][]).map(([dateStr, dayTrades]) => {
            const dayPnL = dayTrades.reduce((acc, t) => acc + (t.pnl || 0), 0);
            
            return (
              <div key={dateStr} className="space-y-3 animate-fade-in-up">
                 {/* Day Header */}
                 <div className="flex flex-col md:flex-row md:items-center justify-between bg-slate-800/80 backdrop-blur-sm p-4 rounded-xl border border-slate-700 shadow-sm sticky top-44 z-10">
                    <div className="flex items-center gap-3 mb-3 md:mb-0">
                       <div className="bg-blue-500/20 p-2 rounded-lg text-blue-400">
                          <Calendar size={20} />
                       </div>
                       <div>
                           <h3 className="text-slate-200 font-bold text-lg">{dateStr}</h3>
                           <span className="text-xs text-slate-500 font-medium">
                              {dayTrades.length} Trades Executed
                           </span>
                       </div>
                    </div>
                    
                    <div className="flex items-center gap-6">
                       <div className="text-right">
                          <span className={`font-mono font-bold text-xl ${dayPnL >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                             {dayPnL >= 0 ? '+' : ''}₹{dayPnL.toFixed(2)}
                          </span>
                          <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-bold">Net PnL</span>
                       </div>
                       
                       {!readOnly && (
                         <button 
                           onClick={() => handleAnalyzeDay(dateStr, dayTrades)}
                           disabled={!!analyzingDay}
                           className="flex items-center text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg transition shadow-lg shadow-indigo-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
                         >
                           {analyzingDay === dateStr ? (
                              <span className="animate-pulse flex items-center"><Bot size={14} className="mr-2"/> Analyzing...</span>
                           ) : (
                              <>
                                <Sparkles size={14} className="mr-2" /> AI Coach
                              </>
                           )}
                         </button>
                       )}
                    </div>
                 </div>

                 {/* Daily Analysis Result */}
                 {dailyAnalysis[dateStr] && (
                   <div className="bg-gradient-to-br from-slate-900 to-indigo-950/40 border border-indigo-500/30 p-6 rounded-xl mb-4 shadow-xl relative overflow-hidden animate-fade-in">
                     <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                        <Bot size={120} />
                     </div>
                     <h4 className="text-indigo-300 font-bold text-sm uppercase mb-4 flex items-center tracking-wider">
                        <Bot size={16} className="mr-2" /> Daily Performance Report
                     </h4>
                     
                     <div className="prose prose-sm prose-invert max-w-none text-slate-300">
                        <div className="whitespace-pre-wrap font-light leading-relaxed">
                            {dailyAnalysis[dateStr]}
                        </div>
                     </div>
                   </div>
                 )}

                 {/* Trades for this day */}
                 <div className="space-y-3 pl-2 md:pl-4 border-l-2 border-slate-800">
                   {dayTrades.map(trade => (
                    <div key={trade.id} className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden transition-all duration-200 hover:border-slate-500 hover:shadow-lg group">
                      {/* Trade Summary */}
                      <div 
                        className="p-4 flex flex-col sm:flex-row sm:items-center justify-between cursor-pointer gap-4 sm:gap-0"
                        onClick={() => toggleExpand(trade.id)}
                      >
                        <div className="flex items-center space-x-4">
                          <div className={`p-3 rounded-xl flex-shrink-0 transition-colors ${trade.direction === TradeDirection.LONG ? 'bg-blue-500/10 text-blue-400 group-hover:bg-blue-500/20' : 'bg-amber-500/10 text-amber-400 group-hover:bg-amber-500/20'}`}>
                            {trade.direction === TradeDirection.LONG ? <ArrowUpRight size={24} strokeWidth={3} /> : <ArrowDownRight size={24} strokeWidth={3} />}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-bold text-white text-lg tracking-tight">
                                {trade.instrument}
                              </h3>
                                {trade.strikePrice && <span className="bg-slate-700 px-2 py-0.5 rounded text-slate-200 font-mono text-xs border border-slate-600">{trade.strikePrice}</span>}
                                {trade.optionType && trade.optionType !== OptionType.SPOT && (
                                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${trade.optionType === OptionType.CE ? 'bg-green-900/60 text-green-400 border border-green-800' : 'bg-red-900/60 text-red-400 border border-red-800'}`}>
                                    {trade.optionType}
                                  </span>
                                )}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                                 {trade.timeframe && <span className="text-[10px] text-slate-400 flex items-center gap-1"><Clock size={10}/> {trade.timeframe}</span>}
                                 {trade.spotPointsCaptured ? <span className="text-[10px] text-indigo-400 font-medium flex items-center gap-1"><Target size={10}/> {trade.spotPointsCaptured} pts</span> : null}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end sm:space-x-8 w-full sm:w-auto">
                          <div className="text-left sm:text-right">
                            {trade.outcome !== TradeOutcome.OPEN ? (
                              <>
                                <p className={`font-mono font-bold text-lg ${trade.pnl && trade.pnl > 0 ? 'text-emerald-400' : trade.pnl && trade.pnl < 0 ? 'text-red-400' : 'text-slate-400'}`}>
                                  {trade.pnl && trade.pnl > 0 ? '+' : ''}₹{trade.pnl?.toFixed(2)}
                                </p>
                                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">{trade.outcome}</p>
                              </>
                            ) : (
                              <span className="px-3 py-1 bg-slate-700 text-slate-300 rounded-full text-xs font-medium border border-slate-600">OPEN</span>
                            )}
                          </div>
                          <div className="text-slate-600 group-hover:text-slate-400 transition">
                            {expandedId === trade.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                          </div>
                        </div>
                      </div>

                      {/* Expanded Details */}
                      {expandedId === trade.id && (
                        <div className="bg-slate-900/50 p-6 border-t border-slate-700 animate-fade-in">
                          {/* System Adherence Badge */}
                          <div className="mb-6 bg-slate-800 p-4 rounded-xl border border-slate-700 grid grid-cols-2 md:grid-cols-4 gap-4">
                             <div className="flex items-center gap-3">
                                <div className="bg-indigo-900/50 p-2 rounded-lg text-indigo-400"><Clock size={16}/></div>
                                <div>
                                    <span className="text-[10px] text-slate-500 uppercase font-bold block">Session Time</span>
                                    <span className="text-xs text-white font-mono">{trade.entryTime} - {trade.exitTime}</span>
                                </div>
                             </div>
                             <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${trade.systemChecks?.waitedForOpen ? 'bg-emerald-900/30 text-emerald-400' : 'bg-red-900/30 text-red-400'}`}>
                                    {trade.systemChecks?.waitedForOpen ? <CheckCircle size={16}/> : <AlertCircle size={16}/>}
                                </div>
                                <div>
                                    <span className="text-[10px] text-slate-500 uppercase font-bold block">Wait 15m</span>
                                    <span className={`text-xs ${trade.systemChecks?.waitedForOpen ? 'text-emerald-400' : 'text-red-400'}`}>{trade.systemChecks?.waitedForOpen ? 'Passed' : 'Failed'}</span>
                                </div>
                             </div>
                             <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${trade.systemChecks?.checkedSensibullOI ? 'bg-emerald-900/30 text-emerald-400' : 'bg-red-900/30 text-red-400'}`}>
                                    {trade.systemChecks?.checkedSensibullOI ? <CheckCircle size={16}/> : <AlertCircle size={16}/>}
                                </div>
                                <div>
                                    <span className="text-[10px] text-slate-500 uppercase font-bold block">OI Check</span>
                                    <span className={`text-xs ${trade.systemChecks?.checkedSensibullOI ? 'text-emerald-400' : 'text-red-400'}`}>{trade.systemChecks?.checkedSensibullOI ? 'Verified' : 'Skipped'}</span>
                                </div>
                             </div>
                             <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${trade.systemChecks?.exitTimeLimit ? 'bg-emerald-900/30 text-emerald-400' : 'bg-red-900/30 text-red-400'}`}>
                                    {trade.systemChecks?.exitTimeLimit ? <CheckCircle size={16}/> : <AlertCircle size={16}/>}
                                </div>
                                <div>
                                    <span className="text-[10px] text-slate-500 uppercase font-bold block">Time Limit</span>
                                    <span className={`text-xs ${trade.systemChecks?.exitTimeLimit ? 'text-emerald-400' : 'text-red-400'}`}>{trade.tradeDurationMins} mins</span>
                                </div>
                             </div>
                          </div>

                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {/* Details Column */}
                            <div className="space-y-6">
                              
                              {/* Nifty Spot Grid */}
                              <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
                                 <h4 className="text-slate-400 text-xs uppercase font-bold mb-3 flex items-center">
                                    <TrendingUp size={14} className="mr-2 text-indigo-400"/> Nifty 50 Underlying
                                 </h4>
                                 <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-slate-900/50 p-2 rounded border border-slate-800">
                                       <span className="text-slate-500 text-[10px] uppercase font-bold block mb-1">Entry Spot</span>
                                       <span className="text-emerald-400 font-mono text-sm font-bold">{trade.niftyEntryPrice || 'N/A'}</span>
                                    </div>
                                    <div className="bg-slate-900/50 p-2 rounded border border-slate-800">
                                       <span className="text-slate-500 text-[10px] uppercase font-bold block mb-1">Exit Spot</span>
                                       <span className="text-emerald-400 font-mono text-sm font-bold">{trade.niftyExitPrice || 'N/A'}</span>
                                    </div>
                                 </div>
                              </div>

                              <div className="grid grid-cols-4 gap-2 text-sm bg-slate-800 p-4 rounded-lg border border-slate-700">
                                <div className="col-span-2 sm:col-span-1">
                                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Premium Entry</span>
                                  <span className="text-white font-mono">{trade.entryPrice}</span>
                                </div>
                                 <div className="col-span-2 sm:col-span-1">
                                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Premium Exit</span>
                                  <span className="text-white font-mono">{trade.exitPrice || '-'}</span>
                                </div>
                                 <div className="col-span-2 sm:col-span-1">
                                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Qty</span>
                                  <span className="text-white font-mono">{trade.quantity}</span>
                                </div>
                                 <div className="col-span-2 sm:col-span-1">
                                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Result</span>
                                  <span className={`font-bold ${trade.outcome === TradeOutcome.WIN ? 'text-emerald-400' : trade.outcome === TradeOutcome.LOSS ? 'text-red-400' : 'text-slate-300'}`}>{trade.outcome}</span>
                                </div>
                              </div>

                              <div className="space-y-4">
                                 {trade.confluences && trade.confluences.length > 0 && (
                                   <div>
                                     <h4 className="text-slate-400 text-xs uppercase font-bold mb-2 flex items-center">
                                        <CheckCircle size={12} className="mr-1 text-emerald-500"/> Confluences
                                     </h4>
                                     <div className="flex flex-wrap gap-2">
                                        {trade.confluences.map(c => (
                                          <span key={c} className="text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-1 rounded">
                                            {c}
                                          </span>
                                        ))}
                                     </div>
                                   </div>
                                 )}

                                 {trade.mistakes && trade.mistakes.length > 0 && (
                                   <div>
                                     <h4 className="text-slate-400 text-xs uppercase font-bold mb-2 flex items-center">
                                        <AlertCircle size={12} className="mr-1 text-red-500"/> Mistakes
                                     </h4>
                                     <div className="flex flex-wrap gap-2">
                                        {trade.mistakes.map(m => (
                                          <span key={m} className="text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-1 rounded">
                                            {m}
                                          </span>
                                        ))}
                                     </div>
                                   </div>
                                 )}
                              </div>
                            </div>

                            {/* Analysis Column */}
                            <div className="space-y-4">
                              <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
                                <h4 className="text-slate-400 text-xs uppercase font-bold mb-2">Pre-Market & Context</h4>
                                <p className="text-slate-300 text-sm leading-relaxed italic border-l-2 border-indigo-500 pl-3">
                                   {trade.openingType && <span className="text-indigo-400 font-bold text-xs uppercase mr-2">[{trade.openingType}]</span>}
                                   {trade.marketContext}
                                </p>
                              </div>
                               <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
                                <h4 className="text-slate-400 text-xs uppercase font-bold mb-2">Entry Reason</h4>
                                <p className="text-slate-300 text-sm leading-relaxed">{trade.entryReason}</p>
                              </div>
                              
                              <div className="flex items-center gap-6 text-sm text-slate-400 pt-2">
                                  <div className="flex flex-col">
                                      <span className="text-[10px] uppercase font-bold">Discipline</span>
                                      <div className="flex gap-1 mt-1">
                                          {[1,2,3,4,5].map(i => (
                                              <div key={i} className={`w-2 h-2 rounded-full ${i <= trade.disciplineRating ? 'bg-blue-400' : 'bg-slate-700'}`}></div>
                                          ))}
                                      </div>
                                  </div>
                                  <div className="flex flex-col">
                                      <span className="text-[10px] uppercase font-bold">Emotional State</span>
                                      <span className="text-white font-medium">{trade.emotionalState}</span>
                                  </div>
                              </div>
                            </div>
                          </div>

                          {/* Single Trade AI Section */}
                          <div className="mt-8 bg-slate-950 rounded-xl p-6 border border-slate-800 relative overflow-hidden group">
                             <div className="flex items-center justify-between mb-4 relative z-10">
                                <div className="flex items-center text-indigo-300">
                                   <div className="bg-indigo-900/30 p-2 rounded-lg mr-3">
                                       <Bot size={20} />
                                   </div>
                                   <span className="font-bold text-sm uppercase tracking-wide">Coach's Reality Check</span>
                                </div>
                                {!trade.aiFeedback && !readOnly && (
                                  <button 
                                    onClick={() => onAnalyze(trade)}
                                    disabled={isAnalyzing}
                                    className="text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg transition disabled:opacity-50 shadow-lg shadow-indigo-900/20"
                                  >
                                    {isAnalyzing ? 'Checking History...' : 'Run Reality Check'}
                                  </button>
                                )}
                             </div>
                             {trade.aiFeedback ? (
                               <div className="text-sm text-slate-300 leading-7 whitespace-pre-wrap font-sans relative z-10 border-l-2 border-indigo-500/50 pl-4">
                                 {trade.aiFeedback}
                               </div>
                             ) : (
                               <p className="text-xs text-slate-500 italic relative z-10 ml-12">
                                 AI will verify the actual Nifty chart action during {trade.entryTime}-{trade.exitTime} to validate your entry logic.
                               </p>
                             )}
                          </div>

                          {/* Actions */}
                          {!readOnly && (
                            <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-slate-800/50">
                              <button onClick={() => onEdit(trade)} className="flex items-center px-4 py-2 text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition">
                                <Edit2 size={14} className="mr-2" /> Edit Log
                              </button>
                              <button onClick={() => onDelete(trade.id)} className="flex items-center px-4 py-2 text-xs font-bold text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded-lg transition">
                                <Trash2 size={14} className="mr-2" /> Delete
                              </button>
                            </div>
                          )}

                        </div>
                      )}
                    </div>
                   ))}
                 </div>
              </div>
            );
          })}
         </>
      )}
    </div>
  );
};

export default TradeList;