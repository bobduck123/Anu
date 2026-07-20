# Presence Studio V2 — Phase D Public Renderer Dispatch Audit

**Date:** 2026-05-31
**Auditor:** Ruthless Public-Rendering QA Agent
**Scope:** Verify whether V2 public rendering is real, safe, and ready for preview/publish/hosted-smoke wiring.
**Verdict:** **CONDITIONAL PASS — Public rendering is real and safe. One P1 gap blocks owner preview experience.**

---

## 1. Executive Verdict

Phase D successfully wires the sanitized V2 public payload into the public route. Anonymous visitors hitting a V2-enabled room receive a world-styled public room with chambers, objects, moodboard, and disclosed demo traces. No editor state, hidden objects, or internal config keys leak to the public surface.

**P0 Blockers:** None.
**P1 Issues:** 1 (owner preview page does not dispatch V2 renderer).
**P2 Issues:** 2 (no e2e coverage; mobile-muted styling ambiguity).

---

## 2. Audit Checklist & Findings

### 2.1 studioV2Room consumed only as sanitized public payload

| Checkpoint | Status | Evidence |
|---|---|---|
| Type of prop accepted by public renderer | PASS | PresenceStudioV2PublicRoom accepts only StudioV2PublicRoom |
| No editor fields on public type | PASS | StudioV2PublicObject has no locked, pinned, visibility |
| Adapter strips editor state before render | PASS | stripEditorStateFromStudioV2 filters by visibility.public, zeros transforms, strips restricted keys |
| Payload scanner asserts clean room | PASS | assertStudioV2PublicRoomClean throws if leaks detected |
| Second sanitization pass at payload level | PASS | removeRestrictedKeys(studioV2Room) in createPublicRenderPayload |
| Scanner tests verify zero leaks | PASS | publicPayload.test.ts:181 and :229 assert findRestrictedPublicPayloadKeys(payload) === [] and findRestrictedPublicPayloadFragments(payload) === [] |

---

### 2.2 PortfolioRenderer dispatches V2 as parallel renderer, not through DNA inference

| Checkpoint | Status | Evidence |
|---|---|---|
| V2 dispatch is first branch in PortfolioRenderer | PASS | PortfolioRenderer.tsx:936-938 — if (studioV2Room) { return <PresenceStudioV2PublicRoom room={studioV2Room} />; } |
| V2 dispatch runs BEFORE DNA/legacy chain | PASS | Falls through to PresenceDnaRenderer only when studioV2Room is absent |
| No DNA inference involved in V2 branch | PASS | PresenceStudioV2PublicRoom receives only room; no node, no renderModel, no DNA |
| Feature flag gates V2 payload generation | PASS | createPublicRenderPayload calls shouldUsePresenceStudioV2 before computing studioV2Room |

---

### 2.3 Legacy public render path unchanged when studioV2Room is absent

| Checkpoint | Status | Evidence |
|---|---|---|
| Non-V2 rooms fall through to DNA renderer | PASS | PortfolioRenderer.tsx:940-942 — if (!legacyMode) { return <PresenceDnaRenderer ... />; } |
| Legacy mode still callable | PASS | legacyMode prop remains functional |
| No V2 CSS leaks to legacy renderers | PASS | V2 public CSS is scoped under .presence-studio-v2-public |
| No V2 JS imports in legacy path | PASS | PresenceStudioV2PublicRoom is only imported at module top; never rendered unless studioV2Room present |

---

### 2.4 Raw editable config is not passed to public V2 renderer

| Checkpoint | Status | Evidence |
|---|---|---|
| Public route sanitizes node before PortfolioRenderer | PASS | p/[slug]/page.tsx:45-56 passes publicPayload.node (not raw node) |
| editable_config removed from public node | PASS | publicDisplayNode iterates PUBLIC_DISPLAY_NODE_KEYS; editable_config is NOT in the allow-list |
| Test asserts editable_config undefined | PASS | publicPayload.test.ts:55 — assert.equal(payload.node.editable_config, undefined) |
| V2 renderer props do not include node | PASS | PresenceStudioV2PublicRoomProps has only room: StudioV2PublicRoom |

---

### 2.5 Public V2 renderer has no editor controls, badges, locked/pinned state, hidden state, localStorage keys, or internal config names

| Checkpoint | Status | Evidence |
|---|---|---|
| No editor UI classes in public renderer | PASS | Grep for v2-toolbar, v2-side-panel, v2-float, locked, pinned, hiddenPublic, hiddenMobile, editorMode, selectedId, localStorage, sessionStorage returned zero matches in PresenceStudioV2PublicRoom.tsx and presence-studio-v2-public.css |
| No editor badges rendered | PASS | PublicObjectCard only renders role, title, meta, detail, image, link action |
| No locked/pinned indicators | PASS | StudioV2PublicObject type has no locked or pinned fields |
| No localStorage hooks | PASS | Public renderer uses zero React hooks; pure function |
| No internal config names in markup | PASS | No scene_config, style_dna, motion_config, etc. in JSX or CSS |
| CSS scoped under .presence-studio-v2-public | PASS | All 357 lines scoped; no global selectors |

---

### 2.6 Hidden public objects are removed

| Checkpoint | Status | Evidence |
|---|---|---|
| Adapter filters by visibility.public | PASS | sanitize.ts:88 — .filter((object) => object.visibility.public) |
| Private objects absent from payload test | PASS | publicPayload.test.ts:179 — assert.equal(JSON.stringify(payload).includes("private-note"), false) |
| Private objects absent from chamber count | PASS | publicPayload.test.ts:178 — chamber has 1 object instead of 2 |

---

### 2.7 Fake/demo trace data is disclosed or not rendered

| Checkpoint | Status | Evidence |
|---|---|---|
| Demo traces only render when enabled + demo | PASS | PresenceStudioV2PublicRoom.tsx:90 — room.traces?.enabled && room.traces.demo |
| Disclosure text rendered | PASS | room.traces.disclosure || "Demo traces" shown in .v2-public-trace-disclosure |
| Non-demo traces not rendered | PASS | Condition requires demo === true; real traces omitted silently |
| Test asserts disclosure present | PASS | publicPayload.test.ts:226-227 asserts traces.disclosure === "Demo traces" and guestbook entry present |

---

### 2.8 Public HTML/API output contains no restricted strings

| Checkpoint | Status | Evidence |
|---|---|---|
| Key scanner finds zero restricted keys in V2 payload | PASS | findRestrictedPublicPayloadKeys(payload) === [] in both V2 tests |
| Fragment scanner finds zero restricted strings in V2 payload | PASS | findRestrictedPublicPayloadFragments(payload) === [] in both V2 tests |
| Fragment list includes V2 editor terms | PASS | RESTRICTED_PUBLIC_PAYLOAD_VALUE_FRAGMENTS includes v2-toolbar, v2-side-panel, v2-float, WILD TRANSFORM SUSPENDED, localStorage, TemplateKit, owner API paths |
| Test verifies scanner catches fragments | PASS | publicPayload.test.ts:91-120 asserts scanner finds all injected fragments |

---

### 2.9 Public aliases still behave

| Checkpoint | Status | Evidence |
|---|---|---|
| /presence/[slug] re-exports from /p/[slug]/page | PASS | app/(public)/presence/[slug]/page.tsx — export { default } from "../../p/[slug]/page" |
| /room/[id]/key redirects to /presence/${slug} | PASS | app/(public)/room/[id]/key/page.tsx:22 — redirect(/presence/${entry.room.slug}) |
| All alias paths go through same sanitized payload | PASS | Both routes ultimately invoke createPublicRenderPayload + PortfolioRenderer |

---

### 2.10 Mobile public render is usable

| Checkpoint | Status | Evidence |
|---|---|---|
| Mobile breakpoint narrows container | PASS | @media (max-width: 720px) — width min(100% - 24px, 1120px) |
| Mobile removes wild transforms | PASS | .v2-public-object { transform: none !important; } under mobile breakpoint |
| Mobile stacks chamber heads | PASS | .v2-public-chamber-head { display: block; } on mobile |
| Responsive typography | PASS | clamp() used for h1, h2, and body text |
| Responsive object grid | PASS | grid-template-columns: repeat(auto-fit, minmax(min(100%, 240px), 1fr)) |
| Mobile padding reduced | PASS | Threshold padding drops from 72px to 48px on mobile |

---

## 3. Build & Test Integrity

| Checkpoint | Result |
|---|---|
| TypeScript typecheck | Clean (npx tsc --noEmit) |
| Next.js build | Clean (npx next build) |
| Studio V2 adapter tests | 17/17 pass |
| Public payload tests | 5/5 pass (2 new Phase D tests added) |
| **Total tested** | **22/22 pass** |

---

## 4. P0 Blockers Before Hosted Smoke

**None.**

The public renderer dispatch is safe. Anonymous visitors cannot access editor state, hidden objects, or internal config. The feature flag correctly gates rollout. Legacy rooms are unaffected.

---

## 5. P1 Issues Before Pilot Rollout

### P1-1: Owner preview page does NOT render V2 rooms (HIGH PRIORITY)
**File:** components/studio/editor/PresenceDraftPreviewPage.tsx:203
**Finding:** The preview page passes node={previewNode} renderMode="draft" to PortfolioRenderer but does NOT construct or pass studioV2Room. Owners editing a V2 room will see the DNA renderer (or legacy fallback) in preview instead of their actual V2 room.
**Impact:** Owner cannot verify their V2 room before publishing. Breaks trust in the preview/publish flow.
**Fix:** Import createPublicRenderPayload (or manually construct studioV2Room from the draft config) and pass it to PortfolioRenderer alongside previewNode.

### P1-2: No e2e/browser test for public V2 rendering
**Finding:** No Playwright spec verifies that an anonymous visitor sees a V2 room with correct world styling, object grid, moodboard, and disclosed traces.
**Impact:** Regressions in public rendering won't be caught in CI.
**Fix:** Add a Playwright spec that visits a published V2 demo room and asserts on world class, object count, moodboard presence, and absence of restricted strings in page source.

---

## 6. P2 Issues

### P2-1: Mobile-muted objects remain visible on mobile
**Finding:** Objects with mobileVisible: false receive .is-mobile-muted which only changes border to dashed. They are not hidden on mobile viewports.
**Impact:** Minor — visitors on mobile still see desktop-only content, just styled differently.
**Fix:** Either hide with display: none inside the mobile breakpoint, or confirm the dashed-border treatment is intentional design.

### P2-2: mobileRecovery present in public payload but unused by renderer
**Finding:** StudioV2PublicRoom includes mobileRecovery, and the public renderer already applies transform suspension via CSS media query. The payload field is harmless but redundant.
**Impact:** None — no data leak, no render behavior change.
**Fix:** Optional — could remove from public type if not needed by future analytics.

---

## 7. File Inventory (Phase D Touch Points)

| File | Lines | Role |
|---|---|---|
| app/(public)/p/[slug]/page.tsx | 81 | Public route — creates sanitized payload, renders PortfolioRenderer |
| app/(public)/presence/[slug]/page.tsx | 2 | Alias re-export |
| components/presence-studio-v2/PresenceStudioV2PublicRoom.tsx | 197 | V2 public room renderer (pure component) |
| components/presence-studio-v2/presence-studio-v2-public.css | 357 | Scoped public stylesheet |
| components/portfolio/PortfolioRenderer.tsx | 1027 | Dispatches to V2 when studioV2Room present |
| lib/presence/render/publicPayload.ts | 215 | Payload builder with V2 seam, key/fragment scanners |
| lib/presence/render/publicPayload.test.ts | 234 | Tests for payload hygiene including V2 cases |
| lib/presence/studio-v2/sanitize.ts | 159 | stripEditorStateFromStudioV2 + leak scanners |
| lib/presence/studio-v2/adapters.ts | 713 | Bidirectional adapter (unchanged from Phase C) |
| lib/presence/studio-v2/feature.ts | 80 | Feature flag gating (unchanged from Phase C) |

---

## 8. Recommendation

**Phase E (preview/publish/hosted-smoke) can proceed with one prerequisite:**

1. **Fix P1-1 first.** The owner preview page MUST construct and pass studioV2Room to PortfolioRenderer so owners can preview their V2 rooms before publishing. Without this, hosted smoke tests of the preview->publish flow will fail for V2 rooms.

2. **Add e2e smoke test as part of Phase E.** Verify anonymous visitors see the V2 public room and the page source contains no restricted strings.

3. **Resolve P2-1 mobile-muted behavior** before pilot — confirm whether desktop-only objects should be hidden or merely styled on mobile.

**Phase D entry criteria met for public anonymous rendering:**
- Real public V2 rendering verified
- Payload hygiene clean (zero restricted keys/fragments)
- Legacy renderer safe and unchanged
- Mobile render usable
- Feature flag gating active
- Build clean, tests pass

---

*End of audit.*