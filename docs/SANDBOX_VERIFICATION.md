# Falak Map Sandbox Verification

Use this checklist before pushing more Falak map work into hosted Anu environments.

## Automated Verification

Database-backed sandbox verification:

```bash
cd services/impact-service
npm run falak:sandbox:verify
```

What that covers:

- dedicated sandbox Postgres container is up
- Prisma client generation
- migrations applied
- sandbox seed data inserted
- live database integration checks in [falakMapSandbox.database.test.ts](/C:/Dev/Flora_fauna/services/impact-service/tests/maps/falakMapSandbox.database.test.ts)

Application checks:

```bash
cd services/impact-service
npm run typecheck
npm test -- --runInBand
npm run build
```

```bash
cd frontend-next
npm run typecheck
npm run test -- --run
npm run build
```

## Manual Verification Checklist

### 1. Seeded map opens

1. Open `http://localhost:3000/education/maps`
2. Open `Consciousness Theories` or `Toy Commons Loop`
3. Confirm:
   - map detail page renders
   - Three.js scene loads
   - search/filter changes the visible node set
   - flatten-to-2D toggles the scene into planar view
   - compare mode works for at least two nodes

### 2. Missing map request creates a persisted draft

1. Open `http://localhost:3000/education/maps/new`
2. Request a topic that is not seeded, for example `river memory protocols`
3. Confirm:
   - request succeeds
   - returned map status is `draft`
   - the generated draft opens in the viewer
   - reloading the detail URL shows the same persisted draft

### 3. Admin override persists

1. Open `http://localhost:3000/admin/maps`
2. Keep actor set to `anu-admin`
3. Select `software-architecture-patterns`
4. Change:
   - one category label or description
   - one node summary or pinned state
   - one edge relation or weight
5. Confirm:
   - each save succeeds
   - reload the page
   - the edited values remain persisted

### 4. Rerun layout respects pinned nodes

1. In `/admin/maps`, pin a node and set a memorable position
2. Run `Rerun layout`
3. Confirm:
   - a new snapshot appears
   - the pinned node stays pinned
   - the pinned node position is unchanged

### 5. Snapshot restore works

1. Record the current snapshot
2. Make a layout-changing operation such as rerun
3. Restore the earlier snapshot
4. Confirm:
   - `currentSnapshotId` effectively changes back
   - the restored node positions match the earlier snapshot
   - category and relation edits still persist after restore

### 6. Sandbox actor switching is isolated

1. Open `http://localhost:3000/sandbox/maps`
2. Switch between `anu-admin`, `anu-curator`, and `Public`
3. Confirm:
   - the selected actor persists in local storage
   - public pages still load without privileged mutations
   - admin mutations require a sandbox actor context

## Expected Seeded Topics

- `consciousness-theories`
- `ancient-levantine-deities`
- `software-architecture-patterns`
- `toy-commons-loop`

## Expected Safe Boundaries

- All destructive reset flows remain local-only
- No staging or production database should be required
- Falak staging and production remain unchanged by this harness
