# ANU Falak DB Replacement Strategy

Date: 2026-03-15

## Default Recommendation

The safe default remains:

1. fresh hosted staging DB first
2. production dark launch with Falak disabled second
3. consider any production DB replacement only through a separate approved cutover plan

Historical Prisma migrations were rewritten earlier to fix fresh replay.

That makes fresh replay the preferred path.
It does not make casual reuse or rewrite of an existing non-local DB safe.

## Decision Tree

### A. Fresh Staging DB

Safety:

- safe
- preferred

When appropriate:

- first hosted staging rollout
- any staging environment where Falak needs clean replay

Required steps:

1. provision a brand new Postgres/PostGIS DB
2. point staging only at that DB
3. run `prisma migrate deploy`
4. run staging seed
5. run readiness and smoke

Prisma:

- `prisma migrate deploy`: yes
- `prisma migrate resolve`: no

Downtime:

- none

Cutover and rollback complexity:

- low

### B. Fresh Replacement Production DB

Safety:

- potentially safe
- only under an approved cutover project

When appropriate:

- when a production replacement DB is intentionally chosen because fresh replay is safer than reconciling an existing divergent DB
- when continuity requirements, data migration scope, and rollback are fully planned

Required steps:

1. freeze scope
2. capture backup or export from the current production DB
3. provision a brand new production-grade Postgres/PostGIS DB
4. run `prisma migrate deploy` on the fresh DB
5. apply approved bootstrap and import steps
6. validate schema, data, and app behavior
7. cut over explicitly
8. retain rollback path to the old DB and old app configuration

Prisma:

- `prisma migrate deploy`: yes, on the new DB
- `prisma migrate resolve`: possibly, but only if the replacement flow includes deliberate baselining or reconciliation after manual review

Downtime:

- maybe
- low only if cutover is engineered carefully
- otherwise moderate

Cutover and rollback complexity:

- high

### C. Existing Production DB With Old Prisma Migration History

Safety:

- not safe for casual rollout

When appropriate:

- only when the team intentionally chooses a reconciliation project instead of a fresh replacement DB

Required steps:

1. capture verified backup or snapshot
2. inspect `falak._prisma_migrations`
3. compare recorded migration names and checksums to the current repo
4. compare actual DB objects to the current migration history
5. decide whether the DB can be reconciled safely or should be replaced

Prisma:

- `prisma migrate deploy`: not the default first step
- `prisma migrate resolve`: maybe relevant, but only after manual review and only for an explicit reconciliation action

Downtime:

- maybe

Cutover and rollback complexity:

- high

### D. Existing Production DB Reformatted Or Rebuilt From Scratch

Safety:

- last resort
- not the default next step

When appropriate:

- only when explicitly approved as a controlled replacement or incident response operation
- only when the team accepts the consequences of rebuild or has a complete continuity import plan

Required steps:

1. approval gate
2. full backup or export
3. replacement DB provisioned
4. clean migration replay
5. bootstrap or import
6. cutover validation
7. rollback window held open

Prisma:

- `prisma migrate deploy`: yes, on the rebuilt DB
- `prisma migrate resolve`: usually no for the rebuilt DB itself

Downtime:

- likely

Cutover and rollback complexity:

- very high

## When `prisma migrate resolve` Is Relevant

Relevant:

- failed migration recovery
- deliberate reconciliation after manual review
- deliberate baselining of an existing DB when the DB state is known and approved

Not relevant:

- normal fresh staging rollout
- normal fresh replacement DB rollout
- papering over rewritten historical migration checksums
- skipping a real DB state review

## Full Replacement Path

### Prerequisites

- hosted staging already passed
- change owner assigned
- DB owner assigned
- rollback owner assigned
- maintenance window and communications plan prepared
- verified backup or export plan documented

### Backup Or Export Requirements

Minimum:

- full database backup or provider snapshot
- export of business-critical tables needed for continuity
- export checksum or row-count validation

Do not proceed without:

- a restorable backup
- a tested rollback contact path

### Fresh DB Creation

1. create a new Postgres/PostGIS DB
2. enable PostGIS
3. apply production-grade networking, credentials, and backups
4. run `prisma migrate deploy`

### Seed And Bootstrap

Use only the minimal bootstrap required for the target environment.

For staging:

- staging seed is appropriate

For production replacement:

- do not use demo seed data as a substitute for real continuity data
- bootstrap only what the cutover design explicitly requires

### Backfill Or Import

If continuity matters, define exactly what must move:

- tenants
- actors
- nodes
- edges
- approvals
- events
- ledger entries
- any non-Falak business tables still required by the live alpha

If you rebuild from scratch without import:

- existing application data is lost from the replacement DB
- existing Falak or non-Falak continuity is lost unless preserved elsewhere

### Cutover Strategy

1. freeze writes if required
2. confirm backup completion
3. confirm fresh DB validation
4. switch app config to the new DB
5. deploy the approved app image
6. run health, readiness, smoke, and critical user-path validation

### Validation After Cutover

Required:

- app boot
- DB connectivity
- expected schema objects present
- readiness passes
- key production routes healthy
- ledger and event integrity checks pass if Falak data was imported

### Rollback Strategy

Rollback must be defined before cutover:

1. preserve the old DB untouched during the cutover window
2. preserve the previous app image or deployment
3. if validation fails, point the app back to the old DB
4. redeploy the previous image if needed

Rollback should not depend on rebuilding the replacement DB again.

## Approval Gates

Operator approval is required at these points:

1. before touching any existing production DB
2. before any backup or export step with production impact
3. before running `prisma migrate resolve` on a non-local DB
4. before switching production traffic to a replacement DB
5. before destroying or reformatting the old DB

## Why Fresh Replacement Is Often Safer Than In-Place Rewrite

With rewritten historical Prisma migrations:

- fresh replay is deterministic
- existing DB history may already have drifted checksums
- in-place rewrite mixes historical drift, live data, and rollout risk

A fresh replacement DB avoids that checksum ambiguity.
It does not remove the need for backup, import, validation, or rollback.

## Practical Team Rule

Use this rule unless explicitly overridden:

- fresh staging DB: yes
- fresh replacement production DB: only by approved cutover
- existing production DB with prior migration history: review first
- in-place production DB rewrite: last resort only
