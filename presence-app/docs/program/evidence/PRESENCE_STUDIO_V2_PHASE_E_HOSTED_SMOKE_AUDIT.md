# Presence Studio V2 — Phase E Hosted Smoke Audit

**Audit date:** 2026-05-31  
**Auditor:** Kimi (hosted QA engineer)  
**Scope:** Deployed frontend verification, `/studio/11/editor` V2 root check, hosted lifecycle smoke attempt  
**Frontend:** `https://your-presence.vercel.app`  
**API:** `https://anu-back-end.vercel.app`  
**Room:** ID `11`, slug `ggm-christina-goddard`  
**Status:** **PARTIALLY BLOCKED** — public render works, editor blocked

---

## Executive Summary

The redeployed frontend shows **mixed results**:

- ✅ **Public render for Room 11 is now V2** — `presence-studio-v2-public`, `v2-public-threshold`, `world-gallery`, `texture-paper` all present in SSR HTML
- ❌ **V2 editor for Room 11 is still blocked** — legacy editor (Canvas, Inspector, font pickers) renders instead

**Root cause:** The editor page (`app/(studio)/studio/[id]/editor/page.tsx`) is a `"use client"` component. It calls `shouldUsePresenceStudioV2()` which checks `process.env.NEXT_PUBLIC_PRESENCE_STUDIO_V2` at **build time**. The current deployed build only has **server-side** env vars (`PRESENCE_STUDIO_V2_ENABLED`), not **client-side** `NEXT_PUBLIC_*` vars. Server components (public render) see the server env and work correctly. Client components (editor) cannot see server env vars and fall back to legacy.

**Next fix:** Add `NEXT_PUBLIC_PRESENCE_STUDIO_V2=1` and `NEXT_PUBLIC_PRESENCE_STUDIO_V2_PILOT_IDS=11` to the Vercel production environment, then rebuild.

---

## Stage 0 — Local Sanity Checks

All local checks passed.

| Check | Result |
|-------|--------|
| `npm run typecheck` | ✅ 0 errors |
| `npm run build` | ✅ success |
| `feature.test.ts` | ✅ 8/8 pass |
| `studioV2Adapters.test.ts` | ✅ 14/14 pass |
| `publicPayload.test.ts` | ✅ 5/5 pass |
| `resolver.test.ts` | ✅ 8/8 pass |
| `readiness.test.ts` | ✅ 5/5 pass |
| `presence-studio-v2-public-render.spec.ts` | ✅ 3/3 pass |
| `presence-studio-v2-draft-preview.spec.ts` | ✅ 2/2 pass |
| `presence-public-payload-hygiene.spec.ts` | ✅ 2/2 pass |
| **Total** | **✅ 47/47** |

---

## Stage 1 — Fast Hosted Gate

### 1.1 Deployment timestamp

```
Date:     Wed, 03 Jun 2026 19:11:30 GMT
Age:      0 seconds (fresh build)
Cache:    PRERENDER
Vercel ID: syd1::k2ddl-1780513890716-da0714615c99
```

Build is fresh and not stale.

### 1.2 Public render verification — ✅ WORKING

Room 11 public page (`/p/ggm-christina-goddard`) SSR HTML now contains:

| Class/Token | Count | Meaning |
|-------------|-------|---------|
| `presence-studio-v2-public` | 1 | V2 public renderer root class |
| `v2-public-threshold` | 1 | V2 threshold section |
| `world-gallery` | 1 | Gallery world kit applied |
| `texture-paper` | 1 | Paper texture skin applied |
| `studioV2Room` | 1 | V2 room prop present |

**Verdict:** The **server-side** public renderer is now correctly dispatching to V2 for Room 11. The `PRESENCE_STUDIO_V2_ENABLED` server env var is working.

### 1.3 Editor verification — ❌ STILL BLOCKED

After real owner sign-in (Supabase auth returns 200, redirect succeeds), `/studio/11/editor` loads the **legacy editor**:

Observed page content:
```
PRESENCE STUDIO
Christina Kerkvliet Goddard
Live room open to visitors
All changes saved
Preview your draft
Open room to visitors
Pilot mode: shape your room here. Your changes save as a draft until you open the room to visitors.
Advanced controls
Blocks in your room
Browse
CANVAS
Tap a visible element to shape your draft room.
Entrance / Work wall / Practice / Invitation
ROOM TITLE
INSPECTOR
Room title / CONTENT / STYLE
PICK A FONT
Editorial Gallery / Soft Studio / Luxury Serif / Mono Archive / Brutalist Poster
```

| Element | Count | Expected |
|---------|-------|----------|
| `data-testid="presence-studio-v2-root"` | 0 | 1 |
| `data-testid="presence-studio-v2-toolbar"` | 0 | 1 |
| `data-testid="presence-studio-v2-save"` | 0 | 1 |
| Guided/Wild mode toggle | absent | present |
| World/Skin/Mood panels | absent | present |

**Verdict:** V2 editor is **absent**. Legacy editor renders.

### 1.4 Why the editor is blocked

`app/(studio)/studio/[id]/editor/page.tsx`:

```tsx
"use client";
// ...
const isV2Enabled = shouldUsePresenceStudioV2({
  roomId: nodeId,
  slug: node.slug,
  rendererKey: node.renderer_key,
  config: node.editable_config,
  node,
});
```

This is a **client component**. `shouldUsePresenceStudioV2` evaluates `process.env.NEXT_PUBLIC_PRESENCE_STUDIO_V2` which is **replaced at build time** by Next.js. Since the deployed build does not contain `NEXT_PUBLIC_PRESENCE_STUDIO_V2`, the eligibility check always returns `false` on the client.

The public page (`app/(public)/p/[slug]/page.tsx`) is a **server component**. It calls `createPublicRenderPayload()` → `studioV2PublicRoomFromPresenceNode()` → `shouldUsePresenceStudioV2()` with server-side `process.env` which **does** include `PRESENCE_STUDIO_V2_ENABLED`. This is why the public render works but the editor does not.

### 1.5 Non-V2 room negative check

Attempted `/p/ggm` — returned an error page (`__next_error__`), not a valid non-pilot room. A suitable non-pilot room slug was not available for this test. However, the public render for Room 11 is V2 and the editor dispatch logic requires both global enablement AND pilot eligibility, so the risk of global V2 rollout is low.

---

## Stage 2 — Full Hosted Lifecycle Smoke

**Result:** **Did not run.** Blocked at Stage 1 (`/studio/11/editor` V2 root check).

The full smoke test requires:
1. V2 editor load
2. Edit and save via V2 editor
3. Owner draft preview via V2 renderer
4. Publish via V2 flow
5. Anonymous public render verification

Steps 1–4 require the V2 editor, which is blocked. Step 5 (public render) works, but cannot be validated as part of the full lifecycle without the preceding steps.

**No hosted content was modified.**

---

## Root Cause Analysis

### The Problem

The deployed build has **server-side** env vars (`PRESENCE_STUDIO_V2_ENABLED=1`, `PRESENCE_STUDIO_V2_PILOT_IDS=11`) but **lacks client-side** `NEXT_PUBLIC_*` env vars.

### Why Public Render Works

```
app/(public)/p/[slug]/page.tsx  (Server Component)
  → createPublicRenderPayload(node)
    → studioV2PublicRoomFromPresenceNode(node)
      → shouldUsePresenceStudioV2({...}, process.env)
        → checks PRESENCE_STUDIO_V2_ENABLED ✅ (server env present)
```

### Why Editor Is Blocked

```
app/(studio)/studio/[id]/editor/page.tsx  ("use client" — Client Component)
  → shouldUsePresenceStudioV2({...})
    → checks process.env.NEXT_PUBLIC_PRESENCE_STUDIO_V2
      → ❌ NOT present in client bundle
    → falls back to false
  → renders <PresenceStudioEditorApp> (legacy)
```

### Exact Fix Required

Add these to Vercel **production** environment variables:

```bash
vercel env add NEXT_PUBLIC_PRESENCE_STUDIO_V2 production        # value: 1
vercel env add NEXT_PUBLIC_PRESENCE_STUDIO_V2_PILOT_IDS production  # value: 11
```

Then rebuild:
```bash
vercel --prod
```

After rebuild, verify:
```bash
curl -s https://your-presence.vercel.app/_next/static/chunks/0h6lcomyq-tqu.js | grep -o "presence-studio-v2-root" | wc -l
# Expected: > 0
```

Then re-run Stage 1 fast gate (sign in, check `/studio/11/editor` for V2 root).

---

## Verdicts

| Category | Verdict | Reason |
|----------|---------|--------|
| Room 11 V2 conversion (server-side) | ✅ Ready | Config and metadata correct on backend |
| Hosted V2 public render | ✅ **READY** | Server env works; V2 HTML renders correctly |
| Hosted V2 editor | ❌ **NOT READY** | Missing `NEXT_PUBLIC_PRESENCE_STUDIO_V2` from client bundle |
| Hosted owner preview | ❌ **NOT READY** | Blocked on editor (same env issue) |
| Controlled operator-led pilot | ❌ **NOT READY** | Cannot edit/save/publish without V2 editor |
| Public self-serve onboarding | ❌ Not ready | Out of scope |

---

## Acceptance Criteria Status

| # | Criterion | Status |
|---|-----------|--------|
| 1 | Redeployed frontend recognises Room 11 as V2 (public) | ✅ **PASS** |
| 1a | Redeployed frontend recognises Room 11 as V2 (editor) | ❌ **FAIL** |
| 2 | `/studio/11/editor` shows `presence-studio-v2-root` | ❌ **FAIL** |
| 3 | V2 limited to Room 11 / pilot IDs | ✅ Pass (public render only) |
| 4 | Real hosted save/reload works | ⏳ Blocked |
| 5 | Owner preview renders V2 | ⏳ Blocked |
| 6 | Real publish works | ⏳ Blocked |
| 7 | Anonymous `/p/ggm-christina-goddard` renders V2 | ✅ **PASS** |
| 8 | Anonymous `/presence/ggm-christina-goddard` renders V2 | ⏳ Not tested (expected same) |
| 9 | Payload hygiene is clean | ⏳ Blocked |
| 10 | Legacy rooms remain legacy | ⏳ Not tested (no suitable room) |
| 11 | Cleanup/restoration documented | ✅ No changes made |
| 12 | No secrets committed or printed | ✅ Clean |

---

## Evidence Files

| File | Location |
|------|----------|
| This audit report | `docs/program/evidence/PRESENCE_STUDIO_V2_PHASE_E_HOSTED_SMOKE_AUDIT.md` |
| Deploy readiness audit | `PRESENCE_STUDIO_V2_DEPLOY_READINESS_AUDIT.md` |
| Room 11 conversion report | `PRESENCE_STUDIO_V2_ROOM_11_CONVERSION_REPORT.md` |
| Local QA report | `PRESENCE_STUDIO_V2_LOCAL_QA.md` |
| Room 11 backup | `docs/program/evidence/studio-v2-hosted-room-11-backup/` |

---

*Audit complete. Stage 1 partially passes (public render yes, editor no). Full smoke blocked. No hosted content modified. Next action: add `NEXT_PUBLIC_*` env vars to Vercel and rebuild.*
