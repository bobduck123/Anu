# Database & Auth Systems - Visual Architecture & Flow Diagrams

## 1. System Architecture Overview

```
╔════════════════════════════════════════════════════════════════════════════╗
║                         ANU PLATFORM ARCHITECTURE                          ║
╠════════════════════════════════════════════════════════════════════════════╣
║                                                                             ║
║  ┌─────────────────────────────────────────────────────────────────────┐  ║
║  │                    USER BROWSER / CLIENT                            │  ║
║  │  Opens: http://localhost:3000 or https://yourdomain.com           │  ║
║  └──────────────────────────────┬──────────────────────────────────────┘  ║
║                                  │                                          ║
║                                  ▼                                          ║
║  ┌─────────────────────────────────────────────────────────────────────┐  ║
║  │              FRONTEND: Next.js (Port 3000)                         │  ║
║  │  ┌──────────────────────────────────────────────────────────────┐  │  ║
║  │  │ Routes:                                                      │  │  ║
║  │  │  /            - Home page                                   │  │  ║
║  │  │  /auth        - Login/Register form                         │  │  ║
║  │  │  /profile     - User profile (authenticated)                │  │  ║
║  │  │  /dashboard   - Main app (authenticated)                   │  │  ║
║  │  └──────────────────────────────────────────────────────────────┘  │  ║
║  │                                                                      │  ║
║  │  ┌──────────────────────────────────────────────────────────────┐  │  ║
║  │  │ State Management:                                            │  │  ║
║  │  │  AuthContext.tsx  - User session, JWT token                 │  │  ║
║  │  │  SWR hooks        - Data fetching + caching                 │  │  ║
║  │  │  Cookies          - Persistent session storage              │  │  ║
║  │  └──────────────────────────────────────────────────────────────┘  │  ║
║  │                                                                      │  ║
║  │  ┌──────────────────────────────────────────────────────────────┐  │  ║
║  │  │ External Services:                                           │  │  ║
║  │  │  Supabase Auth    - User authentication                     │  │  ║
║  │  │  Supabase Client  - Database queries                        │  │  ║
║  │  └──────────────────────────────────────────────────────────────┘  │  ║
║  └─────────────────────┬──────────────────────────┬────────────────────┘  ║
║                        │ HTTP with JWT token      │                       ║
║                        │ (Bearer: eyJ0...)        │                       ║
║                        ▼                          ▼                       ║
║  ┌────────────────────────────────┐  ┌────────────────────────────────┐  ║
║  │  BACKEND: Flask (Port 5000)    │  │ IMPACT SERVICE: Node (3001)    │  ║
║  │                                │  │                                │  ║
║  │  /auth/* Routes:               │  │ /api/* Routes:                 │  ║
║  │  ├─ POST /login               │  │ ├─ GET /impact                 │  ║
║  │  ├─ POST /register            │  │ ├─ POST /calculate             │  ║
║  │  ├─ POST /logout              │  │ └─ GET /metrics                │  ║
║  │  ├─ GET /check-login          │  │                                │  ║
║  │  └─ POST /control-token       │  │ Auth Middleware:               │  ║
║  │                                │  │ ├─ Verify JWT                 │  ║
║  │  /api/* Routes:                │  │ ├─ Check expiry               │  ║
║  │  ├─ GET /users/me             │  │ └─ Extract user info           │  ║
║  │  ├─ GET /events               │  │                                │  ║
║  │  └─ POST /actions             │  │ Prisma ORM:                    │  ║
║  │                                │  │ ├─ User queries                │  ║
║  │  Middleware:                   │  │ ├─ Impact calculations         │  ║
║  │  ├─ JWT verification          │  │ └─ Membership management       │  ║
║  │  ├─ CORS headers              │  │                                │  ║
║  │  └─ Error handling            │  │ Environment:                   │  ║
║  │                                │  │ ├─ NODE_ENV=production        │  ║
║  │  SQLAlchemy ORM:              │  │ ├─ PORT=3001                   │  ║
║  │  ├─ User models              │  │ └─ Database connection pool    │  ║
║  │  ├─ Event models             │  │                                │  ║
║  │  └─ Action models            │  └────────┬───────────────────────┘  ║
║  │                                │          │                         ║
║  │  Environment:                  │          │                         ║
║  │  ├─ FLASK_ENV=production      │          │                         ║
║  │  ├─ PORT=5000                 │          │                         ║
║  │  └─ Database connection       │          │                         ║
║  └─────────────┬──────────────────┘          │                         ║
║                │                             │                         ║
║                └────────────────┬────────────┘                         ║
║                                 │                                      ║
║                                 ▼                                      ║
║  ╔════════════════════════════════════════════════════════════════╗   ║
║  ║         SUPABASE POSTGRESQL DATABASE                           ║   ║
║  ║  ┌────────────────────────────────────────────────────────┐   ║   ║
║  ║  │ Connection: pooler.supabase.com:6543                   │   ║   ║
║  ║  │ Connection Pool Size: 1 (serverless optimized)         │   ║   ║
║  ║  │ Connection Recycling: 300 seconds                      │   ║   ║
║  ║  │ Max Overflow: 0 (no extra connections)                 │   ║   ║
║  ║  └────────────────────────────────────────────────────────┘   ║   ║
║  ║                                                                ║   ║
║  ║  ┌────────────────────────────────────────────────────────┐   ║   ║
║  ║  │ PUBLIC SCHEMA (Core Application)                       │   ║   ║
║  ║  │  Tables:                                               │   ║   ║
║  ║  │   • user           → User accounts                     │   ║   ║
║  ║  │   • event          → Event records                     │   ║   ║
║  ║  │   • action         → User actions                      │   ║   ║
║  ║  │   • microcosm       → Groups/communities               │   ║   ║
║  ║  │   • membership     → User memberships                  │   ║   ║
║  ║  │   • subscription   → Subscription plans                │   ║   ║
║  ║  │   • impact_pool    → Impact calculations               │   ║   ║
║  ║  │   • audit_log      → Security audit trail              │   ║   ║
║  ║  └────────────────────────────────────────────────────────┘   ║   ║
║  ║                                                                ║   ║
║  ║  ┌────────────────────────────────────────────────────────┐   ║   ║
║  ║  │ FALAK SCHEMA (Knowledge Graph)                         │   ║   ║
║  ║  │  Tables:                                               │   ║   ║
║  ║  │   • node           → Knowledge entities                │   ║   ║
║  ║  │   • edge           → Relationships                     │   ║   ║
║  ║  │   • claim          → Assertions                        │   ║   ║
║  ║  │   • evidence       → Supporting evidence               │   ║   ║
║  ║  │   • event_link     → Event connections                 │   ║   ║
║  ║  └────────────────────────────────────────────────────────┘   ║   ║
║  ║                                                                ║   ║
║  ╚════════════════════════════════════════════════════════════════╝   ║
║                                                                        ║
╚════════════════════════════════════════════════════════════════════════════╝
```

---

## 2. Authentication Flow Diagram

```
┌──────────────────────────────────────────────────────────────────────────┐
│                      COMPLETE AUTH FLOW                                   │
└──────────────────────────────────────────────────────────────────────────┘

STEP 1: User opens login page
┌─────────────────────────────────────┐
│ User opens:                         │
│ http://localhost:3000/auth          │
│                                     │
│ Frontend renders:                   │
│ • Email input field                 │
│ • Password input field              │
│ • "Login" button                    │
└──────────────────┬──────────────────┘
                   │
                   ▼
STEP 2: User enters credentials and clicks Login
┌─────────────────────────────────────┐
│ Form data:                          │
│ {                                   │
│   email: "admin@anu.eco",           │
│   password: "AnuAdmin2024!"         │
│ }                                   │
└──────────────────┬──────────────────┘
                   │
                   ▼
STEP 3: Frontend calls Supabase Auth
┌─────────────────────────────────────────────────────┐
│ Frontend (AuthContext.tsx):                         │
│ const { data, error } =                             │
│   await supabase.auth                              │
│   .signInWithPassword({                            │
│     email,                                         │
│     password                                       │
│   })                                               │
└──────────────────┬──────────────────────────────────┘
                   │
                   ▼
STEP 4: Supabase validates credentials
┌─────────────────────────────────────────────────────┐
│ Supabase Auth Service:                              │
│ 1. Check if user exists in database               │
│ 2. Hash provided password                          │
│ 3. Compare with stored hash                        │
│ 4. If valid: generate JWT token                    │
│                                                    │
│ SQL Query:                                         │
│ SELECT * FROM public."user"                        │
│ WHERE email = $1 AND status = 'active'            │
└──────────────────┬──────────────────────────────────┘
                   │
                   ▼ (if valid)
STEP 5: Supabase returns JWT tokens
┌──────────────────────────────────────────────────┐
│ Supabase Response:                               │
│ {                                                │
│   user: {                                        │
│     id: "uuid-123...",                           │
│     email: "admin@anu.eco",                      │
│     created_at: "2024-01-15"                     │
│   },                                            │
│   session: {                                    │
│     access_token: "eyJ0eXAi...",  ← JWT         │
│     refresh_token: "...",                       │
│     expires_in: 3600,             ← 1 hour      │
│     expires_at: 1698765432                      │
│   }                                            │
│ }                                                │
└──────────────────┬──────────────────────────────┘
                   │
                   ▼
STEP 6: Frontend stores token in secure cookie
┌──────────────────────────────────────────────────┐
│ Frontend (AuthContext.tsx):                      │
│ • Decode JWT: {                                  │
│     sub: "user-id",     ← User ID               │
│     email: "admin@...",                         │
│     exp: 1698765432,    ← Expiry timestamp     │
│     iat: 1698762232     ← Issued at timestamp   │
│   }                                             │
│ • Store in HttpOnly cookie (secure)             │
│ • Update AuthContext state                      │
│ • Set user info in localStorage (optional)      │
└──────────────────┬──────────────────────────────┘
                   │
                   ▼
STEP 7: Frontend redirects to authenticated page
┌──────────────────────────────────────────────────┐
│ Router.push("/profile")                          │
│                                                  │
│ User sees:                                       │
│ • Profile page                                   │
│ • User email in header                          │
│ • Logout button available                       │
└──────────────────┬──────────────────────────────┘
                   │
                   ▼
STEP 8: Subsequent requests include token
┌──────────────────────────────────────────────────┐
│ All API calls now include:                       │
│ Authorization: Bearer eyJ0eXAi...               │
│                                                  │
│ GET /api/events                                 │
│ Authorization: Bearer [JWT_TOKEN]               │
│                                                  │
│ Backend receives request and:                   │
│ 1. Extracts token from header                  │
│ 2. Verifies signature using JWT_SECRET_KEY     │
│ 3. Checks expiry timestamp                     │
│ 4. Extracts user info from payload              │
│ 5. Proceeds with authenticated request          │
└──────────────────┬──────────────────────────────┘
                   │
                   ▼
STEP 9: Token refresh (if needed)
┌──────────────────────────────────────────────────┐
│ If token expires:                                │
│ 1. Frontend detects exp < current_time          │
│ 2. Calls Supabase with refresh_token            │
│ 3. Supabase generates new access_token          │
│ 4. Frontend updates cookie                      │
│                                                  │
│ User stays logged in without re-entering        │
│ credentials (seamless experience)               │
└──────────────────┬──────────────────────────────┘
                   │
                   ▼
STEP 10: Logout
┌──────────────────────────────────────────────────┐
│ User clicks "Logout" button                      │
│ Frontend calls: supabase.auth.signOut()         │
│                                                  │
│ Actions:                                        │
│ 1. Clear JWT from cookies                       │
│ 2. Clear AuthContext state                      │
│ 3. Clear localStorage                           │
│ 4. Redirect to /auth                            │
│                                                  │
│ Backend resets on next request:                 │
│ • No token = 401 Unauthorized                   │
│ • User must log in again                        │
└──────────────────────────────────────────────────┘
```

---

## 3. Service Communication Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                   SERVICE COMMUNICATION                              │
│              (All connections are HTTPS/CORS-protected)             │
└─────────────────────────────────────────────────────────────────────┘

┌────────────────────┐
│   Frontend         │
│   (Next.js)        │
│   Port 3000        │
└────────┬───────────┘
         │
         ├─────────────────────────────────────────────────────┐
         │                                                     │
         ▼                                                     ▼
    ┌─────────────┐                            ┌──────────────────────┐
    │  Backend    │                            │  Supabase Auth       │
    │  (Flask)    │                            │  (External Service)  │
    │  Port 5000  │                            │  supabase.com        │
    └─────┬───────┘                            └──────────────────────┘
          │                                               │
          │ (1) User submits login                       │
          │ email/password                              │
          │                                             │
          │<─────── Redirect to Supabase Auth ─────────┘
          │
          │ (2) Supabase validates credentials
          │
          ├──────────→ Supabase validates
          │ (3) JWT token returned
          │
          │<─────── JWT token returned ──────────────────┐
          │                                              │
          ├─────────────────────────────────────────────┤
          │                                              │
          │ (4) Frontend stores JWT in cookies           │
          │                                              │
          ├────────→ Backend API with JWT token          │
          │         Authorization: Bearer [TOKEN]       │
          │                                              │
          ▼                                              │
    ┌─────────────────────────────────────────────────────┐
    │  Backend receives request with JWT:               │
    │  1. Extract token from header                     │
    │  2. Verify signature (JWT_SECRET_KEY)             │
    │  3. Check token expiry                            │
    │  4. Extract user info from token                  │
    │  5. Query database for user data                  │
    │  6. Return authenticated response                 │
    └─────────────┬──────────────────────────────────────┘
                  │
                  │ (5) If operation needs Impact Service
                  │
                  ▼
          ┌─────────────────────────────┐
          │  Impact Service             │
          │  (Node.js)                  │
          │  Port 3001                  │
          │                             │
          │  Receives:                  │
          │  Authorization: Bearer ...  │
          │  • Verifies JWT             │
          │  • Executes calculation     │
          │  • Returns result           │
          └─────────────┬───────────────┘
                        │
                        └──→ Both share same database
                            (Supabase PostgreSQL)
                            Port 6543 (pooler)
```

---

## 4. JWT Token Structure

```
┌────────────────────────────────────────────────────────────────────┐
│                    JWT TOKEN ANATOMY                               │
│   eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.                            │
│   eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9ZWU...       │
│   SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c                    │
└────────────────────────────────────────────────────────────────────┘

Part 1: Header (Base64 encoded JSON)
┌─────────────────────────────────────────────┐
│ {                                           │
│   "typ": "JWT",                            │
│   "alg": "HS256"  ← HMAC SHA-256 signing   │
│ }                                           │
└─────────────────────────────────────────────┘
                    │
                    └──→ eyJ0eXAi...

Part 2: Payload (Base64 encoded JSON)
┌─────────────────────────────────────────────┐
│ {                                           │
│   "sub": "user-123",  ← Subject (User ID)  │
│   "email": "admin@anu.eco",                │
│   "exp": 1698765432,  ← Expiry (1 hour)   │
│   "iat": 1698762232,  ← Issued at         │
│   "aud": "anu-platform",                   │
│   "roles": ["admin", "user"]               │
│ }                                           │
└─────────────────────────────────────────────┘
                    │
                    └──→ eyJ...

Part 3: Signature (HMAC-SHA256)
┌─────────────────────────────────────────────┐
│ Signature = HMAC-SHA256(                    │
│   header + "." + payload,                   │
│   JWT_SECRET_KEY                           │
│ )                                           │
│                                             │
│ Only server knows JWT_SECRET_KEY, so       │
│ only server can verify this signature       │
└─────────────────────────────────────────────┘
                    │
                    └──→ SflKxwRJ...


Verification Process:
┌────────────────────────────────────────────────────────────────┐
│ When backend receives token:                                   │
│                                                                │
│ 1. Split token into 3 parts: header.payload.signature         │
│                                                                │
│ 2. Decode header: {"typ":"JWT", "alg":"HS256"}               │
│                                                                │
│ 3. Decode payload: {exp: 1698765432, ...}                    │
│                                                                │
│ 4. Check expiry: if (current_time > exp) → INVALID           │
│                                                                │
│ 5. Recompute signature:                                       │
│    new_sig = HMAC-SHA256(header+payload, JWT_SECRET_KEY)     │
│                                                                │
│ 6. Compare: if (new_sig === received_sig) → VALID            │
│    else → TAMPERED, REJECT                                   │
│                                                                │
│ 7. Extract user info from payload                            │
│                                                                │
│ 8. Proceed with authenticated request                         │
└────────────────────────────────────────────────────────────────┘
```

---

## 5. Database Connection Flow

```
┌──────────────────────────────────────────────────────────────────┐
│                  DATABASE CONNECTION FLOW                        │
└──────────────────────────────────────────────────────────────────┘

BACKEND (Flask + SQLAlchemy)
┌───────────────────────────────────────────────────────────────┐
│                                                               │
│ 1. Read Environment Variable                                 │
│    DATABASE_URL = "postgresql://user:pw@host:port/db"       │
│                                                               │
│ 2. Create Connection Engine                                  │
│    engine = create_engine(                                   │
│      DATABASE_URL,                                           │
│      pool_size=1,              ← Serverless: minimal         │
│      max_overflow=0,           ← Don't exceed pool size      │
│      pool_recycle=300          ← Recycle every 5 min        │
│    )                                                          │
│                                                               │
│ 3. Create Session Factory                                    │
│    Session = sessionmaker(bind=engine)                       │
│                                                               │
│ 4. Execute Queries                                           │
│    session = Session()                                       │
│    user = session.query(User).filter_by(email='...').first()│
│    session.close()                                           │
│                                                               │
└──────────────────────┬───────────────────────────────────────┘
                       │
                       ▼
SUPABASE POSTGRES CONNECTION
┌───────────────────────────────────────────────────────────────┐
│  URL: postgresql://user:pw@pooler.supabase.com:6543/postgres │
│                                           │                   │
│                                           └─ Port 6543        │
│                                               (Connection Pooler)
│                                                               │
│  Connection Pooling:                                          │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ Pool: 1 connection (serverless optimized)             │  │
│  │ Timeout: 30 seconds                                   │  │
│  │ Recycle: Every 300 seconds (5 minutes)                │  │
│  │ Max Queue: 10 requests                                │  │
│  │                                                       │  │
│  │ When connection needed:                              │  │
│  │ 1. Check if connection available in pool             │  │
│  │ 2. If yes: reuse existing connection                 │  │
│  │ 3. If no: create new connection (up to pool_size)    │  │
│  │ 4. If pool full: queue request                       │  │
│  │ 5. Execute query                                     │  │
│  │ 6. Return connection to pool                         │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                               │
└───────────────────────────────┬──────────────────────────────┘
                                 │
                                 ▼
                      PostgreSQL Database
                      ┌────────────────────┐
                      │ public schema      │
                      │ ├─ user            │
                      │ ├─ event           │
                      │ └─ ...             │
                      │                    │
                      │ falak schema       │
                      │ ├─ node            │
                      │ ├─ edge            │
                      │ └─ ...             │
                      └────────────────────┘

IMPACT SERVICE (Node.js + Prisma)
┌───────────────────────────────────────────────────────────────┐
│                                                               │
│ 1. Initialize Prisma Client                                 │
│    import { PrismaClient } from "@prisma/client"            │
│    const prisma = new PrismaClient()                         │
│                                                               │
│ 2. Prisma reads DATABASE_URL                                │
│    Connection string from environment variable             │
│                                                               │
│ 3. Prisma configures connection pool                        │
│    Default: pool_size=10, max_overflow=0                    │
│    For serverless: reduced to 1-2 connections              │
│                                                               │
│ 4. Execute queries                                          │
│    const users = await prisma.user.findMany()              │
│    const impact = await prisma.impactPool.findUnique(...)  │
│                                                               │
│ 5. Automatic connection management                          │
│    Prisma handles pooling, recycling, reconnection         │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

---

## 6. Error Handling Flow

```
┌──────────────────────────────────────────────────────────────┐
│                  ERROR HANDLING FLOW                         │
└──────────────────────────────────────────────────────────────┘

Invalid Token / No Authorization Header
┌─────────────────────────────────┐
│ Frontend makes request:         │
│ GET /api/protected              │
│ (no Authorization header)       │
└──────────────┬──────────────────┘
               │
               ▼
       ┌─────────────────────────────┐
       │ Backend Auth Middleware:    │
       │ 1. Look for Authorization  │
       │ 2. Extract Bearer token    │
       │ 3. Token not found         │
       │                            │
       │ Return: 401 Unauthorized   │
       │ Message: "Missing token"   │
       └─────────────────────────────┘
               │
               ▼
       ┌─────────────────────────────┐
       │ Frontend receives 401       │
       │ 1. Clear auth state         │
       │ 2. Clear cookies            │
       │ 3. Redirect to /auth        │
       │                            │
       │ User must log in again      │
       └─────────────────────────────┘

Token Expired
┌─────────────────────────────────┐
│ Frontend makes request:         │
│ GET /api/protected              │
│ Authorization: Bearer [OLD_JWT] │
└──────────────┬──────────────────┘
               │
               ▼
       ┌─────────────────────────────┐
       │ Backend verifies token:     │
       │ 1. Decode JWT              │
       │ 2. Check expiry timestamp  │
       │ 3. current_time > exp_time │
       │                            │
       │ Return: 401 Token Expired  │
       └─────────────────────────────┘
               │
               ▼
       ┌─────────────────────────────┐
       │ Frontend receives 401       │
       │ 1. Try refresh token       │
       │ 2. If refresh fails:       │
       │    - Clear auth            │
       │    - Redirect to /auth     │
       │ 3. If refresh works:       │
       │    - Update token cookie   │
       │    - Retry original req    │
       └─────────────────────────────┘

JWT Secret Mismatch
┌─────────────────────────────────┐
│ Backend tries to verify token   │
│ with JWT_SECRET_KEY = "key1"   │
│ But token was signed with       │
│ JWT_SECRET_KEY = "key2"         │
└──────────────┬──────────────────┘
               │
               ▼
       ┌─────────────────────────────┐
       │ Signature verification:     │
       │ new_sig = HMAC-SHA256(      │
       │   payload, "key1"           │
       │ )                           │
       │                            │
       │ received_sig != new_sig     │
       │ ❌ Invalid signature        │
       │                            │
       │ Return: 401 Invalid Token   │
       └─────────────────────────────┘

Database Connection Error
┌─────────────────────────────────┐
│ Backend tries to query database │
│ Connection timeout              │
│ or pool exhausted               │
└──────────────┬──────────────────┘
               │
               ▼
       ┌─────────────────────────────┐
       │ Connection pool:            │
       │ - Retry with backoff        │
       │ - After N retries: fail     │
       │                            │
       │ Return: 503 Service Down    │
       └─────────────────────────────┘
               │
               ▼
       ┌─────────────────────────────┐
       │ Frontend receives 503       │
       │ Show error message:         │
       │ "Service temporarily down"  │
       │                            │
       │ Retry after 30 seconds      │
       └─────────────────────────────┘
```

---

## 7. Deployment Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│              VERCEL DEPLOYMENT ARCHITECTURE                         │
└─────────────────────────────────────────────────────────────────────┘

┌─ Vercel Edge Network ─────────────────────────────────────────┐
│                                                               │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐│
│  │ anu_frontend    │  │ anu_backend     │  │ anu_impact      ││
│  │ (Next.js)       │  │ (Flask)         │  │ (Node.js)       ││
│  │ Deployed:       │  │ Deployed:       │  │ Deployed:       ││
│  │ anu.vercel.app  │  │ anu-api.        │  │ anu-impact.     ││
│  │                 │  │ vercel.app      │  │ vercel.app      ││
│  │ • ISR caching   │  │ • Serverless    │  │ • Serverless    ││
│  │ • 200 nodes     │  │ • Auto-scale    │  │ • Auto-scale    ││
│  │ • Global CDN    │  │ • On-demand     │  │ • On-demand     ││
│  │                 │  │                 │  │                 ││
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘│
│           │                    │                    │          │
│           └────────────────────┼────────────────────┘          │
│                                │                               │
│                    Environment Variables:                     │
│                    • DATABASE_URL                             │
│                    • JWT_SECRET_KEY                           │
│                    • SUPABASE_URL                             │
│                    • (other config...)                        │
│                                                               │
└──────────────────────────┬────────────────────────────────────┘
                           │
                           ▼
        ┌──────────────────────────────────┐
        │  Supabase PostgreSQL             │
        │  (External managed database)     │
        │                                  │
        │  ├─ Connection pooler            │
        │  │  Port: 6543                   │
        │  │  Auto-scaling                 │
        │  │  99.9% uptime SLA             │
        │  │                               │
        │  ├─ Automatic backups            │
        │  ├─ Read replicas                │
        │  └─ Real-time capabilities       │
        │                                  │
        └──────────────────────────────────┘

DNS & SSL
┌──────────────────────────────────┐
│ yourdomain.com                   │
│ │                                │
│ ├─ A record → anu.vercel.app    │
│ ├─ A record → anu-api.vercel.app│
│ ├─ A record → anu-impact.v...   │
│ │                                │
│ ├─ TLS certificate (auto-renewal)│
│ └─ HTTPS on all endpoints        │
└──────────────────────────────────┘

Requests Flow:
┌────────────────────────────────────────┐
│ User: https://yourdomain.com          │
│ │                                      │
│ ├─ Vercel Edge processes request      │
│ ├─ Routes to frontend function        │
│ ├─ Frontend calls backend API         │
│ ├─ Backend queries database           │
│ └─ Response returned to user          │
│                                        │
│ All requests:                          │
│ • HTTPS encrypted                      │
│ • TLS 1.3                              │
│ • JWT token in Authorization header    │
│ • CORS headers checked                 │
│ • Rate limiting applied                │
│ • Request logging enabled              │
└────────────────────────────────────────┘
```

---

This completes the visual architecture and flow diagrams for the Anu Platform database and authentication systems.

