# Feature 04: Vote Casting and Idempotency

## Goal

Provide a fast and reliable vote-write path with clear deduplication rules.

## Status

Implemented.

## Scope

In scope:

- Cast vote for a poll option.
- Enforce one-vote policy per participant identity (configurable extension later).
- Support safe retry behavior without duplicate vote creation.
- Return immediate updated tally payload for UX responsiveness.

Out of scope:

- Ranked-choice voting.
- Weighted voting.

## User Journeys

1. Participant selects an option and submits vote once.
2. Network retry does not create duplicate vote.
3. Participant sees confirmation and current tally snapshot.

## Acceptance Criteria

- Vote endpoint is idempotent for same participant/poll identity.
- Closed polls reject vote submissions.
- Invalid option IDs are rejected with clear errors.
- Vote write and tally update behavior is transaction-safe.

## API Touchpoints (Planned)

- `POST /polls/:id/votes`
- `GET /polls/:id/results` (read-your-write response parity)

## Data Touchpoints (Planned)

- `Vote` model with unique constraints for dedupe key.
- Suggested unique key baseline: (`pollId`, `participantId`) for one-vote policy.
- Optional `idempotencyKey` support for client retries.

## Frontend Touchpoints (Planned)

- Vote panel component with disabled state after submit.
- Mutation hooks and optimistic/loading/error states.
- Reconciliation with realtime stream when enabled (feature 05).

## Testing

- Unit tests for idempotency and closed-poll enforcement.
- Integration tests for duplicate submissions and race conditions.
- E2E tests for vote once, retry once, and closed poll rejection.

## Technical Debt

Current debt:

- No vote domain/test harness exists yet.

Planned debt risk:

- Idempotency implemented in client only instead of server constraints.

Mitigation:

- Enforce unique constraints at database level.
- Keep endpoint idempotency logic in server domain layer.
- Add concurrency tests before rollout.
