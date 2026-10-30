# Transport topology PostGIS validation — 2026-10-30

## Scope and target

Validation used a dedicated local PostgreSQL 16.15 / PostGIS 3.4 cluster named `presence_v5` in Ubuntu WSL, on `localhost:55433`, with database `presence_v5_validation`. The tenant `00000000-0000-4000-8000-000000000001` was synthetic and exists only in that disposable database. No hosted or production database was used. Docker Desktop failed to start on this machine, so the Docker Compose path itself was not exercised.

## Migration and guarded test evidence

The first `npm.cmd run falak:migrate:local` replay failed: `20261030_falak_transport_import_shape_hash` sorted before `20261030_falak_transport_topology` and attempted to alter a table that did not yet exist (`42P01`). The G2 migration directory was renamed to `20261030_falak_transport_topology_import_shape_hash`. The disposable database was recreated, then all 11 migrations applied successfully in order, including both transport migrations.

`npm.cmd run falak:test:integration:local` passed all 3 suites and 14 tests: the existing Falak database suite and the transport topology and import suites. The guarded runner now includes the two transport suites. Jest reported a transient open-handle notice after completion but exited with code 0.

## Authorised TfNSW sample

Source: [Transport for NSW temporary and sample GTFS data](https://opendata.transport.nsw.gov.au/data/dataset/temporary-andor-sample-gtfs-data), Sydney Trains sample dated 2018-09-30 to 2018-10-05. [Data.NSW's resource entry](https://data.nsw.gov.au/data/en/dataset/2-temporary-andor-sample-gtfs-data/resource/49f4dfa6-12f0-4227-83e1-5cd7e24964a9) identifies the sample and its Creative Commons Attribution licence. The archive was downloaded from the official TfNSW resource URL; SHA-256: `789D117D27C71C6F27BCD2485639FF9CAAF9080D7FFC923FC943E03B56E6AD09`. Source ZIP and extracted GTFS files are held outside the repository at `C:\Dev\artifacts\presence-v5-validation-2026-10-30\source\`.

The importer dry run produced 379 stations, 94 lines and 730 patterns with zero database writes. An apply to the synthetic tenant created 474 nodes (1 network, 94 lines, 379 stations) and 730 active patterns. SQL verification found 14,181 pattern calls. All 474 nodes were `draft` with `tenant` visibility. All nodes carried the source slug and licence in metadata; all 730 patterns carried the source version, attribution and URL. A second apply reported zero created, updated or retired nodes and patterns.

## Limits and next gate

This is a historical sample and proves parser, persistence and idempotency behavior for that bundle; it does not prove present-day Sydney network accuracy or the right to republish a current feed. No discovery endpoint, Presence manifest, publish behavior or public claim was built. Those remain separate scoped work after review of this evidence. The disposable `presence_v5` cluster was removed with `pg_dropcluster --stop 16 presence_v5` after verification; PostgreSQL/PostGIS packages remain installed in Ubuntu WSL.
