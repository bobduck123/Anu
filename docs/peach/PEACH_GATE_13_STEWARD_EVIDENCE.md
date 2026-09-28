# PEACH Gate 13 Steward Evidence

Date: 2026-07-31

## Pilot mode

Surrogate-only pilot against staging-equivalent PostgreSQL.

## Steward protection

Unauthenticated steward contribution route:

`GET /api/control/peach/contributions`

Result:

`401`

Unauthenticated frontend control proxy:

`GET /api/control/core/api/control/peach/contributions`

Result:

`HTTP/1.1 401 Unauthorized`, `control_session_required`

## Pending queue

Before review:

- `pending_review`: 3
- `held`: 0
- `accepted_private`: 0
- `rejected`: 0

## Steward review results

| Participant | Contribution ID | Steward could see body | Steward could see consent | Steward could see credit/visibility/Yield permission | Review status | Public display |
| --- | --- | --- | --- | --- | --- | --- |
| Participant A | 1 | Yes | Yes | Yes | `held` | `false` |
| Participant B | 2 | Yes | Yes | Yes | `accepted_private` | `false` |
| Participant C | 3 | Yes | Yes | Yes | `rejected` | `false` |

## Audit evidence

- `peach.contribution.review_status_changed`: 3
- `peach_contribution_review_event` rows: 3

## Workflow notes

The steward workflow was understandable in surrogate mode:

- list pending Contributions;
- open detail to see body and consent;
- review with a steward note;
- keep all reviewed Contributions private.

`accepted_private` remains private pilot acceptance. It does not publish participant material.
