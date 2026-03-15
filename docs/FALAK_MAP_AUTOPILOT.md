# Falak Map Autopilot

Falak Map Autopilot adds a semantic knowledge-constellation system to the Falak engine for `Education -> Resource Library -> Maps`.

## Reuse Plan

The renderer intentionally extends the existing Falak spatial layer instead of replacing it:

- Reused `frontend-next/src/ui/patterns/starfield/QuantumEngine.ts` for fog, bloom, starfield, orbit controls, and node/edge glow language.
- Reused `frontend-next/src/ui/patterns/starfield/QuantumCanvas.tsx` as the scene host.
- Added semantic layout support by letting Falak nodes carry authoritative positions and anchor springs.
- Kept the existing right-drawer interaction model and adapted it into `MapNodeDrawer`.

## Backend

New backend modules live under `services/impact-service/src/maps`.

- `compiler/`: topic profiling, deterministic discovery, dedupe, taxonomy, axis scoring, relationship building, scoring, and constrained layout.
- `repositories/prismaFalakMapRepository.ts`: Prisma persistence for map definitions, nodes, edges, jobs, logs, aliases, overrides, and layout snapshots.
- `services/falakMapService.ts`: resource retrieval, resolve-or-compile flow, admin mutation helpers.
- `routes/registerMapRoutes.ts`: Fastify routes mounted at `/v1/education/maps`.

## Rollout Boundary

Education maps are Falak-backed and now have their own rollout control:

- `FALAK_MAP_ROUTE_GUARD_MODE=inherit|disabled|admin_only|tenant_allowlist|enabled`
- staged and production env overlays should set this explicitly
- Vercel routes `/v1/education/maps/*` into the Falak Fastify function so hosted behavior matches the standalone Falak runtime
- production dark launch should set `FALAK_MAP_ROUTE_GUARD_MODE=disabled`

## Data Model

New Prisma models are created inside the `falak` schema:

- `FalakMapDefinition`
- `FalakMapCategory`
- `FalakMapAxis`
- `FalakMapNode`
- `FalakMapEdge`
- `FalakMapNodeSource`
- `FalakMapLayoutSnapshot`
- `FalakMapJob`
- `FalakMapJobLog`
- `FalakMapAlias`
- `FalakMapOverride`

The current graph state is replaced coherently per topic key, while jobs, logs, overrides, and snapshots remain append-only for reviewability.

## Canonical Scoring

The default size formula is fixed to:

```txt
0.30 * importance +
0.10 * popularity +
0.30 * evidence +
0.15 * centrality +
0.10 * complexity +
0.05 * freshness
```

Popularity is reduced and evidence matches importance, as requested.

Render radius uses square-root normalization:

```txt
renderRadius = minR + (maxR - minR) * sqrt(normalized(sizeScore))
```

## Compile Flow

`POST /v1/education/maps/resolve`

1. Normalize the topic.
2. Check for an existing map.
3. If missing, create a map job.
4. Run deterministic topic profiling and source planning.
5. Discover, canonicalize, and dedupe entities.
6. Build taxonomy, axes, relationships, scoring, and constrained layout.
7. Persist a draft resource and snapshot.

Mock seed corpora currently cover:

- consciousness theories
- ancient levantine deities
- software architecture patterns

## Frontend

New frontend pages:

- `/education/resource-library/maps`
- `/education/resource-library/maps/[topicKey]`
- `/education/resource-library/maps/[topicKey]/all-entities`
- `/education/resource-library/maps/[topicKey]/categories/[categoryKey]`
- `/admin/education/maps`

Key components:

- `MapLibraryIndex`
- `MapResourceWorkspace`
- `MapNodeDrawer`
- `MapCompareTray`
- `EducationMapsAdminPage`

The map workspace supports:

- topic request / compile
- 3D exploration
- flatten-to-2D toggle
- category/search/evidence/importance filtering
- selection and compare queue
- bibliography panel
- admin publish / rerun-layout / node edit / relation edit actions

## Tenant Header

Map routes use Falak tenant context. The frontend client sends `X-Tenant-Id` via:

- `NEXT_PUBLIC_FALAK_TENANT_ID`
- or `localStorage['falak_tenant_id']`
- or the default seeded tenant id `11111111-1111-4111-8111-111111111111`

## Verification

Verified locally on the backend:

- `services/impact-service/node_modules/.bin/tsc.cmd -p services/impact-service/tsconfig.json --noEmit`
- `services/impact-service/node_modules/.bin/jest.cmd services/impact-service/tests/maps --config services/impact-service/jest.config.cjs --runInBand`

Frontend typecheck was not run because `frontend-next/node_modules` is not present in this workspace snapshot.
