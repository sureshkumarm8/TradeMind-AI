
import React, { useMemo, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, ReferenceLine } from 'recharts';
import { DashboardStats, Trade, TradeOutcome, TradeDirection, StrategyProfile, PlaybookStat, PreMarketAnalysis, AiAnalysisResponse } from '../types';
import { TrendingUp, TrendingDown, Activity, AlertCircle, BrainCircuit, Sparkles, X, Target, ShieldAlert, Trophy, ListFilter, ArrowRight, ShieldCheck, HeartPulse, Info, Calculator, ChevronDown, ChevronUp, Book, Dice6, Flame, Sword, AlertTriangle, Zap, Wallet, Percent, ArrowUpRight, Scale, Bot, Loader2, Lightbulb, GraduationCap, RefreshCw } from 'lucide-react';
import { analyzeBatch } from '../services/geminiService';

interface DashboardProps {
  trades: Trade[];
  strategyProfile: StrategyProfile;
  apiKey?: string;
  preMarketNotes?: { date: string, notes: string };
  preMarketAnalysis?: { date: string, data: PreMarketAnalysis }; // Add AI Data Prop
  onUpdatePreMarket: (notes: string) => void;
  onNavigateToPreMarket?: () => void; // Add Navigation Prop
  onViewTrade?: (tradeId: string) => void; // New prop for deep linking
}

// Custom Tooltip for Recharts to match Glassmorphism theme
const CustomChartTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900/90 border border-slate-700 p-3 rounded-lg shadow-xl backdrop-blur-md">
        <p className="text-slate-400 text-xs font-bold mb-1">{label}</p>
        {payload.map((p: any, index: number) => (
           <p key={index} className="text-sm font-mono font-bold" style={{ color: p.color }}>
              {p.name}: {typeof p.value === 'number' && (p.name === 'PnL' || p.name === 'Equity') ? `₹${p.value.toFixed(2)}` : p.value}
           </p>
        ))}
      </div>
    );
  }
  return null;
};

// Internal Component for Beautiful AI Report Rendering
const AiCoachReport = ({ report, title }: { report: string, title: string }) => {
    if (!report) return null;

    // Rudimentary Markdown Parser for the specific structure returned by Gemini
    // Expects: ### Header \n Content
    const sections = report.split('###').filter(s => s.trim().length > 0);

    return (
        <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/40 rounded-2xl border border-indigo-500/30 overflow-hidden shadow-2xl mb-8 animate-fade-in-up w-full text-left">
            {/* Header */}
            <div className="bg-slate-950/50 p-5 border-b border-indigo-500/20 flex justify-between items-center backdrop-blur-sm">
                <div className="flex items-center gap-3">
                    <div className="bg-indigo-500/20 p-2 rounded-lg text-indigo-400 border border-indigo-500/30">
                        <BrainCircuit size={20} />
                    </div>
                    <div>
                        <h3 className="text-white font-bold text-base uppercase tracking-wide">{title}</h3>
                        <p className="text-[10px] text-indigo-300 font-medium">AI Intelligence Briefing</p>
                    </div>
                </div>
                <div className="flex gap-2">
                     <div className="flex space-x-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/50"></div>
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/20"></div>
                     </div>
                </div>
            </div>

            {/* Content Grid */}
            <div className="p-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {sections.map((section, idx) => {
                    const lines = section.trim().split('\n');
                    const rawTitle = lines[0].trim();
                    const content = lines.slice(1).join('\n').trim();
                    
                    // Determine Styling based on content content
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

                    return (
                        <div key={idx} className={`p-5 rounded-xl border ${containerStyle} flex flex-col relative group hover:bg-slate-800/80 transition-colors ${idx === sections.length - 1 && sections.length % 3 !== 0 ? 'md:col-span-2 lg:col-span-1' : ''}`}>
                            <div className="flex items-center gap-2 mb-3">
                                {icon}
                                <h4 className={`font-bold text-sm uppercase tracking-wider ${titleColor}`}>{rawTitle.replace(/[\u{1F300}-\u{1F6FF}]/gu, '')}</h4>
                            </div>
                            <div className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap font-medium">
                                {content}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

const Dashboard: React.FC<DashboardProps> = ({ trades, strategyProfile, apiKey, preMarketNotes, preMarketAnalysis, onUpdatePreMarket, onNavigateToPreMarket, onViewTrade }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'playbook' | 'simulator'>('overview');
  
  const [reportPeriod, setReportPeriod] = useState<'week' | 'fortnight' | 'month'>('week');
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [aiReport, setAiReport] = useState<string | null>(null);
  const [showScoreDetails, setShowScoreDetails] = useState(false);
  const [showFormulas, setShowFormulas] = useState(false);
  
  // Interactive Filters
  const [selectedFilter, setSelectedFilter] = useState<{ type: string, value: string | number } | null>(null);

  // Pre Market Edit
  const [isEditingPreMarket, setIsEditingPreMarket] = useState(false);
  const [tempPreMarket, setTempPreMarket] = useState('');

  // --- 1. Playbook Analytics (Setup Stats) ---
  const playbookStats = useMemo(() => {
      const statsMap: Record<string, PlaybookStat> = {};
      const closed = trades.filter(t => t.outcome !== TradeOutcome.OPEN && t.setupName);

      closed.forEach(t => {
          const name = t.setupName.trim() || 'Unlabeled';
          if (!statsMap[name]) {
              statsMap[name] = { setupName: name, count: 0, winRate: 0, avgPnL: 0, totalPnL: 0 };
          }
          const s = statsMap[name];
          s.count++;
          s.totalPnL += (t.pnl || 0);
      });

      // Calc win rates
      return Object.values(statsMap).map(s => {
          const wins = closed.filter(t => (t.setupName?.trim() || 'Unlabeled') === s.setupName && t.outcome === TradeOutcome.WIN).length;
          s.winRate = Math.round((wins / s.count) * 100);
          s.avgPnL = Math.round(s.totalPnL / s.count);
          return s;
      }).sort((a,b) => b.totalPnL - a.totalPnL);
  }, [trades]);

  // --- 2. Risk Simulator (Monte Carlo Simple) ---
  const riskSimData = useMemo(() => {
      if (trades.length < 10) return null;
      const wins = trades.filter(t => t.outcome === TradeOutcome.WIN);
      const losses = trades.filter(t => t.outcome === TradeOutcome.LOSS);
      if (wins.length === 0 || losses.length === 0) return null;

      const avgWin = wins.reduce((a,b) => a + (b.pnl || 0), 0) / wins.length;
      const avgLoss = Math.abs(losses.reduce((a,b) => a + (b.pnl || 0), 0) / losses.length);
      const winRate = wins.length / (wins.length + losses.length);
      
      // Simple Ruin Probability approximation (Kelly-esque)
      // Risk of 50% drawdown
      const probRuin = Math.exp(-2 * ( (winRate * avgWin - (1-winRate) * avgLoss) / Math.sqrt( (winRate * avgWin**2 + (1-winRate) * avgLoss**2) ) ) );
      
      return { avgWin, avgLoss, winRate, probRuin: Math.min(1, Math.max(0, probRuin)) };
  }, [trades]);

  // --- Discipline & Psychology Metrics Calculation ---
  const psychoStats = useMemo(() => {
    const closedTrades = trades.filter(t => t.outcome !== TradeOutcome.OPEN);
    if (closedTrades.length === 0) return {
        disciplineIndex: 0,
        systemAdherence: 0,
        streak: 0,
        emotionalStability: 0,
        statusLabel: "Rookie",
        recentOffenses: [],
        costOfIndiscipline: 0,
        winRateVariance: 0
    };

    // 1. Discipline Index (0-100)
    // Formula: Average of (DisciplineRating * 20)
    const totalDisciplinePoints = closedTrades.reduce((acc, t) => acc + (t.disciplineRating || 0), 0);
    const avgDiscipline = totalDisciplinePoints / closedTrades.length; // 1-5
    const disciplineIndex = Math.round(avgDiscipline * 20); // Scale to 100

    // 2. System Adherence %
    const followedCount = closedTrades.filter(t => t.followedSystem).length;
    const systemAdherence = Math.round((followedCount / closedTrades.length) * 100);

    // 3. Emotional Stability % (Trades marked 'Neutral' or 'Focused')
    const stableCount = closedTrades.filter(t => ['Neutral', 'Focused', 'Calm'].includes(t.emotionalState || '')).length;
    const emotionalStability = Math.round((stableCount / closedTrades.length) * 100);

    // 4. Iron Streak (Consecutive trades following system, working backwards)
    let streak = 0;
    const sortedTrades = [...closedTrades].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    for (const t of sortedTrades) {
        if (t.followedSystem) streak++;
        else break;
    }

    // 5. Recent Offenses (Last 5 bad trades)
    // We consider it an offense if rating is low OR followedSystem is false
    const recentOffenses = sortedTrades
        .filter(t => (t.disciplineRating && t.disciplineRating <= 3) || !t.followedSystem)
        .slice(0, 5);
    
    // 6. Cost of Indiscipline
    // Sum of losses where discipline rating <= 3 (Equivalent to Grade <= 60%)
    const costOfIndiscipline = closedTrades
        .filter(t => t.disciplineRating && t.disciplineRating <= 3)
        .reduce((acc, t) => acc + (t.pnl || 0), 0);
        
    // 7. Win Rate Variance (Disciplined vs Undisciplined)
    // High Discipline = Rating >= 4 (Grade >= 80%)
    const highDiscTrades = closedTrades.filter(t => (t.disciplineRating || 0) >= 4);
    const lowDiscTrades = closedTrades.filter(t => (t.disciplineRating || 0) <= 3);
    
    const highDiscWins = highDiscTrades.filter(t => t.outcome === TradeOutcome.WIN).length;
    const lowDiscWins = lowDiscTrades.filter(t => t.outcome === TradeOutcome.WIN).length;

    const highWR = highDiscTrades.length > 0 ? (highDiscWins / highDiscTrades.length) * 100 : 0;
    const lowWR = lowDiscTrades.length > 0 ? (lowDiscWins / lowDiscTrades.length) * 100 : 0;
    
    const winRateVariance = highWR - lowWR;

    // Status Label
    let statusLabel = "Rookie";
    if (disciplineIndex >= 95) statusLabel = "Zen Master";
    else if (disciplineIndex >= 85) statusLabel = "Sniper";
    else if (disciplineIndex >= 70) statusLabel = "Disciplined";
    else if (disciplineIndex >= 50) statusLabel = "Drifting";
    else if (disciplineIndex > 0) statusLabel = "Tilted";
    else statusLabel = "Rookie";

    return { disciplineIndex, systemAdherence, streak, emotionalStability, statusLabel, recentOffenses, costOfIndiscipline, winRateVariance };
  }, [trades]);

  const stats: DashboardStats = useMemo(() => {
    const closedTrades = trades.filter(t => t.outcome !== TradeOutcome.OPEN);
    const totalTrades = closedTrades.length;
    const wins = closedTrades.filter(t => t.outcome === TradeOutcome.WIN).length;
    const losses = closedTrades.filter(t => t.outcome === TradeOutcome.LOSS).length;
    const totalPnL = closedTrades.reduce((acc, t) => acc + (t.pnl || 0), 0);
    
    const grossProfit = closedTrades.reduce((acc, t) => (t.pnl && t.pnl > 0 ? acc + t.pnl : acc), 0);
    const grossLoss = Math.abs(closedTrades.reduce((acc, t) => (t.pnl && t.pnl < 0 ? acc + t.pnl : acc), 0));
    const profitFactor = grossLoss === 0 ? grossProfit : grossProfit / grossLoss;

    const sortedByPnL = [...closedTrades].sort((a, b) => (b.pnl || 0) - (a.pnl || 0));
    
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

  const handleGenerateReport = async () => {
    setIsGeneratingReport(true);
    setAiReport(null);
    
    const now = new Date();
    // Normalize to start of day for accurate comparison
    now.setHours(0,0,0,0);
    
    const cutoffDate = new Date(now);
    
    if (reportPeriod === 'week') cutoffDate.setDate(now.getDate() - 7);
    if (reportPeriod === 'fortnight') cutoffDate.setDate(now.getDate() - 15);
    if (reportPeriod === 'month') cutoffDate.setDate(now.getDate() - 30);
    
    // Robust Date Filtering using ISO String prefixes YYYY-MM-DD
    const cutoffStr = cutoffDate.toISOString().split('T')[0];

    const recentTrades = trades.filter(t => {
         // Assuming trade.date is YYYY-MM-DD
         return t.date >= cutoffStr && t.outcome !== TradeOutcome.OPEN;
    });
    
    if (recentTrades.length === 0) {
      setAiReport("No closed trades found for this period to analyze.");
      setIsGeneratingReport(false);
      return;
    }

    const periodText = reportPeriod === 'week' ? '7 Days' : reportPeriod === 'fortnight' ? '15 Days' : '30 Days';
    const report = await analyzeBatch(recentTrades, `Past ${periodText}`, strategyProfile, apiKey);
    
    setAiReport(report);
    setIsGeneratingReport(false);
  };

  const directionalData = [
    { name: 'Long Win %', value: stats.longWinRate, fill: '#3B82F6', type: 'Long' },
    { name: 'Short Win %', value: stats.shortWinRate, fill: '#F59E0B', type: 'Short' },
  ];
  
  // --- Interactions ---
  const getMotivationalMessage = () => {
     const messages: Record<string, string[]> = {
        "Zen Master": ["The market is a mirror. You have mastered reflection.", "Flow state achieved."],
        "Sniper": ["One shot, one kill. Precision is your currency.", "Patience pays dividends."],
        "Disciplined": ["Consistency builds empires.", "Trade the plan, trust the process."],
        "Drifting": ["Focus. The market rewards patience, not activity.", "Re-read your rules."],
        "Tilted": ["Step back. Breathe. Capital preservation is priority #1.", "Don't fight it."],
        "Rookie": ["Every master was once a beginner.", "Learn to lose small."]
     };
     const pool = messages[psychoStats.statusLabel] || messages["Rookie"];
     return pool[Math.floor(Math.random() * pool.length)];
  };

  const filteredTrades = useMemo(() => {
     if (!selectedFilter) return [];
     const closedTrades = trades.filter(t => t.outcome !== TradeOutcome.OPEN);
     
     let result = [];
     switch (selectedFilter.type) {
        case 'all_closed': result = closedTrades; break;
        case 'wins': result = closedTrades.filter(t => t.outcome === TradeOutcome.WIN); break;
        case 'losses': result = closedTrades.filter(t => t.outcome === TradeOutcome.LOSS); break;
        case 'best':
           const sortedByPnL = [...closedTrades].sort((a, b) => (b.pnl || 0) - (a.pnl || 0));
           result = sortedByPnL.length > 0 ? [sortedByPnL[0]] : [];
           break;
        case 'worst':
           const sortedByPnLW = [...closedTrades].sort((a, b) => (b.pnl || 0) - (a.pnl || 0));
           result = sortedByPnLW.length > 0 ? [sortedByPnLW[sortedByPnLW.length - 1]] : [];
           break;
        case 'day': result = trades.filter(t => new Date(t.date).getDay() === selectedFilter.value); break;
        case 'direction': result = trades.filter(t => t.direction === (selectedFilter.value === 'Long' ? TradeDirection.LONG : TradeDirection.SHORT)); break;
        case 'date': result = trades.filter(t => t.date === selectedFilter.value); break;
        default: result = [];
     }
     return result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [selectedFilter, trades]);

  const getFilterTitle = (filter: { type: string, value: string | number }) => {
     switch(filter.type) {
        case 'day': return `Performance on ${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][filter.value as number]}s`;
        case 'all_closed': return 'Net P&L Ledger';
        case 'wins': return 'Winning Trades Execution';
        case 'losses': return 'Losing Trades Analysis';
        case 'best': return 'Best Performance Record';
        case 'worst': return 'Worst Performance Record';
        default: return filter.value;
     }
  }

  // --- Render Helpers ---
  const getDisciplineColor = (score: number) => {
    if (score === 0) return 'text-slate-400 border-slate-500 shadow-none';
    if (score >= 90) return 'text-cyan-400 border-cyan-500 shadow-cyan-500/50';
    if (score >= 75) return 'text-emerald-400 border-emerald-500 shadow-emerald-500/50';
    if (score >= 50) return 'text-amber-400 border-amber-500 shadow-amber-500/50';
    return 'text-rose-500 border-rose-500 shadow-rose-500/50';
  };

  const renderParticles = () => {
    if (psychoStats.disciplineIndex < 80) return null;
    return (
      <>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="absolute w-1.5 h-1.5 bg-emerald-400 rounded-full blur-[1px] animate-float-slow pointer-events-none" style={{ left: `${20 + Math.random() * 60}%`, top: `${30 + Math.random() * 40}%`, animationDelay: `${Math.random() * 2}s` }} />
        ))}
      </>
    );
  };

  // --- Pre Market Logic ---
  const today = new Date().toISOString().split('T')[0];
  const hasPreMarketToday = preMarketNotes?.date === today;
  // Check if we have valid AI Analysis for today
  const hasAiAnalysisToday = preMarketAnalysis && preMarketAnalysis.date === today;
  const isMorning = new Date().getHours() < 10;
  
  const savePreMarket = () => {
      onUpdatePreMarket(tempPreMarket);
      setIsEditingPreMarket(false);
  }

  // Format Max Loss / Max Win Display
  const renderExtremeTrade = (pnl: number, isBest: boolean) => {
      if (pnl === 0 && trades.length === 0) return { label: 'No Data', value: '₹0', color: 'text-slate-500' };
      
      const isPositive = pnl >= 0;
      // If it's the "Worst Trade" card but value is Positive, it means the trader has no losses (Lowest Win)
      const label = isBest ? 'Max Win' : (isPositive ? 'Lowest Win' : 'Max Loss');
      const color = isPositive ? 'text-emerald-400' : 'text-red-400';
      const valueStr = `${isPositive ? '+' : '-'}₹${Math.abs(pnl).toFixed(0)}`;
      
      return { label, value: valueStr, color };
  };

  const bestTradeDisplay = renderExtremeTrade(stats.bestTrade, true);
  const worstTradeDisplay = renderExtremeTrade(stats.worstTrade, false);

  // Helper to extract numeric grade from AI JSON string
  const getNumericGrade = (trade: Trade) => {
     try {
         if(!trade.aiFeedback) return null;
         const data = JSON.parse(trade.aiFeedback);
         return typeof data.grade === 'number' ? data.grade : null;
     } catch(e) { return null; }
  };

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      
      {/* 🧠 PSYCHO-CYBERNETICS HUD */}
      <div 
        onClick={() => setShowScoreDetails(true)}
        className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 border border-indigo-500/30 shadow-2xl relative overflow-hidden group cursor-pointer transition-transform active:scale-[0.99] select-none"
      >
         {/* Background Effects */}
         <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500 via-indigo-500 to-purple-500"></div>
         <div className="absolute -right-20 -top-20 opacity-10 group-hover:opacity-20 transition-opacity">
            <BrainCircuit size={300} className="text-indigo-400 animate-steady-breath" />
         </div>
         {renderParticles()}

         <div className="relative z-10 grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
            {/* 1. Discipline Score */}
            <div className="md:col-span-4 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-indigo-500/20 pb-6 md:pb-0 md:pr-6">
                <div className="flex items-center gap-2 mb-2">
                   <ShieldCheck size={18} className="text-cyan-400"/>
                   <span className="text-xs font-bold uppercase tracking-widest text-cyan-200">Discipline Index</span>
                </div>
                <div className={`relative w-32 h-32 rounded-full border-4 flex items-center justify-center shadow-[0_0_30px_rgba(0,0,0,0.5)] bg-slate-950 transition-shadow duration-500 group-hover:shadow-[0_0_50px_rgba(99,102,241,0.3)] ${getDisciplineColor(psychoStats.disciplineIndex)}`}>
                   <div className="text-center">
                      <span className={`text-4xl font-black block leading-none ${getDisciplineColor(psychoStats.disciplineIndex).split(' ')[0]}`}>
                        {psychoStats.disciplineIndex}
                      </span>
                      <span className="text-[10px] text-slate-500 font-medium uppercase mt-1">out of 100</span>
                   </div>
                </div>
                <div className="mt-3 text-center">
                   <span className={`text-sm font-bold uppercase tracking-wider px-3 py-1 rounded-full border bg-slate-900 ${getDisciplineColor(psychoStats.disciplineIndex).replace('text-', 'text-').replace('border-', 'border-').replace('shadow-', '')}`}>
                      {psychoStats.statusLabel}
                   </span>
                </div>
            </div>

            {/* 2. Metrics */}
            <div className="md:col-span-5 space-y-6">
               <div>
                  <div className="flex justify-between items-center mb-1">
                     <span className="text-xs font-bold text-slate-400 uppercase flex items-center">
                        <Target size={14} className="mr-2 text-indigo-400"/> System Adherence
                     </span>
                     <span className="text-sm font-mono font-bold text-white">{psychoStats.systemAdherence}%</span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden border border-slate-700">
                     <div className="bg-indigo-500 h-full rounded-full shadow-[0_0_10px_#6366f1]" style={{ width: `${psychoStats.systemAdherence}%` }}></div>
                  </div>
               </div>
               <div>
                  <div className="flex justify-between items-center mb-1">
                     <span className="text-xs font-bold text-slate-400 uppercase flex items-center">
                        <HeartPulse size={14} className="mr-2 text-emerald-400"/> Mental Stability
                     </span>
                     <span className="text-sm font-mono font-bold text-white">{psychoStats.emotionalStability}%</span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden border border-slate-700">
                     <div className={`h-full rounded-full shadow-[0_0_10px_currentColor] ${psychoStats.emotionalStability === 0 ? 'bg-slate-600 text-slate-600' : psychoStats.emotionalStability > 80 ? 'bg-emerald-500 text-emerald-500' : 'bg-amber-500 text-amber-500'}`} style={{ width: `${psychoStats.emotionalStability}%` }}></div>
                  </div>
               </div>
            </div>

            {/* 3. Streak */}
            <div className="md:col-span-3 flex flex-col items-center justify-center bg-indigo-900/10 rounded-xl p-4 border border-indigo-500/20 backdrop-blur-sm group-hover:bg-indigo-900/20 transition-colors">
               <span className="text-xs font-bold text-indigo-300 uppercase tracking-widest mb-2">Iron Streak</span>
               <div className="flex items-center gap-1">
                  <Flame size={32} className={`${psychoStats.streak > 0 ? 'text-orange-500 animate-pulse filter drop-shadow-[0_0_8px_rgba(249,115,22,0.6)]' : 'text-slate-700'}`} />
                  <span className="text-4xl font-black text-white">{psychoStats.streak}</span>
               </div>
               <span className="text-[10px] text-slate-500 font-medium uppercase mt-1 text-center">
                  Consecutive Trades<br/>Following Rules
               </span>
            </div>
         </div>
         <div className="absolute bottom-2 left-0 w-full text-center">
            <span className="text-[10px] text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
               <Info size={10} className="mr-1"/> Click for detailed breakdown & formulas
            </span>
         </div>
      </div>

      {/* 🛡️ PRE-MARKET BATTLE PLAN */}
      {/* Show if morning OR if we have data for today */}
      {(isMorning || hasPreMarketToday || hasAiAnalysisToday) && (
          <div 
            onClick={() => onNavigateToPreMarket?.()} // Navigate on click
            className="bg-slate-800/80 rounded-xl border border-slate-700 overflow-hidden shadow-lg animate-fade-in-up cursor-pointer hover:border-indigo-500 transition-colors group relative"
          >
              <div className="bg-slate-900/50 p-3 px-4 border-b border-slate-700 flex justify-between items-center">
                  <h3 className="text-amber-400 font-bold text-xs uppercase tracking-widest flex items-center">
                      <Sword size={14} className="mr-2"/> Pre-Market Battle Plan <span className="text-slate-500 ml-2 normal-case opacity-70">({today})</span>
                  </h3>
                  <div className="flex items-center gap-2">
                       {/* Indicator if AI Analysis is present */}
                       {hasAiAnalysisToday && (
                           <span className="flex items-center text-[10px] font-bold text-indigo-400 bg-indigo-900/30 px-2 py-0.5 rounded border border-indigo-500/30 animate-pulse">
                               <Zap size={10} className="mr-1"/> AI Active
                           </span>
                       )}
                       <ArrowRight size={14} className="text-slate-500 group-hover:text-white transition-colors"/>
                  </div>
              </div>
              
              {/* CONTENT AREA: Prioritize AI Analysis */}
              {hasAiAnalysisToday && preMarketAnalysis ? (
                   <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                       {/* Bias Badge */}
                       <div className="flex flex-col justify-center items-center p-2 bg-slate-900/50 rounded-lg border border-slate-700/50">
                           <span className="text-[10px] text-slate-500 uppercase font-bold mb-1">Market Bias</span>
                           <div className={`text-lg font-black uppercase ${preMarketAnalysis.data.marketBias === 'Bullish' ? 'text-emerald-400' : preMarketAnalysis.data.marketBias === 'Bearish' ? 'text-red-400' : 'text-slate-300'}`}>
                               {preMarketAnalysis.data.marketBias}
                           </div>
                           <div className="text-[10px] text-slate-500">Conf: {preMarketAnalysis.data.confidenceScore}/10</div>
                       </div>
                       
                       {/* Thesis */}
                       <div className="md:col-span-2">
                           <span className="text-[10px] text-indigo-400 uppercase font-bold mb-1 block">Core Thesis</span>
                           <p className="text-sm text-slate-300 italic line-clamp-2 leading-relaxed">
                               {preMarketAnalysis.data.coreThesis}
                           </p>
                           <div className="mt-2 text-[10px] text-slate-500 font-bold flex gap-2">
                               <span className="text-emerald-500">Sup: {preMarketAnalysis.data.keyLevels.support.join(', ')}</span>
                               <span>|</span>
                               <span className="text-red-500">Res: {preMarketAnalysis.data.keyLevels.resistance.join(', ')}</span>
                           </div>
                       </div>
                   </div>
              ) : isEditingPreMarket ? (
                  <div className="p-4" onClick={(e) => e.stopPropagation()}>
                      <textarea 
                          value={tempPreMarket}
                          onChange={(e) => setTempPreMarket(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-600 rounded p-3 text-sm text-white mb-2"
                          rows={3}
                          placeholder="e.g. If Nifty opens Gap Up above 21800, wait for 15m pullback. Support at 21750."
                      />
                      <div className="flex gap-2">
                          <button onClick={savePreMarket} className="bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold px-4 py-2 rounded">Save Battle Plan</button>
                          <button onClick={() => setIsEditingPreMarket(false)} className="bg-slate-700 text-white text-xs font-bold px-4 py-2 rounded">Cancel</button>
                      </div>
                  </div>
              ) : (
                  <div className="p-4 flex justify-between items-center">
                      <div className="text-sm text-slate-300 italic font-medium truncate">
                          {preMarketNotes?.date === today ? (
                              `"${preMarketNotes.notes}"`
                          ) : (
                              <span className="text-slate-500">No plan set for today. Prepare your mind before the market opens.</span>
                          )}
                      </div>
                      {!hasAiAnalysisToday && (
                         <button 
                            onClick={(e) => { e.stopPropagation(); setIsEditingPreMarket(!isEditingPreMarket); setTempPreMarket(preMarketNotes?.notes || ''); }} 
                            className="text-[10px] bg-slate-800 text-slate-400 hover:text-white px-2 py-1 rounded border border-slate-700 transition ml-4 shrink-0"
                         >
                            Edit Note
                         </button>
                      )}
                  </div>
              )}
          </div>
      )}

      {/* 🧭 NAVIGATION TABS */}
      <div className="flex bg-slate-900 rounded-lg p-1 border border-slate-800 w-full md:w-auto self-start">
         <button onClick={() => setActiveTab('overview')} className={`flex-1 md:flex-none px-6 py-2 rounded-md transition text-sm font-bold flex items-center justify-center gap-2 ${activeTab === 'overview' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
            <Activity size={16} /> Overview
         </button>
         <button onClick={() => setActiveTab('playbook')} className={`flex-1 md:flex-none px-6 py-2 rounded-md transition text-sm font-bold flex items-center justify-center gap-2 ${activeTab === 'playbook' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
            <Book size={16} /> Playbook
         </button>
         <button onClick={() => setActiveTab('simulator')} className={`flex-1 md:flex-none px-6 py-2 rounded-md transition text-sm font-bold flex items-center justify-center gap-2 ${activeTab === 'simulator' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
            <Dice6 size={16} /> Risk Sim
         </button>
      </div>

      {/* ======================= TAB: OVERVIEW ======================= */}
      {activeTab === 'overview' && (
        <div className="space-y-6 animate-fade-in">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 1. Net P&L */}
                <button 
                onClick={() => setSelectedFilter({ type: 'all_closed', value: 'All Closed' })}
                className={`bg-gradient-to-br from-slate-800 to-slate-900 p-5 rounded-xl border ${selectedFilter?.type === 'all_closed' ? 'border-emerald-500 ring-1 ring-emerald-500/50' : 'border-slate-700/50'} shadow-lg hover:shadow-emerald-900/20 hover:border-emerald-500/30 transition-all duration-300 hover:-translate-y-1 group relative overflow-hidden text-left`}
                >
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><TrendingUp size={64} /></div>
                <div className="flex justify-between items-center mb-3 relative z-10">
                    <h3 className="text-slate-400 text-xs font-bold uppercase tracking-widest">Net P&L</h3>
                    <span className={`p-1.5 rounded-lg ${stats.totalPnL >= 0 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                    {stats.totalPnL >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                    </span>
                </div>
                <p className={`text-2xl lg:text-3xl font-black font-mono relative z-10 ${stats.totalPnL >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {stats.totalPnL >= 0 ? '+' : ''}₹{stats.totalPnL.toFixed(2)}
                </p>
                <div className="flex justify-between items-center mt-3 text-[10px] font-medium text-slate-500 uppercase relative z-10">
                    <span>{stats.totalTrades} Trades</span>
                    <span className="group-hover:text-emerald-400 transition-colors flex items-center">View Ledger <ArrowRight size={10} className="ml-1"/></span>
                </div>
                </button>

                {/* 2. Win Rate */}
                <button 
                onClick={() => setSelectedFilter({ type: 'wins', value: 'Wins' })}
                className={`bg-gradient-to-br from-slate-800 to-slate-900 p-5 rounded-xl border ${selectedFilter?.type === 'wins' ? 'border-blue-500 ring-1 ring-blue-500/50' : 'border-slate-700/50'} shadow-lg hover:shadow-blue-900/20 hover:border-blue-500/30 transition-all duration-300 hover:-translate-y-1 group relative overflow-hidden text-left`}
                >
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><Target size={64} /></div>
                <div className="flex justify-between items-center mb-3 relative z-10">
                    <h3 className="text-slate-400 text-xs font-bold uppercase tracking-widest">Win Rate</h3>
                    <span className="p-1.5 rounded-lg bg-blue-500/10 text-blue-500"><Activity size={16} /></span>
                </div>
                <p className="text-2xl lg:text-3xl font-black text-white relative z-10">{stats.winRate.toFixed(1)}<span className="text-lg text-slate-500">%</span></p>
                <div className="flex gap-2 text-[10px] mt-3 font-medium uppercase relative z-10">
                    <span className="text-blue-400">L: {stats.longWinRate.toFixed(0)}%</span>
                    <span className="text-slate-600">|</span>
                    <span className="text-amber-400">S: {stats.shortWinRate.toFixed(0)}%</span>
                </div>
                </button>

                {/* 3. Profit Factor */}
                <button 
                onClick={() => setSelectedFilter({ type: 'losses', value: 'Losses' })}
                className={`bg-gradient-to-br from-slate-800 to-slate-900 p-5 rounded-xl border ${selectedFilter?.type === 'losses' ? 'border-rose-500 ring-1 ring-rose-500/50' : 'border-slate-700/50'} shadow-lg hover:shadow-rose-900/20 hover:border-rose-500/30 transition-all duration-300 hover:-translate-y-1 group relative overflow-hidden text-left`}
                >
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><ShieldAlert size={64} /></div>
                <div className="flex justify-between items-center mb-3 relative z-10">
                    <h3 className="text-slate-400 text-xs font-bold uppercase tracking-widest">Profit Factor</h3>
                    <span className="p-1.5 rounded-lg bg-purple-500/10 text-purple-500"><Sparkles size={16} /></span>
                </div>
                <p className="text-2xl lg:text-3xl font-black text-white relative z-10">{stats.profitFactor.toFixed(2)}<span className="text-sm text-slate-600 ml-1 font-normal">x</span></p>
                <div className="mt-3 flex justify-between items-center text-[10px] text-slate-500 font-medium uppercase relative z-10">
                    <span>Target: {'>'} 1.5</span>
                    <span className="group-hover:text-rose-400 transition-colors flex items-center">Check Leaks <ArrowRight size={10} className="ml-1"/></span>
                </div>
                </button>

                {/* 4. Extremes */}
                <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-5 rounded-xl border border-slate-700/50 shadow-lg flex flex-col justify-between group relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><Trophy size={64} /></div>
                <div className="flex justify-between items-center mb-2 relative z-10">
                    <h3 className="text-slate-400 text-xs font-bold uppercase tracking-widest">Performance Range</h3>
                    <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-500"><AlertCircle size={16} /></span>
                </div>
                <div className="flex items-end justify-between gap-2 relative z-10 mt-2">
                    <button onClick={() => setSelectedFilter({ type: 'best', value: 'Best Trade' })} className="flex-1 bg-emerald-500/5 hover:bg-emerald-500/20 p-2 rounded-lg border border-emerald-500/20 transition text-left group/btn">
                        <div className="text-[10px] text-emerald-500/70 font-bold uppercase mb-1">{bestTradeDisplay.label}</div>
                        <div className={`text-sm font-bold ${bestTradeDisplay.color}`}>{bestTradeDisplay.value}</div>
                    </button>
                    <button onClick={() => setSelectedFilter({ type: 'worst', value: 'Worst Trade' })} className="flex-1 bg-red-500/5 hover:bg-red-500/20 p-2 rounded-lg border border-red-500/20 transition text-right group/btn">
                        <div className="text-[10px] text-red-500/70 font-bold uppercase mb-1">{worstTradeDisplay.label}</div>
                        <div className={`text-sm font-bold ${worstTradeDisplay.color}`}>{worstTradeDisplay.value}</div>
                    </button>
                </div>
                </div>
            </div>

            {/* AI Report Card */}
            <div className="bg-gradient-to-br from-indigo-900/30 to-slate-800 p-6 rounded-xl border border-indigo-500/30 shadow-lg relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none"><BrainCircuit size={120} className="text-indigo-400" /></div>
                <div className="relative z-10">
                    <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 gap-4">
                        <h3 className="text-indigo-400 font-bold text-lg flex items-center"><Sparkles size={20} className="mr-2" /> AI Performance Review</h3>
                        <div className="flex bg-slate-900/50 rounded-lg p-1 border border-slate-700">
                            <button onClick={() => setReportPeriod('week')} className={`px-3 py-1 text-xs font-medium rounded-md transition ${reportPeriod === 'week' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}>7 Days</button>
                            <button onClick={() => setReportPeriod('fortnight')} className={`px-3 py-1 text-xs font-medium rounded-md transition ${reportPeriod === 'fortnight' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}>15 Days</button>
                            <button onClick={() => setReportPeriod('month')} className={`px-3 py-1 text-xs font-medium rounded-md transition ${reportPeriod === 'month' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}>30 Days</button>
                        </div>
                    </div>
                    
                    {!aiReport && !isGeneratingReport && (
                        <div className="text-center py-6">
                            <p className="text-slate-400 text-sm mb-4">Get a deep-dive analysis of your recent trading performance.</p>
                            <button onClick={handleGenerateReport} className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2 rounded-lg font-semibold transition shadow-lg shadow-indigo-900/50 flex items-center mx-auto"><BrainCircuit size={18} className="mr-2" /> Generate Coach's Report</button>
                        </div>
                    )}
                    
                    {isGeneratingReport && (
                        <div className="text-center py-8 animate-pulse">
                            <BrainCircuit size={48} className="mx-auto text-indigo-500 mb-4 opacity-50" />
                            <p className="text-indigo-300 font-medium">Analyzing your trade journal...</p>
                            <p className="text-xs text-slate-500 mt-2">Thinking deep to find your edge (10-20s)</p>
                        </div>
                    )}
                    
                    {aiReport && (
                        <div className="mt-4">
                            <AiCoachReport report={aiReport} title={`Coach's Report (${reportPeriod === 'week' ? 'Last 7 Days' : reportPeriod === 'fortnight' ? 'Last 15 Days' : 'Last 30 Days'})`} />
                            <div className="mt-2 text-center">
                                <button onClick={handleGenerateReport} className="text-indigo-400 text-xs hover:text-indigo-300 underline flex items-center justify-center mx-auto gap-1">
                                    <RefreshCw size={12}/> Refresh Analysis
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg">
                    <h3 className="text-white font-semibold mb-4 text-sm uppercase tracking-wide">Account Growth</h3>
                    <div className="h-64 w-full cursor-pointer">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={equityCurveData} onClick={(data: any) => { if (data && data.activePayload && data.activePayload[0]) { setSelectedFilter({ type: 'date', value: data.activePayload[0].payload.fullDate }); }}}>
                                <defs>
                                    <linearGradient id="colorEquity" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/><stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/></linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                                <XAxis dataKey="date" stroke="#64748b" fontSize={11} tickMargin={10} />
                                <YAxis stroke="#64748b" fontSize={11} tickFormatter={(val) => `₹${val}`} />
                                <Tooltip content={<CustomChartTooltip />} />
                                <ReferenceLine y={0} stroke="#475569" strokeDasharray="3 3" />
                                <Area type="monotone" dataKey="equity" stroke="#3B82F6" strokeWidth={2} fillOpacity={1} fill="url(#colorEquity)" activeDot={{ r: 6 }} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
                <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg flex flex-col items-center justify-center">
                    <h3 className="text-white font-semibold mb-2 text-sm uppercase tracking-wide w-full text-left">Long vs Short</h3>
                    <div className="h-56 w-full relative cursor-pointer">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={directionalData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" onClick={(data) => setSelectedFilter({ type: 'direction', value: data.type === 'Long' ? 'Long' : 'Short' })}>
                                {directionalData.map((entry, index) => ( <Cell key={`cell-${index}`} fill={entry.fill} /> ))}
                                </Pie>
                                <Tooltip content={<CustomChartTooltip />} />
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
        </div>
      )}

      {/* ======================= TAB: PLAYBOOK (Analytics) ======================= */}
      {activeTab === 'playbook' && (
          <div className="space-y-6 animate-fade-in">
              <div className="bg-gradient-to-r from-slate-900 to-indigo-950 p-6 rounded-xl border border-indigo-500/20 shadow-lg">
                  <div className="flex items-center gap-4 mb-2">
                      <Book size={32} className="text-indigo-400"/>
                      <div>
                          <h3 className="text-xl font-bold text-white">The Playbook</h3>
                          <p className="text-sm text-slate-400">Discover which setups are making you money and which are draining you.</p>
                      </div>
                  </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {playbookStats.map((stat, idx) => (
                      <div key={idx} className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden hover:border-slate-500 transition shadow-lg">
                          <div className={`h-2 w-full ${stat.totalPnL > 0 ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                          <div className="p-5">
                              <h4 className="font-bold text-white text-lg mb-4 flex justify-between items-start">
                                  {stat.setupName}
                                  <span className="text-xs font-medium text-slate-500 bg-slate-900 px-2 py-1 rounded">{stat.count} trades</span>
                              </h4>
                              
                              <div className="space-y-3">
                                  <div className="flex justify-between items-center">
                                      <span className="text-xs text-slate-400 uppercase font-bold">Win Rate</span>
                                      <span className={`text-sm font-bold ${stat.winRate >= 50 ? 'text-emerald-400' : 'text-amber-400'}`}>{stat.winRate}%</span>
                                  </div>
                                  <div className="w-full bg-slate-900 rounded-full h-1.5">
                                      <div className={`h-1.5 rounded-full ${stat.winRate >= 50 ? 'bg-emerald-500' : 'bg-amber-500'}`} style={{width: `${stat.winRate}%`}}></div>
                                  </div>
                                  
                                  <div className="grid grid-cols-2 gap-4 pt-2 mt-2 border-t border-slate-700/50">
                                      <div>
                                          <span className="text-[10px] text-slate-500 uppercase font-bold block">Avg PnL</span>
                                          <span className={`font-mono font-bold ${stat.avgPnL > 0 ? 'text-emerald-400' : 'text-red-400'}`}>₹{stat.avgPnL.toFixed(0)}</span>
                                      </div>
                                      <div className="text-right">
                                          <span className="text-[10px] text-slate-500 uppercase font-bold block">Total</span>
                                          <span className={`font-mono font-bold ${stat.totalPnL > 0 ? 'text-emerald-400' : 'text-red-400'}`}>₹{stat.totalPnL.toFixed(0)}</span>
                                      </div>
                                  </div>
                              </div>
                          </div>
                      </div>
                  ))}
                  
                  {playbookStats.length === 0 && (
                      <div className="col-span-full text-center py-12 text-slate-500">
                          <Book size={48} className="mx-auto mb-4 opacity-20"/>
                          <p>No classified trades yet. Add a "Setup Name" when logging trades to populate your Playbook.</p>
                      </div>
                  )}
              </div>
          </div>
      )}

      {/* ======================= TAB: SIMULATOR (Risk) ======================= */}
      {activeTab === 'simulator' && (
          <div className="space-y-6 animate-fade-in">
              <div className="bg-gradient-to-r from-slate-900 to-rose-950 p-6 rounded-xl border border-rose-500/20 shadow-lg">
                  <div className="flex items-center gap-4 mb-2">
                      <ShieldAlert size={32} className="text-rose-400"/>
                      <div>
                          <h3 className="text-xl font-bold text-white">Risk Simulator</h3>
                          <p className="text-sm text-slate-400">Monte Carlo projection based on your current performance stats.</p>
                      </div>
                  </div>
              </div>

              {riskSimData ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg">
                          <h4 className="text-slate-400 font-bold text-xs uppercase mb-4 tracking-widest">Current Metrics</h4>
                          <div className="space-y-4">
                              <div className="flex justify-between border-b border-slate-700 pb-2">
                                  <span>Win Rate</span>
                                  <span className="font-mono text-white">{(riskSimData.winRate * 100).toFixed(1)}%</span>
                              </div>
                              <div className="flex justify-between border-b border-slate-700 pb-2">
                                  <span>Avg Win</span>
                                  <span className="font-mono text-emerald-400">₹{riskSimData.avgWin.toFixed(0)}</span>
                              </div>
                              <div className="flex justify-between border-b border-slate-700 pb-2">
                                  <span>Avg Loss</span>
                                  <span className="font-mono text-red-400">₹{riskSimData.avgLoss.toFixed(0)}</span>
                              </div>
                          </div>
                      </div>

                      <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg flex flex-col items-center justify-center text-center">
                          <h4 className="text-rose-400 font-bold text-xs uppercase mb-4 tracking-widest">Risk of Ruin (50% Drawdown)</h4>
                          <div className="text-5xl font-black text-white mb-2">
                              {(riskSimData.probRuin * 100).toFixed(1)}%
                          </div>
                          <p className="text-xs text-slate-400 px-8">
                              Probability of losing 50% of your account if you continue trading exactly like this.
                          </p>
                          <div className={`mt-4 px-3 py-1 rounded text-xs font-bold uppercase ${riskSimData.probRuin < 0.05 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                              {riskSimData.probRuin < 0.05 ? 'Safe Zone' : 'Danger Zone'}
                          </div>
                      </div>
                  </div>
              ) : (
                  <div className="text-center py-12 text-slate-500">
                      <p>Need at least 10 trades (with wins and losses) to run simulation.</p>
                  </div>
              )}
          </div>
      )}

      {/* 📊 FULL SCREEN DISCIPLINE MODAL */}
      {showScoreDetails && (
        <div className="fixed inset-0 z-[200] bg-slate-950/95 backdrop-blur-md overflow-y-auto animate-fade-in">
           <div className="max-w-4xl mx-auto min-h-screen p-6 md:p-12 flex flex-col">
              
              <div className="flex justify-between items-center mb-8 sticky top-0 bg-slate-950/90 py-4 z-10 border-b border-slate-800">
                  <div className="flex items-center gap-4">
                      <div className="bg-indigo-500/20 p-3 rounded-xl text-indigo-400"><BrainCircuit size={32}/></div>
                      <div>
                          <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight">Psychology Profile</h2>
                          <p className="text-sm text-slate-500">Deep dive into your behavioral performance</p>
                      </div>
                  </div>
                  <button onClick={() => setShowScoreDetails(false)} className="p-3 bg-slate-800 rounded-full hover:bg-slate-700 text-slate-400 hover:text-white transition shadow-lg border border-slate-700"><X size={24}/></button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  {/* Cost of Indiscipline */}
                  <div className="bg-slate-900 p-6 rounded-2xl border border-red-500/20 shadow-lg">
                      <h4 className="text-xs font-bold text-red-400 uppercase tracking-widest mb-4 flex items-center gap-2"><Wallet size={16}/> Cost of Indiscipline</h4>
                      <div className="text-3xl font-black text-white font-mono mb-2">₹{Math.abs(psychoStats.costOfIndiscipline).toFixed(0)}</div>
                      <p className="text-xs text-slate-500">Total losses incurred on trades where your AI Execution Grade was <strong>&le; 60%</strong> (Rating &le; 3).</p>
                  </div>

                  {/* The Tilt Gap */}
                  <div className="bg-slate-900 p-6 rounded-2xl border border-indigo-500/20 shadow-lg">
                      <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-4 flex items-center gap-2"><Scale size={16}/> The Tilt Gap</h4>
                      <div className="text-3xl font-black text-white font-mono mb-2">+{psychoStats.winRateVariance.toFixed(1)}%</div>
                      <p className="text-xs text-slate-500">Your Win Rate is higher when your Execution Grade is <strong>&ge; 80%</strong> (Rating &ge; 4).</p>
                  </div>

                   {/* Consistency */}
                   <div className="bg-slate-900 p-6 rounded-2xl border border-emerald-500/20 shadow-lg">
                      <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-4 flex items-center gap-2"><Percent size={16}/> System Adherence</h4>
                      <div className="text-3xl font-black text-white font-mono mb-2">{psychoStats.systemAdherence}%</div>
                      <p className="text-xs text-slate-500">Percentage of total trades where you strictly followed your trading plan.</p>
                  </div>
              </div>

              <div className="space-y-6">
                  <div className="bg-indigo-900/10 border border-indigo-500/30 p-6 rounded-2xl flex items-start gap-5">
                      <div className="bg-indigo-500/20 p-3 rounded-full text-indigo-400 shrink-0"><Sparkles size={24}/></div>
                      <div>
                          <h5 className="text-indigo-300 font-bold text-sm uppercase mb-2 tracking-wide">Coach's Diagnosis</h5>
                          <p className="text-lg text-slate-200 italic font-medium leading-relaxed">{getMotivationalMessage()}</p>
                      </div>
                  </div>

                  <div>
                      <h4 className="flex items-center gap-2 text-red-400 font-bold text-sm uppercase tracking-wider mb-4"><AlertTriangle size={18}/> Recent Discipline Leaks</h4>
                      {psychoStats.recentOffenses.length === 0 ? (
                          <div className="bg-emerald-900/10 border border-emerald-500/20 rounded-2xl p-8 text-center">
                              <ShieldCheck size={48} className="mx-auto text-emerald-500 mb-4 opacity-50"/>
                              <p className="text-emerald-400 font-bold text-lg">Clean Record!</p>
                              <p className="text-slate-500 text-sm mt-2">You haven't logged a discipline error in your last 5 trades.</p>
                          </div>
                      ) : (
                          <div className="bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 shadow-xl">
                              <table className="w-full text-left text-sm">
                                  <thead className="bg-slate-950 text-slate-500 uppercase font-bold text-xs">
                                      <tr>
                                          <th className="p-4">Date</th>
                                          <th className="p-4">Issue</th>
                                          <th className="p-4 text-right">Execution Grade</th>
                                          <th className="p-4 text-right">Action</th>
                                      </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-800">
                                      {psychoStats.recentOffenses.map(t => {
                                          const grade = getNumericGrade(t);
                                          return (
                                              <tr key={t.id} onClick={() => { setShowScoreDetails(false); onViewTrade?.(t.id); }} className="hover:bg-slate-800/50 cursor-pointer transition group">
                                                  <td className="p-4 text-white font-mono">{t.date}</td>
                                                  <td className="p-4">
                                                      <span className="bg-red-500/10 text-red-400 px-2 py-1 rounded border border-red-500/20 text-xs font-bold uppercase">Discipline Leak</span>
                                                  </td>
                                                  <td className="p-4 text-right">
                                                      {grade !== null ? (
                                                          <div className="inline-block px-2 py-1 bg-slate-950 rounded text-red-400 font-bold font-mono">{grade}%</div>
                                                      ) : (
                                                          <div className="inline-block px-2 py-1 bg-slate-950 rounded text-red-400 font-bold">{t.disciplineRating}/5</div>
                                                      )}
                                                  </td>
                                                  <td className="p-4 text-right text-slate-500 group-hover:text-indigo-400">
                                                      <ArrowUpRight size={16} className="ml-auto"/>
                                                  </td>
                                              </tr>
                                          );
                                      })}
                                  </tbody>
                              </table>
                          </div>
                      )}
                  </div>
                  
                  <div className="border border-slate-800 rounded-xl overflow-hidden mt-8">
                      <button onClick={() => setShowFormulas(!showFormulas)} className="w-full flex items-center justify-between p-4 bg-slate-900 hover:bg-slate-800 transition text-left">
                         <div className="flex items-center gap-2"><Calculator size={16} className="text-slate-400"/><span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Show Calculation Methodology</span></div>
                         {showFormulas ? <ChevronUp size={16} className="text-slate-500"/> : <ChevronDown size={16} className="text-slate-500"/>}
                      </button>
                      {showFormulas && (
                          <div className="p-6 bg-slate-950 border-t border-slate-800 text-xs text-slate-400 font-mono space-y-2">
                              <p>Discipline Index = Average of AI Execution Scores</p>
                              <p>Cost of Indiscipline = Sum(PnL) where Score &lt; 60%</p>
                              <p>Tilt Gap = WinRate(Score &ge; 60%) - WinRate(Score &lt; 60%)</p>
                          </div>
                      )}
                  </div>
              </div>
           </div>
        </div>
      )}

      {selectedFilter && (
        <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4 backdrop-blur-md animate-fade-in">
            <div className="bg-slate-900 w-full max-w-5xl rounded-2xl border border-slate-700 shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-4 border-b border-slate-800 bg-slate-950 flex justify-between items-center sticky top-0 z-20">
                     <div className="flex items-center gap-3"><div className="bg-indigo-900/50 p-2 rounded-lg text-indigo-400"><ListFilter size={20}/></div><div><h3 className="font-bold text-white text-base">{getFilterTitle(selectedFilter)}</h3><p className="text-xs text-slate-500">{filteredTrades.length} mission logs found</p></div></div>
                    <button onClick={() => setSelectedFilter(null)} className="p-2 hover:bg-slate-800 rounded-full transition text-slate-400 hover:text-white"><X size={20}/></button>
                </div>
                <div className="overflow-y-auto custom-scrollbar p-0">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-slate-500 uppercase bg-slate-950/50 border-b border-slate-800 sticky top-0"><tr><th className="px-6 py-4 font-bold tracking-wider">Date</th><th className="px-6 py-4 font-bold tracking-wider">Instrument</th><th className="px-6 py-4 font-bold tracking-wider text-right">PnL</th></tr></thead>
                        <tbody className="divide-y divide-slate-800/50">
                            {filteredTrades.map(t => (
                                <tr key={t.id} onClick={() => { setSelectedFilter(null); onViewTrade?.(t.id); }} className="hover:bg-slate-800/30 transition-colors cursor-pointer group"><td className="px-6 py-4 text-white font-mono group-hover:text-indigo-400 transition-colors">{t.date}</td><td className="px-6 py-4 text-indigo-300 font-bold">{t.instrument}</td><td className={`px-6 py-4 text-right font-mono font-bold ${t.pnl && t.pnl > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                    {t.pnl && t.pnl > 0 ? '+' : ''}₹{t.pnl?.toFixed(0)}
                                </td></tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
      )}

    </div>
  );
};

export default Dashboard;
