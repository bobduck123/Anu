# PEACH Gate 8 ANU API And Control-Plane Spec

Status: Gate 8 contract
Date: 2026-07-30

## Public Read Contracts

| Contract | Method | Route/function | Request | Response | Permissions | Validation | Audit | Visibility | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Get active PEACH Field | GET | `/api/peach/fields/active`, `getActivePeachFieldResponse()` | None | `{ ok, data: { orchard, field } }` | Public read | None beyond static model integrity | None until backend | Public-safe projection only | Implemented in frontend route handler/read model |
| List PEACH Fields | GET | `/api/peach/fields`, `listPeachFields()` | None | `{ ok, data: [{ orchard, field }] }` | Public read | None beyond static model integrity | None until backend | Public-safe projection only | Implemented |
| Get Field by slug | GET | `/api/peach/fields/:slug`, `getPeachFieldBySlug(slug)` | `slug` path param | `{ ok, data: { orchard, field } }` or 404 | Public read | slug exact match against read model | None until backend | Public-safe projection only | Implemented |
| Get Field Vessels | GET | Future `/api/peach/fields/:slug/vessels` | `slug` | `{ vessels }` | Public read | field exists | None until backend | Public-safe rights/access metadata | Scaffolded inside Field response |
| Get Gatherings | GET | Future `/api/peach/fields/:slug/gatherings` | `slug` | `{ gatherings }` | Public read | field exists | None until backend | Public-safe schedule/purpose metadata | Scaffolded inside Field response |
| Get Commons placeholder/returned entries | GET | Future `/api/peach/fields/:slug/commons` | `slug` | `{ commonsEntries }` | Public read | field exists; only returned/placeholder entries | None until backend | No private contributions | Scaffolded inside Field response |

## Steward/Control-Plane Contracts

| Contract | Method | Route/function | Request | Response | Permissions | Validation | Audit | Visibility | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| List Fields | GET | Future `/api/control/peach/fields` or `/api/peach/steward/fields` | optional node scope | Field summaries | Control host + PEACH steward/platform role, or owner-scoped steward API | node scope must match claims | sensitive read audit if private statuses included | Private/control | Deferred |
| Read Field detail | GET | Future `/api/control/peach/fields/:id` | field id | Full Field including private state | PEACH steward/platform role | field belongs to allowed node | audit sensitive reads | Private/control | Deferred |
| Create/update Field | POST/PATCH | Future `/api/control/peach/fields` | Field payload | Field detail | PEACH steward/platform role | title/status/seed/soil/return/yield limits; no unsafe status jumps | audit mutation | Private/control until published projection | Deferred |
| Add/update Vessels | POST/PATCH | Future `/api/control/peach/fields/:id/vessels` | Vessel payload | Vessel detail | PEACH steward/platform role | type, title, rights, access, reason required | audit mutation | Private/control with public projection when Field public | Deferred |
| Add/update Gatherings | POST/PATCH | Future `/api/control/peach/fields/:id/gatherings` | Gathering payload | Gathering detail | PEACH steward/platform role | timing/format/purpose required | audit mutation | Private/control with public projection when Field public | Deferred |
| Review Contributions | PATCH | Future `/api/control/peach/contributions/:id/review` | reviewStatus, reason, publication flags | Contribution private detail | PEACH steward/platform role | only allowed transitions; cannot publish without consent | audit mutation | Private/control | Deferred |
| Read ConsentRecords | GET | Future `/api/control/peach/contributions/:id/consent-records` | contribution id | consent record list | PEACH steward/platform role | contribution scope | sensitive read audit | Private/control | Deferred |
| Read SupportIntents | GET | Future `/api/control/peach/support-intents` | field/node filters | intent list | PEACH steward/platform role | node/field scope | sensitive read audit | Private/control | Deferred |
| Read AuditLog | GET | Future `/api/control/peach/audit-log` | field/entity filters | event list | PEACH steward/platform auditor/platform role | node scope | audit read if sensitive | Private/control | Deferred |

## Contribution/Consent Contracts

| Contract | Method | Route/function | Request | Response | Permissions | Validation | Audit | Visibility | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Submit Contribution with ConsentRecord | POST | Future `/api/peach/fields/:slug/contributions` | promptId, contributionType, body/link, contributor contact, visibilityPreference, consentLevel, creditPreference, permissionForYield, sensitive/youth flags | contribution id, reviewStatus `pending_review` | Public or signed-in, rate limited | reject youth/sensitive while disabled; body limits; consent required | create contribution + consent audit | Private only | Deferred |
| Withdrawal/export request | POST | Future `/api/peach/consent-operations` | contribution/contact/requestType/details | request id, status | Public or signed-in, rate limited | identity/contact verification path required | audit request | Private/control | Deferred |
| Unsafe submission hold | POST | Same as submit | sensitive/youth/rights-complex payload | rejected or held response | Public or signed-in | hard reject until policy exists | audit rejected attempt if persisted | Private | Deferred |

Gate 8 leaves contribution intake disabled in UI/read model. Public routes contain no forms or submission endpoints.

## Support Contracts

| Contract | Method | Route/function | Request | Response | Permissions | Validation | Audit | Visibility | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Read support options | GET/read model | included in Field response | None | membership, one-off support, sponsor access, sponsor Field, sponsor Yield | Public read | `paymentTaken` must be false | None until backend | Public-safe purpose copy only | Implemented |
| Create SupportIntent | POST | Future `/api/peach/fields/:slug/support-intents` | supportPath, supporterName/contact, intendedUse, fieldRelationship | intent id, `paymentTaken: false` | Public or signed-in, rate limited | no checkout/cart/product ids; contact limits | audit create | Private/control after submission | Deferred |

## Implementation Notes

The implemented Gate 8 public route handlers are frontend read handlers, not final core backend persistence. They are useful because public pages and API consumers now read the same typed ANU PEACH shape. Mutating contracts remain deferred until Gate 9 can implement backend models, migrations, auth, rate limits, and audit logging together.
