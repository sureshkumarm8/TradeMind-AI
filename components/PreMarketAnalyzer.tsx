
import React, { useState, useEffect } from 'react';
import { UploadCloud, Zap, Target, ArrowRight, Activity, TrendingUp, TrendingDown, Layers, Crosshair, BarChart2, Maximize2, X, BrainCircuit, Loader2, Save, ChevronDown, ChevronUp, CheckCircle, ShieldAlert, Lock, RefreshCw, Clock, AlertTriangle, MonitorPlay } from 'lucide-react';
import { PreMarketAnalysis, LiveMarketAnalysis, TradeDirection } from '../types';
import { analyzePreMarketRoutine, analyzeLiveMarketRoutine } from '../services/geminiService';
import { compressImage } from '../services/imageService';

interface PreMarketAnalyzerProps {
    apiKey: string;
    initialData?: PreMarketAnalysis;
    liveData?: LiveMarketAnalysis;
    onAnalysisUpdate?: (data: PreMarketAnalysis) => void;
    onLiveAnalysisUpdate?: (data: LiveMarketAnalysis) => void;
    onClose?: () => void;
    onSavePlan?: (notes: string) => void;
}

const PreMarketAnalyzer: React.FC<PreMarketAnalyzerProps> = ({ apiKey, initialData, liveData, onAnalysisUpdate, onLiveAnalysisUpdate, onClose, onSavePlan }) => {
    // Phase 1 Images
    const [images, setImages] = useState<{
        market: string;
        intraday: string;
        oi: string;
        multiStrike: string;
    }>({ market: '', intraday: '', oi: '', multiStrike: '' });
    
    // Phase 2 Images
    const [liveImages, setLiveImages] = useState<{
        liveChart: string;
        liveOi: string;
    }>({ liveChart: '', liveOi: '' });

    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isLiveAnalyzing, setIsLiveAnalyzing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    const [analysis, setAnalysis] = useState<PreMarketAnalysis | null>(initialData || null);
    const [liveAnalysis, setLiveAnalysis] = useState<LiveMarketAnalysis | null>(liveData || null);
    
    // Tab State
    const [activeView, setActiveView] = useState<'phase1' | 'phase2'>('phase1');
    const [isIntelFolded, setIsIntelFolded] = useState(true);

    // Pre-Flight Checklist State
    const [checklist, setChecklist] = useState({
        mindset: false,
        environment: false,
        levels: false,
        news: false
    });
    const allChecked = Object.values(checklist).every(Boolean);

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

    // Sync if initialData changes externally
    useEffect(() => {
        if (initialData) setAnalysis(initialData);
        if (liveData) setLiveAnalysis(liveData);
    }, [initialData, liveData]);

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: keyof typeof images) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            const compressed = await compressImage(file);
            setImages(prev => ({ ...prev, [field]: compressed }));
            setError(null); // Clear error on new upload
        } catch (err) {
            setError("Failed to process image. Try a smaller file.");
        }
    };

    const handleLiveUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: keyof typeof liveImages) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            const compressed = await compressImage(file);
            setLiveImages(prev => ({ ...prev, [field]: compressed }));
            setError(null);
        } catch (err) {
            setError("Failed to process live image.");
        }
    };

    const runAnalysis = async () => {
        setError(null);
        
        if (!apiKey) {
            setError("API Key missing. Please configure it in Settings.");
            return;
        }
        if (!images.market || !images.intraday || !images.oi || !images.multiStrike) {
            setError("Incomplete Intelligence. Upload all 4 charts.");
            return;
        }

        setIsAnalyzing(true);
        try {
            const result = await analyzePreMarketRoutine(images, apiKey);
            setAnalysis(result);
            if (onAnalysisUpdate) onAnalysisUpdate(result);
            setIsIntelFolded(true); // Auto fold after success
        } catch (e: any) {
            console.error(e);
            setError(e.message || "Analysis failed. Check API Key/Connection.");
        } finally {
            setIsAnalyzing(false);
        }
    };

    const runLiveCheck = async () => {
        setError(null);

        if (!apiKey) {
            setError("API Key missing.");
            return;
        }
        if (!analysis) {
            setError("No Pre-Market Plan found. Run Phase 1 first.");
            return;
        }
        if (!liveImages.liveChart || !liveImages.liveOi) {
            setError("Upload both Live Chart and Live OI data.");
            return;
        }

        setIsLiveAnalyzing(true);
        try {
            const result = await analyzeLiveMarketRoutine(liveImages, analysis, apiKey);
            setLiveAnalysis(result);
            if (onLiveAnalysisUpdate) onLiveAnalysisUpdate(result);
        } catch(e: any) {
            console.error(e);
            setError(e.message || "Live check failed.");
        } finally {
            setIsLiveAnalyzing(false);
        }
    };

    const handleSaveToNotes = () => {
        if (!analysis || !onSavePlan) return;
        const note = `[AI PLAN] Bias: ${analysis.marketBias}. Thesis: ${analysis.coreThesis}. Levels: Res ${analysis.keyLevels.resistance.join(', ')} / Sup ${analysis.keyLevels.support.join(', ')}.`;
        onSavePlan(note);
    };

    // Helper Component for Compact Upload Cards with Preview
    const CompactUploadCard = ({ label, icon: Icon, imageSrc, onChange }: any) => (
        <div className={`relative flex flex-col items-center justify-center p-2 rounded-lg border-2 border-dashed transition-all h-24 group overflow-hidden ${imageSrc ? 'border-indigo-500/50' : 'border-slate-700 hover:border-indigo-500/30 bg-slate-800'}`}>
            
            {/* Image Preview Layer */}
            {imageSrc && (
                <div className="absolute inset-0 z-0">
                    <img src={imageSrc} alt={label} className="w-full h-full object-cover opacity-60 group-hover:opacity-40 transition-opacity" />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 to-transparent"></div>
                </div>
            )}

            <div className="relative z-10 flex flex-col items-center">
                <div className="flex items-center gap-1.5 mb-1">
                    <Icon size={12} className={imageSrc ? "text-indigo-300 shadow-black drop-shadow-md" : "text-slate-500"} />
                    <span className={`text-[10px] font-bold uppercase shadow-black drop-shadow-md ${imageSrc ? "text-white" : "text-slate-500"}`}>{label}</span>
                </div>
                
                {imageSrc ? (
                    <div className="flex items-center gap-1 bg-emerald-900/80 px-2 py-0.5 rounded-full border border-emerald-500/30 backdrop-blur-sm mt-1">
                        <CheckCircle size={10} className="text-emerald-400" />
                        <span className="text-[9px] text-emerald-100 font-bold">Ready</span>
                    </div>
                ) : (
                    <UploadCloud size={16} className="text-slate-600 mt-1" />
                )}
            </div>
            
            <input type="file" accept="image/*" onChange={onChange} className="absolute inset-0 opacity-0 cursor-pointer z-20" />
        </div>
    );

    const DirectionBadge = ({ dir }: { dir: string }) => {
        const isLong = dir === TradeDirection.LONG || dir === 'Bullish';
        const isShort = dir === TradeDirection.SHORT || dir === 'Bearish';
        const color = isLong ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' : isShort ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' : 'bg-slate-700 text-slate-300';
        return <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${color}`}>{dir}</span>;
    };

    return (
        <div className="bg-slate-900 min-h-screen md:min-h-0 md:h-full w-full flex flex-col pb-20 md:pb-0 animate-fade-in">
            
            {/* TABS NAVIGATION */}
            <div className="px-4 pt-4 sticky top-0 bg-slate-900 z-20">
                <div className="bg-slate-800 p-1 rounded-xl flex gap-1 shadow-md border border-slate-700">
                    <button 
                        onClick={() => setActiveView('phase1')}
                        className={`flex-1 py-3 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${activeView === 'phase1' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}
                    >
                        <BrainCircuit size={16} /> Phase 1: Pre-Market
                    </button>
                    <button 
                        onClick={() => setActiveView('phase2')}
                        className={`flex-1 py-3 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${activeView === 'phase2' ? 'bg-red-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}
                    >
                        <ShieldAlert size={16} /> Phase 2: Live Check
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-4">

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
                                {analysis && <span className="text-[10px] text-emerald-400 font-bold flex items-center bg-emerald-900/20 px-2 py-1 rounded border border-emerald-500/30"><CheckCircle size={10} className="mr-1"/> Analysis Complete</span>}
                            </div>
                            
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                                <CompactUploadCard label="Market Graph" icon={Activity} imageSrc={images.market} onChange={(e: any) => handleUpload(e, 'market')} />
                                <CompactUploadCard label="5m Chart" icon={TrendingUp} imageSrc={images.intraday} onChange={(e: any) => handleUpload(e, 'intraday')} />
                                <CompactUploadCard label="Total OI" icon={BarChart2} imageSrc={images.oi} onChange={(e: any) => handleUpload(e, 'oi')} />
                                <CompactUploadCard label="Multi-Strike" icon={Layers} imageSrc={images.multiStrike} onChange={(e: any) => handleUpload(e, 'multiStrike')} />
                            </div>

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
                                    className={`w-full py-3 text-xs font-black uppercase tracking-widest rounded-xl transition flex items-center justify-center gap-2 ${analysis ? 'bg-slate-700 text-indigo-300 hover:bg-slate-600 border border-indigo-500/30' : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-lg shadow-indigo-900/50'}`}
                                >
                                    <Zap size={16} className={analysis ? "" : "fill-current"}/> {analysis ? "Re-Generate Plan" : "Generate Battle Plan"}
                                </button>
                            ) : (
                                <div className="w-full py-3 bg-slate-800 rounded-xl flex items-center justify-center gap-2 text-xs font-bold text-indigo-400 animate-pulse border border-indigo-500/30">
                                    <Loader2 size={16} className="animate-spin"/> Analyzing Intelligence...
                                </div>
                            )}
                        </div>

                        {/* RESULTS SECTION */}
                        {analysis ? (
                            <div className="space-y-4">
                                {/* Bias & Thesis */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 relative overflow-hidden flex flex-col justify-center items-center text-center">
                                        <div className={`absolute top-0 left-0 w-1 h-full ${analysis.marketBias === 'Bullish' ? 'bg-emerald-500' : analysis.marketBias === 'Bearish' ? 'bg-red-500' : 'bg-slate-500'}`}></div>
                                        <span className="text-[10px] text-slate-500 font-bold uppercase mb-1">Market Bias</span>
                                        <div className={`text-2xl font-black uppercase mb-1 ${analysis.marketBias === 'Bullish' ? 'text-emerald-400' : analysis.marketBias === 'Bearish' ? 'text-red-400' : 'text-slate-200'}`}>
                                            {analysis.marketBias}
                                        </div>
                                        <div className="text-[10px] text-slate-500 font-bold bg-slate-900 px-2 py-0.5 rounded-full">
                                            Conf: {analysis.confidenceScore}/10
                                        </div>
                                    </div>
                                    <div className="md:col-span-2 bg-slate-800 p-5 rounded-xl border border-slate-700 flex flex-col justify-center">
                                        <span className="text-[10px] text-indigo-400 font-bold uppercase mb-2 flex items-center gap-1"><BrainCircuit size={12}/> Core Thesis</span>
                                        <p className="text-sm text-slate-200 font-medium italic leading-relaxed">"{analysis.coreThesis}"</p>
                                        <div className="mt-4 flex gap-4 text-xs font-mono">
                                             <div className="text-red-400"><span className="font-bold opacity-50">RES:</span> {analysis.keyLevels.resistance.join(', ')}</div>
                                             <div className="text-emerald-400"><span className="font-bold opacity-50">SUP:</span> {analysis.keyLevels.support.join(', ')}</div>
                                        </div>
                                    </div>
                                </div>

                                {/* First Hour Plan (9:25-9:45) */}
                                <div className="bg-gradient-to-r from-slate-800 to-indigo-900/20 p-6 rounded-xl border border-indigo-500/20 shadow-lg">
                                    <h4 className="text-sm font-black text-indigo-400 uppercase tracking-widest mb-3 flex items-center">
                                        <Clock size={16} className="mr-2"/> 09:25 - 09:45 AM Attack Plan
                                    </h4>
                                    <div className="bg-slate-900/50 border-l-2 border-indigo-500 p-4 rounded-r-xl mb-4">
                                        <p className="text-sm text-slate-200">{analysis.firstHourPlan.action}</p>
                                    </div>
                                    
                                    {analysis.firstHourPlan.potentialTrade && (
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                            <div className="bg-slate-900 p-3 rounded-lg border border-slate-700">
                                                <div className="text-[10px] text-slate-500 uppercase font-bold">Direction</div>
                                                <DirectionBadge dir={analysis.firstHourPlan.potentialTrade.direction} />
                                            </div>
                                            <div className="bg-slate-900 p-3 rounded-lg border border-slate-700">
                                                <div className="text-[10px] text-slate-500 uppercase font-bold">Entry Zone</div>
                                                <div className="text-sm font-bold text-white">{analysis.firstHourPlan.potentialTrade.entryZone}</div>
                                            </div>
                                            <div className="bg-slate-900 p-3 rounded-lg border border-slate-700">
                                                <div className="text-[10px] text-slate-500 uppercase font-bold">Stop Loss</div>
                                                <div className="text-sm font-bold text-red-400">{analysis.firstHourPlan.potentialTrade.stopLoss}</div>
                                            </div>
                                            <div className="bg-slate-900 p-3 rounded-lg border border-slate-700">
                                                <div className="text-[10px] text-slate-500 uppercase font-bold">Target</div>
                                                <div className="text-sm font-bold text-emerald-400">{analysis.firstHourPlan.potentialTrade.target}</div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Scenarios & Setups */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Primary Setup */}
                                    <div className="bg-slate-800 p-5 rounded-xl border border-slate-700">
                                        <span className="text-[10px] text-emerald-400 font-bold uppercase mb-2 block">Primary Setup</span>
                                        <div className="flex justify-between items-start mb-2">
                                            <DirectionBadge dir={analysis.tradeSetups.primary.direction} />
                                            <span className="text-xs font-mono text-slate-400">Trigger: {analysis.tradeSetups.primary.trigger}</span>
                                        </div>
                                        <div className="flex gap-3 text-xs font-mono mt-3 pt-3 border-t border-slate-700">
                                            <span className="text-red-400">SL: {analysis.tradeSetups.primary.stopLoss}</span>
                                            <span className="text-emerald-400">TGT: {analysis.tradeSetups.primary.target}</span>
                                        </div>
                                    </div>
                                    {/* Opening Scenarios */}
                                    <div className="bg-slate-800 p-5 rounded-xl border border-slate-700 space-y-3">
                                        <div>
                                            <span className="text-[10px] text-emerald-500 font-bold uppercase block mb-1">Gap Up Scenario</span>
                                            <p className="text-xs text-slate-300 leading-snug">{analysis.openingScenarios.gapUp}</p>
                                        </div>
                                        <div>
                                            <span className="text-[10px] text-red-500 font-bold uppercase block mb-1">Gap Down Scenario</span>
                                            <p className="text-xs text-slate-300 leading-snug">{analysis.openingScenarios.gapDown}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Mission Intel (Collapsible) */}
                                <div className="border border-slate-700 rounded-xl overflow-hidden">
                                    <button 
                                        onClick={() => setIsIntelFolded(!isIntelFolded)} 
                                        className="w-full flex justify-between items-center p-3 bg-slate-800 hover:bg-slate-700 transition"
                                    >
                                        <span className="text-xs font-bold text-slate-400 uppercase flex items-center gap-2">
                                            <Layers size={14}/> Mission Intel (Source Images)
                                        </span>
                                        {isIntelFolded ? <ChevronDown size={14}/> : <ChevronUp size={14}/>}
                                    </button>
                                    {!isIntelFolded && (
                                        <div className="p-4 bg-slate-900 grid grid-cols-2 md:grid-cols-4 gap-4 animate-fade-in">
                                            {Object.entries(images).map(([key, src]) => src && (
                                                <div key={key} className="relative group">
                                                    <img src={src} className="w-full h-24 object-cover rounded border border-slate-700" alt={key} />
                                                    <div className="absolute bottom-0 left-0 bg-black/60 text-white text-[9px] uppercase font-bold px-1 rounded-tr">{key}</div>
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
                        {!analysis ? (
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
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="p-2 bg-red-500/10 rounded-lg text-red-500 animate-pulse">
                                            <ShieldAlert size={24} />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold text-white uppercase tracking-wide">Live Combat Check</h3>
                                            <p className="text-xs text-red-400 font-bold">Target Time: 09:20 AM</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 mb-6">
                                        <CompactUploadCard label="Live Chart (9:20)" icon={TrendingUp} imageSrc={liveImages.liveChart} onChange={(e: any) => handleLiveUpload(e, 'liveChart')} />
                                        <CompactUploadCard label="Live OI Data" icon={BarChart2} imageSrc={liveImages.liveOi} onChange={(e: any) => handleLiveUpload(e, 'liveOi')} />
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
                                {liveAnalysis && (
                                    <div className="space-y-4 animate-fade-in">
                                        {/* Status Banner */}
                                        <div className={`p-4 rounded-xl border flex justify-between items-center ${liveAnalysis.status === 'CONFIRMED' ? 'bg-emerald-900/20 border-emerald-500/50' : liveAnalysis.status === 'INVALIDATED' ? 'bg-red-900/20 border-red-500/50' : 'bg-amber-900/20 border-amber-500/50'}`}>
                                            <div>
                                                <div className="text-[10px] uppercase font-bold opacity-70 mb-1">Plan Status</div>
                                                <div className={`text-2xl font-black uppercase ${liveAnalysis.status === 'CONFIRMED' ? 'text-emerald-400' : liveAnalysis.status === 'INVALIDATED' ? 'text-red-400' : 'text-amber-400'}`}>
                                                    {liveAnalysis.status}
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-[10px] uppercase font-bold opacity-70 mb-1">Updated Bias</div>
                                                <DirectionBadge dir={liveAnalysis.updatedBias} />
                                            </div>
                                        </div>

                                        {/* Reality Check */}
                                        <div className="bg-slate-800 p-5 rounded-xl border border-slate-700">
                                            <h4 className="text-xs font-bold text-slate-400 uppercase mb-2 flex items-center gap-2">
                                                <Activity size={14}/> Reality vs Plan
                                            </h4>
                                            <p className="text-sm text-slate-200 italic border-l-2 border-indigo-500 pl-3 leading-relaxed">
                                                "{liveAnalysis.realityCheck}"
                                            </p>
                                        </div>

                                        {/* Immediate Action (9:25-9:45) */}
                                        <div className="bg-slate-800 p-5 rounded-xl border border-slate-700">
                                            <h4 className="text-xs font-bold text-white uppercase mb-3 flex items-center gap-2">
                                                <Zap size={14} className="text-yellow-400"/> Immediate Action (9:25-9:45)
                                            </h4>
                                            <div className="bg-slate-900 p-4 rounded-lg text-sm text-white font-medium">
                                                {liveAnalysis.immediateAction}
                                            </div>

                                            {liveAnalysis.tradeUpdate && (
                                                <div className="mt-4 grid grid-cols-3 gap-3">
                                                    <div className="bg-slate-900 p-2 rounded border border-slate-800 text-center">
                                                        <span className="block text-[9px] text-slate-500 uppercase">Entry</span>
                                                        <span className="text-sm font-bold text-white">{liveAnalysis.tradeUpdate.entryPrice}</span>
                                                    </div>
                                                    <div className="bg-slate-900 p-2 rounded border border-slate-800 text-center">
                                                        <span className="block text-[9px] text-slate-500 uppercase">Stop (30pt)</span>
                                                        <span className="text-sm font-bold text-red-400">{liveAnalysis.tradeUpdate.stopLoss}</span>
                                                    </div>
                                                    <div className="bg-slate-900 p-2 rounded border border-slate-800 text-center">
                                                        <span className="block text-[9px] text-slate-500 uppercase">Target (35pt)</span>
                                                        <span className="text-sm font-bold text-emerald-400">{liveAnalysis.tradeUpdate.target}</span>
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

            </div>
        </div>
    );
};

export default PreMarketAnalyzer;
