# Presence Studio Backend Proof - 2026-05-20

Backend tested: `https://anu-back-end.vercel.app`

Frontend hosts observed:

- Current Studio host: `https://your-presence.vercel.app`
- Legacy Presence Rooms smoke host: `https://presence-gilt.vercel.app`

No secrets, bearer tokens, mail credentials, database URLs, or control-plane
shared secrets are included in this evidence bundle.

## Summary

The hosted backend is running the Customisation Manifest and Setup Request
Lifecycle contracts behaviorally consistent with commits `205ce71` and
`e80dcc4`.

The public Studio intake route is live and accepts RoomGraph-ready
customisation selections without owner auth. A controlled setup request was
created and remained a setup request; it did not publish a public Presence.

During the proof, one backend hardening patch was added locally and pushed as
`574f7ca preserve studio setup intake metadata`. That patch preserves the new
Studio intake fields in `metadata_json.studio_intake` and maps
`what_they_are_building` to `description` when no explicit description is
supplied. Production did not appear to have that patch yet at the moment of the
hosted submission, because the response returned `description: null` for a
payload that supplied `what_they_are_building`.

## Deployment And Migration Evidence

`GET /health` returned `200` with `ready: true`, database configured, and
database dependency `ok`.

`GET /readiness` returned `200` with `ready: true` and database `ok`.

`GET /api/presence/customisation/manifest` returned `200` with
`schema_version: presence-customisation-manifest-v1`.

`GET /api/presence/customisation/recommendations?archetype=artist` returned
`200` with artist recommendations including `rooms-gallery-painter` and
`rooms-underground-dj`.

The migrations were not introspected directly through `information_schema`.
They were behaviorally verified:

- `20260520_presence_customisation_manifest_v1.sql`: manifest endpoints,
  preview seed, and setup request customisation persistence work.
- `20260520_presence_setup_request_lifecycle_pipeline.sql`: setup request
  creation works, lifecycle admin routes exist, and protected lifecycle actions
  return structured auth errors instead of 404/500.

## CORS

`OPTIONS /api/presence/setup-requests` from
`https://your-presence.vercel.app` returned `200` with:

- `Access-Control-Allow-Origin: https://your-presence.vercel.app`
- `Access-Control-Allow-Methods` including `POST`
- `Access-Control-Allow-Headers` including `authorization` and `content-type`

`OPTIONS /api/presence/admin/setup-requests` and
`OPTIONS /api/presence/owner/beta/start` also returned CORS grants for
`https://your-presence.vercel.app`.

## Public Setup Request Proof

One controlled request was submitted:

- Display name: `ZZ Studio Backend Proof 2026-05-20`
- Email and phone: redacted from evidence
- Notes: clearly labelled as controlled backend proof and not to publish
- Archetype: `artist`
- Room world: `rooms-gallery-painter`
- Engagement dynamic: `chamber_walk`
- Motion profile: `calm`
- Object skin pack: `gallery_frame_pack`
- Atmosphere pack: `quiet_gallery`

Result:

- HTTP `201`
- `status: submitted`
- `presence_status: setup_request`
- `customisation_manifest_version: presence-customisation-manifest-v1`
- `customisation.resolved.room_world: rooms-gallery-painter`
- No public Presence was published.

Production field preservation gap observed:

- The request supplied `what_they_are_building`.
- The public response returned `description: null`.
- This means production was still on the e80dcc4 intake mapping at proof time,
  not the newly pushed `574f7ca` patch.

Local coverage now verifies the intended Studio field mapping:

- `phone` -> `metadata_json.studio_intake.phone`
- `what_they_are_building` -> `description` fallback and
  `metadata_json.studio_intake.what_they_are_building`
- `references` -> `links` fallback and
  `metadata_json.studio_intake.references`
- `do_not_wants` -> `metadata_json.studio_intake.do_not_wants`
- `consent_to_contact` -> `metadata_json.studio_intake.consent_to_contact`
- submitted manifest version/snapshot -> `metadata_json.studio_intake`

## Preview Seed Proof

`POST /api/presence/customisation/preview-seed` with:

```json
{
  "archetype": "artist",
  "room_world": "rooms-gallery-painter",
  "engagement_dynamic": "chamber_walk",
  "atmosphere_pack": "quiet_gallery",
  "object_skin_pack": "gallery_frame_pack",
  "motion_profile": "calm"
}
```

returned:

- HTTP `200`
- `schema_version: presence-roomgraph-preview-seed-v1`
- `room_graph.schemaVersion: presence-roomgraph-v1`
- `needs_review: false`
- no publication side effect

## Admin Lifecycle Proof

Full hosted admin lifecycle proof is blocked because no usable hosted
control-plane Authorization header or shared-secret grant was available in this
session.

Verified without bypassing auth:

- `GET /api/presence/admin/setup-requests` returns `401 auth_required`
- `POST /api/presence/admin/setup-requests/1/create-preview` returns
  `401 auth_required`
- `POST /api/presence/owner/beta/start` returns `401 auth_required`
- `GET /api/presence/preview/not-a-real-token` returns structured `404`

The backend routes exist and enforce auth; create-preview, publish, and archive
were not executed against production.

## Negative Tests

- Invalid customisation setup request returned `422 validation_error` with
  correction hints.
- Unauthenticated admin list returned `401 auth_required`.
- Unauthenticated create-preview returned `401 auth_required`.
- Invalid preview token returned structured `404`.
- Owner beta route without auth returned `401 auth_required`.
- Public setup route remained unauthenticated and returned `201` for a valid
  controlled request.

## Public Presence Regression Checks

Backend checks remained green:

- `GET /api/presence/public/nodes?limit=50` returned `200`, total `6`
  including the five demo rooms plus one existing public node.
- `GET /api/presence/public/rooms-consultant` returned `200` with room fields.
- `GET /api/presence/public/rooms-consultant/qr` returned `200`.
- `GET /api/presence/public/rooms-consultant/vcard` returned `200`.

Deployment origin gap:

- `https://presence-gilt.vercel.app/presence/rooms-independent-artist`
  returned `404 DEPLOYMENT_NOT_FOUND`.
- `https://your-presence.vercel.app/presence/rooms-independent-artist`
  returned `200`.
- The `your-presence` page still emits canonical metadata pointing to
  `https://presence-gilt.vercel.app/presence/rooms-independent-artist`.
- Backend QR and vCard still target `https://presence-gilt.vercel.app`.

Because of this, the old deployed smoke script does not currently pass:

- Against `presence-gilt`: frontend route is gone.
- Against `your-presence`: QR target does not match the active frontend base.

This is a deployment configuration/canonical origin issue, not a public API
read failure.

## Commands Run

Local:

```powershell
python -m py_compile app\models.py app\api\presence.py app\services\presence_customisation_manifest.py app\services\presence_service.py
python -m pytest tests\test_presence_customisation_manifest.py -q
python -m pytest tests\test_presence_setup_request_lifecycle.py -q
python -m pytest -q
git diff --check
git push origin HEAD:feature/presence-ecosystem-alpha
```

Hosted proof used `curl.exe` against:

- `/health`
- `/readiness`
- `/api/presence/customisation/manifest`
- `/api/presence/customisation/recommendations?archetype=artist`
- `/api/presence/customisation/preview-seed`
- `/api/presence/setup-requests`
- `/api/presence/admin/setup-requests`
- `/api/presence/admin/setup-requests/1/create-preview`
- `/api/presence/preview/not-a-real-token`
- `/api/presence/owner/beta/start`
- `/api/presence/public/nodes?limit=50`
- `/api/presence/public/rooms-consultant`
- `/api/presence/public/rooms-consultant/qr`
- `/api/presence/public/rooms-consultant/vcard`

## Local Regression Result

- `py_compile`: passed
- `tests/test_presence_customisation_manifest.py`: `8 passed`
- `tests/test_presence_setup_request_lifecycle.py`: `6 passed`
- full backend suite: `244 passed`
- `git diff --check`: passed

Known warnings:

- SQLAlchemy `Query.get()` legacy warnings.
- pytest cache permission warning on `.pytest_cache`.

## Readiness Judgement

Studio public intake backend:

- Ready after deploying `574f7ca` for full Studio field preservation.
- Hosted e80dcc4 accepts setup requests and customisation selections now, but
  did not preserve `what_they_are_building` as `description` at proof time.

Manifest and preview seed:

- Ready.

Admin lifecycle:

- Route/auth contract is present.
- End-to-end hosted create-preview/publish/archive is blocked until a real
  control-plane auth grant is provided.

Public Presence regression:

- Backend reads, QR, and vCard work.
- Active frontend/canonical origin mismatch must be corrected before public
  route/QR smoke can be called fully green.

Recommendation:

- Go for frontend Studio integration against public setup intake once
  `574f7ca` is deployed.
- Hold admin lifecycle go-live until control-plane auth is available for
  hosted proof.
- Hold public QR/canonical signoff until `PRESENCE_PUBLIC_ORIGIN` or equivalent
  deployed origin is aligned to `https://your-presence.vercel.app`, or the
  intended canonical host is confirmed.
