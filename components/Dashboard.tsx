
import React, { useMemo, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, ReferenceLine } from 'recharts';
import { DashboardStats, Trade, TradeOutcome, TradeDirection, StrategyProfile, PlaybookStat, PreMarketAnalysis, AiAnalysisResponse, OptionType } from '../types';
import { TrendingUp, TrendingDown, Activity, AlertCircle, BrainCircuit, Sparkles, X, Target, ShieldAlert, Trophy, ListFilter, ArrowRight, ShieldCheck, HeartPulse, Info, Calculator, ChevronDown, ChevronUp, Book, Dice6, Flame, Sword, AlertTriangle, Zap, Wallet, Percent, ArrowUpRight, Scale, Bot, Loader2, Lightbulb, GraduationCap, RefreshCw, History, CalendarDays } from 'lucide-react';
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

const AiCoachReport = ({ report, title }: { report: string, title: string }) => {
    if (!report) return null;
    const sections = report.split('###').filter(s => s.trim().length > 0);
    return (
        <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/40 rounded-2xl border border-indigo-500/30 overflow-hidden shadow-2xl mb-8 animate-fade-in-up w-full text-left">
            <div className="bg-slate-950/50 p-5 border-b border-indigo-500/20 flex justify-between items-center backdrop-blur-sm">
                <div className="flex items-center gap-3">
                    <div className="bg-indigo-500/20 p-2 rounded-lg text-indigo-400 border border-indigo-500/30"><BrainCircuit size={20} /></div>
                    <div><h3 className="text-white font-bold text-base uppercase tracking-wide">{title}</h3><p className="text-[10px] text-indigo-300 font-medium">AI Intelligence Briefing</p></div>
                </div>
                <div className="flex gap-2"><div className="flex space-x-1"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div><div className="w-1.5 h-1.5 rounded-full bg-emerald-500/50"></div><div className="w-1.5 h-1.5 rounded-full bg-emerald-500/20"></div></div></div>
            </div>
            <div className="p-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {sections.map((section, idx) => {
                    const lines = section.trim().split('\n');
                    const rawTitle = lines[0].trim();
                    const content = lines.slice(1).join('\n').trim();
                    let icon = <Activity size={18} />;
                    let containerStyle = "bg-slate-800/50 border-slate-700/50";
                    let titleColor = "text-slate-300";
                    if (rawTitle.includes('Market Sync') || rawTitle.includes('Sync')) {
                        icon = <Target size={18} className="text-blue-400"/>;
                        containerStyle = "bg-blue-900/10 border-blue-500/20";
                        titleColor = "text-blue-300";
                    } else if (rawTitle.includes('Execution Grade') || rawTitle.includes('Grade')) {
                        icon = <GraduationCap size={18} className="text-emerald-400"/>;
                        containerStyle = "bg-emerald-900/10 border-emerald-500/20";
                        titleColor = "text-emerald-300";
                    } else if (rawTitle.includes('Pro Tip') || rawTitle.includes('Tip')) {
                        icon = <Lightbulb size={18} className="text-amber-400"/>;
                        containerStyle = "bg-amber-900/10 border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.1)]";
                        titleColor = "text-amber-300";
                    }
                    return (<div key={idx} className={`p-5 rounded-xl border ${containerStyle} flex flex-col relative group hover:bg-slate-800/80 transition-colors ${idx === sections.length - 1 && sections.length % 3 !== 0 ? 'md:col-span-2 lg:col-span-1' : ''}`}><div className="flex items-center gap-2 mb-3">{icon}<h4 className={`font-bold text-sm uppercase tracking-wider ${titleColor}`}>{rawTitle.replace(/[\u{1F300}-\u{1F6FF}]/gu, '')}</h4></div><div className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap font-medium">{content}</div></div>);
                })}
            </div>
        </div>
    );
};

const Dashboard: React.FC<DashboardProps> = ({ trades, strategyProfile, apiKey, preMarketNotes, preMarketAnalysis, onUpdatePreMarket, onNavigateToPreMarket, onViewTrade, onNavigateToPsychology }) => {
  const [activeTab, setActiveTab] = useState<'playbook' | 'simulator'>('playbook');
  const [reportPeriod, setReportPeriod] = useState<'week' | 'fortnight' | 'month'>('week');
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [aiReport, setAiReport] = useState<string | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<{ type: string, value: string | number } | null>(null);

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
      if (filtered.length < 10) return null;
      const wins = filtered.filter(t => t.outcome === TradeOutcome.WIN);
      const losses = filtered.filter(t => t.outcome === TradeOutcome.LOSS);
      if (wins.length === 0 || losses.length === 0) return null;
      const avgWin = wins.reduce((a,b) => a + (b.pnl || 0), 0) / wins.length;
      const avgLoss = Math.abs(losses.reduce((a,b) => a + (b.pnl || 0), 0) / losses.length);
      const winRate = wins.length / (wins.length + losses.length);
      const probRuin = Math.exp(-2 * ( (winRate * avgWin - (1-winRate) * avgLoss) / Math.sqrt( (winRate * avgWin**2 + (1-winRate) * avgLoss**2) ) ) );
      return { avgWin, avgLoss, winRate, probRuin: Math.min(1, Math.max(0, probRuin)) };
  }, [trades]);

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
    const disciplineIndex = systemAdherence;

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
    const grossProfit = perfTrades.reduce((acc, t) => (t.pnl && t.pnl > 0 ? acc + t.pnl : acc), 0);
    const grossLoss = Math.abs(perfTrades.reduce((acc, t) => (t.pnl && t.pnl < 0 ? acc + t.pnl : acc), 0));
    const profitFactor = grossLoss === 0 ? grossProfit : grossProfit / grossLoss;
    const sortedByPnL = [...perfTrades].sort((a, b) => (b.pnl || 0) - (a.pnl || 0));

    const ceTrades = perfTrades.filter(t => t.optionType === OptionType.CE);
    const peTrades = perfTrades.filter(t => t.optionType === OptionType.PE);
    const ceWins = ceTrades.filter(t => t.outcome === TradeOutcome.WIN).length;
    const peWins = peTrades.filter(t => t.outcome === TradeOutcome.WIN).length;

    return { 
        totalTrades, 
        winRate: totalTrades === 0 ? 0 : (wins / totalTrades) * 100, 
        profitFactor, 
        totalPnL, 
        bestTrade: sortedByPnL[0]?.pnl || 0, 
        worstTrade: sortedByPnL[sortedByPnL.length - 1]?.pnl || 0, 
        avgWin: wins === 0 ? 0 : grossProfit / wins, 
        avgLoss: (totalTrades - wins) === 0 ? 0 : grossLoss / (totalTrades - wins), 
        longWinRate: ceTrades.length === 0 ? 0 : (ceWins / ceTrades.length) * 100, 
        shortWinRate: peTrades.length === 0 ? 0 : (peWins / peTrades.length) * 100 
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

  const handleGenerateReport = async () => {
    setIsGeneratingReport(true); setAiReport(null);
    const now = new Date(); now.setHours(0,0,0,0);
    const cutoffDate = new Date(now);
    if (reportPeriod === 'week') cutoffDate.setDate(now.getDate() - 7);
    if (reportPeriod === 'fortnight') cutoffDate.setDate(now.getDate() - 15);
    if (reportPeriod === 'month') cutoffDate.setDate(now.getDate() - 30);
    const cutoffStr = cutoffDate.toISOString().split('T')[0];
    const recentTrades = trades.filter(t => t.date >= cutoffStr && t.outcome !== TradeOutcome.OPEN);
    if (recentTrades.length === 0) { setAiReport("No trades found for this period to analyze."); setIsGeneratingReport(false); return; }
    const periodText = reportPeriod === 'week' ? '7 Days' : reportPeriod === 'fortnight' ? '15 Days' : '30 Days';
    const report = await analyzeBatch(recentTrades, `Past ${periodText}`, strategyProfile, apiKey);
    setAiReport(report); setIsGeneratingReport(false);
  };

  const filteredTrades = useMemo(() => {
     if (!selectedFilter) return [];
     const closedTrades = trades.filter(t => t.outcome !== TradeOutcome.OPEN);
     let result = [];
     switch (selectedFilter.type) {
        case 'all_closed': result = closedTrades; break;
        case 'wins': result = closedTrades.filter(t => t.outcome === TradeOutcome.WIN); break;
        case 'losses': result = closedTrades.filter(t => t.outcome === TradeOutcome.LOSS); break;
        case 'best': result = [...closedTrades.filter(t => t.outcome !== TradeOutcome.SKIPPED)].sort((a, b) => (b.pnl || 0) - (a.pnl || 0)).slice(0, 1); break;
        case 'worst': result = [...closedTrades.filter(t => t.outcome !== TradeOutcome.SKIPPED)].sort((a, b) => (b.pnl || 0) - (a.pnl || 0)).slice(-1); break;
        case 'option': result = trades.filter(t => t.optionType === selectedFilter.value); break;
        case 'date': result = trades.filter(t => t.date === selectedFilter.value); break;
        default: result = [];
     }
     return result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [selectedFilter, trades]);

  return (
    <div className="space-y-8 pb-20 md:pb-0">
      {/* 1. TOP BANNER: DISCIPLINE & PSYCHOLOGY */}
      <div onClick={() => onNavigateToPsychology?.()} className="bg-gradient-to-br from-slate-900 via-indigo-950/40 to-slate-900 rounded-3xl p-8 border border-indigo-500/20 shadow-2xl relative overflow-hidden group cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99] select-none">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500 via-indigo-600 to-purple-600"></div>
        <div className="relative z-10 grid grid-cols-1 md:grid-cols-12 gap-10 items-center">
            <div className="md:col-span-4 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-indigo-500/10 pb-8 md:pb-0 md:pr-10">
                <div className="flex items-center gap-2 mb-4 text-cyan-400/80"><ShieldCheck size={18}/><span className="text-[10px] font-black uppercase tracking-[0.2em]">Discipline Score</span></div>
                <div className="relative w-40 h-40 rounded-full border-2 border-indigo-500/20 flex items-center justify-center bg-slate-950/50 shadow-inner group-hover:border-indigo-500/40 transition-colors">
                    <div className="text-center">
                        <span className="text-5xl font-black text-white leading-none">{psychoStats.disciplineIndex}</span>
                        <span className="text-[10px] text-slate-500 font-bold uppercase mt-2 block tracking-widest">Grade</span>
                    </div>
                    <svg className="absolute inset-0 w-full h-full -rotate-90">
                        <circle cx="80" cy="80" r="76" fill="transparent" stroke="currentColor" strokeWidth="4" className="text-indigo-500/10" />
                        <circle cx="80" cy="80" r="76" fill="transparent" stroke="currentColor" strokeWidth="4" strokeDasharray={477} strokeDashoffset={477 - (477 * psychoStats.disciplineIndex / 100)} strokeLinecap="round" className="text-indigo-500 drop-shadow-[0_0_8px_rgba(99,102,241,0.5)]" />
                    </svg>
                </div>
                <span className="mt-6 px-4 py-1.5 bg-indigo-600/10 border border-indigo-500/30 rounded-full text-xs font-black text-indigo-400 uppercase tracking-widest shadow-lg">{psychoStats.statusLabel}</span>
            </div>
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
                    <p className="text-[9px] text-slate-600 uppercase mt-4 font-bold">Consecutive 60%+ Grade Trades</p>
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

      {/* 2. CORE METRICS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <button onClick={() => setSelectedFilter({ type: 'all_closed', value: 'All Closed' })} className={`bg-gradient-to-br from-slate-800 to-slate-900 p-5 rounded-2xl border ${selectedFilter?.type === 'all_closed' ? 'border-emerald-500 ring-1 ring-emerald-500/50' : 'border-slate-700/50'} shadow-lg hover:border-emerald-500/30 transition-all duration-300 hover:-translate-y-1 group relative overflow-hidden text-left`}>
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><TrendingUp size={64} /></div>
              <div className="flex justify-between items-center mb-3 relative z-10"><h3 className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Net P&L</h3><span className={`p-1.5 rounded-lg ${stats.totalPnL >= 0 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>{stats.totalPnL >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}</span></div>
              <p className={`text-2xl font-black font-mono relative z-10 ${stats.totalPnL >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{stats.totalPnL >= 0 ? '+' : ''}₹{stats.totalPnL.toFixed(0)}</p>
              <div className="flex justify-between items-center mt-3 text-[10px] font-bold text-slate-500 uppercase"><span>{stats.totalTrades} Trades</span><span className="group-hover:text-emerald-400 transition-colors flex items-center">View Ledger <ArrowRight size={10} className="ml-1"/></span></div>
          </button>
          
          <button onClick={() => setSelectedFilter({ type: 'wins', value: 'Wins' })} className={`bg-gradient-to-br from-slate-800 to-slate-900 p-5 rounded-2xl border ${selectedFilter?.type === 'wins' ? 'border-blue-500 ring-1 ring-blue-500/50' : 'border-slate-700/50'} shadow-lg hover:border-blue-500/30 transition-all duration-300 hover:-translate-y-1 group relative overflow-hidden text-left`}>
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><Target size={64} /></div>
              <div className="flex justify-between items-center mb-3 relative z-10"><h3 className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Win Rate</h3><span className="p-1.5 rounded-lg bg-blue-500/10 text-blue-500"><Activity size={16} /></span></div>
              <p className="text-2xl font-black text-white relative z-10">{stats.winRate.toFixed(1)}%</p>
              <div className="flex gap-2 text-[10px] mt-3 font-bold uppercase"><span className="text-blue-400">CE: {stats.longWinRate.toFixed(0)}%</span><span className="text-slate-600">|</span><span className="text-amber-400">PE: {stats.shortWinRate.toFixed(0)}%</span></div>
          </button>

          <button onClick={() => setSelectedFilter({ type: 'losses', value: 'Losses' })} className={`bg-gradient-to-br from-slate-800 to-slate-900 p-5 rounded-2xl border ${selectedFilter?.type === 'losses' ? 'border-rose-500 ring-1 ring-rose-500/50' : 'border-slate-700/50'} shadow-lg hover:border-rose-500/30 transition-all duration-300 hover:-translate-y-1 group relative overflow-hidden text-left`}>
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><ShieldAlert size={64} /></div>
              <div className="flex justify-between items-center mb-3 relative z-10"><h3 className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Profit Factor</h3><span className="p-1.5 rounded-lg bg-purple-500/10 text-purple-500"><Sparkles size={16} /></span></div>
              <p className="text-2xl font-black text-white relative z-10">{stats.profitFactor.toFixed(2)}x</p>
              <div className="mt-3 flex justify-between items-center text-[10px] text-slate-500 font-bold uppercase"><span>Target: {'>'} 1.5</span><span className="group-hover:text-rose-400 transition-colors flex items-center">Check Leaks <ArrowRight size={10} className="ml-1"/></span></div>
          </button>

          <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-5 rounded-2xl border border-slate-700/50 shadow-lg flex flex-col justify-between group relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><Trophy size={64} /></div>
              <div className="flex justify-between items-center mb-2 relative z-10"><h3 className="text-slate-400 text-[10px] font-black uppercase tracking-widest">P&L Range</h3><span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-500"><AlertCircle size={16} /></span></div>
              <div className="flex items-end justify-between gap-2 relative z-10 mt-2">
                  <button onClick={() => setSelectedFilter({ type: 'best', value: 'Best Trade' })} className="flex-1 bg-emerald-500/5 hover:bg-emerald-500/20 p-2 rounded-lg border border-emerald-500/20 transition text-left"><div className="text-[9px] text-emerald-500/70 font-bold uppercase mb-1">Max Win</div><div className="text-xs font-black text-emerald-400">₹{stats.bestTrade.toFixed(0)}</div></button>
                  <button onClick={() => setSelectedFilter({ type: 'worst', value: 'Worst Trade' })} className="flex-1 bg-red-500/5 hover:bg-red-500/20 p-2 rounded-lg border border-red-500/20 transition text-right"><div className="text-[9px] text-red-500/70 font-bold uppercase mb-1">Max Loss</div><div className="text-xs font-black text-red-400">₹{Math.abs(stats.worstTrade).toFixed(0)}</div></button>
              </div>
          </div>
      </div>

      {/* 3. AI PERFORMANCE REVIEW SECTION */}
      <div className="bg-gradient-to-br from-indigo-900/30 to-slate-800 p-8 rounded-3xl border border-indigo-500/30 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none"><BrainCircuit size={150} className="text-indigo-400" /></div>
          <div className="relative z-10">
              <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
                  <div><h3 className="text-indigo-400 font-black text-xl uppercase tracking-widest flex items-center"><Sparkles size={24} className="mr-3" /> Coach's Deep Dive</h3><p className="text-[10px] text-slate-500 uppercase mt-1 font-bold">Neural Pattern Recognition Audit</p></div>
                  <div className="flex bg-slate-900/50 rounded-xl p-1.5 border border-slate-700">
                      <button onClick={() => setReportPeriod('week')} className={`px-4 py-2 rounded-lg text-xs font-black uppercase transition ${reportPeriod === 'week' ? 'bg-indigo-600 text-white shadow' : 'text-slate-500 hover:text-white'}`}>7D</button>
                      <button onClick={() => setReportPeriod('fortnight')} className={`px-4 py-2 rounded-lg text-xs font-black uppercase transition ${reportPeriod === 'fortnight' ? 'bg-indigo-600 text-white shadow' : 'text-slate-500 hover:text-white'}`}>15D</button>
                      <button onClick={() => setReportPeriod('month')} className={`px-4 py-2 rounded-lg text-xs font-black uppercase transition ${reportPeriod === 'month' ? 'bg-indigo-600 text-white shadow' : 'text-slate-500 hover:text-white'}`}>30D</button>
                  </div>
              </div>
              {!aiReport && !isGeneratingReport && (
                  <div className="text-center py-10 bg-slate-950/40 rounded-2xl border border-dashed border-indigo-500/20"><p className="text-slate-400 text-sm mb-6">Need an audit? The Coach will scan your recent missions for patterns.</p><button onClick={handleGenerateReport} className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-3 rounded-xl font-black uppercase tracking-widest transition shadow-lg shadow-indigo-900/50 flex items-center mx-auto"><Bot size={18} className="mr-3" /> Audit Recent Missions</button></div>
              )}
              {isGeneratingReport && (
                  <div className="text-center py-12 animate-pulse"><BrainCircuit size={64} className="mx-auto text-indigo-500 mb-6 opacity-50" /><p className="text-indigo-300 font-black uppercase tracking-widest">Synthesizing Tactical Data...</p><p className="text-[10px] text-slate-500 mt-2 font-mono uppercase">Connecting to neural prop-desk (10s)</p></div>
              )}
              {aiReport && (
                  <div className="animate-fade-in"><AiCoachReport report={aiReport} title={`Strategic Audit Log (${reportPeriod === 'week' ? 'Past Week' : reportPeriod === 'fortnight' ? '15 Days' : '30 Days'})`} /><div className="mt-4 text-center"><button onClick={handleGenerateReport} className="text-indigo-400 text-[10px] font-black uppercase hover:text-indigo-300 flex items-center justify-center mx-auto gap-2 border border-indigo-500/20 px-3 py-1 rounded-full bg-indigo-950/30"><RefreshCw size={12}/> Re-Run Analysis</button></div></div>
              )}
          </div>
      </div>

      {/* 4. TABS: PLAYBOOK & SIMULATOR */}
      <div className="space-y-6">
        <div className="flex bg-slate-900 rounded-2xl p-1.5 border border-slate-800 w-full md:w-auto self-start shadow-xl">
            <button onClick={() => setActiveTab('playbook')} className={`flex-1 md:flex-none px-8 py-3 rounded-xl transition-all text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 ${activeTab === 'playbook' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-white hover:bg-slate-800'}`}>
                <Book size={16} /> Setup Playbook
            </button>
            <button onClick={() => setActiveTab('simulator')} className={`flex-1 md:flex-none px-8 py-3 rounded-xl transition-all text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 ${activeTab === 'simulator' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-white hover:bg-slate-800'}`}>
                <Dice6 size={16} /> Monte Carlo Risk
            </button>
        </div>

        {activeTab === 'playbook' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
                {playbookStats.map((stat, idx) => (
                    <div key={idx} className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden hover:border-indigo-500/50 transition-all shadow-xl group">
                        <div className={`h-1.5 w-full ${stat.totalPnL > 0 ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
                        <div className="p-6">
                            <div className="flex justify-between items-start mb-6">
                                <h4 className="font-black text-white text-lg leading-tight uppercase group-hover:text-indigo-400 transition-colors">{stat.setupName}</h4>
                                <span className="text-[10px] font-black text-slate-500 bg-slate-900 px-3 py-1 rounded-full border border-slate-700">{stat.count} Mns</span>
                            </div>
                            <div className="space-y-4">
                                <div className="flex justify-between items-center"><span className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Win Probability</span><span className={`text-sm font-black font-mono ${stat.winRate >= 50 ? 'text-emerald-400' : 'text-amber-400'}`}>{stat.winRate}%</span></div>
                                <div className="w-full bg-slate-900 rounded-full h-2 shadow-inner overflow-hidden"><div className={`h-full rounded-full ${stat.winRate >= 50 ? 'bg-emerald-500' : 'bg-amber-500'}`} style={{width: `${stat.winRate}%`}}></div></div>
                                <div className="grid grid-cols-2 gap-4 pt-4 mt-2 border-t border-slate-700/50">
                                    <div><span className="text-[9px] text-slate-500 uppercase font-black block mb-1">Avg Payoff</span><span className={`text-sm font-black font-mono ${stat.avgPnL > 0 ? 'text-emerald-400' : 'text-red-400'}`}>₹{stat.avgPnL.toFixed(0)}</span></div>
                                    <div className="text-right"><span className="text-[9px] text-slate-500 uppercase font-black block mb-1">Net Flow</span><span className={`text-sm font-black font-mono ${stat.totalPnL > 0 ? 'text-emerald-400' : 'text-red-400'}`}>₹{stat.totalPnL.toFixed(0)}</span></div>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
                {playbookStats.length === 0 && <div className="col-span-full text-center py-20 bg-slate-900/30 rounded-3xl border border-dashed border-slate-700"><Book size={48} className="mx-auto mb-4 opacity-20 text-slate-500"/><p className="text-slate-500 font-bold uppercase tracking-widest text-xs">No Setup Data Yet</p></div>}
            </div>
        )}

        {activeTab === 'simulator' && (
            <div className="animate-fade-in">
                {riskSimData ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-slate-800 p-8 rounded-3xl border border-slate-700 shadow-2xl">
                            <h4 className="text-indigo-400 font-black text-xs uppercase mb-6 tracking-widest flex items-center gap-2"><Target size={14}/> Baseline Performance</h4>
                            <div className="space-y-6">
                                <div className="flex justify-between border-b border-slate-700/50 pb-3">
                                    <span className="text-sm font-bold text-slate-400 uppercase">Win Rate</span>
                                    <span className="font-black font-mono text-white">{(riskSimData.winRate * 100).toFixed(1)}%</span>
                                </div>
                                <div className="flex justify-between border-b border-slate-700/50 pb-3">
                                    <span className="text-sm font-bold text-slate-400 uppercase">Avg Winner</span>
                                    <span className="font-black font-mono text-emerald-400">₹{riskSimData.avgWin.toFixed(0)}</span>
                                </div>
                                <div className="flex justify-between border-b border-slate-700/50 pb-3">
                                    <span className="text-sm font-bold text-slate-400 uppercase">Avg Loser</span>
                                    <span className="font-black font-mono text-red-400">₹{riskSimData.avgLoss.toFixed(0)}</span>
                                </div>
                            </div>
                        </div>
                        <div className="bg-slate-900 p-10 rounded-3xl border border-rose-500/20 shadow-2xl flex flex-col items-center justify-center text-center relative overflow-hidden group">
                            <div className="absolute inset-0 bg-gradient-to-br from-rose-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            <h4 className="text-rose-500 font-black text-xs uppercase mb-6 tracking-widest flex items-center gap-2 relative z-10"><ShieldAlert size={14}/> Risk of Ruin (50% Drawdown)</h4>
                            <div className={`text-6xl font-black mb-4 relative z-10 ${riskSimData.probRuin < 0.05 ? 'text-emerald-400' : riskSimData.probRuin < 0.20 ? 'text-amber-400' : 'text-rose-500'}`}>
                                {(riskSimData.probRuin * 100).toFixed(1)}%
                            </div>
                            <p className="text-xs text-slate-500 font-medium uppercase tracking-wide px-8 relative z-10">Probability of account devastation if current edge persists.</p>
                            <div className={`mt-8 px-6 py-2 rounded-full text-xs font-black uppercase tracking-widest relative z-10 border ${riskSimData.probRuin < 0.05 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'}`}>
                                {riskSimData.probRuin < 0.05 ? 'Safe Execution Zone' : 'Tactical Refinement Needed'}
                            </div>
                        </div>
                    </div>
                ) : <div className="text-center py-20 bg-slate-900/30 rounded-3xl border border-dashed border-slate-700 text-slate-500 uppercase tracking-widest text-xs font-bold">10+ Performance trades required for simulation.</div>}
            </div>
        )}
      </div>

      {/* 5. BEAUTIFUL GRAPHS (BOTTOM SECTION) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-8 border-t border-slate-800/50">
          {/* Enhanced Equity Curve */}
          <div className="lg:col-span-8 bg-slate-900 rounded-3xl border border-slate-800 shadow-2xl p-8 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none group-hover:opacity-10 transition-opacity">
                  <History size={150} className="text-white" />
              </div>
              <div className="flex justify-between items-center mb-8 relative z-10">
                  <div>
                      <h3 className="text-white font-black text-sm uppercase tracking-[0.2em] flex items-center gap-2">
                          <TrendingUp size={16} className="text-indigo-400" /> Account Trajectory
                      </h3>
                      <p className="text-[10px] text-slate-500 font-bold uppercase mt-1 tracking-widest">Net Equity Progression (Cumulative)</p>
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

          {/* Enhanced Bias Donut */}
          <div className="lg:col-span-4 bg-slate-900 rounded-3xl border border-slate-800 shadow-2xl p-8 flex flex-col relative overflow-hidden group">
              <h3 className="text-white font-black text-sm uppercase tracking-[0.2em] mb-8 flex items-center gap-2 relative z-10">
                  <Scale size={16} className="text-indigo-400" /> Directional Edge
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
                  
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                      <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest block">Total Win%</span>
                      <span className="text-3xl font-black text-white">{stats.winRate.toFixed(0)}%</span>
                  </div>
              </div>

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

      {/* FILTER OVERLAY */}
      {selectedFilter && (<div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4 backdrop-blur-md animate-fade-in"><div className="bg-slate-900 w-full max-w-5xl rounded-2xl border border-slate-700 shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]"><div className="p-4 border-b border-slate-800 bg-slate-950 flex justify-between items-center sticky top-0 z-20"><div className="flex items-center gap-3"><div className="bg-indigo-900/50 p-2 rounded-lg text-indigo-400"><ListFilter size={20}/></div><div><h3 className="font-bold text-white text-base">{selectedFilter.value} Log</h3><p className="text-xs text-slate-500">{filteredTrades.length} entries found</p></div></div><button onClick={() => setSelectedFilter(null)} className="p-2 hover:bg-slate-800 rounded-full transition text-slate-400 hover:text-white"><X size={20}/></button></div><div className="overflow-y-auto custom-scrollbar p-0"><table className="w-full text-sm text-left"><thead className="text-xs text-slate-500 uppercase bg-slate-950/50 border-b border-slate-800 sticky top-0"><tr><th className="px-6 py-4 font-bold tracking-wider">Date</th><th className="px-6 py-4 font-bold tracking-wider">Instrument</th><th className="px-6 py-4 font-bold tracking-wider text-right">PnL</th></tr></thead><tbody className="divide-y divide-slate-800/50">{filteredTrades.map(t => (<tr key={t.id} onClick={() => { setSelectedFilter(null); onViewTrade?.(t.id); }} className="hover:bg-slate-800/30 transition-colors cursor-pointer group"><td className="px-6 py-4 text-white font-mono group-hover:text-indigo-400 transition-colors">{t.date}</td><td className="px-6 py-4 text-indigo-300 font-bold">{t.instrument}</td><td className={`px-6 py-4 text-right font-mono font-bold ${t.outcome === TradeOutcome.SKIPPED ? 'text-slate-500' : t.pnl && t.pnl > 0 ? 'text-emerald-400' : 'text-red-400'}`}>{t.outcome === TradeOutcome.SKIPPED ? 'SKIPPED' : (t.pnl && t.pnl > 0 ? '+' : '') + '₹' + t.pnl?.toFixed(0)}</td></tr>))}</tbody></table></div></div></div>)}
    </div>
  );
};

export default Dashboard;
