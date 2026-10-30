# ExecPlan: published-only transport discovery

## Gate

Presence V3.4 Gate 7 public-execution discovery, as an internal V5 backend candidate. This plan does not claim Gate 7 acceptance.

## Objective

Expose read-only Falak endpoints for public networks, ordered line patterns and station-to-cultural-event discovery, using the validated transport tables and canonical nodes.

## Why now

The disposable PostGIS replay, guarded tests and historical TfNSW import establish the schema and importer. A public-safe read contract is the next dependency for a Presence manifest binding.

## Current state

Falak has canonical nodes and edges, route patterns and calls, and a guarded public API. The importer leaves topology nodes draft/tenant-visible. `active` plus `public` is the existing public publication boundary. Event-to-venue uses `occurs_at`; the transport fixture also uses `at_venue`. Station-to-venue uses `nearby_venue`.

## Scope and risks

Add new read-only routes under the existing Falak public route guard and tenant header. Enforce tenant, active status, public visibility and normal sensitivity at every entity hop. Bound list sizes and date windows. Do not change authentication, publishing, tenant configuration, importer state or the existing public routes. Risk is medium because a query omission could disclose draft cultural data.

## Milestones

1. Implement bounded network, line-pattern and station discovery projections with explicit response schemas.
2. Verify ordering, interchanges, date windows, canonical deduplication, cancellation policy, public-only filters and tenant separation on disposable PostGIS.
3. Record commands, results and remaining hosted limits; review the full scoped diff before proposing merge.

## Rollback

Remove the new route registration and discovery module. The change adds no migration or data mutation.
