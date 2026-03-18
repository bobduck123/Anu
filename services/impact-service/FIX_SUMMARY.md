# Migration Deployment - Complete Solution

## What Was Fixed

1. **Health Service Bug** - Fixed SQL injection vulnerability and improved migration check logic in `falakHealthService.ts`
   - The readiness check now properly handles fresh databases where migrations haven't been applied yet
   - Replaced unsafe string interpolation with explicit schema checks
   - Better error handling for migration table queries

2. **New Deployment Scripts** - Created comprehensive deployment orchestration
   - `npm run falak:deploy:staging` - One-click staging deployment
   - `npm run falak:deploy:sandbox` - Complete local setup with Docker

3. **Documentation** - Created three guide documents
   - `DEPLOYMENT_QUICK_REF.md` - Quick reference for common tasks
   - `DEPLOYMENT_GUIDE.md` - Comprehensive deployment documentation
   - Updated `package.json` with new npm scripts

## How to Fix Your Current Issue

Your service is reporting `"migrations": "error"` because the migrations haven't been deployed to your database yet.

### Step 1: Navigate to the service directory
```bash
cd services/impact-service
```

### Step 2: Run the deployment script

For **Staging** (Vercel-hosted database):
```bash
npm run falak:deploy:staging
```

For **Local/Sandbox** (Docker):
```bash
npm run falak:deploy:sandbox
```

The script will automatically:
1. Generate Prisma client
2. Deploy all pending migrations
3. Seed the database with initial data
4. Verify everything is working

### Step 3: Verify readiness

After deployment completes, check the readiness endpoint:

**Staging:**
```bash
npm run falak:readiness:staging
# or curl https://anu-impact-service.vercel.app/v1/falak/readiness
```

**Local:**
```bash
npm run falak:sandbox:verify
# or curl http://localhost:3000/v1/falak/readiness
```

Expected successful response:
```json
{
  "status": "ready",
  "service": "impact-service",
  "protocol": "Falak Protocol",
  "checks": {
    "database": "ok",
    "postgis": "ok",
    "prisma": "ok",
    "falak_schema": "ok",
    "migrations": "ok"
  }
}
```

## File Structure

New/Updated Files:
- `/services/impact-service/DEPLOYMENT_QUICK_REF.md` - Quick reference (start here!)
- `/services/impact-service/DEPLOYMENT_GUIDE.md` - Full documentation
- `/services/impact-service/scripts/falak-staging/deploy.mjs` - Staging deployment script
- `/services/impact-service/scripts/falak-sandbox/deploy.mjs` - Local deployment script
- `/services/impact-service/package.json` - Added npm scripts for deployments
- `/services/impact-service/src/falak/health/falakHealthService.ts` - Fixed migration check logic

## Available npm Commands

```bash
# One-step deployments (new!)
npm run falak:deploy:staging        # Deploy everything to staging
npm run falak:deploy:sandbox        # Deploy everything locally

# Step-by-step commands (if you need to run individual steps)
npm run falak:migrate:staging       # Deploy migrations only
npm run falak:sandbox:migrate       # Deploy migrations locally
npm run falak:seed:staging          # Seed data only
npm run falak:sandbox:seed          # Seed data locally
npm run falak:readiness:staging     # Check staging readiness
npm run falak:sandbox:verify        # Check local readiness
```

## Troubleshooting

### If deployment fails:

1. **Database connection error:**
   - Verify `DATABASE_URL` is set in your environment
   - For local: ensure Docker is running (`npm run falak:sandbox:db:up`)
   - Check database logs: `npm run falak:sandbox:db:logs`

2. **Migration errors:**
   - Check migration files in `prisma/migrations/`
   - Review detailed error messages in script output
   - See `DATABASE_MIGRATION_GUIDE.md` for schema details

3. **PostGIS not found:**
   - For staging: ensure extension is installed on your database
   - For local: reinitialize Docker database: `npm run falak:sandbox:db:down && npm run falak:sandbox:db:up`

## What Happens During Deployment

The deployment script runs these steps in sequence:

1. **Prisma Generation** - Updates Prisma client based on schema
2. **Migration Deploy** - Applies all pending migrations to database
3. **Database Seeding** - Populates initial data (users, roles, etc.)
4. **Readiness Check** - Verifies all health checks pass

Each step includes safety checks and helpful error messages if something goes wrong.

## Next Steps

1. Run: `npm run falak:deploy:staging` (or sandbox if local)
2. Wait for completion (typically 30-60 seconds)
3. Verify: Check the response from readiness endpoint
4. Continue: You're now ready to develop or deploy further

---

**All files are in:** `/vercel/share/v0-project/services/impact-service/`

**Start with:** `DEPLOYMENT_QUICK_REF.md` for a quick overview or `DEPLOYMENT_GUIDE.md` for detailed instructions.
