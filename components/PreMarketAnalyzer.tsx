
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { UploadCloud, Zap, Target, ArrowRight, Activity, TrendingUp, TrendingDown, Layers, Crosshair, BarChart2, CheckCircle, ShieldAlert, Lock, Clock, AlertTriangle, MonitorPlay, Sunset, Flag, Layers as LayersIcon, ChevronDown, ChevronUp, Save, Loader2, BrainCircuit, X, Maximize2, RotateCcw, Globe, Newspaper, Info, Trash2 } from 'lucide-react';
import { PreMarketAnalysis, LiveMarketAnalysis, PostMarketAnalysis, TradeDirection, NewsAnalysis } from '../types';
import { analyzePreMarketRoutine, analyzeLiveMarketRoutine, analyzePostMarketRoutine, fetchMarketNews } from '../services/geminiService';
import { compressImage } from '../services/imageService';

interface PreMarketAnalyzerProps {
    apiKey: string;
    // Data Props
    initialData?: PreMarketAnalysis;
    liveHistory?: { timestamp: string, data: LiveMarketAnalysis }[]; // UPDATED: Accepts History Array
    postData?: PostMarketAnalysis;
    newsData?: NewsAnalysis;
    
    // Timestamp Props
    newsTimestamp?: string;
    preMarketTimestamp?: string;
    // Live Timestamp is inside history items now
    postTimestamp?: string;
    
    // Image Props
    initialImages?: any;
    initialLiveImages?: any;
    initialPostImages?: any;

    // Updaters
    onAnalysisUpdate?: (data: PreMarketAnalysis | null) => void;
    onLiveAnalysisUpdate?: (data: LiveMarketAnalysis | null) => void;
    onPostAnalysisUpdate?: (data: PostMarketAnalysis | null) => void;
    onNewsAnalysisUpdate?: (data: NewsAnalysis | null) => void;

    onImagesUpdate?: (images: any) => void;
    onLiveImagesUpdate?: (images: any) => void;
    onPostImagesUpdate?: (images: any) => void;

    onClose?: () => void;
    onSavePlan?: (notes: string) => void;
}

// Calculate KB size from base64 string
const getImageSizeKB = (base64String: string): string => {
    if (!base64String) return "0";
    const stringLength = base64String.length - 'data:image/jpeg;base64,'.length;
    const sizeInBytes = 4 * Math.ceil(stringLength / 3) * 0.5624896334383812;
    return (sizeInBytes / 1024).toFixed(1);
}

// Helper to format ISO timestamp
const formatAnalysisTime = (isoString?: string) => {
    if (!isoString) return null;
    const date = new Date(isoString);
    return date.toLocaleString('en-US', {
        month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
}

// Helper: Compact Upload Card
const CompactUploadCard = ({ label, icon: Icon, imageSrc, onChange, onClick, onRemove }: any) => (
    <div className={`relative flex flex-col items-center justify-center p-2 rounded-lg border-2 border-dashed transition-all h-24 group overflow-hidden ${imageSrc ? 'border-indigo-500/50' : 'border-slate-700 hover:border-indigo-500/30 bg-slate-800'}`}>
        {imageSrc && (
            <div className="absolute inset-0 z-0 cursor-pointer" onClick={onClick}>
                <img src={imageSrc} alt={label} className="w-full h-full object-cover opacity-60 group-hover:opacity-40 transition-opacity" />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 to-transparent"></div>
            </div>
        )}
        <div className="relative z-10 flex flex-col items-center pointer-events-none">
            <div className="flex items-center gap-1.5 mb-1">
                <Icon size={12} className={imageSrc ? "text-indigo-300 shadow-black drop-shadow-md" : "text-slate-500"} />
                <span className={`text-[10px] font-bold uppercase shadow-black drop-shadow-md ${imageSrc ? "text-white" : "text-slate-500"}`}>{label}</span>
            </div>
            {imageSrc ? (
                <div className="flex flex-col items-center mt-1">
                     <div className="flex items-center gap-1 bg-emerald-900/80 px-2 py-0.5 rounded-full border border-emerald-500/30 backdrop-blur-sm">
                        <CheckCircle size={10} className="text-emerald-400" />
                        <span className="text-[9px] text-emerald-100 font-bold">Ready</span>
                    </div>
                    <span className="text-[8px] text-slate-400 mt-1">{getImageSizeKB(imageSrc)} KB</span>
                </div>
            ) : (
                <UploadCloud size={16} className="text-slate-600 mt-1" />
            )}
        </div>
        {!imageSrc && (
             <input type="file" accept="image/*" onChange={onChange} className="absolute inset-0 opacity-0 cursor-pointer z-20" />
        )}
        {imageSrc && (
             <>
                <button onClick={onClick} className="absolute bottom-1 right-1 p-1.5 bg-slate-900/50 rounded hover:bg-slate-700 text-white opacity-0 group-hover:opacity-100 transition-opacity z-20" title="Preview">
                    <Maximize2 size={12}/>
                </button>
                {onRemove && (
                    <button 
                        onClick={(e) => { e.stopPropagation(); onRemove(); }} 
                        className="absolute top-1 right-1 p-1.5 bg-red-500/80 hover:bg-red-600 text-white rounded z-30 transition-colors shadow-sm cursor-pointer pointer-events-auto" 
                        title="Remove / Re-upload"
                    >
                        <Trash2 size={12}/>
                    </button>
                )}
             </>
        )}
        {/* Helper overlay for re-uploading without removing first (optional, but keep for drag-drop feel) */}
        {imageSrc && !onRemove && (
             <div className="absolute top-0 right-0 w-full h-full z-10">
                 <input type="file" accept="image/*" onChange={onChange} className="absolute top-0 right-0 w-full h-full opacity-0 cursor-pointer" title="Change Image"/> 
             </div>
        )}
    </div>
);

// Helper: Image Modal - Portal Version
const ImageModal = ({ src, onClose }: { src: string | null, onClose: () => void }) => {
    if (!src) return null;
    return createPortal(
        <div className="fixed inset-0 z-[9999] bg-black/95 flex items-center justify-center p-4 backdrop-blur-md animate-fade-in" onClick={onClose}>
            <button onClick={onClose} className="absolute top-4 right-4 p-3 bg-slate-800 rounded-full text-white hover:bg-slate-700 transition border border-slate-700">
                <X size={24} />
            </button>
            <img src={src} className="max-w-full max-h-[90vh] rounded-lg shadow-2xl border border-slate-700 object-contain" onClick={(e) => e.stopPropagation()} />
        </div>,
        document.body
    );
};

// Helper: Direction Badge
const DirectionBadge = ({ dir }: { dir: string }) => {
    const isLong = dir === TradeDirection.LONG || dir === 'Bullish';
    const isShort = dir === TradeDirection.SHORT || dir === 'Bearish';
    const color = isLong ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' : isShort ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' : 'bg-slate-700 text-slate-300';
    return <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${color}`}>{dir}</span>;
};

// --- NEW HELPER: Live Check Result Card (Foldable) ---
const LiveCheckCard: React.FC<{ checkData: LiveMarketAnalysis, timestamp: string, isFoldable?: boolean }> = ({ checkData, timestamp, isFoldable = false }) => {
    const [isOpen, setIsOpen] = useState(!isFoldable);

    const content = (
        <div className="space-y-4 animate-fade-in">
            {/* Status Banner */}
            <div className={`p-4 rounded-xl border flex justify-between items-center ${checkData.status === 'CONFIRMED' ? 'bg-emerald-900/20 border-emerald-500/50' : checkData.status === 'INVALIDATED' ? 'bg-red-900/20 border-red-500/50' : 'bg-amber-900/20 border-amber-500/50'}`}>
                <div>
                    <div className="text-[10px] uppercase font-bold opacity-70 mb-1">Plan Status</div>
                    <div className={`text-2xl font-black uppercase ${checkData.status === 'CONFIRMED' ? 'text-emerald-400' : checkData.status === 'INVALIDATED' ? 'text-red-400' : 'text-amber-400'}`}>
                        {checkData.status}
                    </div>
                </div>
                <div className="text-right">
                    <div className="text-[10px] uppercase font-bold opacity-70 mb-1">Updated Bias</div>
                    <DirectionBadge dir={checkData.updatedBias} />
                </div>
            </div>

            {/* Reality Check */}
            <div className="bg-slate-800 p-5 rounded-xl border border-slate-700">
                <h4 className="text-xs font-bold text-slate-400 uppercase mb-2 flex items-center gap-2">
                    <Activity size={14}/> Reality vs Plan
                </h4>
                <p className="text-sm text-slate-200 italic border-l-2 border-indigo-500 pl-3 leading-relaxed">
                    {checkData.realityCheck}
                </p>
            </div>

            {/* Immediate Action */}
            <div className="bg-slate-800 p-5 rounded-xl border border-slate-700">
                <h4 className="text-xs font-bold text-white uppercase mb-3 flex items-center gap-2">
                    <Zap size={14} className="text-yellow-400"/> Immediate Action
                </h4>
                <div className="bg-slate-900 p-4 rounded-lg text-sm text-white font-medium">
                    {checkData.immediateAction}
                </div>

                {checkData.tradeUpdate && (
                    <div className="mt-4 grid grid-cols-3 gap-3">
                        <div className="bg-slate-900 p-2 rounded border border-slate-800 text-center">
                            <span className="block text-[9px] text-slate-500 uppercase">Entry</span>
                            <span className="text-sm font-bold text-white">{checkData.tradeUpdate.entryPrice}</span>
                        </div>
                        <div className="bg-slate-900 p-2 rounded border border-slate-800 text-center">
                            <span className="block text-[9px] text-slate-500 uppercase">Stop (30pt)</span>
                            <span className="text-sm font-bold text-red-400">{checkData.tradeUpdate.stopLoss}</span>
                        </div>
                        <div className="bg-slate-900 p-2 rounded border border-slate-800 text-center">
                            <span className="block text-[9px] text-slate-500 uppercase">Target (35pt)</span>
                            <span className="text-sm font-bold text-emerald-400">{checkData.tradeUpdate.target}</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );

    if (!isFoldable) return content;

    return (
        <div className="border border-slate-700 rounded-xl overflow-hidden mb-4 bg-slate-800/30">
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex justify-between items-center p-3 hover:bg-slate-800 transition"
            >
                <div className="flex items-center gap-3">
                    <span className="text-[10px] font-mono text-slate-500 bg-slate-900 px-2 py-1 rounded">{new Date(timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                    <span className={`text-xs font-bold uppercase ${checkData.status === 'CONFIRMED' ? 'text-emerald-400' : 'text-slate-300'}`}>
                        {checkData.status}
                    </span>
                </div>
                {isOpen ? <ChevronUp size={14} className="text-slate-500"/> : <ChevronDown size={14} className="text-slate-500"/>}
            </button>
            {isOpen && (
                <div className="p-4 bg-slate-900/50 border-t border-slate-700">
                    {content}
                </div>
            )}
        </div>
    );
};

const PreMarketAnalyzer: React.FC<PreMarketAnalyzerProps> = ({ 
    apiKey, 
    initialData, liveHistory, postData, newsData,
    newsTimestamp, preMarketTimestamp, postTimestamp,
    initialImages, initialLiveImages, initialPostImages,
    onAnalysisUpdate, onLiveAnalysisUpdate, onPostAnalysisUpdate, onNewsAnalysisUpdate,
    onImagesUpdate, onLiveImagesUpdate, onPostImagesUpdate,
    onClose, onSavePlan 
}) => {
    
    // Internal State for View Mode Only
    const [activeView, setActiveView] = useState<'phase0' | 'phase1' | 'phase2' | 'phase3'>('phase0');
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const [isIntelFolded, setIsIntelFolded] = useState(!!initialData);
    
    // Checklists (Local Preference)
    const [checklist, setChecklist] = useState({
        mindset: false,
        environment: false,
        levels: false,
        news: false
    });
    const allChecked = Object.values(checklist).every(Boolean);

    // Analysis Loading States
    const [isNewsAnalyzing, setIsNewsAnalyzing] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isLiveAnalyzing, setIsLiveAnalyzing] = useState(false);
    const [isPostAnalyzing, setIsPostAnalyzing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [includeNews, setIncludeNews] = useState(true);

    // Helper to safely get image values from props
    const getImages = () => initialImages || { market: '', intraday: '', oi: '', multiStrike: '' };
    const getLiveImages = () => initialLiveImages || { liveChart: '', liveOi: '' };
    const getPostImages = () => initialPostImages || { dailyChart: '', eodChart: '', eodOi: '' };

    // Get checks sorted (Newest first)
    const sortedLiveChecks = liveHistory ? [...liveHistory].reverse() : [];
    const latestLiveCheck = sortedLiveChecks[0];
    const previousLiveChecks = sortedLiveChecks.slice(1);

    // Persist Checklist
    useEffect(() => {
        const saved = localStorage.getItem('tradeMind_preFlightChecklist');
        if (saved) {
            try { setChecklist(JSON.parse(saved)); } catch(e){}
        }
    }, []);

    useEffect(() => {
        localStorage.setItem('tradeMind_preFlightChecklist', JSON.stringify(checklist));
    }, [checklist]);

    const toggleCheck = (key: keyof typeof checklist) => {
        setChecklist(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            const compressed = await compressImage(file);
            const current = getImages();
            const updated = { ...current, [field]: compressed };
            if(onImagesUpdate) onImagesUpdate(updated);
            setError(null); 
        } catch (err: any) {
            setError("Failed to process image. Try a smaller file.");
        }
    };

    const handleLiveUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            const compressed = await compressImage(file);
            const current = getLiveImages();
            const updated = { ...current, [field]: compressed };
            if(onLiveImagesUpdate) onLiveImagesUpdate(updated);
            setError(null);
        } catch (err: any) {
            setError("Failed to process live image.");
        }
    };

    // Specific handler to remove a Live image to allow re-runs
    const handleRemoveLiveImage = (field: string) => {
        const current = getLiveImages();
        const updated = { ...current, [field]: '' }; // Set to empty string
        if(onLiveImagesUpdate) onLiveImagesUpdate(updated);
    };

    const handlePostUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            const compressed = await compressImage(file);
            const current = getPostImages();
            const updated = { ...current, [field]: compressed };
            if(onPostImagesUpdate) onPostImagesUpdate(updated);
            setError(null);
        } catch (err: any) {
            setError("Failed to process EOD image.");
        }
    };

    // Phase 0 News Analysis
    const runNewsAnalysis = async () => {
        setError(null);
        setIsNewsAnalyzing(true);
        try {
            // Service handles fallback key
            const result = await fetchMarketNews(apiKey);
            if (onNewsAnalysisUpdate) onNewsAnalysisUpdate(result);
        } catch (e: any) {
            setError(e.message || "News Analysis Failed");
        } finally {
            setIsNewsAnalyzing(false);
        }
    }

    const runAnalysis = async () => {
        setError(null);
        const images = getImages();
        if (!images.market || !images.intraday || !images.oi || !images.multiStrike) { setError("Incomplete Intelligence."); return; }
        setIsAnalyzing(true);
        try {
            const newsToUse = (includeNews && newsData) ? newsData : null;
            // Service handles fallback key
            const result = await analyzePreMarketRoutine(images, newsToUse, apiKey);
            if (onAnalysisUpdate) onAnalysisUpdate(result);
            setIsIntelFolded(true);
        } catch (e: any) {
            setError(e.message || "Analysis failed.");
        } finally {
            setIsAnalyzing(false);
        }
    };

    const runLiveCheck = async () => {
        setError(null);
        const lImages = getLiveImages();
        if (!initialData) { setError("No Pre-Market Plan found."); return; }
        if (!lImages.liveChart || !lImages.liveOi) { setError("Upload Live Chart & OI."); return; }
        setIsLiveAnalyzing(true);
        try {
            // Service handles fallback key
            const result = await analyzeLiveMarketRoutine(lImages, initialData, apiKey);
            // Parent handles appending to history
            if (onLiveAnalysisUpdate) onLiveAnalysisUpdate(result);
        } catch(e: any) {
            setError(e.message || "Live check failed.");
        } finally {
            setIsLiveAnalyzing(false);
        }
    };

    const runPostAnalysis = async () => {
        setError(null);
        const pImages = getPostImages();
        if (!pImages.dailyChart || !pImages.eodChart || !pImages.eodOi) { setError("Upload EOD Charts."); return; }
        setIsPostAnalyzing(true);
        try {
            // Service handles fallback key
            const result = await analyzePostMarketRoutine(pImages, initialData || null, apiKey);
            if (onPostAnalysisUpdate) onPostAnalysisUpdate(result);
        } catch(e: any) {
            setError(e.message || "Post-Market analysis failed.");
        } finally {
            setIsPostAnalyzing(false);
        }
    };

    const handleSaveToNotes = () => {
        if (!initialData || !onSavePlan) return;
        const note = `[AI PLAN] Bias: ${initialData.marketBias}. Thesis: ${initialData.coreThesis}. Levels: Res ${initialData.keyLevels.resistance.join(', ')} / Sup ${initialData.keyLevels.support.join(', ')}.`;
        onSavePlan(note);
    };

    // --- RESET HANDLERS ---
    const handleResetPhase0 = () => {
        if(!window.confirm("Clear News Intelligence data?")) return;
        if (onNewsAnalysisUpdate) onNewsAnalysisUpdate(null);
    }

    const handleResetPhase1 = () => {
        if(!window.confirm("Clear all Pre-Market data and images?")) return;
        if (onAnalysisUpdate) onAnalysisUpdate(null);
        if (onImagesUpdate) onImagesUpdate({ market: '', intraday: '', oi: '', multiStrike: '' });
    };

    const handleResetPhase2 = () => {
        if(!window.confirm("Clear ALL Live Check history?")) return;
        if (onLiveAnalysisUpdate) onLiveAnalysisUpdate(null);
        if (onLiveImagesUpdate) onLiveImagesUpdate({ liveChart: '', liveOi: '' });
    };

    const handleResetPhase3 = () => {
        if(!window.confirm("Clear Post-Market data?")) return;
        if (onPostAnalysisUpdate) onPostAnalysisUpdate(null);
        if (onPostImagesUpdate) onPostImagesUpdate({ dailyChart: '', eodChart: '', eodOi: '' });
    };

    // Helper to safely render Institutional Activity (which can be string or object)
    const renderInstitutionalActivity = (activity: any) => {
        if (!activity) return null;
        if (typeof activity === 'string') return activity;
        // Fix for React Error #31 - Check specifically for object type and not null
        if (typeof activity === 'object') {
            return (
                <div className="grid grid-cols-3 gap-2 text-center mt-3 bg-slate-950 p-2 rounded-lg border border-slate-800">
                    <div className="p-1">
                        <span className="block text-[9px] text-slate-500 uppercase font-bold">FII</span>
                        <span className="text-xs font-mono font-bold text-white">{activity.FII_Activity || activity.fii || '-'}</span>
                    </div>
                    <div className="p-1 border-l border-slate-800">
                        <span className="block text-[9px] text-slate-500 uppercase font-bold">DII</span>
                        <span className="text-xs font-mono font-bold text-white">{activity.DII_Activity || activity.dii || '-'}</span>
                    </div>
                    <div className="p-1 border-l border-slate-800">
                        <span className="block text-[9px] text-slate-500 uppercase font-bold">Net</span>
                        <span className={`text-xs font-mono font-bold ${String(activity.Net_Institutional_Flow).includes('-') ? 'text-red-400' : 'text-emerald-400'}`}>{activity.Net_Institutional_Flow || activity.net || '-'}</span>
                    </div>
                </div>
            );
        }
        // Last resort fallback
        try {
            return JSON.stringify(activity);
        } catch (e) {
            return "Data Unavailable";
        }
    };

    const currentImages = getImages();
    const currentLiveImages = getLiveImages();
    const currentPostImages = getPostImages();

    return (
        <div className="bg-slate-900 min-h-screen md:min-h-0 md:h-full w-full flex flex-col pb-20 md:pb-0 animate-fade-in relative">
            
            {/* Lightbox */}
            <ImageModal src={previewImage} onClose={() => setPreviewImage(null)} />

            {/* TABS NAVIGATION */}
            <div className="px-4 pt-4 sticky top-0 bg-slate-900 z-20">
                <div className="bg-slate-800 p-1 rounded-xl flex gap-1 shadow-md border border-slate-700 overflow-x-auto custom-scrollbar">
                    <button 
                        onClick={() => setActiveView('phase0')}
                        className={`flex-1 py-3 px-2 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all whitespace-nowrap min-w-[100px] ${activeView === 'phase0' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}
                    >
                        <Newspaper size={16} /> News
                    </button>
                    <button 
                        onClick={() => setActiveView('phase1')}
                        className={`flex-1 py-3 px-2 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all whitespace-nowrap min-w-[100px] ${activeView === 'phase1' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}
                    >
                        <BrainCircuit size={16} /> Plan
                    </button>
                    <button 
                        onClick={() => setActiveView('phase2')}
                        className={`flex-1 py-3 px-2 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all whitespace-nowrap min-w-[100px] ${activeView === 'phase2' ? 'bg-red-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}
                    >
                        <ShieldAlert size={16} /> Live
                    </button>
                     <button 
                        onClick={() => setActiveView('phase3')}
                        className={`flex-1 py-3 px-2 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all whitespace-nowrap min-w-[100px] ${activeView === 'phase3' ? 'bg-purple-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}
                    >
                        <Sunset size={16} /> Post
                    </button>
                </div>
            </div>

            {/* PHASE CONTENT */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4">

                {/* --- PHASE 0: NEWS --- */}
                {activeView === 'phase0' && (
                    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in-up">
                         {/* Header Card */}
                        <div className="bg-gradient-to-r from-blue-900/20 to-slate-800 border border-blue-500/20 p-6 rounded-2xl">
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
                                        <Globe size={24} />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-white uppercase tracking-wide">Global Intelligence</h3>
                                        <div className="flex flex-col">
                                            <p className="text-xs text-blue-400 font-bold">Real-time Web Search Scan</p>
                                            {newsTimestamp && (
                                                <span className="text-[10px] text-slate-500 mt-1 font-mono">
                                                    Updated: {formatAnalysisTime(newsTimestamp)}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex flex-wrap gap-2 w-full md:w-auto mt-2 md:mt-0">
                                    {newsData && (
                                        <button onClick={handleResetPhase0} className="px-3 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-bold uppercase rounded-xl border border-slate-600 transition flex items-center gap-1 justify-center flex-1 md:flex-none">
                                            <RotateCcw size={14}/> Reset
                                        </button>
                                    )}
                                    {!isNewsAnalyzing ? (
                                        <button onClick={runNewsAnalysis} className="flex-1 md:flex-none px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold uppercase tracking-widest rounded-xl shadow-lg shadow-blue-900/40 flex items-center justify-center gap-2 transition">
                                            <Zap size={14} className="fill-current"/> Scan Markets
                                        </button>
                                    ) : (
                                        <button disabled className="flex-1 md:flex-none px-6 py-2.5 bg-slate-800 text-blue-400 text-xs font-bold uppercase tracking-widest rounded-xl border border-blue-500/30 flex items-center justify-center gap-2 animate-pulse cursor-not-allowed">
                                            <Loader2 size={14} className="animate-spin"/> Scanning Web...
                                        </button>
                                    )}
                                </div>
                            </div>
                            
                            {error && (
                                <div className="mt-4 p-3 bg-red-900/20 border border-red-500/30 rounded-lg flex items-center gap-2 animate-fade-in">
                                    <AlertTriangle size={16} className="text-red-400 shrink-0"/>
                                    <span className="text-red-200 text-xs font-medium">{error}</span>
                                </div>
                            )}
                        </div>

                        {newsData ? (
                            <div className="space-y-6">
                                {/* Sentiment Score */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="bg-slate-800 p-5 rounded-xl border border-slate-700 flex flex-col items-center justify-center text-center">
                                        <span className="text-[10px] text-slate-500 font-bold uppercase mb-2">Market Sentiment</span>
                                        <div className={`text-3xl font-black ${newsData.sentiment === 'Bullish' ? 'text-emerald-400' : newsData.sentiment === 'Bearish' ? 'text-red-400' : 'text-amber-400'}`}>
                                            {newsData.sentiment}
                                        </div>
                                        <div className="mt-2 text-xs font-bold bg-slate-900 px-3 py-1 rounded-full border border-slate-700">
                                            Score: {newsData.sentimentScore}/10
                                        </div>
                                    </div>
                                    <div className="md:col-span-2 bg-slate-800 p-5 rounded-xl border border-slate-700">
                                        <h4 className="text-xs font-bold text-white uppercase mb-3 flex items-center gap-2"><Activity size={14} className="text-blue-400"/> Global Cues</h4>
                                        <div className="grid grid-cols-3 gap-4 text-center">
                                            <div className="bg-slate-900 p-3 rounded-lg">
                                                <span className="block text-[9px] text-slate-500 uppercase mb-1">US Markets</span>
                                                <span className="text-xs font-bold text-slate-200">{newsData.globalCues.usMarket}</span>
                                            </div>
                                            <div className="bg-slate-900 p-3 rounded-lg">
                                                <span className="block text-[9px] text-slate-500 uppercase mb-1">Asian Markets</span>
                                                <span className="text-xs font-bold text-slate-200">{newsData.globalCues.asianMarket}</span>
                                            </div>
                                            <div className="bg-slate-900 p-3 rounded-lg border border-indigo-500/30 bg-indigo-900/10">
                                                <span className="block text-[9px] text-indigo-300 uppercase mb-1">Gift Nifty</span>
                                                <span className="text-xs font-bold text-white">{newsData.globalCues.giftNifty}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Summary & Headlines */}
                                <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700">
                                    <h4 className="text-xs font-bold text-slate-400 uppercase mb-4 flex items-center gap-2">
                                        <Info size={14}/> Executive Summary
                                    </h4>
                                    <p className="text-sm text-slate-300 leading-relaxed mb-6 border-l-2 border-blue-500 pl-4">
                                        {newsData.summary}
                                    </p>
                                    
                                    <div className="space-y-2">
                                        {newsData.keyHeadlines.map((headline, idx) => (
                                            <div key={idx} className="flex items-start gap-3 p-3 bg-slate-900/50 rounded-lg">
                                                <span className="text-blue-500 mt-1">•</span>
                                                <span className="text-xs text-slate-300 font-medium">{headline}</span>
                                            </div>
                                        ))}
                                    </div>

                                    {newsData.institutionalActivity && (
                                        <div className="mt-6 pt-4 border-t border-slate-700">
                                            <h5 className="text-[10px] font-bold text-slate-500 uppercase mb-2">Institutional Data (FII/DII)</h5>
                                            <div className="text-xs text-slate-300 font-mono">
                                                {renderInstitutionalActivity(newsData.institutionalActivity)}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-12 border-2 border-dashed border-slate-800 rounded-2xl">
                                <Globe size={48} className="mx-auto text-slate-700 mb-4"/>
                                <p className="text-slate-500 text-sm">Run a scan to pull real-time global cues.</p>
                            </div>
                        )}
                    </div>
                )}

                {/* --- PHASE 1: PLAN --- */}
                {activeView === 'phase1' && (
                    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in-up">
                        {/* Header */}
                        <div className="bg-indigo-900/20 border border-indigo-500/20 p-6 rounded-2xl">
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400">
                                        <Target size={24} />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-white uppercase tracking-wide">Mission Planning</h3>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs text-indigo-400 font-bold">Phase 1: Pre-Market Analysis</span>
                                            {preMarketTimestamp && <span className="text-[10px] text-slate-500 font-mono">| {formatAnalysisTime(preMarketTimestamp)}</span>}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex flex-wrap gap-2 w-full md:w-auto mt-2 md:mt-0">
                                    {initialData && (
                                        <button onClick={handleResetPhase1} className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-bold uppercase rounded-xl border border-slate-600 transition flex items-center gap-1 justify-center flex-1 md:flex-none">
                                            <RotateCcw size={14}/> Reset
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* News Toggle */}
                            <div className="flex items-center gap-2 mb-4">
                                <input type="checkbox" id="incNews" checked={includeNews} onChange={(e) => setIncludeNews(e.target.checked)} className="rounded border-slate-600 bg-slate-800 text-indigo-500 focus:ring-offset-slate-900"/>
                                <label htmlFor="incNews" className="text-xs text-slate-400 select-none cursor-pointer">Include News Intelligence context (if available)</label>
                            </div>

                            {/* Checklist */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
                                {Object.entries(checklist).map(([key, val]) => (
                                    <button 
                                        key={key} 
                                        onClick={() => toggleCheck(key as any)}
                                        className={`flex items-center justify-center p-2 rounded-lg border text-[10px] font-bold uppercase transition-all ${val ? 'bg-emerald-900/20 border-emerald-500/30 text-emerald-400' : 'bg-slate-800 border-slate-700 text-slate-500 hover:border-slate-600'}`}
                                    >
                                        <CheckCircle size={12} className={`mr-1.5 ${val ? 'opacity-100' : 'opacity-0'}`}/> {key}
                                    </button>
                                ))}
                            </div>

                            {error && (
                                <div className="p-3 bg-red-900/20 border border-red-500/30 rounded-lg flex items-center gap-2 animate-fade-in text-red-200 text-xs font-medium">
                                    <AlertTriangle size={16} className="shrink-0"/> {error}
                                </div>
                            )}
                        </div>

                        {/* Upload Grid */}
                        {!initialData && (
                            <>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-fade-in">
                                    <CompactUploadCard label="Market Graph" icon={BarChart2} imageSrc={currentImages.market} onChange={(e: any) => handleUpload(e, 'market')} onClick={() => setPreviewImage(currentImages.market)} />
                                    <CompactUploadCard label="5m Intraday" icon={Activity} imageSrc={currentImages.intraday} onChange={(e: any) => handleUpload(e, 'intraday')} onClick={() => setPreviewImage(currentImages.intraday)} />
                                    <CompactUploadCard label="Total OI" icon={Layers} imageSrc={currentImages.oi} onChange={(e: any) => handleUpload(e, 'oi')} onClick={() => setPreviewImage(currentImages.oi)} />
                                    <CompactUploadCard label="Multi-Strike" icon={Crosshair} imageSrc={currentImages.multiStrike} onChange={(e: any) => handleUpload(e, 'multiStrike')} onClick={() => setPreviewImage(currentImages.multiStrike)} />
                                </div>
                                
                                {/* MOVED GENERATE BUTTON HERE */}
                                {!isAnalyzing ? (
                                    <button onClick={runAnalysis} className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-sm uppercase tracking-widest shadow-lg shadow-indigo-900/50 flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-[0.99] animate-fade-in-up">
                                        <BrainCircuit size={18} /> Generate Battle Plan
                                    </button>
                                ) : (
                                    <button disabled className="w-full py-4 bg-slate-800 text-indigo-400 rounded-xl font-bold text-sm uppercase tracking-widest border border-indigo-500/30 flex items-center justify-center gap-2 cursor-not-allowed">
                                        <Loader2 size={18} className="animate-spin" /> Analyzing Intelligence...
                                    </button>
                                )}
                            </>
                        )}

                        {/* Analysis Result */}
                        {initialData && (
                            <div className="space-y-6 animate-fade-in-up">
                                {/* Intel Header (Foldable) */}
                                <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
                                    <div 
                                        className="p-4 bg-slate-900/50 flex justify-between items-center cursor-pointer hover:bg-slate-800 transition"
                                        onClick={() => setIsIntelFolded(!isIntelFolded)}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`text-2xl font-black uppercase ${initialData.marketBias === 'Bullish' ? 'text-emerald-400' : initialData.marketBias === 'Bearish' ? 'text-red-400' : 'text-amber-400'}`}>
                                                {initialData.marketBias}
                                            </div>
                                            <div className="h-8 w-[1px] bg-slate-700"></div>
                                            <div>
                                                <div className="text-[10px] text-slate-500 uppercase font-bold">Confidence</div>
                                                <div className="text-sm font-bold text-white">{initialData.confidenceScore}/10</div>
                                            </div>
                                        </div>
                                        {isIntelFolded ? <ChevronDown size={20} className="text-slate-500"/> : <ChevronUp size={20} className="text-slate-500"/>}
                                    </div>

                                    {!isIntelFolded && (
                                        <div className="p-5 border-t border-slate-700 space-y-6">
                                            {/* Thesis */}
                                            <div>
                                                <h4 className="text-xs font-bold text-slate-400 uppercase mb-2 flex items-center gap-2"><Flag size={14}/> Core Thesis</h4>
                                                <p className="text-sm text-slate-200 leading-relaxed italic border-l-2 border-indigo-500 pl-3">
                                                    {initialData.coreThesis}
                                                </p>
                                            </div>

                                            {/* Levels */}
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="bg-red-900/10 p-3 rounded-lg border border-red-500/20">
                                                    <span className="text-[10px] font-bold text-red-400 uppercase block mb-1">Resistance Zones</span>
                                                    <span className="text-sm font-mono font-bold text-white">{initialData.keyLevels.resistance.join(', ')}</span>
                                                </div>
                                                <div className="bg-emerald-900/10 p-3 rounded-lg border border-emerald-500/20">
                                                    <span className="text-[10px] font-bold text-emerald-400 uppercase block mb-1">Support Zones</span>
                                                    <span className="text-sm font-mono font-bold text-white">{initialData.keyLevels.support.join(', ')}</span>
                                                </div>
                                            </div>

                                            {/* Tactical Plan */}
                                            <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
                                                <div className="flex justify-between items-center mb-3">
                                                    <h4 className="text-xs font-bold text-amber-400 uppercase flex items-center gap-2"><Clock size={14}/> 09:25 - 09:45 Protocol</h4>
                                                </div>
                                                <p className="text-sm text-white font-medium mb-3">{initialData.firstHourPlan.action}</p>
                                                
                                                {initialData.firstHourPlan.potentialTrade && (
                                                    <div className="grid grid-cols-3 gap-2 text-center bg-slate-950 p-2 rounded-lg border border-slate-800">
                                                        <div>
                                                            <span className="block text-[9px] text-slate-500 uppercase">Entry Zone</span>
                                                            <span className="text-xs font-bold text-white">{initialData.firstHourPlan.potentialTrade.entryZone}</span>
                                                        </div>
                                                        <div>
                                                            <span className="block text-[9px] text-slate-500 uppercase">Stop Loss</span>
                                                            <span className="text-xs font-bold text-red-400">{initialData.firstHourPlan.potentialTrade.stopLoss}</span>
                                                        </div>
                                                        <div>
                                                            <span className="block text-[9px] text-slate-500 uppercase">Target</span>
                                                            <span className="text-xs font-bold text-emerald-400">{initialData.firstHourPlan.potentialTrade.target}</span>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Save Button */}
                                <div className="flex justify-end">
                                    <button onClick={handleSaveToNotes} className="flex items-center gap-2 text-xs font-bold text-indigo-400 hover:text-white transition">
                                        <Save size={14}/> Save Plan to Dashboard Note
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* --- PHASE 2: LIVE --- */}
                {activeView === 'phase2' && (
                    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in-up">
                        <div className="bg-red-900/20 border border-red-500/20 p-6 rounded-2xl">
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-red-500/10 rounded-lg text-red-400">
                                        <ShieldAlert size={24} />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-white uppercase tracking-wide">Live Check</h3>
                                        <p className="text-xs text-red-400 font-bold">Phase 2: Validation (09:20 AM+)</p>
                                    </div>
                                </div>
                                <div className="flex flex-wrap gap-2 w-full md:w-auto mt-2 md:mt-0">
                                    {liveHistory && liveHistory.length > 0 && (
                                        <button onClick={handleResetPhase2} className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-bold uppercase rounded-xl border border-slate-600 transition flex items-center gap-1 justify-center flex-1 md:flex-none">
                                            <RotateCcw size={14}/> Reset
                                        </button>
                                    )}
                                </div>
                            </div>

                            {!initialData && (
                                <div className="bg-amber-900/20 text-amber-200 text-xs p-3 rounded-lg border border-amber-500/30 flex items-center gap-2 mb-4">
                                    <AlertTriangle size={14} className="shrink-0"/>
                                    Warning: No Pre-Market Plan. Analysis will be limited.
                                </div>
                            )}

                            {error && (
                                <div className="p-3 bg-slate-900/50 border border-red-500/30 rounded-lg flex items-center gap-2 animate-fade-in text-red-200 text-xs font-medium">
                                    <AlertTriangle size={16} className="shrink-0"/> {error}
                                </div>
                            )}
                        </div>

                        {/* Uploads - With Remove Functionality */}
                        <div className="grid grid-cols-2 gap-4 animate-fade-in">
                            <CompactUploadCard 
                                label="Live 5m Chart" 
                                icon={Activity} 
                                imageSrc={currentLiveImages.liveChart} 
                                onChange={(e: any) => handleLiveUpload(e, 'liveChart')} 
                                onClick={() => setPreviewImage(currentLiveImages.liveChart)}
                                onRemove={() => handleRemoveLiveImage('liveChart')} 
                            />
                            <CompactUploadCard 
                                label="Live OI Data" 
                                icon={Layers} 
                                imageSrc={currentLiveImages.liveOi} 
                                onChange={(e: any) => handleLiveUpload(e, 'liveOi')} 
                                onClick={() => setPreviewImage(currentLiveImages.liveOi)}
                                onRemove={() => handleRemoveLiveImage('liveOi')}
                            />
                        </div>

                        {/* Run Check Button - MOVED HERE */}
                        {!isLiveAnalyzing ? (
                            <button onClick={runLiveCheck} className="w-full py-4 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold text-sm uppercase tracking-widest shadow-lg shadow-red-900/50 flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-[0.99] animate-fade-in-up">
                                <Zap size={18} className="fill-current"/> Run Reality Check
                            </button>
                        ) : (
                            <button disabled className="w-full py-4 bg-slate-800 text-red-400 rounded-xl font-bold text-sm uppercase tracking-widest border border-red-500/30 flex items-center justify-center gap-2 cursor-not-allowed">
                                <Loader2 size={18} className="animate-spin" /> Verifying Market Action...
                            </button>
                        )}

                        {/* LATEST RESULT */}
                        {latestLiveCheck && (
                            <div className="animate-fade-in-up">
                                <div className="mb-2 flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                                    <span className="text-[10px] font-bold uppercase text-slate-400">Latest Intelligence ({new Date(latestLiveCheck.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})})</span>
                                </div>
                                <LiveCheckCard checkData={latestLiveCheck.data} timestamp={latestLiveCheck.timestamp} />
                            </div>
                        )}

                        {/* HISTORY */}
                        {previousLiveChecks.length > 0 && (
                            <div className="pt-6 border-t border-slate-800">
                                <h4 className="text-xs font-bold text-slate-500 uppercase mb-4 flex items-center gap-2">
                                    <Clock size={14}/> Mission History
                                </h4>
                                <div className="space-y-3">
                                    {previousLiveChecks.map((entry, idx) => (
                                        <LiveCheckCard key={idx} checkData={entry.data} timestamp={entry.timestamp} isFoldable={true} />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* --- PHASE 3: POST --- */}
                {activeView === 'phase3' && (
                    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in-up">
                        <div className="bg-purple-900/20 border border-purple-500/20 p-6 rounded-2xl">
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-purple-500/10 rounded-lg text-purple-400">
                                        <Sunset size={24} />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-white uppercase tracking-wide">Post-Market Debrief</h3>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs text-purple-400 font-bold">Phase 3: EOD Review</span>
                                            {postTimestamp && <span className="text-[10px] text-slate-500 font-mono">| {formatAnalysisTime(postTimestamp)}</span>}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex flex-wrap gap-2 w-full md:w-auto mt-2 md:mt-0">
                                    {postData && (
                                        <button onClick={handleResetPhase3} className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-bold uppercase rounded-xl border border-slate-600 transition flex items-center gap-1 justify-center flex-1 md:flex-none">
                                            <RotateCcw size={14}/> Reset
                                        </button>
                                    )}
                                </div>
                            </div>
                            {error && (
                                <div className="p-3 bg-slate-900/50 border border-red-500/30 rounded-lg flex items-center gap-2 animate-fade-in text-red-200 text-xs font-medium">
                                    <AlertTriangle size={16} className="shrink-0"/> {error}
                                </div>
                            )}
                        </div>

                        {!postData && (
                            <>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-fade-in">
                                    <CompactUploadCard label="Daily Chart" icon={BarChart2} imageSrc={currentPostImages.dailyChart} onChange={(e: any) => handlePostUpload(e, 'dailyChart')} onClick={() => setPreviewImage(currentPostImages.dailyChart)} />
                                    <CompactUploadCard label="EOD 5m Chart" icon={Activity} imageSrc={currentPostImages.eodChart} onChange={(e: any) => handlePostUpload(e, 'eodChart')} onClick={() => setPreviewImage(currentPostImages.eodChart)} />
                                    <CompactUploadCard label="EOD OI" icon={Layers} imageSrc={currentPostImages.eodOi} onChange={(e: any) => handlePostUpload(e, 'eodOi')} onClick={() => setPreviewImage(currentPostImages.eodOi)} />
                                </div>

                                {/* MOVED GENERATE BUTTON HERE */}
                                {!isPostAnalyzing ? (
                                    <button onClick={runPostAnalysis} className="w-full py-4 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold text-sm uppercase tracking-widest shadow-lg shadow-purple-900/50 flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-[0.99] animate-fade-in-up">
                                        <BrainCircuit size={18} /> Generate EOD Report
                                    </button>
                                ) : (
                                    <button disabled className="w-full py-4 bg-slate-800 text-purple-400 rounded-xl font-bold text-sm uppercase tracking-widest border border-purple-500/30 flex items-center justify-center gap-2 cursor-not-allowed">
                                        <Loader2 size={18} className="animate-spin" /> Compiling Debrief...
                                    </button>
                                )}
                            </>
                        )}

                        {postData && (
                            <div className="space-y-6 animate-fade-in-up">
                                {/* Accuracy Badge */}
                                <div className="bg-slate-800 rounded-xl p-5 border border-slate-700 flex justify-between items-center">
                                    <div>
                                        <h4 className="text-[10px] uppercase font-bold text-slate-500 mb-1">Prediction Accuracy</h4>
                                        <div className={`text-xl font-black uppercase ${postData.predictionAccuracy === 'High' ? 'text-emerald-400' : postData.predictionAccuracy === 'Low' ? 'text-red-400' : 'text-amber-400'}`}>
                                            {postData.predictionAccuracy}
                                        </div>
                                    </div>
                                    <div className="text-right max-w-md">
                                        <h4 className="text-[10px] uppercase font-bold text-slate-500 mb-1">Actual Trend</h4>
                                        <p className="text-sm font-bold text-white">{postData.actualTrend}</p>
                                    </div>
                                </div>

                                {/* Plan vs Reality */}
                                <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700">
                                    <h4 className="text-xs font-bold text-white uppercase mb-4 flex items-center gap-2"><Activity size={14} className="text-blue-400"/> Plan vs Reality</h4>
                                    <p className="text-sm text-slate-300 leading-relaxed border-l-2 border-slate-600 pl-4">
                                        {postData.planVsReality}
                                    </p>
                                </div>

                                {/* Key Takeaway */}
                                <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 relative overflow-hidden">
                                    <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none"><Target size={80}/></div>
                                    <h4 className="text-xs font-bold text-amber-400 uppercase mb-4 flex items-center gap-2"><Target size={14}/> Major Lesson</h4>
                                    <p className="text-lg font-medium text-white italic">"{postData.keyTakeaways}"</p>
                                </div>

                                {/* Tomorrow's Outlook */}
                                <div className="bg-gradient-to-br from-indigo-900/30 to-slate-800 p-6 rounded-2xl border border-indigo-500/30">
                                    <h4 className="text-sm font-bold text-white uppercase mb-4 flex items-center gap-2"><Sunset size={16} className="text-purple-400"/> Tomorrow's Prep</h4>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                                        <div>
                                            <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Bias</span>
                                            <DirectionBadge dir={postData.tomorrowOutlook.bias} />
                                        </div>
                                        <div>
                                            <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Watch For</span>
                                            <p className="text-xs text-white font-medium">{postData.tomorrowOutlook.watchFor}</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-700">
                                            <span className="text-[10px] font-bold text-red-400 uppercase block mb-1">Early Resistance</span>
                                            <span className="text-sm font-mono font-bold text-white">{postData.tomorrowOutlook.earlyLevels.resistance.join(', ')}</span>
                                        </div>
                                        <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-700">
                                            <span className="text-[10px] font-bold text-emerald-400 uppercase block mb-1">Early Support</span>
                                            <span className="text-sm font-mono font-bold text-white">{postData.tomorrowOutlook.earlyLevels.support.join(', ')}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

            </div>
        </div>
    );
};

export default PreMarketAnalyzer;
