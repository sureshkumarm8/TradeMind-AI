
import React, { useState, useRef, useEffect } from 'react';
import { Send, User, Bot, Trash2, Zap, ShieldAlert, Loader2, Sparkles, Terminal, ChevronRight, BrainCircuit, Activity } from 'lucide-react';
import { Trade, StrategyProfile } from '../types';
import { getMentorChatResponse } from '../services/geminiService';

interface MentorChatProps {
    trades: Trade[];
    strategyProfile: StrategyProfile;
    apiKey: string;
}

interface Message {
    id: string;
    role: 'user' | 'model';
    text: string;
    timestamp: Date;
}

const QUICK_PROMPTS = [
    { label: "Analyze my last loss", icon: ShieldAlert },
    { label: "Check my discipline", icon: Activity },
    { label: "Audit my strategy", icon: BrainCircuit },
    { label: "Give me a pro tip", icon: Sparkles },
    { label: "Am I overtrading?", icon: Zap },
];

const MentorChat: React.FC<MentorChatProps> = ({ trades, strategyProfile, apiKey }) => {
    const [messages, setMessages] = useState<Message[]>([
        {
            id: 'init',
            role: 'model',
            text: "System Online. I have analyzed your trade logs and strategy profile.\n\nThis is **The War Room**. No noise, just data. What is your command?",
            timestamp: new Date()
        }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isLoading]);

    const handleSend = async (textOverride?: string) => {
        const textToSend = textOverride || input.trim();
        if (!textToSend || !apiKey) return;

        const userMsg: Message = {
            id: crypto.randomUUID(),
            role: 'user',
            text: textToSend,
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsLoading(true);

        try {
            // Prepare history format for Gemini SDK
            const history = messages
                .filter(m => m.id !== 'init')
                .map(m => ({
                    role: m.role,
                    parts: [{ text: m.text }]
                }));
            
            history.push({ role: 'user', parts: [{ text: userMsg.text }] });

            const responseText = await getMentorChatResponse(history, trades, strategyProfile, apiKey);

            const aiMsg: Message = {
                id: crypto.randomUUID(),
                role: 'model',
                text: responseText,
                timestamp: new Date()
            };

            setMessages(prev => [...prev, aiMsg]);
        } catch (error) {
            const errorMsg: Message = {
                id: crypto.randomUUID(),
                role: 'model',
                text: "Signal lost. Check API connection and try again.",
                timestamp: new Date()
            };
            setMessages(prev => [...prev, errorMsg]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleClear = () => {
        if (window.confirm("Purge War Room logs?")) {
            setMessages([{
                id: 'init',
                role: 'model',
                text: "Logs purged. Systems nominal. Ready for new input.",
                timestamp: new Date()
            }]);
        }
    };

    // Helper to render bold text
    const renderText = (text: string) => {
        return text.split(/(\*\*.*?\*\*)/g).map((part, i) => 
            part.startsWith('**') && part.endsWith('**') ? 
                <strong key={i} className="text-indigo-300 font-bold">{part.slice(2, -2)}</strong> : 
                part
        );
    };

    return (
        <div className="flex flex-col h-[calc(100vh-140px)] md:h-[calc(100vh-100px)] max-w-5xl mx-auto bg-slate-950 rounded-3xl border border-slate-800 shadow-2xl overflow-hidden animate-fade-in relative">
            
            {/* Background Texture */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none"></div>
            <div className="absolute inset-0 bg-radial-gradient from-indigo-900/10 via-transparent to-transparent pointer-events-none"></div>

            {/* Header HUD */}
            <div className="relative z-10 px-6 py-4 bg-slate-950/80 backdrop-blur-md border-b border-indigo-500/20 flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <div className="relative">
                        <div className="absolute inset-0 bg-indigo-500 blur-lg opacity-20 rounded-full animate-pulse"></div>
                        <div className="bg-slate-900 p-2 rounded-xl border border-indigo-500/30 relative text-indigo-400">
                            <BrainCircuit size={24} />
                        </div>
                        <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-emerald-500 border-2 border-slate-950 rounded-full animate-pulse"></div>
                    </div>
                    <div>
                        <h2 className="text-white font-black text-lg tracking-widest uppercase flex items-center gap-2">
                            War Room <span className="text-[10px] bg-indigo-900/50 text-indigo-300 px-2 py-0.5 rounded border border-indigo-500/30">ONLINE</span>
                        </h2>
                        <p className="text-[10px] text-slate-500 font-mono uppercase tracking-wider">AI Tactical Advisor • v2.0</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="hidden md:flex flex-col items-end mr-4">
                        <span className="text-[9px] text-slate-500 uppercase font-bold">Context Window</span>
                        <span className="text-[10px] text-indigo-400 font-mono">{trades.length} Trades Loaded</span>
                    </div>
                    <button onClick={handleClear} className="p-2.5 hover:bg-red-900/20 rounded-lg text-slate-500 hover:text-red-400 transition border border-transparent hover:border-red-500/30 group" title="Purge Logs">
                        <Trash2 size={18} className="group-hover:scale-110 transition-transform"/>
                    </button>
                </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 custom-scrollbar relative z-10 scroll-smooth">
                {messages.map((msg) => (
                    <div key={msg.id} className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in-up`}>
                        {msg.role === 'model' && (
                            <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0 mt-1 shadow-lg">
                                <Bot size={16} className="text-indigo-400"/>
                            </div>
                        )}
                        
                        <div className={`max-w-[85%] md:max-w-[75%] space-y-1 ${msg.role === 'user' ? 'items-end flex flex-col' : 'items-start flex flex-col'}`}>
                            <div className={`p-4 md:p-5 text-sm leading-relaxed shadow-xl backdrop-blur-sm 
                                ${msg.role === 'user' 
                                    ? 'bg-gradient-to-br from-indigo-600 to-indigo-700 text-white rounded-2xl rounded-tr-none border border-indigo-400/20' 
                                    : 'bg-slate-900/80 text-slate-200 rounded-2xl rounded-tl-none border border-indigo-500/20 shadow-[0_0_15px_rgba(99,102,241,0.05)]'
                                }`}>
                                <div className="whitespace-pre-wrap">{renderText(msg.text)}</div>
                            </div>
                            <span className="text-[9px] text-slate-600 font-mono uppercase px-1">
                                {msg.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </span>
                        </div>

                        {msg.role === 'user' && (
                            <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0 mt-1 shadow-lg">
                                <User size={16} className="text-slate-400"/>
                            </div>
                        )}
                    </div>
                ))}
                
                {isLoading && (
                    <div className="flex gap-4 animate-pulse">
                        <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0 mt-1">
                            <Bot size={16} className="text-indigo-400"/>
                        </div>
                        <div className="bg-slate-900/50 border border-indigo-500/20 p-4 rounded-2xl rounded-tl-none flex items-center gap-3">
                            <Loader2 size={16} className="animate-spin text-indigo-400"/>
                            <span className="text-xs text-indigo-300 font-mono tracking-wider">ANALYZING MARKET DATA...</span>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input & Quick Actions Area */}
            <div className="relative z-20 bg-slate-950 border-t border-slate-800 p-4 pb-6">
                
                {/* Quick Prompts (Horizontal Scroll) */}
                {!isLoading && (
                    <div className="flex gap-2 mb-4 overflow-x-auto pb-2 custom-scrollbar mask-gradient">
                        {QUICK_PROMPTS.map((prompt, idx) => (
                            <button
                                key={idx}
                                onClick={() => handleSend(prompt.label)}
                                className="flex items-center gap-2 whitespace-nowrap bg-slate-900 hover:bg-indigo-900/20 border border-slate-700 hover:border-indigo-500/50 text-slate-400 hover:text-indigo-300 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wide transition-all active:scale-95"
                            >
                                <prompt.icon size={12} />
                                {prompt.label}
                            </button>
                        ))}
                    </div>
                )}

                {/* Input Console */}
                <div className="relative flex items-end gap-2 bg-slate-900/50 p-2 rounded-2xl border border-slate-800 focus-within:border-indigo-500/50 focus-within:ring-1 focus-within:ring-indigo-500/20 transition-all">
                    {!apiKey && (
                        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm z-30 flex items-center justify-center rounded-2xl">
                            <div className="flex items-center gap-2 text-red-400 bg-red-900/20 px-4 py-2 rounded-lg border border-red-500/30">
                                <ShieldAlert size={16}/> <span className="text-xs font-bold uppercase">API Key Required</span>
                            </div>
                        </div>
                    )}
                    
                    <div className="pl-3 pb-3 text-slate-500">
                        <Terminal size={20} />
                    </div>
                    
                    <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                if(!isLoading) handleSend();
                            }
                        }}
                        placeholder="Type your command..."
                        className="flex-1 bg-transparent border-none text-slate-200 text-sm focus:ring-0 resize-none py-3 max-h-32 placeholder:text-slate-600 font-medium"
                        rows={1}
                        disabled={isLoading}
                    />
                    
                    <button 
                        onClick={() => handleSend()}
                        disabled={isLoading || !input.trim()}
                        className="mb-1 p-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-600 text-white rounded-xl transition-all shadow-lg shadow-indigo-900/20 hover:scale-105 active:scale-95"
                    >
                        <ChevronRight size={20} strokeWidth={3} />
                    </button>
                </div>
                
                <div className="mt-2 flex justify-between items-center px-2">
                    <p className="text-[9px] text-slate-600 font-mono">
                        AI Access: <span className="text-emerald-500">GRANTED</span>
                    </p>
                    <p className="text-[9px] text-slate-600 font-mono uppercase">
                        Strategy: <span className="text-indigo-400">{strategyProfile.name}</span>
                    </p>
                </div>
            </div>

        </div>
    );
};

export default MentorChat;
