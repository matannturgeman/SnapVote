# Feature 12: User Alignment and Outstanding Users Insights

## Goal

Show social decision intelligence: users who vote most similarly to others, and outstanding users whose vote patterns are unique.

## Status

Not implemented.

## Scope

In scope:

- Alignment scoring between users based on shared poll participation.
- "Most aligned" ranking (users similar to the selected user or group baseline).
- "Outstanding users" ranking (highly distinctive voting behavior).
- Theme/category-scoped insight views.

Out of scope:

- Predictive recommendation engines.
- HR/performance-style evaluation features.

## User Journeys

1. User opens insights and sees "Most aligned with you" list.
2. User switches to `movies` theme and sees changed alignment/outstanding rankings.
3. User opens an outstanding user profile and reviews notable voting differences.

## Acceptance Criteria

- Score definitions are documented and consistent across API/UI.
- Rankings are calculated only from polls visible to requesting user.
- Minimum participation threshold prevents noisy rankings.
- Insights can be filtered by theme/category and date window.
- Insights update on schedule or near-real-time without blocking vote flow.

## API Touchpoints (Planned)

- `GET /insights/users/alignment?userId=&theme=&category=&window=`
- `GET /insights/users/outstanding?theme=&category=&window=`
- Optional detail endpoint: `GET /insights/users/:id/comparison?withUserId=&theme=&category=`

## Data Touchpoints (Planned)

- Reuse vote and theme/category data from features 04 and 11.
- Add derived metrics store or cached computation layer for rankings.
- Keep algorithm version metadata for reproducibility.

## Frontend Touchpoints (Planned)

- Insights dashboard section with two leaderboards:
- "Most aligned users"
- "Outstanding users"
- Theme/category selector on insights pages.
- Drill-down views showing poll-level agreement/disagreement evidence.

## Testing

- Unit tests for alignment and outlier score computations.
- Contract tests to guarantee stable ranking payload shape.
- E2E tests for theme/category filters and leaderboard drill-down behavior.

## Technical Debt

Current debt:

- No analytics framework or metric definitions exist in codebase.

Planned debt risk:

- Misleading or unfair insights if algorithm choices are opaque.
- Heavy aggregation load may impact API performance.

Mitigation:

- Publish scoring formulas and thresholds in docs.
- Run rankings asynchronously and cache results.
- Add confidence indicators and minimum sample-size requirements.
