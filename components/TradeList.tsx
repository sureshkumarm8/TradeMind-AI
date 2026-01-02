import React, { useMemo, useState } from 'react';
import { Trade, TradeOutcome, StrategyProfile } from '../types';
import { Edit2, Trash2, BrainCircuit, Calendar, Search, RefreshCw, Loader2, ChevronUp, ChevronDown } from 'lucide-react';

interface TradeListProps {
  trades: Trade[];
  strategyProfile: StrategyProfile;
  apiKey: string;
  onEdit: (trade: Trade) => void;
  onDelete: (id: string) => void;
  onAnalyze: (trade: Trade) => void;
  onDeleteAiAnalysis: (id: string) => void;
  onImport: (trades: Trade[]) => void;
  analyzingTradeId: string | null;
  onSyncPush: () => void;
  isSyncing: boolean;
  highlightedTradeId: string | null;
}

const TradeList: React.FC<TradeListProps> = ({
  trades,
  onEdit,
  onDelete,
  onAnalyze,
  onDeleteAiAnalysis,
  analyzingTradeId,
  onSyncPush,
  isSyncing,
  highlightedTradeId
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedDates, setExpandedDates] = useState<Record<string, boolean>>({});

  const sortedTrades = useMemo(() => {
    return [...trades].sort((a, b) => new Date(b.date + 'T' + b.entryTime).getTime() - new Date(a.date + 'T' + a.entryTime).getTime());
  }, [trades]);

  const filteredTrades = useMemo(() => {
    if (!searchTerm) return sortedTrades;
    return sortedTrades.filter(t => 
        t.instrument.toLowerCase().includes(searchTerm.toLowerCase()) || 
        t.setupName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.notes?.some(n => n.content.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [sortedTrades, searchTerm]);

  // Group trades by Date string for List View
  const tradesByDate = useMemo(() => {
      return filteredTrades.reduce((acc, trade) => {
        const d = new Date(trade.date);
        if (isNaN(d.getTime())) return acc; 
    
        const dateObj = new Date(trade.date + 'T00:00:00'); // Force local midnight
        
        if (isNaN(dateObj.getTime())) return acc;
    
        const dateStr = dateObj.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        
        if (!acc[dateStr]) acc[dateStr] = [];
        acc[dateStr].push(trade);
        return acc;
      }, {} as Record<string, Trade[]>);
  }, [filteredTrades]);

  const toggleDate = (date: string) => {
    setExpandedDates(prev => ({ ...prev, [date]: !prev[date] }));
  };

  const getOutcomeColor = (outcome: TradeOutcome) => {
      switch(outcome) {
          case TradeOutcome.WIN: return 'text-emerald-400';
          case TradeOutcome.LOSS: return 'text-red-400';
          case TradeOutcome.BREAK_EVEN: return 'text-slate-400';
          default: return 'text-blue-400';
      }
  };

  const getPnLColor = (pnl?: number) => {
      if (!pnl) return 'text-slate-500';
      if (pnl > 0) return 'text-emerald-400';
      if (pnl < 0) return 'text-red-400';
      return 'text-slate-400';
  };

  return (
    <div className="space-y-6 animate-fade-in">
        {/* Header Controls */}
        <div className="flex flex-col md:flex-row justify-between gap-4 bg-slate-800 p-4 rounded-xl border border-slate-700">
            <div className="relative flex-1">
                <Search size={16} className="absolute left-3 top-3 text-slate-500"/>
                <input 
                    type="text" 
                    placeholder="Search trades..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-10 pr-4 py-2.5 text-sm text-white focus:border-indigo-500 outline-none"
                />
            </div>
            <button 
                onClick={onSyncPush}
                disabled={isSyncing} 
                className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition font-bold text-xs disabled:opacity-50"
            >
                {isSyncing ? <Loader2 size={16} className="animate-spin"/> : <RefreshCw size={16}/>}
                Sync Cloud
            </button>
        </div>

        {/* Trade List */}
        <div className="space-y-4">
            {Object.keys(tradesByDate).length === 0 ? (
                <div className="text-center py-12 text-slate-500 italic">No trades found.</div>
            ) : (
                Object.entries(tradesByDate).map(([dateStr, dayTrades]) => (
                    <div key={dateStr} className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
                        <button 
                            onClick={() => toggleDate(dateStr)}
                            className="w-full flex items-center justify-between p-4 bg-slate-900/50 hover:bg-slate-900 transition"
                        >
                            <div className="flex items-center gap-2 font-bold text-slate-300 text-sm">
                                <Calendar size={16} className="text-indigo-400"/>
                                {dateStr}
                                <span className="text-xs text-slate-500 ml-2">({dayTrades.length} trades)</span>
                            </div>
                            <div className="flex items-center gap-4">
                                <span className={`text-sm font-mono font-bold ${dayTrades.reduce((acc, t) => acc + (t.pnl || 0), 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                    ₹{dayTrades.reduce((acc, t) => acc + (t.pnl || 0), 0).toFixed(2)}
                                </span>
                                {expandedDates[dateStr] ? <ChevronUp size={16} className="text-slate-500"/> : <ChevronDown size={16} className="text-slate-500"/>}
                            </div>
                        </button>
                        
                        {(!expandedDates[dateStr]) && (
                             <div className="divide-y divide-slate-700/50">
                                 {dayTrades.map(trade => (
                                     <div 
                                        key={trade.id} 
                                        id={`trade-${trade.id}`}
                                        className={`p-4 hover:bg-slate-700/30 transition flex flex-col md:flex-row gap-4 ${highlightedTradeId === trade.id ? 'bg-indigo-900/20 border-l-4 border-indigo-500' : ''}`}
                                     >
                                         <div className="flex-1">
                                             <div className="flex items-center gap-2 mb-1">
                                                 <span className="text-xs font-mono text-slate-500 bg-slate-900 px-1.5 py-0.5 rounded">{trade.entryTime}</span>
                                                 <span className={`text-sm font-black ${trade.direction === 'LONG' ? 'text-blue-400' : 'text-amber-400'}`}>{trade.instrument}</span>
                                                 <span className="text-xs font-bold text-slate-400">{trade.optionType}</span>
                                                 <span className={`text-xs font-bold px-2 py-0.5 rounded uppercase ${getOutcomeColor(trade.outcome)} bg-slate-900`}>{trade.outcome}</span>
                                             </div>
                                             <div className="text-sm text-slate-300 font-medium mb-2">
                                                 {trade.setupName}
                                             </div>
                                             <div className="flex flex-wrap gap-2">
                                                 {trade.confluences?.map((c, i) => (
                                                     <span key={i} className="text-[10px] bg-emerald-900/30 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/20">{c}</span>
                                                 ))}
                                                 {trade.mistakes?.map((m, i) => (
                                                     <span key={i} className="text-[10px] bg-red-900/30 text-red-400 px-1.5 py-0.5 rounded border border-red-500/20">{m}</span>
                                                 ))}
                                             </div>
                                         </div>

                                         <div className="flex flex-row md:flex-col justify-between items-end gap-2 md:gap-1">
                                             <div className="text-right">
                                                 <span className={`text-lg font-black font-mono block ${getPnLColor(trade.pnl)}`}>
                                                     {trade.pnl ? `₹${trade.pnl}` : '---'}
                                                 </span>
                                                 <span className="text-[10px] text-slate-500">PnL</span>
                                             </div>
                                             
                                             <div className="flex gap-2 mt-2">
                                                 <button onClick={() => onAnalyze(trade)} disabled={!!analyzingTradeId} className="p-2 bg-indigo-900/30 text-indigo-400 hover:bg-indigo-900/50 rounded border border-indigo-500/30 transition" title="AI Audit">
                                                     {analyzingTradeId === trade.id ? <Loader2 size={14} className="animate-spin"/> : <BrainCircuit size={14}/>}
                                                 </button>
                                                 <button onClick={() => onEdit(trade)} className="p-2 bg-slate-700 text-slate-300 hover:text-white rounded transition" title="Edit">
                                                     <Edit2 size={14}/>
                                                 </button>
                                                 <button onClick={() => onDelete(trade.id)} className="p-2 bg-slate-700 text-red-400 hover:bg-red-900/30 rounded transition" title="Delete">
                                                     <Trash2 size={14}/>
                                                 </button>
                                             </div>
                                         </div>

                                         {trade.aiFeedback && (
                                             <div className="md:col-span-2 w-full mt-2 bg-slate-900/50 p-3 rounded-lg border border-slate-700/50">
                                                 <div className="flex justify-between items-start">
                                                     <h5 className="text-[10px] font-bold text-indigo-400 uppercase mb-1 flex items-center gap-1">
                                                         <BrainCircuit size={12}/> AI Feedback
                                                     </h5>
                                                     <button onClick={() => onDeleteAiAnalysis(trade.id)} className="text-[10px] text-slate-600 hover:text-red-400"><Trash2 size={10}/></button>
                                                 </div>
                                                 <p className="text-xs text-slate-300 italic">
                                                     {(() => {
                                                         try {
                                                             const feedback = JSON.parse(trade.aiFeedback);
                                                             return feedback.realityCheck || feedback.coachCommand;
                                                         } catch { return trade.aiFeedback; }
                                                     })()}
                                                 </p>
                                             </div>
                                         )}
                                     </div>
                                 ))}
                             </div>
                        )}
                    </div>
                ))
            )}
        </div>
    </div>
  );
};

export default TradeList;