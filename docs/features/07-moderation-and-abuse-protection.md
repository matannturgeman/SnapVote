# Feature 07: Moderation and Abuse Protection

## Goal

Protect poll integrity and participant safety with practical anti-abuse controls.

## Status

Planned.

## Scope

In scope:

- Rate limiting for vote and auth-adjacent abuse surfaces.
- Basic reporting and owner moderation actions (lock/remove/close).
- Input hygiene and suspicious activity logging.

Out of scope:

- Full trust-and-safety platform or ML-based abuse scoring.

## User Journeys

1. Participant attempts excessive repeat actions and is throttled.
2. Owner reports abusive poll behavior and takes moderation action.
3. System logs key abuse events for triage.

## Acceptance Criteria

- High-frequency abuse patterns are rate-limited server-side.
- Moderation actions are audit-logged.
- Reported content path exists with clear status transitions.
- Security-sensitive errors avoid information leakage.

## API Touchpoints (Planned)

- Report endpoint family (for poll or participant behavior).
- Owner moderation endpoint family (close/lock participant access).
- Reuse existing auth identity for action attribution.

## Data Touchpoints (Planned)

- `ModerationReport` and action-log entities.
- Redis-backed counters for throttling windows.

## Frontend Touchpoints (Planned)

- Report abuse action in poll screens.
- Owner moderation panel with action confirmations.
- Clear user feedback for throttling and blocked actions.

## Testing

- Unit tests for throttling and moderation policy decisions.
- Integration tests for report creation and action auditing.
- E2E abuse simulations for repeated vote attempts.

## Technical Debt

Current debt:

- No centralized moderation model or rate-limit policy currently enforced.

Planned debt risk:

- Inconsistent limits across endpoints cause policy gaps.

Mitigation:

- Define shared abuse policy constants.
- Apply consistent middleware/guard strategy and central audit logging.
