# Deploy Code Changes to Vercel

## Status: Code Changes Ready to Deploy

The following critical fixes have been made to your codebase:

### Changed Files
1. `flora-fauna/backend/app/config.py` - Fixed Supabase database connection
2. `flora-fauna/backend/app/__init__.py` - Disabled db.create_all() on Vercel
3. `frontend-next/src/contexts/AuthContext.tsx` - Switched to Supabase Auth
4. `frontend-next/src/app/auth/page.tsx` - Updated login form

These changes are currently in the v0 editor but **NOT YET LIVE** on Vercel.

---

## How to Deploy

### Option 1: Via GitHub Desktop (Recommended)

1. Open GitHub Desktop
2. Select repository: `bobduck123/Anu`
3. Current branch should be: `v0/emadhatu-2110-b90d1ddd`
4. Click "Fetch origin" to sync any remote changes
5. Enter a commit message:
   ```
   Fix: Database connection and authentication issues
   
   - Fixed Flask backend to support Supabase POSTGRES_URL
   - Disabled db.create_all() on Vercel to prevent cold-start failures
   - Switched frontend to use Supabase Auth directly
   - Updated login form to use email/password
   ```
6. Click "Commit to v0/emadhatu-2110-b90d1ddd"
7. Click "Push origin"

### Option 2: Via Command Line

```bash
cd Anu
git add -A
git commit -m "Fix: Database connection and authentication issues

- Fixed Flask backend to support Supabase POSTGRES_URL
- Disabled db.create_all() on Vercel to prevent cold-start failures
- Switched frontend to use Supabase Auth directly
- Updated login form to use email/password"
git push origin v0/emadhatu-2110-b90d1ddd
```

### Option 3: Create Pull Request (Recommended for Review)

1. Push to v0 branch (via GitHub Desktop or CLI)
2. Go to: https://github.com/bobduck123/Anu
3. Click "Compare & pull request"
4. Set:
   - Base: `main`
   - Compare: `v0/emadhatu-2110-b90d1ddd`
5. Click "Create pull request"
6. Once approved, click "Merge pull request"

---

## After Pushing to GitHub

### Vercel Auto-Deployment

Your Vercel projects are connected to the GitHub repository and will **automatically redeploy** when you push changes:

- **anu_frontend** will redeploy when `frontend-next/` changes
- **anu_backend** will redeploy when `flora-fauna/backend/` changes
- **anu_impact_service** will redeploy when `services/impact-service/` changes

### Monitor Deployments

1. **Frontend:** https://vercel.com/bobduck123/anu_frontend
2. **Backend:** https://vercel.com/bobduck123/anu_backend
3. **Impact Service:** https://vercel.com/bobduck123/anu_impact_service

Each project will show a "Building" status, then "Ready" once deployed.

---

## Test After Deployment

### 1. Admin Login Test
- URL: `https://[your-anu-frontend-url]/auth`
- Email: `admin@anu.eco`
- Password: `AnuAdmin2024!`
- Expected: Login succeeds, redirects to profile

### 2. Backend Health Check
- URL: `https://[your-anu-backend-url]/health` (if endpoint exists)
- Expected: 200 OK response

### 3. Check Vercel Logs
- Each project's Deployments tab shows real-time logs
- Backend should NOT show: "could not connect to server"

---

## Timeline

| Step | Time | Status |
|------|------|--------|
| Push to GitHub | Now | Action needed |
| Vercel builds | 2-5 min | Automatic |
| Deployments go live | ~10 min | Automatic |
| Test login | After live | Manual test |

---

## Troubleshooting

If deployments fail:

1. **Check Vercel logs** for errors
2. **Verify environment variables** are still set correctly
3. **Check GitHub** for any merge conflicts
4. Open a support ticket if issues persist
