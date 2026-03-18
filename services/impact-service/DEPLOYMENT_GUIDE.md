# Impact Service Deployment Guide

This guide explains how to deploy the Falak/Anu impact service migrations and get your service ready for production.

## Quick Start

### For Staging Environment

Run this command from the `services/impact-service` directory:

```bash
npm run falak:deploy:staging
```

This will execute the following steps in order:
1. Generate Prisma client
2. Deploy migrations to the database
3. Seed the database
4. Verify readiness

### For Local/Sandbox Environment

If you're running a local PostgreSQL database with Docker:

```bash
# First, ensure your database is running
npm run falak:sandbox:db:up

# Then deploy
npm run falak:sandbox:migrate
```

Or use the combined deployment command:

```bash
npm run falak:deploy:sandbox
```

## Detailed Deployment Steps

### Prerequisites

Ensure you have:
- Node.js 24.x installed
- Database connection configured via environment variables
- Appropriate permissions for schema creation and migrations
- `.env` file with required variables for your environment

### Step-by-Step Instructions

#### 1. Generate Prisma Client
```bash
npm run falak:prisma:generate:staging  # For staging
npm run falak:sandbox:prisma:generate  # For sandbox
```

This regenerates the Prisma client based on the current schema.

#### 2. Deploy Migrations
```bash
npm run falak:migrate:staging  # For staging
npm run falak:sandbox:migrate  # For sandbox
```

This runs all pending migrations against your database. It will:
- Create the `_prisma_migrations` table if it doesn't exist
- Apply any new migrations
- Record migration history

#### 3. Seed the Database (if needed)
```bash
npm run falak:seed:staging  # For staging
npm run falak:sandbox:seed  # For sandbox
```

This seeds initial data into the database (users, roles, etc.).

#### 4. Verify Readiness
```bash
npm run falak:readiness:staging  # For staging
npm run falak:sandbox:verify    # For sandbox
```

This checks that:
- ✅ Database is accessible
- ✅ PostGIS extension is installed
- ✅ Falak schema exists
- ✅ All migrations are applied
- ✅ No migration failures

## Environment-Specific Details

### Staging Environment

**Location:** Vercel-hosted PostgreSQL

**Process:**
1. Set `DEPLOYMENT_TARGET` to `staging` if using environment variable checks
2. Run `npm run falak:deploy:staging`
3. Monitor logs for any errors
4. Check readiness at `/v1/falak/readiness` endpoint

**Environment Variables:**
- `DATABASE_URL` - Connection string
- `DIRECT_URL` - Direct connection (for migrations)
- `NODE_ENV` - Should be `staging`

### Local/Sandbox Environment

**Location:** Docker-based local PostgreSQL

**Process:**
1. Ensure Docker is running
2. Start database: `npm run falak:sandbox:db:up`
3. Run migrations: `npm run falak:sandbox:migrate`
4. Verify: `npm run falak:sandbox:verify`

**Environment Variables:**
- `DATABASE_URL` - Usually `postgresql://user:password@localhost:5432/anu`
- `DIRECT_URL` - Same as above for local environments

## Troubleshooting

### Issue: "migrations: error" in readiness check

**Causes:**
1. Migrations table doesn't exist (fresh database)
2. Pending migrations not yet applied
3. Migration failures

**Solution:**
```bash
# Run the deployment sequence
npm run falak:migrate:staging  # or falak:sandbox:migrate
npm run falak:readiness:staging  # or falak:sandbox:verify
```

### Issue: "PostGIS extension missing"

**Solution:**
```bash
# For staging, contact DevOps to ensure PostGIS is installed
# For local, it should be included in docker-compose setup
npm run falak:sandbox:db:down && npm run falak:sandbox:db:up
```

### Issue: "falak schema not found"

**Solution:**
The Falak schema should be created during the first migration. If missing:

```bash
# Check what schemas exist
npm run falak:readiness:staging

# Re-run migrations
npm run falak:migrate:staging
```

### Issue: "Database connection refused"

**Solution:**
1. Verify `DATABASE_URL` is correctly set
2. Check database is running: `npm run falak:sandbox:db:ps`
3. Test connection manually with psql or similar tool
4. Ensure firewall/VPC rules allow connection

## What Each Script Does

| Script | Purpose |
|--------|---------|
| `prisma:generate` | Regenerate Prisma client from schema |
| `falak:migrate:*` | Deploy pending migrations |
| `falak:seed:*` | Initialize database with seed data |
| `falak:readiness:*` | Check if service is ready for traffic |
| `falak:verify:*` | Run verification tests |

## Common Workflows

### Initial Setup
```bash
npm run falak:sandbox:db:up
npm run falak:sandbox:migrate
npm run falak:sandbox:seed
npm run falak:sandbox:verify
```

### Daily Development
```bash
npm run dev  # Starts dev server, which auto-migrates on demand
```

### Pre-Production Check
```bash
npm run falak:migrate:staging
npm run falak:readiness:staging
npm run falak:smoke:staging
```

### Reset Local Database
```bash
npm run falak:sandbox:db:down
npm run falak:sandbox:db:up
npm run falak:sandbox:migrate
npm run falak:sandbox:seed
```

## Production Deployments

1. **Pre-deployment:**
   - Review all pending migrations
   - Test migrations on staging first
   - Have rollback plan ready

2. **During deployment:**
   ```bash
   npm run falak:migrate:staging
   npm run falak:readiness:staging
   ```

3. **Post-deployment:**
   - Monitor logs
   - Check readiness endpoint
   - Run smoke tests: `npm run falak:smoke:staging`

## Support

If you encounter issues:
1. Check logs: `npm run falak:sandbox:db:logs`
2. Verify environment variables: Check `.env` file
3. Review migration files: `prisma/migrations/`
4. Check the DATABASE_MIGRATION_GUIDE.md for schema details
