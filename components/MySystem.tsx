
import React, { useRef, useState } from 'react';
import { Target, Activity, AlertTriangle, ExternalLink, ShieldCheck, CheckSquare, Zap, MoreVertical, Edit, Save, Plus, Trash2, Download, Upload, MonitorPlay, BrainCircuit, PlayCircle, Lock } from 'lucide-react';
import { StrategyProfile, StrategyStep, StrategyRule, StrategyLink, NotificationType } from '../types';
import { exportSystemProfile } from '../services/dataService';

interface MySystemProps {
  strategyProfile: StrategyProfile;
  onImport: (profile: StrategyProfile) => void;
  onUpdate: (profile: StrategyProfile) => void;
  notify?: (message: string, type?: NotificationType) => void;
}

const MySystem: React.FC<MySystemProps> = ({ strategyProfile, onImport, onUpdate, notify }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  
  // Local state for editing
  const [editProfile, setEditProfile] = useState<StrategyProfile>(strategyProfile);

  const [checklist, setChecklist] = useState({
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
    setShowMenu(false);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
    setShowMenu(false);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const profile = JSON.parse(content);
        if (profile.name && profile.steps && profile.rules) {
            onImport(profile);
            if (notify) notify("System imported successfully", "success");
            else alert("System updated successfully!");
        } else {
            if (notify) notify("Invalid Strategy Profile JSON", "error");
            else alert("Invalid Strategy Profile JSON.");
        }
      } catch (err) {
        if (notify) notify("Failed to parse file", "error");
        else alert("Failed to parse file.");
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // --- Edit Handlers ---

  const handleStartEdit = () => {
    setEditProfile(JSON.parse(JSON.stringify(strategyProfile))); // Deep copy
    setIsEditing(true);
    setShowMenu(false);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
  };

  const handleSaveEdit = () => {
    onUpdate(editProfile);
    setIsEditing(false);
  };

  const handleBasicChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setEditProfile(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleTagsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditProfile(prev => ({ ...prev, tags: e.target.value.split(',').map(t => t.trim()) }));
  };

  // Steps
  const updateStep = (index: number, field: keyof StrategyStep, value: any) => {
     const newSteps = [...editProfile.steps];
     if (field === 'items' && typeof value === 'string') {
        newSteps[index] = { ...newSteps[index], items: value.split('\n') };
     } else {
        newSteps[index] = { ...newSteps[index], [field]: value };
     }
     setEditProfile({ ...editProfile, steps: newSteps });
  };
  const addStep = () => setEditProfile({ ...editProfile, steps: [...editProfile.steps, { title: 'New Phase', items: ['Item 1'] }] });
  const removeStep = (index: number) => setEditProfile({ ...editProfile, steps: editProfile.steps.filter((_, i) => i !== index) });

  // Links
  const updateLink = (index: number, field: keyof StrategyLink, value: string) => {
     const newLinks = [...editProfile.links];
     newLinks[index] = { ...newLinks[index], [field]: value };
     setEditProfile({ ...editProfile, links: newLinks });
  };
  const addLink = () => setEditProfile({ ...editProfile, links: [...editProfile.links, { label: 'New Tool', url: 'https://', description: 'Description' }] });
  const removeLink = (index: number) => setEditProfile({ ...editProfile, links: editProfile.links.filter((_, i) => i !== index) });

  // Rules
  const updateRule = (index: number, field: keyof StrategyRule, value: string) => {
     const newRules = [...editProfile.rules];
     newRules[index] = { ...newRules[index], [field]: value };
     setEditProfile({ ...editProfile, rules: newRules });
  };
  const addRule = () => setEditProfile({ ...editProfile, rules: [...editProfile.rules, { title: 'NEW RULE', description: 'Description' }] });
  const removeRule = (index: number) => setEditProfile({ ...editProfile, rules: editProfile.rules.filter((_, i) => i !== index) });


  if (isEditing) {
    return (
      <div className="max-w-4xl mx-auto bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-2xl space-y-8 animate-fade-in mb-12">
         <div className="flex justify-between items-center border-b border-slate-700 pb-4">
            <h2 className="text-xl font-bold text-white flex items-center">
               <Edit size={20} className="mr-2 text-indigo-400"/> Edit My System
            </h2>
            <div className="flex space-x-3">
               <button onClick={handleCancelEdit} className="px-4 py-2 text-sm text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg">Cancel</button>
               <button onClick={handleSaveEdit} className="px-6 py-2 text-sm bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg flex items-center">
                  <Save size={16} className="mr-2"/> Save Changes
               </button>
            </div>
         </div>

         <div className="space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-1 gap-4">
               <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Strategy Name</label>
                  <input type="text" name="name" value={editProfile.name} onChange={handleBasicChange} className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white outline-none focus:border-indigo-500" />
               </div>
               <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Manifesto / Description</label>
                  <textarea name="description" value={editProfile.description} onChange={handleBasicChange} rows={3} className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white outline-none focus:border-indigo-500" />
               </div>
               <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tags (Comma separated)</label>
                  <input type="text" value={editProfile.tags.join(', ')} onChange={handleTagsChange} className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white outline-none focus:border-indigo-500" />
               </div>
            </div>

            {/* Steps Editor */}
            <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700">
               <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-indigo-400">Protocol Steps</h3>
                  <button onClick={addStep} className="text-xs flex items-center bg-indigo-600/20 text-indigo-300 px-2 py-1 rounded hover:bg-indigo-600/40"><Plus size={12} className="mr-1"/> Add Step</button>
               </div>
               <div className="space-y-4">
                  {editProfile.steps.map((step, idx) => (
                     <div key={idx} className="bg-slate-800 p-3 rounded border border-slate-600 relative">
                        <button onClick={() => removeStep(idx)} className="absolute top-2 right-2 text-slate-600 hover:text-red-400"><Trash2 size={14}/></button>
                        <input 
                           type="text" 
                           value={step.title} 
                           onChange={(e) => updateStep(idx, 'title', e.target.value)} 
                           className="w-full bg-transparent border-b border-slate-600 text-white font-bold mb-2 focus:border-indigo-500 outline-none"
                           placeholder="Step Title"
                        />
                        <textarea 
                           value={step.items.join('\n')} 
                           onChange={(e) => updateStep(idx, 'items', e.target.value)}
                           className="w-full bg-slate-900 text-sm text-slate-300 p-2 rounded outline-none"
                           rows={3}
                           placeholder="Items (one per line)"
                        />
                     </div>
                  ))}
               </div>
            </div>

            {/* Rules Editor */}
             <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700">
               <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-red-400">Iron Rules</h3>
                  <button onClick={addRule} className="text-xs flex items-center bg-red-600/20 text-red-300 px-2 py-1 rounded hover:bg-red-600/40"><Plus size={12} className="mr-1"/> Add Rule</button>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {editProfile.rules.map((rule, idx) => (
                     <div key={idx} className="bg-slate-800 p-3 rounded border border-slate-600 relative">
                        <button onClick={() => removeRule(idx)} className="absolute top-2 right-2 text-slate-600 hover:text-red-400"><Trash2 size={14}/></button>
                        <input 
                           type="text" 
                           value={rule.title} 
                           onChange={(e) => updateRule(idx, 'title', e.target.value)} 
                           className="w-full bg-transparent border-b border-slate-600 text-red-200 font-bold mb-2 focus:border-red-500 outline-none uppercase"
                           placeholder="RULE TITLE"
                        />
                        <textarea 
                           value={rule.description} 
                           onChange={(e) => updateRule(idx, 'description', e.target.value)}
                           className="w-full bg-slate-900 text-sm text-slate-300 p-2 rounded outline-none"
                           rows={2}
                           placeholder="Rule description..."
                        />
                     </div>
                  ))}
               </div>
            </div>

            {/* Links Editor */}
            <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700">
               <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-emerald-400">Tools & Links</h3>
                  <button onClick={addLink} className="text-xs flex items-center bg-emerald-600/20 text-emerald-300 px-2 py-1 rounded hover:bg-emerald-600/40"><Plus size={12} className="mr-1"/> Add Link</button>
               </div>
               <div className="space-y-3">
                  {editProfile.links.map((link, idx) => (
                     <div key={idx} className="bg-slate-800 p-3 rounded border border-slate-600 flex flex-col md:flex-row gap-3 items-start md:items-center relative">
                        <button onClick={() => removeLink(idx)} className="absolute top-2 right-2 md:top-auto md:right-4 text-slate-600 hover:text-red-400"><Trash2 size={14}/></button>
                        <div className="flex-1 w-full">
                           <input type="text" value={link.label} onChange={(e) => updateLink(idx, 'label', e.target.value)} className="w-full bg-slate-900 p-1 rounded text-white text-sm mb-1" placeholder="Label" />
                           <input type="text" value={link.url} onChange={(e) => updateLink(idx, 'url', e.target.value)} className="w-full bg-slate-900 p-1 rounded text-slate-400 text-xs" placeholder="URL" />
                        </div>
                        <div className="flex-1 w-full">
                           <input type="text" value={link.description} onChange={(e) => updateLink(idx, 'description', e.target.value)} className="w-full bg-slate-900 p-1 rounded text-slate-300 text-sm" placeholder="Description" />
                        </div>
                     </div>
                  ))}
               </div>
            </div>

         </div>
      </div>
    );
  }

  // --- View Mode ---

  return (
    <div className="space-y-8 animate-fade-in max-w-6xl mx-auto pb-12">
       
       {/* File Import Input (Hidden) */}
       <input 
             type="file" ref={fileInputRef} onChange={handleFileChange} 
             className="hidden" accept=".json"
       />

       {/* Header / Manifesto Block */}
       <div className="bg-gradient-to-br from-slate-900 via-slate-850 to-indigo-950 p-6 md:p-10 rounded-2xl border border-slate-700 shadow-2xl relative overflow-hidden group">
          {/* Background Decor */}
          <div className="absolute top-0 right-0 p-8 opacity-5 transition-transform duration-700 group-hover:scale-110 pointer-events-none">
             <Target size={300} />
          </div>
          
          {/* Menu Button - Now Integrated inside the header */}
          <div className="absolute top-4 right-4 z-50">
              <div className="relative">
                  <button 
                     onClick={() => setShowMenu(!showMenu)} 
                     className="p-2 rounded-lg bg-slate-900/40 hover:bg-slate-800 border border-slate-700/50 hover:border-indigo-500 text-slate-400 hover:text-white transition backdrop-blur-sm"
                     title="System Options"
                  >
                     <MoreVertical size={20} />
                  </button>

                  {showMenu && (
                     <div className="absolute right-0 top-12 bg-slate-800 border border-slate-700 shadow-xl rounded-xl w-52 overflow-hidden ring-1 ring-black/20 animate-fade-in">
                        <button 
                           onClick={handleStartEdit}
                           className="w-full text-left px-4 py-3 text-sm text-slate-300 hover:bg-slate-700 hover:text-white flex items-center transition"
                        >
                           <Edit size={16} className="mr-3 text-indigo-400" /> Edit System
                        </button>
                        <button 
                           onClick={handleDownloadTemplate}
                           className="w-full text-left px-4 py-3 text-sm text-slate-300 hover:bg-slate-700 hover:text-white flex items-center transition"
                        >
                           <Download size={16} className="mr-3 text-emerald-400" /> BackUp System
                        </button>
                        <button 
                           onClick={handleImportClick}
                           className="w-full text-left px-4 py-3 text-sm text-slate-300 hover:bg-slate-700 hover:text-white flex items-center border-t border-slate-700 transition"
                        >
                           <Upload size={16} className="mr-3 text-blue-400" /> Import System
                        </button>
                     </div>
                  )}
              </div>
          </div>

          <div className="relative z-10 max-w-4xl">
             <div className="flex items-center gap-2 mb-3 text-indigo-400 font-bold uppercase tracking-widest text-xs">
                <ShieldCheck size={16} /> Official Trading Protocol
             </div>
            <h2 className="text-3xl md:text-5xl font-black text-white mb-6 tracking-tight drop-shadow-md">
                {strategyProfile.name}
            </h2>
            
            <div className="bg-slate-900/30 backdrop-blur-md p-6 rounded-xl border-l-4 border-indigo-500 shadow-lg">
                <div className="flex gap-4">
                   <div className="hidden md:block">
                      <BrainCircuit size={40} className="text-indigo-500/50"/>
                   </div>
                   <p className="text-indigo-100 text-lg md:text-xl leading-relaxed font-medium italic">
                      "{strategyProfile.description}"
                   </p>
                </div>
            </div>
            
            {/* Tags */}
            <div className="mt-8 flex flex-wrap gap-3">
               {strategyProfile.tags.map((tag, idx) => {
                  const styles = [
                      "text-emerald-300 bg-emerald-950/30 border-emerald-500/30",
                      "text-blue-300 bg-blue-950/30 border-blue-500/30",
                      "text-amber-300 bg-amber-950/30 border-amber-500/30"
                  ];
                  const style = styles[idx % styles.length];
                  return (
                    <div key={idx} className={`flex items-center text-xs font-bold px-4 py-2 rounded-full border shadow-sm backdrop-blur-sm uppercase tracking-wide ${style}`}>
                       <Target size={14} className="mr-2"/> {tag}
                    </div>
                  );
               })}
            </div>
          </div>
       </div>

       {/* Interactive Pre-Flight - "Cockpit Mode" */}
       <div className="bg-slate-800 rounded-xl border border-slate-700 p-1">
          <div className="bg-slate-900/50 p-4 rounded-lg flex items-center justify-between border-b border-slate-700/50 mb-1">
             <h3 className="text-white font-bold text-lg flex items-center">
                <Zap className={`mr-2 ${allChecked ? 'text-yellow-400 fill-yellow-400' : 'text-slate-400'}`} size={20} />
                Pre-Flight Sequence
             </h3>
             <span className={`text-xs font-bold px-2 py-1 rounded uppercase ${allChecked ? 'bg-green-500/20 text-green-400' : 'bg-slate-700 text-slate-400'}`}>
                {allChecked ? 'Ready for Takeoff' : 'Pending Checks'}
             </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-1 p-1">
             {[
                { key: 'mindset', label: 'Calm & Focused', icon: BrainCircuit },
                { key: 'environment', label: 'Zero Distractions', icon: Lock },
                { key: 'levels', label: 'Levels Marked', icon: Target },
                { key: 'news', label: 'News Checked', icon: MonitorPlay }
             ].map((item) => (
               <button 
                  key={item.key}
                  onClick={() => toggleCheck(item.key as keyof typeof checklist)} 
                  className={`flex items-center justify-center p-4 rounded-lg border transition-all duration-200 group relative overflow-hidden ${checklist[item.key as keyof typeof checklist] ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-900/20' : 'bg-slate-800 border-slate-700 text-slate-500 hover:bg-slate-750'}`}
               >
                  <div className={`absolute inset-0 bg-gradient-to-r from-white/10 to-transparent opacity-0 transition-opacity ${checklist[item.key as keyof typeof checklist] ? 'opacity-20' : ''}`}></div>
                  <item.icon size={18} className={`mr-3 transition-transform ${checklist[item.key as keyof typeof checklist] ? 'scale-110' : 'group-hover:scale-110'}`} />
                  <span className="font-bold text-sm uppercase tracking-wide">{item.label}</span>
                  <div className={`ml-auto w-3 h-3 rounded-full ${checklist[item.key as keyof typeof checklist] ? 'bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]' : 'bg-slate-950 shadow-inner'}`}></div>
               </button>
             ))}
          </div>
       </div>

       {/* The Protocol Timeline */}
       <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 relative">
          {/* Connector Line (Desktop) */}
          <div className="hidden lg:block absolute top-14 left-16 right-16 h-1 bg-slate-700 -z-10 rounded-full"></div>

          {strategyProfile.steps.map((step, idx) => {
              const colors = [
                 { border: 'hover:border-indigo-500', text: 'text-indigo-400', bg: 'bg-indigo-500/10', glow: 'shadow-indigo-500/20', numberBg: 'bg-indigo-600' },
                 { border: 'hover:border-amber-500', text: 'text-amber-400', bg: 'bg-amber-500/10', glow: 'shadow-amber-500/20', numberBg: 'bg-amber-600' },
                 { border: 'hover:border-emerald-500', text: 'text-emerald-400', bg: 'bg-emerald-500/10', glow: 'shadow-emerald-500/20', numberBg: 'bg-emerald-600' }
              ];
              const c = colors[idx % 3];

              return (
                <div key={idx} className={`bg-slate-800 p-6 rounded-xl border border-slate-700 ${c.border} transition-all duration-300 hover:shadow-xl hover:-translate-y-1 group relative overflow-hidden`}>
                     {/* Number Badge */}
                     <div className={`w-12 h-12 ${c.numberBg} rounded-xl rotate-3 flex items-center justify-center text-white font-black text-xl mb-6 shadow-lg mx-auto lg:mx-0 group-hover:rotate-6 transition-transform`}>
                        {idx + 1}
                     </div>
                     
                     <h3 className="text-xl font-bold text-white mb-4 tracking-tight">{step.title}</h3>
                     
                     <div className={`space-y-3 ${c.text} text-sm font-medium`}>
                        {step.items.map((item, i) => (
                             <div key={i} className="flex items-start">
                                <PlayCircle size={14} className="mr-2 mt-0.5 flex-shrink-0 opacity-70" /> 
                                <span className="text-slate-300">{item}</span>
                             </div>
                        ))}
                     </div>
                     
                     {/* Background Glow */}
                     <div className={`absolute -right-10 -bottom-10 w-32 h-32 ${c.bg} rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity`}></div>
                  </div>
              )
          })}
       </div>

       {/* Bottom Section: Tools & Rules */}
       <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
           
           {/* Tools Section */}
           <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden flex flex-col">
               <div className="p-4 bg-slate-900 border-b border-slate-700 flex items-center gap-2">
                   <Activity className="text-emerald-400" size={20}/>
                   <h3 className="font-bold text-white uppercase tracking-wider text-sm">Mission Tools</h3>
               </div>
               <div className="p-4 grid grid-cols-1 gap-3 flex-1">
                  {strategyProfile.links.map((link, idx) => (
                     <a key={idx} href={link.url} target="_blank" rel="noopener noreferrer" 
                        className="group bg-slate-900/50 p-4 rounded-lg border border-slate-700/50 hover:bg-slate-700 hover:border-slate-600 transition flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded bg-slate-800 flex items-center justify-center text-slate-400 group-hover:text-white border border-slate-700">
                                <ExternalLink size={18}/>
                            </div>
                            <div>
                                <h4 className="text-white font-bold text-sm group-hover:text-emerald-300 transition-colors">{link.label}</h4>
                                <p className="text-slate-500 text-xs">{link.description}</p>
                            </div>
                        </div>
                    </a>
                  ))}
               </div>
           </div>

           {/* Discipline Section */}
           <div className="bg-slate-800 rounded-xl border border-red-900/50 overflow-hidden flex flex-col">
              <div className="p-4 bg-red-950/20 border-b border-red-900/30 flex items-center gap-2">
                 <AlertTriangle className="text-red-500" size={20}/>
                 <h3 className="font-bold text-red-100 uppercase tracking-wider text-sm">Iron Rules (Non-Negotiable)</h3>
              </div>
              <div className="p-4 space-y-3 flex-1">
                 {strategyProfile.rules.map((rule, idx) => (
                    <div key={idx} className="bg-black/20 p-4 rounded-lg border-l-2 border-red-600 hover:bg-red-950/10 transition group">
                        <div className="flex justify-between items-start mb-1">
                            <p className="text-red-400 font-bold text-xs uppercase tracking-widest">{rule.title}</p>
                            <Lock size={12} className="text-red-900 group-hover:text-red-700"/>
                        </div>
                        <p className="text-slate-400 text-sm font-medium">{rule.description}</p>
                    </div>
                 ))}
              </div>
           </div>

       </div>
    </div>
  );
};

export default MySystem;
