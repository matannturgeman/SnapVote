# Feature 13: User Statistics Page

## Goal

Provide a dedicated user page with actionable personal statistics across voting activity, themes, and social alignment.

## Status

Not implemented.

## Scope

In scope:

- `/users/me/stats` page for current authenticated user.
- Optional `/users/:id/stats` for viewable profiles (respecting visibility rules).
- Core statistics cards:
- Total polls created
- Total polls participated
- Total votes cast
- Vote activity by theme (`relationship`, `anime`, `movies`, etc.)
- Participation trend (time-based)
- Alignment highlights (most aligned users + outstanding score summary)
- Filters on stats page: theme/category, date window, owned vs participated polls.

Out of scope:

- Public social profile customization.
- Monetary/gamification leaderboards.

## User Journeys

1. User opens profile stats and sees personal activity summary.
2. User filters statistics to `anime` theme and last 30 days.
3. User checks "users most aligned with me" and outstanding score context.
4. User switches to `relationship` theme to compare behavior.

## Acceptance Criteria

- Stats endpoint returns consistent aggregates for requested filters.
- Theme/category filters on stats match explorer/insights semantics.
- Permission model prevents exposure of private poll or anonymous-vote details.
- UI displays loading/error/empty states clearly.
- Stats cards and charts are traceable to documented metric definitions.

## API Touchpoints (Planned)

- `GET /users/me/stats?theme=&category=&window=&mode=`
- `GET /users/:id/stats?theme=&category=&window=&mode=` (if allowed)
- Optional split endpoints for scale:
- `GET /users/me/stats/activity`
- `GET /users/me/stats/themes`
- `GET /users/me/stats/alignment`

## Data Touchpoints (Planned)

- Reuse poll/vote/theme models from features 02, 04, 11.
- Reuse alignment aggregates from feature 12.
- Add cached user stats snapshot table/materialized view if needed.
- Store metric version metadata for reproducibility.

## Frontend Touchpoints (Planned)

- New user stats route/page in `apps/client/src/app`.
- New API hooks in `libs/client/server-communication`.
- Reusable stat-card and mini-chart components.
- Deep links from explorer/insights to user stats page.

## Testing

- Unit tests for stats aggregation formulas.
- Contract tests for stats payload and filter behavior.
- E2E tests: login -> open stats page -> apply theme filter -> verify sections render.

## Technical Debt

Current debt:

- No user profile stats endpoint or page exists.

Planned debt risk:

- Heavy aggregates on each page load can hurt performance.
- Inconsistent metric definitions across stats/explorer/insights.

Mitigation:

- Start with bounded aggregation + caching strategy.
- Define canonical metric dictionary shared by features 11, 12, and 13.
- Enforce privacy rules for transparent vs anonymous vote modes.
