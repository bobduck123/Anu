# Claude Faithful GGM Pass Summary

Date: 2026-05-23

## Local visual pass read

Claude's local renderer pass is recorded in
`docs/program/evidence/presence-ggm-faithful-recreation-proof/`.

| Item | Summary |
|---|---|
| Renderer key | `ggm-faithful-room-v1` |
| Claimed local visual score | `9 / 10` |
| Local verdict | GO for the local visual fidelity gate only |
| Production verdict entering this pass | NO-GO until hosted cutover proof |

## Renderer files

The local pass created the GGM source content, renderer activation code, scoped
GGM components and CSS, and artwork assets under:

- `presence-app/lib/presence/ggm/`
- `presence-app/components/presence/ggm/`
- `presence-app/public/ggm/`

It edited the Presence renderer chain, RoomKey entry dispatch, GGM work-detail
route, gallery card surface, and demo fixture metadata.

## Route surface

The renderer pass affects only these route families when a Room resolves to the
GGM renderer key or the conservative GGM signature fallback:

- `/p/[slug]`
- `/presence/[slug]`
- `/p/[slug]/works/[workId]`
- `/r/[token]`
- `/gallery`

Studio and World route implementations were not part of the visual renderer
pass.

## Local evidence

Claude captured local desktop and mobile screenshots for the GGM Room, work
detail, RoomKey state, gallery card, and source-site comparisons. The local
evidence explicitly stated that the hosted frontend, real RoomKey, and owner
auth gates were still pending.

## Known bounded gaps

- Licensed Haffer XH is not present; the renderer uses the documented fallback.
- Three.js liquid morph is substituted with crossfade/parallax treatment.
- The vendor Osmo loader and FX cursor are not reproduced.
- The local pass alone did not prove the hosted Room record, hosted metadata, or
  owner auth.
