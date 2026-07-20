# GGM Pilot Admin Account Verification

Date: 2026-05-22

## Verification Result

Hosted verification is **PASS** for database/service state and deployed backend
route behavior.

| Check | Evidence |
|---|---|
| Account existed | Hosted dry-run found a pre-existing app user for `e4hatu@gmail.com` |
| External identity bound | Hosted dry-run and verify reported a present bound subject |
| Admin role | Verify reports role `platform_admin` |
| GGM owner linkage | Verify reports the tagged GGM Room owner id matches the account |
| Lifetime comp | Verify reports active `internal_lifetime_free` internal comp, price `0`, lifetime true, no end date |
| Idempotence | Second hosted apply created no second entitlement and did not change the role |
| Hosted owner Studio | Hosted smoke returned `200` |
| Hosted owner analytics | Hosted smoke returned `200` |
| Hosted RoomKey surface | Hosted smoke returned `200` |
| Hosted control route | Control-token issuance and World readiness admin route returned `200` |
| Normal negative | Old proof fixture owner got `403` for GGM owner analytics |
| Public leak check | Public GGM Room response did not include account email or `platform_admin` |

## Scripts And Artifacts

- provisioning script: `flora-fauna/backend/scripts/provision_presence_pilot_admin.py`
- entitlement migration runner:
  `flora-fauna/backend/scripts/apply_presence_plan_entitlement_migration.py`
- hosted route smoke:
  `flora-fauna/backend/scripts/smoke_presence_ggm_admin_account.py`
- migration SQL:
  `flora-fauna/backend/migrations/versions/20260522_presence_plan_entitlements.sql`
- result JSON:
  `account_provisioning_result.json`
- verify JSON:
  `account_verification_result.json`
- hosted route JSON:
  `account_hosted_smoke.json`

## Security Boundary Notes

- The role grant uses the existing persisted role system.
- The entitlement record is formal internal billing posture, not a payment
  simulation and not a Stripe subscription.
- Hosted absence would have produced a pending auth-provider action; this apply
  proceeded only because the hosted account existed and was subject-bound.
- No secrets or bearer tokens are in the JSON or Markdown evidence.

## Handoff

The remaining human verification is supervised pilot-owner sign-in in a browser
session for `e4hatu@gmail.com`. The backend route proof did not require a real
password or printed token and does not replace that onboarding handoff check.
