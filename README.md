# Anu Platform

Anu is a civic commons platform for mutual aid, governance, impact pools, and creator-driven cultural surfaces.

**New to this project?** Use the service-specific commands below first. Historical setup and deployment documents may contain database-mutating commands that are not required for local typechecks or compilation.

## 📊 Architecture

This repository contains three deployable services sharing a single **Supabase PostgreSQL database** with three schemas:

| Service | Framework | Schema | Port | Purpose |
|---------|-----------|--------|------|---------|
| **frontend-next** | Next.js | public (RLS) | 3000 | Web application |
| **flora-fauna/backend** | Flask/SQLAlchemy | public (001) | 5000 | Core API (users, events, actions) |
| **services/impact-service** | Node.js/Prisma | public (002) + falak (003) | 5003 | Impact tracking & Falak protocol |

## 🗄️ Database Schemas

All schemas live in a single Supabase PostgreSQL instance:

```
supabase.postgres
├── public schema
│   ├── 001_core_schema (Flora-Fauna core tables)
│   └── 002_impact_schema (Membership & impact tables)
└── falak schema
    └── 003_falak_schema (Knowledge graph protocol)
```

**Learn more:** See [DATABASE_SCHEMA_DEPLOYMENT.md](./DATABASE_SCHEMA_DEPLOYMENT.md) for complete architecture.

## 🚀 Quick Start

There is no root npm application or root `package.json`. Run commands from the relevant service directory. Use Node 24 for the Node services and a local Python environment for the core backend.

```bash
# Civic frontend, from the repository root
cd frontend-next
npm ci
npm run typecheck
npm run dev
# Open http://localhost:3000
```

`npm run typecheck` regenerates current route types with `next typegen` before TypeScript checks them. The TypeScript configuration excludes stale development-cache validators under `.next/dev`; freshly generated `.next/types` validators remain checked. No generated source files need manual editing or deletion.

```bash
# Impact service, in a separate terminal from the repository root
cd services/impact-service
npm ci
npm run typecheck
npm run build
npm run test:non-db
```

The impact build generates the Prisma client and compiles TypeScript. It does **not** deploy migrations, seed a database or contact a production database. Database changes are a separate reviewed release step: an authorised operator verifies the target and runs `npm run prisma:migrate:deploy`. Do not run migrations as a setup shortcut. Development migration and seed commands remain explicitly mutating operations.

For backend setup, follow its service requirements and use a disposable local database. The P0 regression command is `python -m pytest -q -p no:cacheprovider tests/test_public_connectors.py tests/test_node_isolation.py` from `flora-fauna/backend`; these tests create synthetic in-memory databases. Presence has its own npm application under `presence-app` and is subject to the V3.4 gated plan.


For detailed setup: [QUICKSTART.md](./QUICKSTART.md)

## 📚 Documentation

- **[QUICKSTART.md](./QUICKSTART.md)** - Get running in 5 minutes
- **[DOCUMENTATION_INDEX.md](./DOCUMENTATION_INDEX.md)** - Complete documentation index
- **[DATABASE_SCHEMA_DEPLOYMENT.md](./DATABASE_SCHEMA_DEPLOYMENT.md)** - Full architecture overview
- **[SERVICE_SCHEMA_MAPPING.md](./SERVICE_SCHEMA_MAPPING.md)** - Visual schema reference

### Service-Specific Guides

- **Flora-Fauna Backend:** [flora-fauna/backend/DATABASE_MIGRATION_GUIDE.md](./flora-fauna/backend/DATABASE_MIGRATION_GUIDE.md)
- **Impact Service:** [services/impact-service/DATABASE_MIGRATION_GUIDE.md](./services/impact-service/DATABASE_MIGRATION_GUIDE.md)

## 🔧 Deployment

Deploy as three separate Vercel projects from the same repository:

1. `frontend-next` → https://vercel.com/new
2. `flora-fauna/backend` → Vercel Python support
3. `services/impact-service` → Vercel Node.js support

See [DEPLOY_VERCEL_MANARA.md](./docs/DEPLOY_VERCEL_MANARA.md) for detailed deployment steps.

## 🏗️ Service Architecture

### Frontend (Next.js)
- Uses Supabase Auth for authentication
- Queries database via Supabase SDK
- Calls `/api/` endpoints on core and impact services

### Flora-Fauna Backend (Flask)
- Serves core platform APIs
- Manages users, events, actions, communities
- Connects to `public` schema (001_core_schema)
- Port: 5000

### Impact Service (Node.js)
- Manages memberships, subscriptions, impact tracking
- Implements Falak knowledge graph protocol
- Connects to both `public` (002_impact_schema) and `falak` (003_falak_schema) schemas
- Port: 5003

## 🔄 API Routes

- Frontend proxies through `/_core/*` and `/_impact/*`
- Core API: `http://localhost:5000/api/*`
- Impact API: `http://localhost:5003/api/*`
- Combined aliases for compatibility

## 🚢 Current Features

- Multi-tenant architecture with node system
- User accounts and profiles
- Event and action management
- Community/microcosm structure
- Membership plans and subscriptions (Stripe)
- Impact pool tracking with append-only ledgers
- Falak knowledge graph protocol
- Creator channels and cultural surfaces

## ⚠️ Known Constraints

- File uploads are temporarily stored in Vercel's `/tmp` directory (not durable)
- Add object storage (Vercel Blob, S3, etc.) before public launch for persistent media
- Connection pooling required for PostgreSQL in production

## 📖 Additional Resources

- [SANDBOX_SETUP.md](./docs/SANDBOX_SETUP.md) - Local Falak sandbox setup
- [SANDBOX_VERIFICATION.md](./docs/SANDBOX_VERIFICATION.md) - Sandbox verification
- [GITHUB_DESKTOP_VERCEL_HANDOFF.md](./docs/GITHUB_DESKTOP_VERCEL_HANDOFF.md) - Git workflow guide
