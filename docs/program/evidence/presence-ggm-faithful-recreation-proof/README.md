# GGM Faithful Recreation Recovery Proof

Date: 2026-05-22

## Summary

This recovery pass separates two gates:

1. Auth permanence needs the Supabase SSR proxy/session maintenance path and a
   deployed real-session smoke.
2. GGM visual fidelity needs a custom renderer implementation. The current
   generic pilot Room remains an onboarding contract proof, not faithful custom
   Presence proof.

## Auth Permanence Status

Local diagnosis and implementation are recorded in
`../presence-auth-permanence-recovery-proof/`. The frontend now contains a
Next proxy session refresh path and a real-session Playwright harness. Hosted
interactive GGM owner sign-in proof remains required before resuming the pilot.

## GGM Source Findings

- Source inspected: `C:\Dev\ggm`
- Source identity: Christina Kerkvliet Goddard watercolour portfolio
- Source stack: static HTML/CSS/JavaScript/JSON with static Vercel assumptions
- Source visual signature: paper gallery system plus artwork-first dither and
  liquid morph entry

See `GGM_STYLE_DNA.md` and `ggm_style_dna.json`.

## Current Room Gap

The current GGM Presence setup uses the normal `artist_studio` Room renderer
and pilot summary metadata. It does not express the source home stage, work
index/detail hierarchy, type system, art framing, or motion language. See
`GGM_VISUAL_GAP_REPORT.md`.

## Data And API Support

Backend support now uses existing Presence node metadata:

- owner/control metadata can store full `metadata.custom_presence.style_dna`,
  source references, renderer key, and fidelity metadata
- public Room metadata returns only explicit public custom fields and the
  `public_style_dna` subset as public `custom_presence.style_dna`
- public serialization omits operator-only source and fidelity metadata such as
  local source paths
- legacy Rooms without custom metadata continue through the existing renderer

## Files In This Evidence Set

- `GGM_STYLE_DNA.md`
- `ggm_style_dna.json`
- `GGM_VISUAL_GAP_REPORT.md`
- this `README.md`

Related spec:

- `docs/program/specs/CUSTOM_PRESENCE_INGESTION_AND_STYLE_DNA_SPEC_2026-05-22.md`

## Tests Run

```text
npm.cmd run typecheck
npm.cmd run build
python -m pytest tests\test_presence_dna_persistence.py
```

## Remaining Frontend Implementation Requirements

1. Implement a GGM custom renderer keyed by `ggm-faithful-room-v1`.
2. Use approved GGM work assets and content inventory as Room data/assets.
3. Preserve source artwork entry, work wall/detail rhythm, about/contact
   hierarchy, palette, type strategy, and mobile fallbacks.
4. Keep Presence enquiry, RoomKey, owner analytics, auth, and rollback
   contracts intact.
5. Capture screenshot parity and owner/operator approval evidence.

## Claude Handoff Prompt

Use this handoff for the faithful frontend pass:

```text
Implement the GGM faithful Presence Room renderer in C:\Dev\Flora_fauna.
Read docs/program/specs/CUSTOM_PRESENCE_INGESTION_AND_STYLE_DNA_SPEC_2026-05-22.md,
docs/program/evidence/presence-ggm-faithful-recreation-proof/GGM_STYLE_DNA.md,
docs/program/evidence/presence-ggm-faithful-recreation-proof/ggm_style_dna.json,
docs/program/evidence/presence-ggm-faithful-recreation-proof/GGM_VISUAL_GAP_REPORT.md,
and inspect the source site at C:\Dev\ggm.

Build a custom Presence renderer keyed by ggm-faithful-room-v1. The existing
generic GGM artist_studio Room is not visually acceptable. Preserve Christina
Kerkvliet Goddard as the first-viewport signal, use approved source artwork
media and source content hierarchy, translate the full-viewport artwork hero,
paper gallery palette, work index/detail rhythm, about/contact structure, and
mobile/reduced-motion behavior into Presence-native UI. Keep Presence RoomKey,
per-Room enquiry, owner analytics, auth guards, logout, World hidden/forming,
and non-realtime claims intact. Use metadata.custom_presence public style DNA
only for public rendering and do not expose local source paths. Add screenshot
parity evidence at desktop and phone widths and do not call the GGM pilot GO
until auth permanence hosted smoke and visual fidelity review pass.
```
