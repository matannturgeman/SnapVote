# Feature 01: Auth Session and Account Recovery

## Goal

Provide secure identity entry and session lifecycle for SnapVote users.

## Status

Implemented baseline.

## Scope

In scope:

- Register (`POST /auth/register`)
- Login (`POST /auth/login`)
- Current user (`GET /auth/me`)
- Forgot password (`POST /auth/forgot-password`)
- Reset password (`POST /auth/reset-password`)
- Logout (`POST /auth/logout`)
- Client session bootstrap and protected-route gating

Out of scope for this slice:

- Social login/SSO
- Multi-factor auth
- Device/session management UI

## User Journeys

1. New user registers and is immediately signed in.
2. Existing user logs in and lands on protected home screen.
3. User requests password reset and receives generic confirmation.
4. User resets password using token and is redirected to login.
5. User logs out; local token state is cleared even if server call fails.

## Acceptance Criteria

- All auth endpoints validate request/response DTOs via `@libs/shared-dto`.
- Auth-protected routes reject missing/invalid bearer token.
- Reset-password flow revokes active sessions for target user.
- Client redirects unauthenticated sessions to `/login`.
- Telemetry records auth request outcomes with sensitive fields redacted.

## Backend/API Touchpoints

- `libs/server/auth/src/lib/auth.controller.ts`
- `libs/server/auth/src/lib/auth.service.ts`
- `libs/server/auth/src/lib/auth.guard.ts`
- `libs/server/auth/src/lib/password-reset-mailer.service.ts`

## Data Touchpoints

- `prisma/schema.prisma`: `User`, `Session`, `PasswordResetToken`
- `libs/server/data-access/src/lib/prisma.module.ts`

## Frontend Touchpoints

- `apps/client/src/app/app.tsx`
- `libs/client/server-communication/src/lib/auth.api.ts`
- `libs/client/store/src/lib/auth.slice.ts`

## Testing

Current coverage:

- Auth service/controller/guard unit tests in `libs/server/auth/src/lib/*.spec.ts`
- Client auth flow tests in `apps/client/src/app/app.spec.tsx`

Gaps to close:

- End-to-end auth recovery test through API + client UI
- SMTP failure-path integration test using test transport

## Technical Debt

Current debt:

- Token storage in localStorage increases XSS blast radius.
- No explicit rate limiting on auth/recovery endpoints.
- No first-class session management UX (list/revoke device sessions).

Planned debt risk:

- As poll-sharing grows, auth ownership rules may spread across modules.

Mitigation:

- Move to httpOnly cookie strategy or strict token hardening policy.
- Add throttling and abuse controls aligned with feature 07.
- Centralize authorization policy checks in reusable guard/policy layer.
