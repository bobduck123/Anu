# PEACH Gate 12 Pre-Staging Check

Date: 2026-07-31

## Target

ANU repo:

`C:\Dev\Flora_fauna`

Branch:

`feat/presence-studio-v3-m1-functional-editing`

Gate 12 objective: run the first private staging rehearsal for PEACH, proving migrations, public routes/API safety, contribution and consent persistence, steward review, support intent non-payment, consent operations, audit evidence, and no public release surfaces.

## Available infrastructure

- Docker Desktop was started and became available.
- `infra/staging/docker-compose.yml` exists and defines an `anu-staging` stack with PostgreSQL/PostGIS, Redis, MinIO, and LGTM services.
- Starting the compose PostgreSQL service was blocked by an existing host port 5432 allocation.
- An existing healthy PostgreSQL container, `presence-contract-postgres`, was available on host port 55432.

## Missing hosted staging inputs

No PEACH hosted staging credentials or URLs were found locally for:

- hosted PEACH frontend URL;
- hosted ANU backend URL;
- hosted staging PostgreSQL `DATABASE_URL`;
- hosted control-plane token or token-minting flow;
- hosted PEACH frontend env values.

## Mode selected

Gate 12 used a staging-equivalent PostgreSQL database:

`postgresql://postgres:***@127.0.0.1:55432/peach_gate12_stage`

The database was disposable and isolated from existing Presence databases.

## Pre-staging findings

The staging-equivalent PostgreSQL run found two real staging compatibility issues before the successful rehearsal:

- PEACH SQLAlchemy model constraints compared booleans to integer values, which PostgreSQL rejected.
- The Gate 9 SQL migration file had a UTF-8 BOM, which PostgreSQL rejected before the first statement.

Both issues were fixed before the successful Gate 12 rehearsal.

## Boundary

Gate 12 does not claim hosted private staging is proven. It proves the PEACH Gate 9/10 persistence and workflow path against staging-equivalent PostgreSQL and local route/API targets while documenting the hosted staging hold.
