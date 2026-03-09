# Feature 11: User, Category, and Theme Vote Explorer

## Goal

Let users explore voting behavior by person and theme/category: see what a user voted on in each theme, and filter polls by participant(s).

## Status

Planned.

## Scope

In scope:

- Theme/category taxonomy for polls.
- Seed theme support (examples: `relationship`, `anime`, `movies`, plus extensible catalog).
- User-centric voting view (per-user vote history in accessible polls).
- Poll filtering by user and theme/category.
- Combined filters: "show polls in theme X where user Y voted".

Out of scope:

- Cross-workspace global discovery/search across external tenants.

## User Journeys

1. User opens the `anime` theme and sees polls with participant filter applied.
2. User selects another participant and sees that participant's vote footprint by theme.
3. User switches to `relationship` or `movies` and compares voting behavior.

## Acceptance Criteria

- Polls support one or more themes with validated taxonomy.
- Filtering by `theme`, `category`, `voterId`, and `ownerId` returns deterministic results.
- `theme` and `category` query behavior is consistent (alias or mapped fields) and documented.
- User vote history only exposes polls user has permission to view.
- Explorer view supports pagination and stable sorting.

## API Touchpoints (Planned)

- `GET /polls?theme=&category=&voterId=&ownerId=&page=&limit=`
- `GET /users/:id/votes?theme=&category=&page=&limit=`
- `GET /themes` and optional `POST /themes` (admin/owner controlled)
- `GET /categories` only if categories remain separate from themes

## Data Touchpoints (Planned)

- Add `Theme` + `PollTheme` many-to-many mapping (or unify under `Category` with `theme` alias).
- Indexes for filter-heavy queries (`pollId`, `themeId`, `userId`, `createdAt`).
- Seed data migration for default themes (`relationship`, `anime`, `movies`).
- Materialized query helpers optional after MVP usage measurement.

## Frontend Touchpoints (Planned)

- Explorer page with filters: theme/category, user, poll status, date range.
- Theme chips/dropdown with popular defaults.
- User vote timeline/list.
- Saved filter presets for common analysis views.

## Testing

- Unit tests for permission-filter composition.
- Integration tests for filter query correctness, alias behavior (`theme` vs `category`), and pagination.
- E2E: filter polls by user + theme and verify expected results.

## Technical Debt

Current debt:

- No theme model or user-vote exploration API exists.

Planned debt risk:

- Query complexity can grow quickly and degrade performance.
- Permission leaks if visibility checks are not centralized.
- Theme/category drift can create inconsistent analytics dimensions.

Mitigation:

- Define canonical filtering service on backend.
- Introduce indexes early and monitor query plans.
- Reuse access-control policy layer from feature 03.
- Document a single source of truth for theme taxonomy.
