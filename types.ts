
export enum TradeDirection {
  LONG = 'LONG',
  SHORT = 'SHORT'
}

export enum TradeOutcome {
  WIN = 'WIN',
  LOSS = 'LOSS',
  BREAK_EVEN = 'BREAK_EVEN',
  OPEN = 'OPEN',
  SKIPPED = 'SKIPPED'
}

export enum OptionType {
  CE = 'CE',
  PE = 'PE',
  FUT = 'FUT',
  SPOT = 'SPOT'
}

export enum Timeframe {
  M1 = '1m',
  M3 = '3m',
  M5 = '5m',
  M15 = '15m',
  H1 = '1H'
}

export enum OpeningType {
  GAP_UP = 'GAP_UP',
  GAP_DOWN = 'GAP_DOWN',
  FLAT = 'FLAT'
}

export type NotificationType = 'success' | 'error' | 'info';

export interface SystemChecks {
  analyzedPreMarket: boolean; // Prev day/month graph, S/R zones
  waitedForOpen: boolean; // 5-15 mins wait
  checkedSensibullOI: boolean; // OI vs Strike
  exitTimeLimit: boolean; // Exit within 15 mins OR Re-assessed
}

export interface AiAnalysisResponse {
  grade: number; // Changed to number (0-100)
  gradeColor: string; // hex or tailwind class hint
  marketTrend: string; // "Strong Bullish", "Choppy", "Bearish Reversal"
  realityCheck: string; // The comparison text
  strategyAudit: {
    timing: string; // "Perfect", "Early", "Late"
    direction: string; // "With Trend", "Counter Trend"
    rulesFollowed: boolean;
  };
  coachCommand: string; // The actionable advice
  sources?: string[]; // Grounding links
}

// --- NEWS INTELLIGENCE TYPES ---
export interface NewsAnalysis {
  sentiment: 'Bullish' | 'Bearish' | 'Neutral' | 'Mixed';
  sentimentScore: number; // 1-10
  summary: string; // Executive summary
  globalCues: {
    usMarket: string; // "Nasdaq +1.5%"
    asianMarket: string; // "Nikkei -0.4%"
    giftNifty: string; // "Trading at 22,100 (+50)"
  };
  keyHeadlines: string[];
  institutionalActivity?: string; // FII/DII data summary
}

// --- PRE-MARKET ANALYSIS TYPES ---
export interface PreMarketAnalysis {
  marketBias: 'Bullish' | 'Bearish' | 'Neutral' | 'Volatile';
  confidenceScore: number; // 1-10
  keyLevels: {
    resistance: number[];
    support: number[];
  };
  coreThesis: string;
  firstHourPlan: {
    action: string; // Tactical advice for 9:25-9:45
    potentialTrade?: {
      direction: TradeDirection;
      entryZone: string;
      stopLoss: string; // "Exactly 30 pts"
      target: string;   // "Exactly 35 pts"
    }
  };
  tradeSetups: {
    primary: {
      direction: TradeDirection;
      trigger: string;
      target: number;
      stopLoss: number;
    };
    alternate: {
      direction: TradeDirection;
      trigger: string;
      target: number;
      stopLoss: number;
    };
  };
  openingScenarios: {
    gapUp: string;
    gapDown: string;
  };
  chartSummaries: {
    marketGraph: string;
    intraday: string;
    oiData: string;
    multiStrike: string;
  }
}

// --- LIVE MARKET CHECK TYPES ---
export interface LiveMarketAnalysis {
    status: 'CONFIRMED' | 'INVALIDATED' | 'CAUTION';
    updatedBias: 'Bullish' | 'Bearish' | 'Neutral';
    realityCheck: string; // Comparison of Pre-Market vs Live Action
    immediateAction: string; // Specific instruction for 9:25-9:45
    tradeUpdate?: {
        direction: TradeDirection;
        entryPrice: string;
        stopLoss: string;
        target: string;
    }
}

// --- POST-MARKET DEBRIEF TYPES ---
export interface PostMarketAnalysis {
    predictionAccuracy: 'High' | 'Medium' | 'Low';
    actualTrend: string; // What actually happened today
    planVsReality: string; // Detailed comparison
    keyTakeaways: string; // Lesson learned
    tomorrowOutlook: {
        bias: 'Bullish' | 'Bearish' | 'Neutral';
        earlyLevels: {
            support: number[];
            resistance: number[];
        };
        watchFor: string; // What to look for at tomorrow's open
    }
}

export interface TradeNote {
    id: string;
    timestamp: string; // HH:mm:ss
    content: string;
    type: 'logic' | 'emotion' | 'market';
}

export interface Trade {
  id: string;
  date: string; // ISO String YYYY-MM-DD
  entryTime?: string; // HH:mm
  exitTime?: string; // HH:mm
  
  instrument: string; // Defaults to NIFTY 50
  executionType: 'PAPER' | 'REAL'; // New Flag for Real vs Paper

  // Derivative Details
  optionType?: OptionType;
  strikePrice?: number;
  
  // Nifty Spot Details (Underlying)
  niftyEntryPrice?: number;
  niftyExitPrice?: number;
  
  direction: TradeDirection;
  entryPrice: number; // Option Premium Entry
  exitPrice?: number; // Option Premium Exit
  quantity: number; // Defaults to 75
  stopLoss?: number;
  takeProfit?: number;
  
  // Nifty Scalp Specifics
  openingType?: OpeningType;
  spotPointsCaptured?: number; // Target 30
  tradeDurationMins?: number; // Target 15-30
  systemChecks?: SystemChecks;

  // Intraday Context
  timeframe: Timeframe;
  session?: string; // Morning, Mid-day, Closing
  
  // Analysis & Psychology
  setupName: string; 
  marketContext: string; 
  entryReason: string;
  exitReason?: string;
  
  // NEW: Live Commentary Timeline
  notes?: TradeNote[];
  
  // Visual Evidence (Base64 Strings)
  chartImage?: string;
  oiImage?: string;
  
  // Enhanced Tracking
  confluences: string[]; // e.g. ["VWAP", "CPR", "20 EMA"]
  mistakes: string[]; // e.g. ["FOMO", "Revenge", "Overtrading"]
  
  // Discipline tracking
  followedSystem: boolean;
  disciplineRating: number; // 1-5
  emotionalState: string; 
  
  // Result
  pnl?: number;
  outcome: TradeOutcome;
  
  // AI
  aiFeedback?: string; // Stored as JSON string
}

export interface DashboardStats {
  totalTrades: number;
  winRate: number;
  profitFactor: number;
  totalPnL: number;
  bestTrade: number;
  worstTrade: number;
  avgWin: number;
  avgLoss: number;
  longWinRate: number;
  shortWinRate: number;
}

export interface PlaybookStat {
    setupName: string;
    count: number;
    winRate: number;
    avgPnL: number;
    totalPnL: number;
}

// --- Strategy Profile Interfaces ---

export interface StrategyLink {
  label: string;
  url: string;
  description: string;
  icon?: string; // Icon name reference
}

export interface StrategyStep {
  title: string;
  items: string[];
}

export interface StrategyRule {
  title: string;
  description: string;
}

export interface StrategyProfile {
  name: string;
  description: string;
  tags: string[]; // e.g. ["Target: 30 Pts", "Risk: 1:1"]
  steps: StrategyStep[]; // The Timeline Phases
  links: StrategyLink[]; // Tools
  rules: StrategyRule[]; // Iron Rules
}

export interface UserSettings {
  apiKey: string;
  googleClientId?: string; // New: For Drive Sync
  preMarketNotes?: {
      date: string;
      notes: string;
  }
}

export interface UserProfile {
  name: string;
  email: string;
  picture: string;
}

export enum SyncStatus {
  OFFLINE = 'OFFLINE',
  SYNCED = 'SYNCED',
  SYNCING = 'SYNCING',
  ERROR = 'ERROR'
}

// Helper for Voice to Log
export interface ParsedVoiceCommand {
    instrument?: string;
    optionType?: OptionType;
    strikePrice?: number;
    direction?: TradeDirection;
    entryPrice?: number;
    quantity?: number;
    entryReason?: string;
    setupName?: string;
    note?: string; // New: For appending notes
}
