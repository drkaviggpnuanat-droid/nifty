import { IndexInfo, IndexSymbol, OptionChainRow, OptionData, OptionType } from '../types/options';
import { blackScholesPrice, calculateGreeks } from './blackScholes';

export const INITIAL_INDICES: Record<IndexSymbol, IndexInfo> = {
  NIFTY: {
    symbol: 'NIFTY',
    name: 'NIFTY 50',
    spotPrice: 24835.40,
    change: 142.25,
    changePercent: 0.58,
    lotSize: 25,
    strikeStep: 50,
    atmStrike: 24850,
    high: 24890.10,
    low: 24680.50,
    open: 24710.00,
    prevClose: 24693.15,
    indiaVix: 13.42,
    pcr: 1.18,
    maxPain: 24800,
    expiries: ['03 Oct 2026', '10 Oct 2026', '17 Oct 2026', '29 Oct 2026'],
    selectedExpiry: '03 Oct 2026',
  },
  BANKNIFTY: {
    symbol: 'BANKNIFTY',
    name: 'BANK NIFTY',
    spotPrice: 53380.60,
    change: 388.90,
    changePercent: 0.73,
    lotSize: 15,
    strikeStep: 100,
    atmStrike: 53400,
    high: 53520.40,
    low: 52980.20,
    open: 53040.00,
    prevClose: 52991.70,
    indiaVix: 15.10,
    pcr: 0.94,
    maxPain: 53200,
    expiries: ['01 Oct 2026', '08 Oct 2026', '15 Oct 2026', '29 Oct 2026'],
    selectedExpiry: '01 Oct 2026',
  },
  FINNIFTY: {
    symbol: 'FINNIFTY',
    name: 'FIN NIFTY',
    spotPrice: 24110.20,
    change: -45.60,
    changePercent: -0.19,
    lotSize: 25,
    strikeStep: 50,
    atmStrike: 24100,
    high: 24190.00,
    low: 24050.40,
    open: 24160.00,
    prevClose: 24155.80,
    indiaVix: 13.80,
    pcr: 1.05,
    maxPain: 24100,
    expiries: ['07 Oct 2026', '14 Oct 2026', '21 Oct 2026', '28 Oct 2026'],
    selectedExpiry: '07 Oct 2026',
  },
};

/**
 * Calculates days to expiration based on expiry string
 */
export function getDaysToExpiry(expiryStr: string): number {
  // Return realistic days based on expiry
  if (expiryStr.includes('01') || expiryStr.includes('03')) return 4;
  if (expiryStr.includes('07') || expiryStr.includes('08') || expiryStr.includes('10')) return 11;
  if (expiryStr.includes('14') || expiryStr.includes('15') || expiryStr.includes('17')) return 18;
  return 30;
}

/**
 * Generates options chain for an index with realistic volatility skew and open interest
 */
export function generateOptionChain(
  index: IndexInfo,
  daysToExpiry: number = 4,
  rangeCount: number = 24
): OptionChainRow[] {
  const S = index.spotPrice;
  const step = index.strikeStep;
  const atm = Math.round(S / step) * step;
  const T = Math.max(0.002, daysToExpiry / 365.0);
  const r = 0.065; // RBI repo rate 6.5%
  const baseIV = index.indiaVix / 100.0;

  const rows: OptionChainRow[] = [];
  const halfRange = Math.floor(rangeCount / 2);

  let totalCallOI = 0;
  let totalPutOI = 0;

  for (let i = -halfRange; i <= halfRange; i++) {
    const K = atm + i * step;
    const isAtm = K === atm;

    // Volatility skew: OTM puts have higher IV (vol skew typical for Indian equity indices)
    const moneyness = Math.log(K / S);
    const skewFactor = moneyness < 0 ? -0.22 * moneyness : 0.08 * moneyness;
    const strikeIV = Math.max(0.08, baseIV + skewFactor);

    // Call details
    const cePrice = blackScholesPrice(S, K, T, r, strikeIV, 'CE');
    const ceGreeks = calculateGreeks(S, K, T, r, strikeIV, 'CE');
    const isCeItm = S > K;

    // Put details
    const pePrice = blackScholesPrice(S, K, T, r, strikeIV * 1.02, 'PE');
    const peGreeks = calculateGreeks(S, K, T, r, strikeIV * 1.02, 'PE');
    const isPeItm = S < K;

    // Realistic Open Interest profile (peaks near round strikes and near ATM)
    const roundWeight = (K % (step * 5) === 0) ? 2.2 : (K % (step * 2) === 0 ? 1.4 : 0.9);
    const distanceNorm = Math.abs(i) / halfRange;
    const bellCurve = Math.exp(-2.5 * distanceNorm * distanceNorm);

    const baseContracts = index.symbol === 'BANKNIFTY' ? 45000 : 95000;
    const ceOI = Math.round((baseContracts * bellCurve * roundWeight * (moneyness > 0 ? 1.3 : 0.7)) / 50) * 50;
    const peOI = Math.round((baseContracts * bellCurve * roundWeight * (moneyness < 0 ? 1.4 : 0.8)) / 50) * 50;

    totalCallOI += ceOI;
    totalPutOI += peOI;

    const ceChg = Math.round((ceOI * 0.08 * (moneyness > 0 ? 1 : -0.6)) / 25) * 25;
    const peChg = Math.round((peOI * 0.09 * (moneyness < 0 ? 1 : -0.5)) / 25) * 25;

    const spreadSpread = Math.max(0.10, Math.min(2.0, cePrice * 0.015));

    const ceData: OptionData = {
      strike: K,
      type: 'CE',
      ltp: Number(cePrice.toFixed(2)),
      change: Number((index.change * ceGreeks.delta * 0.85).toFixed(2)),
      changePercent: Number(((index.change * ceGreeks.delta * 0.85 / Math.max(5, cePrice)) * 100).toFixed(1)),
      bid: Number(Math.max(0.05, cePrice - spreadSpread / 2).toFixed(2)),
      ask: Number((cePrice + spreadSpread / 2).toFixed(2)),
      volume: Math.round(ceOI * 1.8),
      oi: ceOI,
      oiChange: ceChg,
      oiChangePercent: Number(((ceChg / Math.max(100, ceOI - ceChg)) * 100).toFixed(1)),
      greeks: ceGreeks,
      isAtm,
      isItm: isCeItm,
    };

    const peData: OptionData = {
      strike: K,
      type: 'PE',
      ltp: Number(pePrice.toFixed(2)),
      change: Number((index.change * peGreeks.delta * 0.85).toFixed(2)),
      changePercent: Number(((index.change * peGreeks.delta * 0.85 / Math.max(5, pePrice)) * 100).toFixed(1)),
      bid: Number(Math.max(0.05, pePrice - spreadSpread / 2).toFixed(2)),
      ask: Number((pePrice + spreadSpread / 2).toFixed(2)),
      volume: Math.round(peOI * 1.7),
      oi: peOI,
      oiChange: peChg,
      oiChangePercent: Number(((peChg / Math.max(100, peOI - peChg)) * 100).toFixed(1)),
      greeks: peGreeks,
      isAtm,
      isItm: isPeItm,
    };

    rows.push({
      strike: K,
      ce: ceData,
      pe: peData,
      isAtm,
    });
  }

  return rows;
}

/**
 * Calculates SEBI & Statutory taxes according to official Indian derivatives schedule
 */
export function calculateStatutoryCharges(
  action: 'BUY' | 'SELL',
  premium: number,
  quantity: number
) {
  const turnover = premium * quantity;

  // Brokerage: ₹0.00 for NiftyPulse (Zero Cost structure)
  const brokerage = 0.00;

  // STT: 0.1% on option sell turnover (applicable only on SELL)
  const stt = action === 'SELL' ? Number((turnover * 0.001).toFixed(2)) : 0.00;

  // Exchange turnover charges: 0.0505% on premium turnover
  const exchangeCharges = Number((turnover * 0.000505).toFixed(2));

  // SEBI turnover charges: ₹10 per crore (0.0001%)
  const sebiCharges = Number((turnover * 0.000001).toFixed(2));

  // Stamp duty: 0.003% on BUY only
  const stampDuty = action === 'BUY' ? Number((turnover * 0.00003).toFixed(2)) : 0.00;

  // GST: 18% on (Brokerage + Exchange Charges + SEBI charges)
  const taxableServices = brokerage + exchangeCharges + sebiCharges;
  const gst = Number((taxableServices * 0.18).toFixed(2));

  const totalTaxes = Number((stt + exchangeCharges + sebiCharges + stampDuty + gst).toFixed(2));

  // Traditional broker comparison: ₹20 per executed order + 18% GST on brokerage = ₹23.60 saved!
  const traditionalBrokerageSaved = 20.00 + 3.60;

  return {
    brokerage,
    stt,
    exchangeCharges,
    sebiCharges,
    stampDuty,
    gst,
    totalTaxes,
    traditionalBrokerageSaved,
  };
}

/**
 * Calculates SPAN Margin + Exposure Margin requirement as per SEBI regulations
 * Accounts for spread / hedge benefits (e.g. Iron Condor / Vertical Spreads drastically lower margin)
 */
export function calculateMarginRequirement(
  legs: { action: 'BUY' | 'SELL'; type: OptionType; strike: number; quantity: number; ltp: number }[],
  spotPrice: number
) {
  if (legs.length === 0) return { requiredMargin: 0, hedgeBenefit: 0 };

  let nakedShortMargin = 0;
  let buyPremiums = 0;

  let buyCalls = 0;
  let sellCalls = 0;
  let buyPuts = 0;
  let sellPuts = 0;

  for (const leg of legs) {
    if (leg.action === 'BUY') {
      buyPremiums += leg.ltp * leg.quantity;
      if (leg.type === 'CE') buyCalls += leg.quantity;
      if (leg.type === 'PE') buyPuts += leg.quantity;
    } else {
      // Naked sell margin approx 12-14% of contract value + OTM/ITM adjustments
      const contractValue = spotPrice * leg.quantity;
      const baseSpanExposure = contractValue * 0.125 + (leg.ltp * leg.quantity);
      nakedShortMargin += baseSpanExposure;
      if (leg.type === 'CE') sellCalls += leg.quantity;
      if (leg.type === 'PE') sellPuts += leg.quantity;
    }
  }

  // Calculate Hedge Benefit (SEBI framework: hedged positions get 60% - 85% margin reduction)
  let hedgeReduction = 0;
  const hedgedCalls = Math.min(buyCalls, sellCalls);
  const hedgedPuts = Math.min(buyPuts, sellPuts);

  if (hedgedCalls > 0 && sellCalls > 0) {
    hedgeReduction += (nakedShortMargin * (hedgedCalls / (sellCalls + sellPuts))) * 0.72;
  }
  if (hedgedPuts > 0 && sellPuts > 0) {
    hedgeReduction += (nakedShortMargin * (hedgedPuts / (sellCalls + sellPuts))) * 0.72;
  }

  const netShortMargin = Math.max(0, nakedShortMargin - hedgeReduction);
  const requiredMargin = Math.round(buyPremiums + netShortMargin);
  const hedgeBenefit = Math.round(hedgeReduction);

  return {
    requiredMargin,
    hedgeBenefit,
  };
}
