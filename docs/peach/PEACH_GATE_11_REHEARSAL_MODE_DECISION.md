# PEACH Gate 11 Rehearsal Mode Decision

Date: 2026-07-31

## Selected mode

Local-only rehearsal.

## Why local-only

No private staging database URL, deployed backend origin, control-plane credentials, or migration runner credentials were available in the task context. The repo includes environment examples and staging-related config references, but not a usable PEACH staging target.

Running local-only is honest and sufficient for Gate 11's first operating-loop proof. Hosted/private staging should be Gate 12.

## Environment used

Backend rehearsal:

- `FLASK_ENV=testing`
- `SQLALCHEMY_DATABASE_URI=sqlite:///C:/tmp/peach_gate11_rehearsal.db`
- `AUTO_CREATE_ALL=True`
- `CONTROL_PLANE_HOSTS=["control.test"]`
- `CONTROL_PLANE_ALLOWED_ROLES=["platform_admin", "node_admin"]`
- `CONTROL_PLANE_SHARED_SECRET=peach-control-secret`
- `CONTROL_PLANE_JWT_AUDIENCE=control`

Frontend route checks:

- `npm run dev -- -p 3331`
- Localhost control-host behavior via existing frontend control session defaults.

## Database used

Disposable local SQLite file:

`C:\tmp\peach_gate11_rehearsal.db`

## Migration/setup command

The rehearsal used the ANU backend schema setup path:

`python C:\Users\emadh\OneDrive\Documents\PEACH\peach_gate11_rehearsal.py`

The temporary runner was removed after execution. The command produced `AUTO_CREATE_ALL is enabled` and verified all required PEACH tables existed.

## Reset/rollback process

Local rehearsal reset:

1. Stop any backend/frontend dev processes.
2. Delete `C:\tmp\peach_gate11_rehearsal.db`.
3. If SQLite sidecar files exist, delete `C:\tmp\peach_gate11_rehearsal.db-shm` and `C:\tmp\peach_gate11_rehearsal.db-wal`.

SQL rollback order for disposable rehearsal data:

1. `peach_contribution_review_event`
2. `peach_consent_record`
3. `peach_consent_operation_request`
4. `peach_support_intent`
5. `peach_contribution`

Preserve `AuditLog` unless the database is disposable.

## Limitations

This did not prove hosted staging networking, production PostgreSQL migration execution, deployed control-token minting, email, uploads, payments, or public release. Those remain Gate 12+.