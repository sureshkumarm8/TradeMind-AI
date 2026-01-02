
import React, { useState, useRef, useEffect } from 'react';
import { Send, User, Bot, Trash2, Zap, ShieldAlert, Loader2, Sparkles, Terminal, ChevronRight, BrainCircuit, Activity, Plus, MessageSquare, Menu, X, Save } from 'lucide-react';
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

interface ChatSession {
    id: string;
    title: string;
    timestamp: string; // ISO
    messages: Message[];
}

const QUICK_PROMPTS = [
    { label: "Analyze my last loss", icon: ShieldAlert },
    { label: "Check my discipline", icon: Activity },
    { label: "Audit my strategy", icon: BrainCircuit },
    { label: "Give me a pro tip", icon: Sparkles },
    { label: "Am I overtrading?", icon: Zap },
];

const INITIAL_MESSAGE: Message = {
    id: 'init',
    role: 'model',
    text: "System Online. I have analyzed your trade logs and strategy profile.\n\nThis is **The War Room**. No noise, just data. What is your command?",
    timestamp: new Date()
};

const MentorChat: React.FC<MentorChatProps> = ({ trades, strategyProfile, apiKey }) => {
    // Session State
    const [sessions, setSessions] = useState<ChatSession[]>(() => {
        try {
            const saved = localStorage.getItem('tradeMind_chatSessions');
            if (saved) {
                // Restore dates
                const parsed = JSON.parse(saved);
                return parsed.map((s: any) => ({
                    ...s,
                    messages: s.messages.map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) }))
                }));
            }
            return [];
        } catch { return []; }
    });
    
    const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
    
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showSidebar, setShowSidebar] = useState(false); // Mobile Toggle
    
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Save Sessions Effect
    useEffect(() => {
        localStorage.setItem('tradeMind_chatSessions', JSON.stringify(sessions));
    }, [sessions]);

    // Scroll to bottom
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isLoading]);

    const handleNewChat = () => {
        setMessages([INITIAL_MESSAGE]);
        setCurrentSessionId(null);
        setShowSidebar(false);
    };

    const handleSelectSession = (session: ChatSession) => {
        setCurrentSessionId(session.id);
        setMessages(session.messages);
        setShowSidebar(false);
    };

    const handleDeleteSession = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (window.confirm("Delete this mission log?")) {
            setSessions(prev => prev.filter(s => s.id !== id));
            if (currentSessionId === id) {
                handleNewChat();
            }
        }
    };

    const saveCurrentSession = (msgs: Message[]) => {
        const title = msgs.find(m => m.role === 'user')?.text.slice(0, 30) + "..." || "New Mission";
        
        if (currentSessionId) {
            // Update existing
            setSessions(prev => prev.map(s => s.id === currentSessionId ? { ...s, messages: msgs, timestamp: new Date().toISOString() } : s));
        } else {
            // Create new
            const newId = crypto.randomUUID();
            const newSession: ChatSession = {
                id: newId,
                title: title,
                timestamp: new Date().toISOString(),
                messages: msgs
            };
            setSessions(prev => [newSession, ...prev]);
            setCurrentSessionId(newId);
        }
    };

    const handleSend = async (textOverride?: string) => {
        const textToSend = textOverride || input.trim();
        if (!textToSend || !apiKey) return;

        const userMsg: Message = {
            id: crypto.randomUUID(),
            role: 'user',
            text: textToSend,
            timestamp: new Date()
        };

        const updatedMessages = [...messages, userMsg];
        setMessages(updatedMessages);
        saveCurrentSession(updatedMessages); // Auto-save
        
        setInput('');
        setIsLoading(true);

        try {
            // Prepare history format for Gemini SDK
            const history = updatedMessages
                .filter(m => m.id !== 'init')
                .map(m => ({
                    role: m.role,
                    parts: [{ text: m.text }]
                }));
            
            // The last message is already in history for context, but getMentorChatResponse handles the last user msg specifically
            // We pass history excluding the very last user message to avoid duplication if the service appends it
            // actually getMentorChatResponse takes full history array where last item is user prompt
            
            const responseText = await getMentorChatResponse(history, trades, strategyProfile, apiKey);

            const aiMsg: Message = {
                id: crypto.randomUUID(),
                role: 'model',
                text: responseText,
                timestamp: new Date()
            };

            const finalMessages = [...updatedMessages, aiMsg];
            setMessages(finalMessages);
            saveCurrentSession(finalMessages); // Auto-save response

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

    // Helper to render bold text
    const renderText = (text: string) => {
        return text.split(/(\*\*.*?\*\*)/g).map((part, i) => 
            part.startsWith('**') && part.endsWith('**') ? 
                <strong key={i} className="text-indigo-300 font-bold">{part.slice(2, -2)}</strong> : 
                part
        );
    };

    return (
        <div className="flex h-[calc(100vh-80px)] md:h-screen w-full bg-slate-950 overflow-hidden relative">
            
            {/* MOBILE SIDEBAR BACKDROP */}
            {showSidebar && (
                <div className="absolute inset-0 bg-black/50 z-40 md:hidden" onClick={() => setShowSidebar(false)}></div>
            )}

            {/* SIDEBAR (Session List) */}
            <div className={`absolute md:relative z-50 w-64 h-full bg-slate-900 border-r border-slate-800 flex flex-col transition-transform duration-300 ${showSidebar ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
                <div className="p-4 border-b border-slate-800 flex justify-between items-center">
                    <h3 className="font-bold text-slate-300 text-sm uppercase tracking-wider flex items-center">
                        <BrainCircuit size={16} className="mr-2 text-indigo-500"/> War Room
                    </h3>
                    <button onClick={() => setShowSidebar(false)} className="md:hidden text-slate-500"><X size={20}/></button>
                </div>
                
                <div className="p-4">
                    <button onClick={handleNewChat} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white p-3 rounded-xl flex items-center justify-center font-bold text-sm transition shadow-lg shadow-indigo-900/20">
                        <Plus size={16} className="mr-2"/> New Operation
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto px-2 custom-scrollbar">
                    <div className="text-[10px] font-bold text-slate-500 uppercase px-4 mb-2 mt-2">Mission Logs</div>
                    {sessions.length === 0 ? (
                        <div className="text-center p-4 text-slate-600 text-xs italic">No saved logs.</div>
                    ) : (
                        <div className="space-y-1">
                            {sessions.map(session => (
                                <div 
                                    key={session.id} 
                                    onClick={() => handleSelectSession(session)}
                                    className={`group flex items-center justify-between p-3 rounded-lg cursor-pointer transition ${currentSessionId === session.id ? 'bg-slate-800 border border-slate-700 text-white' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'}`}
                                >
                                    <div className="flex items-center overflow-hidden">
                                        <MessageSquare size={14} className="mr-3 shrink-0 opacity-70"/>
                                        <div className="truncate">
                                            <div className="text-xs font-medium truncate">{session.title}</div>
                                            <div className="text-[9px] text-slate-600">{new Date(session.timestamp).toLocaleDateString()}</div>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={(e) => handleDeleteSession(e, session.id)}
                                        className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-900/30 text-slate-600 hover:text-red-400 rounded transition"
                                    >
                                        <Trash2 size={12}/>
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                
                <div className="p-4 border-t border-slate-800 text-[10px] text-slate-600 text-center">
                    Use this room for strategy audits and psychology checks.
                </div>
            </div>

            {/* MAIN CHAT AREA */}
            <div className="flex-1 flex flex-col relative bg-slate-950">
                {/* Header (Minimal) */}
                <div className="h-14 border-b border-slate-800 flex items-center justify-between px-4 bg-slate-950/80 backdrop-blur-md sticky top-0 z-30">
                    <div className="flex items-center gap-3">
                        <button onClick={() => setShowSidebar(true)} className="md:hidden p-2 text-slate-400 hover:text-white">
                            <Menu size={20}/>
                        </button>
                        <span className="text-xs font-mono text-indigo-400 uppercase tracking-widest flex items-center">
                            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse mr-2"></span>
                            Live Link
                        </span>
                    </div>
                    {currentSessionId && (
                        <div className="text-[10px] text-slate-500 flex items-center gap-1">
                            <Save size={10}/> Auto-Saved
                        </div>
                    )}
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 custom-scrollbar scroll-smooth">
                    {messages.map((msg) => (
                        <div key={msg.id} className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in-up max-w-4xl mx-auto`}>
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
                        <div className="flex gap-4 animate-pulse max-w-4xl mx-auto">
                            <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0 mt-1">
                                <Bot size={16} className="text-indigo-400"/>
                            </div>
                            <div className="bg-slate-900/50 border border-indigo-500/20 p-4 rounded-2xl rounded-tl-none flex items-center gap-3">
                                <Loader2 size={16} className="animate-spin text-indigo-400"/>
                                <span className="text-xs text-indigo-300 font-mono tracking-wider">ANALYZING TACTICAL DATA...</span>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="p-4 bg-slate-950 border-t border-slate-800">
                    <div className="max-w-4xl mx-auto">
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
                        <div className="mt-2 text-center">
                             <p className="text-[9px] text-slate-600 font-mono uppercase">
                                Strategy Context: <span className="text-indigo-400">{strategyProfile.name}</span>
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MentorChat;
