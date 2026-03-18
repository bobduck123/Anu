# 🚀 Impact Service Deployment Quick Reference

## TL;DR - Run This Now

### For Your Staging Environment (Vercel-hosted)

```bash
cd services/impact-service
npm run falak:deploy:staging
```

### For Local Development (Docker)

```bash
cd services/impact-service
npm run falak:deploy:sandbox
```

---

## What Each Command Does

| Command | Purpose | When to Use |
|---------|---------|------------|
| `npm run falak:deploy:staging` | **One-click staging deployment** - runs all steps | After pushing changes to staging |
| `npm run falak:deploy:sandbox` | **Complete local setup** - starts DB + deploys everything | Initial local setup |
| `npm run falak:migrate:staging` | Deploy migrations to staging only | When you only want to apply migrations |
| `npm run falak:sandbox:migrate` | Deploy migrations locally | When you only want to apply migrations locally |
| `npm run falak:readiness:staging` | Check if staging is ready | Before running tests/smoke tests |
| `npm run falak:sandbox:verify` | Verify local setup is working | After initial setup |

---

## Your Current Issue: Migrations Error

**Status:** `"migrations": "error"`

**Root Cause:** Migrations haven't been deployed to your database yet

**Fix:** Run the deployment script

```bash
npm run falak:deploy:staging
```

This will:
1. ✅ Generate Prisma client
2. ✅ Apply all pending migrations
3. ✅ Seed initial data
4. ✅ Verify everything is working

**Then check readiness:**
```bash
npm run falak:readiness:staging
```

Expected response:
```json
{
  "status": "ready",
  "checks": {
    "database": "ok",
    "postgis": "ok",
    "prisma": "ok",
    "falak_schema": "ok",
    "migrations": "ok"
  }
}
```

---

## File Locations

- **Deployment Guide:** `/services/impact-service/DEPLOYMENT_GUIDE.md`
- **Staging Scripts:** `/services/impact-service/scripts/falak-staging/`
- **Local Scripts:** `/services/impact-service/scripts/falak-sandbox/`
- **Prisma Schema:** `/services/impact-service/prisma/schema.prisma`
- **Migrations:** `/services/impact-service/prisma/migrations/`

---

## Troubleshooting

### "Database connection refused"
```bash
# Check if local database is running
npm run falak:sandbox:db:ps

# Start it if not running
npm run falak:sandbox:db:up
```

### "Migration deploy failed"
```bash
# Check migration status
npm run falak:readiness:staging

# View error logs
npm run falak:sandbox:db:logs
```

### "Need to reset local database"
```bash
npm run falak:sandbox:db:down
npm run falak:sandbox:db:up
npm run falak:deploy:sandbox
```

---

## Health Check Endpoint

After deployment, verify your service is ready:

```bash
# Staging
curl https://anu-impact-service.vercel.app/v1/falak/readiness

# Local (if running)
curl http://localhost:3000/v1/falak/readiness
```

Expected healthy response:
```json
{
  "status": "ready",
  "service": "impact-service",
  "checks": {
    "database": "ok",
    "postgis": "ok",
    "prisma": "ok",
    "falak_schema": "ok",
    "migrations": "ok"
  }
}
```

---

## Next Steps

1. **Run deployment:** `npm run falak:deploy:staging`
2. **Check readiness:** `npm run falak:readiness:staging`
3. **Run tests:** `npm run falak:smoke:staging`
4. **Start development:** `npm run dev`

---

## Documentation

- **Full Guide:** See `DEPLOYMENT_GUIDE.md` for detailed steps
- **Migration Plan:** See `DATABASE_MIGRATION_GUIDE.md` for schema details
- **Falak Schema:** See `prisma-migration-reconciliation-plan.md` for architecture

---

## Need Help?

- Check deployment logs: `npm run falak:sandbox:db:logs`
- Verify environment: Check `.env` file has `DATABASE_URL`
- Review error output carefully - most errors are helpful!
- See `DEPLOYMENT_GUIDE.md` troubleshooting section
