# G2 backend hardening evidence — 2026-10-26

This is a reviewable backend patch in draft PR #28 stacked on draft PR #27 (`1d5202f`), not G2 acceptance, a merge, or a Production deployment. PR #26 remains a separate contract baseline. No frontend files changed.

## Reproduction and fix

On the untouched PR #27 source, `python -m pytest -q tests/test_presence_g2_draft_links.py -k patch_cannot_publish` failed: owner `PATCH /api/presence/owner/nodes/{id}` with `{"public_status":"public"}` returned 200, though the test requires 400. The generic update could set public state without a `published_at` stamp, leaving no reliable never-published history after a later private transition. The same test passes with this patch. Generic node publication now requires the explicit publish action, which stamps history. Currently public/published legacy rows without a stamp are repaired by the SQL migration; already reverted rows need an operator audit because current row state cannot reveal prior publication.

## Verification

- `python -m pytest -q tests/test_presence_g2_draft_links.py tests/test_presence_nodes.py --disable-warnings`: 83 passed, 447 warnings.
- `python ../../scripts/smoke-core-runtime.py`: passed.
- `python ../../scripts/verify-env-contract.py`: passed.
- `python -m pytest -q tests/test_presence_setup_request_lifecycle.py --disable-warnings`: 3 passed, 3 failed. The same three fail in a separate clean `1d5202f` worktree with the same `presence_dna.goal.primary_goal` validation problem and downstream missing preview node. That baseline worktree was removed.
- `git diff --check`: passed before commits.

Independent review follow-up: TemplateKit Studio Room draft PATCH after explicit publish and synthetic approved-origin `If-Match` preflight both failed before the follow-up fix and pass afterward. `python -m pytest -q tests/test_presence_g2_draft_links.py tests/test_presence_nodes.py tests/test_presence_cors.py tests/test_presence_template_kit_draft_persistence.py tests/test_presence_owner_links_sqlite_migration.py --disable-warnings --basetemp .pytest-task-temp`: 111 passed, 484 warnings. This also covers a legacy public row with a missing publication stamp. The SQLite test upgrades a disposable legacy file, verifies a backup and non-reused link IDs, then re-runs the upgrader and verifies revision invalidation. No deployed database was changed.

The tests use synthetic SQLite and verify stale-write rejection, retained IDs across reorder/edit, fresh IDs after deletion/clear, structured invalid-write errors, no mutation on rejection, owner and public isolation, and publish lockout. PostgreSQL concurrency was not run: Docker is installed but its local daemon is unavailable; no disposable PostgreSQL endpoint was found. SQLite does not prove PostgreSQL row-lock behavior.

## Review and integration limits

The SQL migration must precede backend startup. F1 must forward `meta.revision` as `If-Match`; its current transport will receive 428 until adapted. It should also forward retained IDs to keep identities stable. See `G2_BACKEND_HARDENING_HANDOFF.md` for exact payloads and errors. Existing persistent SQLite databases need a table rebuild for SQLite `AUTOINCREMENT`; disposable test schemas are created fresh.

The user subsequently approved protected previews and draft PR publication. At publication time, `anu-impact-service` already displayed saved `Require Log In` with `Standard Protection` after reload; no setting change was made in this task. Vercel describes this mode as protecting all except production Custom Domains, so production-generated deployment URLs are also protected. `presence`, `anu-back-end`, and `anu-front-end` had the same protection. All four projects track unassigned branches into Preview. Their Production branches are `feature/presence-ecosystem-alpha`, `main`, `main`, and `main`, respectively. The isolated branch was pushed at `c7b4eb406818fdf569a1cf04da8bc7058df48226`, and draft PR #28 was opened against PR #27's branch.

At that SHA, all six GitHub Actions workflows passed. The frontend Preview reached Ready. An unauthenticated request to its deployment URL redirected to Vercel login. Backend, impact-service, and Presence Preview checks failed before build with `One or more integration resources failed to provision for this deployment`; the backend deployment lists the linked Supabase resource. An unauthenticated request to the generated impact-service Preview URL also redirected to Vercel login, although its failed build prevents a live-app protection test. No deployed database, Production branch, Production setting, or domain was changed. Check GitHub Actions and hosted integration results again on the final PR SHA; these Vercel failures require operator investigation outside the bounded backend patch.
