# Presence DNA Persistence Overlay Retirement Evidence

Date: 2026-05-29

Superseded by: `docs/program/evidence/presence-dna-enum-hardening-overlay-retirement/`.
This artifact records the earlier GGM-specific migration. The later hardening
pass retires the remaining demo overlay module entirely.

## Scope

This pass retires the GGM-specific frontend DNA demo overlay dependency. The cultural-community differentiation for `ggm-christina-goddard` now resolves from persisted-style Presence DNA:

- backend contract: `PresenceNode.node_metadata["presence_dna"]`,
- public API shape: serialized as `metadata.presence_dna`,
- frontend fixture mirror: `PresenceNode.metadata.presence_dna`,
- resolver priority after the later hardening pass: `backend_persisted > inferred`.

No public Studio Room route, TemplateKit publishing path, hosted AI path, or database migration was added.

## Persistence Contract

Chosen location: existing `PresenceNode.node_metadata["presence_dna"]`.

Why this boundary:

- it already exists on `PresenceNode`,
- it is normalized by `normalize_presence_dna`,
- it is accepted through create/update payloads as `presence_dna` or `metadata.presence_dna`,
- it is owner/control-plane compatible,
- it requires no schema migration,
- it is already exposed to public Presence rendering through the existing `metadata` payload while custom/internal metadata remains sanitized.

## GGM Migration

Backend seed `seed_presence_dna_demo_data()` now includes `ggm-christina-goddard` with cultural-community archive DNA:

- `practice.field = culture`,
- `practice.practice_mode = program`,
- `visual.palette_mode = cultural`,
- `visual.image_treatment = archive`,
- `composition.entry_type = archive_first`,
- `composition.navigation_mode = story_path`,
- `signature.signature_module = archive_wall`,
- `goal.primary_goal = grant_readiness`.

The frontend GGM demo profile now mirrors this persisted shape at `metadata.presence_dna`.

## Overlay Status

`presence-app/lib/presence/dna/demoOverlays.ts` no longer contains a `ggm-christina-goddard` entry. In the later hardening pass, the remaining local demo overlay entries were also migrated into backend-seeded / fixture-backed `metadata.presence_dna` and the overlay module was removed.

The new frontend overlay test disables demo overlays and proves GGM still resolves as `backend_persisted` with `archive_wall` cultural-community DNA.

## Safety Results

- Migration required: no.
- Public route behavior: unchanged.
- Studio Room public publishing: not added.
- Draft/private DNA leakage: backend test proves private draft DNA returns 404 on the public route.
- Payload hygiene: public GGM metadata exposes `presence_dna` but not editor/internal/private fields.
- Private contact mapping: no broad `email`, `phone`, `contactEmail`, or `contactPhone` mapping added.
- Candidate TemplateKit behavior: unchanged; `underground-dj-portal` remains candidate/internal only.
- Runtime AI/LLM: no runtime AI/LLM code paths added.

## Validation Results

- `python -m pytest tests\test_presence_dna_persistence.py`: pass, 9 tests.
- `python -m pytest tests\test_presence_dna_persistence.py tests\test_presence_template_kit_draft_persistence.py tests\test_presence_studio_editor_foundation.py`: pass, 29 tests.
- `npx.cmd tsx --test lib\presence\dna\overlay.test.ts`: pass, 1 test.
- `npx.cmd tsx --test lib\presence\uniqueness.test.ts`: pass.
- `npx.cmd tsx --test lib\presence\studio-room\*.test.ts`: pass, 59 tests.
- `npx.cmd tsx --test lib\presence\**\*.test.ts`: pass, 81 tests.
- `npm.cmd run typecheck`: pass.
- `npm.cmd run build`: pass; Next.js emitted the pre-existing multiple-lockfile workspace-root warning.
- `git diff --check`: pass.
- Runtime AI/LLM scan over changed runtime areas: pass, no matches.
- Public route isolation grep over public app/components surfaces: pass, no matches.
- GGM demo overlay dependency grep: pass, no active `demoOverlays.ts` dependency remains after the later hardening pass.
- Changed-hunk broad contact/private field grep: pass, no changed-line matches. A wider file scan still hits existing backend contact/enquiry code outside this DNA change.

## Known Limitations

- Backend DNA enum validation is hardened in the later pass.
- The remaining six local demo overlay entries have been retired in the later pass.
- Browser E2E was deferred in this DNA pass and is now covered by `docs/program/evidence/presence-studio-browser-owner-lifecycle-smoke/`.
