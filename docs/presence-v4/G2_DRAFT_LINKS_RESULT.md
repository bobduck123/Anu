# G2 private-draft links: result

**Status:** Reviewable backend slice. Proposed V4 G2 is not passed; no V3.4 gate status changes.

## Working outcome

- An authenticated owner can read all their Presence links, including hidden ones, through `GET /api/presence/owner/nodes/{id}/links`.
- An authenticated owner can replace and reorder up to 50 links on a never-published private draft through `PUT` on the same path. The full payload is validated before existing rows are removed, and invalid input leaves the saved links intact.
- A second owner cannot read or write the first owner's links. Anonymous requests are rejected.
- A private draft remains absent from the public API until the existing owner publish action. After publication, only links marked visible appear publicly. The new write route rejects current and previously published nodes.
- The focused G2 test runs in `m0-runtime-contracts` CI.

## Evidence

From `flora-fauna/backend` on 2026-10-20:

```text
python -X utf8 -m pytest tests/test_presence_g2_draft_links.py tests/test_presence_nodes.py::test_owner_beta_start_draft_can_be_explicitly_published_to_public_route tests/test_presence_nodes.py::test_presence_owner_node_detail_denies_cross_owner_access tests/test_presence_nodes.py::test_presence_owner_node_publish_and_unpublish_return_owner_safe_payload_and_hide_public_route -q --tb=short --disable-warnings --basetemp C:\Dev\Flora_fauna\flora-fauna\backend\.tmp\presence-v4-g2-links-20261020-6
4 passed, 46 warnings in 3.72s

python ../../scripts/smoke-core-runtime.py
Core runtime smoke passed.

git diff --check
No whitespace errors.
```

## Limits and next work

The tests use synthetic SQLite and local Flask clients. PostgreSQL concurrency, hosted behavior, mobile UI and observed self-serve completion are unverified. The route is an onboarding draft capability; editing a live published Presence still needs a whole-Presence revision and atomic publish design. G1 contract readiness is also still under review, including SDK/consumer and migration decisions. No frontend editor, new public route, auth mechanism, tenant model, schema migration, deployment or public launch claim is included.

The next G2 slice should specify and test a consistent published revision for profile, links, works and collections before allowing live owners to stage edits without taking their public Presence offline. Human review is required before merge or any hosted rollout.
