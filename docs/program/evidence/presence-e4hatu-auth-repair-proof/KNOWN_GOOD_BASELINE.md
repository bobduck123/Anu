# Known-Good Baseline

Date: 2026-05-23

## Result

The incident frame states that a different email account persists through
navigation while `e4hatu@gmail.com` does not, including after a clean-browser
password reset attempt. That reclassifies the active incident as
account-specific unless direct evidence reverses it.

## Independent Rerun Status

Not rerun in this workspace.

- a known-good comparison email was not supplied
- comparison account credentials or approved browser storage state were not
  available
- no real-user token or auth state was copied into evidence

## Consequence

The repair work kept the global Supabase auth implementation unchanged and
inspected the target account across Supabase auth state, Presence subject
binding, GGM ownership, role, entitlement, and owner route hydration.

If the post-repair clean-browser target proof fails or the known-good account
now fails too, reclassify the incident and reopen frontend/global auth
diagnosis.
