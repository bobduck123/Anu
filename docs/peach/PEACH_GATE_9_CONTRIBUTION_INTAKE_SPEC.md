# PEACH Gate 9 Contribution Intake Spec

Date: 2026-07-30

## Surface

Frontend route:

- `/peach/fields/studying-ourselves/contribute`

Backend route:

- `POST /api/peach/fields/studying-ourselves/contributions`

Only Field 001, `studying-ourselves`, is enabled for Gate 9 private pilot intake.

## Fields

The form and API capture:

- Adult-only declaration
- Contribution type
- Contribution body
- Contributor chosen credit
- Contact method
- Visibility preference
- Credit preference
- Consent level
- Permission for Yield
- Sensitive-material declaration
- Youth-material declaration
- Consent terms acceptance

The backend stores consent version `gate9-v1` with each ConsentRecord.

## Validations

The API rejects:

- Unknown field slugs
- Invalid contribution type
- Invalid visibility preference
- Invalid credit preference
- Invalid consent level
- Missing body
- Body over 5000 characters
- Missing chosen credit
- Missing contact method
- Missing adult-only declaration
- Missing accepted terms
- Sensitive-material submissions
- Youth/child-material submissions

## Consent copy boundary

Gate 9 consent is a private pilot consent record. It records contributor preference, credit preference, Yield permission, and accepted terms. It does not authorize public publication, public Commons release, youth collection, sensitive testimony collection, file upload, payment capture, or automatic deletion/export workflows.

## Success state

A successful submission creates:

- `PeachContribution.review_status = pending_review`
- `PeachContribution.public_display = false`
- A separate `PeachConsentRecord`
- A `peach.contribution.created` audit event

The public response returns contribution id, field slug, review status, public display false, and consent version. It does not return the contribution body.

## Privacy state

Submitted bodies are steward-private. Public PEACH routes and public PEACH read APIs continue to render Field 001 without displaying contribution bodies.
