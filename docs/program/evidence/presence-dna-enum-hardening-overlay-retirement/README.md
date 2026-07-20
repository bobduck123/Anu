# Presence DNA Enum Hardening + Overlay Retirement Evidence

Date: 2026-05-30

## Scope

This pass retires the remaining frontend-only Presence DNA demo overlay fallback and hardens the backend `PresenceNode.node_metadata["presence_dna"]` contract.

No public Studio Room route, publishing path, hosted AI path, media embed support, or database migration was added.

## Overlay Retirement

Removed runtime overlay source:

- `presence-app/lib/presence/dna/demoOverlays.ts`

Former overlay slugs now resolve from backend-seeded or fixture-backed `metadata.presence_dna`:

- `rooms-underground-dj`
- `rooms-gallery-painter`
- `rooms-material-carpenter`
- `rooms-local-carpenter`
- `rooms-community-healer`
- `rooms-sharp-consultant`
- `ggm-christina-goddard`

Resolver priority is now `backend_persisted > inferred`. The local demo profile fixtures mirror the persisted backend shape so uniqueness and renderer behavior do not depend on frontend overlay injection.

## Backend Contract

Persistence location remains `PresenceNode.node_metadata["presence_dna"]`; migration required: no.

Backend validation now rejects:

- unknown top-level Presence DNA keys,
- unknown category fields,
- invalid enum values for persisted DNA categories,
- legacy `source = demo_overlay`,
- restricted/private/internal keys recursively,
- oversized or non-JSON-serializable payloads.

Public serialization now re-validates `metadata.presence_dna`; invalid legacy rows have `presence_dna` omitted from public metadata instead of leaking restricted nested keys.

## Accepted Enum Summary

Hardened fields include:

- `source`: `inferred`, `node_metadata`, `backend_persisted`
- `blueprint`: editorial/trust/proof/atmosphere/program/craft/archive/booking/commission/civic plus current demo-specific blueprints
- `motion`: current behavior presets and intensities
- `signature.signature_module` and `signature.signature_intensity`
- `visual.palette_mode`, `visual.texture`, `visual.image_treatment`
- `composition.entry_type`, `composition.section_rhythm`, `composition.navigation_mode`
- entity, practice, audience, goal, personality, and proof enum-bearing fields

`category`, `tags`, `notes`, public names, and visual references remain bounded public strings/lists to avoid overblocking future safe taxonomy.

## Safety Results

- Public route behavior: unchanged.
- Studio Room public publishing: not added.
- Candidate TemplateKit exposure: unchanged; `underground-dj-portal` remains candidate/internal only.
- Draft/private DNA leakage: private draft DNA remains hidden from public routes.
- Payload hygiene: public serializer strips/omits invalid restricted DNA.
- Private contact protections: broad contact fields are blocked in DNA validation; no new broad contact mapping was added.
- Runtime AI/LLM: no runtime AI/LLM code paths added.

## Validation Results

- `python -m pytest tests\test_presence_dna_persistence.py`: pass, 10 tests.
- `python -m pytest tests\test_presence_dna_persistence.py tests\test_presence_template_kit_draft_persistence.py tests\test_presence_studio_editor_foundation.py`: pass, 30 tests.
- `npx.cmd tsx --test lib\presence\dna\overlay.test.ts`: pass, 2 tests.
- `npx.cmd tsx --test lib\presence\uniqueness.test.ts`: pass.
- `npx.cmd tsx --test lib\presence\studio-room\*.test.ts`: pass, 59 tests.
- `npx.cmd tsx --test lib\presence\**\*.test.ts`: pass, 84 tests.
- `npm.cmd run typecheck`: pass.
- `npm.cmd run build`: pass; Next.js emitted the pre-existing multiple-lockfile workspace-root warning.
- `npx playwright test tests/e2e/presence-studio-room-owner-lifecycle.spec.ts --project=chromium`: pass, 1 test.
- `git diff --check`: pass.
- Public route isolation grep: pass, no Studio Room/editor/template draft imports in public route surfaces.
- Runtime AI/LLM changed-hunk scan: pass, no changed runtime AI references.
- Broad contact/private field changed-hunk grep: expected denylist-only matches for `email` and `phone` inside rejected DNA keys.
- Active demo overlay dependency grep: pass, no `demoOverlays.ts` import or `demoDnaForSlug` call remains.

Backend pytest emitted existing SQLAlchemy legacy warnings and a local pytest cache permission warning; tests still exited green.

## Known Limitations

- `category` and `tags` are bounded strings/lists, not fixed enums, by design.
- Historical docs may still mention earlier overlay phases; runtime code and current evidence mark the overlay as retired.
- Cross-browser browser lifecycle coverage remains deferred to the next Playwright pass.
