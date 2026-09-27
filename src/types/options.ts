export type IndexSymbol = 'NIFTY' | 'BANKNIFTY' | 'FINNIFTY';

export type OptionType = 'CE' | 'PE';
export type ActionType = 'BUY' | 'SELL';
export type OrderType = 'MARKET' | 'LIMIT';

export interface IndexInfo {
  symbol: IndexSymbol;
  name: string;
  spotPrice: number;
  change: number;
  changePercent: number;
  lotSize: number;
  strikeStep: number;
  atmStrike: number;
  high: number;
  low: number;
  open: number;
  prevClose: number;
  indiaVix: number;
  pcr: number;
  maxPain: number;
  expiries: string[];
  selectedExpiry: string;
}

export interface Greeks {
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  rho: number;
  iv: number; // in percentage, e.g. 14.5
}

export interface OptionData {
  strike: number;
  type: OptionType;
  ltp: number;
  change: number;
  changePercent: number;
  bid: number;
  ask: number;
  volume: number;
  oi: number; // in contracts
  oiChange: number;
  oiChangePercent: number;
  greeks: Greeks;
  isAtm: boolean;
  isItm: boolean;
}

export interface OptionChainRow {
  strike: number;
  ce: OptionData;
  pe: OptionData;
  isAtm: boolean;
}

export interface StrategyLeg {
  id: string;
  index: IndexSymbol;
  expiry: string;
  strike: number;
  type: OptionType;
  action: ActionType;
  lots: number;
  quantity: number;
  entryPrice: number;
  currentPrice: number;
  greeks: Greeks;
}

export interface StrategyPayoff {
  maxProfit: number | 'Unlimited';
  maxLoss: number | 'Unlimited';
  riskReward: string;
  lowerBreakeven: number | null;
  upperBreakeven: number | null;
  netCreditDebit: number; // positive = credit received, negative = debit paid
  marginRequired: number;
  hedgeBenefit: number;
  points: {
    spot: number;
    pnlExpiry: number;
    pnlTarget: number;
  }[];
  portfolioGreeks: {
    delta: number;
    gamma: number;
    theta: number;
    vega: number;
    deltaRupees: number; // ₹ change per 1 index point move
    thetaRupees: number; // ₹ time decay per 1 day
    vegaRupees: number;  // ₹ change per 1% IV move
  };
}

export interface Position {
  id: string;
  index: IndexSymbol;
  expiry: string;
  strike: number;
  type: OptionType;
  action: ActionType;
  lots: number;
  quantity: number;
  avgPrice: number;
  ltp: number;
  mtm: number;
  pnlPercent: number;
  greeks: Greeks;
  stopLoss?: number;
  takeProfit?: number;
  createdAt: number;
}

export interface Order {
  id: string;
  index: IndexSymbol;
  expiry: string;
  strike: number;
  type: OptionType;
  action: ActionType;
  orderType: OrderType;
  lots: number;
  quantity: number;
  price: number;
  executedPrice: number;
  status: 'EXECUTED' | 'CANCELLED';
  timestamp: number;
  brokerage: number; // ₹0 for client
  stt: number;
  exchangeCharges: number;
  gst: number;
  sebiCharges: number;
  stampDuty: number;
  totalTaxes: number;
}

export interface AccountPortfolio {
  capital: number;
  availableMargin: number;
  usedMargin: number;
  realizedPnl: number;
  unrealizedPnl: number;
  dailyLossLimit: number;
  autoSquareOff: boolean;
  totalBrokerageSaved: number;
}

export interface JournalEntry {
  id: string;
  date: string;
  strategyName: string;
  index: IndexSymbol;
  pnl: number;
  setupType: 'Breakout' | 'Mean-Reversion' | 'Expiry Day Theta' | 'High IV Crush' | 'Directional Trend' | 'Hedging';
  emotions: 'Disciplined' | 'FOMO' | 'Greed' | 'Fear' | 'Patient';
  ruleFollowed: boolean;
  notes: string;
}
