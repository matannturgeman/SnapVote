# SnapVote — Libs Coverage Reference

**Last updated:** 2026-04-26

This document is the canonical reference for all libraries in the `libs/` folder. It tracks each library's purpose, key exports, test files, and test status.

---

## Summary Table

| Library | Type | Framework | Purpose | Test File(s) | Status |
|---|---|---|---|---|---|
| `client/loggedin-user` | Client | React | Auth state context and hooks | `use-logged-in-user.hook.spec.ts` | Added |
| `client/ui` | Client | React | Shared UI component library | `ui.spec.tsx` | Added |
| `client/shared` | Client | React | Client utilities, hooks, helpers | `utils.spec.ts`, `helpers.spec.ts`, `hooks.spec.ts` | Added |
| `client/server-communication` | Client | RTK Query | API layer — auth endpoints and base config | `auth.api.spec.ts`, `base-api.spec.ts` | Existing |
| `client/store` | Client | Redux Toolkit | Redux store with auth slice | `auth.slice.spec.ts` | Existing |
| `server/auth` | Server | NestJS | JWT auth, guards, decorators, password reset mailer | Multiple spec files | Existing |
| `server/poll` | Server | NestJS | Poll service, controller, SSE stream | `poll.service.spec.ts`, `poll.controller.spec.ts`, `poll-stream.service.spec.ts` | Existing |
| `server/user` | Server | NestJS | CurrentUser decorator and middleware | `current-user.spec.ts` | Added |
| `server/data-access` | Server | Prisma / NestJS | Prisma client setup, global exception filter | `http-exception.filter.spec.ts` | Added |
| `server/shared` | Server | Node | Server-side shared utilities | `shared-utils.spec.ts` | Existing |
| `shared/types` | Shared | TypeScript | Type definitions inferred from Zod schemas | `types.spec.ts` | Added |
| `shared/dto` | Shared | Zod | DTO schemas and parsing helpers | `dto.spec.ts` | Added |
| `shared/shared` | Shared | TypeScript | Pagination, HTTP response builders, type utilities | `shared.spec.ts` | Added |
| `shared/validation-schemas` | Shared | Zod | All Zod validation schemas | `validation-schemas.spec.ts` | Added |

---

## Client Libraries

### `libs/client/loggedin-user`

- **Path:** `libs/client/loggedin-user`
- **Purpose:** Provides a React Context that holds the currently authenticated user and exposes hooks for reading and updating auth state throughout the client app.
- **Key exports:**
  - `useCurrentUser` — returns the current user object or null
  - `useIsAuthenticated` — returns a boolean indicating auth state
  - `useSetLoggedInUser` — returns a setter to update the logged-in user
- **Test file:** `libs/client/loggedin-user/src/lib/use-logged-in-user.hook.spec.ts`
- **Test scope:** Hook behaviour, context value propagation, state updates on login and logout.
- **Status:** Tests added (2026-04-26)

---

### `libs/client/ui`

- **Path:** `libs/client/ui`
- **Purpose:** Placeholder shared UI component library. Intended to hold reusable React components consumed across the client application.
- **Key exports:** Shared React UI components (to be expanded as the project grows).
- **Test file:** `libs/client/ui/src/lib/ui.spec.tsx`
- **Test scope:** Smoke tests confirming the library is importable and components render without errors.
- **Status:** Tests added (2026-04-26)

---

### `libs/client/shared`

- **Path:** `libs/client/shared`
- **Purpose:** Client-side utility functions, React hooks, and helpers shared across the client application.
- **Key exports:**
  - `useLocalStorage` — hook for reading/writing values to localStorage with React state sync
  - `useDebounce` — hook for debouncing a rapidly changing value
  - Additional utility and helper functions
- **Test files:**
  - `libs/client/shared/src/lib/utils.spec.ts`
  - `libs/client/shared/src/lib/helpers.spec.ts`
  - `libs/client/shared/src/lib/hooks.spec.ts`
- **Test scope:** Unit tests for each utility function and hook, covering typical use cases and edge cases.
- **Status:** Tests added (2026-04-26)

---

### `libs/client/server-communication`

- **Path:** `libs/client/server-communication`
- **Purpose:** RTK Query API layer that defines all client-to-server communication. Includes the base API configuration and individual endpoint definitions for auth operations.
- **Key exports:**
  - Base RTK Query API config
  - Auth endpoints (login, register, logout, password reset, etc.)
- **Test files:**
  - `libs/client/server-communication/src/lib/auth.api.spec.ts`
  - `libs/client/server-communication/src/lib/base-api.spec.ts`
- **Test scope:** RTK Query endpoint definitions, request/response shape validation, base API configuration.
- **Status:** Existing tests

---

### `libs/client/store`

- **Path:** `libs/client/store`
- **Purpose:** Redux Toolkit store configuration. Contains the auth slice which manages client-side authentication state (current user, tokens, loading state).
- **Key exports:**
  - Redux store instance
  - Auth slice reducer and actions
- **Test file:** `libs/client/store/src/lib/auth.slice.spec.ts`
- **Test scope:** Auth slice reducer logic — initial state, action handlers for login, logout, and token refresh.
- **Status:** Existing tests

---

## Server Libraries

### `libs/server/auth`

- **Path:** `libs/server/auth`
- **Purpose:** NestJS authentication module. Handles JWT issuance and validation, route guards, custom decorators, and the password reset email flow.
- **Key exports:**
  - JWT strategy and guards
  - Auth decorators (e.g. `@Public`, `@CurrentUser`)
  - Password reset mailer service
  - Auth module
- **Test files:** Multiple spec files covering guards, strategies, services, and decorators.
- **Test scope:** JWT validation, guard behaviour, decorator logic, mailer service integration.
- **Status:** Existing tests

---

### `libs/server/poll`

- **Path:** `libs/server/poll`
- **Purpose:** NestJS poll module. Core domain library implementing poll creation, voting, results aggregation, and real-time vote streaming via Server-Sent Events (SSE).
- **Key exports:**
  - `PollService` — business logic for polls and votes
  - `PollController` — REST endpoints for poll operations
  - `PollStreamService` — SSE stream management for real-time results
- **Test files:**
  - `libs/server/poll/src/lib/poll.service.spec.ts`
  - `libs/server/poll/src/lib/poll.controller.spec.ts`
  - `libs/server/poll/src/lib/poll-stream.service.spec.ts`
- **Test scope:** Poll CRUD operations, voting logic, access control, SSE stream lifecycle and event emission.
- **Status:** Existing tests

---

### `libs/server/user`

- **Path:** `libs/server/user`
- **Purpose:** NestJS user utilities. Provides the `CurrentUser` parameter decorator and any associated middleware for extracting the authenticated user from the request context.
- **Key exports:**
  - `CurrentUser` decorator
  - User-related middleware
- **Test file:** `libs/server/user/src/lib/current-user.spec.ts`
- **Test scope:** Decorator extraction of user from request object, middleware behaviour.
- **Status:** Tests added (2026-04-26)

---

### `libs/server/data-access`

- **Path:** `libs/server/data-access`
- **Purpose:** Database access layer. Sets up the Prisma client as an injectable NestJS service and provides a global HTTP exception filter for consistent error response formatting.
- **Key exports:**
  - `PrismaService` — injectable Prisma client wrapper
  - `HttpExceptionFilter` — global NestJS exception filter
- **Test file:** `libs/server/data-access/src/lib/http-exception.filter.spec.ts`
- **Test scope:** Exception filter response shape for various HTTP error types (400, 401, 403, 404, 500).
- **Status:** Tests added (2026-04-26)

---

### `libs/server/shared`

- **Path:** `libs/server/shared`
- **Purpose:** Server-side shared utility functions used across multiple server libraries.
- **Key exports:** Shared utility functions (hashing, formatting, etc.)
- **Test file:** `libs/server/shared/src/lib/shared-utils.spec.ts`
- **Test scope:** Unit tests for each exported utility function.
- **Status:** Existing tests

---

## Shared Libraries

### `libs/shared/types`

- **Path:** `libs/shared/types`
- **Purpose:** TypeScript type definitions derived from (inferred from) the Zod schemas defined in `libs/shared/validation-schemas`. Ensures types are always in sync with runtime validation.
- **Key exports:** TypeScript interfaces and types for users, polls, auth, and stream events.
- **Test file:** `libs/shared/types/src/lib/types.spec.ts`
- **Test scope:** Type-level checks confirming inferred types match expected shapes; importability smoke tests.
- **Status:** Tests added (2026-04-26)

---

### `libs/shared/dto`

- **Path:** `libs/shared/dto`
- **Purpose:** Zod-based DTO schemas used at API boundaries (request/response validation). Provides `parseDto` and `safeParseDto` helpers for parsing incoming data against these schemas.
- **Key exports:**
  - DTO Zod schemas
  - `parseDto` — throws on invalid input
  - `safeParseDto` — returns a result object without throwing
- **Test file:** `libs/shared/dto/src/lib/dto.spec.ts`
- **Test scope:** `parseDto` and `safeParseDto` with valid and invalid inputs; schema shape validation.
- **Status:** Tests added (2026-04-26)

---

### `libs/shared/shared`

- **Path:** `libs/shared/shared`
- **Purpose:** Common utilities shared across both client and server. Includes pagination helpers, HTTP response builder functions, and general-purpose type utilities.
- **Key exports:**
  - Pagination utilities (e.g. `paginate`, `buildPaginationMeta`)
  - HTTP response builders (e.g. `buildSuccessResponse`, `buildErrorResponse`)
  - Type utility helpers
- **Test file:** `libs/shared/shared/src/lib/shared.spec.ts`
- **Test scope:** Pagination calculations, response builder output shapes, type utility behaviour.
- **Status:** Tests added (2026-04-26)

---

### `libs/shared/validation-schemas`

- **Path:** `libs/shared/validation-schemas`
- **Purpose:** Single source of truth for all Zod validation schemas used across the application. Covers user registration/login, auth tokens, poll creation/voting, and SSE stream event shapes.
- **Key exports:**
  - User schemas (register, login, update)
  - Auth schemas (token, password reset)
  - Poll schemas (create, vote, results)
  - Stream event schemas
- **Test file:** `libs/shared/validation-schemas/src/lib/validation-schemas.spec.ts`
- **Test scope:** Each schema tested with valid inputs (should pass) and invalid inputs (should fail with expected error paths).
- **Status:** Tests added (2026-04-26)

---

## Running Tests

### Run tests for a single library

```bash
pnpm nx test <lib-name>
```

Examples:

```bash
pnpm nx test server-poll
pnpm nx test client-store
pnpm nx test shared-dto
```

> Lib names follow the Nx project name convention, typically `<scope>-<name>` (e.g. `server-poll`, `client-shared`, `shared-validation-schemas`). Check `pnpm nx show projects` for the exact project name if unsure.

### Run tests for all libraries

```bash
pnpm nx run-many -t test
```

### Run tests for affected libraries only (recommended in CI / after a change)

```bash
pnpm nx affected -t test
```

---

## Coverage

### Generate coverage for a single library

```bash
pnpm nx test <lib-name> --coverage
```

### Generate coverage for all libraries

```bash
pnpm nx run-many -t test --coverage
```

Coverage reports are written to the `coverage/` directory at the workspace root, organised by project name.

---

## Status Legend

| Symbol | Meaning |
|---|---|
| Existing | Test file was already present before 2026-04-26 |
| Added | Test file was newly created on 2026-04-26 as part of the libs coverage initiative |
