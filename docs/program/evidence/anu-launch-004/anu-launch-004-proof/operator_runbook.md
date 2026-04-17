# ANU Hosted Smoke Operator Runbook

- Generated at (UTC): `2026-04-16T10:56:18.983206+00:00`
- Scope: hosted RC smoke evidence capture only; no launch auto-approval.

## Preflight Checklist

- [ ] `public_base_url` configured and valid (preflight valid: `6`)
- [ ] `public_host_for_resolution` and `archive_record_slug` configured (preflight missing: `0`)
- [ ] control inputs configured when control checks enabled (preflight skipped_by_mode: `0`)
- [ ] preflight `valid_for_execution` is true (`True`)

## Hosted Smoke Checklist

- [ ] run hosted smoke checks (total: `9`)
- [ ] verify failures are explicit (failed: `8`)
- [ ] verify skipped checks are intentional (skipped: `0`)

## Attachment Checklist

- [ ] screenshot refs listed (count: `7`)
- [ ] recording refs listed if available (count: `0`)
- [ ] attachment validation reviewed (valid: `7`, missing: `0`, invalid: `0`)
- [ ] operator notes included (status: `valid`, count: `2`)

## Contract Reminder

- `launch_readiness_claim` must remain `null` in automation artifacts.
- Milestone launch decisions remain human-owned.
