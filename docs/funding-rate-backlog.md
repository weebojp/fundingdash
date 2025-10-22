# Funding Rate Monitor – Backlog Breakdown

## Phase 0 – Foundations
- **Epic:** Repository & Tooling Setup
  - `ENG-FRM-001` Scaffolding: bootstrap pnpm monorepo (`apps/web`, `apps/api`, `packages/shared`) – *Owner:* Frontend Eng Lead – *Estimate:* 3d
  - `ENG-FRM-002` CI Pipeline: lint/test/build GitHub Action + cache config – *Owner:* DevOps – *Estimate:* 2d
  - `ENG-FRM-003` Contracts Package: define TypeScript models + zod schemas – *Owner:* Fullstack Eng – *Estimate:* 2d
  - `ENG-FRM-004` Observability Plumbing: pino logger, OTEL stubs, `.env.example` – *Owner:* Platform Eng – *Estimate:* 2d
  - `QA-FRM-001` QA Harness: seed Playwright + Vitest baseline suites – *Owner:* QA Lead – *Estimate:* 2d

## Phase 1 – Data Ingestion MVP
- **Epic:** Core Connectors & Storage
  - `DATA-FRM-010` Hyperliquid Connector (REST polling) + fixtures – *Owner:* Data Eng – *Estimate:* 4d
  - `DATA-FRM-011` Aster Connector (WebSocket) + buffering – *Owner:* Data Eng – *Estimate:* 5d
  - `DATA-FRM-012` Paradex Connector (REST) – *Owner:* Data Eng – *Estimate:* 3d
  - `DATA-FRM-013` Normalization Library (percent per interval) – *Owner:* Data Eng – *Estimate:* 2d
  - `DATA-FRM-014` Timescale schema + migrations (snapshot/history) – *Owner:* Data Eng – *Estimate:* 3d
  - `DATA-FRM-015` Redis cache & BullMQ scheduler (120s cadence) – *Owner:* Platform Eng – *Estimate:* 3d
  - `QA-FRM-010` Connector integration tests (record/replay) – *Owner:* QA – *Estimate:* 3d
  - `OPS-FRM-010` Staging infra provisioning (Redis, Postgres, secrets) – *Owner:* DevOps – *Estimate:* 3d

## Phase 2 – UI MVP
- **Epic:** Funding Table & Controls
  - `WEB-FRM-020` Layout shell + navigation hookup – *Owner:* Frontend Eng – *Estimate:* 2d
  - `WEB-FRM-021` FundingTable component (sortable columns, color coding) – *Owner:* Frontend Eng – *Estimate:* 4d
  - `WEB-FRM-022` Symbol selector + exchange filter UI – *Owner:* Frontend Eng – *Estimate:* 3d
  - `WEB-FRM-023` Data hooks (SWR polling, error states) – *Owner:* Frontend Eng – *Estimate:* 3d
  - `WEB-FRM-024` Freshness indicator + manual refresh control – *Owner:* Frontend Eng – *Estimate:* 2d
  - `WEB-FRM-025` Theme toggle + responsive breakpoints – *Owner:* Frontend Eng – *Estimate:* 3d
  - `QA-FRM-020` UI regression tests (Playwright) – *Owner:* QA – *Estimate:* 3d
  - `DES-FRM-020` Design QA & accessibility audit – *Owner:* Product Designer – *Estimate:* 2d

## Phase 3 – Analytics & Insights
- **Epic:** Charting & Arbitrage
  - `DATA-FRM-030` History aggregation service (1h/4h/1d buckets) – *Owner:* Data Eng – *Estimate:* 4d
  - `WEB-FRM-030` FundingChart component with range/granularity controls – *Owner:* Frontend Eng – *Estimate:* 5d
  - `DATA-FRM-031` Arbitrage engine (spread calc, fee model) – *Owner:* Data Eng – *Estimate:* 5d
  - `WEB-FRM-031` Arbitrage banner/card UI – *Owner:* Frontend Eng – *Estimate:* 3d
  - `DATA-FRM-032` `/api/funding/arbitrage` endpoint – *Owner:* Fullstack Eng – *Estimate:* 2d
  - `QA-FRM-030` Scenario tests validating arbitrage accuracy – *Owner:* QA – *Estimate:* 3d
  - `OPS-FRM-030` Monitoring dashboards (latency, staleness) – *Owner:* DevOps – *Estimate:* 3d

## Phase 4 – Expansion & Hardening
- **Epic:** Exchange Rollout & Reliability
  - `DATA-FRM-040` Lighter connector (WS) – *Owner:* Data Eng – *Estimate:* 4d
  - `DATA-FRM-041` Pacifica connector (REST polling) – *Owner:* Data Eng – *Estimate:* 4d
  - `DATA-FRM-042` Extended connector (REST authenticated) – *Owner:* Data Eng – *Estimate:* 4d
  - `OPS-FRM-040` Alerting rules (PagerDuty + Slack) – *Owner:* DevOps – *Estimate:* 2d
  - `WEB-FRM-040` WebSocket fan-out experiment (feature flag) – *Owner:* Frontend Eng – *Estimate:* 4d
  - `PM-FRM-040` Localization + copy audit backlog – *Owner:* PM – *Estimate:* 2d
  - `QA-FRM-040` Load/perf test plan (k6, Lighthouse) – *Owner:* QA – *Estimate:* 3d

## Cross-Cutting
- **Product/UX**
  - `PM-FRM-001` Requirement sign-off & milestone tracking – *Owner:* PM – *Estimate:* ongoing
  - `DES-FRM-001` UX wireframes & component specs – *Owner:* Product Designer – *Estimate:* 5d upfront
- **Compliance**
  - `COM-FRM-001` Exchange ToS/licensing review – *Owner:* Legal/Compliance – *Estimate:* 4d

> Estimates are ideal working days; adjust after backlog grooming. Sequence tasks by phase but allow parallelism where dependencies permit (e.g., UI work can leverage mock APIs once contracts are finalized).
