# Presence e4hatu Auth Repair Proof

Date: 2026-05-23

## Summary

`e4hatu@gmail.com` was not failing at the global Supabase session layer. The
active hosted Supabase auth user existed, was confirmed, had an email identity,
and had recent sign-in state. The Presence app user for the same email was
still bound to a different stale `global_subject_id`.

Presence owner identity resolution intentionally refuses privileged email-only
matching when a Supabase subject disagrees with the stored subject binding. The
repaired path rebinds only the hosted Presence app user's `global_subject_id`
to the active hosted Supabase auth subject. GGM ownership, `platform_admin`,
and `internal_lifetime_free` stay attached to the same hosted Presence user.

## Decision

Current e4hatu GGM-owner gate: `NO-GO` until a clean hosted browser sign-in for
`e4hatu@gmail.com` proves session persistence after this repair.

Server-side account integrity and deployed backend subject-shaped route proof
are now `PASS`.

## Layer Result

| Layer | Result |
|---|---|
| Supabase session/user | Hosted Supabase user state is healthy by provider-side read |
| Presence app binding | Failed before repair: active Supabase subject did not match app `global_subject_id` |
| Profile/account hydration | Owner hydration failed at owner API resolution with `401` for the active Supabase subject |
| Role serialization | Not causal; `platform_admin` stayed valid and subject-shaped admin route smoke passes after binding repair |
| Entitlement serialization | Not causal; the comp is not in the Studio owner route hydration payload and remains active on the same user |
| Owner authorization | Pass after rebind for GGM Studio detail, analytics, passes, and RoomKeys |
| Frontend guard | No evidence of explicit sign-out; clean-browser proof remains required |

## Repair Applied

Hosted controlled-launch Presence DB:

- target app user id: `1`
- target Room: id `11`, slug `ggm-christina-goddard`
- before stored-subject fingerprint: `e38adbff3f70`
- active Supabase-subject fingerprint: `ec6dd2ae7590`
- apply result: `account_integrity_apply.json`
- post-repair verify result: `account_integrity_verify.json`

No role, entitlement, Room owner, auth provider user, password, reset link, or
session token was changed by the repair script.

## Proof Results

| Proof | Result |
|---|---|
| User-reported working comparison account | Account-specific baseline accepted from the incident report; not independently rerun because no comparison login was provided |
| Hosted Supabase/auth-schema comparison | Pass for target health and single email identity |
| Hosted Presence account integrity | Pass after rebind |
| Subject-shaped deployed backend smoke | Pass, 8 checks against `https://anu-back-end.vercel.app` |
| Public GGM Room redaction | Pass for target email, `platform_admin`, and entitlement code |
| Non-owner denial | Pass for GGM analytics and control-token issue |
| Real e4hatu clean browser session | Pending |

## Security Notes

- Owner routes continue to reject privileged email-only fallback on subject
  conflict.
- The verifier does not print access tokens, reset links, service keys, or raw
  Supabase subject ids.
- Public Room responses remain redacted.
- The repair did not downgrade or broaden any role.

## Tests And Commands

```text
python -m pytest tests\test_verify_presence_account_integrity_script.py tests\test_presence_nodes.py -k "account_integrity or privileged_owner_requires_bound_supabase_subject"
python -m pytest tests\test_presence_pilot_admin_provisioning.py
python flora-fauna\backend\scripts\verify_presence_account_integrity.py --email e4hatu@gmail.com --environment hosted_controlled_launch --repair-dry-run --output-json docs\program\evidence\presence-e4hatu-auth-repair-proof\account_integrity_dry_run.json
python flora-fauna\backend\scripts\verify_presence_account_integrity.py --email e4hatu@gmail.com --environment hosted_controlled_launch --repair-apply --output-json docs\program\evidence\presence-e4hatu-auth-repair-proof\account_integrity_apply.json
python flora-fauna\backend\scripts\verify_presence_account_integrity.py --email e4hatu@gmail.com --environment hosted_controlled_launch --verify --output-json docs\program\evidence\presence-e4hatu-auth-repair-proof\account_integrity_verify.json
python flora-fauna\backend\scripts\smoke_presence_ggm_admin_account.py --email e4hatu@gmail.com --room-slug ggm-christina-goddard --output-json docs\program\evidence\presence-e4hatu-auth-repair-proof\hosted_backend_subject_smoke.json
```

## Remaining Browser Proof

Run the clean-browser checklist in `manual_browser_checklist.md` for the target
account. The result must show login persistence through GGM Studio, analytics,
RoomKey/Pass, public Room navigation, refresh, and explicit logout before this
gate becomes `GO`.
