# Evidence Bundle: ANU-LAUNCH-004

- Artifact version: `anu-evidence.v1`
- Generated at (UTC): `2026-04-16T10:56:18.983206+00:00`
- Bundle path: `C:/Dev/Flora_fauna/docs/program/evidence/anu-launch-004/anu-launch-004-proof`

## Observed Command Results (Machine-Captured)

| command | category | exit_code | status | duration_ms |
|---|---|---:|---|---:|
| `python -m unittest scripts.tests.test_launch_rc_hosted_preflight -v` | test | 0 | passed | 70 |
| `python -m unittest scripts.tests.test_launch_rc_hosted_smoke -v` | test | 0 | passed | 89 |
| `python -m unittest scripts.tests.test_capture_milestone_evidence -v` | test | 0 | passed | 572 |

## Inferred Status (Automation-Inferred, Not Approval)

- all_commands_succeeded: `true`
- failed_command_count: `0`
- targeted_tests_summary: `{"category_counts": {"build": 0, "test": 3, "typecheck": 0}, "command_count": 3, "failed_count": 0, "passed_count": 3}`

## Hosted Preflight

- valid_for_execution: `True`
- valid: `6`
- invalid: `0`
- missing: `0`
- skipped_by_mode: `0`
- artifact: `hosted_preflight.json`
- artifact: `hosted_preflight.md`

## Hosted Launch Smoke (Release-Candidate Layer)

- checks_total: `9`
- passed: `1`
- failed: `8`
- skipped: `0`
- artifact: `hosted_launch_smoke.json`
- artifact: `hosted_launch_smoke.md`
- launch_readiness_claim: `not-set-by-automation`

## Hosted Attachments

- manifest: `attachments.json`
- convention_dir: `attachments/`
- screenshots: `7`
- recordings: `0`

## Attachment Validation

- valid: `7`
- invalid: `0`
- missing: `0`
- operator_notes_status: `valid`
- operator_notes_count: `2`
- artifact: `attachment_validation.json`
- artifact: `attachment_validation.md`

## Operator Runbook

- artifact: `operator_runbook.md`

## Changed Files (Observed/Provided)

- `docs/program/EVIDENCE_AUTOMATION_SPEC_2026-04-14.md`
- `docs/program/M5_COMPLETION_REPORT.md`
- `docs/program/MILESTONE_ACCEPTANCE_PACK_2026-04-07.md`
- `docs/program/NEXT_ERA_PRODUCT_BACKLOG_2026-04-07.md`
- `scripts/capture_milestone_evidence.py`
- `scripts/tests/test_capture_milestone_evidence.py`

## Source Docs Referenced

- `docs/program/M5_COMPLETION_REPORT.md`
- `docs/program/MILESTONE_ACCEPTANCE_PACK_2026-04-07.md`
- `docs/program/NEXT_ERA_PRODUCT_BACKLOG_2026-04-07.md`

## Human Notes (Author-Supplied)

- completion_claim: `not-set-by-automation`
- note: none
- open_risk: Hosted backend target currently returns 503 on public API smoke routes; failure states are preserved as evidence.
- open_risk: Control auth header used for this run is non-validated operator input; hosted control checks are executed and reported honestly.

> Automation captures evidence only. Milestone completion conclusions remain human-owned.
