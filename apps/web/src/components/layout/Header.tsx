import type { ReactNode } from 'react';

type HeaderProps = {
  lastUpdated?: string | null;
  activeVenues?: number;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  refreshIntervalSeconds?: number;
  controls?: ReactNode;
};

export function Header({
  lastUpdated,
  activeVenues = 0,
  onRefresh,
  isRefreshing,
  refreshIntervalSeconds = 120,
  controls
}: HeaderProps) {
  const formattedUpdated = lastUpdated
    ? new Date(lastUpdated).toLocaleString()
    : 'Waiting for data';

  return (
    <header className="flex flex-col gap-6 border-b border-slate-800 pb-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold tracking-tight text-slate-50">
            Funding Rate Monitor
          </h1>
          <p className="max-w-xl text-sm text-slate-400">
            Track perpetual funding rates across top venues. Compare spreads, spot arbitrage opportunities, and keep an eye on market sentiment in near real time.
          </p>
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
            <Badge label="Last refreshed" value={formattedUpdated} />
            <Badge label="Active venues" value={activeVenues.toString()} />
            {onRefresh ? (
              <button
                onClick={onRefresh}
                className="flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs font-medium text-emerald-300 transition hover:border-emerald-500 hover:bg-emerald-500/10"
                disabled={isRefreshing}
              >
                {isRefreshing ? 'Refreshing…' : 'Refresh now'}
              </button>
            ) : null}
            <span className="rounded-full border border-slate-800 px-3 py-1 text-slate-500">
              Auto refresh: {refreshIntervalSeconds / 60} min
            </span>
          </div>
        </div>
        {controls ? (
          <div className="flex w-full flex-col gap-3 rounded-xl border border-slate-800 bg-slate-900/40 p-4 lg:max-w-sm">
            {controls}
          </div>
        ) : null}
      </div>
    </header>
  );
}

function Badge({ label, value }: { label: string; value: string }) {
  return (
    <span className="flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900 px-3 py-1">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium text-slate-200">{value}</span>
    </span>
  );
}
