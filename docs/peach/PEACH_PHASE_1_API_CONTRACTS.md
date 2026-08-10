# PEACH Phase 1 API Contracts

## Purpose

This document defines implementation-ready contracts for Phase 1 APIs or server functions. Routes are examples; a final framework may implement them as REST handlers, RPC/server actions, or controller functions.

All contracts must keep `Field` as the central primitive. Books are only `Vessel.type=book`.

## Shared Rules

- Public reads return only public/visible data.
- Admin writes require `steward` or `admin`.
- Contribution writes must create or attach a `ConsentRecord`.
- No Contribution may become public without steward review and compatible consent.
- Support records may be manual/external, but metadata must be durable.
- Sensitive actions create audit events.

## Public Read Contracts

| Contract | Purpose | Route/function | Method | Request shape | Response shape | Validation | Permissions | Error states | Audit/logging |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Get active Field | Return the current Phase 1 Field. | `getActiveField` / `/api/public/field/active` | GET | none | `{ field, seed, soil, vessels, gatherings, tendingPrompts, yield, supportOptions, returnPlan, steward }` | Field `visibility=public`, status not `draft`. | Public. | `404_no_active_field`; `409_field_not_public`. | Optional public read analytics. |
| Get Field by slug | Return one public Field. | `getFieldBySlug` / `/api/public/fields/:slug` | GET | `{ slug: string }` | Same as active Field plus status-specific actions. | Slug required; draft hidden unless preview token. | Public or preview token. | `404_field_not_found`; `403_hidden`; `410_archived_restricted`. | Optional public read analytics. |
| Get Commons entries | Return returned Fields/Yields. | `getCommonsEntries` / `/api/public/commons` | GET | `{ limit?, cursor? }` | `{ entries: CommonsEntry[], nextCursor? }` | Only public/community-access returned entries. | Public. | `200_empty`; `500_read_failed`. | Optional analytics. |
| Get Gathering details | Return public Gathering details. | `getGatheringById` / `/api/public/gatherings/:id` | GET | `{ gatheringId: uuid }` | `{ gathering, fieldSummary, rsvpState }` | Gathering public/unlisted with valid access; cancelled status shown. | Public. | `404_not_found`; `403_private`; `410_cancelled`. | Optional analytics. |

## Steward/Admin Contracts

| Contract | Purpose | Route/function | Method | Request shape | Response shape | Validation | Permissions | Error states | Audit/logging |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Create/update Field | Create or edit Field shell. | `upsertField` / `/api/admin/fields` | POST/PATCH | `{ id?, title, slug, shortDescription, status, visibility, primaryStewardId, seasonLabel, supportCopy, returnPlan }` | `{ field }` | Steward required; slug unique; status transition valid. | Steward/admin. | `400_invalid`; `409_slug_exists`; `403_forbidden`. | Audit create/update/status/visibility. |
| Update Seed/Soil | Edit central Seed and context. | `updateFieldFraming` / `/api/admin/fields/:id/framing` | PATCH | `{ seed: { text, reasonForNow, tensionNote }, soil: [{ summary, body, visibility, sourceNotes? }] }` | `{ seed, soil }` | Public Field requires approved Seed and Soil summary. | Steward/admin. | `400_seed_too_vague`; `403_forbidden`. | Audit Seed revisions and public Soil revisions. |
| Add/update/remove Vessels | Manage Field Vessels. | `mutateVessels` / `/api/admin/fields/:id/vessels` | POST/PATCH/DELETE | `{ vesselId?, type, title, accessPath, whyItBelongs, rightsNote, visibility, sortOrder }` | `{ vessels }` | Type from VesselType; rights note required; no product fields. | Steward/admin. | `400_missing_rights`; `400_invalid_type`; `403_forbidden`. | Audit add/edit/remove/reorder. |
| Create/update Gatherings | Manage interpretive moments. | `mutateGathering` / `/api/admin/fields/:id/gatherings` | POST/PATCH | `{ gatheringId?, title, format, status, startsAt?, availabilityWindow?, facilitator, purpose, accessDetails }` | `{ gathering }` | Must have startsAt or window; purpose tied to Field. | Steward/admin. | `400_missing_time`; `400_detached_event`; `403_forbidden`. | Audit schedule/cancel/recording changes. |
| Create/update TendingPrompts | Manage prompts. | `mutateTendingPrompt` / `/api/admin/fields/:id/prompts` | POST/PATCH | `{ promptId?, promptText, acceptedContributionTypes, consentNote, reviewNote, status, visibility }` | `{ prompt }` | Prompt not coercive; consent and review copy required. | Steward/admin. | `400_missing_consent`; `400_unsafe_prompt`; `403_forbidden`. | Audit prompt text/status changes. |
| Create/update Yield | Define and release Yield metadata. | `mutateYield` / `/api/admin/fields/:id/yield` | POST/PATCH | `{ yieldId?, title, format, description, status, makerId?, releaseTarget, artifactUrl? }` | `{ yield }` | Release requires consent/credit checklist. | Steward/admin. | `400_missing_artifact`; `409_consent_blocked`; `403_forbidden`. | Audit scope/release/artifact changes. |
| Mark Field lifecycle status | Move Field through lifecycle. | `transitionFieldStatus` / `/api/admin/fields/:id/status` | PATCH | `{ status: FieldStatus, reason }` | `{ field, checklist }` | Transition allowed; checklist gates public states. | Steward/admin. | `400_invalid_transition`; `409_checklist_failed`. | Audit required. |
| Return Field/Yield to Commons | Publish CommonsEntry and mark Returned. | `returnFieldToCommons` / `/api/admin/fields/:id/return` | POST | `{ yieldId, summary, credits, consentSummary, artifactUrl, vesselsUsed, gatheringsHeld, selectedContributions?, futureQuestions? }` | `{ commonsEntry, field }` | Exclude private/unconsented material; artifact accessible; credits present. | Steward/admin. | `409_consent_blocked`; `409_missing_yield`; `400_private_material`. | Audit Return checklist and publication. |

## Contribution/Consent Contracts

| Contract | Purpose | Route/function | Method | Request shape | Response shape | Validation | Permissions | Error states | Audit/logging |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Submit Contribution | Collect a Contribution into pending review. | `submitContribution` / `/api/public/contributions` | POST | `{ fieldId, promptId?, contributor: { chosenCredit, contactMethod? }, type, body?, fileUrl?, externalLink?, visibilityPreference, consentLevel, creditPreference, yieldPermission, sensitiveMaterial, withdrawalAck }` | `{ contributionId, reviewStatus: "pending", consentRecordId, message }` | Field/prompt open; body/file/link present; consent/credit required; youth flag blocks publication. | Public. | `400_missing_consent`; `400_no_content`; `403_intake_closed`. | Audit submission; create ConsentRecord. |
| Attach ConsentRecord | Add versioned consent. | `attachConsentRecord` / `/api/contributions/:id/consent` | POST | `{ consentLevel, visibilityPreference, creditPreference, yieldPermission, consentTextVersion, scopeNote? }` | `{ consentRecord }` | Must belong to Contribution; append/supersede, do not overwrite. | Contributor flow or steward/admin. | `404_contribution`; `409_disputed`; `400_invalid_level`. | Audit consent creation. |
| Review Contribution | Steward opens review and records decision. | `reviewContribution` / `/api/admin/contributions/:id/review` | PATCH | `{ reviewStatus, decisionReason, stewardNotes?, requestFollowUp? }` | `{ contribution }` | Status transition valid; Level 6 cannot publish. | Steward/admin. | `409_consent_blocked`; `403_forbidden`; `400_invalid_status`. | Audit reviewer, reason, before/after. |
| Update visibility | Set public/private handling. | `updateContributionVisibility` / `/api/admin/contributions/:id/visibility` | PATCH | `{ visibility, reason }` | `{ contribution }` | Public visibility requires published status and compatible consent. | Steward/admin. | `409_unreviewed`; `409_consent_blocked`. | Audit visibility change. |
| Withdrawal/takedown placeholder | Record withdrawal or takedown request. | `requestContributionWithdrawal` / `/api/contributions/:id/withdrawal` | POST | `{ requesterContact, reason?, requestedAction }` | `{ requestId, status: "received" }` | Verify identity before destructive changes; public use stops while reviewed. | Public request or steward/admin. | `404_contribution`; `400_missing_contact`. | Audit request and outcome. |

## Support Metadata Contracts

| Contract | Purpose | Route/function | Method | Request shape | Response shape | Validation | Permissions | Error states | Audit/logging |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Create support intent/record | Record intent before external/manual payment. | `createSupportIntent` / `/api/public/support/intents` | POST | `{ supportPath, amount?, currency?, fieldId?, yieldId?, accessSupportQuantity?, supporter: { name, email, acknowledgementPreference } }` | `{ supportRecordId, status, nextStep }` | SupportPath valid; Field/Yield association when relevant; no editorial-control fields. | Public. | `400_invalid_support_path`; `400_missing_contact`. | Audit support intent. |
| Attach support to target | Associate support with Field/Yield/membership/access. | `attachSupportTarget` / `/api/admin/support/:id/target` | PATCH | `{ fieldId?, yieldId?, membershipPeriod?, accessSupportQuantity?, useCategory }` | `{ supportTransaction }` | Target compatible with supportPath. | Steward/admin. | `409_target_mismatch`; `403_forbidden`. | Audit metadata change. |
| Confirmation state | Mark manual/external support complete/failed. | `confirmSupportRecord` / `/api/admin/support/:id/confirm` | PATCH | `{ status, receiptReference?, provider?, providerPaymentId?, notes? }` | `{ supportTransaction }` | Completed needs receipt/reference and amount/currency. | Steward/admin or webhook later. | `400_missing_receipt`; `409_already_refunded`. | Audit status change. |
| Manual/external payment placeholder | Provide next step without payment provider. | `getSupportNextStep` / `/api/public/support/:id/next-step` | GET | `{ supportRecordId }` | `{ status, instructions, contactEmail }` | Support record exists. | Public with token or supporter email verification. | `404_support_record`. | Optional read log. |

## Error Shape

```json
{
  "error": {
    "code": "string",
    "message": "string",
    "details": {}
  }
}
```

## Audit Event Shape

```json
{
  "actorId": "uuid-or-public",
  "actorRole": "visitor|contributor|steward|admin|system",
  "action": "string",
  "objectType": "string",
  "objectId": "uuid",
  "previousState": {},
  "newState": {},
  "reason": "string",
  "createdAt": "datetime"
}
```

