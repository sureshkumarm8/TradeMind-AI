
import React, { useState, useMemo } from 'react';
import { 
    FlaskConical, Sparkles, TrendingUp, TrendingDown, 
    Zap, AlertTriangle, Clock, Target, CalendarDays,
    ArrowRight, BrainCircuit, Loader2, Filter, RotateCcw,
    MousePointer2, Hourglass, LayoutList, FileText, Search,
    ChevronRight, Grip, Bot
} from 'lucide-react';
import { 
    ResponsiveContainer, BarChart, Bar, XAxis, YAxis, 
    CartesianGrid, Tooltip, Cell, AreaChart, Area,
    ScatterChart, Scatter, ZAxis, ReferenceLine
} from 'recharts';
import { Trade, TradeOutcome } from '../types';
import { getEdgePatterns, EdgeInsight } from '../services/geminiService';

interface EdgeLabProps {
    trades: Trade[];
    apiKey: string;
}

// Custom Tooltip
const LabTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-slate-900 border border-slate-700 p-2 rounded shadow-xl z-50">
                <p className="text-slate-400 text-[10px] font-bold uppercase">{label}</p>
                {payload.map((p: any, i: number) => (
                    <p key={i} className={`text-sm font-black ${p.name === 'PnL' ? (p.value >= 0 ? 'text-emerald-400' : 'text-red-400') : 'text-white'}`}>
                        {p.name}: {p.name === 'PnL' ? `₹${p.value}` : p.value}
                    </p>
                ))}
            </div>
        );
    }
    return null;
};

// Custom Scatter Tooltip
const ScatterTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (
            <div className="bg-slate-900 border border-slate-700 p-3 rounded-lg shadow-xl z-50">
                <div className="flex items-center gap-2 mb-2">
                    <span className={`w-2 h-2 rounded-full ${data.pnl >= 0 ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                    <span className="text-xs font-bold text-white">{data.date}</span>
                </div>
                <div className="space-y-1">
                    <p className={`text-sm font-black font-mono ${data.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        ₹{data.pnl}
                    </p>
                    <p className="text-xs text-slate-400">Duration: <span className="text-white">{data.duration}m</span></p>
                    <p className="text-[10px] text-slate-500 uppercase">{data.instrument}</p>
                </div>
            </div>
        );
    }
    return null;
};

const EdgeLab: React.FC<EdgeLabProps> = ({ trades, apiKey }) => {
    const [activeTab, setActiveTab] = useState<'patterns' | 'archives'>('patterns');
    const [insights, setInsights] = useState<EdgeInsight[] | null>(null);
    const [isScanning, setIsScanning] = useState(false);

    // --- ARCHIVE STATE ---
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedReport, setSelectedReport] = useState<{title: string, content: string} | null>(null);

    // --- WHAT-IF SIMULATOR STATE ---
    const [simFilters, setSimFilters] = useState({
        excludeMistakes: false,
        excludeFridays: false,
        excludeShortDuration: false, // < 5 mins
        excludeAfter2PM: false
    });

    // --- DATA PREP: ARCHIVES ---
    // Load Period Reports from LocalStorage
    const periodReports = useMemo(() => {
        try {
            return JSON.parse(localStorage.getItem('tradeMind_periodReports') || '{}');
        } catch { return {}; }
    }, []);

    // Filter trades for Archive
    const filteredArchiveTrades = useMemo(() => {
        return trades.filter(t => 
            t.instrument.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (t.setupName && t.setupName.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (t.notes && t.notes.some(n => n.content.toLowerCase().includes(searchTerm.toLowerCase()))) ||
            (t.aiFeedback && t.aiFeedback.toLowerCase().includes(searchTerm.toLowerCase()))
        ).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [trades, searchTerm]);

    // --- DATA PREP: PATTERNS ---

    // 1. Hourly Performance Data
    const hourlyData = useMemo(() => {
        const hours: Record<string, number> = {};
        for(let i=9; i<=15; i++) hours[i] = 0;

        trades.forEach(t => {
            if(t.outcome === TradeOutcome.OPEN || !t.entryTime) return;
            const hour = parseInt(t.entryTime.split(':')[0]);
            if(hours[hour] !== undefined) {
                hours[hour] += (t.pnl || 0);
            }
        });

        return Object.entries(hours).map(([hour, pnl]) => ({
            hour: `${hour}:00`,
            pnl: Math.round(pnl)
        }));
    }, [trades]);

    // 2. Setup Performance Data
    const setupData = useMemo(() => {
        const setups: Record<string, number> = {};
        trades.forEach(t => {
            if(t.outcome === TradeOutcome.OPEN || !t.setupName) return;
            const name = t.setupName.trim() || 'Unlabeled';
            if(!setups[name]) setups[name] = 0;
            setups[name] += (t.pnl || 0);
        });
        return Object.entries(setups)
            .map(([name, pnl]) => ({ name, pnl: Math.round(pnl) }))
            .sort((a,b) => b.pnl - a.pnl)
            .slice(0, 5); // Top 5
    }, [trades]);

    // 3. Scatter Data (Duration vs PnL)
    const scatterData = useMemo(() => {
        return trades
            .filter(t => t.outcome !== TradeOutcome.OPEN && t.tradeDurationMins && t.pnl)
            .map(t => ({
                duration: t.tradeDurationMins || 0,
                pnl: t.pnl || 0,
                date: t.date,
                instrument: t.instrument,
                size: Math.abs(t.pnl || 0) // For bubble size (optional visual)
            }));
    }, [trades]);

    // 4. Simulator Logic
    const simulatorData = useMemo(() => {
        const sortedTrades = [...trades]
            .filter(t => t.outcome !== TradeOutcome.OPEN)
            .sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        let currentEquity = 0;
        let simEquity = 0;

        return sortedTrades.map(t => {
            const dateObj = new Date(t.date);
            const hour = t.entryTime ? parseInt(t.entryTime.split(':')[0]) : 0;
            
            // Check Exclusion Criteria
            let isExcluded = false;
            
            if (simFilters.excludeMistakes && t.mistakes && t.mistakes.length > 0) isExcluded = true;
            if (simFilters.excludeFridays && dateObj.getDay() === 5) isExcluded = true;
            if (simFilters.excludeShortDuration && (t.tradeDurationMins || 0) < 5) isExcluded = true;
            if (simFilters.excludeAfter2PM && hour >= 14) isExcluded = true;

            currentEquity += (t.pnl || 0);
            if (!isExcluded) {
                simEquity += (t.pnl || 0);
            }

            return {
                date: t.date,
                actual: currentEquity,
                simulated: simEquity
            };
        });
    }, [trades, simFilters]);

    // Calculate Optimization Delta
    const optimizationStats = useMemo(() => {
        if (simulatorData.length === 0) return { delta: 0, pct: 0, actual: 0, sim: 0 };
        const final = simulatorData[simulatorData.length - 1];
        const delta = final.simulated - final.actual;
        const pct = final.actual !== 0 ? (delta / Math.abs(final.actual)) * 100 : 0;
        return { delta, pct, actual: final.actual, sim: final.simulated };
    }, [simulatorData]);

    const runPatternScan = async () => {
        if(!apiKey) { alert("API Key Required"); return; }
        if(trades.length < 5) { alert("Need at least 5 trades to scan for patterns."); return; }
        
        setIsScanning(true);
        try {
            const results = await getEdgePatterns(trades, apiKey);
            setInsights(results);
        } catch(e) {
            console.error(e);
            alert("Scan failed. Check API Key.");
        } finally {
            setIsScanning(false);
        }
    };

    // Helper to render AI JSON in table
    const renderAiCell = (jsonStr: string | undefined) => {
        if(!jsonStr) return <span className="text-slate-600 text-xs italic">Pending Analysis</span>;
        try {
            const data = JSON.parse(jsonStr);
            return (
                <div className="space-y-2">
                    <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase border ${data.grade >= 80 ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : data.grade >= 50 ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' : 'bg-red-500/20 text-red-400 border-red-500/30'}`}>
                            Grade: {data.grade}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">{data.marketTrend}</span>
                    </div>
                    <p className="text-xs text-slate-300 leading-snug border-l-2 border-indigo-500 pl-2">
                        {data.realityCheck}
                    </p>
                    <div className="bg-slate-900/50 p-2 rounded border border-slate-700/50">
                        <p className="text-[10px] text-indigo-300 font-bold uppercase mb-1 flex items-center gap-1"><BrainCircuit size={10}/> Coach:</p>
                        <p className="text-xs text-slate-400 italic">"{data.coachCommand}"</p>
                    </div>
                </div>
            )
        } catch(e) {
            return <span className="text-red-400 text-xs">Error parsing AI Data</span>;
        }
    }

    return (
        <div className="animate-fade-in-up pb-20">
            {/* Header */}
            <div className="bg-gradient-to-r from-cyan-900/20 to-indigo-900/20 border-b border-cyan-500/20 p-6 mb-6 rounded-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                    <FlaskConical size={120} className="text-cyan-400"/>
                </div>
                <div className="relative z-10">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <div className="bg-cyan-500/20 p-2 rounded-lg text-cyan-400">
                                    <FlaskConical size={24} />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-black text-white tracking-tight uppercase">Edge Lab</h2>
                                    <p className="text-xs text-cyan-400 font-mono tracking-widest">QUANTITATIVE PATTERN RECOGNITION</p>
                                </div>
                            </div>
                            <p className="text-sm text-slate-400 max-w-xl leading-relaxed mt-2">
                                Detect hidden statistical anomalies and review your Neural Archives.
                            </p>
                        </div>
                        
                        {/* Tab Switcher */}
                        <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-700">
                            <button 
                                onClick={() => setActiveTab('patterns')}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wide transition-all ${activeTab === 'patterns' ? 'bg-cyan-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                            >
                                <Sparkles size={14} /> Pattern Scout
                            </button>
                            <button 
                                onClick={() => setActiveTab('archives')}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wide transition-all ${activeTab === 'archives' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                            >
                                <LayoutList size={14} /> Neural Archives
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* CONTENT AREA */}
            {activeTab === 'patterns' ? (
                <div className="animate-fade-in space-y-8">
                    {/* AI Action */}
                    <div className="flex justify-center">
                        {!isScanning ? (
                            <button 
                                onClick={runPatternScan}
                                className="group relative inline-flex items-center justify-center px-8 py-4 font-black text-white transition-all duration-200 bg-cyan-600 font-lg rounded-xl hover:bg-cyan-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-600 shadow-lg shadow-cyan-900/50 hover:shadow-cyan-500/30 hover:-translate-y-1"
                            >
                                <Sparkles className="w-5 h-5 mr-2 animate-pulse" />
                                IGNITE PATTERN SCOUT
                                <div className="absolute -inset-3 rounded-xl bg-cyan-400 opacity-20 group-hover:opacity-40 blur transition duration-200"></div>
                            </button>
                        ) : (
                            <div className="flex flex-col items-center">
                                <div className="flex items-center gap-3 px-8 py-4 bg-slate-800 rounded-xl border border-cyan-500/30 text-cyan-400 font-bold uppercase tracking-widest animate-pulse">
                                    <Loader2 size={20} className="animate-spin"/> Scanning {trades.length} Logs...
                                </div>
                                <p className="text-[10px] text-slate-500 mt-2 font-mono">Running Correlation Matrix...</p>
                            </div>
                        )}
                    </div>

                    {/* AI Insights Grid */}
                    {insights && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in">
                            {insights.map((insight, idx) => {
                                let colors = "border-slate-700 bg-slate-800";
                                let icon = <BrainCircuit size={20}/>;
                                
                                if(insight.type === 'strength') {
                                    colors = "border-emerald-500/50 bg-emerald-900/10 shadow-[0_0_20px_rgba(16,185,129,0.1)]";
                                    icon = <TrendingUp className="text-emerald-400" size={24}/>;
                                } else if(insight.type === 'weakness') {
                                    colors = "border-red-500/50 bg-red-900/10 shadow-[0_0_20px_rgba(239,68,68,0.1)]";
                                    icon = <AlertTriangle className="text-red-400" size={24}/>;
                                } else {
                                    colors = "border-amber-500/50 bg-amber-900/10 shadow-[0_0_20px_rgba(245,158,11,0.1)]";
                                    icon = <Zap className="text-amber-400" size={24}/>;
                                }

                                return (
                                    <div key={idx} className={`p-6 rounded-2xl border ${colors} relative overflow-hidden group hover:scale-[1.02] transition-transform`}>
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="p-3 bg-slate-950/50 rounded-xl border border-white/5">{icon}</div>
                                            <span className="text-[10px] font-black uppercase tracking-widest opacity-50">{insight.type}</span>
                                        </div>
                                        <h3 className="text-lg font-bold text-white mb-2">{insight.title}</h3>
                                        <p className="text-sm text-slate-300 leading-relaxed mb-4 min-h-[60px]">{insight.description}</p>
                                        <div className="bg-slate-950/30 p-3 rounded-lg border-l-2 border-white/20">
                                            <p className="text-xs text-slate-400 font-mono"><span className="text-white font-bold">Action:</span> {insight.actionable}</p>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}

                    {/* THE OPTIMIZER ("What-If") */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* 1. Simulator Controls */}
                        <div className="bg-slate-800 rounded-2xl border border-indigo-500/30 shadow-xl overflow-hidden flex flex-col">
                            <div className="p-5 border-b border-indigo-500/20 bg-indigo-900/10">
                                <div className="flex items-center gap-2 mb-2">
                                    <FlaskConical size={18} className="text-indigo-400"/>
                                    <h3 className="text-sm font-black text-white uppercase tracking-wider">The "What-If" Eraser</h3>
                                </div>
                                <p className="text-xs text-indigo-300">Simulate your PnL by erasing bad habits.</p>
                            </div>
                            
                            <div className="p-5 flex-1 space-y-4">
                                <label className="flex items-center justify-between p-3 bg-slate-900/50 rounded-xl border border-slate-700 cursor-pointer hover:border-indigo-500/50 transition">
                                    <span className="text-xs font-bold text-slate-300 flex items-center gap-2"><AlertTriangle size={14} className="text-red-400"/> Remove Mistakes</span>
                                    <input type="checkbox" checked={simFilters.excludeMistakes} onChange={() => setSimFilters(p => ({...p, excludeMistakes: !p.excludeMistakes}))} className="w-4 h-4 rounded border-slate-600 text-indigo-600 focus:ring-indigo-500 bg-slate-800"/>
                                </label>
                                <label className="flex items-center justify-between p-3 bg-slate-900/50 rounded-xl border border-slate-700 cursor-pointer hover:border-indigo-500/50 transition">
                                    <span className="text-xs font-bold text-slate-300 flex items-center gap-2"><CalendarDays size={14} className="text-amber-400"/> Remove Fridays</span>
                                    <input type="checkbox" checked={simFilters.excludeFridays} onChange={() => setSimFilters(p => ({...p, excludeFridays: !p.excludeFridays}))} className="w-4 h-4 rounded border-slate-600 text-indigo-600 focus:ring-indigo-500 bg-slate-800"/>
                                </label>
                                <label className="flex items-center justify-between p-3 bg-slate-900/50 rounded-xl border border-slate-700 cursor-pointer hover:border-indigo-500/50 transition">
                                    <span className="text-xs font-bold text-slate-300 flex items-center gap-2"><MousePointer2 size={14} className="text-blue-400"/> Remove Scalps (&lt;5m)</span>
                                    <input type="checkbox" checked={simFilters.excludeShortDuration} onChange={() => setSimFilters(p => ({...p, excludeShortDuration: !p.excludeShortDuration}))} className="w-4 h-4 rounded border-slate-600 text-indigo-600 focus:ring-indigo-500 bg-slate-800"/>
                                </label>
                                <label className="flex items-center justify-between p-3 bg-slate-900/50 rounded-xl border border-slate-700 cursor-pointer hover:border-indigo-500/50 transition">
                                    <span className="text-xs font-bold text-slate-300 flex items-center gap-2"><Clock size={14} className="text-purple-400"/> Remove After 2PM</span>
                                    <input type="checkbox" checked={simFilters.excludeAfter2PM} onChange={() => setSimFilters(p => ({...p, excludeAfter2PM: !p.excludeAfter2PM}))} className="w-4 h-4 rounded border-slate-600 text-indigo-600 focus:ring-indigo-500 bg-slate-800"/>
                                </label>
                            </div>

                            <div className="p-5 border-t border-slate-700 bg-slate-900/30">
                                <div className="flex justify-between items-end">
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-500 uppercase">Simulated Impact</p>
                                        <p className={`text-2xl font-black ${optimizationStats.delta >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                            {optimizationStats.delta >= 0 ? '+' : ''}₹{optimizationStats.delta.toFixed(0)}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] font-bold text-slate-500 uppercase">Improvement</p>
                                        <span className={`inline-block px-2 py-1 rounded text-xs font-bold ${optimizationStats.pct >= 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                                            {optimizationStats.pct > 0 ? '+' : ''}{optimizationStats.pct.toFixed(1)}%
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 2. Simulator Chart */}
                        <div className="lg:col-span-2 bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-xl">
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                                <TrendingUp size={14} className="text-emerald-400"/> Equity Curve Simulation
                            </h3>
                            <div className="h-[300px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={simulatorData}>
                                        <defs>
                                            <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#64748b" stopOpacity={0.3}/>
                                                <stop offset="95%" stopColor="#64748b" stopOpacity={0}/>
                                            </linearGradient>
                                            <linearGradient id="colorSim" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                                                <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                                        <XAxis dataKey="date" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(d) => new Date(d).getDate().toString()} />
                                        <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                                        <Tooltip content={<LabTooltip />} />
                                        <Area type="monotone" dataKey="actual" name="Actual PnL" stroke="#94a3b8" strokeWidth={2} fill="url(#colorActual)" />
                                        <Area type="monotone" dataKey="simulated" name="Optimized PnL" stroke="#10B981" strokeWidth={2} strokeDasharray="5 5" fill="url(#colorSim)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    {/* Static Analytics Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        
                        {/* 1. Duration vs PnL (Scatter) */}
                        <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-lg">
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center">
                                <Hourglass size={14} className="mr-2 text-indigo-400"/> Patience Analysis (Duration vs PnL)
                            </h3>
                            <div className="h-[250px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                        <XAxis type="number" dataKey="duration" name="Duration" unit="m" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                                        <YAxis type="number" dataKey="pnl" name="PnL" unit="₹" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                                        <ZAxis type="number" dataKey="size" range={[50, 400]} />
                                        <Tooltip content={<ScatterTooltip />} cursor={{ strokeDasharray: '3 3' }} />
                                        <ReferenceLine y={0} stroke="#475569" />
                                        <Scatter name="Trades" data={scatterData}>
                                            {scatterData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.pnl >= 0 ? '#10B981' : '#EF4444'} fillOpacity={0.6} />
                                            ))}
                                        </Scatter>
                                    </ScatterChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="mt-4 flex justify-between text-[10px] text-slate-500 font-mono">
                                <span>Short Hold &rarr;</span>
                                <span>&larr; Long Hold</span>
                            </div>
                        </div>

                        {/* 2. Setup Performance (Bar) */}
                        <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-lg">
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center">
                                <Target size={14} className="mr-2 text-purple-400"/> Setup PnL Distribution
                            </h3>
                            <div className="h-[250px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={setupData} layout="vertical" margin={{ left: 20 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                                        <XAxis type="number" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                                        <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} width={80} />
                                        <Tooltip content={<LabTooltip />} cursor={{fill: '#334155', opacity: 0.2}} />
                                        <Bar dataKey="pnl" radius={[0, 4, 4, 0]} barSize={20}>
                                            {setupData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.pnl >= 0 ? '#8B5CF6' : '#F43F5E'} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                // ================= ARCHIVES VIEW =================
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 animate-fade-in h-[calc(100vh-250px)]">
                    
                    {/* Left: Reports Sidebar */}
                    <div className="lg:col-span-1 bg-slate-800 rounded-2xl border border-slate-700 flex flex-col overflow-hidden h-full">
                        <div className="p-4 border-b border-slate-700 bg-slate-800/50">
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center">
                                <FileText size={14} className="mr-2 text-indigo-400"/> Strategic Reports
                            </h3>
                        </div>
                        <div className="flex-1 overflow-y-auto p-2 custom-scrollbar space-y-2">
                            {Object.keys(periodReports).length === 0 ? (
                                <div className="text-center p-6 text-slate-500 text-xs italic">
                                    No reports saved.<br/>Generate them in Journal view.
                                </div>
                            ) : (
                                Object.entries(periodReports).map(([key, report]) => {
                                    // Parse key for display
                                    const parts = key.split('_');
                                    const title = parts[0] === 'week' ? `Weekly: ${parts[1]}` : `Monthly: ${parts[1]}/${parts[2]}`;
                                    
                                    return (
                                        <button 
                                            key={key} 
                                            onClick={() => setSelectedReport({ title, content: report as string })}
                                            className="w-full text-left p-3 rounded-lg bg-slate-900 border border-slate-800 hover:border-indigo-500/50 hover:bg-slate-700 transition group"
                                        >
                                            <div className="flex justify-between items-center mb-1">
                                                <span className="text-[10px] font-bold uppercase text-indigo-300 bg-indigo-900/20 px-1.5 py-0.5 rounded">{parts[0]}</span>
                                                <ChevronRight size={14} className="text-slate-600 group-hover:text-white"/>
                                            </div>
                                            <p className="text-xs font-medium text-slate-300">{parts[0] === 'week' ? parts[1] : `${new Date(parseInt(parts[1]), parseInt(parts[2]), 1).toLocaleString('default', { month: 'long', year: 'numeric' })}`}</p>
                                        </button>
                                    )
                                })
                            )}
                        </div>
                    </div>

                    {/* Right: Tactical Log Table */}
                    <div className="lg:col-span-3 bg-slate-800 rounded-2xl border border-slate-700 flex flex-col overflow-hidden h-full relative">
                        {/* Search Header */}
                        <div className="p-4 border-b border-slate-700 bg-slate-800/50 flex flex-wrap gap-4 items-center justify-between">
                            <div className="flex items-center gap-2">
                                <LayoutList size={16} className="text-emerald-400"/>
                                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Mission Logs & Neural Feedback</h3>
                            </div>
                            <div className="relative">
                                <Search size={14} className="absolute left-3 top-2.5 text-slate-500"/>
                                <input 
                                    type="text" 
                                    placeholder="Search instrument, setup, or notes..." 
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="bg-slate-900 border border-slate-700 rounded-full pl-9 pr-4 py-2 text-xs text-white focus:border-indigo-500 outline-none w-64"
                                />
                            </div>
                        </div>

                        {/* Modal for Reports */}
                        {selectedReport && (
                            <div className="absolute inset-0 z-20 bg-slate-900/95 backdrop-blur-sm p-4 flex items-center justify-center animate-fade-in">
                                <div className="bg-slate-800 border border-indigo-500/30 rounded-2xl w-full max-w-2xl h-[90%] flex flex-col shadow-2xl relative">
                                    <button onClick={() => setSelectedReport(null)} className="absolute top-4 right-4 p-2 bg-slate-700 hover:bg-slate-600 rounded-full text-white z-30">
                                        <Grip size={20}/>
                                    </button>
                                    <div className="p-6 border-b border-slate-700 bg-indigo-900/10">
                                        <h3 className="text-lg font-black text-white uppercase tracking-wide flex items-center gap-2">
                                            <Bot size={20} className="text-indigo-400"/> {selectedReport.title}
                                        </h3>
                                    </div>
                                    <div className="flex-1 overflow-y-auto p-6 text-sm text-slate-300 leading-relaxed whitespace-pre-wrap font-medium custom-scrollbar">
                                        {selectedReport.content}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Table */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-950/30">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-slate-900 sticky top-0 z-10 text-[10px] text-slate-500 uppercase font-bold tracking-wider">
                                    <tr>
                                        <th className="p-4 border-b border-slate-700 w-[150px]">Date / Instrument</th>
                                        <th className="p-4 border-b border-slate-700 w-[40%]">Mission Timeline (Logs)</th>
                                        <th className="p-4 border-b border-slate-700">AI Neural Audit</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-700/50">
                                    {filteredArchiveTrades.length === 0 ? (
                                        <tr><td colSpan={3} className="p-8 text-center text-slate-500 text-sm">No missions found.</td></tr>
                                    ) : (
                                        filteredArchiveTrades.map(trade => (
                                            <tr key={trade.id} className="hover:bg-slate-800/50 transition group">
                                                <td className="p-4 align-top">
                                                    <div className="text-xs font-bold text-white mb-1 font-mono">{trade.date}</div>
                                                    <div className="text-sm font-black text-indigo-300 mb-1">{trade.instrument}</div>
                                                    <div className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${trade.pnl && trade.pnl > 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                                                        {trade.pnl && trade.pnl > 0 ? '+' : ''}₹{trade.pnl}
                                                    </div>
                                                    <div className="text-[10px] text-slate-500 mt-2">{trade.setupName}</div>
                                                </td>
                                                <td className="p-4 align-top border-l border-slate-700/50 border-r">
                                                    <div className="space-y-3">
                                                        {/* Initial Entry */}
                                                        <div className="flex gap-2">
                                                            <div className="w-1 bg-slate-600 rounded-full"></div>
                                                            <div>
                                                                <span className="text-[9px] text-slate-500 font-mono block">{trade.entryTime}</span>
                                                                <p className="text-xs text-slate-300">{trade.entryReason}</p>
                                                            </div>
                                                        </div>
                                                        
                                                        {/* Notes Loop */}
                                                        {trade.notes && trade.notes.map(note => (
                                                            <div key={note.id} className="flex gap-2">
                                                                <div className={`w-1 rounded-full ${note.type === 'emotion' ? 'bg-purple-500' : note.type === 'market' ? 'bg-amber-500' : 'bg-blue-500'}`}></div>
                                                                <div>
                                                                    <span className="text-[9px] text-slate-500 font-mono block">{note.timestamp.slice(0,5)}</span>
                                                                    <p className={`text-xs ${note.type === 'emotion' ? 'text-purple-300' : note.type === 'market' ? 'text-amber-300' : 'text-slate-300'}`}>
                                                                        {note.content}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        ))}

                                                        {/* Exit */}
                                                        {trade.exitReason && (
                                                            <div className="flex gap-2 opacity-70">
                                                                <div className="w-1 bg-slate-600 rounded-full"></div>
                                                                <div>
                                                                    <span className="text-[9px] text-slate-500 font-mono block">{trade.exitTime}</span>
                                                                    <p className="text-xs text-slate-400">Exit: {trade.exitReason}</p>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="p-4 align-top">
                                                    {renderAiCell(trade.aiFeedback)}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EdgeLab;
