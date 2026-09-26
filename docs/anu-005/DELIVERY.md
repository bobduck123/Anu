# ANU-005 decision review delivery

## Summary

Mapped score-driven permissions and indirect effects, distinguished event creation from delivery and unresolved from adjudicated incidents, and prepared a human-review decision contract with 12 adversarial cases. The canonical backlog's ANU-005 is this trust ticket; the existing `docs/anu-005/HOSTED_PILOT_READINESS_2026-09-26.md` is a separately named hosted readiness report and does not satisfy this ticket.

## Files changed

- `docs/anu-005/DECISION_CONTRACT.md`
- `docs/anu-005/ADVERSARIAL_CASES.md`
- This delivery record.

## Commands/tests run

Read-only source searches across score consumers, guards, role/vote endpoints, incident workflow and model fields. Python model introspection confirmed `TrustScore.score=False`, `TrustScore.composite_score=True`, and no formula-version field. Markdown source links resolved, and `git diff --check` passed. No test mutating an account or database was run.

## Manual QA performed

Traced each mapped consumer from its route or service to score storage and compared the proposed fixtures with the current formula and models. All examples use synthetic data.

## Screenshots/links if visual

No UI was changed; no screenshot applies.

## Risks

This review does not measure live prevalence or adjudicate any real participant. Formula thresholds, override authority, voting weight and retrospective treatment are unresolved human governance decisions. No production data was inspected.

## Rollback notes

Revert this documentation commit if superseded. It changes no runtime behavior or stored data.

## Remaining work

Human governance review of the proposed contract, then separately scoped and approved packages A–D with adversarial tests, migrations if needed, and a protected merge/release review.

## Recommended next task

Approve the bounded voting-path and recalculation-boundary behavior, or proceed to ANU-006's low-risk capability register while that governance decision is pending.
