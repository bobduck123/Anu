# PEACH Gate 12 Consent Operation Policy Draft

Date: 2026-07-31

## Scope

This draft defines the manual operating policy for PEACH export and withdrawal requests before any public pilot or Commons/Yield release.

## Export request handling

1. Receive request through the PEACH consent request route.
2. Persist the request as `pending_steward_review`.
3. Steward verifies the request relates to an existing contribution and confirms requester identity or contact path before disclosure.
4. Steward marks the request `in_review` while preparing a manual export.
5. Export bundle may include only the requester's own contribution text, consent record, review status, steward-visible notes that are appropriate to disclose, and audit summary.
6. Export must not include other participant material, internal steward deliberation about third parties, secrets, control tokens, or unrelated ANU account data.
7. Steward records completion notes and marks the request `completed` only after delivery.

## Withdrawal request handling

1. Receive request through the PEACH consent request route.
2. Persist the request as `pending_steward_review`.
3. Steward verifies the request and identifies affected contribution and consent rows.
4. If the material has not been publicly released, mark the contribution held or withdrawn according to the implementation path available at that gate.
5. If the material has already been included in a Yield or Commons Return in a future gate, steward must assess whether removal, redaction, replacement, erratum, or withdrawal note is the correct remedy.
6. Steward records action notes and marks the request `completed` only after the operational effect is finished.

## Deletion and retention

Gate 12 does not implement automatic deletion. Until a deletion policy is finalized, withdrawal means no public use and manual steward handling, with audit retained for accountability.

## Safeguarding

Youth material, sensitive testimony, uploads, and crisis/safeguarding disclosures remain out of scope. If such material appears despite the guardrails, steward must hold the contribution, avoid publication, and escalate through ANU/Presence safeguarding policy before any further use.

## Audit

Every status change and steward note update must produce audit evidence. Audit events must preserve the fact of the request and steward action without creating a new public disclosure.

## Contributor communication

Contributor communication should be plain and specific:

- what was received;
- what is being reviewed;
- what action was taken;
- what remains retained for audit;
- who to contact for follow-up.
