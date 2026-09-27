import React from 'react';
import { IndexInfo, IndexSymbol } from '../types/options';
import { Activity, ShieldCheck, RefreshCw, TrendingUp, TrendingDown, Zap, AlertCircle } from 'lucide-react';

interface HeaderProps {
  activeTab: 'chain' | 'strategy' | 'risk' | 'trade' | 'zeroCost';
  setActiveTab: (tab: 'chain' | 'strategy' | 'risk' | 'trade' | 'zeroCost') => void;
  indices: Record<IndexSymbol, IndexInfo>;
  selectedIndex: IndexSymbol;
  setSelectedIndex: (sym: IndexSymbol) => void;
  marketMode: 'live' | 'fast' | 'paused' | 'shock';
  setMarketMode: (mode: 'live' | 'fast' | 'paused' | 'shock') => void;
  capital: number;
  unrealizedPnl: number;
  realizedPnl: number;
  onResetCapital: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  indices,
  selectedIndex,
  setSelectedIndex,
  marketMode,
  setMarketMode,
  capital,
  unrealizedPnl,
  realizedPnl,
  onResetCapital,
}) => {
  const currentIndex = indices[selectedIndex];
  const totalPnl = unrealizedPnl + realizedPnl;

  return (
    <header className="border-b border-slate-800 bg-slate-950/90 backdrop-blur sticky top-0 z-40">
      {/* Top Bar Contract: Zone 1 (Brand) — Zone 2 (4-5 Nav Links) — Zone 3 (Action / Account) */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
        {/* Zone 1: Single text element wordmark */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-sm">
              NP
            </div>
            <span className="text-base font-bold tracking-tight text-white">
              NiftyPulse
            </span>
          </div>
          <span className="hidden sm:inline text-xs text-slate-500">·</span>
          <span className="hidden sm:inline text-xs text-slate-400 font-mono">
            NSE F&O Terminal
          </span>
        </div>

        {/* Zone 2: Clean navigation links */}
        <nav className="flex items-center gap-1 sm:gap-2">
          <button
            onClick={() => setActiveTab('chain')}
            className={`px-3 py-1.5 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
              activeTab === 'chain'
                ? 'text-emerald-400 border-b-2 border-emerald-400 pb-1'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Option Chain
          </button>
          <button
            onClick={() => setActiveTab('strategy')}
            className={`px-3 py-1.5 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
              activeTab === 'strategy'
                ? 'text-emerald-400 border-b-2 border-emerald-400 pb-1'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Strategy & Payoff
          </button>
          <button
            onClick={() => setActiveTab('risk')}
            className={`px-3 py-1.5 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
              activeTab === 'risk'
                ? 'text-emerald-400 border-b-2 border-emerald-400 pb-1'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Risk & SPAN Margin
          </button>
          <button
            onClick={() => setActiveTab('trade')}
            className={`px-3 py-1.5 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
              activeTab === 'trade'
                ? 'text-emerald-400 border-b-2 border-emerald-400 pb-1'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Virtual Trades
          </button>
          <button
            onClick={() => setActiveTab('zeroCost')}
            className={`px-3 py-1.5 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
              activeTab === 'zeroCost'
                ? 'text-emerald-400 border-b-2 border-emerald-400 pb-1'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Zero-Cost & Journal
          </button>
        </nav>

        {/* Zone 3: Account & Simulation Controls */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Virtual Capital */}
          <div className="hidden md:flex flex-col text-right">
            <span className="text-[10px] text-slate-400 font-medium">Virtual Capital</span>
            <span className="text-xs font-mono tabular-nums font-semibold text-slate-100">
              ₹{(capital + totalPnl).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </span>
          </div>

          {/* MTM */}
          <div className="hidden lg:flex flex-col text-right">
            <span className="text-[10px] text-slate-400 font-medium">Net MTM</span>
            <span
              className={`text-xs font-mono tabular-nums font-semibold ${
                totalPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {totalPnl >= 0 ? '+' : ''}₹{totalPnl.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>

          {/* Market Feed Mode */}
          <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded px-2 py-1">
            <div
              className={`w-2 h-2 rounded-full ${
                marketMode === 'paused'
                  ? 'bg-amber-400'
                  : marketMode === 'shock'
                  ? 'bg-rose-500 animate-pulse'
                  : 'bg-emerald-400 animate-pulse'
              }`}
            />
            <select
              value={marketMode}
              onChange={(e) => setMarketMode(e.target.value as any)}
              className="bg-transparent text-[11px] text-slate-300 font-medium focus:outline-none cursor-pointer"
            >
              <option value="live" className="bg-slate-900 text-slate-200">Live Sim</option>
              <option value="fast" className="bg-slate-900 text-slate-200">2x Fast</option>
              <option value="shock" className="bg-slate-900 text-slate-200">Vol Shock</option>
              <option value="paused" className="bg-slate-900 text-slate-200">Paused</option>
            </select>
          </div>
        </div>
      </div>

      {/* Index Ribbon Bar */}
      <div className="border-t border-slate-900/80 bg-slate-950/60 px-4 sm:px-6 py-2 overflow-x-auto text-xs flex items-center justify-between gap-6">
        <div className="flex items-center gap-6 shrink-0">
          {(['NIFTY', 'BANKNIFTY', 'FINNIFTY'] as IndexSymbol[]).map((sym) => {
            const idx = indices[sym];
            const isSelected = selectedIndex === sym;
            const isPos = idx.change >= 0;
            return (
              <button
                key={sym}
                onClick={() => setSelectedIndex(sym)}
                className={`flex items-center gap-2 px-2.5 py-1 rounded transition-colors text-left ${
                  isSelected
                    ? 'bg-slate-800/80 border border-slate-700 text-white'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
                }`}
              >
                <span className="font-semibold text-xs tracking-tight">{idx.name}</span>
                <span className="font-mono tabular-nums text-slate-100 font-medium">
                  {idx.spotPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span
                  className={`font-mono tabular-nums text-[11px] flex items-center gap-0.5 ${
                    isPos ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {isPos ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                  {isPos ? '+' : ''}{idx.change.toFixed(2)} ({isPos ? '+' : ''}{idx.changePercent.toFixed(2)}%)
                </span>
              </button>
            );
          })}
        </div>

        {/* Market Vital Telemetry */}
        <div className="hidden md:flex items-center gap-5 text-slate-400 shrink-0 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">India VIX</span>
            <span className="font-mono tabular-nums font-semibold text-amber-300">
              {currentIndex.indiaVix.toFixed(2)}
            </span>
          </div>
          <span className="text-slate-700">·</span>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">PCR (OI)</span>
            <span className={`font-mono tabular-nums font-semibold ${currentIndex.pcr >= 1 ? 'text-emerald-400' : 'text-amber-400'}`}>
              {currentIndex.pcr.toFixed(2)}
            </span>
          </div>
          <span className="text-slate-700">·</span>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">Max Pain</span>
            <span className="font-mono tabular-nums font-semibold text-slate-200">
              {currentIndex.maxPain.toLocaleString('en-IN')}
            </span>
          </div>
          <span className="text-slate-700">·</span>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">Lot Size</span>
            <span className="font-mono tabular-nums text-slate-300 font-medium">
              {currentIndex.lotSize}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};
