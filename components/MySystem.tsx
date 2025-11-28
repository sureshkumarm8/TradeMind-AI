import React, { useRef } from 'react';
import { Target, Clock, Activity, TrendingUp, AlertTriangle, ExternalLink, ShieldCheck, CheckSquare, Zap, Crosshair, Download, Upload, Settings } from 'lucide-react';
import { StrategyProfile } from '../types';
import { exportSystemProfile } from '../services/dataService';

interface MySystemProps {
  strategyProfile: StrategyProfile;
  onImport: (profile: StrategyProfile) => void;
}

const MySystem: React.FC<MySystemProps> = ({ strategyProfile, onImport }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [checklist, setChecklist] = React.useState({
    mindset: false,
    environment: false,
    levels: false,
    news: false
  });

  const toggleCheck = (key: keyof typeof checklist) => {
    setChecklist(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const allChecked = Object.values(checklist).every(Boolean);

  const handleDownloadTemplate = () => {
    exportSystemProfile(strategyProfile);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const profile = JSON.parse(content);
        // Simple validation
        if (profile.name && profile.steps && profile.rules) {
            onImport(profile);
            alert("System updated successfully!");
        } else {
            alert("Invalid Strategy Profile JSON.");
        }
      } catch (err) {
        alert("Failed to parse file.");
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="space-y-8 animate-fade-in max-w-6xl mx-auto">
       {/* System Data Options */}
       <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center text-slate-400 text-sm">
             <Settings size={16} className="mr-2" />
             <span className="font-semibold text-slate-300 mr-2">System Data Options:</span>
             Backup your current system or load a new one from file.
          </div>
          <div className="flex space-x-3">
            <button 
                onClick={handleDownloadTemplate}
                className="flex items-center text-xs bg-slate-700 text-slate-300 hover:text-white border border-slate-600 px-3 py-2 rounded-lg transition"
            >
                <Download size={14} className="mr-2" /> Backup / Template
            </button>
            <button 
                onClick={handleImportClick}
                className="flex items-center text-xs bg-indigo-600/20 text-indigo-400 hover:text-white border border-indigo-500/30 px-3 py-2 rounded-lg transition"
            >
                <Upload size={14} className="mr-2" /> Load System File
            </button>
             <input 
                type="file" ref={fileInputRef} onChange={handleFileChange} 
                className="hidden" accept=".json"
            />
          </div>
       </div>

       {/* Header / Manifesto */}
       <div className="bg-gradient-to-r from-indigo-950 to-slate-900 p-8 rounded-2xl border border-indigo-500/30 relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 p-8 opacity-5">
             <Target size={250} />
          </div>
          <div className="relative z-10 max-w-3xl">
            <h2 className="text-4xl font-extrabold text-white mb-4 tracking-tight">{strategyProfile.name}</h2>
            <p className="text-indigo-200 text-lg leading-relaxed font-light">
               "{strategyProfile.description}"
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
               {strategyProfile.tags.map((tag, idx) => {
                  const colors = [
                      "text-emerald-400 bg-emerald-950/40 border-emerald-500/20",
                      "text-blue-400 bg-blue-950/40 border-blue-500/20",
                      "text-amber-400 bg-amber-950/40 border-amber-500/20"
                  ];
                  const colorClass = colors[idx % colors.length];
                  return (
                    <div key={idx} className={`flex items-center text-sm font-bold px-5 py-2.5 rounded-full border shadow-lg ${colorClass}`}>
                       <ShieldCheck size={18} className="mr-2"/> {tag}
                    </div>
                  );
               })}
            </div>
          </div>
       </div>

       {/* Interactive Pre-Flight */}
       <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-6">
          <h3 className="text-white font-bold text-lg mb-4 flex items-center">
             <Zap className={`mr-2 ${allChecked ? 'text-yellow-400 fill-yellow-400' : 'text-slate-400'}`} size={20} />
             Pre-Flight Mental Check
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
             <button onClick={() => toggleCheck('mindset')} className={`flex items-center p-3 rounded-lg border transition-all ${checklist.mindset ? 'bg-indigo-900/30 border-indigo-500 text-indigo-300' : 'bg-slate-900 border-slate-700 text-slate-500 hover:border-slate-600'}`}>
                <CheckSquare size={18} className="mr-3" /> Calm & Focused
             </button>
             <button onClick={() => toggleCheck('environment')} className={`flex items-center p-3 rounded-lg border transition-all ${checklist.environment ? 'bg-indigo-900/30 border-indigo-500 text-indigo-300' : 'bg-slate-900 border-slate-700 text-slate-500 hover:border-slate-600'}`}>
                <CheckSquare size={18} className="mr-3" /> Distraction Free
             </button>
             <button onClick={() => toggleCheck('levels')} className={`flex items-center p-3 rounded-lg border transition-all ${checklist.levels ? 'bg-indigo-900/30 border-indigo-500 text-indigo-300' : 'bg-slate-900 border-slate-700 text-slate-500 hover:border-slate-600'}`}>
                <CheckSquare size={18} className="mr-3" /> Zones Marked
             </button>
             <button onClick={() => toggleCheck('news')} className={`flex items-center p-3 rounded-lg border transition-all ${checklist.news ? 'bg-indigo-900/30 border-indigo-500 text-indigo-300' : 'bg-slate-900 border-slate-700 text-slate-500 hover:border-slate-600'}`}>
                <CheckSquare size={18} className="mr-3" /> Global News Check
             </button>
          </div>
       </div>

       {/* The Protocol Timeline */}
       <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 relative">
          {/* Connector Line (Desktop) */}
          <div className="hidden lg:block absolute top-12 left-10 right-10 h-0.5 bg-slate-700 -z-10"></div>

          {strategyProfile.steps.map((step, idx) => {
              const borderColors = ['hover:border-indigo-500/50', 'hover:border-amber-500/50', 'hover:border-emerald-500/50'];
              const textColors = ['text-indigo-400', 'text-amber-400', 'text-emerald-400'];
              const groupHoverColors = ['group-hover:border-indigo-500', 'group-hover:border-amber-500', 'group-hover:border-emerald-500'];
              
              const colorIdx = idx % 3;

              return (
                <div key={idx} className={`bg-slate-800 p-6 rounded-xl border border-slate-700 ${borderColors[colorIdx]} transition duration-300 shadow-lg group`}>
                     <div className={`w-14 h-14 bg-slate-900 rounded-full flex items-center justify-center ${textColors[colorIdx]} font-bold text-xl mb-6 border-4 border-slate-800 ${groupHoverColors[colorIdx]} transition-colors mx-auto lg:mx-0`}>
                        {idx + 1}
                     </div>
                     <h3 className="text-xl font-bold text-white mb-3">{step.title}</h3>
                     <ul className="space-y-3 text-slate-400 text-sm">
                        {step.items.map((item, i) => (
                             <li key={i} className="flex items-start"><span className={`${textColors[colorIdx]} mr-2 mt-0.5`}>•</span> {item}</li>
                        ))}
                     </ul>
                  </div>
              )
          })}
       </div>

       {/* Tools Section */}
       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {strategyProfile.links.map((link, idx) => (
             <a key={idx} href={link.url} target="_blank" rel="noopener noreferrer" 
                className="group bg-slate-800 p-8 rounded-xl border border-slate-700 hover:bg-slate-700/50 hover:border-slate-600 transition flex items-center justify-between shadow-lg">
                <div className="flex items-center">
                    <div className="bg-slate-900 p-3 rounded-lg mr-4 border border-slate-700">
                        <Activity className="text-indigo-400" size={32}/>
                    </div>
                    <div>
                    <h4 className="text-white font-bold text-lg">{link.label}</h4>
                    <p className="text-slate-400 text-sm">{link.description}</p>
                    </div>
                </div>
                <ExternalLink className="text-slate-600 group-hover:text-white" size={24}/>
            </a>
          ))}
       </div>

       {/* Discipline & Psychology */}
       <div className="bg-slate-900 p-8 rounded-xl border border-red-900/30">
          <div className="flex items-center mb-8 border-b border-red-900/30 pb-4">
             <AlertTriangle className="text-red-500 mr-3" size={28}/>
             <h3 className="text-2xl font-bold text-white">The Iron Rules of Discipline</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             {strategyProfile.rules.map((rule, idx) => (
                <div key={idx} className="bg-black/40 p-5 rounded-lg border-l-4 border-red-500 hover:bg-red-900/5 transition">
                    <p className="text-red-200 font-bold text-base mb-1 uppercase">{rule.title}</p>
                    <p className="text-slate-500 text-sm">{rule.description}</p>
                </div>
             ))}
          </div>
       </div>
    </div>
  );
};

export default MySystem;