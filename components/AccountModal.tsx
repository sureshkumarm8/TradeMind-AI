
import React, { useState, useEffect } from 'react';
import { UserProfile, SyncStatus } from '../types';
import { Settings, User, Cloud, Key, Save, ExternalLink, Mail, Code, Upload, Download, FileJson, FileSpreadsheet, CheckCircle2, AlertCircle, Loader2, Copy, Info, LogOut, ChevronRight, Shield, Database, Layout, AlertTriangle, ChevronDown, ChevronUp, UserPlus, Smartphone } from 'lucide-react';

// --- PWA Installation ---
const usePWAInstall = () => {
    const [installPrompt, setInstallPrompt] = useState<any>(null);
    const [isPWAInstalled, setIsPWAInstalled] = useState(false);
    const [canInstallPWA, setCanInstallPWA] = useState(false);

    useEffect(() => {
        const handleBeforeInstallPrompt = (e: Event) => {
            e.preventDefault();
            setInstallPrompt(e);
            setCanInstallPWA(true); 
        };
        const handleAppInstalled = () => {
            setIsPWAInstalled(true);
            setCanInstallPWA(false); 
        };
        if (window.matchMedia('(display-mode: standalone)').matches) {
            setIsPWAInstalled(true);
        }
        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        window.addEventListener('appinstalled', handleAppInstalled);
        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
            window.removeEventListener('appinstalled', handleAppInstalled);
        };
    }, []);

    const triggerInstall = async () => {
        if (!installPrompt) return;
        installPrompt.prompt();
        const { outcome } = await installPrompt.userChoice;
        if (outcome === 'accepted') {
            setIsPWAInstalled(true);
            setCanInstallPWA(false);
        }
        setInstallPrompt(null);
    };

    return { triggerInstall, isPWAInstalled, canInstallPWA };
};


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
}

const AccountSettings: React.FC<AccountSettingsProps> = ({
  userProfile, syncStatus, authError, onConnect, onLogout,
  apiKey, setApiKey, googleClientId, setGoogleClientId, onSaveSettings,
  onExportJSON, onExportCSV, onImportClick
}) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'config'>('profile');
  const { triggerInstall, isPWAInstalled, canInstallPWA } = usePWAInstall();
  const [isConnecting, setIsConnecting] = useState(false);
  const [isGapiReady, setIsGapiReady] = useState(false);
  
  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';
  
  // A less restrictive check for non-standard origins
  const isSandbox = !currentOrigin.startsWith('http');

  useEffect(() => {
     const checkGapi = setInterval(() => {
        if (window.google && window.gapi) {
            setIsGapiReady(true);
            clearInterval(checkGapi);
        }
     }, 200);
     return () => clearInterval(checkGapi);
  }, []);

  const handleConnectClick = async () => {
      setIsConnecting(true);
      try {
        await onConnect();
      } finally {
        setIsConnecting(false);
      }
  };

  const copyOrigin = () => {
      navigator.clipboard.writeText(currentOrigin);
      alert("URL copied! Paste into 'Authorized JavaScript Origins' in Google Cloud Console.");
  };

  const getErrorDiagnosis = (err: string) => {
      if (err.includes('invalid_client') || err.includes('OAuth client was not found')) {
          return `INVALID CLIENT ID: 
1. Use a WEB OAuth Client (not Android).
2. Add ${currentOrigin} to "Authorized JavaScript Origins".
3. Verify the ID is copied correctly.`
      }
      if (err.includes('idpiframe_initialization_failed') || err.includes('origin_mismatch')) {
          return "Origin Mismatch: Your login URL is not whitelisted in Google Cloud Console.";
      }
      if (err.includes('access_denied')) {
          return "Access Denied: Your email MUST be added to the 'Test Users' list in the OAuth Consent Screen.";
      }
      if (err.includes('redirect_uri_mismatch')) {
          return "Redirect URI Error: Remove all redirect URIs from your Web OAuth Client.";
      }
      return err; // Return the raw error if no specific diagnosis matches
  }

  const isAccessDenied = authError && authError.includes('access_denied');

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
            
            {activeTab === 'profile' && (
                <div className="bg-slate-900 rounded-2xl border border-slate-700 p-8 shadow-xl relative overflow-hidden animate-fade-in">
                    
                    {canInstallPWA && !isPWAInstalled && (
                         <div className="mb-6 bg-indigo-900/40 border border-indigo-500/30 p-4 rounded-xl flex items-center justify-between gap-4 relative z-10">
                            <div>
                                <h5 className="font-bold text-indigo-300 text-sm">Install TradeMind on Your Device</h5>
                                <p className="text-xs text-indigo-300/60 mt-1">For faster, native-like access.</p>
                            </div>
                            <button 
                                onClick={triggerInstall}
                                className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-indigo-500 transition-colors shrink-0"
                            >
                                <Smartphone size={16}/> Install App
                            </button>
                        </div>
                    )}

                    {isSandbox && (
                        <div className="mb-6 bg-amber-900/20 border border-amber-500/30 p-4 rounded-xl flex items-start gap-3 relative z-10">
                            <AlertTriangle className="text-amber-500 shrink-0 mt-1" size={20} />
                            <div>
                                <h5 className="font-bold text-amber-400 text-sm uppercase">Preview Environment Detected</h5>
                                <p className="text-xs text-amber-200/70 mt-1 leading-relaxed">
                                    Google Login is disabled on insecure origins.
                                    <br/><strong>Fix:</strong> Open your app from a valid <code>https://</code> URL.
                                </p>
                            </div>
                        </div>
                    )}

                    {authError && (
                        <div className="mb-6 bg-red-900/20 border border-red-500/30 p-4 rounded-xl flex flex-col gap-3 relative z-10 animate-fade-in">
                            <div className="flex items-start gap-3">
                                <AlertCircle className="text-red-500 shrink-0 mt-1" size={20} />
                                <div>
                                    <h5 className="font-bold text-red-400 text-sm uppercase">Connection Failed</h5>
                                    <p className="text-sm text-white mt-1 whitespace-pre-wrap font-mono leading-relaxed">
                                        {getErrorDiagnosis(authError)}
                                    </p>
                                </div>
                            </div>
                            
                            {isAccessDenied && (
                                <div className="ml-8 mt-2 bg-slate-900/50 border border-red-500/30 p-3 rounded-lg">
                                    <h6 className="text-xs font-bold text-red-300 uppercase mb-2 flex items-center">
                                        <UserPlus size={14} className="mr-2"/> How to Fix:
                                    </h6>
                                    <ol className="list-decimal list-inside text-xs text-slate-300 space-y-1">
                                        <li>Go to <strong>Google Cloud Console</strong> &gt; <strong>OAuth Consent Screen</strong>.</li>
                                        <li>Scroll to <strong>Test users</strong>, click <strong>+ ADD USERS</strong> and enter your email.</li>
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
                            <button onClick={onLogout} className="text-xs font-bold bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 px-6 py-2 rounded-lg border border-slate-700 transition flex items-center">
                                <LogOut size={14} className="mr-2"/> Sign Out
                            </button>
                        </div>
                    ) : (
                        <div className="relative z-10 text-center py-12">
                            <div className="bg-slate-800 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-slate-700 shadow-xl">
                                <Cloud size={40} className="text-blue-400"/>
                            </div>
                            <h4 className="text-2xl font-bold text-white mb-2">Sync Your Journal</h4>
                            <p className="text-slate-400 text-sm mb-8 max-w-sm mx-auto leading-relaxed">
                                Sign in to sync trades & strategies across your phone and desktop.
                            </p>
                            
                            {isSandbox ? (
                                <button disabled className="px-8 py-4 bg-slate-700 text-slate-400 rounded-xl text-lg font-bold flex items-center justify-center mx-auto w-full md:w-auto cursor-not-allowed border border-slate-600">
                                    <AlertTriangle size={20} className="mr-2" /> Login Disabled on Insecure Origin
                                </button>
                            ) : (
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
                            )}

                            {!googleClientId && (
                                <p className="text-xs text-amber-500 mt-4 font-bold bg-amber-900/10 p-2 rounded inline-block">
                                    ⚠️ Config Missing: Go to 'Configuration' tab to add your Client ID.
                                </p>
                            )}
                        </div>
                    )}

                    <div className="mt-12 pt-8 border-t border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
                        <div className="p-4 bg-slate-800/40 rounded-xl border border-slate-700/50">
                             <h5 className="text-xs font-bold text-white uppercase mb-3 flex items-center"><Download size={14} className="mr-2"/> Local Backup</h5>
                             <div className="flex gap-2">
                                <button onClick={onExportCSV} className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs py-2 rounded border border-slate-600">To Excel</button>
                                <button onClick={onExportJSON} className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs py-2 rounded border border-slate-600">To JSON</button>
                             </div>
                        </div>
                        <div className="p-4 bg-slate-800/40 rounded-xl border border-slate-700/50">
                             <h5 className="text-xs font-bold text-white uppercase mb-3 flex items-center"><Upload size={14} className="mr-2"/> Restore Backup</h5>
                             <button onClick={onImportClick} className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs py-2 rounded border border-slate-600">Select JSON/CSV File</button>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'config' && (
                <div className="bg-slate-900 rounded-2xl border border-slate-700 p-8 shadow-xl animate-fade-in">
                    <h4 className="text-xl font-bold text-white mb-6">Developer Settings</h4>

                    <div className="mb-6">
                        <label className="text-sm font-bold text-slate-300 flex items-center gap-2 mb-2">
                            <Key size={16} className="text-indigo-400"/> Gemini API Key
                        </label>
                        <input 
                            type="password" 
                            value={apiKey} 
                            onChange={(e) => setApiKey(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg py-3 px-4 text-white font-mono text-sm focus:border-indigo-500 outline-none"
                            placeholder="Required for AI Analysis"
                        />
                         <a href="https://aistudio.google.com/app/apikey" target="_blank" className="text-[10px] text-indigo-400 mt-1 inline-block hover:underline">Get API Key &rarr;</a>
                    </div>
                    
                    <div className="mb-6">
                        <label className="text-sm font-bold text-slate-300 flex items-center gap-2 mb-2">
                            <Cloud size={16} className="text-blue-400"/> Google OAuth Client ID
                        </label>
                        <input 
                            type="text" 
                            value={googleClientId} 
                            onChange={(e) => setGoogleClientId(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg py-3 px-4 text-white font-mono text-sm focus:border-blue-500 outline-none"
                            placeholder="Must be a WEB application client ID"
                        />
                         <a href="https://console.cloud.google.com/apis/credentials" target="_blank" className="text-[10px] text-blue-400 mt-1 inline-block hover:underline">Create OAuth Client ID &rarr;</a>
                    </div>

                    <div className="bg-slate-800 p-4 rounded-lg border border-slate-700 text-xs text-slate-400 mb-6">
                        <p className="mb-3 font-bold text-slate-200">🔧 OAuth Setup Guide:</p>
                        <ul className="list-disc list-inside space-y-1 mb-3">
                            <li>In GCloud Console, create an <strong>OAuth 2.0 Client ID</strong> for a <strong>Web application</strong>.</li>
                            <li>Add the URL below to <strong>Authorized JavaScript Origins</strong>.</li>
                            <li><strong>Do not</strong> add any Authorized redirect URIs.</li>
                        </ul>
                        <div className="flex items-center gap-2">
                             <code className="flex-1 bg-black/30 p-2 rounded text-emerald-400 font-mono select-all border border-slate-700 cursor-pointer hover:bg-black/50 transition" onClick={copyOrigin}>
                                {currentOrigin || '(loading...)'}
                            </code>
                            <button onClick={copyOrigin} className="p-2 bg-slate-700 hover:bg-slate-600 text-white rounded transition" title="Copy URL">
                                <Copy size={16}/>
                            </button>
                        </div>
                    </div>

                    <button onClick={onSaveSettings} className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition shadow-lg shadow-indigo-900/20">
                        Save Configuration
                    </button>
                </div>
            )}

        </div>
    </div>
  );
};

export default AccountSettings;
