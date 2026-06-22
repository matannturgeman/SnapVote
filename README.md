# SnapVote

A real-time polling platform. Create polls, share them, cast votes, and watch results update live.

## Tech Stack

| Layer | Technology |
|---|---|
| Monorepo | Nx + pnpm workspaces |
| Backend | NestJS 11, Prisma 6, PostgreSQL, Redis |
| Frontend | React 19, Redux Toolkit + RTK Query, React Router |
| Validation | Zod (shared schemas across client + server) |
| Styling | Tailwind CSS v4, dark mode |
| Testing | Jest (unit), Playwright (e2e) |

## Project Structure

```
apps/
  api/          # NestJS backend
  client/       # React frontend
  api-e2e/      # Playwright API e2e tests
  client-e2e/   # Playwright client e2e tests
libs/
  server/       # auth, poll, data-access, user, shared
  client/       # store, server-communication, loggedin-user, shared, ui
  shared/       # validation-schemas, dto, types, shared
docs/
  features/     # Feature specs
```

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm
- Docker (for PostgreSQL + Redis)

### Setup

```sh
# Install dependencies
pnpm install

# Start infrastructure
docker compose -f docker/docker-compose.yml up -d

# Apply DB migrations
pnpm prisma migrate deploy

# Generate Prisma client
pnpm prisma generate
```

> **Windows (PowerShell):** The `.env` file lives in `apps/api/` but Prisma runs from the repo root.
> Set `DATABASE_URL` inline before running Prisma commands:
>
> ```powershell
> $env:DATABASE_URL = (Get-Content apps/api/.env | Select-String "^DATABASE_URL").Line.Split('=',2)[1].Trim('"'); pnpm prisma migrate deploy
> ```

### Run

```sh
# API (port 3000)
pnpm nx serve api

# Client (port 4200)
pnpm nx serve client
```

### Test

```sh
# Unit tests
pnpm nx run-many -t test

# E2E tests
pnpm nx run api-e2e:e2e
pnpm nx run client-e2e:e2e
```

## Features

| # | Feature | Status |
|---|---|---|
| 01 | Auth, session, account recovery | Done |
| 02 | Poll creation and management | Done |
| 03 | Poll sharing and access control | Done |
| 04 | Vote casting and idempotency | Done |
| 04.5 | App shell, navbar, my polls list | Done |
| 04.6 | Dark mode | Done |
| 05 | Live results and presence (SSE + Redis pub/sub) | Done |
| 06 | Results history and insights | Done |
| 07 | Moderation and abuse protection | Done |
| 08 | Observability and operability | Done |
| 09 | User profile management and account reactivation | Done |
| 10 | WhatsApp-style voting mechanism | Planned |
| 11 | User, category, and theme vote explorer | Planned |
| 12 | User alignment and outstanding users insights | Planned |
| 13 | User statistics page | Planned |
| 14 | Real-time vote notifications | Planned |
| 15 | LLM poll insights and narrative conclusions | Planned |
