# Service-to-Schema Connection Map

This document provides a quick visual reference for how each service connects to the database schemas.

## Connection Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        SUPABASE PostgreSQL                              │
│                                                                         │
│  ┌──────────────────────┐          ┌────────────────────────────────┐  │
│  │ public schema        │          │ falak schema                   │  │
│  │                      │          │                                │  │
│  │ 001_core_schema      │          │ 003_falak_schema               │  │
│  │ (Flora-Fauna Core)   │          │ (Knowledge Graph Protocol)     │  │
│  │                      │          │                                │  │
│  │ + node               │          │ + tenants                      │  │
│  │ + user               │          │ + actors                       │  │
│  │ + venue              │          │ + nodes (KG)                   │  │
│  │ + event              │          │ + edges                        │  │
│  │ + microcosm          │          │ + policies                     │  │
│  │ + article            │          │ + approvals                    │  │
│  │ + action             │          │ + contributions                │  │
│  │ + etc.               │          │ + allocation_proposals         │  │
│  │                      │          │ + etc.                         │  │
│  │ 002_impact_schema    │          │                                │  │
│  │ (in public)          │          │                                │  │
│  │                      │          │                                │  │
│  │ + MembershipPlans    │          │                                │  │
│  │ + Subscriptions      │          │                                │  │
│  │ + ImpactPools        │          │                                │  │
│  │ + creator_channels   │          │                                │  │
│  │ + memes              │          │                                │  │
│  │ + etc.               │          │                                │  │
│  └──────────────────────┘          └────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
        ↓                                    ↓
   ┌─────────────────┐            ┌──────────────────┐
   │ flora-fauna     │            │ services/impact  │
   │ /backend        │            │ -service         │
   │ (Flask)         │            │ (Node.js/Prisma) │
   │ Port: 5000      │            │ Port: 5003       │
   └─────────────────┘            └──────────────────┘
        ↓                                    ↓
   ┌─────────────────────────────────────────────────┐
   │         frontend-next (Next.js)                  │
   │         Port: 3000                               │
   │         (Uses Supabase Auth)                      │
   └─────────────────────────────────────────────────┘
```

## Service Connection Details

### Flora-Fauna Backend (Flask)

| Property | Value |
|----------|-------|
| **Framework** | Flask (Python) |
| **Port** | 5000 |
| **ORM** | SQLAlchemy |
| **Migrations** | Flask-Migrate / Alembic |
| **Connected Schemas** | `public` only |
| **Prisma Models** | No (SQLAlchemy models) |
| **Database Driver** | psycopg2 (PostgreSQL) or sqlite3 |
| **Connection Pooling** | SQLAlchemy pool |

**Connected Tables:**
```
public schema:
  - node (tenants)
  - user
  - venue
  - event
  - microcosm
  - microcosm_user
  - article
  - action
  - action_proof
  - action_impact_metric
  - ticket
  - todo
  - feedback
  - comment
  - notification
  - favorite
  - team
  - message
  - partner_key
  - identity_link
  - audit_log
  - user_consent
```

**Environment:**
```bash
DATABASE_URL=postgresql://...
DB_POOL_SIZE=10
DB_MAX_OVERFLOW=20
DB_POOL_TIMEOUT=30
DB_POOL_RECYCLE=1800
```

---

### Impact Service (Node.js + Prisma)

| Property | Value |
|----------|-------|
| **Framework** | Fastify (Node.js) |
| **Port** | 5003 |
| **ORM** | Prisma |
| **Migrations** | Prisma Migrate |
| **Connected Schemas** | `public` + `falak` |
| **Prisma Models** | Yes (auto-generated) |
| **Database Driver** | pg (PostgreSQL) |
| **Connection Pooling** | Prisma's internal pooling |

**Connected Tables (public schema):**
```
002_impact_schema:
  - MembershipPlans
  - Subscriptions
  - ImpactPools
  - ImpactLedgerEntries
  - ImpactCreditTransactions
  - AuditLogs
  - StripeEvents
  - creator_channels (Flora-Fauna)
  - memes (Flora-Fauna)
  - meme_lineage_edges (Flora-Fauna)
  - nutrient_snapshots (Flora-Fauna)
  - geological_form_snapshots (Flora-Fauna)
```

**Connected Tables (falak schema):**
```
003_falak_schema:
  - tenants
  - actors
  - actor_roles
  - nodes (knowledge graph)
  - edges (relationships)
  - policies
  - approvals
  - approval_votes
  - contributions
  - allocation_proposals
  - events
  - ledger_entries
  - subscriptions
  - derived_views
  - audit_logs
  - map_definitions
  - map_jobs
```

**Environment:**
```bash
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...
JWT_SECRET_KEY=...
STRIPE_SECRET_KEY=...
STRIPE_WEBHOOK_SECRET=...
FALAK_ENABLED=true
FALAK_DEFAULT_TENANT_SLUG=anu
```

**Prisma Configuration:**
```prisma
datasource db {
  provider = "postgresql"
  url = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
  schemas = ["public", "falak"]
}

generator client {
  provider = "prisma-client-js"
  previewFeatures = ["multiSchema"]
}
```

---

### Frontend (Next.js)

| Property | Value |
|----------|-------|
| **Framework** | Next.js (React) |
| **Port** | 3000 |
| **Database Access** | Supabase SDK |
| **Auth** | Supabase Auth |
| **Connected Schemas** | via Supabase RLS |
| **ORM** | None (direct SQL via Supabase) |
| **Database Driver** | @supabase/supabase-js |

**Connection Method:**
```typescript
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

const supabase = createClientComponentClient()

// Queries public schema (RLS enforced)
const { data } = await supabase
  .from('user')
  .select('*')
```

**Environment:**
```bash
NEXT_PUBLIC_SUPABASE_URL=https://...supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
NEXT_PUBLIC_API_BASE_URL=http://localhost:5000
NEXT_PUBLIC_IMPACT_SERVICE_URL=http://localhost:5003
```

---

## Schema Details

### 001_core_schema (public)
- **Purpose:** Flora-Fauna core platform tables
- **Owner:** flask-based flora-fauna backend
- **Access Pattern:** SQLAlchemy models with relationships
- **Key Entities:** Users, Nodes (tenants), Events, Actions, Communities

### 002_impact_schema (public)
- **Purpose:** Membership, subscriptions, impact tracking
- **Owner:** Node.js impact-service (Prisma)
- **Access Pattern:** Prisma client queries
- **Key Entities:** MembershipPlans, Subscriptions, ImpactPools, CreatorChannels
- **Ledger Pattern:** Append-only immutable entries

### 003_falak_schema (falak)
- **Purpose:** Falak knowledge graph protocol
- **Owner:** Node.js impact-service (Prisma)
- **Access Pattern:** Prisma client with multi-schema support
- **Key Entities:** Knowledge graph nodes/edges, governance, allocations
- **Spatial Support:** PostGIS geometry type for mapping

---

## Data Flow Between Services

```
User Action (Frontend)
         ↓
┌─────────────────────┐
│  frontend-next      │
│  (Next.js)          │
│  Port 3000          │
└─────────────────────┘
         ↓
    Makes API calls
         ↓
    ┌────────────────────────────────────┐
    │  Calls flora-fauna backend         │
    │  OR impact-service                 │
    │  depending on action               │
    └────────────────────────────────────┘
         ↓
    ┌────────────────┐      ┌──────────────────┐
    │ flora-fauna    │      │  impact-service  │
    │ backend:5000   │      │  :5003           │
    │ (Flask)        │      │  (Node.js)       │
    └────────────────┘      └──────────────────┘
         ↓                         ↓
    ┌────────────────────────────────────┐
    │  Supabase PostgreSQL               │
    │                                    │
    │  public schema (001 + 002)         │
    │  falak schema (003)                │
    └────────────────────────────────────┘
         ↓
    ┌────────────────────────────────────┐
    │  Store/retrieve data               │
    │  Update ledgers (append-only)      │
    │  Trigger webhooks                  │
    │  Execute policies                  │
    └────────────────────────────────────┘
```

---

## Connection Strings Format

### PostgreSQL (Supabase)
```
postgresql://[user]:[password]@[host]:[port]/[database]

Example:
postgresql://postgres:abc123@db.uhhwfwftfxyzabcd.supabase.co:5432/postgres

With schema specification:
postgresql://postgres:abc123@db.uhhwfwftfxyzabcd.supabase.co:5432/postgres?schema=public
```

### SQLite (Development)
```
sqlite:///site.db
sqlite:////absolute/path/to/site.db
```

---

## Connection Health Checks

### Test Flora-Fauna Connection
```bash
python -m flask shell
>>> db.session.execute('SELECT 1')
>>> print("✓ Connected")
```

### Test Impact Service Connection
```bash
cd services/impact-service
npx prisma validate
npx prisma db execute --stdin < /dev/null
```

### Test Frontend Connection
```bash
# In browser console
import { createClient } from '@supabase/supabase-js'
const client = createClient(url, key)
await client.from('user').select().limit(1)
```

---

## Migration Command Reference

| Service | Create Schema | Run Migrations | Seed Data | Reset |
|---------|---|---|---|---|
| **Flora-Fauna** | `flask db init` | `flask db upgrade` | `python seeds.py` | `flask db downgrade base` |
| **Impact Service** | `prisma init` | `prisma migrate deploy` | `prisma db seed` | `prisma migrate reset` |

---

## Key Points to Remember

✅ **All three schemas** are in the **same Supabase database**  
✅ **Flask backend** accesses only the **public schema** (001 + 002)  
✅ **Node.js service** accesses both **public and falak schemas**  
✅ **Frontend** uses **Supabase Auth SDK** for queries  
✅ **Each service has independent migrations** (Flask-Migrate vs Prisma)  
✅ **JT tokens are shared** between Flask and Node.js for validation  
✅ **Environment variables control** which schema/database each service uses
