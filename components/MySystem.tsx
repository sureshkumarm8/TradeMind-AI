import React, { useState } from 'react';
import { Target, Clock, Activity, TrendingUp, AlertTriangle, ExternalLink, ShieldCheck, CheckSquare, Zap, Crosshair } from 'lucide-react';

const MySystem: React.FC = () => {
  const [checklist, setChecklist] = useState({
    mindset: false,
    environment: false,
    levels: false,
    news: false
  });

  const toggleCheck = (key: keyof typeof checklist) => {
    setChecklist(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const allChecked = Object.values(checklist).every(Boolean);

  return (
    <div className="space-y-8 animate-fade-in max-w-6xl mx-auto">
       {/* Header / Manifesto */}
       <div className="bg-gradient-to-r from-indigo-950 to-slate-900 p-8 rounded-2xl border border-indigo-500/30 relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 p-8 opacity-5">
             <Target size={250} />
          </div>
          <div className="relative z-10 max-w-3xl">
            <h2 className="text-4xl font-extrabold text-white mb-4 tracking-tight">The Nifty 30-Point Sniper</h2>
            <p className="text-indigo-200 text-lg leading-relaxed font-light">
               "I do not chase price. I wait for the setup. My edge is patience. My goal is 30 points. My exit is quick."
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
               <div className="flex items-center text-sm font-bold text-emerald-400 bg-emerald-950/40 px-5 py-2.5 rounded-full border border-emerald-500/20 shadow-lg shadow-emerald-900/10">
                  <TrendingUp size={18} className="mr-2"/> Target: 30 Pts
               </div>
               <div className="flex items-center text-sm font-bold text-blue-400 bg-blue-950/40 px-5 py-2.5 rounded-full border border-blue-500/20 shadow-lg shadow-blue-900/10">
                  <Clock size={18} className="mr-2"/> Checkpoint: 15m
               </div>
               <div className="flex items-center text-sm font-bold text-amber-400 bg-amber-950/40 px-5 py-2.5 rounded-full border border-amber-500/20 shadow-lg shadow-amber-900/10">
                  <ShieldCheck size={18} className="mr-2"/> Risk: 1:1 Strict
               </div>
            </div>
          </div>
       </div>

       {/* Interactive Pre-Flight */}
       <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-6">
          <h3 className="text-white font-bold text-lg mb-4 flex items-center">
             <Zap className={`mr-2 ${allChecked ? 'text-yellow-400 fill-yellow-400' : 'text-slate-400'}`} size={20} />
             Pre-Flight Mental Check
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
             <button onClick={() => toggleCheck('mindset')} className={`flex items-center p-3 rounded-lg border transition-all ${checklist.mindset ? 'bg-indigo-900/30 border-indigo-500 text-indigo-300' : 'bg-slate-900 border-slate-700 text-slate-500 hover:border-slate-600'}`}>
                <CheckSquare size={18} className="mr-3" /> Calm & Focused
             </button>
             <button onClick={() => toggleCheck('environment')} className={`flex items-center p-3 rounded-lg border transition-all ${checklist.environment ? 'bg-indigo-900/30 border-indigo-500 text-indigo-300' : 'bg-slate-900 border-slate-700 text-slate-500 hover:border-slate-600'}`}>
                <CheckSquare size={18} className="mr-3" /> Distraction Free
             </button>
             <button onClick={() => toggleCheck('levels')} className={`flex items-center p-3 rounded-lg border transition-all ${checklist.levels ? 'bg-indigo-900/30 border-indigo-500 text-indigo-300' : 'bg-slate-900 border-slate-700 text-slate-500 hover:border-slate-600'}`}>
                <CheckSquare size={18} className="mr-3" /> Zones Marked
             </button>
             <button onClick={() => toggleCheck('news')} className={`flex items-center p-3 rounded-lg border transition-all ${checklist.news ? 'bg-indigo-900/30 border-indigo-500 text-indigo-300' : 'bg-slate-900 border-slate-700 text-slate-500 hover:border-slate-600'}`}>
                <CheckSquare size={18} className="mr-3" /> Global News Check
             </button>
          </div>
       </div>

       {/* The Protocol Timeline */}
       <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 relative">
          {/* Connector Line (Desktop) */}
          <div className="hidden lg:block absolute top-12 left-10 right-10 h-0.5 bg-slate-700 -z-10"></div>

          {/* Phase 1: Prep */}
          <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 hover:border-indigo-500/50 transition duration-300 shadow-lg group">
             <div className="w-14 h-14 bg-slate-900 rounded-full flex items-center justify-center text-indigo-400 font-bold text-xl mb-6 border-4 border-slate-800 group-hover:border-indigo-500 transition-colors mx-auto lg:mx-0">1</div>
             <h3 className="text-xl font-bold text-white mb-3">Analysis & Context</h3>
             <ul className="space-y-3 text-slate-400 text-sm">
                <li className="flex items-start"><span className="text-indigo-500 mr-2 mt-0.5">•</span> Check Previous Day High/Low.</li>
                <li className="flex items-start"><span className="text-indigo-500 mr-2 mt-0.5">•</span> Confirm Monthly Trend.</li>
                <li className="flex items-start"><span className="text-indigo-500 mr-2 mt-0.5">•</span> Mark Support & Resistance Zones.</li>
                <li className="flex items-start"><span className="text-indigo-500 mr-2 mt-0.5">•</span> <b>Open Type:</b> Gap Up, Down, or Flat?</li>
             </ul>
          </div>

          {/* Phase 2: The Wait */}
          <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 hover:border-amber-500/50 transition duration-300 shadow-lg group">
             <div className="w-14 h-14 bg-slate-900 rounded-full flex items-center justify-center text-amber-400 font-bold text-xl mb-6 border-4 border-slate-800 group-hover:border-amber-500 transition-colors mx-auto lg:mx-0">2</div>
             <h3 className="text-xl font-bold text-white mb-3">The Patience Zone</h3>
             <ul className="space-y-3 text-slate-400 text-sm">
                <li className="flex items-start"><span className="text-amber-500 mr-2 mt-0.5">➜</span> <b>Wait 5-15 Mins:</b> NO trades at bell.</li>
                <li className="flex items-start"><span className="text-amber-500 mr-2 mt-0.5">➜</span> <b>Watch 5m Chart:</b> Structure build-up.</li>
                <li className="flex items-start"><span className="text-amber-500 mr-2 mt-0.5">➜</span> <b>Check OI:</b> Sensibull confirmation.</li>
                <li className="flex items-start"><span className="text-amber-500 mr-2 mt-0.5">➜</span> <b>Selection:</b> CE/PE based on trend.</li>
             </ul>
          </div>

          {/* Phase 3: The Kill */}
          <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 hover:border-emerald-500/50 transition duration-300 shadow-lg group">
             <div className="w-14 h-14 bg-slate-900 rounded-full flex items-center justify-center text-emerald-400 font-bold text-xl mb-6 border-4 border-slate-800 group-hover:border-emerald-500 transition-colors mx-auto lg:mx-0">3</div>
             <h3 className="text-xl font-bold text-white mb-3">Execution & Exit</h3>
             <ul className="space-y-3 text-slate-400 text-sm">
                <li className="flex items-start"><span className="text-emerald-500 mr-2 mt-0.5">✓</span> <b>Entry:</b> Enter on candle closure.</li>
                <li className="flex items-start"><span className="text-emerald-500 mr-2 mt-0.5">✓</span> <b>Target:</b> 30 Spot Points (Strict).</li>
                <li className="flex items-start"><span className="text-emerald-500 mr-2 mt-0.5">✓</span> <b>Stop Loss:</b> 30 Spot Points (Strict).</li>
                <li className="flex items-start"><span className="text-emerald-500 mr-2 mt-0.5">✓</span> <b>Time:</b> Check at 15m. If thesis holds, stay. Max 30m.</li>
             </ul>
          </div>
       </div>

       {/* Tools Section */}
       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <a href="https://web.sensibull.com/open-interest/oi-vs-strike?tradingsymbol=NIFTY" target="_blank" rel="noopener noreferrer" 
             className="group bg-slate-800 p-8 rounded-xl border border-slate-700 hover:bg-orange-900/10 hover:border-orange-500/50 transition flex items-center justify-between shadow-lg">
             <div className="flex items-center">
                <div className="bg-orange-900/20 p-3 rounded-lg mr-4 group-hover:bg-orange-500/20 transition">
                    <Activity className="text-orange-500" size={32}/>
                </div>
                <div>
                   <h4 className="text-white font-bold text-lg">Sensibull OI</h4>
                   <p className="text-slate-400 text-sm">Verify Resistance & Support Levels</p>
                </div>
             </div>
             <ExternalLink className="text-slate-600 group-hover:text-orange-400" size={24}/>
          </a>
          
          <a href="https://kite.zerodha.com/markets/ext/chart/web/tvc/INDICES/NIFTY%2050/256265" target="_blank" rel="noopener noreferrer"
             className="group bg-slate-800 p-8 rounded-xl border border-slate-700 hover:bg-blue-900/10 hover:border-blue-500/50 transition flex items-center justify-between shadow-lg">
             <div className="flex items-center">
                 <div className="bg-blue-900/20 p-3 rounded-lg mr-4 group-hover:bg-blue-500/20 transition">
                    <Crosshair className="text-blue-500" size={32}/>
                 </div>
                <div>
                   <h4 className="text-white font-bold text-lg">Zerodha Kite</h4>
                   <p className="text-slate-400 text-sm">Nifty 50 Spot Chart (5 Min)</p>
                </div>
             </div>
             <ExternalLink className="text-slate-600 group-hover:text-blue-400" size={24}/>
          </a>
       </div>

       {/* Discipline & Psychology */}
       <div className="bg-slate-900 p-8 rounded-xl border border-red-900/30">
          <div className="flex items-center mb-8 border-b border-red-900/30 pb-4">
             <AlertTriangle className="text-red-500 mr-3" size={28}/>
             <h3 className="text-2xl font-bold text-white">The Iron Rules of Discipline</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div className="bg-black/40 p-5 rounded-lg border-l-4 border-red-500 hover:bg-red-900/5 transition">
                <p className="text-red-200 font-bold text-base mb-1">NO TRADING IN FIRST 5 MINUTES</p>
                <p className="text-slate-500 text-sm">Let the volatility settle. Let the amateur money get trapped. Professional money waits.</p>
             </div>
             <div className="bg-black/40 p-5 rounded-lg border-l-4 border-red-500 hover:bg-red-900/5 transition">
                <p className="text-red-200 font-bold text-base mb-1">15 MINUTE CHECKPOINT</p>
                <p className="text-slate-500 text-sm">Options decay. If price stagnates for 15m, re-assess. If the move hasn't started, get out. If it's building, hold to 30m max.</p>
             </div>
             <div className="bg-black/40 p-5 rounded-lg border-l-4 border-red-500 hover:bg-red-900/5 transition">
                <p className="text-red-200 font-bold text-base mb-1">RESPECT THE STOP LOSS</p>
                <p className="text-slate-500 text-sm">A 30-point loss is a business expense. A 100-point loss is an ego problem. Kill the ego.</p>
             </div>
             <div className="bg-black/40 p-5 rounded-lg border-l-4 border-red-500 hover:bg-red-900/5 transition">
                <p className="text-red-200 font-bold text-base mb-1">NO REVENGE TRADING</p>
                <p className="text-slate-500 text-sm">If you hit SL, walk away for 30 mins. The market isn't going anywhere, but your capital will if you tilt.</p>
             </div>
          </div>
       </div>
    </div>
  );
};

export default MySystem;