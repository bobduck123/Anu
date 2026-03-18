# Deployment Verification Guide

## Admin Login Credentials

**Email:** `admin@anu.eco`
**Password:** `AnuAdmin2024!`

## Step 1: Verify Frontend (anu_frontend)

### Test Login
1. Go to your deployed frontend URL: `https://[your-anu-frontend-url]/auth`
2. Click "Login"
3. Enter:
   - Email: `admin@anu.eco`
   - Password: `AnuAdmin2024!`
4. Click "Login"

### Expected Result
- You should be logged in and redirected to `/profile`
- User name "System Admin" should appear in the header/menu

### If Login Fails
```bash
# Check frontend env vars in Vercel
vercel env list --project=anu_frontend

# Should show:
# NEXT_PUBLIC_SUPABASE_URL ✓
# NEXT_PUBLIC_SUPABASE_ANON_KEY ✓
# NEXT_PUBLIC_API_BASE_URL ✓
# NEXT_PUBLIC_IMPACT_SERVICE_URL ✓
```

---

## Step 2: Verify Backend (anu_backend)

### Health Check
```bash
curl https://[your-anu-backend-url]/api/health
```

### Expected Response
```json
{"status": "ok", "message": "Flora-Fauna backend is running"}
```

### Check Database Connection
```bash
# SSH into Vercel deployment logs
vercel logs --project=anu_backend --follow

# Look for: "Database connection pool initialized"
```

### If Backend Fails
```bash
# Verify env vars
vercel env list --project=anu_backend

# Should show:
# DATABASE_URL ✓
# SECRET_KEY ✓
# JWT_SECRET_KEY ✓
# FLASK_ENV=production ✓
```

---

## Step 3: Verify Impact Service (anu_impact_service)

### Health Check
```bash
curl https://[your-anu-impact-service-url]/api/health
```

### Expected Response
```json
{"status": "ok", "message": "Impact service is running"}
```

### Check Database Connection
```bash
# View deployment logs
vercel logs --project=anu_impact_service --follow

# Look for: "Prisma Client initialized" or database connection confirmation
```

### If Impact Service Fails
```bash
# Verify env vars
vercel env list --project=anu_impact_service

# Should show:
# DATABASE_URL ✓
# DIRECT_URL ✓
# JWT_SECRET_KEY ✓ (matches anu_backend)
# NODE_ENV=production ✓
```

---

## Step 4: Test Service Integration

### From Frontend, Test Backend API Call
1. Open browser DevTools (F12)
2. Go to Console tab
3. Run:
```javascript
const response = await fetch('https://[your-anu-backend-url]/api/users/me', {
  headers: {
    'Authorization': 'Bearer [your-jwt-token]'
  }
});
console.log(await response.json());
```

### From Frontend, Test Impact Service API Call
```javascript
const response = await fetch('https://[your-anu-impact-service-url]/api/impact/health');
console.log(await response.json());
```

---

## Common Issues & Solutions

### Issue: "Unexpected token 'A', 'A server e'" Error
**Solution:** Frontend env vars are missing. Check:
```bash
vercel env list --project=anu_frontend
```
Ensure `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set.

### Issue: Backend Rejects API Calls
**Solution:** JWT_SECRET_KEY mismatch. Verify:
- `anu_backend` JWT_SECRET_KEY matches `anu_impact_service` JWT_SECRET_KEY
- Both are set in their respective Vercel projects

### Issue: Database Connection Pool Timeout
**Solution:** Check DATABASE_URL format:
- Backend (anu_backend): Use `?pgbouncer=true` suffix
- Impact Service: Use both `DATABASE_URL` (with ?pgbouncer=true) and `DIRECT_URL`

### Issue: CORS Errors in Browser Console
**Solution:** Update CORS_ORIGINS in both services:
```bash
# For anu_backend
vercel env set CORS_ORIGINS https://[your-frontend-url] --project=anu_backend

# For anu_impact_service
vercel env set CORS_ORIGINS https://[your-frontend-url] --project=anu_impact_service
```

---

## Verification Checklist

- [ ] Frontend loads without console errors
- [ ] Login page displays correctly
- [ ] Admin user can log in with admin@anu.eco / AnuAdmin2024!
- [ ] User is redirected to profile page after login
- [ ] Backend health check returns 200 OK
- [ ] Impact service health check returns 200 OK
- [ ] No database connection errors in logs
- [ ] CORS headers are present in API responses
- [ ] JWT tokens are being validated properly

---

## Next Steps After Verification

1. **Change Admin Password** - For security, change the admin password immediately
2. **Create Test Users** - Create regular test accounts via /auth register
3. **Test Core Features:**
   - Create events
   - Join microcosms
   - Submit actions
   - Check impact pool tracking
4. **Enable Email Confirmation** - Configure email in Supabase Auth settings
5. **Set Up Monitoring** - Add Sentry or similar for error tracking

---

## Rollback Procedure

If something is broken, rollback to previous deployment:
```bash
# For each project
vercel rollback --project=[project-name]

# Or redeploy last known good commit
vercel --prod --project=[project-name]
```

---

## Support Commands

```bash
# View all env vars for a project
vercel env list --project=anu_frontend

# Manually redeploy
vercel --prod --project=anu_frontend

# View deployment logs
vercel logs --project=anu_frontend --follow

# Check project status
vercel status --project=anu_frontend
```
