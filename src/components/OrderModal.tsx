import React, { useState } from 'react';
import { ActionType, IndexInfo, OptionData, OptionType, OrderType } from '../types/options';
import { calculateStatutoryCharges } from '../utils/marketData';
import { X, ShieldCheck, ArrowRight, Zap, Info } from 'lucide-react';

interface OrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  option: OptionData | null;
  index: IndexInfo;
  defaultAction?: ActionType;
  onExecuteOrder: (orderParams: {
    index: IndexInfo['symbol'];
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
}

export const OrderModal: React.FC<OrderModalProps> = ({
  isOpen,
  onClose,
  option,
  index,
  defaultAction = 'BUY',
  onExecuteOrder,
  availableCapital,
}) => {
  if (!isOpen || !option) return null;

  const [action, setAction] = useState<ActionType>(defaultAction);
  const [orderType, setOrderType] = useState<OrderType>('MARKET');
  const [lots, setLots] = useState<number>(1);
  const [limitPrice, setLimitPrice] = useState<number>(option.ltp);

  const quantity = lots * index.lotSize;
  const priceToUse = orderType === 'MARKET' ? option.ltp : limitPrice;
  const turnover = priceToUse * quantity;

  const charges = calculateStatutoryCharges(action, priceToUse, quantity);

  // Required capital approximation
  const capitalRequired = action === 'BUY'
    ? turnover + charges.totalTaxes
    : (index.spotPrice * quantity * 0.13) + charges.totalTaxes; // Short margin ~13%

  const hasSufficientMargin = availableCapital >= capitalRequired;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasSufficientMargin) return;

    onExecuteOrder({
      index: index.symbol,
      expiry: index.selectedExpiry,
      strike: option.strike,
      type: option.type,
      action,
      orderType,
      lots,
      quantity,
      price: priceToUse,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-700/80 rounded-xl w-full max-w-md shadow-2xl overflow-hidden text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm tracking-wide text-white">
              {index.name} {option.strike} {option.type}
            </span>
            <span className="text-xs text-slate-400 font-mono">
              · {index.selectedExpiry}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Action Selector (Buy / Sell) */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-950 rounded-lg border border-slate-800">
            <button
              type="button"
              onClick={() => setAction('BUY')}
              className={`py-2 text-xs font-semibold rounded-md transition-colors ${
                action === 'BUY'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              BUY (Long)
            </button>
            <button
              type="button"
              onClick={() => setAction('SELL')}
              className={`py-2 text-xs font-semibold rounded-md transition-colors ${
                action === 'SELL'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              SELL (Short Option)
            </button>
          </div>

          {/* Price & LTP Display */}
          <div className="flex items-center justify-between bg-slate-950/40 p-3 rounded-lg border border-slate-800/80 text-xs">
            <div>
              <span className="text-slate-400 block text-[11px]">Last Traded Price</span>
              <span className="font-mono tabular-nums text-base font-bold text-white">
                ₹{option.ltp.toFixed(2)}
              </span>
            </div>
            <div className="text-right">
              <span className="text-slate-400 block text-[11px]">Bid / Ask Depth</span>
              <span className="font-mono tabular-nums text-slate-300">
                ₹{option.bid.toFixed(2)} / ₹{option.ask.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Lots & Quantity */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">
                Lots (Lot Size: {index.lotSize})
              </label>
              <div className="flex items-center">
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={lots}
                  onChange={(e) => setLots(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono tabular-nums text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">
                Total Quantity
              </label>
              <div className="w-full bg-slate-950/60 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono tabular-nums text-slate-300 flex items-center justify-between">
                <span>{quantity} Qty</span>
                <span className="text-[10px] text-slate-400 font-sans">Contracts</span>
              </div>
            </div>
          </div>

          {/* Order Type (Market / Limit) */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">
                Order Type
              </label>
              <div className="flex rounded-lg bg-slate-950 border border-slate-800 p-0.5">
                <button
                  type="button"
                  onClick={() => setOrderType('MARKET')}
                  className={`flex-1 py-1.5 text-xs font-medium rounded ${
                    orderType === 'MARKET' ? 'bg-slate-800 text-white' : 'text-slate-400'
                  }`}
                >
                  Market
                </button>
                <button
                  type="button"
                  onClick={() => setOrderType('LIMIT')}
                  className={`flex-1 py-1.5 text-xs font-medium rounded ${
                    orderType === 'LIMIT' ? 'bg-slate-800 text-white' : 'text-slate-400'
                  }`}
                >
                  Limit
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">
                Limit Price (₹)
              </label>
              <input
                type="number"
                step="0.05"
                disabled={orderType === 'MARKET'}
                value={orderType === 'MARKET' ? option.ltp : limitPrice}
                onChange={(e) => setLimitPrice(parseFloat(e.target.value) || option.ltp)}
                className="w-full bg-slate-950 border border-slate-700 disabled:opacity-50 disabled:bg-slate-950/50 rounded-lg px-3 py-2 text-xs font-mono tabular-nums text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Zero-Brokerage vs Statutory Taxes Breakdown */}
          <div className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-3 text-xs space-y-1.5">
            <div className="flex items-center justify-between text-slate-300">
              <span className="flex items-center gap-1">
                NiftyPulse Brokerage
                <span className="text-[10px] text-emerald-400 font-semibold">(Zero-Cost)</span>
              </span>
              <span className="font-mono font-bold text-emerald-400">₹0.00</span>
            </div>
            <div className="flex items-center justify-between text-slate-400 text-[11px]">
              <span>STT + Exchange + SEBI + GST</span>
              <span className="font-mono tabular-nums">₹{charges.totalTaxes.toFixed(2)}</span>
            </div>
            <div className="border-t border-slate-800 pt-1.5 flex items-center justify-between text-slate-200">
              <span className="font-medium">Total Margin Needed</span>
              <span className="font-mono tabular-nums font-bold">
                ₹{capitalRequired.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </span>
            </div>
          </div>

          {!hasSufficientMargin && (
            <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
              <Info size={14} className="shrink-0" />
              <span>Insufficient virtual capital. Available: ₹{availableCapital.toLocaleString('en-IN')}</span>
            </div>
          )}

          {/* Submit Action Button */}
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-4 rounded-lg border border-slate-700 text-slate-300 text-xs font-medium hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!hasSufficientMargin}
              className={`flex-1 py-2.5 px-4 rounded-lg text-xs font-semibold text-white transition-all flex items-center justify-center gap-1.5 shadow-md ${
                !hasSufficientMargin
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  : action === 'BUY'
                  ? 'bg-blue-600 hover:bg-blue-500'
                  : 'bg-rose-600 hover:bg-rose-500'
              }`}
            >
              <Zap size={14} />
              Instant Virtual {action}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
