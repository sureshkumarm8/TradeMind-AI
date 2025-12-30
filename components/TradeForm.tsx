
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Trade, TradeDirection, TradeOutcome, OptionType, Timeframe, OpeningType, NotificationType, TradeNote, StrategyProfile } from '../types';
import { Save, X, AlertTriangle, CheckCircle2, Clock, Target, Calculator, TrendingUp, TrendingDown, Zap, Loader2, Image as ImageIcon, UploadCloud, Trash2, Send, Plus, CircleDollarSign, Bot, Shield, Ban, FileText, Layout, Info, ChevronRight, MessageSquare, ChevronDown, ChevronUp, Mic, MicOff, Volume2, Edit2, Check } from 'lucide-react';
import { getLiveTradeCoachResponse, parseVoiceCommand } from '../services/geminiService';
import { compressImage } from '../services/imageService';

interface TradeFormProps {
  onSave: (trade: Trade) => void;
  onCancel: () => void;
  initialData?: Trade;
  apiKey?: string;
  notify?: (message: string, type?: NotificationType) => void;
  onDelete?: (id: string) => void;
  preMarketDone?: boolean;
  strategyProfile?: StrategyProfile;
}

// --- PROFESSIONAL CONSTANTS ---
const PROFESSIONAL_CONFLUENCES = [
  "Liquidity Sweep (Stop Hunt)", "Market Structure Shift (MSS)", "Fair Value Gap (FVG) Fill", 
  "Order Block Retest", "Premium / Discount Zone", "VWAP Rejection", 
  "Delta Divergence (Orderflow)", "Open Interest Support", "Key Level (Daily/Weekly)",
  "Fibonacci Golden Pocket", "EMA 9/20 Crossover", "Multi-Timeframe Alignment"
];

const PROFESSIONAL_MISTAKES = [
  "Impulse / No Setup", "Chasing Price (FOMO)", "Hesitation (Late Entry)", 
  "Moved Stop Loss", "Revenge Trading", "Size Too Big (Risk Breach)", 
  "Anticipating Breakout", "Fighting the Trend", "Trading P&L (Not Chart)", 
  "Distracted Environment", "Exited Too Early"
];

const COMMON_SETUPS = [
  "Trend Continuation", "Reversal (Liquidity Grab)", "Breakout & Retest", 
  "Range Fade", "Opening Range Breakout", "Gap Fill", "Supply/Demand Zone"
];

const QUICK_THOUGHTS = [
    { label: "Nervous", type: 'emotion' },
    { label: "Flow State", type: 'emotion' },
    { label: "Stalling", type: 'market' },
    { label: "Volume Spike", type: 'market' },
    { label: "Scaling Out", type: 'logic' },
    { label: "Pyramiding", type: 'logic' }
];

// --- Live Coach Widget ---
const LiveCoachWidget = ({ apiKey, currentTradeData, strategyProfile }: { apiKey?: string, currentTradeData: Partial<Trade>, strategyProfile?: StrategyProfile }) => {
    const [messages, setMessages] = useState<{role: 'user'|'model', text: string, image?: string}[]>([
        { role: 'model', text: "Tactical Co-Pilot Online. I'm monitoring your trade info and timeline. Ask me anything about this setup." }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, [messages]);

    const handleSend = async (textOverride?: string) => {
        if (!textOverride && !input.trim()) return;
        if (!apiKey) {
            setMessages(prev => [...prev, { role: 'model', text: "API Key required for AI assistance." }]);
            return;
        }

        const userText = textOverride || input;
        const userMsg = { role: 'user' as const, text: userText };
        
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsLoading(true);

        try {
            const history = messages.slice(1).map(m => ({ role: m.role, parts: [{ text: m.text }] }));
            const historyWithCurrent = [...history, { role: 'user', parts: [{ text: userText }] }];
            const responseText = await getLiveTradeCoachResponse(historyWithCurrent as any, currentTradeData, strategyProfile || {} as any, apiKey);
            setMessages(prev => [...prev, { role: 'model', text: responseText }]);
        } catch (error) {
            setMessages(prev => [...prev, { role: 'model', text: "Connection lost." }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-slate-950 border-l border-slate-800 shadow-xl">
            <div className="p-4 bg-slate-900 border-b border-slate-800 flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <Bot size={16} className="text-indigo-400"/>
                    <span className="text-xs font-bold text-white uppercase tracking-widest">Co-Pilot</span>
                </div>
                {isLoading && <Loader2 size={14} className="animate-spin text-indigo-400"/>}
            </div>
            
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                {messages.map((m, i) => (
                    <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[90%] rounded-xl p-3 text-xs leading-relaxed ${m.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-slate-800 text-slate-300 rounded-tl-none border border-slate-700'}`}>
                            {m.text}
                        </div>
                    </div>
                ))}
            </div>

            <div className="p-3 bg-slate-900 border-t border-slate-800">
                <div className="relative">
                    <input 
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-3 pr-10 py-3 text-xs text-white focus:border-indigo-500 outline-none transition-all"
                        placeholder="Ask coach..."
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSend()}
                    />
                    <button onClick={() => handleSend()} className="absolute right-2 top-2 p-1 bg-indigo-600 rounded-md text-white hover:bg-indigo-500 transition">
                        <Send size={12}/>
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
    openingType: OpeningType.FLAT,
    outcome: TradeOutcome.OPEN
  });

  const [noteInput, setNoteInput] = useState('');
  const [isNoTrade, setIsNoTrade] = useState(initialData?.outcome === TradeOutcome.SKIPPED || false);
  const [showCoach, setShowCoach] = useState(false); // Mobile & Desktop Toggle
  
  // Foldable Sections State
  const [showConfluences, setShowConfluences] = useState(false);
  const [showMistakes, setShowMistakes] = useState(false);

  // Voice Input State
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Note Editing State
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingNoteContent, setEditingNoteContent] = useState('');

  // Sync isNoTrade state with form outcome
  useEffect(() => {
      if (isNoTrade) {
          setFormData(prev => ({ ...prev, outcome: TradeOutcome.SKIPPED }));
      } else if (formData.outcome === TradeOutcome.SKIPPED) {
          // If turning off skip, revert to OPEN or calculate based on PnL
          setFormData(prev => ({ ...prev, outcome: TradeOutcome.OPEN }));
      }
  }, [isNoTrade]);

  const pnl = useMemo(() => {
      if (isNoTrade) return 0;
      if (formData.entryPrice && formData.exitPrice && formData.quantity) {
          const diff = formData.exitPrice - formData.entryPrice;
          return diff * formData.quantity * (formData.direction === TradeDirection.SHORT ? -1 : 1);
      }
      return undefined;
  }, [formData.entryPrice, formData.exitPrice, formData.quantity, formData.direction, isNoTrade]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.entryPrice && !isNoTrade) {
        if(notify) notify("Entry Price is required for a trade log.", 'error');
        return;
    }
    
    // Final Data Prep
    const finalData = {
        ...formData,
        pnl: isNoTrade ? 0 : (formData.pnl ?? pnl),
        outcome: isNoTrade ? TradeOutcome.SKIPPED : (formData.outcome ?? (pnl !== undefined ? (pnl > 0 ? TradeOutcome.WIN : pnl < 0 ? TradeOutcome.LOSS : TradeOutcome.BREAK_EVEN) : TradeOutcome.OPEN)),
        // If skipped, zero out these fields to avoid confusion
        entryPrice: isNoTrade ? 0 : formData.entryPrice,
        exitPrice: isNoTrade ? 0 : formData.exitPrice,
        quantity: isNoTrade ? 0 : formData.quantity,
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
      if(!content.trim()) return;
      const newNote: TradeNote = {
          id: crypto.randomUUID(),
          timestamp: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
          content,
          type
      };
      setFormData(prev => ({ ...prev, notes: [...(prev.notes || []), newNote] }));
      setNoteInput('');
  };

  const startEditNote = (note: TradeNote) => {
      setEditingNoteId(note.id);
      setEditingNoteContent(note.content);
  };

  const saveEditedNote = (id: string) => {
      if (!editingNoteContent.trim()) return;
      setFormData(prev => ({
          ...prev,
          notes: prev.notes?.map(n => n.id === id ? { ...n, content: editingNoteContent } : n)
      }));
      setEditingNoteId(null);
  };

  const deleteNote = (id: string) => {
      if(confirm('Delete this note?')) {
          setFormData(prev => ({
              ...prev,
              notes: prev.notes?.filter(n => n.id !== id)
          }));
      }
  };

  // --- Voice Input Logic ---
  const startRecording = async () => {
      if (!apiKey) {
          if(notify) notify("API Key needed for Voice AI", 'error');
          return;
      }
      try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          const recorder = new MediaRecorder(stream);
          mediaRecorderRef.current = recorder;
          audioChunksRef.current = [];

          recorder.ondataavailable = (e) => {
              if (e.data.size > 0) audioChunksRef.current.push(e.data);
          };

          recorder.onstop = async () => {
              const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
              await processVoiceNote(audioBlob);
              stream.getTracks().forEach(track => track.stop());
          };

          recorder.start();
          setIsRecording(true);
      } catch (err) {
          console.error(err);
          if(notify) notify("Microphone access denied", 'error');
      }
  };

  const stopRecording = () => {
      if (mediaRecorderRef.current && isRecording) {
          mediaRecorderRef.current.stop();
          setIsRecording(false);
      }
  };

  const processVoiceNote = async (audioBlob: Blob) => {
      setIsProcessingVoice(true);
      try {
          const reader = new FileReader();
          reader.readAsDataURL(audioBlob);
          reader.onloadend = async () => {
              const base64Audio = (reader.result as string).split(',')[1];
              const result = await parseVoiceCommand(base64Audio, apiKey);
              
              if (result.note) {
                  addNote(result.note, 'market'); // Default to market type for voice
                  if(notify) notify("Voice Note Added", 'success');
              } else {
                  if(notify) notify("Could not transcribe voice.", 'error');
              }
              setIsProcessingVoice(false);
          };
      } catch (e) {
          console.error(e);
          setIsProcessingVoice(false);
      }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: 'chartImage' | 'oiImage') => {
      const file = e.target.files?.[0];
      if (file) {
          try {
              const base64 = await compressImage(file);
              setFormData(prev => ({ ...prev, [field]: base64 }));
          } catch(err) {
              if(notify) notify("Image upload failed", 'error');
          }
      }
  };

  // --- Render Helpers ---
  const SectionHeader = ({ title, icon: Icon, color = "text-indigo-400" }: any) => (
      <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-800">
          <Icon size={16} className={color} />
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-widest">{title}</h3>
      </div>
  );

  return (
    <div className="w-full h-full flex flex-col md:flex-row bg-slate-900 md:rounded-2xl border border-slate-800 shadow-2xl overflow-hidden animate-fade-in-up">
        
        {/* LEFT: Main Form */}
        <div className="flex-1 flex flex-col min-w-0 transition-all duration-300">
            {/* Header */}
            <div className="h-16 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-6 shrink-0">
                <div className="flex items-center gap-4">
                    <button onClick={onCancel} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 transition" title="Close"><X size={20}/></button>
                    <div>
                        <h2 className="text-lg font-bold text-white flex items-center gap-2">
                            {initialData ? 'Edit Log' : 'New Mission'}
                            {formData.executionType === 'REAL' && <span className="text-[10px] bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded border border-amber-500/30 uppercase font-black">Real Money</span>}
                        </h2>
                    </div>
                </div>
                
                <div className="flex items-center gap-2 md:gap-3">
                    <button 
                        type="button" 
                        onClick={() => setIsNoTrade(!isNoTrade)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all ${isNoTrade ? 'bg-red-900/30 border-red-500/50 text-red-400' : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'}`}
                    >
                        {isNoTrade ? <Ban size={14}/> : <Shield size={14}/>}
                        <span className="hidden sm:inline">{isNoTrade ? "LOG 'NO TRADE'" : "LOG TRADE"}</span>
                        <span className="sm:hidden">{isNoTrade ? "SKIP" : "LOG"}</span>
                    </button>
                    
                    <button type="button" onClick={() => setFormData(p => ({...p, executionType: p.executionType === 'REAL' ? 'PAPER' : 'REAL'}))} className="hidden md:flex p-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 hover:text-white transition" title="Toggle Real/Paper">
                        <CircleDollarSign size={18} className={formData.executionType === 'REAL' ? 'text-amber-400' : ''}/>
                    </button>
                    
                    <button 
                        type="button" 
                        onClick={() => setShowCoach(!showCoach)} 
                        className={`p-2 rounded-lg border transition ${showCoach ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-indigo-400'}`}
                        title="Toggle Co-Pilot"
                    >
                        <Bot size={20}/>
                    </button>
                    
                    {onDelete && initialData && (
                        <button type="button" onClick={() => onDelete(initialData.id)} className="p-2 text-red-400 hover:bg-red-900/20 rounded-lg transition"><Trash2 size={18}/></button>
                    )}
                    
                    <button onClick={handleSubmit} className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 md:px-6 py-2 rounded-lg text-sm font-bold shadow-lg shadow-indigo-900/50 flex items-center gap-2 transition-transform active:scale-95">
                        <Save size={16}/> <span className="hidden sm:inline">Save Log</span><span className="sm:hidden">Save</span>
                    </button>
                </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-6">
                
                {/* 1. Context & Timing & Setup */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mb-6">
                    <div className="md:col-span-3 space-y-4">
                        <SectionHeader title="Mission Time" icon={Clock} />
                        <div className="space-y-3">
                            <div>
                                <label className="text-[10px] uppercase font-bold text-slate-500 mb-1 block">Date</label>
                                <input type="date" name="date" value={formData.date} onChange={handleInputChange} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white text-sm focus:border-indigo-500 outline-none" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[10px] uppercase font-bold text-slate-500 mb-1 block">Entry</label>
                                    <input type="time" name="entryTime" value={formData.entryTime} onChange={handleInputChange} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white text-sm focus:border-indigo-500 outline-none" />
                                </div>
                                <div>
                                    <label className="text-[10px] uppercase font-bold text-slate-500 mb-1 block">Exit</label>
                                    <input type="time" name="exitTime" value={formData.exitTime || ''} onChange={handleInputChange} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white text-sm focus:border-indigo-500 outline-none" />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="md:col-span-5 space-y-4">
                        <SectionHeader title="Target Asset & Setup" icon={Target} color="text-blue-400"/>
                        <div className="space-y-4">
                            <div className="flex gap-2">
                                <input 
                                    list="instruments" 
                                    name="instrument" 
                                    value={formData.instrument} 
                                    onChange={handleInputChange} 
                                    className="flex-1 bg-slate-950 border border-slate-700 rounded-lg p-3 text-white font-bold uppercase text-center tracking-widest focus:border-indigo-500 outline-none" 
                                    placeholder="SYMBOL"
                                />
                                <datalist id="instruments"><option value="NIFTY"/><option value="BANKNIFTY"/><option value="FINNIFTY"/></datalist>
                                
                                <select 
                                    name="openingType" 
                                    value={formData.openingType} 
                                    onChange={handleInputChange} 
                                    className="w-1/3 bg-slate-950 border border-slate-700 rounded-lg p-3 text-white text-xs font-bold uppercase focus:border-indigo-500 outline-none"
                                >
                                    <option value={OpeningType.FLAT}>Flat Open</option>
                                    <option value={OpeningType.GAP_UP}>Gap Up</option>
                                    <option value={OpeningType.GAP_DOWN}>Gap Down</option>
                                </select>
                            </div>

                            <div className="relative">
                                <input 
                                    list="setups" 
                                    name="setupName" 
                                    value={formData.setupName || ''} 
                                    onChange={handleInputChange} 
                                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white text-sm focus:border-indigo-500 outline-none placeholder:text-slate-600" 
                                    placeholder="Strategy / Setup Name (e.g. Liquidity Sweep)" 
                                />
                                <datalist id="setups">{COMMON_SETUPS.map(s => <option key={s} value={s}/>)}</datalist>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="flex bg-slate-950 rounded-lg p-1 border border-slate-700">
                                    <button type="button" onClick={() => setFormData(p => ({...p, direction: TradeDirection.LONG}))} className={`flex-1 py-2 rounded text-xs font-black uppercase flex items-center justify-center gap-1 transition-all ${formData.direction === TradeDirection.LONG ? 'bg-blue-600 text-white shadow' : 'text-slate-500 hover:text-white'}`}>
                                        <TrendingUp size={14}/> Long
                                    </button>
                                    <button type="button" onClick={() => setFormData(p => ({...p, direction: TradeDirection.SHORT}))} className={`flex-1 py-2 rounded text-xs font-black uppercase flex items-center justify-center gap-1 transition-all ${formData.direction === TradeDirection.SHORT ? 'bg-amber-600 text-white shadow' : 'text-slate-500 hover:text-white'}`}>
                                        <TrendingDown size={14}/> Short
                                    </button>
                                </div>
                                <div className="flex bg-slate-950 rounded-lg p-1 border border-slate-700">
                                    <button type="button" onClick={() => setFormData(p => ({...p, optionType: OptionType.CE}))} className={`flex-1 py-2 rounded text-xs font-bold transition-all ${formData.optionType === OptionType.CE ? 'bg-emerald-600 text-white' : 'text-slate-500 hover:text-white'}`}>CE</button>
                                    <button type="button" onClick={() => setFormData(p => ({...p, optionType: OptionType.PE}))} className={`flex-1 py-2 rounded text-xs font-bold transition-all ${formData.optionType === OptionType.PE ? 'bg-red-600 text-white' : 'text-slate-500 hover:text-white'}`}>PE</button>
                                    <button type="button" onClick={() => setFormData(p => ({...p, optionType: OptionType.FUT}))} className={`flex-1 py-2 rounded text-xs font-bold transition-all ${formData.optionType === OptionType.FUT ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-white'}`}>FUT</button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="md:col-span-4 space-y-4">
                        <SectionHeader title="Execution Telemetry" icon={Calculator} color="text-emerald-400"/>
                        
                        {isNoTrade ? (
                            <div className="h-[140px] bg-slate-800/50 border border-dashed border-slate-700 rounded-xl flex flex-col items-center justify-center text-center p-4">
                                <Shield size={32} className="text-emerald-500 mb-2 opacity-50"/>
                                <span className="text-emerald-400 font-bold text-sm uppercase">Discipline Log Active</span>
                                <p className="text-[10px] text-slate-500 mt-1">Capital preserved. Logging decision logic only.</p>
                            </div>
                        ) : (
                            <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 space-y-3">
                                <div className="flex gap-3">
                                    <div className="flex-1">
                                        <label className="text-[9px] uppercase font-bold text-slate-500 mb-1 block">Entry Price</label>
                                        <input type="number" name="entryPrice" value={formData.entryPrice || ''} onChange={handleInputChange} className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white font-mono text-sm focus:border-indigo-500 outline-none" placeholder="0.00" step="0.05" />
                                    </div>
                                    <div className="flex-1">
                                        <label className="text-[9px] uppercase font-bold text-slate-500 mb-1 block">Exit Price</label>
                                        <input type="number" name="exitPrice" value={formData.exitPrice || ''} onChange={handleInputChange} className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white font-mono text-sm focus:border-indigo-500 outline-none" placeholder="0.00" step="0.05" />
                                    </div>
                                </div>
                                <div className="flex gap-3">
                                    <div className="flex-1">
                                        <label className="text-[9px] uppercase font-bold text-slate-500 mb-1 block">Strike</label>
                                        <input type="number" name="strikePrice" value={formData.strikePrice || ''} onChange={handleInputChange} className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white font-mono text-sm focus:border-indigo-500 outline-none" placeholder="22000" />
                                    </div>
                                    <div className="flex-1">
                                        <label className="text-[9px] uppercase font-bold text-slate-500 mb-1 block">Qty</label>
                                        <input type="number" name="quantity" value={formData.quantity || ''} onChange={handleInputChange} className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white font-mono text-sm focus:border-indigo-500 outline-none" placeholder="50" />
                                    </div>
                                </div>
                                <div className="pt-2 border-t border-slate-800">
                                    <div className="flex justify-between items-center">
                                        <span className="text-[10px] font-bold text-slate-500 uppercase">Est. PnL</span>
                                        <span className={`font-mono font-bold ${pnl && pnl > 0 ? 'text-emerald-400' : pnl && pnl < 0 ? 'text-red-400' : 'text-slate-600'}`}>
                                            {pnl !== undefined ? `₹${pnl.toFixed(2)}` : '---'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* 2. LIVE MISSION TIMELINE (Full Width) */}
                <div className="mb-6">
                    <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-800">
                        <div className="flex items-center gap-2">
                            <Zap size={16} className="text-yellow-400" />
                            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-widest">Live Mission Timeline</h3>
                        </div>
                        <button 
                            type="button" 
                            onClick={() => setShowCoach(true)} 
                            className="text-[10px] flex items-center gap-1 text-indigo-400 hover:text-indigo-300 transition"
                        >
                            <Bot size={12}/> Ask AI for Clarification
                        </button>
                    </div>
                    
                    <div className="bg-slate-950 border border-slate-800 rounded-lg flex flex-col overflow-hidden min-h-[300px]">
                        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                            {(!formData.notes || formData.notes.length === 0) && (
                                <div className="h-full flex items-center justify-center text-slate-700 text-xs italic flex-col min-h-[200px]">
                                    <Mic size={24} className="mb-2 opacity-50"/>
                                    <span>Speak or Type your thoughts live...</span>
                                </div>
                            )}
                            {formData.notes?.map((n, i) => (
                                <div key={n.id} className="flex gap-3 text-xs animate-fade-in group items-start hover:bg-slate-900/50 p-2 rounded transition">
                                    <span className="text-slate-600 font-mono text-[10px] pt-1 whitespace-nowrap min-w-[40px]">{n.timestamp}</span>
                                    
                                    <div className="flex-1">
                                        {editingNoteId === n.id ? (
                                            <div className="flex gap-2 w-full">
                                                <input 
                                                    type="text" 
                                                    value={editingNoteContent} 
                                                    onChange={(e) => setEditingNoteContent(e.target.value)}
                                                    onKeyDown={(e) => { if(e.key === 'Enter') saveEditedNote(n.id); }}
                                                    className="flex-1 bg-slate-900 border border-indigo-500 rounded px-2 py-1 text-white outline-none"
                                                    autoFocus
                                                />
                                                <button onClick={() => saveEditedNote(n.id)} className="p-1 bg-indigo-600 text-white rounded"><Check size={14}/></button>
                                                <button onClick={() => setEditingNoteId(null)} className="p-1 bg-slate-700 text-slate-400 rounded"><X size={14}/></button>
                                            </div>
                                        ) : (
                                            <div className={`break-words leading-relaxed ${n.type === 'emotion' ? 'text-purple-400' : n.type === 'market' ? 'text-amber-400' : 'text-slate-300'}`}>
                                                {n.content}
                                            </div>
                                        )}
                                    </div>

                                    <div className="opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity">
                                        <button onClick={() => startEditNote(n)} className="p-1 text-slate-500 hover:text-indigo-400"><Edit2 size={12}/></button>
                                        <button onClick={() => deleteNote(n.id)} className="p-1 text-slate-500 hover:text-red-400"><Trash2 size={12}/></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                        
                        <div className="p-3 border-t border-slate-800 bg-slate-900">
                            <div className="flex flex-wrap gap-1.5 mb-3">
                                {QUICK_THOUGHTS.map((q, i) => (
                                    <button key={i} type="button" onClick={() => addNote(q.label, q.type as any)} className="text-[9px] px-2.5 py-1 rounded bg-slate-800 border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-700 hover:border-slate-600 transition">
                                        {q.label}
                                    </button>
                                ))}
                            </div>
                            <div className="flex gap-2 items-center">
                                <button 
                                    type="button"
                                    onClick={isRecording ? stopRecording : startRecording}
                                    className={`p-2.5 rounded-lg transition-all ${isRecording ? 'bg-red-500 text-white animate-pulse' : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'}`}
                                    title="Push to Talk"
                                >
                                    {isRecording ? <MicOff size={18}/> : <Mic size={18}/>}
                                </button>
                                
                                <div className="flex-1 relative">
                                    <input 
                                        type="text" 
                                        value={noteInput} 
                                        onChange={e => setNoteInput(e.target.value)} 
                                        onKeyDown={e => e.key === 'Enter' && addNote(noteInput)} 
                                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white focus:border-indigo-500 outline-none pr-8" 
                                        placeholder={isProcessingVoice ? "Transcribing..." : "Log a thought..."} 
                                        disabled={isProcessingVoice}
                                    />
                                    {isProcessingVoice && <Loader2 size={14} className="absolute right-3 top-3 text-indigo-400 animate-spin"/>}
                                </div>
                                
                                <button type="button" onClick={() => addNote(noteInput)} disabled={!noteInput.trim()} className="p-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed">
                                    <Send size={18}/>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 3. Foldable Tags (Confluences & Mistakes) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    {/* Confluences Accordion */}
                    <div className="border border-slate-700 rounded-xl overflow-hidden bg-slate-950">
                        <button 
                            type="button" 
                            onClick={() => setShowConfluences(!showConfluences)}
                            className="w-full flex justify-between items-center p-3 bg-slate-900 hover:bg-slate-800 transition text-left"
                        >
                            <div className="flex items-center gap-2">
                                <Layout size={16} className="text-emerald-400"/>
                                <span className="text-xs font-bold text-slate-300 uppercase tracking-widest">Technical Confluences</span>
                                <span className="text-[10px] bg-slate-800 text-slate-500 px-2 py-0.5 rounded-full">{formData.confluences?.length || 0}</span>
                            </div>
                            {showConfluences ? <ChevronUp size={16} className="text-slate-500"/> : <ChevronDown size={16} className="text-slate-500"/>}
                        </button>
                        
                        {showConfluences && (
                            <div className="p-4 bg-slate-950/50 animate-fade-in border-t border-slate-800">
                                <div className="flex flex-wrap gap-2">
                                    {PROFESSIONAL_CONFLUENCES.map(c => (
                                        <button 
                                            type="button" 
                                            key={c} 
                                            onClick={() => toggleArrayItem('confluences', c)} 
                                            className={`text-[10px] px-3 py-1.5 rounded-lg border transition-all ${formData.confluences?.includes(c) ? 'bg-emerald-600 border-emerald-500 text-white shadow-lg' : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white hover:border-slate-500'}`}
                                        >
                                            {c}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Mistakes Accordion */}
                    <div className="border border-slate-700 rounded-xl overflow-hidden bg-slate-950">
                        <button 
                            type="button" 
                            onClick={() => setShowMistakes(!showMistakes)}
                            className="w-full flex justify-between items-center p-3 bg-slate-900 hover:bg-slate-800 transition text-left"
                        >
                            <div className="flex items-center gap-2">
                                <AlertTriangle size={16} className="text-red-400"/>
                                <span className="text-xs font-bold text-slate-300 uppercase tracking-widest">Mistakes / Leaks</span>
                                <span className="text-[10px] bg-slate-800 text-slate-500 px-2 py-0.5 rounded-full">{formData.mistakes?.length || 0}</span>
                            </div>
                            {showMistakes ? <ChevronUp size={16} className="text-slate-500"/> : <ChevronDown size={16} className="text-slate-500"/>}
                        </button>
                        
                        {showMistakes && (
                            <div className="p-4 bg-slate-950/50 animate-fade-in border-t border-slate-800">
                                <div className="flex flex-wrap gap-2">
                                    {PROFESSIONAL_MISTAKES.map(m => (
                                        <button 
                                            type="button" 
                                            key={m} 
                                            onClick={() => toggleArrayItem('mistakes', m)} 
                                            className={`text-[10px] px-3 py-1.5 rounded-lg border transition-all ${formData.mistakes?.includes(m) ? 'bg-red-600 border-red-500 text-white shadow-lg' : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white hover:border-slate-500'}`}
                                        >
                                            {m}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* 4. Images */}
                <div className="space-y-4">
                    <SectionHeader title="Visual Evidence" icon={ImageIcon} color="text-purple-400"/>
                    <div className="grid grid-cols-2 gap-4">
                        <label className={`flex flex-col items-center justify-center h-32 border-2 border-dashed rounded-xl cursor-pointer hover:border-indigo-500 transition relative overflow-hidden group ${formData.chartImage ? 'border-indigo-500/50 bg-slate-900' : 'border-slate-700 bg-slate-950'}`}>
                            {formData.chartImage ? (
                                <>
                                    <img src={formData.chartImage} className="absolute inset-0 w-full h-full object-cover opacity-50 group-hover:opacity-30 transition-opacity" />
                                    <div className="relative z-10 flex flex-col items-center">
                                        <CheckCircle2 size={24} className="text-emerald-400 mb-1"/>
                                        <span className="text-[10px] font-bold text-white uppercase">Chart Ready</span>
                                    </div>
                                </>
                            ) : (
                                <div className="flex flex-col items-center text-slate-500">
                                    <UploadCloud size={24} className="mb-2"/>
                                    <span className="text-[10px] font-bold uppercase">Upload Chart</span>
                                </div>
                            )}
                            <input type="file" accept="image/*" className="hidden" onChange={e => handleImageUpload(e, 'chartImage')} />
                        </label>

                        <label className={`flex flex-col items-center justify-center h-32 border-2 border-dashed rounded-xl cursor-pointer hover:border-indigo-500 transition relative overflow-hidden group ${formData.oiImage ? 'border-indigo-500/50 bg-slate-900' : 'border-slate-700 bg-slate-950'}`}>
                            {formData.oiImage ? (
                                <>
                                    <img src={formData.oiImage} className="absolute inset-0 w-full h-full object-cover opacity-50 group-hover:opacity-30 transition-opacity" />
                                    <div className="relative z-10 flex flex-col items-center">
                                        <CheckCircle2 size={24} className="text-emerald-400 mb-1"/>
                                        <span className="text-[10px] font-bold text-white uppercase">OI Data Ready</span>
                                    </div>
                                </>
                            ) : (
                                <div className="flex flex-col items-center text-slate-500">
                                    <UploadCloud size={24} className="mb-2"/>
                                    <span className="text-[10px] font-bold uppercase">Upload OI/Data</span>
                                </div>
                            )}
                            <input type="file" accept="image/*" className="hidden" onChange={e => handleImageUpload(e, 'oiImage')} />
                        </label>
                    </div>
                </div>
            </div>
        </div>

        {/* RIGHT: Live Coach (Collapsible on Mobile & Desktop) */}
        <div className={`border-t md:border-t-0 md:border-l border-slate-700 bg-slate-900/50 flex flex-col transition-all duration-300 absolute md:static z-20 bottom-0 left-0 right-0 ${showCoach ? 'h-[400px] md:h-auto md:w-80 shadow-2xl' : 'h-0 md:w-0 overflow-hidden'}`}>
            {/* Mobile Header for Coach */}
            <div className="md:hidden flex justify-between items-center p-2 bg-slate-950 border-t border-slate-800">
                <span className="text-xs font-bold text-indigo-400 flex items-center gap-2"><MessageSquare size={14}/> Coach</span>
                <button onClick={() => setShowCoach(false)}><X size={16} className="text-slate-500"/></button>
            </div>
            {/* Desktop Header for Coach */}
            <div className="hidden md:flex justify-between items-center p-3 bg-slate-950 border-b border-slate-800">
                 <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest">AI Co-Pilot</span>
                 <button onClick={() => setShowCoach(false)}><X size={14} className="text-slate-500 hover:text-white"/></button>
            </div>
            <LiveCoachWidget apiKey={apiKey} currentTradeData={formData} strategyProfile={strategyProfile} />
        </div>
    </div>
  );
};

export default TradeForm;
