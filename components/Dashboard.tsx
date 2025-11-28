import React, { useMemo, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell, PieChart, Pie, Legend } from 'recharts';
import { DashboardStats, Trade, TradeOutcome, TradeDirection, StrategyProfile } from '../types';
import { TrendingUp, TrendingDown, Activity, AlertCircle, Calendar, BrainCircuit, Sparkles, X, Target, ShieldAlert, Trophy, ListFilter } from 'lucide-react';
import { analyzeBatch } from '../services/geminiService';
import TradeList from './TradeList';

interface DashboardProps {
  trades: Trade[];
  strategyProfile: StrategyProfile;
  apiKey?: string;
}

const Dashboard: React.FC<DashboardProps> = ({ trades, strategyProfile, apiKey }) => {
  const [reportPeriod, setReportPeriod] = useState<'week' | 'month'>('week');
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [aiReport, setAiReport] = useState<string | null>(null);
  
  // Interactive Filters
  const [selectedFilter, setSelectedFilter] = useState<{ type: string, value: string | number } | null>(null);

  const stats: DashboardStats = useMemo(() => {
    const closedTrades = trades.filter(t => t.outcome !== TradeOutcome.OPEN);
    const totalTrades = closedTrades.length;
    const wins = closedTrades.filter(t => t.outcome === TradeOutcome.WIN).length;
    const losses = closedTrades.filter(t => t.outcome === TradeOutcome.LOSS).length;
    const totalPnL = closedTrades.reduce((acc, t) => acc + (t.pnl || 0), 0);
    
    const grossProfit = closedTrades.reduce((acc, t) => (t.pnl && t.pnl > 0 ? acc + t.pnl : acc), 0);
    const grossLoss = Math.abs(closedTrades.reduce((acc, t) => (t.pnl && t.pnl < 0 ? acc + t.pnl : acc), 0));
    const profitFactor = grossLoss === 0 ? grossProfit : grossProfit / grossLoss;

    // Find actual trade objects for best/worst to get IDs if needed, but for stats we just need values
    const sortedByPnL = [...closedTrades].sort((a, b) => (b.pnl || 0) - (a.pnl || 0));
    
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
      bestTrade: sortedByPnL[0]?.pnl || 0,
      worstTrade: sortedByPnL[sortedByPnL.length - 1]?.pnl || 0,
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
          fullDate: t.date,
          equity: runningTotal,
          pnl: t.pnl || 0,
          id: t.id
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
      index: i,
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

    const report = await analyzeBatch(recentTrades, `Past ${reportPeriod === 'week' ? '7 Days' : '30 Days'}`, strategyProfile, apiKey);
    setAiReport(report);
    setIsGeneratingReport(false);
  };

  const directionalData = [
    { name: 'Long Win %', value: stats.longWinRate, fill: '#3B82F6', type: 'Long' },
    { name: 'Short Win %', value: stats.shortWinRate, fill: '#F59E0B', type: 'Short' },
  ];
  
  // --- Interactions ---
  const filteredTrades = useMemo(() => {
     if (!selectedFilter) return [];
     
     const closedTrades = trades.filter(t => t.outcome !== TradeOutcome.OPEN);
     const sortedTrades = [...closedTrades].sort((a, b) => (b.pnl || 0) - (a.pnl || 0));

     switch (selectedFilter.type) {
        case 'all_closed':
           return closedTrades;
        case 'wins':
           return closedTrades.filter(t => t.outcome === TradeOutcome.WIN);
        case 'losses':
           return closedTrades.filter(t => t.outcome === TradeOutcome.LOSS);
        case 'best':
           return sortedTrades.length > 0 ? [sortedTrades[0]] : [];
        case 'worst':
           return sortedTrades.length > 0 ? [sortedTrades[sortedTrades.length - 1]] : [];
        case 'day':
           return trades.filter(t => new Date(t.date).getDay() === selectedFilter.value);
        case 'direction':
           return trades.filter(t => t.direction === (selectedFilter.value === 'Long' ? TradeDirection.LONG : TradeDirection.SHORT));
        case 'date':
           return trades.filter(t => t.date === selectedFilter.value);
        default:
           return [];
     }
  }, [selectedFilter, trades]);

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      
      {/* Detail Overlay */}
      {selectedFilter && (
         <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
             <div className="bg-slate-900 w-full max-w-4xl max-h-[90vh] rounded-2xl border border-slate-700 overflow-hidden flex flex-col shadow-2xl">
                 <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-850">
                     <div className="flex items-center gap-3">
                         <div className="bg-indigo-900/50 p-2 rounded-lg text-indigo-400">
                             <ListFilter size={20}/>
                         </div>
                         <div>
                             <h3 className="text-lg font-bold text-white">
                                {selectedFilter.type === 'day' ? `Trades on ${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][selectedFilter.value as number]}` : 
                                 selectedFilter.type === 'all_closed' ? 'All Closed Trades' :
                                 selectedFilter.type === 'wins' ? 'Winning Trades' :
                                 selectedFilter.type === 'losses' ? 'Losing Trades' :
                                 selectedFilter.type === 'best' ? 'Best Trade Record' :
                                 selectedFilter.type === 'worst' ? 'Worst Trade Record' :
                                 selectedFilter.value}
                             </h3>
                             <p className="text-xs text-slate-500">{filteredTrades.length} records found</p>
                         </div>
                     </div>
                     <button onClick={() => setSelectedFilter(null)} className="p-2 hover:bg-slate-800 rounded-full transition text-slate-400 hover:text-white"><X size={24}/></button>
                 </div>
                 <div className="overflow-y-auto p-4 flex-1 bg-slate-950/50">
                     <TradeList 
                        trades={filteredTrades} 
                        strategyProfile={strategyProfile} 
                        apiKey={apiKey}
                        onEdit={()=>{}} onDelete={()=>{}} onAnalyze={()=>{}} onImport={()=>{}} isAnalyzing={false} 
                        readOnly={true} 
                     />
                 </div>
             </div>
         </div>
      )}

      {/* KPI Cards - Interactive Command Center */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Net P&L (Show Ledger) */}
        <button 
           onClick={() => setSelectedFilter({ type: 'all_closed', value: 'All Closed' })}
           className="bg-gradient-to-br from-slate-800 to-slate-900 p-5 rounded-xl border border-slate-700/50 shadow-lg hover:shadow-emerald-900/20 hover:border-emerald-500/30 transition-all duration-300 hover:-translate-y-1 group relative overflow-hidden text-left"
        >
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
             <TrendingUp size={64} />
          </div>
          <div className="flex justify-between items-center mb-3 relative z-10">
            <h3 className="text-slate-400 text-xs font-bold uppercase tracking-widest">Net P&L</h3>
            <span className={`p-1.5 rounded-lg ${stats.totalPnL >= 0 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
              {stats.totalPnL >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
            </span>
          </div>
          <p className={`text-2xl lg:text-3xl font-black font-mono relative z-10 ${stats.totalPnL >= 0 ? 'text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.3)]' : 'text-red-400'}`}>
            ₹{stats.totalPnL.toFixed(2)}
          </p>
          <div className="flex justify-between items-center mt-3 text-[10px] font-medium text-slate-500 uppercase relative z-10">
             <span>{stats.totalTrades} Trades</span>
             <span className="group-hover:text-emerald-400 transition-colors">View All &rarr;</span>
          </div>
        </button>

        {/* Card 2: Win Rate (Show Wins) */}
        <button 
           onClick={() => setSelectedFilter({ type: 'wins', value: 'Wins' })}
           className="bg-gradient-to-br from-slate-800 to-slate-900 p-5 rounded-xl border border-slate-700/50 shadow-lg hover:shadow-blue-900/20 hover:border-blue-500/30 transition-all duration-300 hover:-translate-y-1 group relative overflow-hidden text-left"
        >
           <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
             <Target size={64} />
          </div>
          <div className="flex justify-between items-center mb-3 relative z-10">
            <h3 className="text-slate-400 text-xs font-bold uppercase tracking-widest">Win Rate</h3>
            <span className="p-1.5 rounded-lg bg-blue-500/10 text-blue-500">
              <Activity size={16} />
            </span>
          </div>
          <p className="text-2xl lg:text-3xl font-black text-white relative z-10">
            {stats.winRate.toFixed(1)}<span className="text-lg text-slate-500">%</span>
          </p>
          <div className="flex gap-2 text-[10px] mt-3 font-medium uppercase relative z-10">
             <span className="text-blue-400">L: {stats.longWinRate.toFixed(0)}%</span>
             <span className="text-slate-600">|</span>
             <span className="text-amber-400">S: {stats.shortWinRate.toFixed(0)}%</span>
             <span className="ml-auto text-slate-500 group-hover:text-blue-400 transition-colors">View Wins &rarr;</span>
          </div>
        </button>

        {/* Card 3: Profit Factor (Show Losses/Leaks) */}
        <button 
           onClick={() => setSelectedFilter({ type: 'losses', value: 'Losses' })}
           className="bg-gradient-to-br from-slate-800 to-slate-900 p-5 rounded-xl border border-slate-700/50 shadow-lg hover:shadow-rose-900/20 hover:border-rose-500/30 transition-all duration-300 hover:-translate-y-1 group relative overflow-hidden text-left"
        >
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
             <ShieldAlert size={64} />
          </div>
          <div className="flex justify-between items-center mb-3 relative z-10">
            <h3 className="text-slate-400 text-xs font-bold uppercase tracking-widest">Profit Factor</h3>
            <span className="p-1.5 rounded-lg bg-purple-500/10 text-purple-500">
              <Sparkles size={16} />
            </span>
          </div>
          <p className="text-2xl lg:text-3xl font-black text-white relative z-10">
            {stats.profitFactor.toFixed(2)}<span className="text-sm text-slate-600 ml-1 font-normal">x</span>
          </p>
          <div className="mt-3 flex justify-between items-center text-[10px] text-slate-500 font-medium uppercase relative z-10">
            <span>Target: {'>'} 1.5</span>
            <span className="group-hover:text-rose-400 transition-colors">Analyze Leaks &rarr;</span>
          </div>
        </button>

        {/* Card 4: Extremes (Interactive Best/Worst) */}
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-5 rounded-xl border border-slate-700/50 shadow-lg flex flex-col justify-between group relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
             <Trophy size={64} />
          </div>
          <div className="flex justify-between items-center mb-2 relative z-10">
            <h3 className="text-slate-400 text-xs font-bold uppercase tracking-widest">Performance Range</h3>
            <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-500">
              <AlertCircle size={16} />
            </span>
          </div>
          <div className="flex items-end justify-between gap-2 relative z-10 mt-2">
             <button 
               onClick={() => setSelectedFilter({ type: 'best', value: 'Best Trade' })}
               className="flex-1 bg-emerald-500/5 hover:bg-emerald-500/20 p-2 rounded-lg border border-emerald-500/20 transition text-left"
             >
                <div className="text-[10px] text-emerald-500/70 font-bold uppercase">Max Win</div>
                <div className="text-sm font-bold text-emerald-400">₹{stats.bestTrade.toFixed(0)}</div>
             </button>
             <button 
               onClick={() => setSelectedFilter({ type: 'worst', value: 'Worst Trade' })}
               className="flex-1 bg-red-500/5 hover:bg-red-500/20 p-2 rounded-lg border border-red-500/20 transition text-right"
             >
                <div className="text-[10px] text-red-500/70 font-bold uppercase">Max Loss</div>
                <div className="text-sm font-bold text-red-400">-₹{Math.abs(stats.worstTrade).toFixed(0)}</div>
             </button>
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
           <h3 className="text-white font-semibold mb-4 text-sm uppercase tracking-wide">Account Growth (Click for Details)</h3>
           <div className="h-64 w-full cursor-pointer">
             <ResponsiveContainer width="100%" height="100%">
               <AreaChart data={equityCurveData} onClick={(data) => {
                  if (data && data.activePayload && data.activePayload[0]) {
                      setSelectedFilter({ type: 'date', value: data.activePayload[0].payload.fullDate });
                  }
               }}>
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
                 <Area type="monotone" dataKey="equity" stroke="#3B82F6" strokeWidth={2} fillOpacity={1} fill="url(#colorEquity)" activeDot={{ r: 6 }} />
               </AreaChart>
             </ResponsiveContainer>
           </div>
        </div>

        {/* Directional Win Rate */}
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg flex flex-col items-center justify-center">
            <h3 className="text-white font-semibold mb-2 text-sm uppercase tracking-wide w-full text-left">Long vs Short</h3>
            <div className="h-56 w-full relative cursor-pointer">
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
                    onClick={(data) => setSelectedFilter({ type: 'direction', value: data.type === 'Long' ? 'Long' : 'Short' })}
                  >
                    {directionalData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px' }} />
                  <Legend verticalAlign="bottom" height={36}/>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center -mt-4 pointer-events-none">
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
            <div className="h-56 w-full cursor-pointer">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dayOfWeekData} onClick={(data) => {
                     if (data && data.activePayload && data.activePayload[0]) {
                         setSelectedFilter({ type: 'day', value: data.activePayload[0].payload.index });
                     }
                }}>
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