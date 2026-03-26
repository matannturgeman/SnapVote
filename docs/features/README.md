
# SnapVote Features Roadmap

This folder defines feature slices for SnapVote development at `C:\Dev\SnapVote`.

## Status Matrix

| Feature | Status | Notes |
| --- | --- | --- |
| 00 Current State + Cross-Cutting Debt | Implemented (Doc) | Snapshot of repo reality and debt baseline |
| 01 Auth Session + Account Recovery | Implemented (Baseline) | Login/register/forgot/reset/logout/session bootstrap already exist |
| 02 Poll Creation + Management | Planned | No poll domain models/endpoints/UI yet |
| 03 Poll Sharing + Access Control | Planned | Depends on poll domain and identity model |
| 04 Vote Casting + Idempotency | Planned | Depends on poll + participant identity strategy |
| 05 Live Results + Presence | Planned | Depends on vote events and stream delivery |
| 06 Results History + Insights | Planned | Depends on poll/vote persistence and metadata |
| 07 Moderation + Abuse Protection | Planned | Depends on sharing, voting, and reporting flows |
| 08 Observability + Operability | Partially Implemented | Request telemetry exists; product metrics/alerts/runbooks are missing |
| 09 Cleanup Technical Debt | Implemented (Doc) | Prioritized debt backlog for pre/post feature work |
| 10 WhatsApp-Style Voting Mechanism | Planned | Transparent voter lists, vote change, multi-answer mode |
| 11 User, Category, and Theme Vote Explorer | Planned | Filter polls by users/themes/categories; per-user vote exploration |
| 12 User Alignment and Outstanding Users Insights | Planned | "Most aligned" and "outstanding" user analytics |
| 13 User Statistics Page | Planned | Dedicated user profile page with stats + filters |
| 14 Real-Time Vote Notifications | Planned | Live notifications when someone votes on my poll or a poll I voted on |
| 15 LLM Poll Insights and Narrative Conclusions | Planned | AI-generated explanations from poll aggregates (regional/theme-aware) |

## Dependency Map

1. `01 Auth Session + Account Recovery` is the identity foundation.
2. `02 Poll Creation + Management` is the first product-domain slice.
3. `03 Poll Sharing + Access Control` builds on poll ownership and audience scope.
4. `04 Vote Casting + Idempotency` depends on poll state + access policy.
5. `10 WhatsApp-Style Voting Mechanism` depends on 03 + 04 for transparent voting UX.
6. `05 Live Results + Presence` depends on vote write path and result aggregation.
7. `14 Real-Time Vote Notifications` depends on 03 + 04 + 05 (targeting + vote events + stream transport).
8. `11 User, Category, and Theme Vote Explorer` depends on 02 + 03 + 04 and theme/category modeling.
9. `06 Results History + Insights` depends on finalized votes/results.
10. `12 User Alignment and Outstanding Users Insights` depends on 06 + 11.
11. `13 User Statistics Page` depends on 11 + 12 plus stable stats aggregation contracts.
12. `15 LLM Poll Insights and Narrative Conclusions` depends on 06 + 11 + 12 + 13 (clean aggregates + segmentation + metric definitions).
13. `07 Moderation + Abuse Protection` spans sharing, votes, and reporting signals.
14. `08 Observability + Operability` is cross-cutting, with telemetry baseline already in place.
15. `09 Cleanup Technical Debt` is ongoing and should be executed in parallel.

## Recommended Parallel Delivery Order

### Track A (Product Core)

1. 02 Poll Creation + Management
2. 04 Vote Casting + Idempotency
3. 10 WhatsApp-Style Voting Mechanism
4. 06 Results History + Insights

### Track B (Discovery + Analytics UX)

1. 11 User, Category, and Theme Vote Explorer
2. 12 User Alignment and Outstanding Users Insights
3. 13 User Statistics Page
4. 15 LLM Poll Insights and Narrative Conclusions

### Track C (Participation + Realtime + Safety)

1. 03 Poll Sharing + Access Control
2. 05 Live Results + Presence
3. 14 Real-Time Vote Notifications
4. 07 Moderation + Abuse Protection

### Track D (Platform + Quality)

1. 09 Cleanup Technical Debt (P0/P1 first)
2. 08 Observability + Operability expansion
3. Hardening and release-readiness checks across all slices

## Interface Baseline (Planned)

Primary API families to standardize across slices:

- `POST /polls`
- `GET /polls/:id`
- `PATCH /polls/:id`
- `POST /polls/:id/close`
- `POST /polls/:id/votes`
- `GET /polls/:id/results`
- `GET /polls/:id/stream` (MVP realtime via SSE + Redis pub/sub)
- `GET /notifications?unreadOnly=&page=&limit=`
- `POST /notifications/:id/read`
- `POST /notifications/read-all`
- `GET /notifications/stream`
- `GET /polls?theme=&category=&voterId=&ownerId=&page=&limit=`
- `GET /users/:id/votes?theme=&category=&page=&limit=`
- `GET /users/me/stats?theme=&category=&window=&mode=`
- `GET /users/:id/stats?theme=&category=&window=&mode=`
- `GET /themes`
- `GET /insights/users/alignment?userId=&theme=&category=&window=`
- `GET /insights/users/outstanding?theme=&category=&window=`
- `POST /polls/:id/insights/llm`
- `GET /polls/:id/insights/llm`

Planned shared DTO groups:

- `Poll*Dto`
- `Vote*Dto`
- `Result*Dto`
- `Presence*Dto`
- `Notification*Dto`
- `Theme*Dto`
- `Category*Dto`
- `UserVoteExplorer*Dto`
- `UserAlignment*Dto`
- `UserStats*Dto`
- `LlmInsight*Dto`
