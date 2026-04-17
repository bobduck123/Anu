# Evidence Automation Spec (2026-04-14)

## Scope
This spec defines the ANU-024 milestone evidence capture scaffold.
It automates evidence collection artifacts only.
It does not automate milestone completion claims.

## Script
- path: `scripts/capture_milestone_evidence.py`
- purpose: run targeted verification commands and emit an auditable bundle.

## Output contract
Evidence artifacts are generated under:

`docs/program/evidence/<milestone-or-slice-slug>/<timestamp-or-build-id>/`

Bundle files:
- `evidence.json` (machine-readable contract)
- `evidence.md` (human-readable summary)
- optional launch-smoke layer artifacts (ANU-LAUNCH-001):
  - `launch_smoke.json`
  - `launch_smoke.md`
- optional hosted launch-smoke layer artifacts (ANU-LAUNCH-002):
  - `hosted_preflight.json`
  - `hosted_preflight.md`
  - `hosted_launch_smoke.json`
  - `hosted_launch_smoke.md`
  - optional hosted public-route diagnosis artifacts (ANU-LAUNCH-005):
    - `hosted_route_diagnosis.json`
    - `hosted_route_diagnosis.md`
  - `attachments.json`
  - `attachment_validation.json`
  - `attachment_validation.md`
  - `operator_runbook.md`
  - `attachments/` (operator-managed screenshot/recording convention directory)

## Required fields (JSON)
- `artifact_version`
- `milestone_or_slice`
- `generated_at`
- `git_revision` (`commit_sha`, `short_sha`, `branch` where available)
- `commands_run[]`
- `results[]` with per-command:
  - command
  - category
  - started_at
  - finished_at
  - duration_ms
  - exit_code
  - status
  - stdout
  - stderr
- `changed_files[]`
- `targeted_tests_summary`
- `typecheck_build_summary`
- `open_risks[]`
- `source_docs_referenced[]`
- explicit separation blocks:
  - `observed`
  - `inferred`
  - `human_narrative`
- optional launch-smoke block (when enabled):
  - `launch_smoke.json_artifact`
  - `launch_smoke.markdown_artifact`
  - `launch_smoke.summary` (`total`, `passed`, `failed`, `skipped`, `all_passed`)
- optional hosted launch-smoke block (when enabled):
  - `hosted_preflight.json_artifact`
  - `hosted_preflight.markdown_artifact`
  - `hosted_preflight.summary` (`valid`, `invalid`, `missing`, `skipped_by_mode`, `valid_for_execution`)
  - `hosted_preflight.blocking_fields`
  - `hosted_launch_smoke.json_artifact`
  - `hosted_launch_smoke.markdown_artifact`
  - `hosted_launch_smoke.summary` (`total`, `passed`, `failed`, `skipped`, `all_passed`)
  - `hosted_launch_smoke.target_metadata`
  - `hosted_launch_smoke.launch_readiness_claim` (`null`)
- optional hosted route-diagnosis block (when enabled):
  - `hosted_route_diagnosis.json_artifact`
  - `hosted_route_diagnosis.markdown_artifact`
  - `hosted_route_diagnosis.summary` (`total`, `passed`, `failed`, `skipped`, categories, `public_surface_state`)
  - `hosted_route_diagnosis.target_metadata`
  - `hosted_route_diagnosis.launch_readiness_claim` (`null`)
- optional hosted attachment block (when enabled):
  - `attachments.manifest_artifact`
  - `attachments.attachments_dir`
  - `attachments.summary` (`screenshots_count`, `recordings_count`, `operator_notes_count`)
- optional hosted attachment validation block (when enabled):
  - `attachment_validation.json_artifact`
  - `attachment_validation.markdown_artifact`
  - `attachment_validation.summary` (`valid`, `invalid`, `missing`)
  - `attachment_validation.operator_notes`
- optional hosted runbook block (when enabled):
  - `operator_runbook.markdown_artifact`

## ANU-LAUNCH-001 RC smoke layer
- Purpose: narrow release-candidate smoke verification for critical ANU public/control/white-label paths.
- Scope: not a full QA program and not a CI/CD redesign.
- Script path: `scripts/launch_rc_smoke.py`.
- Status contract per check:
  - `passed`
  - `failed`
  - `skipped` (not configured for this run)
- Honesty contract:
  - `launch_readiness_claim` remains `null`.
  - conclusion remains `not-set-by-smoke`.
  - no auto-approval of launch readiness.

## ANU-LAUNCH-002 hosted RC smoke evidence layer
- Purpose: capture the same critical-path RC smoke checks against explicit hosted targets.
- Scope: evidence capture only; no CI/CD redesign and no browser-E2E framework expansion.
- Script paths:
  - `scripts/launch_rc_hosted_smoke.py`
  - `scripts/capture_milestone_evidence.py`
- Explicit hosted target inputs:
  - `--hosted-public-base-url` (required when hosted mode is enabled)
  - optional `--hosted-public-host-for-resolution`
  - optional `--hosted-archive-record-slug`
  - optional `--hosted-control-base-url`, `--hosted-control-site-id`, `--hosted-control-auth-header` (or `--hosted-control-auth-header-env`)
- Hosted result semantics:
  - `passed`
  - `failed`
  - `skipped` (`not configured` or explicitly skipped)
- Attachment handling:
  - references only (no media processing pipeline, no hidden upload behavior)
  - `attachments.json` stores screenshot refs, optional recording refs, and operator notes
  - `attachments/` is a convention directory in the bundle for operator-managed media files
- Honesty contract:
  - `launch_readiness_claim` remains `null`.
  - conclusion remains `not-set-by-smoke`.
  - no auto-approval of launch readiness.

## ANU-LAUNCH-003 hosted preflight + runbook enforcement layer
- Purpose: enforce required hosted input checklist and explicit attachment-reference validation before hosted smoke is treated as meaningful proof.
- Scope: no browser automation and no CI/CD redesign.
- Script paths:
  - `scripts/launch_rc_hosted_preflight.py`
  - `scripts/capture_milestone_evidence.py`
- Preflight status model:
  - `valid`
  - `invalid`
  - `missing`
  - `skipped-by-mode` (when control checks are intentionally disabled)
- Preflight required inputs:
  - `public_base_url`
  - `public_host_for_resolution`
  - `archive_record_slug`
  - control-only requirements when control checks enabled:
    - `control_base_url`
    - `control_site_id`
    - control auth source/header
- Fail-fast behavior:
  - hosted preflight runs before hosted smoke execution.
  - when required hosted inputs are `invalid` or `missing`, hosted smoke execution is aborted.
- Attachment validation outputs:
  - `attachment_validation.json` + `attachment_validation.md`
  - each screenshot/recording reference is reported as `valid`, `missing`, or `invalid`
  - operator notes presence is reported explicitly
- Runbook artifact:
  - `operator_runbook.md` contains minimal operator checklist for hosted proof capture.

## ANU-LAUNCH-005 hosted public-route diagnosis layer
- Purpose: classify hosted public-route failures for diagnosis while preserving honest pass/fail/skipped evidence semantics.
- Scope: no browser automation, no CI/CD redesign, no credential acquisition.
- Script paths:
  - `scripts/launch_rc_hosted_route_diagnosis.py`
  - `scripts/capture_milestone_evidence.py`
- Classification categories:
  - `success`
  - `skipped_not_configured`
  - `dns`
  - `transport`
  - `timeout`
  - `http_4xx`
  - `http_5xx`
  - `invalid_payload`
  - `http_other`
- Diagnostics metadata captured per check:
  - `request_id` (header or payload when available)
  - `content_type`, `content_length`
  - `error_code`, `error_message`
  - `response_preview` on failures
- Honesty contract:
  - launch readiness remains unset (`launch_readiness_claim = null`)
  - conclusion remains `not-set-by-route-diagnosis`
  - no failure coercion into success.

## Workflow safety rules
1. Append-only bundle path behavior:
- existing target bundle directory is rejected (`FileExistsError`).
2. No auto-completion claims:
- `human_narrative.completion_claim` remains `null`.
- markdown explicitly states that completion conclusions are human-owned.
3. No silent mutation of unrelated docs:
- script writes only bundle artifacts in the selected bundle path (`evidence.json`, `evidence.md`, optional `launch_smoke.*`, optional `hosted_preflight.*`, optional `hosted_launch_smoke.*`, optional `hosted_route_diagnosis.*`, optional `attachments.json`, optional `attachment_validation.*`, optional `operator_runbook.md`, and optional `attachments/`).

## Command example
```bash
python scripts/capture_milestone_evidence.py \
  --milestone-or-slice ANU-024 \
  --command "python -m unittest scripts.tests.test_capture_milestone_evidence -v" \
  --include-git-changed-files \
  --source-doc docs/program/MILESTONE_ACCEPTANCE_PACK_2026-04-07.md \
  --source-doc docs/program/M5_COMPLETION_REPORT.md
```

## ANU-LAUNCH-001 command example
```bash
python scripts/capture_milestone_evidence.py \
  --milestone-or-slice ANU-LAUNCH-001 \
  --command "python -m unittest scripts.tests.test_launch_rc_smoke -v" \
  --run-launch-smoke \
  --launch-smoke-control-host control.test \
  --source-doc docs/program/EVIDENCE_AUTOMATION_SPEC_2026-04-14.md
```

## ANU-LAUNCH-002 command example (hosted RC smoke + attachments)
```bash
python scripts/capture_milestone_evidence.py \
  --milestone-or-slice ANU-LAUNCH-002 \
  --command "python -m unittest scripts.tests.test_launch_rc_hosted_smoke -v" \
  --run-hosted-launch-smoke \
  --hosted-public-base-url https://public.example.com \
  --hosted-public-host-for-resolution partner.example.com \
  --hosted-archive-record-slug launch-smoke-record \
  --hosted-control-base-url https://control.example.com \
  --hosted-control-site-id 42 \
  --hosted-control-auth-header-env CONTROL_SMOKE_AUTH_HEADER \
  --hosted-screenshot-ref attachments/public-archive-list.png \
  --hosted-screenshot-ref attachments/control-publish-readiness.png \
  --hosted-recording-ref attachments/hosted-smoke-walkthrough.mp4 \
  --hosted-operator-note "Operator validated hosted route rendering and auth context." \
  --source-doc docs/program/EVIDENCE_AUTOMATION_SPEC_2026-04-14.md
```

## ANU-LAUNCH-003 command example (hosted preflight + runbook enforcement)
```bash
python scripts/capture_milestone_evidence.py \
  --milestone-or-slice ANU-LAUNCH-003 \
  --command "python -m unittest scripts.tests.test_launch_rc_hosted_preflight -v" \
  --run-hosted-launch-smoke \
  --hosted-public-base-url https://public.example.com \
  --hosted-public-host-for-resolution partner.example.com \
  --hosted-archive-record-slug launch-smoke-record \
  --hosted-control-base-url https://control.example.com \
  --hosted-control-site-id 42 \
  --hosted-control-auth-header-env CONTROL_SMOKE_AUTH_HEADER \
  --hosted-screenshot-ref attachments/public-archive-list.png \
  --hosted-recording-ref attachments/hosted-smoke-walkthrough.mp4 \
  --hosted-operator-note "Operator confirms hosted target and attachment references." \
  --source-doc docs/program/EVIDENCE_AUTOMATION_SPEC_2026-04-14.md
```

## ANU-LAUNCH-005 command example (hosted public-route diagnosis)
```bash
python scripts/capture_milestone_evidence.py \
  --milestone-or-slice ANU-LAUNCH-005 \
  --command "python -m unittest scripts.tests.test_launch_rc_hosted_route_diagnosis -v" \
  --run-hosted-route-diagnosis \
  --hosted-public-base-url https://anu-back-end.vercel.app \
  --hosted-public-host-for-resolution maanara.vercel.app \
  --hosted-archive-record-slug manara-record \
  --hosted-route-diagnosis-timeout-seconds 20 \
  --source-doc docs/program/EVIDENCE_AUTOMATION_SPEC_2026-04-14.md
```

## Known limits (intentional)
- The scaffold does not approve/reject milestone status.
- The scaffold does not replace operator screenshots or hosted-environment proof.
- The launch smoke layer is release-candidate coverage only; it does not replace broader regression/E2E programs.
- Hosted attachment handling is explicit reference capture only; no automatic media ingestion/processing/upload is performed.
- Hosted preflight enforcement validates required input shape only; it does not validate business correctness of operator-provided target choices.
- Hosted route diagnosis captures public-route behavior from the execution environment; transport-level restrictions can appear as diagnosis outcomes and must be reported as observed.
