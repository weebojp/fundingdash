# Funding Rate Monitor – Architecture Review Outline

## Meeting Details
- **Audience:** Product, Engineering Leads (Data, Frontend, Platform), QA, DevOps, Compliance
- **Duration:** 45 minutes (30 presentation + 15 Q&A)
- **Objective:** Align stakeholders on system architecture, confirm scope assumptions, unlock Phase 0 start.

## Agenda
1. **Welcome & Goals (3 min)**
   - Recap product vision and decision requests for the session.
2. **User & Product Requirements (5 min)**
   - Key user journeys (table scan, chart analysis, arbitrage insight).
   - Success metrics (freshness SLA, uptime, interaction latency).
3. **System Architecture Overview (10 min)**
   - High-level diagram: exchange connectors → normalization → storage → API → UI.
   - Deployment topology (staging/prod, ECS/K8s, networking).
4. **Data Pipeline Deep Dive (8 min)**
   - Connector patterns (REST vs WebSocket, retry, throttling).
   - Data schemas (`FundingSnapshot`, `FundingHistoryPoint`, `ArbitrageOpportunity`).
   - Persistence strategy (Redis cache + TimescaleDB) and retention policy.
5. **Frontend Application (6 min)**
   - Next.js structure, data fetching strategy (SWR polling), charting stack.
   - UX considerations: responsiveness, accessibility, theming.
6. **Arbitrage Engine & Analytics (5 min)**
   - Calculation flow, fee modelling assumptions, risk mitigation.
7. **Observability & Ops (4 min)**
   - Logging, metrics, alerting, CI/CD pipeline.
8. **Risks & Open Questions (2 min)**
   - API access, fee data sourcing, WebSocket roadmap, compliance items.
9. **Next Steps & Approvals (2 min)**
   - Action items, owners, timeline to green-light Phase 0.

## Slide Outline
- Title & Objectives
- Product Goals + KPIs
- Architecture Diagram (overall)
- Connector Flow & Data Contracts
- Storage & Scaling Strategy
- API Interfaces
- Frontend UX & Tech Stack
- Arbitrage Engine Logic Snapshot
- Observability & Deployment
- Risks / Mitigations / Open Questions
- Action Items & Timeline

## Pre-Read & Appendices
- Link to [Technical Specification](./funding-rate-tech-spec.md)
- Backlog breakdown (Phase epics & tickets)
- Optional: mocked FundingSnapshot JSON example, chart mockups.

## Required Decisions
- Approval of proposed architecture and stack choices.
- Confirmation of MVP exchange list & timeline.
- Agreement on performance SLAs and monitoring strategy.

## Post-Meeting Actions
- Incorporate feedback into spec (owner: PM).
- Set up project board with approved tickets (owner: PM/Eng Leads).
- Kick off Phase 0 tasks upon sign-off.
