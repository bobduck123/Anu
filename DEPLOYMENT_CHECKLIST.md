# Anu Platform - Deployment Checklist

## Critical Issue: Login Not Working

**Status:** ⚠️ Admin login failing at https://maanara.vercel.app/auth

**Root Cause:** Missing Supabase environment variables in Vercel frontend project

**Solution:** Verify and configure the correct Supabase project

---

## Project Mapping (TO VERIFY)

### Vercel Projects

- [ ] **anu_frontend** (Next.js) - URL: https://anu-frontend-url
- [ ] **anu_backend** (Flask) - URL: https://anu-backend-url  
- [ ] **anu_impact_service** (Node.js) - URL: https://anu-impact-service-url

NOT:
- [ ] ~~anu_first_test~~ (DO NOT USE)

### Supabase Projects

We have TWO Supabase projects:

1. **✓ CORRECT: supabase-orange-ball** (ID: `olgtqkgqjmxtivmlqsfb`)
   - Has all 3 schemas: public, falak
   - Has admin user: admin@anu.eco
   - Should be used for: anu_frontend, anu_backend, anu_impact_service

2. **? UNKNOWN: supabase-coquelicot-canvas** (ID: `mgzkpuzlmvshsivixqxe`)
   - Status: unknown
   - Do not use (need to verify it's not already in use)

---

## Configuration Checklist

### Step 1: Verify Current Vercel Setup

Run this command to see all Vercel projects:
```bash
vercel projects ls
```

Then check which projects exist:
- [ ] anu_frontend exists
- [ ] anu_backend exists
- [ ] anu_impact_service exists
- [ ] anu_first_test does NOT exist (or is archived)

### Step 2: Check Supabase Environment Variables

For **anu_frontend**:
```bash
vercel env ls --project=anu_frontend
```

Should show:
- [ ] NEXT_PUBLIC_SUPABASE_URL
- [ ] NEXT_PUBLIC_SUPABASE_ANON_KEY
- [ ] NEXT_PUBLIC_API_BASE_URL
- [ ] NEXT_PUBLIC_IMPACT_SERVICE_URL

If missing, add them:
```bash
vercel env add NEXT_PUBLIC_SUPABASE_URL --project=anu_frontend
# Value: https://olgtqkgqjmxtivmlqsfb.supabase.co

vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY --project=anu_frontend
# Value: [get from Supabase dashboard]
```

### Step 3: Get Supabase Credentials

From https://supabase.com/dashboard/project/olgtqkgqjmxtivmlqsfb

**Settings → API:**
- [ ] Copy ANON_KEY → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] Copy PROJECT_URL → `NEXT_PUBLIC_SUPABASE_URL`
- [ ] Copy SERVICE_ROLE_SECRET → for backend services

**Connection Info → Connection Pooler:**
- [ ] Database host: db.olgtqkgqjmxtivmlqsfb.supabase.co
- [ ] Database port: 5432
- [ ] Database name: postgres
- [ ] Get password from: Settings → Database

### Step 4: Configure Each Service

#### anu_frontend (Next.js)

```bash
vercel env add NEXT_PUBLIC_SUPABASE_URL \
  --project=anu_frontend \
  --value=https://olgtqkgqjmxtivmlqsfb.supabase.co

vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY \
  --project=anu_frontend \
  --value=[ANON_KEY_FROM_SUPABASE]

vercel env add NEXT_PUBLIC_API_BASE_URL \
  --project=anu_frontend \
  --value=https://[anu-backend-url]

vercel env add NEXT_PUBLIC_IMPACT_SERVICE_URL \
  --project=anu_frontend \
  --value=https://[anu-impact-service-url]
```

- [ ] All environment variables set
- [ ] Redeploy: `vercel --prod`
- [ ] Test: https://anu-frontend-url/auth

#### anu_backend (Flask)

```bash
vercel env add DATABASE_URL \
  --project=anu_backend \
  --value=postgresql://postgres:[PASSWORD]@db.olgtqkgqjmxtivmlqsfb.supabase.co:5432/postgres

vercel env add JWT_SECRET_KEY \
  --project=anu_backend \
  --value=[generate-32-char-secret]

vercel env add SECRET_KEY \
  --project=anu_backend \
  --value=[generate-32-char-secret]
```

- [ ] Database connection string set
- [ ] JWT secrets configured
- [ ] Redeploy: `vercel --prod`
- [ ] Test: `curl https://[anu-backend-url]/health`

#### anu_impact_service (Node.js)

```bash
vercel env add DATABASE_URL \
  --project=anu_impact_service \
  --value=postgresql://postgres:[PASSWORD]@db.olgtqkgqjmxtivmlqsfb.supabase.co:5432/postgres?schema=public

vercel env add DIRECT_URL \
  --project=anu_impact_service \
  --value=postgresql://postgres:[PASSWORD]@db.olgtqkgqjmxtivmlqsfb.supabase.co:5432/postgres

vercel env add JWT_SECRET_KEY \
  --project=anu_impact_service \
  --value=[same-as-backend]
```

- [ ] Database connection string set
- [ ] JWT secret matches backend
- [ ] Redeploy: `vercel --prod`
- [ ] Test: `curl https://[anu-impact-service-url]/health`

### Step 5: Verify Database Schemas

Connect to Supabase and verify:

```sql
-- Check schemas exist
SELECT schema_name FROM information_schema.schemata 
WHERE schema_name IN ('public', 'falak')
ORDER BY schema_name;
-- Should return: falak, public

-- Check admin user exists
SELECT id, email, raw_user_meta_data 
FROM auth.users 
WHERE email = 'admin@anu.eco';
-- Should return one row with is_admin: true
```

- [ ] public schema exists
- [ ] falak schema exists
- [ ] admin@anu.eco user exists

### Step 6: Test Admin Login

1. Open: https://anu-frontend-url/auth
2. Enter:
   - Email: admin@anu.eco
   - Password: AnuAdmin2024!
3. Click "Login"
4. Expected: Redirect to /profile or dashboard

- [ ] Login successful
- [ ] User dashboard loads
- [ ] Admin role visible
- [ ] Change admin password ⚠️ IMPORTANT

### Step 7: Post-Deployment

- [ ] Change admin password to something secure
- [ ] Update documentation with production URLs
- [ ] Set up monitoring/alerts
- [ ] Configure backup schedule
- [ ] Enable SSL/HTTPS certificates
- [ ] Set up CI/CD for automatic deployments

---

## Database Connection Details

### supabase-orange-ball (ACTIVE)

| Property | Value |
|----------|-------|
| Project ID | olgtqkgqjmxtivmlqsfb |
| Region | us-east-1 |
| Host | db.olgtqkgqjmxtivmlqsfb.supabase.co |
| Port | 5432 |
| Database | postgres |
| API URL | https://olgtqkgqjmxtivmlqsfb.supabase.co |

**Schemas:**
- ✓ public (001_core_schema + 002_impact_schema)
- ✓ falak (003_falak_schema)

**Admin User:**
- Email: admin@anu.eco
- Password: AnuAdmin2024!
- Role: admin
- Status: Email confirmed

---

## Troubleshooting

### Login Error: "Unexpected token 'A', 'A server e'..."

**Cause:** Frontend trying to parse plain text response as JSON

**Solution:** 
1. Check NEXT_PUBLIC_SUPABASE_URL is set correctly
2. Check NEXT_PUBLIC_SUPABASE_ANON_KEY is set correctly
3. Verify Supabase project is accessible
4. Check browser console for CORS errors

### Login Error: "Invalid login credentials"

**Cause:** Wrong password or user doesn't exist

**Solution:**
1. Verify admin@anu.eco exists in auth.users
2. Check if email is confirmed (email_confirmed_at should not be null)
3. Verify password matches (AnuAdmin2024!)
4. If not confirmed, run: `UPDATE auth.users SET email_confirmed_at = NOW() WHERE email = 'admin@anu.eco';`

### Database Connection Error

**Cause:** Wrong host, port, or credentials

**Solution:**
1. Get credentials from Supabase Dashboard
2. Verify DATABASE_URL format: `postgresql://user:password@host:port/database?schema=public`
3. Test connection: `psql postgresql://postgres:password@host:5432/postgres`

---

## Quick Commands

```bash
# Verify Vercel projects
vercel projects ls

# Check environment variables
vercel env ls --project=anu_frontend

# Redeploy a project
vercel --prod --project=anu_frontend

# View deployment logs
vercel logs --project=anu_frontend

# Test backend connectivity
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  https://anu-backend-url/api/users/me
```

---

## Support

For issues:
1. Check DEPLOYMENT_DIAGNOSTICS.md
2. Review this checklist
3. Check browser console logs
4. Run: `bash scripts/verify-deployment.sh`
5. Check Supabase dashboard for errors

