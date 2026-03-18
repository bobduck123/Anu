# Admin Login Issue - Diagnosis & Action Items

## Current Situation

### The Problem
- Admin login failing at https://maanara.vercel.app/auth
- Error: "Unexpected token 'A', 'A server e'..." (JSON parsing error)
- Root cause: Missing Supabase environment variables in Vercel

### What We've Done
✅ Created Supabase admin user:
- Email: `admin@anu.eco`
- Password: `AnuAdmin2024!`
- Role: admin
- Database: supabase-orange-ball (ID: olgtqkgqjmxtivmlqsfb)

✅ Updated AuthContext to use Supabase Auth (instead of broken Flask backend)

✅ Created 3 diagnostic/deployment documents:
1. DEPLOYMENT_DIAGNOSTICS.md - Analysis of what's wrong
2. DEPLOYMENT_CHECKLIST.md - Step-by-step fix guide
3. scripts/verify-deployment.sh - Automated verification

---

## What You Need to Do

### Issue: Confused Vercel Projects

You mentioned:
- **Current deployed frontend:** https://maanara.vercel.app
- **Target projects:** anu_backend, anu_frontend, anu_impact_service
- **Problem:** May be deploying to wrong projects (possibly anu_first_test)

### Immediate Actions (Do These First):

#### 1. Identify Your Vercel Projects
Run in terminal:
```bash
vercel projects ls
```

Look for:
- anu_frontend (or anu-frontend)
- anu_backend (or anu-backend)
- anu_impact_service (or anu-impact-service)

⚠️ If you see `anu_first_test`, that's the wrong project - do not use it.

#### 2. Get Supabase Credentials
Go to: https://supabase.com/dashboard/project/olgtqkgqjmxtivmlqsfb

Click **Settings → API** and copy:
- **NEXT_PUBLIC_SUPABASE_URL:** https://olgtqkgqjmxtivmlqsfb.supabase.co
- **NEXT_PUBLIC_SUPABASE_ANON_KEY:** eyJ... (looks like a long token)

#### 3. Set Environment Variables in anu_frontend

For each variable, run:
```bash
vercel env add NEXT_PUBLIC_SUPABASE_URL --project=anu_frontend
# Paste: https://olgtqkgqjmxtivmlqsfb.supabase.co

vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY --project=anu_frontend
# Paste: [the ANON_KEY from Supabase]

vercel env add NEXT_PUBLIC_API_BASE_URL --project=anu_frontend
# Paste: https://anu-backend-url (get from Vercel)

vercel env add NEXT_PUBLIC_IMPACT_SERVICE_URL --project=anu_frontend
# Paste: https://anu-impact-service-url (get from Vercel)
```

#### 4. Redeploy Frontend
```bash
vercel --prod --project=anu_frontend
```

#### 5. Test Admin Login

Once deployed:
1. Go to: https://anu-frontend-url/auth
2. Enter:
   - Email: **admin@anu.eco**
   - Password: **AnuAdmin2024!**
3. Should login successfully

---

## Supabase Credentials Summary

**Database:** supabase-orange-ball
- **Host:** db.olgtqkgqjmxtivmlqsfb.supabase.co
- **Project URL:** https://olgtqkgqjmxtivmlqsfb.supabase.co

**Admin User:**
- Email: admin@anu.eco
- Password: AnuAdmin2024!
- **⚠️ Change this after first login!**

**Schemas Created:**
- public (contains all core + impact tables)
- falak (contains knowledge graph protocol tables)

---

## Full Configuration Details

See **DEPLOYMENT_CHECKLIST.md** for complete step-by-step instructions including:
- How to configure anu_backend (Flask)
- How to configure anu_impact_service (Node.js)
- How to verify database schemas
- Troubleshooting section

---

## Key Files Reference

| File | Purpose |
|------|---------|
| DEPLOYMENT_CHECKLIST.md | Complete step-by-step deployment guide |
| DEPLOYMENT_DIAGNOSTICS.md | Technical analysis of what's configured |
| scripts/verify-deployment.sh | Automated verification script |
| QUICKSTART.md | Local development setup |
| DATABASE_SCHEMA_DEPLOYMENT.md | Database architecture overview |

---

## Next Steps

1. ✅ Verify you're using anu_frontend, anu_backend, anu_impact_service (not anu_first_test)
2. ⏭️ Set environment variables as shown above
3. ⏭️ Redeploy anu_frontend
4. ⏭️ Test login with admin@anu.eco / AnuAdmin2024!
5. ⏭️ Change admin password to something secure
6. ⏭️ Configure anu_backend and anu_impact_service with database credentials

If issues persist after these steps, run:
```bash
bash scripts/verify-deployment.sh
```

And check the troubleshooting section in DEPLOYMENT_CHECKLIST.md.

