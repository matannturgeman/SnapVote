# E2E User Flows — Test Plan and Coverage

## Overview

This document inventories every user flow implemented in SnapVote, maps each to its
E2E test location, and records any codebase issues discovered during analysis.

---

## Table of Contents

1. [User Flow Inventory](#user-flow-inventory)
2. [API E2E Coverage](#api-e2e-coverage)
3. [UI E2E Coverage (Playwright)](#ui-e2e-coverage-playwright)
4. [Running the Tests](#running-the-tests)
5. [Codebase Issues Found](#codebase-issues-found)
6. [Future Flow Coverage](#future-flow-coverage)

---

## User Flow Inventory

### Feature 01 — Authentication

| Flow | Route / Endpoint | Auth Required |
|------|-----------------|---------------|
| Register new account | `POST /api/auth/register` | No |
| Login with email + password | `POST /api/auth/login` | No |
| Fetch own profile | `GET /api/auth/me` | Yes |
| Logout (revoke token) | `POST /api/auth/logout` | Yes |
| Request password reset email | `POST /api/auth/forgot-password` | No |
| Reset password with token | `POST /api/auth/reset-password` | No |
| Client: redirect unauthed to `/login` | `/` (SessionGate) | — |
| Client: redirect authed away from `/login` | `/login` (Navigate) | — |

### Feature 02 — Poll Creation + Management

| Flow | Route / Endpoint | Auth Required |
|------|-----------------|---------------|
| Create poll | `POST /api/polls` | Yes |
| List own polls (with filters) | `GET /api/polls?status=&from=&to=&page=&limit=` | Yes |
| Get poll by ID | `GET /api/polls/:id` | Yes |
| Update poll title / description / options | `PATCH /api/polls/:id` | Yes (owner) |
| Close poll | `POST /api/polls/:id/close` | Yes (owner) |
| Client: create poll page | `/polls/new` | Yes |
| Client: poll detail with edit + close | `/polls/:id` | Yes |
| Client: home page with poll list + filters | `/` | Yes |

### Feature 03 — Poll Sharing + Access Control

| Flow | Route / Endpoint | Auth Required |
|------|-----------------|---------------|
| Create share link | `POST /api/polls/:id/share-links` | Yes (owner) |
| List share links | `GET /api/polls/:id/share-links` | Yes (owner) |
| Revoke share link | `POST /api/polls/:id/share-links/:linkId/revoke` | Yes (owner) |
| Join poll via token (public) | `GET /api/polls/join/:token` | No |
| Client: join page → redirect to poll | `/polls/join/:token` | No |

### Feature 04 — Vote Casting + Idempotency

| Flow | Route / Endpoint | Auth Required |
|------|-----------------|---------------|
| Cast vote (single-select replaces) | `POST /api/polls/:id/votes` | Yes |
| Cast vote (multi-select adds) | `POST /api/polls/:id/votes` | Yes |
| Delete / deselect vote | `DELETE /api/polls/:id/votes/my/:optionId` | Yes |
| Get vote results | `GET /api/polls/:id/results` | Yes |
| Client: voting UI (non-owner on open poll) | `/polls/:id` | Yes |

### Feature 05 — Live Results + Presence

| Flow | Route / Endpoint | Auth Required |
|------|-----------------|---------------|
| Subscribe to SSE stream | `GET /api/polls/:id/stream?token=` | Token in QS |
| Client: live presence indicator | `/polls/:id` (usePollStream) | Yes |

### Feature 06 — Results History + Insights

| Flow | Route / Endpoint | Auth Required |
|------|-----------------|---------------|
| Filter polls by status | `GET /api/polls?status=OPEN\|CLOSED\|DRAFT` | Yes |
| Filter polls by date range | `GET /api/polls?from=&to=` | Yes |
| Paginate poll list | `GET /api/polls?page=&limit=` | Yes |
| Client: summary cards (total/open/closed/votes) | `/` | Yes |

### Feature 07 — Moderation + Abuse Protection

| Flow | Route / Endpoint | Auth Required |
|------|-----------------|---------------|
| Report poll | `POST /api/polls/:id/report` | Yes |
| Lock poll (owner) | `POST /api/polls/:id/lock` | Yes (owner) |
| Delete poll (owner) | `DELETE /api/polls/:id` | Yes (owner) |

### Feature 08 — Observability

| Flow | Route / Endpoint | Auth Required |
|------|-----------------|---------------|
| Health check | `GET /api/health` | No |
| Request ID in error UI | client error messages | — |

---

## API E2E Coverage

Test files live in `apps/api-e2e/src/api/`. The test runner is Jest; the global setup
waits for the API on port 3000. Run with:

```bash
pnpm nx e2e api-e2e
```

### `api.spec.ts` — Baseline
| Test | Status |
|------|--------|
| GET /api returns 200 + message | Exists |

### `polls.spec.ts` — Poll CRUD + Share Links
| Test | Status |
|------|--------|
| POST /api/polls — creates OPEN poll with options | Exists |
| POST /api/polls — 400 missing title | Exists |
| POST /api/polls — 400 fewer than 2 options | Exists |
| POST /api/polls — 401 unauthenticated | Exists |
| GET /api/polls/:id — returns poll | Exists |
| GET /api/polls/:id — 404 non-existent | Exists |
| GET /api/polls/:id — 401 unauthenticated | Exists |
| PATCH /api/polls/:id — owner updates title + desc | Exists |
| PATCH /api/polls/:id — owner replaces options | Exists |
| PATCH /api/polls/:id — 403 non-owner | Exists |
| PATCH /api/polls/:id — 400 fewer than 2 options | Exists |
| POST /api/polls/:id/close — owner closes | Exists |
| POST /api/polls/:id/close — 403 updating closed poll | Exists |
| POST /api/polls/:id/close — 403 non-owner | Exists |
| POST /api/polls/:id/close — 401 unauthenticated | Exists |
| POST /api/polls/:id/share-links — owner creates | Exists |
| POST /api/polls/:id/share-links — 403 non-owner | Exists |
| POST /api/polls/:id/share-links — 401 unauthenticated | Exists |
| GET /api/polls/:id/share-links — owner lists | Exists |
| POST .../revoke — owner revokes | Exists |
| POST .../revoke — 403 non-owner | Exists |
| GET /api/polls/join/:token — valid token | Exists |
| GET /api/polls/join/:token — 404 non-existent | Exists |
| GET /api/polls/join/:token — 403 revoked token | Exists |

### `auth.spec.ts` — Authentication (NEW)
| Test | Status |
|------|--------|
| POST /api/auth/register — valid → returns token | New |
| POST /api/auth/register — 409 duplicate email | New |
| POST /api/auth/register — 400 invalid email | New |
| POST /api/auth/register — 400 password too short | New |
| POST /api/auth/login — valid → returns token | New |
| POST /api/auth/login — 401 wrong password | New |
| POST /api/auth/login — 400 invalid email format | New |
| GET /api/auth/me — valid token → user profile | New |
| GET /api/auth/me — 401 no token | New |
| POST /api/auth/logout — revokes token | New |
| POST /api/auth/logout — 401 no token | New |
| POST /api/auth/forgot-password — returns generic message | New |
| POST /api/auth/forgot-password — 400 invalid email | New |
| POST /api/auth/reset-password — 400 token too short | New |

### `votes.spec.ts` — Vote Casting + Results (NEW)
| Test | Status |
|------|--------|
| POST /api/polls/:id/votes — casts vote, returns results | New |
| POST /api/polls/:id/votes — single-select replaces previous vote | New |
| POST /api/polls/:id/votes — multi-select accumulates votes | New |
| POST /api/polls/:id/votes — 403 poll closed | New |
| POST /api/polls/:id/votes — 400 invalid optionId | New |
| POST /api/polls/:id/votes — 401 unauthenticated | New |
| DELETE /api/polls/:id/votes/my/:optionId — removes vote | New |
| DELETE /api/polls/:id/votes/my/:optionId — 400 no vote to remove | New |
| DELETE /api/polls/:id/votes/my/:optionId — 403 poll closed | New |
| GET /api/polls/:id/results — returns tallies + myVotes | New |
| GET /api/polls/:id/results — transparent poll includes voter list | New |
| GET /api/polls/:id/results — 404 non-existent poll | New |
| GET /api/polls/:id/results — 401 unauthenticated | New |

### `moderation.spec.ts` — Moderation + Poll List (NEW)
| Test | Status |
|------|--------|
| POST /api/polls/:id/report — succeeds for authenticated user | New |
| POST /api/polls/:id/report — 401 unauthenticated | New |
| POST /api/polls/:id/report — 400 invalid reason | New |
| POST /api/polls/:id/lock — owner locks poll | New |
| POST /api/polls/:id/lock — 403 non-owner | New |
| POST /api/polls/:id/lock — 401 unauthenticated | New |
| POST /api/polls/:id/votes on locked poll — 403 | New |
| DELETE /api/polls/:id — owner deletes poll | New |
| DELETE /api/polls/:id — 403 non-owner | New |
| DELETE /api/polls/:id — 401 unauthenticated | New |
| GET /api/polls — lists own polls paginated | New |
| GET /api/polls?status=OPEN — filters by status | New |
| GET /api/polls?from=&to= — filters by date range | New |

---

## UI E2E Coverage (Playwright)

Test files live in `apps/client-e2e/src/`. The runner is Playwright (Chromium default).
The Playwright config auto-starts `nx run client:preview` on port 4200. The API must be
running separately on port 3000. Run with:

```bash
pnpm nx e2e client-e2e
```

### `example.spec.ts` — Baseline
| Test | Status |
|------|--------|
| Unauthenticated visit to `/` → redirect to `/login` | Exists |

### `auth.spec.ts` — Auth UI Flows (NEW)
| Test | Status |
|------|--------|
| Login page renders "Sign in to your workspace" | New |
| Login with valid credentials → redirected to `/` | New |
| Login with wrong password → error message shown | New |
| Navigate from login to register page | New |
| Register page renders "Create your account" | New |
| Register with valid data → redirected to `/` | New |
| Register with duplicate email → error message shown | New |
| Authenticated user visiting `/login` → redirected to `/` | New |

### `polls.spec.ts` — Poll Lifecycle UI Flows (NEW)
| Test | Status |
|------|--------|
| Home page shows "My Polls" header | New |
| Home page shows "New Poll" button | New |
| Empty state shown when no polls exist | New |
| Navigate to create poll page | New |
| Submit button disabled with < 2 options filled | New |
| Create poll → redirected to poll detail page | New |
| Poll detail shows poll title and status badge | New |
| Owner sees Edit + Close poll buttons | New |
| Owner can edit poll title and save | New |
| Owner can close poll → status badge changes to CLOSED | New |
| Poll list shows newly created poll | New |
| Filter by OPEN status shows only open polls | New |

### `voting.spec.ts` — Voting UI Flows (NEW)
| Test | Status |
|------|--------|
| Non-owner sees "Cast your vote" section | New |
| Voting on an option highlights it as selected | New |
| After voting, percentage and count are shown | New |
| Single-select: voting again replaces previous selection | New |
| Deselect button (X) removes vote | New |
| Owner sees Results section, not voting UI | New |
| Closed poll shows results, no voting UI for anyone | New |

### `share.spec.ts` — Share Link UI Flows (NEW)
| Test | Status |
|------|--------|
| Owner sees "Share links" section on poll detail | New |
| Clicking "Manage" reveals share link panel | New |
| Clicking "Generate share link" creates a link | New |
| Copying a link shows check icon briefly | New |
| Revoking a link removes it from the active list | New |
| Unauthenticated user visits `/polls/join/:token` with valid token → redirected to `/login` | New |

---

## Running the Tests

### API E2E (Jest)

Requires API + database running:
```bash
# Terminal 1 — start API
pnpm nx run api:serve

# Terminal 2 — run API e2e suite
pnpm nx e2e api-e2e
```

### Client E2E (Playwright)

Requires API + client preview server running:
```bash
# Terminal 1 — start API
pnpm nx run api:serve

# Terminal 2 — run Playwright suite (auto-starts client:preview)
pnpm nx e2e client-e2e

# Run a single spec
pnpm nx e2e client-e2e --grep "auth"

# Open interactive UI
pnpm nx e2e client-e2e --ui
```

---

## Codebase Issues Found

### Issue 1 — Share link join loses context for unauthenticated users (UX)

**File:** `apps/client/src/pages/poll-join.page.tsx`

**Description:** The `/polls/join/:token` route is public (no `SessionGate`). When a
valid token is resolved, `PollJoinPage` navigates to `/polls/:id`. However, `/polls/:id`
IS guarded by `SessionGate`, so an unauthenticated user following a share link is
silently redirected to `/login` with no context about the poll they were trying to join.

**Impact:** Participants who are not logged in receive no helpful message and lose the
poll context. After login/register they are not redirected back to the poll.

**Suggested fix:** Persist the post-login destination (e.g., store `/polls/:id` in
`sessionStorage` before the `SessionGate` redirect and restore it after successful login).
This is a known UX debt; not a crash bug.

### Issue 2 — Feature 10 docs marked "Not implemented" but partially implemented

**Files:** `docs/features/README.md`, `docs/features/10-whatsapp-style-voting-mechanism.md`

**Description:** Both docs mark Feature 10 (WhatsApp-Style Voting) as "Not implemented".
The current branch `2026-04-26/feature/whatsapp-style-voting` has already implemented:
- `visibilityMode` and `allowMultipleAnswers` fields on poll creation UI and API
- `DELETE /polls/:id/votes/my/:optionId` endpoint for vote deselection
- Single-select vote-replace semantics in `PollService.castVote`
- Transparent voter list rendering in `PollDetailPage`

**Action:** Update the feature README status to "Implemented (branch)" or "In Progress"
once the PR merges.

---

## Future Flow Coverage

These flows are planned but not yet implemented and should get tests when built:

| Feature | Flow |
|---------|------|
| 05 Live Results | SSE stream delivers results event on vote cast |
| 05 Live Results | SSE stream delivers presence count on connect/disconnect |
| 05 Live Results | SSE stream delivers closed event on poll close |
| 11 Vote Explorer | Filter polls by theme / category / voter |
| 13 User Stats | GET /users/me/stats returns correct aggregates |
| 14 Notifications | SSE notification stream delivers vote events |
| 15 LLM Insights | POST /polls/:id/insights/llm triggers analysis |
