import React, { useMemo, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell, PieChart, Pie, Legend } from 'recharts';
import { DashboardStats, Trade, TradeOutcome, TradeDirection, StrategyProfile } from '../types';
import { TrendingUp, TrendingDown, Activity, AlertCircle, Calendar, BrainCircuit, Sparkles } from 'lucide-react';
import { analyzeBatch } from '../services/geminiService';

interface DashboardProps {
  trades: Trade[];
  strategyProfile: StrategyProfile;
}

const Dashboard: React.FC<DashboardProps> = ({ trades, strategyProfile }) => {
  const [reportPeriod, setReportPeriod] = useState<'week' | 'month'>('week');
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [aiReport, setAiReport] = useState<string | null>(null);

  const stats: DashboardStats = useMemo(() => {
    const closedTrades = trades.filter(t => t.outcome !== TradeOutcome.OPEN);
    const totalTrades = closedTrades.length;
    const wins = closedTrades.filter(t => t.outcome === TradeOutcome.WIN).length;
    const losses = closedTrades.filter(t => t.outcome === TradeOutcome.LOSS).length;
    const totalPnL = closedTrades.reduce((acc, t) => acc + (t.pnl || 0), 0);
    
    const grossProfit = closedTrades.reduce((acc, t) => (t.pnl && t.pnl > 0 ? acc + t.pnl : acc), 0);
    const grossLoss = Math.abs(closedTrades.reduce((acc, t) => (t.pnl && t.pnl < 0 ? acc + t.pnl : acc), 0));
    const profitFactor = grossLoss === 0 ? grossProfit : grossProfit / grossLoss;

    const sortedPnL = closedTrades.map(t => t.pnl || 0).sort((a, b) => b - a);
    
    // Directional Stats
    const longTrades = closedTrades.filter(t => t.direction === TradeDirection.LONG);
    const shortTrades = closedTrades.filter(t => t.direction === TradeDirection.SHORT);
    const longWins = longTrades.filter(t => t.outcome === TradeOutcome.WIN).length;
    const shortWins = shortTrades.filter(t => t.outcome === TradeOutcome.WIN).length;

    return {
      totalTrades,
      winRate: totalTrades === 0 ? 0 : (wins / totalTrades) * 100,
      profitFactor,
      totalPnL,
      bestTrade: sortedPnL[0] || 0,
      worstTrade: sortedPnL[sortedPnL.length - 1] || 0,
      avgWin: wins === 0 ? 0 : grossProfit / wins,
      avgLoss: losses === 0 ? 0 : grossLoss / losses,
      longWinRate: longTrades.length === 0 ? 0 : (longWins / longTrades.length) * 100,
      shortWinRate: shortTrades.length === 0 ? 0 : (shortWins / shortTrades.length) * 100,
    };
  }, [trades]);

  const equityCurveData = useMemo(() => {
    let runningTotal = 0;
    return trades
      .filter(t => t.outcome !== TradeOutcome.OPEN)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map(t => {
        runningTotal += (t.pnl || 0);
        return {
          date: new Date(t.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
          equity: runningTotal,
          pnl: t.pnl || 0
        };
      });
  }, [trades]);

  const dayOfWeekData = useMemo(() => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const pnlByDay = new Array(7).fill(0);
    
    trades.forEach(t => {
       if (t.outcome !== TradeOutcome.OPEN) {
          const dayIndex = new Date(t.date).getDay();
          pnlByDay[dayIndex] += (t.pnl || 0);
       }
    });

    // Return Mon-Fri primarily for markets
    return [1, 2, 3, 4, 5].map(i => ({
      day: days[i],
      pnl: pnlByDay[i]
    }));
  }, [trades]);

  const handleGenerateReport = async () => {
    setIsGeneratingReport(true);
    setAiReport(null);
    
    const now = new Date();
    const cutoff = new Date();
    if (reportPeriod === 'week') cutoff.setDate(now.getDate() - 7);
    if (reportPeriod === 'month') cutoff.setDate(now.getDate() - 30);

    const recentTrades = trades.filter(t => new Date(t.date) >= cutoff && t.outcome !== TradeOutcome.OPEN);
    
    if (recentTrades.length === 0) {
      setAiReport("No closed trades found for this period to analyze.");
      setIsGeneratingReport(false);
      return;
    }

    const report = await analyzeBatch(recentTrades, `Past ${reportPeriod === 'week' ? '7 Days' : '30 Days'}`, strategyProfile);
    setAiReport(report);
    setIsGeneratingReport(false);
  };

  const directionalData = [
    { name: 'Long Win %', value: stats.longWinRate, fill: '#3B82F6' },
    { name: 'Short Win %', value: stats.shortWinRate, fill: '#F59E0B' },
  ];

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-800 p-5 rounded-xl border border-slate-700 shadow-lg">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-slate-400 text-sm font-medium">Net P&L</h3>
            <span className={`p-2 rounded-full ${stats.totalPnL >= 0 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
              {stats.totalPnL >= 0 ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
            </span>
          </div>
          <p className={`text-2xl font-bold ${stats.totalPnL >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            ₹{stats.totalPnL.toFixed(2)}
          </p>
          <p className="text-xs text-slate-500 mt-1">Avg Win: ₹{stats.avgWin.toFixed(0)} | Avg Loss: -₹{stats.avgLoss.toFixed(0)}</p>
        </div>

        <div className="bg-slate-800 p-5 rounded-xl border border-slate-700 shadow-lg">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-slate-400 text-sm font-medium">Win Rate</h3>
            <span className="p-2 rounded-full bg-blue-500/10 text-blue-500">
              <Activity size={18} />
            </span>
          </div>
          <p className="text-2xl font-bold text-white">
            {stats.winRate.toFixed(1)}%
          </p>
          <div className="flex gap-2 text-xs mt-1">
             <span className="text-blue-400">Long: {stats.longWinRate.toFixed(0)}%</span>
             <span className="text-slate-600">|</span>
             <span className="text-amber-400">Short: {stats.shortWinRate.toFixed(0)}%</span>
          </div>
        </div>

        <div className="bg-slate-800 p-5 rounded-xl border border-slate-700 shadow-lg">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-slate-400 text-sm font-medium">Profit Factor</h3>
            <span className="p-2 rounded-full bg-purple-500/10 text-purple-500">
              <Activity size={18} />
            </span>
          </div>
          <p className="text-2xl font-bold text-white">
            {stats.profitFactor.toFixed(2)}
          </p>
          <p className="text-xs text-slate-500 mt-1">Ideal is {'>'} 1.5</p>
        </div>

        <div className="bg-slate-800 p-5 rounded-xl border border-slate-700 shadow-lg">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-slate-400 text-sm font-medium">Best / Worst</h3>
            <span className="p-2 rounded-full bg-amber-500/10 text-amber-500">
              <AlertCircle size={18} />
            </span>
          </div>
          <div className="flex justify-between items-end">
             <div className="text-emerald-400 text-sm">Max: +₹{stats.bestTrade.toFixed(0)}</div>
             <div className="text-red-400 text-sm">Min: -₹{Math.abs(stats.worstTrade).toFixed(0)}</div>
          </div>
        </div>
      </div>

      {/* AI Coach Section */}
      <div className="bg-gradient-to-br from-indigo-900/30 to-slate-800 p-6 rounded-xl border border-indigo-500/30 shadow-lg relative overflow-hidden">
         <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
            <BrainCircuit size={120} className="text-indigo-400" />
         </div>
         
         <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
               <h3 className="text-indigo-400 font-bold text-lg flex items-center">
                 <Sparkles size={20} className="mr-2" /> AI Performance Review
               </h3>
               <div className="flex bg-slate-900/50 rounded-lg p-1 border border-slate-700">
                  <button 
                    onClick={() => setReportPeriod('week')}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition ${reportPeriod === 'week' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                  >
                    Last 7 Days
                  </button>
                  <button 
                    onClick={() => setReportPeriod('month')}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition ${reportPeriod === 'month' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                  >
                    Last 30 Days
                  </button>
               </div>
            </div>

            {!aiReport && !isGeneratingReport && (
              <div className="text-center py-6">
                <p className="text-slate-400 text-sm mb-4">
                  Get a deep-dive analysis of your recent trading performance. The AI will look for patterns in your wins, losses, and psychology.
                </p>
                <button 
                  onClick={handleGenerateReport}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2 rounded-lg font-semibold transition shadow-lg shadow-indigo-900/50 flex items-center mx-auto"
                >
                  <BrainCircuit size={18} className="mr-2" /> Generate Coach's Report
                </button>
              </div>
            )}

            {isGeneratingReport && (
              <div className="text-center py-8 animate-pulse">
                <BrainCircuit size={48} className="mx-auto text-indigo-500 mb-4 opacity-50" />
                <p className="text-indigo-300 font-medium">Analyzing your trade journal...</p>
                <p className="text-xs text-slate-500 mt-2">Thinking deep to find your edge (this may take 10-20s)</p>
              </div>
            )}

            {aiReport && (
              <div className="bg-slate-900/60 rounded-lg p-5 border border-indigo-500/20 text-slate-200 text-sm leading-7 whitespace-pre-wrap">
                 {aiReport}
                 <div className="mt-4 pt-4 border-t border-slate-700/50 text-center">
                    <button onClick={handleGenerateReport} className="text-indigo-400 text-xs hover:text-indigo-300 underline">
                      Refresh Analysis
                    </button>
                 </div>
              </div>
            )}
         </div>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Equity Curve */}
        <div className="lg:col-span-2 bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg">
           <h3 className="text-white font-semibold mb-4 text-sm uppercase tracking-wide">Account Growth (₹)</h3>
           <div className="h-64 w-full">
             <ResponsiveContainer width="100%" height="100%">
               <AreaChart data={equityCurveData}>
                 <defs>
                   <linearGradient id="colorEquity" x1="0" y1="0" x2="0" y2="1">
                     <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                     <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                   </linearGradient>
                 </defs>
                 <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                 <XAxis dataKey="date" stroke="#64748b" fontSize={11} tickMargin={10} />
                 <YAxis stroke="#64748b" fontSize={11} tickFormatter={(val) => `₹${val}`} />
                 <Tooltip 
                    contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f1f5f9' }}
                    itemStyle={{ color: '#f1f5f9' }}
                    formatter={(value: number) => [`₹${value.toFixed(2)}`, 'Equity']}
                 />
                 <Area type="monotone" dataKey="equity" stroke="#3B82F6" strokeWidth={2} fillOpacity={1} fill="url(#colorEquity)" />
               </AreaChart>
             </ResponsiveContainer>
           </div>
        </div>

        {/* Directional Win Rate */}
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg flex flex-col items-center justify-center">
            <h3 className="text-white font-semibold mb-2 text-sm uppercase tracking-wide w-full text-left">Long vs Short</h3>
            <div className="h-56 w-full relative">
               <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={directionalData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {directionalData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px' }} />
                  <Legend verticalAlign="bottom" height={36}/>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center -mt-4">
                 <span className="text-xs text-slate-500 block">Total Win%</span>
                 <span className="text-xl font-bold text-white">{stats.winRate.toFixed(0)}%</span>
              </div>
            </div>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
         {/* PnL by Day of Week */}
         <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg">
            <div className="flex items-center justify-between mb-4">
               <h3 className="text-white font-semibold text-sm uppercase tracking-wide">PnL by Day of Week</h3>
               <Calendar size={16} className="text-slate-500"/>
            </div>
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dayOfWeekData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                  <XAxis dataKey="day" stroke="#64748b" fontSize={12} />
                  <YAxis stroke="#64748b" fontSize={12} tickFormatter={(val) => `₹${val}`}/>
                  <Tooltip 
                    cursor={{fill: '#334155', opacity: 0.2}}
                    contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f1f5f9' }}
                    formatter={(value: number) => [`₹${value.toFixed(2)}`, 'PnL']}
                  />
                  <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>
                    {dayOfWeekData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.pnl >= 0 ? '#10B981' : '#EF4444'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
        </div>

        {/* Recent Trades Bar Chart */}
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg">
            <h3 className="text-white font-semibold mb-4 text-sm uppercase tracking-wide">Recent Trade Performance</h3>
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={equityCurveData.slice(-10)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                  <XAxis dataKey="date" hide />
                  <YAxis stroke="#64748b" fontSize={12} />
                  <Tooltip 
                    cursor={{fill: '#334155', opacity: 0.2}}
                    contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f1f5f9' }}
                  />
                  <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>
                    {equityCurveData.slice(-10).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.pnl >= 0 ? '#10B981' : '#EF4444'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;