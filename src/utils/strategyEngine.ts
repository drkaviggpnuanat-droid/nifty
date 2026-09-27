import { IndexInfo, OptionType, StrategyLeg, StrategyPayoff } from '../types/options';
import { blackScholesPrice, calculateGreeks } from './blackScholes';
import { calculateMarginRequirement, getDaysToExpiry } from './marketData';

export interface StrategyTemplate {
  name: string;
  category: 'Bullish' | 'Bearish' | 'Neutral' | 'Volatile';
  description: string;
  createLegs: (index: IndexInfo) => Omit<StrategyLeg, 'id' | 'currentPrice' | 'greeks'>[];
}

export const STRATEGY_PRESETS: Record<string, StrategyTemplate> = {
  iron_condor: {
    name: 'Iron Condor',
    category: 'Neutral',
    description: 'Range-bound non-directional income strategy with defined risk and high margin benefit.',
    createLegs: (index) => {
      const step = index.strikeStep;
      const atm = index.atmStrike;
      return [
        { index: index.symbol, expiry: index.selectedExpiry, strike: atm - step * 2, type: 'PE', action: 'BUY', lots: 1, quantity: index.lotSize, entryPrice: 0 },
        { index: index.symbol, expiry: index.selectedExpiry, strike: atm - step, type: 'PE', action: 'SELL', lots: 1, quantity: index.lotSize, entryPrice: 0 },
        { index: index.symbol, expiry: index.selectedExpiry, strike: atm + step, type: 'CE', action: 'SELL', lots: 1, quantity: index.lotSize, entryPrice: 0 },
        { index: index.symbol, expiry: index.selectedExpiry, strike: atm + step * 2, type: 'CE', action: 'BUY', lots: 1, quantity: index.lotSize, entryPrice: 0 },
      ];
    },
  },
  short_straddle: {
    name: 'Short Straddle',
    category: 'Neutral',
    description: 'Theta decay income strategy selling ATM Call and Put. High payoff if index stays stagnant.',
    createLegs: (index) => {
      const atm = index.atmStrike;
      return [
        { index: index.symbol, expiry: index.selectedExpiry, strike: atm, type: 'CE', action: 'SELL', lots: 1, quantity: index.lotSize, entryPrice: 0 },
        { index: index.symbol, expiry: index.selectedExpiry, strike: atm, type: 'PE', action: 'SELL', lots: 1, quantity: index.lotSize, entryPrice: 0 },
      ];
    },
  },
  bull_call_spread: {
    name: 'Bull Call Spread',
    category: 'Bullish',
    description: 'Moderately bullish vertical spread. Lowers debit cost by selling higher strike call.',
    createLegs: (index) => {
      const step = index.strikeStep;
      const atm = index.atmStrike;
      return [
        { index: index.symbol, expiry: index.selectedExpiry, strike: atm, type: 'CE', action: 'BUY', lots: 1, quantity: index.lotSize, entryPrice: 0 },
        { index: index.symbol, expiry: index.selectedExpiry, strike: atm + step * 2, type: 'CE', action: 'SELL', lots: 1, quantity: index.lotSize, entryPrice: 0 },
      ];
    },
  },
  bear_put_spread: {
    name: 'Bear Put Spread',
    category: 'Bearish',
    description: 'Moderately bearish strategy. Buys ATM put and finances it by selling OTM put.',
    createLegs: (index) => {
      const step = index.strikeStep;
      const atm = index.atmStrike;
      return [
        { index: index.symbol, expiry: index.selectedExpiry, strike: atm, type: 'PE', action: 'BUY', lots: 1, quantity: index.lotSize, entryPrice: 0 },
        { index: index.symbol, expiry: index.selectedExpiry, strike: atm - step * 2, type: 'PE', action: 'SELL', lots: 1, quantity: index.lotSize, entryPrice: 0 },
      ];
    },
  },
  long_straddle: {
    name: 'Long Straddle',
    category: 'Volatile',
    description: 'Profits from sudden explosive move in either direction (earnings, budget, RBI policy).',
    createLegs: (index) => {
      const atm = index.atmStrike;
      return [
        { index: index.symbol, expiry: index.selectedExpiry, strike: atm, type: 'CE', action: 'BUY', lots: 1, quantity: index.lotSize, entryPrice: 0 },
        { index: index.symbol, expiry: index.selectedExpiry, strike: atm, type: 'PE', action: 'BUY', lots: 1, quantity: index.lotSize, entryPrice: 0 },
      ];
    },
  },
  iron_butterfly: {
    name: 'Iron Butterfly',
    category: 'Neutral',
    description: 'Combines ATM short straddle with OTM wings for defined-risk maximum theta capture.',
    createLegs: (index) => {
      const step = index.strikeStep;
      const atm = index.atmStrike;
      return [
        { index: index.symbol, expiry: index.selectedExpiry, strike: atm - step * 2, type: 'PE', action: 'BUY', lots: 1, quantity: index.lotSize, entryPrice: 0 },
        { index: index.symbol, expiry: index.selectedExpiry, strike: atm, type: 'PE', action: 'SELL', lots: 1, quantity: index.lotSize, entryPrice: 0 },
        { index: index.symbol, expiry: index.selectedExpiry, strike: atm, type: 'CE', action: 'SELL', lots: 1, quantity: index.lotSize, entryPrice: 0 },
        { index: index.symbol, expiry: index.selectedExpiry, strike: atm + step * 2, type: 'CE', action: 'BUY', lots: 1, quantity: index.lotSize, entryPrice: 0 },
      ];
    },
  },
  short_strangle: {
    name: 'Short Strangle',
    category: 'Neutral',
    description: 'Sells OTM Call & Put to create a wide profitable corridor with high probability of profit.',
    createLegs: (index) => {
      const step = index.strikeStep;
      const atm = index.atmStrike;
      return [
        { index: index.symbol, expiry: index.selectedExpiry, strike: atm - step * 2, type: 'PE', action: 'SELL', lots: 1, quantity: index.lotSize, entryPrice: 0 },
        { index: index.symbol, expiry: index.selectedExpiry, strike: atm + step * 2, type: 'CE', action: 'SELL', lots: 1, quantity: index.lotSize, entryPrice: 0 },
      ];
    },
  },
};

/**
 * Calculates complete strategy payoff diagram data, risk metrics, and aggregated Greeks
 */
export function calculateStrategyPayoff(
  legs: StrategyLeg[],
  spotPrice: number,
  expiryDays: number,
  targetDaysElapsed: number = 0,
  ivOffsetPercent: number = 0,
  r: number = 0.065
): StrategyPayoff {
  if (legs.length === 0) {
    return {
      maxProfit: 0,
      maxLoss: 0,
      riskReward: '1:1',
      lowerBreakeven: null,
      upperBreakeven: null,
      netCreditDebit: 0,
      marginRequired: 0,
      hedgeBenefit: 0,
      points: [],
      portfolioGreeks: {
        delta: 0,
        gamma: 0,
        theta: 0,
        vega: 0,
        deltaRupees: 0,
        thetaRupees: 0,
        vegaRupees: 0,
      },
    };
  }

  // Calculate Net Premium (Credit or Debit)
  let netPremium = 0;
  for (const leg of legs) {
    const cost = leg.entryPrice * leg.quantity;
    if (leg.action === 'BUY') {
      netPremium -= cost; // Debit
    } else {
      netPremium += cost; // Credit
    }
  }

  // Determine spot price range for chart
  const strikes = legs.map((l) => l.strike);
  const minStrike = Math.min(...strikes, spotPrice);
  const maxStrike = Math.max(...strikes, spotPrice);
  const span = Math.max(spotPrice * 0.05, maxStrike - minStrike + spotPrice * 0.04);
  const startSpot = Math.floor((spotPrice - span) / 50) * 50;
  const endSpot = Math.ceil((spotPrice + span) / 50) * 50;
  const numSteps = 80;
  const stepSize = (endSpot - startSpot) / numSteps;

  const points: { spot: number; pnlExpiry: number; pnlTarget: number }[] = [];
  const remainingDaysTarget = Math.max(0.001, expiryDays - targetDaysElapsed);
  const targetT = remainingDaysTarget / 365.0;

  for (let i = 0; i <= numSteps; i++) {
    const s = Math.round(startSpot + i * stepSize);

    // 1. Payoff at Expiry
    let pnlExp = 0;
    // 2. Payoff at Target Date (T+0 or simulated date)
    let pnlTgt = 0;

    for (const leg of legs) {
      // Expiry intrinsic value
      let intrinsic = 0;
      if (leg.type === 'CE') {
        intrinsic = Math.max(0, s - leg.strike);
      } else {
        intrinsic = Math.max(0, leg.strike - s);
      }

      const mult = leg.action === 'BUY' ? 1 : -1;
      pnlExp += mult * (intrinsic - leg.entryPrice) * leg.quantity;

      // Target date theoretical price
      const adjustedIV = Math.max(0.02, (leg.greeks.iv + ivOffsetPercent) / 100.0);
      const theoreticalPrice = blackScholesPrice(s, leg.strike, targetT, r, adjustedIV, leg.type);
      pnlTgt += mult * (theoreticalPrice - leg.entryPrice) * leg.quantity;
    }

    points.push({
      spot: s,
      pnlExpiry: Math.round(pnlExp),
      pnlTarget: Math.round(pnlTgt),
    });
  }

  // Identify Breakevens
  const breakevens: number[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i];
    const p2 = points[i + 1];
    if ((p1.pnlExpiry <= 0 && p2.pnlExpiry >= 0) || (p1.pnlExpiry >= 0 && p2.pnlExpiry <= 0)) {
      // Linear interpolation for exact zero point
      const denom = p2.pnlExpiry - p1.pnlExpiry;
      const be = denom !== 0 ? p1.spot + (-p1.pnlExpiry / denom) * (p2.spot - p1.spot) : p1.spot;
      breakevens.push(Math.round(be));
    }
  }

  // Max Profit & Loss
  const pnlValues = points.map((p) => p.pnlExpiry);
  let minPnl = Math.min(...pnlValues);
  let maxPnl = Math.max(...pnlValues);

  // Check asymptotic tails for unlimited risk/reward
  const firstPnl = points[0].pnlExpiry;
  const secondPnl = points[1].pnlExpiry;
  const lastPnl = points[points.length - 1].pnlExpiry;
  const prevLastPnl = points[points.length - 2].pnlExpiry;

  const leftSlope = secondPnl - firstPnl;
  const rightSlope = lastPnl - prevLastPnl;

  const isLeftUnlimitedLoss = leftSlope > 20; // moving left lowers pnl
  const isRightUnlimitedLoss = rightSlope > 20; // moving right lowers pnl
  const isLeftUnlimitedProfit = leftSlope < -20;
  const isRightUnlimitedProfit = rightSlope > 20;

  const maxProfitResult: number | 'Unlimited' =
    isRightUnlimitedProfit || isLeftUnlimitedProfit ? 'Unlimited' : Math.round(maxPnl);
  const maxLossResult: number | 'Unlimited' =
    isLeftUnlimitedLoss || isRightUnlimitedLoss ? 'Unlimited' : Math.round(Math.abs(minPnl));

  let riskReward = 'Defined';
  if (typeof maxProfitResult === 'number' && typeof maxLossResult === 'number') {
    if (maxLossResult > 0) {
      riskReward = `1 : ${(maxProfitResult / maxLossResult).toFixed(2)}`;
    }
  } else if (maxLossResult === 'Unlimited') {
    riskReward = 'Undefined (High Risk)';
  } else if (maxProfitResult === 'Unlimited') {
    riskReward = 'Unlimited Upside';
  }

  // Aggregate Portfolio Greeks
  let totalDelta = 0;
  let totalGamma = 0;
  let totalTheta = 0;
  let totalVega = 0;

  for (const leg of legs) {
    const mult = leg.action === 'BUY' ? 1 : -1;
    totalDelta += mult * leg.greeks.delta * leg.quantity;
    totalGamma += mult * leg.greeks.gamma * leg.quantity;
    totalTheta += mult * leg.greeks.theta * leg.quantity;
    totalVega += mult * leg.greeks.vega * leg.quantity;
  }

  // Margin calculation
  const marginDetails = calculateMarginRequirement(
    legs.map((l) => ({
      action: l.action,
      type: l.type,
      strike: l.strike,
      quantity: l.quantity,
      ltp: l.entryPrice,
    })),
    spotPrice
  );

  return {
    maxProfit: maxProfitResult,
    maxLoss: maxLossResult,
    riskReward,
    lowerBreakeven: breakevens.length > 0 ? breakevens[0] : null,
    upperBreakeven: breakevens.length > 1 ? breakevens[breakevens.length - 1] : null,
    netCreditDebit: Math.round(netPremium),
    marginRequired: marginDetails.requiredMargin,
    hedgeBenefit: marginDetails.hedgeBenefit,
    points,
    portfolioGreeks: {
      delta: Number(totalDelta.toFixed(3)),
      gamma: Number(totalGamma.toFixed(4)),
      theta: Number(totalTheta.toFixed(1)),
      vega: Number(totalVega.toFixed(1)),
      deltaRupees: Math.round(totalDelta),
      thetaRupees: Math.round(totalTheta),
      vegaRupees: Math.round(totalVega),
    },
  };
}
