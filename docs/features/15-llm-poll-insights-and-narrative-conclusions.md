# Feature 15: LLM Poll Insights and Narrative Conclusions

## Goal

Send aggregated poll data to an LLM (for example ChatGPT) and receive human-readable insights such as:

- "Most Americans voted X while most Europeans voted Y"
- "We can conclude Z likely happened because W"

## Status

Not implemented.

## Scope

In scope:

- Generate AI narrative summaries from poll result aggregates.
- Segment-aware analysis by theme/category and region (when region data is available).
- Per-poll insight generation and refresh.
- Confidence/disclaimer metadata in every AI response.
- Insight history per poll.

Out of scope:

- Raw PII sharing with model providers.
- Fully automated business decisions based only on AI output.

## User Journeys

1. Poll owner clicks "Analyze with AI" from poll results page.
2. System sends aggregated results (not raw sensitive identities) to LLM service.
3. User receives narrative summary with key patterns, comparisons, and caveats.
4. User filters by region/theme and regenerates analysis.

## Acceptance Criteria

- Insights are generated from structured aggregates, not raw uncontrolled text dumps.
- Region comparison only runs when sufficient sample size exists.
- Response always includes: summary, observed patterns, confidence note, and "do not over-generalize" warning.
- Prompt/version metadata is stored for reproducibility.
- Users can regenerate insights after new votes.

## API Touchpoints (Planned)

- `POST /polls/:id/insights/llm` (create/generate insight job)
- `GET /polls/:id/insights/llm` (latest and historical runs)
- Optional async status endpoint: `GET /polls/:id/insights/llm/:runId`

## Data Touchpoints (Planned)

- `PollInsight` model with fields: pollId, promptVersion, modelName, inputSnapshotHash, outputText, confidenceLabel, createdAt.
- Region/theme aggregate dataset generated from vote stats pipeline.
- Optional redaction layer before provider call.

## Frontend Touchpoints (Planned)

- "Analyze with AI" action in poll results page.
- Insight panel with sections:
- Summary
- Regional comparison
- Suggested conclusion
- Caveats and confidence
- Regenerate button with filter controls (theme/category/region/time window).

## Testing

- Unit tests for payload builder and redaction layer.
- Integration tests for job lifecycle and provider failure handling.
- Snapshot/contract tests for required response sections.
- E2E: create poll -> votes -> generate AI insight -> render narrative.

## Technical Debt

Current debt:

- No AI pipeline or LLM integration exists in the codebase.

Planned debt risk:

- Hallucinated conclusions or overconfident narratives.
- Privacy/compliance risk when sending data to external LLM provider.
- Prompt drift causing inconsistent output quality.

Mitigation:

- Use strict structured input templates + output schema validation.
- Send aggregated/anonymized data only.
- Enforce sample-size thresholds for regional claims.
- Store prompt/model versions and audit logs for every run.
- Show explicit caveats and confidence in UI.
