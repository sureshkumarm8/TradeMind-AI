
import React, { useMemo, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, ReferenceLine } from 'recharts';
import { DashboardStats, Trade, TradeOutcome, TradeDirection, StrategyProfile, PlaybookStat, PreMarketAnalysis, AiAnalysisResponse, OptionType } from '../types';
import { TrendingUp, TrendingDown, Activity, AlertCircle, BrainCircuit, Sparkles, X, Target, ShieldAlert, Trophy, ListFilter, ArrowRight, ShieldCheck, HeartPulse, Info, Calculator, ChevronDown, ChevronUp, Book, Dice6, Flame, Sword, AlertTriangle, Zap, Wallet, Percent, ArrowUpRight, Scale, Bot, Loader2, Lightbulb, GraduationCap, RefreshCw, CalendarDays, History } from 'lucide-react';
import { analyzeBatch } from '../services/geminiService';

interface DashboardProps {
  trades: Trade[];
  strategyProfile: StrategyProfile;
  apiKey?: string;
  preMarketNotes?: { date: string, notes: string };
  preMarketAnalysis?: { date: string, data: PreMarketAnalysis };
  onUpdatePreMarket: (notes: string) => void;
  onNavigateToPreMarket?: () => void;
  onViewTrade?: (tradeId: string) => void;
  onNavigateToPsychology?: () => void;
}

const CustomChartTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900/95 border border-slate-700 p-3 rounded-xl shadow-2xl backdrop-blur-md ring-1 ring-white/10">
        <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-2 border-b border-white/5 pb-1">{label}</p>
        {payload.map((p: any, index: number) => (
           <div key={index} className="flex items-center justify-between gap-4 mb-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase">{p.name}</span>
              <span className="text-sm font-mono font-black" style={{ color: p.color }}>
                {typeof p.value === 'number' && (p.name === 'PnL' || p.name === 'Equity') ? `₹${p.value.toLocaleString()}` : p.value}
              </span>
           </div>
        ))}
      </div>
    );
  }
  return null;
};

const Dashboard: React.FC<DashboardProps> = ({ trades, strategyProfile, apiKey, preMarketNotes, preMarketAnalysis, onUpdatePreMarket, onNavigateToPreMarket, onViewTrade, onNavigateToPsychology }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'playbook' | 'simulator'>('overview');
  const [reportPeriod, setReportPeriod] = useState<'week' | 'fortnight' | 'month'>('week');
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [aiReport, setAiReport] = useState<string | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<{ type: string, value: string | number } | null>(null);
  const [isEditingPreMarket, setIsEditingPreMarket] = useState(false);
  const [tempPreMarket, setTempPreMarket] = useState('');

  const psychoStats = useMemo(() => {
    const closedTrades = trades.filter(t => t.outcome !== TradeOutcome.OPEN);
    if (closedTrades.length === 0) return { disciplineIndex: 0, systemAdherence: 0, streak: 0, overallDisciplined: 0, emotionalStability: 0, statusLabel: "Rookie" };

    const isDisciplined = (t: Trade) => {
        if (t.aiFeedback) {
            try {
                const data = JSON.parse(t.aiFeedback) as AiAnalysisResponse;
                return data.grade >= 60;
            } catch (e) { return (t.disciplineRating || 0) >= 3; }
        }
        return (t.disciplineRating || 0) >= 3;
    };

    const overallDisciplined = closedTrades.filter(isDisciplined).length;
    const systemAdherence = Math.round((overallDisciplined / closedTrades.length) * 100);
    const disciplineIndex = systemAdherence; // Simplified link

    const stableCount = closedTrades.filter(t => ['Neutral', 'Focused', 'Calm'].includes(t.emotionalState || '')).length;
    const emotionalStability = Math.round((stableCount / closedTrades.length) * 100);

    let streak = 0;
    const sortedTrades = [...closedTrades].sort((a, b) => new Date(b.date + 'T' + (b.entryTime || '00:00')).getTime() - new Date(a.date + 'T' + (a.entryTime || '00:00')).getTime());
    for (const t of sortedTrades) {
        if (isDisciplined(t)) streak++; else break;
    }

    let statusLabel = "Rookie";
    if (disciplineIndex >= 95) statusLabel = "Zen Master";
    else if (disciplineIndex >= 85) statusLabel = "Sniper";
    else if (disciplineIndex >= 70) statusLabel = "Disciplined";
    else if (disciplineIndex >= 50) statusLabel = "Drifting";
    else if (disciplineIndex > 0) statusLabel = "Tilted";

    return { disciplineIndex, systemAdherence, streak, overallDisciplined, emotionalStability, statusLabel };
  }, [trades]);

  const stats: DashboardStats = useMemo(() => {
    const perfTrades = trades.filter(t => t.outcome !== TradeOutcome.OPEN && t.outcome !== TradeOutcome.SKIPPED);
    const totalTrades = perfTrades.length;
    const wins = perfTrades.filter(t => t.outcome === TradeOutcome.WIN).length;
    const totalPnL = perfTrades.reduce((acc, t) => acc + (t.pnl || 0), 0);
    
    const ceTrades = perfTrades.filter(t => t.optionType === OptionType.CE);
    const peTrades = perfTrades.filter(t => t.optionType === OptionType.PE);
    const ceWins = ceTrades.filter(t => t.outcome === TradeOutcome.WIN).length;
    const peWins = peTrades.filter(t => t.outcome === TradeOutcome.WIN).length;

    return { 
        totalTrades, 
        winRate: totalTrades === 0 ? 0 : (wins / totalTrades) * 100, 
        totalPnL, 
        longWinRate: ceTrades.length === 0 ? 0 : (ceWins / ceTrades.length) * 100, 
        shortWinRate: peTrades.length === 0 ? 0 : (peWins / peTrades.length) * 100,
        profitFactor: 0, bestTrade: 0, worstTrade: 0, avgWin: 0, avgLoss: 0 // placeholders
    };
  }, [trades]);

  const optionTypeData = useMemo(() => {
    const performanceTrades = trades.filter(t => t.outcome !== TradeOutcome.OPEN && t.outcome !== TradeOutcome.SKIPPED);
    const ceCount = performanceTrades.filter(t => t.optionType === OptionType.CE).length;
    const peCount = performanceTrades.filter(t => t.optionType === OptionType.PE).length;
    
    return [
        { name: 'CE (Call)', value: ceCount, fill: 'url(#gradientCE)', type: 'CE', color: '#10B981' },
        { name: 'PE (Put)', value: peCount, fill: 'url(#gradientPE)', type: 'PE', color: '#F59E0B' }
    ].filter(d => d.value > 0);
  }, [trades]);

  const equityCurveData = useMemo(() => {
    let runningTotal = 0;
    return trades
        .filter(t => t.outcome !== TradeOutcome.OPEN && t.outcome !== TradeOutcome.SKIPPED)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .map(t => { 
            runningTotal += (t.pnl || 0); 
            return { 
                date: new Date(t.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }), 
                fullDate: t.date, 
                equity: runningTotal, 
                pnl: t.pnl || 0 
            }; 
        });
  }, [trades]);

  const last5DaysStreak = useMemo(() => {
      const dailyPnL: Record<string, number> = {};
      trades.filter(t => t.outcome !== TradeOutcome.OPEN).forEach(t => {
          dailyPnL[t.date] = (dailyPnL[t.date] || 0) + (t.pnl || 0);
      });
      const dates = Object.keys(dailyPnL).sort().reverse().slice(0, 5);
      return dates.map(d => ({ date: d, pnl: dailyPnL[d] }));
  }, [trades]);

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      {/* Top Banner & Discipline Stats */}
      <div onClick={() => onNavigateToPsychology?.()} className="bg-gradient-to-br from-slate-900 via-indigo-950/40 to-slate-900 rounded-3xl p-8 border border-indigo-500/20 shadow-2xl relative overflow-hidden group cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99] select-none">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500 via-indigo-600 to-purple-600"></div>
        <div className="relative z-10 grid grid-cols-1 md:grid-cols-12 gap-10 items-center">
            {/* Discipline Score Circle */}
            <div className="md:col-span-4 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-indigo-500/10 pb-8 md:pb-0 md:pr-10">
                <div className="flex items-center gap-2 mb-4 text-cyan-400/80"><ShieldCheck size={18}/><span className="text-[10px] font-black uppercase tracking-[0.2em]">Discipline Score</span></div>
                <div className="relative w-40 h-40 rounded-full border-2 border-indigo-500/20 flex items-center justify-center bg-slate-950/50 shadow-inner group-hover:border-indigo-500/40 transition-colors">
                    <div className="text-center">
                        <span className="text-5xl font-black text-white leading-none">{psychoStats.disciplineIndex}</span>
                        <span className="text-[10px] text-slate-500 font-bold uppercase mt-2 block tracking-widest">Grade</span>
                    </div>
                    {/* SVG Progress Ring */}
                    <svg className="absolute inset-0 w-full h-full -rotate-90">
                        <circle cx="80" cy="80" r="76" fill="transparent" stroke="currentColor" strokeWidth="4" className="text-indigo-500/10" />
                        <circle cx="80" cy="80" r="76" fill="transparent" stroke="currentColor" strokeWidth="4" strokeDasharray={477} strokeDashoffset={477 - (477 * psychoStats.disciplineIndex / 100)} strokeLinecap="round" className="text-indigo-500 drop-shadow-[0_0_8px_rgba(99,102,241,0.5)]" />
                    </svg>
                </div>
                <span className="mt-6 px-4 py-1.5 bg-indigo-600/10 border border-indigo-500/30 rounded-full text-xs font-black text-indigo-400 uppercase tracking-widest shadow-lg">{psychoStats.statusLabel}</span>
            </div>

            {/* Streak & Overall Card Integration */}
            <div className="md:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="bg-slate-950/40 p-6 rounded-2xl border border-white/5 flex flex-col justify-between group-hover:border-indigo-500/20 transition-all">
                    <div className="flex justify-between items-start mb-2">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Active Iron Streak</span>
                        <Flame size={24} className={psychoStats.streak > 0 ? "text-orange-500 animate-pulse" : "text-slate-700"} />
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className="text-5xl font-black text-white">{psychoStats.streak}</span>
                        <span className="text-xs text-slate-500 font-bold uppercase">Missions</span>
                    </div>
                    <p className="text-[9px] text-slate-600 uppercase mt-4 font-bold leading-relaxed">Consecutive executions following 100% of your rules without tilt.</p>
                </div>
                <div className="bg-slate-950/40 p-6 rounded-2xl border border-white/5 flex flex-col justify-between group-hover:border-emerald-500/20 transition-all">
                    <div className="flex justify-between items-start mb-2">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Overall Disciplined</span>
                        <ShieldCheck size={24} className="text-emerald-500/50" />
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className="text-5xl font-black text-white">{psychoStats.overallDisciplined}</span>
                        <span className="text-xs text-slate-500 font-bold uppercase">Total</span>
                    </div>
                    <div className="flex gap-1 mt-4">
                        {last5DaysStreak.map((d, i) => (
                            <div key={i} className={`h-1.5 flex-1 rounded-full ${d.pnl > 0 ? 'bg-emerald-500' : d.pnl < 0 ? 'bg-rose-500' : 'bg-slate-800'}`} title={d.date}></div>
                        ))}
                    </div>
                    <p className="text-[9px] text-slate-600 uppercase mt-1 font-bold">Last 5 Trading Sessions</p>
                </div>
            </div>
        </div>
      </div>

      {/* Main Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Account Growth Area Chart */}
        <div className="lg:col-span-8 bg-slate-900 rounded-3xl border border-slate-800 shadow-2xl p-8 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none group-hover:opacity-10 transition-opacity">
                <History size={150} className="text-white" />
            </div>
            <div className="flex justify-between items-center mb-8 relative z-10">
                <div>
                    <h3 className="text-white font-black text-sm uppercase tracking-[0.2em] flex items-center gap-2">
                        <TrendingUp size={16} className="text-indigo-400" /> Account Performance
                    </h3>
                    <p className="text-[10px] text-slate-500 font-bold uppercase mt-1 tracking-widest">Net Equity Over Time (Cumulative)</p>
                </div>
                <div className="text-right">
                    <span className={`text-2xl font-black font-mono ${stats.totalPnL >= 0 ? 'text-emerald-400' : 'text-rose-500'}`}>
                        {stats.totalPnL >= 0 ? '+' : ''}₹{stats.totalPnL.toLocaleString()}
                    </span>
                </div>
            </div>

            <div className="h-72 w-full relative z-10">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={equityCurveData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <defs>
                            <linearGradient id="equityGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                        <XAxis 
                            dataKey="date" 
                            stroke="#475569" 
                            fontSize={10} 
                            fontWeight="bold"
                            tickMargin={15} 
                            axisLine={false}
                            tickLine={false}
                        />
                        <YAxis 
                            stroke="#475569" 
                            fontSize={10} 
                            fontWeight="bold"
                            axisLine={false}
                            tickLine={false}
                            tickFormatter={(val) => `₹${val >= 1000 ? (val/1000).toFixed(1)+'k' : val}`}
                        />
                        <Tooltip content={<CustomChartTooltip />} cursor={{ stroke: '#6366f1', strokeWidth: 1, strokeDasharray: '4 4' }} />
                        <ReferenceLine y={0} stroke="#ffffff10" strokeWidth={2} />
                        <Area 
                            type="monotone" 
                            dataKey="equity" 
                            name="Equity"
                            stroke="#6366f1" 
                            strokeWidth={4} 
                            fill="url(#equityGradient)" 
                            activeDot={{ r: 8, stroke: '#6366f1', strokeWidth: 2, fill: '#fff', className: "drop-shadow-[0_0_8px_rgba(99,102,241,0.8)]" }} 
                            animationDuration={1500}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>

        {/* PE vs CE Pie Chart */}
        <div className="lg:col-span-4 bg-slate-900 rounded-3xl border border-slate-800 shadow-2xl p-8 flex flex-col relative overflow-hidden group">
            <h3 className="text-white font-black text-sm uppercase tracking-[0.2em] mb-8 flex items-center gap-2 relative z-10">
                <Scale size={16} className="text-indigo-400" /> Directional Bias
            </h3>
            
            <div className="h-64 w-full relative z-10">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <defs>
                            <linearGradient id="gradientCE" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#10B981" />
                                <stop offset="100%" stopColor="#059669" />
                            </linearGradient>
                            <linearGradient id="gradientPE" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#F59E0B" />
                                <stop offset="100%" stopColor="#D97706" />
                            </linearGradient>
                        </defs>
                        <Pie
                            data={optionTypeData}
                            cx="50%"
                            cy="50%"
                            innerRadius={70}
                            outerRadius={95}
                            paddingAngle={8}
                            dataKey="value"
                            stroke="none"
                            cornerRadius={10}
                            animationBegin={200}
                            animationDuration={1200}
                        >
                            {optionTypeData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.fill} className="outline-none hover:opacity-80 transition-opacity cursor-pointer" />
                            ))}
                        </Pie>
                        <Tooltip content={<CustomChartTooltip />} />
                    </PieChart>
                </ResponsiveContainer>
                
                {/* Center Stat */}
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                    <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest block">Win Rate</span>
                    <span className="text-3xl font-black text-white">{stats.winRate.toFixed(0)}%</span>
                </div>
            </div>

            {/* Custom Integrated Legend */}
            <div className="mt-auto grid grid-cols-2 gap-4 relative z-10">
                {optionTypeData.map((item, idx) => (
                    <div key={idx} className="bg-slate-950/50 p-3 rounded-2xl border border-white/5 flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }}></div>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{item.name}</span>
                        </div>
                        <div className="flex justify-between items-baseline">
                            <span className="text-xl font-black text-white">{item.value}</span>
                            <span className="text-[10px] font-bold text-slate-500">{Math.round((item.value / stats.totalTrades) * 100)}%</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>

      </div>

      {/* Traditional Tabs (Playbook, Simulator) continue below... */}
      <div className="flex bg-slate-900 rounded-2xl p-1.5 border border-slate-800 w-full md:w-auto self-start shadow-xl">
        <button onClick={() => setActiveTab('overview')} className={`flex-1 md:flex-none px-8 py-3 rounded-xl transition-all text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 ${activeTab === 'overview' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-white hover:bg-slate-800'}`}>
            <Activity size={16} /> Summary
        </button>
        <button onClick={() => setActiveTab('playbook')} className={`flex-1 md:flex-none px-8 py-3 rounded-xl transition-all text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 ${activeTab === 'playbook' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-white hover:bg-slate-800'}`}>
            <Book size={16} /> Playbook
        </button>
        <button onClick={() => setActiveTab('simulator')} className={`flex-1 md:flex-none px-8 py-3 rounded-xl transition-all text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 ${activeTab === 'simulator' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-white hover:bg-slate-800'}`}>
            <Dice6 size={16} /> Risk Sim
        </button>
      </div>

      {/* Conditional Rendering for Playbook/Simulator remains mostly same but with updated spacing */}
      {activeTab === 'overview' && (
          <div className="animate-fade-in grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Other overview cards can go here if needed */}
          </div>
      )}
    </div>
  );
};

export default Dashboard;
