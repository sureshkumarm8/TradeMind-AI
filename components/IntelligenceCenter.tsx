
import React, { useState, useMemo, useEffect } from 'react';
import { BrainCircuit, Zap, ShieldAlert, HeartPulse, Target, History, Search, Loader2, Sparkles, TrendingUp, ArrowRight, Activity, MessageSquare, AlertCircle, TrendingDown } from 'lucide-react';
import { Trade, TradeOutcome, StrategyProfile } from '../types';
import { getNeuralBriefing, findHistoricalMatch } from '../services/geminiService';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine, CartesianGrid } from 'recharts';

interface IntelligenceCenterProps {
    trades: Trade[];
    strategyProfile: StrategyProfile;
    apiKey: string;
    onViewTrade: (id: string) => void;
}

const IntelligenceCenter: React.FC<IntelligenceCenterProps> = ({ trades, strategyProfile, apiKey, onViewTrade }) => {
    const [activeTab, setActiveTab] = useState<'briefing' | 'behavior' | 'patterns'>('briefing');
    
    // Briefing State
    const [briefing, setBriefing] = useState<string | null>(null);
    const [isGeneratingBrief, setIsGeneratingBrief] = useState(false);

    // Pattern State
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [matchResult, setMatchResult] = useState<{match: Trade | null, insight: string} | null>(null);

    const closedTrades = useMemo(() => trades.filter(t => t.outcome !== TradeOutcome.OPEN), [trades]);

    // Emotional Stats
    const emotionalData = useMemo(() => {
        const stats: Record<string, { wins: number, total: number, pnl: number }> = {};
        closedTrades.forEach(t => {
            const e = t.emotionalState || 'Neutral';
            if (!stats[e]) stats[e] = { wins: 0, total: 0, pnl: 0 };
            stats[e].total++;
            stats[e].pnl += (t.pnl || 0);
            if (t.outcome === TradeOutcome.WIN) stats[e].wins++;
        });
        return Object.entries(stats).map(([name, s]) => ({
            name,
            winRate: Math.round((s.wins / s.total) * 100),
            pnl: s.pnl,
            count: s.total
        })).sort((a,b) => b.winRate - a.winRate);
    }, [closedTrades]);

    const handleGenerateBrief = async () => {
        if (!apiKey) return;
        setIsGeneratingBrief(true);
        const recent = [...closedTrades].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 10);
        const result = await getNeuralBriefing(recent, strategyProfile, apiKey);
        setBriefing(result);
        setIsGeneratingBrief(false);
    };

    const handleSearch = async () => {
        if (!searchQuery.trim() || !apiKey) return;
        setIsSearching(true);
        const result = await findHistoricalMatch(searchQuery, closedTrades, apiKey);
        setMatchResult(result);
        setIsSearching(false);
    };

    return (
        <div className="max-w-6xl mx-auto space-y-6 pb-20 animate-fade-in">
            {/* Tabs */}
            <div className="flex bg-slate-900 p-1.5 rounded-2xl border border-slate-800 w-full md:w-auto self-start shadow-xl">
                <button onClick={() => setActiveTab('briefing')} className={`flex-1 md:flex-none px-6 py-2.5 rounded-xl transition-all text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 ${activeTab === 'briefing' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}>
                    <Zap size={14} /> Morning Brief
                </button>
                <button onClick={() => setActiveTab('behavior')} className={`flex-1 md:flex-none px-6 py-2.5 rounded-xl transition-all text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 ${activeTab === 'behavior' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}>
                    <HeartPulse size={14} /> Behavioral Edge
                </button>
                <button onClick={() => setActiveTab('patterns')} className={`flex-1 md:flex-none px-6 py-2.5 rounded-xl transition-all text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 ${activeTab === 'patterns' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}>
                    <Search size={14} /> Pattern Matcher
                </button>
            </div>

            {/* View Content */}
            <div className="min-h-[500px]">
                {activeTab === 'briefing' && (
                    <div className="space-y-6 animate-fade-in-up">
                        <div className="bg-gradient-to-br from-indigo-900/40 via-slate-900 to-slate-900 p-8 rounded-3xl border border-indigo-500/30 shadow-2xl relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none group-hover:opacity-20 transition-opacity">
                                <BrainCircuit size={150} className="text-indigo-400" />
                            </div>
                            <div className="relative z-10">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="p-3 bg-indigo-500/20 rounded-xl text-indigo-400">
                                        <Sparkles size={24} className="fill-current" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black text-white uppercase tracking-widest">Neural Pre-Flight Briefing</h3>
                                        <p className="text-[10px] text-indigo-400 font-bold uppercase">Cross-Mission Pattern Synthesis</p>
                                    </div>
                                </div>

                                {!briefing && !isGeneratingBrief && (
                                    <div className="text-center py-12 bg-slate-950/40 rounded-2xl border border-dashed border-indigo-500/20">
                                        <p className="text-slate-400 text-sm mb-6 max-w-sm mx-auto">Extract tactical directives from your history to prevent recurring mistakes today.</p>
                                        <button onClick={handleGenerateBrief} className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-3 rounded-xl font-black uppercase tracking-widest transition shadow-lg shadow-indigo-900/50 flex items-center mx-auto">
                                            <Zap size={18} className="mr-3 fill-current" /> Initialize Briefing
                                        </button>
                                    </div>
                                )}

                                {isGeneratingBrief && (
                                    <div className="text-center py-20 animate-pulse">
                                        <BrainCircuit size={64} className="mx-auto text-indigo-500 mb-6 opacity-50 animate-spin" />
                                        <p className="text-indigo-300 font-black uppercase tracking-widest">Synthesizing Historical Failure Modes...</p>
                                    </div>
                                )}

                                {briefing && (
                                    <div className="animate-fade-in">
                                        <div className="bg-slate-950/80 border-l-4 border-indigo-500 p-8 rounded-r-2xl shadow-xl">
                                            <span className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.3em] block mb-4">Tactical Warning:</span>
                                            <p className="text-2xl font-serif font-medium text-slate-100 leading-relaxed italic">
                                                "{briefing}"
                                            </p>
                                        </div>
                                        <button onClick={handleGenerateBrief} className="mt-8 text-indigo-400 hover:text-white text-[10px] font-black uppercase tracking-widest flex items-center gap-2 mx-auto">
                                            <Activity size={12}/> Re-Run Logic Audit
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'behavior' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in-up">
                        <div className="bg-slate-900 p-8 rounded-3xl border border-slate-800 shadow-2xl">
                            <h4 className="text-white font-black text-sm uppercase tracking-widest mb-8 flex items-center gap-2">
                                <HeartPulse size={18} className="text-rose-500"/> Emotional ROI Heatmap
                            </h4>
                            <div className="h-[300px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={emotionalData}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false}/>
                                        <XAxis dataKey="name" stroke="#475569" fontSize={10} fontWeight="bold" axisLine={false} tickLine={false}/>
                                        <YAxis stroke="#475569" fontSize={10} fontWeight="bold" axisLine={false} tickLine={false} unit="%"/>
                                        <Tooltip contentStyle={{backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px'}} />
                                        <Bar dataKey="winRate" name="Win Rate %" radius={[4, 4, 0, 0]}>
                                            {emotionalData.map((entry, index) => (
                                                <Cell key={index} fill={entry.winRate >= 60 ? '#10B981' : entry.winRate >= 40 ? '#F59E0B' : '#EF4444'} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <div className="bg-slate-900 p-8 rounded-3xl border border-slate-800 shadow-2xl flex flex-col justify-center relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-8 opacity-5"><TrendingUp size={100}/></div>
                            <h4 className="text-indigo-400 font-black text-[10px] uppercase tracking-widest mb-4">Mindset Extraction</h4>
                            <div className="space-y-6 relative z-10">
                                <p className="text-slate-300 text-lg leading-relaxed italic border-l-2 border-indigo-500 pl-4">
                                    "Data proves your edge is statistically higher in 'Calm' states. You tend to take high-volatility risks when 'Excited'."
                                </p>
                                <div className="grid grid-cols-1 gap-3">
                                    {emotionalData.slice(0, 3).map((e, i) => (
                                        <div key={i} className="flex justify-between items-center bg-slate-950/50 p-4 rounded-xl border border-white/5">
                                            <div>
                                                <span className="text-xs font-bold text-slate-400 uppercase">{e.name}</span>
                                                <div className="text-[10px] text-slate-600">{e.count} Trades Logged</div>
                                            </div>
                                            <div className="text-right">
                                                <div className={`text-lg font-black font-mono ${e.winRate >= 50 ? 'text-emerald-400' : 'text-red-400'}`}>{e.winRate}% WR</div>
                                                <div className={`text-[9px] font-bold ${e.pnl >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>₹{e.pnl.toLocaleString()}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'patterns' && (
                    <div className="space-y-6 animate-fade-in-up">
                        <div className="bg-slate-900 p-8 rounded-3xl border border-slate-800 shadow-2xl">
                            <h4 className="text-white font-black text-sm uppercase tracking-widest mb-6 flex items-center gap-2">
                                <Search size={18} className="text-blue-400"/> Tactical Pattern Matching
                            </h4>
                            <p className="text-slate-500 text-xs mb-8 uppercase font-bold tracking-widest">DESCRIBE YOUR CURRENT CHART SETUP OR EMOTIONAL HURDLE:</p>
                            
                            <div className="relative mb-8">
                                <input 
                                    type="text" 
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                    placeholder="e.g. Price stalling at VWAP with high Call OI. Have I been here before?"
                                    className="w-full bg-slate-950 border border-slate-700 rounded-2xl py-5 px-6 text-white outline-none focus:border-indigo-500 transition-all pr-14"
                                />
                                <button 
                                    onClick={handleSearch}
                                    disabled={isSearching || !searchQuery.trim()}
                                    className="absolute right-3 top-3 p-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition disabled:opacity-50"
                                >
                                    {isSearching ? <Loader2 size={20} className="animate-spin"/> : <ArrowRight size={20}/>}
                                </button>
                            </div>

                            {matchResult && (
                                <div className="space-y-6 animate-fade-in">
                                    <div className="bg-blue-900/10 border border-blue-500/20 p-6 rounded-2xl">
                                        <div className="flex items-center gap-2 mb-3 text-blue-400">
                                            <Sparkles size={16}/>
                                            <span className="text-[10px] font-black uppercase tracking-widest">Instant Experience Recall:</span>
                                        </div>
                                        <p className="text-lg text-white font-medium italic">"{matchResult.insight}"</p>
                                    </div>

                                    {matchResult.match && (
                                        <div 
                                            onClick={() => onViewTrade(matchResult.match!.id)}
                                            className="bg-slate-800/50 border border-slate-700 p-4 rounded-xl flex items-center justify-between cursor-pointer hover:bg-slate-800 transition group"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-lg bg-slate-900 flex items-center justify-center border border-slate-700">
                                                    <History size={18} className="text-slate-500 group-hover:text-indigo-400"/>
                                                </div>
                                                <div>
                                                    <div className="text-xs font-black text-white uppercase">{matchResult.match.date} {matchResult.match.setupName}</div>
                                                    <div className="text-[10px] text-slate-500">Outcome: {matchResult.match.outcome} • PnL: ₹{matchResult.match.pnl}</div>
                                                </div>
                                            </div>
                                            <div className="text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-black uppercase">View Trade Log</div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default IntelligenceCenter;
