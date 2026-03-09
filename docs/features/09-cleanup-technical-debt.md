# Cleanup Technical Debt Backlog

Purpose: central backlog for technical debt that is not owned by a single feature slice.

## Prioritized Debt Items

| Debt Item | Impact | Evidence | Severity (P0-P3) | Proposed Fix | Owner | Target Milestone |
| --- | --- | --- | --- | --- | --- | --- |
| Client/server contract mismatch for users API | Frontend can call endpoints that backend does not implement, causing broken paths and false confidence in API surface | `libs/client/server-communication/src/lib/users.api.ts`; no matching users controller in `apps/api/src` or `libs/server/*` | P0 | Either implement `/users` backend contract now or remove/deprecate the client users slice until server support exists | Platform + API | Milestone 1 (before poll slices) |
| Test coverage imbalance | High regression risk for poll/vote/realtime releases | Auth tests are strong (`apps/client/src/app/app.spec.tsx`, `libs/server/auth/src/lib/*.spec.ts`), while e2e is template-level (`apps/api-e2e/src/api/api.spec.ts`, `apps/client-e2e/src/example.spec.ts`) | P0 | Add vertical-slice integration/e2e suites for poll create/share/vote/realtime/results/user-insights/user-stats/notifications/llm-insights | QA + Feature Teams | Milestone 1-2 |
| Multi-database wiring inconsistency | Increased runtime/config complexity and unclear persistence source of truth | `apps/api/src/app/app.module.ts` configures TypeORM + Mongoose + Redis while auth flows use Prisma via `libs/server/data-access/src/lib/prisma.module.ts` | P1 | Standardize active v1 data path (Prisma + Redis), remove unused DB modules from runtime wiring or explicitly document phased usage | API Architecture | Milestone 1 |
| Stale/generic docs with old workspace references | Onboarding confusion and wrong commands/paths during implementation | Example docs reference old workspace labels and template content: `docs/01-PROJECT-OVERVIEW.md`, `docs/14-API-DOCUMENTATION.md`, others | P1 | Refresh docs to SnapVote-specific architecture and paths (`C:\Dev\SnapVote`), archive template sections | DX/Docs | Milestone 1 |
| Nx/project config inconsistencies | Tooling discovery and maintenance risk due incorrect metadata | `apps/client/project.json` has `sourceRoot: "client/src"`; `apps/client-e2e/project.json` has `sourceRoot: "client-e2e/src"` | P1 | Normalize `sourceRoot` values to actual paths under `apps/*`, verify with Nx project inspection and CI checks | Build/Infra | Milestone 1 |
| Vote privacy model undefined for transparent user-level visibility | Risk of exposing sensitive user preference data and inconsistent UX expectations | New planned features 10/11/12/13 require user-level vote views; no policy contract exists yet | P1 | Define explicit visibility modes (`transparent`, `anonymous`) and enforce by policy at API + UI layers | Product + Security + API | Milestone 1 |
| Theme/category taxonomy not defined | Inconsistent filters and low-quality analytics outputs | Feature 11 depends on theme/category filters (e.g. `relationship`, `anime`, `movies`) but no schema/model currently exists | P1 | Introduce controlled taxonomy model + seed themes + migration/backfill rules; define theme/category alias contract | Product + Data + API | Milestone 1-2 |
| Notification delivery reliability not defined | Users may miss or receive duplicate real-time vote notifications | Feature 14 introduces live notifications without existing notification domain or durable event pipeline | P1 | Introduce notification model + outbox/dedupe strategy + read-state contract (`Notification*Dto`) | Platform + Realtime + API | Milestone 1-2 |
| LLM insight safety/compliance model missing | Risk of hallucinated conclusions, biased regional claims, or sensitive data leakage | Feature 15 introduces external LLM-generated narratives without existing prompt governance/safety pipeline | P1 | Enforce structured aggregate-only inputs, sample-size thresholds, prompt/version audit logs, and mandatory caveats/confidence labels | AI + Security + Data + API | Milestone 2 |
| Analytics computation strategy absent | Alignment/outstanding rankings may become expensive and unstable | Feature 12 introduces cross-user ranking endpoints with no compute/caching plan today | P1 | Define async aggregation + cache refresh schedule + algorithm versioning | Data/Platform | Milestone 2 |
| User stats aggregation contract missing | Stats page may show inconsistent numbers across screens | Feature 13 requires shared metric definitions across explorer, insights, and profile stats | P1 | Create canonical metric dictionary (`UserStats*Dto`) and central aggregation service | Product Analytics + API | Milestone 2 |
| Unused scaffold libraries/components | Noise in project graph and long-term maintenance burden | Template-like libs/components exist with minimal product usage: `libs/client/ui/src/lib/ui.tsx`, `libs/server/shared/src/lib/shared-utils.ts`, `libs/client/loggedin-user/*` | P2 | Decide keep/adopt/remove per package; prune dead scaffolds or integrate intentionally into product architecture | Platform + Feature Leads | Milestone 2 |

## Execution Notes

1. P0 and P1 items should be addressed before or during feature 02-05 implementation to reduce rework.
2. For features 10-15, privacy mode and theme/category taxonomy are blocking dependencies.
3. For feature 14, durable notification delivery + dedupe is a release blocker.
4. For feature 15, guardrails for LLM outputs and regional claims are release blockers.
5. Keep this file updated per milestone with status markers (`Open`, `In Progress`, `Done`).
6. When a debt item becomes feature-owned, move it into that feature doc and leave a backlink here.
