import React, { useState } from 'react';
import { JournalEntry } from '../types/options';
import { ShieldCheck, DollarSign, Calculator, BookOpen, Plus, Trash2, CheckCircle2, AlertCircle, Download, Upload } from 'lucide-react';

interface ZeroCostEngineProps {
  journalEntries: JournalEntry[];
  onAddJournalEntry: (entry: Omit<JournalEntry, 'id' | 'date'>) => void;
  onDeleteJournalEntry: (id: string) => void;
}

export const ZeroCostEngine: React.FC<ZeroCostEngineProps> = ({
  journalEntries,
  onAddJournalEntry,
  onDeleteJournalEntry,
}) => {
  // Brokerage savings calculator states
  const [ordersPerDay, setOrdersPerDay] = useState<number>(15);
  const [tradingDaysPerMonth, setTradingDaysPerMonth] = useState<number>(20);
  const [brokerFeePerOrder, setBrokerFeePerOrder] = useState<number>(20);

  // Journal form states
  const [strategyName, setStrategyName] = useState<string>('Iron Condor');
  const [indexSelected, setIndexSelected] = useState<'NIFTY' | 'BANKNIFTY'>('NIFTY');
  const [pnlValue, setPnlValue] = useState<number>(2450);
  const [setupType, setSetupType] = useState<JournalEntry['setupType']>('Expiry Day Theta');
  const [emotions, setEmotions] = useState<JournalEntry['emotions']>('Disciplined');
  const [ruleFollowed, setRuleFollowed] = useState<boolean>(true);
  const [notes, setNotes] = useState<string>('Waited for 10:15 AM range confirmation, strict SL placed at 40% of short premium.');

  // Math for savings
  const totalOrdersMonth = ordersPerDay * tradingDaysPerMonth;
  const monthlyBrokerageGross = totalOrdersMonth * brokerFeePerOrder;
  const monthlyGst = monthlyBrokerageGross * 0.18;
  const monthlyTotalSaved = monthlyBrokerageGross + monthlyGst;
  const yearlyTotalSaved = monthlyTotalSaved * 12;

  // 5-year compounding at 12% annual return if saved money was reinvested
  const r = 0.12 / 12;
  const n = 60; // 5 years
  const futureValueCompounded = monthlyTotalSaved * ((Math.pow(1 + r, n) - 1) / r);

  const handleJournalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAddJournalEntry({
      strategyName,
      index: indexSelected,
      pnl: pnlValue,
      setupType,
      emotions,
      ruleFollowed,
      notes,
    });
  };

  const handleExportJournal = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(journalEntries, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `nifty_pulse_trade_journal_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="space-y-4">
      {/* Zero Cost Value Proposition Banner */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-5">
        <div className="max-w-3xl">
          <div className="flex items-center gap-2 mb-2">
            <span className="p-1.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <ShieldCheck size={18} />
            </span>
            <h2 className="text-base font-bold text-white tracking-tight">
              Zero-Cost Architecture: Built for Traders & Lean Development
            </h2>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Standard options trading platforms levy heavy recurring software subscriptions (₹1,500–₹4,000/month) and brokerages (₹20–₹40 per order), eroding up to 35% of an active trader’s gross gains.
            NiftyPulse was architected with a <strong className="text-emerald-400">100% Zero-Cost framework</strong>:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 text-xs">
            <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800">
              <span className="font-bold text-slate-100 block mb-1">0% Software & Cloud Bill</span>
              <p className="text-slate-400 text-[11px] leading-normal">
                Exact Black-Scholes PDE math and Greeks calculation run entirely client-side. Zero server computing expenses.
              </p>
            </div>
            <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800">
              <span className="font-bold text-slate-100 block mb-1">0% Brokerage Overhead</span>
              <p className="text-slate-400 text-[11px] leading-normal">
                Virtual paper trading with institutional-grade tick physics and zero commissions to refine strategies risk-free.
              </p>
            </div>
            <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800">
              <span className="font-bold text-slate-100 block mb-1">Zero Lock-in & Local Storage</span>
              <p className="text-slate-400 text-[11px] leading-normal">
                Instant browser persistence with JSON import/export. Your trading setups and journal data remain strictly your own.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Brokerage Savings Calculator */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-5 bg-slate-900/90 border border-slate-800 rounded-lg p-4 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
            <Calculator size={16} className="text-emerald-400" />
            <span className="text-xs font-semibold text-slate-200">
              Brokerage Drain Simulator (Traditional vs Zero-Cost)
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <div className="flex justify-between text-slate-300 mb-1">
                <span>Orders Executed Per Day:</span>
                <span className="font-mono tabular-nums font-bold text-white">{ordersPerDay} orders</span>
              </div>
              <input
                type="range"
                min="2"
                max="60"
                step="2"
                value={ordersPerDay}
                onChange={(e) => setOrdersPerDay(parseInt(e.target.value))}
                className="w-full accent-emerald-400 h-1.5 bg-slate-950 rounded cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-slate-300 mb-1">
                <span>Trading Days Per Month:</span>
                <span className="font-mono tabular-nums font-bold text-white">{tradingDaysPerMonth} days</span>
              </div>
              <input
                type="range"
                min="10"
                max="24"
                step="1"
                value={tradingDaysPerMonth}
                onChange={(e) => setTradingDaysPerMonth(parseInt(e.target.value))}
                className="w-full accent-emerald-400 h-1.5 bg-slate-950 rounded cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-slate-300 mb-1">
                <span>Traditional Broker Fee per Order:</span>
                <span className="font-mono tabular-nums font-bold text-white">₹{brokerFeePerOrder}</span>
              </div>
              <input
                type="range"
                min="10"
                max="40"
                step="5"
                value={brokerFeePerOrder}
                onChange={(e) => setBrokerFeePerOrder(parseInt(e.target.value))}
                className="w-full accent-emerald-400 h-1.5 bg-slate-950 rounded cursor-pointer"
              />
            </div>

            {/* Savings Result Cards */}
            <div className="border-t border-slate-800 pt-3 space-y-2">
              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                <span className="text-[10px] text-emerald-400 font-semibold block uppercase tracking-wide">
                  Monthly Capital Retained (Including 18% GST)
                </span>
                <span className="text-xl font-mono tabular-nums font-bold text-emerald-300">
                  ₹{Math.round(monthlyTotalSaved).toLocaleString('en-IN')} / month
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  Over {totalOrdersMonth} orders per month saved from broker friction
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] font-mono tabular-nums">
                <div className="p-2.5 rounded bg-slate-950 border border-slate-800">
                  <span className="text-slate-400 block text-[10px] font-sans">1-Year Savings</span>
                  <span className="text-sm font-bold text-slate-100">
                    ₹{Math.round(yearlyTotalSaved).toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="p-2.5 rounded bg-slate-950 border border-slate-800">
                  <span className="text-slate-400 block text-[10px] font-sans">5-Yr Opportunity (12% CAGR)</span>
                  <span className="text-sm font-bold text-cyan-300">
                    ₹{Math.round(futureValueCompounded).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Trade Journal & Psychological Discipline Tracker (Col 7) */}
        <div className="lg:col-span-7 bg-slate-900/90 border border-slate-800 rounded-lg p-4 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <BookOpen size={16} className="text-emerald-400" />
              <span className="text-xs font-semibold text-slate-200">
                Options Trading Journal & Rule Compliance
              </span>
            </div>
            <button
              onClick={handleExportJournal}
              disabled={journalEntries.length === 0}
              className="text-xs px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 flex items-center gap-1.5 transition-colors"
            >
              <Download size={12} /> Export JSON
            </button>
          </div>

          <form onSubmit={handleJournalSubmit} className="space-y-3 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div>
                <label className="block text-slate-400 text-[11px] mb-1">Strategy Name</label>
                <input
                  type="text"
                  value={strategyName}
                  onChange={(e) => setStrategyName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-400 text-[11px] mb-1">Underlying</label>
                <select
                  value={indexSelected}
                  onChange={(e) => setIndexSelected(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-white focus:outline-none"
                >
                  <option value="NIFTY">NIFTY 50</option>
                  <option value="BANKNIFTY">BANK NIFTY</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 text-[11px] mb-1">Realized P&L (₹)</label>
                <input
                  type="number"
                  step="50"
                  value={pnlValue}
                  onChange={(e) => setPnlValue(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-950 border border-slate-700 rounded p-1.5 font-mono tabular-nums text-white focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div>
                <label className="block text-slate-400 text-[11px] mb-1">Setup Type</label>
                <select
                  value={setupType}
                  onChange={(e) => setSetupType(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-white focus:outline-none"
                >
                  <option value="Expiry Day Theta">Expiry Day Theta</option>
                  <option value="High IV Crush">High IV Crush</option>
                  <option value="Breakout">Breakout</option>
                  <option value="Mean-Reversion">Mean-Reversion</option>
                  <option value="Directional Trend">Directional Trend</option>
                  <option value="Hedging">Hedging</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 text-[11px] mb-1">Execution Mindset</label>
                <select
                  value={emotions}
                  onChange={(e) => setEmotions(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-white focus:outline-none"
                >
                  <option value="Disciplined">Disciplined</option>
                  <option value="Patient">Patient</option>
                  <option value="FOMO">FOMO (Impulsive)</option>
                  <option value="Greed">Greed (Overleveraged)</option>
                  <option value="Fear">Fear (Premature Exit)</option>
                </select>
              </div>

              <div className="flex items-center gap-2 pt-4">
                <input
                  type="checkbox"
                  id="ruleFollowedCheck"
                  checked={ruleFollowed}
                  onChange={(e) => setRuleFollowed(e.target.checked)}
                  className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
                />
                <label htmlFor="ruleFollowedCheck" className="text-slate-300 text-[11px] cursor-pointer">
                  Rules Strictly Followed
                </label>
              </div>
            </div>

            <div>
              <label className="block text-slate-400 text-[11px] mb-1">Trade Learnings & Observations</label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white text-xs focus:outline-none"
              />
            </div>

            <button
              type="submit"
              className="py-2 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-colors flex items-center gap-1.5"
            >
              <Plus size={13} /> Save Journal Entry
            </button>
          </form>

          {/* Journal Entries List */}
          <div className="border-t border-slate-800 pt-3 space-y-2 max-h-56 overflow-y-auto">
            {journalEntries.length === 0 ? (
              <p className="text-slate-500 text-center py-4 text-xs italic">
                No journal entries yet. Log your first option trade above.
              </p>
            ) : (
              journalEntries.map((j) => (
                <div
                  key={j.id}
                  className="p-2.5 rounded bg-slate-950/70 border border-slate-800 text-xs flex items-start justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-white">{j.strategyName}</span>
                      <span className="text-[10px] text-slate-400 font-mono">({j.index})</span>
                      <span
                        className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-semibold ${
                          j.pnl >= 0 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                        }`}
                      >
                        {j.pnl >= 0 ? '+' : ''}₹{j.pnl.toLocaleString('en-IN')}
                      </span>
                      <span className="text-[10px] text-slate-400">· {j.setupType}</span>
                    </div>
                    <p className="text-slate-300 text-[11px]">{j.notes}</p>
                    <div className="flex items-center gap-2 text-[10px] text-slate-500">
                      <span>Mindset: {j.emotions}</span>
                      <span>·</span>
                      <span>{j.ruleFollowed ? '✅ Followed Rules' : '⚠️ Deviated'}</span>
                      <span>·</span>
                      <span>{j.date}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => onDeleteJournalEntry(j.id)}
                    className="text-slate-500 hover:text-rose-400 p-1 transition-colors"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
