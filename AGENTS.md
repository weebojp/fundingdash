# Repository Guidelines

## Project Structure & Module Organization
- This mono-repo is managed by pnpm/Turborepo. Runtime apps live in `apps/`: `apps/web` (Next.js client) and `apps/api` (Fastify service). Shared code resides under `packages/` (`connectors`, `contracts`, `config`, `ui`).
- Feature work should live with the consuming app (e.g., `apps/web/src/features/funding`) and only be promoted to `packages/` when reused across targets. Docs, specs, and runbooks belong in `docs/`.

## Build, Test, and Development Commands
- `pnpm install` — install workspace dependencies (Node ≥ 20.10). Run once after cloning.
- `pnpm dev --filter @evplus/web` / `pnpm dev --filter @evplus/api` — start the web client or API with hot reload; ensure `.env.local` is sourced first.
- `pnpm build` — run production builds for every package; useful before deployment.
- `pnpm test` and `pnpm lint` — execute Vitest suites and ESLint+Prettier checks across the repo. Add `--filter <package>` for tight iteration.

## Coding Style & Naming Conventions
- TypeScript everywhere, ES modules, 2-space indentation. Components/hooks use `PascalCase.tsx`/`useCamelCase.ts`, utilities in `camelCase.ts`, constants in `SCREAMING_SNAKE_CASE`.
- Formatting is enforced by the shared ESLint/Prettier config in `packages/config`. Fix or annotate lint violations before review. Tailwind is the default styling approach in `apps/web`.

## Testing Guidelines
- Unit and integration tests run on Vitest. Co-locate tests beside implementation (`Component.test.tsx`, `service.test.ts`). Connector suites live under `packages/connectors/__tests__`.
- Aim for ≥80% coverage on shared packages (`connectors`, `contracts`) and add smoke tests for new exchanges/endpoints. Use `pnpm test --filter @evplus/connectors` for targeted runs.

## Commit & Pull Request Guidelines
- Follow Conventional Commits (`feat:`, `fix:`, `chore:`). Keep subjects ≤72 characters and group related changes per commit.
- PRs must include context (problem/solution), test evidence, linked tickets, and screenshots or terminal output for UX/API changes. Ensure CI (lint, test, build) is green before requesting review.

## Configuration & Security Notes
- Copy `.env.example` to `.env.local`, fill secrets, then `set -a; source .env.local; set +a` before running dev servers. Never commit secrets; rely on deployment secret stores.
- Review third-party API terms before enabling new connectors and document required keys in `docs/env-setup.md` when onboarding a venue.
