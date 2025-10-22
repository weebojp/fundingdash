# EVPlus Funding Rate Monitor – Technical Specification

## 1. Purpose & Context
The EVPlus "Funding Rate" page must evolve into a resilient product that surfaces near-real-time funding opportunities across emerging DEXs. This specification translates the gathered requirements into an actionable blueprint for engineering, design, and operations teams, targeting an MVP launch followed by rapid feature maturation.

## 2. Product Goals
- **Single Source of Truth:** Provide a unified, normalized feed of perps funding rates across the six target exchanges within 150 seconds of source publication.
- **Insightful Analysis:** Allow power users to identify trends and arbitrage spreads through comparative tables, interactive charts, and automated recommendations.
- **Operational Reliability:** Maintain ≥99% monthly API uptime and automated alerting for data staleness or connector failures.

## 3. Scope
- **In Scope:** data ingestion services, normalized storage, public APIs consumed by the EVPlus web client, Funding Rate UI (table, filters, chart, arbitrage banner), theming, responsive layouts, observability, QA automation.
- **Out of Scope (Phase 1):** user-auth personalisation, alert subscriptions, order execution integrations, paid-tier analytics, mobile native apps.

## 4. Stakeholders & Users
- **Primary Users:** crypto traders seeking funding arbitrage, EVFarm strategists.
- **Internal Stakeholders:** Data Platform squad (connectors), Frontend squad, Product/UX, QA, DevOps/SRE, compliance for data licensing.

## 5. Functional Requirements
1. **Funding Snapshot Table**
   - Display symbols × exchanges matrix with sortable columns and inline filters (text + exchange toggles).
   - Positive/negative coloring (configurable palette meeting accessibility guidelines).
   - Freshness badge showing timestamp of last successful ingest per dataset.
2. **Symbol Controls**
   - Dropdown for per-symbol drilldown plus "All" view; search-as-you-type across supported tickers.
3. **Auto Refresh**
   - Client refresh cadence default 120s; manual refresh button with optimistic UI.
4. **Time-Series Chart**
   - Presets: 24h, 7d, 30d; granularities: 1h, 4h, 1d (auto-tuned to range).
   - Multiple exchange series with legend toggles; zero baseline highlight and hover tooltips.
5. **Arbitrage Suggestions**
   - Identify top N exchange pairs for long/short carry spreads. Include estimated net APR, assumptions, and disclaimers.
6. **Theme Toggle & Responsiveness**
   - Persisted light/dark theme, mobile-first layout (table collapses to cards under 768px).
7. **Exchange Coverage**
   - MVP: Hyperliquid, Aster, Paradex. Post-MVP: Lighter, Pacifica, Extended.

## 6. Non-Functional Requirements
- **Performance:** Page LCP < 2.5s on 3G Fast; interactive filter response < 300ms; chart updates smooth at ≤1k points.
- **Scalability:** Connector architecture extensible for new exchanges with ≤2 days integration effort.
- **Reliability:** Data staleness alerts triggered if no update >3 minutes; automated retries with exponential backoff.
- **Security:** All services behind HTTPS; secrets managed via environment vault; user inputs sanitized.
- **Observability:** Centralized structured logging, metrics (latency, error rate, staleness), tracing hooks.

## 7. System Architecture Overview
- **Frontend:** Next.js (App Router) + TypeScript + Tailwind; data fetching via SWR with polling + revalidate-on-focus; charting with Recharts (Canvas fallback for performance). Theme and layout components reside in `apps/web`.
- **Backend/API:** Next.js API routes (or standalone Fastify service) running on Node 20. Provides REST endpoints `/api/funding/latest`, `/api/funding/history`, `/api/funding/arbitrage`.
- **Data Ingestion:** Dedicated worker service (Node 20, BullMQ) pulling exchange APIs/WebSockets, normalizing and persisting snapshots.
- **Storage:**
  - Redis (Elasticache) for latest snapshot cache + distributed locks.
  - Postgres + Timescale extension for historical series (1h buckets) and auditing.
- **Message Queue:** Redis streams or BullMQ to orchestrate ingest jobs and manage retries.
- **Infra:** Containerized deployment (Docker) orchestrated via AWS ECS Fargate or Kubernetes; separate staging/prod clusters.

```
[Exchange APIs] -> [Connector Workers] -> [Normalizer] -> [Redis Cache] -> [TimescaleDB]
                                                  |-> [API Service] -> [Next.js Frontend]
                                                  |-> [Arbitrage Engine]
```

## 8. Data Contracts
| Entity | Fields | Notes |
| --- | --- | --- |
| `FundingSnapshot` | `symbol`, `exchange`, `fundingRatePct`, `periodHours`, `markPrice`, `collectedAt`, `nextFundingAt` | Primary payload served to table. `fundingRatePct` normalized to percent per funding interval.
| `FundingHistoryPoint` | `symbol`, `exchange`, `bucketStart`, `bucketDuration`, `avgFundingRatePct`, `max`, `min`, `sourceCount` | Pre-bucketed for charting; derived at ingest time.
| `ArbitrageOpportunity` | `symbol`, `longExchange`, `shortExchange`, `spreadPct`, `estimatedDailyAPR`, `lastUpdated`, `assumptions` | `assumptions` includes notional and fees baseline.

All contracts maintained in `packages/contracts` with zod schemas; API returns camelCase JSON.

## 9. Exchange Connector Requirements
- **Common Interface:** `fetchLatest(): FundingSnapshot[]`, `fetchHistory(symbol, from, to): FundingHistoryPoint[]`.
- **Protocols:** Support REST polling (Hyperliquid, Extended, Paradex) and WebSocket streaming (Aster, Lighter, Pacifica). WebSocket connectors maintain in-memory last-known state and flush every minute.
- **Rate Limiting:** Respect per-exchange quotas; use `bottleneck` for throttling; exponential backoff + jitter on failure.
- **Secrets:** API keys stored per environment; connectors fail fast if keys missing.

## 10. API Design
- `GET /api/funding/latest?symbols=BTC,ETH&exchanges=aster,hyperliquid`
  - Response: `{ updatedAt, snapshots: FundingSnapshot[] }`
  - Cache-Control: `max-age=30, stale-while-revalidate=60`.
- `GET /api/funding/history?symbol=BTC&range=7d&granularity=1h`
  - Response: `{ symbol, range, granularity, points: FundingHistoryPoint[] }`.
- `GET /api/funding/arbitrage?limit=5`
  - Response: `{ generatedAt, opportunities: ArbitrageOpportunity[] }`.
- All endpoints return 5xx on upstream failure with `X-Debug-Id` header for traceability.

## 11. Arbitrage Engine Logic
1. Group latest snapshots by symbol.
2. Compute pairwise spreads across exchanges.
3. Adjust for funding interval differences (convert to daily APR) and estimated taker fees.
4. Rank by net positive APR; filter by liquidity threshold (min mark price × assumed notional) and configurable minimum spread (default 0.02% per day).
5. Surface top N with disclaimers; log raw calculations for audits.

## 12. Testing Strategy
- **Unit Tests:** connectors (mocked responses), normalization utilities, arbitrage calculations (Vitest).
- **Integration Tests:** end-to-end ingest using recorded fixtures; API contract tests with Pact.
- **UI Tests:** Playwright coverage for table interactions, filters, chart toggles, theme switch.
- **Load Tests:** k6 scenario hitting `/api/funding/latest` at 100 RPS to verify caching and DB performance.

## 13. Observability & Alerts
- Metrics via Prometheus (or CloudWatch): ingest latency, API response time, cache hit ratio, staleness gauge.
- Alerts: Slack/PagerDuty if ingest lag >3 min, error rate >5% over 5 min, Redis memory >80%.
- Structured logs (pino) with correlation IDs; traces exported to OpenTelemetry collector.

## 14. Deployment Plan
- CI pipeline (GitHub Actions): lint → test → build → dockerize → deploy to staging (manual approval) → prod.
- Blue/green or canary deploy for API layer to avoid downtime.
- Feature flags via LaunchDarkly (or simple env toggles) for Phase 3 features (chart, arbitrage) to allow gradual rollout.

## 15. Timeline & Milestones
- **Week 0:** Spec sign-off, environment provisioning.
- **Weeks 1-2:** Phase 0/1 (scaffolding + first three connectors + latest snapshot API).
- **Week 3:** Phase 2 UI MVP live on staging for stakeholder review.
- **Week 4-5:** Phase 3 analytics + arbitrage rolled to staging; run usability testing.
- **Week 6:** Production launch of MVP; begin Phase 4 exchange expansion.

## 16. Risks & Mitigations
- **API Instability:** implement circuit breakers + fallbacks; maintain cached last-known-good data.
- **Scope Creep:** enforce phased roadmap, require PM approval for new features outside MVP.
- **Performance Regressions:** integrate Lighthouse and k6 checks into CI.
- **Licensing Constraints:** confirm ToS compliance with each exchange ahead of prod launch.

## 17. Open Questions
- Do we require authenticated access for advanced analytics (gating)?
- Are fee structures per exchange readily available for precise arbitrage APR calculations?
- Should we expose WebSocket streaming to clients post-MVP?

## 18. Approval
- **Sign-off Owners:** Product (PM), Engineering Lead, Data Platform Lead, Design, Compliance.
- Once approved, convert phases into tracked epics within the project management tool (Linear/Jira) and commence Phase 0.
