# Anu Platform

Anu is a civic commons platform for mutual aid, governance, impact pools, and creator-driven cultural surfaces.

**New to this project?** Start with **[QUICKSTART.md](./QUICKSTART.md)** to get running in 5 minutes.

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

```bash
# 1. Clone and install dependencies
git clone https://github.com/bobduck123/Anu.git
cd Anu
npm install

# 2. Configure services (see QUICKSTART.md)
bash scripts/setup-database.sh

# 3. Run all services
npm run dev

# 4. Open http://localhost:3000
```

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
