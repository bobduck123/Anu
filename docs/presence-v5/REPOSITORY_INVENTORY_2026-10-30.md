# ANU / Presence V5 repository inventory — 30 October 2026

## Source and branch truth

- `C:/Dev/Flora_fauna` is the Git implementation repository (`bobduck123/Anu`). `presence-app` is the client, `flora-fauna/backend` is the Flask core and Presence API, and `services/impact-service` is the Fastify/Prisma Falak service. `C:/Dev/Flora_fauna/flora-fauna` exists; it is the core API subtree, not a separate Git repository.
- The primary checkout was `presence/v4-g2-draft-links-2026-10-20` at `1d5202f`, with unrelated untracked `PEACH/` material preserved. This work uses isolated `C:/Dev/anu-presence-v5-g1`, based on V4 G2 hardening `9d80281`. No original checkout changes were made.
- GitHub draft PR [#27](https://github.com/bobduck123/Anu/pull/27) is open at `1d5202f`, one commit/seven files against `830096c` main. Draft PR [#28](https://github.com/bobduck123/Anu/pull/28) is stacked on #27 at `9d80281`, five commits/13 changed files, and remains open. Draft contract PR [#26](https://github.com/bobduck123/Anu/pull/26) is separate. These are unmerged review lineages.
- `C:/Dev/fbi-civic-cultural-os` is a local non-Git project with Sydney source and frontend material. It is a compatibility lead, not an authoritative ANU backend. This gate does not import its data.

## Capability inventory

| Area | Verified source state | V5 implication |
|---|---|---|
| Falak identity and graph | `falak.nodes` and `falak.edges` have tenant IDs, statuses, visibility, metadata, PostGIS geometry and indexes. A public nearby query uses `ST_DWithin`; node and edge mutations use existing policy and route guards. | Reuse canonical nodes for network, line, station, venue, event and artist identities. Keep typed topology outside generic metadata. |
| Cultural events | Falak event workflow and time fields exist. Flask `Event`/`Venue` and `ci_fused_event` are separate legacy/cultural-intelligence representations. | Publication, recurrence, rights and cross-service canonical mapping remain unresolved; do not surface them as public discovery by assumption. |
| Presence | Flask `/api/presence` has owner nodes, explicit publish, public rooms and V4 G2 draft-link hardening. | Extend the existing lifecycle later. Do not replace it with a new service or expose draft links through a scene manifest. |
| Media | Presence media asset and owner upload paths exist. | Asset integrity, trusted scene modules and immutable manifest contracts need separate review. |
| Spatial topology | PostGIS exists in Falak; no transport route-pattern schema was found. | Gate 1 adds ordered pattern and call tables while keeping stations as Falak nodes. |
| Delivery | Separate Flask and Fastify apps, migrations and tests. Impact service has Prisma migrations and named `typecheck`, `build`, `test:non-db` scripts. | A cross-service identity/binding contract is required before the train journey can be served through Presence. |

## Dependency map and sequence

`Falak canonical nodes + PostGIS` → `typed transport patterns and source provenance` → `authorised GTFS import` → `published cultural event discovery` → `Presence versioned binding/manifest` → `Three.js client journey` → `hosted, permission and load proof`.

V5 Gate 1 is the current branch. Gates 2–6 require separate scoped branches and review evidence. The requested programme is authorised for ordinary development work, but schema deployment, production data changes, auth/tenant policy changes, public publication and launch remain human controlled under the repository rules.

Transport for NSW's [GTFS documentation](https://opendata.transport.nsw.gov.au/developers/documentation) identifies static stops, routes, trips, ordered stop times and shapes, including Sydney Trains and connected services. Its [developer guide](https://opendata.transport.nsw.gov.au/blog/devapp) describes API-key access and daily static feed updates. The precise dataset licence and required attribution for the selected production feed must be recorded before Gate 2 imports it; the synthetic fixture carries no TfNSW data.

## Baseline and limits

- Flask G2 baseline on this branch: `python -X utf8 -m pytest tests/test_presence_g2_draft_links.py tests/test_presence_nodes.py -q --disable-warnings` — 83 passed, 447 warnings.
- Local Docker daemon is unavailable, so PostgreSQL migration and PostGIS behavior are not yet verified here. This branch's database test is guarded by `FALAK_INTEGRATION_LOCAL=true` and a disposable `DATABASE_URL`.
- `npm ci` installed impact-service dependencies, but Prisma generation initially failed because the schema engine download host could not resolve in the sandbox. Validation status is recorded in the Gate 1 result after retry.
- No current Preview or Production endpoint was tested. The 26 October G2 evidence reports failed backend/impact/Presence Preview provisioning and explicitly does not establish hosted behavior today.

## Do not change in this slice

Presence owner auth, tenant permissions, explicit publish and rollback, existing public routes, live data, Falak policy engine, payment flows, SMAC rendering code and protected proof material.
