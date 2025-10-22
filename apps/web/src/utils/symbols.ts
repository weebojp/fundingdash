const SYMBOL_SUFFIXES_RAW = ['USDTPERP', 'USDPERP', 'USDCPERP', 'USDT', 'USDC', 'USD', 'PERP'];
const SYMBOL_SUFFIXES = SYMBOL_SUFFIXES_RAW.sort((a, b) => b.length - a.length);

const SYMBOL_PREFIXES = ['1000', '1'];

const ALIAS_MAP: Record<string, string> = {
  XBT: 'BTC',
  WLD: 'WLD',
  '2Z': '2Z'
};

export function normalizeSymbol(symbol: string): string {
  let clean = symbol.replace(/[^A-Z0-9]/gi, '').toUpperCase();

  for (const prefix of SYMBOL_PREFIXES) {
    if (clean.startsWith(prefix) && clean.length > prefix.length) {
      clean = clean.slice(prefix.length);
      break;
    }
  }

  let removed = true;
  while (removed) {
    removed = false;
    for (const suffix of SYMBOL_SUFFIXES) {
      if (clean.endsWith(suffix) && clean.length > suffix.length) {
        clean = clean.slice(0, -suffix.length);
        removed = true;
        break;
      }
    }
  }

  clean = clean.replace(/[0-9]+$/, '');

  if (ALIAS_MAP[clean]) {
    return ALIAS_MAP[clean];
  }

  return clean || symbol.toUpperCase();
}

export function formatSymbolForDisplay(symbol: string): string {
  const base = normalizeSymbol(symbol);
  return base || symbol;
}
