
import React, { useState, useMemo } from 'react';
import { 
    X, BrainCircuit, ShieldCheck, HeartPulse, Target, 
    ArrowLeft, Calendar, TrendingUp, AlertTriangle, 
    Wallet, Scale, Calculator, ChevronUp, ChevronDown, 
    ArrowUpRight, Percent, Info, Sparkles 
} from 'lucide-react';
import { 
    ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid, 
    Tooltip, ResponsiveContainer, Legend, Bar 
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
            <div className="bg-slate-900/95 border border-slate-700 p-4 rounded-xl shadow-2xl backdrop-blur-md">
                <p className="text-slate-400 text-xs font-bold mb-2 uppercase tracking-wider">{label}</p>
                {payload.map((p: any, index: number) => (
                    <div key={index} className="flex items-center gap-2 mb-1">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }}></div>
                        <span className="text-xs font-medium text-slate-300 min-w-[120px]">{p.name}</span>
                        <span className="text-sm font-bold font-mono text-white">{p.value}%</span>
                    </div>
                ))}
            </div>
        );
    }
    return null;
};

const PsychologyProfile: React.FC<PsychologyProfileProps> = ({ trades, onBack, onViewTrade }) => {
    const [activeTab, setActiveTab] = useState<'deep_dive' | 'trends'>('deep_dive');
    const [showFormulas, setShowFormulas] = useState(false);

    // --- Core Metrics Calculation (Reused from Dashboard logic) ---
    const psychoStats = useMemo(() => {
        const closedTrades = trades.filter(t => t.outcome !== TradeOutcome.OPEN);
        if (closedTrades.length === 0) return null;

        // 1. Discipline Index
        const totalDisciplinePoints = closedTrades.reduce((acc, t) => acc + (t.disciplineRating || 0), 0);
        const avgDiscipline = totalDisciplinePoints / closedTrades.length;
        const disciplineIndex = Math.round(avgDiscipline * 20);

        // 2. System Adherence
        const followedCount = closedTrades.filter(t => t.followedSystem).length;
        const systemAdherence = Math.round((followedCount / closedTrades.length) * 100);

        // 3. Emotional Stability
        const stableCount = closedTrades.filter(t => ['Neutral', 'Focused', 'Calm'].includes(t.emotionalState || '')).length;
        const emotionalStability = Math.round((stableCount / closedTrades.length) * 100);

        // 4. Streak
        let streak = 0;
        const sortedTrades = [...closedTrades].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        for (const t of sortedTrades) {
            if (t.followedSystem) streak++; else break;
        }

        // 5. Recent Offenses
        const recentOffenses = sortedTrades
            .filter(t => (t.disciplineRating && t.disciplineRating <= 3) || !t.followedSystem)
            .slice(0, 5);

        // 6. Cost of Indiscipline
        const costOfIndiscipline = closedTrades
            .filter(t => t.disciplineRating && t.disciplineRating <= 3)
            .reduce((acc, t) => acc + (t.pnl || 0), 0);

        // 7. Win Rate Variance
        const highDiscTrades = closedTrades.filter(t => (t.disciplineRating || 0) >= 4);
        const lowDiscTrades = closedTrades.filter(t => (t.disciplineRating || 0) <= 3);
        const highWR = highDiscTrades.length > 0 ? (highDiscTrades.filter(t => t.outcome === TradeOutcome.WIN).length / highDiscTrades.length) * 100 : 0;
        const lowWR = lowDiscTrades.length > 0 ? (lowDiscTrades.filter(t => t.outcome === TradeOutcome.WIN).length / lowDiscTrades.length) * 100 : 0;
        const winRateVariance = highWR - lowWR;

        // Label
        let statusLabel = "Rookie";
        if (disciplineIndex >= 95) statusLabel = "Zen Master";
        else if (disciplineIndex >= 85) statusLabel = "Sniper";
        else if (disciplineIndex >= 70) statusLabel = "Disciplined";
        else if (disciplineIndex >= 50) statusLabel = "Drifting";
        else if (disciplineIndex > 0) statusLabel = "Tilted";

        return { disciplineIndex, systemAdherence, streak, emotionalStability, statusLabel, recentOffenses, costOfIndiscipline, winRateVariance };
    }, [trades]);

    // --- Weekly Trends Calculation ---
    const weeklyData = useMemo(() => {
        const closedTrades = trades.filter(t => t.outcome !== TradeOutcome.OPEN);
        if (closedTrades.length === 0) return [];

        // Group by Week Start (Monday)
        const groups: Record<string, Trade[]> = {};
        
        closedTrades.forEach(t => {
            const date = new Date(t.date);
            const day = date.getDay();
            const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is sunday
            const monday = new Date(date.setDate(diff));
            const key = monday.toISOString().split('T')[0]; // YYYY-MM-DD
            if (!groups[key]) groups[key] = [];
            groups[key].push(t);
        });

        // Calculate stats per week
        const result = Object.entries(groups).map(([weekStart, weekTrades]) => {
            // Avg Discipline
            const totalDisc = weekTrades.reduce((acc, t) => acc + (t.disciplineRating || 0), 0);
            const avgDisc = (totalDisc / weekTrades.length) * 20;

            // System Adherence
            const adhered = weekTrades.filter(t => t.followedSystem).length;
            const adhPct = (adhered / weekTrades.length) * 100;

            // Stability
            const stable = weekTrades.filter(t => ['Neutral', 'Focused', 'Calm'].includes(t.emotionalState || '')).length;
            const stabPct = (stable / weekTrades.length) * 100;

            return {
                week: new Date(weekStart).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
                fullDate: weekStart,
                disciplineIndex: Math.round(avgDisc),
                systemAdherence: Math.round(adhPct),
                mentalStability: Math.round(stabPct),
                tradeCount: weekTrades.length
            };
        });

        // Sort by date ascending
        return result.sort((a, b) => new Date(a.fullDate).getTime() - new Date(b.fullDate).getTime());
    }, [trades]);

    const getMotivationalMessage = () => {
        if (!psychoStats) return "Log more trades.";
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

    if (!psychoStats) return (
        <div className="flex flex-col items-center justify-center h-screen text-slate-500 animate-fade-in">
            <BrainCircuit size={48} className="mb-4 opacity-50"/>
            <p>Not enough data to profile your psychology.</p>
            <button onClick={onBack} className="mt-4 text-indigo-400 hover:text-white">Back to Dashboard</button>
        </div>
    );

    return (
        <div className="animate-fade-in pb-12">
            
            {/* Header / Nav */}
            <div className="sticky top-0 z-30 bg-slate-950/80 backdrop-blur-md border-b border-indigo-500/20 px-4 py-3 mb-6 flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-2 bg-slate-800 rounded-full text-slate-400 hover:text-white hover:bg-slate-700 transition">
                        <ArrowLeft size={20}/>
                    </button>
                    <div>
                        <h2 className="text-xl font-black text-white uppercase tracking-wider flex items-center gap-2">
                            <BrainCircuit className="text-indigo-500" size={24}/> Psycho-Cybernetics
                        </h2>
                        <p className="text-[10px] text-slate-500 font-mono hidden md:block">BEHAVIORAL PERFORMANCE AUDIT</p>
                    </div>
                </div>
                <div className="flex bg-slate-900/80 p-1 rounded-lg border border-slate-700">
                    <button 
                        onClick={() => setActiveTab('deep_dive')} 
                        className={`px-4 py-1.5 rounded-md text-xs font-bold transition flex items-center gap-2 ${activeTab === 'deep_dive' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                    >
                        <ShieldCheck size={14}/> Deep Dive
                    </button>
                    <button 
                        onClick={() => setActiveTab('trends')} 
                        className={`px-4 py-1.5 rounded-md text-xs font-bold transition flex items-center gap-2 ${activeTab === 'trends' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                    >
                        <TrendingUp size={14}/> Weekly Trends
                    </button>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-4">
                
                {/* --- TAB: DEEP DIVE --- */}
                {activeTab === 'deep_dive' && (
                    <div className="space-y-6 animate-fade-in-up">
                        
                        {/* 1. Main Score Card */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <div className="lg:col-span-1 bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl border border-indigo-500/30 p-8 flex flex-col items-center justify-center text-center shadow-2xl relative overflow-hidden">
                                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/20 via-slate-900/0 to-slate-900/0"></div>
                                <div className="relative z-10">
                                    <div className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-4">Discipline Index</div>
                                    <div className="text-7xl font-black text-white mb-2 tracking-tighter drop-shadow-lg">{psychoStats.disciplineIndex}</div>
                                    <div className="inline-block px-4 py-1 bg-slate-950 rounded-full border border-slate-700 text-sm font-bold text-slate-300 uppercase shadow-inner">
                                        {psychoStats.statusLabel}
                                    </div>
                                </div>
                            </div>

                            <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {/* Cost of Indiscipline */}
                                <div className="bg-slate-900 p-6 rounded-2xl border border-red-500/20 hover:border-red-500/40 transition-colors shadow-lg group">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="p-3 bg-red-500/10 rounded-xl text-red-500 group-hover:scale-110 transition-transform"><Wallet size={24}/></div>
                                        <ArrowUpRight size={16} className="text-slate-600"/>
                                    </div>
                                    <h4 className="text-xs font-bold text-red-400 uppercase tracking-widest mb-1">Cost of Indiscipline</h4>
                                    <div className="text-3xl font-black text-white font-mono">₹{Math.abs(psychoStats.costOfIndiscipline).toFixed(0)}</div>
                                    <p className="text-[10px] text-slate-500 mt-2">Losses from low-grade trades (Grade &le; C).</p>
                                </div>

                                {/* The Tilt Gap */}
                                <div className="bg-slate-900 p-6 rounded-2xl border border-indigo-500/20 hover:border-indigo-500/40 transition-colors shadow-lg group">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="p-3 bg-indigo-500/10 rounded-xl text-indigo-500 group-hover:scale-110 transition-transform"><Scale size={24}/></div>
                                        <ArrowUpRight size={16} className="text-slate-600"/>
                                    </div>
                                    <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-1">The Tilt Gap</h4>
                                    <div className="text-3xl font-black text-white font-mono">+{psychoStats.winRateVariance.toFixed(1)}%</div>
                                    <p className="text-[10px] text-slate-500 mt-2">Win Rate boost when Discipline Grade is A/B.</p>
                                </div>

                                 {/* Consistency */}
                                 <div className="bg-slate-900 p-6 rounded-2xl border border-emerald-500/20 hover:border-emerald-500/40 transition-colors shadow-lg group">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-500 group-hover:scale-110 transition-transform"><Target size={24}/></div>
                                        <ArrowUpRight size={16} className="text-slate-600"/>
                                    </div>
                                    <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-1">System Adherence</h4>
                                    <div className="text-3xl font-black text-white font-mono">{psychoStats.systemAdherence}%</div>
                                    <p className="text-[10px] text-slate-500 mt-2">Trades perfectly following your rules.</p>
                                </div>

                                {/* Mental Stability */}
                                <div className="bg-slate-900 p-6 rounded-2xl border border-purple-500/20 hover:border-purple-500/40 transition-colors shadow-lg group">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="p-3 bg-purple-500/10 rounded-xl text-purple-500 group-hover:scale-110 transition-transform"><HeartPulse size={24}/></div>
                                        <ArrowUpRight size={16} className="text-slate-600"/>
                                    </div>
                                    <h4 className="text-xs font-bold text-purple-400 uppercase tracking-widest mb-1">Mental Stability</h4>
                                    <div className="text-3xl font-black text-white font-mono">{psychoStats.emotionalStability}%</div>
                                    <p className="text-[10px] text-slate-500 mt-2">Trades executed in a neutral/calm state.</p>
                                </div>
                            </div>
                        </div>

                        {/* Coach Diagnosis */}
                        <div className="bg-indigo-900/10 border border-indigo-500/30 p-6 rounded-2xl flex items-start gap-5 shadow-lg relative overflow-hidden">
                            <div className="absolute -right-10 -top-10 text-indigo-500/10"><Sparkles size={150}/></div>
                            <div className="bg-indigo-500/20 p-3 rounded-full text-indigo-400 shrink-0 relative z-10"><Sparkles size={24}/></div>
                            <div className="relative z-10">
                                <h5 className="text-indigo-300 font-bold text-sm uppercase mb-2 tracking-wide">Coach's Diagnosis</h5>
                                <p className="text-lg text-slate-200 italic font-medium leading-relaxed font-serif">"{getMotivationalMessage()}"</p>
                            </div>
                        </div>

                        {/* Recent Leaks Table */}
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
                                                // Helper to get grade safely
                                                const getGrade = (json?: string) => {
                                                    try { return JSON.parse(json || '{}').grade } catch(e) { return null }
                                                };
                                                const grade = getGrade(t.aiFeedback);
                                                return (
                                                    <tr key={t.id} onClick={() => onViewTrade?.(t.id)} className="hover:bg-slate-800/50 cursor-pointer transition group">
                                                        <td className="p-4 text-white font-mono">{t.date}</td>
                                                        <td className="p-4">
                                                            <span className="bg-red-500/10 text-red-400 px-2 py-1 rounded border border-red-500/20 text-xs font-bold uppercase">Discipline Leak</span>
                                                        </td>
                                                        <td className="p-4 text-right">
                                                            {grade !== null && grade !== undefined ? (
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

                        {/* Formulas Toggle */}
                        <div className="border border-slate-800 rounded-xl overflow-hidden mt-8">
                            <button onClick={() => setShowFormulas(!showFormulas)} className="w-full flex items-center justify-between p-4 bg-slate-900 hover:bg-slate-800 transition text-left">
                                <div className="flex items-center gap-2"><Calculator size={16} className="text-slate-400"/><span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Show Calculation Methodology</span></div>
                                {showFormulas ? <ChevronUp size={16} className="text-slate-500"/> : <ChevronDown size={16} className="text-slate-500"/>}
                            </button>
                            {showFormulas && (
                                <div className="p-6 bg-slate-950 border-t border-slate-800 text-xs text-slate-400 font-mono space-y-2">
                                    <p>Discipline Index = Average of (AI Execution Score scaled to 100)</p>
                                    <p>System Adherence = % of trades where you checked 'Followed System'</p>
                                    <p>Cost of Indiscipline = Sum(PnL) where AI Score &lt; 60%</p>
                                    <p>Tilt Gap = WinRate(Score &ge; 80%) - WinRate(Score &lt; 60%)</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* --- TAB: WEEKLY TRENDS --- */}
                {activeTab === 'trends' && (
                    <div className="space-y-6 animate-fade-in-up">
                        <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl h-[400px]">
                            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-6 flex items-center">
                                <TrendingUp size={16} className="mr-2 text-indigo-400"/> Performance Trajectory
                            </h3>
                            <div className="w-full h-full pb-8">
                                <ResponsiveContainer width="100%" height="100%">
                                    <ComposedChart data={weeklyData}>
                                        <defs>
                                            <linearGradient id="colorDisc" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                                                <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                                            </linearGradient>
                                            <linearGradient id="colorSys" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#6366F1" stopOpacity={0.3}/>
                                                <stop offset="95%" stopColor="#6366F1" stopOpacity={0}/>
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                        <XAxis dataKey="week" stroke="#64748b" fontSize={10} tickMargin={10} axisLine={false} tickLine={false} />
                                        <YAxis stroke="#64748b" fontSize={10} axisLine={false} tickLine={false} domain={[0, 100]} />
                                        <Tooltip content={<CustomTooltip />} />
                                        <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '12px' }}/>
                                        
                                        <Area type="monotone" dataKey="disciplineIndex" name="Discipline Index" stroke="#10B981" strokeWidth={3} fillOpacity={1} fill="url(#colorDisc)" />
                                        <Line type="monotone" dataKey="systemAdherence" name="System Adherence" stroke="#6366F1" strokeWidth={2} dot={{r: 4, strokeWidth: 0, fill: '#6366F1'}} />
                                        <Line type="monotone" dataKey="mentalStability" name="Mental Stability" stroke="#A855F7" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                                    </ComposedChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Trend Summary Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {weeklyData.slice(-3).reverse().map((week, idx) => (
                                <div key={idx} className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 flex justify-between items-center">
                                    <div>
                                        <p className="text-[10px] text-slate-500 font-bold uppercase">{week.week}</p>
                                        <p className="text-white font-bold text-sm mt-1">{week.tradeCount} Trades</p>
                                    </div>
                                    <div className="text-right">
                                        <div className={`text-lg font-black ${week.disciplineIndex >= 80 ? 'text-emerald-400' : week.disciplineIndex >= 60 ? 'text-amber-400' : 'text-red-400'}`}>
                                            {week.disciplineIndex}
                                        </div>
                                        <p className="text-[10px] text-slate-600 font-mono">DISC SCORE</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
};

export default PsychologyProfile;
