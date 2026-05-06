# Presence Nodes Launch Checklist

## Local Setup

1. Apply database migration:

```bash
node scripts/apply-migrations.js
```

2. Seed demo data:

```bash
cd flora-fauna/backend
flask seed-presence
```

3. Start backend and frontend:

```bash
cd flora-fauna/backend
flask --app app.py run
cd ../../frontend-next
npm run dev
```

## Environment Variables

- Backend: `SECRET_KEY`, `JWT_SECRET_KEY`, `CONTROL_PLANE_SHARED_SECRET`, `CONTROL_PLANE_HOSTS`, database URL settings.
- Frontend: `NEXT_PUBLIC_SITE_URL`, `CORE_API_ORIGIN`, `NEXT_PUBLIC_API_BASE`, control-host settings already used by the control plane.

## Preflight

- Backend tests pass for `tests/test_presence_nodes.py`.
- Frontend typecheck passes.
- Frontend tests pass for `src/test/presenceNodes.test.tsx`.
- `npm run build` passes.
- Smoke script succeeds against local or hosted environment:

```bash
python scripts/presence_nodes_smoke.py
```

Required smoke env:

- `PRESENCE_SMOKE_CORE_BASE`
- `PRESENCE_SMOKE_CONTROL_TOKEN`
- `PRESENCE_SMOKE_CONTROL_SECRET` if configured
- `PRESENCE_SMOKE_TENANT_ID`

## Pilot Gate

- Verify `/p/<slug>` on mobile and desktop.
- Verify `profile_card`, `practitioner_profile`, `artist_gallery`, and `minimal_portal` pages do not collapse into the same visual treatment.
- Verify unpublished nodes return 404.
- Verify published unlisted nodes are accessible by exact slug and not exposed through control-only listings publicly.
- Verify enquiry privacy copy and consent.
- Verify selected works and collections can be edited before artist/gallery pilot delivery.
- Verify control-host-only access to `/control/presence`.
- Verify control audit events for create/update/publish/unpublish/archive/enquiry status changes.
- Replace alpha QR SVG with scanner-grade QR before public self-serve launch.
