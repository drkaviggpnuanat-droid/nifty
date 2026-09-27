import React, { useState, useMemo } from 'react';
import { ActionType, IndexInfo, OptionType, StrategyLeg, StrategyPayoff } from '../types/options';
import { STRATEGY_PRESETS, calculateStrategyPayoff } from '../utils/strategyEngine';
import { getDaysToExpiry } from '../utils/marketData';
import { StrategyPayoffChart } from './StrategyPayoffChart';
import { Plus, Trash2, Zap, ArrowRight, ShieldCheck, RefreshCw, SlidersHorizontal, Sparkles } from 'lucide-react';

interface StrategyBuilderProps {
  index: IndexInfo;
  legs: StrategyLeg[];
  setLegs: React.Dispatch<React.SetStateAction<StrategyLeg[]>>;
  onDeployStrategy: (legs: StrategyLeg[]) => void;
  availableCapital: number;
}

export const StrategyBuilder: React.FC<StrategyBuilderProps> = ({
  index,
  legs,
  setLegs,
  onDeployStrategy,
  availableCapital,
}) => {
  const [selectedPresetKey, setSelectedPresetKey] = useState<string>('iron_condor');
  const [targetDaysElapsed, setTargetDaysElapsed] = useState<number>(0);
  const [ivOffset, setIvOffset] = useState<number>(0);

  const daysToExpiry = getDaysToExpiry(index.selectedExpiry);

  // Calculate payoff and Greeks
  const payoff: StrategyPayoff = useMemo(() => {
    return calculateStrategyPayoff(
      legs,
      index.spotPrice,
      daysToExpiry,
      targetDaysElapsed,
      ivOffset
    );
  }, [legs, index.spotPrice, daysToExpiry, targetDaysElapsed, ivOffset]);

  // Load a strategy preset
  const handleLoadPreset = (presetKey: string) => {
    setSelectedPresetKey(presetKey);
    const preset = STRATEGY_PRESETS[presetKey];
    if (!preset) return;

    const baseLegs = preset.createLegs(index);
    const newLegs: StrategyLeg[] = baseLegs.map((l, idx) => {
      // Find approximate entry price from Black-Scholes
      const T = Math.max(0.002, daysToExpiry / 365.0);
      const iv = index.indiaVix / 100.0;
      const price = l.type === 'CE'
        ? Math.max(10, (index.spotPrice - l.strike) * 0.7 + 120)
        : Math.max(10, (l.strike - index.spotPrice) * 0.7 + 120);

      return {
        ...l,
        id: `leg-${Date.now()}-${idx}`,
        entryPrice: Number(price.toFixed(2)),
        currentPrice: Number(price.toFixed(2)),
        greeks: {
          delta: l.type === 'CE' ? 0.45 : -0.45,
          gamma: 0.0004,
          theta: -8.5,
          vega: 14.2,
          rho: 1.1,
          iv: index.indiaVix,
        },
      };
    });

    setLegs(newLegs);
    setTargetDaysElapsed(0);
    setIvOffset(0);
  };

  // Add a blank custom leg
  const handleAddLeg = () => {
    const newLeg: StrategyLeg = {
      id: `leg-${Date.now()}-${Math.random()}`,
      index: index.symbol,
      expiry: index.selectedExpiry,
      strike: index.atmStrike,
      type: 'CE',
      action: 'BUY',
      lots: 1,
      quantity: index.lotSize,
      entryPrice: 150.0,
      currentPrice: 150.0,
      greeks: {
        delta: 0.5,
        gamma: 0.0005,
        theta: -12.0,
        vega: 16.0,
        rho: 1.2,
        iv: index.indiaVix,
      },
    };
    setLegs([...legs, newLeg]);
  };

  const handleRemoveLeg = (id: string) => {
    setLegs(legs.filter((l) => l.id !== id));
  };

  const handleUpdateLeg = (id: string, updates: Partial<StrategyLeg>) => {
    setLegs(
      legs.map((l) => {
        if (l.id !== id) return l;
        const updated = { ...l, ...updates };
        if (updates.lots) {
          updated.quantity = updates.lots * index.lotSize;
        }
        return updated;
      })
    );
  };

  const hasLegs = legs.length > 0;
  const hasSufficientMargin = availableCapital >= payoff.marginRequired;

  return (
    <div className="space-y-4">
      {/* Top Presets Row */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-3">
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="text-xs font-semibold text-slate-300">
            Strategy Presets for {index.name}
          </span>
          <span className="text-[11px] text-slate-500">
            Click to load pre-calculated multi-leg structure
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {Object.entries(STRATEGY_PRESETS).map(([key, preset]) => {
            const isSelected = selectedPresetKey === key && hasLegs;
            return (
              <button
                key={key}
                onClick={() => handleLoadPreset(key)}
                className={`px-3 py-1.5 rounded text-xs font-medium transition-colors border ${
                  isSelected
                    ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 font-semibold shadow-xs'
                    : 'bg-slate-950 border-slate-800 text-slate-300 hover:text-white hover:border-slate-700'
                }`}
              >
                {preset.name}
              </button>
            );
          })}
          <button
            onClick={handleAddLeg}
            className="px-3 py-1.5 rounded text-xs font-medium bg-slate-950 border border-slate-700 text-slate-300 hover:text-white hover:border-emerald-500/50 flex items-center gap-1 transition-colors"
          >
            <Plus size={13} />
            + Custom Leg
          </button>
        </div>
      </div>

      {/* Main Grid: Payoff Visualizer & Strategy Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Payoff Chart & What-if controls (Col 8) */}
        <div className="lg:col-span-8 space-y-3">
          {/* Payoff SVG Chart */}
          <StrategyPayoffChart payoff={payoff} currentSpot={index.spotPrice} />

          {/* What-if Interactive Sliders */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-3.5 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            {/* Target Date Simulator */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-slate-400 font-medium">
                  Simulate Days Elapsed (Theta Decay)
                </span>
                <span className="font-mono tabular-nums font-semibold text-cyan-300">
                  Day {targetDaysElapsed} of {daysToExpiry} (T+{targetDaysElapsed})
                </span>
              </div>
              <input
                type="range"
                min="0"
                max={daysToExpiry}
                step="1"
                value={targetDaysElapsed}
                onChange={(e) => setTargetDaysElapsed(parseInt(e.target.value))}
                className="w-full accent-cyan-400 h-1.5 bg-slate-950 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 mt-1 font-mono">
                <span>Today (T+0)</span>
                <span>Expiry Day</span>
              </div>
            </div>

            {/* IV Shock Simulator */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-slate-400 font-medium">
                  Implied Volatility (Vega Shock)
                </span>
                <span className="font-mono tabular-nums font-semibold text-amber-300">
                  {ivOffset >= 0 ? '+' : ''}{ivOffset}% IV
                </span>
              </div>
              <input
                type="range"
                min="-10"
                max="10"
                step="0.5"
                value={ivOffset}
                onChange={(e) => setIvOffset(parseFloat(e.target.value))}
                className="w-full accent-amber-400 h-1.5 bg-slate-950 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 mt-1 font-mono">
                <span>-10% Crush</span>
                <span>Base ({index.indiaVix}%)</span>
                <span>+10% Spike</span>
              </div>
            </div>
          </div>
        </div>

        {/* Strategy Analytics & Deploy (Col 4) */}
        <div className="lg:col-span-4 space-y-3">
          {/* Key Numbers Card */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs font-semibold text-slate-300">
                Strategy Outcome Analysis
              </span>
              <span className="text-[11px] font-mono text-slate-400">
                RR: {payoff.riskReward}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-2.5 rounded bg-slate-950/60 border border-slate-800/80">
                <span className="text-[10px] text-slate-400 block">Max Profit</span>
                <span className="text-sm font-mono tabular-nums font-bold text-emerald-400">
                  {typeof payoff.maxProfit === 'number'
                    ? `+₹${payoff.maxProfit.toLocaleString('en-IN')}`
                    : payoff.maxProfit}
                </span>
              </div>

              <div className="p-2.5 rounded bg-slate-950/60 border border-slate-800/80">
                <span className="text-[10px] text-slate-400 block">Max Loss</span>
                <span className="text-sm font-mono tabular-nums font-bold text-rose-400">
                  {typeof payoff.maxLoss === 'number'
                    ? `-₹${payoff.maxLoss.toLocaleString('en-IN')}`
                    : payoff.maxLoss}
                </span>
              </div>

              <div className="p-2.5 rounded bg-slate-950/60 border border-slate-800/80">
                <span className="text-[10px] text-slate-400 block">Lower Breakeven</span>
                <span className="text-xs font-mono tabular-nums font-semibold text-slate-200">
                  {payoff.lowerBreakeven ? payoff.lowerBreakeven : 'None'}
                </span>
              </div>

              <div className="p-2.5 rounded bg-slate-950/60 border border-slate-800/80">
                <span className="text-[10px] text-slate-400 block">Upper Breakeven</span>
                <span className="text-xs font-mono tabular-nums font-semibold text-slate-200">
                  {payoff.upperBreakeven ? payoff.upperBreakeven : 'None'}
                </span>
              </div>
            </div>

            {/* Net Premium */}
            <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-800">
              <span className="text-slate-400">Net Premium Flow</span>
              <span
                className={`font-mono tabular-nums font-bold ${
                  payoff.netCreditDebit >= 0 ? 'text-emerald-400' : 'text-blue-400'
                }`}
              >
                {payoff.netCreditDebit >= 0
                  ? `Net Credit +₹${payoff.netCreditDebit.toLocaleString('en-IN')}`
                  : `Net Debit -₹${Math.abs(payoff.netCreditDebit).toLocaleString('en-IN')}`}
              </span>
            </div>

            {/* SPAN Margin Required & Hedge Benefit */}
            <div className="bg-slate-950/70 border border-slate-800 rounded p-3 text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Required SPAN Margin</span>
                <span className="font-mono tabular-nums font-bold text-slate-100">
                  ₹{payoff.marginRequired.toLocaleString('en-IN')}
                </span>
              </div>
              {payoff.hedgeBenefit > 0 && (
                <div className="flex items-center justify-between text-emerald-400 text-[11px]">
                  <span>Hedge Margin Relief Saved</span>
                  <span className="font-mono tabular-nums font-semibold">
                    -₹{payoff.hedgeBenefit.toLocaleString('en-IN')}
                  </span>
                </div>
              )}
            </div>

            {/* Deploy 1-Click to Virtual Account */}
            <button
              onClick={() => onDeployStrategy(legs)}
              disabled={!hasLegs || !hasSufficientMargin}
              className={`w-full py-2.5 px-4 rounded-lg text-xs font-bold text-white transition-all flex items-center justify-center gap-2 shadow-md ${
                !hasLegs || !hasSufficientMargin
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  : 'bg-emerald-600 hover:bg-emerald-500'
              }`}
            >
              <Zap size={14} />
              Execute Strategy in Virtual Account
            </button>
          </div>

          {/* Aggregated Portfolio Greeks */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-3 text-xs space-y-2">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Aggregated Strategy Greeks
            </span>
            <div className="grid grid-cols-2 gap-2 text-[11px] font-mono tabular-nums">
              <div className="p-2 rounded bg-slate-950 border border-slate-800/80">
                <span className="text-slate-500 block text-[10px]">Net Delta (Δ)</span>
                <span className={`font-bold ${payoff.portfolioGreeks.delta >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {payoff.portfolioGreeks.delta}
                </span>
                <span className="text-[10px] text-slate-500 block font-sans">
                  {payoff.portfolioGreeks.deltaRupees >= 0 ? '+' : ''}₹{payoff.portfolioGreeks.deltaRupees} / pt
                </span>
              </div>

              <div className="p-2 rounded bg-slate-950 border border-slate-800/80">
                <span className="text-slate-500 block text-[10px]">Net Theta (θ)</span>
                <span className={`font-bold ${payoff.portfolioGreeks.theta >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {payoff.portfolioGreeks.theta}
                </span>
                <span className="text-[10px] text-slate-500 block font-sans">
                  {payoff.portfolioGreeks.thetaRupees >= 0 ? '+' : ''}₹{payoff.portfolioGreeks.thetaRupees} / day
                </span>
              </div>

              <div className="p-2 rounded bg-slate-950 border border-slate-800/80">
                <span className="text-slate-500 block text-[10px]">Net Vega (ν)</span>
                <span className="font-bold text-cyan-300">
                  {payoff.portfolioGreeks.vega}
                </span>
                <span className="text-[10px] text-slate-500 block font-sans">
                  {payoff.portfolioGreeks.vegaRupees >= 0 ? '+' : ''}₹{payoff.portfolioGreeks.vegaRupees} / % IV
                </span>
              </div>

              <div className="p-2 rounded bg-slate-950 border border-slate-800/80">
                <span className="text-slate-500 block text-[10px]">Net Gamma (Γ)</span>
                <span className="font-bold text-slate-300">
                  {payoff.portfolioGreeks.gamma}
                </span>
                <span className="text-[10px] text-slate-500 block font-sans">Curvature</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Multi-Leg Configuration Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-lg overflow-hidden">
        <div className="p-3 border-b border-slate-800 flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-200">
            Configured Strategy Legs ({legs.length} legs)
          </span>
          <button
            onClick={handleAddLeg}
            className="px-2.5 py-1 rounded text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center gap-1 transition-colors"
          >
            <Plus size={12} /> Add Leg
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-[10px] uppercase font-semibold text-slate-400 bg-slate-950/60">
                <th className="py-2 px-3 text-left">Action</th>
                <th className="py-2 px-3 text-left">Type</th>
                <th className="py-2 px-3 text-left font-mono">Strike</th>
                <th className="py-2 px-3 text-left">Expiry</th>
                <th className="py-2 px-3 text-left font-mono">Lots (Qty)</th>
                <th className="py-2 px-3 text-right font-mono">Entry Price (₹)</th>
                <th className="py-2 px-3 text-right font-mono">Delta</th>
                <th className="py-2 px-3 text-right font-mono">Theta</th>
                <th className="py-2 px-3 text-center">Delete</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-[11px] tabular-nums">
              {legs.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-6 text-center text-slate-500 italic">
                    No active legs. Select a preset strategy above or add custom option legs.
                  </td>
                </tr>
              ) : (
                legs.map((leg) => (
                  <tr key={leg.id} className="hover:bg-slate-800/30 transition-colors">
                    {/* Action Buy / Sell toggle */}
                    <td className="py-2 px-3">
                      <select
                        value={leg.action}
                        onChange={(e) => handleUpdateLeg(leg.id, { action: e.target.value as ActionType })}
                        className={`font-semibold rounded px-1.5 py-0.5 text-[11px] focus:outline-none cursor-pointer ${
                          leg.action === 'BUY'
                            ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                            : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        }`}
                      >
                        <option value="BUY" className="bg-slate-900 text-blue-300">BUY</option>
                        <option value="SELL" className="bg-slate-900 text-rose-300">SELL</option>
                      </select>
                    </td>

                    {/* CE / PE */}
                    <td className="py-2 px-3">
                      <select
                        value={leg.type}
                        onChange={(e) => handleUpdateLeg(leg.id, { type: e.target.value as OptionType })}
                        className="bg-slate-950 border border-slate-700 rounded px-1.5 py-0.5 text-[11px] text-slate-200 focus:outline-none"
                      >
                        <option value="CE" className="bg-slate-900 text-slate-200">CE (Call)</option>
                        <option value="PE" className="bg-slate-900 text-slate-200">PE (Put)</option>
                      </select>
                    </td>

                    {/* Strike */}
                    <td className="py-2 px-3">
                      <input
                        type="number"
                        step={index.strikeStep}
                        value={leg.strike}
                        onChange={(e) => handleUpdateLeg(leg.id, { strike: parseInt(e.target.value) || index.atmStrike })}
                        className="w-24 bg-slate-950 border border-slate-700 rounded px-2 py-0.5 text-[11px] text-white focus:outline-none"
                      />
                    </td>

                    {/* Expiry */}
                    <td className="py-2 px-3 font-sans text-slate-300 text-[11px]">
                      {leg.expiry}
                    </td>

                    {/* Lots & Quantity */}
                    <td className="py-2 px-3">
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          min="1"
                          max="50"
                          value={leg.lots}
                          onChange={(e) => handleUpdateLeg(leg.id, { lots: Math.max(1, parseInt(e.target.value) || 1) })}
                          className="w-12 bg-slate-950 border border-slate-700 rounded px-1 py-0.5 text-center text-[11px] text-white focus:outline-none"
                        />
                        <span className="text-slate-500 font-sans text-[10px]">
                          ({leg.quantity})
                        </span>
                      </div>
                    </td>

                    {/* Entry Price */}
                    <td className="py-2 px-3 text-right">
                      <input
                        type="number"
                        step="0.1"
                        value={leg.entryPrice}
                        onChange={(e) => handleUpdateLeg(leg.id, { entryPrice: parseFloat(e.target.value) || 0 })}
                        className="w-20 bg-slate-950 border border-slate-700 rounded px-2 py-0.5 text-right text-[11px] text-white focus:outline-none"
                      />
                    </td>

                    {/* Greeks */}
                    <td className="py-2 px-3 text-right text-slate-400">
                      {leg.greeks.delta.toFixed(2)}
                    </td>
                    <td className="py-2 px-3 text-right text-rose-300/80">
                      {leg.greeks.theta.toFixed(1)}
                    </td>

                    {/* Remove */}
                    <td className="py-2 px-3 text-center">
                      <button
                        onClick={() => handleRemoveLeg(leg.id)}
                        className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
