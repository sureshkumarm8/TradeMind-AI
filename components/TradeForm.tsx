
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Trade, TradeDirection, TradeOutcome, OptionType, Timeframe, OpeningType, NotificationType, TradeNote, StrategyProfile } from '../types';
import { Save, X, AlertTriangle, CheckCircle2, ExternalLink, Clock, Target, Calculator, ChevronDown, ChevronUp, TrendingUp, TrendingDown, Activity, Calendar, Zap, Mic, Loader2, BarChart2, StopCircle, Image as ImageIcon, UploadCloud, Trash2, Send, MessageSquare, Plus, FlaskConical, CircleDollarSign, Bot, Terminal, ChevronRight } from 'lucide-react';
import { parseVoiceCommand, getLiveTradeCoachResponse } from '../services/geminiService';
import { compressImage } from '../services/imageService';

interface TradeFormProps {
  onSave: (trade: Trade) => void;
  onCancel: () => void;
  initialData?: Trade;
  apiKey?: string;
  notify?: (message: string, type?: NotificationType) => void;
  onDelete?: (id: string) => void;
  preMarketDone?: boolean; // Prop to indicate if analysis exists for today
  strategyProfile?: StrategyProfile;
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

const COMMON_SETUPS = [
  "VWAP Rejection",
  "Day High Breakout", 
  "Day Low Breakdown",
  "CPR Reversal",
  "Support Bounce",
  "Resistance Rejection", 
  "Gap Fill",
  "Trendline Breakout",
  "Fibonacci Retracement",
  "Opening Range Breakout (ORB)",
  "Pullback Entry",
  "Fakeout / Trap"
];

const QUICK_THOUGHTS = [
    { label: "Nervous", type: 'emotion' },
    { label: "Confident", type: 'emotion' },
    { label: "Price Stalling", type: 'market' },
    { label: "Momentum Strong", type: 'market' },
    { label: "Target Near", type: 'logic' },
    { label: "Adding Qty", type: 'logic' }
];

// --- Sub-component: Live Coach Chat ---
const LiveCoachWidget = ({ apiKey, currentTradeData, strategyProfile }: { apiKey?: string, currentTradeData: Partial<Trade>, strategyProfile?: StrategyProfile }) => {
    const [messages, setMessages] = useState<{role: 'user'|'model', text: string, image?: string}[]>([
        { role: 'model', text: "Tactical Co-Pilot Online. I'm monitoring your inputs. Need a setup check?" }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [chatImage, setChatImage] = useState<string | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim() && !chatImage) return;
        if (!apiKey || !strategyProfile) {
            alert("API Key and Strategy required.");
            return;
        }

        const userMsg = { role: 'user' as const, text: input, image: chatImage || undefined };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setChatImage(null);
        setIsLoading(true);

        try {
            // Construct history for API
            const history = messages.map(m => ({
                role: m.role,
                parts: [
                    { text: m.text },
                    ...(m.image ? [{ inlineData: { mimeType: 'image/jpeg', data: m.image.split(',')[1] } }] : [])
                ]
            }));
            
            // Add current message to history payload
            history.push({
                role: 'user',
                parts: [
                    { text: userMsg.text },
                    ...(userMsg.image ? [{ inlineData: { mimeType: 'image/jpeg', data: userMsg.image.split(',')[1] } }] : [])
                ]
            });

            const response = await getLiveTradeCoachResponse(history, currentTradeData, strategyProfile, apiKey);
            setMessages(prev => [...prev, { role: 'model', text: response }]);
        } catch (e) {
            setMessages(prev => [...prev, { role: 'model', text: "Connection Error. Try again." }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            try {
                const compressed = await compressImage(file);
                setChatImage(compressed);
            } catch (e) {
                alert("Image upload failed");
            }
        }
    }

    return (
        <div className="bg-slate-900 border border-indigo-500/30 rounded-xl flex flex-col h-[400px] overflow-hidden shadow-2xl relative">
            <div className="bg-indigo-900/30 p-3 border-b border-indigo-500/20 flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <Bot size={16} className="text-indigo-400"/>
                    <span className="text-xs font-black uppercase tracking-wider text-indigo-100">Live Co-Pilot</span>
                </div>
                <div className="flex gap-1">
                    <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                </div>
            </div>
            
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar bg-slate-950/50">
                {messages.map((m, i) => (
                    <div key={i} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                        <div className={`p-2.5 rounded-xl max-w-[90%] text-xs ${m.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-slate-800 text-slate-200 border border-slate-700 rounded-tl-none'}`}>
                            {m.image && <img src={m.image} alt="Context" className="w-full h-auto rounded-lg mb-2 border border-white/10" />}
                            <p className="whitespace-pre-wrap leading-relaxed">{m.text}</p>
                        </div>
                    </div>
                ))}
                {isLoading && (
                    <div className="flex items-start">
                        <div className="bg-slate-800 p-2 rounded-xl rounded-tl-none border border-slate-700">
                            <Loader2 size={14} className="animate-spin text-indigo-400"/>
                        </div>
                    </div>
                )}
            </div>

            <div className="p-2 bg-slate-900 border-t border-slate-800">
                {chatImage && (
                    <div className="flex items-center gap-2 bg-slate-800 p-1.5 rounded-lg mb-2 border border-slate-700">
                        <img src={chatImage} className="w-8 h-8 rounded object-cover" />
                        <span className="text-[10px] text-slate-400 flex-1 truncate">Image attached</span>
                        <button onClick={() => setChatImage(null)}><X size={14} className="text-slate-500 hover:text-white"/></button>
                    </div>
                )}
                <div className="flex gap-2">
                    <label className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg cursor-pointer text-slate-400 hover:text-white transition border border-slate-700">
                        <ImageIcon size={16}/>
                        <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload}/>
                    </label>
                    <input 
                        className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:border-indigo-500 outline-none"
                        placeholder="Ask coach..."
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSend()}
                    />
                    <button onClick={handleSend} disabled={isLoading || (!input && !chatImage)} className="p-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-white disabled:opacity-50">
                        <Send size={16}/>
                    </button>
                </div>
            </div>
        </div>
    );
}

const TradeForm: React.FC<TradeFormProps> = ({ onSave, onCancel, initialData, apiKey, notify, onDelete, preMarketDone, strategyProfile }) => {
  // Toggle states for foldable sections
  const [showConfluences, setShowConfluences] = useState(false);
  const [showMistakes, setShowMistakes] = useState(false);
  
  // Real-time PnL calc for UI feedback
  const [livePnL, setLivePnL] = useState<number | null>(null);

  // Commentary State
  const [currentNote, setCurrentNote] = useState('');
  const notesContainerRef = useRef<HTMLDivElement>(null);

  // Voice State (MediaRecorder)
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Safe initialization logic
  const [formData, setFormData] = useState<Partial<Trade>>(() => {
    // Current time for Entry Time default
    const now = new Date();
    const currentTime = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

    const defaults = {
        date: new Date().toISOString().split('T')[0],
        entryTime: currentTime, 
        exitTime: '',
        instrument: 'NIFTY 50',
        executionType: 'PAPER', // Default to Paper Trading
        optionType: OptionType.CE,
        timeframe: Timeframe.M5,
        direction: TradeDirection.LONG,
        quantity: 75,
        followedSystem: true,
        disciplineRating: 0, // Default to 0, will be updated by AI
        outcome: TradeOutcome.OPEN,
        emotionalState: 'Neutral',
        setupName: '',
        marketContext: '',
        entryReason: '',
        exitReason: '',
        notes: [], // New Timeline
        confluences: [],
        mistakes: [],
        entryPrice: 0,
        niftyEntryPrice: 0,
        niftyExitPrice: 0,
        openingType: OpeningType.FLAT,
        spotPointsCaptured: 0,
        tradeDurationMins: 0,
        chartImage: '',
        oiImage: '',
        systemChecks: {
            analyzedPreMarket: preMarketDone || false, // Auto-check if preMarketDone is true
            waitedForOpen: false,
            checkedSensibullOI: false,
            exitTimeLimit: false
        }
    };

    if (initialData) {
        return {
            ...defaults,
            ...initialData,
            executionType: initialData.executionType || 'PAPER', // Fallback for old data
            notes: initialData.notes || [],
            systemChecks: {
                ...defaults.systemChecks,
                ...(initialData.systemChecks || {})
            }
        };
    }

    return defaults as Partial<Trade>;
  });

  // Calculate ROI % in Realtime
  const pnlPercentage = useMemo(() => {
    const entry = Number(formData.entryPrice);
    const exit = Number(formData.exitPrice);
    
    if (!entry || !exit) return null;
    
    const diff = formData.direction === TradeDirection.LONG 
        ? (exit - entry) 
        : (entry - exit);
        
    return (diff / entry) * 100;
  }, [formData.entryPrice, formData.exitPrice, formData.direction]);
  
  // Auto-expand sections if editing and they have data
  useEffect(() => {
    if (initialData?.confluences && initialData.confluences.length > 0) setShowConfluences(true);
    if (initialData?.mistakes && initialData.mistakes.length > 0) setShowMistakes(true);
  }, []);

  // Scroll to bottom of notes when added
  useEffect(() => {
     if (notesContainerRef.current) {
         notesContainerRef.current.scrollTop = notesContainerRef.current.scrollHeight;
     }
  }, [formData.notes]);

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
    // Only calculate if both values exist
    if (formData.niftyEntryPrice && formData.niftyExitPrice) {
      let points = 0;
      if (formData.direction === TradeDirection.LONG) {
        points = formData.niftyExitPrice - formData.niftyEntryPrice;
      } else {
        points = formData.niftyEntryPrice - formData.niftyExitPrice;
      }
      const calculatedPoints = parseFloat(points.toFixed(2));
      
      setFormData(prev => {
        // Prevent infinite loop if value is same
        if (prev.spotPointsCaptured === calculatedPoints) return prev;
        return { ...prev, spotPointsCaptured: calculatedPoints };
      });
    }
  }, [formData.niftyEntryPrice, formData.niftyExitPrice, formData.direction]);

  // Live PnL Feedback & Outcome Auto-set
  useEffect(() => {
    if (formData.entryPrice && formData.exitPrice && formData.quantity) {
        const diff = formData.exitPrice - formData.entryPrice;
        const pnl = formData.direction === TradeDirection.LONG 
            ? diff * formData.quantity 
            : (formData.entryPrice - formData.exitPrice) * formData.quantity;
        setLivePnL(pnl);
        
        let suggestedOutcome = TradeOutcome.BREAK_EVEN;
        if (pnl > 0) suggestedOutcome = TradeOutcome.WIN;
        if (pnl < 0) suggestedOutcome = TradeOutcome.LOSS;
             
        setFormData(prev => {
             // Only update if outcome matches one of the results or is open. 
             // We prioritize the calculated outcome based on price.
             if (prev.outcome === suggestedOutcome) return prev;
             return { ...prev, outcome: suggestedOutcome };
        });
    } else {
        setLivePnL(null);
        // If exit price is removed, revert to OPEN
        if (!formData.exitPrice) {
            setFormData(prev => {
                if (prev.outcome === TradeOutcome.OPEN) return prev;
                return { ...prev, outcome: TradeOutcome.OPEN };
            });
        }
    }
  }, [formData.entryPrice, formData.exitPrice, formData.quantity, formData.direction]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) : value
    }));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: 'chartImage' | 'oiImage') => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
          const compressed = await compressImage(file);
          setFormData(prev => ({ ...prev, [field]: compressed }));
      } catch (err) {
          console.error("Image upload failed", err);
          if (notify) notify("Failed to process image", "error");
          else alert("Failed to process image. Try a smaller file.");
      }
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

  const addNote = (text: string, type: 'logic' | 'emotion' | 'market' = 'logic') => {
      if (!text.trim()) return;
      
      const newNote: TradeNote = {
          id: crypto.randomUUID(),
          timestamp: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          content: text,
          type
      };

      setFormData(prev => ({
          ...prev,
          notes: [...(prev.notes || []), newNote]
      }));
      setCurrentNote('');
  };

  // --- Voice Log Logic (MediaRecorder) ---
  const startRecording = async () => {
    if (!apiKey && !process.env.API_KEY) {
       if (notify) notify("API Key Required for Voice Log", "error");
       else alert("Please add your Gemini API Key in Settings to use Voice Log.");
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
                
                // If it's just a note (not full trade data), append to timeline
                if (parsed.note) {
                    addNote(parsed.note, 'logic');
                    if (notify) notify("Voice note added", "success");
                } else {
                    // It's structured data (e.g. initial entry)
                    setFormData(prev => ({ ...prev, ...parsed }));
                    if (parsed.entryReason) addNote(parsed.entryReason, 'logic');
                    if (notify) notify("Mission data updated", "success");
                }
             } catch(e) {
                console.error(e);
                if (notify) notify("Failed to analyze voice", "error");
                else alert("Failed to analyze voice note.");
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
       if (notify) notify("Mic Access Denied", "error");
       else alert("Microphone access denied or not supported.");
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
      // Concatenate notes into legacy text fields for CSV backward compatibility
      entryReason: formData.entryReason || (formData.notes?.[0]?.content) || "No reason logged",
      marketContext: formData.marketContext || "Logged in timeline"
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

               {/* EXECUTION TYPE TOGGLE */}
               <div className="mb-6 flex justify-center">
                    <div className="bg-slate-900 p-1 rounded-xl border border-slate-700 inline-flex">
                        <button
                            type="button"
                            onClick={() => setField('executionType', 'PAPER')}
                            className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase flex items-center gap-2 transition-all ${formData.executionType === 'PAPER' ? 'bg-slate-700 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}
                        >
                            <FlaskConical size={14} /> Paper Sim
                        </button>
                        <button
                            type="button"
                            onClick={() => setField('executionType', 'REAL')}
                            className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase flex items-center gap-2 transition-all ${formData.executionType === 'REAL' ? 'bg-indigo-600 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}
                        >
                            <CircleDollarSign size={14} /> Real Money
                        </button>
                    </div>
               </div>

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

               {/* Prices Grid - REFACTORED FOR BETTER LAYOUT */}
               <div className="grid grid-cols-2 md:grid-cols-12 gap-4 mb-6">
                  {/* Nifty Spot */}
                  <div className="col-span-1 md:col-span-3">
                      <label className="block text-[10px] font-bold text-emerald-600 uppercase mb-1">Nifty Entry</label>
                      <input type="number" step="0.05" name="niftyEntryPrice" value={formData.niftyEntryPrice || ''} onChange={handleChange} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono focus:border-emerald-500 outline-none" placeholder="21500" />
                  </div>
                  <div className="col-span-1 md:col-span-3">
                      <label className="block text-[10px] font-bold text-emerald-600 uppercase mb-1">Nifty Exit</label>
                      <input type="number" step="0.05" name="niftyExitPrice" value={formData.niftyExitPrice || ''} onChange={handleChange} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono focus:border-emerald-500 outline-none" placeholder="21530" />
                  </div>

                  {/* Premium */}
                  <div className="col-span-1 md:col-span-2">
                      <label className="block text-[10px] font-bold text-blue-400 uppercase mb-1">Entry ₹</label>
                      <input type="number" step="0.05" name="entryPrice" required value={formData.entryPrice || ''} onChange={handleChange} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono focus:border-blue-500 outline-none" />
                  </div>
                  <div className="col-span-1 md:col-span-2">
                      <label className="block text-[10px] font-bold text-blue-400 uppercase mb-1">Exit ₹</label>
                      <input type="number" step="0.05" name="exitPrice" value={formData.exitPrice || ''} onChange={handleChange} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono focus:border-blue-500 outline-none" />
                  </div>
                  
                  {/* Quantity - NOW INLINE */}
                  <div className="col-span-2 md:col-span-2">
                       <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Qty</label>
                       <input type="number" name="quantity" value={formData.quantity} onChange={handleChange} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono font-bold focus:border-indigo-500 outline-none" />
                  </div>
               </div>

               {/* Time & Duration */}
               <div className="grid grid-cols-2 md:grid-cols-4 gap-4 border-t border-slate-700/50 pt-4">
                   <div>
                       <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Entry Time</label>
                       <input type="time" name="entryTime" value={formData.entryTime} onChange={handleChange} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono text-sm focus:border-emerald-500 outline-none" />
                   </div>
                   <div>
                       <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Exit Time</label>
                       <input 
                         type="time" 
                         name="exitTime" 
                         value={formData.exitTime} 
                         onChange={handleChange} 
                         className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono text-sm focus:border-emerald-500 outline-none" 
                        />
                   </div>
                   <div>
                       <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Duration</label>
                       <div className="bg-slate-900/50 border border-slate-700 rounded-lg px-3 py-2 text-slate-300 font-mono text-sm flex items-center">
                           <Clock size={12} className="mr-2 text-slate-500"/> {formData.tradeDurationMins}m
                       </div>
                   </div>
                   <div>
                       <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">ROI %</label>
                       <div className={`bg-slate-900/50 border border-slate-700 rounded-lg px-3 py-2 font-mono text-sm flex items-center ${pnlPercentage && pnlPercentage > 0 ? 'text-emerald-400' : pnlPercentage && pnlPercentage < 0 ? 'text-red-400' : 'text-slate-300'}`}>
                           <Activity size={12} className="mr-2 text-slate-500"/> 
                           {pnlPercentage !== null ? `${pnlPercentage > 0 ? '+' : ''}${pnlPercentage.toFixed(2)}%` : '-'}
                       </div>
                   </div>
               </div>
            </div>
            
            {/* 3. Narrative & Context (LIVE TIMELINE) + AI COACH */}
            <div className="flex flex-col gap-6">
                
                {/* LIVE TIMELINE */}
                <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-xl flex flex-col h-[400px]">
                     <div className="flex justify-between items-center mb-4">
                        <h3 className="text-slate-400 text-xs font-black uppercase tracking-widest flex items-center">
                            <MessageSquare size={14} className="mr-2 text-indigo-400"/> Live Mission Timeline
                        </h3>
                        <div className="text-[10px] text-slate-600 font-bold uppercase">Chat Logic</div>
                     </div>

                     {/* Timeline Feed */}
                     <div ref={notesContainerRef} className="flex-1 bg-slate-900/50 rounded-xl border border-slate-800 p-4 overflow-y-auto mb-4 custom-scrollbar space-y-4">
                        {formData.notes && formData.notes.length > 0 ? (
                            formData.notes.map(note => (
                                <div key={note.id} className="animate-fade-in flex gap-3">
                                    <div className="text-[10px] font-mono text-slate-500 pt-1 shrink-0">{note.timestamp.slice(0,5)}</div>
                                    <div className={`flex-1 text-sm p-3 rounded-tr-xl rounded-bl-xl rounded-br-xl ${note.type === 'emotion' ? 'bg-purple-900/20 text-purple-200 border border-purple-500/20' : note.type === 'market' ? 'bg-amber-900/20 text-amber-200 border border-amber-500/20' : 'bg-slate-800 text-slate-200 border border-slate-700'}`}>
                                        {note.content}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-slate-600 text-xs italic opacity-50">
                                <Zap size={24} className="mb-2"/>
                                Log your thoughts live...
                            </div>
                        )}
                     </div>

                     {/* Quick Chips */}
                     <div className="flex gap-2 mb-3 overflow-x-auto pb-1 custom-scrollbar">
                         {QUICK_THOUGHTS.map((qt, idx) => (
                             <button 
                                key={idx} 
                                type="button" 
                                onClick={() => addNote(qt.label, qt.type as any)}
                                className={`whitespace-nowrap px-3 py-1 rounded-full text-[10px] font-bold border transition ${qt.type === 'emotion' ? 'border-purple-500/30 text-purple-400 hover:bg-purple-500/10' : qt.type === 'market' ? 'border-amber-500/30 text-amber-400 hover:bg-amber-500/10' : 'border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10'}`}
                             >
                                {qt.label}
                             </button>
                         ))}
                     </div>

                     {/* Input Area */}
                     <div className="flex gap-2">
                         <input 
                            type="text" 
                            value={currentNote}
                            onChange={(e) => setCurrentNote(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addNote(currentNote))}
                            placeholder="Log thought..."
                            className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-sm text-white focus:border-indigo-500 outline-none"
                         />
                         <button 
                            type="button" 
                            onClick={() => addNote(currentNote)}
                            className="p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition"
                         >
                            <Send size={18}/>
                         </button>
                         <button 
                            type="button" 
                            onClick={isRecording ? stopRecording : startRecording}
                            className={`p-2 rounded-lg transition ${isRecording ? 'bg-red-500 text-white animate-pulse' : 'bg-slate-700 text-slate-400 hover:text-white'}`}
                            title="Voice Log (Append to Timeline)"
                         >
                            {isProcessingVoice ? <Loader2 size={18} className="animate-spin"/> : <Mic size={18}/>}
                         </button>
                     </div>
                </div>

                {/* NEW: LIVE COACH */}
                <LiveCoachWidget apiKey={apiKey} currentTradeData={formData} strategyProfile={strategyProfile} />
            </div>
            
            {/* 4. Evidence Locker (Images) */}
            <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-xl">
                 <h3 className="text-slate-400 text-xs font-black uppercase tracking-widest mb-4 flex items-center">
                    <ImageIcon size={14} className="mr-2 text-indigo-400"/> Evidence Locker
                 </h3>
                 
                 <div className="grid grid-cols-2 gap-4">
                     {/* Chart Upload */}
                     <div>
                         <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">Nifty Chart</label>
                         <div className="relative border-2 border-dashed border-slate-700 rounded-lg p-2 hover:border-indigo-500 transition group h-24 flex items-center justify-center bg-slate-900/30">
                             {formData.chartImage ? (
                                 <div className="relative w-full h-full">
                                     <img src={formData.chartImage} alt="Chart" className="w-full h-full object-cover rounded" />
                                     <button type="button" onClick={() => setField('chartImage', '')} className="absolute -top-1 -right-1 bg-red-600 rounded-full p-0.5"><X size={10} className="text-white"/></button>
                                 </div>
                             ) : (
                                 <div className="text-center">
                                     <UploadCloud size={20} className="mx-auto text-slate-500 group-hover:text-indigo-400 mb-1"/>
                                     <span className="text-[9px] text-slate-500">Upload Chart</span>
                                 </div>
                             )}
                             <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'chartImage')} className="absolute inset-0 opacity-0 cursor-pointer" />
                         </div>
                     </div>
                     
                     {/* OI Upload */}
                     <div>
                         <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">OI Data</label>
                         <div className="relative border-2 border-dashed border-slate-700 rounded-lg p-2 hover:border-orange-500 transition group h-24 flex items-center justify-center bg-slate-900/30">
                             {formData.oiImage ? (
                                 <div className="relative w-full h-full">
                                     <img src={formData.oiImage} alt="OI" className="w-full h-full object-cover rounded" />
                                     <button type="button" onClick={() => setField('oiImage', '')} className="absolute -top-1 -right-1 bg-red-600 rounded-full p-0.5"><X size={10} className="text-white"/></button>
                                 </div>
                             ) : (
                                 <div className="text-center">
                                     <UploadCloud size={20} className="mx-auto text-slate-500 group-hover:text-orange-400 mb-1"/>
                                     <span className="text-[9px] text-slate-500">Upload OI</span>
                                 </div>
                             )}
                             <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'oiImage')} className="absolute inset-0 opacity-0 cursor-pointer" />
                         </div>
                     </div>
                 </div>
            </div>

             {/* Collapsible Chips (Tags) */}
             <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-xl">
                 <h3 className="text-slate-400 text-xs font-black uppercase tracking-widest mb-4 flex items-center">
                    <Activity size={14} className="mr-2"/> Tags & Setup
                 </h3>
                 
                 <div className="mb-4">
                    <input 
                        list="setup-options"
                        type="text" 
                        name="setupName" 
                        value={formData.setupName} 
                        onChange={handleChange} 
                        placeholder="Setup Name (e.g. 5m VWAP Rejection)" 
                        className="w-full bg-slate-900 border-b border-slate-700 px-3 py-2 text-white text-sm focus:border-indigo-500 outline-none transition" 
                    />
                    <datalist id="setup-options">
                        {COMMON_SETUPS.map(s => <option key={s} value={s} />)}
                    </datalist>
                 </div>

                 <div className="space-y-4">
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

                     {/* Mistakes (Reconstructing) */}
                     <div className="border border-slate-700 rounded-xl overflow-hidden">
                        <button type="button" onClick={() => setShowMistakes(!showMistakes)} className="w-full flex items-center justify-between p-3 bg-slate-900/50 hover:bg-slate-900 transition">
                            <span className="text-xs font-bold text-red-400 uppercase flex items-center"><AlertTriangle size={14} className="mr-2"/> Mistakes {formData.mistakes && formData.mistakes.length > 0 && `(${formData.mistakes.length})`}</span>
                            {showMistakes ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
                        </button>
                        {showMistakes && (
                            <div className="p-3 bg-slate-900 border-t border-slate-800 flex flex-wrap gap-2 animate-fade-in">
                                {COMMON_MISTAKES.map(m => (
                                    <button key={m} type="button" onClick={() => toggleArrayItem('mistakes', m)} className={`text-[10px] px-2 py-1 rounded border transition ${formData.mistakes?.includes(m) ? 'bg-red-500/20 border-red-500 text-red-400' : 'bg-slate-800 border-slate-700 text-slate-500 hover:text-slate-300'}`}>
                                        {m}
                                    </button>
                                ))}
                            </div>
                        )}
                     </div>

                 </div>
             </div>

        </div>

        {/* Footer Actions */}
        <div className="lg:col-span-3 flex justify-end gap-4 mt-6 pt-6 border-t border-slate-800">
            <button type="button" onClick={onCancel} className="px-6 py-3 rounded-xl font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition">
                Cancel
            </button>
            <button type="submit" className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold shadow-lg shadow-indigo-900/20 flex items-center transition transform hover:-translate-y-1">
                <Save size={18} className="mr-2"/> Save Mission Log
            </button>
        </div>

      </form>
    </div>
  );
};

export default TradeForm;
