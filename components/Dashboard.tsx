
import React, { useMemo, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, ReferenceLine } from 'recharts';
import { DashboardStats, Trade, TradeOutcome, StrategyProfile, PlaybookStat, AiAnalysisResponse, OptionType, PreMarketAnalysis } from '../types';
import { TrendingUp, TrendingDown, Activity, BrainCircuit, Sparkles, Target, ShieldCheck, HeartPulse, Book, Dice6, Flame, Zap, ArrowRight, Bot, History, Scale, ShieldAlert, Calendar, Clock, DollarSign } from 'lucide-react';

interface DashboardProps {
  trades: Trade[];
  strategyProfile: StrategyProfile;
  apiKey?: string;
  preMarketNotes?: { date: string; notes: string };
  preMarketAnalysis?: { date: string; timestamp?: string; data: PreMarketAnalysis };
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
                {p.name === 'PnL' || p.name === 'Equity' ? `₹${p.value.toLocaleString()}` : p.value}
              </span>
           </div>
        ))}
      </div>
    );
  }
  return null;
};

const Dashboard: React.FC<DashboardProps> = ({ 
  trades, 
  strategyProfile, 
  apiKey, 
  onNavigateToPreMarket, 
  onViewTrade, 
  onNavigateToPsychology,
  preMarketNotes,
  preMarketAnalysis,
  onUpdatePreMarket
}) => {
  const [activeTab, setActiveTab] = useState<'playbook' | 'simulator' | 'psychology'>('playbook');

  // Unified Discipline & Psychology Stats
  const psychoStats = useMemo(() => {
    const closedTrades = trades.filter(t => t.outcome !== TradeOutcome.OPEN && t.outcome !== TradeOutcome.SKIPPED);
    
    // Default values if no trades
    if (closedTrades.length === 0) {
        return { disciplineIndex: 100, streak: 0, totalDisciplined: 0, statusLabel: "Ready", last5: [], totalTrades: 0 };
    }

    const isDisciplined = (t: Trade) => {
        if (t.aiFeedback) {
            try {
                const data = JSON.parse(t.aiFeedback) as AiAnalysisResponse;
                return data.grade >= 60;
            } catch (e) { return (t.disciplineRating || 0) >= 4; }
        }
        return (t.disciplineRating || 0) >= 4;
    };

    const disciplinedTradesCount = closedTrades.filter(isDisciplined).length;
    const disciplineIndex = Math.round((disciplinedTradesCount / (closedTrades.length || 1)) * 100);

    // Calculate Current Streak (Latest consecutive disciplined trades)
    let streak = 0;
    const sortedByTime = [...closedTrades].sort((a, b) => 
        new Date(b.date + 'T' + (b.entryTime || '00:00')).getTime() - 
        new Date(a.date + 'T' + (a.entryTime || '00:00')).getTime()
    );
    for (const t of sortedByTime) {
        if (isDisciplined(t)) streak++; else break;
    }

    // Last 5 Days Discipline Visual
    const dailyDiscipline: Record<string, boolean> = {};
    const dayList: string[] = Array.from(new Set(trades.map(t => t.date))).sort().reverse();
    
    dayList.slice(0, 5).forEach(date => {
        const dayTrades = trades.filter(t => t.date === date && t.outcome !== TradeOutcome.OPEN);
        if (dayTrades.length === 0) return;
        // A day is "Disciplined" if ALL non-skipped trades that day are disciplined
        const activeDayTrades = dayTrades.filter(t => t.outcome !== TradeOutcome.SKIPPED);
        if (activeDayTrades.length === 0) {
            dailyDiscipline[date] = true; // Neutral/Skipped day is fine
        } else {
            dailyDiscipline[date] = activeDayTrades.every(isDisciplined);
        }
    });
    
    // Convert to array for UI
    const last5 = Object.entries(dailyDiscipline)
        .map(([date, ok]) => ({ date, ok }))
        .sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime()); // Sort chronological for display

    let statusLabel = "Rookie";
    if (disciplineIndex >= 90) statusLabel = "Zen Master";
    else if (disciplineIndex >= 75) statusLabel = "Sniper";
    else if (disciplineIndex >= 50) statusLabel = "Disciplined";
    else statusLabel = "Tilted";

    return { 
        disciplineIndex, 
        streak, 
        totalDisciplined: disciplinedTradesCount, 
        statusLabel, 
        last5, // Array of {date, ok}
        totalTrades: trades.length 
    };
  }, [trades]);

  const stats = useMemo(() => {
    const perfTrades = trades.filter(t => t.outcome !== TradeOutcome.OPEN && t.outcome !== TradeOutcome.SKIPPED);
    const wins = perfTrades.filter(t => t.outcome === TradeOutcome.WIN).length;
    const totalPnL = perfTrades.reduce((acc, t) => acc + (t.pnl || 0), 0);
    const avgPnL = perfTrades.length > 0 ? totalPnL / perfTrades.length : 0;
    
    return { 
        totalTrades: perfTrades.length, 
        winRate: perfTrades.length === 0 ? 0 : (wins / perfTrades.length) * 100, 
        totalPnL, 
        avgPnL,
        netFlowColor: totalPnL >= 0 ? 'text-emerald-400' : 'text-rose-500'
    };
  }, [trades]);

  const equityCurveData = useMemo(() => {
    let runningTotal = 0;
    const data = trades
        .filter(t => t.outcome !== TradeOutcome.OPEN && t.outcome !== TradeOutcome.SKIPPED)
        .sort((a, b) => new Date(a.date + 'T' + (a.entryTime || '00:00')).getTime() - new Date(b.date + 'T' + (b.entryTime || '00:00')).getTime())
        .map(t => { 
            runningTotal += (t.pnl || 0); 
            return { 
                timestamp: new Date(t.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }), 
                equity: runningTotal 
            }; 
        });
    return data.length > 0 ? data : [{ timestamp: 'Start', equity: 0 }];
  }, [trades]);

  const optionTypeData = useMemo(() => {
    const perf = trades.filter(t => t.outcome !== TradeOutcome.OPEN && t.outcome !== TradeOutcome.SKIPPED);
    const ce = perf.filter(t => t.optionType === OptionType.CE).length;
    const pe = perf.filter(t => t.optionType === OptionType.PE).length;
    return [{ name: 'CE', value: ce, color: '#10B981' }, { name: 'PE', value: pe, color: '#F59E0B' }].filter(d => d.value > 0);
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

  const playbookStats = useMemo(() => {
      const statsMap: Record<string, PlaybookStat> = {};
      const closed = trades.filter(t => t.outcome !== TradeOutcome.OPEN && t.outcome !== TradeOutcome.SKIPPED && t.setupName);
      closed.forEach(t => {
          const name = t.setupName.trim() || 'Unlabeled';
          if (!statsMap[name]) statsMap[name] = { setupName: name, count: 0, winRate: 0, avgPnL: 0, totalPnL: 0 };
          const s = statsMap[name];
          s.count++;
          s.totalPnL += (t.pnl || 0);
      });
      return Object.values(statsMap).map(s => {
          const wins = closed.filter(t => (t.setupName?.trim() || 'Unlabeled') === s.setupName && t.outcome === TradeOutcome.WIN).length;
          s.winRate = Math.round((wins / s.count) * 100);
          s.avgPnL = Math.round(s.totalPnL / s.count);
          return s;
      }).sort((a,b) => b.totalPnL - a.totalPnL);
  }, [trades]);

  const riskSimData = useMemo(() => {
      const filtered = trades.filter(t => t.outcome !== TradeOutcome.SKIPPED && t.outcome !== TradeOutcome.OPEN);
      if (filtered.length < 5) return null;
      const wins = filtered.filter(t => t.outcome === TradeOutcome.WIN);
      const losses = filtered.filter(t => t.outcome === TradeOutcome.LOSS);
      if (wins.length === 0 || losses.length === 0) return null;
      const avgWin = wins.reduce((a,b) => a + (b.pnl || 0), 0) / wins.length;
      const avgLoss = Math.abs(losses.reduce((a,b) => a + (b.pnl || 0), 0) / losses.length);
      const winRate = wins.length / (wins.length + losses.length);
      const probRuin = Math.exp(-2 * ( (winRate * avgWin - (1-winRate) * avgLoss) / Math.sqrt( (winRate * avgWin**2 + (1-winRate) * avgLoss**2) ) ) );
      return { avgWin, avgLoss, winRate, probRuin: Math.min(1, Math.max(0, probRuin)) };
  }, [trades]);

  return (
    <div className="space-y-6 pb-24 md:pb-12 animate-fade-in">
      
      {/* 1. TOP ROW: PSYCHOLOGY & BRIEFING (Merged to reduce duplicates) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Tactical Pulse Card (Discipline Metrics) */}
          <div className="lg:col-span-2 bg-gradient-to-br from-indigo-900/40 via-slate-900 to-slate-900 p-6 rounded-3xl border border-indigo-500/20 shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
                  <ShieldCheck size={150} className="text-indigo-400" />
              </div>
              
              <div className="relative z-10">
                  <div className="flex justify-between items-start mb-6">
                      <div className="flex items-center gap-3">
                          <div className="bg-indigo-500/20 p-2 rounded-lg text-indigo-400 border border-indigo-500/30">
                              <BrainCircuit size={24} />
                          </div>
                          <div>
                              <h3 className="text-white font-black text-sm uppercase tracking-widest">Psychology Pulse</h3>
                              <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest">Behavioral Sync Status</p>
                          </div>
                      </div>
                      
                      {/* Last 5 Days Visual */}
                      <div className="flex flex-col items-end">
                          <div className="flex gap-1.5 mb-1" title="Last 5 Trading Days Discipline">
                              {psychoStats.last5.map((day, i) => (
                                  <div key={i} className={`w-3 h-3 rounded-full ${day.ok ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]' : 'bg-rose-500'}`} title={day.date}></div>
                              ))}
                              {Array.from({ length: Math.max(0, 5 - psychoStats.last5.length) }).map((_, i) => (
                                  <div key={i} className="w-3 h-3 rounded-full bg-slate-800 border border-slate-700"></div>
                              ))}
                          </div>
                          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wide">Last 5 Sessions</span>
                      </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div onClick={() => onNavigateToPsychology?.()} className="bg-slate-950/40 p-4 rounded-2xl border border-white/5 group-hover:border-indigo-500/20 transition-all cursor-pointer">
                          <span className="text-[10px] font-black text-slate-500 uppercase block mb-1">Index Score</span>
                          <div className="flex items-baseline gap-2">
                              <span className="text-3xl font-black text-white">{psychoStats.disciplineIndex}%</span>
                              <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${psychoStats.disciplineIndex >= 70 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
                                {psychoStats.statusLabel}
                              </span>
                          </div>
                      </div>
                      <div className="bg-slate-950/40 p-4 rounded-2xl border border-white/5 group-hover:border-orange-500/20 transition-all">
                          <span className="text-[10px] font-black text-slate-500 uppercase block mb-1">Iron Streak</span>
                          <div className="flex items-center gap-2">
                            <span className="text-3xl font-black text-white">{psychoStats.streak}</span>
                            <Flame size={20} className={psychoStats.streak > 0 ? "text-orange-500 animate-pulse" : "text-slate-700"} />
                          </div>
                          <span className="text-[10px] text-slate-500 uppercase">Consecutive Trades</span>
                      </div>
                      <div className="bg-slate-950/40 p-4 rounded-2xl border border-white/5 group-hover:border-blue-500/20 transition-all">
                          <span className="text-[10px] font-black text-slate-500 uppercase block mb-1">Total Discipline</span>
                          <div className="text-3xl font-black text-white">{psychoStats.totalDisciplined}</div>
                          <span className="text-[10px] text-slate-500 uppercase">Successful Logs</span>
                      </div>
                  </div>
              </div>
          </div>

          {/* Quick Net Flow (Financials) */}
          <div className="lg:col-span-1 bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-2xl flex flex-col justify-between relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><TrendingUp size={100}/></div>
              <div>
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">Net Flow</span>
                  <div className={`text-4xl font-black font-mono tracking-tighter ${stats.netFlowColor}`}>
                      {stats.totalPnL >= 0 ? '+' : ''}₹{stats.totalPnL.toLocaleString()}
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded border ${stats.totalPnL >= 0 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'}`}>
                          {stats.totalPnL >= 0 ? 'PROFITABLE' : 'DRAWDOWN'}
                      </span>
                  </div>
              </div>
              <button onClick={() => onNavigateToPreMarket?.()} className="mt-6 flex items-center justify-between w-full p-3 rounded-xl bg-slate-950/50 border border-slate-700 hover:border-indigo-500/50 hover:bg-slate-800 transition group/btn">
                  <span className="text-xs font-bold text-slate-300">Open Pre-Market</span>
                  <ArrowRight size={14} className="text-slate-500 group-hover/btn:text-indigo-400 transition-colors"/>
              </button>
          </div>
      </div>

      {/* 2. CORE FINANCIAL STATS (Clean Grid) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-xl group hover:border-slate-700 transition-colors">
              <div className="flex justify-between items-start mb-1">
                  <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Avg PnL</span>
                  <Activity size={14} className="text-blue-500" />
              </div>
              <div className={`text-lg font-black font-mono ${stats.avgPnL >= 0 ? 'text-blue-400' : 'text-slate-400'}`}>
                  {stats.avgPnL >= 0 ? '+' : ''}₹{Math.round(stats.avgPnL).toLocaleString()}
              </div>
          </div>
          <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-xl group hover:border-slate-700 transition-colors">
              <div className="flex justify-between items-start mb-1">
                  <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Total Missions</span>
                  <History size={14} className="text-indigo-500" />
              </div>
              <div className="text-lg font-black text-white">{stats.totalTrades}</div>
          </div>
          <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-xl group hover:border-slate-700 transition-colors">
              <div className="flex justify-between items-start mb-1">
                  <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Win Rate</span>
                  <Target size={14} className="text-emerald-500" />
              </div>
              <div className="text-lg font-black text-white">{stats.winRate.toFixed(0)}%</div>
          </div>
          <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-xl group hover:border-slate-700 transition-colors">
              <div className="flex justify-between items-start mb-1">
                  <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Expectancy</span>
                  <Scale size={14} className="text-purple-500" />
              </div>
              {riskSimData ? (
                  <div className="text-lg font-black text-white">{(riskSimData.avgWin / (riskSimData.avgLoss || 1)).toFixed(2)}<span className="text-xs text-slate-500">R</span></div>
              ) : <div className="text-xs text-slate-500 mt-1 italic">Not enough data</div>}
          </div>
      </div>

      {/* 3. TABS: INTELLIGENCE MODULES */}
      <div className="space-y-4">
        <div className="flex bg-slate-900 rounded-2xl p-1.5 border border-slate-800 w-full md:w-auto self-start shadow-xl">
            <button onClick={() => setActiveTab('playbook')} className={`flex-1 md:flex-none px-6 py-2.5 rounded-xl transition-all text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 ${activeTab === 'playbook' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-white hover:bg-slate-800'}`}>
                <Book size={14} /> Playbook
            </button>
            <button onClick={() => setActiveTab('psychology')} className={`flex-1 md:flex-none px-6 py-2.5 rounded-xl transition-all text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 ${activeTab === 'psychology' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-white hover:bg-slate-800'}`}>
                <HeartPulse size={14} /> Mindset
            </button>
            <button onClick={() => setActiveTab('simulator')} className={`flex-1 md:flex-none px-6 py-2.5 rounded-xl transition-all text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 ${activeTab === 'simulator' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-white hover:bg-slate-800'}`}>
                <Dice6 size={14} /> Risk
            </button>
        </div>

        {/* Playbook Content */}
        {activeTab === 'playbook' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-fade-in">
                {playbookStats.map((stat, idx) => (
                    <div key={idx} className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden hover:border-indigo-500/50 transition-all shadow-xl group">
                        <div className={`h-1 w-full ${stat.totalPnL > 0 ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
                        <div className="p-5">
                            <div className="flex justify-between items-start mb-4">
                                <h4 className="font-black text-white text-sm uppercase tracking-tight group-hover:text-indigo-400 transition-colors">{stat.setupName}</h4>
                                <span className="text-[9px] font-black text-slate-500 bg-slate-900 px-2 py-0.5 rounded border border-slate-700">{stat.count} Mns</span>
                            </div>
                            <div className="space-y-3">
                                <div className="flex justify-between items-center"><span className="text-[9px] text-slate-500 font-black uppercase">Win Probability</span><span className={`text-xs font-black font-mono ${stat.winRate >= 50 ? 'text-emerald-400' : 'text-amber-400'}`}>{stat.winRate}%</span></div>
                                <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden"><div className={`h-full rounded-full ${stat.winRate >= 50 ? 'bg-emerald-500' : 'bg-amber-500'}`} style={{width: `${stat.winRate}%`}}></div></div>
                                <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-700/50">
                                    <div><span className="text-[8px] text-slate-500 uppercase font-black block">Avg Payoff</span><span className={`text-xs font-black font-mono ${stat.avgPnL > 0 ? 'text-emerald-400' : 'text-red-400'}`}>₹{stat.avgPnL.toFixed(0)}</span></div>
                                    <div className="text-right"><span className="text-[8px] text-slate-500 uppercase font-black block">Net Flow</span><span className={`text-xs font-black font-mono ${stat.totalPnL > 0 ? 'text-emerald-400' : 'text-red-400'}`}>₹{stat.totalPnL.toFixed(0)}</span></div>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
                {playbookStats.length === 0 && <div className="col-span-full text-center py-12 bg-slate-900/30 rounded-3xl border border-dashed border-slate-700 text-slate-600 text-xs font-bold uppercase tracking-widest">No Setup Patterns Detected</div>}
            </div>
        )}

        {/* Psychology Content */}
        {activeTab === 'psychology' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
                <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-2xl h-[300px]">
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
                <div className="bg-slate-900 p-8 rounded-3xl border border-slate-800 shadow-2xl flex flex-col justify-center relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-5"><Activity size={100}/></div>
                    <h4 className="text-indigo-400 font-black text-[10px] uppercase tracking-[0.2em] mb-4">Mindset Extraction</h4>
                    <p className="text-slate-300 text-sm leading-relaxed italic border-l-2 border-indigo-500 pl-4 relative z-10">
                        "Your performance peaks during 'Focused' and 'Calm' states. Data suggests you should only take high-RR trades when feeling neutral."
                    </p>
                    <div className="mt-6 space-y-2 relative z-10">
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

        {/* Risk Simulator Content */}
        {activeTab === 'simulator' && (
            <div className="animate-fade-in">
                {riskSimData ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-slate-800 p-6 rounded-3xl border border-slate-700 shadow-2xl">
                            <h4 className="text-indigo-400 font-black text-[10px] uppercase mb-6 tracking-widest flex items-center gap-2"><Target size={14}/> Risk Benchmarks</h4>
                            <div className="space-y-4">
                                <div className="flex justify-between border-b border-slate-700/50 pb-2">
                                    <span className="text-xs font-bold text-slate-400 uppercase">Avg Winner</span>
                                    <span className="font-black font-mono text-emerald-400">₹{riskSimData.avgWin.toFixed(0)}</span>
                                </div>
                                <div className="flex justify-between border-b border-slate-700/50 pb-2">
                                    <span className="text-xs font-bold text-slate-400 uppercase">Avg Loser</span>
                                    <span className="font-black font-mono text-red-400">₹{riskSimData.avgLoss.toFixed(0)}</span>
                                </div>
                                <div className="flex justify-between border-b border-slate-700/50 pb-2">
                                    <span className="text-xs font-bold text-slate-400 uppercase">Reward:Risk</span>
                                    <span className="font-black font-mono text-white">1:{(riskSimData.avgWin / riskSimData.avgLoss).toFixed(1)}</span>
                                </div>
                            </div>
                        </div>
                        <div className="bg-slate-900 p-8 rounded-3xl border border-rose-500/20 shadow-2xl flex flex-col items-center justify-center text-center relative overflow-hidden group">
                            <div className="absolute inset-0 bg-gradient-to-br from-rose-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            <h4 className="text-rose-500 font-black text-[10px] uppercase mb-4 tracking-widest flex items-center gap-2 relative z-10"><Bot size={14}/> Risk of Ruin</h4>
                            <div className={`text-5xl font-black mb-2 relative z-10 ${riskSimData.probRuin < 0.05 ? 'text-emerald-400' : riskSimData.probRuin < 0.20 ? 'text-amber-400' : 'text-rose-500'}`}>
                                {(riskSimData.probRuin * 100).toFixed(1)}%
                            </div>
                            <p className="text-[9px] text-slate-500 font-medium uppercase tracking-tight relative z-10 px-6">Account devastation probability based on current edge.</p>
                        </div>
                    </div>
                ) : <div className="bg-slate-900/50 p-12 rounded-3xl border border-dashed border-slate-700 text-center animate-fade-in">
                     <ShieldAlert size={48} className="mx-auto text-slate-700 mb-4" />
                     <h4 className="text-slate-500 font-black text-xs uppercase tracking-[0.3em]">Simulation Offline</h4>
                     <p className="text-slate-600 text-[10px] mt-2 max-w-xs mx-auto uppercase font-bold">5+ Missions Required for Probability Modeling</p>
                </div>}
            </div>
        )}
      </div>

      {/* 4. TRAJECTORY GRAPHS (PERMANENTLY VISIBLE) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-6 border-t border-slate-800/50">
          <div className="lg:col-span-8 bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none group-hover:opacity-10 transition-opacity"><History size={120} className="text-white" /></div>
              <div className="flex justify-between items-center mb-6 relative z-10">
                  <div><h3 className="text-white font-black text-xs uppercase tracking-[0.2em] flex items-center gap-2"><Activity size={14} className="text-indigo-400" /> Account Trajectory</h3></div>
                  <div className="text-right"><span className={`text-xl font-black font-mono ${stats.totalPnL >= 0 ? 'text-emerald-400' : 'text-rose-500'}`}>₹{stats.totalPnL.toLocaleString()}</span></div>
              </div>
              <div className="h-64 w-full relative z-10">
                  <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={equityCurveData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                          <defs><linearGradient id="equityGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/><stop offset="95%" stopColor="#6366f1" stopOpacity={0}/></linearGradient></defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                          <XAxis dataKey="timestamp" stroke="#475569" fontSize={10} fontWeight="bold" tickMargin={10} axisLine={false} tickLine={false}/>
                          <YAxis stroke="#475569" fontSize={10} fontWeight="bold" axisLine={false} tickLine={false} tickFormatter={(val) => `₹${val >= 1000 ? (val/1000).toFixed(1)+'k' : val}`}/>
                          <Tooltip content={<CustomChartTooltip />} cursor={{ stroke: '#6366f1', strokeWidth: 1, strokeDasharray: '4 4' }} />
                          <ReferenceLine y={0} stroke="#ffffff10" strokeWidth={2} />
                          <Area type="monotone" dataKey="equity" name="Equity" stroke="#6366f1" strokeWidth={3} fill="url(#equityGradient)" activeDot={{ r: 6, stroke: '#6366f1', strokeWidth: 2, fill: '#fff' }} animationDuration={1000}/>
                      </AreaChart>
                  </ResponsiveContainer>
              </div>
          </div>

          <div className="lg:col-span-4 bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-xl flex flex-col relative overflow-hidden group">
              <h3 className="text-white font-black text-xs uppercase tracking-[0.2em] mb-6 flex items-center gap-2 relative z-10"><Scale size={14} className="text-indigo-400" /> Directional Edge</h3>
              <div className="h-56 w-full relative z-10">
                  <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                          <Pie data={optionTypeData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={8} dataKey="value" stroke="none" cornerRadius={8} animationDuration={1000}>
                              {optionTypeData.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.color} className="outline-none hover:opacity-80 transition-opacity cursor-pointer" />))}
                          </Pie>
                          <Tooltip content={<CustomChartTooltip />} />
                      </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                      <span className="text-[10px] text-slate-500 font-black uppercase block">Win Rate</span>
                      <span className="text-2xl font-black text-white">{stats.winRate.toFixed(0)}%</span>
                  </div>
              </div>
              <div className="mt-auto grid grid-cols-2 gap-3 relative z-10">
                  {optionTypeData.map((item, idx) => (
                      <div key={idx} className="bg-slate-950/50 p-2 rounded-xl border border-white/5 flex flex-col gap-1">
                          <div className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: item.color }}></div><span className="text-[9px] font-black text-slate-400 uppercase">{item.name}</span></div>
                          <div className="flex justify-between items-baseline"><span className="text-lg font-black text-white">{item.value}</span><span className="text-[9px] font-bold text-slate-500">{Math.round((item.value / (stats.totalTrades || 1)) * 100)}%</span></div>
                      </div>
                  ))}
              </div>
          </div>
      </div>

    </div>
  );
};

export default Dashboard;
