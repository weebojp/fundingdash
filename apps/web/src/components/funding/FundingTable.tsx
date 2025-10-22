'use client';

import { useMemo } from 'react';
import { normalizeSymbol } from '../../utils/symbols';

type FundingHorizon = '8h' | '1d' | '1w' | '1m' | '1y';

const HORIZON_TO_HOURS: Record<FundingHorizon, number> = {
  '8h': 8,
  '1d': 24,
  '1w': 24 * 7,
  '1m': 24 * 30,
  '1y': 24 * 365
};

const HORIZON_LABELS: Record<FundingHorizon, string> = {
  '8h': '8h',
  '1d': 'Daily',
  '1w': 'Weekly',
  '1m': 'Monthly',
  '1y': 'Yearly'
};

type Snapshot = {
  symbol: string;
  exchange: string;
  fundingRatePct: number;
  collectedAt: string;
  periodHours?: number;
};

type Props = {
  snapshots: Snapshot[];
  symbols: string[];
  exchanges: string[];
  sortOption: 'default' | 'highest' | 'lowest' | 'spread-desc' | 'spread-asc';
  pageSize: number;
  horizon: FundingHorizon;
  onSpreadHeaderClick: () => void;
};

export function FundingTable({
  snapshots,
  symbols,
  exchanges,
  sortOption,
  pageSize,
  horizon,
  onSpreadHeaderClick
}: Props) {
  const targetHours = HORIZON_TO_HOURS[horizon];

  const rows = useMemo(() => {
    return symbols.map((baseSymbol) => {
      const row: Record<string, Snapshot | undefined> = {};
      snapshots.forEach((snap) => {
        const normalized = normalizeSymbol(snap.symbol);
        if (normalized !== baseSymbol) return;
        const exchangeKey = snap.exchange.toLowerCase();
        row[exchangeKey] = { ...snap, exchange: exchangeKey };
      });
      return { baseSymbol, row };
    });
  }, [symbols, snapshots]);

  const sortedRows = useMemo(() => {
    if (sortOption === 'default') {
      return rows;
    }

    return rows
      .slice()
      .sort((a, b) => {
        const aValues = exchanges
          .map((exchange) => convertRate(a.row[exchange], targetHours))
          .filter((value): value is number => value !== null);
        const bValues = exchanges
          .map((exchange) => convertRate(b.row[exchange], targetHours))
          .filter((value): value is number => value !== null);

        const aMetric = getMetric(aValues, sortOption);
        const bMetric = getMetric(bValues, sortOption);

        if (aMetric === bMetric) {
          return symbols.indexOf(a.baseSymbol) - symbols.indexOf(b.baseSymbol);
        }

        return sortOption === 'highest' || sortOption === 'spread-desc'
          ? bMetric - aMetric
          : aMetric - bMetric;
      });
  }, [rows, exchanges, sortOption, symbols, targetHours]);

  const pagedRows = useMemo(() => sortedRows.slice(0, pageSize), [sortedRows, pageSize]);

  if (!snapshots.length || !exchanges.length) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 text-sm text-slate-400">
        No matching funding data.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/60 shadow">
      <div className="overflow-x-auto">
        <table className="min-w-full table-fixed border-separate border-spacing-y-2 px-6 pb-6">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
              <th className="w-28 px-6">Symbol</th>
              {exchanges.map((exchange) => (
                <th key={exchange} className="px-6">
                  {formatExchangeName(exchange)}
                </th>
              ))}
              <th
                className="w-32 cursor-pointer px-6 text-right text-slate-400 transition hover:text-emerald-300"
                onClick={onSpreadHeaderClick}
              >
                Spread ({HORIZON_LABELS[horizon]})
                {sortOption === 'spread-desc' ? ' ↓' : sortOption === 'spread-asc' ? ' ↑' : ''}
              </th>
            </tr>
          </thead>
          <tbody>
            {pagedRows.map(({ baseSymbol, row }) => (
              <tr
                key={baseSymbol}
                className="rounded-lg border border-slate-800 bg-slate-950/70 text-sm transition hover:bg-slate-900"
              >
                <td className="px-6 py-3 font-semibold text-slate-200">{baseSymbol}</td>
                {exchanges.map((exchange) => {
                  const snapshot = row[exchange];
                  const rate = convertRate(snapshot, targetHours);
                  const display = formatRate(rate);
                  const { textClass, backgroundStyle } = getRateStyles(rate);

                  return (
                    <td
                      key={`${baseSymbol}-${exchange}`}
                      className={`px-6 py-3 text-right font-mono tabular-nums text-sm transition ${textClass}`}
                      style={backgroundStyle}
                    >
                      {display}
                      <div className="text-xs text-slate-500">
                        {snapshot?.collectedAt ? new Date(snapshot.collectedAt).toLocaleTimeString() : ''}
                        {snapshot ? (
                          <div className="text-[10px] text-slate-600">{snapshot.symbol}</div>
                        ) : null}
                      </div>
                    </td>
                  );
                })}
                <SpreadCell row={row} exchanges={exchanges} targetHours={targetHours} />
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function getMetric(
  values: number[],
  sortOption: 'highest' | 'lowest' | 'spread-desc' | 'spread-asc'
) {
  if (!values.length) {
    if (sortOption === 'highest') return -Infinity;
    if (sortOption === 'lowest') return Infinity;
    if (sortOption === 'spread-desc') return -Infinity;
    return Infinity;
  }

  if (sortOption === 'spread-desc' || sortOption === 'spread-asc') {
    const max = Math.max(...values);
    const min = Math.min(...values);
    return max - min;
  }

  return sortOption === 'highest' ? Math.max(...values) : Math.min(...values);
}

function SpreadCell({
  row,
  exchanges,
  targetHours
}: {
  row: Record<string, Snapshot | undefined>;
  exchanges: string[];
  targetHours: number;
}) {
  const stats = useMemo(() => {
    const values = exchanges
      .map((exchange) => convertRate(row[exchange], targetHours))
      .filter((value): value is number => value !== null);

    if (values.length < 2) {
      return null;
    }

    let max = -Infinity;
    let min = Infinity;
    let maxExchange = '';
    let minExchange = '';

    exchanges.forEach((exchange) => {
      const value = convertRate(row[exchange], targetHours);
      if (value === null) return;
      if (value > max) {
        max = value;
        maxExchange = exchange;
      }
      if (value < min) {
        min = value;
        minExchange = exchange;
      }
    });

    return {
      spread: max - min,
      maxExchange,
      minExchange
    };
  }, [row, exchanges, targetHours]);

  if (!stats) {
    return <td className="px-6 py-3 text-right text-slate-500">--</td>;
  }

  const spreadPct = formatRate(stats.spread);

  return (
    <td className="px-6 py-3 text-right text-xs text-slate-200 font-mono tabular-nums">
      <div className="text-sm text-slate-100">{spreadPct}</div>
      <div className="text-[10px] text-slate-500">
        {formatExchangeName(stats.maxExchange)} – {formatExchangeName(stats.minExchange)}
      </div>
    </td>
  );
}

function getRateStyles(rate: number | null) {
  if (rate === null) {
    return { textClass: 'text-slate-400', backgroundStyle: {} };
  }

  const magnitude = Math.abs(rate);
  const normalized = Math.pow(Math.min(1, magnitude / 5), 0.6);
  const baseAlpha = 0.05;
  const alpha = (baseAlpha + normalized * 0.35).toFixed(3);

  if (rate > 0) {
    return {
      textClass: 'text-emerald-400',
      backgroundStyle: { backgroundColor: `rgba(16, 185, 129, ${alpha})` }
    };
  }

  if (rate < 0) {
    return {
      textClass: 'text-rose-400',
      backgroundStyle: { backgroundColor: `rgba(244, 63, 94, ${alpha})` }
    };
  }

  return { textClass: 'text-slate-400', backgroundStyle: {} };
}

function formatExchangeName(exchange: string) {
  switch (exchange.toLowerCase()) {
    case 'binance':
      return 'Binance';
    case 'bybit':
      return 'Bybit';
    case 'aster':
      return 'Aster';
    case 'paradex':
      return 'Paradex';
    case 'lighter':
      return 'Lighter';
    case 'edgex':
      return 'EdgeX';
    default:
      return exchange.charAt(0).toUpperCase() + exchange.slice(1);
  }
}

function convertRate(snapshot: Snapshot | undefined, targetHours: number): number | null {
  if (!snapshot) return null;
  const baseRate = snapshot.fundingRatePct;
  if (baseRate === undefined || baseRate === null) return null;
  const periodHours = snapshot.periodHours && snapshot.periodHours > 0 ? snapshot.periodHours : 8;
  if (!Number.isFinite(periodHours) || periodHours <= 0) {
    return baseRate;
  }
  const factor = targetHours / periodHours;
  return baseRate * factor;
}

function formatRate(rate: number | null): string {
  if (rate === null) return '--';
  const abs = Math.abs(rate);
  const formatter = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: abs >= 100 ? 1 : abs >= 10 ? 2 : 4,
    maximumFractionDigits: abs >= 100 ? 1 : abs >= 10 ? 2 : 4
  });
  return `${formatter.format(rate)}%`;
}
