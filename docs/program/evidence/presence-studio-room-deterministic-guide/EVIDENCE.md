# Evidence: Deterministic Studio Guide — Adversarial Review & Hardening

## Review scope

Institutional-grade self-adversarial review of the Studio Guide implementation:
- `lib/presence/studio-room/studioGuide.ts`
- `tests/presence/studio-room/studioGuide.test.ts`
- `components/presence-studio/StudioRoomOwnerEditorShell.tsx`
- `tests/e2e/presence-studio-room-multi-kit-lifecycle.spec.ts`

## Issues found and changes made

### 1. Brittle gallery count inference — FIXED
**Issue:** Gallery image count was inferred by string-matching human-readable `requiredFields` (`f.includes("three") || f.includes("3")`). This would silently break if kit field descriptions were reworded.

**Fix:** Added explicit `KIT_GUIDANCE_RULES` constant keyed by `templateKitId` with stable booleans/numbers:
- `minGalleryImages?: number`
- `expectsProof?: boolean`
- `expectsServices?: boolean`
- `expectsContact?: boolean`
- `expectsPortal?: boolean`
- `expectsInvitation?: boolean`
- `expectsThreshold?: boolean`

All five primary kits now have explicit, version-stable rule declarations.

### 2. Misleading `requiredFieldNames.has()` lookups — FIXED
**Issue:** `requiredFieldNames.has("proof")`, `has("services")`, `has("contact")` used exact string matches on human-readable requiredFields. None of the actual kit requiredFields contain the exact word `"proof"` (they say `"proof image"`, `"proof signal"`, etc.), so these lookups were dead code that gave a false impression of safety.

**Fix:** Removed the `requiredFieldNames` Set entirely. All kit-semantic checks now route through `KIT_GUIDANCE_RULES[room.templateKitId]`, which is deterministic and independent of copy changes.

### 3. Missing `work`/`work-card` in gallery count — FIXED
**Issue:** Gallery count only counted `image` and `media` objects. `work` and `work-card` objects (used by semantic adapters for portfolio items) were excluded.

**Fix:** Added `o.type === "work" || o.type === "work-card"` to the gallery counter.

### 4. Missing portal/links guidance — FIXED
**Issue:** Kits like `cultural-community-artist`, `material-tradie-proof-card`, `healing-practitioner`, and `consultant-contractor` include portal chambers, but the guide had no rule for them.

**Fix:** Added portal presence check: if kit expects portal and none exists → polish issue. If portal exists but has no link objects → polish issue.

### 5. Missing invitation chamber content check — FIXED
**Issue:** The invitation chamber often contains only a CTA object. A button with no surrounding context feels abrupt.

**Fix:** Added invitation content check: if invitation chamber exists but has no non-CTA objects with body/title → advisory issue.

### 6. Proof content check excluded title — FIXED
**Issue:** `hasProofContent` only checked `quote` and `body`, missing `title`. A testimonial with only a title (e.g., "Great work!") would be flagged as empty.

**Fix:** Included `title.length > 0` in proof content validation.

### 7. Contact check excluded URL and action — FIXED
**Issue:** Contact info detection only checked `body` and `title`, missing `url` and `action.href`. A link-card with a public email URL would not count.

**Fix:** Included `url.length > 0` and `actionHref.length > 0` in contact detection.

### 8. Arbitrary `completedCount` — FIXED
**Issue:** `estimateTotalChecks` was fake arithmetic (`room.chambers.length * 3 + objects.length * 2 + requiredFields.length`). `completedCount = totalChecks - issues.length` was meaningless and potentially misleading.

**Fix:** Replaced with an honest structural score: +1 for each major block that is present and valid (title, CTA, threshold, proof, services, contact, gallery count, portal, no hidden chambers).

### 9. No `editorOnly`/`internal` non-exposure test — ADDED
**Issue:** No test verified that the guide engine does not read or leak `editorOnly` or `internal` fields.

**Fix:** Added unit test that creates an object with `editorOnly: { notes: "Secret editor note" }` and `internal: { backendId: 12345, privateField: "secret" }`, then asserts these strings do not appear in any issue text.

### 10. `navigateToIssue` missing chamber guard — FIXED
**Issue:** Clicking an issue with a `chamberId` that no longer exists (e.g., after chamber deletion) would set `selectedChamberId` to a non-existent ID.

**Fix:** Added `const chamber = chambers.find((c) => c.id === issue.chamberId); if (!chamber) return;`. Also added guard for `objectId` existence within the found chamber.

### 11. Guide panel not auto-collapsing when all-clear — FIXED
**Issue:** Guide started expanded (`useState(true)`) regardless of room state. For a completed room, this adds noise.

**Fix:** Added `useEffect` that auto-collapses the guide when `totalIssues === 0` and auto-expands when `urgentCount > 0`.

### 12. No Playwright coverage for Studio Guide rendering — ADDED
**Issue:** Browser lifecycle smoke did not verify the guide panel renders or contains deterministic issues.

**Fix:** Added assertion to multi-kit lifecycle spec:
```ts
await expect(page.getByTestId("studio-room-guide-panel")).toBeVisible();
const guideIssueCount = await page.locator('[data-testid="studio-room-guide-panel"] .ps-guide-item').count();
expect(guideIssueCount).toBeGreaterThanOrEqual(1);
```

### 13. Missing `aria-label` on guide section — FIXED
**Fix:** Added `aria-label="Studio Guide"` to the guide panel `<section>`.

### 14. `media` object false-positive URL check — FIXED
**Issue:** The original code flagged `media` objects without URLs. Media objects may use `content.image` instead of `content.url`.

**Fix:** Removed `media` from the empty-URL check. Only `link-card` is checked.

## BMAD / protocols inspected

- **bmad-review-adversarial-general:** Applied cynical review lens to every rule, looking for false positives, brittle string matching, and misleading UX.
- **bmad-review-edge-case-hunter:** Walked boundary conditions (empty chambers, all-hidden objects, missing kit IDs, deleted objects, zero images, placeholder text edge cases).
- **bmad-testarch-test-review:** Reviewed test coverage gaps, added per-kit tests, portal tests, invitation tests, editor-only non-exposure tests.

## Deterministic / no-AI verification

- `studioGuide.ts` contains no `fetch`, `axios`, `http`, `supabase`, or network calls.
- AI/LLM scan: only hit is the intentional comment `* No AI/LLM is used. All guidance comes from local rules.`
- No runtime AI dependencies, model calls, prompt APIs, or inference.
- All outputs are 100% deterministic for the same `(room, kitHints)` input.

## Kit-specific guidance verification

| Kit | Threshold | Gallery ≥3 | Proof | Services | Contact | Portal | Invitation |
|-----|-----------|------------|-------|----------|---------|--------|------------|
| gallery-artist | ✅ | ✅ 3 | ✅ | — | ✅ | — | ✅ |
| cultural-community-artist | ✅ | ✅ 3 | ✅ | ✅ | ✅ | ✅ | ✅ |
| material-tradie-proof-card | ✅ | — | ✅ | ✅ | ✅ | ✅ | ✅ |
| healing-practitioner | ✅ | — | ✅ | ✅ | ✅ | ✅ | ✅ |
| consultant-contractor | ✅ | — | ✅ | ✅ | ✅ | ✅ | ✅ |

Cultural-community guidance is distinct from gallery-artist: it expects `services`, `portal`, and uses `archive` language in copy scaffolds. The guide produces different issue sets for each kit because `KIT_GUIDANCE_RULES` is per-kit.

## Browser guide-rendering assessment

- Multi-kit lifecycle (Chromium): 5/5 passes with guide panel assertion.
- Owner lifecycle (Chromium, Firefox, WebKit): all pass.
- Guide panel is visible in inspector column on desktop, inspector tab on mobile.
- Click-to-navigate does not mutate draft (only sets selection state and mobile tab).

## Safety / public-route / no-publish assessment

- No public route changes.
- No publish button or API path introduced.
- Studio Room rendering remains isolated to `(studio)` and `internal/` route trees.
- `underground-dj-portal` remains blocked from owner flow (verified in Playwright spec).
- No broad private contact field mapping in guide code.
- `editorOnly` and `internal` fields are not read or exposed.

## Test results

### Unit tests
```
▶ analyzeStudioGuide
  ✔ returns all-clear for a well-formed gallery-artist room
  ✔ flags empty room title as urgent
  ✔ flags placeholder room title as advisory
  ✔ flags missing CTA as urgent
  ✔ flags default CTA label as advisory
  ✔ flags empty chamber as advisory
  ✔ flags all-hidden objects in a chamber as urgent
  ✔ flags missing threshold chamber as urgent
  ✔ flags missing proof for gallery-artist kit
  ✔ flags empty proof content as advisory
  ✔ flags gallery with fewer than 3 images for gallery-artist kit
  ✔ flags placeholder body text as advisory
  ✔ flags missing contact for gallery-artist kit
  ✔ sorts issues urgent first, then advisory, then polish
  ✔ does not flag empty label on CTA objects
  ✔ flags missing portal for cultural-community-artist kit
  ✔ flags empty invitation content for kits that expect it
  ✔ counts work and work-card objects toward gallery minimum
  ✔ does not read editorOnly or internal fields
✔ analyzeStudioGuide (8.38ms)
ℹ tests 19 | pass 19 | fail 0
```

### Full suite
- **Unit tests:** 157 passes (138 existing + 19 Studio Guide)
- **Typecheck:** pass
- **Build:** pass
- **Playwright multi-kit (Chromium):** 5/5 passes
- **Playwright owner lifecycle (Chromium, Firefox, WebKit):** 3/3 passes

## Worktree / release hygiene

```
M  components/presence-studio/StudioRoomOwnerEditorShell.tsx
M  tests/e2e/presence-studio-room-multi-kit-lifecycle.spec.ts
?? lib/presence/studio-room/studioGuide.ts
?? tests/presence/studio-room/studioGuide.test.ts
?? docs/program/evidence/presence-studio-room-deterministic-guide/
```

- `git diff --check`: clean (no trailing whitespace conflicts)
- No staged changes from this pass (new files are untracked, modifications are unstaged)
- Pre-existing staged/dirty worktree from earlier Presence Studio passes remains separate

## Remaining risks

1. **Placeholder false positives:** `isPlaceholderLike` hardcodes scaffold phrases. A user who intentionally writes "Your name or studio name can be anything" would get a false advisory. Probability is low; impact is advisory-only.
2. **Auto-scroll not implemented:** Clicking an issue navigates selection state but does not scroll the chamber panel or inspector into view.
3. **Polish noise on initial draft:** Fresh TemplateKit drafts produce ~5-10 polish issues (unlabelled objects, short text, empty credentials). This is intentional but may feel noisy to first-time users. The auto-collapse-on-all-clear helps.
4. **KIT_GUIDANCE_RULES requires manual update:** Adding a new primary kit requires updating the rules map. This is documented and localized.
5. **No completion percentage in UI:** `completedCount` is computed but not surfaced. If surfaced later, it should be tested for non-misleading behavior.

## Recommended next pass

**B) Hosted multi-kit smoke**

The local deterministic engine is hardened. The next high-value pass is verifying guide behavior against real backend-persisted drafts across all five kits in a hosted environment. This requires:
- `PRESENCE_E2E_BASE_URL`
- `PRESENCE_E2E_API_URL`
- `PRESENCE_E2E_OWNER_EMAIL`
- `PRESENCE_E2E_OWNER_PASSWORD`

Until credentials are available, the honest skip behavior in `presence-studio-room-hosted-lifecycle.spec.ts` is the correct safety posture.

## Evidence artifact

- Date: 2026-05-31
- Agent: Kimi (self-adversarial review pass)
- Base: dirty worktree with pre-existing Presence Studio changes
- Files changed in this pass:
  - `lib/presence/studio-room/studioGuide.ts` (rewritten with KIT_GUIDANCE_RULES, 19 rules)
  - `tests/presence/studio-room/studioGuide.test.ts` (19 tests)
  - `components/presence-studio/StudioRoomOwnerEditorShell.tsx` (guide integration + hardening)
  - `tests/e2e/presence-studio-room-multi-kit-lifecycle.spec.ts` (guide rendering assertion)
  - `docs/program/evidence/presence-studio-room-deterministic-guide/EVIDENCE.md`
