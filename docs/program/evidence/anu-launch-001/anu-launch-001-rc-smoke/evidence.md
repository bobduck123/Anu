# Evidence Bundle: ANU-LAUNCH-001

- Artifact version: `anu-evidence.v1`
- Generated at (UTC): `2026-04-16T09:05:00+00:00`
- Bundle path: `C:/Dev/Flora_fauna/docs/program/evidence/anu-launch-001/anu-launch-001-rc-smoke`

## Observed Command Results (Machine-Captured)

| command | category | exit_code | status | duration_ms |
|---|---|---:|---|---:|
| `python -m unittest scripts.tests.test_launch_rc_smoke -v` | test | 0 | passed | 2195 |

## Inferred Status (Automation-Inferred, Not Approval)

- all_commands_succeeded: `true`
- failed_command_count: `0`
- targeted_tests_summary: `{"category_counts": {"build": 0, "test": 1, "typecheck": 0}, "command_count": 1, "failed_count": 0, "passed_count": 1}`

## Launch Smoke (Release-Candidate Layer)

- checks_total: `9`
- passed: `9`
- failed: `0`
- skipped: `0`
- artifact: `launch_smoke.json`
- artifact: `launch_smoke.md`
- launch_readiness_claim: `not-set-by-automation`

## Changed Files (Observed/Provided)

- `scripts/capture_milestone_evidence.py`
- `scripts/launch_rc_smoke.py`
- `scripts/tests/test_capture_milestone_evidence.py`
- `scripts/tests/test_launch_rc_smoke.py`

## Source Docs Referenced

- `docs/program/EVIDENCE_AUTOMATION_SPEC_2026-04-14.md`
- `docs/program/MILESTONE_ACCEPTANCE_PACK_2026-04-07.md`
- `docs/program/M5_COMPLETION_REPORT.md`

## Human Notes (Author-Supplied)

- completion_claim: `not-set-by-automation`
- note: ANU-LAUNCH-001 captures RC smoke evidence only; launch acceptance remains human-owned.
- open_risk: Hosted-environment smoke and operator recordings remain out of this RC smoke layer.

> Automation captures evidence only. Milestone completion conclusions remain human-owned.
