import React, { useState, useMemo } from 'react';
import { 
    X, BrainCircuit, ShieldCheck, HeartPulse, Target, 
    ArrowLeft, Calendar, TrendingUp, AlertTriangle, 
    Wallet, Scale, Calculator, ChevronUp, ChevronDown, 
    ArrowUpRight, Percent, Info, Sparkles, Ban, Repeat, 
    Flame, Skull, CheckCircle2, User, Zap, Lock
} from 'lucide-react';
import { 
    ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid, 
    Tooltip, ResponsiveContainer, Legend, Bar, BarChart, Cell, ReferenceLine
} from 'recharts';
import { Trade, TradeOutcome } from '../types';

interface PsychologyProfileProps {
    trades: Trade[];
    onBack: () => void;
    onViewTrade?: (tradeId: string) => void;
}

// Custom Tooltip for Charts
const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-slate-900/95 border border-slate-700 p-4 rounded-xl shadow-2xl backdrop-blur-md z-50">
                <p className="text-slate-400 text-xs font-bold mb-2 uppercase tracking-wider">{label}</p>
                {payload.map((p: any, index: number) => (
                    <div key={index} className="flex items-center gap-2 mb-1">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }}></div>
                        <span className="text-xs font-medium text-slate-300 min-w-[120px]">{p.name}</span>
                        <span className="text-sm font-bold font-mono text-white">
                            {typeof p.value === 'number' && p.value % 1 !== 0 ? p.value.toFixed(1) : p.value}
                            {p.unit}
                        </span>
                    </div>
                ))}
            </div>
        );
    }
    return null;
};

const PsychologyProfile: React.FC<PsychologyProfileProps> = ({ trades, onBack, onViewTrade }) => {
    const [activeTab, setActiveTab] = useState<'mirror' | 'leak_plugger' | 'zone'>('mirror');

    // --- Core Data Processing ---
    const data = useMemo(() => {
        const closedTrades = trades.filter(t => t.outcome !== TradeOutcome.OPEN);
        if (closedTrades.length === 0) return null;

        // 1. Identity & Discipline
        const totalDisciplinePoints = closedTrades.reduce((acc, t) => acc + (t.disciplineRating || 0), 0);
        const avgDiscipline = totalDisciplinePoints / closedTrades.length;
        const disciplineIndex = Math.round(avgDiscipline * 20); // 0-100
        const winRate = (closedTrades.filter(t => t.outcome === TradeOutcome.WIN).length / closedTrades.length) * 100;

        // Identity Classification
        let identity = "The Rookie";
        let identityDesc = "Learning the ropes. Focus on process over profit.";
        if (disciplineIndex > 85 && winRate > 60) { identity = "The Sniper"; identityDesc = "High precision, high discipline. You wait for the kill shot."; }
        else if (disciplineIndex > 85 && winRate < 40) { identity = "The Perfectionist"; identityDesc = "Great discipline, but maybe too hesitant or strategy needs tuning."; }
        else if (disciplineIndex < 50 && winRate > 60) { identity = "The Gunslinger"; identityDesc = "Making money but reckless. Luck will run out."; }
        else if (disciplineIndex < 50 && winRate < 40) { identity = "The Gambler"; identityDesc = "No edge, no rules. Stop trading and study."; }
        else if (disciplineIndex > 60) { identity = "The Grinder"; identityDesc = "Building consistency. Keep refining your edge."; }

        // 2. The Cost of Stupid (Mistakes PnL)
        const mistakeCostMap: Record<string, number> = {};
        closedTrades.forEach(t => {
            if (t.mistakes && t.mistakes.length > 0 && t.pnl && t.pnl < 0) {
                // Attribute full loss to the mistake(s)
                const share = t.pnl / t.mistakes.length; 
                t.mistakes.forEach(m => {
                    mistakeCostMap[m] = (mistakeCostMap[m] || 0) + share;
                });
            }
        });
        const costOfStupid = Object.entries(mistakeCostMap)
            .map(([name, value]) => ({ name, value: Math.abs(value) }))
            .sort((a,b) => b.value - a.value)
            .slice(0, 5);

        // 3. Emotional PnL
        const emotionMap: Record<string, number> = {};
        closedTrades.forEach(t => {
            if(t.emotionalState && t.pnl) {
                const e = t.emotionalState;
                emotionMap[e] = (emotionMap[e] || 0) + t.pnl;
            }
        });
        const emotionalPnL = Object.entries(emotionMap)
            .map(([name, value]) => ({ name, value }))
            .sort((a,b) => b.value - a.value);

        // 4. Equity vs Discipline Correlation
        // Create a running equity curve and overlay discipline score
        let equity = 0;
        const correlationData = [...closedTrades]
            .sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime())
            .map(t => {
                equity += (t.pnl || 0);
                return {
                    date: t.date,
                    equity,
                    discipline: (t.disciplineRating || 0) * 20, // scale to 100 for chart
                    pnl: t.pnl
                };
            });

        // 5. Stop / Start Lists
        const stopList = costOfStupid.map(m => m.name);
        
        const confluenceProfitMap: Record<string, number> = {};
        closedTrades.forEach(t => {
            if (t.confluences && t.pnl && t.pnl > 0) {
                t.confluences.forEach(c => {
                    confluenceProfitMap[c] = (confluenceProfitMap[c] || 0) + t.pnl!;
                });
            }
        });
        const startList = Object.entries(confluenceProfitMap)
            .sort((a,b) => b[1] - a[1])
            .slice(0, 5)
            .map(x => x[0]);

        return {
            disciplineIndex,
            winRate,
            identity,
            identityDesc,
            costOfStupid,
            emotionalPnL,
            correlationData,
            stopList,
            startList
        };
    }, [trades]);

    if (!data) return (
        <div className="flex flex-col items-center justify-center h-screen text-slate-500 animate-fade-in">
            <BrainCircuit size={48} className="mb-4 opacity-50"/>
            <p>Not enough data to profile your psychology.</p>
            <button onClick={onBack} className="mt-4 text-indigo-400 hover:text-white">Back to Dashboard</button>
        </div>
    );

    return (
        <div className="animate-fade-in pb-20 md:pb-12 bg-slate-950 min-h-screen">
            
            {/* Header / Nav */}
            <div className="sticky top-0 z-30 bg-slate-950/90 backdrop-blur-md border-b border-indigo-500/20 px-4 py-3 mb-6 flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-2 bg-slate-900 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition border border-slate-800">
                        <ArrowLeft size={20}/>
                    </button>
                    <div>
                        <h2 className="text-lg md:text-xl font-black text-white uppercase tracking-wider flex items-center gap-2">
                            <BrainCircuit className="text-indigo-500" size={24}/> Psycho-Cybernetics
                        </h2>
                        <p className="text-[10px] text-slate-500 font-mono tracking-widest">BEHAVIORAL AUDIT PROTOCOL</p>
                    </div>
                </div>
                <div className="flex bg-slate-900/80 p-1 rounded-lg border border-slate-800 w-full md:w-auto overflow-x-auto">
                    <button 
                        onClick={() => setActiveTab('mirror')} 
                        className={`flex-1 md:flex-none px-4 py-1.5 rounded-md text-xs font-bold transition flex items-center justify-center gap-2 whitespace-nowrap ${activeTab === 'mirror' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                    >
                        <User size={14}/> The Mirror
                    </button>
                    <button 
                        onClick={() => setActiveTab('leak_plugger')} 
                        className={`flex-1 md:flex-none px-4 py-1.5 rounded-md text-xs font-bold transition flex items-center justify-center gap-2 whitespace-nowrap ${activeTab === 'leak_plugger' ? 'bg-red-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                    >
                        <ShieldCheck size={14}/> Leak Plugger
                    </button>
                    <button 
                        onClick={() => setActiveTab('zone')} 
                        className={`flex-1 md:flex-none px-4 py-1.5 rounded-md text-xs font-bold transition flex items-center justify-center gap-2 whitespace-nowrap ${activeTab === 'zone' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                    >
                        <Zap size={14}/> The Zone
                    </button>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-4">
                
                {/* --- TAB 1: THE MIRROR (IDENTITY) --- */}
                {activeTab === 'mirror' && (
                    <div className="space-y-6 animate-fade-in-up">
                        
                        {/* Identity Card */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-gradient-to-br from-slate-900 to-indigo-950 rounded-2xl border border-indigo-500/30 p-8 relative overflow-hidden shadow-2xl">
                                <div className="absolute top-0 right-0 p-8 opacity-10"><Target size={120}/></div>
                                <div className="relative z-10">
                                    <p className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-2">Trader Identity Profile</p>
                                    <h1 className="text-4xl md:text-5xl font-black text-white mb-2 tracking-tight">{data.identity}</h1>
                                    <p className="text-slate-300 italic text-sm mb-6 border-l-2 border-indigo-500 pl-3">"{data.identityDesc}"</p>
                                    
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800">
                                            <span className="text-[10px] text-slate-500 font-bold uppercase">Discipline Score</span>
                                            <div className={`text-2xl font-black ${data.disciplineIndex >= 80 ? 'text-emerald-400' : 'text-amber-400'}`}>{data.disciplineIndex}/100</div>
                                        </div>
                                        <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800">
                                            <span className="text-[10px] text-slate-500 font-bold uppercase">Win Rate</span>
                                            <div className={`text-2xl font-black ${data.winRate >= 50 ? 'text-blue-400' : 'text-slate-300'}`}>{data.winRate.toFixed(1)}%</div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Correlation Chart: Equity vs Discipline */}
                            <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 shadow-xl flex flex-col">
                                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <Scale size={14} className="text-blue-400"/> Discipline vs. Equity Correlation
                                </h3>
                                <div className="flex-1 w-full min-h-[200px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <ComposedChart data={data.correlationData}>
                                            <defs>
                                                <linearGradient id="colorEq" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                                                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                            <XAxis dataKey="date" hide />
                                            <YAxis yAxisId="left" orientation="left" stroke="#475569" fontSize={10} tickFormatter={(val) => `₹${val}`} />
                                            <YAxis yAxisId="right" orientation="right" stroke="#475569" fontSize={10} domain={[0, 100]} />
                                            <Tooltip content={<CustomTooltip />} />
                                            
                                            <Area yAxisId="left" type="monotone" dataKey="equity" name="Equity" stroke="#3B82F6" fill="url(#colorEq)" strokeWidth={2} />
                                            <Line yAxisId="right" type="monotone" dataKey="discipline" name="Discipline Score" stroke="#10B981" dot={false} strokeWidth={2} />
                                        </ComposedChart>
                                    </ResponsiveContainer>
                                </div>
                                <p className="text-[10px] text-slate-500 text-center mt-2 italic">Proof that sticking to rules protects capital.</p>
                            </div>
                        </div>

                        {/* Stop / Start Protocol */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-slate-900 border border-red-900/30 rounded-2xl p-6 relative overflow-hidden">
                                <div className="flex items-center gap-2 mb-4 border-b border-red-900/30 pb-2">
                                    <Ban size={20} className="text-red-500"/>
                                    <h3 className="text-sm font-black text-red-100 uppercase tracking-widest">Protocol: STOP</h3>
                                </div>
                                <ul className="space-y-3">
                                    {data.stopList.length > 0 ? data.stopList.map((item, idx) => (
                                        <li key={idx} className="flex items-center gap-3 text-sm text-slate-300">
                                            <span className="w-5 h-5 rounded bg-red-900/40 text-red-400 flex items-center justify-center text-[10px] font-bold border border-red-500/20">{idx+1}</span>
                                            {item}
                                        </li>
                                    )) : <li className="text-slate-500 text-xs italic">No major leaks detected.</li>}
                                </ul>
                            </div>

                            <div className="bg-slate-900 border border-emerald-900/30 rounded-2xl p-6 relative overflow-hidden">
                                <div className="flex items-center gap-2 mb-4 border-b border-emerald-900/30 pb-2">
                                    <Repeat size={20} className="text-emerald-500"/>
                                    <h3 className="text-sm font-black text-emerald-100 uppercase tracking-widest">Protocol: REPEAT</h3>
                                </div>
                                <ul className="space-y-3">
                                    {data.startList.length > 0 ? data.startList.map((item, idx) => (
                                        <li key={idx} className="flex items-center gap-3 text-sm text-slate-300">
                                            <span className="w-5 h-5 rounded bg-emerald-900/40 text-emerald-400 flex items-center justify-center text-[10px] font-bold border border-emerald-500/20">{idx+1}</span>
                                            {item}
                                        </li>
                                    )) : <li className="text-slate-500 text-xs italic">Identify your winning setups to populate this.</li>}
                                </ul>
                            </div>
                        </div>
                    </div>
                )}

                {/* --- TAB 2: LEAK PLUGGER (FINANCIAL IMPACT) --- */}
                {activeTab === 'leak_plugger' && (
                    <div className="space-y-6 animate-fade-in-up">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            
                            {/* Cost of Stupid */}
                            <div className="bg-slate-900 rounded-2xl border border-red-500/30 p-6 shadow-xl">
                                <h3 className="text-sm font-black text-red-400 uppercase tracking-widest mb-6 flex items-center">
                                    <Skull size={18} className="mr-2"/> The Cost of Stupid
                                </h3>
                                <div className="h-[300px] w-full">
                                    {data.costOfStupid.length > 0 ? (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={data.costOfStupid} layout="vertical" margin={{ left: 0 }}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                                                <XAxis type="number" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(val) => `₹${val}`} />
                                                <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} width={100} />
                                                <Tooltip content={<CustomTooltip />} cursor={{fill: '#334155', opacity: 0.2}} />
                                                <Bar dataKey="value" name="Loss Amount" radius={[0, 4, 4, 0]} barSize={24}>
                                                    {data.costOfStupid.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill="#EF4444" fillOpacity={0.8} />
                                                    ))}
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <div className="h-full flex items-center justify-center text-slate-500 italic text-xs">No mistakes logged in losses.</div>
                                    )}
                                </div>
                                <p className="text-[10px] text-slate-500 mt-4 text-center">These are direct PnL losses attributed to specific error tags.</p>
                            </div>

                            {/* Emotional PnL */}
                            <div className="bg-slate-900 rounded-2xl border border-purple-500/30 p-6 shadow-xl">
                                <h3 className="text-sm font-black text-purple-400 uppercase tracking-widest mb-6 flex items-center">
                                    <HeartPulse size={18} className="mr-2"/> PnL by Emotional State
                                </h3>
                                <div className="h-[300px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={data.emotionalPnL}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                                            <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                                            <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                                            <Tooltip content={<CustomTooltip />} cursor={{fill: '#334155', opacity: 0.2}} />
                                            <ReferenceLine y={0} stroke="#475569" />
                                            <Bar dataKey="value" name="PnL" radius={[4, 4, 0, 0]} barSize={40}>
                                                {data.emotionalPnL.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.value >= 0 ? '#10B981' : '#EF4444'} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                                <p className="text-[10px] text-slate-500 mt-4 text-center">Identify which emotions (Calm vs FOMO) drive your PnL.</p>
                            </div>

                        </div>
                    </div>
                )}

                {/* --- TAB 3: THE ZONE (Optimization) --- */}
                {activeTab === 'zone' && (
                    <div className="flex flex-col items-center justify-center h-64 text-center animate-fade-in-up">
                        <Lock size={48} className="text-slate-700 mb-4"/>
                        <h3 className="text-xl font-bold text-slate-500">Zone Analytics Locked</h3>
                        <p className="text-sm text-slate-600 mt-2">Log at least 20 trades to unlock "Optimal Time of Day" and "Setup Performance".</p>
                    </div>
                )}

            </div>
        </div>
    );
};

export default PsychologyProfile;