
import React, { useState, useEffect } from 'react';
import { UserProfile, SyncStatus } from '../types';
import { Settings, User, Cloud, Key, Save, ExternalLink, Mail, Code, Upload, Download, FileJson, FileSpreadsheet, CheckCircle2, AlertCircle, Loader2, Copy, Info, LogOut, ChevronRight, Shield, Database, Layout, AlertTriangle, ChevronDown, ChevronUp, UserPlus } from 'lucide-react';

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
  const [isGapiReady, setIsGapiReady] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  
  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';
  // Check if running in a Sandbox/Preview environment (Common cause of Auth errors)
  const isSandbox = currentOrigin === 'null' || 
                    currentOrigin.includes('storagerelay') || 
                    currentOrigin.includes('webcontainer') || 
                    currentOrigin.includes('stackblitz') ||
                    currentOrigin.includes('codesandbox');

  useEffect(() => {
     // Check if Google Scripts are loaded
     const checkGapi = setInterval(() => {
        if (window.google && window.gapi) {
            setIsGapiReady(true);
            clearInterval(checkGapi);
        }
     }, 500);
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
      const isPWA = window.matchMedia('(display-mode: standalone)').matches;
      const isAndroid = navigator.userAgent.includes('Android');
      
      if (err.includes('invalid_client') || err.includes('OAuth client was not found')) {
          return `❌ INVALID CLIENT ID: 
          1. Check you're using a WEB OAuth Client (not Android/iOS)
          2. Add ${currentOrigin} to "Authorized JavaScript Origins"
          3. Verify Client ID is copied correctly (no spaces/typos)`;
      }
      if (err.includes('idpiframe_initialization_failed') || err.includes('origin_mismatch')) {
          return "❌ Origin Mismatch: Add this URL to 'Authorized JavaScript Origins' in Google Cloud Console.";
      }
      if (err.includes('access_denied') || err.includes('not_authorized') || err.includes('403')) {
          return "❌ Access Denied: Add your email to 'Test Users' in OAuth Consent Screen.";
      }
      if (err.includes('redirect_uri_mismatch')) {
          return "❌ Redirect URI Error: Remove any redirect URIs from your Web OAuth Client (not needed for PWAs).";
      }
      return err;
  }

  const isAccessDenied = authError && (authError.includes('access_denied') || authError.includes('not_authorized') || authError.includes('403'));

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
                                    Google Login blocks preview URLs (like <code>storagerelay://</code>).
                                    <br/><strong>Fix:</strong> Open your Vercel URL in a new browser tab to sign in properly.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Auth Error Diagnostic Alert */}
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
                            
                            {/* Smart Action Button for Access Denied */}
                            {isAccessDenied && (
                                <div className="ml-8 bg-slate-900/50 border border-red-500/30 p-3 rounded-lg">
                                    <h6 className="text-xs font-bold text-red-300 uppercase mb-2 flex items-center">
                                        <UserPlus size={14} className="mr-2"/> How to Fix:
                                    </h6>
                                    <ol className="list-decimal list-inside text-xs text-slate-300 space-y-1">
                                        <li>Go to <strong>Google Cloud Console</strong> &gt; <strong>OAuth Consent Screen</strong>.</li>
                                        <li>Scroll down to <strong>Test users</strong>.</li>
                                        <li>Click <strong>+ ADD USERS</strong> and enter your email.</li>
                                        <li>Save and try signing in again.</li>
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
                                    ⚠️ Config Missing: Web OAuth Client ID required for PWA login
                                </p>
                            )}
                        </div>
                    )}

                    {/* Data Management Section (Always Visible) */}
                    <div className="mt-12 pt-8 border-t border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
                        <div className="p-4 bg-slate-800/40 rounded-xl border border-slate-700/50">
                             <h5 className="text-xs font-bold text-white uppercase mb-3 flex items-center"><Download size={14} className="mr-2"/> Backup Data</h5>
                             <div className="flex gap-2">
                                <button onClick={onExportCSV} className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs py-2 rounded border border-slate-600">To Excel</button>
                                <button onClick={onExportJSON} className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs py-2 rounded border border-slate-600">To JSON</button>
                             </div>
                        </div>
                        <div className="p-4 bg-slate-800/40 rounded-xl border border-slate-700/50">
                             <h5 className="text-xs font-bold text-white uppercase mb-3 flex items-center"><Upload size={14} className="mr-2"/> Restore Data</h5>
                             <button onClick={onImportClick} className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs py-2 rounded border border-slate-600">Select Backup File</button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- TAB: CONFIGURATION (Technical) --- */}
            {activeTab === 'config' && (
                <div className="bg-slate-900 rounded-2xl border border-slate-700 p-8 shadow-xl animate-fade-in">
                    <h4 className="text-xl font-bold text-white mb-6">Developer Settings</h4>

                    {/* API Key */}
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
                    
                    {/* Web Client ID */}
                    <div className="mb-6">
                        <label className="text-sm font-bold text-slate-300 flex items-center gap-2 mb-2">
                            <Cloud size={16} className="text-blue-400"/> Google OAuth Client ID
                        </label>
                        <input 
                            type="text" 
                            value={googleClientId} 
                            onChange={(e) => setGoogleClientId(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg py-3 px-4 text-white font-mono text-sm focus:border-blue-500 outline-none"
                            placeholder="123456789-abc123.apps.googleusercontent.com"
                        />
                        
                        {/* Real-time validation */}
                        {googleClientId && (
                            <div className="mt-2">
                                {googleClientId.includes('.googleusercontent.com') ? (
                                    googleClientId.toLowerCase().includes('android') ? (
                                        <div className="text-xs bg-red-900/20 border border-red-500/30 p-2 rounded text-red-400">
                                            ❌ This appears to be an Android Client ID. You need a <strong>Web application</strong> client for PWAs.
                                        </div>
                                    ) : (
                                        <div className="text-xs bg-green-900/20 border border-green-500/30 p-2 rounded text-green-400">
                                            ✅ Format looks correct for Web OAuth Client
                                        </div>
                                    )
                                ) : (
                                    <div className="text-xs bg-amber-900/20 border border-amber-500/30 p-2 rounded text-amber-400">
                                        ⚠️ Should end with .googleusercontent.com
                                    </div>
                                )}
                            </div>
                        )}
                        
                         <p className="text-[10px] text-blue-400/70 mt-1">Application type: <strong>Web application</strong> (used for both desktop and PWA)</p>
                         <a href="https://console.cloud.google.com/apis/credentials" target="_blank" className="text-[10px] text-blue-400 mt-1 inline-block hover:underline">Create Web OAuth Client &rarr;</a>
                    </div>



                    {/* Helper */}
                    <div className="bg-slate-800 p-4 rounded-lg border border-slate-700 text-xs text-slate-400 mb-6">
                        <p className="mb-3 font-bold text-slate-200">🔧 OAuth Setup Guide:</p>
                        
                        {/* Web OAuth Setup */}
                        <div className="mb-4 p-3 bg-blue-900/20 border border-blue-500/30 rounded">
                            <p className="font-bold text-blue-300 mb-2">🌐 Web OAuth Client Setup</p>
                            <ul className="list-disc list-inside space-y-1 mb-2">
                                <li>Application type: <strong>Web application</strong></li>
                                <li>Add URL below to <strong>Authorized JavaScript Origins</strong></li>
                                <li>Remove trailing slashes (e.g., <code>.app</code> not <code>.app/</code>)</li>
                                <li><strong>This works for both desktop browser AND Android PWA</strong></li>
                            </ul>
                            <div className="flex items-center gap-2 mt-2">
                                <code className="flex-1 bg-black/30 p-2 rounded text-blue-400 font-mono select-all border border-slate-600 cursor-pointer hover:bg-black/50 transition text-[10px]" onClick={copyOrigin}>
                                    {currentOrigin}
                                </code>
                                <button onClick={copyOrigin} className="p-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded transition" title="Copy URL">
                                    <Copy size={12}/>
                                </button>
                            </div>
                            <div className="mt-2">
                                <a href={`https://console.cloud.google.com/apis/credentials`} target="_blank" className="inline-flex items-center text-xs bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded transition">
                                    <ExternalLink size={12} className="mr-1"/> Open Google Console
                                </a>
                                <button onClick={() => {
                                    const message = `🔧 Quick Fix for "invalid_client" Error:\n\n1. Create/Edit Web OAuth Client\n2. Add this to "Authorized JavaScript Origins":\n   ${currentOrigin}\n3. Remove any "Authorized redirect URIs"\n4. Add your email to Test Users\n5. Wait 5 minutes & try again`;
                                    alert(message);
                                }} className="ml-2 text-xs bg-amber-600 hover:bg-amber-500 text-white px-3 py-1.5 rounded transition">
                                    Quick Fix Help
                                </button>
                            </div>
                        </div>

                        {/* PWA OAuth Note */}
                        <div className="mb-4 p-3 bg-purple-900/20 border border-purple-500/30 rounded">
                            <p className="font-bold text-purple-300 mb-2">📱 PWA Authentication Note</p>
                            <ul className="list-disc list-inside space-y-1 text-purple-200">
                                <li><strong>PWAs use Web OAuth Client</strong> - they run in browser context</li>
                                <li>Same Client ID works for desktop Chrome and Android Chrome PWA</li>
                                <li>Android OAuth Client is only for native APK apps, not PWAs</li>
                                <li>If getting "OAuth client not found" on Android PWA, check your <strong>Web Client</strong> setup</li>
                            </ul>
                        </div>

                        {/* Final Steps */}
                        <div className="p-3 bg-amber-900/20 border border-amber-500/30 rounded">
                            <p className="font-bold text-amber-300 mb-2">✅ Final Steps</p>
                            <ul className="list-disc list-inside space-y-1">
                                <li>Add your email to <strong>Test Users</strong> in OAuth Consent Screen</li>
                                <li>Wait <strong>5-10 minutes</strong> for Google changes to propagate</li>
                                <li>Test login works on both desktop browser and Android PWA</li>
                                <li><strong>Common fix:</strong> Clear browser cache on Android if still getting errors</li>
                            </ul>
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
