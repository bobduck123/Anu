# Supabase User Comparison

Date: 2026-05-23

## Provider-Side Read

Inspection used server-side hosted Supabase auth tables through the controlled
backend database connection. No service-role key, token, reset URL, or raw auth
subject was printed.

## Target Account

| Check | Result |
|---|---|
| Supabase auth user count for email | `1` |
| Auth subject fingerprint | `ec6dd2ae7590` |
| Email confirmed | yes |
| Banned | no |
| Deleted | no |
| Recent last-sign-in state | present |
| Provider identity | one `email` identity |
| Duplicate provider identity | no |
| Auth role/aud | `authenticated` / `authenticated` |
| App metadata keys | `provider`, `providers` |
| User metadata keys | display/email verification and onboarding metadata keys present |

## Binding Comparison

Before repair the Presence app row stored subject fingerprint
`e38adbff3f70`, which did not match the active Supabase user fingerprint above.
No Presence app user was already bound to the active Supabase subject, so the
rebind was available without merging or deleting records.

## Known-Good Account Comparison

Pending. The incident report confirms a separate working account, but its email
was not supplied for a provider-side comparison run. The integrity verifier
supports this follow-up:

```text
python flora-fauna\backend\scripts\verify_presence_account_integrity.py --email e4hatu@gmail.com --compare-email <known-good-email> --environment hosted_controlled_launch --verify --output-json <safe-output-path>
```

The output redacts the comparison email and omits raw subject ids.

## Redirect Sanity Boundary

This account repair did not change Supabase redirect configuration. The prior
redirect contract remains documented in
`docs/program/SUPABASE_AUTH_REDIRECT_CONFIGURATION_2026-05-22.md`. Dashboard
URL/template inspection is still an operator-side dashboard step when redirect
posture is re-audited.
