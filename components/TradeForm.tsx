import React, { useState, useEffect } from 'react';
import { Trade, TradeDirection, TradeOutcome, OptionType, Timeframe, OpeningType } from '../types';
import { Save, X, AlertTriangle, CheckCircle2, ExternalLink, Clock, Target, Calculator, ChevronDown, ChevronUp } from 'lucide-react';

interface TradeFormProps {
  onSave: (trade: Trade) => void;
  onCancel: () => void;
  initialData?: Trade;
}

const COMMON_CONFLUENCES = [
  "VWAP Support/Res", "CPR Breakout", "20 EMA Trend", "Day High/Low Break", 
  "OI Data Support", "Gap Fill", "Trendline Break", "Fibonacci Retracement",
  "Pivot Point Reversal", "Volume Spike", "Candlestick Pattern (Hammer/Engulfing)", 
  "Sector Strength", "Price Action Rejection", "Chart Pattern (Flag/Triangle)",
  "Support/Resistance Flip", "RSI Divergence", "Higher Timeframe Alignment"
];

const COMMON_MISTAKES = [
  "FOMO Entry", "Revenge Trading", "Moved Stop Loss", "Early Exit", 
  "Overtrading", "Counter-Trend", "Position Size Too Big", "Did Not Wait 15m",
  "Chasing Price", "Averaging Losers", "Hesitation / Late Entry", "Ignored Higher Timeframe",
  "Distracted / Bored", "Trading P&L Not Chart", "Poor Risk/Reward", "News Impulse"
];

const TradeForm: React.FC<TradeFormProps> = ({ onSave, onCancel, initialData }) => {
  // Toggle states for foldable sections
  const [showConfluences, setShowConfluences] = useState(false);
  const [showMistakes, setShowMistakes] = useState(false);

  // Safe initialization logic
  const [formData, setFormData] = useState<Partial<Trade>>(() => {
    const defaults = {
        date: new Date().toISOString().split('T')[0],
        entryTime: '',
        exitTime: '',
        instrument: 'NIFTY 50',
        optionType: OptionType.CE,
        timeframe: Timeframe.M5,
        direction: TradeDirection.LONG,
        quantity: 75,
        followedSystem: true,
        disciplineRating: 5,
        outcome: TradeOutcome.OPEN,
        emotionalState: 'Neutral',
        setupName: '',
        marketContext: '',
        entryReason: '',
        exitReason: '',
        confluences: [],
        mistakes: [],
        entryPrice: 0,
        niftyEntryPrice: 0,
        niftyExitPrice: 0,
        openingType: OpeningType.FLAT,
        spotPointsCaptured: 0,
        tradeDurationMins: 0,
        systemChecks: {
            analyzedPreMarket: false,
            waitedForOpen: false,
            checkedSensibullOI: false,
            exitTimeLimit: false
        }
    };

    if (initialData) {
        // Merge initialData with defaults to ensure nested objects (like systemChecks) exist
        return {
            ...defaults,
            ...initialData,
            systemChecks: {
                ...defaults.systemChecks,
                ...(initialData.systemChecks || {})
            }
        };
    }

    return defaults;
  });
  
  // Auto-expand sections if editing and they have data
  useEffect(() => {
    if (initialData?.confluences && initialData.confluences.length > 0) {
        setShowConfluences(true);
    }
    if (initialData?.mistakes && initialData.mistakes.length > 0) {
        setShowMistakes(true);
    }
  }, []);

  // Auto-calculate duration when times change
  useEffect(() => {
    if (formData.date && formData.entryTime && formData.exitTime) {
      const start = new Date(`${formData.date}T${formData.entryTime}`);
      const end = new Date(`${formData.date}T${formData.exitTime}`);
      // Handle overnight or invalid times gracefully
      if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
          const diffMs = end.getTime() - start.getTime();
          const diffMins = Math.round(diffMs / 60000);
          
          if (diffMins > 0) {
            setFormData(prev => ({
                ...prev,
                tradeDurationMins: diffMins,
                // Auto-check system rule if applicable (Flexible 15-30m rule)
                systemChecks: {
                    ...(prev.systemChecks || {
                        analyzedPreMarket: false,
                        waitedForOpen: false,
                        checkedSensibullOI: false,
                        exitTimeLimit: false
                    }),
                    exitTimeLimit: diffMins <= 30 // Updated to reflect flexible rule
                }
            }));
          }
      }
    }
  }, [formData.date, formData.entryTime, formData.exitTime]);

  // Auto-calculate Spot Points Captured
  useEffect(() => {
    if (formData.niftyEntryPrice && formData.niftyExitPrice) {
      let points = 0;
      if (formData.direction === TradeDirection.LONG) {
        points = formData.niftyExitPrice - formData.niftyEntryPrice;
      } else {
        points = formData.niftyEntryPrice - formData.niftyExitPrice;
      }
      setFormData(prev => ({ ...prev, spotPointsCaptured: parseFloat(points.toFixed(2)) }));
    }
  }, [formData.niftyEntryPrice, formData.niftyExitPrice, formData.direction]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) : value
    }));
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.checked
    }));
  };
  
  const handleSystemCheckChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      systemChecks: {
        ...(prev.systemChecks || {
             analyzedPreMarket: false,
             waitedForOpen: false,
             checkedSensibullOI: false,
             exitTimeLimit: false
        }),
        [name]: checked
      }
    }));
  };

  const toggleArrayItem = (field: 'confluences' | 'mistakes', item: string) => {
    setFormData(prev => {
      const current = prev[field] || [];
      const exists = current.includes(item);
      return {
        ...prev,
        [field]: exists ? current.filter(i => i !== item) : [...current, item]
      };
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Auto-calculate PnL
    let finalPnl = formData.pnl;
    let finalOutcome = formData.outcome;

    if (formData.entryPrice && formData.exitPrice && formData.quantity && formData.outcome !== TradeOutcome.OPEN) {
      const diff = formData.exitPrice - formData.entryPrice;
      finalPnl = formData.direction === TradeDirection.LONG 
        ? diff * formData.quantity 
        : (formData.entryPrice - formData.exitPrice) * formData.quantity;
      
      if (finalPnl > 0) finalOutcome = TradeOutcome.WIN;
      else if (finalPnl < 0) finalOutcome = TradeOutcome.LOSS;
      else finalOutcome = TradeOutcome.BREAK_EVEN;
    }

    const trade: Trade = {
      id: initialData?.id || crypto.randomUUID(),
      date: formData.date || new Date().toISOString(),
      entryTime: formData.entryTime,
      exitTime: formData.exitTime,
      instrument: formData.instrument || 'NIFTY 50',
      optionType: formData.optionType,
      strikePrice: formData.strikePrice,
      niftyEntryPrice: formData.niftyEntryPrice,
      niftyExitPrice: formData.niftyExitPrice,
      timeframe: formData.timeframe as Timeframe || Timeframe.M5,
      direction: formData.direction as TradeDirection,
      entryPrice: formData.entryPrice || 0,
      exitPrice: formData.exitPrice,
      quantity: formData.quantity || 75,
      stopLoss: formData.stopLoss,
      takeProfit: formData.takeProfit,
      setupName: formData.setupName || '',
      marketContext: formData.marketContext || '',
      entryReason: formData.entryReason || '',
      exitReason: formData.exitReason,
      confluences: formData.confluences || [],
      mistakes: formData.mistakes || [],
      followedSystem: formData.followedSystem || false,
      disciplineRating: formData.disciplineRating || 3,
      emotionalState: formData.emotionalState || 'Neutral',
      outcome: finalOutcome as TradeOutcome,
      pnl: finalPnl,
      aiFeedback: initialData?.aiFeedback,
      openingType: formData.openingType,
      spotPointsCaptured: formData.spotPointsCaptured,
      tradeDurationMins: formData.tradeDurationMins,
      systemChecks: formData.systemChecks,
    };
    onSave(trade);
  };

  return (
    <div className="bg-slate-800 p-4 md:p-6 rounded-xl border border-slate-700 shadow-xl max-w-5xl mx-auto animate-fade-in">
      <div className="flex justify-between items-center mb-6 border-b border-slate-700 pb-4">
        <h2 className="text-xl font-bold text-white flex items-center">
          {initialData ? 'Edit Trade Log' : 'Log Nifty Scalp Trade'}
        </h2>
        <div className="flex space-x-2">
            <a href="https://web.sensibull.com/open-interest/oi-vs-strike?tradingsymbol=NIFTY" target="_blank" rel="noopener noreferrer" className="flex items-center text-xs bg-orange-600/20 text-orange-400 border border-orange-500/30 px-3 py-1.5 rounded-lg hover:bg-orange-600/40 transition font-medium">
               <ExternalLink size={12} className="mr-1"/> Sensibull OI
            </a>
            <a href="https://kite.zerodha.com/markets/ext/chart/web/tvc/INDICES/NIFTY%2050/256265" target="_blank" rel="noopener noreferrer" className="flex items-center text-xs bg-blue-600/20 text-blue-400 border border-blue-500/30 px-3 py-1.5 rounded-lg hover:bg-blue-600/40 transition font-medium">
               <ExternalLink size={12} className="mr-1"/> Kite Chart
            </a>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* Section 1: Pre-Market & Instrument */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
           <div className="col-span-2 md:col-span-1">
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Opening</label>
            <select name="openingType" value={formData.openingType} onChange={handleChange}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white outline-none focus:border-indigo-500"
            >
              <option value={OpeningType.FLAT}>Flat</option>
              <option value={OpeningType.GAP_UP}>Gap Up</option>
              <option value={OpeningType.GAP_DOWN}>Gap Down</option>
            </select>
          </div>
          <div className="col-span-2 md:col-span-1">
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Instrument</label>
            <input 
              type="text" name="instrument" required 
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white outline-none focus:border-indigo-500 transition"
              value={formData.instrument} onChange={handleChange}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Type</label>
            <select name="optionType" value={formData.optionType} onChange={handleChange}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white outline-none focus:border-indigo-500"
            >
              <option value={OptionType.CE}>CE</option>
              <option value={OptionType.PE}>PE</option>
              <option value={OptionType.FUT}>FUT</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Strike</label>
            <input 
              type="number" name="strikePrice" placeholder="21500"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white outline-none focus:border-indigo-500"
              value={formData.strikePrice || ''} onChange={handleChange}
            />
          </div>
           <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Timeframe</label>
            <select name="timeframe" value={formData.timeframe} onChange={handleChange}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white outline-none focus:border-indigo-500"
            >
              <option value={Timeframe.M5}>5 min</option>
              <option value={Timeframe.M1}>1 min</option>
              <option value={Timeframe.M3}>3 min</option>
              <option value={Timeframe.M15}>15 min</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Direction</label>
            <select name="direction" value={formData.direction} onChange={handleChange}
              className={`w-full border rounded-lg px-3 py-2 text-white outline-none font-bold ${formData.direction === TradeDirection.LONG ? 'bg-blue-900/40 border-blue-600' : 'bg-amber-900/40 border-amber-600'}`}
            >
              <option value={TradeDirection.LONG}>LONG</option>
              <option value={TradeDirection.SHORT}>SHORT</option>
            </select>
          </div>
        </div>

        {/* Section 2: Strategy Execution (The User's System) */}
        <div className="bg-indigo-900/20 p-5 rounded-xl border border-indigo-500/30">
            <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-4 flex items-center">
                <Target size={14} className="mr-2"/> My System Checklist (Nifty 30-Pt Scalp)
            </h3>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                 <div className="relative">
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Entry Time</label>
                    <input 
                        type="time" name="entryTime"
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white outline-none focus:border-indigo-500 font-mono"
                        value={formData.entryTime || ''} onChange={handleChange}
                    />
                 </div>
                 <div className="relative">
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Exit Time</label>
                    <input 
                        type="time" name="exitTime"
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white outline-none focus:border-indigo-500 font-mono"
                        value={formData.exitTime || ''} onChange={handleChange}
                    />
                 </div>
                 <div className="relative">
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Duration (Auto)</label>
                    <div className="relative">
                        <input 
                            type="number" name="tradeDurationMins" readOnly
                            className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-3 py-2 text-slate-400 outline-none font-mono"
                            placeholder="Mins"
                            value={formData.tradeDurationMins || ''}
                        />
                        <Clock size={14} className="absolute right-3 top-2.5 text-slate-600"/>
                    </div>
                 </div>
                 <div className="relative">
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Spot Pts Captured</label>
                     <div className="relative">
                      <input 
                          type="number" name="spotPointsCaptured"
                          className={`w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white outline-none focus:border-indigo-500 font-mono ${formData.spotPointsCaptured && formData.spotPointsCaptured >= 30 ? 'text-emerald-400 border-emerald-500/50' : ''}`}
                          placeholder="Target 30"
                          value={formData.spotPointsCaptured || ''} onChange={handleChange}
                      />
                      <Calculator size={14} className="absolute right-3 top-2.5 text-slate-600"/>
                    </div>
                 </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <label className="flex items-center space-x-2 bg-slate-900/60 p-3 rounded-lg border border-slate-700 cursor-pointer hover:border-indigo-500 transition hover:bg-slate-800">
                    <input type="checkbox" name="analyzedPreMarket" 
                        checked={formData.systemChecks?.analyzedPreMarket || false} onChange={handleSystemCheckChange}
                        className="w-4 h-4 text-indigo-500 rounded focus:ring-indigo-500 bg-slate-800"
                    />
                    <span className="text-xs font-medium text-slate-300">Analyzed Pre-Market</span>
                </label>
                <label className="flex items-center space-x-2 bg-slate-900/60 p-3 rounded-lg border border-slate-700 cursor-pointer hover:border-indigo-500 transition hover:bg-slate-800">
                    <input type="checkbox" name="waitedForOpen" 
                        checked={formData.systemChecks?.waitedForOpen || false} onChange={handleSystemCheckChange}
                        className="w-4 h-4 text-indigo-500 rounded focus:ring-indigo-500 bg-slate-800"
                    />
                    <span className="text-xs font-medium text-slate-300">Waited 15m Open</span>
                </label>
                 <label className="flex items-center space-x-2 bg-slate-900/60 p-3 rounded-lg border border-slate-700 cursor-pointer hover:border-indigo-500 transition hover:bg-slate-800">
                    <input type="checkbox" name="checkedSensibullOI" 
                        checked={formData.systemChecks?.checkedSensibullOI || false} onChange={handleSystemCheckChange}
                        className="w-4 h-4 text-indigo-500 rounded focus:ring-indigo-500 bg-slate-800"
                    />
                    <span className="text-xs font-medium text-slate-300">Checked Sensibull OI</span>
                </label>
                 <label className="flex items-center space-x-2 bg-slate-900/60 p-3 rounded-lg border border-slate-700 cursor-pointer hover:border-indigo-500 transition hover:bg-slate-800">
                    <input type="checkbox" name="exitTimeLimit" 
                        checked={formData.systemChecks?.exitTimeLimit || false} onChange={handleSystemCheckChange}
                        className="w-4 h-4 text-indigo-500 rounded focus:ring-indigo-500 bg-slate-800"
                    />
                    <span className="text-xs font-medium text-slate-300">15-30m Checkpoint</span>
                </label>
            </div>
        </div>

        {/* Section 3: Execution */}
        <div className="bg-slate-900/50 p-5 rounded-xl border border-slate-800">
           <h3 className="text-xs font-bold text-slate-500 uppercase mb-4">Trade Execution</h3>
           <div className="grid grid-cols-2 md:grid-cols-6 gap-6">
            
            {/* Nifty Spot Inputs */}
            <div className="col-span-1 md:col-span-1 border-r border-slate-800 pr-4">
              <label className="block text-xs font-bold text-emerald-500 uppercase mb-1">Nifty Spot Entry</label>
              <input 
                type="number" name="niftyEntryPrice" step="0.05"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white outline-none font-mono text-sm focus:border-emerald-500/50"
                placeholder="21500.50"
                value={formData.niftyEntryPrice || ''} onChange={handleChange}
              />
            </div>
            <div className="col-span-1 md:col-span-1 border-r border-slate-800 pr-4">
              <label className="block text-xs font-bold text-emerald-500 uppercase mb-1">Nifty Spot Exit</label>
              <input 
                type="number" name="niftyExitPrice" step="0.05"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white outline-none font-mono text-sm focus:border-emerald-500/50"
                placeholder="21530.50"
                value={formData.niftyExitPrice || ''} onChange={handleChange}
              />
            </div>

            <div className="col-span-2 md:col-span-1">
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Quantity</label>
              <input 
                type="number" name="quantity" required
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white outline-none font-mono focus:border-indigo-500"
                value={formData.quantity} onChange={handleChange}
              />
            </div>
            <div className="col-span-1 md:col-span-1">
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Avg Entry (₹)</label>
              <input 
                type="number" name="entryPrice" step="0.05" required
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white outline-none font-mono focus:border-indigo-500"
                value={formData.entryPrice} onChange={handleChange}
              />
            </div>
             <div className="col-span-1 md:col-span-1">
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Avg Exit (₹)</label>
              <input 
                type="number" name="exitPrice" step="0.05"
                disabled={formData.outcome === TradeOutcome.OPEN}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white outline-none font-mono disabled:opacity-50 focus:border-indigo-500"
                value={formData.exitPrice || ''} onChange={handleChange}
              />
            </div>
            <div className="col-span-2 md:col-span-1">
             <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Outcome</label>
             <select name="outcome" value={formData.outcome} onChange={handleChange}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white outline-none focus:border-indigo-500"
             >
                <option value={TradeOutcome.OPEN}>OPEN</option>
                <option value={TradeOutcome.WIN}>WIN</option>
                <option value={TradeOutcome.LOSS}>LOSS</option>
                <option value={TradeOutcome.BREAK_EVEN}>BREAK EVEN</option>
             </select>
            </div>
          </div>
        </div>

        {/* Section 4: Context & Psychology */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
           <div>
             <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Setup / Reason</label>
             <textarea 
                  name="entryReason" rows={3}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white outline-none text-sm focus:border-indigo-500"
                  placeholder="Why this entry? (e.g. 5m Candle closed above VWAP, OI Support at 21500)"
                  value={formData.entryReason} onChange={handleChange}
              />
             
             {/* Collapsible Confluences */}
             <div className="mt-4 bg-slate-900/50 rounded-lg border border-slate-800 overflow-hidden">
                <button 
                  type="button" 
                  onClick={() => setShowConfluences(!showConfluences)}
                  className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-slate-800 transition"
                >
                   <span className="text-xs font-bold text-slate-400 uppercase flex items-center">
                      <CheckCircle2 size={14} className="mr-2 text-emerald-500" />
                      Confluences
                      {!showConfluences && formData.confluences && formData.confluences.length > 0 && (
                          <span className="ml-2 text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded-full">
                              {formData.confluences.length} Selected
                          </span>
                      )}
                   </span>
                   {showConfluences ? <ChevronUp size={16} className="text-slate-500"/> : <ChevronDown size={16} className="text-slate-500"/>}
                </button>
                
                {showConfluences && (
                   <div className="p-4 pt-0 border-t border-slate-800 animate-fade-in mt-2">
                       <div className="flex flex-wrap gap-2">
                         {COMMON_CONFLUENCES.map(item => (
                           <button
                             key={item} type="button"
                             onClick={() => toggleArrayItem('confluences', item)}
                             className={`text-xs px-2 py-1.5 rounded-md border transition font-medium ${formData.confluences?.includes(item) ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-300'}`}
                           >
                             {item}
                           </button>
                         ))}
                       </div>
                   </div>
                )}
             </div>
           </div>

           <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Market Context</label>
              <textarea 
                name="marketContext" rows={3}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white outline-none text-sm mb-4 focus:border-indigo-500"
                placeholder="Prev day analysis? S/R zones? Gap Up/Down reaction?"
                value={formData.marketContext} onChange={handleChange}
              />

              {/* Collapsible Mistakes */}
              <div className="mt-4 bg-slate-900/50 rounded-lg border border-slate-800 overflow-hidden">
                <button 
                  type="button" 
                  onClick={() => setShowMistakes(!showMistakes)}
                  className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-slate-800 transition"
                >
                   <span className="text-xs font-bold text-slate-400 uppercase flex items-center">
                      <AlertTriangle size={14} className="mr-2 text-red-500" />
                      Mistakes / Errors
                       {!showMistakes && formData.mistakes && formData.mistakes.length > 0 && (
                          <span className="ml-2 text-[10px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded-full">
                              {formData.mistakes.length} Selected
                          </span>
                      )}
                   </span>
                   {showMistakes ? <ChevronUp size={16} className="text-slate-500"/> : <ChevronDown size={16} className="text-slate-500"/>}
                </button>
                
                {showMistakes && (
                   <div className="p-4 pt-0 border-t border-slate-800 animate-fade-in mt-2">
                       <div className="flex flex-wrap gap-2">
                         {COMMON_MISTAKES.map(item => (
                           <button
                             key={item} type="button"
                             onClick={() => toggleArrayItem('mistakes', item)}
                             className={`text-xs px-2 py-1.5 rounded-md border transition font-medium ${formData.mistakes?.includes(item) ? 'bg-red-500/20 border-red-500 text-red-400' : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-300'}`}
                           >
                             {item}
                           </button>
                         ))}
                       </div>
                   </div>
                )}
             </div>

           </div>
        </div>

        <div className="flex justify-end space-x-4 pt-6 border-t border-slate-700">
          <button type="button" onClick={onCancel} className="px-6 py-2.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition font-medium">
            Cancel
          </button>
          <button type="submit" className="flex items-center px-8 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition shadow-lg shadow-indigo-900/50">
            <Save size={18} className="mr-2" />
            Save Log
          </button>
        </div>

      </form>
    </div>
  );
};

export default TradeForm;