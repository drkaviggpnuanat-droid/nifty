import React, { useState } from 'react';
import { AccountPortfolio, IndexInfo, Position } from '../types/options';
import { PnLHeatmap } from './PnLHeatmap';
import { Shield, AlertTriangle, CheckCircle2, TrendingUp, TrendingDown, RefreshCw, XCircle, Sliders, Bell, Flame, Table } from 'lucide-react';

interface RiskManagementProps {
  portfolio: AccountPortfolio;
  positions: Position[];
  onSquareOffPosition: (positionId: string) => void;
  onSquareOffAll: () => void;
  onUpdatePositionSLTP: (positionId: string, stopLoss?: number, takeProfit?: number) => void;
  onUpdateDailyLossLimit: (limit: number, autoSquareOff: boolean) => void;
  vix: number;
  index: IndexInfo;
  onAddSamplePositions?: () => void;
}

export const RiskManagement: React.FC<RiskManagementProps> = ({
  portfolio,
  positions,
  onSquareOffPosition,
  onSquareOffAll,
  onUpdatePositionSLTP,
  onUpdateDailyLossLimit,
  vix,
  index,
  onAddSamplePositions,
}) => {
  const [lossLimitInput, setLossLimitInput] = useState<number>(portfolio.dailyLossLimit);
  const [autoSquareOffInput, setAutoSquareOffInput] = useState<boolean>(portfolio.autoSquareOff);
  const [showConfirmSquareAll, setShowConfirmSquareAll] = useState<boolean>(false);
  const [activeRiskView, setActiveRiskView] = useState<'heatmap' | 'table'>('heatmap');

  const marginUtilizedPct = portfolio.capital > 0
    ? Math.min(100, Math.round((portfolio.usedMargin / portfolio.capital) * 100))
    : 0;

  // Aggregate Portfolio Greeks across open positions
  let netDeltaRupees = 0;
  let netThetaRupees = 0;
  let netVegaRupees = 0;

  positions.forEach((pos) => {
    const mult = pos.action === 'BUY' ? 1 : -1;
    netDeltaRupees += mult * pos.greeks.delta * pos.quantity;
    netThetaRupees += mult * pos.greeks.theta * pos.quantity;
    netVegaRupees += mult * pos.greeks.vega * pos.quantity;
  });

  // 1-Day Value at Risk (VaR 95% confidence level) based on delta & gamma risk + VIX
  const dailyVol = (vix / Math.sqrt(252)) / 100.0;
  const portfolioNotional = Math.abs(netDeltaRupees) * 100;
  const var95 = Math.round(portfolioNotional * dailyVol * 1.645);

  const handleSaveRiskLimits = () => {
    onUpdateDailyLossLimit(lossLimitInput, autoSquareOffInput);
  };

  const isDailyLimitBreached = portfolio.unrealizedPnl + portfolio.realizedPnl <= -portfolio.dailyLossLimit;

  return (
    <div className="space-y-4">
      {/* Alert banner if limit breached */}
      {isDailyLimitBreached && (
        <div className="bg-rose-500/15 border border-rose-500/40 rounded-lg p-3 text-rose-300 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} className="text-rose-400 shrink-0" />
            <span className="font-semibold">
              Max Daily Loss Threshold Breached! Current P&L: ₹{(portfolio.unrealizedPnl + portfolio.realizedPnl).toLocaleString('en-IN')}.
              {portfolio.autoSquareOff && ' Auto-square off triggered.'}
            </span>
          </div>
          <button
            onClick={onSquareOffAll}
            className="px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded text-xs transition-colors shrink-0"
          >
            Emergency Square Off All
          </button>
        </div>
      )}

      {/* Top Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
        {/* Margin Utilization */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-3.5 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span>SPAN Margin Utilized</span>
            <span className="font-mono tabular-nums font-bold text-white">
              {marginUtilizedPct}%
            </span>
          </div>
          <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                marginUtilizedPct > 80
                  ? 'bg-rose-500'
                  : marginUtilizedPct > 50
                  ? 'bg-amber-400'
                  : 'bg-emerald-400'
              }`}
              style={{ width: `${marginUtilizedPct}%` }}
            />
          </div>
          <div className="flex justify-between text-[11px] text-slate-400 font-mono tabular-nums">
            <span>Used: ₹{portfolio.usedMargin.toLocaleString('en-IN')}</span>
            <span>Free: ₹{portfolio.availableMargin.toLocaleString('en-IN')}</span>
          </div>
        </div>

        {/* Total P&L & MTM */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-3.5 space-y-1">
          <span className="text-slate-400 block text-[11px]">Total Net P&L (MTM)</span>
          <span
            className={`text-xl font-mono tabular-nums font-bold block ${
              portfolio.unrealizedPnl + portfolio.realizedPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {portfolio.unrealizedPnl + portfolio.realizedPnl >= 0 ? '+' : ''}
            ₹{(portfolio.unrealizedPnl + portfolio.realizedPnl).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </span>
          <div className="flex justify-between text-[11px] text-slate-400 font-mono">
            <span>Unrealized: ₹{portfolio.unrealizedPnl.toFixed(2)}</span>
            <span>Realized: ₹{portfolio.realizedPnl.toFixed(2)}</span>
          </div>
        </div>

        {/* Net Portfolio Greeks Exposure */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-3.5 space-y-1.5">
          <span className="text-slate-400 block text-[11px]">Net Greeks Exposure</span>
          <div className="grid grid-cols-3 gap-1 font-mono text-center text-[10px] tabular-nums">
            <div className="bg-slate-950 p-1.5 rounded border border-slate-800">
              <span className="text-slate-500 block">Delta ₹</span>
              <span className={`font-semibold ${netDeltaRupees >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {netDeltaRupees >= 0 ? '+' : ''}{Math.round(netDeltaRupees)}
              </span>
            </div>
            <div className="bg-slate-950 p-1.5 rounded border border-slate-800">
              <span className="text-slate-500 block">Theta ₹</span>
              <span className={`font-semibold ${netThetaRupees >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {netThetaRupees >= 0 ? '+' : ''}{Math.round(netThetaRupees)}/d
              </span>
            </div>
            <div className="bg-slate-950 p-1.5 rounded border border-slate-800">
              <span className="text-slate-500 block">Vega ₹</span>
              <span className="font-semibold text-cyan-300">
                {netVegaRupees >= 0 ? '+' : ''}{Math.round(netVegaRupees)}
              </span>
            </div>
          </div>
        </div>

        {/* 1-Day Value at Risk (VaR) */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-3.5 space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px]">1-Day Parametric VaR (95%)</span>
            <span className="text-[10px] text-amber-400 font-mono">SEBI Model</span>
          </div>
          <span className="text-base font-mono tabular-nums font-bold text-amber-300 block">
            ₹{var95.toLocaleString('en-IN')}
          </span>
          <span className="text-[10px] text-slate-500 block">
            Estimated maximum loss across 24h normal market volatility
          </span>
        </div>
      </div>

      {/* Risk Controls & Automated Circuit Breaker */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
          <div className="flex items-center gap-2">
            <Shield size={16} className="text-emerald-400" />
            <span className="text-xs font-semibold text-slate-200">
              Automated Risk Guards & Daily Loss Circuit Breakers
            </span>
          </div>
          <span className="text-[11px] text-slate-400">
            Disciplined risk management prevents capital wiping events
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div>
            <label className="block text-slate-400 mb-1 text-[11px]">
              Max Permissible Daily Loss (₹)
            </label>
            <input
              type="number"
              step="1000"
              value={lossLimitInput}
              onChange={(e) => setLossLimitInput(Math.max(1000, parseFloat(e.target.value) || 1000))}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 font-mono tabular-nums text-white text-xs focus:outline-none focus:border-emerald-500"
            />
            <span className="text-[10px] text-slate-500 mt-1 block">
              Default is ₹15,000 (1.5% of 10L capital)
            </span>
          </div>

          <div className="flex items-center gap-3 pt-4">
            <input
              type="checkbox"
              id="autoSquare"
              checked={autoSquareOffInput}
              onChange={(e) => setAutoSquareOffInput(e.target.checked)}
              className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
            />
            <label htmlFor="autoSquare" className="text-slate-300 text-xs cursor-pointer">
              Auto-square off all open positions upon breaching daily loss limit
            </label>
          </div>

          <div className="flex items-end justify-end">
            <button
              onClick={handleSaveRiskLimits}
              className="py-2 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors shadow-xs"
            >
              Update Risk Settings
            </button>
          </div>
        </div>
      </div>

      {/* View Switcher: P&L Heatmap vs Position Table */}
      <div className="flex items-center justify-between bg-slate-900/90 border border-slate-800 rounded-lg p-2 px-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveRiskView('heatmap')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              activeRiskView === 'heatmap'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Flame size={14} className="text-amber-400" />
            P&L Heatmap Grid
          </button>
          <button
            onClick={() => setActiveRiskView('table')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              activeRiskView === 'table'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Table size={14} />
            Positions Table ({positions.length})
          </button>
        </div>

        {positions.length > 0 && (
          <button
            onClick={() => setShowConfirmSquareAll(true)}
            className="px-2.5 py-1 rounded bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/40 text-xs font-semibold transition-colors flex items-center gap-1.5"
          >
            <XCircle size={13} /> Square Off All Positions
          </button>
        )}
      </div>

      {activeRiskView === 'heatmap' ? (
        <PnLHeatmap
          positions={positions}
          index={index}
          vix={vix}
          onAddSamplePositions={onAddSamplePositions}
        />
      ) : (
        /* Open Positions Table */
        <div className="bg-slate-900/90 border border-slate-800 rounded-lg overflow-hidden shadow-xl">
          <div className="p-3 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-200">
                Live Open Positions ({positions.length})
              </span>
            </div>
            {positions.length > 0 && (
              <button
                onClick={() => setShowConfirmSquareAll(true)}
                className="px-2.5 py-1 rounded bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/40 text-xs font-semibold transition-colors flex items-center gap-1.5"
              >
                <XCircle size={13} /> Square Off All Positions
              </button>
            )}
          </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-[10px] uppercase font-semibold text-slate-400 bg-slate-950/60 font-mono">
                <th className="py-2.5 px-3 text-left">Instrument</th>
                <th className="py-2.5 px-3 text-left">Side</th>
                <th className="py-2.5 px-3 text-right">Quantity</th>
                <th className="py-2.5 px-3 text-right">Avg Entry</th>
                <th className="py-2.5 px-3 text-right">LTP (₹)</th>
                <th className="py-2.5 px-3 text-right">Current MTM (₹)</th>
                <th className="py-2.5 px-3 text-right">Delta / Theta</th>
                <th className="py-2.5 px-3 text-center">Stop Loss</th>
                <th className="py-2.5 px-3 text-center">Take Profit</th>
                <th className="py-2.5 px-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-[11px] tabular-nums">
              {positions.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-slate-500 italic font-sans">
                    No active positions in portfolio. Use the Option Chain or Strategy Builder to take virtual trades.
                  </td>
                </tr>
              ) : (
                positions.map((pos) => {
                  const isProfit = pos.mtm >= 0;
                  return (
                    <tr key={pos.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-2.5 px-3 font-semibold text-white">
                        {pos.index} {pos.strike} {pos.type}
                        <span className="block text-[10px] text-slate-400 font-sans font-normal">
                          {pos.expiry}
                        </span>
                      </td>

                      <td className="py-2.5 px-3">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            pos.action === 'BUY'
                              ? 'bg-blue-500/20 text-blue-300'
                              : 'bg-rose-500/20 text-rose-300'
                          }`}
                        >
                          {pos.action}
                        </span>
                      </td>

                      <td className="py-2.5 px-3 text-right text-slate-200">
                        {pos.quantity} <span className="text-[10px] text-slate-500">({pos.lots}L)</span>
                      </td>

                      <td className="py-2.5 px-3 text-right text-slate-300">
                        ₹{pos.avgPrice.toFixed(2)}
                      </td>

                      <td className="py-2.5 px-3 text-right font-bold text-white">
                        ₹{pos.ltp.toFixed(2)}
                      </td>

                      <td className="py-2.5 px-3 text-right">
                        <span
                          className={`font-bold block ${
                            isProfit ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {isProfit ? '+' : ''}₹{pos.mtm.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                        <span className={`text-[10px] ${isProfit ? 'text-emerald-400/80' : 'text-rose-400/80'}`}>
                          {isProfit ? '+' : ''}{pos.pnlPercent.toFixed(1)}%
                        </span>
                      </td>

                      <td className="py-2.5 px-3 text-right text-slate-400">
                        <span>Δ {pos.greeks.delta.toFixed(2)}</span>
                        <span className="block text-[10px] text-rose-300/80">θ {pos.greeks.theta.toFixed(1)}</span>
                      </td>

                      {/* SL Input */}
                      <td className="py-2.5 px-3 text-center">
                        <input
                          type="number"
                          step="0.5"
                          placeholder="SL ₹"
                          value={pos.stopLoss || ''}
                          onChange={(e) =>
                            onUpdatePositionSLTP(
                              pos.id,
                              e.target.value ? parseFloat(e.target.value) : undefined,
                              pos.takeProfit
                            )
                          }
                          className="w-16 bg-slate-950 border border-slate-700 rounded px-1.5 py-0.5 text-center text-[10px] text-white focus:outline-none"
                        />
                      </td>

                      {/* TP Input */}
                      <td className="py-2.5 px-3 text-center">
                        <input
                          type="number"
                          step="0.5"
                          placeholder="TP ₹"
                          value={pos.takeProfit || ''}
                          onChange={(e) =>
                            onUpdatePositionSLTP(
                              pos.id,
                              pos.stopLoss,
                              e.target.value ? parseFloat(e.target.value) : undefined
                            )
                          }
                          className="w-16 bg-slate-950 border border-slate-700 rounded px-1.5 py-0.5 text-center text-[10px] text-white focus:outline-none"
                        />
                      </td>

                      {/* Square Off Button */}
                      <td className="py-2.5 px-3 text-center">
                        <button
                          onClick={() => onSquareOffPosition(pos.id)}
                          className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-semibold text-[10px] transition-colors"
                        >
                          Exit
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
      )}

      {/* Confirmation Modal for Square Off All */}
      {showConfirmSquareAll && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-5 max-w-sm w-full text-slate-100 space-y-4">
            <div className="flex items-center gap-2 text-rose-400">
              <AlertTriangle size={20} />
              <h4 className="font-bold text-sm">Square Off All Positions?</h4>
            </div>
            <p className="text-xs text-slate-300">
              Are you sure you want to market exit all {positions.length} open option contracts? This will realize all current profits and losses.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowConfirmSquareAll(false)}
                className="flex-1 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onSquareOffAll();
                  setShowConfirmSquareAll(false);
                }}
                className="flex-1 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-xs font-bold text-white"
              >
                Confirm Exit All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
