
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { UploadCloud, Zap, Target, ArrowRight, Activity, TrendingUp, TrendingDown, Layers, Crosshair, BarChart2, CheckCircle, ShieldAlert, Lock, Clock, AlertTriangle, MonitorPlay, Sunset, Flag, Layers as LayersIcon, ChevronDown, ChevronUp, Save, Loader2, BrainCircuit, X, Maximize2, RotateCcw, Globe, Newspaper } from 'lucide-react';
import { PreMarketAnalysis, LiveMarketAnalysis, PostMarketAnalysis, TradeDirection, NewsAnalysis } from '../types';
import { analyzePreMarketRoutine, analyzeLiveMarketRoutine, analyzePostMarketRoutine, fetchMarketNews } from '../services/geminiService';
import { compressImage } from '../services/imageService';

interface PreMarketAnalyzerProps {
    apiKey: string;
    // Data Props
    initialData?: PreMarketAnalysis;
    liveData?: LiveMarketAnalysis;
    postData?: PostMarketAnalysis;
    newsData?: NewsAnalysis;
    
    // Timestamp Props
    newsTimestamp?: string;
    preMarketTimestamp?: string;
    liveTimestamp?: string;
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
const CompactUploadCard = ({ label, icon: Icon, imageSrc, onChange, onClick }: any) => (
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
             <button onClick={onClick} className="absolute bottom-1 right-1 p-1 bg-slate-900/50 rounded hover:bg-slate-700 text-white opacity-0 group-hover:opacity-100 transition-opacity z-20" title="Preview">
                 <Maximize2 size={12}/>
             </button>
        )}
        {imageSrc && (
             <div className="absolute top-0 right-0 w-full h-full z-10">
                 <input type="file" accept="image/*" onChange={onChange} className="absolute top-0 right-0 w-6 h-6 opacity-0 cursor-pointer" title="Change Image"/> 
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

const PreMarketAnalyzer: React.FC<PreMarketAnalyzerProps> = ({ 
    apiKey, 
    initialData, liveData, postData, newsData,
    newsTimestamp, preMarketTimestamp, liveTimestamp, postTimestamp,
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
        if (!apiKey) { setError("API Key missing."); return; }
        setIsNewsAnalyzing(true);
        try {
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
        if (!apiKey) { setError("API Key missing."); return; }
        if (!images.market || !images.intraday || !images.oi || !images.multiStrike) { setError("Incomplete Intelligence."); return; }
        setIsAnalyzing(true);
        try {
            const newsToUse = (includeNews && newsData) ? newsData : null;
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
        if (!apiKey) { setError("API Key missing."); return; }
        if (!initialData) { setError("No Pre-Market Plan found."); return; }
        if (!lImages.liveChart || !lImages.liveOi) { setError("Upload Live Chart & OI."); return; }
        setIsLiveAnalyzing(true);
        try {
            const result = await analyzeLiveMarketRoutine(lImages, initialData, apiKey);
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
        if (!apiKey) { setError("API Key missing."); return; }
        if (!pImages.dailyChart || !pImages.eodChart || !pImages.eodOi) { setError("Upload EOD Charts."); return; }
        setIsPostAnalyzing(true);
        try {
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
        if(!window.confirm("Clear Live Check data?")) return;
        if (onLiveAnalysisUpdate) onLiveAnalysisUpdate(null);
        if (onLiveImagesUpdate) onLiveImagesUpdate({ liveChart: '', liveOi: '' });
    };

    const handleResetPhase3 = () => {
        if(!window.confirm("Clear Post-Market data?")) return;
        if (onPostAnalysisUpdate) onPostAnalysisUpdate(null);
        if (onPostImagesUpdate) onPostImagesUpdate({ dailyChart: '', eodChart: '', eodOi: '' });
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

            <div className="flex-1 overflow-y-auto custom-scrollbar p-4">

                {/* ========================== PHASE 0: NEWS INTEL ========================== */}
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
                                <div className="flex gap-2">
                                    {newsData && (
                                        <button onClick={handleResetPhase0} className="px-3 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-bold uppercase rounded-xl border border-slate-600 transition flex items-center gap-1">
                                            <RotateCcw size={14}/> Reset
                                        </button>
                                    )}
                                    {!isNewsAnalyzing ? (
                                        <button onClick={runNewsAnalysis} className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold uppercase tracking-widest rounded-xl shadow-lg shadow-blue-900/40 flex items-center gap-2 transition">
                                            <Zap size={14} className="fill-current"/> Scan Markets
                                        </button>
                                    ) : (
                                        <button disabled className="px-6 py-2.5 bg-slate-800 text-blue-400 text-xs font-bold uppercase tracking-widest rounded-xl border border-blue-500/30 flex items-center gap-2 animate-pulse cursor-not-allowed">
                                            <Loader2 size={14} className="animate-spin"/> Scanning Web...
                                        </button>
                                    )}
                                </div>
                            </div>
                            
                            {error && (
                                <div className="mt-4 p-3 bg-red-900/20 border border-red-500/30 rounded-lg flex items-center gap-2 animate-fade-in">
                                    <AlertTriangle size={16} className="text-red-400 shrink-0"/>
                                    <span className="text-xs text-red-200 font-bold">{error}</span>
                                </div>
                            )}
                        </div>

                        {newsData && (
                             <div className="space-y-4 animate-fade-in">
                                {/* Sentiment & Gift Nifty Row */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="bg-slate-800 p-5 rounded-xl border border-slate-700 flex flex-col justify-center items-center text-center relative overflow-hidden">
                                        <div className={`absolute top-0 w-full h-1 ${newsData.sentiment === 'Bullish' ? 'bg-emerald-500' : newsData.sentiment === 'Bearish' ? 'bg-red-500' : 'bg-amber-500'}`}></div>
                                        <div className="text-[10px] text-slate-500 uppercase font-bold mb-1">Overall Sentiment</div>
                                        <div className={`text-2xl font-black uppercase mb-1 ${newsData.sentiment === 'Bullish' ? 'text-emerald-400' : newsData.sentiment === 'Bearish' ? 'text-red-400' : 'text-amber-400'}`}>
                                            {newsData.sentiment}
                                        </div>
                                        <div className="text-[10px] text-slate-500 font-bold bg-slate-900 px-2 py-0.5 rounded-full border border-slate-700">
                                            Score: {newsData.sentimentScore}/10
                                        </div>
                                    </div>
                                    <div className="md:col-span-2 bg-slate-800 p-5 rounded-xl border border-slate-700 flex flex-col justify-center">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Activity size={14} className="text-indigo-400"/>
                                            <span className="text-[10px] text-indigo-400 font-bold uppercase">Executive Summary</span>
                                        </div>
                                        <p className="text-sm text-slate-200 leading-relaxed font-medium italic">
                                            "{newsData.summary.replace(/^"|"$/g, '')}"
                                        </p>
                                    </div>
                                </div>

                                {/* Global Cues Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                     <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800">
                                         <div className="text-[10px] text-slate-500 font-bold uppercase mb-1 flex items-center gap-1"><Globe size={10}/> US Markets</div>
                                         <div className="text-sm font-bold text-slate-200">{newsData.globalCues.usMarket}</div>
                                     </div>
                                     <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800">
                                         <div className="text-[10px] text-slate-500 font-bold uppercase mb-1 flex items-center gap-1"><Globe size={10}/> Asian Markets</div>
                                         <div className="text-sm font-bold text-slate-200">{newsData.globalCues.asianMarket}</div>
                                     </div>
                                     <div className="bg-indigo-900/20 p-4 rounded-xl border border-indigo-500/30">
                                         <div className="text-[10px] text-indigo-400 font-bold uppercase mb-1 flex items-center gap-1"><Activity size={10}/> Gift Nifty</div>
                                         <div className="text-sm font-bold text-white">{newsData.globalCues.giftNifty}</div>
                                     </div>
                                </div>
                                
                                {/* Headlines & FII */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="md:col-span-2 bg-slate-800 p-5 rounded-xl border border-slate-700">
                                        <h4 className="text-xs font-bold text-white uppercase mb-3 flex items-center gap-2">
                                            <Newspaper size={14} className="text-slate-400"/> Key Headlines
                                        </h4>
                                        <ul className="space-y-2">
                                            {newsData.keyHeadlines.map((headline, idx) => (
                                                <li key={idx} className="text-xs text-slate-300 flex items-start gap-2">
                                                    <span className="text-slate-600 mt-0.5">•</span> {headline}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                    <div className="bg-slate-800 p-5 rounded-xl border border-slate-700">
                                        <h4 className="text-xs font-bold text-white uppercase mb-3 flex items-center gap-2">
                                            <BarChart2 size={14} className="text-slate-400"/> FII / DII Data
                                        </h4>
                                        <p className="text-xs text-slate-300 bg-slate-900 p-3 rounded-lg border border-slate-800">
                                            {newsData.institutionalActivity || "Data not available in search snippet."}
                                        </p>
                                    </div>
                                </div>
                             </div>
                        )}
                    </div>
                )}

                {/* ========================== PHASE 1 VIEW ========================== */}
                {activeView === 'phase1' && (
                    <div className="space-y-6 animate-fade-in-up max-w-5xl mx-auto">
                        
                        {/* INDEPENDENT PRE-FLIGHT SEQUENCE */}
                        <div className="bg-slate-800/50 rounded-2xl border border-slate-700 p-1">
                            <div className="bg-slate-900/50 p-4 rounded-xl flex items-center justify-between border-b border-slate-700/50 mb-1">
                                <h3 className="text-white font-bold text-xs flex items-center">
                                    <Zap className={`mr-2 ${allChecked ? 'text-yellow-400 fill-yellow-400' : 'text-slate-500'}`} size={14} />
                                    Pre-Flight Sequence
                                </h3>
                                <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase ${allChecked ? 'bg-green-500/20 text-green-400' : 'bg-slate-800 text-slate-500'}`}>
                                    {allChecked ? 'Ready' : 'Pending'}
                                </span>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-1 p-1">
                                {[
                                    { key: 'mindset', label: 'Calm', icon: BrainCircuit },
                                    { key: 'environment', label: 'Focus', icon: Lock },
                                    { key: 'levels', label: 'Levels', icon: Target },
                                    { key: 'news', label: 'News', icon: MonitorPlay }
                                ].map((item) => (
                                    <button 
                                        key={item.key}
                                        onClick={() => toggleCheck(item.key as keyof typeof checklist)} 
                                        className={`flex items-center justify-center p-3 rounded-lg border transition-all duration-200 ${checklist[item.key as keyof typeof checklist] ? 'bg-indigo-600 border-indigo-500 text-white shadow-md' : 'bg-slate-800 border-slate-700 text-slate-500 hover:bg-slate-700'}`}
                                    >
                                        <item.icon size={14} className={`mr-2 ${checklist[item.key as keyof typeof checklist] ? 'text-white' : 'text-slate-500'}`} />
                                        <span className="font-bold text-[10px] uppercase tracking-wide">{item.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* INPUT SECTION */}
                        <div className="bg-slate-800/50 rounded-2xl border border-slate-700 p-4">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <UploadCloud size={14} className="text-indigo-400"/> Upload Intel
                                </h3>
                                <div className="flex items-center gap-3">
                                    {(initialData || currentImages.market) && (
                                        <button onClick={handleResetPhase1} className="text-xs flex items-center gap-1 text-slate-500 hover:text-white transition" title="Clear All Phase 1 Data">
                                            <RotateCcw size={12}/> Reset
                                        </button>
                                    )}
                                    {initialData && (
                                        <div className="flex flex-col items-end">
                                            <span className="text-[10px] text-emerald-400 font-bold flex items-center bg-emerald-900/20 px-2 py-1 rounded border border-emerald-500/30">
                                                <CheckCircle size={10} className="mr-1"/> Analysis Complete
                                            </span>
                                            {preMarketTimestamp && (
                                                <span className="text-[8px] text-slate-500 mt-1 font-mono">
                                                    {formatAnalysisTime(preMarketTimestamp)}
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                                <CompactUploadCard label="Market Graph" icon={Activity} imageSrc={currentImages.market} onChange={(e: any) => handleUpload(e, 'market')} onClick={() => setPreviewImage(currentImages.market)} />
                                <CompactUploadCard label="5m Chart" icon={TrendingUp} imageSrc={currentImages.intraday} onChange={(e: any) => handleUpload(e, 'intraday')} onClick={() => setPreviewImage(currentImages.intraday)} />
                                <CompactUploadCard label="Total OI" icon={BarChart2} imageSrc={currentImages.oi} onChange={(e: any) => handleUpload(e, 'oi')} onClick={() => setPreviewImage(currentImages.oi)} />
                                <CompactUploadCard label="Multi-Strike" icon={LayersIcon} imageSrc={currentImages.multiStrike} onChange={(e: any) => handleUpload(e, 'multiStrike')} onClick={() => setPreviewImage(currentImages.multiStrike)} />
                            </div>

                            {/* News Context Toggle */}
                            {newsData && (
                                <div className="mb-4 flex items-center justify-between bg-slate-900/50 border border-blue-500/20 p-3 rounded-xl">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-blue-500/20 p-2 rounded-lg text-blue-400">
                                            <Newspaper size={16} />
                                        </div>
                                        <div>
                                            <span className="text-xs font-bold text-slate-200 block">Inject News Intelligence</span>
                                            <span className="text-[10px] text-slate-500 block">
                                                Enhance plan with Phase 0 data ({newsData.sentiment})
                                            </span>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => setIncludeNews(!includeNews)}
                                        className={`w-10 h-5 rounded-full relative transition-colors ${includeNews ? 'bg-blue-600' : 'bg-slate-700'}`}
                                    >
                                        <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-transform ${includeNews ? 'left-6' : 'left-1'}`}></div>
                                    </button>
                                </div>
                            )}

                            {/* Error Banner */}
                            {error && (
                                <div className="mb-3 p-3 bg-red-900/20 border border-red-500/30 rounded-lg flex items-center gap-2 animate-fade-in">
                                    <AlertTriangle size={16} className="text-red-400 shrink-0"/>
                                    <span className="text-xs text-red-200 font-bold">{error}</span>
                                </div>
                            )}

                            {!isAnalyzing ? (
                                <button 
                                    onClick={runAnalysis}
                                    className={`w-full py-3 text-xs font-black uppercase tracking-widest rounded-xl transition flex items-center justify-center gap-2 ${initialData ? 'bg-slate-700 text-indigo-300 hover:bg-slate-600 border border-indigo-500/30' : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-lg shadow-indigo-900/50'}`}
                                >
                                    <Zap size={16} className={initialData ? "" : "fill-current"}/> {initialData ? "Re-Generate Plan" : "Generate Battle Plan"}
                                </button>
                            ) : (
                                <div className="w-full py-3 bg-slate-800 rounded-xl flex items-center justify-center gap-2 text-xs font-bold text-indigo-400 animate-pulse border border-indigo-500/30">
                                    <Loader2 size={16} className="animate-spin"/> Analyzing Intelligence...
                                </div>
                            )}
                        </div>

                        {/* RESULTS SECTION */}
                        {initialData ? (
                            <div className="space-y-4">
                                {/* Bias & Thesis */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 relative overflow-hidden flex flex-col justify-center items-center text-center">
                                        <div className={`absolute top-0 left-0 w-1 h-full ${initialData.marketBias === 'Bullish' ? 'bg-emerald-500' : initialData.marketBias === 'Bearish' ? 'bg-red-500' : 'bg-slate-500'}`}></div>
                                        <span className="text-[10px] text-slate-500 font-bold uppercase mb-1">Market Bias</span>
                                        <div className={`text-2xl font-black uppercase mb-1 ${initialData.marketBias === 'Bullish' ? 'text-emerald-400' : initialData.marketBias === 'Bearish' ? 'text-red-400' : 'text-slate-200'}`}>
                                            {initialData.marketBias}
                                        </div>
                                        <div className="text-[10px] text-slate-500 font-bold bg-slate-900 px-2 py-0.5 rounded-full">
                                            Conf: {initialData.confidenceScore}/10
                                        </div>
                                    </div>
                                    <div className="md:col-span-2 bg-slate-800 p-5 rounded-xl border border-slate-700 flex flex-col justify-center">
                                        <span className="text-[10px] text-indigo-400 font-bold uppercase mb-2 flex items-center gap-1"><BrainCircuit size={12}/> Core Thesis</span>
                                        <p className="text-sm text-slate-200 font-medium italic leading-relaxed">{initialData.coreThesis?.replace(/^"|"$/g, '')}</p>
                                        <div className="mt-4 flex gap-4 text-xs font-mono">
                                             <div className="text-red-400"><span className="font-bold opacity-50">RES:</span> {initialData.keyLevels?.resistance?.join(', ') || 'None'}</div>
                                             <div className="text-emerald-400"><span className="font-bold opacity-50">SUP:</span> {initialData.keyLevels?.support?.join(', ') || 'None'}</div>
                                        </div>
                                    </div>
                                </div>

                                {/* First Hour Plan (9:25-9:45) */}
                                <div className="bg-gradient-to-r from-slate-800 to-indigo-900/20 p-6 rounded-xl border border-indigo-500/20 shadow-lg">
                                    <h4 className="text-sm font-black text-indigo-400 uppercase tracking-widest mb-3 flex items-center">
                                        <Clock size={16} className="mr-2"/> 09:25 - 09:45 AM Attack Plan
                                    </h4>
                                    <div className="bg-slate-900/50 border-l-2 border-indigo-500 p-4 rounded-r-xl mb-4">
                                        <p className="text-sm text-slate-200">{initialData.firstHourPlan?.action}</p>
                                    </div>
                                    
                                    {initialData.firstHourPlan?.potentialTrade && (
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                            <div className="bg-slate-900 p-3 rounded-lg border border-slate-700">
                                                <div className="text-[10px] text-slate-500 uppercase font-bold">Direction</div>
                                                <DirectionBadge dir={initialData.firstHourPlan.potentialTrade.direction} />
                                            </div>
                                            <div className="bg-slate-900 p-3 rounded-lg border border-slate-700">
                                                <div className="text-[10px] text-slate-500 uppercase font-bold">Entry Zone</div>
                                                <div className="text-sm font-bold text-white">{initialData.firstHourPlan.potentialTrade.entryZone}</div>
                                            </div>
                                            <div className="bg-slate-900 p-3 rounded-lg border border-slate-700">
                                                <div className="text-[10px] text-slate-500 uppercase font-bold">Stop Loss</div>
                                                <div className="text-sm font-bold text-red-400">{initialData.firstHourPlan.potentialTrade.stopLoss}</div>
                                            </div>
                                            <div className="bg-slate-900 p-3 rounded-lg border border-slate-700">
                                                <div className="text-[10px] text-slate-500 uppercase font-bold">Target</div>
                                                <div className="text-sm font-bold text-emerald-400">{initialData.firstHourPlan.potentialTrade.target}</div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Scenarios & Setups */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Primary Setup */}
                                    {initialData.tradeSetups?.primary && (
                                        <div className="bg-slate-800 p-5 rounded-xl border border-slate-700">
                                            <span className="text-[10px] text-emerald-400 font-bold uppercase mb-2 block">Primary Setup</span>
                                            <div className="flex justify-between items-start mb-2">
                                                <DirectionBadge dir={initialData.tradeSetups.primary.direction} />
                                                <span className="text-xs font-mono text-slate-400">Trigger: {initialData.tradeSetups.primary.trigger}</span>
                                            </div>
                                            <div className="flex gap-3 text-xs font-mono mt-3 pt-3 border-t border-slate-700">
                                                <span className="text-red-400">SL: {initialData.tradeSetups.primary.stopLoss}</span>
                                                <span className="text-emerald-400">TGT: {initialData.tradeSetups.primary.target}</span>
                                            </div>
                                        </div>
                                    )}
                                    {/* Opening Scenarios */}
                                    {initialData.openingScenarios && (
                                        <div className="bg-slate-800 p-5 rounded-xl border border-slate-700 space-y-3">
                                            <div>
                                                <span className="text-[10px] text-emerald-500 font-bold uppercase block mb-1">Gap Up Scenario</span>
                                                <p className="text-xs text-slate-300 leading-snug">{initialData.openingScenarios.gapUp}</p>
                                            </div>
                                            <div>
                                                <span className="text-[10px] text-red-500 font-bold uppercase block mb-1">Gap Down Scenario</span>
                                                <p className="text-xs text-slate-300 leading-snug">{initialData.openingScenarios.gapDown}</p>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Mission Intel (Collapsible) */}
                                <div className="border border-slate-700 rounded-xl overflow-hidden">
                                    <button 
                                        onClick={() => setIsIntelFolded(!isIntelFolded)} 
                                        className="w-full flex justify-between items-center p-3 bg-slate-800 hover:bg-slate-700 transition"
                                    >
                                        <span className="text-xs font-bold text-slate-400 uppercase flex items-center gap-2">
                                            <LayersIcon size={14}/> Mission Intel (Source Images)
                                        </span>
                                        {isIntelFolded ? <ChevronDown size={14}/> : <ChevronUp size={14}/>}
                                    </button>
                                    {!isIntelFolded && (
                                        <div className="p-4 bg-slate-900 grid grid-cols-2 md:grid-cols-4 gap-4 animate-fade-in">
                                            {Object.entries(currentImages).map(([key, src]) => src && (
                                                <div key={key} className="relative group cursor-pointer" onClick={() => setPreviewImage(src as string)}>
                                                    <img src={src as string} className="w-full h-24 object-cover rounded border border-slate-700" alt={key} />
                                                    <div className="absolute bottom-0 left-0 bg-black/60 text-white text-[9px] uppercase font-bold px-1 rounded-tr">{key}</div>
                                                    <div className="absolute top-1 right-1 bg-black/60 text-white text-[8px] px-1 rounded">{getImageSizeKB(src as string)} KB</div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="flex justify-center pt-4">
                                    <button onClick={handleSaveToNotes} className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2 rounded-lg font-bold text-xs uppercase tracking-wider flex items-center transition">
                                        <Save size={16} className="mr-2"/> Save Plan to Dashboard
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-20 opacity-50">
                                <Target size={48} className="mx-auto mb-4 text-slate-600"/>
                                <p className="text-slate-400 text-sm">Upload charts above to generate your battle plan.</p>
                            </div>
                        )}
                    </div>
                )}

                {/* ========================== PHASE 2 VIEW ========================== */}
                {activeView === 'phase2' && (
                    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in-up">
                        {!initialData ? (
                            <div className="bg-slate-800/50 border border-slate-700 p-8 rounded-2xl text-center flex flex-col items-center">
                                <Lock size={48} className="text-slate-600 mb-4"/>
                                <h3 className="text-xl font-bold text-slate-300 mb-2">Phase 2 Locked</h3>
                                <p className="text-slate-500 text-sm max-w-md mx-auto mb-6">
                                    You must complete Phase 1 (Pre-Market Plan) before you can run a Live Combat Check.
                                </p>
                                <button onClick={() => setActiveView('phase1')} className="text-indigo-400 hover:text-white font-bold text-xs uppercase flex items-center">
                                    Go to Phase 1 <ArrowRight size={14} className="ml-1"/>
                                </button>
                            </div>
                        ) : (
                            <>
                                {/* HEADER & UPLOAD */}
                                <div className="bg-red-900/10 border border-red-500/30 p-6 rounded-2xl">
                                    <div className="flex justify-between items-start mb-6">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-red-500/10 rounded-lg text-red-500 animate-pulse">
                                                <ShieldAlert size={24} />
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-bold text-white uppercase tracking-wide">Live Combat Check</h3>
                                                <div className="flex flex-col">
                                                    <p className="text-xs text-red-400 font-bold">Target Time: 09:20 AM</p>
                                                    {liveTimestamp && (
                                                        <span className="text-[8px] text-slate-500 mt-1 font-mono">
                                                            Analyzed: {formatAnalysisTime(liveTimestamp)}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        {(liveData || currentLiveImages.liveChart) && (
                                            <button onClick={handleResetPhase2} className="text-xs flex items-center gap-1 text-red-400/70 hover:text-red-400 transition" title="Clear Phase 2 Data">
                                                <RotateCcw size={12}/> Reset
                                            </button>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 mb-6">
                                        <CompactUploadCard label="Live Chart (9:20)" icon={TrendingUp} imageSrc={currentLiveImages.liveChart} onChange={(e: any) => handleLiveUpload(e, 'liveChart')} onClick={() => setPreviewImage(currentLiveImages.liveChart)} />
                                        <CompactUploadCard label="Live OI Data" icon={BarChart2} imageSrc={currentLiveImages.liveOi} onChange={(e: any) => handleLiveUpload(e, 'liveOi')} onClick={() => setPreviewImage(currentLiveImages.liveOi)} />
                                    </div>

                                    {/* Error Banner */}
                                    {error && (
                                        <div className="mb-3 p-3 bg-red-900/20 border border-red-500/30 rounded-lg flex items-center gap-2 animate-fade-in">
                                            <AlertTriangle size={16} className="text-red-400 shrink-0"/>
                                            <span className="text-xs text-red-200 font-bold">{error}</span>
                                        </div>
                                    )}

                                    {!isLiveAnalyzing ? (
                                        <button 
                                            onClick={runLiveCheck}
                                            className="w-full py-3 bg-red-600 hover:bg-red-500 text-white font-black uppercase tracking-widest rounded-xl transition flex items-center justify-center gap-2 shadow-lg shadow-red-900/40"
                                        >
                                            <Crosshair size={18}/> Run Reality Check
                                        </button>
                                    ) : (
                                        <div className="w-full py-3 bg-slate-800 rounded-xl flex items-center justify-center gap-2 text-xs font-bold text-red-400 animate-pulse border border-red-500/30">
                                            <Loader2 size={16} className="animate-spin"/> Scanning Live Data...
                                        </div>
                                    )}
                                </div>

                                {/* LIVE RESULTS */}
                                {liveData && (
                                    <div className="space-y-4 animate-fade-in">
                                        {/* Status Banner */}
                                        <div className={`p-4 rounded-xl border flex justify-between items-center ${liveData.status === 'CONFIRMED' ? 'bg-emerald-900/20 border-emerald-500/50' : liveData.status === 'INVALIDATED' ? 'bg-red-900/20 border-red-500/50' : 'bg-amber-900/20 border-amber-500/50'}`}>
                                            <div>
                                                <div className="text-[10px] uppercase font-bold opacity-70 mb-1">Plan Status</div>
                                                <div className={`text-2xl font-black uppercase ${liveData.status === 'CONFIRMED' ? 'text-emerald-400' : liveData.status === 'INVALIDATED' ? 'text-red-400' : 'text-amber-400'}`}>
                                                    {liveData.status}
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-[10px] uppercase font-bold opacity-70 mb-1">Updated Bias</div>
                                                <DirectionBadge dir={liveData.updatedBias} />
                                            </div>
                                        </div>

                                        {/* Reality Check */}
                                        <div className="bg-slate-800 p-5 rounded-xl border border-slate-700">
                                            <h4 className="text-xs font-bold text-slate-400 uppercase mb-2 flex items-center gap-2">
                                                <Activity size={14}/> Reality vs Plan
                                            </h4>
                                            <p className="text-sm text-slate-200 italic border-l-2 border-indigo-500 pl-3 leading-relaxed">
                                                {liveData.realityCheck}
                                            </p>
                                        </div>

                                        {/* Immediate Action (9:25-9:45) */}
                                        <div className="bg-slate-800 p-5 rounded-xl border border-slate-700">
                                            <h4 className="text-xs font-bold text-white uppercase mb-3 flex items-center gap-2">
                                                <Zap size={14} className="text-yellow-400"/> Immediate Action (9:25-9:45)
                                            </h4>
                                            <div className="bg-slate-900 p-4 rounded-lg text-sm text-white font-medium">
                                                {liveData.immediateAction}
                                            </div>

                                            {liveData.tradeUpdate && (
                                                <div className="mt-4 grid grid-cols-3 gap-3">
                                                    <div className="bg-slate-900 p-2 rounded border border-slate-800 text-center">
                                                        <span className="block text-[9px] text-slate-500 uppercase">Entry</span>
                                                        <span className="text-sm font-bold text-white">{liveData.tradeUpdate.entryPrice}</span>
                                                    </div>
                                                    <div className="bg-slate-900 p-2 rounded border border-slate-800 text-center">
                                                        <span className="block text-[9px] text-slate-500 uppercase">Stop (30pt)</span>
                                                        <span className="text-sm font-bold text-red-400">{liveData.tradeUpdate.stopLoss}</span>
                                                    </div>
                                                    <div className="bg-slate-900 p-2 rounded border border-slate-800 text-center">
                                                        <span className="block text-[9px] text-slate-500 uppercase">Target (35pt)</span>
                                                        <span className="text-sm font-bold text-emerald-400">{liveData.tradeUpdate.target}</span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                )}
                
                {/* ========================== PHASE 3 VIEW (POST MARKET) ========================== */}
                {activeView === 'phase3' && (
                    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in-up">
                        {/* INPUTS */}
                        <div className="bg-purple-900/10 border border-purple-500/30 p-6 rounded-2xl">
                             <div className="flex justify-between items-start mb-6">
                                 <div className="flex items-center gap-3">
                                    <div className="p-2 bg-purple-500/10 rounded-lg text-purple-400">
                                        <Sunset size={24} />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-white uppercase tracking-wide">Post-Market Debrief</h3>
                                        <div className="flex flex-col">
                                            <p className="text-xs text-purple-400 font-bold">End of Day Analysis</p>
                                            {postTimestamp && (
                                                <span className="text-[8px] text-slate-500 mt-1 font-mono">
                                                    Recorded: {formatAnalysisTime(postTimestamp)}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                {(postData || currentPostImages.dailyChart) && (
                                    <button onClick={handleResetPhase3} className="text-xs flex items-center gap-1 text-purple-400/70 hover:text-purple-400 transition" title="Clear Phase 3 Data">
                                        <RotateCcw size={12}/> Reset
                                    </button>
                                )}
                            </div>
                            
                            <div className="grid grid-cols-3 gap-3 mb-6">
                                <CompactUploadCard label="Daily Candle" icon={Activity} imageSrc={currentPostImages.dailyChart} onChange={(e: any) => handlePostUpload(e, 'dailyChart')} onClick={() => setPreviewImage(currentPostImages.dailyChart)} />
                                <CompactUploadCard label="EOD 5m Chart" icon={TrendingUp} imageSrc={currentPostImages.eodChart} onChange={(e: any) => handlePostUpload(e, 'eodChart')} onClick={() => setPreviewImage(currentPostImages.eodChart)} />
                                <CompactUploadCard label="EOD OI Data" icon={BarChart2} imageSrc={currentPostImages.eodOi} onChange={(e: any) => handlePostUpload(e, 'eodOi')} onClick={() => setPreviewImage(currentPostImages.eodOi)} />
                            </div>

                            {error && (
                                <div className="mb-3 p-3 bg-red-900/20 border border-red-500/30 rounded-lg flex items-center gap-2 animate-fade-in">
                                    <AlertTriangle size={16} className="text-red-400 shrink-0"/>
                                    <span className="text-xs text-red-200 font-bold">{error}</span>
                                </div>
                            )}

                            {!isPostAnalyzing ? (
                                <button 
                                    onClick={runPostAnalysis}
                                    className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white font-black uppercase tracking-widest rounded-xl transition flex items-center justify-center gap-2 shadow-lg shadow-purple-900/40"
                                >
                                    <Flag size={18}/> Generate EOD Report
                                </button>
                            ) : (
                                <div className="w-full py-3 bg-slate-800 rounded-xl flex items-center justify-center gap-2 text-xs font-bold text-purple-400 animate-pulse border border-purple-500/30">
                                    <Loader2 size={16} className="animate-spin"/> Crunching Day's Data...
                                </div>
                            )}
                        </div>

                        {/* RESULTS */}
                        {postData && (
                             <div className="space-y-4 animate-fade-in">
                                 {/* Accuracy Grade */}
                                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex flex-col justify-center items-center text-center">
                                         <div className="text-[10px] text-slate-500 font-bold uppercase mb-1">Morning Prediction</div>
                                         <div className={`text-2xl font-black uppercase ${postData.predictionAccuracy === 'High' ? 'text-emerald-400' : postData.predictionAccuracy === 'Medium' ? 'text-amber-400' : 'text-red-400'}`}>
                                            {postData.predictionAccuracy}
                                         </div>
                                         <div className="text-[10px] text-slate-500 font-bold mt-1">Accuracy</div>
                                     </div>
                                     <div className="md:col-span-2 bg-slate-800 p-4 rounded-xl border border-slate-700">
                                         <div className="text-[10px] text-indigo-400 font-bold uppercase mb-2">Plan vs Reality</div>
                                         <p className="text-sm text-slate-300 italic">{postData.planVsReality?.replace(/^"|"$/g, '')}</p>
                                     </div>
                                 </div>

                                 {/* Key Lesson */}
                                 <div className="bg-slate-800 p-5 rounded-xl border border-slate-700">
                                     <h4 className="text-xs font-bold text-white uppercase mb-2 flex items-center gap-2">
                                        <Target size={14} className="text-emerald-400"/> Key Takeaway
                                     </h4>
                                     <p className="text-sm text-emerald-100 bg-emerald-900/10 p-3 rounded-lg border border-emerald-500/20">
                                         {postData.keyTakeaways?.replace(/^"|"$/g, '')}
                                     </p>
                                 </div>

                                 {/* Tomorrow's Prelude */}
                                 <div className="bg-gradient-to-r from-slate-900 to-indigo-950 p-6 rounded-xl border border-indigo-500/30">
                                     <h4 className="text-sm font-black text-indigo-400 uppercase tracking-widest mb-4">Tomorrow's Prelude</h4>
                                     
                                     <div className="flex items-center gap-4 mb-4">
                                         <DirectionBadge dir={postData.tomorrowOutlook?.bias || 'Neutral'} />
                                         <span className="text-xs text-slate-400">Early Bias</span>
                                     </div>

                                     <div className="grid grid-cols-2 gap-4 text-xs font-mono mb-4">
                                         <div className="bg-slate-900/50 p-2 rounded border border-slate-700">
                                            <span className="text-red-400 font-bold block mb-1">Watch Res</span>
                                            {postData.tomorrowOutlook?.earlyLevels?.resistance?.join(', ') || 'None'}
                                         </div>
                                         <div className="bg-slate-900/50 p-2 rounded border border-slate-700">
                                            <span className="text-emerald-400 font-bold block mb-1">Watch Sup</span>
                                            {postData.tomorrowOutlook?.earlyLevels?.support?.join(', ') || 'None'}
                                         </div>
                                     </div>

                                     <div className="text-sm text-slate-300 bg-slate-900 p-3 rounded border border-slate-800">
                                        <span className="text-indigo-400 font-bold uppercase text-[10px] block mb-1">Watch For</span>
                                        {postData.tomorrowOutlook?.watchFor?.replace(/^"|"$/g, '')}
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
