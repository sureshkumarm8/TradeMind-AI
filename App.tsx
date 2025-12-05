
import React, { useState, useEffect, useRef } from 'react';
import { Trade, StrategyProfile, TradeOutcome, SyncStatus, UserProfile } from './types';
import Dashboard from './components/Dashboard';
import TradeForm from './components/TradeForm';
import TradeList from './components/TradeList';
import MySystem from './components/MySystem';
import AccountModal from './components/AccountModal'; // Now acts as AccountPage
import { analyzeTradeWithAI, getDailyCoachTip } from './services/geminiService';
import { initGoogleDrive, loginToGoogle, performInitialSync, saveToDrive, getUserProfile } from './services/googleDriveService';
import { exportToCSV, exportToJSON, importData } from './services/dataService';
import { LayoutDashboard, PlusCircle, BookOpen, BrainCircuit, Target, Settings, Key, X, Code, Mail, ExternalLink, ShieldAlert, Cloud, Loader2, CheckCircle2, AlertCircle, Save, User } from 'lucide-react';

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
  const [view, setView] = useState<'dashboard' | 'journal' | 'new' | 'system' | 'account'>('dashboard');
  const [trades, setTrades] = useState<Trade[]>([]);
  const [strategyProfile, setStrategyProfile] = useState<StrategyProfile>(DEFAULT_STRATEGY);
  const [apiKey, setApiKey] = useState<string>('');
  const [preMarketNotes, setPreMarketNotes] = useState<{date: string, notes: string} | undefined>(undefined);
  
  // Cloud Sync State
  const [googleClientId, setGoogleClientId] = useState<string>('');
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(SyncStatus.OFFLINE);
  const [driveFileId, setDriveFileId] = useState<string | null>(null);
  const [isDriveInitialized, setIsDriveInitialized] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null); 
  const syncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null); 

  // Track specific trade being analyzed instead of global boolean
  const [analyzingTradeId, setAnalyzingTradeId] = useState<string | null>(null);
  const [dailyTip, setDailyTip] = useState<string>("");

  // Tilt Breaker State
  const [isTiltLocked, setIsTiltLocked] = useState(false);
  const [tiltTimer, setTiltTimer] = useState(0);

  // Load data from local storage
  useEffect(() => {
    const savedTrades = localStorage.getItem('tradeMind_trades');
    const savedStrategy = localStorage.getItem('tradeMind_strategy');
    const savedApiKey = localStorage.getItem('tradeMind_apiKey');
    const savedPreMarket = localStorage.getItem('tradeMind_preMarket');
    const savedClientId = localStorage.getItem('tradeMind_googleClientId');
    const savedProfile = localStorage.getItem('tradeMind_userProfile');
    
    if (savedTrades) {
      try { setTrades(JSON.parse(savedTrades)); } catch (e) { console.error(e); }
    }
    if (savedStrategy) {
      try { setStrategyProfile(JSON.parse(savedStrategy)); } catch (e) { console.error(e); }
    }
    if (savedApiKey) setApiKey(savedApiKey);
    if (savedClientId) setGoogleClientId(savedClientId);
    if (savedPreMarket) setPreMarketNotes(JSON.parse(savedPreMarket));
    if (savedProfile) try { setUserProfile(JSON.parse(savedProfile)); } catch(e) {};
    
  }, []);

  // Initialize Google Drive Client if ID exists
  useEffect(() => {
     if (googleClientId && !isDriveInitialized) {
        initGoogleDrive(googleClientId, (success) => {
             if(success) {
                 setIsDriveInitialized(true);
             }
        });
     }
  }, [googleClientId]);

  // Auto-Sync Logic (Debounced)
  useEffect(() => {
     if (syncStatus !== SyncStatus.OFFLINE && driveFileId) {
         setSyncStatus(SyncStatus.SYNCING);
         if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
         
         syncTimeoutRef.current = setTimeout(async () => {
             try {
                 await saveToDrive({ trades, strategy: strategyProfile, preMarketNotes }, driveFileId);
                 setSyncStatus(SyncStatus.SYNCED);
             } catch(e) {
                 console.error("Auto Sync Failed", e);
                 setSyncStatus(SyncStatus.ERROR);
             }
         }, 5000); // 5 seconds debounce
     }
     return () => { if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current); };
  }, [trades, strategyProfile, preMarketNotes]);

  // Check for Tilt Logic whenever trades update
  useEffect(() => {
     const closedTrades = trades
        .filter(t => t.outcome !== TradeOutcome.OPEN)
        .sort((a,b) => new Date(b.date + 'T' + b.entryTime).getTime() - new Date(a.date + 'T' + a.entryTime).getTime());
     
     if (closedTrades.length >= 2) {
         const t1 = closedTrades[0];
         const t2 = closedTrades[1];
         
         if (t1.outcome === TradeOutcome.LOSS && t2.outcome === TradeOutcome.LOSS) {
             const time1 = new Date(`${t1.date}T${t1.exitTime}`).getTime();
             const time2 = new Date(`${t2.date}T${t2.exitTime}`).getTime();
             const diffMins = Math.abs(time1 - time2) / 60000;
             
             const lockKey = `tilt_lock_${new Date().toDateString()}`;
             if (diffMins < 30 && !sessionStorage.getItem(lockKey)) {
                 setIsTiltLocked(true);
                 setTiltTimer(60); 
                 sessionStorage.setItem(lockKey, 'true');
             }
         }
     }
  }, [trades]);

  useEffect(() => {
      let interval: any;
      if (isTiltLocked && tiltTimer > 0) {
          interval = setInterval(() => setTiltTimer(prev => prev - 1), 1000);
      } else if (tiltTimer === 0) {
          setIsTiltLocked(false);
      }
      return () => clearInterval(interval);
  }, [isTiltLocked, tiltTimer]);


  useEffect(() => {
     getDailyCoachTip(apiKey).then(setDailyTip);
  }, [apiKey]);

  // Persistence Effects (Local)
  useEffect(() => { localStorage.setItem('tradeMind_trades', JSON.stringify(trades)); }, [trades]);
  useEffect(() => { localStorage.setItem('tradeMind_strategy', JSON.stringify(strategyProfile)); }, [strategyProfile]);
  useEffect(() => { if (preMarketNotes) localStorage.setItem('tradeMind_preMarket', JSON.stringify(preMarketNotes)); }, [preMarketNotes]);
  useEffect(() => { if (userProfile) localStorage.setItem('tradeMind_userProfile', JSON.stringify(userProfile)); }, [userProfile]);

  const handleSaveSettings = () => {
      localStorage.setItem('tradeMind_apiKey', apiKey);
      localStorage.setItem('tradeMind_googleClientId', googleClientId);
      getDailyCoachTip(apiKey).then(setDailyTip);
      alert("Config Saved!");
  };

  const handleConnectDrive = async () => {
      if (!isDriveInitialized) {
          alert("Google Client not ready. Please check your Client ID in the Config tab.");
          // Attempt re-init?
          initGoogleDrive(googleClientId, (s) => setIsDriveInitialized(s));
          return;
      }
      try {
          await loginToGoogle();
          const profile = await getUserProfile();
          if (profile) setUserProfile(profile);

          setSyncStatus(SyncStatus.SYNCING);
          
          // SILENT SYNC LOGIC
          // 1. Find or Create File
          // 2. Decide if we pull (restore) or push (first save)
          const { data, fileId } = await performInitialSync(trades, strategyProfile, preMarketNotes);
          
          if (data && fileId) {
             setDriveFileId(fileId);
             if (data.trades) setTrades(data.trades);
             if (data.strategy) setStrategyProfile(data.strategy);
             if (data.preMarketNotes) setPreMarketNotes(data.preMarketNotes);
             setSyncStatus(SyncStatus.SYNCED);
          } else {
             setSyncStatus(SyncStatus.ERROR);
             alert("Sync initialization failed. Check console.");
          }

      } catch (e: any) {
          if (e && (e.type === 'popup_closed' || e.type === 'popup_closed_by_user')) {
              setSyncStatus(SyncStatus.OFFLINE);
              return;
          }
          console.error("Drive Connect Error", e);
          setSyncStatus(SyncStatus.ERROR);
          alert(`Failed to connect: ${e.message || 'Unknown Error'}.`);
      }
  };

  const handleLogout = () => {
      setUserProfile(null);
      setSyncStatus(SyncStatus.OFFLINE);
      setDriveFileId(null);
      localStorage.removeItem('tradeMind_userProfile');
  }

  const handleUpdatePreMarket = (notes: string) => {
      setPreMarketNotes({ date: new Date().toISOString().split('T')[0], notes });
  }

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
    setAnalyzingTradeId(trade.id);
    const feedback = await analyzeTradeWithAI(trade, strategyProfile, apiKey);
    const updatedTrade = { ...trade, aiFeedback: feedback };
    setTrades(prev => prev.map(t => t.id === trade.id ? updatedTrade : t));
    setAnalyzingTradeId(null);
  };
  
  const handleImportTrades = (importedTrades: Trade[]) => {
      setTrades(prev => {
          const existingIds = new Set(prev.map(t => t.id));
          const newTrades = importedTrades.filter(t => !existingIds.has(t.id));
          return [...newTrades, ...prev];
      });
  };

  const handleGlobalFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const { trades: importedTrades, strategy: importedStrategy } = await importData(file);
      if (importedTrades && importedTrades.length > 0) {
         if (confirm(`Found ${importedTrades.length} trades. Merge?`)) {
             handleImportTrades(importedTrades);
         }
      }
      if (importedStrategy && confirm("Found a strategy profile. Update your system?")) {
          setStrategyProfile(importedStrategy);
      }
      alert("Import Successful");
    } catch (error) {
      alert("Import Failed: " + error);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleUpdateStrategy = (importedProfile: StrategyProfile) => {
    setStrategyProfile(importedProfile);
  };

  const getPageTitle = () => {
     switch(view) {
        case 'dashboard': return 'Dashboard';
        case 'journal': return 'Trade Journal';
        case 'system': return 'My System';
        case 'new': return editingTrade ? 'Edit Trade' : 'Log Trade';
        case 'account': return 'Account & Settings';
        default: return 'TradeMind.AI';
     }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-indigo-500/30 relative">
      
      {/* Hidden Global Input */}
      <input type="file" ref={fileInputRef} onChange={handleGlobalFileChange} className="hidden" accept=".json,.csv" />

      {/* Tilt Overlay */}
      {isTiltLocked && (
          <div className="fixed inset-0 z-[200] bg-slate-950 flex flex-col items-center justify-center p-8 text-center animate-fade-in">
              <div className="mb-8 relative">
                  <div className="absolute inset-0 bg-red-500/20 blur-3xl rounded-full animate-pulse"></div>
                  <ShieldAlert size={120} className="text-red-500 relative z-10 animate-bounce"/>
              </div>
              <h1 className="text-4xl font-black text-white mb-4 tracking-tight uppercase">Tilt Protocol Activated</h1>
              <p className="text-xl text-slate-400 max-w-lg mb-8">
                  You have taken 2 consecutive losses in a short time. Your brain is in fight-or-flight mode. You are <strong>banned</strong> from trading until you calm down.
              </p>
              <div className="text-6xl font-black font-mono text-indigo-400 mb-8 animate-pulse">{tiltTimer}s</div>
              <p className="text-sm text-slate-500 uppercase tracking-widest font-bold">Breathe In... Breathe Out...</p>
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
            <button onClick={() => setView('dashboard')} className={`flex flex-col md:flex-row items-center md:space-x-3 p-2 md:px-4 md:py-2.5 rounded-lg transition-all duration-200 ${view === 'dashboard' ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/20' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}>
              <LayoutDashboard size={18} /><span className="text-[10px] md:text-sm font-medium mt-1 md:mt-0">Dashboard</span>
            </button>
            <button onClick={() => setView('journal')} className={`flex flex-col md:flex-row items-center md:space-x-3 p-2 md:px-4 md:py-2.5 rounded-lg transition-all duration-200 ${view === 'journal' ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/20' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}>
              <BookOpen size={18} /><span className="text-[10px] md:text-sm font-medium mt-1 md:mt-0">Journal</span>
            </button>
            <button onClick={() => { setEditingTrade(null); setView('new'); }} className={`flex flex-col md:flex-row items-center md:space-x-3 p-2 md:px-4 md:py-2.5 rounded-lg transition-all duration-200 ${view === 'new' ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/20' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}>
              <PlusCircle size={18} /><span className="text-[10px] md:text-sm font-medium mt-1 md:mt-0">Log Trade</span>
            </button>
            <button onClick={() => setView('system')} className={`flex flex-col md:flex-row items-center md:space-x-3 p-2 md:px-4 md:py-2.5 rounded-lg transition-all duration-200 ${view === 'system' ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/20' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}>
              <Target size={18} /><span className="text-[10px] md:text-sm font-medium mt-1 md:mt-0">My System</span>
            </button>
            <button onClick={() => setView('account')} className={`flex flex-col md:flex-row items-center md:space-x-3 p-2 md:px-4 md:py-2.5 rounded-lg transition-all duration-200 ${view === 'account' ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/20' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}>
              <User size={18} /><span className="text-[10px] md:text-sm font-medium mt-1 md:mt-0">Account</span>
            </button>
         </div>
         
         <div className="hidden md:block mt-auto space-y-4">
             <div className="p-3 bg-slate-800/50 rounded-xl border border-slate-700/50">
                <div className="flex items-center gap-2 mb-2 text-amber-400"><BrainCircuit size={14} /><span className="text-[10px] font-bold uppercase tracking-wider">Coach's Tip</span></div>
                <p className="text-xs text-slate-400 italic leading-relaxed">"{dailyTip || 'Loading tip...'}"</p>
             </div>
             
             <div className="pt-3 border-t border-slate-800">
                <div className="text-[10px] text-center text-slate-600">TradeMind.AI v1.0</div>
             </div>
         </div>
      </nav>

      <main className="md:ml-64 p-4 md:p-8 pb-24 md:pb-8 min-h-screen">
        <header className="sticky top-0 z-30 bg-slate-950/80 backdrop-blur-md py-3 -mx-4 px-4 md:-mx-8 md:px-8 border-b border-indigo-500/10 mb-6 flex justify-between items-center shadow-lg transition-all">
           <h2 className="text-lg md:text-xl font-bold text-white tracking-tight flex items-center">
             {view === 'new' && <PlusCircle size={18} className="mr-2 text-indigo-400"/>}
             {view === 'dashboard' && <LayoutDashboard size={18} className="mr-2 text-indigo-400"/>}
             {view === 'system' && <Target size={18} className="mr-2 text-indigo-400"/>}
             {view === 'journal' && <BookOpen size={18} className="mr-2 text-indigo-400"/>}
             {view === 'account' && <User size={18} className="mr-2 text-indigo-400"/>}
             {getPageTitle()}
           </h2>
           {/* SYNC STATUS INDICATOR IN HEADER */}
           {userProfile && (
             <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 rounded-full border border-slate-700">
                {syncStatus === SyncStatus.SYNCING && <Loader2 size={14} className="text-blue-400 animate-spin"/>}
                {syncStatus === SyncStatus.SYNCED && <CheckCircle2 size={14} className="text-emerald-400"/>}
                {syncStatus === SyncStatus.OFFLINE && <Cloud size={14} className="text-slate-500"/>}
                {syncStatus === SyncStatus.ERROR && <AlertCircle size={14} className="text-red-400"/>}
                <span className="text-[10px] font-bold uppercase text-slate-400 hidden sm:block">
                  {syncStatus === SyncStatus.SYNCING ? 'Syncing...' : syncStatus === SyncStatus.SYNCED ? 'Synced' : 'Offline'}
                </span>
             </div>
           )}
        </header>

        <div className="max-w-7xl mx-auto animate-fade-in-up">
          {view === 'dashboard' && <Dashboard trades={trades} strategyProfile={strategyProfile} apiKey={apiKey} preMarketNotes={preMarketNotes} onUpdatePreMarket={handleUpdatePreMarket} />}
          {view === 'new' && <TradeForm onSave={handleSaveTrade} onCancel={() => { setEditingTrade(null); setView('dashboard'); }} initialData={editingTrade || undefined} apiKey={apiKey}/>}
          {view === 'journal' && <TradeList trades={trades} strategyProfile={strategyProfile} apiKey={apiKey} onEdit={handleEditTrade} onDelete={handleDeleteTrade} onAnalyze={handleAnalyzeTrade} onImport={handleImportTrades} analyzingTradeId={analyzingTradeId}/>}
          {view === 'system' && <MySystem strategyProfile={strategyProfile} onImport={handleUpdateStrategy} onUpdate={handleUpdateStrategy}/>}
          {view === 'account' && (
              <AccountModal 
                isOpen={true} 
                onClose={() => {}} 
                userProfile={userProfile}
                syncStatus={syncStatus}
                onConnect={handleConnectDrive}
                onLogout={handleLogout}
                apiKey={apiKey}
                setApiKey={setApiKey}
                googleClientId={googleClientId}
                setGoogleClientId={setGoogleClientId}
                onSaveSettings={handleSaveSettings}
                onExportJSON={() => exportToJSON(trades, strategyProfile)}
                onExportCSV={() => exportToCSV(trades)}
                onImportClick={() => fileInputRef.current?.click()}
              />
          )}
        </div>
      </main>
    </div>
  );
};

export default App;
