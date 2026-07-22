# Studio V3 M1 rollback

Status: actionable; no production exercise required because no deploy or hosted write occurred

## Operational rollback

Disable the existing hosted human-test gate by removing the frontend/backend hosted-human-test flags and explicit BBB allowlist values documented by the hosted-gate evidence, then rebuild/restart through the normal host process. BBB owner editing returns to V2; non-BBB Rooms and public routes remain unchanged.

## Code rollback

Revert only the final M1 commit after resolving its exact identity. Do not reset the worktree or revert the P1 Foundation/hosted-gate prerequisites.

## Data posture

- No schema migration is introduced.
- V3 metadata extensions are optional/backward-compatible and older code ignores them safely.
- No hosted data was written during this pass.
- In later real use, inventory-only uploads are unattached private `draft_uploaded` records. Disabling/reverting M1 leaves them private and does not require public or canonical rollback; a separately deliberate owner cleanup may remove unused records through existing cleanup semantics.

## Verification after rollback

- BBB owner editor follows V2 fallback when the hosted gate is off.
- `/p/bbbvision` and `/presence/bbbvision` match their prior public outputs.
- No publish, canonical Work/Collection mutation, or public-data operation is required.
- P1 private state remains intact.
