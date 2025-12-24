
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
  analyzedPreMarket: boolean;
  waitedForOpen: boolean;
  checkedSensibullOI: boolean;
  exitTimeLimit: boolean;
}

export interface AiAnalysisResponse {
  grade: number;
  gradeColor: string;
  marketTrend: string;
  realityCheck: string;
  strategyAudit: {
    timing: string;
    direction: string;
    rulesFollowed: boolean;
  };
  coachCommand: string;
  sources?: string[];
}

export interface NewsAnalysis {
  sentiment: 'Bullish' | 'Bearish' | 'Neutral' | 'Mixed';
  sentimentScore: number;
  summary: string;
  globalCues: {
    usMarket: string;
    asianMarket: string;
    giftNifty: string;
  };
  keyHeadlines: string[];
  institutionalActivity?: string;
}

export interface PreMarketAnalysis {
  marketBias: 'Bullish' | 'Bearish' | 'Neutral' | 'Volatile';
  confidenceScore: number;
  keyLevels: {
    resistance: number[];
    support: number[];
  };
  coreThesis: string;
  firstHourPlan: {
    action: string;
    potentialTrade?: {
      direction: TradeDirection;
      entryZone: string;
      stopLoss: string;
      target: string;
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

export interface LiveMarketAnalysis {
    status: 'CONFIRMED' | 'INVALIDATED' | 'CAUTION';
    updatedBias: 'Bullish' | 'Bearish' | 'Neutral';
    realityCheck: string;
    immediateAction: string;
    tradeUpdate?: {
        direction: TradeDirection;
        entryPrice: string;
        stopLoss: string;
        target: string;
    }
}

export interface PostMarketAnalysis {
    predictionAccuracy: 'High' | 'Medium' | 'Low';
    actualTrend: string;
    planVsReality: string;
    keyTakeaways: string;
    tomorrowOutlook: {
        bias: 'Bullish' | 'Bearish' | 'Neutral';
        earlyLevels: {
            support: number[];
            resistance: number[];
        };
        watchFor: string;
    }
}

export interface TradeNote {
    id: string;
    timestamp: string;
    content: string;
    type: 'logic' | 'emotion' | 'market';
}

export interface Trade {
  id: string;
  date: string;
  entryTime?: string;
  exitTime?: string;
  instrument: string;
  executionType: 'PAPER' | 'REAL';
  optionType?: OptionType;
  strikePrice?: number;
  niftyEntryPrice?: number;
  niftyExitPrice?: number;
  direction: TradeDirection;
  entryPrice: number;
  exitPrice?: number;
  quantity: number;
  stopLoss?: number;
  takeProfit?: number;
  openingType?: OpeningType;
  spotPointsCaptured?: number;
  tradeDurationMins?: number;
  systemChecks?: SystemChecks;
  timeframe: Timeframe;
  session?: string;
  setupName: string; 
  marketContext: string; 
  entryReason: string;
  exitReason?: string;
  notes?: TradeNote[];
  chartImage?: string;
  oiImage?: string;
  confluences: string[];
  mistakes: string[];
  followedSystem: boolean;
  disciplineRating: number;
  emotionalState: string; 
  pnl?: number;
  outcome: TradeOutcome;
  aiFeedback?: string;
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

export interface StrategyProfile {
  name: string;
  description: string;
  tags: string[];
  steps: StrategyStep[];
  links: StrategyLink[];
  rules: StrategyRule[];
}

export interface StrategyStep {
  title: string;
  items: string[];
}

export interface StrategyRule {
  title: string;
  description: string;
}

export interface StrategyLink {
  label: string;
  url: string;
  description: string;
  icon?: string;
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

export interface ParsedVoiceCommand {
    instrument?: string;
    optionType?: OptionType;
    strikePrice?: number;
    direction?: TradeDirection;
    entryPrice?: number;
    quantity?: number;
    entryReason?: string;
    setupName?: string;
    note?: string;
}
