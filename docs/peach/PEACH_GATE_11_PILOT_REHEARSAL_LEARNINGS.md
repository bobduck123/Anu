# PEACH Gate 11 Pilot Rehearsal Learnings

Date: 2026-07-31

## Loop coherence

The PEACH loop is coherent in local rehearsal: Field, Contribution, ConsentRecord, Steward Review, SupportIntent, ConsentOperationRequest, AuditLog, and manual Commons Return simulation all connect without needing public display or payments.

## Field 001 strength

Field 001 is strong enough for a first internal pilot. The seed is broad but operational: it gives participants a concrete question and gives stewards a meaningful review context.

## Contribution flow

The contribution flow is understandable for a controlled pilot. It clearly frames private, adult-only, non-sensitive submission. The public response gives a reference id without exposing body text.

## Consent copy

Consent copy is clear enough for rehearsal. It distinguishes private steward review from public use and stores consent separately. It still needs stronger production-grade wording for withdrawal effects, export timing, and identity verification.

## Steward review usability

The steward workflow is usable for rehearsal. It shows the required consent, credit, visibility, Yield permission, safety flags, and status fields. It is not yet a finished operations console.

## Support intent alignment

Support intent feels values-aligned because it records purpose and manual follow-up rather than forcing checkout. The explicit `paymentTaken: false` behavior prevents ecommerce drift.

## Commons Return legibility

Commons Return is legible as a future manual step. The simulation makes clear that `accepted_private` is not public approval and that consent checks are required before any Yield inclusion.

## PEACH identity check

The product still reads as PEACH: a cultural cultivation loop around a Field. It does not read as a book club, bookstore, events site, Patreon clone, social feed, or generic content platform.

## Issues found

- Private staging credentials/config are not available in the task context.
- The broader backend suite remains not green outside PEACH.
- The steward UI is adequate for rehearsal but lacks full operations affordances such as detail drill-in, export bundle assembly, and publication decision flow.
- Consent operation requests are persisted and reviewable, but export/withdrawal effects remain manual.

## Recommended changes

- Run the same rehearsal in private staging with PostgreSQL migrations applied.
- Add a steward detail view for contribution body review and consent operation context.
- Define export bundle contents and withdrawal effect rules.
- Add a Commons Return release checklist before any public release work.