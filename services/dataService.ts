
import { Trade, TradeDirection, TradeOutcome, OptionType, StrategyProfile } from '../types';

// Helper to generate the backup object structure
export const getBackupObject = (trades: Trade[], strategy?: StrategyProfile) => {
  return {
    trades,
    strategy,
    version: '1.0',
    exportDate: new Date().toISOString()
  };
};

export const exportToJSON = (trades: Trade[], strategy?: StrategyProfile) => {
  const data = getBackupObject(trades, strategy);
  const dataStr = JSON.stringify(data, null, 2);
  const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
  const exportFileDefaultName = `trademind_backup_${new Date().toISOString().split('T')[0]}.json`;
  
  const linkElement = document.createElement('a');
  linkElement.setAttribute('href', dataUri);
  linkElement.setAttribute('download', exportFileDefaultName);
  linkElement.click();
}

export const shareBackupData = async (trades: Trade[], strategy?: StrategyProfile) => {
  const data = getBackupObject(trades, strategy);
  const fileName = `trademind_data_${new Date().toISOString().split('T')[0]}.json`;
  const file = new File([JSON.stringify(data, null, 2)], fileName, { type: 'application/json' });

  if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({
        files: [file],
        title: 'TradeMind Backup',
        text: 'Here is my TradeMind journal backup file.'
      });
      return true;
    } catch (err) {
      console.warn("Share cancelled or failed", err);
      return false;
    }
  } else {
    // Fallback to standard download if sharing not supported
    exportToJSON(trades, strategy);
    return true;
  }
};

export const exportSystemProfile = (profile: StrategyProfile) => {
  const dataStr = JSON.stringify(profile, null, 2);
  const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
  const exportFileDefaultName = `my_system_template_${new Date().toISOString().split('T')[0]}.json`;
  
  const linkElement = document.createElement('a');
  linkElement.setAttribute('href', dataUri);
  linkElement.setAttribute('download', exportFileDefaultName);
  linkElement.click();
}

export const exportToCSV = (trades: Trade[]) => {
  // Define headers map specifically for Nifty Intraday System
  const headers = [
    'ID', 'Date', 'EntryTime', 'ExitTime', 'Instrument', 'OptionType', 'Strike', 
    'NiftySpotEntry', 'NiftySpotExit', 
    'Direction', 'Quantity', 'EntryPrice', 'ExitPrice', 'PnL', 'Outcome', 
    'SpotPoints', 'DurationMins', 
    'Check_PreMarket', 'Check_Wait15m', 'Check_Sensibull', 'Check_ExitLimit', 
    'Setup', 'EntryReason', 'ExitReason', 
    'Confluences', 'Mistakes', 'AI_Analysis',
    'OpeningType', 'DisciplineRating', 'FollowedSystem', 'EmotionalState',
    'Timeline_Notes'
  ];

  const csvRows = [headers.join(',')];

  trades.forEach(trade => {
    // Helper to safely quote strings that might contain commas
    const q = (str: string | undefined | number | boolean) => {
        if (str === undefined || str === null) return '""';
        return `"${String(str).replace(/"/g, '""')}"`;
    };
    
    // Format Notes Timeline for CSV
    const timelineStr = trade.notes 
        ? trade.notes.map(n => `[${n.timestamp}] ${n.content}`).join(' | ') 
        : '';
    
    const row = [
      trade.id,
      trade.date,
      trade.entryTime || '',
      trade.exitTime || '',
      q(trade.instrument),
      trade.optionType || '',
      trade.strikePrice || '',
      trade.niftyEntryPrice || '',
      trade.niftyExitPrice || '',
      trade.direction,
      trade.quantity,
      trade.entryPrice,
      trade.exitPrice || '',
      trade.pnl || '',
      trade.outcome,
      trade.spotPointsCaptured || '',
      trade.tradeDurationMins || '',
      // System Checks
      trade.systemChecks?.analyzedPreMarket ? 'TRUE' : 'FALSE',
      trade.systemChecks?.waitedForOpen ? 'TRUE' : 'FALSE',
      trade.systemChecks?.checkedSensibullOI ? 'TRUE' : 'FALSE',
      trade.systemChecks?.exitTimeLimit ? 'TRUE' : 'FALSE',
      // Text Data
      q(trade.setupName),
      q(trade.entryReason),
      q(trade.exitReason),
      q((trade.confluences || []).join(' | ')),
      q((trade.mistakes || []).join(' | ')),
      q(trade.aiFeedback),
      // Psychology & Context
      q(trade.openingType),
      trade.disciplineRating || '',
      trade.followedSystem ? 'TRUE' : 'FALSE',
      q(trade.emotionalState),
      q(timelineStr)
    ];
    csvRows.push(row.join(','));
  });

  const csvString = csvRows.join('\n');
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `trademind_nifty_export_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export const importData = (file: File): Promise<{ trades: Trade[], strategy?: StrategyProfile }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      try {
        if (file.name.toLowerCase().endsWith('.json')) {
           const parsed = JSON.parse(content);
           // Handle various JSON schemas
           if (Array.isArray(parsed)) {
             resolve({ trades: parsed });
           } else if (parsed.trades && Array.isArray(parsed.trades)) {
             resolve({ trades: parsed.trades, strategy: parsed.strategy });
           } else if (parsed.name && parsed.steps && parsed.rules) {
             resolve({ trades: [], strategy: parsed });
           } else {
             reject(new Error("Invalid JSON format. Expected an array of trades or backup object."));
           }
        } else if (file.name.toLowerCase().endsWith('.csv')) {
           const trades = parseCSV(content);
           resolve({ trades });
        } else {
           reject(new Error("Unsupported file type. Please upload .json or .csv"));
        }
      } catch (err) {
        reject(err);
      }
    };
    reader.readAsText(file);
  });
}

// Custom CSV Parser with Strict Number Conversion
const parseCSV = (csvText: string): Trade[] => {
   const lines = csvText.trim().split('\n');
   if (lines.length < 2) return [];

   const trades: Trade[] = [];
   
   // Regex to split by comma but ignore commas inside quotes
   const parseRow = (row: string) => {
      const result = [];
      let current = '';
      let inQuote = false;
      for(let i=0; i<row.length; i++) {
         const char = row[i];
         if (char === '"') {
            if (inQuote && row[i+1] === '"') { // Handle escaped quote
               current += '"';
               i++;
            } else {
               inQuote = !inQuote;
            }
         } else if (char === ',' && !inQuote) {
            result.push(current);
            current = '';
         } else {
            current += char;
         }
      }
      result.push(current);
      return result;
   };

   // Skip header row
   for(let i=1; i<lines.length; i++) {
      const values = parseRow(lines[i]);
      if(values.length < 5) continue; // Basic validation
      
      // Helper to strictly parse numbers (prevents string concatenation bugs in Dashboard)
      const num = (val: string, def: number = 0): number => {
          if (!val || val.trim() === '') return def;
          // AGGRESSIVE CLEANUP: Remove everything except numbers, dot, and minus
          const cleanVal = val.replace(/[^0-9.-]/g, '');
          const n = parseFloat(cleanVal);
          return isNaN(n) ? def : n;
      };

      // Helper for boolean
      const bool = (val: string) => val === 'TRUE';

      // Map based on export columns order
      const t: any = {
         id: values[0] || crypto.randomUUID(),
         date: values[1],
         entryTime: values[2],
         exitTime: values[3],
         instrument: values[4],
         optionType: values[5] as OptionType,
         strikePrice: num(values[6]),
         niftyEntryPrice: num(values[7]),
         niftyExitPrice: num(values[8]),
         direction: values[9] as TradeDirection,
         quantity: num(values[10], 75), // Default to 75
         entryPrice: num(values[11], 0),
         exitPrice: num(values[12], 0),
         pnl: num(values[13], 0),
         outcome: values[14] as TradeOutcome,
         spotPointsCaptured: num(values[15], 0),
         tradeDurationMins: num(values[16], 0),
         
         systemChecks: {
            analyzedPreMarket: bool(values[17]),
            waitedForOpen: bool(values[18]),
            checkedSensibullOI: bool(values[19]),
            exitTimeLimit: bool(values[20])
         },
         
         setupName: values[21],
         entryReason: values[22],
         exitReason: values[23],
         confluences: values[24] ? values[24].split(' | ').filter(Boolean) : [],
         mistakes: values[25] ? values[25].split(' | ').filter(Boolean) : [],
         aiFeedback: values[26],
         
         openingType: values[27] || 'FLAT',
         disciplineRating: num(values[28], 5),
         followedSystem: bool(values[29]),
         emotionalState: values[30] || 'Neutral',
         // Note: Importing timeline from CSV string is complex, so we leave empty or simple restore
         notes: [] 
      };
      
      // Basic Data Cleanup
      if (!t.timeframe) t.timeframe = '5m'; 
      
      trades.push(t);
   }
   return trades;
}
