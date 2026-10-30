# V5 Gate 3 candidate: published-only Falak transport discovery

## Implemented contract

The impact service adds four read-only endpoints under its existing Falak public route guard. All require the existing `X-Tenant-Id` header. Fastify/Zod exposes their request and response schemas through `/openapi.json`.

| Endpoint | Result | Bounds |
| --- | --- | --- |
| `GET /v1/falak/transport/networks` | Public network identities | `limit` 1–50, `offset` 0–1000 |
| `GET /v1/falak/transport/networks/:networkId/lines` | Public lines with a complete public pattern | Same |
| `GET /v1/falak/transport/lines/:lineId/patterns` | Ordered calls, station coordinates, route GeoJSON and source attribution | Same |
| `GET /v1/falak/transport/stations/:stationId/discovery` | Canonical events with public venue, artist and organisation references | Same; `from` and `to` are offset-bearing ISO dates, positive window ≤31 days |

Omitting `from` and `to` selects the next seven days. `next_offset` is null at the end of a page. Pattern calls retain order and repeated station calls. Geometry is a nullable GeoJSON LineString and station coordinates are nullable `[longitude, latitude]`. Distances are not presented as walking times or distances.

## Publication and relationship policy

Every returned node must belong to the requested tenant and be `active`, `public` and normal sensitivity. A pattern is returned only if its network, line and every called station meet that rule. Imported TfNSW nodes remain `draft`/`tenant` until an existing authorised workflow deliberately changes them; the importer does not publish them.

Station discovery follows currently active `nearby_venue` edges to public venues, then `occurs_at` or fixture-compatible `at_venue` edges to public events overlapping the requested window. It follows `features_artist` and `hosted_by` only to public active related entities. An event is returned once by canonical node ID even if multiple edges reach it. Draft, archived, deleted, private and restricted events are excluded. **Cancellation policy:** archive a cancelled event; the graph has no separate canonical cancellation enum. An `active` event with an unstructured cancellation flag in metadata is still considered active and requires editorial correction before public exposure.

The projection returns stable canonical IDs, titles, summaries and slugs. It does not expose raw node metadata, actor identities, draft records, a Presence URL, or a claim that the 2018 TfNSW sample is current. Linking canonical IDs to published Presence pages belongs to the separate manifest/content-binding change.

## Local evidence and limits

On a fresh disposable PostgreSQL 16/PostGIS 3.4 database, all 11 migrations applied. `npm.cmd run falak:test:integration:local` passed 17/17 tests across four suites, including real database fixture cases for shared stations, repeated calls, hidden pattern stations, date overlap, upcoming event links, duplicate event edges, related entity visibility, tenant separation and guarded HTTP responses. `npm.cmd run test:non-db -- --cacheDirectory <workspace cache>` passed 123 tests with six guarded database tests skipped. `npm.cmd run typecheck` and `npm.cmd run build` passed. Logs are under `C:\Dev\artifacts\presence-v5-g3-discovery-2026-10-30\`.

The dedicated `presence_v5_g3` PostGIS cluster was removed after verification. No hosted endpoint, current transport feed, cross-service Presence link or visual runtime was validated. This is a review candidate, not V3.4 Gate 7 acceptance, launch readiness, or permission to publish sample data.
