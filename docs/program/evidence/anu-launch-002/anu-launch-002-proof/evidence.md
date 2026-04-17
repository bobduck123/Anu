# Evidence Bundle: ANU-LAUNCH-002

- Artifact version: `anu-evidence.v1`
- Generated at (UTC): `2026-04-16T11:05:00+00:00`
- Bundle path: `C:/Dev/Flora_fauna/docs/program/evidence/anu-launch-002/anu-launch-002-proof`

## Observed Command Results (Machine-Captured)

| command | category | exit_code | status | duration_ms |
|---|---|---:|---|---:|
| `python -m unittest scripts.tests.test_launch_rc_hosted_smoke -v` | test | 0 | passed | 90 |

## Inferred Status (Automation-Inferred, Not Approval)

- all_commands_succeeded: `true`
- failed_command_count: `0`
- targeted_tests_summary: `{"category_counts": {"build": 0, "test": 1, "typecheck": 0}, "command_count": 1, "failed_count": 0, "passed_count": 1}`

## Hosted Launch Smoke (Release-Candidate Layer)

- checks_total: `9`
- passed: `0`
- failed: `4`
- skipped: `5`
- artifact: `hosted_launch_smoke.json`
- artifact: `hosted_launch_smoke.md`
- launch_readiness_claim: `not-set-by-automation`

## Hosted Attachments

- manifest: `attachments.json`
- convention_dir: `attachments/`
- screenshots: `2`
- recordings: `1`

## Changed Files (Observed/Provided)

- `scripts/capture_milestone_evidence.py`
- `scripts/launch_rc_hosted_smoke.py`
- `scripts/tests/test_capture_milestone_evidence.py`
- `scripts/tests/test_launch_rc_hosted_smoke.py`

## Source Docs Referenced

- `docs/program/EVIDENCE_AUTOMATION_SPEC_2026-04-14.md`
- `docs/program/MILESTONE_ACCEPTANCE_PACK_2026-04-07.md`
- `docs/program/M5_COMPLETION_REPORT.md`

## Human Notes (Author-Supplied)

- completion_claim: `not-set-by-automation`
- note: ANU-LAUNCH-002 captures hosted smoke evidence and attachment references only; launch acceptance remains human-owned.
- open_risk: Hosted smoke status depends on operator-provided targets and credentials.

> Automation captures evidence only. Milestone completion conclusions remain human-owned.
