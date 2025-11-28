import React, { useState, useEffect } from 'react';
import { Trade } from './types';
import Dashboard from './components/Dashboard';
import TradeForm from './components/TradeForm';
import TradeList from './components/TradeList';
import MySystem from './components/MySystem';
import { analyzeTradeWithAI, getDailyCoachTip } from './services/geminiService';
import { LayoutDashboard, PlusCircle, BookOpen, BrainCircuit, Target } from 'lucide-react';

const App: React.FC = () => {
  const [view, setView] = useState<'dashboard' | 'journal' | 'new' | 'system'>('dashboard');
  const [trades, setTrades] = useState<Trade[]>([]);
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [dailyTip, setDailyTip] = useState<string>("");

  // Load trades from local storage with error handling
  useEffect(() => {
    const savedTrades = localStorage.getItem('tradeMind_trades');
    if (savedTrades) {
      try {
        setTrades(JSON.parse(savedTrades));
      } catch (e) {
        console.error("Failed to parse trades from local storage:", e);
      }
    }
    
    // Get a daily tip
    getDailyCoachTip().then(setDailyTip);
  }, []);

  // Save trades to local storage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem('tradeMind_trades', JSON.stringify(trades));
    } catch (e) {
      console.error("Failed to save trades:", e);
    }
  }, [trades]);

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
    const feedback = await analyzeTradeWithAI(trade);
    
    const updatedTrade = { ...trade, aiFeedback: feedback };
    setTrades(prev => prev.map(t => t.id === trade.id ? updatedTrade : t));
    setIsAnalyzing(false);
  };
  
  const handleImportTrades = (importedTrades: Trade[]) => {
      // Merge unique trades by ID
      setTrades(prev => {
          const existingIds = new Set(prev.map(t => t.id));
          const newTrades = importedTrades.filter(t => !existingIds.has(t.id));
          return [...newTrades, ...prev];
      });
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
          {view === 'dashboard' && <Dashboard trades={trades} />}
          
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
              onEdit={handleEditTrade} 
              onDelete={handleDeleteTrade} 
              onAnalyze={handleAnalyzeTrade}
              onImport={handleImportTrades}
              isAnalyzing={isAnalyzing}
            />
          )}

          {view === 'system' && (
            <MySystem />
          )}
        </div>
      </main>
    </div>
  );
};

export default App;