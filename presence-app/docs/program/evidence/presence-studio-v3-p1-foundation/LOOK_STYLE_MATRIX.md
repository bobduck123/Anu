# Studio V3 P1 Look matrix

Status: PASS; three Looks implemented; compiler suite passed 28/28; Studio V3 Chromium passed 10/10; independent aesthetic review passed; formal `MERGE AFTER FIXES` remains recorded; fresh final review pending

## Registered Look values

| Look | Atmosphere / density | Piece treatment | Motion | Journey | Global renderer posture | Recommended Room Style |
|---|---|---|---|---|---|---|
| Soft Editorial | `paper-light` / `spacious`; linen, warm paper `#f7f3ea` | `quiet-framed`; hairline, radius 12, restrained depth | `still` | `editorial-browse` | `gallery-p2`, world `gallery` | Gallery Wall |
| Nocturnal Gallery | `nocturnal-depth` / `focused`; grain, near-black `#050505` | `luminous-depth`; radius 2, deeper shadow | `gentle` | `threshold-reveal` | `bbbvision-threshold-gallery`, world `gallery` | Threshold Portal |
| Zine Archive | `ledger-scan` / `dense`; ledger, burgundy `#2b1118` | `captioned-ledger`; square registered edges and shallow offset | `living` | `archive-index` | `gallery-p2`, world `zine` | Film Strip / Selected Works |

All three also carry distinct accent, heading-weight, collection-presentation, and Room-Style recommendation tokens. The registered compatibility catalog contains all nine Look/Room-Style pairs.

## Material rendering differences

The compiler maps each Look into additive V2 skin facets (`experienceDensity`, `experienceAtmosphere`, `experiencePieceTreatment`, and `experienceJourney`) as well as the existing texture, motion, renderer-preset, and world fields.

- Soft Editorial expands Room/chamber spacing, uses quiet framed objects and print-like copy padding, and gives chamber headings a restrained serif editorial hierarchy.
- Nocturnal Gallery keeps the BBB threshold renderer, deepens its dark panels and threshold wash, adds luminous constellation depth, and strengthens the enter signal.
- Zine Archive compacts the layout into a denser grid, adds a ledger/scan field and mono typography, uses captioned square-edged cards, and changes CTA treatment to an indexed archive signal.

These are structural and treatment facets in addition to palette changes. Every P1 experience class/data facet is editor-preview-only: the shared component applies it only when `editorBridge` exists. With no bridge, the component ignores P1 experience tokens even if they are present in the supplied room model and follows the pre-P1 V2 rendering path.

## Independence rule

A Look owns the Presence-wide atmosphere and renderer posture. Applying a Look changes the active Look only; it does not silently remap any Room composition.

A Room Style owns only its chamber composition and collection-presentation structure. For example, Nocturnal Gallery plus Film Strip retains the BBB renderer and `gallery` world while the selected chamber compiles to `film-strip-selected-works`. Room locks and higher-precedence Room overrides survive a Look recommendation and are reported.

## Confirmed automated evidence

The 28-test compiler suite includes assertions that:

- all three Look IDs are registered;
- atmosphere, density, piece treatment, and motion each have three distinct values;
- the compatibility registry has nine unique Look/Room-Style pairs;
- all Film Strip mappings use the bounded Film Strip layout and never select the prohibited Christina renderer;
- every Look compiles to its expected material V2 experience axes, renderer preset, and world;
- a chamber-scoped Film Strip change does not replace Nocturnal Gallery's global BBB renderer posture.

The Studio V3 Chromium suite passed 10/10, including same-BBB-content comparisons for all three Looks, mobile continuity, reduced motion, durable-base mismatch handling, public invariance, and a no-bridge regression that supplies P1 Film Strip/experience tokens but confirms pre-P1 output. V2 BBB parity/eligibility passed 14/14, including restored public hovered-shape Enter behavior. The independent review of the fresh screenshot set returned `PASS` for material differentiation, hierarchy, responsiveness, and bounded scope. These green results do not supersede the formal `MERGE AFTER FIXES` or authorize the remaining publish synchronization exception.
