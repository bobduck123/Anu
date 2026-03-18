# Vercel Deployment Guide for Impact Service

## Quick Summary

Your migrations will **automatically run when you deploy to Vercel** because I've updated your build script. No manual steps needed after deployment!

## How It Works

### Automatic Deployment (Recommended)

1. **Commit and push your changes:**
   ```bash
   git add .
   git commit -m "Fix: Deploy Falak migrations on build"
   git push origin your-branch
   ```

2. **Vercel automatically detects the push and:**
   - Runs `npm run build` 
   - Which now executes: `node scripts/falak-staging/deploy.mjs`
   - Deploys all migrations, seeds data, and verifies setup
   - Builds your service and deploys it

3. **Check your deployment:**
   - Go to https://vercel.com/dashboard
   - Find your project (Anu)
   - Check the deployment status
   - Once green ✓, your migrations are live

4. **Verify it worked:**
   ```bash
   curl https://anu-impact-service.vercel.app/v1/falak/readiness
   ```
   You should see `"status": "ready"` and `"migrations": "ok"`

---

## Alternative: Manual Migration API

If you need to run migrations **after deployment** (e.g., to add a new migration):

### 1. Set Up the Secret Token

In your Vercel project settings:

**Dashboard → Project Settings → Environment Variables**

Add:
```
MIGRATION_TOKEN = your-secret-token-here
```

Example: `MIGRATION_TOKEN=super-secret-key-xyz123`

### 2. Call the Migration Endpoint

Once deployed, trigger migrations manually:

```bash
curl -X POST https://anu-impact-service.vercel.app/api/migrations \
  -H "Content-Type: application/json" \
  -d '{
    "action": "deploy",
    "token": "super-secret-key-xyz123"
  }'
```

### 3. Response

Success:
```json
{
  "success": true,
  "action": "deploy",
  "message": "Migration deploy completed successfully",
  "timestamp": "2026-03-19T10:30:00.000Z"
}
```

### Available Actions

| Action | Purpose |
|--------|---------|
| `deploy` | Runs all pending migrations |
| `seed` | Seeds initial data into database |
| `status` | Checks readiness and migration status |

---

## What Changed

### 1. Updated Build Script

**File:** `services/impact-service/package.json`

```diff
- "build": "npx prisma migrate deploy && prisma generate && tsc"
+ "build": "node scripts/falak-staging/deploy.mjs && prisma generate && tsc"
```

Now your build automatically runs the full Falak deployment script which:
- ✓ Generates Prisma client
- ✓ Deploys all migrations
- ✓ Seeds database
- ✓ Verifies everything works

### 2. New Migration API Endpoint

**File:** `services/impact-service/api/migrations.ts`

Protected API endpoint to trigger migrations on-demand. Requires `MIGRATION_TOKEN` for security.

---

## Troubleshooting

### Deployment Failed - Migration Error?

Check the deployment logs in Vercel:

1. Go to **Vercel Dashboard → Deployments**
2. Click on the failed deployment
3. Scroll to **Build Logs**
4. Look for error messages in the migration section

Common issues:
- **Database connection** - Check `DATABASE_URL` env var
- **Pending migrations** - Check `_prisma_migrations` table
- **PostGIS not enabled** - Verify database has PostGIS extension

### Need to Rollback?

If migrations fail, you can:

1. **Revert the commit:**
   ```bash
   git revert HEAD
   git push
   ```
   Vercel will auto-deploy the previous version

2. **Or manually fix and redeploy:**
   - Fix the migration issue locally
   - Push the fix
   - Vercel redeploys automatically

### Check Current Status

```bash
curl https://anu-impact-service.vercel.app/v1/falak/readiness
```

Look for:
- `"status": "ready"` ✓
- `"migrations": "ok"` ✓
- `"database": "ok"` ✓
- `"falak_schema": "ok"` ✓

---

## Next Steps

1. **Commit and push to your branch:**
   ```bash
   git add services/impact-service/package.json services/impact-service/api/migrations.ts
   git commit -m "feat: Auto-run Falak migrations on Vercel deploy"
   git push origin falak-readiness-error
   ```

2. **Go to Vercel and verify deployment:**
   - https://vercel.com/dashboard
   - Watch for the build to complete

3. **Test the readiness endpoint:**
   ```bash
   curl https://anu-impact-service.vercel.app/v1/falak/readiness
   ```

4. **Expected result:**
   ```json
   {
     "status": "ready",
     "migrations": "ok"
   }
   ```

---

## How Vercel Deployment Works

```
You push code to GitHub
        ↓
GitHub notifies Vercel
        ↓
Vercel clones your repo
        ↓
Vercel runs: npm install
        ↓
Vercel runs: npm run build (YOUR CUSTOM BUILD SCRIPT)
        ↓
  ┌─ node scripts/falak-staging/deploy.mjs
  ├─ prisma generate
  └─ tsc (TypeScript compile)
        ↓
Vercel packages your application
        ↓
Vercel deploys to edge nodes
        ↓
Your service is live! ✓
```

The deployment script runs **during the build step**, so all migrations are complete before your service goes live.

---

## Environment Variables on Vercel

Make sure these are set in your Vercel project:

| Variable | Purpose | Required |
|----------|---------|----------|
| `DATABASE_URL` | PostgreSQL connection string | ✓ Yes |
| `NODE_ENV` | Set to `production` | ✓ Yes |
| `MIGRATION_TOKEN` | Secret for manual migration API | Optional |

**To set them:**
1. Dashboard → Project Settings → Environment Variables
2. Add each variable
3. Redeploy for changes to take effect

---

## FAQ

**Q: Will migrations run every time I deploy?**
A: Yes, but safely. Prisma only applies new migrations that haven't been applied yet.

**Q: Can I run migrations without redeploying?**
A: Yes, use the manual API endpoint (see "Alternative: Manual Migration API" above).

**Q: What if a migration fails?**
A: The deployment will fail. Check logs and fix the migration issue, then redeploy.

**Q: How do I know if migrations are working?**
A: Call the readiness endpoint: `curl https://anu-impact-service.vercel.app/v1/falak/readiness`

---

## Support

For issues:
1. Check Vercel deployment logs
2. Check database connection
3. Verify environment variables are set
4. See "Troubleshooting" section above
5. Contact Vercel support at vercel.com/help
