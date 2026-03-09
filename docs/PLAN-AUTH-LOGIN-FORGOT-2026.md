# Auth Plan (2026): Login + Forgot Password + Token-Guarded Client Routes

Date: 2026-03-09
Workspace: C:\Dev\nx-project

## 1) Goal

Implement production-grade authentication in this Nx monorepo with:
- Login
- Forgot password (request + reset)
- Postgres-backed users/sessions/tokens
- Client-side auth check on app load + protected route redirect to `/login` when token/session is invalid
- UI built with `shadcn/ui`

## 2) Current Codebase Findings (what already exists)

The project already has strong scaffolding but no real auth implementation yet:

- Server auth scaffold exists:
  - `libs/server/auth/src/lib/auth.guard.ts` (global JWT guard)
  - `libs/server/auth/src/lib/auth.decorator.ts` (`@Public()`)
  - `libs/server/auth/src/lib/auth.service.ts` (token verify/sign methods are TODO stubs)
- Client auth scaffold exists:
  - `libs/client/store/src/lib/auth.slice.ts`
  - `libs/client/server-communication/src/lib/base-api.ts` (injects bearer token)
  - `libs/client/server-communication/src/lib/auth.api.ts` (`/auth/login`, `/auth/register`, `/auth/me` placeholders)
- Prisma exists but schema is minimal (`User` has only `id/email/name`), no password/session/reset-token model yet.
- App shells are mostly generated placeholders:
  - `apps/api/src/app/app.module.ts` does not yet wire auth modules/controllers
  - `apps/client/src/app/app.tsx` still Nx starter routes

## 3) 2026 Open-Source Recommendation (researched)

### Recommendation for this repo: **Better Auth + Prisma/Postgres**

Why this is strongest for your requirements in 2026:
- Auth.js is now maintained by Better Auth team, and new projects are recommended to start with Better Auth.
- Better Auth has first-class built-ins for email/password, password reset, session management, and optional MFA/captcha plugins.
- It is framework-agnostic and works with Postgres/Prisma, so it fits Nest + React without forcing Next.js.

### Alternatives (valid, but not first pick here)

- **SuperTokens**: strong OSS option with prebuilt UI and robust session recipes; good if you want its opinionated architecture.
- **Ory Kratos**: powerful at scale and fully headless, but heavier operational/flow complexity for this project phase.
- **Custom Nest JWT/Passport only**: fastest short-term, highest long-term security maintenance burden (more custom auth logic to own).

## 4) Security Baseline (must-haves)

Apply OWASP-aligned practices regardless of auth library:
- Password hashing with memory-hard algorithm (OWASP recommends Argon2id minimum baseline).
- Forgot-password anti-enumeration: identical response shape/time for existing and non-existing emails.
- Reset token: cryptographically random, single-use, short TTL, hashed at rest.
- Rate-limit login + reset endpoints (IP + account/email key).
- Revoke/rotate sessions on password reset.
- Short-lived access token if token mode is used.

## 5) Target Architecture in this Nx Repo

### Server (NestJS)

1. Keep `libs/server/auth` as the integration layer, but switch implementation to Better Auth session/token verification.
2. Add `AuthController` + endpoints in API app (or dedicated `libs/server/auth-feature` lib):
   - `POST /auth/login`
   - `POST /auth/forgot-password`
   - `POST /auth/reset-password`
   - `GET /auth/me`
   - `POST /auth/logout`
3. Keep global guard pattern (`APP_GUARD`) and `@Public()` for open endpoints.
4. Use Prisma/Postgres as source of truth for users/accounts/sessions/verifications.
5. Add mail adapter (Resend/SES/SMTP) for reset emails.
6. Add throttling middleware/guard on auth endpoints.

### Data Model (Prisma)

Extend `prisma/schema.prisma` with models needed by the chosen auth flow:
- `User` (existing + fields like `passwordHash`, `emailVerified`, timestamps)
- `Session` (session id/token hash, userId, expiresAt, userAgent/ip optional)
- `Verification` (reset/verify tokens with type, value hash, expiresAt, usedAt)
- Optional `Account` model for future social providers

Note: If using Better Auth Prisma adapter schema, follow its canonical schema to reduce integration drift.

### Client (React + Redux + RTK Query)

1. Add route groups:
   - Public: `/login`, `/forgot-password`, `/reset-password`
   - Protected: app pages
2. Add `AuthBootstrap` on app load:
   - Calls `/auth/me` once
   - If valid session/token: populate store and continue
   - If invalid: clear auth state and navigate to `/login`
3. Add `ProtectedRoute` wrapper using auth state + bootstrap loading state.
4. Update `baseApi` reauth behavior:
   - On 401: clear credentials and redirect `/login`
5. Keep token/session storage secure:
   - Prefer httpOnly secure cookies for session-based auth
   - If bearer token is retained, minimize localStorage exposure and keep TTL short

### UI (shadcn)

Create auth UI screens with shadcn components:
- `LoginForm` (email/password)
- `ForgotPasswordForm` (email)
- `ResetPasswordForm` (new password + confirm)
- Reusable auth layout/card, field errors, loading states, success alerts

## 6) Implementation Phases

### Phase 0 - Decision + Contracts (0.5 day)
- Confirm auth mode: session-cookie first (recommended) or JWT access/refresh.
- Finalize DTOs in `libs/shared/dto` and `libs/shared/validation-schemas` for forgot/reset flows.

### Phase 1 - Backend Foundation (1 day)
- Install/integrate Better Auth server setup.
- Wire Prisma models + run migration.
- Implement auth endpoints + mail sender abstraction.
- Connect guard verification path to real session/token validation.

### Phase 2 - Client Auth UX + Routing (1 day)
- Add shadcn to client app, generate auth UI primitives.
- Build `/login`, `/forgot-password`, `/reset-password` pages.
- Add `AuthBootstrap` + `ProtectedRoute` + 401 global handling.

### Phase 3 - Hardening (0.5-1 day)
- Rate limiting + anti-enumeration behavior checks.
- Session invalidation after reset.
- Security headers/CORS tightening for auth endpoints.
- Audit logging for login/reset events.

### Phase 4 - Tests + E2E (1 day)
- Unit tests for auth services/guards.
- API e2e for login, me, forgot, reset flows.
- Client e2e for redirect behavior and successful login/reset journey.

## 7) Endpoint Flow Spec

### Login
1. User submits email/password.
2. Server validates credentials.
3. Server creates session (or issues access+refresh tokens).
4. Client stores auth state and navigates to protected default route.

### Forgot Password
1. User submits email.
2. Server always returns 200 generic message.
3. If account exists, server creates single-use reset token + TTL and sends email.

### Reset Password
1. User opens reset link with token.
2. Client submits token + new password.
3. Server validates token/TTL/single-use, updates password hash, revokes existing sessions.
4. Client redirects to `/login` with success state.

### Protected Route Guard
1. On app init, client calls `/auth/me`.
2. If valid: render protected routes.
3. If invalid/401: clear auth and route to `/login`.

## 8) Risks and Mitigations

- Risk: mixed auth paradigms (custom JWT + Better Auth sessions) causing confusion.
  - Mitigation: choose one primary auth mode and document it in `docs/`.
- Risk: token leakage in browser storage.
  - Mitigation: prefer httpOnly secure cookie sessions.
- Risk: user enumeration in forgot-password.
  - Mitigation: constant response envelope and timing normalization.

## 9) Deliverables Checklist

- [ ] Prisma migration with auth tables
- [ ] Functional `/auth/login`, `/auth/me`, `/auth/forgot-password`, `/auth/reset-password`, `/auth/logout`
- [ ] shadcn auth pages
- [ ] Protected route + bootstrap check + 401 redirect
- [ ] Rate limiting + audit logging for auth events
- [ ] Unit + e2e coverage for all auth flows
- [ ] Environment docs (`.env.example`) for secrets and mail provider

## 10) Sources (researched on 2026-03-09)

- Better Auth: Email/password + reset docs  
  https://www.better-auth.com/docs/authentication/email-password
- Better Auth: Auth.js now part of Better Auth (Sep 22, 2025)  
  https://www.better-auth.com/blog/authjs-joins-better-auth
- Better Auth blog index (includes 2026 releases)  
  https://better-auth.com/blog
- NextAuth/Auth.js repo note recommending Better Auth for new projects  
  https://github.com/nextauthjs/next-auth
- shadcn/ui installation for Vite  
  https://ui.shadcn.com/docs/installation/vite
- NestJS authentication techniques  
  https://docs.nestjs.com/security/authentication
- OWASP Forgot Password Cheat Sheet  
  https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html
- OWASP Password Storage Cheat Sheet (Argon2id guidance)  
  https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html
- SuperTokens docs/home (alternative)  
  https://supertokens.com/docs
- Ory Kratos repo/docs entry (alternative)  
  https://github.com/ory/kratos
