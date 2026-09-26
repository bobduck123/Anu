# ANU hosted pilot outcome readiness — 26 September 2026

**Decision: HOLD.** At 10:20 UTC, the documented public hosts could not serve action or impact totals, and the reconciliation code was not in the remote main branch. No hosted outcome total is accepted as pilot evidence.

## Follow-up at 12:55 UTC

The owner reconnected the previously working database. Read-only probes now show backend `/readiness` 200 with `status=ok`, `checks.database=ok`, and `ready=true`; frontend-proxied actions and impact summary both return 200. The frontend `/commitments` page and backend `/api/commitments/actions/1/outcome` route still return 404. Database connectivity is resolved, while the ANU code deployment, migration state and real member/steward journey remain unverified. **Decision remains HOLD.**

## Scope and source

- Read-only check of the frontend `https://maanara.vercel.app` and core API `https://anu-back-end.vercel.app`. The owner confirmed `maanara.vercel.app` is the intended pilot host and that Vercel deploys it from the Git repository.
- Source commits are local: ANU-003 `80389e6`, ANU-004 `ac7a8d4`, reconciliation `a57f603` (with OPS-004 in their ancestry). `git ls-remote origin refs/heads/main` returned `2d35848516f09d50cc4d8c06f38f2311d9d8e860`; none of the three ANU branches requested appeared among the remote refs. This shows those local changes are not in the remote main source. It does not by itself identify an independently deployed preview.
- Follow-up branch check: remote `feat/spatial-authoring-baseline` is `0df0d9197f8d176c43bf880cc6a2f7e6bc3389c9`. None of OPS-004 `bf68437`, ANU-003 `80389e6`, ANU-004 `ac7a8d4`, reconciliation `a57f603`, or this readiness report is an ancestor of it. Its diff from `main` has no files under `frontend-next`, `flora-fauna/backend`, or `services/impact-service`. A Vercel preview of that branch cannot validate the ANU outcome changes.
- No separate pilot host is expected from the owner's clarification. Permissioned member/steward test access was not available in this check.

## Gate evidence

| Gate | Read-only result | Status |
| --- | --- | --- |
| API process reachable | `GET /healthz` returned 200 JSON | Partial |
| API dependencies ready | `GET /readiness` returned 503 JSON; `status=degraded`, `checks.database=error` | Fail |
| Public action read | Frontend proxy `GET /_core/api/actions` returned 500 JSON | Fail |
| Public impact summary | Frontend proxy and direct backend `GET /api/engagement/impact-summary` returned 500 JSON, `InternalServerError` | Fail |
| Participant commitment UI | Frontend `GET /commitments` returned 404 HTML | Fail |
| Reviewed outcome contract | Backend `GET /api/commitments/actions/1/outcome` returned 404 JSON with server message “requested URL was not found” | Fail |
| Migration state | Not inspectable through the unhealthy public API; no hosted database migration was run in this check | Unknown |
| Real member and independent steward journey | No selected healthy pilot environment or permissioned test accounts; no write attempt | Not run |
| Historical count versus reviewed count and points | Public reads failed; no private data was accessed | Not run |

The 404 outcome probe used a non-sensitive placeholder ID solely to test route registration. The response was a route-not-found message, rather than an action-level outcome payload.

## Release gate to repeat on a selected non-production host

1. Select the pilot host and database; restore API readiness to 200 with its database check healthy.
2. Review and integrate the dependent OPS-004, ANU-003, ANU-004 and reconciliation commits. Apply `20260926_anu_action_commitments.sql`, then `20260926_anu_reviewed_action_awards.sql`, on that selected database under the release procedure. Deploy backend before frontend and verify both route contracts are present.
3. Use a permissioned test member and a different steward on one node-scoped action. Confirm, submit evidence, request changes and resubmit, then verify. Check that public outcome count changes only on verification and that the award and credit ledger contain at most one new reward.
4. Compare a historical legacy completion/proof row with the published `legacy_completions`, `completions`, `verified_outcomes` and impact summary. Confirm that old rows are preserved, old node writes are rejected, and historical reward evidence causes zero additional action points.
5. Capture redacted request/response and migration evidence, plus desktop and mobile UI evidence. Reassess the gate only after those checks pass.

## Summary

The documented public deployment is **not ready** to supply hosted pilot outcome totals. This is a completed readiness check with a release blocker, not a successful hosted participant journey.

## Files changed

This report only: `docs/anu-005/HOSTED_PILOT_READINESS_2026-09-26.md`.

## Commands/tests run

Read-only `git ls-remote` for the release refs and HTTP GET probes for health, readiness, actions, impact summary, commitment UI and outcome route. No test or migration was run against a hosted database.

## Manual QA performed

Inspected HTTP status, content type and safe error/status fields. Responses with potential account or action data were not printed or retained. No signed-in flow was attempted.

## Screenshots/links if visual

No visual acceptance screenshot; the hosted commitment route returned 404.

## Risks

The hosted database error may have a separate operational cause; this check did not inspect credentials or change configuration. Migration state and real-account behavior remain unknown.

## Rollback notes

This is a read-only report. Revert this documentation commit if superseded; no hosted state changed.

## Remaining work

Resolve the failed gates on a selected non-production pilot host, then run the member/steward and historical-row checks above. Do not use hosted outcome totals meanwhile.

## Recommended next task

Restore the selected pilot API's database readiness and integrate the ANU dependency stack under the release review, then repeat this checklist on that host.
