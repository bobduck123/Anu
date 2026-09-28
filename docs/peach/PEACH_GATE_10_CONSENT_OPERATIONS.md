# PEACH Gate 10 Consent Operations

Date: 2026-07-31

## Status

Implemented as durable manual operation requests.

## Model

`PeachConsentOperationRequest` persists:

- `id`
- `contribution_id` nullable
- `contributor_contact`
- `contributor_credit_or_name`
- `operation_type`: `export` or `withdrawal`
- `request_detail`
- `status`: `pending_steward_review`, `in_review`, `completed`, `rejected`
- `steward_note`
- `created_at`
- `updated_at`
- `reviewed_at`
- `reviewed_by`

## Public request route

`POST /api/peach/consent/request`

The public form is available at `/peach/consent/request`.

The form explains that requests are manual, there is no automatic deletion, public contributions are disabled, the pilot is adult/non-sensitive only, and steward response may be manual.

## Validation

The backend rejects invalid operation type, missing contact, missing name/credit, missing request detail, missing adult-only declaration, missing terms acceptance, sensitive-material flag, youth-material flag, and unknown referenced contribution id.

## Steward routes

- `GET /api/control/peach/consent-operations?status=pending_steward_review`
- `PATCH /api/control/peach/consent-operations/<id>`

Stewards can move requests to `in_review`, `completed`, or `rejected` and add a steward note. Request details are never exposed through public APIs.

## Audit events

- `peach.consent_operation.request_created`
- `peach.consent_operation.status_changed`
- `peach.consent_operation.steward_note_changed`

## Remaining limits

Gate 10 still does not automate export bundle production, identity verification, deletion, redaction, email notification, or public-release consequences. Those remain manual steward responsibilities during rehearsal.