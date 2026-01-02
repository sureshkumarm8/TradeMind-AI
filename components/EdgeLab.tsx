
import React, { useState, useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Trade, TradeOutcome } from '../types';
import { FlaskConical, Filter, Calendar, AlertTriangle, Clock } from 'lucide-react';

interface EdgeLabProps {
    trades: Trade[];
    apiKey?: string;
}

interface SimFilters {
    excludeMistakes: boolean;
    excludeFridays: boolean;
    excludeShortDuration: boolean;
    excludeAfter2PM: boolean;
}

const LabTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-slate-900 border border-slate-700 p-2 rounded shadow-xl">
                <p className="text-slate-400 text-xs mb-1">{label}</p>
                {payload.map((p: any, idx: number) => (
                    <div key={idx} className="text-xs font-bold" style={{ color: p.color }}>
                        {p.name}: ₹{p.value.toFixed(0)}
                    </div>
                ))}
            </div>
        );
    }
    return null;
};

const EdgeLab: React.FC<EdgeLabProps> = ({ trades, apiKey }) => {
    const [simFilters, setSimFilters] = useState<SimFilters>({
        excludeMistakes: false,
        excludeFridays: false,
        excludeShortDuration: false,
        excludeAfter2PM: false
    });

    const simulatorData = useMemo(() => {
        const sortedTrades = [...trades]
            .filter(t => t.outcome !== TradeOutcome.OPEN)
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        let currentEquity = 0;
        let simEquity = 0;

        return sortedTrades.map(t => {
            const dateObj = new Date(t.date);
            const validDate = !isNaN(dateObj.getTime());
            const hour = t.entryTime ? parseInt(t.entryTime.split(':')[0]) : 0;
            
            let isExcluded = false;
            if (simFilters.excludeMistakes && t.mistakes && t.mistakes.length > 0) isExcluded = true;
            if (simFilters.excludeFridays && validDate && dateObj.getDay() === 5) isExcluded = true;
            if (simFilters.excludeShortDuration && (t.tradeDurationMins || 0) < 5) isExcluded = true;
            if (simFilters.excludeAfter2PM && hour >= 14) isExcluded = true;

            currentEquity += (t.pnl || 0);
            if (!isExcluded) simEquity += (t.pnl || 0);

            return {
                date: t.date,
                actual: currentEquity,
                simulated: simEquity
            };
        });
    }, [trades, simFilters]);

    // Heatmap Logic (simplified for simulation view, can be expanded)
    const heatmapData = useMemo(() => {
        const grid: Record<string, number> = {}; 
        
        trades.forEach(t => {
            if (t.outcome === TradeOutcome.OPEN || !t.entryTime) return;
            const date = new Date(t.date);
            if (isNaN(date.getTime())) return;

            const day = date.getDay(); // 1=Mon, 5=Fri
            const hour = parseInt(t.entryTime.split(':')[0]);
            
            if (day >= 1 && day <= 5 && hour >= 9 && hour <= 15) {
                const key = `${day}-${hour}`;
                if (!grid[key]) grid[key] = 0;
                grid[key] += (t.pnl || 0);
            }
        });
        
        return grid;
    }, [trades]);

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="bg-gradient-to-r from-slate-900 to-indigo-950 p-6 rounded-xl border border-indigo-500/20">
                <div className="flex items-center gap-4 mb-2">
                    <FlaskConical size={32} className="text-indigo-400"/>
                    <div>
                        <h3 className="text-xl font-bold text-white">Edge Lab</h3>
                        <p className="text-sm text-slate-400">Simulate how your equity curve changes by removing bad habits.</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Controls */}
                <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 h-fit">
                    <h4 className="text-xs font-bold text-white uppercase mb-4 flex items-center gap-2"><Filter size={14}/> Simulation Filters</h4>
                    <div className="space-y-3">
                        <label className="flex items-center justify-between p-3 bg-slate-900 rounded-lg cursor-pointer hover:bg-slate-900/80">
                            <span className="text-sm text-slate-300 flex items-center gap-2"><AlertTriangle size={14} className="text-red-400"/> Exclude Mistakes</span>
                            <input type="checkbox" checked={simFilters.excludeMistakes} onChange={e => setSimFilters(p => ({...p, excludeMistakes: e.target.checked}))} className="accent-indigo-500"/>
                        </label>
                        <label className="flex items-center justify-between p-3 bg-slate-900 rounded-lg cursor-pointer hover:bg-slate-900/80">
                            <span className="text-sm text-slate-300 flex items-center gap-2"><Calendar size={14} className="text-amber-400"/> Exclude Fridays</span>
                            <input type="checkbox" checked={simFilters.excludeFridays} onChange={e => setSimFilters(p => ({...p, excludeFridays: e.target.checked}))} className="accent-indigo-500"/>
                        </label>
                        <label className="flex items-center justify-between p-3 bg-slate-900 rounded-lg cursor-pointer hover:bg-slate-900/80">
                            <span className="text-sm text-slate-300 flex items-center gap-2"><Clock size={14} className="text-blue-400"/> Exclude &lt; 5m Duration</span>
                            <input type="checkbox" checked={simFilters.excludeShortDuration} onChange={e => setSimFilters(p => ({...p, excludeShortDuration: e.target.checked}))} className="accent-indigo-500"/>
                        </label>
                         <label className="flex items-center justify-between p-3 bg-slate-900 rounded-lg cursor-pointer hover:bg-slate-900/80">
                            <span className="text-sm text-slate-300 flex items-center gap-2"><Clock size={14} className="text-purple-400"/> Exclude After 2 PM</span>
                            <input type="checkbox" checked={simFilters.excludeAfter2PM} onChange={e => setSimFilters(p => ({...p, excludeAfter2PM: e.target.checked}))} className="accent-indigo-500"/>
                        </label>
                    </div>
                </div>

                {/* Chart */}
                <div className="lg:col-span-2 bg-slate-800 p-6 rounded-xl border border-slate-700">
                    <h4 className="text-xs font-bold text-white uppercase mb-4">Equity Simulation</h4>
                    <div className="h-80 w-full">
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
                                <XAxis 
                                    dataKey="date" 
                                    stroke="#64748b" 
                                    fontSize={10} 
                                    tickLine={false} 
                                    axisLine={false} 
                                    tickFormatter={(d) => {
                                        const date = new Date(d);
                                        return isNaN(date.getTime()) ? '' : date.getDate().toString();
                                    }} 
                                />
                                <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                                <Tooltip content={<LabTooltip />} />
                                <Area type="monotone" dataKey="actual" name="Actual PnL" stroke="#94a3b8" strokeWidth={2} fill="url(#colorActual)" />
                                <Area type="monotone" dataKey="simulated" name="Optimized PnL" stroke="#10B981" strokeWidth={2} strokeDasharray="5 5" fill="url(#colorSim)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EdgeLab;
