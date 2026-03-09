# Current State and Cross-Cutting Technical Debt

## Repo Reality Snapshot

This snapshot is based on the current code in `C:\Dev\SnapVote`.

### Implemented Baseline

- Auth endpoints are implemented in `libs/server/auth/src/lib/auth.controller.ts`.
- Auth service and session/recovery logic are implemented in `libs/server/auth/src/lib/auth.service.ts`.
- Auth UI flows are implemented in `apps/client/src/app/app.tsx`.
- Auth API hooks are implemented in `libs/client/server-communication/src/lib/auth.api.ts`.
- Request telemetry interceptor/service are implemented in `apps/api/src/app/telemetry/*`.
- Session/bootstrap state handling is implemented in the client route shell (`apps/client/src/app/app.tsx`).

### Not Yet Implemented

- No poll domain models in `prisma/schema.prisma`.
- No poll/vote endpoints in `apps/api` or `libs/server/*`.
- No poll/voting UI routes/components in `apps/client/src`.
- No realtime poll-result stream endpoint.

## Cross-Cutting Technical Debt

### 1) Client/Server API Contract Drift

- Client includes a users RTK Query slice (`libs/client/server-communication/src/lib/users.api.ts`).
- Server currently exposes auth + root hello route only.
- Result: frontend API surface suggests capabilities not backed by server contracts.

### 2) Mixed and Partially Unused Data-Layer Wiring

- `apps/api/src/app/app.module.ts` configures Prisma-adjacent code plus TypeORM and Mongoose.
- Active auth/recovery paths use Prisma (`@libs/server-data-access` -> `prisma.module.ts`).
- Result: unnecessary runtime/config complexity and unclear source of truth for persistence.

### 3) Documentation Drift

- Some docs still reference old workspace labels and template content (`docs/01-PROJECT-OVERVIEW.md`, `docs/14-API-DOCUMENTATION.md`, and others).
- Result: onboarding confusion and lower trust in docs.

### 4) Nx Project Metadata Inconsistencies

- `apps/client/project.json` uses `sourceRoot: "client/src"` instead of `apps/client/src`.
- Similar pattern appears in `apps/client-e2e/project.json`.
- Result: tooling discoverability risk and reduced clarity for contributors.

### 5) Scaffold Libraries Not Integrated with Product Flows

- Template-like libs exist and are lightly used or unused (`libs/client/ui`, `libs/server/shared`, `libs/client/loggedin-user`).
- Result: maintenance overhead and noisy project graph.

### 6) Coverage Imbalance

- Auth unit coverage is strong (`apps/client/src/app/app.spec.tsx`, auth service/controller/guard specs).
- E2E tests are mostly template-level (`apps/api-e2e/src/api/api.spec.ts`, `apps/client-e2e/src/example.spec.ts`).
- No domain tests for polls, votes, realtime, or moderation.

## Cross-Slice Defaults

- Vertical slices remain the planning/development default.
- MVP realtime transport defaults to SSE backed by Redis pub/sub.
- Auth and telemetry are treated as foundation capabilities.

## Success Criteria for Debt Burn-Down

- Poll/vote API surface exists and matches frontend usage.
- Single persistence strategy for product domain is documented and enforced.
- Top-level docs reflect real project state and path names.
- Project metadata and source roots are consistent and discoverable.
- E2E coverage includes end-to-end user flows for core product features.
