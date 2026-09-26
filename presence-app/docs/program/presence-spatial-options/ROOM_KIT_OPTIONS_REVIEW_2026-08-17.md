# Room kit options review

Date: 2026-08-17
Scope: Curation review of all 8 generated candidate room kits
Status: **Curation and product taxonomy only.** Nothing here is admitted, licence-cleared, production-ready, publish-ready or accepted for any client.

Every kit below was reviewed by opening its rendered thumbnail. Thumbnails are Blender
Workbench renders: they show silhouette, massing and scale relationships, not lighting,
material or interior atmosphere. Scores are capped accordingly and are not inflated.

Thumbnails live in `assets/presence-spatial/candidates/thumbnails/<id>.webp`.
Runtime exports live in `assets/presence-spatial/candidates/roomkits/<id>.glb`.

## Disposition summary

| Kit | Character | Score /4 | Disposition |
|---|---|---|---|
| `candidate.roomkit.warehouse-17b3` | Brutalist ribbed concrete shell | 3 | **expose-as-option** (after art pass) |
| `candidate.roomkit.unknown-interior-a5e1` | Long arcaded colonnade | 3 | **expose-as-option** (after scale review) |
| `candidate.roomkit.unknown-interior-ffd7` | Gothic vaulted nave | 3 | mine-for-parts + internal-reference-only |
| `candidate.roomkit.boutique-0ae2` | Closed retail box, rich interior | 2 | mine-for-parts |
| `candidate.roomkit.living-room-06d0` | Open-topped domestic room | 2 | mine-for-parts |
| `candidate.roomkit.unknown-interior-3bc1` | Building masses, not a room | 1 | reject/defer |
| `candidate.roomkit.living-room-c197` | Photogrammetry hull | 1 | internal-reference-only |
| `candidate.roomkit.unknown-interior-b562` | Franchise corridor system | 0 | **reject/defer** |

Only **two** of eight are plausible product options, and both need work first. That is the
honest read of a batch that was collected as source material, not authored as Presence rooms.

---

## `candidate.roomkit.warehouse-17b3`

- **Source:** `source.brutalist-interior-vr-room-baked-source-untitled`
- **Thumbnail:** `assets/presence-spatial/candidates/thumbnails/candidate.roomkit.warehouse-17b3.webp`
- **Category guess:** `warehouse` (keyword-matched on "brutalist")
- **Recommended category:** industrial/warehouse — also serves boutique/showroom
- **Observed visual character:** A rectangular interior shell whose walls are covered in deep
  vertical ribs or flutes, with a stepped, layered ceiling. Heavy, sculptural, monolithic.
  Reads as raw architectural concrete rather than anything domestic.
- **Likely use case:** Dark showroom, streetwear/fashion drop, industrial gallery, DJ or
  listening space. The ribbing gives strong directional rhythm that suits sparse hanging displays.
- **Dimensions:** 10.7 × 4.2 × 6.8 m — genuinely metre-scaled, the only kit needing no scale review.
- **Payload:** 668 KB textured, well inside the 3 MB room-kit budget. Best payload/character ratio in the batch.
- **Suitability:** **3/4**
- **Disposition:** **expose-as-option**, after an art pass
- **Notes:**
  - The strongest overall kit: correct scale, small payload, distinctive character.
  - Directly aligned with the already-implemented `presence.ribbed-wall` primitive, so the
    procedural route can reproduce this character without shipping the mesh at all.
  - Only 1 component candidate was extracted, because the source is a single baked mesh.
    It cannot be meaningfully mined for parts.
  - Baked lighting is in the texture. Under a different Presence lighting profile it may
    read as flat or double-lit. Needs a lighting compatibility check.
  - No licence metadata was found in the source at all.

## `candidate.roomkit.unknown-interior-a5e1`

- **Source:** `source.urban-interior-moody-vr-room-baked-source-untitled`
- **Thumbnail:** `assets/presence-spatial/candidates/thumbnails/candidate.roomkit.unknown-interior-a5e1.webp`
- **Category guess:** `unknown-interior` (no keyword match)
- **Recommended category:** gallery — long-gallery / arcade variant
- **Observed visual character:** A long linear hall lined with repeated arched bays on both
  sides, like a colonnade or cloister walk. Elegant, rhythmic, processional.
- **Likely use case:** Long gallery, archive walk, exhibition corridor, portfolio sequence.
  The repeated bays are a natural rhythm for a sequence of works.
- **Dimensions:** 53.7 × 12.3 × 12.4 m — **scale review required.** 53.7 m long and a 12.3 m
  ceiling are implausible; the suggested uniform scale is 0.26.
- **Payload:** 159 KB — by far the lightest kit, and remarkable for the character it carries.
- **Suitability:** **3/4**
- **Disposition:** **expose-as-option**, after scale review
- **Notes:**
  - Best payload in the batch by an order of magnitude.
  - Single baked mesh: 1 component extracted, cannot be mined for parts, and materials are
    baked into one texture so per-bay skinning is not possible without re-authoring.
  - The arcade rhythm is the valuable idea here. It is worth reproducing procedurally as a
    repeating-bay primitive rather than shipping this mesh long-term.
  - No licence metadata found in the source.

## `candidate.roomkit.unknown-interior-ffd7`

- **Source:** `source.old-church-modeling-interior-scene`
- **Thumbnail:** `assets/presence-spatial/candidates/thumbnails/candidate.roomkit.unknown-interior-ffd7.webp`
- **Category guess:** `unknown-interior`
- **Recommended category:** performance room / archive — or impossible-hybrid candidate
- **Observed visual character:** A full Gothic nave: pointed arcade arches, ribbed vaulting
  across multiple bays, side aisles and an apse. Architecturally the most distinctive and
  most beautiful interior in the batch.
- **Likely use case:** Performance/recital space, solemn archive, memorial or cultural
  presence, dramatic exhibition hall. Also the most promising base for an *impossible*
  hybrid — a nave whose vaults open to sky or dissolve into an archive field.
- **Dimensions:** 40.4 × 21.4 × 23.3 m — **scale review required** (21.4 m is plausible for a
  real nave, which is exactly why it must be confirmed rather than assumed).
- **Payload:** 3,819 KB shape-only — **over the 3 MB room-kit budget**, and that is without textures.
- **Suitability:** **3/4** for character, **1/4** as a shippable option today
- **Disposition:** **mine-for-parts** + **internal-reference-only**
- **Notes:**
  - Highest creative potential, worst practical readiness. Over budget before textures.
  - 22 component candidates were extracted, including the excellent display plinth
    (`candidate.table.old-church-modeling-interior-sce-ffd7-017`) already used elsewhere.
  - Strong religious signal. Any use needs a deliberate cultural/product decision, not a
    default. This is a judgement for a human, not a curation default.
  - `CC-BY-4.0` declared: attribution travels with any use.
  - Recommend harvesting the arch and vault *proportions* into a procedural nave/arcade
    primitive rather than shipping this mesh.

## `candidate.roomkit.boutique-0ae2`

- **Source:** `source.coffee-shop-gld-coffee-shop`
- **Thumbnail:** `assets/presence-spatial/candidates/thumbnails/candidate.roomkit.boutique-0ae2.webp`
- **Category guess:** `boutique` (keyword-matched on "shop", "coffee")
- **Recommended category:** boutique/showroom — but as a parts donor
- **Observed visual character:** From outside, a closed flat-roofed box with a row of arched
  forms along one flank and glazed units at one end. The rich interior is not legible from
  the exterior view the thumbnail provides.
- **Likely use case:** Parts donor for retail fixtures and seating. Weak as a shell.
- **Dimensions:** 20.9 × 5.2 × 11.9 m — plausibly metre-scaled, no scale review flagged.
- **Payload:** 8,539 KB shape-only — **the worst in the batch, ~2.8× over budget**, from 20.3 M triangles.
- **Suitability:** **2/4**
- **Disposition:** **mine-for-parts**
- **Notes:**
  - Richest source in the batch — 24 component candidates, 662 separable objects, 291 unique shapes.
  - Carries third-party coffee-shop branding baked into some geometry. Anything mined from
    it must be checked individually; one branded wall graphic was already rejected on sight.
  - Not viable as a shell at this payload without aggressive decimation.
  - No licence metadata found in the source.

## `candidate.roomkit.living-room-06d0`

- **Source:** `source.living-room-interior-free`
- **Thumbnail:** `assets/presence-spatial/candidates/thumbnails/candidate.roomkit.living-room-06d0.webp`
- **Category guess:** `living-room` (keyword-matched)
- **Recommended category:** soft domestic
- **Observed visual character:** An open-topped room box with walls cut away, furniture
  (sofa, table, seating) visible inside. Reads as a dollhouse-style cutaway rather than an
  enterable interior.
- **Likely use case:** Soft domestic presence, writer/maker at-home context. Weak as-is.
- **Dimensions:** 37.8 × 25.1 × 55.7 m — **scale review required.** A 25 m ceiling on a living
  room is clearly wrong; suggested uniform scale 0.127.
- **Payload:** 1,476 KB textured — comfortably within budget.
- **Suitability:** **2/4**
- **Disposition:** **mine-for-parts**
- **Notes:**
  - Good payload, wrong scale, weak spatial read.
  - 11 component candidates extracted.
  - `SKETCHFAB Standard` declared, which is not a blanket redistribution right.

## `candidate.roomkit.unknown-interior-3bc1`

- **Source:** `source.interior-7`
- **Thumbnail:** `assets/presence-spatial/candidates/thumbnails/candidate.roomkit.unknown-interior-3bc1.webp`
- **Category guess:** `unknown-interior`
- **Recommended category:** reject/defer
- **Observed visual character:** Several separated building masses with banded floors and
  balcony-like slabs. Reads as apartment-block exteriors, not a room interior at all.
- **Likely use case:** None as a room kit. Some interior props were successfully extracted.
- **Dimensions:** 26.3 × 10.9 × 26.0 m
- **Payload:** 2,794 KB textured — within budget.
- **Suitability:** **1/4**
- **Disposition:** **reject/defer** as a kit; its extracted components remain useful
- **Notes:**
  - The kit-level classification is misleading: this is not a single coherent space.
  - 21 component candidates were extracted, and several are among the best in the library
    (the stacked risers and the wire armchair both came from here).
  - `SKETCHFAB Standard` declared.

## `candidate.roomkit.living-room-c197`

- **Source:** `source.the-great-drawing-room`
- **Thumbnail:** `assets/presence-spatial/candidates/thumbnails/candidate.roomkit.living-room-c197.webp`
- **Category guess:** `living-room` (keyword-matched on "drawing-room")
- **Recommended category:** internal-reference-only
- **Observed visual character:** An opaque grey block with faint surface noise. This is a
  photogrammetry scan whose detail is on the *inside* of a closed hull, so an exterior
  Workbench render shows essentially nothing.
- **Likely use case:** Historic-interior reference. Cannot be judged from the current thumbnail.
- **Dimensions:** 14.3 × 5.7 × 14.0 m — plausible, no scale review flagged.
- **Payload:** 6,225 KB textured — **over budget**, ~2× the room-kit ceiling.
- **Suitability:** **1/4** from available evidence — **needs interior 3D review** before any real score
- **Disposition:** **internal-reference-only**
- **Notes:**
  - The score reflects reviewability, not necessarily the asset. An interior camera render
    could change this materially; the current evidence simply does not support a higher score.
  - Photogrammetry geometry is generally unsuitable for a component library: no clean
    material slots, no separable parts, heavy triangle counts.
  - `CC-BY-4.0` declared (Hallwyl Museum). Attribution travels.

## `candidate.roomkit.unknown-interior-b562`

- **Source:** `source.star-wars-the-clone-wars-venator-prefab`
- **Thumbnail:** `assets/presence-spatial/candidates/thumbnails/candidate.roomkit.unknown-interior-b562.webp`
- **Category guess:** `unknown-interior`
- **Recommended category:** **reject/defer**
- **Observed visual character:** A cross-shaped system of ribbed modular corridors with
  bulkhead doorways. Competently modelled and cleanly modular.
- **Likely use case:** None available to Presence.
- **Dimensions:** 31.2 × 2.8 × 15.7 m. **Payload:** 2,097 KB textured, within budget.
- **Suitability:** **0/4** for product use, irrespective of build quality
- **Disposition:** **reject/defer**
- **Notes:**
  - Depicts third-party franchise IP. The model's own `CC-BY-4.0` licence does not convey any
    right to the depicted property.
  - This is the correct call regardless of technical merit, and it also removes its 23
    component candidates from product consideration.
  - Recommend excluding this source from all future option curation passes.

---

## Cross-cutting observations

1. **Six of eight kits are not enterable rooms.** They are exterior hulls, building masses,
   or corridor systems. The batch was gathered as source material and it shows.
2. **Baked lighting is the recurring hazard.** The two best kits are single baked meshes:
   great payload, but their light is painted in and cannot respond to a Presence lighting
   profile, and they cannot be re-skinned per client.
3. **Scale is unresolved on three of eight.** No kit should be placed without confirmation.
4. **The most valuable output of this batch is not the kits — it is the proportions.**
   The ribbed wall, the arcade bay and the Gothic arch are all reproducible procedurally at a
   fraction of the payload, with real material slots and real lighting response.
