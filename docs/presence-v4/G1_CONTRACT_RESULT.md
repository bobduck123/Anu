# Presence V4 G1: observed read-contract foundation

**Status:** Reviewable [draft PR #26](https://github.com/bobduck123/Anu/pull/26). This does not pass proposed V4 G1 or change any V3.4 gate status.

## Delivered

- `contracts/presence-current.openapi.json` records six existing Flask GET routes: public list, node, work and collection reads; owner node list and detail reads.
- The contract labels itself `draft-observed`, specifies only stable essential response fields, and records current integer IDs, limit/offset pagination, public and owner envelope differences, and existing owner Bearer JWT protection. Its `/api/presence` paths describe current code; the supplied V4 `/api/v1` pack remains a proposed target.
- `tests/test_presence_read_contract.py` checks registered routes and unique operation IDs, compares synthetic SQLite responses with the contract's supported schema subset, and exercises draft/hidden public 404s plus unauthenticated and cross-owner denial.
- The existing `core-runtime` CI job runs that test after its current smoke check.

## Evidence

From `flora-fauna/backend` on 2026-10-20:

```text
python -X utf8 -m pytest tests/test_presence_read_contract.py -q --tb=short --disable-warnings --basetemp C:\Dev\Flora_fauna\flora-fauna\backend\.tmp\presence-v4-g1-pytest-20261020-2
.. [100%]
2 passed, 8 warnings in 2.93s

python ../../scripts/smoke-core-runtime.py
Core runtime smoke passed.
```

## Limits and next gate work

This draft is an observed six-route subset. The test deliberately checks only the JSON Schema features used here; it is not full OpenAPI conformance, a hosted PostgreSQL test, a security audit, or proof of every rich payload field. No new API path, migration, SDK, frontend integration, auth change, publish behavior, or deployment is included.

Before claiming V4 G1, review the G0 repo audit, decide the versioned API migration boundary, specify remaining write/error/authorization contracts, add negative tenant tests and generation/consumer checks, and obtain the required human gate review. The owner approved publication of this draft branch on 2026-10-20; merge and deployment remain subject to separate human approval.
