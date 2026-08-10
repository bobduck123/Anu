# PEACH Gate 11 Steward Review Evidence

Date: 2026-07-31

## Protected workspace

Steward workspace route:

- `/control/peach` -> `HTTP/1.1 200 OK` on local control-allowed host.

Unauthenticated control proxy request:

- `/api/control/core/api/control/peach/contributions` -> `HTTP/1.1 401 Unauthorized`
- Error code: `control_session_required`

Backend direct unauthenticated control API in rehearsal:

- `GET /api/control/peach/contributions` -> 401

## Review outcomes

| Contribution id | Label | Target status | Result | publicDisplay |
| --- | --- | --- | --- | --- |
| 1 | Gate11 Participant A | `held` | `held` | false |
| 2 | Gate11 Participant B | `accepted_private` | `accepted_private` | false |
| 3 | Gate11 Participant C | `rejected` | `rejected` | false |

## Steward-visible fields verified

The rehearsal response verified these steward-visible fields:

- consent version: `gate9-v1`
- consent level
- credit preference
- visibility preference
- Yield permission
- sensitive flag
- youth flag
- review status
- public display false

## Audit proof

- `peach.contribution.review_status_changed`: 3
- `PeachContributionReviewEvent` rows: 3

## Public display proof

Every reviewed contribution retained `publicDisplay: false`. No public display toggle was used or exposed in the steward workflow.