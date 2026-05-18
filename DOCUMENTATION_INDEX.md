# Anu Platform - Documentation Index

All three database schemas are now connected to their appropriate deployments. Below is a complete guide to the documentation and setup files.

## White-Label Launch Readiness

- **[WHITE_LABEL_READINESS.md](./WHITE_LABEL_READINESS.md)** - Architecture map, readiness contract, and launch gates.
- **[WHITE_LABEL_SITE_ONBOARDING.md](./WHITE_LABEL_SITE_ONBOARDING.md)** - Reusable onboarding flow and site template instructions.
- **[MUDYIN_LAUNCH_READINESS.md](./MUDYIN_LAUNCH_READINESS.md)** - Mudyin-specific domain, env, smoke, and content checklist.
- **[CONTROL_PLANE_SECURITY.md](./CONTROL_PLANE_SECURITY.md)** - Control-plane auth, shared-secret, host, and smoke requirements.
- **[VERCEL_ENVIRONMENT_SETUP.md](./VERCEL_ENVIRONMENT_SETUP.md)** - Exact Vercel env vars for backend/frontend/impact.
- **[DOMAIN_AND_DNS_SETUP.md](./DOMAIN_AND_DNS_SETUP.md)** - Cloudflare/Vercel domain setup and verification.
- **[HOSTED_SMOKE_TESTS.md](./HOSTED_SMOKE_TESTS.md)** - Hosted public/control smoke commands and expected outputs.
- **[RELEASE_CHECKLIST.md](./RELEASE_CHECKLIST.md)** - Final white-label release checklist.
- **[docs/PRESENCE_ROOMS_V1.md](./docs/PRESENCE_ROOMS_V1.md)** - Presence Rooms v1 product, model, admin, enquiry routing, demos, and smoke instructions.

## 📚 Main Documentation Files

### ⭐ Database & Auth Systems (NEW - March 2026)

These comprehensive guides verify that the database and authentication systems are fully working:

#### 1. **[DATABASE_AUTH_CHECKLIST.md](./DATABASE_AUTH_CHECKLIST.md)** - Quick Reference ⭐ START HERE
5-minute quick start checklist:
- Environment variable verification
- System components checklist
- Authentication flow diagram
- Common issues & quick fixes
- Test commands
- Pre-deployment checklist

#### 2. **[DATABASE_AUTH_VERIFICATION_SUMMARY.md](./DATABASE_AUTH_VERIFICATION_SUMMARY.md)** - Executive Summary
Complete verification results:
- What was verified
- System architecture
- Environment variables
- Test results
- Known issues & resolutions
- Deployment considerations
- Success criteria (all met ✓)

#### 3. **[VERIFY_DATABASE_AUTH.md](./VERIFY_DATABASE_AUTH.md)** - Comprehensive Guide (480 lines)
Deep-dive verification guide:
- Database verification steps (backend, impact service)
- Auth system verification (all three services)
- Service connectivity checks
- Complete auth flow test procedures
- Troubleshooting section
- Success criteria

#### 4. **[ARCHITECTURE_DIAGRAMS.md](./ARCHITECTURE_DIAGRAMS.md)** - Visual Reference (706 lines)
Complete system architecture diagrams:
- System architecture overview
- Authentication flow diagram
- Service communication diagram
- JWT token structure
- Database connection flow
- Error handling flows
- Deployment architecture

---

### Existing Documentation

### 1. **[QUICKSTART.md](./QUICKSTART.md)** ⭐ Multi-Service Setup
Get up and running in 10 minutes. This is the fastest path to a working local dev environment.
- Prerequisites setup
- Database initialization  
- Service startup (Flora-Fauna, Impact, Frontend)
- Verification steps
- Common tasks

### 2. **[DATABASE_SCHEMA_DEPLOYMENT.md](./DATABASE_SCHEMA_DEPLOYMENT.md)** - Complete Architecture
Comprehensive guide to the three-schema architecture:
- Schema mapping (001, 002, 003)
- Which tables belong to which service
- Environment variables for each deployment
- Database connections flow diagram
- Deployment checklist

### 3. **[SERVICE_SCHEMA_MAPPING.md](./SERVICE_SCHEMA_MAPPING.md)** - Visual Reference
Quick visual reference showing:
- Connection diagrams
- Service details table
- Schema details
- Data flow between services
- Health check commands

---

## 🔧 Service-Specific Documentation

### Flora-Fauna Backend (Flask)

**File:** `flora-fauna/backend/DATABASE_MIGRATION_GUIDE.md`

This guide covers:
- SQLAlchemy + Flask-Migrate setup
- Creating and running migrations with Alembic
- Working with the public schema (001_core_schema)
- Seed data creation
- Local vs. PostgreSQL configuration
- Deployment to Vercel
- Troubleshooting common issues

**Connected Schema:** `public` (001_core_schema)  
**Models:** User, Node, Event, Microcosm, Article, Action, etc.  
**Port:** 5000

---

### Impact Service (Node.js + Prisma)

**File:** `services/impact-service/DATABASE_MIGRATION_GUIDE.md`

This guide covers:
- Prisma + Node.js setup
- Multi-schema configuration (public + falak)
- Generating Prisma client from existing database
- Creating and running migrations
- Seed data with Prisma
- Using Prisma Studio
- Deployment to Vercel

**Connected Schemas:** `public` (002_impact_schema) + `falak` (003_falak_schema)  
**Models:** MembershipPlan, ImpactPool, FalakTenant, FalakNode, etc.  
**Port:** 5003

---

### Frontend (Next.js)

**File:** `frontend-next/.env.example`

Configuration template for:
- Supabase integration (Auth + database)
- Service URLs (Flora-Fauna, Impact Service)
- Feature flags
- Stripe integration

**Connected:** Supabase Auth + PostgreSQL via Supabase SDK  
**Port:** 3000

---

## 🛠️ Setup Utilities

### Setup Script

**File:** `scripts/setup-database.sh`

Automated bash script that:
- Creates .env files from templates
- Verifies database connections
- Provides next steps
- Color-coded output

Usage:
```bash
bash scripts/setup-database.sh
```

---

## 📋 Environment Configuration Files

### Environment Templates

1. **`frontend-next/.env.example`** - Frontend configuration
   - Supabase credentials
   - Service URLs
   - Feature flags

2. **`services/impact-service/.env.example`** - Impact Service (Node.js)
   - DATABASE_URL (public schema)
   - DIRECT_URL (for migrations)
   - JWT_SECRET_KEY
   - Stripe credentials
   - Falak protocol settings

3. **`flora-fauna/backend/.env.example`** - Flora-Fauna Backend (Flask)
   - DATABASE_URL (public schema)
   - Connection pool settings
   - JWT_SECRET_KEY
   - Stripe credentials
   - Flask configuration

---

## 🗺️ Schema Architecture

### Three-Schema Design

```
Supabase PostgreSQL (Single Database)
│
├── public schema
│   ├── 001_core_schema (Flora-Fauna)
│   │   └── 65+ tables: node, user, event, microcosm, article, action, etc.
│   │
│   └── 002_impact_schema (Impact Service)
│       └── 25+ tables: MembershipPlans, Subscriptions, ImpactPools, etc.
│
└── falak schema
    └── 003_falak_schema (Falak Protocol)
        └── 30+ tables: tenants, actors, nodes, edges, policies, etc.
```

### Service-to-Schema Mapping

| Service | Schema | Framework | ORM | Port |
|---------|--------|-----------|-----|------|
| flora-fauna/backend | public (001+002) | Flask | SQLAlchemy | 5000 |
| impact-service | public (002) + falak (003) | Node.js | Prisma | 5003 |
| frontend-next | public (via RLS) | Next.js | Supabase SDK | 3000 |

---

## 🚀 Quick Reference

### Database & Auth Verification

```bash
# Run comprehensive verification script
./scripts/verify-all-systems.sh

# Expected output: All critical components verified ✓
```

### Start Local Development

```bash
# Terminal 1: Flora-Fauna Backend
cd flora-fauna/backend
python app.py

# Terminal 2: Impact Service
cd services/impact-service
npm run dev

# Terminal 3: Frontend
cd frontend-next
npm run dev

# Open browser
open http://localhost:3000
```

### Verify Setup

```bash
# Check Flora-Fauna
curl http://localhost:5000/health

# Check Impact Service
curl http://localhost:5003/health

# Check Prisma schema sync
cd services/impact-service
npx prisma validate

# Check Flask migrations applied
cd flora-fauna/backend
python -m flask db current
```

### Common Database Operations

```bash
# Flora-Fauna migrations
python -m flask db migrate -m "Description"
python -m flask db upgrade
python -m flask db downgrade

# Impact Service migrations
npx prisma migrate dev --name description
npx prisma migrate deploy
npx prisma db seed

# Database shell access
# Flask
python -m flask shell

# Prisma
npx prisma studio
```

---

## 📞 Support & Troubleshooting

### Database Connection Issues

**Problem:** "Can't reach database server"

**Solution:** See troubleshooting section in:
- `services/impact-service/DATABASE_MIGRATION_GUIDE.md`
- `flora-fauna/backend/DATABASE_MIGRATION_GUIDE.md`

### Schema Mismatch Issues

**Problem:** "Models out of sync with database"

**Solution:**
- Flora-Fauna: `python -m flask db migrate`
- Impact Service: `npx prisma generate` then `npx prisma validate`

### Environment Variable Issues

**Problem:** Service can't find DATABASE_URL

**Solution:**
1. Copy .env.example to .env (or .env.local for Next.js)
2. Update connection string
3. Verify file is in correct directory
4. Restart service

---

## 📖 Documentation Structure

```
Anu Platform (Root)
│
├── QUICKSTART.md                        ← Start here!
├── DATABASE_SCHEMA_DEPLOYMENT.md        ← Architecture overview
├── SERVICE_SCHEMA_MAPPING.md            ← Visual reference
│
├── scripts/
│   └── setup-database.sh               ← Automated setup
│
├── frontend-next/
│   └── .env.example                    ← Next.js config template
│
├── services/impact-service/
│   ├── .env.example                    ← Node.js config template
│   └── DATABASE_MIGRATION_GUIDE.md      ← Prisma guide
│
└── flora-fauna/backend/
    ├── .env.example                    ← Flask config template
    └── DATABASE_MIGRATION_GUIDE.md      ← Flask-Migrate guide
```

---

## ✅ Deployment Checklist

### Before Deploying

- [ ] All three .env files configured with production values
- [ ] DATABASE_URL points to production Supabase instance
- [ ] All three schemas created (001, 002, 003)
- [ ] JWT_SECRET_KEY same across Flora-Fauna and Impact Service
- [ ] Stripe keys configured
- [ ] CORS origins updated
- [ ] HTTPS forced in production

### During Deployment

- [ ] Run database migrations for each service
- [ ] Seed initial data if needed
- [ ] Set environment variables in deployment platform
- [ ] Test health endpoints
- [ ] Verify database connections

### After Deployment

- [ ] Test all three service endpoints
- [ ] Verify cross-service communication
- [ ] Monitor error logs
- [ ] Test payment flow (Stripe integration)
- [ ] Verify multi-tenant isolation

---

## 🔗 Related Resources

### External Documentation

- [Prisma Documentation](https://www.prisma.io/docs/) - ORM for Node.js
- [Flask-Migrate Documentation](https://flask-migrate.readthedocs.io/) - Flask migrations
- [Supabase Database Guide](https://supabase.com/docs/guides/database) - PostgreSQL hosting
- [Vercel Deployment Guide](https://vercel.com/docs/concepts/deployments/overview) - Hosting

### Project Repositories

- **Anu Platform:** https://github.com/bobduck123/Anu
- **Issue Tracking:** https://github.com/bobduck123/Anu/issues
- **Project Board:** https://github.com/bobduck123/Anu/projects

---

## 📝 Notes

- All three services share the same Supabase PostgreSQL database
- Each service accesses its own schema(s) via different ORMs
- JWT tokens are shared and validated across services
- Each service has independent deployment configuration
- Migrations are managed separately per service

---

**Last Updated:** 2026-03-18

For the most up-to-date information, refer to the main documentation files listed above.
