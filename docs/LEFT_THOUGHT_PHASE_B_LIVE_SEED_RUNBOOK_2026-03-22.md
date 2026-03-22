# Left Thought Graph — Phase B Live Seed Runbook

## What is implemented

The impact-service compiler now includes a deterministic seed corpus for:

- `left-thought-graph-atlas`

Implemented in:

- `services/impact-service/src/maps/compiler/data/leftThoughtGraph.json`
- `services/impact-service/src/maps/compiler/leftThoughtSeed.ts`
- `services/impact-service/src/maps/compiler/mockSeeds.ts`
- `services/impact-service/prisma/seed.ts` (sandbox map seed list)

## Expected compiled shape

- Nodes: **79**
- Edges: **126**
- Topic key: `left-thought-graph-atlas`
- SEP-linked sources: present on all nodes (direct entry or SEP search anchor)

## Local verification

```bash
cd services/impact-service
npm run typecheck
npx jest tests/maps/falakMapService.integration.test.ts tests/maps/leftThoughtSeed.parity.test.ts
```

Optional sandbox DB parity verification:

```bash
cd services/impact-service
FALAK_MAP_SANDBOX_LOCAL=true npx jest tests/maps/falakMapSandbox.database.test.ts
```

## Seed to sandbox/staging DB (Prisma path)

When using sandbox seed flow (`FALAK_MODE=map_sandbox` or `FALAK_SEED_MAPS=true`),
`left-thought-graph-atlas` is now included in auto-seeded map topics.

```bash
cd services/impact-service
npm run falak:sandbox:seed
```

## Seed via live API resolve route

If you want to compile/persist explicitly via HTTP:

```bash
POST /v1/education/maps/resolve
{
  "topic": "left-thought-graph-atlas",
  "mode": "curated_refine"
}
```

Then publish if needed:

```bash
PATCH /v1/education/maps/left-thought-graph-atlas/status
{
  "status": "published"
}
```

## Frontend behavior

Once persisted and visible in map listing, the universe page can load it through the live path.
Fallback remains active only when live services are unavailable.

## Phase B+ polish (now included)

- Added deterministic parity test coverage for `left-thought-graph-atlas`:
  - expected **79 nodes / 126 edges**
  - expected **79 SEP-linked nodes**
- Added sandbox DB parity assertion for left-thought seed presence.
- Extended staging smoke verification with explicit left-thought map parity checks.
- Normalized topic-key handling through shared `normalizeTopicKey(...)` helper in map service path.

## Phase C progress (preview + persist)

Privileged seed import endpoints are now available:

```bash
POST /v1/education/maps/import/preview
POST /v1/education/maps/import/persist
GET  /v1/education/maps/:topicKey/import-activity
Authorization: Bearer <verified actor token>
X-Tenant-Id: <tenant-id>
```

Persist request supports:

- `mode` (`curated_refine`/etc)
- `status` (`draft`/`reviewed`/`published`)
- `force` (re-import even when checksum matches)
- `importNote` (optional governance note)
- `seed` (caller-supplied corpus)

Persist response includes:

- `map`
- `jobCreated`
- `idempotentReuse`
- `checksum`
- `preview` (counts + relation breakdown + warnings)

Current safety controls:

- node/document/edge import limits enforced in service
- checksum-based idempotent reuse for repeat payloads
- structured import error codes (`MAP_IMPORT_INVALID_PAYLOAD`, `MAP_IMPORT_LIMIT_EXCEEDED`, `MAP_IMPORT_COMPILE_FAILED`)
- structured error details for limit violations (`resource`, `actual`, `limit`)
- import metadata written as map override patch (`importChecksum`, counts, mode, source, `importedBy*`, `importNote`)
- import metadata emitted as `DomainEvent` (`falak.map.seed_imported`) for observability pipelines
- job-log metadata entry (`seed_import_metadata`) for persisted imports

Staging smoke now verifies repeat import idempotency (`idempotentReuse=true`, `jobCreated=false`, stable checksum).

Frontend admin sandbox now exposes Phase C preview/persist controls in `FalakMapAdminPage`.
