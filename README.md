# EVPlus Funding Rate Platform

Initial scaffolding for the EVPlus Funding Rate working product. The repository follows a Turborepo-powered pnpm monorepo with dedicated apps and shared packages.

## Structure
- `apps/web` – Next.js client (App Router) for table, chart, and arbitrage UX.
- `apps/api` – Fastify-based API service exposing funding data endpoints.
- `packages/contracts` – Shared TypeScript/zod contracts consumed across services.
- `packages/connectors` – Exchange connector interface and stubs.
- `docs/` – Product specification, backlog, architecture outline & slides.

## Prerequisites
- Node.js ≥ 20.10.0 (`nvm use` reads from `.nvmrc`).
- pnpm ≥ 9 (`corepack prepare pnpm@9.6.0 --activate`).

## Quick Start
1. Install dependencies: `pnpm install`.
2. Copy `.env.example` to `.env.local`, fill in any secrets, then load variables with `set -a; source .env.local; set +a`.
   ```bash
   cp .env.example .env.local
   set -a; source .env.local; set +a
   ```
3. Run development servers:
   - Web: `pnpm dev --filter @evplus/web`
   - API: `pnpm dev --filter @evplus/api`
4. Execute tests: `pnpm test`.
5. Lint the repo: `pnpm lint`.

> API bootstraps an in-memory funding cache that refreshes every 120s (configurable via `FUNDING_REFRESH_INTERVAL_MS`). Configure `NEXT_PUBLIC_API_BASE_URL` (defaults to `http://localhost:4000`) so the web client can reach the local API. Exchange connectors still return stub data until real endpoints/credentials are provided.

### API Environment Variables

| Key | Description | Default |
| --- | --- | --- |
| `FUNDING_REFRESH_INTERVAL_MS` | Interval for automatic cache refreshes | `120000` |
| `FUNDING_HISTORY_SYMBOLS` | Comma-delimited symbols to prefetch history for | e.g. `BTC,BTCUSDT,BTC-USD-PERP` |
| `FUNDING_HISTORY_LOOKBACK_HOURS` | Lookback window (hours) when seeding history | `24` |
| `FUNDING_HISTORY_GRANULARITY_HOURS` | History granularity used during ingestion | `1` |
| `ASTER_BASE_URL` | Base URL for Aster connector | `https://fapi.asterdex.com` |
| `ASTER_API_KEY` | API key for Aster REST endpoints (`X-MBX-APIKEY`) | none |
| `PARADEX_BASE_URL` | Base URL for Paradex REST endpoints | `https://api.prod.paradex.trade` |
| `PARADEX_MARKETS` | Optional comma list of markets to monitor | _(blank = defaults to BTC/ETH perps)_ |
| `PARADEX_MAX_MARKETS` | Cap on markets fetched for latest snapshots | `300` |
| `LIGHTER_BASE_URL` | Base URL for Lighter funding API | `https://mainnet.zklighter.elliot.ai` |
| `HYPERLIQUID_BASE_URL` | Base URL for Hyperliquid API | `https://api.hyperliquid.xyz` |
| `EDGEX_BASE_URL` | Base URL for EdgeX API | `https://pro.edgex.exchange` |
| `EDGEX_MAX_CONTRACTS` | Cap on contracts fetched for latest snapshots | `200` |
| `EDGEX_CONTRACT_IDS` | Optional comma list of contract IDs to monitor | _(blank = defaults to core contracts)_ |

Refer to `docs/funding-rate-tech-spec.md` for the detailed roadmap and `docs/funding-rate-backlog.md` for the ticketized execution plan.
