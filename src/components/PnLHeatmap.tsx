import React, { useState, useMemo } from 'react';
import { IndexInfo, Position } from '../types/options';
import { blackScholesPrice } from '../utils/blackScholes';
import { getDaysToExpiry } from '../utils/marketData';
import { Flame, Info, Eye, Sliders, Calendar, ArrowRight, ShieldCheck, Sparkles, TrendingUp, TrendingDown } from 'lucide-react';

interface PnLHeatmapProps {
  positions: Position[];
  index: IndexInfo;
  vix: number;
  onAddSamplePositions?: () => void;
}

export const PnLHeatmap: React.FC<PnLHeatmapProps> = ({
  positions,
  index,
  vix,
  onAddSamplePositions,
}) => {
  const [viewMode, setViewMode] = useState<'matrix' | 'positions'>('matrix');
  const [timeHorizon, setTimeHorizon] = useState<'T0' | 'T2' | 'EXPIRY'>('T0');
  const [hoveredCell, setHoveredCell] = useState<{
    strike: number;
    ivShift: number;
    pnl: number;
    pnlPercent?: number;
    spotChangePct?: number;
  } | null>(null);

  const daysToExpiry = getDaysToExpiry(index.selectedExpiry);
  const currentSpot = index.spotPrice;
  const step = index.strikeStep;
  const atm = index.atmStrike;

  // Volatility shift scenarios (-6% to +6% IV)
  const volShifts = useMemo(() => [-6, -4, -2, 0, 2, 4, 6], []);

  // Strike scenarios centered around current ATM
  const strikeRange = useMemo(() => {
    // Pick 9 strikes: -4 steps to +4 steps
    const strikes: number[] = [];
    for (let i = -4; i <= 4; i++) {
      strikes.push(atm + i * step);
    }
    return strikes;
  }, [atm, step]);

  // Days elapsed based on time horizon
  const daysElapsed = useMemo(() => {
    if (timeHorizon === 'EXPIRY') return daysToExpiry;
    if (timeHorizon === 'T2') return Math.min(daysToExpiry, 2);
    return 0; // T0
  }, [timeHorizon, daysToExpiry]);

  // Calculate simulated P&L for a given Spot Price and Volatility Shift
  const calculateScenarioPnL = (scenarioSpot: number, ivShiftPct: number) => {
    if (positions.length === 0) return 0;

    const remainingDays = Math.max(0.0001, daysToExpiry - daysElapsed);
    const T = remainingDays / 365.0;
    const r = 0.065; // Repo rate

    let totalPnL = 0;

    for (const pos of positions) {
      const baseIV = (pos.greeks?.iv || vix) / 100.0;
      const effectiveIV = Math.max(0.02, baseIV + ivShiftPct / 100.0);

      let simPrice = 0;
      if (T <= 0.0005) {
        // Expiry intrinsic
        if (pos.type === 'CE') {
          simPrice = Math.max(0, scenarioSpot - pos.strike);
        } else {
          simPrice = Math.max(0, pos.strike - scenarioSpot);
        }
      } else {
        simPrice = blackScholesPrice(scenarioSpot, pos.strike, T, r, effectiveIV, pos.type);
      }

      const mult = pos.action === 'BUY' ? 1 : -1;
      const pnl = (simPrice - pos.avgPrice) * pos.quantity * mult;
      totalPnL += pnl;
    }

    return Math.round(totalPnL);
  };

  // Matrix Grid Data (Strikes × Volatility)
  const matrixData = useMemo(() => {
    return strikeRange.map((strike) => {
      const row = volShifts.map((volShift) => {
        const pnl = calculateScenarioPnL(strike, volShift);
        return {
          strike,
          volShift,
          pnl,
        };
      });
      return { strike, scenarios: row };
    });
  }, [strikeRange, volShifts, positions, daysElapsed, vix]);

  // Find max absolute PnL to normalize color intensity
  const maxAbsPnL = useMemo(() => {
    let maxVal = 1000;
    matrixData.forEach((row) => {
      row.scenarios.forEach((sc) => {
        const absVal = Math.abs(sc.pnl);
        if (absVal > maxVal) maxVal = absVal;
      });
    });
    return maxVal;
  }, [matrixData]);

  // Color generator for Heatmap cell
  const getCellStyles = (pnl: number) => {
    if (Math.abs(pnl) < 25) {
      return {
        backgroundColor: 'rgba(30, 41, 59, 0.5)',
        color: '#94A3B8',
        borderColor: 'rgba(51, 65, 85, 0.4)',
      };
    }

    const ratio = Math.min(1, Math.max(0.12, Math.abs(pnl) / maxAbsPnL));

    if (pnl > 0) {
      const alpha = (ratio * 0.45 + 0.15).toFixed(2);
      const borderAlpha = (ratio * 0.6 + 0.2).toFixed(2);
      return {
        backgroundColor: `rgba(16, 185, 129, ${alpha})`,
        color: ratio > 0.6 ? '#A7F3D0' : '#6EE7B7',
        borderColor: `rgba(16, 185, 129, ${borderAlpha})`,
      };
    } else {
      const alpha = (ratio * 0.48 + 0.15).toFixed(2);
      const borderAlpha = (ratio * 0.6 + 0.2).toFixed(2);
      return {
        backgroundColor: `rgba(244, 63, 94, ${alpha})`,
        color: ratio > 0.6 ? '#FECDD3' : '#FDA4AF',
        borderColor: `rgba(244, 63, 94, ${borderAlpha})`,
      };
    }
  };

  // Position-by-position Heatmap breakdown
  const positionRows = useMemo(() => {
    return positions.map((pos) => {
      const scenarios = volShifts.map((volShift) => {
        const remainingDays = Math.max(0.0001, daysToExpiry - daysElapsed);
        const T = remainingDays / 365.0;
        const r = 0.065;
        const baseIV = (pos.greeks?.iv || vix) / 100.0;
        const effectiveIV = Math.max(0.02, baseIV + volShift / 100.0);

        let simPrice = 0;
        if (T <= 0.0005) {
          if (pos.type === 'CE') {
            simPrice = Math.max(0, currentSpot - pos.strike);
          } else {
            simPrice = Math.max(0, pos.strike - currentSpot);
          }
        } else {
          simPrice = blackScholesPrice(currentSpot, pos.strike, T, r, effectiveIV, pos.type);
        }

        const mult = pos.action === 'BUY' ? 1 : -1;
        const pnl = Math.round((simPrice - pos.avgPrice) * pos.quantity * mult);
        return { volShift, pnl };
      });

      return {
        pos,
        scenarios,
      };
    });
  }, [positions, volShifts, currentSpot, daysToExpiry, daysElapsed, vix]);

  // Overall best and worst scenario in the matrix
  const { bestScenario, worstScenario } = useMemo(() => {
    let best = { strike: atm, volShift: 0, pnl: -Infinity };
    let worst = { strike: atm, volShift: 0, pnl: Infinity };

    matrixData.forEach((row) => {
      row.scenarios.forEach((sc) => {
        if (sc.pnl > best.pnl) best = sc;
        if (sc.pnl < worst.pnl) worst = sc;
      });
    });

    return { bestScenario: best, worstScenario: worst };
  }, [matrixData, atm]);

  if (positions.length === 0) {
    return (
      <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-8 text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-slate-800/80 border border-slate-700 mx-auto flex items-center justify-center text-amber-400">
          <Flame size={24} />
        </div>
        <div className="max-w-md mx-auto space-y-1.5">
          <h3 className="text-sm font-bold text-white">No Open Positions for P&L Heatmap</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            The P&L Heatmap visualizes multi-scenario stress tests across underlying strike moves and volatility spikes/crushes.
          </p>
        </div>
        {onAddSamplePositions && (
          <button
            onClick={onAddSamplePositions}
            className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors shadow-sm inline-flex items-center gap-1.5"
          >
            <Sparkles size={14} />
            Load Sample Iron Condor Positions
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-4 space-y-4 shadow-xl">
      {/* Header & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <Flame size={16} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold text-white tracking-wide">
                P&L Heatmap Matrix: Strike vs. Volatility
              </h3>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">
                {positions.length} Open Leg{positions.length > 1 ? 's' : ''}
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Stress-test portfolio profitability under combined spot price shifts and IV crush/expansion
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* View mode toggle */}
          <div className="flex rounded bg-slate-950 border border-slate-800 p-0.5 text-xs">
            <button
              onClick={() => setViewMode('matrix')}
              className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                viewMode === 'matrix'
                  ? 'bg-slate-800 text-white font-semibold shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Strike × Vol Matrix
            </button>
            <button
              onClick={() => setViewMode('positions')}
              className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                viewMode === 'positions'
                  ? 'bg-slate-800 text-white font-semibold shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Per-Position Strikes
            </button>
          </div>

          {/* Time horizon toggle */}
          <div className="flex rounded bg-slate-950 border border-slate-800 p-0.5 text-xs">
            {(['T0', 'T2', 'EXPIRY'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTimeHorizon(t)}
                className={`px-2 py-1 rounded text-[11px] font-mono transition-colors ${
                  timeHorizon === t
                    ? 'bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {t === 'T0' ? 'Today (T+0)' : t === 'T2' ? 'T+2 Days' : 'Expiry'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Scenario Readout / Hover Inspection Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
        {/* Dynamic Cell Inspector or Active Spot */}
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-2.5 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-400 block font-medium">
              {hoveredCell ? 'Inspected Scenario' : 'Current Spot & Base Volatility'}
            </span>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="font-mono tabular-nums font-bold text-white text-xs">
                {hoveredCell ? `Strike ${hoveredCell.strike}` : `${index.name}: ${currentSpot.toFixed(2)}`}
              </span>
              <span className="text-[10px] font-mono text-amber-300">
                {hoveredCell
                  ? `${hoveredCell.ivShift >= 0 ? '+' : ''}${hoveredCell.ivShift}% IV (${(vix + hoveredCell.ivShift).toFixed(1)}%)`
                  : `VIX: ${vix.toFixed(2)}%`}
              </span>
            </div>
          </div>

          {hoveredCell && (
            <div className="text-right">
              <span className="text-[10px] text-slate-400 block">Scenario P&L</span>
              <span
                className={`text-sm font-mono tabular-nums font-bold ${
                  hoveredCell.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {hoveredCell.pnl >= 0 ? '+' : ''}₹{hoveredCell.pnl.toLocaleString('en-IN')}
              </span>
            </div>
          )}
        </div>

        {/* Best Potential P&L */}
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-2.5 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-400 block font-medium flex items-center gap-1">
              <TrendingUp size={12} className="text-emerald-400" /> Max Scenario Upside
            </span>
            <span className="text-[10px] font-mono text-slate-300 mt-0.5 block">
              At Strike {bestScenario.strike} ({bestScenario.volShift >= 0 ? '+' : ''}{bestScenario.volShift}% IV)
            </span>
          </div>
          <div className="text-right">
            <span className="text-sm font-mono tabular-nums font-bold text-emerald-400">
              +₹{bestScenario.pnl.toLocaleString('en-IN')}
            </span>
          </div>
        </div>

        {/* Max Potential Drawdown */}
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-2.5 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-400 block font-medium flex items-center gap-1">
              <TrendingDown size={12} className="text-rose-400" /> Max Scenario Downside
            </span>
            <span className="text-[10px] font-mono text-slate-300 mt-0.5 block">
              At Strike {worstScenario.strike} ({worstScenario.volShift >= 0 ? '+' : ''}{worstScenario.volShift}% IV)
            </span>
          </div>
          <div className="text-right">
            <span className="text-sm font-mono tabular-nums font-bold text-rose-400">
              {worstScenario.pnl >= 0 ? '+' : ''}₹{worstScenario.pnl.toLocaleString('en-IN')}
            </span>
          </div>
        </div>
      </div>

      {/* Heatmap Grid Section */}
      {viewMode === 'matrix' ? (
        <div className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-950/60 p-2">
          <table className="w-full text-xs border-separate border-spacing-1 font-mono select-none">
            <thead>
              <tr>
                <th className="p-2 text-left font-sans text-[11px] font-semibold text-slate-400 bg-slate-900 rounded">
                  Strike Price
                </th>
                {volShifts.map((vs) => (
                  <th
                    key={vs}
                    className="p-2 text-center text-[10px] font-medium text-slate-300 bg-slate-900 rounded"
                  >
                    <div>{vs >= 0 ? `+${vs}%` : `${vs}%`} IV</div>
                    <div className="text-[9px] text-slate-500 font-normal">
                      {(vix + vs).toFixed(1)}% VIX
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {matrixData.map(({ strike, scenarios }) => {
                const isAtm = strike === atm;
                const distPct = (((strike - currentSpot) / currentSpot) * 100).toFixed(1);

                return (
                  <tr key={strike}>
                    {/* Strike Label Header */}
                    <td
                      className={`p-2 rounded font-bold transition-colors ${
                        isAtm
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : 'bg-slate-900/90 text-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span>{strike}</span>
                        {isAtm ? (
                          <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-500/30 text-emerald-200 font-sans">
                            ATM
                          </span>
                        ) : (
                          <span className="text-[9px] text-slate-400 font-normal">
                            {Number(distPct) >= 0 ? `+${distPct}%` : `${distPct}%`}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Volatility Scenario Cells */}
                    {scenarios.map((sc) => {
                      const style = getCellStyles(sc.pnl);
                      const isHovered =
                        hoveredCell?.strike === sc.strike && hoveredCell?.ivShift === sc.volShift;

                      return (
                        <td
                          key={sc.volShift}
                          onMouseEnter={() =>
                            setHoveredCell({
                              strike: sc.strike,
                              ivShift: sc.volShift,
                              pnl: sc.pnl,
                            })
                          }
                          onMouseLeave={() => setHoveredCell(null)}
                          style={style}
                          className={`p-2.5 text-center rounded border transition-all cursor-pointer font-semibold tabular-nums text-[11px] ${
                            isHovered ? 'ring-2 ring-white scale-105 z-10' : ''
                          }`}
                        >
                          {sc.pnl >= 0 ? '+' : ''}₹{sc.pnl.toLocaleString('en-IN')}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        /* Per-Position Strike Volatility Breakdown */
        <div className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-950/60 p-2">
          <table className="w-full text-xs border-separate border-spacing-1 font-mono select-none">
            <thead>
              <tr>
                <th className="p-2 text-left font-sans text-[11px] font-semibold text-slate-400 bg-slate-900 rounded">
                  Open Position Leg
                </th>
                <th className="p-2 text-right font-sans text-[11px] font-semibold text-slate-400 bg-slate-900 rounded">
                  Current MTM
                </th>
                {volShifts.map((vs) => (
                  <th
                    key={vs}
                    className="p-2 text-center text-[10px] font-medium text-slate-300 bg-slate-900 rounded"
                  >
                    <div>{vs >= 0 ? `+${vs}%` : `${vs}%`} IV</div>
                    <div className="text-[9px] text-slate-500 font-normal">
                      {(vix + vs).toFixed(1)}%
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {positionRows.map(({ pos, scenarios }) => (
                <tr key={pos.id}>
                  {/* Position details */}
                  <td className="p-2 rounded bg-slate-900/90 text-slate-200">
                    <div className="flex items-center gap-1.5 font-bold">
                      <span
                        className={`px-1 py-0.2 rounded text-[10px] ${
                          pos.action === 'BUY'
                            ? 'bg-blue-500/20 text-blue-300'
                            : 'bg-rose-500/20 text-rose-300'
                        }`}
                      >
                        {pos.action}
                      </span>
                      <span>
                        {pos.index} {pos.strike} {pos.type}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 font-sans mt-0.5">
                      {pos.quantity} Qty @ ₹{pos.avgPrice.toFixed(2)} (LTP ₹{pos.ltp.toFixed(2)})
                    </div>
                  </td>

                  {/* Current MTM */}
                  <td className="p-2 rounded bg-slate-900/90 text-right">
                    <span
                      className={`font-bold ${
                        pos.mtm >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {pos.mtm >= 0 ? '+' : ''}₹{pos.mtm.toLocaleString('en-IN', { minimumFractionDigits: 1 })}
                    </span>
                  </td>

                  {/* Scenarios */}
                  {scenarios.map((sc) => {
                    const style = getCellStyles(sc.pnl);
                    return (
                      <td
                        key={sc.volShift}
                        style={style}
                        className="p-2.5 text-center rounded border transition-all tabular-nums font-semibold text-[11px]"
                      >
                        {sc.pnl >= 0 ? '+' : ''}₹{sc.pnl.toLocaleString('en-IN')}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Heatmap Legend */}
      <div className="flex flex-wrap items-center justify-between gap-4 text-xs pt-1 text-slate-400">
        <div className="flex items-center gap-3 text-[11px]">
          <span className="text-slate-400">Color Spectrum:</span>
          <div className="flex items-center gap-1">
            <span className="w-3.5 h-3.5 rounded bg-rose-500/60 border border-rose-500" />
            <span className="text-[10px] text-slate-400">Max Loss</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3.5 h-3.5 rounded bg-rose-500/20 border border-rose-500/40" />
            <span className="text-[10px] text-slate-400">Mild Loss</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3.5 h-3.5 rounded bg-slate-800 border border-slate-700" />
            <span className="text-[10px] text-slate-400">Breakeven (₹0)</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3.5 h-3.5 rounded bg-emerald-500/20 border border-emerald-500/40" />
            <span className="text-[10px] text-slate-400">Mild Gain</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3.5 h-3.5 rounded bg-emerald-500/60 border border-emerald-500" />
            <span className="text-[10px] text-slate-400">Max Gain</span>
          </div>
        </div>

        <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
          <Info size={13} className="text-slate-400" />
          <span>Calculated via institutional Black-Scholes PDE pricing across all open contracts</span>
        </div>
      </div>
    </div>
  );
};
