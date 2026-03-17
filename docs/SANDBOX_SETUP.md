# Falak Map Sandbox Setup

This repo now includes a local-first Falak Map Sandbox that runs the real:

- Prisma schema
- Falak compiler and layout pipeline
- impact-service map routes
- Next.js frontend routes
- Three.js map renderer

The sandbox is isolated through environment and local infrastructure. It does not require staging or production services.

## Prerequisites

- Node.js `24.x`
- Docker Desktop or another local Docker runtime
- `npm install` run in:
  - `services/impact-service`
  - `frontend-next`

## Environment Files

Backend:

1. Copy [services/impact-service/.env.falak-sandbox.example](/C:/Dev/Flora_fauna/services/impact-service/.env.falak-sandbox.example) to `services/impact-service/.env.falak-sandbox`
2. Keep the default local database URLs unless you are intentionally pointing at another local-only Postgres instance

Frontend:

1. Copy [frontend-next/.env.falak-sandbox.local.example](/C:/Dev/Flora_fauna/frontend-next/.env.falak-sandbox.local.example) to `frontend-next/.env.falak-sandbox.local`
2. The default frontend sandbox values point to:
   - frontend: `http://localhost:3000`
   - impact-service: `http://localhost:5003`
   - tenant: `11111111-1111-4111-8111-111111111111`
   - default actor: `anu-admin`

## Local Database

The dedicated sandbox database uses:

- host: `localhost`
- port: `55443`
- database: `anu_falak_sandbox`
- shadow database: `anu_falak_sandbox_shadow`
- container: `falak-map-sandbox-postgis`

Start it:

```bash
cd services/impact-service
npm run falak:sandbox:db:up
```

Stop it:

```bash
cd services/impact-service
npm run falak:sandbox:db:down
```

Inspect container state:

```bash
cd services/impact-service
npm run falak:sandbox:db:ps
npm run falak:sandbox:db:logs
```

## Migrate, Reset, Seed

Generate Prisma client:

```bash
cd services/impact-service
npm run falak:sandbox:prisma:generate
```

Apply migrations:

```bash
cd services/impact-service
npm run falak:sandbox:migrate
```

Reset the local sandbox database:

```bash
cd services/impact-service
npm run falak:sandbox:reset
```

Seed sandbox data:

```bash
cd services/impact-service
npm run falak:sandbox:seed
```

Seeded map topics:

- `consciousness-theories`
- `ancient-levantine-deities`
- `software-architecture-patterns`
- `toy-commons-loop`

Sandbox identities:

- tenant: `11111111-1111-4111-8111-111111111111`
- admin: `anu-admin`
- curator: `anu-curator`
- governor: `anu-governor`
- member: `anu-public`

## Run The Sandbox

Backend:

```bash
cd services/impact-service
npm run falak:sandbox:backend
```

Frontend:

```bash
cd frontend-next
npm run sandbox:dev
```

Open:

- `http://localhost:3000/sandbox/maps`
- `http://localhost:3000/education/maps`
- `http://localhost:3000/education/maps/new`
- `http://localhost:3000/admin/maps`

## Command Matrix

Backend install:

```bash
cd services/impact-service
npm install
```

Frontend install:

```bash
cd frontend-next
npm install
```

Backend tests:

```bash
cd services/impact-service
npm test -- --runInBand
```

Backend typecheck:

```bash
cd services/impact-service
npm run typecheck
```

Frontend tests:

```bash
cd frontend-next
npm run test -- --run
```

Frontend typecheck:

```bash
cd frontend-next
npm run typecheck
```

Frontend production build:

```bash
cd frontend-next
npm run build
```

Automated sandbox verification:

```bash
cd services/impact-service
npm run falak:sandbox:verify
```

## Route Summary

Primary sandbox routes:

- `/education/maps`
- `/education/maps/[mapId]`
- `/education/maps/new`
- `/admin/maps`
- `/sandbox/maps`

Compatibility aliases also exist for older route expectations:

- `/admin/education/maps`
- `/education/resource-library/maps`
- `/education/resource-library/maps/[topicKey]`

## Safety Notes

- The sandbox database guard blocks non-local database targets for reset, migrate, and seed scripts
- `FALAK_MODE=map_sandbox` enables trusted local actor headers without broadening production behavior
- The sandbox frontend and backend reuse the real Falak code paths; they do not bypass persistence
