
import React, { useState, useMemo, useEffect } from 'react';
import { Trade, StrategyProfile, TradeOutcome, TradeDirection, SyncStatus } from '../types';
import { analyzeTradeWithAI } from '../services/geminiService';
import { Search, Filter, Trash2, Edit2, BrainCircuit, ExternalLink, RefreshCw, Upload, Download, Loader2, ArrowRight } from 'lucide-react';
import { shareBackupData } from '../services/dataService';

interface TradeListProps {
  trades: Trade[];
  strategyProfile: StrategyProfile;
  apiKey?: string;
  onEdit: (trade: Trade) => void;
  onDelete: (id: string) => void;
  onAnalyze: (trade: Trade) => void;
  onDeleteAiAnalysis: (id: string) => void;
  onImport: (trades: Trade[]) => void;
  analyzingTradeId: string | null;
  onSyncPush?: () => void;
  isSyncing?: boolean;
  highlightedTradeId?: string | null;
}

const getStartOfWeek = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is sunday
    return new Date(d.setDate(diff));
};

const TradeList: React.FC<TradeListProps> = ({ 
    trades, strategyProfile, apiKey, onEdit, onDelete, onAnalyze, 
    onDeleteAiAnalysis, onImport, analyzingTradeId, onSyncPush, isSyncing, highlightedTradeId 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  
  // Basic filtering logic
  const filteredTrades = useMemo(() => {
    return trades.filter(t => {
        const matchesSearch = t.instrument.toLowerCase().includes(searchTerm.toLowerCase()) || 
                              t.setupName?.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesSearch;
    }).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [trades, searchTerm]);

  // Effect to scroll to highlighted trade
  useEffect(() => {
    if (highlightedTradeId) {
        const element = document.getElementById(`trade-${highlightedTradeId}`);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            element.classList.add('ring-2', 'ring-indigo-500');
            setTimeout(() => element.classList.remove('ring-2', 'ring-indigo-500'), 3000);
        }
    }
  }, [highlightedTradeId, filteredTrades]);

  // Helper to render AI analysis badge
  const renderAiBadge = (trade: Trade) => {
      if (trade.aiFeedback) {
          let grade = 0;
          try { grade = JSON.parse(trade.aiFeedback).grade; } catch(e) {}
          const color = grade >= 80 ? 'text-emerald-400' : grade >= 50 ? 'text-amber-400' : 'text-red-400';
          return (
              <div className={`flex items-center gap-1 text-[10px] font-bold uppercase ${color} bg-slate-900 px-2 py-1 rounded border border-slate-700`}>
                  <BrainCircuit size={10} /> Grade: {grade}/100
              </div>
          );
      }
      return null;
  };

  return (
    <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-900 p-4 rounded-xl border border-slate-800">
            <div className="relative w-full md:w-96">
                <Search className="absolute left-3 top-3 text-slate-500" size={18} />
                <input 
                    type="text" 
                    placeholder="Search instrument, setup..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-10 pr-4 py-2.5 text-sm text-white focus:border-indigo-500 outline-none"
                />
            </div>
            <div className="flex gap-2 w-full md:w-auto">
                 {onSyncPush && (
                     <button onClick={onSyncPush} disabled={isSyncing} className="p-2.5 bg-slate-800 hover:bg-indigo-900/30 text-indigo-400 rounded-lg border border-slate-700 transition disabled:opacity-50">
                        <RefreshCw size={18} className={isSyncing ? "animate-spin" : ""}/>
                     </button>
                 )}
                 <button onClick={() => shareBackupData(trades, strategyProfile)} className="flex-1 md:flex-none px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold uppercase rounded-lg border border-slate-700 transition flex items-center justify-center gap-2">
                    <Download size={16}/> Export
                 </button>
            </div>
        </div>

        <div className="space-y-4">
            {filteredTrades.map((trade) => (
                <div key={trade.id} id={`trade-${trade.id}`} className="bg-slate-900 rounded-xl border border-slate-800 p-4 md:p-6 hover:border-slate-600 transition group relative overflow-hidden">
                    <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${trade.pnl && trade.pnl > 0 ? 'bg-emerald-500/10 text-emerald-400' : trade.pnl && trade.pnl < 0 ? 'bg-red-500/10 text-red-400' : 'bg-slate-700 text-slate-400'}`}>
                                {trade.instrument.substring(0, 1)}
                            </div>
                            <div>
                                <h3 className="font-bold text-white text-sm flex items-center gap-2">
                                    {trade.instrument} {trade.strikePrice} {trade.optionType}
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded border uppercase ${trade.direction === TradeDirection.LONG ? 'border-blue-500/30 text-blue-400 bg-blue-500/10' : 'border-amber-500/30 text-amber-400 bg-amber-500/10'}`}>
                                        {trade.direction}
                                    </span>
                                </h3>
                                <p className="text-xs text-slate-500 font-mono mt-0.5">{trade.date} | {trade.entryTime} - {trade.exitTime}</p>
                            </div>
                        </div>
                        <div className="text-right">
                             <div className={`text-lg font-mono font-bold ${trade.pnl && trade.pnl > 0 ? 'text-emerald-400' : trade.pnl && trade.pnl < 0 ? 'text-red-400' : 'text-slate-500'}`}>
                                {trade.pnl !== undefined ? `₹${trade.pnl}` : '---'}
                             </div>
                             {renderAiBadge(trade)}
                        </div>
                    </div>
                    
                    <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs text-slate-300 mb-4">
                        <span className="text-slate-500 font-bold uppercase mr-2">Setup:</span> {trade.setupName || 'Unspecified'}
                        <div className="mt-1">
                            <span className="text-slate-500 font-bold uppercase mr-2">Reason:</span> {trade.entryReason}
                        </div>
                    </div>

                    <div className="flex justify-between items-center pt-2 border-t border-slate-800">
                        <div className="flex gap-2">
                            {analyzingTradeId === trade.id ? (
                                <button disabled className="text-xs font-bold text-indigo-400 flex items-center gap-1 animate-pulse">
                                    <Loader2 size={12} className="animate-spin"/> AI Analyzing...
                                </button>
                            ) : (
                                <button onClick={() => onAnalyze(trade)} className="text-xs font-bold text-slate-500 hover:text-indigo-400 flex items-center gap-1 transition">
                                    <BrainCircuit size={14}/> {trade.aiFeedback ? 'Re-Analyze' : 'Analyze'}
                                </button>
                            )}
                            {trade.aiFeedback && (
                                <button onClick={() => onDeleteAiAnalysis(trade.id)} className="text-xs font-bold text-slate-500 hover:text-red-400 flex items-center gap-1 transition ml-2">
                                    <Trash2 size={12}/> Clear AI
                                </button>
                            )}
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => onEdit(trade)} className="p-2 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition">
                                <Edit2 size={16}/>
                            </button>
                            <button onClick={() => onDelete(trade.id)} className="p-2 hover:bg-red-900/20 rounded text-slate-400 hover:text-red-400 transition">
                                <Trash2 size={16}/>
                            </button>
                        </div>
                    </div>

                    {trade.aiFeedback && (
                        <div className="mt-4 p-4 bg-indigo-900/10 border border-indigo-500/20 rounded-xl animate-fade-in">
                            <div className="flex items-center gap-2 mb-2">
                                <BrainCircuit size={16} className="text-indigo-400"/>
                                <span className="text-xs font-bold text-indigo-300 uppercase">Coach's Feedback</span>
                            </div>
                            <p className="text-xs text-slate-300 leading-relaxed">
                                {(() => {
                                    try {
                                        const fb = JSON.parse(trade.aiFeedback);
                                        return fb.coachCommand || fb.realityCheck;
                                    } catch { return "Analysis Error"; }
                                })()}
                            </p>
                        </div>
                    )}
                </div>
            ))}
            
            {filteredTrades.length === 0 && (
                <div className="text-center py-12 text-slate-500">
                    <p>No trades found matching your search.</p>
                </div>
            )}
        </div>
    </div>
  );
};

export default TradeList;
