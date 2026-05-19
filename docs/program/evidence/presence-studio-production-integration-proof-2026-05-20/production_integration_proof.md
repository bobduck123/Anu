# Presence Studio Production Integration Proof - 2026-05-20

## Scope

This proof verifies the hosted backend and active frontend integration path for Presence Studio setup requests.

- Frontend: `https://your-presence.vercel.app`
- Backend: `https://anu-back-end.vercel.app`
- Retired frontend: `https://presence-gilt.vercel.app`

No credentials or secrets are included in this evidence.

## Deployment Status

Backend production is healthy and serving the Studio intake contract:

- `GET /health`: `200 OK`, `ready=true`
- `GET /readiness`: `200 OK`, database ok
- `GET /api/presence/customisation/manifest`: `200 OK`
- `GET /api/presence/customisation/recommendations?archetype=artist`: `200 OK`
- `POST /api/presence/customisation/preview-seed`: `200 OK` for valid selections

The backend does not expose a commit endpoint. Behavior confirms the production backend includes the Studio metadata/alias preservation path from `7a8ad95` or later.

Frontend production was also promoted after this proof began:

- `d06de95 fix presence frontend canonical origin`
- `98fb066 add presence studio frontend`

## Frontend Payload Contract

The requested root evidence file `docs/PRESENCE_STUDIO_FRONTEND_EVIDENCE.md` was not present. The payload was extracted from:

- `presence-app/docs/PRESENCE_STUDIO_IMPLEMENTATION_REPORT.md`
- `presence-app/lib/presence/studio/useStudioState.ts`
- `presence-app/lib/presence/studio/adapter.ts`

Presence Studio sends:

```json
{
  "display_name": "string",
  "contact_name": "string",
  "email": "string",
  "phone": "string optional",
  "what_youre_building": "string",
  "notes": "string optional",
  "references": ["string"],
  "do_not_wants": "string optional",
  "consent_to_contact": true,
  "archetype": "artist",
  "room_world": "rooms-gallery-painter",
  "engagement_dynamic": "chamber_walk",
  "motion_profile": "still",
  "object_skin_pack": "paper-wall",
  "atmosphere_pack": "north-light",
  "contact_style": "enquiry",
  "copy_tone": "Plain",
  "customisation_manifest_version": "studio-v1-local-fallback",
  "customisation_snapshot": {
    "identity": {"id": "artist", "label": "Artist"},
    "world": {"id": "gallery", "label": "The Quiet Gallery"},
    "movement": {"id": "rooms", "label": "Walk the Rooms"},
    "mood": {"id": "north-light", "label": "North Light"},
    "pace": {"id": "still", "label": "Still"},
    "material": {"id": "paper-wall", "label": "Paper & Wall"},
    "contact": {"id": "enquiry", "label": "Open Enquiry"},
    "tone": "Plain"
  }
}
```

## Controlled Production Intake Smoke

One controlled setup request was submitted with clearly labelled proof data.

Result:

- HTTP `201 Created`
- `status=submitted`
- `presence_status=setup_request`
- `id=2`
- `what_youre_building` was stored/returned as `description`
- `motion_profile=still` was resolved to `calm`
- `object_skin_pack=paper-wall` was resolved to `gallery_frame_pack`
- `atmosphere_pack=north-light` was resolved to `quiet_gallery`
- raw selections were preserved in `customisation.selected_raw`
- no public Presence was published

Private contact/metadata fields are intentionally not echoed in the public response. Local backend tests verify preservation of those metadata fields; hosted admin/DB inspection is blocked without an operator auth header.

## Preview Seed Proof

`POST /api/presence/customisation/preview-seed` with:

```json
{
  "archetype": "artist",
  "room_world": "rooms-gallery-painter",
  "engagement_dynamic": "chamber_walk",
  "motion_profile": "calm",
  "object_skin_pack": "gallery_frame_pack",
  "atmosphere_pack": "quiet_gallery"
}
```

returned:

- HTTP `200 OK`
- `schema_version=presence-roomgraph-preview-seed-v1`
- `status=preview_ready`
- `needs_review=false`
- RoomGraph-ready `room_graph` and `presence_dna`

Invalid customisation proof:

- `portal_cascade` for `artist` returned HTTP `422`
- structured `validation_error`
- `status=needs_review`

## Public Endpoint Proof

Backend public endpoints are green:

- `GET /api/presence/public/rooms-consultant`: `200 OK`
- `GET /api/presence/public/rooms-consultant/qr`: `200 OK`
- `GET /api/presence/public/rooms-consultant/vcard`: `200 OK`
- `GET /api/presence/public/nodes?limit=50`: `200 OK`, total `6`, five required demo slugs present

Backend-generated canonical URLs now use:

```text
https://your-presence.vercel.app/presence/[slug]
```

`https://presence-gilt.vercel.app` returns `404 DEPLOYMENT_NOT_FOUND`.

## Frontend Canonical Finding

The backend public API, QR, and vCard are fixed. A hosted frontend HTML probe initially showed `presence-gilt` in `<link rel="canonical">`, Open Graph URL, and JSON-LD URL. This was traced to the frontend canonical helper fallback and a stale deployed frontend build.

Fix committed and pushed:

- `d06de95 fix presence frontend canonical origin`

That change updates `presence-app/lib/presence/url.ts` so:

- production fallback is `https://your-presence.vercel.app`
- retired `https://presence-gilt.vercel.app` env values are remapped to the active host
- a URL helper regression test covers both cases

Final hosted verification:

- `/presence/rooms-consultant` now emits canonical, Open Graph URL, and JSON-LD URL using `https://your-presence.vercel.app`
- `/presence-chooser` now serves the Presence Studio build with title `Presence Studio - Set the direction`

## Auth and Lifecycle Proof

No control-plane/operator auth headers were available in this runtime, so the full admin lifecycle could not be completed.

Negative auth checks passed:

- `GET /api/presence/admin/setup-requests` without auth: `401 auth_required`
- `POST /api/presence/admin/setup-requests/2/create-preview` without auth: `401 auth_required`
- `GET /api/presence/owner/nodes` without auth: `401 auth_required`
- `GET /api/presence/preview/not-a-real-token`: `404 not_found`

CORS for `https://your-presence.vercel.app` is present on the public setup request route and auth-protected admin/owner routes.

## Smoke and Regression

Commands run:

```powershell
curl.exe -i https://anu-back-end.vercel.app/health
curl.exe -i https://anu-back-end.vercel.app/readiness
curl.exe https://anu-back-end.vercel.app/api/presence/customisation/manifest
curl.exe "https://anu-back-end.vercel.app/api/presence/customisation/recommendations?archetype=artist"
curl.exe -X POST https://anu-back-end.vercel.app/api/presence/customisation/preview-seed ...
curl.exe -X POST https://anu-back-end.vercel.app/api/presence/setup-requests ...
curl.exe https://anu-back-end.vercel.app/api/presence/public/rooms-consultant
curl.exe https://anu-back-end.vercel.app/api/presence/public/rooms-consultant/qr
curl.exe https://anu-back-end.vercel.app/api/presence/public/rooms-consultant/vcard
python scripts\presence_rooms_v1_smoke.py
python -m py_compile app\models.py app\api\presence.py app\services\presence_customisation_manifest.py app\services\presence_service.py
python -m pytest tests\test_presence_customisation_manifest.py -q
python -m pytest tests\test_presence_nodes.py -q
python -m pytest -q
node --experimental-strip-types lib\presence\url.test.ts
cmd /c npm run typecheck
cmd /c npm run build
git diff --check
```

Results:

- Presence Rooms deployed smoke: passed, auth-dependent hidden checks skipped
- Backend compile: passed
- Backend customisation tests: `9 passed`
- Backend Presence tests: `79 passed`
- Full backend suite: `246 passed`
- Frontend URL helper test: `2 passed`
- Frontend typecheck: passed
- Frontend build: passed with existing multiple-lockfile workspace-root warning
- `git diff --check`: passed with an existing line-ending warning before the Studio frontend was committed

## Readiness Judgement

Backend Studio intake is production-ready for controlled use:

- Actual Studio payload shape is accepted
- important customisation selections are normalized and raw choices preserved
- setup request remains private and unpublished
- public setup remains unauthenticated
- owner/admin routes remain protected
- backend public canonical, QR, and vCard use the active frontend host

Remaining blockers:

- Full admin lifecycle proof is blocked without control-plane/operator auth.
- Private metadata preservation in hosted production cannot be inspected without auth or DB access; local backend tests cover it.

Recommendation:

- Go for controlled Studio intake pilots and operator review.
- Hold full admin lifecycle signoff until an operator auth header is provided for list/detail/create-preview/publish/archive proof.
