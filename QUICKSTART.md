# Anu Platform - Quick Start Guide

Get the multi-schema Anu platform running locally in 10 minutes.

## 1️⃣ Prerequisites

- Node.js (v18+)
- Python (3.9+)  
- PostgreSQL tools or Supabase account
- Git

## 2️⃣ Clone & Install

```bash
# Clone repository
git clone https://github.com/bobduck123/Anu.git
cd Anu

# Install all dependencies
npm install
cd services/impact-service && npm install && cd ../..
cd flora-fauna/backend && pip install -r requirements.txt && cd ../..
cd frontend-next && npm install && cd ../..
```

## 3️⃣ Database Setup

### Option A: Supabase (Recommended for Production)

1. Create Supabase account at https://supabase.com
2. Create new PostgreSQL project
3. Copy connection string from `Project Settings → Database`

### Option B: Local PostgreSQL

```bash
# Create local database
createdb anu_platform

# Connection string format:
# postgresql://postgres:password@localhost:5432/anu_platform
```

## 4️⃣ Initialize Database Schemas

The schemas should already exist from the migration scripts:
- `001_core_schema` → Flora-Fauna tables
- `002_impact_schema` → Impact & Membership tables  
- `003_falak_schema` → Falak Protocol tables

### Verify in Supabase SQL Editor:

```sql
SELECT schema_name FROM information_schema.schemata 
WHERE schema_name IN ('public', 'falak');
```

## 5️⃣ Configure Services

### Flora-Fauna Backend (Port 5000)

```bash
cd flora-fauna/backend

# Copy .env template
cp .env.example .env

# Edit .env with your database URL
# DATABASE_URL=postgresql://...

# Run migrations
python -m flask db upgrade

# Start server
python app.py
```

### Impact Service (Port 5003)

```bash
cd services/impact-service

# Copy .env template
cp .env.example .env

# Edit .env with your database URL
# DATABASE_URL=postgresql://...
# DIRECT_URL=postgresql://...

# Generate Prisma client
npx prisma generate

# Start server
npm run dev
```

### Frontend (Port 3000)

```bash
cd frontend-next

# Copy .env template
cp .env.example .env.local

# Edit .env.local with Supabase credentials
# NEXT_PUBLIC_SUPABASE_URL=...
# NEXT_PUBLIC_SUPABASE_ANON_KEY=...

# Start dev server
npm run dev
```

## 6️⃣ Verify Everything Works

```bash
# Test Flora-Fauna
curl http://localhost:5000/health

# Test Impact Service
curl http://localhost:5003/health

# Test Frontend
open http://localhost:3000
```

## 📊 Database Schema Overview

```
Supabase PostgreSQL
├── public schema
│   ├── 001_core_schema (Flora-Fauna models)
│   │   └── user, event, action, microcosm, article, etc.
│   └── 002_impact_schema (Memberships & Impact)
│       └── MembershipPlan, Subscription, ImpactPool, etc.
└── falak schema
    └── 003_falak_schema (Knowledge Graph Protocol)
        └── nodes, edges, policies, approvals, etc.
```

## 🔧 Common Tasks

### Seed Initial Data

```bash
# Flora-Fauna
cd flora-fauna/backend && python seeds.py

# Impact Service
cd services/impact-service && npx prisma db seed
```

### View Database

```bash
# Flora-Fauna shell
python -m flask shell

# Impact Service studio
npx prisma studio
```

### Run Tests

```bash
# Frontend
cd frontend-next && npm test

# Impact Service
cd services/impact-service && npm test

# Flora-Fauna
cd flora-fauna/backend && pytest
```

### Reset Database

```bash
# ⚠️ Deletes all data!

# Flora-Fauna
cd flora-fauna/backend && python -m flask db downgrade base

# Impact Service
cd services/impact-service && npx prisma migrate reset
```

## 🚀 Deployment

### Deploy to Vercel

```bash
# Frontend
vercel --prod

# Impact Service
vercel --prod --cwd services/impact-service

# Flora-Fauna Backend
vercel --prod --cwd flora-fauna/backend
```

### Environment Variables on Vercel

Set in project settings:
- `DATABASE_URL` (Supabase connection)
- `DIRECT_URL` (for Impact Service)
- `JWT_SECRET_KEY`
- `STRIPE_SECRET_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## 📚 Documentation

- **[DATABASE_SCHEMA_DEPLOYMENT.md](../DATABASE_SCHEMA_DEPLOYMENT.md)** - Complete schema architecture
- **[Impact Service DB Guide](./services/impact-service/DATABASE_MIGRATION_GUIDE.md)** - Prisma migrations
- **[Flora-Fauna DB Guide](./flora-fauna/backend/DATABASE_MIGRATION_GUIDE.md)** - SQLAlchemy/Flask-Migrate
- **[Setup Script](./scripts/setup-database.sh)** - Automated setup

## 🆘 Troubleshooting

### "Can't connect to database"
- Verify DATABASE_URL is correct
- Check Supabase/PostgreSQL is running
- Whitelist your IP in Supabase settings

### "Schemas not found"
- Run SQL migration scripts first
- Check all three schemas exist in database

### "Prisma models out of sync"
```bash
cd services/impact-service
npx prisma generate
npx prisma validate
```

### "Flask models not syncing"
```bash
cd flora-fauna/backend
python -m flask db migrate
python -m flask db upgrade
```

## 📞 Support

- Issues: https://github.com/bobduck123/Anu/issues
- Docs: Check README.md in each service folder
- Setup issues: See DATABASE_SCHEMA_DEPLOYMENT.md

---

**You're all set!** 🎉 The platform is now running with all three services connected to their respective database schemas.
