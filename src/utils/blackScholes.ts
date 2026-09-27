import { Greeks, OptionType } from '../types/options';

// High-precision cumulative normal distribution approximation (Abramowitz & Stegun 26.2.17)
export function cdfNormal(x: number): number {
  const b1 = 0.319381530;
  const b2 = -0.356563782;
  const b3 = 1.781477937;
  const b4 = -1.821255978;
  const b5 = 1.330274429;
  const p = 0.2316419;
  const c = 0.3989422804014327; // 1 / sqrt(2 * PI)

  if (x >= 0.0) {
    const t = 1.0 / (1.0 + p * x);
    return 1.0 - c * Math.exp(-x * x / 2.0) * t * (t * (t * (t * (t * b5 + b4) + b3) + b2) + b1);
  } else {
    const t = 1.0 / (1.0 - p * x);
    return c * Math.exp(-x * x / 2.0) * t * (t * (t * (t * (t * b5 + b4) + b3) + b2) + b1);
  }
}

// Probability density function of standard normal distribution
export function pdfNormal(x: number): number {
  return (1.0 / Math.sqrt(2.0 * Math.PI)) * Math.exp(-0.5 * x * x);
}

/**
 * Calculates option theoretical price via Black-Scholes formula
 * @param S Current Spot Price of the Underlying
 * @param K Strike Price of Option
 * @param T Time to expiration in years (e.g. days / 365)
 * @param r Risk-free interest rate (e.g. 0.065 for RBI 6.5% repo rate)
 * @param sigma Volatility as decimal (e.g. 0.15 for 15%)
 * @param type 'CE' | 'PE'
 */
export function blackScholesPrice(
  S: number,
  K: number,
  T: number,
  r: number = 0.065,
  sigma: number,
  type: OptionType
): number {
  if (T <= 0.0001) {
    // At expiration: intrinsic value
    if (type === 'CE') return Math.max(0, S - K);
    return Math.max(0, K - S);
  }

  const vol = Math.max(0.001, sigma);
  const sqrtT = Math.sqrt(T);
  const d1 = (Math.log(S / K) + (r + 0.5 * vol * vol) * T) / (vol * sqrtT);
  const d2 = d1 - vol * sqrtT;

  if (type === 'CE') {
    const price = S * cdfNormal(d1) - K * Math.exp(-r * T) * cdfNormal(d2);
    return Math.max(0.05, price);
  } else {
    const price = K * Math.exp(-r * T) * cdfNormal(-d2) - S * cdfNormal(-d1);
    return Math.max(0.05, price);
  }
}

/**
 * Computes option Greeks: Delta, Gamma, Theta, Vega, Rho
 */
export function calculateGreeks(
  S: number,
  K: number,
  T: number,
  r: number = 0.065,
  sigma: number,
  type: OptionType
): Greeks {
  const ivPercent = Number((sigma * 100).toFixed(2));

  if (T <= 0.0001) {
    const isCall = type === 'CE';
    const delta = isCall ? (S >= K ? 1 : 0) : (S <= K ? -1 : 0);
    return {
      delta,
      gamma: 0,
      theta: 0,
      vega: 0,
      rho: 0,
      iv: ivPercent,
    };
  }

  const vol = Math.max(0.001, sigma);
  const sqrtT = Math.sqrt(T);
  const d1 = (Math.log(S / K) + (r + 0.5 * vol * vol) * T) / (vol * sqrtT);
  const d2 = d1 - vol * sqrtT;

  const nd1 = pdfNormal(d1);
  const expRT = Math.exp(-r * T);

  // Delta
  const delta = type === 'CE' ? cdfNormal(d1) : cdfNormal(d1) - 1.0;

  // Gamma (per point index change)
  const gamma = nd1 / (S * vol * sqrtT);

  // Theta (converted to 1-calendar day theta)
  let thetaAnnual: number;
  if (type === 'CE') {
    thetaAnnual = - (S * vol * nd1) / (2 * sqrtT) - r * K * expRT * cdfNormal(d2);
  } else {
    thetaAnnual = - (S * vol * nd1) / (2 * sqrtT) + r * K * expRT * cdfNormal(-d2);
  }
  const theta = thetaAnnual / 365.0;

  // Vega: ₹ / point change per 1% change in IV
  const vega = (S * sqrtT * nd1) / 100.0;

  // Rho: ₹ / point change per 1% change in interest rate
  const rho = type === 'CE'
    ? (K * T * expRT * cdfNormal(d2)) / 100.0
    : (-K * T * expRT * cdfNormal(-d2)) / 100.0;

  return {
    delta: Number(delta.toFixed(4)),
    gamma: Number(gamma.toFixed(5)),
    theta: Number(theta.toFixed(2)),
    vega: Number(vega.toFixed(2)),
    rho: Number(rho.toFixed(2)),
    iv: ivPercent,
  };
}

/**
 * Solves for Implied Volatility (IV) using Newton-Raphson iteration
 */
export function calculateIV(
  marketPrice: number,
  S: number,
  K: number,
  T: number,
  r: number = 0.065,
  type: OptionType
): number {
  if (T <= 0.0001 || marketPrice <= 0.05) return 0.15; // default fallback

  const intrinsic = type === 'CE' ? Math.max(0, S - K) : Math.max(0, K - S);
  if (marketPrice < intrinsic) return 0.10;

  let sigma = 0.18; // Initial guess 18%
  const maxIterations = 30;
  const tolerance = 1e-4;

  for (let i = 0; i < maxIterations; i++) {
    const price = blackScholesPrice(S, K, T, r, sigma, type);
    const diff = price - marketPrice;

    if (Math.abs(diff) < tolerance) {
      return Math.min(2.5, Math.max(0.02, sigma));
    }

    const sqrtT = Math.sqrt(T);
    const d1 = (Math.log(S / K) + (r + 0.5 * sigma * sigma) * T) / (sigma * sqrtT);
    const vegaRaw = S * sqrtT * pdfNormal(d1);

    if (vegaRaw < 1e-7) break;

    sigma = sigma - diff / vegaRaw;
    if (sigma <= 0.001) sigma = 0.005;
  }

  // Fallback to bisection if Newton-Raphson diverges
  let low = 0.01;
  let high = 3.0;
  for (let i = 0; i < 20; i++) {
    const mid = (low + high) / 2;
    const pMid = blackScholesPrice(S, K, T, r, mid, type);
    if (Math.abs(pMid - marketPrice) < 0.05) return mid;
    if (pMid > marketPrice) {
      high = mid;
    } else {
      low = mid;
    }
  }

  return (low + high) / 2;
}
