# Manara Frontend (Next.js)

This frontend preserves all existing routes and adds Cultural Intelligence pages under the Manara brand:

- `/explore` (world viewer + node inspector)
- `/intel-feed` (fused events + cluster filters)
- `/learn` (learning modules + guided journeys)
- `/quests` (quest start/progress linked to commitments)

World snapshots are integrity-verified in browser before rendering:
- Ed25519 signature verification (WebCrypto with pure-JS fallback)
- manifest hash recomputation check
- optional trusted key pinning by `signature_key_id`
- optional enforcement of backend artifact verification status
Intel feed, clusters, and world snapshot fetches use ETag-aware session caching for faster reloads.

## Getting Started

1. Install dependencies:

```bash
npm install
```

2. Configure runtime URLs:

```bash
# .env.local
# Local development can point directly at the Flask core API and impact service.
NEXT_PUBLIC_API_BASE=http://localhost:5000
NEXT_PUBLIC_IMPACT_API_BASE=http://localhost:5003
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_WORLD_REQUIRE_SERVER_VERIFIED=true
NEXT_PUBLIC_WORLD_REQUIRE_MANIFEST_HASH=true
# Optional key pinning map: {"dev-ed25519":"<base64 raw public key>"}
NEXT_PUBLIC_WORLD_TRUSTED_KEYS_JSON={"dev-ed25519":"..."}
```

For Vercel, prefer server-only rewrite targets instead of public localhost-style API bases:

```bash
CORE_API_ORIGIN=https://<your-core-api>.vercel.app
IMPACT_API_ORIGIN=https://<your-impact-api>.vercel.app
NEXT_PUBLIC_SITE_URL=https://<your-frontend>.vercel.app
```

3. Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Vercel Deployment

For Vercel, set `CORE_API_ORIGIN` and `IMPACT_API_ORIGIN` in the frontend project so the app can proxy backend traffic through `/_core/*` and `/_impact/*` without hardcoded localhost URLs.

## Verification and Build

```bash
npm run lint
npm run test -- --run
npm run build
```

## Key Routes

- Home dashboards: `http://localhost:3000/home`
- Manara signals: `http://localhost:3000/manara`
- Earth entry UX: `http://localhost:3000/earth`
- Heaven universe projection: `http://localhost:3000/heaven`
- Explore world viewer: `http://localhost:3000/explore`
- Intel feed: `http://localhost:3000/intel-feed`
- Learn: `http://localhost:3000/learn`
- Quests: `http://localhost:3000/quests`

Backend dependencies:
- Existing app endpoints remain unchanged.
- New architecture endpoints:
  - `GET /api/public/intel/events`
  - `GET /api/public/intel/clusters`
  - `GET /api/public/worlds/{world_id}/snapshot`
  - `POST /api/public/quests/start`
