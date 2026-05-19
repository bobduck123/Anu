# Presence DNA Pass 2 — Persistence + Full Authored Effect

**Status:** Pass 2 complete. Presence DNA is production-real (persisted +
serialized by the Flask backend). Painter ships `GalleryWall`. Consultant
ships `QuoteOracle`. Owners can inspect/edit raw DNA from Studio.

**Branch:** `feature/presence-ecosystem-alpha`
**Date:** 2026-05-19

---

## 1. What landed

| Priority | Outcome |
|---|---|
| 1. Backend persistence | ✓ `node_metadata` JSONB column on `presence_node`, migration, validator, serializer, owner+control PATCH path, 6 backend tests. |
| 2. Seed six DNA rooms | ✓ `seed_presence_dna_demo_data()` writes all six slugs with rich content + `metadata.presence_dna`. Idempotent. Wired into `seed-presence` CLI and `ALPHA_SEED`. |
| 3. GalleryWall (painter) | ✓ Museum-curated hanging with paper-edged frames + museum-label captions. Replaces the editorial works grid when `dna.signature.signature_module === "gallery_wall"`. |
| 4. QuoteOracle (consultant) | ✓ Hero-sized rotating quote with selectable attribution strip. Cycles every ~9s, pauses on hover/focus, disabled under reduced-motion. |
| 5. Studio DNA editor | ✓ New `/studio/[id]/dna` route. View, edit raw JSON, client-side structural validation, save via owner PATCH. Provenance badge. |
| 6. QA automation | ✓ Uniqueness test extended with required-field assertions + no-`room_type`-in-selector regression. Backend tests cover persistence, update, invalid shape, oversize, idempotency, carpenter proof case. |
| 7. Verification | ✓ npm typecheck, npm build, backend pytest (persistence + regression), uniqueness check, browser verification of painter + consultant + carpenter rooms. |

---

## 2. Files changed

**Backend (5):**
- `flora-fauna/backend/migrations/versions/20260519_presence_dna_metadata.sql` — adds `node_metadata` JSONB column + GIN index. Safe-additive.
- `flora-fauna/backend/app/models.py` — `PresenceNode.node_metadata` JSON column.
- `flora-fauna/backend/app/services/presence_service.py` — `normalize_presence_dna()`, `normalize_presence_metadata()`, payload validator branch, serializer exposes `metadata`, `seed_presence_dna_demo_data()` with full content for 6 slugs.
- `flora-fauna/backend/app/api/presence_owner.py` — `metadata` and `presence_dna` added to owner-mutable whitelist.
- `flora-fauna/backend/app/__init__.py` — `seed-presence` CLI and `_seed_alpha_data` call `seed_presence_dna_demo_data()` alongside the legacy seed.

**Backend tests (1):**
- `flora-fauna/backend/tests/test_presence_dna_persistence.py` — 6 tests (create, update, invalid shape, oversize, seed idempotency, carpenter proof case).

**Frontend (9):**
- `presence-app/lib/api/types.ts` — `PresenceNode.metadata` typed permissively.
- `presence-app/lib/presence/feature.ts` — env flags `NEXT_PUBLIC_DISABLE_PRESENCE_DEMO_OVERLAY` and `NEXT_PUBLIC_DISABLE_PRESENCE_DEMO_PROFILES`.
- `presence-app/lib/presence/dna/overlay.ts` — demo overlay respects feature flag.
- `presence-app/lib/presence/demo/fetch.ts` — demo profile fallback respects feature flag.
- `presence-app/components/presence/signatures/GalleryWall.tsx` — new signature module.
- `presence-app/components/presence/signatures/QuoteOracle.tsx` — new signature module.
- `presence-app/components/presence/signatures/registry.ts` — both marked implemented.
- `presence-app/components/presence/blueprints/EditorialIdentityRoom.tsx` — signature-module routing: gallery_wall → GalleryWall, quote_oracle → QuoteOracle.
- `presence-app/app/globals.css` — CSS for GalleryWall, QuoteOracle, and Studio DNA editor.

**Studio (3):**
- `presence-app/components/studio/PresenceDnaPanel.tsx` — view/edit/save with provenance, validation, and reset.
- `presence-app/app/(studio)/studio/[id]/dna/page.tsx` — new route.
- `presence-app/components/studio/StudioShell.tsx` — DNA nav tab.

**Frontend tests (1):**
- `presence-app/lib/presence/uniqueness.test.ts` — extended with required-field checks per room and no-`room_type`-in-selector regression.

**Docs (1):**
- `docs/PRESENCE_DNA_PASS_2_REPORT.md` — this file.

---

## 3. Backend DNA persistence — shape

DNA is stored at:
```jsonc
presence_node.node_metadata = {
  "presence_dna": {
    "entity":      { "entity_type": "...", "public_name": "...", "relationship_to_work": "..." },
    "practice":    { "field": "...", "practice_mode": "...", "work_rhythm": "..." },
    "audience":    { "primary_audience": "...", "audience_temperature": "...", "decision_need": "..." },
    "goal":        { "primary_goal": "...", "secondary_goals": [...], "conversion_style": "..." },
    "personality": { "temperament": "...", "energy": "...", "status_signal": "..." },
    "proof":       { "proof_type": [...], "proof_density": "...", "proof_position": "..." },
    "visual":      { "references": [...], "palette_mode": "...", "texture": "...", "image_treatment": "..." },
    "composition": { "entry_type": "...", "section_rhythm": "...", "navigation_mode": "..." },
    "signature":   { "signature_module": "...", "signature_intensity": "..." },
    "source":      "backend_persisted",
    "notes":       []
  },
  // forward-compatible: other keys (e.g. before_after_pairs) live alongside.
}
```

Validator (`normalize_presence_dna`) is permissive about category contents
but strict about shape:
- top-level must be an object
- each known category (`entity`, `practice`, etc.) must be an object
- `source` (if set) must be one of the four documented sources
- `notes` (if set) must be a list of strings
- serialized size capped at 16 KiB
- whole `node_metadata` capped at 64 KiB

Per-enum validation is intentionally deferred — the frontend types
remain the canonical vocabulary. A future pass can add server-side enum
checking against a shared schema.

---

## 4. Public API — what changed

The public response `/api/presence/public/<slug>` now includes:

```jsonc
{
  "data": {
    // ... existing fields ...
    "metadata": { "presence_dna": { ... } | null } | null
  }
}
```

`metadata` is `null` for nodes with no persisted DNA. The frontend
`resolvePresenceDna(node)` reads from `metadata.presence_dna` at
highest priority; if missing, falls through to demo_overlay (if env
flag permits) and finally inferred.

---

## 5. Retiring the demo layer

The demo overlay (`lib/presence/dna/demoOverlays.ts`) and demo profile
fallback (`lib/presence/demo/profiles.ts`) are still present so the six
demo URLs continue to work in environments where the backend hasn't
been seeded yet.

Two feature flags now gate them; both default OFF (= "demo layers
active", Pass 1 behaviour):

| Flag | Effect when set |
|---|---|
| `NEXT_PUBLIC_DISABLE_PRESENCE_DEMO_OVERLAY=true` | `demoDnaForSlug()` returns null. Resolver only reads persisted DNA or infers. |
| `NEXT_PUBLIC_DISABLE_PRESENCE_DEMO_PROFILES=true` | `fetchDemoOrPublicNode()` re-raises on backend 404 instead of falling through to a fixture. |

**Recommended production switch order:**
1. Run migration `20260519_presence_dna_metadata.sql`.
2. Run `python -m flask --app app seed-presence` (or set `ALPHA_SEED=true`).
3. Verify each of the six `/p/<slug>` URLs renders correctly with the backend serving real data.
4. Set both env flags to `true` in the frontend deployment.
5. Re-verify all six rooms render identically (DNA now resolves from `backend_persisted` rather than `demo_overlay`).
6. Once stable in production, delete `lib/presence/dna/demoOverlays.ts`, `lib/presence/demo/*`, and remove the feature flag (the resolver becomes a two-step chain).

---

## 6. Verification results

| Check | Result |
|---|---|
| `npm run typecheck` | ✓ 0 errors |
| `npm run build` | ✓ Next 16 / Turbopack. New `/studio/[id]/dna` route present in build manifest. |
| `npx tsx lib/presence/uniqueness.test.ts` | ✓ All pairs distinct. Carpenter proof case 0.057. Required-field check passes for all 6 rooms. No-`room_type` regression passes. |
| `python -m pytest tests/test_presence_dna_persistence.py` | ✓ 6/6 pass. |
| `python -m pytest tests/test_presence_nodes.py` | ✓ 77/77 pass — no regression from new column or serializer change. |
| Browser: painter renders `GalleryWall` | ✓ Museum-style "On the wall" with 5 pieces (hero piece skipped). |
| Browser: consultant renders `QuoteOracle` | ✓ Hero-sized active quote, attribution strip with 3 entries, no console errors. |
| Browser: carpenters distinct | ✓ Material studio + cork board on `rooms-material-carpenter`; trust pills + before/after on `rooms-local-carpenter`. |
| Reduced-motion compliance | Preserved — QuoteOracle disables cycling under `prefers-reduced-motion`; existing behaviour CSS rules unchanged. |

---

## 7. Pass 2 success criteria — receipt

| Criterion | Status |
|---|---|
| Presence DNA is persisted and serialized by the backend. | ✓ JSONB column + validator + serializer + tests. |
| Temporary overlay no longer necessary for the six demo rooms (or has documented safe removal switch). | ✓ Two env flags + step-by-step retirement procedure in §5. |
| Painter has a real `GalleryWall` signature. | ✓ Live in the browser. |
| Consultant has a real `QuoteOracle` signature. | ✓ Live in the browser. |
| Admin can inspect/edit/validate raw DNA. | ✓ `/studio/[id]/dna` with view, edit, validate, save, reset, provenance badge. |
| All six rooms still pass uniqueness and Beauty QA. | ✓ Uniqueness 0/15 pairs over threshold. Required-field check passes for all 6. |
| Two-carpenter proof case remains far below threshold. | ✓ 0.057 (vs 0.70 threshold). Backend test also asserts persisted DNA differs across blueprint/signature/palette/entry_type/status_signal. |

---

## 8. Remaining gaps (acknowledged)

1. **Hosted environment deploy.** Pass 2 is verified locally and against
   the test suite. The migration + seed must still be run in deployed
   environments. Procedure documented in §5.

2. **Per-enum DNA validation on the backend.** The validator enforces
   structure but trusts the frontend's enum vocabulary. A future pass
   could ship a shared schema (e.g. JSON Schema generated from the TS
   types) and validate strictly server-side.

3. **DNA editor UX is JSON-only.** Deliberate per the Pass 2 brief
   ("do not build a giant editor yet"). Next-pass UX work: per-category
   forms with enum dropdowns, undo, side-by-side preview, regenerate
   from inferred.

4. **Owner permissions for DNA edits.** Today any owner can edit DNA on
   any of their own nodes. If we want tiered plans (e.g. "DNA editing is
   a premium feature"), gating belongs in `_filter_owner_node_update_payload`.

5. **`seed_presence_dna_demo_data()` writes to a non-namespaced tenant.**
   The seed creates rooms under the existing `mudyin` tenant the
   legacy seed already uses. White-label tenants will want their own
   demo set or none at all.

6. **No backend enum updates for new DNA fields.** Existing constants
   like `PRESENCE_ROOM_TYPES` and `PRESENCE_THEME_PRESETS` still gate
   the legacy `room_type`/`theme_preset` columns. The DNA validator
   accepts any value for the new DNA enums; production tightening
   should happen in a separate pass with a clear cutover.

---

## 9. Exact commands

```bash
# Backend — apply migration, seed, run tests
cd C:/Dev/Flora_fauna/flora-fauna/backend
# Either run the SQL migration directly or via your migration tool:
#   psql $DATABASE_URL -f migrations/versions/20260519_presence_dna_metadata.sql
python -m flask --app app seed-presence
python -m pytest tests/test_presence_dna_persistence.py -q
python -m pytest tests/test_presence_nodes.py -q

# Frontend — typecheck, build, uniqueness assertions, dev server
cd C:/Dev/Flora_fauna/presence-app
npm run typecheck
npm run build
npx --yes tsx lib/presence/uniqueness.test.ts
npm run dev    # http://localhost:3001

# Retire demo layers in deployed environments (after seed verified):
# Set in Vercel env or .env.local:
#   NEXT_PUBLIC_DISABLE_PRESENCE_DEMO_OVERLAY=true
#   NEXT_PUBLIC_DISABLE_PRESENCE_DEMO_PROFILES=true
```

---

## 10. Successor agent — start here

Next-pass candidates, in order of leverage:

1. **Ship the migration + seed to staging/production.** Verify all six
   slugs serve identical pages from `backend_persisted` DNA, flip the
   env flags, delete the demo layer.

2. **Per-category DNA form editor** to replace the JSON textarea. Use
   the typed DNA model in `lib/presence/dna/types.ts` to generate enum
   dropdowns automatically. Keep raw JSON as an "advanced" tab.

3. **Ship two more high-leverage signature modules**: `audio_strip` for
   the DJ room (so audio is a first-class identity layer, not nested in
   a section) and `availability_panel` for the healer.

4. **Ship two more blueprints**: `civic` and `archive` — both unlock
   different worlds from the six already shipped.

5. **Visual regression coverage** with Playwright (already in
   devDependencies). Snap each of the six rooms at desktop/mobile and
   with reduced-motion enabled. CI gate so we know exactly when a DNA
   change shifts what a room looks like.
