# ANU Falak Production Rollback

Date: 2026-03-15

## Goal

Rollback Falak exposure without restoring the database.

The rollback objective is:

- stop new Falak HTTP access immediately
- preserve immutable ledger and append-only event history
- keep the existing live alpha functional
- return to the last known safe deployment posture

## Immediate Route Cut-Off

Set:

```env
FALAK_ROUTE_GUARD_MODE=disabled
FALAK_MAP_ROUTE_GUARD_MODE=disabled
FALAK_ALLOWED_TENANT_SLUGS=
FALAK_ALLOWED_ACTOR_EXTERNAL_AUTH_IDS=
FALAK_TRUST_X_ACTOR_ID=false
FALAK_REQUIRE_VERIFIED_ACTOR=true
```

Redeploy the current image or restart the service with those values.

This is the fastest safe rollback because guarded Falak routes and Falak-backed education maps will return `404` without touching stored Falak data.

## Standard Rollback Sequence

1. Freeze any planned Falak enablement changes.
2. Set `FALAK_ROUTE_GUARD_MODE=disabled`.
3. Set `FALAK_MAP_ROUTE_GUARD_MODE=disabled`.
4. Confirm `FALAK_TRUST_X_ACTOR_ID=false`.
5. Redeploy or restart the service.
6. Verify:
   - `GET /v1/falak/health`
   - guarded Falak routes return `404` with `FALAK_DISABLED`
   - Falak-backed maps return `404` with `FALAK_MAPS_DISABLED`
   - existing non-Falak alpha paths still behave normally
7. If the current image is itself faulty, redeploy the previous known-good image with the same disabled Falak env posture.

## Database Policy During Rollback

Do not restore the database purely to disable Falak exposure.

Reasons:

- Falak ledger entries are immutable
- Falak events are append-only
- rollback should remove access, not rewrite history

Database restoration is a separate incident response action and should only be considered if there is confirmed broader database corruption.

## Ledger Integrity Check

After rollback, verify that the ledger remains consistent:

```sql
SELECT
  reference_type,
  reference_id,
  currency,
  SUM(amount) AS balance
FROM falak.ledger_entries
GROUP BY reference_type, reference_id, currency
ORDER BY reference_type, reference_id, currency;
```

Also confirm immutable protections still hold indirectly through integration checks or operator runbooks.

## Event Integrity Check

Confirm the Falak event stream remains intact:

```sql
SELECT event_type, COUNT(*) AS event_count
FROM falak.events
GROUP BY event_type
ORDER BY event_type;
```

Rollback must not delete or mutate Falak events.

## Operator Verification

After rollback:

1. `GET /v1/falak/health` should respond.
2. `GET /v1/falak/readiness` should reflect DB readiness.
3. A guarded Falak route such as `GET /v1/falak/pools/<pool-id>/balance` with tenant headers should return `404` and `FALAK_DISABLED`.
4. `GET /v1/education/maps` should return `404` and `FALAK_MAPS_DISABLED`.
5. Non-Falak live alpha routes should remain healthy.

## When To Roll Back The Image

Disable routes first.

Redeploy the previous image only if:

- the current image has a runtime fault
- logs indicate repeated Falak exceptions affecting app stability
- the current deployment cannot maintain dark-launch safety

## What Rollback Does Not Do

Rollback does not:

- erase Falak events
- erase Falak ledger entries
- reconcile old Prisma histories
- restore pre-Falak schema shape

Those are separate database governance actions and must not be mixed with route rollback.

## Related Docs

- [anu-falak-production-gating.md](/C:/Dev/Flora_fauna/services/impact-service/docs/anu-falak-production-gating.md)
- [anu-falak-production-operations.md](/C:/Dev/Flora_fauna/services/impact-service/docs/anu-falak-production-operations.md)
- [anu-falak-staging-rollout.md](/C:/Dev/Flora_fauna/services/impact-service/docs/anu-falak-staging-rollout.md)
