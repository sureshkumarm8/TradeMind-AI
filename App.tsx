import React, { useState, useEffect } from 'react';
import { Trade, StrategyProfile } from './types';
import Dashboard from './components/Dashboard';
import TradeForm from './components/TradeForm';
import TradeList from './components/TradeList';
import MySystem from './components/MySystem';
import { analyzeTradeWithAI, getDailyCoachTip } from './services/geminiService';
import { LayoutDashboard, PlusCircle, BookOpen, BrainCircuit, Target, Settings, Key, X, Code, Mail, ExternalLink } from 'lucide-react';

const DEFAULT_STRATEGY: StrategyProfile = {
  name: "Intraday Trend System (Template)",
  description: "A disciplined approach to following market trends. Define your edge, wait for the setup, and execute with precision. Import your personal strategy file to customize.",
  tags: ["Trend Following", "Risk: 1:2", "Discipline"],
  steps: [
    {
      title: "Phase 1: Analysis",
      items: ["Analyze higher timeframe trends (Daily/Hourly)", "Identify key support & resistance levels", "Check economic calendar for events"]
    },
    {
      title: "Phase 2: Execution",
      items: ["Wait for price action confirmation at key levels", "Verify risk-to-reward ratio is at least 1:2", "Enter trade with defined Stop Loss"]
    },
    {
      title: "Phase 3: Management",
      items: ["Trail Stop Loss to breakeven when possible", "Book partial profits at targets", "Log trade details immediately after exit"]
    }
  ],
  links: [
    { label: "TradingView", url: "https://www.tradingview.com", description: "Charting Platform" },
    { label: "Economic Calendar", url: "https://www.investing.com/economic-calendar/", description: "Key Market Events" }
  ],
  rules: [
    { title: "PROTECT CAPITAL", description: "Never risk more than 1-2% of total capital on a single trade." },
    { title: "NO EMOTIONS", description: "Trade the chart, not your feelings. If you feel tilted, stop trading." },
    { title: "FOLLOW THE PLAN", description: "Execution is the only thing you control. Outcome is probability." }
  ]
};

const App: React.FC = () => {
  const [view, setView] = useState<'dashboard' | 'journal' | 'new' | 'system'>('dashboard');
  const [trades, setTrades] = useState<Trade[]>([]);
  const [strategyProfile, setStrategyProfile] = useState<StrategyProfile>(DEFAULT_STRATEGY);
  const [apiKey, setApiKey] = useState<string>('');
  const [showSettings, setShowSettings] = useState(false);
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [dailyTip, setDailyTip] = useState<string>("");

  // Load data from local storage
  useEffect(() => {
    const savedTrades = localStorage.getItem('tradeMind_trades');
    const savedStrategy = localStorage.getItem('tradeMind_strategy');
    const savedApiKey = localStorage.getItem('tradeMind_apiKey');
    
    if (savedTrades) {
      try {
        setTrades(JSON.parse(savedTrades));
      } catch (e) {
        console.error("Failed to parse trades:", e);
      }
    }
    
    if (savedStrategy) {
      try {
        setStrategyProfile(JSON.parse(savedStrategy));
      } catch (e) {
        console.error("Failed to parse strategy:", e);
      }
    }

    if (savedApiKey) {
        setApiKey(savedApiKey);
    }
    
  }, []);

  // Get daily tip after loading key
  useEffect(() => {
     getDailyCoachTip(apiKey).then(setDailyTip);
  }, [apiKey]);

  // Persistence Effects
  useEffect(() => {
    localStorage.setItem('tradeMind_trades', JSON.stringify(trades));
  }, [trades]);

  useEffect(() => {
    localStorage.setItem('tradeMind_strategy', JSON.stringify(strategyProfile));
  }, [strategyProfile]);

  const handleSaveApiKey = (e: React.FormEvent) => {
      e.preventDefault();
      localStorage.setItem('tradeMind_apiKey', apiKey);
      setShowSettings(false);
      // Reload tip with new key
      getDailyCoachTip(apiKey).then(setDailyTip);
  };

  const handleSaveTrade = (trade: Trade) => {
    if (editingTrade) {
      setTrades(prev => prev.map(t => t.id === trade.id ? trade : t));
    } else {
      setTrades(prev => [trade, ...prev]);
    }
    setEditingTrade(null);
    setView('journal');
  };

  const handleDeleteTrade = (id: string) => {
    if (window.confirm('Are you sure you want to delete this trade log?')) {
      setTrades(prev => prev.filter(t => t.id !== id));
    }
  };

  const handleEditTrade = (trade: Trade) => {
    setEditingTrade(trade);
    setView('new');
  };

  const handleAnalyzeTrade = async (trade: Trade) => {
    setIsAnalyzing(true);
    const feedback = await analyzeTradeWithAI(trade, strategyProfile, apiKey);
    
    const updatedTrade = { ...trade, aiFeedback: feedback };
    setTrades(prev => prev.map(t => t.id === trade.id ? updatedTrade : t));
    setIsAnalyzing(false);
  };
  
  const handleImportTrades = (importedTrades: Trade[]) => {
      setTrades(prev => {
          const existingIds = new Set(prev.map(t => t.id));
          const newTrades = importedTrades.filter(t => !existingIds.has(t.id));
          return [...newTrades, ...prev];
      });
  };

  const handleUpdateStrategy = (importedProfile: StrategyProfile) => {
    setStrategyProfile(importedProfile);
  };

  // Helper to determine Title
  const getPageTitle = () => {
     switch(view) {
        case 'dashboard': return 'Dashboard';
        case 'journal': return 'Trade Journal';
        case 'system': return 'My System';
        case 'new': return editingTrade ? 'Edit Trade' : 'Log Trade';
        default: return 'TradeMind.AI';
     }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-indigo-500/30">
      
      {/* Settings Modal */}
      {showSettings && (
          <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
              <div className="bg-slate-800 w-full max-w-md rounded-2xl border border-slate-700 shadow-2xl overflow-hidden animate-fade-in">
                  <div className="flex justify-between items-center p-4 border-b border-slate-700 bg-slate-900/50">
                      <h3 className="font-bold text-white flex items-center"><Settings size={20} className="mr-2"/> App Settings</h3>
                      <button onClick={() => setShowSettings(false)} className="text-slate-400 hover:text-white transition"><X size={20}/></button>
                  </div>
                  <div className="p-6 space-y-6">
                      <form onSubmit={handleSaveApiKey}>
                          <div className="flex justify-between items-center mb-2">
                             <label className="block text-xs font-bold text-slate-400 uppercase">Gemini API Key</label>
                             <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-[10px] text-indigo-400 hover:text-indigo-300 flex items-center">
                                Get Key <ExternalLink size={10} className="ml-1"/>
                             </a>
                          </div>
                          <div className="relative mb-2">
                            <Key size={16} className="absolute left-3 top-3 text-slate-500"/>
                            <input 
                                type="password" 
                                value={apiKey} 
                                onChange={(e) => setApiKey(e.target.value)}
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2 pl-10 pr-4 text-white outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                                placeholder="Paste your Google Gemini API Key"
                            />
                          </div>
                          <p className="text-xs text-slate-500 mb-4">
                              Required for AI features. Stored locally.
                          </p>
                          <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 rounded-lg transition shadow-lg shadow-indigo-900/20">
                              Save Key
                          </button>
                      </form>

                      <div className="pt-6 border-t border-slate-700">
                          <h4 className="text-xs font-bold text-slate-400 uppercase mb-3">About Developer</h4>
                          <div className="bg-slate-900 rounded-lg p-4 border border-slate-700/50">
                             <div className="flex items-center gap-3 mb-2">
                                <div className="bg-blue-600/20 p-2 rounded-full text-blue-400"><Code size={18}/></div>
                                <div>
                                    <p className="text-sm font-bold text-white">Suresh Kumar M</p>
                                    <p className="text-xs text-slate-500">Full Stack Developer</p>
                                </div>
                             </div>
                             <div className="flex items-center gap-2 text-xs text-slate-400 mt-2">
                                <Mail size={12}/> sureshkumarm8dev@gmail.com
                             </div>
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* Sidebar / Navigation */}
      <nav className="fixed bottom-0 w-full z-40 md:static md:w-64 md:h-screen bg-slate-900 border-t md:border-r border-slate-800 md:float-left flex md:flex-col justify-between p-2 md:p-4 shadow-xl">
         <div className="hidden md:block mb-8 px-2">
            <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent flex items-center gap-2">
               <BrainCircuit size={24} className="text-indigo-400" /> TradeMind.AI
            </h1>
            <p className="text-[10px] text-slate-500 mt-1 font-bold tracking-widest uppercase">Precision Journal</p>
         </div>

         <div className="flex md:flex-col w-full justify-around md:justify-start space-x-1 md:space-x-0 md:space-y-1">
            <button 
              onClick={() => setView('dashboard')}
              className={`flex flex-col md:flex-row items-center md:space-x-3 p-2 md:px-4 md:py-2.5 rounded-lg transition-all duration-200 ${view === 'dashboard' ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/20' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
            >
              <LayoutDashboard size={18} />
              <span className="text-[10px] md:text-sm font-medium mt-1 md:mt-0">Dashboard</span>
            </button>
            
            <button 
              onClick={() => setView('journal')}
              className={`flex flex-col md:flex-row items-center md:space-x-3 p-2 md:px-4 md:py-2.5 rounded-lg transition-all duration-200 ${view === 'journal' ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/20' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
            >
              <BookOpen size={18} />
              <span className="text-[10px] md:text-sm font-medium mt-1 md:mt-0">Journal</span>
            </button>

            <button 
              onClick={() => { setEditingTrade(null); setView('new'); }}
              className={`flex flex-col md:flex-row items-center md:space-x-3 p-2 md:px-4 md:py-2.5 rounded-lg transition-all duration-200 ${view === 'new' ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/20' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
            >
              <PlusCircle size={18} />
              <span className="text-[10px] md:text-sm font-medium mt-1 md:mt-0">Log Trade</span>
            </button>

            <button 
              onClick={() => setView('system')}
              className={`flex flex-col md:flex-row items-center md:space-x-3 p-2 md:px-4 md:py-2.5 rounded-lg transition-all duration-200 ${view === 'system' ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/20' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
            >
              <Target size={18} />
              <span className="text-[10px] md:text-sm font-medium mt-1 md:mt-0">My System</span>
            </button>
         </div>
         
         <div className="hidden md:block mt-auto space-y-4">
             <div className="p-3 bg-slate-800/50 rounded-xl border border-slate-700/50">
                <div className="flex items-center gap-2 mb-2 text-amber-400">
                   <BrainCircuit size={14} />
                   <span className="text-[10px] font-bold uppercase tracking-wider">Coach's Tip</span>
                </div>
                <p className="text-xs text-slate-400 italic leading-relaxed">
                   "{dailyTip || 'Loading tip...'}"
                </p>
             </div>
             
             <div className="pt-3 border-t border-slate-800">
                <button 
                    onClick={() => setShowSettings(true)}
                    className="w-full flex items-center justify-center p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition text-xs font-bold mb-2 uppercase tracking-wide"
                >
                    <Settings size={14} className="mr-2"/> Settings
                </button>
                <div className="text-[10px] text-center text-slate-600">
                    TradeMind.AI v1.0
                </div>
             </div>
         </div>
      </nav>

      {/* Main Content Area */}
      <main className="md:ml-64 p-4 md:p-8 pb-24 md:pb-8 min-h-screen">
        
        {/* Fixed Header - Redesigned to be smaller and attractive */}
        <header className="sticky top-0 z-30 bg-slate-950/80 backdrop-blur-md py-3 -mx-4 px-4 md:-mx-8 md:px-8 border-b border-indigo-500/10 mb-6 flex justify-between items-center shadow-lg transition-all">
           <h2 className="text-lg md:text-xl font-bold text-white tracking-tight flex items-center">
             {view === 'new' && <PlusCircle size={18} className="mr-2 text-indigo-400"/>}
             {view === 'dashboard' && <LayoutDashboard size={18} className="mr-2 text-indigo-400"/>}
             {view === 'system' && <Target size={18} className="mr-2 text-indigo-400"/>}
             {view === 'journal' && <BookOpen size={18} className="mr-2 text-indigo-400"/>}
             {getPageTitle()}
           </h2>
           <div className="flex items-center gap-3">
              <div className="md:hidden text-sm font-bold bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent flex items-center gap-1">
                 <BrainCircuit size={16} className="text-indigo-400"/> TradeMind.AI
              </div>
              <button 
                onClick={() => setShowSettings(true)} 
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition"
                title="Settings"
              >
                  <Settings size={18}/>
              </button>
           </div>
        </header>

        <div className="max-w-7xl mx-auto animate-fade-in-up">
          {view === 'dashboard' && <Dashboard trades={trades} strategyProfile={strategyProfile} apiKey={apiKey} />}
          
          {view === 'new' && (
            <TradeForm 
              onSave={handleSaveTrade} 
              onCancel={() => { setEditingTrade(null); setView('dashboard'); }} 
              initialData={editingTrade || undefined} 
            />
          )}

          {view === 'journal' && (
            <TradeList 
              trades={trades} 
              strategyProfile={strategyProfile}
              apiKey={apiKey}
              onEdit={handleEditTrade} 
              onDelete={handleDeleteTrade} 
              onAnalyze={handleAnalyzeTrade}
              onImport={handleImportTrades}
              isAnalyzing={isAnalyzing}
            />
          )}

          {view === 'system' && (
            <MySystem 
              strategyProfile={strategyProfile} 
              onImport={handleUpdateStrategy}
              onUpdate={handleUpdateStrategy}
            />
          )}
        </div>
      </main>
    </div>
  );
};

export default App;