# Presence Studio V2 Public Style Presets S6A Report

Date: 2026-06-09
Scope: Selectable public-output style presets and Christina Liquid Gallery archetype. Deployed and hosted-smoked after Kimi PASS.

## 1. Reference Site Analysis

Local reference inspected:

```txt
C:\Dev\ggm
```

Key files inspected:

- `index.html`
- `styles/global.css`
- `styles/home.css`
- `scripts/home.js`
- `scripts/transitions.js`
- `scripts/work-index.js`
- `data/works.json`
- `data/artist.json`

Reusable Presence style grammar extracted:

- Selected-works sequence as the primary public experience.
- Large image stage with minimal art-site chrome.
- Progress indicator in the form `01 / N`.
- Subtle prev/next and dot controls.
- Atmospheric liquid field behind the hero.
- Minimal fixed navigation.
- Art labels tied to each selected work.
- Practice/about section after the work sequence.
- Strong mobile single-column flow.
- Reduced-motion-safe CSS treatment.

Not copied:

- Hardcoded Christina content.
- GSAP/Three.js/WebGL shader stack.
- External CDN scripts and fonts.
- Custom cursor and page-transition overlay.
- OSMO-derived implementation details.
- Exact content routes, emails, social links, or artwork list.

Future model support needed:

- Explicit selected-works order.
- Explicit threshold/hero work selection.
- Structured artwork year/medium/dimensions fields beyond current `meta`.
- Structured practice/about fields.
- Per-style motion intensity controls.
- Per-style typography/atmosphere controls beyond existing skin fields.

`v2 s4-7.pdf` was not found under `C:\Dev` during this pass. The implementation follows the supplied high-level principles: room as instrument, clean public renderer, no fake features, mobile recovery, reduced motion, and honest state.

## 2. Style Presets Implemented

Selectable presets now supported:

- `gallery-p2`: existing hosted Gallery/GGM P2 renderer, default for old and invalid config.
- `christina-liquid-gallery`: new data-driven Liquid Gallery public renderer for gallery worlds.

The preset is persisted as a small sanitized Studio V2 field:

```txt
style_dna.studio_v2.publicStylePreset
```

The sanitized public room receives only the normalized scalar:

```txt
publicStylePreset: "gallery-p2" | "christina-liquid-gallery"
```

Invalid or absent values fall back to `gallery-p2`.

## 3. Studio UI Changes

Added a room-level Public Output Style selector in the Studio room inspector.

Stable test IDs:

- `presence-studio-v2-public-style-selector`
- `presence-studio-v2-public-style-option`
- `presence-studio-v2-public-style-current`

The UI makes clear that style controls public presentation only. It does not imply upload, crop, storage, style marketplace, or unsupported future capabilities.

## 4. Public Renderer Changes

Added a Christina Liquid Gallery branch in `PresenceStudioV2PublicRoom`.

It uses existing sanitized public room data only:

- room title
- tagline
- public image objects
- chamber labels
- object title/meta/detail
- public CTA
- public moodboard references

Implemented:

- large selected-work stage
- progress indicator
- prev/next controls
- dot controls
- art-label caption
- public-safe artwork focus overlay
- selected-works pathway
- practice/about treatment
- public CTA action
- mobile layout
- reduced-motion compatibility through existing public reduced-motion CSS rule

Gallery P2 remains unchanged and remains the default.

## 5. Files Changed

- `components/presence-studio-v2/PresenceStudioV2Editor.tsx`
- `components/presence-studio-v2/PresenceStudioV2PublicRoom.tsx`
- `components/presence-studio-v2/presence-studio-v2.css`
- `components/presence-studio-v2/presence-studio-v2-public.css`
- `components/presence-studio-v2/worlds.ts`
- `lib/presence/studio-v2/model.ts`
- `lib/presence/studio-v2/adapters.ts`
- `lib/presence/studio-v2/sanitize.ts`
- `lib/presence/studio-v2/studioV2Adapters.test.ts`
- `lib/presence/studio-v2/assets.test.ts`
- `lib/presence/render/publicPayload.test.ts`
- `lib/editor/readiness.test.ts`
- `tests/e2e/presence-studio-v2-public-style-presets.spec.ts`
- `docs/program/evidence/presence-studio-v2-public-style-presets-s6a/`
- `docs/program/evidence/presence-studio-v2-asset-library-s5/` (screenshots refreshed by the required S5 regression spec)
- `PRESENCE_STUDIO_V2_PUBLIC_STYLE_PRESETS_S6A_REPORT.md`
- `PRESENCE_STUDIO_V2_LOCAL_QA.md`
- `PRESENCE_STUDIO_V2_PROTOTYPE_SUPERIORITY_AUDIT.md`
- `PRESENCE_PUBLIC_OUTPUT_RECOVERY_P2_REPORT.md`

## 6. Tests Run

Passed:

```txt
npm.cmd run typecheck
npm.cmd run build
node --experimental-strip-types --test lib\presence\studio-v2\assets.test.ts
node --experimental-strip-types --test lib\presence\studio-v2\feature.test.ts
node --experimental-strip-types --test lib\presence\studio-v2\studioV2Adapters.test.ts
node --experimental-strip-types --test lib\presence\render\publicPayload.test.ts
node --experimental-strip-types --test lib\presence\render\resolver.test.ts
node --experimental-strip-types --test lib\editor\readiness.test.ts
npx.cmd playwright test presence-studio-v2-public-render.spec.ts --project=chromium
npx.cmd playwright test presence-studio-v2-draft-preview.spec.ts --project=chromium --workers=1
npx.cmd playwright test presence-public-payload-hygiene.spec.ts --project=chromium
npx.cmd playwright test presence-studio-v2-direct-manipulation.spec.ts --project=chromium
npx.cmd playwright test presence-studio-v2-inspector-usability.spec.ts --project=chromium
npx.cmd playwright test presence-studio-v2-asset-library.spec.ts --project=chromium
npx.cmd playwright test presence-public-output-gallery-quality.spec.ts --project=chromium
npx.cmd playwright test presence-public-output-gallery-polish.spec.ts --project=chromium
npx.cmd playwright test presence-studio-v2-public-style-presets.spec.ts --project=chromium
```

Notes:

- `presence-public-payload-hygiene.spec.ts` initially hit a Chromium browser-launch timeout. The same spec passed on rerun with no payload assertion failures.
- Node direct TypeScript tests still emit the existing `MODULE_TYPELESS_PACKAGE_JSON` warning.
- Build and Playwright web server still emit the existing Turbopack workspace-root warning due to multiple lockfiles.

## 7. Evidence

Evidence path:

```txt
docs/program/evidence/presence-studio-v2-public-style-presets-s6a/
```

Captured:

- `01-studio-style-selector-gallery-p2.png`
- `02-studio-style-selector-christina.png`
- `03-owner-preview-christina-sequence.png`
- `04-owner-preview-christina-focus.png`
- `05-public-christina-clean.png`
- `06-public-christina-mobile.png`
- `07-studio-style-switch-back-gallery-p2.png`
- `08-public-gallery-p2-restored.png`
- `09-legacy-negative.png`

## 8. Remaining Limitations

- No real upload/crop/storage/library changes.
- No hardcoded Christina content or Room 11-specific behavior.
- Christina Liquid Gallery currently derives sequence order from public object/chamber order.
- Only two style presets exist.
- Non-gallery worlds fall back to existing rendering.
- Public style selection changes public presentation after save/publish; it does not create a broader theme engine.
- More exact liquid morphology, shader work, and rich transition logic are deferred.

## 9. Audit Result

**Auditor:** Kimi Code CLI (2026-06-09)
**Report:** `PRESENCE_STUDIO_V2_PUBLIC_STYLE_PRESETS_S6A_AUDIT.md`
**Verdict:** PASS — deploy S6A to hosted smoke.

| Dimension | Score |
|-----------|-------|
| Public style model / adapter | 9/10 |
| Studio style selector UX | 9/10 |
| Christina Liquid Gallery renderer | 8/10 |
| Gallery P2 preservation | Pass |
| Style switching behaviour | Pass |
| Payload hygiene | Pass |
| S5 / editor regression | Pass |
| Legacy isolation | Pass |

**Tests:** 21 Playwright passed, 50 Node unit tests passed, TypeScript + build passed.
**Leakage:** No editor-only state leaks to public/preview. 20-term hygiene scan clean.
**One-off risk:** The Christina renderer is data-driven and reusable; no hardcoded content or Room 11 IDs.

## 10. Hosted Deployment

Hosted report:

```txt
PRESENCE_STUDIO_V2_PUBLIC_STYLE_PRESETS_S6A_HOSTED_SMOKE.md
```

Deployment:

- Production alias: `https://your-presence.vercel.app`
- Deployment URL: `https://presence-ektpmsott-emadhatu-2110s-projects.vercel.app`
- Deployment ID: `dpl_8Cuyuyq1sgYSpznp6jwTVNbge8Bz`
- Deployed commit: `1e4a570ae95cf154870980cdb43f1c49a91d3796`

Hosted smoke result:

```txt
npx.cmd playwright test presence-studio-v2-public-style-presets-hosted-smoke.spec.ts --project=chromium --workers=1
1 passed (18.7s)
```

Hosted smoke verified the Room 11 Studio style selector, owner preview, public `/p` route, public `/presence` alias, artwork lightbox, mobile output, and legacy `/p/hesmaddw` isolation.

Hosted gate note:

- Initial public route check failed because Room 11 node status was `unpublished` / `draft`, while editor draft and published configs were both V2.
- Existing owner node publish endpoint restored `status: published` and `public_status: public`.
- No content edits, media replacements, draft writes, S4A changes, or bbbvision changes were made.

Hosted evidence:

```txt
docs/program/evidence/presence-studio-v2-public-style-presets-s6a-hosted/
```

## 11. Readiness

Safe for Kimi design/QA audit: yes.

Safe to deploy after audit: completed.

Safe to baseline before bbbvision: yes.

S4A status during this pass:

```txt
stash@{0}: On feature/presence-ecosystem-alpha: park S4A chamber management safety-audited local work
```

Hosted data action: Room 11 node was republished through the existing owner node publish endpoint after read-only checks showed it was unintentionally unpublished while its V2 configs remained present.
