import React, { useState } from 'react';
import { ActionType, IndexInfo, IndexSymbol, OptionType, Order, OrderType } from '../types/options';
import { calculateStatutoryCharges } from '../utils/marketData';
import { ArrowDownRight, ArrowUpRight, CheckCircle2, Clock, RotateCcw, Zap, Info, ShieldCheck } from 'lucide-react';

interface VirtualTradingProps {
  indices: Record<IndexSymbol, IndexInfo>;
  orders: Order[];
  onPlaceOrder: (orderParams: {
    index: IndexSymbol;
    expiry: string;
    strike: number;
    type: OptionType;
    action: ActionType;
    orderType: OrderType;
    lots: number;
    quantity: number;
    price: number;
  }) => void;
  availableCapital: number;
  totalBrokerageSaved: number;
  onResetAccount: () => void;
}

export const VirtualTrading: React.FC<VirtualTradingProps> = ({
  indices,
  orders,
  onPlaceOrder,
  availableCapital,
  totalBrokerageSaved,
  onResetAccount,
}) => {
  const [selectedIndex, setSelectedIndex] = useState<IndexSymbol>('NIFTY');
  const [action, setAction] = useState<ActionType>('BUY');
  const [optionType, setOptionType] = useState<OptionType>('CE');
  const [strike, setStrike] = useState<number>(indices['NIFTY'].atmStrike);
  const [orderType, setOrderType] = useState<OrderType>('MARKET');
  const [lots, setLots] = useState<number>(1);
  const [limitPrice, setLimitPrice] = useState<number>(120);
  const [filterType, setFilterType] = useState<'ALL' | 'BUY' | 'SELL'>('ALL');

  const currentIndex = indices[selectedIndex];
  const quantity = lots * currentIndex.lotSize;
  const executionPrice = orderType === 'MARKET' ? 125.50 : limitPrice;
  const charges = calculateStatutoryCharges(action, executionPrice, quantity);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onPlaceOrder({
      index: selectedIndex,
      expiry: currentIndex.selectedExpiry,
      strike,
      type: optionType,
      action,
      orderType,
      lots,
      quantity,
      price: executionPrice,
    });
  };

  const filteredOrders = orders.filter((o) => {
    if (filterType === 'ALL') return true;
    return o.action === filterType;
  });

  return (
    <div className="space-y-4">
      {/* Top Banner: Zero Brokerage Paper Trading */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-white tracking-tight">
              Virtual F&O Paper Trading Account
            </span>
            <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30">
              ₹0 Brokerage Active
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Simulate live option trading with real NSE tick physics, realistic slippage, and precise SEBI statutory charges.
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <span className="text-[10px] text-slate-400 block">Total Brokerage Saved vs Traditional Broker</span>
            <span className="text-base font-mono tabular-nums font-bold text-emerald-400">
              +₹{totalBrokerageSaved.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <button
            onClick={onResetAccount}
            className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-700"
          >
            <RotateCcw size={13} /> Reset Capital
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Fast Order Execution Form (Col 4) */}
        <div className="lg:col-span-4 bg-slate-900/90 border border-slate-800 rounded-lg p-4 space-y-4">
          <div className="border-b border-slate-800 pb-2 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-200">Place Virtual Order</span>
            <span className="text-[10px] font-mono text-slate-400">Instant Execution</span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3 text-xs">
            {/* Index & Expiry */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Underlying</label>
                <select
                  value={selectedIndex}
                  onChange={(e) => {
                    const sym = e.target.value as IndexSymbol;
                    setSelectedIndex(sym);
                    setStrike(indices[sym].atmStrike);
                  }}
                  className="w-full bg-slate-950 border border-slate-700 rounded-md p-2 text-white font-semibold text-xs focus:outline-none"
                >
                  <option value="NIFTY">NIFTY 50</option>
                  <option value="BANKNIFTY">BANK NIFTY</option>
                  <option value="FINNIFTY">FIN NIFTY</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Expiry</label>
                <div className="w-full bg-slate-950 border border-slate-800 rounded-md p-2 text-slate-300 font-mono text-xs">
                  {currentIndex.selectedExpiry}
                </div>
              </div>
            </div>

            {/* Buy / Sell Toggle */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-950 rounded-lg border border-slate-800">
              <button
                type="button"
                onClick={() => setAction('BUY')}
                className={`py-1.5 font-bold rounded transition-colors text-xs ${
                  action === 'BUY' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-400'
                }`}
              >
                BUY
              </button>
              <button
                type="button"
                onClick={() => setAction('SELL')}
                className={`py-1.5 font-bold rounded transition-colors text-xs ${
                  action === 'SELL' ? 'bg-rose-600 text-white shadow-xs' : 'text-slate-400'
                }`}
              >
                SELL
              </button>
            </div>

            {/* Strike & Option Type (CE/PE) */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Strike Price</label>
                <input
                  type="number"
                  step={currentIndex.strikeStep}
                  value={strike}
                  onChange={(e) => setStrike(parseInt(e.target.value) || currentIndex.atmStrike)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-md p-2 font-mono tabular-nums text-white text-xs focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Option Type</label>
                <div className="grid grid-cols-2 gap-1 p-0.5 bg-slate-950 border border-slate-800 rounded-md">
                  <button
                    type="button"
                    onClick={() => setOptionType('CE')}
                    className={`py-1.5 font-semibold rounded text-xs ${
                      optionType === 'CE' ? 'bg-slate-800 text-emerald-400 font-bold' : 'text-slate-400'
                    }`}
                  >
                    CE
                  </button>
                  <button
                    type="button"
                    onClick={() => setOptionType('PE')}
                    className={`py-1.5 font-semibold rounded text-xs ${
                      optionType === 'PE' ? 'bg-slate-800 text-rose-400 font-bold' : 'text-slate-400'
                    }`}
                  >
                    PE
                  </button>
                </div>
              </div>
            </div>

            {/* Lots & Quantity */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">
                  Lots (Size: {currentIndex.lotSize})
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={lots}
                  onChange={(e) => setLots(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-md p-2 font-mono tabular-nums text-white text-xs focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Total Quantity</label>
                <div className="w-full bg-slate-950/70 border border-slate-800 rounded-md p-2 font-mono tabular-nums text-slate-300 text-xs">
                  {quantity} Qty
                </div>
              </div>
            </div>

            {/* Order Type (Market / Limit) */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Execution</label>
                <select
                  value={orderType}
                  onChange={(e) => setOrderType(e.target.value as OrderType)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-md p-2 text-white text-xs focus:outline-none"
                >
                  <option value="MARKET">Market Order</option>
                  <option value="LIMIT">Limit Order</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Limit (₹)</label>
                <input
                  type="number"
                  step="0.5"
                  disabled={orderType === 'MARKET'}
                  value={orderType === 'MARKET' ? 125.50 : limitPrice}
                  onChange={(e) => setLimitPrice(parseFloat(e.target.value) || 100)}
                  className="w-full bg-slate-950 border border-slate-700 disabled:opacity-50 rounded-md p-2 font-mono tabular-nums text-white text-xs focus:outline-none"
                />
              </div>
            </div>

            {/* Charges preview */}
            <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-3 space-y-1 text-[11px]">
              <div className="flex justify-between text-slate-300">
                <span>Brokerage:</span>
                <span className="font-mono text-emerald-400 font-bold">₹0.00</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Statutory Taxes (STT/GST/Exch):</span>
                <span className="font-mono tabular-nums">₹{charges.totalTaxes.toFixed(2)}</span>
              </div>
            </div>

            <button
              type="submit"
              className={`w-full py-2.5 rounded-lg text-white font-bold text-xs shadow-md transition-colors flex items-center justify-center gap-1.5 ${
                action === 'BUY' ? 'bg-blue-600 hover:bg-blue-500' : 'bg-rose-600 hover:bg-rose-500'
              }`}
            >
              <Zap size={14} /> Execute Virtual {action}
            </button>
          </form>
        </div>

        {/* Order History Table (Col 8) */}
        <div className="lg:col-span-8 bg-slate-900/90 border border-slate-800 rounded-lg overflow-hidden shadow-xl flex flex-col">
          <div className="p-3 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-200">
                Order Book & Execution Log ({orders.length})
              </span>
            </div>
            <div className="flex rounded bg-slate-950 border border-slate-800 p-0.5 text-xs">
              {(['ALL', 'BUY', 'SELL'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setFilterType(mode)}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                    filterType === mode
                      ? 'bg-slate-800 text-white font-semibold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-[10px] uppercase font-semibold text-slate-400 bg-slate-950/60 font-mono">
                  <th className="py-2.5 px-3 text-left">Time</th>
                  <th className="py-2.5 px-3 text-left">Instrument</th>
                  <th className="py-2.5 px-3 text-left">Side</th>
                  <th className="py-2.5 px-3 text-right">Qty</th>
                  <th className="py-2.5 px-3 text-right">Price (₹)</th>
                  <th className="py-2.5 px-3 text-right">Brokerage</th>
                  <th className="py-2.5 px-3 text-right">Taxes (₹)</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-[11px] tabular-nums">
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-500 italic font-sans">
                      No executed orders yet. Place an order on the left or click Buy/Sell on the Option Chain.
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((ord) => (
                    <tr key={ord.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-2.5 px-3 text-slate-400">
                        {new Date(ord.timestamp).toLocaleTimeString()}
                      </td>

                      <td className="py-2.5 px-3 font-semibold text-white">
                        {ord.index} {ord.strike} {ord.type}
                      </td>

                      <td className="py-2.5 px-3">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            ord.action === 'BUY'
                              ? 'bg-blue-500/20 text-blue-300'
                              : 'bg-rose-500/20 text-rose-300'
                          }`}
                        >
                          {ord.action}
                        </span>
                      </td>

                      <td className="py-2.5 px-3 text-right text-slate-200">
                        {ord.quantity}
                      </td>

                      <td className="py-2.5 px-3 text-right font-bold text-white">
                        ₹{ord.executedPrice.toFixed(2)}
                      </td>

                      <td className="py-2.5 px-3 text-right text-emerald-400 font-bold">
                        ₹0.00
                      </td>

                      <td className="py-2.5 px-3 text-right text-slate-400">
                        ₹{ord.totalTaxes.toFixed(2)}
                      </td>

                      <td className="py-2.5 px-3 text-center">
                        <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-semibold">
                          <CheckCircle2 size={12} /> Executed
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
