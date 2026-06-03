# Presence Studio V2 Room 11 Conversion Report

**Date:** 2026-06-03  
**Agent:** Kimi Code CLI  
**Room:** 11 / `ggm-christina-goddard`  
**Owner:** Christina Kerkvliet Goddard  

---

## 1. Original Room 11 State

| Property | Value |
|----------|-------|
| Room ID | 11 |
| Slug | `ggm-christina-goddard` |
| Display name | `Christina Kerkvliet Goddard` |
| Status | `published` |
| Public status | `public` |
| Published renderer | `ggm-faithful-room-v1` |
| Draft | none |
| Published version | 26 |
| Owner API `node.renderer_key` | `undefined` (backend omits from owner node response) |
| Owner API `node.editable_config` | not returned |
| Metadata `custom_renderer_key` | `ggm-faithful-room-v1` |
| Public API `node.renderer_key` | `ggm-faithful-room-v1` (inferred from published config) |
| Works | 0 |
| Collections | 0 |
| Services | 0 |
| Assets | 7 images (hero + 6 attached) |

---

## 2. V2 Eligibility Logic Discovered

`shouldUsePresenceStudioV2(input, env)` requires **ALL THREE** conditions:

1. **Global enablement:** `NEXT_PUBLIC_PRESENCE_STUDIO_V2=1` OR `PRESENCE_STUDIO_V2_ENABLED=1`
2. **V2 room marker:** `rendererKey === "presence-studio-v2-room"` OR config contains V2 structural markers (`scene_config.studio_v2`, `content_config.studio_v2`, `style_dna.studio_v2`)
3. **Pilot eligibility:** room ID or slug appears in `NEXT_PUBLIC_PRESENCE_STUDIO_V2_PILOT_IDS` or `PRESENCE_STUDIO_V2_PILOT_IDS`

**Production safety:** Empty pilot list + production env → returns `false` unless `PRESENCE_STUDIO_V2_ENABLED=1` is explicitly set.

**Editor mount decision** (`app/(studio)/studio/[id]/editor/page.tsx`):
```tsx
const isV2Enabled = shouldUsePresenceStudioV2({
  roomId: nodeId,
  slug: node.slug,
  rendererKey: node.renderer_key,        // owner API omits this!
  config: node.editable_config,          // owner API omits this!
  node,
});
```

**Critical finding:** The hosted backend's owner `getNode` endpoint does NOT return `renderer_key` or `editable_config`. It stores the renderer key in `metadata.custom_renderer_key` / `metadata.custom_presence.renderer_key`. The frontend was not checking these metadata fallbacks, so no hosted room could ever mount the V2 editor even if its published config had `renderer_key: presence-studio-v2-room`.

---

## 3. Backup Path

All original room 11 state backed up to:

```
docs/program/evidence/studio-v2-hosted-room-11-backup/
```

Files created (timestamped):

| File | Size | Contents |
|------|------|----------|
| `room-11-owner-node-{ts}.json` | 9 KB | Full owner node response |
| `room-11-editor-overview-{ts}.json` | 163 KB | Editor overview (published config v26, room, assets) |
| `room-11-editor-draft-{ts}.json` | 107 B | Draft response (null) |
| `room-11-editor-history-{ts}.json` | 182 KB | Full config history |
| `room-11-works-{ts}.json` | 30 B | Empty works list |
| `room-11-collections-{ts}.json` | 30 B | Empty collections list |
| `room-11-services-{ts}.json` | 30 B | Empty services list |
| `room-11-public-html-{ts}.html` | 51 KB | Public page HTML snapshot (GGM legacy render) |
| `room-11-backup-manifest-{ts}.json` | 767 B | Index of all backup files |

**Rollback script:** `scripts/restore-room-11-from-backup.mts`

Run:
```bash
ROOM11_OWNER_TOKEN=<token> npx tsx scripts/restore-room-11-from-backup.mts
```

---

## 4. Conversion Method Used

### Path chosen: Existing owner/editor API (safest)

No migration script. No direct DB mutation. No TemplateKit.

**Steps executed:**

1. **Signed in** via Playwright to extract owner bearer token.
2. **Read backup** to get original published config (v26, `ggm-faithful-room-v1`).
3. **Lifted legacy config to V2 state** using local `studioV2FromPresenceConfig(publishedConfig, node)`:
   - 6 chambers, 16 objects mapped from legacy scenes/assets
   - Title preserved: `Christina Kerkvliet Goddard`
   - Tagline preserved: `Watercolour works across memory, colour, and lived landscape.`
   - World ID inferred: `gallery` (from `room_type: artist_studio`)
   - CTA preserved from `primary_cta_label` / `primary_cta_url`
   - All 7 images preserved in V2 asset_config
4. **Converted V2 state back to payload** using `presenceConfigFromStudioV2State(v2State, publishedConfig)`:
   - Payload `renderer_key: presence-studio-v2-room`
   - All nested configs (`scene_config`, `style_dna`, `motion_config`, `asset_config`, `content_config`, `roomkey_config`, `enquiry_config`) populated with `studio_v2` keyed data
5. **Created draft** via `POST /api/presence/owner/rooms/11/editor/draft` → `201 Created`
6. **Published** via `POST /api/presence/owner/rooms/11/editor/publish` → `200 OK`
7. **Verified** published config now has `renderer_key: presence-studio-v2-room` (version 27)
8. **Updated node metadata** via `PATCH /api/presence/owner/nodes/11`:
   - Set `metadata.custom_renderer_key: presence-studio-v2-room`
   - Set `metadata.custom_presence.renderer_key: presence-studio-v2-room`
   - Backend accepted and persisted metadata change
9. **Added frontend metadata fallback** in `lib/presence/studio-v2/feature.ts`:
   - `shouldUsePresenceStudioV2` now checks `metadata.custom_renderer_key` and `metadata.custom_presence.renderer_key` when `node.renderer_key` is absent
   - Unit tests added in `lib/presence/studio-v2/feature.test.ts` (8 tests, all pass)

---

## 5. Env Flags Required

The hosted deployment needs these Vercel env vars:

| Var | Value | Scope | Redeploy Required? |
|-----|-------|-------|-------------------|
| `NEXT_PUBLIC_PRESENCE_STUDIO_V2` | `1` | Frontend build | **Yes** (baked into client bundle) |
| `NEXT_PUBLIC_PRESENCE_STUDIO_V2_PILOT_IDS` | `11` or `ggm-christina-goddard` | Frontend build | **Yes** |
| `PRESENCE_STUDIO_V2_ENABLED` | `1` | Server runtime | No (server reads at runtime) |
| `PRESENCE_STUDIO_V2_PILOT_IDS` | `11` or `ggm-christina-goddard` | Server runtime | No |

**Current status:** Unknown whether these are set on Vercel. The previous Phase E smoke report noted the hosted runtime did not activate V2 for room 11, suggesting they were absent at the time of the last deployment.

**Rollback:** Remove `11` from pilot lists and redeploy, or set `NEXT_PUBLIC_PRESENCE_STUDIO_V2=0`.

---

## 6. Post-Conversion Verification

### Backend state (verified via API)

| Check | Result |
|-------|--------|
| Published config renderer_key | `presence-studio-v2-room` ✅ |
| Published config version | 27 (was 26) ✅ |
| Public API node.renderer_key | `presence-studio-v2-room` ✅ |
| Public API node.editable_config | present ✅ |
| Owner API metadata.custom_renderer_key | `presence-studio-v2-room` ✅ |
| Owner API metadata.custom_presence.renderer_key | `presence-studio-v2-room` ✅ |
| Owner API node.renderer_key | still `undefined` (backend gap) |
| Owner API node.editable_config | still absent (backend gap) |

### Public page

| Check | Result |
|-------|--------|
| `/p/ggm-christina-goddard` renders V2 public room | **Blocked** — deployed frontend lacks metadata fallback fix AND possibly env vars |
| `/p/ggm-christina-goddard` currently renders | Legacy Presence DNA / GGM gallery ✅ (no breakage) |

### Owner editor

| Check | Result |
|-------|--------|
| `/studio/11/editor` renders `presence-studio-v2-root` | **Blocked** — deployed frontend lacks metadata fallback fix AND possibly env vars |
| `/studio/11/editor` currently renders | Legacy Canvas/GGM editor ✅ (no breakage) |

---

## 7. Remaining Blockers

### Blocker 1: Frontend deployment

The metadata fallback fix in `lib/presence/studio-v2/feature.ts` is **not deployed**. The deployed frontend still uses the old `shouldUsePresenceStudioV2` which only checks `node.renderer_key` and `node.editable_config`.

**Fix:** Deploy the current repo to Vercel.

### Blocker 2: Vercel env vars (unconfirmed)

Even after deployment, if `NEXT_PUBLIC_PRESENCE_STUDIO_V2` and `NEXT_PUBLIC_PRESENCE_STUDIO_V2_PILOT_IDS` are not set in the Vercel dashboard, the frontend will not enable V2.

**Fix:** Set the env vars in Vercel dashboard and redeploy.

### Blocker 3: Backend owner API gap (mitigated)

The backend owner `getNode` endpoint does not return `renderer_key` or `editable_config`. The frontend metadata fallback mitigates this, but a proper long-term fix would be for the backend to include these fields in the owner node response.

**Impact:** Low — metadata fallback works.

---

## 8. Hosted Smoke Result

**Not yet rerun.** The hosted lifecycle smoke (`presence-studio-v2-hosted-lifecycle.spec.ts`) requires:

1. Frontend deployment with metadata fallback
2. Vercel env vars set
3. Then: `PRESENCE_HOSTED_SMOKE=1 npx playwright test presence-studio-v2-hosted-lifecycle.spec.ts --project=chromium --workers=1`

---

## 9. Cleanup / Restoration Status

| Item | Status |
|------|--------|
| Original published config (v26, GGM) | Backed up ✅ |
| Original metadata (GGM renderer_key) | Backed up ✅ |
| Rollback script | `scripts/restore-room-11-from-backup.mts` ✅ |
| Test content added | None ✅ |
| Public page broken | No — still renders legacy GGM ✅ |

**To fully restore room 11 to original GGM state:**
```bash
# 1. Get owner token
node scripts/get-hosted-token.mjs

# 2. Run rollback
ROOM11_OWNER_TOKEN=<token> npx tsx scripts/restore-room-11-from-backup.mts
```

---

## 10. Final Readiness Verdicts

| Criterion | Verdict | Notes |
|-----------|---------|-------|
| Room 11 V2 conversion readiness | ✅ **Converted** | Backend data is V2. Metadata updated. |
| Hosted V2 editor readiness | ⚠️ **Blocked** | Needs frontend deployment + env vars |
| Hosted owner preview readiness | ⚠️ **Blocked** | Depends on editor mount |
| Hosted public render readiness | ⚠️ **Blocked** | Needs env vars + deployment |
| Controlled operator-led pilot readiness | ⚠️ **Blocked** | Hosted lifecycle smoke not yet passed |
| Public self-serve onboarding readiness | ❌ **Not ready** | Explicitly out of scope |

---

## 11. Exact Next Steps

1. **Set Vercel env vars:**
   ```
   NEXT_PUBLIC_PRESENCE_STUDIO_V2=1
   NEXT_PUBLIC_PRESENCE_STUDIO_V2_PILOT_IDS=11
   ```
2. **Deploy frontend** (git push or Vercel dashboard deploy)
3. **Verify** `/studio/11/editor` renders `[data-testid="presence-studio-v2-root"]`
4. **Run hosted smoke:**
   ```powershell
   $env:PRESENCE_HOSTED_SMOKE="1"
   $env:PRESENCE_E2E_BASE_URL="https://your-presence.vercel.app"
   $env:PRESENCE_E2E_API_URL="https://anu-back-end.vercel.app"
   $env:PRESENCE_E2E_OWNER_EMAIL="<OWNER_EMAIL>"
   $env:PRESENCE_E2E_OWNER_PASSWORD="<OWNER_PASSWORD>"
   $env:PRESENCE_STUDIO_V2_HOSTED_PILOT_ROOM_ID="11"
   npx.cmd playwright test presence-studio-v2-hosted-lifecycle.spec.ts --project=chromium --workers=1
   ```
5. **If smoke fails:** run rollback script and investigate
6. **If smoke passes:** room 11 is the first hosted Studio V2 pilot
