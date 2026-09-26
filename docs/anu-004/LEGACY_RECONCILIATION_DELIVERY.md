# ANU-004 legacy completion and points reconciliation delivery

## Summary

Node-scoped action outcomes now require a steward-verified commitment. The legacy completion and proof-write routes reject node actions before changing counts, points, credits or evidence. Action lists, details, discovery, recommendations, packs, priority responses and the impact summary show reviewed counts; old counters remain explicitly available as `legacy_completions`. Weekly action challenges for node members use verified commitments. A first verification awards configured action points once, with a recorded amount and timestamp; historical reward evidence suppresses a second award.

## Files changed

- Backend: `app/api/action_commitments.py`, `app/api/engagement.py`, `app/api/education_stack.py`, `app/api/packs.py`, `app/models.py`, `app/routes.py`.
- Additive schema: `migrations/versions/20260926_anu_reviewed_action_awards.sql`.
- Frontend: action, commitment, impact, profile and map presentation plus `src/lib/api.ts` and commitment types.
- Tests: `tests/test_anu_legacy_action_reconciliation.py`, and focused frontend API, action and impact tests.
- Plan: `docs/anu-004/LEGACY_RECONCILIATION_PLAN.md`.

## Commands and tests run

- Backend: `python -X utf8 -m pytest tests/test_anu_legacy_action_reconciliation.py tests/test_anu_action_commitments.py tests/test_anu_onboarding.py tests/test_node_isolation.py -q --tb=short` — 10 passed; pre-existing SQLAlchemy and `utcnow` deprecation warnings.
- Frontend focused Vitest suite — 28 passed after the final challenge fallback change.
- Frontend `npm.cmd run typecheck` and focused `npm.cmd run lint` — passed after the final challenge fallback change.
- Frontend `npm.cmd run build -- --webpack`, using synthetic public Supabase values — passed before the final challenge fallback change. The final change was covered by the subsequent Vitest, type and lint checks.
- `git diff --check` — passed before final commit.

## Manual QA performed

- Reviewed the API responses for a historical count of seven alongside zero, then one, steward-verified outcome. The regression test asserts the old count stays stored and the published count changes only after review.
- Opened the local production server in a browser. On the anonymous `127.0.0.1` host, the app resolved to the generic Manara public route rather than the ANU action panel. This did not validate the visual action view. Focused component tests cover the changed labels.

## Screenshots and links if visual

No valid screenshot from this run; the anonymous local host did not resolve to the ANU action panel.

## Risks

- Historical proof and to-do records do not establish whether their original points were actually paid. A matching record conservatively yields zero **new** action points on later verification, while still allowing a reviewed outcome.
- This branch has not run against a hosted database. Do not use hosted outcome totals until the base ANU-003, ANU-004 and OPS-004 dependencies and both commitment migrations are integrated in order, and a real account and node check confirms the public projection and steward reward.
- Historical unscoped action routes remain available for compatibility. Their sequential completion retry is idempotent; no concurrent legacy-route guarantee is claimed.

## Rollback notes

Revert this branch to restore the previous code. The additive award columns can remain unused until a separately reviewed database rollback. Historical rows are never deleted or rewritten.

## Remaining work

Integrate the dependent branches, apply `20260926_anu_action_commitments.sql` and then `20260926_anu_reviewed_action_awards.sql` in a selected non-production pilot database, and validate a real member/steward journey on the hosted node before accepting its outcome totals. No deployment, live migration, backfill or merge was performed here.

## Recommended next task

Run the hosted pilot readiness check with a real member, independent steward, node-scoped action, historical legacy row, and read-only comparison of public outcome and award records.
