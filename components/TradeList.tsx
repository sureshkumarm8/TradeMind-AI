import React, { useState, useRef } from 'react';
import { Trade, TradeOutcome, TradeDirection, OptionType } from '../types';
import { ChevronDown, ChevronUp, Bot, Edit2, Trash2, ArrowUpRight, ArrowDownRight, Clock, AlertCircle, CheckCircle, Calendar, Sparkles, Target, Download, Upload, FileSpreadsheet, FileJson, TrendingUp } from 'lucide-react';
import { analyzeBatch } from '../services/geminiService';
import { exportToCSV, exportToJSON } from '../services/dataService';

interface TradeListProps {
  trades: Trade[];
  onEdit: (trade: Trade) => void;
  onDelete: (id: string) => void;
  onAnalyze: (trade: Trade) => void;
  onImport: (trades: Trade[]) => void;
  isAnalyzing: boolean;
}

const TradeList: React.FC<TradeListProps> = ({ trades, onEdit, onDelete, onAnalyze, onImport, isAnalyzing }) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [dailyAnalysis, setDailyAnalysis] = useState<Record<string, string>>({});
  const [analyzingDay, setAnalyzingDay] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const sortedTrades = [...trades].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Group trades by Date string
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
    const result = await analyzeBatch(dayTrades, `Single Trading Day (${dateStr})`);
    setDailyAnalysis(prev => ({ ...prev, [dateStr]: result }));
    setAnalyzingDay(null);
  };
  
  const handleExportCSV = () => exportToCSV(trades);
  const handleExportJSON = () => exportToJSON(trades);
  
  const handleImportClick = () => fileInputRef.current?.click();
  
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
      const { importData } = await import('../services/dataService');
      const importedTrades = await importData(file);
      if (confirm(`Found ${importedTrades.length} trades in file. This will merge with your existing data. Continue?`)) {
          onImport(importedTrades);
      }
    } catch (error) {
      alert("Failed to import file: " + error);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  if (trades.length === 0) {
    return (
      <div className="text-center py-20 bg-slate-800 rounded-xl border border-slate-700 text-slate-500">
         <div className="mb-6">
            <p className="mb-4">No trades logged yet. Start your Nifty journal today.</p>
            <button 
                onClick={handleImportClick}
                className="inline-flex items-center text-sm text-indigo-400 hover:text-indigo-300 border border-indigo-500/30 px-4 py-2 rounded-lg transition"
            >
                <Upload size={16} className="mr-2"/> Import Data
            </button>
            <input 
                type="file" ref={fileInputRef} onChange={handleFileChange} 
                className="hidden" accept=".json,.csv"
            />
         </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Data Management Bar */}
      <div className="flex justify-end gap-3 mb-2">
         <button onClick={handleExportJSON} className="flex items-center text-xs bg-slate-800 text-slate-400 hover:text-white px-3 py-1.5 rounded border border-slate-700 transition" title="Backup Full Data">
            <FileJson size={14} className="mr-2"/> Backup JSON
         </button>
         <button onClick={handleExportCSV} className="flex items-center text-xs bg-emerald-900/30 text-emerald-400 hover:text-emerald-300 px-3 py-1.5 rounded border border-emerald-500/30 transition" title="Export for Excel">
            <FileSpreadsheet size={14} className="mr-2"/> Export Excel
         </button>
         <button onClick={handleImportClick} className="flex items-center text-xs bg-indigo-900/30 text-indigo-400 hover:text-indigo-300 px-3 py-1.5 rounded border border-indigo-500/30 transition">
            <Upload size={14} className="mr-2"/> Import
         </button>
         <input 
            type="file" ref={fileInputRef} onChange={handleFileChange} 
            className="hidden" accept=".json,.csv"
         />
      </div>

      {(Object.entries(tradesByDate) as [string, Trade[]][]).map(([dateStr, dayTrades]) => {
        const dayPnL = dayTrades.reduce((acc, t) => acc + (t.pnl || 0), 0);
        
        return (
          <div key={dateStr} className="space-y-3">
             {/* Day Header */}
             <div className="flex flex-col md:flex-row md:items-center justify-between bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
                <div className="flex items-center gap-3 mb-3 md:mb-0">
                   <Calendar size={18} className="text-blue-400" />
                   <h3 className="text-slate-200 font-semibold">{dateStr}</h3>
                   <span className="text-xs text-slate-500 bg-slate-800 px-2 py-1 rounded-full border border-slate-700">
                      {dayTrades.length} Trades
                   </span>
                </div>
                
                <div className="flex items-center gap-6">
                   <div className="text-right">
                      <span className={`font-mono font-bold ${dayPnL >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                         {dayPnL >= 0 ? '+' : ''}₹{dayPnL.toFixed(2)}
                      </span>
                      <span className="text-xs text-slate-500 block">Net PnL</span>
                   </div>
                   
                   <button 
                     onClick={() => handleAnalyzeDay(dateStr, dayTrades)}
                     disabled={!!analyzingDay}
                     className="flex items-center text-xs bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 px-3 py-2 rounded-lg border border-indigo-500/30 transition"
                   >
                     {analyzingDay === dateStr ? (
                        <span className="animate-pulse">Thinking...</span>
                     ) : (
                        <>
                          <Sparkles size={14} className="mr-2" /> Daily Coach
                        </>
                     )}
                   </button>
                </div>
             </div>

             {/* Daily Analysis Result (Formatted Card) */}
             {dailyAnalysis[dateStr] && (
               <div className="bg-gradient-to-br from-slate-900 to-indigo-950/30 border border-indigo-500/30 p-6 rounded-xl mb-4 shadow-xl relative overflow-hidden animate-fade-in">
                 <div className="absolute top-0 right-0 p-4 opacity-5">
                    <Bot size={100} />
                 </div>
                 <h4 className="text-indigo-300 font-bold text-sm uppercase mb-4 flex items-center tracking-wider">
                    <Bot size={16} className="mr-2" /> Daily Performance Report
                 </h4>
                 
                 {/* Render content as distinct blocks for better readability */}
                 <div className="prose prose-sm prose-invert max-w-none text-slate-300">
                    <div className="whitespace-pre-wrap font-light leading-relaxed">
                        {dailyAnalysis[dateStr]}
                    </div>
                 </div>
               </div>
             )}

             {/* Trades for this day */}
             <div className="space-y-3">
               {dayTrades.map(trade => (
                <div key={trade.id} className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden transition-all duration-200 hover:border-slate-600">
                  {/* Trade Summary */}
                  <div 
                    className="p-4 flex flex-col sm:flex-row sm:items-center justify-between cursor-pointer gap-4 sm:gap-0"
                    onClick={() => toggleExpand(trade.id)}
                  >
                    <div className="flex items-center space-x-4">
                      <div className={`p-2 rounded-lg flex-shrink-0 ${trade.direction === TradeDirection.LONG ? 'bg-blue-500/10 text-blue-400' : 'bg-amber-500/10 text-amber-400'}`}>
                        {trade.direction === TradeDirection.LONG ? <ArrowUpRight size={24} /> : <ArrowDownRight size={24} />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-white text-lg">
                            {trade.instrument}
                            {trade.strikePrice && <span className="ml-2 text-slate-300 font-mono">{trade.strikePrice}</span>}
                            {trade.optionType && trade.optionType !== OptionType.SPOT && (
                              <span className={`ml-1 text-xs px-1.5 py-0.5 rounded ${trade.optionType === OptionType.CE ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'}`}>
                                {trade.optionType}
                              </span>
                            )}
                          </h3>
                          <div className="flex items-center gap-2">
                             {trade.timeframe && <span className="text-xs bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded flex items-center gap-1"><Clock size={10}/> {trade.timeframe}</span>}
                             {trade.spotPointsCaptured ? <span className="text-xs bg-indigo-900/50 text-indigo-300 px-1.5 py-0.5 rounded flex items-center gap-1"><Target size={10}/> {trade.spotPointsCaptured} pts</span> : null}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end sm:space-x-6 w-full sm:w-auto">
                      <div className="text-left sm:text-right">
                        {trade.outcome !== TradeOutcome.OPEN ? (
                          <>
                            <p className={`font-mono font-bold text-lg ${trade.pnl && trade.pnl > 0 ? 'text-emerald-400' : trade.pnl && trade.pnl < 0 ? 'text-red-400' : 'text-slate-400'}`}>
                              {trade.pnl && trade.pnl > 0 ? '+' : ''}₹{trade.pnl?.toFixed(2)}
                            </p>
                            <p className="text-xs text-slate-500 uppercase font-semibold">{trade.outcome}</p>
                          </>
                        ) : (
                          <span className="px-3 py-1 bg-slate-700 text-slate-300 rounded-full text-xs font-medium">OPEN POSITION</span>
                        )}
                      </div>
                      <div className="text-slate-500 ml-4">
                        {expandedId === trade.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {expandedId === trade.id && (
                    <div className="bg-slate-850 p-6 border-t border-slate-700">
                      {/* System Adherence Badge */}
                      <div className="mb-6 bg-slate-900/50 p-3 rounded-lg border border-slate-700 grid grid-cols-2 md:grid-cols-4 gap-4">
                         <div className="flex items-center gap-2">
                            <Clock size={14} className="text-indigo-400" />
                            <span className="text-xs text-slate-300">
                                {trade.entryTime} - {trade.exitTime}
                            </span>
                         </div>
                         <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${trade.systemChecks?.waitedForOpen ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                            <span className="text-xs text-slate-400">Waited 15m Open</span>
                         </div>
                         <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${trade.systemChecks?.checkedSensibullOI ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                            <span className="text-xs text-slate-400">Sensibull OI</span>
                         </div>
                         <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${trade.systemChecks?.exitTimeLimit ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                            <span className="text-xs text-slate-400">Checkpt {'<'}30m ({trade.tradeDurationMins}m)</span>
                         </div>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Details Column */}
                        <div className="space-y-6">
                          
                          {/* Nifty Spot Grid */}
                          <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-800">
                             <h4 className="text-slate-500 text-xs uppercase font-semibold mb-3 flex items-center">
                                <TrendingUp size={12} className="mr-2"/> Nifty 50 Spot
                             </h4>
                             <div className="grid grid-cols-2 gap-4">
                                <div>
                                   <span className="text-slate-500 text-xs block">Entry Spot</span>
                                   <span className="text-emerald-400 font-mono text-sm">{trade.niftyEntryPrice || 'N/A'}</span>
                                </div>
                                <div>
                                   <span className="text-slate-500 text-xs block">Exit Spot</span>
                                   <span className="text-emerald-400 font-mono text-sm">{trade.niftyExitPrice || 'N/A'}</span>
                                </div>
                             </div>
                          </div>

                          <div className="grid grid-cols-4 gap-2 text-sm bg-slate-900/50 p-4 rounded-lg border border-slate-800">
                            <div className="col-span-2 sm:col-span-1">
                              <span className="text-slate-500 block text-xs uppercase">Entry</span>
                              <span className="text-slate-200 font-mono">{trade.entryPrice}</span>
                            </div>
                             <div className="col-span-2 sm:col-span-1">
                              <span className="text-slate-500 block text-xs uppercase">Exit</span>
                              <span className="text-slate-200 font-mono">{trade.exitPrice || '-'}</span>
                            </div>
                             <div className="col-span-2 sm:col-span-1">
                              <span className="text-slate-500 block text-xs uppercase">Qty</span>
                              <span className="text-slate-200 font-mono">{trade.quantity}</span>
                            </div>
                             <div className="col-span-2 sm:col-span-1">
                              <span className="text-slate-500 block text-xs uppercase">Outcome</span>
                              <span className="text-slate-200 font-mono">{trade.outcome}</span>
                            </div>
                          </div>

                          <div className="space-y-3">
                             {trade.confluences && trade.confluences.length > 0 && (
                               <div>
                                 <h4 className="text-slate-500 text-xs uppercase font-semibold mb-2 flex items-center">
                                    <CheckCircle size={12} className="mr-1 text-emerald-500"/> Confluences
                                 </h4>
                                 <div className="flex flex-wrap gap-2">
                                    {trade.confluences.map(c => (
                                      <span key={c} className="text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-1 rounded">
                                        {c}
                                      </span>
                                    ))}
                                 </div>
                               </div>
                             )}

                             {trade.mistakes && trade.mistakes.length > 0 && (
                               <div>
                                 <h4 className="text-slate-500 text-xs uppercase font-semibold mb-2 flex items-center">
                                    <AlertCircle size={12} className="mr-1 text-red-500"/> Mistakes
                                 </h4>
                                 <div className="flex flex-wrap gap-2">
                                    {trade.mistakes.map(m => (
                                      <span key={m} className="text-xs bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-1 rounded">
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
                          <div className="bg-slate-900/30 p-4 rounded-lg border border-slate-800/50">
                            <h4 className="text-slate-400 text-xs uppercase font-semibold mb-2">Pre-Market & Context</h4>
                            <p className="text-slate-300 text-sm leading-relaxed italic">
                               <span className="text-indigo-400 font-bold text-xs bg-indigo-900/30 px-1 rounded mr-2">{trade.openingType}</span>
                               "{trade.marketContext}"
                            </p>
                          </div>
                           <div>
                            <h4 className="text-slate-400 text-xs uppercase font-semibold mb-1">Entry Reason</h4>
                            <p className="text-slate-300 text-sm leading-relaxed">{trade.entryReason}</p>
                          </div>
                          
                          <div className="flex items-center gap-4 text-sm text-slate-400 pt-2 border-t border-slate-800">
                              <span>Discipline: <span className="text-white">{trade.disciplineRating}/5</span></span>
                              <span>Mood: <span className="text-white">{trade.emotionalState}</span></span>
                          </div>
                        </div>
                      </div>

                      {/* Single Trade AI Section */}
                      <div className="mt-6 bg-slate-900 rounded-lg p-5 border border-slate-700/50 relative overflow-hidden">
                         <div className="flex items-center justify-between mb-4 relative z-10">
                            <div className="flex items-center text-slate-300">
                               <Bot size={18} className="mr-2" />
                               <span className="font-bold text-xs uppercase tracking-wide">Coach's Reality Check (Live Data)</span>
                            </div>
                            {!trade.aiFeedback && (
                              <button 
                                onClick={() => onAnalyze(trade)}
                                disabled={isAnalyzing}
                                className="text-xs bg-slate-700 hover:bg-slate-600 text-white px-3 py-1.5 rounded-lg transition disabled:opacity-50 font-medium"
                              >
                                {isAnalyzing ? 'Searching Market Data...' : 'Analyze Market Data'}
                              </button>
                            )}
                         </div>
                         {trade.aiFeedback ? (
                           <div className="text-sm text-slate-300 leading-7 whitespace-pre-wrap font-sans relative z-10">
                             {trade.aiFeedback}
                           </div>
                         ) : (
                           <p className="text-xs text-slate-500 italic relative z-10">
                             Click analyze to compare your trade with the actual Nifty market data for this time slot.
                           </p>
                         )}
                      </div>

                      {/* Actions */}
                      <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-slate-800">
                        <button onClick={() => onEdit(trade)} className="flex items-center px-4 py-2 text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-700 rounded transition">
                          <Edit2 size={14} className="mr-2" /> Edit Log
                        </button>
                        <button onClick={() => onDelete(trade.id)} className="flex items-center px-4 py-2 text-xs font-medium text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded transition">
                          <Trash2 size={14} className="mr-2" /> Delete
                        </button>
                      </div>

                    </div>
                  )}
                </div>
               ))}
             </div>
          </div>
        );
      })}
    </div>
  );
};

export default TradeList;