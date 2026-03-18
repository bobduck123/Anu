# Anu Platform - Database Schema Deployment Guide

This document outlines how the three database schemas are deployed and connected to their respective services.

## Overview

The Anu platform uses a **single Supabase PostgreSQL database** with three separate schemas to organize different domains:

```
Supabase Database (postgres)
├── public (schema)           → Flora-Fauna Core Models
├── falak (schema)            → Falak Protocol (Knowledge Graph)
└── Other public tables
```

## Schema Mapping

### 1. **001_core_schema** - Flora-Fauna Core Platform
**Location:** `public` schema in Supabase  
**Tables:** `node`, `user`, `venue`, `event`, `microcosm`, `article`, `action`, `ticket`, `todo`, `feedback`, `comment`, `notification`, `favorite`, `team`, `message`, etc.

**Connected Services:**
- **flora-fauna/backend** (Flask/SQLAlchemy)
  - Reads from and writes to all core tables
  - Uses `User`, `Event`, `Action`, `Microcosm`, `Article` models
  - Database URL: `DATABASE_URL=postgresql://...?schema=public`

**Purpose:**
- Multi-tenant foundation with node system
- User management and profiles
- Event and action management
- Community/microcosm structure
- Content (articles, comments, feedback)
- Ticket and RSVP system

---

### 2. **002_impact_schema** - Membership & Impact Service
**Location:** `public` schema in Supabase  
**Tables:** `MembershipPlans`, `Subscriptions`, `ImpactPools`, `ImpactLedgerEntries`, `ImpactCreditTransactions`, `AuditLogs`, `StripeEvents`, Flora-Fauna memetic system tables

**Connected Services:**
- **services/impact-service** (Node.js/Fastify + Prisma)
  - Reads from and writes to membership and impact tables
  - Uses Prisma models: `MembershipPlan`, `Subscription`, `ImpactPool`, `ImpactLedgerEntry`, etc.
  - Database URLs:
    - `DATABASE_URL=postgresql://...?schema=public`
    - `DIRECT_URL=postgresql://...?schema=public` (for migration/seed)

**Purpose:**
- Stripe payment processing and subscriptions
- Impact credit system and tracking
- Append-only audit logs and ledger entries
- Flora-Fauna memetic mutual-aid subsystem
  - Creator channels
  - Memes and lineage
  - Nutrient snapshots
  - Geological form snapshots

**Environment Variables:**
```bash
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...
JWT_SECRET_KEY=<shared with Flask backend>
```

---

### 3. **003_falak_schema** - Falak Protocol Knowledge Graph
**Location:** `falak` schema in Supabase  
**Tables:** `tenants`, `actors`, `actor_roles`, `nodes`, `edges`, `policies`, `approvals`, `contributions`, `allocation_proposals`, `events`, `ledger_entries`, `subscriptions`, `audit_logs`, `map_definitions`, `map_jobs`

**Connected Services:**
- **services/impact-service** (Node.js/Fastify + Prisma)
  - Reads from and writes to Falak protocol tables
  - Uses Prisma models: `FalakTenant`, `FalakActor`, `FalakNode`, `FalakEdge`, `FalakPolicy`, etc.
  - Database URL: `DATABASE_URL=postgresql://...?schema=public,falak` (multiSchema enabled)

**Purpose:**
- Multi-tenant protocol for knowledge graphs
- Governance and policy management
- Approval workflows
- Financial contributions and allocations
- Immutable append-only ledger
- Event sourcing system
- Spatial mapping (PostGIS support)

**Special Features:**
- PostGIS integration for geographic data
- Domain events (event sourcing)
- Approval voting system
- Webhook subscriptions
- Derived views (materialized queries)

---

## Environment Variable Configuration

### Frontend (frontend-next)
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_API_BASE_URL=http://localhost:5000
NEXT_PUBLIC_IMPACT_SERVICE_URL=http://localhost:5003
```

### Flora-Fauna Backend (flora-fauna/backend)
```bash
# Connects to: 001_core_schema (public)
DATABASE_URL=postgresql://postgres:password@host:5432/postgres
# For development, SQLite can be used
# DATABASE_URL=sqlite:///site.db

# JWT (shared with impact-service)
JWT_SECRET_KEY=your_jwt_secret_key_min_32_chars

# Stripe integration
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### Impact Service (services/impact-service)
```bash
# Connects to: 002_impact_schema & 003_falak_schema (both public & falak)
DATABASE_URL=postgresql://postgres:password@host:5432/postgres
DIRECT_URL=postgresql://postgres:password@host:5432/postgres

# JWT (shared with Flora-Fauna backend)
JWT_SECRET_KEY=your_jwt_secret_key_min_32_chars

# Stripe integration
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Falak protocol
FALAK_ENABLED=true
FALAK_DEFAULT_TENANT_SLUG=anu
```

---

## Database Connections Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                     Supabase PostgreSQL                          │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              public schema                               │   │
│  │  ┌────────────────────┐  ┌──────────────────────────┐   │   │
│  │  │ 001_core_schema    │  │ 002_impact_schema        │   │   │
│  │  │ (Flora-Fauna)      │  │ (Memberships & Impact)   │   │   │
│  │  │                    │  │                          │   │   │
│  │  │ - node (tenant)    │  │ - MembershipPlans        │   │   │
│  │  │ - user             │  │ - Subscriptions          │   │   │
│  │  │ - event            │  │ - ImpactPools            │   │   │
│  │  │ - action           │  │ - ImpactLedger...        │   │   │
│  │  │ - microcosm         │  │ - creator_channels      │   │   │
│  │  │ - article          │  │ - memes                  │   │   │
│  │  │ - etc.             │  │ - etc.                   │   │   │
│  │  └────────────────────┘  └──────────────────────────┘   │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              falak schema                                │   │
│  │         (003_falak_schema)                               │   │
│  │      Falak Protocol Knowledge Graph                      │   │
│  │                                                          │   │
│  │  - tenants           - policies                          │   │
│  │  - actors            - approvals                         │   │
│  │  - nodes (KG)        - contributions                     │   │
│  │  - edges (KG)        - allocation_proposals              │   │
│  │  - etc.              - events, ledger_entries            │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
           ↓                    ↓                    ↓
    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
    │ flora-fauna  │    │   impact-    │    │  frontend-   │
    │   backend    │    │   service    │    │    next      │
    │  (Flask)     │    │ (Node.js)    │    │  (Next.js)   │
    └──────────────┘    └──────────────┘    └──────────────┘
```

---

## Deployment Checklist

### 1. Create Supabase Database
- [ ] Create PostgreSQL database on Supabase
- [ ] Note the connection string

### 2. Run Migrations
```bash
# Apply all three schemas
npx prisma migrate deploy  # For impact-service
# or use the provided SQL scripts directly
```

### 3. Configure Environment Variables

**For each deployment target, set:**

#### Frontend (Vercel)
```bash
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_API_BASE_URL
NEXT_PUBLIC_IMPACT_SERVICE_URL
```

#### Flora-Fauna Backend
```bash
DATABASE_URL              # PostgreSQL connection
JWT_SECRET_KEY           # Shared with impact-service
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
SECRET_KEY
```

#### Impact Service (Vercel)
```bash
DATABASE_URL             # PostgreSQL connection
DIRECT_URL              # For migrations
JWT_SECRET_KEY          # Shared with flora-fauna
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
FALAK_ENABLED
FALAK_DEFAULT_TENANT_SLUG
```

### 4. Initialize Services

```bash
# Flora-Fauna (Flask)
cd flora-fauna/backend
python -m flask db upgrade

# Impact Service (Node.js)
cd services/impact-service
npm run db:migrate
npm run db:seed
```

### 5. Verify Connections
```bash
# Test each service endpoint
curl http://localhost:5000/health    # Flora-Fauna
curl http://localhost:5003/health    # Impact Service
curl http://localhost:3000           # Frontend
```

---

## Key Connection Details

| Service | Schema | Port | Database Driver |
|---------|--------|------|-----------------|
| flora-fauna/backend | `public` | 5000 | SQLAlchemy (Flask) |
| impact-service | `public`, `falak` | 5003 | Prisma (Node.js) |
| frontend-next | Supabase Auth | 3000 | Supabase SDK |

---

## Security Notes

1. **Separate JWT Secrets:** While services share a JWT secret for token validation, each service can have its own encryption keys
2. **Row-Level Security (RLS):** Enable RLS on Supabase tables for multi-tenant isolation
3. **Database Users:** Consider separate read-only and read-write database users per service
4. **Connection Pooling:** Use PgBouncer or Supabase's built-in connection pooling for production
5. **Stripe Webhooks:** Configure Stripe to post events to `/api/stripe/webhooks` on both services
