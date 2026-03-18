# Database & Auth Systems - Complete Verification Guide

This guide helps you verify that the database is working correctly and all auth routes are properly configured across the frontend, backend, and impact service.

## Quick Status Check

Run this to get a comprehensive status report:

```bash
# Make the script executable
chmod +x scripts/verify-all-systems.sh

# Run the verification
./scripts/verify-all-systems.sh
```

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    Anu Platform Architecture                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Frontend (Next.js - Port 3000)                                 │
│  ├─ AuthContext.tsx (Supabase Auth integration)                │
│  ├─ /auth/page.tsx (Login/Register UI)                         │
│  └─ /api/sdk/auth/route.ts (Session management)                │
│                                                                   │
│  Backend (Flask - Port 5000)                                    │
│  ├─ app/auth.py (Auth endpoints)                               │
│  ├─ app/config.py (Database configuration)                     │
│  └─ Supabase PostgreSQL connection                             │
│                                                                   │
│  Impact Service (Node.js - Port 3001)                          │
│  ├─ src/middleware/auth.ts (JWT verification)                  │
│  ├─ prisma/schema.prisma (ORM models)                          │
│  └─ Shared Supabase PostgreSQL                                 │
│                                                                   │
│  Database (Supabase PostgreSQL)                                 │
│  ├─ public schema (Core + Impact tables)                        │
│  ├─ falak schema (Knowledge graph tables)                       │
│  └─ Connection pool (port 6543)                                │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

## 1. Database Verification

### A. Check Database Connection (Backend)

The backend connects to Supabase using these steps:

```python
# flora-fauna/backend/app/config.py

# 1. Load connection string from environment
database_url = os.environ.get('DATABASE_URL') or os.environ.get('POSTGRES_URL')

# 2. Detect if using Supabase pooler
uses_pooler = ':6543' in url  # Port 6543 = Supabase pooler

# 3. Configure SQLAlchemy
if uses_pooler:
    engine = create_engine(database_url, 
        pool_size=1,           # Serverless: minimal connection pool
        max_overflow=0,        # Don't overflow connections
        pool_recycle=300       # Recycle connections every 5 minutes
    )
```

**To verify:**

```bash
# Check if backend env has DATABASE_URL
grep DATABASE_URL flora-fauna/backend/.env || echo "Not found"

# Or check Vercel environment
# Go to: Vercel Dashboard > anu_backend > Settings > Environment Variables
# Look for: DATABASE_URL or POSTGRES_URL
```

**Expected URL format:**
```
postgresql://postgres:[password]@[region].pooler.supabase.com:6543/postgres?sslmode=require
```

### B. Check Database Connection (Impact Service)

Impact service uses Prisma ORM which connects to the same database:

```prisma
# services/impact-service/prisma/schema.prisma

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")  # Non-pooling connection for migrations
}
```

**To verify:**

```bash
# Check .env file
grep DATABASE_URL services/impact-service/.env

# Or verify Prisma can connect
cd services/impact-service
npx prisma validate

# Test the connection
npx prisma db push --skip-generate
```

### C. Verify Database Schema

The database has three schemas:

```sql
-- Check schema creation
SELECT schema_name FROM information_schema.schemata 
WHERE schema_name IN ('public', 'falak');

-- Expected output:
--   public    <- Core Flora-Fauna + Impact tables
--   falak     <- Knowledge graph protocol tables
```

**To verify in Supabase SQL Editor:**

```sql
-- List all tables in public schema
SELECT tablename FROM pg_tables 
WHERE schemaname = 'public'
LIMIT 10;

-- List all tables in falak schema
SELECT tablename FROM pg_tables 
WHERE schemaname = 'falak'
LIMIT 10;

-- Check user table exists (required for auth)
SELECT EXISTS(
  SELECT 1 FROM information_schema.tables 
  WHERE table_schema = 'public' AND table_name = 'user'
) as user_table_exists;
```

## 2. Authentication System Verification

### A. Backend Auth Routes

The Flask backend provides these auth endpoints:

```python
# flora-fauna/backend/app/auth.py

@auth_bp.route('/login', methods=['POST'])
def login():
    """Login with username/password -> returns JWT token"""
    
@auth_bp.route('/register', methods=['POST'])
def register():
    """Register new user -> creates account in database"""

@auth_bp.route('/logout', methods=['POST'])
def logout():
    """Logout -> invalidates token"""

@auth_bp.route('/check-login', methods=['GET'])
def check_login():
    """Check if user is logged in -> returns current user"""

@auth_bp.route('/control-token', methods=['POST'])
def get_control_token():
    """Get elevated control token for admin operations"""
```

**To verify backend auth is working:**

```bash
# 1. Start backend
cd flora-fauna/backend
python app.py

# 2. Test login endpoint
curl -X POST http://localhost:5000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"AnuAdmin2024!"}'

# Expected response:
# {"access_token": "eyJ0eXAi...", "user": {...}}
```

### B. Frontend Auth System

The frontend uses **Supabase Auth** directly (not Flask backend):

```typescript
// frontend-next/src/contexts/AuthContext.tsx

export async function signIn(email: string, password: string) {
  // Uses Supabase directly
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })
  
  // Returns JWT token from Supabase
  return { user: data.user, token: data.session?.access_token }
}
```

**To verify frontend auth:**

1. Open http://localhost:3000/auth
2. Click "Login" tab
3. Enter credentials:
   - Email: `admin@anu.eco`
   - Password: `AnuAdmin2024!`
4. Should redirect to profile page

**If login fails, check:**

```bash
# 1. Verify Supabase env vars are set
grep NEXT_PUBLIC_SUPABASE frontend-next/.env.local

# 2. Check console errors in browser DevTools
# 3. Verify Supabase project is active (not paused)
```

### C. Impact Service Auth Middleware

The Impact service verifies JWT tokens on protected routes:

```typescript
// services/impact-service/src/middleware/auth.ts

export function verifyJWT(req: Request): User | null {
  const token = extractTokenFromHeader(req)
  
  try {
    const payload = jwt.verify(token, JWT_SECRET_KEY)
    return payload.user
  } catch (err) {
    return null  // Invalid or expired token
  }
}
```

**To verify Impact service auth:**

```bash
# 1. Start impact service
cd services/impact-service
npm run dev

# 2. Test protected endpoint with token
TOKEN="<jwt_token_from_login>"
curl http://localhost:3001/api/impact \
  -H "Authorization: Bearer $TOKEN"

# Should return data if token is valid
# Should return 401 if token is missing or invalid
```

## 3. Service Connectivity Check

### A. Backend Health

```bash
# Check if backend is running and responding
curl http://localhost:5000/health
curl http://localhost:5000/  # Or root endpoint

# Expected: 200 OK or JSON response
```

### B. Impact Service Health

```bash
# Check if impact service is running
curl http://localhost:3001/health
curl http://localhost:3001/  # Or health endpoint

# Expected: 200 OK or JSON response
```

### C. Frontend Health

```bash
# Check if frontend is accessible
curl http://localhost:3000/

# Expected: HTML response with page content
```

## 4. Complete Auth Flow Test

Here's the complete flow from login to authenticated request:

```
┌─────────────────────────────────────────────────────────┐
│ Step 1: User enters credentials in frontend             │
│ Email: admin@anu.eco                                     │
│ Password: AnuAdmin2024!                                  │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ Step 2: Frontend calls Supabase Auth                    │
│ supabase.auth.signInWithPassword(email, password)       │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ Step 3: Supabase validates credentials                  │
│ Checks user table in PostgreSQL                         │
│ Generates JWT token (expires in 1 hour)                 │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ Step 4: Frontend stores token in cookies                │
│ Automatically included in all requests                  │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ Step 5: Frontend can now call backend APIs              │
│ Includes token in Authorization header:                │
│ Authorization: Bearer eyJ0eXAi...                       │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ Step 6: Backend/Impact service verifies token          │
│ Decodes JWT using JWT_SECRET_KEY                        │
│ Returns 401 if token invalid/expired                    │
│ Proceeds with request if token valid                    │
└─────────────────────────────────────────────────────────┘
```

## 5. Environment Variables Checklist

All three services must be configured:

### Frontend (frontend-next)

```bash
# Required environment variables
NEXT_PUBLIC_SUPABASE_URL=https://[project].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
NEXT_PUBLIC_API_BASE=http://localhost:5000  # Or production URL
NEXT_PUBLIC_IMPACT_SERVICE_URL=http://localhost:3001
```

### Backend (flora-fauna/backend)

```bash
# Required environment variables
DATABASE_URL=postgresql://postgres:...@pooler.supabase.com:6543/postgres
JWT_SECRET_KEY=<64-char hex string>
SECRET_KEY=<random secret>
FLASK_ENV=production
CORS_ORIGINS=http://localhost:3000,https://yourdomain.com
```

### Impact Service (services/impact-service)

```bash
# Required environment variables
DATABASE_URL=postgresql://postgres:...@pooler.supabase.com:6543/postgres
DIRECT_URL=postgresql://postgres:...@db.supabase.com:5432/postgres
JWT_SECRET_KEY=<same as backend>
NODE_ENV=production
CORS_ORIGINS=http://localhost:3000,https://yourdomain.com
```

## 6. Troubleshooting

### Error: "Could not connect to server"

**Cause:** Backend can't reach Supabase
**Solution:**
```bash
# 1. Check DATABASE_URL format
grep DATABASE_URL flora-fauna/backend/.env

# 2. Verify pooler port (should be 6543)
echo $DATABASE_URL | grep -o ":[0-9]*"

# 3. Test connection directly
psql "$DATABASE_URL"

# 4. Check IP whitelist in Supabase
# Settings > Database > IP Whitelist > Add your IP
```

### Error: "Unexpected token 'A'"

**Cause:** Frontend is receiving HTML error page instead of JSON
**Solution:**
```bash
# 1. Check backend is running
curl http://localhost:5000/health

# 2. Check environment variables
echo $NEXT_PUBLIC_SUPABASE_URL
echo $NEXT_PUBLIC_SUPABASE_ANON_KEY

# 3. Verify Supabase project isn't paused
# Check Supabase dashboard
```

### Error: "jwt_secret_key mismatch"

**Cause:** Backend and Impact service using different JWT secrets
**Solution:**
```bash
# Generate new JWT secret
python -c "import secrets; print(secrets.token_hex(32))"

# Update both services
# flora-fauna/backend/.env: JWT_SECRET_KEY=<value>
# services/impact-service/.env: JWT_SECRET_KEY=<value>

# Restart both services
```

### Login redirects but shows 404

**Cause:** Frontend auth context needs refresh
**Solution:**
```bash
# Clear browser cache and cookies
# Hard refresh: Ctrl+Shift+R or Cmd+Shift+R

# Or clear manually in DevTools:
# Application > Cookies > Clear all
```

## 7. Success Criteria

Your setup is working when:

- ✓ Database connection: `curl http://localhost:5000/` returns 200
- ✓ Backend starts without "connection refused" errors
- ✓ Frontend auth page loads at http://localhost:3000/auth
- ✓ Admin login succeeds with email/password
- ✓ Redirects to profile page after login
- ✓ API calls include JWT token in headers
- ✓ Impact service responds to authenticated requests
- ✓ No JSON parse errors in browser console

## 8. Next Steps

Once verified:

1. **Local Development:**
   - Run all three services in separate terminals
   - Test full flow with test data
   - Check database for created records

2. **Deployment:**
   - Deploy to Vercel (each service separately)
   - Set environment variables in Vercel project settings
   - Verify services communicate across deployment

3. **Production:**
   - Set up monitoring/alerting
   - Configure SSL certificates
   - Set up backup strategy for database
   - Enable audit logging for sensitive operations

## Reference Files

- `QUICKSTART.md` - Setup instructions
- `FIXES_IMPLEMENTED.md` - Recent fixes and changes
- `flora-fauna/backend/README.md` - Backend documentation
- `services/impact-service/README.md` - Impact service documentation
- `frontend-next/README.md` - Frontend documentation

