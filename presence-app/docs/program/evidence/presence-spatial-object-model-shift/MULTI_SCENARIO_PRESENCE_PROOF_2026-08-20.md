# Multi-scenario Presence platform proof

Date: 2026-08-20
Scope: Four internal authored scenarios across different client archetypes, built from the shipped platform systems only, to test whether Presence is a general spatial publishing platform rather than a fashion-rack tool
Status: **Internal authoring evidence only.** No component or candidate is admitted. No claim is made about Mobstar creative acceptance, public launch readiness, client self-serve readiness, commerce, multiplayer, publishing, backend persistence or production readiness. **No source, runtime or generated file was modified by this review.**

Follows [RACK_LIGHTING_MATERIAL_TREATMENT_2026-08-20](RACK_LIGHTING_MATERIAL_TREATMENT_2026-08-20.md).

---

## 1. Executive verdict

**The data platform is general. The presentation layer is not yet.**

Four scenarios — fashion, gallery, music, community archive — were authored using **only** the shipped
systems: room kits, option aliases, the Piece Library, host-targeted binding, deterministic
arrangements, semantic fallback and JSON save/reload. No bespoke scene code was written for any of
them. All four validate, compile, round-trip and stay under a quarter of the payload budget.

Every archetype-specific behaviour an operator needs already works: an archive wall overflows 24
items into 12 visible and 12 overflowed while keeping all 24 in the fallback; a spherical gallery
takes 8 release artworks; a listening station takes audio pieces and emits honest `listen` actions
that link out rather than pretending to play.

**So the answer to the primary question is yes — for the authoring, binding, arrangement, fallback
and persistence systems.**

The qualifier is the rendered lane. Outside the garment rack, the 3D result is noticeably weaker,
and for two specific and fixable reasons: **the "White Cube Gallery" renders with black walls**, and
**separately added hosts are placed on top of each other with no warning**. Neither is a
content-model problem. Both are presentation-layer gaps that no amount of further rack polish would
address.

## 2. Method

A temporary harness drove the real authoring API — `createRoomFromPresenceRoomKitOption`,
`addArrangerOption`, `createArrangerPieceLibraryItem`, `setArrangerPieceGarmentArtwork`,
`bindArrangerPieceToHost` — then exported each scenario as a draft envelope. Those envelopes were
loaded into the running app **through the arranger's own JSON Import control**, so the rendered
captures came back in through the platform's real save/reload path rather than through injected
state. The harness was deleted after the run.

All content is synthetic and public-safe: `example.com` links, generated placeholder media, and the
existing alpha garment test artwork. No real client, product, event or person is referenced.

## 3. Scenarios reviewed

### Scenario 1 — Fashion / Lookbook Room (`presence.roomkit.dark-boutique`)

Rack with 6 garments (shirt ×2, pant, generic, shoe, one deliberately unassigned) using front/back
and display alpha artwork; display island with a product piece; projection wall with a campaign
still and a motion loop; `enquire` and `watch` actions.

- Reads as a lookbook: garments hang, silhouettes are cut by alpha, the shoe sits on its stand.
- **The rack hardware is black.** The room kit specifies `rack-boutique-blackened`
  (metalness 0.78) and there is no environment map, so the rail and hangers render as black
  silhouettes — the exact defect the previous pass fixed, but only for rooms that opt into the new
  `rack-lookbook-steel` preset. **The room kit itself was never updated**, so the default fashion
  path still has invisible hardware.
- Remaining proxy: all artwork is the synthetic `TEST` set; the campaign media is a generated
  placeholder.

### Scenario 2 — Artist / Gallery Room (`presence.roomkit.white-cube-gallery`)

12 works (image and text) on an archive wall, an exhibition statement on the gallery wall, a
moving-image work on a projection wall, captions on every work, `open-link` and `watch` actions.

- Binding works are trivial: the archive wall accepts `image, event, flyer, text, link, gallery,
  collection, archive-item`, and 12 works filled its 12 slots exactly.
- **The white cube is not white.** The floor reads correctly as gallery white, but the shell walls
  and ceiling render black. The material and lighting options are otherwise sufficient outside the
  rack context — `gallery-soft` plus `white-gallery` gives a clean, bright floor — so this is a
  shell-rendering gap, not a missing option.
- **The archive wall and projection wall overlap.** Auto-placement put them at x=2.25 and x=3.00 on
  the same back wall; both are metres wide. Validation passed regardless.
- Fallback preserves every caption, media reference and link.

### Scenario 3 — Music / Listening Room (`presence.roomkit.dark-boutique`)

Listening station with 3 audio tracks; spherical gallery with 8 release artworks; archive wall with
live dates, press notes and a streaming link; projection wall with a live visual; `listen`,
`watch` and `open-link` actions.

- The listening station **is** a believable spatial object without playback: it accepts
  `audio, text, link, collection`, holds 3 of 4 slots, and its tracks appear in the fallback as
  "Listen to Track 01" buttons that link out. Nothing pretends to play in place.
- `listen` and `watch` are **honest**: each carries an explicit external href and a plain label. The
  fallback card also states "Media: Public-safe audio sample reference".
- **The spherical gallery engulfs the listening station.** Auto-placement put the sphere at
  `[0, 2.40, 0]` and the station at `[0, 0.63, 0]` — concentric.
- Missing before a musician could use this: a playlist/ordering concept beyond binding order, track
  duration or credit metadata, and any actual playback or waveform affordance.

### Scenario 4 — Community / Archive Room (`presence.roomkit.white-cube-gallery`)

24 archive items across `archive-item`, `event`, `flyer` and `text`, mixed media and metadata,
`open-link` actions.

- **Overflow works exactly as specified**: 24 bound, 12 visible, 12 overflowed, and **30 fallback
  rows covering all 24**. Overflow rows carry label, piece type, caption, the action, *and* an
  explicit "Overflow item 1 of 12" marker.
- **Metadata gaps are visible and painful in 3D**: an `event` piece with no media and no caption
  renders as an empty dark tile. It is honest, but there is no date, location or event-shaped
  presentation — a community org would be publishing tiles with no information on them.
- Serves community orgs at the data layer today; the 3D layer needs text rendering before it would
  be usable.

## 4. Measured results

| | S1 Fashion | S2 Gallery | S3 Music | S4 Community |
|---|---|---|---|---|
| Room kit | dark-boutique | white-cube-gallery | dark-boutique | white-cube-gallery |
| Validates / compiles | ✅ / ✅ | ✅ / ✅ | ✅ / ✅ | ✅ / ✅ |
| Placements | 6 | 8 | 9 | 7 |
| Piece Library items | 12 | 17 | 18 | 27 |
| Bindings | 9 | 14 | 15 | 24 |
| Hosts used | 3 | 3 | 4 | 1 |
| Arrangements exercised | rack-row, grid | wall-grid, grid | grid, spherical, wall-grid | wall-grid |
| Overflow | 0 | 0 | 0 | **12 of 24** |
| Fallback rows | 15 | 20 | 21 | 30 |
| Bound pieces in fallback | 9/9 | 14/14 | 15/15 | **24/24** |
| Action kinds | enquire, watch | open-link, watch | **listen, watch, open-link** | open-link |
| Saved layout | 19,037 B | 19,452 B | 21,087 B | 23,673 B |
| % of 100 KB budget | 18.6% | 19.0% | 20.6% | **23.1%** |
| Payload unsafe patterns | none | none | none | none |
| Save/reload identical | ✅ | ✅ | ✅ | ✅ |

Payload safety was checked for `data:image`, base64 `data:` URLs, `.glb`/`.gltf` paths,
`presence pieces` source paths, signed-URL query strings and `http://`. **All four scenarios: none.**

WebGL was confirmed per capture: `data-renderer-lane="three"` for all four desktop scenarios, and
`semantic` for the 390px capture, which is the correct mobile lane.

## 5. Screenshots

| File | Content |
|---|---|
| `screenshots/34-scenario-1-fashion-lookbook.png` | Rack, display island, projection wall; rack hardware black |
| `screenshots/35-scenario-2-artist-gallery.png` | Archive wall of works; white floor, **black walls**; wall overlap visible |
| `screenshots/36-scenario-3-music-listening.png` | Spherical gallery overlapping the listening station; `listen` actions in fallback |
| `screenshots/37-scenario-4-community-archive.png` | 12 of 24 archive tiles; empty tiles where metadata is absent |
| `screenshots/38-scenario-4-mobile-fallback-390.png` | Mobile semantic fallback |

## 6. What works across every scenario

These behaved identically regardless of archetype, which is the actual platform claim:

- **Room kits** produce a valid, camera-pathed, lit room with starter placements in one call.
- **The Piece Library** accepts all 12 piece types and is archetype-neutral.
- **Host-targeted binding** correctly refuses incompatible pairs — the rack accepts only `garment`,
  the listening station only `audio, text, link, collection` — and the compatible-type list is
  queryable, so the UI can present it.
- **Arrangements** are deterministic and host-derived; four of the five kinds were exercised
  without a single bespoke layout rule.
- **Overflow** is explicit and never drops content.
- **Semantic fallback** is the strongest part of the platform: every bound piece appears with its
  piece type, caption, media description and actions, in binding order, including overflowed items.
- **Save/reload** round-trips byte-identically through the app's own JSON import.
- **Payload discipline** holds: refs only, no blobs, no source paths, ≤23% of budget at 24 items.

## 7. What only works for fashion / rack

Being precise, because this is the question the task was set to answer:

1. **Article-aware carriers, hang profiles and multi-channel artwork are garment-only.** Every other
   piece type is a flat plane with one media ref. There is no equivalent of "front/back" for a
   record sleeve or a book.
2. **The rack lighting and material treatment is opt-in and was applied to one fixture.** The
   `dark-boutique` room kit — the default fashion path — still uses `rack-boutique-blackened` and
   still renders its hardware black.
3. **Rack-row is the only arrangement with per-article presentation logic.** `wall-grid` and `grid`
   treat every piece identically.

Nothing else in the stack is fashion-specific. The binding, arrangement, overflow, fallback and
persistence layers carried three non-fashion archetypes without modification.

## 8. Cross-scenario blockers

Ranked by how many archetypes they damage.

1. **Room shells render black from the inside.** Affects gallery and community directly and every
   light-coloured room concept. The "White Cube Gallery" cannot deliver a white cube. **3 of 4
   scenarios.**
2. **No text rendering for text-bearing pieces.** `text`, `event` and `flyer` pieces with no media
   render as blank tiles. Affects gallery statements, listings, community archives. **3 of 4
   scenarios.**
3. **Added hosts collide.** Auto-placement does not consider existing placements, and validation
   does not flag overlap between hosts, so multi-host rooms need manual repositioning that the
   operator is given no warning about. **2 of 4 scenarios, and it will affect every multi-host room.**
4. **Metals render black without an environment map.** Affects any rack, chrome or metal fixture
   outside the one room that opts into `rack-lookbook-steel`. **1 of 4 scenarios today, but it is
   the default fashion path.**
5. **The shared media pool is Mobstar-named.** Both room kits ship `mobstar-piece-a`,
   `mobstar-media-campaign` and similar, so a gallery or community operator sees Mobstar-branded
   placeholder ids. Cosmetic, but it undermines the general-platform story immediately on first use.

## 9. The three candidate next tasks, weighed

The task asked specifically about these. Judged on how many archetypes each unblocks.

### Are environment maps a cross-platform priority?

**No — they are a fashion priority wearing a platform costume.** I recommended this at the end of
the previous pass, and this review does not support it. Metals appear meaningfully in exactly one
archetype: the rack. The gallery, music and community scenarios have almost no metal in frame. An
environment map would fix a real defect, but it would fix it mostly for Mobstar, which is precisely
the over-optimisation this review was commissioned to test for. It should drop below the shell and
text work.

### Is upload / content management a higher priority?

**Not yet, and this surprised me.** Every scenario was authored with refs only, and none came close
to the payload ceiling — 23.1% at 24 items. Media *ingestion* is a real gap for a real client, but
it is a pipeline and permissions problem, not a spatial-publishing problem, and nothing in these
four scenarios was blocked by it. It also drags in backend persistence, which is explicitly out of
scope. Keep it behind the presentation work.

### Are room-kit defaults a higher priority?

**Partly — and this is the cheapest real win.** Three concrete defects live in the kits: the
Mobstar-named media pool, the stale `rack-boutique-blackened` preset, and starter layouts that
leave no room for added hosts. Fixing those is data-only, touches no renderer, and improves the
first ten minutes of every archetype. But it does not fix black shells or missing text, so it is
not sufficient on its own.

## 10. Recommended next implementation task

**Interior shell rendering and text-bearing pieces — in that order, as one presentation-layer pass.**

- **Shell interiors.** A room shell must read as an interior from inside. This is the single change
  that most improves three of four archetypes, and it is the difference between "White Cube Gallery"
  being a name and being a room.
- **Text rendering for `text` / `event` / `flyer` pieces.** The renderer already draws wrapped text
  into the generated placeholder texture, so the capability exists; it needs to become a first-class
  presentation for text-bearing piece types rather than a fallback for missing media. This turns
  blank tiles into readable panels for galleries, listings and archives.

Then, in descending order: **room-kit default hygiene** (rename the shared media pool, update the
kit's rack preset, space the starters), **host collision warnings on add**, and only then
**environment maps**.

This deliberately moves the recommendation away from the rack. The evidence does not support more
fashion work: the fashion scenario is the *strongest* of the four in the rendered lane, and the
other three are held back by general presentation gaps.

## 11. Scores

Scored 1–4 (1 = not usable, 4 = ready for the next implementation step).

| Dimension | S1 Fashion | S2 Gallery | S3 Music | S4 Community |
|---|---|---|---|---|
| Scenario completeness | 4 | 4 | 4 | 4 |
| Authoring flow clarity | 4 | 3 | 3 | 4 |
| Visual readability | 3 | 2 | 2 | 2 |
| Content binding adequacy | 4 | 4 | 3 | 4 |
| Fallback quality | 4 | 4 | 4 | 4 |
| Payload safety | 4 | 4 | 4 | 4 |
| Platform reusability | 3 | 4 | 4 | 4 |
| Readiness for next implementation | 3 | 3 | 2 | 3 |
| **Mean** | **3.6** | **3.5** | **3.3** | **3.6** |

Notes on the low scores: visual readability is 2 wherever black shells and blank text tiles
dominate. Music scores lowest on binding adequacy (no playlist/track metadata) and on readiness (it
needs both the shell fix and a playback story). Fashion scores 3 rather than 4 on platform
reusability precisely because its strengths — article carriers, hang profiles — do not generalise.

## 12. Platform proof versus visual quality

Stated plainly, because these are easy to conflate:

- **Proven:** that one set of systems can author four different kinds of spatial site; that binding
  compatibility, arrangement, overflow, fallback, save/reload and payload discipline are
  archetype-neutral; that non-fashion hosts (archive wall, spherical gallery, listening station)
  accept content and behave.
- **Not proven:** that any of these looks good. All media is synthetic placeholder, no scenario has
  had an art pass, and three of four have visible rendering defects. Nothing here says a client
  would accept any of these rooms.
- **Not claimed:** admission of any component, Mobstar creative acceptance, public launch, client
  self-serve, backend persistence, publishing, commerce or multiplayer.

## 13. Commands run

| Command | Result |
|---|---|
| `npm run test:spatial` | **224 passed, 0 failed** |
| `npm run test:spatial-assets` | **30 passed, 0 failed** |
| `npx tsc --noEmit` | **0 errors** |
| `npm run build` | **Compiled successfully** |
| Playwright scenario captures (focused) | 5 captures; all assertions passed |

**Known-issue note, as instructed:** the first batched capture run hit the documented Windows
Playwright webServer problem — assertions passed (`lane=three canvases=1` was read successfully for
the fashion scenario) and the run then failed with "Target page, context or browser has been
closed", leaving a dev server bound to ports 3100 and 5105 that had to be cleared before the next
run. Splitting the captures into single-scenario runs with one retry worked. This is recorded, not
investigated; it is not this task's subject.

## 14. Risks and limitations

- Scenarios were authored programmatically through the arranger API rather than by clicking through
  the UI, then imported through the real JSON import. Authoring-flow clarity scores are therefore
  inferred from the API's shape and the refusal messages, not from an operator session.
- All four scenarios were reviewed from their default `overview` camera. A per-scenario camera pass
  would likely improve the visual readability scores somewhat, but not the black shells or blank
  text tiles.
- Synthetic placeholder media makes every scenario look more similar than four real clients would.
- The 6 pre-existing locator failures in `presence-spatial-object-model.spec.ts`, recorded in
  earlier evidence, remain untouched.

## 15. Rollback notes

**Nothing to roll back in code.** This review modified no source, runtime, generated, public, auth,
backend, tenant or publish file — verified by modification time across `lib/`, `components/`,
`app/`, `scripts/` and `public/`. The temporary authoring harness, the four exported scenario
envelopes and the capture spec were all deleted after the run.

To remove this review entirely, delete this document and `screenshots/34-*` through `38-*`.
