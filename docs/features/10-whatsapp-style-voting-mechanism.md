# Feature 10: WhatsApp-Style Voting Mechanism

## Goal

Introduce a messaging-app-style poll experience (similar to WhatsApp patterns): fast participation, transparent vote visibility, and easy vote changes.

## Status

Planned.

## Scope

In scope:

- Quick poll compose flow optimized for mobile/low-friction usage.
- Transparent vote mode where users can see who voted for each option.
- Optional multi-select mode (creator-controlled).
- Vote change support (user can change/remove previous vote).
- Per-option voter list in poll detail.

Out of scope:

- Anonymous polls in this slice (handled as configurable extension in feature 03).
- Threaded comments/chat-level reactions.

## User Journeys

1. User creates poll quickly with multiple options.
2. Participant votes and can immediately see vote counts and voter lists by option.
3. Participant changes vote; results update and old selection is replaced.
4. Poll owner can enable/disable multiple answers when creating the poll.

## Acceptance Criteria

- Vote visibility reflects selected mode (`transparent` for this feature).
- When multi-select is disabled, each participant has exactly one active vote.
- When multi-select is enabled, participant can hold multiple active votes (bounded by max options).
- Changing a vote updates tallies and participant-to-option mapping atomically.
- Client displays "who voted" for each option without requiring page refresh when stream is active.

## API Touchpoints (Planned)

- `POST /polls` with voting mode fields: `visibilityMode`, `allowMultipleAnswers`.
- `POST /polls/:id/votes` as upsert/replace semantics.
- `DELETE /polls/:id/votes/my/:optionId` (if explicit deselect endpoint is used).
- `GET /polls/:id/results` returns option totals + voter identities for transparent polls.

## Data Touchpoints (Planned)

- Extend `Poll` with `visibilityMode` and `allowMultipleAnswers`.
- Extend `Vote` uniqueness rules to support one-vote or multi-vote modes.
- Optional `VoteHistory` table for audit/troubleshooting of vote changes.

## Frontend Touchpoints (Planned)

- Poll composer controls for multi-answer toggle.
- Poll option rows with count + voter preview.
- Option voters sheet/modal for full voter list.
- Vote-change UX with clear active selection indicators.

## Testing

- Unit tests: mode rules (single-select vs multi-select), vote replacement semantics.
- Integration tests: update vote path and transparent voter list correctness.
- E2E: create poll -> vote -> change vote -> verify visible voter mapping.

## Technical Debt

Current debt:

- No vote-mode abstraction exists yet.

Planned debt risk:

- Privacy confusion if transparent/anonymous behavior is not explicit.
- Complex vote-update logic can create race-condition bugs.

Mitigation:

- Enforce explicit visibility mode in DTO + UI labels.
- Use transaction-safe vote updates with strong DB constraints.
