# Presence Ecosystem Launch Checklist

## Local Setup

- Backend: `cd flora-fauna/backend`
- Frontend: `cd frontend-next`
- Install dependencies using the repo-standard commands already used for the platform.
- Apply migration: run the platform migration workflow against the target database, including `20260505_presence_nodes_alpha.sql`.
- Seed data: run the Flask CLI seed command exposed in `app/__init__.py` for Presence templates/demo data, or call `seed_presence_templates()` / `seed_presence_demo_data()` in an app context.
- Confirm `qrcode==8.2` is installed in the backend environment.
- Configure owner app auth with the existing participant/Supabase JWT path.
- For launch v1 media, configure Presence direct upload storage and keep hosted image URLs as the advanced fallback.

## Verification Commands

```bash
cd flora-fauna/backend
python -m pytest tests\test_presence_nodes.py tests\test_health.py -q

cd frontend-next
cmd /c npm run typecheck
cmd /c npm run test -- src/test/presenceNodes.test.tsx --run
cmd /c npm run lint
cmd /c npm run build
```

## Hosted Smoke

```bash
PRESENCE_SMOKE_CORE_BASE=https://<core-host> \
PRESENCE_SMOKE_CONTROL_TOKEN=<control-jwt> \
PRESENCE_SMOKE_CONTROL_SECRET=<secret-if-required> \
PRESENCE_SMOKE_TENANT_ID=<tenant-node-id> \
python scripts/presence_nodes_smoke.py
```

Smoke covers: create/publish artist node, public view, enquiry, admin inbox/status update, collection/work, vCard, QR, create/publish tradie node, NFC hit, quote request, relationship ledger, quote update, variation, handover, unpublish.

If hosted credentials are unavailable, compile-check the script:

```bash
python -m py_compile scripts/presence_nodes_smoke.py
```

## Launch Gates

- Public `/p/<slug>` does not show unpublished/private/admin-only nodes.
- Public `/p/<slug>/works/<workId>` and `/p/<slug>/collections/<collectionId>` render only public visible child records.
- Owner `/app/*` screens load through `/api/presence/owner/*`, not the staff control-plane API.
- Public serializers do not include relationship ledger, quotes, invoice records, tenant internals, or admin IDs.
- Control routes require valid control-plane auth and Presence scopes.
- Basic, opportunity, professional, artist, practitioner, tradie, venue, and organisation templates render without broken states.
- Enquiry and quote request forms validate required fields and consent.
- NFC scan alone does not create a named connection.
- QR SVG route scans to the canonical public URL.
- Studio media slots upload JPG/PNG/WEBP images directly, reject unsafe/oversized files, and still allow hosted URLs as an advanced fallback.
- Documentation and smoke instructions are current.

## Pilot Template Readiness Gate

Use `PRESENCE_ECOSYSTEM_TEMPLATE_READINESS.md` as the creative pilot template gate.

The invite-only portfolio pilot is visually and structurally ready when these six templates are supported:

- Minimal Artist Portal
- Gallery Wall
- Editorial Portfolio
- Studio Practice
- Practitioner Presence
- Venue / Collective Presence

Current decision: all six are structurally supported with dedicated public front-end treatments. Remaining work is real pilot media/copy, final screenshot QA, and hosted smoke once credentials are available.
