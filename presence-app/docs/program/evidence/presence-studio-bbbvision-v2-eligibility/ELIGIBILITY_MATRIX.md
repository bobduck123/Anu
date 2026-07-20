# BBB Studio V2 eligibility matrix

## Selector map

| Question | Finding |
|---|---|
| Which page chooses V2 vs non-V2 editor? | `app/(studio)/studio/[id]/editor/page.tsx` chooses between `PresenceStudioV2Editor` and `PresenceStudioEditorApp`. |
| Which predicate was used before this pass? | `shouldUsePresenceStudioV2(...)` from `lib/presence/studio-v2/feature.ts`. |
| Which data did that predicate see at page level? | Owner-node fields from `useOwnerNode`: room id, slug, `renderer_key`, `editable_config`, and metadata. |
| What does the shared predicate require? | Global V2 flag, V2 renderer/config signal, and pilot eligibility. |
| Where does public projection use the shared predicate? | `lib/presence/studio-v2/publicProjection.ts` via `studioV2PublicRoomFromPresenceNode`, then `lib/presence/render/publicPayload.ts`. |
| Why not alter the shared predicate directly? | It is used by public rendering; broadening it could change anonymous public output. |
| What was changed? | Added editor-only eligibility for explicit room `29 / bbbvision`; public projection remains on the shared predicate. |

## GGM vs BBB read-only comparison

This is a redacted shape comparison from owner-bound GET-only hosted diagnostics. No tokens, account identifiers, cookies, draft payload contents, screenshots, or private values are recorded here.

| Field | GGM room 11 | BBB room 29 |
|---|---:|---:|
| Owner detail GET | 200 | 200 |
| Editor overview GET | 200 | 200 |
| Draft GET | 200 | 200 |
| Public `/p/[slug]` | 404/private after containment | 200 |
| Public `/presence/[slug]` | 404/private after containment | 200 |
| `node.renderer_key` | null | null |
| `node.editable_config` at owner-node level | absent | absent |
| Metadata V2 renderer signal | present | absent |
| Editor draft exists | yes | no |
| Editor published exists | yes | yes |
| Published `renderer_key` | `presence-studio-v2-room` | `presence-studio-v2-room` |
| Published `scene_config.studio_v2` | present | present |
| Published chamber count | 6 | 3 |
| Published `content_config.studio_v2` | present | present |
| Published object count | 16 | 22 |
| Composition/layout fields | draft has composition; published shape sufficient for V2 adapter | published shape sufficient for V2 adapter |
| Asset count | 8 | 20 |

## Eligibility answers

| Question | Answer |
|---|---|
| Is room `11` explicitly allowed? | It is eligible because owner-node metadata carries the V2 renderer signal and the deployed V2 flag/pilot setup supports it. |
| Is room `29` explicitly excluded? | No explicit exclusion was found. It was missing page-level V2 selector data. |
| Does room `29` have `scene_config.studio_v2` data? | Yes, in the editor published payload. |
| Does room `29` have `content_config.studio_v2` objects/chambers? | Yes, in the editor published payload. |
| Does room `29` fail because it is published? | No. `PresenceStudioV2Editor` loads `overview.draft ?? overview.published`. |
| Does room `29` fail because of missing draft shape? | No. A missing draft is acceptable for initial editor load from published config. |
| Does room `29` fail because of owner/backend policy? | No evidence of that; owner detail/editor/draft reads returned 200. |
| Does room `29` fail because of deployment mismatch? | No evidence of that; hosted GGM proves the deployed build can render Studio V2. |
| Root cause | Page-level editor selection happened before editor overview was loaded, and BBB's owner-node payload lacked V2 renderer/config/metadata signals. |

## Path decision

Path A — frontend/editor eligibility only.

BBB already has V2-compatible published editor data. The safest fix is an explicit editor/private-preview eligibility path for room `29 / bbbvision` while leaving shared public renderer eligibility unchanged.
