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

## Workflow safety rules
1. Append-only bundle path behavior:
- existing target bundle directory is rejected (`FileExistsError`).
2. No auto-completion claims:
- `human_narrative.completion_claim` remains `null`.
- markdown explicitly states that completion conclusions are human-owned.
3. No silent mutation of unrelated docs:
- script writes only `evidence.json` and `evidence.md` in the selected bundle path.

## Command example
```bash
python scripts/capture_milestone_evidence.py \
  --milestone-or-slice ANU-024 \
  --command "python -m unittest scripts.tests.test_capture_milestone_evidence -v" \
  --include-git-changed-files \
  --source-doc docs/program/MILESTONE_ACCEPTANCE_PACK_2026-04-07.md \
  --source-doc docs/program/M5_COMPLETION_REPORT.md
```

## Known limits (intentional)
- The scaffold does not approve/reject milestone status.
- The scaffold does not replace operator screenshots or hosted-environment proof.
