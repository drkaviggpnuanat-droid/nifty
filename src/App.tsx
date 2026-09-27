import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ActionType,
  AccountPortfolio,
  IndexInfo,
  IndexSymbol,
  JournalEntry,
  OptionChainRow,
  OptionData,
  OptionType,
  Order,
  OrderType,
  Position,
  StrategyLeg,
} from './types/options';
import { INITIAL_INDICES, calculateMarginRequirement, calculateStatutoryCharges, generateOptionChain, getDaysToExpiry } from './utils/marketData';
import { STRATEGY_PRESETS, calculateStrategyPayoff } from './utils/strategyEngine';
import { Header } from './components/Header';
import { OptionChain } from './components/OptionChain';
import { StrategyBuilder } from './components/StrategyBuilder';
import { RiskManagement } from './components/RiskManagement';
import { VirtualTrading } from './components/VirtualTrading';
import { ZeroCostEngine } from './components/ZeroCostEngine';
import { OrderModal } from './components/OrderModal';
import { calculateGreeks, blackScholesPrice } from './utils/blackScholes';

const DEFAULT_CAPITAL = 1000000; // ₹10,00,000 (10 Lakhs INR)

export default function App() {
  const [activeTab, setActiveTab] = useState<'chain' | 'strategy' | 'risk' | 'trade' | 'zeroCost'>('chain');
  const [selectedIndex, setSelectedIndex] = useState<IndexSymbol>('NIFTY');
  const [indices, setIndices] = useState<Record<IndexSymbol, IndexInfo>>(INITIAL_INDICES);
  const [marketMode, setMarketMode] = useState<'live' | 'fast' | 'paused' | 'shock'>('live');

  // Order modal state
  const [orderModal, setOrderModal] = useState<{
    isOpen: boolean;
    option: OptionData | null;
    defaultAction: ActionType;
  }>({
    isOpen: false,
    option: null,
    defaultAction: 'BUY',
  });

  // Strategy Builder Legs
  const [legs, setLegs] = useState<StrategyLeg[]>(() => {
    const defaultIndex = INITIAL_INDICES['NIFTY'];
    const preset = STRATEGY_PRESETS['iron_condor'].createLegs(defaultIndex);
    return preset.map((l, idx) => ({
      ...l,
      id: `leg-init-${idx}`,
      entryPrice: 95.0,
      currentPrice: 95.0,
      greeks: {
        delta: l.type === 'CE' ? 0.35 : -0.35,
        gamma: 0.0004,
        theta: -9.2,
        vega: 15.0,
        rho: 1.0,
        iv: 13.5,
      },
    }));
  });

  // Open Positions & Orders (persisted in localStorage)
  const [positions, setPositions] = useState<Position[]>(() => {
    try {
      const saved = localStorage.getItem('niftype_positions');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [orders, setOrders] = useState<Order[]>(() => {
    try {
      const saved = localStorage.getItem('niftype_orders');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>(() => {
    try {
      const saved = localStorage.getItem('niftype_journal');
      return saved
        ? JSON.parse(saved)
        : [
            {
              id: 'j-1',
              date: '2026-09-25',
              strategyName: 'Weekly Short Iron Condor',
              index: 'NIFTY',
              pnl: 6420,
              setupType: 'Expiry Day Theta',
              emotions: 'Disciplined',
              ruleFollowed: true,
              notes: 'Entered at 10:30 AM after IV stabilized. Took full theta decay, closed wings at 2:45 PM.',
            },
            {
              id: 'j-2',
              date: '2026-09-26',
              strategyName: 'Bank Nifty Breakout Call Spread',
              index: 'BANKNIFTY',
              pnl: -2100,
              setupType: 'Breakout',
              emotions: 'Patient',
              ruleFollowed: true,
              notes: 'Failed breakout above 53,500 resistance. Strict SL triggered. Limited loss due to hedged bear leg.',
            },
          ];
    } catch {
      return [];
    }
  });

  const [capital, setCapital] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('niftype_capital');
      return saved ? parseFloat(saved) : DEFAULT_CAPITAL;
    } catch {
      return DEFAULT_CAPITAL;
    }
  });

  const [dailyLossLimit, setDailyLossLimit] = useState<number>(15000);
  const [autoSquareOff, setAutoSquareOff] = useState<boolean>(true);

  // Save to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('niftype_positions', JSON.stringify(positions));
    } catch (e) {}
  }, [positions]);

  useEffect(() => {
    try {
      localStorage.setItem('niftype_orders', JSON.stringify(orders));
    } catch (e) {}
  }, [orders]);

  useEffect(() => {
    try {
      localStorage.setItem('niftype_journal', JSON.stringify(journalEntries));
    } catch (e) {}
  }, [journalEntries]);

  useEffect(() => {
    try {
      localStorage.setItem('niftype_capital', capital.toString());
    } catch (e) {}
  }, [capital]);

  // Real-time market tick engine
  useEffect(() => {
    if (marketMode === 'paused') return;

    const intervalMs = marketMode === 'fast' ? 700 : marketMode === 'shock' ? 500 : 1300;

    const timer = setInterval(() => {
      setIndices((prev) => {
        const next = { ...prev };
        for (const key of Object.keys(next) as IndexSymbol[]) {
          const idx = next[key];
          let shockMultiplier = 1;
          if (marketMode === 'shock') {
            shockMultiplier = 3.5;
          }

          // Random walk Brownian noise
          const drift = (Math.random() - 0.49) * (idx.strikeStep * 0.08) * shockMultiplier;
          const newSpot = Math.max(100, Number((idx.spotPrice + drift).toFixed(2)));
          const change = Number((newSpot - idx.prevClose).toFixed(2));
          const changePercent = Number(((change / idx.prevClose) * 100).toFixed(2));
          const atmStrike = Math.round(newSpot / idx.strikeStep) * idx.strikeStep;
          const vixNoise = (Math.random() - 0.5) * 0.06;
          const newVix = Math.max(8.0, Number((idx.indiaVix + vixNoise).toFixed(2)));

          next[key] = {
            ...idx,
            spotPrice: newSpot,
            change,
            changePercent,
            high: Math.max(idx.high, newSpot),
            low: Math.min(idx.low, newSpot),
            atmStrike,
            indiaVix: newVix,
          };
        }
        return next;
      });

      // Update positions LTP and MTM dynamically
      setPositions((prevPositions) => {
        return prevPositions.map((pos) => {
          const currentIndex = indices[pos.index];
          const daysToExpiry = getDaysToExpiry(pos.expiry);
          const T = Math.max(0.002, daysToExpiry / 365.0);
          const sigma = currentIndex.indiaVix / 100.0;
          const currentPrice = blackScholesPrice(currentIndex.spotPrice, pos.strike, T, 0.065, sigma, pos.type);
          const currentGreeks = calculateGreeks(currentIndex.spotPrice, pos.strike, T, 0.065, sigma, pos.type);

          const ltp = Number(currentPrice.toFixed(2));
          const mult = pos.action === 'BUY' ? 1 : -1;
          const mtm = Number(((ltp - pos.avgPrice) * pos.quantity * mult).toFixed(2));
          const pnlPercent = Number((((ltp - pos.avgPrice) / pos.avgPrice) * 100 * mult).toFixed(2));

          // Check automated SL and TP triggers
          if (pos.stopLoss && pos.action === 'BUY' && ltp <= pos.stopLoss) {
            // Auto SL triggered for Long
            handleAutoSquareOffSingle(pos.id, ltp, 'SL');
          } else if (pos.stopLoss && pos.action === 'SELL' && ltp >= pos.stopLoss) {
            // Auto SL triggered for Short
            handleAutoSquareOffSingle(pos.id, ltp, 'SL');
          } else if (pos.takeProfit && pos.action === 'BUY' && ltp >= pos.takeProfit) {
            handleAutoSquareOffSingle(pos.id, ltp, 'TP');
          } else if (pos.takeProfit && pos.action === 'SELL' && ltp <= pos.takeProfit) {
            handleAutoSquareOffSingle(pos.id, ltp, 'TP');
          }

          return {
            ...pos,
            ltp,
            mtm,
            pnlPercent,
            greeks: currentGreeks,
          };
        });
      });
    }, intervalMs);

    return () => clearInterval(timer);
  }, [marketMode, indices]);

  // Generate option chain for active index
  const currentIndex = indices[selectedIndex];
  const optionChainRows = useMemo(() => {
    const days = getDaysToExpiry(currentIndex.selectedExpiry);
    return generateOptionChain(currentIndex, days, 26);
  }, [currentIndex]);

  // Portfolio calculations
  const unrealizedPnl = positions.reduce((acc, p) => acc + p.mtm, 0);

  const realizedPnl = orders.reduce((acc, ord) => {
    // Already accounted in cash capital
    return acc;
  }, 0);

  const marginCalculation = useMemo(() => {
    return calculateMarginRequirement(
      positions.map((p) => ({
        action: p.action,
        type: p.type,
        strike: p.strike,
        quantity: p.quantity,
        ltp: p.ltp,
      })),
      currentIndex.spotPrice
    );
  }, [positions, currentIndex.spotPrice]);

  const usedMargin = marginCalculation.requiredMargin;
  const availableMargin = Math.max(0, capital + unrealizedPnl - usedMargin);

  const totalBrokerageSaved = orders.length * 23.60; // ₹20 + 18% GST saved per virtual order

  const portfolio: AccountPortfolio = {
    capital,
    availableMargin,
    usedMargin,
    realizedPnl,
    unrealizedPnl,
    dailyLossLimit,
    autoSquareOff,
    totalBrokerageSaved,
  };

  // Place single order
  const handlePlaceOrder = useCallback(
    (orderParams: {
      index: IndexSymbol;
      expiry: string;
      strike: number;
      type: OptionType;
      action: ActionType;
      orderType: OrderType;
      lots: number;
      quantity: number;
      price: number;
    }) => {
      const idx = indices[orderParams.index];
      const charges = calculateStatutoryCharges(orderParams.action, orderParams.price, orderParams.quantity);
      const executionPrice = orderParams.price;
      const cost = executionPrice * orderParams.quantity;

      const newOrder: Order = {
        id: `ord-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        index: orderParams.index,
        expiry: orderParams.expiry,
        strike: orderParams.strike,
        type: orderParams.type,
        action: orderParams.action,
        orderType: orderParams.orderType,
        lots: orderParams.lots,
        quantity: orderParams.quantity,
        price: orderParams.price,
        executedPrice: executionPrice,
        status: 'EXECUTED',
        timestamp: Date.now(),
        brokerage: 0,
        stt: charges.stt,
        exchangeCharges: charges.exchangeCharges,
        gst: charges.gst,
        sebiCharges: charges.sebiCharges,
        stampDuty: charges.stampDuty,
        totalTaxes: charges.totalTaxes,
      };

      setOrders((prev) => [newOrder, ...prev]);

      // Update positions
      setPositions((prev) => {
        // Look for matching position to average or reduce
        const existingIndex = prev.findIndex(
          (p) =>
            p.index === orderParams.index &&
            p.strike === orderParams.strike &&
            p.type === orderParams.type &&
            p.action === orderParams.action
        );

        if (existingIndex !== -1) {
          const ex = prev[existingIndex];
          const newQty = ex.quantity + orderParams.quantity;
          const newAvg = (ex.avgPrice * ex.quantity + executionPrice * orderParams.quantity) / newQty;
          const updated = [...prev];
          updated[existingIndex] = {
            ...ex,
            quantity: newQty,
            lots: ex.lots + orderParams.lots,
            avgPrice: Number(newAvg.toFixed(2)),
          };
          return updated;
        }

        const days = getDaysToExpiry(orderParams.expiry);
        const greeks = calculateGreeks(
          idx.spotPrice,
          orderParams.strike,
          days / 365,
          0.065,
          idx.indiaVix / 100,
          orderParams.type
        );

        const newPos: Position = {
          id: `pos-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          index: orderParams.index,
          expiry: orderParams.expiry,
          strike: orderParams.strike,
          type: orderParams.type,
          action: orderParams.action,
          lots: orderParams.lots,
          quantity: orderParams.quantity,
          avgPrice: executionPrice,
          ltp: executionPrice,
          mtm: 0,
          pnlPercent: 0,
          greeks,
          createdAt: Date.now(),
        };

        return [newPos, ...prev];
      });

      // Deduct cash for buys & charges
      if (orderParams.action === 'BUY') {
        setCapital((prev) => prev - cost - charges.totalTaxes);
      } else {
        setCapital((prev) => prev + cost - charges.totalTaxes);
      }
    },
    [indices]
  );

  // Deploy multi-leg strategy directly
  const handleDeployStrategy = (strategyLegs: StrategyLeg[]) => {
    strategyLegs.forEach((leg) => {
      handlePlaceOrder({
        index: leg.index,
        expiry: leg.expiry,
        strike: leg.strike,
        type: leg.type,
        action: leg.action,
        orderType: 'MARKET',
        lots: leg.lots,
        quantity: leg.quantity,
        price: leg.entryPrice,
      });
    });
    setActiveTab('risk');
  };

  // Load sample Iron Condor strategy to demo P&L Heatmap instantly
  const handleLoadSamplePositions = () => {
    const preset = STRATEGY_PRESETS['iron_condor'].createLegs(currentIndex);
    const sampleLegs: StrategyLeg[] = preset.map((l, idx) => ({
      ...l,
      id: `leg-sample-${Date.now()}-${idx}`,
      entryPrice: l.type === 'CE' ? 85.0 : 92.0,
      currentPrice: l.type === 'CE' ? 85.0 : 92.0,
      greeks: {
        delta: l.type === 'CE' ? 0.35 : -0.35,
        gamma: 0.0004,
        theta: -8.8,
        vega: 14.5,
        rho: 1.0,
        iv: currentIndex.indiaVix,
      },
    }));
    handleDeployStrategy(sampleLegs);
  };

  // Square off single position
  const handleSquareOffPosition = (positionId: string) => {
    const pos = positions.find((p) => p.id === positionId);
    if (!pos) return;

    // Opposite action
    const exitAction = pos.action === 'BUY' ? 'SELL' : 'BUY';
    const charges = calculateStatutoryCharges(exitAction, pos.ltp, pos.quantity);

    const closeOrder: Order = {
      id: `ord-exit-${Date.now()}`,
      index: pos.index,
      expiry: pos.expiry,
      strike: pos.strike,
      type: pos.type,
      action: exitAction,
      orderType: 'MARKET',
      lots: pos.lots,
      quantity: pos.quantity,
      price: pos.ltp,
      executedPrice: pos.ltp,
      status: 'EXECUTED',
      timestamp: Date.now(),
      brokerage: 0,
      stt: charges.stt,
      exchangeCharges: charges.exchangeCharges,
      gst: charges.gst,
      sebiCharges: charges.sebiCharges,
      stampDuty: charges.stampDuty,
      totalTaxes: charges.totalTaxes,
    };

    setOrders((prev) => [closeOrder, ...prev]);
    setPositions((prev) => prev.filter((p) => p.id !== positionId));

    // Update capital with realized MTM
    setCapital((prev) => prev + pos.mtm - charges.totalTaxes);
  };

  const handleAutoSquareOffSingle = (positionId: string, ltp: number, trigger: 'SL' | 'TP') => {
    handleSquareOffPosition(positionId);
  };

  // Square off all positions
  const handleSquareOffAll = () => {
    positions.forEach((pos) => {
      handleSquareOffPosition(pos.id);
    });
  };

  // Reset virtual capital
  const handleResetCapital = () => {
    setPositions([]);
    setOrders([]);
    setCapital(DEFAULT_CAPITAL);
    localStorage.removeItem('niftype_positions');
    localStorage.removeItem('niftype_orders');
    localStorage.removeItem('niftype_capital');
  };

  const handleUpdatePositionSLTP = (positionId: string, stopLoss?: number, takeProfit?: number) => {
    setPositions((prev) =>
      prev.map((p) => (p.id === positionId ? { ...p, stopLoss, takeProfit } : p))
    );
  };

  const handleUpdateDailyLossLimit = (limit: number, autoExit: boolean) => {
    setDailyLossLimit(limit);
    setAutoSquareOff(autoExit);
  };

  // Add Leg to Strategy Builder from Option Chain
  const handleAddLegToStrategy = (legParams: Omit<StrategyLeg, 'id' | 'currentPrice' | 'greeks'>) => {
    const days = getDaysToExpiry(legParams.expiry);
    const greeks = calculateGreeks(
      currentIndex.spotPrice,
      legParams.strike,
      days / 365,
      0.065,
      currentIndex.indiaVix / 100,
      legParams.type
    );

    const newLeg: StrategyLeg = {
      ...legParams,
      id: `leg-add-${Date.now()}`,
      currentPrice: legParams.entryPrice,
      greeks,
    };

    setLegs((prev) => [...prev, newLeg]);
    setActiveTab('strategy');
  };

  // Open fast order modal from Option Chain
  const handleSelectOptionForTrade = (option: OptionData, defaultAction: ActionType) => {
    setOrderModal({
      isOpen: true,
      option,
      defaultAction,
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Navigation & Live Telemetry Ribbon */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        indices={indices}
        selectedIndex={selectedIndex}
        setSelectedIndex={setSelectedIndex}
        marketMode={marketMode}
        setMarketMode={setMarketMode}
        capital={capital}
        unrealizedPnl={unrealizedPnl}
        realizedPnl={realizedPnl}
        onResetCapital={handleResetCapital}
      />

      {/* Main Content Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-4">
        {activeTab === 'chain' && (
          <OptionChain
            index={currentIndex}
            rows={optionChainRows}
            onSelectOption={handleSelectOptionForTrade}
            onAddLegToStrategy={handleAddLegToStrategy}
            selectedExpiry={currentIndex.selectedExpiry}
            onSelectExpiry={(expiry) =>
              setIndices((prev) => ({
                ...prev,
                [selectedIndex]: { ...prev[selectedIndex], selectedExpiry: expiry },
              }))
            }
          />
        )}

        {activeTab === 'strategy' && (
          <StrategyBuilder
            index={currentIndex}
            legs={legs}
            setLegs={setLegs}
            onDeployStrategy={handleDeployStrategy}
            availableCapital={availableMargin}
          />
        )}

        {activeTab === 'risk' && (
          <RiskManagement
            portfolio={portfolio}
            positions={positions}
            onSquareOffPosition={handleSquareOffPosition}
            onSquareOffAll={handleSquareOffAll}
            onUpdatePositionSLTP={handleUpdatePositionSLTP}
            onUpdateDailyLossLimit={handleUpdateDailyLossLimit}
            vix={currentIndex.indiaVix}
            index={currentIndex}
            onAddSamplePositions={handleLoadSamplePositions}
          />
        )}

        {activeTab === 'trade' && (
          <VirtualTrading
            indices={indices}
            orders={orders}
            onPlaceOrder={handlePlaceOrder}
            availableCapital={availableMargin}
            totalBrokerageSaved={totalBrokerageSaved}
            onResetAccount={handleResetCapital}
          />
        )}

        {activeTab === 'zeroCost' && (
          <ZeroCostEngine
            journalEntries={journalEntries}
            onAddJournalEntry={(entry) =>
              setJournalEntries((prev) => [
                {
                  ...entry,
                  id: `j-${Date.now()}`,
                  date: new Date().toISOString().slice(0, 10),
                },
                ...prev,
              ])
            }
            onDeleteJournalEntry={(id) =>
              setJournalEntries((prev) => prev.filter((j) => j.id !== id))
            }
          />
        )}
      </main>

      {/* Fast Order Execution Modal */}
      <OrderModal
        isOpen={orderModal.isOpen}
        onClose={() => setOrderModal({ ...orderModal, isOpen: false })}
        option={orderModal.option}
        index={currentIndex}
        defaultAction={orderModal.defaultAction}
        onExecuteOrder={handlePlaceOrder}
        availableCapital={availableMargin}
      />

      {/* Clean, Non-slop Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/80 py-4 px-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-400">NiftyPulse</span>
            <span>·</span>
            <span>Zero-Cost NSE Index Options Terminal</span>
          </div>
          <div className="flex items-center gap-4 text-slate-400">
            <span>Black-Scholes Mathematical Engine</span>
            <span>·</span>
            <span>SEBI SPAN & Exposure Margin Model</span>
            <span>·</span>
            <span>Paper Trading Virtual Sandbox</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
