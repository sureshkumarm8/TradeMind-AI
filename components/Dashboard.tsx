import React, { useMemo, useState } from 'react';
import { Trade, StrategyProfile, TradeOutcome, PreMarketAnalysis, DashboardStats } from '../types';
import { analyzeBatch } from '../services/geminiService';
import { TrendingUp, Activity, BrainCircuit, Loader2, ArrowRight, DollarSign, BarChart2 } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface DashboardProps {
  trades: Trade[];
  strategyProfile: StrategyProfile;
  apiKey: string;
  preMarketNotes?: { date: string, notes: string };
  preMarketAnalysis?: { date: string, timestamp?: string, data: PreMarketAnalysis };
  onUpdatePreMarket: (notes: string) => void;
  onNavigateToPreMarket: () => void;
  onViewTrade: (tradeId: string) => void;
  onNavigateToPsychology: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({
  trades,
  strategyProfile,
  apiKey,
  onNavigateToPsychology
}) => {
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [aiReport, setAiReport] = useState<string | null>(null);

  // Statistics Calculation
  const stats: DashboardStats = useMemo(() => {
    const closedTrades = trades.filter(t => t.outcome !== TradeOutcome.OPEN);
    const totalTrades = closedTrades.length;
    const wins = closedTrades.filter(t => t.outcome === TradeOutcome.WIN).length;
    const losses = closedTrades.filter(t => t.outcome === TradeOutcome.LOSS).length;
    
    // Win Rate
    const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;
    
    // PnL
    const totalPnL = closedTrades.reduce((acc, t) => acc + (t.pnl || 0), 0);
    
    // Profit Factor
    const grossProfit = closedTrades.filter(t => (t.pnl || 0) > 0).reduce((acc, t) => acc + (t.pnl || 0), 0);
    const grossLoss = Math.abs(closedTrades.filter(t => (t.pnl || 0) < 0).reduce((acc, t) => acc + (t.pnl || 0), 0));
    const profitFactor = grossLoss === 0 ? grossProfit : grossProfit / grossLoss;

    // Averages
    const avgWin = wins > 0 ? grossProfit / wins : 0;
    const avgLoss = losses > 0 ? grossLoss / losses : 0;

    // Best/Worst
    const bestTrade = closedTrades.length > 0 ? Math.max(...closedTrades.map(t => t.pnl || 0)) : 0;
    const worstTrade = closedTrades.length > 0 ? Math.min(...closedTrades.map(t => t.pnl || 0)) : 0;

    // Directional Win Rates
    const longs = closedTrades.filter(t => t.direction === 'LONG');
    const shorts = closedTrades.filter(t => t.direction === 'SHORT');
    const longWinRate = longs.length > 0 ? (longs.filter(t => t.outcome === TradeOutcome.WIN).length / longs.length) * 100 : 0;
    const shortWinRate = shorts.length > 0 ? (shorts.filter(t => t.outcome === TradeOutcome.WIN).length / shorts.length) * 100 : 0;

    return {
      totalTrades,
      winRate,
      profitFactor,
      totalPnL,
      bestTrade,
      worstTrade,
      avgWin,
      avgLoss,
      longWinRate,
      shortWinRate
    };
  }, [trades]);

  const equityCurveData = useMemo(() => {
    let runningTotal = 0;
    return trades
      .filter(t => t.outcome !== TradeOutcome.OPEN)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map(t => {
        runningTotal += (t.pnl || 0);
        const d = new Date(t.date);
        const dateStr = !isNaN(d.getTime()) 
            ? d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) 
            : t.date;

        return {
          date: dateStr,
          fullDate: t.date,
          equity: runningTotal,
          pnl: t.pnl || 0,
          id: t.id
        };
      });
  }, [trades]);

  const handleGenerateReport = async () => {
    setIsGeneratingReport(true);
    setAiReport(null);
    
    // Filter last 10 trades for analysis
    const recentTrades = trades
        .filter(t => t.outcome !== TradeOutcome.OPEN)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 10);

    const report = await analyzeBatch(recentTrades, "Recent 10 Trades", strategyProfile, apiKey);
    setAiReport(report);
    setIsGeneratingReport(false);
  };

  return (
    <div className="space-y-6 animate-fade-in">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 shadow-lg">
                <div className="flex justify-between items-start mb-2">
                    <p className="text-xs font-bold text-slate-500 uppercase">Total PnL</p>
                    <DollarSign size={16} className={stats.totalPnL >= 0 ? "text-emerald-400" : "text-red-400"} />
                </div>
                <h3 className={`text-2xl font-black ${stats.totalPnL >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                    ₹{stats.totalPnL.toLocaleString()}
                </h3>
            </div>
            
            <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 shadow-lg">
                <div className="flex justify-between items-start mb-2">
                    <p className="text-xs font-bold text-slate-500 uppercase">Win Rate</p>
                    <Activity size={16} className="text-blue-400" />
                </div>
                <h3 className="text-2xl font-black text-white">
                    {stats.winRate.toFixed(1)}%
                </h3>
                <p className="text-[10px] text-slate-500 mt-1">{stats.totalTrades} Trades</p>
            </div>

            <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 shadow-lg">
                <div className="flex justify-between items-start mb-2">
                    <p className="text-xs font-bold text-slate-500 uppercase">Profit Factor</p>
                    <BarChart2 size={16} className="text-indigo-400" />
                </div>
                <h3 className="text-2xl font-black text-white">
                    {stats.profitFactor.toFixed(2)}
                </h3>
            </div>

            <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 shadow-lg">
                <div className="flex justify-between items-start mb-2">
                    <p className="text-xs font-bold text-slate-500 uppercase">Psychology</p>
                    <BrainCircuit size={16} className="text-purple-400" />
                </div>
                <button onClick={onNavigateToPsychology} className="w-full mt-1 bg-purple-600/20 text-purple-300 hover:bg-purple-600/30 py-1 rounded text-xs font-bold flex items-center justify-center gap-1 transition">
                    View Profile <ArrowRight size={12}/>
                </button>
            </div>
        </div>

        {/* Equity Curve */}
        <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6 shadow-xl">
             <div className="flex justify-between items-center mb-6">
                 <h3 className="text-sm font-black text-slate-300 uppercase tracking-widest flex items-center gap-2">
                     <TrendingUp size={16} className="text-emerald-400"/> Equity Curve
                 </h3>
             </div>
             <div className="h-[300px] w-full">
                 <ResponsiveContainer width="100%" height="100%">
                     <AreaChart data={equityCurveData}>
                         <defs>
                             <linearGradient id="colorEquity" x1="0" y1="0" x2="0" y2="1">
                                 <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                                 <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                             </linearGradient>
                         </defs>
                         <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                         <XAxis 
                            dataKey="date" 
                            stroke="#64748b" 
                            fontSize={10} 
                            tickLine={false} 
                            axisLine={false} 
                         />
                         <YAxis 
                            stroke="#64748b" 
                            fontSize={10} 
                            tickLine={false} 
                            axisLine={false} 
                            tickFormatter={(val) => `₹${val}`}
                         />
                         <Tooltip 
                            contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }}
                            itemStyle={{ color: '#e2e8f0' }}
                         />
                         <Area 
                            type="monotone" 
                            dataKey="equity" 
                            stroke="#10B981" 
                            fillOpacity={1} 
                            fill="url(#colorEquity)" 
                            strokeWidth={2}
                         />
                     </AreaChart>
                 </ResponsiveContainer>
             </div>
        </div>

        {/* AI Coach Report */}
        <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6 shadow-xl relative overflow-hidden">
             <div className="flex justify-between items-center mb-4 relative z-10">
                 <h3 className="text-sm font-black text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                     <BrainCircuit size={16}/> Weekly Coach's Report
                 </h3>
                 {!isGeneratingReport ? (
                     <button onClick={handleGenerateReport} className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg font-bold transition">
                         Generate Analysis
                     </button>
                 ) : (
                     <span className="text-xs text-indigo-400 flex items-center gap-1">
                         <Loader2 size={12} className="animate-spin"/> Thinking...
                     </span>
                 )}
             </div>

             {aiReport ? (
                 <div className="prose prose-invert prose-sm max-w-none text-slate-300 relative z-10">
                     <div className="whitespace-pre-wrap leading-relaxed">{aiReport}</div>
                 </div>
             ) : (
                 <div className="text-center py-8 text-slate-500 text-xs italic relative z-10">
                     Click generate to get an AI breakdown of your recent performance.
                 </div>
             )}
             
             {/* Decor */}
             <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none"></div>
        </div>
    </div>
  );
};

export default Dashboard;