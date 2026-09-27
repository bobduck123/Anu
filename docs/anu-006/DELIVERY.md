# ANU-006 delivery — internal capability register

## Summary

Published a dated, source-backed register of ANU and Presence support capabilities. It labels stored sources, generated records, mocks, stubs and manual gates, names accountable owner roles, separates implementation/test/reachability/journey/acceptance, and states which ANU services the current Presence V3.4 owner-to-visitor path actually requires.

## Files changed

- `docs/anu-006/CAPABILITY_REGISTER.md`
- This delivery record.

## Commands/tests run

- Inspected `main` at `0521c78` and source links for every register row; GitHub `main` matched that SHA on 2026-09-27.
- At 2026-09-27 03:17 UTC, anonymous read-only GETs returned 200 for `https://maanara.vercel.app/`, `/commitments`, `https://anu-back-end.vercel.app/healthz`, `/readiness` (`ready=true`, `checks.database=ok`), `/api/commitments/actions/1/outcome`, and `https://presence-gilt.vercel.app/`. Only status, content type and safe readiness fields were retained.
- No application tests were added or rerun for this documentation-only task. The register cites the named 2026-09-26 local test evidence where relevant. Markdown links resolved, and the staged `git diff --check` passed.

## Manual QA performed

Traced each capability from source to the claimed data source and distinguished what a public 200 can establish from what still needs a permissioned journey. Compared the old hosted-readiness report with current merged source and current route reachability; retained its missing real-account evidence as an open gate.

## Screenshots/links if visual

No UI changed and no screenshot is claimed. Source links are in the register.

## Risks

The public checks do not verify migrations, authenticated node isolation, durable member/steward outcomes, impact transactions, Presence owner save/publication, or notification delivery. A historical integration document is not current Gate 8 acceptance.

## Rollback notes

Revert this documentation commit if superseded. No runtime or hosted data changed.

## Remaining work

Assign named operational owners at release review; run ANU-007 job execution proof; run the selected permissioned ANU and Presence journeys before promoting those rows beyond source/reachability. Human Gate 9 approval remains separate.

## Recommended next task

ANU-007: prove one required background job actually runs and leaves a durable, observable result on the selected host. Keep ANU hosted outcome and Presence Gate 8 checks as separate permissioned journeys.
