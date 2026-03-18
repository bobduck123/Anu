# Deployment Diagnostics - Anu Platform

## Problem Summary

Admin login is failing at https://maanara.vercel.app/auth with "Unexpected token 'A', 'A server e'..." JSON parsing error.

**Goal:** Verify we're using the correct Vercel projects:
- `anu_backend` (Flora-Fauna)
- `anu_frontend` (Next.js)
- `anu_impact_service` (Impact Service)

NOT `anu_first_test`

---

## Current Status

### Supabase Projects Available

1. **supabase-orange-ball** (ID: `olgtqkgqjmxtivmlqsfb`)
   - Region: us-east-1
   - Status: ACTIVE_HEALTHY
   - Created: 2026-03-18T11:10:51.972922Z
   - **Admin User Created Here:** admin@anu.eco / AnuAdmin2024!

2. **supabase-coquelicot-canvas** (ID: `mgzkpuzlmvshsivixqxe`)
   - Region: ap-southeast-2
   - Status: ACTIVE_HEALTHY
   - Created: 2026-03-18T09:13:27.234901Z
   - Unknown current content

### Frontend Status

**URL:** https://maanara.vercel.app/auth
- Deployed and accessible
- **Issue:** Missing Supabase environment variables
- Required: `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Status: **⚠️ NEEDS CONFIGURATION**

---

## What Needs to Be Done

### 1. Identify Correct Projects

Run this command to check which Vercel projects exist:
```bash
vercel projects ls
```

Look for:
- `anu_frontend` or `anu-frontend`
- `anu_backend` or `anu-backend`  
- `anu_impact_service` or `anu-impact-service`
- `anu_first_test` (should NOT be used)

### 2. Map Supabase to Vercel Projects

For each Vercel project, check which Supabase project it's connected to:

```bash
vercel env ls --project=anu_frontend
```

You should see:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 3. Verify Database Schemas

Once we know which Supabase project to use, verify the schemas exist:

```sql
-- Check available schemas
SELECT schema_name FROM information_schema.schemata 
WHERE schema_name NOT IN ('pg_catalog', 'information_schema');
```

Should see:
- `public` (contains core_schema + impact_schema)
- `falak` (contains falak_schema)

### 4. Verify Admin User

For the correct Supabase project:

```sql
SELECT id, email, raw_user_meta_data 
FROM auth.users 
WHERE email = 'admin@anu.eco';
```

If missing, admin user needs to be created in the correct database.

---

## Next Steps

1. **Confirm which Supabase project is connected to anu_frontend**
   - Check: https://supabase.com/dashboard
   - Look for project integrations in Vercel

2. **If using supabase-orange-ball (correct one):**
   - Admin user already created ✓
   - Just need to set environment variables in Vercel

3. **If using supabase-coquelicot-canvas (wrong one):**
   - Need to switch to supabase-orange-ball
   - Run database migrations
   - Create admin user

4. **If using something else:**
   - Need to investigate and align with correct project

---

## Login Test

Once configured, test with:

**URL:** https://anu_frontend-url/auth
**Email:** admin@anu.eco
**Password:** AnuAdmin2024!

If successful, you should be redirected to /profile.

---

## Environment Variables Needed

Set these in **each Vercel project**:

### anu_frontend
```
NEXT_PUBLIC_SUPABASE_URL=https://olgtqkgqjmxtivmlqsfb.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[your-anon-key]
NEXT_PUBLIC_API_BASE_URL=https://anu_backend_url
NEXT_PUBLIC_IMPACT_SERVICE_URL=https://anu_impact_service_url
```

### anu_backend
```
DATABASE_URL=postgresql://postgres:password@db.olgtqkgqjmxtivmlqsfb.supabase.co:5432/postgres
SECRET_KEY=your_secret_key
JWT_SECRET_KEY=your_jwt_secret
```

### anu_impact_service
```
DATABASE_URL=postgresql://postgres:password@db.olgtqkgqjmxtivmlqsfb.supabase.co:5432/postgres?schema=public
DIRECT_URL=postgresql://postgres:password@db.olgtqkgqjmxtivmlqsfb.supabase.co:5432/postgres
JWT_SECRET_KEY=your_jwt_secret
```

---

## Supabase Project Details

### supabase-orange-ball (CURRENT ACTIVE)

**Database Host:** db.olgtqkgqjmxtivmlqsfb.supabase.co
**Region:** us-east-1
**Version:** PostgreSQL 17.6.1.084

**To get credentials:**
1. Go to: https://supabase.com/dashboard/project/olgtqkgqjmxtivmlqsfb
2. Click "Connect"
3. Copy ANON_KEY and PROJECT_URL
4. For SERVICE_ROLE_KEY: Settings → API → Service Role Secret

**Schemas Created:**
- ✓ public (001_core_schema + 002_impact_schema)
- ✓ falak (003_falak_schema)

**Users:**
- ✓ admin@anu.eco (admin user created)
- Service role key for backend operations

