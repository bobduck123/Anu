# Rack lighting and material treatment

Date: 2026-08-20
Scope: A bounded lighting profile and material treatment for rack / lookbook display, so garments, rack hardware and alpha silhouettes are readable in the WebGL lane
Status: **Internal authoring evidence only.** No component or candidate is admitted. No claim is made about Mobstar creative acceptance, public launch readiness, client self-serve readiness, commerce, multiplayer, publishing, backend persistence or production readiness. No public route, auth, tenant or publish behaviour changed.

Follows [ALPHA_MASKED_GARMENT_ARTWORK_QA_2026-08-20](ALPHA_MASKED_GARMENT_ARTWORK_QA_2026-08-20.md).

---

## 1. Why this pass was needed

The garment path became mechanically correct in the previous pass, and the honest remaining
criticism was that the result was still too dark to judge. Measured on the rack-focused frame of
the alpha garment fixture, **64.4% of the rendered canvas was effectively black**.

No garment architecture is changed here. This is lighting, materials and one camera framing.

## 2. What was actually making it dark

Diagnosed against the renderer rather than by eye.

### 2.1 Rack hardware was mathematically unlightable

`rack-matte-black` is `#101114` at **metalness 0.86**, and this renderer sets no environment map
(`renderer.shadowMap.enabled = false`, no PMREM, no scene environment). A strongly metallic
surface has almost no diffuse response and reflects only what an environment provides — with no
environment, it renders as a black silhouette.

So the rail, the uprights and **every hanger, clamp and stand** were black shapes against a black
wall. The hardware from the hang-profile pass had never actually been visible.

### 2.2 The rack's own base platform was the brightest thing in frame

`presence.suspended-rack` renders a large base platform on the `tabletop` slot. It resolved to
`tabletop-warm-stone` (`#bdb7aa`) — a pale warm stone, and by a wide margin the brightest surface
in view. It sat below the garments and pulled the eye straight off them.

This was found by dumping each compiled item's resolved materials against its geometry template
parts, after first confirming that no material was falling through to the renderer's
`"#a8a8a2"` fallback colour.

### 2.3 Nothing separated the rack from the room

Wall `wall-charcoal` (`#111214`) and floor `floor-dark-stone` (`#17181a`) are both within a few
values of black. There was no tonal step between garment, rack and wall, so the scene had no
depth and a dark garment had nothing to read against.

### 2.4 The lighting profile was not aimed at a rack

The fixture inherited the default `spatial-core-neutral`: a hemisphere, one key from `[5, 9, 8]`
and a weak fill. Nothing lit the garment fronts deliberately, and there was no rim light, so
there was no edge separation between the rack and the wall behind it.

## 3. Lighting changes

New profile **`lookbook-rack-warm`** in `lib/presence/spatial/lighting.ts`. Additive; no existing
profile was modified.

| Light | Kind | Intensity | Purpose |
|---|---|---|---|
| `rack-sky` | hemisphere | 1.38 | Base light, with a **lifted ground colour** (`#2b2f38`) so undersides are not black |
| `rack-ambient` | ambient | 0.42 | Small, but it is what stops a dark garment disappearing |
| `rack-front-key` | directional | 1.95 | Warm front key so garment fronts read |
| `rack-side-fill` | directional | 0.70 | Cool fill so a dark garment keeps its shape instead of going flat |
| `rack-rim` | directional | 0.95 | Warm rim from behind, separating rack from wall |

Background `#15171c`, tone-mapping exposure `1.18`.

### Why this profile is reusable and not pinned to one fixture

It is built **only from hemisphere, ambient and directional lights**. Directional lights are
infinite and parallel, so only their direction has any effect — the profile lights a rack
correctly wherever that rack stands, in any room.

That is a deliberate contrast with the existing `boutique-product-warm`, which is built from spot
and point lights at coordinates like `position: [8.2, 5.1, -1]`. Those only illuminate what
happens to sit near them, which quietly ties that profile to one room's layout.

**This is enforced by test, not by intention**: the profile is asserted to contain no spot or
point lights and no falloff distances. Pointing that test at `boutique-product-warm` fails, so
the check has real discriminating power.

No postprocessing was added. Shadows remain disabled.

## 4. Material changes

Four new presets and one style, all additive. **No existing preset was modified** — asserted by
test, so every other fixture renders exactly as before.

| Preset | Slot | Colour | Rough / Metal | Purpose |
|---|---|---|---|---|
| `rack-lookbook-steel` | rack-metal | `#59606b` | 0.55 / 0.28 | Metalness the direct lights can actually model, so rail, uprights and hangers read |
| `wall-lookbook-graphite` | wall | `#2a2f38` | 0.85 / 0.02 | Lifted off black for separation, matte so it does not compete |
| `floor-lookbook-slate` | floor | `#212429` | 0.82 / 0.02 | Dark but not a void |
| `tabletop-lookbook-riser` | tabletop | `#34373d` | 0.88 / 0.01 | The rack base, now subordinate instead of the brightest surface |

Style preset **`lookbook-rack`** bundles them. Flat colours only — no textures, no emissive.

An intermediate version used glossier surfaces (`floor` at metalness 0.1 / roughness 0.5, rack
steel at roughness 0.45) and produced a broad specular wash across the rack riser that was worse
than the problem it replaced. Roughening those surfaces removed it while keeping the key light
strong, which matters because the key is what makes the garments read.

## 5. Measured result

Same fixture, **same camera**, so the numbers isolate lighting and materials from the framing
change described in §6.

| Metric | Before | After |
|---|---|---|
| Effectively black (`r+g+b < 30`) | **64.4%** | **17.1%** |
| Mean luminance | 35.1 | 41.1 |
| Garment pixels | 26,985 | **35,887** (+33%) |
| Garment mean luminance | 60.9 | **87.6** (+44%) |
| Architecture pixels visible | 348,049 | **629,842** (+81%) |
| Architecture mean luminance | 71.3 | **45.3** |
| Blown out (`luma > 242`) | 0.84% | 0.84% (UI chips, not the render) |

The last two rows are the point of the material work: **81% more of the room is actually visible,
while its mean brightness drops**. The room reads as a room instead of a black void containing one
bright slab, and the garments are now the brightest thing in frame rather than competing with the
rack base.

## 6. Camera framing

One bounded change to the fixture's `rack-focus` state: `[0, 2.6, -1.4]` → `[0, 2.9, -1.1]`,
target `[0, 2.1, -7]` → `[0, 2.48, -7]`, field of view 48. This lifts the horizon so the rack
riser occupies less of the frame.

A tighter framing was tried first and rejected: it cropped the outer garments and pushed the shoe
out of view, which is worse for evidence than a slightly loose frame.

Screenshots 29 and 30 are both at the **new** camera, so the before/after pair shows only the
lighting and material difference.

## 7. Screenshots

| File | Content |
|---|---|
| `screenshots/29-rack-before-lighting-treatment.png` | **Before** — old lighting and materials, new camera |
| `screenshots/30-rack-after-lighting-treatment.png` | **After** — the treatment applied |
| `screenshots/31-rack-lookbook-overview.png` | Overview state |
| `screenshots/32-rack-lookbook-carrier-debug-on.png` | Carrier debug **on** |
| `screenshots/33-rack-lookbook-mobile-fallback-390.png` | 390px semantic fallback |

`data-renderer-lane="three"` was asserted in the capture spec, not merely observed.

## 8. Visual readability findings

From `30-rack-after-lighting-treatment.png`, compared with `29`:

- **Rack structure is now legible**: top beam, uprights and both rails read as steel furniture.
- **Hanger hardware is visible for the first time** — the bar and hook above each garment, the
  clamp bar above the pant, the shoe stand. Three passes of hardware work had been rendering as
  black-on-black.
- The wall now sits behind the rack as a distinct tone, giving the scene depth.
- The rack riser is present but subordinate; it no longer draws the eye off the garments.
- Nothing is blown out, and no specular wash remains.

## 9. Alpha garment readability

Unchanged in mechanism, better in visibility. Confirmed in the rendered frame:

- **Shirt** — sleeves, tapered body and open neck scoop all clearly visible.
- **Pant** — the gap between the legs is open, with the room visible through it. The rendered e2e
  measures **56 rows** where the room shows between the legs.
- **Generic** — A-line flare and cap sleeves read.
- **Shoe** — the low proxy is visible on its stand, which is itself now visible.
- **Missing artwork** — Look 06 still renders as the rectangular procedural placeholder, plainly
  distinguishable from the five real silhouettes. It did **not** become more garment-like.

Garment artwork material colour is set to white when media is applied, so artwork brightness comes
entirely from lighting; that is why the garments gained 44% luminance without any change to the
artwork or the fabric preset.

## 10. Carrier / debug behaviour

Unchanged, and explicitly not used to fake readability.

The carrier remains invisible by default (`opacity 0`, `colorWrite false`) and is only ghosted by
the UI-local debug toggle. Screenshot 32 shows the toggle on: the carriers appear as **rectangular
wireframe boxes noticeably larger than the garments**, which is itself the clearest proof that the
silhouette comes from the artwork alpha and not from carrier geometry.

Measured across the toggle: **5,787 vs 5,770** garment pixels with carrier debug off and on — a
0.3% difference. Lighting did not couple the carrier to the artwork.

## 11. Payload impact

**None.** Lighting and materials are referenced by id; the saved layout gained only
`lightingProfileId: "lookbook-rack-warm"` and four preset ids. Asserted by test: no `data:` URLs,
no image payloads, no `.glb`/`.gltf` paths, no source-folder paths, and the layout stays inside
the 100 KB budget.

No new asset was added. No texture was added. Shadows remain disabled, so there is no new
per-frame shadow cost; the profile adds two directional lights over the default, which are the
cheapest light type in three.js.

## 12. Fallback behaviour

Unchanged. Lighting and materials affect the WebGL lane only. The 390px semantic fallback carries
all six looks in binding order with piece type and the Look 01 action link.

## 13. Tests

New suite `lib/presence/spatial/rackLightingTreatment.test.ts` — **10 tests**: the profile exists
and resolves; **the profile is reusable rather than pinned to one fixture** (verified to fail when
pointed at `boutique-product-warm`); a dark garment cannot fall to pure black; the new presets
exist, match their slots and carry no emissive; **the rack metal is lightable without an
environment map**, and the riser is subordinate to what it replaced; the style resolves every
slot; the fixture uses the treatment and it reaches the compiled plan; the treated fixture keeps
all six garments and their artwork; no payload or admission change; and **existing lighting
profiles and material presets are unchanged**.

`catalog.test.ts` gained `lookbook-rack` in its style inventory — that guard fired correctly when
the style was added.

| Command | Result |
|---|---|
| `npm run test:spatial` | **224 passed, 0 failed** (214 at start; 10 added) |
| `npm run test:spatial-assets` | **30 passed, 0 failed** |
| `npx tsc --noEmit` | **0 errors** |
| `npm run build` | **Compiled successfully** |
| `npx playwright test …presence-alpha-garment-artwork.spec.ts` | **2 passed** |
| `npx playwright test …presence-spatial-object-model.spec.ts --grep "garment"` | **1 passed** |
| `npx playwright test …presence-rack-row-garment.spec.ts` | **2 passed** |

The documented Windows Playwright teardown hang did **not** occur in these runs.

## 14. What remains proxy or synthetic

- The garment artwork is still the **synthetic flat test set** with a baked `TEST` wordmark. This
  pass makes it readable; it says nothing about real creative.
- The shoe remains a **rack-display proxy** — a low stand and flat planes, not footwear geometry.
- Rack, hangers and clamps remain **procedural primitives**, not modelled hardware.
- Materials are flat colour presets. No textures, no normal maps, no roughness maps.
- The room is still a simple box shell.

## 15. What is not claimed

No component or candidate is admitted. No Mobstar creative acceptance, and no real product
metadata or design was invented or used. Nothing here claims launch, self-serve or production
readiness. No public route, auth, tenant, backend, publish, commerce or multiplayer behaviour was
touched. No source garment GLB was read, copied or converted.

The profile is named `lookbook-rack-warm` and contains no client-specific values — asserted by
test.

## 16. Limitations and risks

- **The metalness fix is a workaround for a missing environment map.** The correct fix for metals
  generally is a scene environment (a PMREM from a small generated gradient), which would let
  `rack-matte-black` and `rack-boutique-chrome` read as intended too. That is a renderer change
  and was out of scope here; this pass instead adds a preset that works under direct light.
- `rack-matte-black` is left as-is, so **other fixtures using it still render their rack hardware
  black**. Only rooms that opt into the lookbook treatment benefit. This was deliberate: changing
  a shared preset would silently alter Mobstar and BBB evidence captured in earlier passes.
- Tone values were tuned against one fixture in one room. They are generic in construction, but
  they have only been visually verified on this rack.
- The measurements in §5 are whole-canvas aggregates. They capture the change well but are not a
  substitute for looking at the frames.

## 17. Rollback notes

Revert:

```
lib/presence/spatial/lighting.ts
lib/presence/spatial/materials.ts
lib/presence/spatial/model.ts
lib/presence/spatial/catalog.test.ts
lib/presence/spatial/fixtures/alphaGarmentRack.ts
```

and delete `lib/presence/spatial/rackLightingTreatment.test.ts`, screenshots 29–33 and this
document.

**No saved layout needs migrating and no other room changes appearance.** Every addition is
additive and opt-in: a room renders differently only if it names `lookbook-rack-warm` or one of
the four new presets. Reverting returns the alpha garment fixture to the dark charcoal treatment
and re-hides the rack hardware.

## 18. Recommended next task

**A scene environment map for metals.** It is the root cause behind §2.1 and the one remaining
change that would make rack hardware, chrome fixtures and any future metal read correctly
everywhere rather than only in rooms that opt into a workaround preset. A small generated gradient
environment via `PMREMGenerator` is bounded, needs no asset, and would let the existing
`rack-matte-black` and `rack-boutique-chrome` presets finally behave as their names suggest.

After that, per-article inspection `verticalOffset` remains the outstanding garment-side item.
