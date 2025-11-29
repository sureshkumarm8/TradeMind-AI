import React, { useState, useEffect, useRef } from 'react';
import { Trade, TradeDirection, TradeOutcome, OptionType, Timeframe, OpeningType } from '../types';
import { Save, X, AlertTriangle, CheckCircle2, ExternalLink, Clock, Target, Calculator, ChevronDown, ChevronUp, TrendingUp, TrendingDown, Activity, Calendar, Zap, Mic, Loader2, BarChart2, StopCircle } from 'lucide-react';
import { parseVoiceCommand } from '../services/geminiService';

interface TradeFormProps {
  onSave: (trade: Trade) => void;
  onCancel: () => void;
  initialData?: Trade;
  apiKey?: string;
}

const COMMON_CONFLUENCES = [
  "VWAP Support/Res", "CPR Breakout", "20 EMA Trend", "Day High/Low Break", 
  "OI Data Support", "Gap Fill", "Trendline Break", "Fibonacci Retracement",
  "Pivot Point Reversal", "Volume Spike", "Candlestick Pattern", 
  "Sector Strength", "Price Action Rejection", "Chart Pattern",
  "Support/Resistance Flip", "RSI Divergence", "Higher Timeframe Alignment"
];

const COMMON_MISTAKES = [
  "FOMO Entry", "Revenge Trading", "Moved Stop Loss", "Early Exit", 
  "Overtrading", "Counter-Trend", "Position Size Too Big", "Did Not Wait 15m",
  "Chasing Price", "Averaging Losers", "Hesitation", "Ignored Higher Timeframe",
  "Distracted / Bored", "Trading P&L Not Chart", "Poor Risk/Reward", "News Impulse"
];

const TradeForm: React.FC<TradeFormProps> = ({ onSave, onCancel, initialData, apiKey }) => {
  // Toggle states for foldable sections
  const [showConfluences, setShowConfluences] = useState(false);
  const [showMistakes, setShowMistakes] = useState(false);
  
  // Real-time PnL calc for UI feedback
  const [livePnL, setLivePnL] = useState<number | null>(null);

  // Voice State (MediaRecorder)
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Safe initialization logic
  const [formData, setFormData] = useState<Partial<Trade>>(() => {
    const defaults = {
        date: new Date().toISOString().split('T')[0],
        entryTime: '09:15', // Default to Market Open (AM)
        exitTime: '09:30',  // Default to 15m later (AM)
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
    if (initialData?.confluences && initialData.confluences.length > 0) setShowConfluences(true);
    if (initialData?.mistakes && initialData.mistakes.length > 0) setShowMistakes(true);
  }, []);

  // Auto-calculate duration
  useEffect(() => {
    if (formData.date && formData.entryTime && formData.exitTime) {
      const start = new Date(`${formData.date}T${formData.entryTime}`);
      const end = new Date(`${formData.date}T${formData.exitTime}`);
      if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
          const diffMs = end.getTime() - start.getTime();
          const diffMins = Math.round(diffMs / 60000);
          
          if (diffMins > 0) {
            setFormData(prev => ({
                ...prev,
                tradeDurationMins: diffMins,
                systemChecks: {
                    ...(prev.systemChecks || {
                        analyzedPreMarket: false,
                        waitedForOpen: false,
                        checkedSensibullOI: false,
                        exitTimeLimit: false
                    }),
                    exitTimeLimit: diffMins <= 30
                }
            }));
          }
      }
    }
  }, [formData.date, formData.entryTime, formData.exitTime]);

  // Auto-calculate Spot Points
  useEffect(() => {
    if (formData.niftyEntryPrice && formData.niftyExitPrice) {
      let points = 0;
      if (formData.direction === TradeDirection.LONG) {
        points = formData.niftyExitPrice - formData.niftyEntryPrice;
      } else {
        points = formData.niftyEntryPrice - formData.niftyExitPrice;
      }
      const calculatedPoints = parseFloat(points.toFixed(2));
      setFormData(prev => {
        if (prev.spotPointsCaptured === calculatedPoints) return prev;
        return { ...prev, spotPointsCaptured: calculatedPoints };
      });
    }
  }, [formData.niftyEntryPrice, formData.niftyExitPrice, formData.direction]);

  // Live PnL Feedback
  useEffect(() => {
    if (formData.entryPrice && formData.exitPrice && formData.quantity) {
        const diff = formData.exitPrice - formData.entryPrice;
        const pnl = formData.direction === TradeDirection.LONG 
            ? diff * formData.quantity 
            : (formData.entryPrice - formData.exitPrice) * formData.quantity;
        setLivePnL(pnl);
        
        // Auto-set outcome if not manually overridden to OPEN
        if (formData.outcome !== TradeOutcome.OPEN) {
             let suggestedOutcome = TradeOutcome.BREAK_EVEN;
             if (pnl > 0) suggestedOutcome = TradeOutcome.WIN;
             if (pnl < 0) suggestedOutcome = TradeOutcome.LOSS;
             
             setFormData(prev => {
                 if (prev.outcome === suggestedOutcome) return prev;
                 return { ...prev, outcome: suggestedOutcome };
             });
        }
    } else {
        setLivePnL(null);
    }
  }, [formData.entryPrice, formData.exitPrice, formData.quantity, formData.direction]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) : value
    }));
  };

  const setField = (field: keyof Trade, value: any) => {
      setFormData(prev => ({ ...prev, [field]: value }));
  }

  const handleSystemCheckChange = (name: string) => {
    setFormData(prev => ({
      ...prev,
      systemChecks: {
        ...(prev.systemChecks as any),
        [name]: !(prev.systemChecks as any)[name]
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

  // --- Voice Log Logic (MediaRecorder) ---
  const startRecording = async () => {
    if (!apiKey && !process.env.API_KEY) {
       alert("Please add your Gemini API Key in Settings to use Voice Log.");
       return;
    }

    try {
       const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
       const mediaRecorder = new MediaRecorder(stream);
       mediaRecorderRef.current = mediaRecorder;
       audioChunksRef.current = [];

       mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
             audioChunksRef.current.push(event.data);
          }
       };

       mediaRecorder.onstop = async () => {
          setIsProcessingVoice(true);
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          
          // Convert to Base64
          const reader = new FileReader();
          reader.readAsDataURL(audioBlob);
          reader.onloadend = async () => {
             const base64String = (reader.result as string).split(',')[1];
             try {
                const parsed = await parseVoiceCommand(base64String, apiKey);
                setFormData(prev => ({ ...prev, ...parsed }));
             } catch(e) {
                console.error(e);
                alert("Failed to analyze voice note.");
             } finally {
                setIsProcessingVoice(false);
             }
          };
          
          // Stop tracks
          stream.getTracks().forEach(track => track.stop());
       };

       mediaRecorder.start();
       setIsRecording(true);

    } catch (e) {
       console.error("Mic Error:", e);
       alert("Microphone access denied or not supported.");
    }
  };

  const stopRecording = () => {
      if (mediaRecorderRef.current && isRecording) {
          mediaRecorderRef.current.stop();
          setIsRecording(false);
      }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trade: Trade = {
      ...formData as Trade,
      id: initialData?.id || crypto.randomUUID(),
      pnl: livePnL || 0,
    };
    onSave(trade);
  };

  return (
    <div className="max-w-6xl mx-auto pb-12 animate-fade-in-up">
      {/* 🚀 Header Actions */}
      <div className="flex justify-between items-center mb-6">
         <div>
            <h2 className="text-2xl font-black text-white tracking-tight flex items-center">
               {initialData ? <Activity className="mr-3 text-indigo-400"/> : <Zap className="mr-3 text-indigo-400"/>}
               {initialData ? 'Mission Update' : 'New Mission Log'}
            </h2>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">Nifty 50 Intraday Protocol</p>
         </div>
         <div className="flex space-x-2">
            <a href="https://web.sensibull.com/open-interest/oi-vs-strike?tradingsymbol=NIFTY" target="_blank" rel="noopener noreferrer" className="flex items-center text-xs bg-slate-800 text-orange-400 border border-slate-700 px-3 py-2 rounded-lg hover:border-orange-500 hover:bg-slate-700 transition font-bold uppercase tracking-wide">
               <ExternalLink size={12} className="mr-2"/> OI Data
            </a>
            <a href="https://kite.zerodha.com/markets/ext/chart/web/tvc/INDICES/NIFTY%2050/256265" target="_blank" rel="noopener noreferrer" className="flex items-center text-xs bg-slate-800 text-blue-400 border border-slate-700 px-3 py-2 rounded-lg hover:border-blue-500 hover:bg-slate-700 transition font-bold uppercase tracking-wide">
               <ExternalLink size={12} className="mr-2"/> Chart
            </a>
            <button onClick={onCancel} className="p-2 bg-slate-800 text-slate-400 rounded-lg hover:text-white hover:bg-slate-700 border border-slate-700">
               <X size={18}/>
            </button>
         </div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* ---------------- LEFT COLUMN: SPECS & NUMBERS ---------------- */}
        <div className="lg:col-span-2 space-y-6">
            
            {/* 1. Mission Specs Card */}
            <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-xl relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                  <Target size={120} />
               </div>
               
               <h3 className="text-indigo-400 text-xs font-black uppercase tracking-widest mb-6 flex items-center justify-between">
                  <span className="flex items-center"><BarChart2 size={14} className="mr-2"/> Mission Specifications</span>
                  
                  {/* VOICE COMMAND BUTTON */}
                  <button 
                     type="button" 
                     onClick={isRecording ? stopRecording : startRecording}
                     disabled={isProcessingVoice}
                     className={`flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold uppercase transition ${isRecording ? 'bg-red-500 text-white animate-pulse' : 'bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600/40'}`}
                  >
                     {isProcessingVoice ? <Loader2 size={12} className="animate-spin"/> : isRecording ? <StopCircle size={12}/> : <Mic size={12} />}
                     {isRecording ? 'Recording...' : isProcessingVoice ? 'Processing...' : 'Voice Log'}
                  </button>
               </h3>

               <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
                   {/* Direction Toggle (Big Segmented Control) */}
                   <div className="col-span-2">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">Market View</label>
                      <div className="flex bg-slate-900/50 p-1 rounded-xl border border-slate-700">
                         <button
                           type="button"
                           onClick={() => setField('direction', TradeDirection.LONG)}
                           className={`flex-1 flex items-center justify-center py-2.5 rounded-lg text-sm font-black transition-all ${formData.direction === TradeDirection.LONG ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50' : 'text-slate-500 hover:text-white'}`}
                         >
                            <TrendingUp size={16} className="mr-2"/> LONG
                         </button>
                         <button
                           type="button"
                           onClick={() => setField('direction', TradeDirection.SHORT)}
                           className={`flex-1 flex items-center justify-center py-2.5 rounded-lg text-sm font-black transition-all ${formData.direction === TradeDirection.SHORT ? 'bg-amber-600 text-white shadow-lg shadow-amber-900/50' : 'text-slate-500 hover:text-white'}`}
                         >
                            <TrendingDown size={16} className="mr-2"/> SHORT
                         </button>
                      </div>
                   </div>

                   {/* Date */}
                   <div>
                       <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">Date</label>
                       <div className="relative">
                          <input type="date" name="date" required value={formData.date} onChange={handleChange} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm font-mono focus:border-indigo-500 outline-none" />
                          <Calendar size={14} className="absolute right-3 top-3 text-slate-600 pointer-events-none"/>
                       </div>
                   </div>

                   {/* Opening Type */}
                   <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">Market Open</label>
                      <select name="openingType" value={formData.openingType} onChange={handleChange} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:border-indigo-500 outline-none appearance-none">
                          <option value={OpeningType.FLAT}>Flat</option>
                          <option value={OpeningType.GAP_UP}>Gap Up</option>
                          <option value={OpeningType.GAP_DOWN}>Gap Down</option>
                      </select>
                   </div>
               </div>

               <div className="grid grid-cols-2 md:grid-cols-12 gap-4 mt-5 pt-5 border-t border-slate-700/50">
                   {/* Instrument */}
                   <div className="md:col-span-3">
                       <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Instrument</label>
                       <input type="text" name="instrument" value={formData.instrument} onChange={handleChange} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-bold focus:border-indigo-500 outline-none uppercase" />
                   </div>
                   {/* Type */}
                   <div className="md:col-span-3">
                       <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Type</label>
                       <div className="flex bg-slate-900 rounded-lg border border-slate-700 p-0.5">
                          {[OptionType.CE, OptionType.PE, OptionType.FUT].map(t => (
                              <button key={t} type="button" onClick={() => setField('optionType', t)} className={`flex-1 text-[10px] font-bold py-1.5 rounded transition ${formData.optionType === t ? (t === OptionType.CE ? 'bg-green-600 text-white' : t === OptionType.PE ? 'bg-red-600 text-white' : 'bg-indigo-600 text-white') : 'text-slate-500'}`}>{t}</button>
                          ))}
                       </div>
                   </div>
                   {/* Strike */}
                   <div className="md:col-span-3">
                       <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Strike</label>
                       <input type="number" name="strikePrice" placeholder="21500" value={formData.strikePrice || ''} onChange={handleChange} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono focus:border-indigo-500 outline-none" />
                   </div>
                   {/* Timeframe */}
                   <div className="md:col-span-3">
                       <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Timeframe</label>
                       <select name="timeframe" value={formData.timeframe} onChange={handleChange} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs focus:border-indigo-500 outline-none">
                          <option value={Timeframe.M1}>1 min</option>
                          <option value={Timeframe.M3}>3 min</option>
                          <option value={Timeframe.M5}>5 min</option>
                          <option value={Timeframe.M15}>15 min</option>
                       </select>
                   </div>
               </div>
            </div>

            {/* 2. Telemetry Card (The Numbers) */}
            <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-xl relative overflow-hidden">
               <h3 className="text-emerald-400 text-xs font-black uppercase tracking-widest mb-6 flex items-center">
                  <Calculator size={14} className="mr-2"/> Trade Telemetry
               </h3>

               {/* Time & Duration */}
               <div className="grid grid-cols-3 gap-4 mb-6">
                   <div>
                       <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Entry Time</label>
                       <input type="time" name="entryTime" value={formData.entryTime} onChange={handleChange} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono text-sm focus:border-emerald-500 outline-none" />
                   </div>
                   <div>
                       <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Exit Time</label>
                       <input type="time" name="exitTime" value={formData.exitTime} onChange={handleChange} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono text-sm focus:border-emerald-500 outline-none" />
                   </div>
                   <div>
                       <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Duration</label>
                       <div className="bg-slate-900/50 border border-slate-700 rounded-lg px-3 py-2 text-slate-300 font-mono text-sm flex items-center">
                           <Clock size={12} className="mr-2 text-slate-500"/> {formData.tradeDurationMins}m
                       </div>
                   </div>
               </div>

               {/* Prices Grid */}
               <div className="grid grid-cols-2 md:grid-cols-12 gap-4">
                  {/* Nifty Spot */}
                  <div className="col-span-1 md:col-span-3">
                      <label className="block text-[10px] font-bold text-emerald-600 uppercase mb-1">Spot Entry</label>
                      <input type="number" step="0.05" name="niftyEntryPrice" value={formData.niftyEntryPrice || ''} onChange={handleChange} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono focus:border-emerald-500 outline-none" placeholder="21500" />
                  </div>
                  <div className="col-span-1 md:col-span-3">
                      <label className="block text-[10px] font-bold text-emerald-600 uppercase mb-1">Spot Exit</label>
                      <input type="number" step="0.05" name="niftyExitPrice" value={formData.niftyExitPrice || ''} onChange={handleChange} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono focus:border-emerald-500 outline-none" placeholder="21530" />
                  </div>

                  {/* Premium */}
                  <div className="col-span-1 md:col-span-3">
                      <label className="block text-[10px] font-bold text-blue-400 uppercase mb-1">Prem Entry ₹</label>
                      <input type="number" step="0.05" name="entryPrice" required value={formData.entryPrice || ''} onChange={handleChange} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono focus:border-blue-500 outline-none" />
                  </div>
                  <div className="col-span-1 md:col-span-3">
                      <label className="block text-[10px] font-bold text-blue-400 uppercase mb-1">Prem Exit ₹</label>
                      <input type="number" step="0.05" name="exitPrice" value={formData.exitPrice || ''} onChange={handleChange} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono focus:border-blue-500 outline-none" />
                  </div>
                  
                  {/* Quantity - Full Width on Mobile */}
                  <div className="col-span-2 md:col-span-12 mt-2">
                       <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Quantity</label>
                       <div className="flex items-center gap-4">
                           <input type="number" name="quantity" value={formData.quantity} onChange={handleChange} className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-lg font-mono font-bold text-white focus:border-indigo-500 outline-none" />
                           <div className="flex gap-2">
                               {[50, 75, 100, 150].map(q => (
                                   <button key={q} type="button" onClick={() => setField('quantity', q)} className="px-3 py-2 bg-slate-800 border border-slate-600 rounded text-xs font-bold text-slate-400 hover:text-white hover:border-slate-400 transition">{q}</button>
                               ))}
                           </div>
                       </div>
                  </div>
               </div>
            </div>

            {/* 3. Narrative & Context */}
            <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-xl">
                 <h3 className="text-slate-400 text-xs font-black uppercase tracking-widest mb-4 flex items-center">
                    <Activity size={14} className="mr-2"/> Trade Narrative
                 </h3>
                 <div className="space-y-4">
                    <div>
                        <input type="text" name="setupName" value={formData.setupName} onChange={handleChange} placeholder="Setup Name (e.g. 5m VWAP Rejection)" className="w-full bg-slate-900 border-b border-slate-700 px-3 py-2 text-white text-sm focus:border-indigo-500 outline-none transition" />
                    </div>
                    <div>
                        <textarea name="marketContext" rows={2} value={formData.marketContext} onChange={handleChange} placeholder="Market Context (Gap Up, Trending, Rangebound...)" className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-300 text-xs focus:border-indigo-500 outline-none resize-none" />
                    </div>
                    <div>
                        <textarea name="entryReason" rows={2} value={formData.entryReason} onChange={handleChange} placeholder="Entry Logic (Why take this trade?)" className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-300 text-xs focus:border-indigo-500 outline-none resize-none" />
                    </div>
                 </div>

                 {/* Collapsible Chips */}
                 <div className="mt-6 space-y-4">
                     {/* Confluences */}
                     <div className="border border-slate-700 rounded-xl overflow-hidden">
                        <button type="button" onClick={() => setShowConfluences(!showConfluences)} className="w-full flex items-center justify-between p-3 bg-slate-900/50 hover:bg-slate-900 transition">
                            <span className="text-xs font-bold text-emerald-400 uppercase flex items-center"><CheckCircle2 size={14} className="mr-2"/> Confluences {formData.confluences && formData.confluences.length > 0 && `(${formData.confluences.length})`}</span>
                            {showConfluences ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
                        </button>
                        {showConfluences && (
                            <div className="p-3 bg-slate-900 border-t border-slate-800 flex flex-wrap gap-2 animate-fade-in">
                                {COMMON_CONFLUENCES.map(c => (
                                    <button key={c} type="button" onClick={() => toggleArrayItem('confluences', c)} className={`text-[10px] px-2 py-1 rounded border transition ${formData.confluences?.includes(c) ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : 'bg-slate-800 border-slate-700 text-slate-500 hover:text-slate-300'}`}>
                                        {c}
                                    </button>
                                ))}
                            </div>
                        )}
                     </div>

                     {/* Mistakes */}
                     <div className="border border-slate-700 rounded-xl overflow-hidden">
                        <button type="button" onClick={() => setShowMistakes(!showMistakes)} className="w-full flex items-center justify-between p-3 bg-slate-900/50 hover:bg-slate-900 transition">
                            <span className="text-xs font-bold text-red-400 uppercase flex items-center"><AlertTriangle size={14} className="mr-2"/> Mistakes {formData.mistakes && formData.mistakes.length > 0 && `(${formData.mistakes.length})`}</span>
                            {showMistakes ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
                        </button>
                        {showMistakes && (
                            <div className="p-3 bg-slate-900 border-t border-slate-800 flex flex-wrap gap-2 animate-fade-in">
                                {COMMON_MISTAKES.map(c => (
                                    <button key={c} type="button" onClick={() => toggleArrayItem('mistakes', c)} className={`text-[10px] px-2 py-1 rounded border transition ${formData.mistakes?.includes(c) ? 'bg-red-500/20 border-red-500 text-red-400' : 'bg-slate-800 border-slate-700 text-slate-500 hover:text-slate-300'}`}>
                                        {c}
                                    </button>
                                ))}
                            </div>
                        )}
                     </div>
                 </div>
            </div>
        </div>


        {/* ---------------- RIGHT COLUMN: HUD & ACTIONS ---------------- */}
        <div className="lg:col-span-1 space-y-6">
            
            {/* 🛑 Live PnL HUD (Sticky) */}
            <div className={`bg-slate-900 p-6 rounded-2xl border-2 shadow-2xl transition-colors duration-500 ${livePnL && livePnL > 0 ? 'border-emerald-500 shadow-emerald-500/20' : livePnL && livePnL < 0 ? 'border-red-500 shadow-red-500/20' : 'border-slate-700'}`}>
                <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2 text-center">Estimated Outcome</h4>
                <div className="text-center">
                    <span className={`text-4xl font-black font-mono tracking-tight ${livePnL && livePnL > 0 ? 'text-emerald-400' : livePnL && livePnL < 0 ? 'text-red-400' : 'text-slate-400'}`}>
                        {livePnL ? (livePnL > 0 ? '+' : '') : ''}₹{livePnL ? livePnL.toFixed(2) : '0.00'}
                    </span>
                    <div className="flex justify-center gap-4 mt-4 text-[10px] font-bold uppercase text-slate-500">
                        <span className="flex items-center"><Target size={12} className="mr-1"/> {formData.spotPointsCaptured || 0} pts</span>
                        <span>•</span>
                        <span className="flex items-center"><Clock size={12} className="mr-1"/> {formData.tradeDurationMins || 0}m</span>
                    </div>
                </div>

                {/* Outcome Toggle */}
                <div className="mt-6 p-1 bg-slate-950 rounded-xl border border-slate-800 flex">
                     {[TradeOutcome.WIN, TradeOutcome.LOSS, TradeOutcome.BREAK_EVEN].map(o => (
                         <button
                            key={o} type="button"
                            onClick={() => setField('outcome', o)}
                            className={`flex-1 py-2 rounded-lg text-[10px] font-bold uppercase transition ${formData.outcome === o ? (o === TradeOutcome.WIN ? 'bg-emerald-600 text-white' : o === TradeOutcome.LOSS ? 'bg-red-600 text-white' : 'bg-slate-600 text-white') : 'text-slate-500 hover:text-white'}`}
                         >
                            {o}
                         </button>
                     ))}
                </div>
            </div>

            {/* 🚦 System Pre-Flight Checks */}
            <div className="bg-slate-800 p-5 rounded-2xl border border-slate-700 shadow-lg">
                <h3 className="text-amber-400 text-xs font-black uppercase tracking-widest mb-4 flex items-center">
                   <Zap size={14} className="mr-2"/> System Protocol
                </h3>
                <div className="space-y-3">
                     {[
                        { key: 'analyzedPreMarket', label: 'Pre-Market Analysis' },
                        { key: 'waitedForOpen', label: 'Waited 15m Open' },
                        { key: 'checkedSensibullOI', label: 'Verified OI Data' },
                        { key: 'exitTimeLimit', label: 'Exit Rule (15-30m)' },
                     ].map((check) => (
                        <div key={check.key} className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg border border-slate-800">
                             <span className="text-xs font-bold text-slate-300">{check.label}</span>
                             <button
                                type="button"
                                onClick={() => handleSystemCheckChange(check.key)}
                                className={`w-10 h-6 rounded-full p-1 transition-colors duration-300 ease-in-out ${formData.systemChecks?.[check.key as keyof typeof formData.systemChecks] ? 'bg-indigo-500' : 'bg-slate-700'}`}
                             >
                                <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform duration-300 ${formData.systemChecks?.[check.key as keyof typeof formData.systemChecks] ? 'translate-x-4' : ''}`}></div>
                             </button>
                        </div>
                     ))}
                </div>
            </div>
            
            {/* Discipline Rating */}
            <div className="bg-slate-800 p-5 rounded-2xl border border-slate-700 shadow-lg">
                <h3 className="text-blue-400 text-xs font-black uppercase tracking-widest mb-4">Discipline Rating</h3>
                <div className="flex justify-between items-center bg-slate-900/50 p-2 rounded-xl">
                    {[1, 2, 3, 4, 5].map(star => (
                        <button
                          key={star} type="button"
                          onClick={() => setField('disciplineRating', star)}
                          className={`p-2 rounded-lg transition hover:scale-110 ${formData.disciplineRating && formData.disciplineRating >= star ? 'text-yellow-400' : 'text-slate-700'}`}
                        >
                           <Zap size={20} fill={formData.disciplineRating && formData.disciplineRating >= star ? "currentColor" : "none"} />
                        </button>
                    ))}
                </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-4">
               <button type="submit" className="w-full py-4 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-black uppercase tracking-widest rounded-xl shadow-xl shadow-indigo-900/50 transition transform hover:scale-[1.02] flex items-center justify-center">
                  <Save size={18} className="mr-2"/> Save Mission Log
               </button>
            </div>

        </div>
      </form>
    </div>
  );
};

export default TradeForm;