import React, { useState, useEffect } from 'react';
import { Trade, StrategyProfile } from './types';
import Dashboard from './components/Dashboard';
import TradeForm from './components/TradeForm';
import TradeList from './components/TradeList';
import MySystem from './components/MySystem';
import { analyzeTradeWithAI, getDailyCoachTip } from './services/geminiService';
import { LayoutDashboard, PlusCircle, BookOpen, BrainCircuit, Target } from 'lucide-react';

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
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [dailyTip, setDailyTip] = useState<string>("");

  // Load trades and strategy from local storage
  useEffect(() => {
    const savedTrades = localStorage.getItem('tradeMind_trades');
    const savedStrategy = localStorage.getItem('tradeMind_strategy');
    
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
    
    // Get a daily tip
    getDailyCoachTip().then(setDailyTip);
  }, []);

  // Save trades to local storage
  useEffect(() => {
    try {
      localStorage.setItem('tradeMind_trades', JSON.stringify(trades));
    } catch (e) {
      console.error("Failed to save trades:", e);
    }
  }, [trades]);

  // Save strategy to local storage
  useEffect(() => {
    try {
      localStorage.setItem('tradeMind_strategy', JSON.stringify(strategyProfile));
    } catch (e) {
      console.error("Failed to save strategy:", e);
    }
  }, [strategyProfile]);

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
    const feedback = await analyzeTradeWithAI(trade, strategyProfile);
    
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

  const handleImportStrategy = (importedProfile: StrategyProfile) => {
    setStrategyProfile(importedProfile);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-blue-500/30">
      
      {/* Sidebar / Navigation */}
      <nav className="fixed bottom-0 w-full z-50 md:static md:w-64 md:h-screen bg-slate-900 border-t md:border-r border-slate-800 md:float-left flex md:flex-col justify-between p-2 md:p-4">
         <div className="hidden md:block mb-8 px-2">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent flex items-center gap-2">
               <BrainCircuit /> TradeMind AI
            </h1>
            <p className="text-xs text-slate-500 mt-1">Professional Trading Journal</p>
         </div>

         <div className="flex md:flex-col w-full justify-around md:justify-start space-x-1 md:space-x-0 md:space-y-2">
            <button 
              onClick={() => setView('dashboard')}
              className={`flex flex-col md:flex-row items-center md:space-x-3 p-2 md:px-4 md:py-3 rounded-lg transition-colors ${view === 'dashboard' ? 'bg-blue-600/20 text-blue-400' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
            >
              <LayoutDashboard size={20} />
              <span className="text-xs md:text-sm font-medium mt-1 md:mt-0">Dashboard</span>
            </button>
            
            <button 
              onClick={() => setView('journal')}
              className={`flex flex-col md:flex-row items-center md:space-x-3 p-2 md:px-4 md:py-3 rounded-lg transition-colors ${view === 'journal' ? 'bg-blue-600/20 text-blue-400' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
            >
              <BookOpen size={20} />
              <span className="text-xs md:text-sm font-medium mt-1 md:mt-0">Journal</span>
            </button>

            <button 
              onClick={() => { setEditingTrade(null); setView('new'); }}
              className={`flex flex-col md:flex-row items-center md:space-x-3 p-2 md:px-4 md:py-3 rounded-lg transition-colors ${view === 'new' ? 'bg-blue-600/20 text-blue-400' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
            >
              <PlusCircle size={20} />
              <span className="text-xs md:text-sm font-medium mt-1 md:mt-0">Log Trade</span>
            </button>

            <button 
              onClick={() => setView('system')}
              className={`flex flex-col md:flex-row items-center md:space-x-3 p-2 md:px-4 md:py-3 rounded-lg transition-colors ${view === 'system' ? 'bg-blue-600/20 text-blue-400' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
            >
              <Target size={20} />
              <span className="text-xs md:text-sm font-medium mt-1 md:mt-0">My System</span>
            </button>
         </div>
         
         <div className="hidden md:block mt-auto p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
            <div className="flex items-center gap-2 mb-2 text-amber-400">
               <BrainCircuit size={16} />
               <span className="text-xs font-bold uppercase tracking-wider">Coach's Tip</span>
            </div>
            <p className="text-xs text-slate-400 italic leading-relaxed">
               "{dailyTip || 'Loading tip...'}"
            </p>
         </div>
      </nav>

      {/* Main Content Area */}
      <main className="md:ml-64 p-4 md:p-8 pb-24 md:pb-8 min-h-screen">
        <header className="flex justify-between items-center mb-8">
           <h2 className="text-2xl font-bold text-white capitalize">
             {view === 'new' ? (editingTrade ? 'Edit Trade' : 'Log Trade') : view === 'system' ? 'My System' : view}
           </h2>
           <div className="md:hidden text-lg font-bold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">TradeMind AI</div>
        </header>

        <div className="max-w-7xl mx-auto">
          {view === 'dashboard' && <Dashboard trades={trades} strategyProfile={strategyProfile} />}
          
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
              onEdit={handleEditTrade} 
              onDelete={handleDeleteTrade} 
              onAnalyze={handleAnalyzeTrade}
              onImport={handleImportTrades}
              isAnalyzing={isAnalyzing}
            />
          )}

          {view === 'system' && (
            <MySystem strategyProfile={strategyProfile} onImport={handleImportStrategy} />
          )}
        </div>
      </main>
    </div>
  );
};

export default App;