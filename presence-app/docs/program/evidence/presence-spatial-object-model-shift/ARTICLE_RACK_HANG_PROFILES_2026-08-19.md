# Per-article rack hang profiles + hanger hardware

Date: 2026-08-19
Scope: Per-article rack hang profiles, article-specific hanger hardware, inspection profile selection
Status: **Internal authoring evidence only.** No component or candidate is admitted. No claim is made about Mobstar creative acceptance, public launch readiness, client self-serve readiness, commerce, multiplayer, publishing, backend persistence or production readiness. No public route, auth, tenant or publish behaviour changed.

Follows [ARTICLE_SPECIFIC_GARMENT_CARRIERS_2026-08-19](ARTICLE_SPECIFIC_GARMENT_CARRIERS_2026-08-19.md).

---

## 1. What the previous pass already had

Invisible carriers with separate alpha artwork planes; article-specific carrier *plane*
proportions (shirt 0.99 x 1.33, pant 0.55 x 1.56, shoe 0.90 x 0.58); artwork assignment UI;
carrier debug toggle; `rack-row` hanging garments upright; slot targeting and order controls;
article type in the geometry cache signature.

Its stated remaining issue: **a pant hung from the same rail point as a shirt.** Now that the
planes differed, the shared hang point was the most visible inconsistency.

## 2. What this pass added

| Area | Change |
|---|---|
| Hang profiles | Shared `SPATIAL_GARMENT_HANG_PROFILES` in `model.ts`, used by both the arrangement and the geometry template |
| Rail placement | `rack-row` applies per-article `railDrop`, `forwardOffset` and `rackScale` |
| Hardware | Three hardware kinds — hook-bar, clamp-bar, stand — built per article |
| Artwork centre | Now sourced from the shared profile so rail placement and carrier interior agree |
| Inspection | Article selects an existing interaction profile |
| Debug UI | Operator panel shows the hardware kind and rail drop for the selected garment |

The profile table lives in `model.ts` specifically so `lib` (arrangements) and `components`
(geometry) read the **same** numbers. A pant cannot hang low in one and high in the other.

## 3. Per-article hang profile table

| Article | railDrop | artworkCentreY | hardware | hardwareY | forwardOffset | rackScale | inspection profile |
|---|---|---|---|---|---|---|---|
| shirt | 0 | -0.02 | hook-bar | 0.39 | 0 | 1.00 | `rack-turn-outward` |
| pant | **-0.34** | -0.08 | **clamp-bar** | 0.45 | 0 | 1.00 | `rack-turn-outward` |
| shoe | **-0.62** | -0.24 | **stand** | -0.30 | **0.08** | **0.82** | `piece-inspect-near` |
| generic | 0 | -0.04 | hook-bar | 0.39 | 0 | 1.00 | `rack-turn-outward` |

Measured on an 8.4 x 4 x 1.8 m rack with the 1.05 x 1.7 x 0.2 m carrier:

| Article | Rail Y | Forward Z | Scale | Hardware | Hardware parts | Hardware Y | Artwork top |
|---|---|---|---|---|---|---|---|
| shirt | 0.70 | 0.00 | 1.00 | hook-bar | 2 | 0.66 | 0.63 |
| pant | **0.36** | 0.00 | 1.00 | clamp-bar | **4** | 0.77 | 0.65 |
| shoe | **0.08** | **0.08** | **0.82** | stand | 2 | -0.51 | -0.12 |
| generic | 0.70 | 0.00 | 1.00 | hook-bar | 2 | 0.66 | 0.65 |

**A pant now hangs 0.34 m lower than a shirt, and a shoe sits 0.62 m lower and 0.08 m forward
at 82% scale.** Generic is byte-identical to shirt, preserving prior behaviour.

## 4. Hanger hardware strategy

Three minimal, procedural hardware kinds. Hardware is genuinely visible — it is real physical
furniture — but it lives in the `rack-metal` material slot, is never an artwork layer and is
never the invisible carrier, so **it cannot become the garment silhouette**.

- **hook-bar** (shirt, generic) — a bar plus a hook. Two parts. Unchanged from Stage A.
- **clamp-bar** (pant) — a shorter bar, two waistband clamps and a hook. Four parts. Trousers
  hang from a clamp, not a shoulder line.
- **stand** (shoe) — a small base plate and a short riser. Two parts. Footwear does not hang.

A test found a real defect here: the pant clamp was initially specified at `hardwareY 0.30`,
which put it at 0.51 while the pant artwork top reached 0.646 — the clamp would have appeared to
grip the middle of the trousers. It was raised to `0.45` (0.77) so the trousers hang beneath it,
which is both physically right and what the test now enforces for every hanging article.

The shoe stand is deliberately **below** its artwork (-0.51 vs -0.12), because a stand supports
from beneath. That is why the "hardware at or above artwork top" test covers shirt, pant and
generic only, and says so.

## 5. Rack-row integration

`slotTransform` now receives the binding, so `rack-row` can read `garmentArticleType` and apply
the profile. Verified unchanged by test:

- slot order = binding order = fallback order, including on a mixed-article rack
- move left/right and remove still work, and a garment keeps its own article type across a move
- overflow still works: 18 mixed-article garments at capacity 12 give 12 visible, 6 overflowed
  and **18 fallback rows**
- horizontal spacing is untouched by article, so the rail still reads evenly (>70% of rail width)
- save/reload reproduces identical compiled positions, because presentation is derived from
  `garmentArticleType` rather than persisted

## 6. Inspection positioning

Bounded, as scoped. `SpatialInteractionProfile` has `translation.distance` and rotation mode but
**no vertical offset field**, so a true per-article inspection height would need a new field plus
renderer maths — more coupled than this task allows.

Instead, each article selects an existing profile, applied on the derived placement at compile
time:

- shirt / pant / generic → `rack-turn-outward` (turns outward beside the rail)
- shoe → `piece-inspect-near` (closer, tighter — suits a small object on a stand)

**Next step, documented rather than done:** add an optional `verticalOffset` to
`SpatialInteractionProfile` and honour it in `updateInspectionTargets`, so a pant can be
inspected at a lower centre than a shirt.

## 7. UI and debug notes

The `04C Garment Artwork` panel now shows the selected garment's rack presentation —
hardware kind and rail drop — alongside the existing warnings. The shoe warning was sharpened to
state the proxy explicitly:

> "Shoes use display/outer-side/top artwork on a low stand proxy. They do not hang, and
> front/back wrapping is not implemented."

The carrier debug toggle is unchanged: UI-local React state, off by default, ghosts the carrier
without touching artwork, and never persisted.

## 8. Saved JSON and payload

Stored: `garmentArticleType` and artwork ref ids only. **Hang profiles are derived, never
persisted** — asserted by test that a serialised room contains neither `railDrop` nor
`hardwareY`, and that no derived binding placement appears in `room.placements`.

A six-garment mixed-article rack validates and stays inside the 100 KB layout budget, with no
`.glb`/`.gltf` path and no source-folder path.

## 9. Fallback behaviour

Unchanged and complete. Hang profiles affect 3D placement only; the semantic fallback is
unaffected, keeps binding order, and still carries every overflowed garment with its label,
caption, piece type and actions. Mixed-article racks were explicitly tested for this.

## 10. Tests run

| Command | Result |
|---|---|
| `npm run test:spatial` | **192 passed, 0 failed** (184 at start; 8 added) |
| `npm run test:spatial-assets` | **30 passed, 0 failed** |
| `npx tsc --noEmit` | **0 errors** |
| `npm run build` | **Compiled successfully** |
| `npx playwright test … --grep "garment"` | **1 passed (21.4s)** — no teardown hang observed |

New suite `garmentHangProfiles.test.ts` (8 tests): distinct profiles per article; pant no longer
sharing the shirt rail point; shoe presented forward, smaller and lowest; hardware visible,
article-specific and never artwork or carrier; hardware clear of the artwork for hanging
articles; profiles reaching the compiled plan and surviving reorder and reload; slot order,
overflow, spacing and payload undisturbed on mixed-article racks; and no derived transforms
persisted.

## 11. Manual QA

- Measured rail Y, forward Z, scale, hardware kind, hardware part count, hardware Y and artwork
  top for all four articles (table in §3).
- Confirmed generic remains identical to shirt.
- Confirmed no file under `C:\Dev\presence pieces` was modified.

No screenshots: this is measurable geometry rather than appearance, and the artwork is still
synthetic placeholder media, so a screenshot would show proxy quality rather than evidence.

## 12. Why the source GLBs remain deferred

Unchanged, and none was used, copied or converted:

- **Shirt** — 361-node rig, bounds ~1 cm (scale wrong ~100x), 27 MB of textures an invisible
  carrier discards.
- **Pant** — ~692 MB each of pretty-printed JSON with base64 buffers and 8192x8192 PNGs.
- **Shoe** — Nike-branded, no licence metadata or sidecar, 90,522 triangles with no normals.
  Blocked on licensing.

## 13. Remaining limitations

- **Shoe remains a rack-display proxy**: a low stand plus two flat planes. No footwear geometry,
  no UV wrapping, no sole/upper separation. Nothing here claims solved footwear.
- Inspection height is still article-agnostic; only the profile *choice* varies (see §6).
- Hardware is minimal by design — a bar, clamps and a plate. It is not modelled hanger detail.
- `rackScale` shrinks the whole carrier for shoes, including its artwork, rather than scaling
  the stand independently.
- Rail drop is a fixed per-article constant; it does not adapt to rack height, so a very short
  rack could place a shoe near or below its own base.
- Visual quality remains synthetic proxy evidence, not art direction.

## 14. Rollback notes

Revert:

```
lib/presence/spatial/model.ts
lib/presence/spatial/arrangements.ts
lib/presence/spatial/compile.ts
components/presence-spatial/threeGeometryCache.ts
components/presence-spatial/SpatialObjectArranger.tsx
```

and delete `lib/presence/spatial/garmentHangProfiles.test.ts` and this document. Hang profiles
are derived from `garmentArticleType`, which already existed, so **no saved layout changes shape
and none needs migrating** — reverting simply returns every article to the shared hang point. No
generated asset, candidate registry, runtime asset, public route, auth, tenant, backend or
publish path was touched.
