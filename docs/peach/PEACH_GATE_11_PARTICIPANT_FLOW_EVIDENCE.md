# PEACH Gate 11 Participant Flow Evidence

Date: 2026-07-31
Field: Studying Ourselves
Seed: What does a community learn when it studies itself as seriously as institutions study it?

## Route opened

Local route check:

- `/peach/fields/studying-ourselves` -> `HTTP/1.1 200 OK`
- `/peach/fields/studying-ourselves/contribute` -> `HTTP/1.1 200 OK`

## Test participants

All participant labels are synthetic rehearsal labels, not real personal data.

| Label | Contribution type | Consent level | Credit preference | Visibility preference | Yield permission | Submit result |
| --- | --- | --- | --- | --- | --- | --- |
| Gate11 Participant A | `text_reflection` | `private_to_stewards` | `chosen_name` | `private` | false | created id 1 |
| Gate11 Participant B | `question` | `internal_discussion` | `pseudonym` | `internal` | true | created id 2 |
| Gate11 Participant C | `research_note` | `follow_up_required` | `follow_up_before_crediting` | `follow_up_required` | false | created id 3 |

## Persistence proof

Each contribution response omitted `body` and `bodyText` from the public response. The database stored each body privately.

Database state after submission and review:

| Contribution id | Type | Initial status | Final status | publicDisplay | body stored privately |
| --- | --- | --- | --- | --- | --- |
| 1 | `text_reflection` | `pending_review` | `held` | false | true |
| 2 | `question` | `pending_review` | `accepted_private` | false | true |
| 3 | `research_note` | `pending_review` | `rejected` | false | true |

## ConsentRecord proof

ConsentRecord count: 3.

Each reviewed contribution showed consent version `gate9-v1` through the steward response.

## Audit proof

`peach.contribution.created`: 3.

## Public non-display proof

Public active Field API returned `publicContributionDisplay: false`, `sensitiveMaterialCollection: false`, `youthMaterialCollection: false`, no submitted contribution bodies, and support options with `paymentTaken: false`.