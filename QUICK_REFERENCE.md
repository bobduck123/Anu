# Quick Reference - Anu Platform Deployment

## Admin Login
- **Email:** admin@anu.eco
- **Password:** AnuAdmin2024!
- **URL:** https://[anu-frontend-url]/auth

## Vercel Projects
| Name | URL Pattern | Type | Port (local) |
|------|------------|------|--------------|
| anu_frontend | anu-frontend-*.vercel.app | Next.js | 3000 |
| anu_backend | anu-backend-*.vercel.app | Flask | 5000 |
| anu_impact_service | anu-impact-*.vercel.app | Node.js | 5003 |

## Supabase Details
- **Project ID:** olgtqkgqjmxtivmlqsfb
- **Dashboard:** https://supabase.com/dashboard/project/olgtqkgqjmxtivmlqsfb
- **Region:** us-east-1
- **Database:** PostgreSQL

## Database Schemas
```
public
  ├── 001_core_schema (Flora-Fauna: users, events, actions, etc.)
  ├── 002_impact_schema (Impact: memberships, subscriptions, pools)
  └── 003_falak_schema (Knowledge graph: nodes, edges, actors)
```

## Environment Variables Summary

### anu_frontend (3 required)
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_API_BASE_URL
NEXT_PUBLIC_IMPACT_SERVICE_URL
```

### anu_backend (5 required)
```
DATABASE_URL
SECRET_KEY
JWT_SECRET_KEY
FLASK_ENV=production
CORS_ORIGINS
```

### anu_impact_service (5 required)
```
DATABASE_URL
DIRECT_URL
JWT_SECRET_KEY (must match anu_backend)
NODE_ENV=production
CORS_ORIGINS
```

## Health Checks
```bash
# Frontend (no endpoint, just check login page)
curl https://[frontend-url]/auth

# Backend
curl https://[backend-url]/api/health

# Impact Service
curl https://[impact-url]/api/health
```

## Common Fixes

| Problem | Solution |
|---------|----------|
| Login fails with JSON error | Check NEXT_PUBLIC_SUPABASE_* env vars in anu_frontend |
| Backend rejects requests | Verify JWT_SECRET_KEY matches across services |
| CORS errors | Update CORS_ORIGINS env var in each service |
| Database timeout | Ensure DATABASE_URL has ?pgbouncer=true |

## Useful Commands
```bash
# List env vars
vercel env list --project=[project-name]

# Redeploy
vercel --prod --project=[project-name]

# View logs
vercel logs --project=[project-name] --follow

# Rollback
vercel rollback --project=[project-name]
```

## Next Steps
1. Test admin login at /auth
2. Verify backend health endpoint
3. Verify impact service health endpoint
4. Change admin password
5. Create test users
6. Test core features (events, actions, pools)
