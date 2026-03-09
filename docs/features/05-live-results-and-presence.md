# Feature 05: Live Results and Presence

## Goal

Deliver real-time transparency by streaming poll result updates and participant presence signals.

## Status

Planned.

## Scope

In scope:

- Stream result updates for active polls.
- Broadcast vote-driven tally changes.
- Lightweight presence count (participants currently connected/viewing).

Out of scope:

- Rich collaborative cursors or chat.
- Guaranteed exactly-once real-time delivery semantics.

## User Journeys

1. Participant votes and sees chart/tallies update live.
2. Other viewers observe changes without page refresh.
3. Owner sees active audience count while poll is open.

## Acceptance Criteria

- Stream endpoint emits updates quickly after vote writes.
- Client can reconnect and resync without stale state.
- Presence metric is eventually consistent and non-blocking.
- Poll closure event propagates to connected clients.

## API Touchpoints (Planned)

- `GET /polls/:id/stream` (SSE default for MVP)
- `GET /polls/:id/results` for initial snapshot and reconnect sync

## Data/Infra Touchpoints (Planned)

- Redis pub/sub channels per poll for fan-out.
- Optional ephemeral presence keys with TTL in Redis.

## Frontend Touchpoints (Planned)

- EventSource client integration in poll results view.
- Real-time chart updates and connection state indicators.
- Fallback polling mode if stream is unavailable.

## Testing

- Integration tests for publish/subscribe and disconnect/reconnect behavior.
- Contract tests for stream event payload format.
- E2E tests covering multi-client live updates.

## Technical Debt

Current debt:

- Redis currently used for telemetry storage but no product-domain streaming.

Planned debt risk:

- Tight coupling of vote write path and stream emitter can reduce reliability.

Mitigation:

- Publish domain events after transaction commit.
- Keep stream consumer resilient and replay from canonical `GET /results`.
- Document event versioning for future compatibility.
