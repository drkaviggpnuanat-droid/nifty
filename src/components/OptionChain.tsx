import React, { useState } from 'react';
import { ActionType, IndexInfo, OptionChainRow, OptionData, OptionType, StrategyLeg } from '../types/options';
import { Plus, Eye, Sliders, ArrowUpDown, Shield, Info } from 'lucide-react';

interface OptionChainProps {
  index: IndexInfo;
  rows: OptionChainRow[];
  onSelectOption: (option: OptionData, action: ActionType) => void;
  onAddLegToStrategy: (leg: Omit<StrategyLeg, 'id' | 'currentPrice' | 'greeks'>) => void;
  selectedExpiry: string;
  onSelectExpiry: (expiry: string) => void;
}

export const OptionChain: React.FC<OptionChainProps> = ({
  index,
  rows,
  onSelectOption,
  onAddLegToStrategy,
  selectedExpiry,
  onSelectExpiry,
}) => {
  const [showGreeks, setShowGreeks] = useState<boolean>(true);
  const [strikeFilter, setStrikeFilter] = useState<'16' | '24' | '32' | 'all'>('24');
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);

  // Find max OI to normalize the OI bar indicators
  const maxCallOI = Math.max(...rows.map((r) => r.ce.oi), 1);
  const maxPutOI = Math.max(...rows.map((r) => r.pe.oi), 1);
  const maxOverallOI = Math.max(maxCallOI, maxPutOI);

  // Filter rows based on count centered around ATM
  const atmIndex = rows.findIndex((r) => r.isAtm);
  let filteredRows = rows;
  if (strikeFilter !== 'all' && atmIndex !== -1) {
    const count = parseInt(strikeFilter);
    const half = Math.floor(count / 2);
    const start = Math.max(0, atmIndex - half);
    const end = Math.min(rows.length, atmIndex + half + 1);
    filteredRows = rows.slice(start, end);
  }

  return (
    <div className="space-y-3">
      {/* Control Bar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-3 flex flex-wrap items-center justify-between gap-4">
        {/* Expiry and Strikes selection */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-medium">Expiry:</span>
            <select
              value={selectedExpiry}
              onChange={(e) => onSelectExpiry(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded px-2.5 py-1 text-xs font-mono text-slate-200 focus:outline-none focus:border-emerald-500"
            >
              {index.expiries.map((exp) => (
                <option key={exp} value={exp}>
                  {exp} {exp === index.expiries[0] ? '(Current)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-medium">Strikes:</span>
            <div className="flex rounded bg-slate-950 border border-slate-800 p-0.5 text-xs">
              {(['16', '24', '32', 'all'] as const).map((opt) => (
                <button
                  key={opt}
                  onClick={() => setStrikeFilter(opt)}
                  className={`px-2 py-0.5 rounded font-mono text-[11px] transition-colors ${
                    strikeFilter === opt
                      ? 'bg-slate-800 text-white font-semibold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {opt === 'all' ? 'All' : `±${parseInt(opt) / 2}`}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Legend & Display Toggles */}
        <div className="flex items-center gap-4 text-xs">
          <div className="hidden sm:flex items-center gap-3 text-[11px] text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-amber-500/10 border border-amber-500/30 inline-block" />
              ITM (In The Money)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-emerald-500/20 border border-emerald-500/50 inline-block" />
              ATM Strike
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-400/80 inline-block" />
              Max Pain ({index.maxPain})
            </span>
          </div>

          <button
            onClick={() => setShowGreeks(!showGreeks)}
            className={`px-2.5 py-1 rounded text-xs font-medium border transition-colors flex items-center gap-1.5 ${
              showGreeks
                ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
                : 'bg-slate-950 border-slate-700 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sliders size={13} />
            {showGreeks ? 'Greeks Active' : 'Show Greeks'}
          </button>
        </div>
      </div>

      {/* Main Option Chain Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-lg overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse select-none">
            <thead>
              {/* Category Header */}
              <tr className="border-b border-slate-800 text-[11px] font-semibold tracking-wider text-slate-300 bg-slate-950/80">
                <th colSpan={showGreeks ? 8 : 5} className="py-2 px-3 text-center text-emerald-400 border-r border-slate-800">
                  CALL OPTIONS (CE)
                </th>
                <th className="py-2 px-4 text-center bg-slate-950 text-slate-200 font-bold border-r border-slate-800">
                  STRIKE
                </th>
                <th colSpan={showGreeks ? 8 : 5} className="py-2 px-3 text-center text-rose-400">
                  PUT OPTIONS (PE)
                </th>
              </tr>

              {/* Sub-column Headers */}
              <tr className="border-b border-slate-800 text-[10px] uppercase font-semibold text-slate-400 bg-slate-950/40">
                {/* CALL SIDE */}
                <th className="py-2 px-2 text-left font-mono">OI (Lots)</th>
                <th className="py-2 px-2 text-right font-mono">Chg %</th>
                <th className="py-2 px-2 text-right font-mono">IV %</th>
                {showGreeks && (
                  <>
                    <th className="py-2 px-2 text-right font-mono text-slate-300">Delta</th>
                    <th className="py-2 px-2 text-right font-mono text-slate-300">Theta</th>
                    <th className="py-2 px-2 text-right font-mono text-slate-300">Vega</th>
                  </>
                )}
                <th className="py-2 px-2 text-right font-mono text-slate-200">LTP</th>
                <th className="py-2 px-2 text-center text-slate-400 border-r border-slate-800">Trade</th>

                {/* STRIKE */}
                <th className="py-2 px-4 text-center font-mono font-bold text-white bg-slate-950/90 border-r border-slate-800">
                  Price
                </th>

                {/* PUT SIDE */}
                <th className="py-2 px-2 text-center text-slate-400">Trade</th>
                <th className="py-2 px-2 text-left font-mono text-slate-200">LTP</th>
                {showGreeks && (
                  <>
                    <th className="py-2 px-2 text-left font-mono text-slate-300">Delta</th>
                    <th className="py-2 px-2 text-left font-mono text-slate-300">Theta</th>
                    <th className="py-2 px-2 text-left font-mono text-slate-300">Vega</th>
                  </>
                )}
                <th className="py-2 px-2 text-left font-mono">IV %</th>
                <th className="py-2 px-2 text-left font-mono">Chg %</th>
                <th className="py-2 px-2 text-right font-mono">OI (Lots)</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-800/60 font-mono text-[11px] tabular-nums">
              {filteredRows.map((row) => {
                const isMaxPain = row.strike === index.maxPain;
                const ceOiPct = Math.min(100, Math.round((row.ce.oi / maxOverallOI) * 100));
                const peOiPct = Math.min(100, Math.round((row.pe.oi / maxOverallOI) * 100));

                return (
                  <tr
                    key={row.strike}
                    onMouseEnter={() => setHoveredRow(row.strike)}
                    onMouseLeave={() => setHoveredRow(null)}
                    className={`transition-colors ${
                      row.isAtm
                        ? 'bg-emerald-500/10 hover:bg-emerald-500/15 font-medium'
                        : hoveredRow === row.strike
                        ? 'bg-slate-800/40'
                        : ''
                    }`}
                  >
                    {/* --- CALL SIDE --- */}
                    {/* Call OI with bar background */}
                    <td
                      className={`py-1.5 px-2 text-left relative ${
                        row.ce.isItm ? 'bg-amber-500/5 text-amber-200' : 'text-slate-300'
                      }`}
                    >
                      <div
                        className="absolute inset-y-1 left-0 bg-emerald-500/10 rounded-r pointer-events-none"
                        style={{ width: `${ceOiPct}%` }}
                      />
                      <span className="relative z-10 font-medium">
                        {(row.ce.oi / 1000).toFixed(1)}k
                      </span>
                    </td>

                    {/* Call OI Change % */}
                    <td
                      className={`py-1.5 px-2 text-right ${
                        row.ce.isItm ? 'bg-amber-500/5' : ''
                      } ${row.ce.oiChange >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}
                    >
                      {row.ce.oiChange >= 0 ? '+' : ''}{row.ce.oiChangePercent}%
                    </td>

                    {/* Call IV */}
                    <td className={`py-1.5 px-2 text-right text-slate-400 ${row.ce.isItm ? 'bg-amber-500/5' : ''}`}>
                      {row.ce.greeks.iv.toFixed(1)}%
                    </td>

                    {/* Call Greeks */}
                    {showGreeks && (
                      <>
                        <td className={`py-1.5 px-2 text-right text-slate-300 ${row.ce.isItm ? 'bg-amber-500/5' : ''}`}>
                          {row.ce.greeks.delta.toFixed(2)}
                        </td>
                        <td className={`py-1.5 px-2 text-right text-rose-300/80 ${row.ce.isItm ? 'bg-amber-500/5' : ''}`}>
                          {row.ce.greeks.theta.toFixed(1)}
                        </td>
                        <td className={`py-1.5 px-2 text-right text-cyan-300/80 ${row.ce.isItm ? 'bg-amber-500/5' : ''}`}>
                          {row.ce.greeks.vega.toFixed(1)}
                        </td>
                      </>
                    )}

                    {/* Call LTP */}
                    <td
                      className={`py-1.5 px-2 text-right font-bold text-slate-100 ${
                        row.ce.isItm ? 'bg-amber-500/5 text-amber-100' : ''
                      }`}
                    >
                      ₹{row.ce.ltp.toFixed(2)}
                    </td>

                    {/* Call Quick Actions (B / S / +) */}
                    <td
                      className={`py-1 px-2 text-center border-r border-slate-800 ${
                        row.ce.isItm ? 'bg-amber-500/5' : ''
                      }`}
                    >
                      <div className="flex items-center justify-center gap-1">
                        <button
                          title="Virtual Buy Call"
                          onClick={() => onSelectOption(row.ce, 'BUY')}
                          className="px-1.5 py-0.5 rounded bg-blue-600/30 hover:bg-blue-600 text-blue-300 hover:text-white font-bold text-[10px] transition-colors"
                        >
                          B
                        </button>
                        <button
                          title="Virtual Sell Call"
                          onClick={() => onSelectOption(row.ce, 'SELL')}
                          className="px-1.5 py-0.5 rounded bg-rose-600/30 hover:bg-rose-600 text-rose-300 hover:text-white font-bold text-[10px] transition-colors"
                        >
                          S
                        </button>
                        <button
                          title="Add to Strategy Builder"
                          onClick={() =>
                            onAddLegToStrategy({
                              index: index.symbol,
                              expiry: selectedExpiry,
                              strike: row.strike,
                              type: 'CE',
                              action: 'BUY',
                              lots: 1,
                              quantity: index.lotSize,
                              entryPrice: row.ce.ltp,
                            })
                          }
                          className="p-0.5 rounded text-slate-400 hover:text-emerald-300 hover:bg-slate-800 transition-colors"
                        >
                          <Plus size={12} />
                        </button>
                      </div>
                    </td>

                    {/* --- STRIKE PRICE CENTER COLUMN --- */}
                    <td
                      className={`py-1.5 px-3 text-center font-bold border-r border-slate-800 transition-colors ${
                        row.isAtm
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                          : 'bg-slate-950 text-slate-100'
                      }`}
                    >
                      <div className="flex items-center justify-center gap-1.5">
                        {isMaxPain && (
                          <span
                            title="Max Pain Strike (Expiry expiry magnet)"
                            className="w-1.5 h-1.5 rounded-full bg-purple-400 shrink-0"
                          />
                        )}
                        <span>{row.strike}</span>
                        {row.isAtm && (
                          <span className="text-[9px] uppercase tracking-wider px-1 py-0.2 rounded bg-emerald-500/30 text-emerald-300 font-sans">
                            ATM
                          </span>
                        )}
                      </div>
                    </td>

                    {/* --- PUT SIDE --- */}
                    {/* Put Quick Actions (B / S / +) */}
                    <td className={`py-1 px-2 text-center ${row.pe.isItm ? 'bg-amber-500/5' : ''}`}>
                      <div className="flex items-center justify-center gap-1">
                        <button
                          title="Virtual Buy Put"
                          onClick={() => onSelectOption(row.pe, 'BUY')}
                          className="px-1.5 py-0.5 rounded bg-blue-600/30 hover:bg-blue-600 text-blue-300 hover:text-white font-bold text-[10px] transition-colors"
                        >
                          B
                        </button>
                        <button
                          title="Virtual Sell Put"
                          onClick={() => onSelectOption(row.pe, 'SELL')}
                          className="px-1.5 py-0.5 rounded bg-rose-600/30 hover:bg-rose-600 text-rose-300 hover:text-white font-bold text-[10px] transition-colors"
                        >
                          S
                        </button>
                        <button
                          title="Add to Strategy Builder"
                          onClick={() =>
                            onAddLegToStrategy({
                              index: index.symbol,
                              expiry: selectedExpiry,
                              strike: row.strike,
                              type: 'PE',
                              action: 'BUY',
                              lots: 1,
                              quantity: index.lotSize,
                              entryPrice: row.pe.ltp,
                            })
                          }
                          className="p-0.5 rounded text-slate-400 hover:text-emerald-300 hover:bg-slate-800 transition-colors"
                        >
                          <Plus size={12} />
                        </button>
                      </div>
                    </td>

                    {/* Put LTP */}
                    <td
                      className={`py-1.5 px-2 text-left font-bold text-slate-100 ${
                        row.pe.isItm ? 'bg-amber-500/5 text-amber-100' : ''
                      }`}
                    >
                      ₹{row.pe.ltp.toFixed(2)}
                    </td>

                    {/* Put Greeks */}
                    {showGreeks && (
                      <>
                        <td className={`py-1.5 px-2 text-left text-slate-300 ${row.pe.isItm ? 'bg-amber-500/5' : ''}`}>
                          {row.pe.greeks.delta.toFixed(2)}
                        </td>
                        <td className={`py-1.5 px-2 text-left text-rose-300/80 ${row.pe.isItm ? 'bg-amber-500/5' : ''}`}>
                          {row.pe.greeks.theta.toFixed(1)}
                        </td>
                        <td className={`py-1.5 px-2 text-left text-cyan-300/80 ${row.pe.isItm ? 'bg-amber-500/5' : ''}`}>
                          {row.pe.greeks.vega.toFixed(1)}
                        </td>
                      </>
                    )}

                    {/* Put IV */}
                    <td className={`py-1.5 px-2 text-left text-slate-400 ${row.pe.isItm ? 'bg-amber-500/5' : ''}`}>
                      {row.pe.greeks.iv.toFixed(1)}%
                    </td>

                    {/* Put OI Change % */}
                    <td
                      className={`py-1.5 px-2 text-left ${
                        row.pe.isItm ? 'bg-amber-500/5' : ''
                      } ${row.pe.oiChange >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}
                    >
                      {row.pe.oiChange >= 0 ? '+' : ''}{row.pe.oiChangePercent}%
                    </td>

                    {/* Put OI with bar background */}
                    <td
                      className={`py-1.5 px-2 text-right relative ${
                        row.pe.isItm ? 'bg-amber-500/5 text-amber-200' : 'text-slate-300'
                      }`}
                    >
                      <div
                        className="absolute inset-y-1 right-0 bg-rose-500/10 rounded-l pointer-events-none"
                        style={{ width: `${peOiPct}%` }}
                      />
                      <span className="relative z-10 font-medium">
                        {(row.pe.oi / 1000).toFixed(1)}k
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
