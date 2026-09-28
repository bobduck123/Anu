# PEACH Gate 6 Consent Operations

Status: scaffolded with durable steward record

## Contributor Rights

Gate 6 gives contributors a basic way to request:

- withdrawal review;
- export review.

## Public Flow

Route:

- `/consent/request`

API:

- `POST /api/public/consent-operations`

The request captures requester name, contact method, optional contribution id, request type, and details.

## Steward Workflow

Requests appear on `/steward/contributions` under Consent operations. Status starts as:

```text
pending_steward_review
```

No automatic deletion, export, publication, or consent change happens.

## Automated

- Durable request record.
- Audit event.
- Public confirmation that the request is steward-reviewed.

## Manual

- Identity/contact verification.
- Matching request to contribution if contributor omitted id.
- Preparing export.
- Deciding whether and how to withdraw material.
- Recording completion outside the current scaffold.

## Public Launch Blockers

- No automated export bundle.
- No formal deletion/retention workflow.
- No legal identity verification flow.
- No status update UI for consent operation requests.
- No contributor notification.
