import { useMemo, useState } from 'react';

type Props = {
  majorSymbols: string[];
  otherSymbols: string[];
  activeSymbol: string | null;
  onSymbolChange: (symbol: string | null) => void;
  exchanges: string[];
  activeExchanges: string[];
  onToggleExchange: (exchange: string) => void;
};

export function FundingFilters({
  majorSymbols,
  otherSymbols,
  activeSymbol,
  onSymbolChange,
  exchanges,
  activeExchanges,
  onToggleExchange
}: Props) {
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const filteredOthers = useMemo(() => {
    if (!search) return otherSymbols;
    const term = search.toUpperCase();
    return otherSymbols.filter((symbol) => symbol.toUpperCase().includes(term));
  }, [otherSymbols, search]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => onSymbolChange(null)}
          className={`rounded-full px-3 py-1 text-xs font-medium transition ${
            activeSymbol === null
              ? 'bg-emerald-500/20 text-emerald-300'
              : 'bg-slate-800 text-slate-300 hover:bg-slate-750'
          }`}
        >
          All Assets
        </button>
        {majorSymbols.map((symbol) => (
          <button
            key={symbol}
            onClick={() => onSymbolChange(symbol)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition ${
              activeSymbol === symbol
                ? 'bg-emerald-500/20 text-emerald-300'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-750'
            }`}
          >
            {symbol}
          </button>
        ))}
        {otherSymbols.length > 0 ? (
          <div className="relative">
            <input
              type="text"
              value={search}
              onFocus={() => setIsOpen(true)}
              onBlur={() => setTimeout(() => setIsOpen(false), 100)}
              onChange={(event) => {
                setSearch(event.target.value);
                setIsOpen(true);
              }}
              placeholder="Search assets"
              className="rounded-md border border-slate-700 bg-slate-950 px-3 py-1 text-xs text-slate-100 transition focus:border-emerald-500 focus:outline-none"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-1 top-1 text-slate-500 hover:text-slate-300"
              >
                ×
              </button>
            )}
            {(isOpen || search) && (
              <div className="absolute z-10 mt-1 max-h-48 min-w-[160px] overflow-y-auto rounded-md border border-slate-700 bg-slate-900 py-1 shadow-lg">
                {(filteredOthers.length ? filteredOthers : otherSymbols).map((symbol) => (
                  <button
                    key={symbol}
                    onClick={() => {
                      onSymbolChange(symbol);
                      setSearch('');
                      setIsOpen(false);
                    }}
                    className="block w-full px-3 py-1 text-left text-xs text-slate-200 hover:bg-slate-800"
                  >
                    {symbol}
                  </button>
                ))}
                {filteredOthers.length === 0 && otherSymbols.length === 0 ? (
                  <div className="px-3 py-1 text-xs text-slate-500">No matches</div>
                ) : null}
              </div>
            )}
          </div>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {exchanges.map((exchange) => {
          const active = activeExchanges.includes(exchange);
          return (
            <button
              key={exchange}
              onClick={() => onToggleExchange(exchange)}
              className={`rounded-md px-3 py-1 text-xs transition ${
                active
                  ? 'bg-slate-800 text-slate-100'
                  : 'bg-slate-900 text-slate-400 hover:bg-slate-800'
              }`}
            >
              {formatExchangeName(exchange)}
            </button>
          );
        })}
      </div>
    </div>
  );
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
