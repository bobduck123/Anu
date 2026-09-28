# Gate 4 M1 Evidence - Reference Baseline Board

Date: 2026-07-30
Gate: Gate 4 - V3.2 creative library buildout
Milestone: M1 - Reference Baseline Board
Status: Complete - docs/evidence baseline only

## Summary

Gate 4 M1 inspected the current reference source at `C:\Dev\presence-reference` and mapped available reference packets against the accepted Gate 3 V3 catalog.

No runtime code, public renderer, public route, publish path, backend validator, auth, tenant, payment, production data, deploy config, merge, push, or stash operation was performed.

Gate 4 cannot honestly claim 10 Looks, 10 Room Styles, 10 flagship pairings, or 30 supported pairings yet. The current usable baseline is four manifested reference slots, two of which lack local screenshot packets, one incomplete slot, and five missing slots.

## Inputs Reviewed

- `C:\Dev\Flora_fauna\presence-app\.agent\PRESENCE_GATE_4_EXECPLAN.md`
- `C:\Dev\Flora_fauna\presence-app\.agent\PRESENCE_GATE_4_M1_REFERENCE_BASELINE_WORK_ORDER.md`
- `C:\Dev\Flora_fauna\presence-app\.agent\PRESENCE_GATE_TRACKER.md`
- `C:\Dev\presence-reference\README.md`
- `C:\Dev\.agent\reference-program\PROGRAM.md`
- `C:\Dev\.agent\reference-program\REQUIREMENTS_REGISTER.md`
- `C:\Dev\.agent\reference-program\QUALITY_AUDIT.md`
- `C:\Dev\Flora_fauna\presence-app\lib\presence\studio-v3\styleCatalog.ts`
- `C:\Dev\presence-reference\01-bbb-vision`
- `C:\Dev\presence-reference\02-ggm-memory-colours`
- `C:\Dev\presence-reference\03-atelier`
- `C:\Dev\presence-reference\04-soundings`
- `C:\Dev\presence-reference\05-meridian`

## Current V3 Catalog Baseline

Gate 3 left a typed catalog architecture, not the final creative library.

Current catalog IDs in `styleCatalog.ts`:

| Category | Current IDs | Count |
|---|---|---:|
| Looks | `soft-editorial`, `nocturnal-gallery`, `zine-archive` | 3 |
| Room Styles | `gallery-wall`, `threshold-portal`, `film-strip-selected-works` | 3 |
| Piece Treatments | `quiet-framed`, `luminous-depth`, `captioned-ledger` | 3 |
| Atmospheres | `paper-light`, `nocturnal-depth`, `ledger-scan` | 3 |
| Motion Behaviours | `still`, `gentle`, `living` | 3 |
| Public preset candidates | `gallery-p2`, `bbbvision-threshold-gallery`, `christina-liquid-gallery` | 3 |
| Collection presentations | `wall`, `selected-sequence`, `threshold-feature` | 3 |

Known app pairing baseline:

- 2 flagship pairings.
- 3 supported pairings.
- 4 experimental pairings.
- No production-ready blocked-pairing matrix yet.

## Reference Slot Board

| Slot | Reference | Manifest | GAPS | Screens | Count for Gate 4? | Baseline posture |
|---|---|---|---|---|---|---|
| 01 | `01-bbb-vision` | Yes | Yes | No local `screens/` folder | Partial | Required bbbvision-inspired flagship candidate, but not a clean first import because mobile, reduced-motion, metadata, performance, and action gaps remain significant. |
| 02 | `02-ggm-memory-colours` | Yes | Yes | No local `screens/` folder | Internal only | Valuable design-system archetype; must remain internal/non-public unless fixture-safe conversion is explicitly approved. |
| 03 | `03-atelier` | Yes | Yes | Yes, 12 files | Yes | Safest first runtime import candidate after M2 schema decision. Fixture-only, safety tier A, complete capture packet. |
| 04 | `04-soundings` | Yes | Yes | Yes, 17 files | Yes for schema pressure; public route blocked/deferred | Strong archive/audio reference, but blocked/deferred for public route posture until audio, access-state, and refusal handling are decided. |
| 05 | `05-meridian` | No | No | Empty `screens/` folder | No | Folder has source fragments, package metadata, fonts, licences, and JS/CSS libs, but no manifest/GAPS/evidence packet. Must not count. |
| 06 | Missing | No | No | No | No | Human/product input required. |
| 07 | Missing | No | No | No | No | Human/product input required. |
| 08 | Missing | No | No | No | No | Human/product input required. |
| 09 | Missing | No | No | No | No | Human/product input required. |
| 10 | Missing | No | No | No | No | Human/product input required. |

## Available Reference Mapping

### 01 - bbb.vision

| Dimension | Baseline |
|---|---|
| Look | Gilded Nocturne |
| Room Style | Infinite Field |
| Piece Treatments | Deterministic Hash Crop; Proximity Focus; Glitch Resolve |
| Atmosphere Modules | Void Vignette; Gold Bloom |
| Motion Behaviours | Wandering Mark; Inertial Pan; Focus Lag; Threshold Exit |
| Safety/public posture | Permission is recorded as granted by the artist, but the packet still carries residual subject-clearance caution if imagery is used to promote Presence rather than the artist. Required as the bbbvision-inspired flagship candidate, not public launch approval. |
| Mobile/reduced-motion posture | Manifest records unresolved posture for proximity/touch and several undefined reduced-motion fallbacks. Local reference packet has no `screens/` folder. |
| Runtime import risk | High. Strong identity and flagship obligation, but current app only has a specialized BBBVision V2 bridge; direct import risks copying bespoke canvas behaviour into the catalog as if it were the general model. |
| Schema gaps | REQ-001/002 reduced-motion fallbacks; REQ-003 semantic layer; REQ-004 stable Piece URLs; REQ-005/007/017 enquiry/owner signal; REQ-009 asset derivatives; REQ-010/011 metadata; REQ-015 deterministic derived properties; REQ-021 threshold/field independence; REQ-023 motion identity; mobile performance proof. |
| Import recommendation | Do not import first. Keep as Gate 4 M4 flagship alignment after M2/M3 establishes a safer catalog expansion path. |

### 02 - GGM Memory Colours

| Dimension | Baseline |
|---|---|
| Look | Memory Colours |
| Room Style | Serendipity Pathway |
| Piece Treatments | Liquid Morph Transition; Dither Resolve; Four-Register Text |
| Atmosphere Modules | Liquid Field; Dither Layer; FX Cursor |
| Motion Behaviours | Scroll-Snap Morph; Magnetic Hover; Reveal On Enter; Word Mask Reveal |
| Safety/public posture | Internal/non-public benchmark only. Real artist/person context exists; conversion to fixture-safe metadata must be explicitly approved before any runtime registry exposure beyond internal analysis. |
| Mobile/reduced-motion posture | Strong reduced-motion pattern in the reference; mobile is described as real but GPU cost is unproven. No local `screens/` packet in `presence-reference`. |
| Runtime import risk | High unless fixtured. Technically useful for Lab/Safe, four-register text, dither/liquid treatments, and capability detection, but public use is not allowed in current posture. |
| Schema gaps | REQ-006 visitor contributions; REQ-008 aggregate scope; REQ-011 multi-register Piece text; REQ-012 Safe rendering; REQ-013 capability requirements; REQ-014 derived Collections; REQ-016 self-containment; REQ-005/007 owner signal. |
| Import recommendation | Do not import as public selectable style. Use after Atelier only if a fixture-safe registry specimen is approved. |

### 03 - Atelier

| Dimension | Baseline |
|---|---|
| Look | Brass Inlay |
| Room Style | Refractive Threshold |
| Piece Treatments | Onion Inspection; Scribe Reveal; Measured Plate |
| Atmosphere Modules | Drawing Sheet; Material Sampler |
| Motion Behaviours | Seventy-Five; Glass Drift; Approach |
| Safety/public posture | Public safety tier A. Fixture-only. No real person, client, testimonial, work, or image. Safest current reference for public-showable internal proof. |
| Mobile/reduced-motion posture | Complete local `screens/` packet includes desktop, mobile, transformation, modules bench, and reduced-motion captures. Manifest describes mobile and reduced-motion behaviours per treatment/module. |
| Runtime import risk | Medium. Safest first import candidate, but still requires catalog/schema decisions before runtime code because current V3 metadata cannot express its non-colour tokens, module contract, generated works, or refraction/measurement semantics. |
| Schema gaps | REQ-026 preview mode; REQ-027 bounded owner-safe params; REQ-028 host contract for treatments; REQ-029 module contract validator; REQ-030 required content shape; REQ-031 fixture flag; REQ-032 box measurement; REQ-033 shared primitives; REQ-034 non-colour tokens; REQ-035 re-derive baked render; REQ-036 generated content; REQ-037 reduced-motion verification; REQ-038 visitor-side arithmetic; REQ-039 refusals as content; REQ-040 animated capture. |
| Import recommendation | Recommended first runtime import candidate, after Gate 4 M2 decides the smallest schema extension and after explicit approval to touch runtime catalog. |

### 04 - Soundings

| Dimension | Baseline |
|---|---|
| Look | Sounding Line |
| Room Style | Water Column |
| Piece Treatments | echogram; sonification; access-state |
| Atmosphere Modules | water-column; line-physics; sounder |
| Motion Behaviours | descent; spring-transmission; surface-recession; mark-surfacing |
| Safety/public posture | Public route blocked/deferred. Although permission tier is A and content is fixture-only, the site publishes credible institutional refusal statements. REQ-048 says fixture institutional statements cannot be publicly routed without stronger handling. |
| Mobile/reduced-motion posture | Complete local `screens/` packet includes desktop, mobile, modules bench, and reduced-motion captures. Audio is consent-gated; reduced motion is currently treated as the only available reduced-audio signal, which needs a product decision. |
| Runtime import risk | Very high for first import. It introduces audio identity, per-room audio state, consent invariants, reduced-audio posture, access states, non-page depth axis, generated time media, and institutional-refusal risk. |
| Schema gaps | REQ-041 audio as Presence dimension; REQ-033 shared primitive equivalence; REQ-032 multi-box measurement; REQ-042 semantic primitive role; REQ-043 palette roles; REQ-044 participation contract; REQ-040 inspection/capture contract; REQ-045 access tier; REQ-046 non-page primary axis; REQ-028 output modality for treatments; REQ-036 generated time media; REQ-048 fixture refusal public-route block. |
| Import recommendation | Defer from public route posture and do not import first. Use for Gate 4 M2 schema pressure, then revisit only after audio/access-state/refusal posture is decided. |

### 05 - Meridian

| Dimension | Baseline |
|---|---|
| Look | Not declared. |
| Room Style | Not declared. |
| Piece Treatments | Not declared. |
| Atmosphere Modules | Not declared. |
| Motion Behaviours | Not declared. |
| Safety/public posture | Unknown. No manifest, no GAPS, no evidence packet. |
| Mobile/reduced-motion posture | Unknown. An empty `screens/` folder exists; no captures are present. |
| Runtime import risk | Unknown/high. The folder contains source fragments and licences, but no Presence translation artefact. |
| Schema gaps | Not countable until manifest/GAPS exist. |
| Import recommendation | Do not count or import. Complete the reference packet first if this is intended slot 05. |

## Screenshot Packet Evidence

| Slot | Screens inspected |
|---|---|
| 01 | None in local reference packet. |
| 02 | None in local reference packet. |
| 03 | `desktop-threshold.png`, `desktop-interaction.png`, `desktop-work.png`, `desktop-process.png`, `desktop-sheet.png`, `desktop-sheet-enquire.png`, `desktop-transformation.png`, `mobile-threshold.png`, `mobile-interaction.png`, `mobile-sheet.png`, `modules-bench.png`, `reduced-motion.png` |
| 04 | `desktop-threshold.png`, `desktop-descent.png`, `desktop-listening.png`, `desktop-midnight.png`, `desktop-station.png`, `desktop-register.png`, `desktop-record-open.png`, `desktop-record-embargoed.png`, `desktop-record-withheld.png`, `desktop-ledger.png`, `desktop-enquire.png`, `desktop-transformation.png`, `mobile-threshold.png`, `mobile-descent.png`, `mobile-record.png`, `modules-bench.png`, `reduced-motion.png` |
| 05 | Empty `screens/` directory; no capture files. |

## Schema Gaps Against Current V3 Catalog

The accepted Gate 3 catalog can model IDs, prose metadata, basic safe controls, compatibility tiers, V2 bridge projection, simple piece treatment defaults, atmosphere labels, and motion-intensity fallbacks. The reference baseline needs more than that before a truthful import.

Open schema gaps:

1. New Look and Room Style IDs beyond the current three must be added deliberately with tests and compatibility rules.
2. Reference Looks need typed non-colour tokens, bounded params, semantic palette roles, primitive roles, and renderer-consumer declarations.
3. Room Styles need richer contracts for preview mode, required content shape, non-page axes, zone participation, multi-box measurement, and shared primitive equivalence.
4. Piece Treatments need host contracts and output modalities; Soundings proves treatments may produce audio or access-state surfaces, not only pixels.
5. Atmosphere Modules need explicit module contracts, perf tiers, idle states, audio identity support, and mobile/reduced-motion fallbacks.
6. Motion Behaviours need per-behaviour fallback declarations and mechanical verification; a global `still/gentle/living` intensity is not enough.
7. Fixture status, generated content, access tiers, refusals, embargo derivatives, and visitor-side computation need product/model decisions before public proof.
8. Public renderer support must remain explicit. BBBVision is currently specialized-V2-bridge-backed; Christina is metadata-only; Soundings is public-route blocked/deferred.
9. The 30 supported pairing target cannot be asserted from the reference programme alone; cross-pairing requires catalog composition and evidence after imports.

## Recommended Import Order

1. Gate 4 M2 - schema-gap decision, no runtime import yet. Decide the minimal catalog extension needed for one safe import.
2. `03-atelier` - first runtime import candidate, because it is fixture-only, public safety tier A, complete, captured, and has the cleanest permission posture.
3. `01-bbb-vision` - flagship alignment candidate after Atelier proves a safe import pattern; reconcile `Gilded Nocturne`/`Infinite Field` with existing `nocturnal-gallery`/`threshold-portal`.
4. `02-ggm-memory-colours` - internal-only schema learning, or fixture-safe runtime candidate only after explicit approval.
5. `04-soundings` - defer runtime import until audio, access-state, refusal, reduced-audio, and public-route posture are decided.
6. `05-meridian` - complete manifest/GAPS/screens first; do not count now.
7. Slots `06`-`10` - require human/product direction before any Gate 4 count or import plan.

## Human Decisions Needed

1. Confirm whether Gate 4 M2 should choose Atelier as the first implementation slice.
2. Confirm whether `05-meridian` is the intended fifth reference and whether its packet should be completed before runtime imports beyond Atelier.
3. Choose or approve directions for slots `06`-`10`.
4. Confirm whether GGM can be converted into fixture-safe registry metadata, or must stay entirely out of runtime catalog entries.
5. Confirm Soundings audio/access-state/reduced-audio/refusal posture before any runtime import.
6. Confirm whether BBBVision should be aligned by renaming/reusing the current Gate 3 IDs, or by adding new Gate 4 reference IDs with compatibility mapping.

## Stop/Go Recommendation

Go to Gate 4 M2 as a docs/schema decision packet only.

Do not proceed directly to runtime import until M2 identifies the smallest safe catalog extension and receives explicit approval to edit runtime code.

## Validation

- `git diff --check` required before closeout.

## Rollback

Remove this evidence folder and restore the Gate 4 M1 progress entries in:

- `.agent/PRESENCE_GATE_4_EXECPLAN.md`
- `.agent/PRESENCE_GATE_TRACKER.md`

No stash recovery is needed because the parked stash was not touched.
