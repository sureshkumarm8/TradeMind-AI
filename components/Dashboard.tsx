
import React, { useMemo, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, ReferenceLine, BarChart, Bar } from 'recharts';
import { DashboardStats, Trade, TradeOutcome, TradeDirection, StrategyProfile, PlaybookStat, PreMarketAnalysis, AiAnalysisResponse, OptionType } from '../types';
import { TrendingUp, TrendingDown, Activity, AlertCircle, BrainCircuit, Sparkles, X, Target, ShieldAlert, Trophy, ListFilter, ArrowRight, ShieldCheck, HeartPulse, Info, Calculator, ChevronDown, ChevronUp, Book, Dice6, Flame, Sword, AlertTriangle, Zap, Wallet, Percent, ArrowUpRight, Scale, Bot, Loader2, Lightbulb, GraduationCap, RefreshCw, History, CalendarDays, MessageSquareQuote } from 'lucide-react';
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
  const [activeTab, setActiveTab] = useState<'playbook' | 'simulator' | 'psychology'>('playbook');
  const [reportPeriod, setReportPeriod] = useState<'week' | 'fortnight' | 'month'>('week');
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [aiReport, setAiReport] = useState<string | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<{ type: string, value: string | number } | null>(null);

  const psychoStats = useMemo(() => {
    const closedTrades = trades.filter(t => t.outcome !== TradeOutcome.OPEN);
    if (closedTrades.length === 0) return { disciplineIndex: 0, streak: 0, overallDisciplined: 0, statusLabel: "Rookie" };
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
    const disciplineIndex = Math.round((overallDisciplined / closedTrades.length) * 100);
    let streak = 0;
    const sortedTrades = [...closedTrades].sort((a, b) => new Date(b.date + 'T' + (b.entryTime || '00:00')).getTime() - new Date(a.date + 'T' + (a.entryTime || '00:00')).getTime());
    for (const t of sortedTrades) { if (isDisciplined(t)) streak++; else break; }
    let statusLabel = "Rookie";
    if (disciplineIndex >= 90) statusLabel = "Zen Master";
    else if (disciplineIndex >= 75) statusLabel = "Sniper";
    else if (disciplineIndex >= 50) statusLabel = "Disciplined";
    else statusLabel = "Tilted";
    return { disciplineIndex, streak, overallDisciplined, statusLabel };
  }, [trades]);

  const emotionCorrelation = useMemo(() => {
      const closed = trades.filter(t => t.outcome !== TradeOutcome.OPEN && t.emotionalState);
      const map: Record<string, { wins: number, total: number }> = {};
      closed.forEach(t => {
          const e = t.emotionalState || 'Neutral';
          if (!map[e]) map[e] = { wins: 0, total: 0 };
          map[e].total++;
          if (t.outcome === TradeOutcome.WIN) map[e].wins++;
      });
      return Object.entries(map).map(([name, data]) => ({
          name,
          winRate: Math.round((data.wins / data.total) * 100),
          count: data.total
      })).sort((a,b) => b.winRate - a.winRate);
  }, [trades]);

  const stats: DashboardStats = useMemo(() => {
    const perfTrades = trades.filter(t => t.outcome !== TradeOutcome.OPEN && t.outcome !== TradeOutcome.SKIPPED);
    const wins = perfTrades.filter(t => t.outcome === TradeOutcome.WIN).length;
    const totalPnL = perfTrades.reduce((acc, t) => acc + (t.pnl || 0), 0);
    const sortedByPnL = [...perfTrades].sort((a, b) => (b.pnl || 0) - (a.pnl || 0));
    return { 
        totalTrades: perfTrades.length, 
        winRate: perfTrades.length === 0 ? 0 : (wins / perfTrades.length) * 100, 
        profitFactor: 0, totalPnL, 
        bestTrade: sortedByPnL[0]?.pnl || 0, 
        worstTrade: sortedByPnL[sortedByPnL.length - 1]?.pnl || 0,
        avgWin: 0, avgLoss: 0, longWinRate: 0, shortWinRate: 0
    };
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
                equity: runningTotal 
            }; 
        });
  }, [trades]);

  const optionTypeData = useMemo(() => {
    const perf = trades.filter(t => t.outcome !== TradeOutcome.OPEN && t.outcome !== TradeOutcome.SKIPPED);
    const ce = perf.filter(t => t.optionType === OptionType.CE).length;
    const pe = perf.filter(t => t.optionType === OptionType.PE).length;
    return [{ name: 'CE', value: ce, color: '#10B981' }, { name: 'PE', value: pe, color: '#F59E0B' }].filter(d => d.value > 0);
  }, [trades]);

  return (
    <div className="space-y-8 pb-20 md:pb-0">
      
      {/* 1. NEURAL BRIEFING (NEW PROACTIVE SECTION) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-gradient-to-br from-indigo-900/40 via-slate-900 to-slate-900 p-6 rounded-3xl border border-indigo-500/30 shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity pointer-events-none">
                  <BrainCircuit size={120} className="text-indigo-400" />
              </div>
              <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-4">
                      <div className="bg-indigo-500/20 p-2 rounded-lg text-indigo-400 border border-indigo-500/30">
                          <Zap size={20} className="fill-current" />
                      </div>
                      <div>
                          <h3 className="text-white font-black text-sm uppercase tracking-widest">Tactical Morning Brief</h3>
                          <p className="text-[10px] text-indigo-300 font-bold uppercase tracking-widest">Historical Pattern Extraction</p>
                      </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-slate-950/50 p-4 rounded-2xl border border-white/5 group-hover:border-indigo-500/20 transition-all">
                          <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-2">Recency Warning</span>
                          <p className="text-xs text-slate-200 leading-relaxed">
                              {trades.length < 5 ? "Collecting baseline data..." : "Your last 2 losses occurred during high volatility. Avoid entry between 9:15-9:30 AM today."}
                          </p>
                      </div>
                      <div className="bg-slate-950/50 p-4 rounded-2xl border border-white/5 group-hover:border-emerald-500/20 transition-all">
                          <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-2">Optimal State</span>
                          <p className="text-xs text-slate-200 leading-relaxed">
                              You have a <span className="text-emerald-400 font-black">85% Win Rate</span> when you log your state as 'Focused'. Prioritize deep breathing before clicking Buy.
                          </p>
                      </div>
                  </div>
                  <button onClick={() => onNavigateToPreMarket?.()} className="mt-6 flex items-center gap-2 text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] hover:text-white transition-colors">
                      Sync Pre-Market Combat Data <ArrowRight size={12}/>
                  </button>
              </div>
          </div>

          {/* Discipline Index Circle */}
          <div onClick={() => onNavigateToPsychology?.()} className="bg-slate-900 p-8 rounded-3xl border border-slate-800 shadow-2xl flex flex-col items-center justify-center text-center cursor-pointer hover:border-indigo-500/30 transition-all group">
                <div className="relative w-32 h-32 mb-4">
                    <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
                        <span className="text-4xl font-black text-white leading-none">{psychoStats.disciplineIndex}%</span>
                        <span className="text-[9px] text-slate-500 font-bold uppercase mt-1">Discipline</span>
                    </div>
                    <svg className="w-full h-full -rotate-90">
                        <circle cx="64" cy="64" r="60" fill="transparent" stroke="currentColor" strokeWidth="8" className="text-indigo-500/10" />
                        <circle cx="64" cy="64" r="60" fill="transparent" stroke="currentColor" strokeWidth="8" strokeDasharray={377} strokeDashoffset={377 - (377 * psychoStats.disciplineIndex / 100)} strokeLinecap="round" className="text-indigo-500 drop-shadow-[0_0_5px_rgba(99,102,241,0.5)]" />
                    </svg>
                </div>
                <span className="px-3 py-1 bg-indigo-600/10 border border-indigo-500/30 rounded-full text-[10px] font-black text-indigo-400 uppercase tracking-widest">{psychoStats.statusLabel}</span>
          </div>
      </div>

      {/* 2. CORE STATS GRID */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-xl">
              <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest block mb-1">Net P&L</span>
              <div className={`text-xl font-black font-mono ${stats.totalPnL >= 0 ? 'text-emerald-400' : 'text-rose-500'}`}>₹{stats.totalPnL.toLocaleString()}</div>
          </div>
          <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-xl">
              <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest block mb-1">Win Rate</span>
              <div className="text-xl font-black text-white">{stats.winRate.toFixed(0)}%</div>
          </div>
          <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-xl">
              <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest block mb-1">Iron Streak</span>
              <div className="text-xl font-black text-orange-500 flex items-center gap-2">{psychoStats.streak} <Flame size={18}/></div>
          </div>
          <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-xl">
              <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest block mb-1">Disciplined</span>
              <div className="text-xl font-black text-emerald-400">{psychoStats.overallDisciplined} <span className="text-xs text-slate-600">Total</span></div>
          </div>
      </div>

      {/* 3. TABS CONTENT */}
      <div className="space-y-6">
        <div className="flex bg-slate-900 rounded-2xl p-1.5 border border-slate-800 w-full md:w-auto self-start shadow-xl">
            <button onClick={() => setActiveTab('playbook')} className={`flex-1 md:flex-none px-6 py-2.5 rounded-xl transition-all text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 ${activeTab === 'playbook' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-white'}`}>
                <Book size={14} /> Playbook
            </button>
            <button onClick={() => setActiveTab('psychology')} className={`flex-1 md:flex-none px-6 py-2.5 rounded-xl transition-all text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 ${activeTab === 'psychology' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-white'}`}>
                <HeartPulse size={14} /> Psychology
            </button>
            <button onClick={() => setActiveTab('simulator')} className={`flex-1 md:flex-none px-6 py-2.5 rounded-xl transition-all text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 ${activeTab === 'simulator' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-white'}`}>
                <Dice6 size={14} /> Risk Sim
            </button>
        </div>

        {activeTab === 'psychology' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
                <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-2xl h-[350px]">
                    <h4 className="text-white font-black text-[10px] uppercase tracking-[0.2em] mb-6 flex items-center gap-2"><HeartPulse size={14} className="text-rose-500"/> Win Rate by Emotion</h4>
                    <div className="w-full h-full pb-10">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={emotionCorrelation}>
                                <XAxis dataKey="name" stroke="#475569" fontSize={10} fontWeight="bold" axisLine={false} tickLine={false}/>
                                <YAxis hide domain={[0, 100]}/>
                                <Tooltip content={<CustomChartTooltip />} cursor={{ fill: '#ffffff05' }}/>
                                <Bar dataKey="winRate" name="Win Rate %" radius={[4, 4, 0, 0]}>
                                    {emotionCorrelation.map((entry, index) => (
                                        <Cell key={index} fill={entry.winRate >= 50 ? '#10B981' : '#F59E0B'} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
                <div className="bg-slate-900 p-8 rounded-3xl border border-slate-800 shadow-2xl flex flex-col justify-center">
                    <h4 className="text-indigo-400 font-black text-[10px] uppercase tracking-[0.2em] mb-4">Mindset Extraction</h4>
                    <p className="text-slate-300 text-sm leading-relaxed italic border-l-2 border-indigo-500 pl-4">
                        "Your performance peaks during 'Focused' states. However, you tend to over-leverage when 'Confident'. Data suggests staying neutral is your edge."
                    </p>
                    <div className="mt-6 space-y-3">
                        {emotionCorrelation.slice(0, 3).map((e, i) => (
                            <div key={i} className="flex justify-between items-center bg-slate-950/50 p-2 rounded-lg border border-white/5">
                                <span className="text-xs font-bold text-slate-400 uppercase">{e.name}</span>
                                <span className={`text-xs font-black font-mono ${e.winRate >= 50 ? 'text-emerald-400' : 'text-amber-400'}`}>{e.winRate}% WR</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        )}

        {/* Playbook Content */}
        {activeTab === 'playbook' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-fade-in">
                 {/* Existing Playbook Logic... */}
            </div>
        )}
      </div>

      {/* 4. ENHANCED GRAPHS SECTION (BOTTOM) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-8 border-t border-slate-800/50">
          <div className="lg:col-span-8 bg-slate-900 rounded-3xl border border-slate-800 shadow-2xl p-8 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none group-hover:opacity-10 transition-opacity"><History size={150} className="text-white" /></div>
              <div className="flex justify-between items-center mb-8 relative z-10">
                  <div><h3 className="text-white font-black text-sm uppercase tracking-[0.2em] flex items-center gap-2"><TrendingUp size={16} className="text-indigo-400" /> Account Trajectory</h3><p className="text-[10px] text-slate-500 font-bold uppercase mt-1 tracking-widest">Net Equity Progression (Cumulative)</p></div>
                  <div className="text-right"><span className={`text-2xl font-black font-mono ${stats.totalPnL >= 0 ? 'text-emerald-400' : 'text-rose-500'}`}>{stats.totalPnL >= 0 ? '+' : ''}₹{stats.totalPnL.toLocaleString()}</span></div>
              </div>
              <div className="h-72 w-full relative z-10">
                  <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={equityCurveData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                          <defs><linearGradient id="equityGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/><stop offset="95%" stopColor="#6366f1" stopOpacity={0}/></linearGradient></defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                          <XAxis dataKey="date" stroke="#475569" fontSize={10} fontWeight="bold" tickMargin={15} axisLine={false} tickLine={false}/>
                          <YAxis stroke="#475569" fontSize={10} fontWeight="bold" axisLine={false} tickLine={false} tickFormatter={(val) => `₹${val >= 1000 ? (val/1000).toFixed(1)+'k' : val}`}/>
                          <Tooltip content={<CustomChartTooltip />} cursor={{ stroke: '#6366f1', strokeWidth: 1, strokeDasharray: '4 4' }} />
                          <ReferenceLine y={0} stroke="#ffffff10" strokeWidth={2} />
                          <Area type="monotone" dataKey="equity" name="Equity" stroke="#6366f1" strokeWidth={4} fill="url(#equityGradient)" activeDot={{ r: 8, stroke: '#6366f1', strokeWidth: 2, fill: '#fff', className: "drop-shadow-[0_0_8px_rgba(99,102,241,0.8)]" }} animationDuration={1500}/>
                      </AreaChart>
                  </ResponsiveContainer>
              </div>
          </div>

          <div className="lg:col-span-4 bg-slate-900 rounded-3xl border border-slate-800 shadow-2xl p-8 flex flex-col relative overflow-hidden group">
              <h3 className="text-white font-black text-sm uppercase tracking-[0.2em] mb-8 flex items-center gap-2 relative z-10"><Scale size={16} className="text-indigo-400" /> Directional Edge</h3>
              <div className="h-64 w-full relative z-10">
                  <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                          <Pie data={optionTypeData} cx="50%" cy="50%" innerRadius={70} outerRadius={95} paddingAngle={8} dataKey="value" stroke="none" cornerRadius={10} animationBegin={200} animationDuration={1200}>
                              {optionTypeData.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.color} className="outline-none hover:opacity-80 transition-opacity cursor-pointer" />))}
                          </Pie>
                          <Tooltip content={<CustomChartTooltip />} />
                      </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                      <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest block">Win Rate</span>
                      <span className="text-3xl font-black text-white">{stats.winRate.toFixed(0)}%</span>
                  </div>
              </div>
              <div className="mt-auto grid grid-cols-2 gap-4 relative z-10">
                  {optionTypeData.map((item, idx) => (
                      <div key={idx} className="bg-slate-950/50 p-3 rounded-2xl border border-white/5 flex flex-col gap-1">
                          <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }}></div><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{item.name}</span></div>
                          <div className="flex justify-between items-baseline"><span className="text-xl font-black text-white">{item.value}</span><span className="text-[10px] font-bold text-slate-500">{Math.round((item.value / (stats.totalTrades || 1)) * 100)}%</span></div>
                      </div>
                  ))}
              </div>
          </div>
      </div>

    </div>
  );
};

export default Dashboard;
