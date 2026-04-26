# Feature 06: Results History and Insights

## Goal

Preserve finalized poll outcomes and expose useful historical insights for decision tracking.

## Status

In progress (branch: `2026-04-25/feature/results-history-and-insights`).

## Scope

In scope:

- Persist final poll outcomes and summary metrics.
- View historical results for polls owned/accessible by user.
- Provide basic trend and participation insights.

Out of scope:

- Advanced analytics warehouse pipelines.
- BI dashboards beyond product-level reporting.

## User Journeys

1. Owner closes poll and reviews final result breakdown.
2. User revisits past polls and compares participation trends.
3. Team references historical outcomes for future decisions.

## Acceptance Criteria

[-] Closed poll results remain queryable and immutable by default.
[x] History list supports pagination/filtering by status/date.
[x] Insights calculations are reproducible from stored vote data.

## API Touchpoints (Complete)

- `GET /polls/:id/results` (finalized + live contexts)
- `GET /polls?owner=me&status=closed&page=&limit=` (or dedicated history endpoint)

## Data Touchpoints (Complete)

- `Poll` closure timestamp and final-state metadata.
- Aggregated result shape (`Result*Dto`) standardized for client rendering.

## Frontend Touchpoints (Complete)

[x] Poll list with status filter tabs (All/Open/Closed/Draft)
[x] Date range filter (from/to)
[x] Summary cards showing Total Polls, Total Votes, Open, Closed counts
[x] Poll detail results visualization with percentages

## Testing

- Unit tests for metrics aggregation correctness.
- API tests for paginated history and access rules.
- E2E tests for create -> vote -> close -> history retrieval flow.

## Implementation Notes

- Filters: `status`, `from`, `to` dates applied server-side in `PollService.listOwn()`
- Pagination: Native Prisma skip/take with total count
- Results: Computed from stored vote data on demand (no materialized views)
