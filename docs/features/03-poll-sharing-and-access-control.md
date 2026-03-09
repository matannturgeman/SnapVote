# Feature 03: Poll Sharing and Access Control

## Goal

Enable poll distribution with clear, enforceable access rules for owners and participants.

## Status

Planned.

## Scope

In scope:

- Generate share links for active polls.
- Define poll visibility modes (private owner-only edit, participant vote access).
- Validate participant entry into poll context.
- Basic join/participant identity context for vote ownership and dedupe.

Out of scope:

- Enterprise org/team permission model.
- External identity provider-based ACLs.

## User Journeys

1. Owner copies a share link and sends it to participants.
2. Participant opens link and can access vote screen if poll is open.
3. Unauthorized users are blocked from owner operations.

## Acceptance Criteria

- Share links are unique and bound to a specific poll.
- Owner-only endpoints reject non-owner requests.
- Closed polls can still be viewed but cannot accept new votes.
- Participant access checks are deterministic and auditable.

## API Touchpoints (Planned)

- Poll metadata fields in `GET /polls/:id` to indicate access mode.
- Optional share lifecycle endpoints:
- `POST /polls/:id/share-links`
- `DELETE /polls/:id/share-links/:linkId` (if revocation is included in MVP)

## Data Touchpoints (Planned)

- `PollShareLink` model (token/hash, pollId, status, expiresAt optional).
- `PollParticipant` model or lightweight identity strategy for anonymous voters.

## Frontend Touchpoints (Planned)

- Share panel in poll owner UI.
- Join/access screen for link visitors.
- Access error states (expired/invalid/revoked/closed).

## Testing

- Unit tests for access policy decisions.
- API tests for owner vs participant permissions.
- E2E tests for invite link happy path and revoked-link denial path.

## Technical Debt

Current debt:

- Existing auth authorization is route-level, not poll-policy-level.

Planned debt risk:

- Access logic scattered across controllers and client checks.

Mitigation:

- Introduce centralized poll policy evaluator.
- Keep client checks purely UX-level; server remains source of truth.
