# Vercel Environment Variables Setup

## Supabase Project Info

| Property | Value |
|----------|-------|
| Project ID | `olgtqkgqjmxtivmlqsfb` |
| Dashboard | https://supabase.com/dashboard/project/olgtqkgqjmxtivmlqsfb |

---

## 1. anu_frontend (Next.js)

**Vercel Project:** `anu_frontend`
**Root Directory:** `frontend-next`

### Required Environment Variables

| Variable | How to Get | Required |
|----------|-----------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Dashboard > Settings > API > Project URL | Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Dashboard > Settings > API > anon public | Yes |
| `NEXT_PUBLIC_API_BASE_URL` | Your anu_backend URL (e.g., `https://anu-backend.vercel.app`) | Yes |
| `NEXT_PUBLIC_IMPACT_SERVICE_URL` | Your anu_impact_service URL (e.g., `https://anu-impact.vercel.app`) | Yes |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe Dashboard > Developers > API Keys > Publishable key | Optional |
| `NEXT_PUBLIC_PLATFORM_DOMAIN` | `anu.eco` or your domain | Optional |

### Commands to Set (Vercel CLI)

```bash
# From Supabase Dashboard > Settings > API
vercel env add NEXT_PUBLIC_SUPABASE_URL production preview development --project=anu_frontend
# Enter: https://olgtqkgqjmxtivmlqsfb.supabase.co

vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production preview development --project=anu_frontend
# Enter: (copy from Supabase Dashboard > Settings > API > anon public key)

# Backend service URLs (update with your actual deployed URLs)
vercel env add NEXT_PUBLIC_API_BASE_URL production preview development --project=anu_frontend
# Enter: https://your-anu-backend.vercel.app

vercel env add NEXT_PUBLIC_IMPACT_SERVICE_URL production preview development --project=anu_frontend
# Enter: https://your-anu-impact-service.vercel.app
```

---

## 2. anu_backend (Flask)

**Vercel Project:** `anu_backend`
**Root Directory:** `flora-fauna/backend`

### Required Environment Variables

| Variable | How to Get | Required |
|----------|-----------|----------|
| `DATABASE_URL` | Supabase Dashboard > Settings > Database > Connection string (URI) | Yes |
| `SECRET_KEY` | Generate: `python -c "import secrets; print(secrets.token_hex(32))"` | Yes |
| `JWT_SECRET_KEY` | Generate: `python -c "import secrets; print(secrets.token_hex(32))"` | Yes |
| `FLASK_ENV` | `production` | Yes |
| `CORS_ORIGINS` | Your frontend URL (e.g., `https://anu-frontend.vercel.app,https://anu.eco`) | Yes |
| `STRIPE_SECRET_KEY` | Stripe Dashboard > Developers > API Keys > Secret key | Optional |
| `STRIPE_WEBHOOK_SECRET` | Stripe Dashboard > Developers > Webhooks > Signing secret | Optional |

### Commands to Set (Vercel CLI)

```bash
# Generate secrets first:
# python -c "import secrets; print(secrets.token_hex(32))"

# Database (from Supabase Dashboard > Settings > Database > Connection string)
vercel env add DATABASE_URL production preview development --project=anu_backend
# Enter: postgresql://postgres.[project-ref]:[password]@aws-0-us-east-1.pooler.supabase.com:6543/postgres

vercel env add SECRET_KEY production preview development --project=anu_backend
# Enter: (your generated 64-char hex secret)

vercel env add JWT_SECRET_KEY production preview development --project=anu_backend
# Enter: (your generated 64-char hex secret - SAVE THIS, needed for impact service)

vercel env add FLASK_ENV production --project=anu_backend
# Enter: production

vercel env add CORS_ORIGINS production preview development --project=anu_backend
# Enter: https://your-anu-frontend.vercel.app,https://anu.eco
```

---

## 3. anu_impact_service (Node.js/Prisma)

**Vercel Project:** `anu_impact_service`
**Root Directory:** `services/impact-service`

### Required Environment Variables

| Variable | How to Get | Required |
|----------|-----------|----------|
| `DATABASE_URL` | Supabase Dashboard > Settings > Database > Connection string (with pooler) | Yes |
| `DIRECT_URL` | Supabase Dashboard > Settings > Database > Connection string (direct) | Yes |
| `JWT_SECRET_KEY` | **Same value as anu_backend** | Yes |
| `NODE_ENV` | `production` | Yes |
| `CORS_ORIGINS` | Your frontend URL | Yes |
| `STRIPE_SECRET_KEY` | Stripe Dashboard > Developers > API Keys > Secret key | Optional |
| `STRIPE_WEBHOOK_SECRET` | Stripe Dashboard > Developers > Webhooks > Signing secret | Optional |

### Commands to Set (Vercel CLI)

```bash
# Database URLs (from Supabase Dashboard > Settings > Database)
vercel env add DATABASE_URL production preview development --project=anu_impact_service
# Enter: postgresql://postgres.[project-ref]:[password]@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true

vercel env add DIRECT_URL production preview development --project=anu_impact_service
# Enter: postgresql://postgres.[project-ref]:[password]@aws-0-us-east-1.pooler.supabase.com:5432/postgres

# IMPORTANT: Must match anu_backend's JWT_SECRET_KEY exactly
vercel env add JWT_SECRET_KEY production preview development --project=anu_impact_service
# Enter: (same value you used for anu_backend)

vercel env add NODE_ENV production --project=anu_impact_service
# Enter: production

vercel env add CORS_ORIGINS production preview development --project=anu_impact_service
# Enter: https://your-anu-frontend.vercel.app,https://anu.eco
```

---

## Where to Find Each Value

### Supabase Dashboard

1. Go to https://supabase.com/dashboard/project/olgtqkgqjmxtivmlqsfb
2. Navigate to **Settings** (gear icon in sidebar)

| Value | Location |
|-------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Settings > API > Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Settings > API > Project API keys > anon public |
| `DATABASE_URL` (pooled) | Settings > Database > Connection string > URI (Transaction mode) |
| `DIRECT_URL` | Settings > Database > Connection string > URI (Session mode) |

### Stripe Dashboard

1. Go to https://dashboard.stripe.com/apikeys
2. Use **test mode** keys for development, **live mode** for production

| Value | Location |
|-------|----------|
| `STRIPE_SECRET_KEY` | API keys > Secret key (starts with `sk_`) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | API keys > Publishable key (starts with `pk_`) |
| `STRIPE_WEBHOOK_SECRET` | Developers > Webhooks > Select endpoint > Signing secret |

### Generate Secrets

```bash
# For SECRET_KEY and JWT_SECRET_KEY (use same JWT_SECRET_KEY for backend + impact service)
python -c "import secrets; print(secrets.token_hex(32))"
```

---

## Quick Setup Script

Run this after you have all values ready:

```bash
#!/bin/bash

# === EDIT THESE VALUES ===
SUPABASE_URL="https://olgtqkgqjmxtivmlqsfb.supabase.co"
SUPABASE_ANON_KEY="your-anon-key-here"
DATABASE_URL_POOLED="postgresql://postgres.olgtqkgqjmxtivmlqsfb:[password]@aws-0-us-east-1.pooler.supabase.com:6543/postgres"
DATABASE_URL_DIRECT="postgresql://postgres.olgtqkgqjmxtivmlqsfb:[password]@aws-0-us-east-1.pooler.supabase.com:5432/postgres"
SECRET_KEY="your-generated-secret-here"
JWT_SECRET_KEY="your-jwt-secret-here"
FRONTEND_URL="https://your-anu-frontend.vercel.app"
BACKEND_URL="https://your-anu-backend.vercel.app"
IMPACT_URL="https://your-anu-impact.vercel.app"

# === anu_frontend ===
echo "Setting anu_frontend env vars..."
echo "$SUPABASE_URL" | vercel env add NEXT_PUBLIC_SUPABASE_URL production preview development --project=anu_frontend
echo "$SUPABASE_ANON_KEY" | vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production preview development --project=anu_frontend
echo "$BACKEND_URL" | vercel env add NEXT_PUBLIC_API_BASE_URL production preview development --project=anu_frontend
echo "$IMPACT_URL" | vercel env add NEXT_PUBLIC_IMPACT_SERVICE_URL production preview development --project=anu_frontend

# === anu_backend ===
echo "Setting anu_backend env vars..."
echo "$DATABASE_URL_POOLED" | vercel env add DATABASE_URL production preview development --project=anu_backend
echo "$SECRET_KEY" | vercel env add SECRET_KEY production preview development --project=anu_backend
echo "$JWT_SECRET_KEY" | vercel env add JWT_SECRET_KEY production preview development --project=anu_backend
echo "production" | vercel env add FLASK_ENV production --project=anu_backend
echo "$FRONTEND_URL" | vercel env add CORS_ORIGINS production preview development --project=anu_backend

# === anu_impact_service ===
echo "Setting anu_impact_service env vars..."
echo "${DATABASE_URL_POOLED}?pgbouncer=true" | vercel env add DATABASE_URL production preview development --project=anu_impact_service
echo "$DATABASE_URL_DIRECT" | vercel env add DIRECT_URL production preview development --project=anu_impact_service
echo "$JWT_SECRET_KEY" | vercel env add JWT_SECRET_KEY production preview development --project=anu_impact_service
echo "production" | vercel env add NODE_ENV production --project=anu_impact_service
echo "$FRONTEND_URL" | vercel env add CORS_ORIGINS production preview development --project=anu_impact_service

echo "Done! Now redeploy each project:"
echo "  vercel --prod --project=anu_frontend"
echo "  vercel --prod --project=anu_backend"
echo "  vercel --prod --project=anu_impact_service"
```

---

## Admin Login Credentials

After setup is complete, login at your frontend `/auth` page:

| Field | Value |
|-------|-------|
| Email | `admin@anu.eco` |
| Password | `AnuAdmin2024!` |

**Change this password after first login.**

---

## Verification Checklist

After setting all env vars and redeploying:

- [ ] Frontend loads at https://your-anu-frontend.vercel.app
- [ ] Login page shows at /auth
- [ ] Admin login works with admin@anu.eco / AnuAdmin2024!
- [ ] Backend health check: https://your-anu-backend.vercel.app/api/health
- [ ] Impact service health: https://your-anu-impact.vercel.app/api/health
