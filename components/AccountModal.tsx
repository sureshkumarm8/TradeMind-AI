
import React, { useState, useEffect, useRef } from 'react';
import { UserProfile, SyncStatus } from '../types';
import { Settings, User, Cloud, Key, ExternalLink, Download, FileJson, FileSpreadsheet, CheckCircle2, AlertCircle, Loader2, Copy, LogOut, AlertTriangle, Eye, EyeOff, Share2, Upload, RefreshCw, CloudUpload, CloudDownload, Bot, Activity, Zap, BrainCircuit, Sparkles } from 'lucide-react';
import { shareBackupData } from '../services/dataService'; 
import { checkModelHealth } from '../services/geminiService'; 

interface AccountSettingsProps {
  isOpen: boolean; 
  onClose: () => void;
  userProfile: UserProfile | null;
  syncStatus: SyncStatus;
  authError?: string | null;
  onConnect: () => void;
  onLogout: () => void;
  apiKey: string;
  setApiKey: (key: string) => void;
  googleClientId: string;
  setGoogleClientId: (id: string) => void;
  onSaveSettings: () => void;
  onExportJSON: () => void;
  onExportCSV: () => void;
  onImportClick: () => void;
  onReset: () => void;
  onForceSave: () => void;
  onForceLoad: () => void;
}

const AccountSettings: React.FC<AccountSettingsProps> = ({
  userProfile, syncStatus, authError, onConnect, onLogout,
  apiKey, setApiKey, googleClientId, setGoogleClientId, onSaveSettings,
  onExportJSON, onExportCSV, onImportClick, onReset, onForceSave, onForceLoad
}) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'config'>('profile');
  const [isGapiReady, setIsGapiReady] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [scriptTimeout, setScriptTimeout] = useState(false);
  const [showSecrets, setShowSecrets] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [aiModel, setAiModel] = useState<string>('gemini-3-pro-preview');
  
  const [healthCheck, setHealthCheck] = useState<{ status: 'idle' | 'loading' | 'ok' | 'error' | 'quota', message: string, latency?: number }>({ status: 'idle', message: '' });
  
  const configFileInputRef = useRef<HTMLInputElement>(null);
  
  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';
  const isSandbox = currentOrigin === 'null' || 
                    currentOrigin.includes('storagerelay') || 
                    currentOrigin.includes('webcontainer') || 
                    currentOrigin.includes('stackblitz') ||
                    currentOrigin.includes('codesandbox');

  useEffect(() => {
     const checkGapi = setInterval(() => {
        if (window.google && window.gapi) {
            setIsGapiReady(true);
            setScriptTimeout(false);
            clearInterval(checkGapi);
        }
     }, 500);

     const timeoutId = setTimeout(() => {
        if (!isGapiReady) setScriptTimeout(true);
     }, 5000);

     const savedModel = localStorage.getItem('tradeMind_aiModel');
     if (savedModel) setAiModel(savedModel);

     return () => { clearInterval(checkGapi); clearTimeout(timeoutId); };
  }, [isGapiReady]);

  const handleConnectClick = async () => {
      if (!googleClientId || !googleClientId.trim().endsWith('.apps.googleusercontent.com')) {
          setActiveTab('config');
          alert("Please enter a valid Google Client ID in the Configuration tab first.\nIt must end with '.apps.googleusercontent.com'");
          return;
      }
      setIsConnecting(true);
      try {
        await onConnect();
      } finally {
        setIsConnecting(false);
      }
  };

  const forceReInit = () => {
     window.location.reload();
  }

  const copyOrigin = () => {
      navigator.clipboard.writeText(currentOrigin);
      alert("URL copied! Paste into 'Authorized JavaScript Origins' in Google Cloud Console.");
  };

  const getErrorDiagnosis = (err: string) => {
      if (err.includes('idpiframe_initialization_failed') || err.includes('origin_mismatch')) {
          return "Origin Mismatch. Your current URL is not whitelisted.";
      }
      if (err.includes('access_denied') || err.includes('not_authorized') || err.includes('403')) {
          return "TEST USER REQUIRED. Add your email to 'Test Users' in Google Cloud Console.";
      }
      if (err.includes('popup_closed')) {
          return "Popup Closed. Please allow popups for this site (Check browser settings).";
      }
      if (err.includes('invalid_client') || err.includes('401')) {
          return "Invalid Client ID. The ID sent to Google does not exist.";
      }
      return err;
  }

  const isAccessDenied = authError && (authError.includes('access_denied') || authError.includes('not_authorized') || authError.includes('403'));
  const isInvalidClient = authError && (authError.includes('invalid_client') || authError.includes('401'));
  const isValidClientId = googleClientId && googleClientId.trim().endsWith('.apps.googleusercontent.com');

  const handleClientChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const clean = e.target.value.replace(/\s/g, '').trim();
      setGoogleClientId(clean);
  }

  const handleSaveAll = () => {
      localStorage.setItem('tradeMind_aiModel', aiModel);
      onSaveSettings();
  }

  const handleShareConfig = () => {
      const configData = JSON.stringify({ k: apiKey, c: googleClientId, m: aiModel });
      if (navigator.share) {
          navigator.share({
              title: 'TradeMind Config',
              text: configData
          }).catch(console.error);
      } else {
          navigator.clipboard.writeText(configData);
          alert("Config copied! Paste this on your other device to sync settings.");
      }
  };

  const handlePasteConfig = async () => {
      try {
          const text = await navigator.clipboard.readText();
          try {
              const data = JSON.parse(text);
              if (data.k) setApiKey(data.k);
              if (data.c) setGoogleClientId(data.c);
              if (data.m) setAiModel(data.m);
              if (data.apiKey) setApiKey(data.apiKey);
              if (data.googleClientId) setGoogleClientId(data.googleClientId);
              alert("Configuration pasted successfully!");
          } catch {
              if (text.includes('.apps.googleusercontent.com')) {
                  setGoogleClientId(text.trim());
              } else if (text.length > 20) {
                  setApiKey(text.trim());
              }
          }
      } catch (err) {
          alert("Could not read clipboard. Please paste manually.");
      }
  };

  const handleImportConfig = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if(!file) return;

      const reader = new FileReader();
      reader.onload = (ev) => {
          try {
              const content = ev.target?.result as string;
              const data = JSON.parse(content);
              
              let imported = false;
              if (data.k) { setApiKey(data.k); imported = true; }
              if (data.c) { setGoogleClientId(data.c); imported = true; }
              if (data.m) { setAiModel(data.m); imported = true; }
              if (data.apiKey) { setApiKey(data.apiKey); imported = true; }
              if (data.googleClientId) { setGoogleClientId(data.googleClientId); imported = true; }

              if(imported) alert("Configuration imported successfully! Don't forget to Save.");
              else alert("No valid configuration found in file.");
          } catch (err) {
              alert("Failed to parse configuration file.");
          }
      };
      reader.readAsText(file);
      if(configFileInputRef.current) configFileInputRef.current.value = '';
  };

  const handleHealthCheck = async () => {
      setHealthCheck({ status: 'loading', message: 'Pinging Google AI...' });
      // Sanitize model ID for check (Deep Think maps to Pro in backend, so check Pro)
      const modelToTest = aiModel.includes('deep-think') ? 'gemini-3-pro-preview' : aiModel.includes('gemini') ? aiModel : 'gemini-3-pro-preview';
      const result = await checkModelHealth(apiKey, modelToTest);
      setHealthCheck(result);
  };

  return (
    <div className="max-w-4xl mx-auto pb-12 animate-fade-in-up">
        
        <div className="flex justify-center mb-8">
            <div className="bg-slate-900 p-1 rounded-xl border border-slate-800 flex space-x-1 shadow-lg">
                <button 
                    onClick={() => setActiveTab('profile')} 
                    className={`px-8 py-2.5 rounded-lg text-sm font-bold flex items-center transition-all ${activeTab === 'profile' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                >
                    <User size={16} className="mr-2"/> Account & Sync
                </button>
                <button 
                    onClick={() => setActiveTab('config')} 
                    className={`px-8 py-2.5 rounded-lg text-sm font-bold flex items-center transition-all ${activeTab === 'config' ? 'bg-slate-800 text-white border border-slate-700' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                >
                    <Settings size={16} className="mr-2"/> Configuration
                </button>
            </div>
        </div>

        <div className="space-y-6">
            
            {/* --- TAB: PROFILE (Main Screen) --- */}
            {activeTab === 'profile' && (
                <div className="bg-slate-900 rounded-2xl border border-slate-700 p-8 shadow-xl relative overflow-hidden animate-fade-in">
                    
                    {/* Sandbox Warning */}
                    {isSandbox && (
                        <div className="mb-6 bg-amber-900/20 border border-amber-500/30 p-4 rounded-xl flex items-start gap-3 relative z-10">
                            <AlertTriangle className="text-amber-500 shrink-0 mt-1" size={20} />
                            <div>
                                <h5 className="font-bold text-amber-400 text-sm uppercase">Preview Environment Detected</h5>
                                <p className="text-xs text-amber-200/70 mt-1 leading-relaxed">
                                    Google Login blocks preview URLs.
                                    <br/><strong>Fix:</strong> Open your Vercel URL in a new browser tab.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Auth Error Diagnostic */}
                    {authError && (
                        <div className="mb-6 bg-red-900/20 border border-red-500/30 p-4 rounded-xl flex flex-col gap-3 relative z-10 animate-fade-in">
                            <div className="flex items-start gap-3">
                                <AlertCircle className="text-red-500 shrink-0 mt-1" size={20} />
                                <div>
                                    <h5 className="font-bold text-red-400 text-sm uppercase">Connection Failed</h5>
                                    <p className="text-sm text-white mt-1 leading-relaxed font-bold">
                                        {getErrorDiagnosis(authError)}
                                    </p>
                                    <div className="mt-2 text-[10px] text-red-400/50 break-all border-t border-red-500/20 pt-2 font-mono">
                                        {authError} <br/> Origin: {currentOrigin}
                                    </div>
                                </div>
                            </div>
                            
                            {isAccessDenied && (
                                <div className="ml-8 bg-slate-900/50 border border-red-500/30 p-3 rounded-lg">
                                    <h6 className="text-xs font-bold text-red-300 uppercase mb-2 flex items-center">
                                        <ExternalLink size={14} className="mr-2"/> How to Fix:
                                    </h6>
                                    <ol className="list-decimal list-inside text-xs text-slate-300 space-y-1">
                                        <li>Go to <strong>Google Cloud Console</strong> &gt; <strong>OAuth Consent Screen</strong>.</li>
                                        <li>Scroll down to <strong>Test users</strong>.</li>
                                        <li>Click <strong>+ ADD USERS</strong> and enter your email.</li>
                                    </ol>
                                    <a 
                                        href="https://console.cloud.google.com/apis/credentials/consent" 
                                        target="_blank"
                                        rel="noreferrer"
                                        className="mt-3 inline-flex items-center text-xs bg-red-600 hover:bg-red-500 text-white px-3 py-1.5 rounded transition"
                                    >
                                        Open Google Console <ExternalLink size={12} className="ml-2"/>
                                    </a>
                                </div>
                            )}

                            {isInvalidClient && (
                                <div className="ml-8 bg-slate-900/50 border border-red-500/30 p-3 rounded-lg">
                                    <h6 className="text-xs font-bold text-red-300 uppercase mb-2">Check Configuration</h6>
                                    <p className="text-xs text-slate-300 mb-2">The Client ID is incorrect. It might have typos or whitespace.</p>
                                    <button onClick={() => setActiveTab('config')} className="text-xs bg-red-600 hover:bg-red-500 text-white px-3 py-1.5 rounded transition">
                                        Fix in Config Tab
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {userProfile ? (
                        <div className="relative z-10 text-center py-8">
                            <img src={userProfile.picture} alt="Avatar" className="w-24 h-24 rounded-full border-4 border-emerald-500/50 shadow-2xl mx-auto mb-4"/>
                            <h4 className="text-2xl font-bold text-white">{userProfile.name}</h4>
                            <p className="text-sm text-slate-400 font-mono mb-6">{userProfile.email}</p>
                            
                            <div className="bg-emerald-900/20 border border-emerald-500/20 p-4 rounded-xl inline-flex items-center gap-3 mb-8">
                                <CheckCircle2 size={20} className="text-emerald-400"/>
                                <span className="text-emerald-400 font-bold text-sm uppercase tracking-wide">Cloud Sync Active</span>
                            </div>

                            <div className="flex justify-center">
                                <button onClick={onLogout} className="text-xs font-bold bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 px-6 py-2 rounded-lg border border-slate-700 transition flex items-center">
                                    <LogOut size={14} className="mr-2"/> Sign Out
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="relative z-10 text-center py-12">
                            <div className="bg-slate-800 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-slate-700 shadow-xl">
                                <Cloud size={40} className="text-blue-400"/>
                            </div>
                            <h4 className="text-2xl font-bold text-white mb-2">Sync Your Journal</h4>
                            <p className="text-slate-400 text-sm mb-8 max-w-sm mx-auto leading-relaxed">
                                Sign in to automatically back up your trades and sync across your phone and desktop.
                            </p>
                            
                            {isSandbox ? (
                                <button disabled className="px-8 py-4 bg-slate-700 text-slate-400 rounded-xl text-lg font-bold flex items-center justify-center mx-auto w-full md:w-auto cursor-not-allowed border border-slate-600">
                                    <AlertTriangle size={20} className="mr-2" /> Login Disabled in Preview
                                </button>
                            ) : (
                                <div className="space-y-4">
                                    <div className="text-xs font-mono text-slate-500 mb-2">{currentOrigin}</div>
                                    <button 
                                        onClick={handleConnectClick} 
                                        disabled={!isGapiReady || isConnecting}
                                        className={`px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-lg font-bold flex items-center justify-center transition shadow-2xl shadow-blue-900/40 mx-auto hover:-translate-y-1 w-full md:w-auto disabled:opacity-50 disabled:cursor-not-allowed`}
                                    >
                                        {isConnecting ? (
                                            <><Loader2 className="animate-spin mr-3" size={24}/> Connecting...</>
                                        ) : !isGapiReady ? (
                                            <><Loader2 className="animate-spin mr-3" size={24}/> Loading Scripts...</>
                                        ) : (
                                            <>
                                                <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-6 h-6 mr-3 bg-white rounded-full p-0.5" alt="G"/> 
                                                Sign in with Google
                                            </>
                                        )}
                                    </button>
                                    
                                    {(!isGapiReady || scriptTimeout) && (
                                        <div className="text-center animate-fade-in">
                                            <button onClick={forceReInit} className="text-xs text-slate-500 underline hover:text-white flex items-center justify-center mx-auto mb-2">
                                                <RefreshCw size={10} className="mr-1"/> Scripts stuck? Force Reload
                                            </button>
                                            <div className="text-[9px] text-amber-500/70 font-mono">
                                                Warning: Script loading slow. Check network.
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                    
                    {/* Manual Sync Controls */}
                    {userProfile && (
                        <div className="mt-8 pt-8 border-t border-slate-800 relative z-10">
                            <h5 className="text-xs font-bold text-blue-400 uppercase mb-4 flex items-center"><RefreshCw size={14} className="mr-2"/> Cloud Sync Operations</h5>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <button onClick={onForceSave} disabled={syncStatus === SyncStatus.SYNCING} className="flex items-center justify-center gap-2 p-3 bg-slate-800 hover:bg-indigo-900/40 border border-slate-700 hover:border-indigo-500/50 rounded-xl transition disabled:opacity-50">
                                    <CloudUpload size={18} className="text-indigo-400"/>
                                    <div className="text-left">
                                        <span className="block text-xs font-bold text-white">Force Upload</span>
                                        <span className="block text-[10px] text-slate-500">Save local data to Cloud</span>
                                    </div>
                                </button>
                                <button onClick={onForceLoad} disabled={syncStatus === SyncStatus.SYNCING} className="flex items-center justify-center gap-2 p-3 bg-slate-800 hover:bg-emerald-900/40 border border-slate-700 hover:border-emerald-500/50 rounded-xl transition disabled:opacity-50">
                                    <CloudDownload size={18} className="text-emerald-400"/>
                                    <div className="text-left">
                                        <span className="block text-xs font-bold text-white">Force Download</span>
                                        <span className="block text-[10px] text-slate-500">Pull latest data from Cloud</span>
                                    </div>
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Data Management Section */}
                    <div className="mt-12 pt-8 border-t border-slate-800 relative z-10">
                        <div className="p-4 bg-slate-800/40 rounded-xl border border-slate-700/50 mb-4">
                            <h5 className="text-xs font-bold text-white uppercase mb-3 flex items-center"><Upload size={14} className="mr-2"/> Restore Data</h5>
                            <button onClick={onImportClick} className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs py-2 rounded border border-slate-600">Restore Data (JSON/CSV)</button>
                        </div>
                        
                        {/* Danger Zone */}
                        <div className="mt-8 pt-6 border-t border-red-900/30">
                            <h5 className="text-xs font-bold text-red-500 uppercase mb-3 flex items-center"><AlertTriangle size={14} className="mr-2"/> Danger Zone</h5>
                            <button onClick={onReset} className="w-full bg-red-950/20 hover:bg-red-900/40 text-red-400 text-xs font-bold py-3 rounded border border-red-900/50 flex items-center justify-center transition">
                                <LogOut size={14} className="mr-2"/> Factory Reset (Clear All Data)
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- TAB: CONFIGURATION (Technical) --- */}
            {activeTab === 'config' && (
                <div className="bg-slate-900 rounded-2xl border border-slate-700 p-8 shadow-xl animate-fade-in">
                    
                    {/* Hidden input for config import */}
                    <input 
                        type="file" 
                        ref={configFileInputRef} 
                        onChange={handleImportConfig} 
                        className="hidden" 
                        accept=".json" 
                    />

                    <div className="flex justify-between items-center mb-6">
                        <h4 className="text-xl font-bold text-white">Developer Settings</h4>
                        <div className="flex gap-2">
                             <button onClick={() => configFileInputRef.current?.click()} className="text-xs bg-slate-800 text-slate-300 border border-slate-700 px-3 py-1.5 rounded flex items-center hover:bg-slate-700 transition">
                                <Upload size={14} className="mr-2"/> Import Config
                            </button>
                            <button onClick={handleShareConfig} className="text-xs bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 px-3 py-1.5 rounded flex items-center hover:bg-indigo-600/40 transition">
                                <Share2 size={14} className="mr-2"/> Share Config
                            </button>
                            <button onClick={handlePasteConfig} className="text-xs bg-slate-800 text-slate-300 border border-slate-700 px-3 py-1.5 rounded flex items-center hover:bg-slate-700 transition">
                                Paste
                            </button>
                        </div>
                    </div>

                    <div className="bg-blue-900/10 border border-blue-500/20 p-4 rounded-lg mb-6">
                        <p className="text-xs text-blue-300 mb-2">
                            <strong>Syncing with Mobile?</strong> Use "Share Config" on your desktop to send your keys to your phone. 
                            Then "Paste" or "Import" them here.
                        </p>
                    </div>

                    {/* API Key */}
                    <div className="mb-6">
                        <label className="text-sm font-bold text-slate-300 flex items-center gap-2 mb-2">
                            <Key size={16} className="text-indigo-400"/> Gemini API Key
                        </label>
                        <div className="relative">
                            <input 
                                type={showSecrets ? "text" : "password"}
                                value={apiKey} 
                                onChange={(e) => setApiKey(e.target.value.trim())}
                                className="w-full bg-slate-950 border border-slate-700 rounded-lg py-3 px-4 text-white font-mono text-sm focus:border-indigo-500 outline-none pr-10"
                                placeholder="Required for AI Analysis"
                                autoComplete="off"
                                autoCorrect="off"
                                autoCapitalize="off"
                                spellCheck="false"
                            />
                            <button type="button" onClick={() => setShowSecrets(!showSecrets)} className="absolute right-3 top-3 text-slate-500 hover:text-white">
                                {showSecrets ? <EyeOff size={16}/> : <Eye size={16}/>}
                            </button>
                        </div>
                         <a href="https://aistudio.google.com/app/apikey" target="_blank" className="text-[10px] text-indigo-400 mt-1 inline-block hover:underline">Get API Key &rarr;</a>
                    </div>
                    
                    {/* Google Client ID */}
                    <div className="mb-6">
                        <label className="text-sm font-bold text-slate-300 flex items-center gap-2 mb-2">
                            <Cloud size={16} className="text-blue-400"/> Google Client ID
                        </label>
                        <div className="relative">
                            <input 
                                type={showSecrets ? "text" : "password"}
                                value={googleClientId} 
                                onChange={handleClientChange}
                                className={`w-full bg-slate-950 border rounded-lg py-3 px-4 text-white font-mono text-sm focus:border-blue-500 outline-none pr-10 ${!isValidClientId && googleClientId ? 'border-red-500 focus:border-red-500' : 'border-slate-700'}`}
                                placeholder="Required for Google Login"
                                autoComplete="off"
                                autoCorrect="off"
                                autoCapitalize="off"
                                spellCheck="false"
                            />
                             <button type="button" onClick={() => setShowSecrets(!showSecrets)} className="absolute right-3 top-3 text-slate-500 hover:text-white">
                                {showSecrets ? <EyeOff size={16}/> : <Eye size={16}/>}
                            </button>
                        </div>
                        {!isValidClientId && googleClientId && (
                            <p className="text-[10px] text-red-400 mt-1 font-bold">
                                Invalid Format. Should end in '.apps.googleusercontent.com'
                            </p>
                        )}
                        <p className="text-[10px] text-slate-500 mt-1">
                            Note: Settings are per-device. Use "Share Config" to transfer.
                        </p>
                    </div>

                    {/* AI Model Selection */}
                    <div className="mb-6">
                        <label className="text-sm font-bold text-slate-300 flex items-center gap-2 mb-2">
                            <Bot size={16} className="text-emerald-400"/> AI Model Tier
                        </label>
                        <div className="relative">
                            <select 
                                value={aiModel} 
                                onChange={(e) => setAiModel(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-700 rounded-lg py-3 px-4 text-white font-medium text-sm focus:border-emerald-500 outline-none appearance-none cursor-pointer"
                            >
                                <optgroup label="Gemini 3 Series (Late 2025 - State of the Art)">
                                    <option value="gemini-3-pro-preview">Gemini 3 Pro (Complex Reasoning & Vibe Coding)</option>
                                    <option value="gemini-3-deep-think">Gemini 3 Deep Think (Max Reasoning Budget)</option>
                                    <option value="gemini-3-flash-preview">Gemini 3 Flash (Frontier Speed & Intelligence)</option>
                                </optgroup>
                                <optgroup label="Gemini 2.5 Series (Mid 2025 - Optimized)">
                                    <option value="gemini-2.5-pro">Gemini 2.5 Pro (Flagship Reasoning)</option>
                                    <option value="gemini-2.5-flash-latest">Gemini 2.5 Flash (General Speed & Efficiency)</option>
                                    <option value="gemini-flash-lite-latest">Gemini 2.5 Flash-Lite (High Volume / Low Cost)</option>
                                </optgroup>
                                <optgroup label="Gemini 2.0 Series (Early 2025 - Workhorses)">
                                    <option value="gemini-2.0-pro">Gemini 2.0 Pro (Complex Prompts)</option>
                                    <option value="gemini-2.0-flash">Gemini 2.0 Flash (Multimodal Workhorse)</option>
                                    <option value="gemini-2.0-flash-thinking">Gemini 2.0 Flash Thinking (Exposed Thinking Process)</option>
                                    <option value="gemini-2.0-flash-lite">Gemini 2.0 Flash-Lite (Cost Effective)</option>
                                </optgroup>
                            </select>
                            <div className="absolute right-4 top-4 pointer-events-none text-slate-500">
                                <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                            </div>
                        </div>
                        
                        {/* Capabilities Badge based on selection */}
                        <div className="mt-3 flex gap-2 flex-wrap">
                            {(aiModel === 'gemini-3-pro-preview' || aiModel === 'gemini-3-deep-think') && (
                                <span className="inline-flex items-center px-2 py-1 rounded bg-indigo-900/30 border border-indigo-500/30 text-[10px] font-bold text-indigo-300 uppercase">
                                    <BrainCircuit size={10} className="mr-1"/> 
                                    {aiModel === 'gemini-3-deep-think' ? 'Max Thinking (32k)' : 'Thinking Mode'}
                                </span>
                            )}
                            {aiModel.includes('flash') && (
                                <span className="inline-flex items-center px-2 py-1 rounded bg-amber-900/30 border border-amber-500/30 text-[10px] font-bold text-amber-300 uppercase">
                                    <Zap size={10} className="mr-1"/> Low Latency
                                </span>
                            )}
                            {aiModel.includes('thinking') && (
                                <span className="inline-flex items-center px-2 py-1 rounded bg-purple-900/30 border border-purple-500/30 text-[10px] font-bold text-purple-300 uppercase">
                                    <Sparkles size={10} className="mr-1"/> Thinking Process
                                </span>
                            )}
                        </div>
                    </div>

                    {/* NEW: API Health & Quota Check */}
                    <div className="bg-slate-800 p-4 rounded-lg border border-slate-700 mb-6">
                        <div className="flex justify-between items-center mb-2">
                            <h5 className="font-bold text-slate-200 text-sm flex items-center gap-2">
                                <Activity size={16} className="text-blue-400"/> API Health & Quota
                            </h5>
                            <a href="https://aistudio.google.com/app/plan_information" target="_blank" rel="noreferrer" className="text-[10px] text-blue-400 hover:text-white flex items-center gap-1">
                                View Official Usage <ExternalLink size={10}/>
                            </a>
                        </div>
                        
                        <div className="flex items-center justify-between bg-slate-900 p-3 rounded-lg border border-slate-800">
                            <div className="flex items-center gap-3">
                                {healthCheck.status === 'loading' && <Loader2 size={18} className="animate-spin text-slate-400"/>}
                                {healthCheck.status === 'ok' && <CheckCircle2 size={18} className="text-emerald-400"/>}
                                {healthCheck.status === 'quota' && <AlertTriangle size={18} className="text-amber-400"/>}
                                {healthCheck.status === 'error' && <AlertCircle size={18} className="text-red-400"/>}
                                
                                <div className="flex flex-col">
                                    <span className={`text-xs font-bold ${healthCheck.status === 'ok' ? 'text-emerald-400' : healthCheck.status === 'quota' ? 'text-amber-400' : healthCheck.status === 'error' ? 'text-red-400' : 'text-slate-400'}`}>
                                        {healthCheck.status === 'idle' ? 'Ready to Test' : healthCheck.message}
                                    </span>
                                    {healthCheck.latency && <span className="text-[10px] text-slate-500 font-mono">{healthCheck.latency}ms latency</span>}
                                </div>
                            </div>
                            <button onClick={handleHealthCheck} disabled={healthCheck.status === 'loading'} className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded border border-slate-600 transition disabled:opacity-50">
                                Check Now
                            </button>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-2 leading-relaxed">
                            If you see "Quota Exceeded" (429), switch the model above to <strong>Flash Lite</strong> or wait a few minutes.
                        </p>
                    </div>

                    {/* Helper */}
                    <div className="bg-slate-800 p-4 rounded-lg border border-slate-700 text-xs text-slate-400 mb-6">
                        <p className="mb-2 font-bold text-slate-200">Mobile/Xiaomi Login Issues?</p>
                        <ul className="list-disc list-inside space-y-1 mb-3">
                            <li>Ensure this exact URL is in <strong>Authorized Origins</strong>.</li>
                            <li><strong>Xiaomi:</strong> Browsers often block popups. Check settings.</li>
                            <li>Wait <strong>5-10 minutes</strong> after config changes in Google Cloud.</li>
                        </ul>
                        <div className="flex items-center gap-2">
                             <code className="flex-1 bg-black/30 p-2 rounded text-emerald-400 font-mono select-all border border-slate-700 cursor-pointer hover:bg-black/50 transition" onClick={copyOrigin}>
                                {currentOrigin}
                            </code>
                            <button onClick={copyOrigin} className="p-2 bg-slate-700 hover:bg-slate-600 text-white rounded transition" title="Copy URL">
                                <Copy size={16}/>
                            </button>
                        </div>
                    </div>

                    <button onClick={handleSaveAll} className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition shadow-lg shadow-indigo-900/20">
                        Save Configuration
                    </button>
                </div>
            )}
        </div>
    </div>
  );
};

export default AccountSettings;
