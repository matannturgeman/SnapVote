# Feature 08: Observability and Operability

## Goal

Ensure SnapVote is operable in production with actionable telemetry, alerting, and runbook-ready diagnostics.

## Status

Partially implemented baseline.

## Scope

In scope:

- Request telemetry enhancement and product-domain instrumentation.
- Operational dashboards and alert thresholds.
- Traceability for critical flows (auth, poll create, vote cast, stream health).

Out of scope:

- Full distributed tracing platform migration in v1.

## Current Baseline

- Request telemetry interceptor and persistence exist:
- `apps/api/src/app/telemetry/telemetry.interceptor.ts`
- `apps/api/src/app/telemetry/telemetry.service.ts`
- Payload redaction and Redis fallback behavior already implemented.

## User/Operator Journeys

1. Operator identifies spike in failed vote submissions quickly.
2. Operator traces a failed user flow using request ID and route context.
3. Team reviews release impact via key product metrics.

## Acceptance Criteria

- Critical feature slices emit structured events/metrics.
- Alerting covers auth failures, vote failures, stream disconnect spikes, and latency regressions.
- Telemetry keys/retention align with operational and privacy requirements.

## API/Infra Touchpoints

- Extend telemetry schema for poll/vote/result domain context.
- Add health/readiness endpoints for API + dependencies.
- Define stream health signals for SSE connections.

## Frontend Touchpoints

- Surface backend request IDs in error UI where useful.
- Track client-side stream reconnect and failure metrics.

## Testing

- Unit tests for telemetry enrichment/redaction rules.
- Integration tests for fallback behavior when RedisJSON is unavailable.
- Synthetic checks for core API and stream endpoints.

## Technical Debt

Current debt:

- Telemetry currently captures request-level data only; product KPIs are not formalized.
- No documented alert/runbook package for incident response.

Planned debt risk:

- Rapid feature growth without metric contracts will reduce debuggability.

Mitigation:

- Define metric/event contract per slice as part of feature definition of done.
- Maintain operations runbook alongside release notes.
