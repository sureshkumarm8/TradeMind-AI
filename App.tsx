
import React, { useState, useEffect, useRef } from 'react';
import { Trade, StrategyProfile, TradeOutcome, SyncStatus, UserProfile, NotificationType, PreMarketAnalysis, LiveMarketAnalysis, PostMarketAnalysis, NewsAnalysis } from './types';
import Dashboard from './components/Dashboard';
import TradeForm from './components/TradeForm';
import TradeList from './components/TradeList';
import MySystem from './components/MySystem';
import AccountModal from './components/AccountModal'; 
import PreMarketAnalyzer from './components/PreMarketAnalyzer'; 
import MentorChat from './components/MentorChat'; 
import PsychologyProfile from './components/PsychologyProfile'; 
import IntelligenceCenter from './components/IntelligenceCenter'; // New Component
import { analyzeTradeWithAI, getDailyCoachTip } from './services/geminiService';
import { initGoogleDrive, loginToGoogle, performInitialSync, saveToDrive, getUserProfile, loadBackupData } from './services/googleDriveService';
import { exportToCSV, exportToJSON, importData } from './services/dataService';
import { LayoutDashboard, PlusCircle, BookOpen, BrainCircuit, Target, Settings, Key, X, Code, Mail, ExternalLink, ShieldAlert, Cloud, Loader2, CheckCircle2, AlertCircle, Save, User, Sparkles, RefreshCw, Zap, MessageSquare, Quote, Menu, ChevronUp } from 'lucide-react';
import Toast from './components/Toast';

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
  const [view, setView] = useState<'dashboard' | 'journal' | 'new' | 'system' | 'account' | 'premarket' | 'mentor' | 'psychology' | 'intelligence'>('dashboard');
  const [trades, setTrades] = useState<Trade[]>([]);
  const [strategyProfile, setStrategyProfile] = useState<StrategyProfile>(DEFAULT_STRATEGY);
  const [apiKey, setApiKey] = useState<string>('');
  const [preMarketNotes, setPreMarketNotes] = useState<{date: string, notes: string} | undefined>(undefined);
  
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [preMarketAnalysis, setPreMarketAnalysis] = useState<{date: string, timestamp?: string, data: PreMarketAnalysis} | undefined>(undefined);
  const [liveMarketAnalysis, setLiveMarketAnalysis] = useState<{date: string, timestamp?: string, data: LiveMarketAnalysis} | undefined>(undefined);
  const [postMarketAnalysis, setPostMarketAnalysis] = useState<{date: string, timestamp?: string, data: PostMarketAnalysis} | undefined>(undefined);
  const [newsAnalysis, setNewsAnalysis] = useState<{date: string, timestamp?: string, data: NewsAnalysis} | undefined>(undefined);

  const [preMarketImages, setPreMarketImages] = useState<any>(undefined);
  const [liveMarketImages, setLiveMarketImages] = useState<any>(undefined);
  const [postMarketImages, setPostMarketImages] = useState<any>(undefined);

  const [highlightedTradeId, setHighlightedTradeId] = useState<string | null>(null);

  const [googleClientId, setGoogleClientId] = useState<string>('');
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(SyncStatus.OFFLINE);
  const [driveFileId, setDriveFileId] = useState<string | null>(null);
  const [isDriveInitialized, setIsDriveInitialized] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null); 
  const [authError, setAuthError] = useState<string | null>(null); 
  const syncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null); 
  const [notification, setNotification] = useState<{message: string, type: NotificationType} | null>(null);

  const [analyzingTradeId, setAnalyzingTradeId] = useState<string | null>(null);
  const [dailyTip, setDailyTip] = useState<string>("");
  const [isLoadingTip, setIsLoadingTip] = useState(false);

  const [isTiltLocked, setIsTiltLocked] = useState(false);
  const [tiltTimer, setTiltTimer] = useState(0);

  useEffect(() => {
    const savedTrades = localStorage.getItem('tradeMind_trades');
    const savedStrategy = localStorage.getItem('tradeMind_strategy');
    const savedApiKey = localStorage.getItem('tradeMind_apiKey');
    const savedPreMarket = localStorage.getItem('tradeMind_preMarket');
    const savedPreMarketAnalysis = localStorage.getItem('tradeMind_preMarketAnalysis');
    const savedLiveMarketAnalysis = localStorage.getItem('tradeMind_liveMarketAnalysis');
    const savedPostMarketAnalysis = localStorage.getItem('tradeMind_postMarketAnalysis');
    const savedNewsAnalysis = localStorage.getItem('tradeMind_newsAnalysis');
    const savedPreMarketImages = localStorage.getItem('tradeMind_preMarketImages');
    const savedLiveMarketImages = localStorage.getItem('tradeMind_liveMarketImages');
    const savedPostMarketImages = localStorage.getItem('tradeMind_postMarketImages');
    const savedClientId = localStorage.getItem('tradeMind_googleClientId');
    const savedProfile = localStorage.getItem('tradeMind_userProfile');
    
    if (savedTrades) try { setTrades(JSON.parse(savedTrades)); } catch (e) {}
    if (savedStrategy) try { setStrategyProfile(JSON.parse(savedStrategy)); } catch (e) {}
    if (savedApiKey) setApiKey(savedApiKey);
    if (savedClientId) setGoogleClientId(savedClientId);
    if (savedPreMarket) setPreMarketNotes(JSON.parse(savedPreMarket));
    if (savedPreMarketAnalysis) try { setPreMarketAnalysis(JSON.parse(savedPreMarketAnalysis)); } catch(e) {};
    if (savedLiveMarketAnalysis) try { setLiveMarketAnalysis(JSON.parse(savedLiveMarketAnalysis)); } catch(e) {};
    if (savedPostMarketAnalysis) try { setPostMarketAnalysis(JSON.parse(savedPostMarketAnalysis)); } catch(e) {};
    if (savedNewsAnalysis) try { setNewsAnalysis(JSON.parse(savedNewsAnalysis)); } catch(e) {};
    if (savedPreMarketImages) try { setPreMarketImages(JSON.parse(savedPreMarketImages)); } catch(e) {};
    if (savedLiveMarketImages) try { setLiveMarketImages(JSON.parse(savedLiveMarketImages)); } catch(e) {};
    if (savedPostMarketImages) try { setPostMarketImages(JSON.parse(savedPostMarketImages)); } catch(e) {};
    if (savedProfile) try { setUserProfile(JSON.parse(savedProfile)); } catch(e) {};
  }, []);

  const notify = (message: string, type: NotificationType = 'success') => {
      setNotification({ message, type });
  };

  useEffect(() => {
     if (googleClientId && !isDriveInitialized) {
        initGoogleDrive(googleClientId, (success) => setIsDriveInitialized(success));
     }
  }, [googleClientId]);

  useEffect(() => {
      const handleAutoConnect = async () => {
          try {
              await loginToGoogle(true);
              setSyncStatus(SyncStatus.SYNCING);
              const { data, fileId } = await performInitialSync(trades, strategyProfile, preMarketNotes);
              if (data && fileId) {
                  setDriveFileId(fileId);
                  if (data.trades) setTrades(data.trades);
                  if (data.strategy) setStrategyProfile(data.strategy);
                  if (data.preMarketNotes) setPreMarketNotes(data.preMarketNotes);
                  if (data.preMarketAnalysis) setPreMarketAnalysis(data.preMarketAnalysis);
                  if (data.liveMarketAnalysis) setLiveMarketAnalysis(data.liveMarketAnalysis);
                  if (data.postMarketAnalysis) setPostMarketAnalysis(data.postMarketAnalysis);
                  if (data.newsAnalysis) setNewsAnalysis(data.newsAnalysis);
                  if (data.preMarketImages) setPreMarketImages(data.preMarketImages);
                  if (data.liveMarketImages) setLiveMarketImages(data.liveMarketImages);
                  if (data.postMarketImages) setPostMarketImages(data.postMarketImages);
                  setSyncStatus(SyncStatus.SYNCED);
              }
          } catch (e) { setSyncStatus(SyncStatus.OFFLINE); }
      };
      if (isDriveInitialized && userProfile && googleClientId) handleAutoConnect();
  }, [isDriveInitialized]);

  useEffect(() => {
     if (syncStatus !== SyncStatus.OFFLINE && driveFileId) {
         setSyncStatus(SyncStatus.SYNCING);
         if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
         syncTimeoutRef.current = setTimeout(async () => {
             try {
                 const payload = { trades, strategy: strategyProfile, preMarketNotes, preMarketAnalysis, liveMarketAnalysis, postMarketAnalysis, newsAnalysis, preMarketImages, liveMarketImages, postMarketImages };
                 await saveToDrive(payload, driveFileId);
                 setSyncStatus(SyncStatus.SYNCED);
             } catch(e: any) { setSyncStatus(SyncStatus.ERROR); }
         }, 5000); 
     }
     return () => { if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current); };
  }, [trades, strategyProfile, preMarketNotes, preMarketAnalysis, liveMarketAnalysis, postMarketAnalysis, newsAnalysis, preMarketImages, liveMarketImages, postMarketImages]);

  useEffect(() => {
     const closedTrades = trades.filter(t => t.outcome !== TradeOutcome.OPEN).sort((a,b) => new Date(b.date + 'T' + b.entryTime).getTime() - new Date(a.date + 'T' + a.entryTime).getTime());
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
      if (isTiltLocked && tiltTimer > 0) interval = setInterval(() => setTiltTimer(prev => prev - 1), 1000);
      else if (tiltTimer === 0) setIsTiltLocked(false);
      return () => clearInterval(interval);
  }, [isTiltLocked, tiltTimer]);

  useEffect(() => { if(apiKey) handleRefreshTip(); }, [apiKey]);
  const handleRefreshTip = async () => {
      setIsLoadingTip(true);
      const tip = await getDailyCoachTip(apiKey);
      setDailyTip(tip.replace(/^"|"$/g, ''));
      setIsLoadingTip(false);
  }

  useEffect(() => { localStorage.setItem('tradeMind_trades', JSON.stringify(trades)); }, [trades]);
  useEffect(() => { localStorage.setItem('tradeMind_strategy', JSON.stringify(strategyProfile)); }, [strategyProfile]);
  useEffect(() => { if (preMarketNotes) localStorage.setItem('tradeMind_preMarket', JSON.stringify(preMarketNotes)); }, [preMarketNotes]);
  useEffect(() => { if (preMarketAnalysis) localStorage.setItem('tradeMind_preMarketAnalysis', JSON.stringify(preMarketAnalysis)); }, [preMarketAnalysis]);
  useEffect(() => { if (liveMarketAnalysis) localStorage.setItem('tradeMind_liveMarketAnalysis', JSON.stringify(liveMarketAnalysis)); }, [liveMarketAnalysis]);
  useEffect(() => { if (postMarketAnalysis) localStorage.setItem('tradeMind_postMarketAnalysis', JSON.stringify(postMarketAnalysis)); }, [postMarketAnalysis]);
  useEffect(() => { if (newsAnalysis) localStorage.setItem('tradeMind_newsAnalysis', JSON.stringify(newsAnalysis)); }, [newsAnalysis]);
  useEffect(() => { if (preMarketImages) localStorage.setItem('tradeMind_preMarketImages', JSON.stringify(preMarketImages)); }, [preMarketImages]);
  useEffect(() => { if (liveMarketImages) localStorage.setItem('tradeMind_liveMarketImages', JSON.stringify(liveMarketImages)); }, [liveMarketImages]);
  useEffect(() => { if (postMarketImages) localStorage.setItem('tradeMind_postMarketImages', JSON.stringify(postMarketImages)); }, [postMarketImages]);
  useEffect(() => { if (userProfile) localStorage.setItem('tradeMind_userProfile', JSON.stringify(userProfile)); }, [userProfile]);

  const handleSaveSettings = () => {
      localStorage.setItem('tradeMind_apiKey', apiKey);
      localStorage.setItem('tradeMind_googleClientId', googleClientId);
      handleRefreshTip();
      notify("Configuration Saved!", 'success');
  };

  const handleConnectDrive = async () => {
      setAuthError(null);
      if (!googleClientId) { setAuthError("Web OAuth Client ID missing."); return; }
      try {
          await loginToGoogle(false);
          const profile = await getUserProfile();
          if (profile) setUserProfile(profile);
          setSyncStatus(SyncStatus.SYNCING);
          const { data, fileId } = await performInitialSync(trades, strategyProfile, preMarketNotes);
          if (data && fileId) {
             setDriveFileId(fileId);
             if (data.trades) setTrades(data.trades);
             if (data.strategy) setStrategyProfile(data.strategy);
             if (data.preMarketNotes) setPreMarketNotes(data.preMarketNotes);
             if (data.preMarketAnalysis) setPreMarketAnalysis(data.preMarketAnalysis);
             if (data.liveMarketAnalysis) setLiveMarketAnalysis(data.liveMarketAnalysis);
             if (data.postMarketAnalysis) setPostMarketAnalysis(data.postMarketAnalysis);
             if (data.newsAnalysis) setNewsAnalysis(data.newsAnalysis);
             if (data.preMarketImages) setPreMarketImages(data.preMarketImages);
             if (data.liveMarketImages) setLiveMarketImages(data.liveMarketImages);
             if (data.postMarketImages) setPostMarketImages(data.postMarketImages);
             setSyncStatus(SyncStatus.SYNCED);
             notify("Cloud Sync Activated", 'success');
          }
      } catch (e: any) { setSyncStatus(SyncStatus.ERROR); setAuthError(e.message || "Auth Error"); }
  };

  const handleManualSync = async () => {
      if (!driveFileId) { notify("Not connected to Cloud", 'error'); return; }
      setSyncStatus(SyncStatus.SYNCING);
      try {
          const cloudData = await loadBackupData(driveFileId);
          if (cloudData) {
              if (cloudData.trades) setTrades(cloudData.trades);
              if (cloudData.strategy) setStrategyProfile(cloudData.strategy);
              if (cloudData.preMarketNotes) setPreMarketNotes(cloudData.preMarketNotes);
              if (cloudData.preMarketAnalysis) setPreMarketAnalysis(cloudData.preMarketAnalysis);
              if (cloudData.liveMarketAnalysis) setLiveMarketAnalysis(cloudData.liveMarketAnalysis);
              if (cloudData.postMarketAnalysis) setPostMarketAnalysis(cloudData.postMarketAnalysis);
              if (cloudData.newsAnalysis) setNewsAnalysis(cloudData.newsAnalysis);
              if (cloudData.preMarketImages) setPreMarketImages(cloudData.preMarketImages);
              if (cloudData.liveMarketImages) setLiveMarketImages(cloudData.liveMarketImages);
              if (cloudData.postMarketImages) setPostMarketImages(cloudData.postMarketImages);
              notify("Synced from Cloud", 'success');
              setSyncStatus(SyncStatus.SYNCED);
          }
      } catch (e: any) { setSyncStatus(SyncStatus.ERROR); }
  };

  const handleForceSave = async () => {
      if (!driveFileId) { notify("Not connected to Cloud", 'error'); return; }
      setSyncStatus(SyncStatus.SYNCING);
      try {
          const payload = { trades, strategy: strategyProfile, preMarketNotes, preMarketAnalysis, liveMarketAnalysis, postMarketAnalysis, newsAnalysis, preMarketImages, liveMarketImages, postMarketImages };
          await saveToDrive(payload, driveFileId);
          setSyncStatus(SyncStatus.SYNCED);
          notify("Manual Save Successful", 'success');
      } catch(e: any) { setSyncStatus(SyncStatus.ERROR); }
  }

  const handleLogout = () => {
      setUserProfile(null); setSyncStatus(SyncStatus.OFFLINE); setDriveFileId(null);
      localStorage.removeItem('tradeMind_userProfile');
      notify("Signed Out", 'info');
  }

  const handleUpdatePreMarket = (notes: string) => setPreMarketNotes({ date: new Date().toISOString().split('T')[0], notes });
  const handleUpdatePreMarketAnalysis = (data: PreMarketAnalysis | null) => {
      if (data) setPreMarketAnalysis({ date: new Date().toISOString().split('T')[0], timestamp: new Date().toISOString(), data });
      else setPreMarketAnalysis(undefined);
  };
  const handleUpdateLiveMarketAnalysis = (data: LiveMarketAnalysis | null) => {
      if (data) setLiveMarketAnalysis({ date: new Date().toISOString().split('T')[0], timestamp: new Date().toISOString(), data });
      else setLiveMarketAnalysis(undefined);
  }
  const handleUpdatePostMarketAnalysis = (data: PostMarketAnalysis | null) => {
      if (data) setPostMarketAnalysis({ date: new Date().toISOString().split('T')[0], timestamp: new Date().toISOString(), data });
      else setPostMarketAnalysis(undefined);
  }
  const handleUpdateNewsAnalysis = (data: NewsAnalysis | null) => {
      if (data) setNewsAnalysis({ date: new Date().toISOString().split('T')[0], timestamp: new Date().toISOString(), data });
      else setNewsAnalysis(undefined);
  }

  const handleUpdatePreMarketImages = (images: any) => setPreMarketImages(images);
  const handleUpdateLiveMarketImages = (images: any) => setLiveMarketImages(images);
  const handleUpdatePostMarketImages = (images: any) => setPostMarketImages(images);

  const handleSaveTrade = (trade: Trade) => {
    if (editingTrade) setTrades(prev => prev.map(t => t.id === trade.id ? trade : t));
    else setTrades(prev => [trade, ...prev]);
    setEditingTrade(null); setView('journal'); notify("Mission Log Saved", 'success');
  };

  const handleDeleteTrade = (id: string) => {
    if (window.confirm('Delete this trade log?')) {
      setTrades(prev => prev.filter(t => t.id !== id));
      notify("Trade Deleted", 'info');
    }
  };

  const handleAnalyzeTrade = async (trade: Trade) => {
    setAnalyzingTradeId(trade.id);
    const feedback = await analyzeTradeWithAI(trade, strategyProfile, apiKey);
    let calculatedRating = trade.disciplineRating || 0;
    try {
        const feedbackData = JSON.parse(feedback);
        if (typeof feedbackData.grade === 'number') calculatedRating = Math.ceil(feedbackData.grade / 20);
    } catch(e) {}
    const updatedTrade = { ...trade, aiFeedback: feedback, disciplineRating: calculatedRating };
    setTrades(prev => prev.map(t => t.id === trade.id ? updatedTrade : t));
    setAnalyzingTradeId(null);
    notify("Reality Check Complete", 'success');
  };

  const handleViewTrade = (tradeId: string) => { setHighlightedTradeId(tradeId); setView('journal'); };

  // --- IMPLEMENTED HANDLERS TO FIX ERRORS ---

  /**
   * handleEditTrade: Switches to the trade entry form with existing trade data or null for a fresh entry.
   */
  const handleEditTrade = (trade: Trade) => {
    setEditingTrade(trade.id ? trade : null);
    setView('new');
  };

  /**
   * handleImportTrades: Merges imported trade lists into the current state while ensuring ID uniqueness.
   */
  const handleImportTrades = (importedTrades: Trade[]) => {
    setTrades(prev => {
        const existingIds = new Set(prev.map(t => t.id));
        const uniqueImported = importedTrades.filter(t => !existingIds.has(t.id));
        return [...uniqueImported, ...prev];
    });
    notify(`Imported ${importedTrades.length} trades`, 'success');
  };

  /**
   * handleGlobalFileChange: Processes the main JSON/CSV file upload from the top-level hidden input.
   */
  const handleGlobalFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
        const { trades: importedTrades, strategy: importedStrategy } = await importData(file);
        if (importedTrades && importedTrades.length > 0) {
            handleImportTrades(importedTrades);
        } else if (importedStrategy) {
            setStrategyProfile(importedStrategy);
            notify("System Strategy Imported", "success");
        }
    } catch (err: any) {
        notify(err.message || "Import Failed", "error");
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  /**
   * handleSavePlan: Persists the textual output of the pre-market battle plan.
   */
  const handleSavePlan = (notes: string) => {
      handleUpdatePreMarket(notes);
      notify("Battle Plan Saved", "success");
  };

  /**
   * handleResetApp: Clears all local application state and reloads to start from a clean state.
   */
  const handleResetApp = () => {
      if (window.confirm("ARE YOU SURE? This will permanently delete all trade logs and settings on this device.")) {
          localStorage.clear();
          window.location.reload();
      }
  };

  const getPageTitle = () => {
     switch(view) {
        case 'dashboard': return 'Dashboard';
        case 'premarket': return 'Pre-Market Center';
        case 'journal': return 'Trade Journal';
        case 'system': return 'My System';
        case 'new': return editingTrade ? 'Edit Trade' : 'Log Trade';
        case 'account': return 'Account & Settings';
        case 'mentor': return 'The War Room';
        case 'psychology': return 'Psychology Profile';
        case 'intelligence': return 'Tactical Intelligence';
        default: return 'TradeMind.AI';
     }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans flex flex-col md:flex-row relative">
      <Toast notification={notification} onClose={() => setNotification(null)} />
      <input type="file" ref={fileInputRef} onChange={handleGlobalFileChange} className="hidden" accept=".json,.csv" />

      {isTiltLocked && (
          <div className="fixed inset-0 z-[200] bg-slate-950 flex flex-col items-center justify-center p-8 text-center">
              <ShieldAlert size={120} className="text-red-500 mb-8 animate-bounce"/>
              <h1 className="text-4xl font-black text-white mb-4 uppercase">Tilt Protocol Activated</h1>
              <p className="text-xl text-slate-400 mb-8 max-w-lg">Banned from trading. Calm down.</p>
              <div className="text-6xl font-black font-mono text-indigo-400 mb-8">{tiltTimer}s</div>
          </div>
      )}

      <nav className="fixed bottom-0 w-full z-40 md:static md:w-64 md:h-screen bg-slate-900 border-t md:border-r border-slate-800 flex md:flex-col shadow-xl md:shrink-0">
         <div className="hidden md:block mb-8 px-4 pt-4">
            <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent flex items-center gap-2">
               <BrainCircuit size={24} className="text-indigo-400" /> TradeMind.AI
            </h1>
         </div>

         <div className="hidden md:flex flex-col w-full px-2 space-y-1">
            <button onClick={() => setView('dashboard')} className={`flex items-center space-x-3 px-4 py-2.5 rounded-lg transition-all ${view === 'dashboard' ? 'bg-indigo-600/10 text-indigo-400' : 'text-slate-400 hover:bg-slate-800'}`}>
              <LayoutDashboard size={18} /><span>Dashboard</span>
            </button>
             <button onClick={() => setView('premarket')} className={`flex items-center space-x-3 px-4 py-2.5 rounded-lg transition-all ${view === 'premarket' ? 'bg-indigo-600/10 text-indigo-400' : 'text-slate-400 hover:bg-slate-800'}`}>
              <Zap size={18} /><span>Pre-Market</span>
            </button>
            <button onClick={() => setView('intelligence')} className={`flex items-center space-x-3 px-4 py-2.5 rounded-lg transition-all ${view === 'intelligence' ? 'bg-indigo-600/10 text-indigo-400' : 'text-slate-400 hover:bg-slate-800'}`}>
              <BrainCircuit size={18} /><span className="text-sm font-medium">Combat Intel</span>
            </button>
            <button onClick={() => setView('mentor')} className={`flex items-center space-x-3 px-4 py-2.5 rounded-lg transition-all ${view === 'mentor' ? 'bg-indigo-600/10 text-indigo-400' : 'text-slate-400 hover:bg-slate-800'}`}>
              <MessageSquare size={18} /><span>Mentor</span>
            </button>
            <button onClick={() => setView('journal')} className={`flex items-center space-x-3 px-4 py-2.5 rounded-lg transition-all ${view === 'journal' ? 'bg-indigo-600/10 text-indigo-400' : 'text-slate-400 hover:bg-slate-800'}`}>
              <BookOpen size={18} /><span>Journal</span>
            </button>
            <button onClick={() => { setEditingTrade(null); setView('new'); }} className={`flex items-center space-x-3 px-4 py-2.5 rounded-lg transition-all ${view === 'new' ? 'bg-indigo-600/10 text-indigo-400' : 'text-slate-400 hover:bg-slate-800'}`}>
              <PlusCircle size={18} /><span>Log Trade</span>
            </button>
            <button onClick={() => setView('system')} className={`flex items-center space-x-3 px-4 py-2.5 rounded-lg transition-all ${view === 'system' ? 'bg-indigo-600/10 text-indigo-400' : 'text-slate-400 hover:bg-slate-800'}`}>
              <Target size={18} /><span>My System</span>
            </button>
            <button onClick={() => setView('account')} className={`flex items-center space-x-3 px-4 py-2.5 rounded-lg transition-all ${view === 'account' ? 'bg-indigo-600/10 text-indigo-400' : 'text-slate-400 hover:bg-slate-800'}`}>
              <User size={18} /><span>Account</span>
            </button>
         </div>

         <div className="md:hidden w-full flex justify-between items-center px-2 py-2">
             <button onClick={() => setView('dashboard')} className={`flex flex-col items-center justify-center w-12 h-12 rounded-xl ${view === 'dashboard' ? 'text-indigo-400' : 'text-slate-500'}`}>
                 <LayoutDashboard size={20} />
             </button>
             <button onClick={() => setView('intelligence')} className={`flex flex-col items-center justify-center w-12 h-12 rounded-xl ${view === 'intelligence' ? 'text-indigo-400' : 'text-slate-500'}`}>
                 <BrainCircuit size={20} />
             </button>
             <button onClick={() => setView('new')} className="bg-indigo-600 text-white rounded-full w-12 h-12 flex items-center justify-center shadow-lg">
                 <PlusCircle size={24} />
             </button>
             <button onClick={() => setView('journal')} className={`flex flex-col items-center justify-center w-12 h-12 rounded-xl ${view === 'journal' ? 'text-indigo-400' : 'text-slate-500'}`}>
                 <BookOpen size={20} />
             </button>
             <button onClick={() => setShowMobileMenu(!showMobileMenu)} className="flex flex-col items-center justify-center w-12 h-12 rounded-xl text-slate-500">
                 <Menu size={20} />
             </button>
             {showMobileMenu && (
                 <div className="absolute bottom-16 right-2 w-48 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl p-2 z-50 flex flex-col">
                     <button onClick={() => {setView('premarket'); setShowMobileMenu(false);}} className="p-3 text-sm text-white hover:bg-slate-700 rounded-lg">Pre-Market</button>
                     <button onClick={() => {setView('mentor'); setShowMobileMenu(false);}} className="p-3 text-sm text-white hover:bg-slate-700 rounded-lg">Mentor</button>
                     <button onClick={() => {setView('account'); setShowMobileMenu(false);}} className="p-3 text-sm text-white hover:bg-slate-700 rounded-lg">Account</button>
                 </div>
             )}
         </div>
      </nav>

      <main className={`flex-1 ${view === 'mentor' ? 'p-0' : 'p-4 md:p-8 pb-24 md:pb-8'} overflow-y-auto`}>
        {view !== 'mentor' && (
            <header className="sticky top-0 z-30 bg-slate-950/80 backdrop-blur-md py-3 -mx-4 px-4 md:-mx-8 md:px-8 border-b border-indigo-500/10 mb-6 flex justify-between items-center">
                <h2 className="text-lg md:text-xl font-bold text-white tracking-tight flex items-center gap-2">
                    {getPageTitle()}
                </h2>
            </header>
        )}

        <div className="max-w-7xl mx-auto">
          {view === 'dashboard' && <Dashboard trades={trades} strategyProfile={strategyProfile} apiKey={apiKey} preMarketNotes={preMarketNotes} preMarketAnalysis={preMarketAnalysis} onUpdatePreMarket={handleUpdatePreMarket} onNavigateToPreMarket={() => setView('premarket')} onViewTrade={handleViewTrade} onNavigateToPsychology={() => setView('psychology')} />}
          {view === 'new' && <TradeForm onSave={handleSaveTrade} onCancel={() => setView('dashboard')} initialData={editingTrade || undefined} apiKey={apiKey} notify={notify} onDelete={handleDeleteTrade} preMarketDone={preMarketAnalysis?.date === new Date().toISOString().split('T')[0]} strategyProfile={strategyProfile}/>}
          {view === 'journal' && <TradeList trades={trades} strategyProfile={strategyProfile} apiKey={apiKey} onEdit={handleEditTrade} onDelete={handleDeleteTrade} onAnalyze={handleAnalyzeTrade} highlightedTradeId={highlightedTradeId} onImport={handleImportTrades} analyzingTradeId={analyzingTradeId}/>}
          {view === 'system' && <MySystem strategyProfile={strategyProfile} onImport={setStrategyProfile} onUpdate={setStrategyProfile} notify={notify}/>}
          {view === 'premarket' && <PreMarketAnalyzer apiKey={apiKey} initialData={preMarketAnalysis?.data} liveData={liveMarketAnalysis?.data} postData={postMarketAnalysis?.data} newsData={newsAnalysis?.data} onAnalysisUpdate={handleUpdatePreMarketAnalysis} onLiveAnalysisUpdate={handleUpdateLiveMarketAnalysis} onPostAnalysisUpdate={handleUpdatePostMarketAnalysis} onNewsAnalysisUpdate={handleUpdateNewsAnalysis} onSavePlan={handleSavePlan} />}
          {view === 'mentor' && <MentorChat trades={trades} strategyProfile={strategyProfile} apiKey={apiKey} />}
          {view === 'psychology' && <PsychologyProfile trades={trades} onBack={() => setView('dashboard')} onViewTrade={handleViewTrade} />}
          {view === 'intelligence' && <IntelligenceCenter trades={trades} strategyProfile={strategyProfile} apiKey={apiKey} onViewTrade={handleViewTrade} />}
          {view === 'account' && <AccountModal isOpen={true} onClose={()=>{}} userProfile={userProfile} syncStatus={syncStatus} authError={authError} onConnect={handleConnectDrive} onLogout={handleLogout} apiKey={apiKey} setApiKey={setApiKey} googleClientId={googleClientId} setGoogleClientId={setGoogleClientId} onSaveSettings={handleSaveSettings} onExportJSON={()=>exportToJSON(trades, strategyProfile)} onExportCSV={()=>exportToCSV(trades)} onImportClick={()=>fileInputRef.current?.click()} onReset={handleResetApp} onForceSave={handleForceSave} onForceLoad={handleManualSync}/>}
        </div>
      </main>
    </div>
  );
};

export default App;
