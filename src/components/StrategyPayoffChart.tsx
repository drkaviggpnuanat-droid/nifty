import React, { useState, useRef } from 'react';
import { StrategyPayoff } from '../types/options';

interface StrategyPayoffChartProps {
  payoff: StrategyPayoff;
  currentSpot: number;
}

export const StrategyPayoffChart: React.FC<StrategyPayoffChartProps> = ({
  payoff,
  currentSpot,
}) => {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const points = payoff.points;
  if (!points || points.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center border border-dashed border-slate-800 rounded-lg text-slate-500 text-xs">
        Add option legs to calculate payoff diagram
      </div>
    );
  }

  const width = 800;
  const height = 300;
  const padding = { top: 30, right: 30, bottom: 40, left: 60 };

  const minSpot = points[0].spot;
  const maxSpot = points[points.length - 1].spot;

  // Determine Y scale bounds
  const allPnls = points.flatMap((p) => [p.pnlExpiry, p.pnlTarget]);
  let minPnl = Math.min(...allPnls, -1000);
  let maxPnl = Math.max(...allPnls, 1000);

  // Add 15% breathing room
  const pnlSpan = Math.max(2000, maxPnl - minPnl);
  minPnl -= pnlSpan * 0.1;
  maxPnl += pnlSpan * 0.1;

  // Coordinate mappers
  const getX = (spot: number) => {
    return padding.left + ((spot - minSpot) / (maxSpot - minSpot)) * (width - padding.left - padding.right);
  };

  const getY = (pnl: number) => {
    return padding.top + (1 - (pnl - minPnl) / (maxPnl - minPnl)) * (height - padding.top - padding.bottom);
  };

  const zeroY = getY(0);
  const currentSpotX = getX(currentSpot);

  // Generate SVG path strings
  let expiryPath = '';
  let targetPath = '';

  points.forEach((p, idx) => {
    const x = getX(p.spot);
    const yExp = getY(p.pnlExpiry);
    const yTgt = getY(p.pnlTarget);

    if (idx === 0) {
      expiryPath += `M ${x} ${yExp}`;
      targetPath += `M ${x} ${yTgt}`;
    } else {
      expiryPath += ` L ${x} ${yExp}`;
      targetPath += ` L ${x} ${yTgt}`;
    }
  });

  // Handle mouse hover over SVG
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const chartWidth = rect.width;
    const ratio = Math.max(0, Math.min(1, (mouseX - (padding.left / width) * chartWidth) / (chartWidth * ((width - padding.left - padding.right) / width))));
    const index = Math.round(ratio * (points.length - 1));
    if (index >= 0 && index < points.length) {
      setHoverIndex(index);
    }
  };

  const hoveredPoint = hoverIndex !== null ? points[hoverIndex] : null;

  return (
    <div className="relative w-full bg-slate-950/70 border border-slate-800 rounded-lg p-3">
      {/* Chart Legend */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs mb-2 px-1">
        <div className="flex items-center gap-4 text-[11px]">
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-0.5 bg-emerald-400 inline-block" />
            <span className="text-slate-300">P&L at Expiry</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-0.5 bg-cyan-400 border-b border-dashed inline-block" />
            <span className="text-slate-300">P&L Today (T+0 Black-Scholes)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 border-l-2 border-amber-400 border-dashed inline-block" />
            <span className="text-slate-400">Current Spot ({currentSpot})</span>
          </div>
        </div>

        {/* Hovered point value readout */}
        {hoveredPoint ? (
          <div className="flex items-center gap-3 text-[11px] font-mono tabular-nums bg-slate-900 border border-slate-700/80 px-2.5 py-0.5 rounded">
            <span className="text-slate-400">Spot: <strong className="text-white">{hoveredPoint.spot}</strong></span>
            <span className={hoveredPoint.pnlExpiry >= 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
              Expiry: {hoveredPoint.pnlExpiry >= 0 ? '+' : ''}₹{hoveredPoint.pnlExpiry.toLocaleString('en-IN')}
            </span>
            <span className={hoveredPoint.pnlTarget >= 0 ? 'text-cyan-300' : 'text-rose-300'}>
              Target: {hoveredPoint.pnlTarget >= 0 ? '+' : ''}₹{hoveredPoint.pnlTarget.toLocaleString('en-IN')}
            </span>
          </div>
        ) : (
          <div className="text-[11px] text-slate-500 italic">Hover chart to inspect spot & P&L</div>
        )}
      </div>

      <svg
        ref={svgRef}
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto cursor-crosshair select-none overflow-visible"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoverIndex(null)}
      >
        <defs>
          <linearGradient id="profitGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#10B981" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#10B981" stopOpacity="0.0" />
          </linearGradient>
          <linearGradient id="lossGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#F43F5E" stopOpacity="0.0" />
            <stop offset="100%" stopColor="#F43F5E" stopOpacity="0.25" />
          </linearGradient>
        </defs>

        {/* Grid lines (horizontal) */}
        {[0.2, 0.4, 0.6, 0.8].map((pct) => {
          const pnlVal = minPnl + pct * (maxPnl - minPnl);
          const y = getY(pnlVal);
          return (
            <g key={pct}>
              <line
                x1={padding.left}
                y1={y}
                x2={width - padding.right}
                y2={y}
                stroke="#1E293B"
                strokeWidth="1"
                strokeDasharray="3 3"
              />
              <text
                x={padding.left - 8}
                y={y + 3}
                fill="#64748B"
                fontSize="10"
                fontFamily="JetBrains Mono, monospace"
                textAnchor="end"
              >
                ₹{Math.round(pnlVal / 100) * 100}
              </text>
            </g>
          );
        })}

        {/* ZERO P&L Line */}
        <line
          x1={padding.left}
          y1={zeroY}
          x2={width - padding.right}
          y2={zeroY}
          stroke="#475569"
          strokeWidth="1.5"
        />
        <text
          x={padding.left - 8}
          y={zeroY + 3}
          fill="#94A3B8"
          fontSize="10"
          fontWeight="bold"
          fontFamily="JetBrains Mono, monospace"
          textAnchor="end"
        >
          ₹0
        </text>

        {/* Current Spot Vertical Line */}
        {currentSpotX >= padding.left && currentSpotX <= width - padding.right && (
          <g>
            <line
              x1={currentSpotX}
              y1={padding.top}
              x2={currentSpotX}
              y2={height - padding.bottom}
              stroke="#F59E0B"
              strokeWidth="1.5"
              strokeDasharray="4 3"
            />
            <text
              x={currentSpotX}
              y={padding.top - 6}
              fill="#F59E0B"
              fontSize="9"
              fontWeight="bold"
              fontFamily="JetBrains Mono, monospace"
              textAnchor="middle"
            >
              SPOT {currentSpot}
            </text>
          </g>
        )}

        {/* Lower & Upper Breakevens */}
        {payoff.lowerBreakeven && (
          <g>
            <line
              x1={getX(payoff.lowerBreakeven)}
              y1={padding.top}
              x2={getX(payoff.lowerBreakeven)}
              y2={height - padding.bottom}
              stroke="#A855F7"
              strokeWidth="1"
              strokeDasharray="2 2"
            />
            <text
              x={getX(payoff.lowerBreakeven)}
              y={height - padding.bottom + 25}
              fill="#C084FC"
              fontSize="9"
              fontFamily="JetBrains Mono, monospace"
              textAnchor="middle"
            >
              BE {payoff.lowerBreakeven}
            </text>
          </g>
        )}
        {payoff.upperBreakeven && (
          <g>
            <line
              x1={getX(payoff.upperBreakeven)}
              y1={padding.top}
              x2={getX(payoff.upperBreakeven)}
              y2={height - padding.bottom}
              stroke="#A855F7"
              strokeWidth="1"
              strokeDasharray="2 2"
            />
            <text
              x={getX(payoff.upperBreakeven)}
              y={height - padding.bottom + 25}
              fill="#C084FC"
              fontSize="9"
              fontFamily="JetBrains Mono, monospace"
              textAnchor="middle"
            >
              BE {payoff.upperBreakeven}
            </text>
          </g>
        )}

        {/* T+0 Target Day Curve (Black-Scholes theoretical line) */}
        <path
          d={targetPath}
          fill="none"
          stroke="#06B6D4"
          strokeWidth="2"
          strokeDasharray="5 3"
          strokeLinecap="round"
        />

        {/* Expiry Payoff Curve */}
        <path
          d={expiryPath}
          fill="none"
          stroke="#10B981"
          strokeWidth="2.5"
          strokeLinecap="round"
        />

        {/* X-axis ticks (Spot prices) */}
        {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
          const spotVal = Math.round(minSpot + pct * (maxSpot - minSpot));
          const x = getX(spotVal);
          return (
            <text
              key={pct}
              x={x}
              y={height - padding.bottom + 14}
              fill="#64748B"
              fontSize="10"
              fontFamily="JetBrains Mono, monospace"
              textAnchor="middle"
            >
              {spotVal}
            </text>
          );
        })}

        {/* Hover Crosshair & Indicators */}
        {hoveredPoint && (
          <g>
            <line
              x1={getX(hoveredPoint.spot)}
              y1={padding.top}
              x2={getX(hoveredPoint.spot)}
              y2={height - padding.bottom}
              stroke="#E2E8F0"
              strokeWidth="1"
              strokeDasharray="2 2"
            />
            {/* Expiry point marker */}
            <circle
              cx={getX(hoveredPoint.spot)}
              cy={getY(hoveredPoint.pnlExpiry)}
              r="4.5"
              fill={hoveredPoint.pnlExpiry >= 0 ? '#10B981' : '#F43F5E'}
              stroke="#0F172A"
              strokeWidth="2"
            />
            {/* Target point marker */}
            <circle
              cx={getX(hoveredPoint.spot)}
              cy={getY(hoveredPoint.pnlTarget)}
              r="3.5"
              fill="#06B6D4"
              stroke="#0F172A"
              strokeWidth="1.5"
            />
          </g>
        )}
      </svg>
    </div>
  );
};
