'use client';

import { useEffect, useMemo, useState } from 'react';
import { FundingTable } from './FundingTable';
import { FundingFilters } from './FundingFilters';
import type { FundingSnapshot } from '@evplus/contracts';
import { normalizeSymbol } from '../../utils/symbols';

const SYMBOL_PRIORITY = ['BTC', 'ETH', 'SOL', 'BNB', 'ARB', 'AAVE', 'OP', 'SUI', 'DOGE', 'AVAX', 'DOT'];
const EXCHANGE_PRIORITY = ['binance', 'bybit', 'aster', 'paradex', 'lighter', 'hyperliquid', 'edgex'];
const HORIZON_OPTIONS = [
  { label: '8h', value: '8h', hours: 8 },
  { label: 'Daily', value: '1d', hours: 24 },
  { label: 'Weekly', value: '1w', hours: 24 * 7 },
  { label: 'Monthly', value: '1m', hours: 24 * 30 },
  { label: 'Yearly', value: '1y', hours: 24 * 365 }
] as const;
const PAGE_SIZE_OPTIONS: Array<{ label: string; value: number }> = [
  { label: '20', value: 20 },
  { label: '50', value: 50 },
  { label: '100', value: 100 }
];

type SortOption = 'default' | 'highest' | 'lowest' | 'spread-desc' | 'spread-asc';
type FundingHorizon = (typeof HORIZON_OPTIONS)[number]['value'];

type Props = {
  snapshots: FundingSnapshot[];
};

export function FundingView({ snapshots }: Props) {
  const { majorSymbols, otherSymbols } = useMemo(() => {
    const distinct = Array.from(new Set(snapshots.map((snap) => normalizeSymbol(snap.symbol))));
    const ordered = orderSymbols(distinct);
    const major = ordered.filter((symbol) => SYMBOL_PRIORITY.includes(symbol));
    const remaining = ordered.filter((symbol) => !major.includes(symbol));
    return { majorSymbols: major, otherSymbols: remaining };
  }, [snapshots]);

  const orderedSymbols = useMemo(
    () => [...majorSymbols, ...otherSymbols],
    [majorSymbols, otherSymbols]
  );

  const exchanges = useMemo(() => {
    const distinct = Array.from(new Set(snapshots.map((snap) => snap.exchange.toLowerCase())));
    return orderExchanges(distinct);
  }, [snapshots]);

  const [activeSymbol, setActiveSymbol] = useState<string | null>(null);
  const [activeExchanges, setActiveExchanges] = useState<string[]>(exchanges);
  const [sortOption, setSortOption] = useState<SortOption>('default');
  const [pageSize, setPageSize] = useState<number>(Number(process.env.NEXT_PUBLIC_DEFAULT_PAGE_SIZE ?? 50));
  const [horizon, setHorizon] = useState<FundingHorizon>('8h');

  useEffect(() => {
    if (activeSymbol && !orderedSymbols.includes(activeSymbol)) {
      setActiveSymbol(null);
    }
  }, [orderedSymbols, activeSymbol]);

  useEffect(() => {
    setActiveExchanges((prev) => {
      const nextSet = new Set(exchanges);
      if (nextSet.size === 0) {
        return [];
      }
      const filteredPrev = prev.filter((exchange) => nextSet.has(exchange));
      const additions = exchanges.filter((exchange) => !filteredPrev.includes(exchange));
      const combined = [...filteredPrev, ...additions];
      const changed =
        combined.length !== prev.length || combined.some((exchange, index) => exchange !== prev[index]);
      return changed ? combined : prev;
    });
  }, [exchanges]);

  const visibleSnapshots = useMemo(() => {
    return snapshots.filter((snap) => {
      const base = normalizeSymbol(snap.symbol);
      const exchangeKey = snap.exchange.toLowerCase();
      const symbolMatch = activeSymbol ? base === activeSymbol : true;
      const exchangeMatch = activeExchanges.includes(exchangeKey);
      return symbolMatch && exchangeMatch;
    });
  }, [snapshots, activeSymbol, activeExchanges]);

  const handleToggleExchange = (exchange: string) => {
    setActiveExchanges((prev) =>
      prev.includes(exchange)
        ? prev.filter((item) => item !== exchange)
        : [...prev, exchange]
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <section className="grid gap-3 rounded-xl border border-slate-800 bg-slate-900/40 p-4 md:grid-cols-2 md:gap-6">
        <FundingFilters
          majorSymbols={majorSymbols}
          otherSymbols={otherSymbols}
          activeSymbol={activeSymbol}
          onSymbolChange={setActiveSymbol}
          exchanges={exchanges}
          activeExchanges={activeExchanges}
          onToggleExchange={handleToggleExchange}
        />
        <div className="flex flex-col gap-3 min-w-0">
          <SortControls sortOption={sortOption} onChange={setSortOption} />
          <div className="flex flex-col gap-2">
            <FundingHorizonControls horizon={horizon} onChange={setHorizon} />
            <div className="flex flex-wrap items-center gap-2">
              <PageSizeControls pageSize={pageSize} onChange={setPageSize} />
              <button
                onClick={() => {
                  setSortOption('default');
                  setPageSize(Number(process.env.NEXT_PUBLIC_DEFAULT_PAGE_SIZE ?? 50));
                  setHorizon('8h');
                }}
                className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-300 transition hover:border-emerald-500 hover:text-emerald-300"
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      </section>
      <FundingTable
        snapshots={visibleSnapshots}
        symbols={orderedSymbols}
        exchanges={exchanges}
        sortOption={sortOption}
        pageSize={pageSize}
        horizon={horizon}
        onSpreadHeaderClick={() =>
          setSortOption((prev) =>
            prev === 'spread-desc' ? 'spread-asc' : 'spread-desc'
          )
        }
      />
    </div>
  );
}

function orderSymbols(symbols: string[]) {
  const set = new Set(symbols);
  const prioritized = SYMBOL_PRIORITY.filter((sym) => set.delete(sym));
  const rest = Array.from(set).sort((a, b) => a.localeCompare(b));
  return [...prioritized, ...rest];
}

function orderExchanges(exchanges: string[]) {
  const set = new Set(exchanges.map((exchange) => exchange.toLowerCase()));
  const prioritized = EXCHANGE_PRIORITY.filter((ex) => set.delete(ex));
  const rest = Array.from(set).sort((a, b) => a.localeCompare(b));
  return [...prioritized, ...rest];
}

type SortControlsProps = {
  sortOption: SortOption;
  onChange: (option: SortOption) => void;
};

function SortControls({ sortOption, onChange }: SortControlsProps) {
  return (
    <div className="flex flex-wrap gap-2 rounded-lg border border-slate-800 bg-slate-900/40 px-4 py-3 text-xs">
      <span className="mr-2 text-slate-400">Sort:</span>
      {(
        [
          { label: 'Default', value: 'default' as SortOption },
          { label: 'Highest Funding', value: 'highest' as SortOption },
          { label: 'Lowest Funding', value: 'lowest' as SortOption }
        ]
      ).map(({ label, value }) => (
        <button
          key={value}
          onClick={() => onChange(value)}
          className={`rounded-full px-3 py-1 font-medium transition ${
            sortOption === value
              ? 'bg-emerald-500/20 text-emerald-300'
              : 'bg-slate-800 text-slate-300 hover:bg-slate-750'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

type PageSizeControlsProps = {
  pageSize: number;
  onChange: (size: number) => void;
};

function PageSizeControls({ pageSize, onChange }: PageSizeControlsProps) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/40 px-4 py-3 text-xs">
      <span className="text-slate-400">Show:</span>
      {PAGE_SIZE_OPTIONS.map(({ label, value }) => (
        <button
          key={value}
          onClick={() => onChange(value)}
          className={`rounded-full px-3 py-1 font-medium transition ${
            pageSize === value
              ? 'bg-emerald-500/20 text-emerald-300'
              : 'bg-slate-800 text-slate-300 hover:bg-slate-750'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

type FundingHorizonControlsProps = {
  horizon: FundingHorizon;
  onChange: (value: FundingHorizon) => void;
};

function FundingHorizonControls({ horizon, onChange }: FundingHorizonControlsProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/40 px-4 py-3 text-xs">
      <span className="text-slate-400">Funding:</span>
      {HORIZON_OPTIONS.map(({ label, value }) => (
        <button
          key={value}
          onClick={() => onChange(value)}
          className={`rounded-full px-3 py-1 font-medium transition ${
            horizon === value
              ? 'bg-emerald-500/20 text-emerald-300'
              : 'bg-slate-800 text-slate-300 hover:bg-slate-750'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
