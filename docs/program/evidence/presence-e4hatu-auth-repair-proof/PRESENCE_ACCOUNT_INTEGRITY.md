# Presence Account Integrity

Date: 2026-05-23

## Before Repair

Hosted controlled-launch data showed:

| Check | Result |
|---|---|
| Presence app user for target email | exactly one |
| App user id | `1` |
| App user active | yes |
| Stored role | `platform_admin` |
| Stored subject bound | yes, but stale versus active Supabase auth user |
| GGM Room | id `11`, slug `ggm-christina-goddard` |
| GGM owner link | points to user `1` |
| Lifetime comp | entitlement id `1`, same user `1`, active internal comp |
| Required app account fields | present |
| Optional ObserverProfile rows | none; not required for owner Studio |

## Integrity Failure

The active Supabase subject was not bound to any Presence app user while the
target Presence user was bound to a different subject. For a privileged user,
Presence owner identity refuses to recover by email alone. That keeps a
subject/email conflict from turning into an admin email takeover, but it made
GGM owner hydration fail for the legitimate current auth subject.

## Repair

`verify_presence_account_integrity.py --repair-apply` changed only:

```text
user 1 global_subject_id = active hosted Supabase auth subject
```

It did not create a second account, move Room ownership, move the entitlement,
or alter the `platform_admin` role.

## After Repair

`account_integrity_verify.json` reports:

- app email uniqueness: pass
- active Supabase subject bound to user `1`: pass
- GGM Room owner link: pass
- `platform_admin`: pass
- active `internal_lifetime_free`: pass
- subject-shaped owner nodes/detail/analytics/passes/RoomKeys: pass
- public Room redaction: pass
- old fixture/non-owner denial: pass
