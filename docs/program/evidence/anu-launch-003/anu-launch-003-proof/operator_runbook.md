# ANU-LAUNCH-003 Operator Hosted Smoke Runbook

- Generated at (UTC): `2026-04-16T12:00:00+00:00`
- Scope: hosted RC smoke evidence capture only; no launch auto-approval.

## Preflight Checklist

- [ ] `public_base_url` configured and valid (preflight valid: `3`)
- [ ] `public_host_for_resolution` and `archive_record_slug` configured (preflight missing: `0`)
- [ ] control inputs configured when control checks enabled (preflight skipped_by_mode: `3`)
- [ ] preflight `valid_for_execution` is true (`True`)

## Hosted Smoke Checklist

- [ ] run hosted smoke checks (total: `9`)
- [ ] verify failures are explicit (failed: `4`)
- [ ] verify skipped checks are intentional (skipped: `5`)

## Attachment Checklist

- [ ] screenshot refs listed (count: `2`)
- [ ] recording refs listed if available (count: `1`)
- [ ] attachment validation reviewed (valid: `0`, missing: `3`, invalid: `0`)
- [ ] operator notes included (status: `valid`, count: `1`)

## Contract Reminder

- `launch_readiness_claim` must remain `null` in automation artifacts.
- Milestone launch decisions remain human-owned.
