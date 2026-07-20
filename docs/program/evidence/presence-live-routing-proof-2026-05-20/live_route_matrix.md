# Presence Live Routing Proof - 2026-05-20

## Summary

Production now routes the public Presence journey to the Pass 7 Presence Studio.

- Frontend: `https://your-presence.vercel.app`
- Backend: `https://anu-back-end.vercel.app`
- Observed routing commit: `86dded0 route public presence start to studio`
- Result: Go for public Studio discovery and controlled pilot intake.

## What Changed

The public homepage previously sent `Start your Presence` to:

`/auth/sign-up?returnTo=%2Fonboarding`

It now sends public visitors to:

`/presence-chooser`

The old `/onboarding` route now redirects to `/presence-chooser`, so older links do not trap users in the retired wizard path. The owner workspace remains separate at `/studio`.

## Route Matrix

| Route | Status | Final URL | File | Classification | Access |
| --- | ---: | --- | --- | --- | --- |
| `/` | 200 | `https://your-presence.vercel.app/?proof=86dded0` | `presence-app/app/page.tsx` | Updated public landing | Public |
| `/presence-chooser` | 200 | `https://your-presence.vercel.app/presence-chooser?proof=86dded0` | `presence-app/app/(public)/presence-chooser/page.tsx` | New Presence Studio | Public |
| `/onboarding` | 200 | `https://your-presence.vercel.app/presence-chooser` | `presence-app/app/onboarding/page.tsx` | Alias redirect to Presence Studio | Public |
| `/studio` | 200 | `https://your-presence.vercel.app/studio?proof=86dded0` | `presence-app/app/(studio)/studio/page.tsx` | Owner workspace | Client auth-gated owner/admin |
| `/auth/sign-up?returnTo=/onboarding` | 200 | same route | `presence-app/app/auth/sign-up/page.tsx` | Auth compatibility route | Public auth |
| `/auth/sign-up` | 200 | same route | `presence-app/app/auth/sign-up/page.tsx` | Auth signup | Public auth |
| `/p/rooms-gallery-painter` | 200 | same route | `presence-app/app/(public)/p/[slug]/page.tsx` | Public Presence demo | Public |
| `/p/rooms-underground-dj` | 200 | same route | `presence-app/app/(public)/p/[slug]/page.tsx` | Public Presence demo | Public |
| `/p/rooms-material-carpenter` | 200 | same route | `presence-app/app/(public)/p/[slug]/page.tsx` | Public Presence demo | Public |
| `/p/rooms-local-carpenter` | 200 | same route | `presence-app/app/(public)/p/[slug]/page.tsx` | Public Presence demo | Public |
| `/p/rooms-community-healer` | 200 | same route | `presence-app/app/(public)/p/[slug]/page.tsx` | Public Presence demo | Public |
| `/p/rooms-sharp-consultant` | 200 | same route | `presence-app/app/(public)/p/[slug]/page.tsx` | Public Presence demo | Public |
| `/dynamics/orbit` | 200 | same route | `presence-app/app/(public)/dynamics/orbit/page.tsx` | Public dynamic demo | Public |
| `/dynamics/tableau` | 200 | same route | `presence-app/app/(public)/dynamics/tableau/page.tsx` | Public dynamic demo | Public |
| `/dynamics/cascade` | 200 | same route | `presence-app/app/(public)/dynamics/cascade/page.tsx` | Public dynamic demo | Public |

## Hosted Evidence

- `/` contains `href="/presence-chooser"` on the `Start your Presence` CTA.
- `/presence-chooser` returns title `Presence Studio - Set the direction | Presence` and includes `presence-studio-shell`.
- `/onboarding` follows to `/presence-chooser`.
- `/studio` still returns owner workspace copy: `Choose your Presence` and `Loading your Presences...`.
- The six public `/p/...` demos and three `/dynamics/...` demos return `200`.

## Backend and Intake Proof

- `GET /health`: `200`
- `GET /readiness`: `200`, database ok
- `GET /api/presence/customisation/manifest`: `200`
- `GET /api/presence/customisation/recommendations?archetype=artist`: `200`
- `POST /api/presence/customisation/preview-seed`: `200`, schema version and RoomGraph-ready content present
- `POST /api/presence/setup-requests`: `201`
  - `status=submitted`
  - `presence_status=setup_request`
  - controlled proof request id: `3`
  - email redacted from this evidence
  - no public Presence was published
- `POST /api/presence/owner/beta/start` without auth: `401 auth_required`

## CORS

Production `OPTIONS /api/presence/setup-requests` from `https://your-presence.vercel.app` returned:

- `Access-Control-Allow-Origin: https://your-presence.vercel.app`
- `Access-Control-Allow-Methods` includes `POST`
- `Access-Control-Allow-Headers` includes `authorization, content-type`

## Canonical, QR, and vCard Origin

Checked `rooms-consultant` across API, QR, vCard, and page metadata.

- Public API `public_url`: `https://your-presence.vercel.app/presence/rooms-consultant`
- Public API `seo.canonical_url`: `https://your-presence.vercel.app/presence/rooms-consultant`
- QR SVG title: `https://your-presence.vercel.app/presence/rooms-consultant`
- vCard URL: `https://your-presence.vercel.app/presence/rooms-consultant`
- Page canonical and OG URL: `https://your-presence.vercel.app/presence/rooms-consultant`
- No `presence-gilt.vercel.app` references were observed in the live sampled responses.

## Vercel Audit

Confirmed:

- Production domain serving the app: `your-presence.vercel.app`
- Production content reflects commit `86dded0`.
- Production route behavior reflects routing commit `86dded077a8715f0ad45c72d955051884d09db37`.
- The feature branch later advanced with this docs-only evidence commit.
- Build root is inferred as `presence-app` from the live Next routes and chunks.

Not directly available from this workspace:

- Vercel project name
- Vercel production alias metadata
- Vercel dashboard deployment record

Reason: no local `.vercel` project link exists for `presence-app`, no root `.vercel` link exists, and `vercel` CLI is not installed.

## Commands Run

```text
git status --short --branch
git log -1 --oneline
curl.exe -i https://your-presence.vercel.app/
curl.exe route matrix probes for /, /presence-chooser, /onboarding, /studio, /auth/sign-up, /p demos, and /dynamics demos
curl.exe https://anu-back-end.vercel.app/health
curl.exe https://anu-back-end.vercel.app/readiness
curl.exe https://anu-back-end.vercel.app/api/presence/customisation/manifest
curl.exe https://anu-back-end.vercel.app/api/presence/customisation/recommendations?archetype=artist
curl.exe POST https://anu-back-end.vercel.app/api/presence/customisation/preview-seed
curl.exe POST https://anu-back-end.vercel.app/api/presence/setup-requests
curl.exe OPTIONS https://anu-back-end.vercel.app/api/presence/setup-requests
curl.exe POST https://anu-back-end.vercel.app/api/presence/owner/beta/start
PRESENCE_ROOMS_SMOKE_API_BASE=https://anu-back-end.vercel.app PRESENCE_ROOMS_SMOKE_WEB_BASE=https://your-presence.vercel.app python scripts/presence_rooms_v1_smoke.py
cmd /c npm run build
cmd /c npm run typecheck
node --experimental-strip-types lib/presence/url.test.ts
git diff --check
```

## Smoke Result

`scripts/presence_rooms_v1_smoke.py` passed against:

- API: `https://anu-back-end.vercel.app`
- Web: `https://your-presence.vercel.app`

Auth-dependent hidden draft/private checks were skipped because control-plane smoke credentials were not set.

## Remaining Risks

- Direct Vercel dashboard metadata was not available from this machine.
- Authenticated owner/admin editing on `/studio` was not exercised in this routing pass.
- One controlled setup request remains in production as clearly labelled test intake data.

## Final Judgement

Go.

The public product journey now reaches the new Presence Studio from the live homepage, `/onboarding` no longer traps users in the old flow, public demos still work, and canonical/QR/vCard URLs use `https://your-presence.vercel.app`.
