# Feature 14: Real-Time Vote Notifications

## Goal

Notify users in real time when someone votes on:

- A poll they created, or
- A poll they have voted on.

## Status

Not implemented.

## Scope

In scope:

- In-app real-time notifications for vote events.
- Notification targeting for poll owners and participant-watchers.
- Unread/read notification state.
- Notification center panel/page in client.
- Event deduplication and rate controls.

Out of scope:

- Email/push/SMS channels (future extension).
- Cross-device sync guarantees beyond primary session (v1 best-effort realtime + persisted feed).

## User Journeys

1. User creates a poll and receives real-time alerts when others vote.
2. User votes on a poll and receives later vote activity alerts on that poll.
3. User opens notification center, sees unread items, and marks them read.
4. User clicks a notification and lands on the relevant poll/results view.

## Acceptance Criteria

- Vote event triggers notification delivery to owner and eligible participants.
- Notification appears in real time while user is connected.
- Notification persists in feed for later retrieval if user was offline.
- Duplicate notifications for same event/user are prevented.
- Notification payload includes poll id, poll title, actor (if visible), timestamp, and deep-link target.

## API Touchpoints (Planned)

- `GET /notifications?unreadOnly=&page=&limit=`
- `POST /notifications/:id/read`
- `POST /notifications/read-all`
- `GET /notifications/stream` (SSE/WebSocket for live delivery)

Domain event source:

- Vote-write flow (`POST /polls/:id/votes`) publishes `vote.created` / `vote.updated` events.

## Data/Infra Touchpoints (Planned)

- `Notification` model with recipient, type, payload, readAt, createdAt.
- Redis pub/sub channel(s) for live fan-out to connected recipients.
- Optional outbox table/event-log for reliable publish + replay.

## Frontend Touchpoints (Planned)

- Notification bell/badge in app shell.
- Real-time notification listener client.
- Notification list UI with read/unread state and deep links.

## Testing

- Unit tests for targeting rules (owner vs voter vs actor self-notify policy).
- Integration tests for vote event -> notification persistence -> stream delivery.
- E2E tests: two users in same poll; one votes; other sees live notification.

## Technical Debt

Current debt:

- No notification domain, stream endpoint, or notification UI currently exists.

Planned debt risk:

- Lost/duplicate notifications if event delivery is not durable.
- Notification noise/spam on very active polls.

Mitigation:

- Use durable event pipeline (outbox + retry) for at-least-once with dedupe.
- Add notification preferences and rate limits in future iteration.
- Keep notification contract versioned and minimal.
