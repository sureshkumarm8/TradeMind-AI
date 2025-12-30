import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Trade, TradeDirection, TradeOutcome, OptionType, Timeframe, OpeningType, NotificationType, TradeNote, StrategyProfile } from '../types';
import { Save, X, AlertTriangle, CheckCircle2, ExternalLink, Clock, Target, Calculator, ChevronDown, ChevronUp, TrendingUp, TrendingDown, Activity, Calendar, Zap, Mic, Loader2, BarChart2, StopCircle, Image as ImageIcon, UploadCloud, Trash2, Send, MessageSquare, Plus, FlaskConical, CircleDollarSign, Bot, Terminal, ChevronRight, Ban, EyeOff } from 'lucide-react';
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

    const handleSend = async (textOverride?: string, audioBase64?: string) => {
        if (!textOverride && !input.trim() && !chatImage && !audioBase64) return;
        if (!apiKey || !strategyProfile) {
            alert("API Key and Strategy required.");
            return;
        }

        // Create user message object
        const userMsg = { 
            role: 'user' as const, 
            text: textOverride || input || (audioBase64 ? "🎤 Audio Message" : ""), 
            image: chatImage || undefined 
        };
        
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setChatImage(null);
        setIsLoading(true);

        try {
            // Construct history for API
            // Filter out the initial welcome message from history payload to avoid "User role expected" error on first turn
            const history = messages
                .slice(1) // SKIP INITIAL MESSAGE
                .map(m => ({
                    role: m.role,
                    parts: [
                        { text: m.text },
                        ...(m.image ? [{ inlineData: { mimeType: 'image/jpeg', data: m.image.split(',')[1] } }] : [])
                    ]
                }));
            
            // Append current user message to history
            const lastMsgParts: any[] = [{ text: userMsg.text }];
            if (userMsg.image) {
                lastMsgParts.push({ inlineData: { mimeType: 'image/jpeg', data: userMsg.image.split(',')[1] } });
            }
            if (audioBase64) {
                lastMsgParts.push({ inlineData: { mimeType: 'audio/webm', data: audioBase64 } });
            }

            const historyWithCurrent = [...history, { role: 'user', parts: lastMsgParts }];

            const responseText = await getLiveTradeCoachResponse(historyWithCurrent as any, currentTradeData, strategyProfile, apiKey);

            setMessages(prev => [...prev, { role: 'model', text: responseText }]);

        } catch (error) {
            console.error(error);
            setMessages(prev => [...prev, { role: 'model', text: "Comms Link Failed." }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="bg-slate-900 border border-slate-700 rounded-xl flex flex-col h-full overflow-hidden">
            <div className="p-3 bg-slate-950 border-b border-slate-800 flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <Bot size={16} className="text-indigo-400"/>
                    <span className="text-xs font-bold text-white uppercase">Co-Pilot</span>
                </div>
                {isLoading && <Loader2 size={12} className="animate-spin text-indigo-400"/>}
            </div>
            
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
                {messages.map((m, i) => (
                    <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] rounded-lg p-2 text-xs ${m.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-300'}`}>
                            {m.image && <img src={m.image} className="mb-2 rounded max-h-24 object-cover" alt="upload"/>}
                            <p className="whitespace-pre-wrap">{m.text}</p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="p-2 bg-slate-950 border-t border-slate-800">
                <div className="flex gap-2">
                    <input 
                        className="flex-1 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white outline-none focus:border-indigo-500"
                        placeholder="Ask coach..."
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSend()}
                    />
                    <button onClick={() => handleSend()} className="p-1.5 bg-indigo-600 rounded text-white hover:bg-indigo-500">
                        <Send size={14}/>
                    </button>
                </div>
            </div>
        </div>
    );
};

const TradeForm: React.FC<TradeFormProps> = ({ onSave, onCancel, initialData, apiKey, notify, onDelete, preMarketDone, strategyProfile }) => {
  const [formData, setFormData] = useState<Partial<Trade>>(initialData || {
    id: crypto.randomUUID(),
    date: new Date().toISOString().split('T')[0],
    entryTime: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
    instrument: 'NIFTY',
    optionType: OptionType.CE,
    direction: TradeDirection.LONG,
    quantity: 50,
    timeframe: Timeframe.M5,
    systemChecks: {
      analyzedPreMarket: preMarketDone || false,
      waitedForOpen: false,
      checkedSensibullOI: false,
      exitTimeLimit: false
    },
    confluences: [],
    mistakes: [],
    notes: [],
    executionType: 'PAPER',
    openingType: OpeningType.FLAT
  });

  const [noteInput, setNoteInput] = useState('');
  const [showCoach, setShowCoach] = useState(false);

  // Computed PnL
  const pnl = useMemo(() => {
      if (formData.entryPrice && formData.exitPrice && formData.quantity) {
          const diff = formData.exitPrice - formData.entryPrice;
          return diff * formData.quantity * (formData.direction === TradeDirection.SHORT ? -1 : 1);
      }
      return undefined;
  }, [formData.entryPrice, formData.exitPrice, formData.quantity, formData.direction]);

  const outcome = useMemo(() => {
      if (pnl === undefined) return TradeOutcome.OPEN;
      if (pnl > 0) return TradeOutcome.WIN;
      if (pnl < 0) return TradeOutcome.LOSS;
      return TradeOutcome.BREAK_EVEN;
  }, [pnl]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.entryPrice) {
        if(notify) notify("Entry Price is required", 'error');
        return;
    }
    
    // Auto-calculate outcome and PnL if not manually overridden
    const finalData = {
        ...formData,
        pnl: formData.pnl ?? pnl,
        outcome: formData.outcome ?? outcome
    } as Trade;

    onSave(finalData);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    let val: any = value;
    if (type === 'number') {
        val = value === '' ? undefined : parseFloat(value);
    }
    setFormData(prev => ({ ...prev, [name]: val }));
  };

  const toggleArrayItem = (field: 'confluences' | 'mistakes', item: string) => {
      setFormData(prev => {
          const arr = prev[field] || [];
          if (arr.includes(item)) return { ...prev, [field]: arr.filter(i => i !== item) };
          return { ...prev, [field]: [...arr, item] };
      });
  };

  const addNote = (content: string, type: 'logic'|'emotion'|'market' = 'logic') => {
      const newNote: TradeNote = {
          id: crypto.randomUUID(),
          timestamp: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
          content,
          type
      };
      setFormData(prev => ({ ...prev, notes: [...(prev.notes || []), newNote] }));
      setNoteInput('');
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: 'chartImage' | 'oiImage') => {
      const file = e.target.files?.[0];
      if (file) {
          try {
              const base64 = await compressImage(file);
              setFormData(prev => ({ ...prev, [field]: base64 }));
          } catch(err) {
              console.error(err);
              if(notify) notify("Image upload failed", 'error');
          }
      }
  };

  return (
    <div className="max-w-5xl mx-auto bg-slate-900 rounded-xl border border-slate-700 shadow-2xl overflow-hidden flex flex-col md:flex-row h-auto min-h-[80vh]">
        
        {/* LEFT: Main Form */}
        <div className="flex-1 p-6 overflow-y-auto custom-scrollbar">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-white flex items-center">
                    {initialData ? 'Edit Mission Log' : 'New Mission Log'}
                    {formData.executionType === 'REAL' ? 
                        <span className="ml-3 text-xs bg-amber-500/20 text-amber-400 px-2 py-1 rounded border border-amber-500/30 font-black uppercase">Real Money</span> :
                        <span className="ml-3 text-xs bg-slate-700 text-slate-400 px-2 py-1 rounded border border-slate-600 font-black uppercase">Paper Trade</span>
                    }
                </h2>
                <div className="flex gap-2">
                    <button type="button" onClick={() => setFormData(p => ({...p, executionType: p.executionType === 'REAL' ? 'PAPER' : 'REAL'}))} className="p-2 rounded hover:bg-slate-800 text-slate-400" title="Toggle Execution Type">
                        <CircleDollarSign size={20} className={formData.executionType === 'REAL' ? 'text-amber-400' : 'text-slate-500'} />
                    </button>
                    <button type="button" onClick={() => setShowCoach(!showCoach)} className="md:hidden p-2 rounded hover:bg-slate-800 text-indigo-400">
                        <Bot size={20} />
                    </button>
                    {onDelete && initialData && (
                        <button type="button" onClick={() => onDelete(initialData.id)} className="p-2 rounded hover:bg-red-900/20 text-red-400">
                            <Trash2 size={20} />
                        </button>
                    )}
                    <button onClick={onCancel} className="p-2 rounded hover:bg-slate-800 text-slate-400"><X size={24} /></button>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                
                {/* 1. Core Params */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Date</label>
                        <input type="date" name="date" value={formData.date} onChange={handleInputChange} className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white text-sm" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Entry Time</label>
                        <input type="time" name="entryTime" value={formData.entryTime} onChange={handleInputChange} className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white text-sm" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Exit Time</label>
                        <input type="time" name="exitTime" value={formData.exitTime || ''} onChange={handleInputChange} className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white text-sm" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Opening</label>
                        <select name="openingType" value={formData.openingType} onChange={handleInputChange} className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white text-sm">
                            <option value={OpeningType.FLAT}>Flat</option>
                            <option value={OpeningType.GAP_UP}>Gap Up</option>
                            <option value={OpeningType.GAP_DOWN}>Gap Down</option>
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Instrument</label>
                        <input list="instruments" name="instrument" value={formData.instrument} onChange={handleInputChange} className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white text-sm uppercase" />
                        <datalist id="instruments"><option value="NIFTY"/><option value="BANKNIFTY"/><option value="FINNIFTY"/></datalist>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Strike</label>
                        <div className="flex">
                            <input type="number" name="strikePrice" placeholder="22000" value={formData.strikePrice || ''} onChange={handleInputChange} className="w-2/3 bg-slate-800 border border-slate-700 rounded-l p-2 text-white text-sm" />
                            <select name="optionType" value={formData.optionType} onChange={handleInputChange} className="w-1/3 bg-slate-800 border border-slate-700 border-l-0 rounded-r p-2 text-white text-sm">
                                <option value="CE">CE</option>
                                <option value="PE">PE</option>
                                <option value="FUT">FUT</option>
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Direction</label>
                        <div className="flex gap-2">
                            <button type="button" onClick={() => setFormData(p => ({...p, direction: TradeDirection.LONG}))} className={`flex-1 py-2 rounded text-xs font-bold ${formData.direction === TradeDirection.LONG ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'}`}>LONG</button>
                            <button type="button" onClick={() => setFormData(p => ({...p, direction: TradeDirection.SHORT}))} className={`flex-1 py-2 rounded text-xs font-bold ${formData.direction === TradeDirection.SHORT ? 'bg-amber-600 text-white' : 'bg-slate-800 text-slate-400'}`}>SHORT</button>
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Qty</label>
                        <input type="number" name="quantity" value={formData.quantity || ''} onChange={handleInputChange} className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white text-sm" />
                    </div>
                </div>

                {/* 2. Price & PnL */}
                <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                    <h4 className="text-xs font-bold text-indigo-400 uppercase mb-3 flex items-center"><Calculator size={14} className="mr-2"/> Execution Data</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Entry Price</label>
                            <input type="number" name="entryPrice" value={formData.entryPrice || ''} onChange={handleInputChange} className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white text-sm" step="0.05" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Exit Price</label>
                            <input type="number" name="exitPrice" value={formData.exitPrice || ''} onChange={handleInputChange} className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white text-sm" step="0.05" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Spot Captured</label>
                            <input type="number" name="spotPointsCaptured" placeholder="Pts" value={formData.spotPointsCaptured || ''} onChange={handleInputChange} className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white text-sm" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">PnL (Auto)</label>
                            <div className={`w-full p-2 text-sm font-mono font-bold rounded border border-slate-700 bg-slate-950 ${pnl && pnl > 0 ? 'text-emerald-400' : pnl && pnl < 0 ? 'text-red-400' : 'text-slate-500'}`}>
                                {pnl ? `₹${pnl.toFixed(2)}` : '0.00'}
                            </div>
                        </div>
                    </div>
                </div>

                {/* 3. Logic & Notes */}
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Setup Name</label>
                    <input list="setups" name="setupName" value={formData.setupName || ''} onChange={handleInputChange} className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white text-sm mb-2" placeholder="e.g. VWAP Rejection"/>
                    <datalist id="setups">{COMMON_SETUPS.map(s => <option key={s} value={s}/>)}</datalist>
                    
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Entry Logic</label>
                    <textarea name="entryReason" value={formData.entryReason || ''} onChange={handleInputChange} className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white text-sm h-20 mb-2" placeholder="Why did you take this trade?" />
                    
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Live Timeline / Notes</label>
                    <div className="flex gap-2 mb-2">
                        <input type="text" value={noteInput} onChange={e => setNoteInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && addNote(noteInput)} className="flex-1 bg-slate-800 border border-slate-700 rounded p-2 text-white text-sm" placeholder="Add a thought..." />
                        <button type="button" onClick={() => addNote(noteInput)} className="p-2 bg-indigo-600 rounded text-white"><Plus size={16}/></button>
                    </div>
                    <div className="flex flex-wrap gap-2 mb-2">
                        {QUICK_THOUGHTS.map((q, i) => (
                            <button key={i} type="button" onClick={() => addNote(q.label, q.type as any)} className="text-[10px] px-2 py-1 rounded bg-slate-800 border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500">
                                {q.label}
                            </button>
                        ))}
                    </div>
                    <div className="space-y-1 max-h-40 overflow-y-auto custom-scrollbar bg-slate-900 p-2 rounded border border-slate-800">
                        {formData.notes?.map((n, i) => (
                            <div key={i} className="text-xs flex gap-2">
                                <span className="text-slate-500 font-mono">{n.timestamp}</span>
                                <span className={n.type === 'emotion' ? 'text-purple-400' : n.type === 'market' ? 'text-amber-400' : 'text-slate-300'}>{n.content}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 4. Confluences & Mistakes */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <h4 className="text-xs font-bold text-emerald-400 uppercase mb-2 flex items-center"><CheckCircle2 size={14} className="mr-2"/> Confluences</h4>
                        <div className="flex flex-wrap gap-2">
                            {COMMON_CONFLUENCES.map(c => (
                                <button type="button" key={c} onClick={() => toggleArrayItem('confluences', c)} className={`text-[10px] px-2 py-1 rounded border transition ${formData.confluences?.includes(c) ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>
                                    {c}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div>
                        <h4 className="text-xs font-bold text-red-400 uppercase mb-2 flex items-center"><AlertTriangle size={14} className="mr-2"/> Mistakes</h4>
                        <div className="flex flex-wrap gap-2">
                            {COMMON_MISTAKES.map(m => (
                                <button type="button" key={m} onClick={() => toggleArrayItem('mistakes', m)} className={`text-[10px] px-2 py-1 rounded border transition ${formData.mistakes?.includes(m) ? 'bg-red-600 border-red-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>
                                    {m}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* 5. Images */}
                <div>
                    <h4 className="text-xs font-bold text-slate-400 uppercase mb-2 flex items-center"><ImageIcon size={14} className="mr-2"/> Screenshots</h4>
                    <div className="flex gap-4">
                        <div className="flex-1">
                            <label className="flex flex-col items-center justify-center h-24 border-2 border-dashed border-slate-700 rounded-xl cursor-pointer hover:border-indigo-500 bg-slate-800/50">
                                {formData.chartImage ? (
                                    <div className="relative w-full h-full">
                                        <img src={formData.chartImage} className="w-full h-full object-cover rounded-xl opacity-50" />
                                        <div className="absolute inset-0 flex items-center justify-center text-xs text-white font-bold">Chart Uploaded</div>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center text-slate-500">
                                        <UploadCloud size={20} className="mb-1" />
                                        <span className="text-[10px] font-bold uppercase">Chart</span>
                                    </div>
                                )}
                                <input type="file" accept="image/*" className="hidden" onChange={e => handleImageUpload(e, 'chartImage')} />
                            </label>
                        </div>
                        <div className="flex-1">
                            <label className="flex flex-col items-center justify-center h-24 border-2 border-dashed border-slate-700 rounded-xl cursor-pointer hover:border-indigo-500 bg-slate-800/50">
                                {formData.oiImage ? (
                                    <div className="relative w-full h-full">
                                        <img src={formData.oiImage} className="w-full h-full object-cover rounded-xl opacity-50" />
                                        <div className="absolute inset-0 flex items-center justify-center text-xs text-white font-bold">OI Uploaded</div>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center text-slate-500">
                                        <UploadCloud size={20} className="mb-1" />
                                        <span className="text-[10px] font-bold uppercase">OI Data</span>
                                    </div>
                                )}
                                <input type="file" accept="image/*" className="hidden" onChange={e => handleImageUpload(e, 'oiImage')} />
                            </label>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-3 pt-4 border-t border-slate-700">
                    <button type="button" onClick={onCancel} className="px-6 py-3 rounded-xl text-sm font-bold text-slate-400 hover:bg-slate-800">Cancel</button>
                    <button type="submit" className="px-8 py-3 rounded-xl text-sm font-bold bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg shadow-indigo-900/20 flex items-center">
                        <Save size={18} className="mr-2"/> Save Mission
                    </button>
                </div>

            </form>
        </div>

        {/* RIGHT: Live Coach (Collapsible on Mobile) */}
        <div className={`w-full md:w-80 border-t md:border-t-0 md:border-l border-slate-700 bg-slate-900/50 flex flex-col transition-all duration-300 ${showCoach ? 'h-[400px]' : 'h-0 md:h-auto overflow-hidden'}`}>
            <LiveCoachWidget apiKey={apiKey} currentTradeData={formData} strategyProfile={strategyProfile} />
        </div>
    </div>
  );
};

export default TradeForm;