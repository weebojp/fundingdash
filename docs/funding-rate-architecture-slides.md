# EVPlus Funding Rate Monitor

---
## Objectives
- Validate end-to-end architecture for Funding Rate product.
- Confirm MVP exchange scope, SLAs, and monitoring approach.
- Capture open questions requiring leadership decisions.

---
## Product Goals & KPIs
- Unified funding snapshot across 6 DEXs <150s latency.
- Insight tooling: sortable matrix, interactive chart, arbitrage insights.
- Reliability: ≥99% API uptime, auto alerting on data staleness.

---
## User Journeys
1. Trader scans table to spot extreme funding rates.
2. Analyst explores 7d trend via chart and granularity toggle.
3. EVFarm strategist checks arbitrage banner for daily spread.

---
## System Architecture
- Connectors ingest from exchanges → Normalize → Redis cache / TimescaleDB.
- API service (Next.js / Fastify) serves latest, history, arbitrage endpoints.
- Web client (Next.js) polls APIs, renders table, chart, insights.

```
[DEX APIs] -> [Connector Workers] -> [Normalizer] -> [Redis]
                                      |-> [Timescale] -> [Arbitrage Engine]
                                      |-> [API Service] -> [Next.js UI]
```

---
## Data Pipeline Details
- REST polling (Hyperliquid, Paradex, Extended) every 120s.
- WebSocket streaming (Aster, Lighter, Pacifica) with 60s flush.
- Normalization converts to % per funding interval, annotates timestamps.
- BullMQ orchestrates jobs, retries with backoff.

---
## Storage Strategy
- Redis: latest snapshot cache, distributed locks, pub/sub for API invalidation.
- TimescaleDB: 1h/4h/1d buckets, 30-day retention, downsampled archive.
- Backups nightly; staging/prod isolated.

---
## API Surface
- `GET /api/funding/latest` filtered by symbols/exchanges.
- `GET /api/funding/history` with range + granularity params.
- `GET /api/funding/arbitrage` returning ranked spreads.
- Response schemas guarded by zod; cache-control tuned for 30s.

---
## Frontend Implementation
- Next.js App Router, SWR polling (120s) with manual refresh.
- Funding table: sortable columns, exchange toggles, color coding, freshness badge.
- Chart: Recharts, presets (24h/7d/30d), granularity toggle, legend filters.
- Theme toggle persisted; responsive layout for mobile.

---
## Arbitrage Engine
- Compute pairwise spreads, normalize APR, subtract fees.
- Threshold filters (min spread 0.02% daily, liquidity guardrails).
- Outputs top N opportunities + disclaimers; robust logging for audits.

---
## Observability & Ops
- Metrics: ingest latency, API error rate, staleness gauge.
- Alerts: Slack/PagerDuty on lag >3m, error >5%, Redis >80% memory.
- CI/CD: lint → test → build → dockerize → deploy (staging, prod approval).

---
## Risks & Mitigations
- Exchange API volatility → circuit breakers, cached fallbacks.
- Fee data uncertainty → validation spike, manual overrides.
- Performance regression → Lighthouse & k6 in CI.
- Compliance/ToS constraints → legal review before Phase 4.

---
## Open Questions
- Need for authenticated tiers or public access?
- Source of reliable fee schedules per exchange?
- WebSocket fan-out to clients post-MVP?

---
## Next Steps
1. Collect feedback on spec + architecture by Friday EOD.
2. Finalize API access agreements (Hyperliquid, Aster, Paradex) next week.
3. Kick off Phase 0/1 epics pending approvals.
