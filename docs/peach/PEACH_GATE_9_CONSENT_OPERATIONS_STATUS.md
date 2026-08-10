# PEACH Gate 9 Consent Operations Status

Date: 2026-07-30

Status: Held

## Implemented in Gate 9

Gate 9 implements explicit ConsentRecord persistence at contribution time. Each accepted submission creates a separate consent record with version, consent level, Yield permission, credit preference, visibility preference, accepted terms, and steward review metadata fields.

## Held from Gate 9

Consent operation requests were not implemented:

- Export request
- Withdrawal request
- Steward handling queue for consent operations
- Contributor identity verification for operations
- Automatic deletion or redaction
- Email automation

## Blockers

Consent operations need a contributor identity and verification policy before mutation routes are safe. They also need a clear effect model for withdrawal: whether withdrawal hides future use, redacts steward-only records, records a no-contact flag, removes draft Yield references, or triggers a manual review queue.

Export needs an approved bundle shape that avoids leaking steward notes, internal audit metadata, unrelated submitter data, and private control-plane context.

## Gate 10 recommendation

Gate 10 should add a minimal `PeachConsentOperationRequest` model and protected steward queue after the identity verification and export/withdrawal effect model are written down.
