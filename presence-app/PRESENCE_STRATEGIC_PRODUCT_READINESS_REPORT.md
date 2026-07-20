# Presence Current State & Blocker Report

**Date:** 2026-06-11  
**Branch:** `feature/presence-ecosystem-alpha`  
**Auditor:** Kimi Code CLI  
**Scope:** `C:\Dev\Flora_fauna\presence-app` and backend touchpoints  
**Evidence inspected:** code, tests, reports, screenshots in `docs/program/evidence/`

---

## 1. Executive Verdict

Presence is **not a product yet**. It is a **technically promising operator-led pilot system** with one genuinely strong public renderer path (gallery world) and a real but incomplete owner studio.

The blunt truth:

- **What works:** A controlled owner can edit a gallery-world room, save/preview/publish it, and get a visually credible public Presence room in one of three styles (Gallery P2, Christina Liquid, bbbvision Canvas).
- **What does not work:** A stranger cannot sign up and create a compelling Presence room without human help. The onboarding flow submits a support ticket, not a room. Only one of eight "worlds" has real public-output depth. The editor lacks image upload, auto-save, chamber deletion, and broad mobile polish. Non-gallery worlds are mostly colour/texture swaps on the same chassis.
- **Current honest positioning:** Operator-led pilot system. Not public demo. Not paid pilot. Not self-serve. Not scale.

The central risk is that the team has confused **technical closure of pilot smoke tests** with **product readiness**. The tests prove that the controlled path does not crash and does not leak data. They do not prove that Presence delivers the intended self-expression, spatial identity, or world-class public presentation product.

---

## 2. The Core Diagnosis

Presence has moved from **concept-risk to execution-risk**, but it has not moved from **pilot-risk to product-risk**.

The system can technically publish rooms. The public renderer for the gallery world is genuinely good. The editor is wired and functional. Payload hygiene is disciplined. Tests pass.

But the product promise is a **new kind of self-serve digital presence**: a modern MySpace/Tumblr-level self-expression layer that is spatial, emotionally compelling, mobile-first, and eventually social/transactive. Against that promise, Presence is still a **narrow demo wrapped in robust engineering**.

The core problem is **asymmetric depth**:

- The **gallery world** has had multiple recovery passes and now feels close to premium.
- The **other seven worlds** are declarations in a config file, not differentiated experiences.
- The **editor** supports rich manipulation for gallery rooms but cannot delete a chamber, upload an image, or auto-save.
- The **onboarding** asks sophisticated questions and then emails the studio instead of building anything.
- The **tests** cover the paths that have been built, not the product that has been promised.

This asymmetry means Presence can impress in a controlled demo but cannot yet survive unguided use.

---

## 3. What Is Working

Only meaningful, product-relevant achievements:

1. **Gallery-world public output is real and visually credible.** Gallery P2, Christina Liquid Gallery, and bbbvision Canvas are distinct, data-driven, and hosted-verified. The bbbvision Canvas 2D engine now reproduces the original spherical gallery feel closely enough for pilot use.
2. **Owner editor lifecycle is wired.** Load draft, edit objects/chambers/skin, save, preview, publish — all real, all tested, all payload-hygiene-checked.
3. **Public payload hygiene is strong.** Editor metadata, auth tokens, locked/pinned state, and internal config are stripped before public render. Tests and hosted smoke verify this.
4. **Template-kit room generation is real.** `/studio/template-kits` produces structured Studio Room drafts with chambers, objects, theme tokens, and CTA scaffolds.
5. **bbbvision migration is complete locally.** The canvas gallery engine passes visual-motion re-audit and has loading, focus strip-burst, deterministic scatter, and mobile guards.
6. **Feature-flag safety is disciplined.** V2 rollout is triple-gated (env flag, renderer key, pilot ID list). Production blocks empty pilot lists.
7. **Test evidence culture exists.** ~40 Playwright specs, ~30 Node unit-test files, multiple hosted smoke reports, and screenshot evidence bundles are maintained.
8. **Asset library (S5) works.** Derived assets, media health warnings, replace-URL flow, and suspected-test-asset detection are implemented and tested.

---

## 4. What Is Not Yet Good Enough

### Functionality
- **Onboarding does not create a room.** `/presence-chooser` collects direction and submits a setup request. The only real room generation is behind `/studio/template-kits`, which requires the user to already be an owner.
- **No image upload/crop/focal point.** Image objects require a public URL. The UI honestly says upload tools are not in this build.
- **No auto-save.** Owners must manually save; data-loss risk is real.
- **No chamber delete.** Stale chambers accumulate.
- **No chamber-level visibility.** Progressive disclosure and mobile-tailored chambers are impossible.
- **Work-detail routes remain legacy.** `/p/[slug]/works/[workId]` is not on the V2 renderer.

### UX
- **Non-technical client self-serve is not possible.** Between onboarding as a ticket, no upload, no auto-save, and no chamber delete, a real client still needs an operator.
- **Mobile editor is simulated, not responsive.** The viewport toggle shows a device frame; the actual editor layout collapses but is not designed for touch creation.
- **Mobile threshold wayfinding is hidden.** The threshold index disappears below 860px, leaving small-screen visitors without a path.
- **Lightbox is minimal.** No prev/next navigation; faint page bleed behind overlay.

### Visual result
- **Non-gallery worlds are template theatre.** `zine`, `dj`, `healing`, `market`, `archive`, `carpenter`, `consultant` reuse the same threshold + stacked-chamber layout with colour/texture swaps. They do not feel like distinct room personalities.
- **CTA labels are functional, not atmospheric.** "REQUEST AVAILABILITY" breaks the portal mood.
- **Default non-V2 fallback is a conventional profile page.** It undermines the Presence promise.

### Generation quality
- **TemplateKit drafts are structural shells with placeholder copy.** User onboarding answers are not injected into hero, practice statement, or CTAs.
- **No mapping from onboarding answers to a kit.** Even if onboarding were connected to TemplateKit, there is no router selecting a kit from identity/world/movement choices.
- **Dead onboarding components** (`OnboardingWizard`, `BetaOnboardingForm`) still promise "generate your draft Presence" but are no longer mounted.

### Customisation
- **Style presets are gallery-only.** Advanced presets (`christina-liquid-gallery`, `bbbvision-threshold-gallery`) only activate when `worldId === "gallery"`.
- **World switching does not switch public experience deeply.** Beyond gallery, worlds change mostly skin tokens.
- **Layout control is object-level, not room-level.** No global layout recipes, no breakpoint-aware arrangements.

### Mobile experience
- **bbbvision canvas keeps 256 shapes on mobile.** DPR cap and reduced glitch help, but entry-level devices may drop frames.
- **No swipe gestures** for gallery or lightbox navigation.
- **Mobile-muted objects have ambiguous intermediate behaviour.** At some widths they show as dashed-border instead of hidden; this needs a design decision.

### Self-serve readiness
- **Onboarding ends in human review.** The product target is no-human-in-the-loop unless necessary. Current implementation is the opposite.
- **No public sign-up → room creation flow exists.** A new user cannot arrive, sign up, answer questions, and leave with a published room.

---

## 5. Smoke-Test Success vs Product Reality

The system has a pattern: **tests pass for the narrow path that was built; the product weakness lies in the paths that were not built or were faked.**

| Test / Smoke | What it proves | What it hides |
|---|---|---|
| `presence-studio-v2-bbbvision-canvas-gallery.spec.ts` 5/5 | Canvas gallery works for the bbbvision pilot fixture. | Only tests the gallery world with seeded mock images. Does not prove general room quality. |
| `presence-public-payload-hygiene.spec.ts` 2/2 | Public HTML does not leak editor metadata. | Does not prove the public output is emotionally compelling or original. |
| `presence-studio-v2-public-style-presets.spec.ts` 1/1 | Style presets can be switched for gallery world. | Presets only exist for gallery world. |
| Hosted smoke (gallery P2, Christina, bbbvision) | Production-like public render is stable. | All gallery-world. No hosted smoke for zine/dj/healing/market/archive/carpenter/consultant. |
| `presence-studio-v2-chamber-dynamics.spec.ts` 16/16 | Chamber metadata can be edited and persists. | Does not test chamber deletion or chamber-level visibility, both real product needs. |
| `presence-studio-v2-asset-library.spec.ts` 1/1 | Asset health and URL replacement work. | Requires public URLs; does not test image upload. |
| Onboarding tests (absent) | — | The onboarding flow is not tested end-to-end because it does not create a room. |

**The confusion:** Passing controlled-pilot tests has been interpreted as progress toward the Presence vision. In reality, the tests validate that the **existing demo path is safe**, while the **actual product path** (unguided user → generated room → self-edited → published → discovered → socially engaged → transacted) is largely unbuilt.

---

## 6. Blockers by Severity

### P0: Core promise blockers

| # | Blocker | Why it matters | Evidence | Root cause | Remediation direction |
|---|---|---|---|---|---|
| P0.1 | **Onboarding does not generate a room.** The public intake submits a setup request instead of creating a Presence room. | The entire self-serve value proposition depends on a user leaving with a room. Currently they leave with a support ticket. | `/presence-chooser` → `POST /api/presence/setup-requests`; backend docstring confirms it never creates a `PresenceNode`. | Product decision + missing wiring between intake and TemplateKit generator. | Connect `/presence-chooser` to `instantiateTemplateKitDraft`; add answer-to-kit mapping; auto-populate kit copy from user answers. |
| P0.2 | **Only one of eight worlds has real public-output depth.** | The promise is spatial room personalities. Seven worlds are skin swaps. | `components/presence-studio-v2/worlds.ts` declares 8 worlds; public renderer only special-cases gallery presets. | Recovery work focused on gallery because it was the pilot. | Design and build distinct public-output recipes for zine, dj, healing, market, archive, carpenter, consultant. |
| P0.3 | **No image upload, crop, or focal point.** | A self-expression product where users cannot upload their own images is not viable. | Editor inspector explicitly states upload tools are not in this build. | Upload pipeline and storage integration deferred. | Implement Supabase storage upload with crop/focal UI. |

### P1: Pilot/demo blockers

| # | Blocker | Why it matters | Evidence | Root cause | Remediation direction |
|---|---|---|---|---|---|
| P1.1 | **No auto-save.** | Manual save is acceptable for operators, risky for real clients. | Editor uses explicit Save draft only. | Feature deferred. | Debounced draft patch with conflict/undo UI. |
| P1.2 | **No chamber delete or chamber-level visibility.** | Owners cannot clean up or progressively disclose their room. | Chamber dynamics spec has add/rename/reorder but no delete or visibility flags. | Scope cut in S4A; currently parked in stash. | Implement safe chamber delete + chamber visibility (public/mobile/hidden). |
| P1.3 | **Mobile threshold wayfinding is hidden.** | Small-screen visitors lose orientation. | CSS hides `.v2-public-threshold-index` below 860px. | Design not finalized for mobile index. | Redesign mobile threshold wayfinding as sheet/dots/bottom nav. |
| P1.4 | **Lightbox has no prev/next navigation.** | Browsing work in focus state is cumbersome. | Focus overlay is single-image with Escape-to-close only. | Scope cut for minimal overlay. | Add prev/next arrows, keyboard support, swipe gestures. |
| P1.5 | **TemplateKit drafts are empty shells.** | Generated rooms arrive with placeholder copy; user answers are wasted. | `instantiateTemplateKitDraft` produces scaffolds but does not inject onboarding text. | No mapping/copy-generation layer built yet. | Build rule-based copy population from onboarding answers into kit chambers. |
| P1.6 | **Work-detail routes remain legacy.** | V2 public output breaks when visitors deep-link to a work. | `app/(public)/p/[slug]/works/[workId]/page.tsx` uses legacy renderer. | V2 recovery did not cover work detail. | Build V2 work-detail view or redirect to gallery focus state. |

### P2: Polish/scale blockers

| # | Blocker | Why it matters | Evidence | Root cause | Remediation direction |
|---|---|---|---|---|---|
| P2.1 | **Dead code from DOM constellation era.** | Orphaned `.v2-bbb-star` CSS and `constellationStarStyle()` remain. | `presence-studio-v2-public.css` lines 3547–3589; `PresenceStudioV2PublicRoom.tsx` line 601. | Cleanup deferred after canvas migration. | Remove dead CSS and helper. |
| P2.2 | **bbbvision canvas keeps 256 shapes on mobile.** | Entry-level devices may drop frames. | `FIELD_GRID_SIZE = 16` constant on mobile. | Performance/correctness trade-off. | Add adaptive shape count based on viewport/device class. |
| P2.3 | **No CI / GitHub Actions.** | Regressions only caught when manually run. | No `.github/workflows` file. | CI not set up. | Add workflow for typecheck, build, unit tests, core Playwright subset. |
| P2.4 | **Real-backend contract tests routinely skipped.** | Mock API may drift from backend behaviour. | `gardens-halls-contract.spec.ts` needs `PRESENCE_REAL_BACKEND_URL`. | No staging environment wired into local dev. | Run contract tests against staging backend in CI. |
| P2.5 | **Accessibility / screen-reader tests absent.** | Premium product claim requires a11y proof. | No axe-core or a11y assertions. | Scope cut. | Add automated a11y checks and manual screen-reader passes. |
| P2.6 | **No performance budgets.** | Canvas gallery and heavy CSS could regress. | No Lighthouse/performance tests. | Scope cut. | Add Lighthouse CI with budgets. |

---

## 7. Subsystem Readiness Table

| Subsystem | Score /10 | Status | Main issue | Required next move |
|---|---|---|---|---|
| **Public output — gallery world** | 8.3 | Pilot-ready | Strong for gallery; other worlds under-designed. | Keep stable; extract patterns for other worlds. |
| **Public output — non-gallery worlds** | 5.0 | Demo theatre | Skin swaps on same chassis; no distinct personality. | Design and build world-specific public recipes. |
| **Editor / studio** | 6.5 | Functional for operators | Missing upload, auto-save, chamber delete, mobile design. | Add upload, auto-save, chamber delete/visibility. |
| **Customisation** | 5.5 | Object/chamber level only | No global layouts, presets gallery-only, worlds shallow. | Add room-level layout recipes and world-specific presets. |
| **Generation / onboarding** | 3.0 | Not self-serve | Intake submits support ticket; generator isolated. | Wire intake to TemplateKit; map answers to kits; populate copy. |
| **Room / chamber / object model** | 6.8 | Solid core, roadmap gaps | No chamber delete/visibility; future primitives absent. | Extend model for chamber visibility; design World primitives. |
| **Media handling** | 6.0 | URL-based only | No upload, crop, focal point; relies on external URLs. | Implement Supabase upload + crop/focal UI. |
| **Mobile** | 6.5 | Usable, not excellent | Hidden threshold index, no swipe, 256-shape canvas, simulated editor. | Mobile-first redesign of threshold/lightbox/editor. |
| **Admin / superuser** | 4.0 | Minimal | Admin preview of setup requests exists; no broad operational panel. | Build admin panel for rooms, owners, pilots, moderation. |
| **Social / business layer** | 3.0 | Concept only | Observer profiles, mood boards, paths, passes exist as routes but not as a connected social economy. | Design transaction/mask/anti-bot primitives; integrate. |
| **Security / payload hygiene** | 8.5 | Strong | Multi-layer sanitization, restricted-key asserts, feature flags. | Maintain; add tenant cross-leakage tests. |
| **Test / evidence coverage** | 7.0 | Serious for controlled scope | No CI, real-backend contracts skipped, onboarding untested, a11y/perf absent. | Add CI, contract tests, onboarding E2E, a11y/perf budgets. |
| **Deployment / hosted reliability** | 7.0 | Hosted smoke passing for gallery | No recurring hosted smoke; no CI; manual verification. | Automate hosted smoke; add monitoring/alerting. |

---

## 8. The Gap to the Actual Presence Vision

| Vision pillar | Current state | Gap |
|---|---|---|
| **Modern MySpace/Tumblr-level self-expression** | Object-level edit, skin tokens, chamber reorder. | No upload, no auto-save, no layout recipes, no custom CSS/HTML, no deep personalisation beyond presets. |
| **Spatial/room-based identity** | Gallery world has spatial feel; others are stacked pages. | Only gallery is spatial. Worlds are not differentiated enough to feel like distinct rooms. |
| **World-class public presentation** | Gallery P2, Christina, bbbvision are strong. | Other worlds and fallback pages are conventional. Mobile lacks polish. |
| **Self-serve client control** | Editor works for operators. | Onboarding fails to create a room; upload missing; no chamber delete. Real clients cannot self-serve. |
| **Strong first generated result** | TemplateKit produces structured drafts. | Drafts are shells; onboarding answers are not used; answer-to-kit mapping absent. |
| **Mobile-first presence** | Public pages are responsive; editor simulates mobile. | Editor not designed for touch creation; mobile threshold index hidden; no swipe. |
| **Future social/anti-bot layer** | Routes exist for observer, mood boards, paths, passes, world. | Not connected into a coherent social economy; anti-bot positioning unspecified. |
| **Future transaction/take-rate layer** | No evidence. | Requires room ownership model, payment integration, approved-room governance. |

**Summary:** Presence has built **one credible room experience** (gallery world) and **one credible editor** for that experience. It has not yet built the **product system** that lets many kinds of users create many kinds of rooms with minimal assistance.

---

## 9. Recommended Next Execution Passes

Only the 24 highest-leverage passes:

### A. Onboarding → Room Generation (P0)

1. **Connect presence-chooser to TemplateKit generation**
   - Objective: `/presence-chooser` answers create a real Studio Room draft on submission.
   - Why: Without this, self-serve does not exist.
   - Success: A new user can sign up, answer questions, and land on a generated room draft.
   - Don't waste time on: AI copy generation. Start with deterministic mapping.
   - Acceptance: E2E spec proves sign-up → chooser → generated draft.

2. **Build answer-to-kit mapping**
   - Objective: Map identity/world/movement/mood selections to a primary TemplateKit.
   - Why: User answers must translate into a room structure.
   - Success: Each canonical onboarding answer combination selects a deterministic kit.
   - Don't waste time on: Machine learning. Use product rules.
   - Acceptance: Unit tests cover all canonical combinations.

3. **Populate kit copy from onboarding answers**
   - Objective: Inject user's display name, headline, world statement, and CTA into kit chambers.
   - Why: Currently generated rooms are empty shells.
   - Success: Generated room draft has personalised hero, about, and CTA copy.
   - Don't waste time on: Perfect prose. Start with safe interpolation.
   - Acceptance: Generated room contains user's exact headline and contact intent.

4. **Delete dead onboarding components**
   - Objective: Remove `OnboardingWizard` and `BetaOnboardingForm` or revive them explicitly.
   - Why: They promise generation but are not mounted; future agents will be confused.
   - Success: Only active onboarding paths remain in repo.
   - Don't waste time on: Preserving unused code.
   - Acceptance: Grep finds no orphaned "generate your draft Presence" UI.

### B. Editor Hard Needs (P1)

5. **Image upload with Supabase storage**
   - Objective: Owner can upload an image, get a public URL, assign it to an object.
   - Why: Self-expression product cannot require users to host their own images.
   - Success: Upload → storage → thumbnail → object assignment in one flow.
   - Don't waste time on: Advanced cropping v1. Ship upload first.
   - Acceptance: E2E uploads a file and sees it in public preview.

6. **Image crop / focal point**
   - Objective: Owner can set crop anchor and focal point for thumbnails and hero.
   - Why: Visual quality depends on image framing.
   - Success: Crop/focal edits reflect in public output.
   - Don't waste time on: AI auto-crop. Manual control first.
   - Acceptance: Canvas thumbnail uses owner's crop anchor.

7. **Auto-save**
   - Objective: Debounced draft patch with conflict/undo handling.
   - Why: Manual save is a liability for real clients.
   - Success: 5-second idle auto-save; explicit undo for last auto-save.
   - Don't waste time on: Full revision history. Latest auto-save is enough.
   - Acceptance: Auto-save spec passes; no data loss on accidental navigation.

8. **Chamber delete**
   - Objective: Owner can delete a chamber and choose whether to delete or unassign its objects.
   - Why: Real rooms evolve; stale chambers accumulate.
   - Success: Delete chamber → objects unassigned or removed → save persists.
   - Don't waste time on: Undo stack. Snackbar confirmation is enough.
   - Acceptance: Chamber dynamics spec covers delete + orphaned-object handling.

9. **Chamber-level visibility**
   - Objective: Chambers can be public / mobile-only / hidden.
   - Why: Progressive disclosure and mobile tailoring.
   - Success: Hidden chamber omitted from public; mobile-only hidden on desktop.
   - Don't waste time on: Per-chamber permissions. Visibility only.
   - Acceptance: Public payload excludes hidden chambers; mobile variant respected.

10. **Work-detail V2 view**
    - Objective: `/p/[slug]/works/[workId]` renders through V2 renderer.
    - Why: Deep links currently fall back to legacy renderer, breaking continuity.
    - Success: Work detail opens V2 focus overlay or dedicated V2 work page.
    - Don't waste time on: New layout. Reuse gallery focus overlay.
    - Acceptance: Direct work URL opens V2-styled view.

### C. World Public-Output Recovery (P1/P2)

11. **Zine world public recipe**
    - Objective: Distinct public output for zine world (masonry, zine spreads, editorial density).
    - Why: Worlds must feel different, not recoloured.
    - Success: Zine room public output does not reuse gallery threshold/chamber layout.
    - Don't waste time on: Animation extravagance. Distinct layout and typography first.
    - Acceptance: Visual smoke proves zine output is recognisably different from gallery.

12. **DJ world public recipe**
    - Objective: Distinct public output for DJ world (player, mixes, event list, dark club atmosphere).
    - Why: DJ is a use case in the kit library.
    - Success: DJ room has audio player affordance and event-style layout.
    - Don't waste time on: Real audio streaming. Static mix list first.
    - Acceptance: DJ room renders with mix list and event cards.

13. **Healing / market / archive / carpenter / consultant world recipes**
    - Objective: Distinct public output for each remaining world.
    - Why: Eight worlds are promised; only one is real.
    - Success: Each world has a layout tailored to its content type.
    - Don't waste time on: Per-world animations. Layout + content modules first.
    - Acceptance: Visual smoke for each world shows distinct structure.

### D. Mobile & Interaction (P1)

14. **Mobile threshold wayfinding**
    - Objective: Replace hidden index with visible mobile wayfinding.
    - Why: Small-screen visitors currently have no orientation.
    - Success: Dots, bottom sheet, or swipeable sections on mobile threshold.
    - Don't waste time on: Desktop changes. Mobile only.
    - Acceptance: Mobile threshold screenshot shows clear navigation.

15. **Swipe gestures for gallery and lightbox**
    - Objective: Swipe left/right navigates works in gallery focus and lightbox.
    - Why: Expected mobile behaviour.
    - Success: Swipe changes active work; swipe down closes lightbox.
    - Don't waste time on: Complex physics. Basic swipe detection.
    - Acceptance: Mobile E2E swipes through works.

16. **Lightbox prev/next and improved backdrop**
    - Objective: Add prev/next arrows and opaque backdrop to focus overlay.
    - Why: Current lightbox feels unfinished.
    - Success: Visitors can browse without closing focus.
    - Don't waste time on: Transitions. Functional navigation first.
    - Acceptance: Keyboard and pointer prev/next both work.

17. **Touch-first editor redesign**
    - Objective: Editor usable on a tablet for real creation tasks.
    - Why: Self-serve users will edit on mobile/tablet.
    - Success: Drag, resize, inspector, save work on touch without simulation frame.
    - Don't waste time on: Full feature parity. Core create/edit flow first.
    - Acceptance: Editor smoke passes on mobile viewport with touch events.

### E. Quality & Automation (P2)

18. **Remove bbbvision dead code**
    - Objective: Delete `.v2-bbb-star` CSS and `constellationStarStyle()`.
    - Why: Dead code confuses future work and bloats CSS.
    - Success: No orphaned star references remain.
    - Don't waste time on: Refactoring unrelated CSS.
    - Acceptance: Grep clean; tests pass.

19. **Adaptive canvas shape count**
    - Objective: Reduce bbbvision shapes on low-end mobile devices.
    - Why: 256 shapes may drop frames on entry-level phones.
    - Success: Shape count scales by device class / viewport.
    - Don't waste time on: Perfect heuristics. Cap at 128 for small viewports.
    - Acceptance: Performance smoke on simulated low-end device stays ≥55fps.

20. **CI pipeline**
    - Objective: GitHub Actions running typecheck, build, unit tests, core Playwright subset.
    - Why: Manual verification does not scale.
    - Success: PRs blocked on failure.
    - Don't waste time on: Full cross-browser suite in CI. Chromium core subset first.
    - Acceptance: CI workflow green on main.

21. **Real-backend contract tests in CI**
    - Objective: Run `gardens-halls-contract.spec.ts` against staging backend automatically.
    - Why: Mock API may drift from backend.
    - Success: Nightly or PR-gated contract run.
    - Don't waste time on: Full backend test suite in frontend CI. Contract tests only.
    - Acceptance: Contract job passes against staging.

22. **Accessibility audit and assertions**
    - Objective: Add axe-core checks to critical flows.
    - Why: Premium product must be accessible.
    - Success: No critical a11y violations in editor, threshold, gallery, focus.
    - Don't waste time on: Perfection. Critical + serious violations first.
    - Acceptance: axe-core reports zero critical/serious issues.

23. **Performance budgets**
    - Objective: Lighthouse CI with budgets for public room pages.
    - Why: Canvas gallery and heavy CSS can regress.
    - Success: Performance score ≥80 on mobile for public room pages.
    - Don't waste time on: Sub-100 scores. 80+ realistic.
    - Acceptance: Lighthouse CI passes on main.

24. **Tenant cross-leakage tests**
    - Objective: Explicit tests that one owner cannot read/edit another room via route manipulation.
    - Why: Tenant safety is a stated non-negotiable principle.
    - Success: Negative tests for cross-room editor/preview/public access.
    - Don't waste time on: Exhaustive auth permutations. Key cross-tenant paths.
    - Acceptance: Cross-owner negative spec passes.

---

## 10. Final Recommendation

**Position Presence as an operator-led pilot system.**

Do not call it:
- Public demo
- Paid pilot
- Self-serve product
- Scale product

**It is ready for:**
- Controlled operator-led pilots where a studio member sets up the room with the client.
- Gallery-world rooms (P2, Christina, bbbvision) in production for approved pilot IDs.
- Continued investment in onboarding, upload, auto-save, and non-gallery worlds.

**It is not ready for:**
- Unguided public sign-up and room creation.
- Sales to non-technical clients who need to self-build.
- Broad marketing as a "build your Presence" self-serve product.

**The path to product:**
1. Close the onboarding → generation gap (passes 1–4).
2. Make the editor self-serve-ready (passes 5–10).
3. Build world-specific public output for at least 3 more worlds (passes 11–13).
4. Mobile-first redesign of threshold, lightbox, and editor (passes 14–17).
5. Harden automation, accessibility, performance, and security (passes 18–24).

Only after these passes should Presence be repositioned as a **paid pilot** and eventually **self-serve product**.

---

## Appendix A: Evidence

### Commands run
- `npm run typecheck` — ✅ pass
- `npm run build` — ✅ pass
- `node --experimental-strip-types --test lib/presence/studio-v2/*.test.ts lib/presence/render/*.test.ts lib/editor/*.test.ts` — ✅ 92/92
- `npx playwright test presence-studio-v2-bbbvision-canvas-gallery.spec.ts --project=chromium` — ✅ 5/5
- `npx playwright test presence-studio-v2-bbbvision-gallery-parity.spec.ts --project=chromium` — ✅ 12/12
- `npx playwright test presence-studio-v2-bbbvision-parity.spec.ts --project=chromium` — ✅ 2/2
- `npx playwright test presence-public-payload-hygiene.spec.ts --project=chromium` — ✅ 2/2
- Broader regression batch (`public-style-presets`, `public-render`, `draft-preview`, `chamber-dynamics`) — ✅ 22/22

### Files inspected
- `app/(public)/p/[slug]/page.tsx`
- `app/(public)/presence/[slug]/page.tsx`
- `app/(public)/presence-chooser/page.tsx`
- `app/(studio)/studio/[id]/editor/page.tsx`
- `app/(studio)/studio/[id]/editor/preview/page.tsx`
- `app/(studio)/studio/template-kits/page.tsx`
- `components/presence-studio-v2/PresenceStudioV2Editor.tsx`
- `components/presence-studio-v2/PresenceStudioV2PublicRoom.tsx`
- `components/presence-studio-v2/BbbVisionCanvasGallery.tsx`
- `components/presence-studio-v2/worlds.ts`
- `components/presence-studio-v2/presence-studio-v2-public.css`
- `lib/presence/studio-v2/model.ts`, `adapters.ts`, `chambers.ts`, `sanitize.ts`, `feature.ts`, `assets.ts`
- `lib/presence/render/publicPayload.ts`, `resolver.ts`
- `lib/presence/studio-room/templateDrafts.ts`
- `flora-fauna/backend/app/services/presence_editor_config.py`
- `flora-fauna/backend/app/services/presence_template_kit_drafts.py`
- `flora-fauna/backend/app/api/presence.py`, `presence_owner.py`
- All major `PRESENCE_*_REPORT.md` and `*_AUDIT.md` files in `presence-app/`

### Routes inspected
- `/p/[slug]` and `/presence/[slug]` — public room renderer
- `/presence-chooser` — onboarding intake
- `/studio/[id]/editor` — owner editor
- `/studio/[id]/editor/preview` — draft preview
- `/studio/template-kits` — TemplateKit generator

### Screenshot / evidence paths
- `docs/program/evidence/presence-v3-bbbvision-canvas-conditional-reaudit/`
- `docs/program/evidence/presence-public-output-recovery-p2/`
- `docs/program/evidence/presence-studio-v2-public-style-presets-s6a/`
- `docs/program/evidence/presence-studio-v2-asset-library-s5/`
- `docs/program/evidence/presence-studio-v2-bbbvision-hosted-migration/`

### Assumptions / unverified areas
- Hosted production state was not mutated; hosted smoke was not re-run by this audit.
- Backend unit tests were reported by a subagent; this audit did not directly execute backend pytest.
- Real Supabase email verification flow was not exercised.
- Performance/frame-rate claims for bbbvision canvas are based on code inspection and smoke-test stability, not device lab testing.
