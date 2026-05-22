# Presence GGM Pilot Admin Account Proof

Date: 2026-05-22

## Summary

`e4hatu@gmail.com` is provisioned in the hosted controlled-launch Presence
environment as the GGM first-pilot admin account.

| Surface | Result |
|---|---|
| App account | Existing hosted app `User` found with bound external subject |
| Admin/superuser role | `User.role` moved from the prior hosted role to existing highest Presence role `platform_admin` |
| GGM Room ownership | Tagged GGM Room `ggm-christina-goddard` owner moved from proof fixture owner to the real pilot account |
| Lifetime comp | Explicit `presence_plan_entitlement` row created as `internal_lifetime_free`, active, internal comp, zero price, lifetime, no expiry |
| Hosted route verification | Pass, 8 hosted backend checks |
| Secret posture | No secret or token values written to evidence |

## Account And Role Result

- account email: `e4hatu@gmail.com`
- hosted app user existed before apply: yes
- hosted app user had a bound `global_subject_id`: yes
- formal superuser role used: `platform_admin`
- role grant path: existing persisted `User.role`, not an email special case

`platform_admin` is the repo's current highest Presence/control role and is
already the owner Studio staff override and control-plane accepted admin role.
The provisioning pass did not add a route guard exception for the target email.

## GGM Room Owner Result

- GGM pilot Room slug: `ggm-christina-goddard`
- GGM pilot Room id: recorded in `account_provisioning_result.json`
- previous owner: the tagged onboarding proof fixture owner
- current owner: the real pilot account

The provisioning script refuses to touch a Room unless its metadata is tagged
as `controlled_launch_pilot = true` and `pilot_code = ggm`. The Room metadata
stores pilot-admin provisioning metadata, including the original owner id for
rollback evidence.

## Lifetime-Free Entitlement

The existing Stripe-oriented membership subscription table was not used. An
additive Presence-specific entitlement model was added:

- table/model: `presence_plan_entitlement` / `PresencePlanEntitlement`
- plan code: `internal_lifetime_free`
- status: `active`
- billing mode: `internal_comp`
- price: `0`
- ends at: null
- lifetime: true
- source: `controlled_launch_pilot`
- reason: `first_pilot_owner_admin`

The entitlement has no Stripe subscription id and does not grant roles.

## Dry-Run, Migration, Apply, Verify

Artifacts:

- `account_provisioning_dry_run.json`
- `account_entitlement_migration_dry_run.json`
- `account_entitlement_migration_result.json`
- `account_provisioning_result.json`
- `account_provisioning_idempotence.json`
- `account_verification_result.json`

Sequence run:

1. Hosted account dry-run stopped before mutation when the new entitlement
   table was absent.
2. The reviewed additive SQL migration was dry-run against the controlled
   Supabase pooled Postgres target.
3. The SQL migration was applied with no destructive reset; the table, columns,
   indexes, and unique constraint were introspected after apply.
4. Hosted provisioning dry-run found the existing bound app account and the
   tagged GGM Room still owned by the setup fixture.
5. Hosted apply assigned role, Room owner linkage, and lifetime comp.
6. Hosted apply was rerun idempotently; it created no second entitlement and
   changed no role.
7. Verify mode passed all account/role/Room/entitlement checks.

## Hosted Verification

`account_hosted_smoke.json` passed:

- backend `/healthz`
- owner Studio read for the GGM Room
- owner analytics read for the GGM Room
- owner RoomKey read/manage surface
- public Room redaction of admin email/role
- bounded control token issuance for the account
- protected World-readiness admin route while World remains hidden/forming
- old proof fixture owner receives `403` on GGM owner analytics

Hosted verification used short-lived signed route tokens generated from the
controlled backend secret context without printing them. Interactive browser
sign-in for the account was not performed in this pass.

## Tests

Ran:

```text
python -m pytest tests\test_presence_pilot_admin_provisioning.py
python -m pytest tests\test_presence_pilot_admin_provisioning.py tests\test_presence_pass_paths.py
```

Result: focused account tests and adjacent Presence pass/path tests passed.
The pytest run emitted existing SQLAlchemy legacy warnings and a local
`.pytest_cache` write warning; no test failed.

## Security Notes

- No auth bypass, public admin route, or email-based route exception was added.
- The lifetime entitlement is separate from role assignment.
- A zero-price entitlement does not create a role.
- An admin role does not auto-create entitlements for unrelated users.
- Public Room smoke checks that account email and `platform_admin` do not leak.
- Normal/old fixture owner owner-analytics access is denied after owner change.
- Tokens remained ephemeral in process memory and were not stored in evidence.

## Known Limitations

- There is no hosted account/plan API for Presence entitlements yet; entitlement
  verification is DB/service-script proof.
- The new entitlement model and scripts are in this working tree and need the
  next backend source deployment before future deployed runtime code can import
  the model directly.
- Interactive first-owner sign-in and Studio handoff should still be done with
  the pilot owner during supervised onboarding.

## Manual Next Steps

1. Have the pilot owner sign in with `e4hatu@gmail.com` during supervised GGM
   onboarding.
2. Open GGM Studio and confirm the GGM Room, owner analytics, and RoomKey/Pass
   management surfaces in the browser session.
3. Keep the account entitlement comp entry and Room owner rollback evidence in
   the release record before any further pilot account changes.
