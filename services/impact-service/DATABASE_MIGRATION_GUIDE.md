# Impact Service - Database Migration Guide

This guide explains how to set up and migrate the database for the Impact Service, which uses both the `public` and `falak` schemas from Supabase.

## Overview

The Impact Service uses **Prisma** with PostgreSQL and connects to:
- **`public` schema** (002_impact_schema): Membership plans, subscriptions, impact pools, ledgers, Stripe events
- **`falak` schema** (003_falak_schema): Falak protocol for knowledge graphs, governance, and allocations

**Prisma Configuration:**
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
  schemas  = ["public", "falak"]
}

generator client {
  provider = "prisma-client-js"
  previewFeatures = ["multiSchema"]
}
```

## Prerequisites

1. **Node.js** (v18+)
2. **Supabase Account** with PostgreSQL database provisioned
3. **PostgreSQL Tools** (optional, for direct SQL access)
4. **npm** or **pnpm** package manager

## Setup Steps

### 1. Configure Environment Variables

Create `.env` file in `services/impact-service/`:

```bash
# Database connections (from Supabase)
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@YOUR_HOST:5432/postgres?schema=public"
DIRECT_URL="postgresql://postgres:YOUR_PASSWORD@YOUR_HOST:5432/postgres?schema=public"

# Service configuration
NODE_ENV=development
PORT=5003

# Secrets (must match Flora-Fauna backend)
JWT_SECRET_KEY="your_jwt_secret_key_min_32_chars"

# Stripe integration
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# Other settings
LOG_LEVEL=info
DISABLE_SCHEDULED_JOBS=true
FALAK_ENABLED=true
FALAK_DEFAULT_TENANT_SLUG=anu
```

### 2. Install Dependencies

```bash
cd services/impact-service
npm install
```

### 3. Verify Database Schemas Exist

The three schemas should already be created by running the SQL migration scripts:
- `001_core_schema.sql` (Flora-Fauna core)
- `002_impact_schema.sql` (Impact service - this service)
- `003_falak_schema.sql` (Falak protocol)

To verify in Supabase SQL editor:

```sql
-- Check if schemas exist
SELECT schema_name FROM information_schema.schemata 
WHERE schema_name IN ('public', 'falak');

-- Check tables in public schema (impact tables)
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name ILIKE '%membership%' OR table_name ILIKE '%impact%' OR table_name ILIKE '%stripe%';

-- Check tables in falak schema
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'falak';
```

### 4. Generate Prisma Client

This reads your database schema and generates the Prisma client:

```bash
npx prisma generate
```

You should see output like:
```
✔ Generated Prisma Client (v5.x.x) to ./node_modules/.prisma/client in XXms
```

### 5. Validate Prisma Schema

Validate that Prisma schema matches your database:

```bash
npx prisma validate
```

This should succeed with no errors if all tables exist.

### 6. Create Initial Seed Data (Optional)

Create seed file at `services/impact-service/prisma/seed.ts`:

```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Create default membership plans
  const seedPlan = await prisma.membershipPlan.upsert({
    where: { name: 'Seed' },
    update: {},
    create: {
      name: 'Seed',
      stripePriceId: 'price_seed_dev',
      stripeProductId: 'prod_seed_dev',
      amountCents: 500, // $5/month
      intervalMonths: 1,
      creditGrantMonthly: 100,
      poolAllocationPct: 0.2, // 20%
      isActive: true,
    },
  });

  console.log('✓ Seeded membership plan:', seedPlan.name);

  // Create default Falak tenant
  const tenant = await prisma.falakTenant.upsert({
    where: { slug: 'anu' },
    update: {},
    create: {
      slug: 'anu',
      name: 'Anu',
      status: 'active',
      settings: {},
    },
  });

  console.log('✓ Seeded Falak tenant:', tenant.name);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

Then run seed:

```bash
npx prisma db seed
```

## Ongoing Operations

### View Database Status

```bash
# Check Prisma schema sync status
npx prisma validate

# Inspect database schema through Prisma
npx prisma introspect
```

### Update Prisma Schema

If you manually add tables to the database via SQL:

```bash
# Re-generate Prisma models from database
npx prisma introspect

# Review generated changes
npx prisma generate
```

### Access Database Directly (Optional)

Use Prisma Studio to browse data:

```bash
npx prisma studio
```

This opens a web UI at `http://localhost:5555` where you can view and edit records.

### Reset Database (Development Only)

**WARNING: This deletes all data!**

```bash
npx prisma migrate reset
```

## Deployment to Vercel

### 1. Set Environment Variables in Vercel

Go to your Vercel project settings and add:

```
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...
NODE_ENV=production
JWT_SECRET_KEY=...
STRIPE_SECRET_KEY=...
STRIPE_WEBHOOK_SECRET=...
```

### 2. Update Vercel Build Settings

In `vercel.json`:

```json
{
  "buildCommand": "npm run build && npx prisma generate",
  "env": {
    "PRISMA_SKIP_VALIDATION_WARNING": "true"
  }
}
```

### 3. Deploy

```bash
vercel deploy --prod
```

## Troubleshooting

### Error: "Can't reach database server"

**Cause:** Connection string invalid or database unreachable

**Fix:**
1. Verify `DATABASE_URL` format is correct
2. Check Supabase dashboard for connection details
3. Ensure IP is whitelisted (Supabase → Database → Networking)

### Error: "Schema not found"

**Cause:** SQL migrations haven't been run yet

**Fix:**
1. Run the three SQL scripts from `/scripts/` directory
2. Verify in Supabase SQL editor that tables exist

### Error: "Relations between models don't exist"

**Cause:** Foreign key constraints missing from database

**Fix:**
1. Ensure SQL migrations created all tables with proper foreign keys
2. Run: `npx prisma introspect` to regenerate schema
3. Check Prisma schema for @@schema directives

### Prisma Client Out of Date

**Cause:** Prisma generator not run after schema changes

**Fix:**
```bash
npx prisma generate
npm install @prisma/client@latest
```

## Multi-Schema Management

### Querying Different Schemas

```typescript
// Automatic - Prisma handles schema routing
// This queries public schema
const plans = await prisma.membershipPlan.findMany();

// This queries falak schema
const tenants = await prisma.falakTenant.findMany();
```

### Schema Switching

The `datasource` configuration in `prisma/schema.prisma` defines both schemas:

```prisma
datasource db {
  schemas  = ["public", "falak"]
}
```

Each model has `@@schema("public")` or `@@schema("falak")` to specify which schema it belongs to.

## References

- [Prisma Documentation](https://www.prisma.io/docs/)
- [Prisma Multi-Schema Support](https://www.prisma.io/docs/concepts/components/prisma-schema/multi-file-schema)
- [Supabase PostgreSQL](https://supabase.com/docs/guides/database)
- [Connection Pooling with Prisma](https://www.prisma.io/docs/guides/performance-and-optimization/connection-management)
