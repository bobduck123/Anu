# Evidence Bundle: ANU-LAUNCH-005

- Artifact version: `anu-evidence.v1`
- Generated at (UTC): `2026-04-16T22:20:10.201621+00:00`
- Bundle path: `C:/Dev/Flora_fauna/docs/program/evidence/anu-launch-005/anu-launch-005-proof`
- Environment note: hosted-rc-diagnosis

## Observed Command Results (Machine-Captured)

| command | category | exit_code | status | duration_ms |
|---|---|---:|---|---:|
| `python -m unittest scripts.tests.test_launch_rc_hosted_route_diagnosis -v` | test | 0 | passed | 98 |
| `python -m unittest scripts.tests.test_capture_milestone_evidence -v` | test | 0 | passed | 693 |

## Inferred Status (Automation-Inferred, Not Approval)

- all_commands_succeeded: `true`
- failed_command_count: `0`
- targeted_tests_summary: `{"category_counts": {"build": 0, "test": 2, "typecheck": 0}, "command_count": 2, "failed_count": 0, "passed_count": 2}`

## Hosted Public Route Diagnosis

- checks_total: `4`
- passed: `0`
- failed: `4`
- skipped: `0`
- public_surface_state: `degraded`
- degraded_reason_categories: `["http_5xx"]`
- artifact: `hosted_route_diagnosis.json`
- artifact: `hosted_route_diagnosis.md`
- launch_readiness_claim: `not-set-by-automation`

## Changed Files (Observed/Provided)

- `scripts/capture_milestone_evidence.py`
- `scripts/launch_rc_hosted_route_diagnosis.py`
- `scripts/tests/test_capture_milestone_evidence.py`
- `scripts/tests/test_launch_rc_hosted_route_diagnosis.py`

## Source Docs Referenced

- `docs/program/EVIDENCE_AUTOMATION_SPEC_2026-04-14.md`
- `docs/program/MILESTONE_ACCEPTANCE_PACK_2026-04-07.md`
- `docs/program/M5_COMPLETION_REPORT.md`

## Human Notes (Author-Supplied)

- completion_claim: `not-set-by-automation`
- note: ANU-LAUNCH-005 captures hosted public-route diagnosis and degraded-state evidence only.
- open_risk: ANU-LAUNCH-004A rerun remains blocked pending real hosted control credentials/domain verification on 2026-04-18.

> Automation captures evidence only. Milestone completion conclusions remain human-owned.
