# Feature 02: Poll Creation and Management

## Goal

Allow authenticated users to create polls quickly, edit them safely, and close them when a decision is complete.

## Status

Implemented.

## Scope

In scope:

- Create poll with title, description (optional), options, and lifecycle settings.
- Read poll details for owner and participants.
- Update poll metadata/options before closure.
- Close poll to stop voting.

Out of scope:

- Multi-round/weighted voting.
- Scheduled publishing workflows.

## User Journeys

1. Authenticated user creates a poll in under one minute.
2. Owner edits poll wording/options before votes begin.
3. Owner closes poll when final decision is reached.

## Acceptance Criteria

- Poll creation enforces valid option set and ownership.
- Poll updates are rejected after closure (except owner metadata where explicitly allowed).
- Poll close transitions state atomically and blocks new votes.
- Poll read endpoint returns clear status (`draft`, `open`, `closed`).

## API Touchpoints (Planned)

- `POST /polls`
- `GET /polls/:id`
- `PATCH /polls/:id`
- `POST /polls/:id/close`

## Data Touchpoints (Planned)

- Add `Poll` and `PollOption` models in `prisma/schema.prisma`.
- Add owner relationship to `User`.
- Add lifecycle timestamps (`openedAt`, `closedAt`).

## Frontend Touchpoints (Planned)

- Poll create/edit screens in `apps/client/src/app`.
- Poll API slice additions in `libs/client/server-communication`.
- Poll draft state and validation flow in `libs/client/store` or local feature state.

## Testing

- Unit tests for poll service rules (valid options, close behavior).
- API integration tests for create/read/update/close.
- UI tests for creation form validation and close confirmation.
- E2E: create -> share -> close lifecycle happy path.

## Technical Debt

Current debt:

- No poll domain currently exists; new feature must avoid ad-hoc patterns.

Planned debt risk:

- Business rules duplicated between DTO validation and service logic.

Mitigation:

- Define `Poll*Dto`/schemas once in shared libs.
- Keep closure and ownership checks in a single domain service.
