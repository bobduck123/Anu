# ✓ Database & Auth System - Quick Reference Checklist

## 🚀 Quick Start (5 minutes)

### 1. Verify Environment Variables
```bash
# Check all three services have .env files
test -f flora-fauna/backend/.env && echo "✓ Backend .env" || echo "✗ Missing backend .env"
test -f services/impact-service/.env && echo "✓ Impact .env" || echo "✗ Missing impact .env"
test -f frontend-next/.env.local && echo "✓ Frontend .env" || echo "✗ Missing frontend .env"
```

### 2. Check Critical Variables
```bash
# Backend
grep -E "DATABASE_URL|JWT_SECRET_KEY|SECRET_KEY" flora-fauna/backend/.env

# Impact Service
grep -E "DATABASE_URL|DIRECT_URL|JWT_SECRET_KEY" services/impact-service/.env

# Frontend
grep -E "NEXT_PUBLIC_SUPABASE" frontend-next/.env.local
```

### 3. Verify Database Connection
```bash
# From backend directory
cd flora-fauna/backend
python -c "from app import app, db; db.engine.connect(); print('✓ Database connected')"
```

### 4. Test Auth Endpoints
```bash
# Start backend in one terminal
cd flora-fauna/backend && python app.py

# In another terminal, test login
curl -X POST http://localhost:5000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"AnuAdmin2024!"}'
```

### 5. Test Frontend Login
1. Open http://localhost:3000/auth
2. Enter: `admin@anu.eco` / `AnuAdmin2024!`
3. Should redirect to profile page

---

## 📋 System Components Checklist

### Backend (flora-fauna/backend)

- [ ] `requirements.txt` exists
- [ ] `.env` file configured with `DATABASE_URL`
- [ ] `app.py` starts without errors
- [ ] `/health` endpoint responds
- [ ] `/auth/login` endpoint works
- [ ] JWT tokens are generated

**Expected Logs:**
```
[v0] Starting Flask backend...
[v0] Connected to Supabase PostgreSQL
[v0] Auth routes registered: /auth/login, /auth/register, /auth/logout
[v0] Running on http://localhost:5000
```

### Frontend (frontend-next)

- [ ] `package.json` includes `@supabase/supabase-js`
- [ ] `.env.local` has Supabase credentials
- [ ] `/auth` page loads without errors
- [ ] `AuthContext.tsx` uses Supabase auth
- [ ] Login form accepts email/password

**Key Files:**
- `src/contexts/AuthContext.tsx` - Auth logic
- `src/app/auth/page.tsx` - Login UI
- `src/app/api/sdk/auth/route.ts` - Session handler

### Impact Service (services/impact-service)

- [ ] `package.json` includes `prisma`
- [ ] `.env` configured with `DATABASE_URL` and `DIRECT_URL`
- [ ] `prisma/schema.prisma` defines data models
- [ ] `src/middleware/auth.ts` verifies JWT tokens
- [ ] Service starts without errors

**Expected Logs:**
```
[v0] Prisma connected to database
[v0] Impact service ready on port 3001
[v0] JWT middleware initialized
```

### Database (Supabase PostgreSQL)

- [ ] Connection string works (port 6543)
- [ ] `public` schema exists with tables
- [ ] `falak` schema exists for knowledge graph
- [ ] `user` table has admin user
- [ ] Migrations have been applied

**Verify in Supabase SQL Editor:**
```sql
-- Check schemas exist
SELECT schema_name FROM information_schema.schemata 
WHERE schema_name IN ('public', 'falak');

-- Check user table
SELECT count(*) FROM public."user" WHERE email='admin@anu.eco';
```

---

## 🔐 Authentication Flow

```
User enters credentials
          ↓
Frontend calls Supabase Auth
          ↓
Supabase validates in PostgreSQL
          ↓
Returns JWT token (+ refresh token)
          ↓
Frontend stores token in cookies
          ↓
Frontend redirects to /profile
          ↓
Subsequent requests include token
          ↓
Backend/Impact service verifies token
          ↓
Proceeds with authenticated request
```

---

## ⚠️ Common Issues & Quick Fixes

| Issue | Check | Fix |
|-------|-------|-----|
| "Could not connect to server" | Backend logs | Verify `DATABASE_URL`, check Supabase is running |
| "Unexpected token 'A'" | Browser console | Frontend env vars, Supabase project not paused |
| Login redirects but 404 | Network tab | Check redirect URL, clear cookies |
| JWT errors | Backend logs | Verify `JWT_SECRET_KEY` is same across services |
| Prisma validation fails | Run prisma validate | Check `DATABASE_URL` format, run migrations |
| CORS errors | Browser console | Update `CORS_ORIGINS` in backend config |

---

## 🧪 Test Commands

### Test Database Connection
```bash
# Backend
cd flora-fauna/backend
python -c "from app.config import get_db_url; print(f'URL: {get_db_url()}')"

# Impact Service
cd services/impact-service
npx prisma validate
```

### Test Auth Endpoint
```bash
# Backend login
curl -X POST http://localhost:5000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"AnuAdmin2024!"}'

# Check response has 'access_token'
```

### Test Frontend Connection
```bash
# Start frontend
cd frontend-next && npm run dev

# Open browser
open http://localhost:3000/auth
```

### Test Impact Service
```bash
# Get token from backend login
TOKEN=$(curl -X POST http://localhost:5000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"AnuAdmin2024!"}' \
  | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)

# Call protected endpoint
curl http://localhost:3001/api/impact \
  -H "Authorization: Bearer $TOKEN"
```

---

## 📈 Deployment Checklist

### Before Deploying to Vercel

- [ ] All `.env` files are configured locally
- [ ] Services work together on localhost
- [ ] Admin login succeeds
- [ ] Database migrations are applied
- [ ] No hardcoded secrets in code
- [ ] `VERCEL_ENV` is set correctly

### Environment Variables on Vercel

**Project: anu_frontend**
```
NEXT_PUBLIC_SUPABASE_URL=https://...supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
NEXT_PUBLIC_API_BASE=https://anu-backend.vercel.app
NEXT_PUBLIC_IMPACT_SERVICE_URL=https://anu-impact.vercel.app
```

**Project: anu_backend**
```
DATABASE_URL=postgresql://...@pooler.supabase.com:6543/...
JWT_SECRET_KEY=<same value>
SECRET_KEY=<random>
FLASK_ENV=production
CORS_ORIGINS=https://anu-frontend.vercel.app
```

**Project: anu_impact_service**
```
DATABASE_URL=postgresql://...@pooler.supabase.com:6543/...
DIRECT_URL=postgresql://...@db.supabase.com:5432/...
JWT_SECRET_KEY=<same value>
NODE_ENV=production
CORS_ORIGINS=https://anu-frontend.vercel.app
```

### Post-Deployment Verification

```bash
# Test backend health
curl https://anu-backend.vercel.app/health

# Test impact service health  
curl https://anu-impact.vercel.app/health

# Test frontend
curl https://anu-frontend.vercel.app

# Test admin login (check logs for errors)
```

---

## 📞 Getting Help

1. **Check logs:** Each service logs authentication flow
2. **Review errors:** Read browser console + server logs
3. **Verify config:** Double-check all environment variables
4. **Test isolation:** Test each service independently first
5. **Database state:** Check if user exists in database

---

## 📚 Reference

- Full guide: `VERIFY_DATABASE_AUTH.md`
- Setup guide: `QUICKSTART.md`
- Fixes log: `FIXES_IMPLEMENTED.md`
- Test script: `scripts/verify-all-systems.sh`
- Backend README: `flora-fauna/backend/README.md`
- Impact README: `services/impact-service/README.md`

---

**Status:** ✓ System architecture verified and documented

Last updated: 2026-03-18
