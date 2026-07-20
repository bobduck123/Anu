# Presence Room 11 Content/Media Correction Report

**Date:** 2026-06-08
**Scope:** Hosted content/media hygiene pass for Room 11 / `ggm-christina-goddard`
**Type:** Data-only pass — no renderer code, no Studio code, no backend contract changes
**Production:** `https://your-presence.vercel.app`
**API:** `https://anu-back-end.vercel.app`
**Room ID:** `11`
**Slug:** `ggm-christina-goddard`
**S4A status:** Remains parked in `stash@{0}: park S4A chamber management safety-audited local work`

---

## 1. Repo/Code State

Preflight verification:

```bash
git status
git stash list
```

Result:
- Working tree clean — no staged code changes.
- S4A parked at `stash@{0}`.
- No credentials or env files staged.
- Only new untracked helper scripts and evidence directories were added by this pass.

---

## 2. Backup

**Backup method:** Existing `scripts/backup-room-11.mjs` using owner sign-in + editor API.

**Backup timestamp:** 2026-06-07T22:03:44.644Z

**Backup path:**

```txt
docs/program/evidence/studio-v2-hosted-room-11-backup/
```

Files captured:

| File | Purpose |
|------|---------|
| `room-11-backup-manifest-*.json` | Manifest with timestamp, room ID, slug, versions |
| `room-11-owner-node-*.json` | Owner node data |
| `room-11-editor-overview-*.json` | Full editor overview (published + draft) |
| `room-11-editor-draft-*.json` | Draft snapshot |
| `room-11-editor-history-*.json` | Edit history |
| `room-11-collections-*.json` | Collections |
| `room-11-services-*.json` | Services |
| `room-11-works-*.json` | Works |
| `room-11-public-html-*.html` | Public page HTML snapshot |

**Sensitive data handling:**
- Credentials were supplied through environment variables only.
- No tokens, passwords, or session data were written to backup files.
- Backup files contain only room content/config data already visible to the authenticated owner.

A copy of the backup was also placed under:

```txt
docs/program/evidence/presence-room-11-content-media-correction/
```

---

## 3. Bad Asset Identified

| Field | Value |
|-------|-------|
| Object index | 0 |
| Object ID | `hero-image` |
| Object type | `image` |
| Object role | `image` |
| Object title | `Cover image` |
| Old image src | `https://rsskwpfuxoowuubvegbr.supabase.co/storage/v1/object/public/presence-media/presence/rooms/11/images/783471c01a894f9ebddd039f83d4ac68.png` |
| Old image alt | `Willow of Port Arthur, 2019. Watercolour on paper.` |
| Chamber | `field` (Artwork Field) |
| Public visibility | Yes |
| Where it appeared | Threshold image field, threshold artifact, opening work caption, public preload |

**Asset description:**
The image at the above Supabase URL was the prior blue "Harmless V1B Test / Hosted Smoke Image" asset. It was rendering as the full-bleed threshold background for Room 11, producing a dark blue field instead of the intended artwork. The alt text had already been set to the willow caption, but the actual image source pointed to the smoke-test PNG.

---

## 4. Correction Method

**Method chosen:** Replace image URL with an existing clean Gallery/GGM image already present in the room.

**Replacement source:** Object 4 (`work-feature`), titled `Willow of Port Arthur`.

**New image src:** `/ggm/works/willow-of-port-arthur-2019.webp`

**Reasoning:**
- The replacement image is already part of Room 11's content set.
- It matches the existing alt text (`Willow of Port Arthur, 2019. Watercolour on paper.`).
- It is a real artwork associated with Christina Kerkvliet Goddard's GGM portfolio.
- No fake or unapproved content was introduced.

**Why not hide/delete:**
- Hiding the hero-image object would have removed the threshold image field entirely, potentially breaking the P2 threshold cinema.
- Deletion was unnecessary because a suitable replacement already existed in the room.

---

## 5. Apply Correction

**Script used:** `scripts/correct-room-11-media.mjs`

Steps performed:
1. Owner sign-in to hosted environment.
2. Fetch current editor overview (draft version 44, published version 43).
3. Locate Object 0 (`hero-image`) with the bad PNG src.
4. Locate replacement candidate (`work-feature`) with `/ggm/works/willow-of-port-arthur-2019.webp`.
5. Patch `content_config.studio_v2.objects[0].image.src` to the replacement URL.
6. Preserve alt text (`Willow of Port Arthur, 2019. Watercolour on paper.`).
7. PATCH `/api/presence/owner/rooms/11/editor/draft` with the corrected full config.
8. Reload editor overview to verify draft persisted with corrected src.
9. Open owner preview and screenshot.
10. POST `/api/presence/owner/rooms/11/editor/publish` to publish the corrected draft.
11. Verify public `/p/ggm-christina-goddard` HTML no longer contains the bad PNG URL or test text.

---

## 6. Save/Reload Result

- Draft PATCH returned HTTP 200.
- Reloaded editor overview confirmed Object 0 (`hero-image`) now has `image.src: "/ggm/works/willow-of-port-arthur-2019.webp"`.
- Owner preview rendered the corrected willow image in the threshold.

---

## 7. Publish Result

- Publish endpoint returned HTTP 200.
- Public `/p/ggm-christina-goddard` reflected the corrected image within seconds.
- No 404s or build errors.

---

## 8. Public Route Verification

Verified routes:

```txt
https://your-presence.vercel.app/p/ggm-christina-goddard
https://your-presence.vercel.app/presence/ggm-christina-goddard
```

Confirmed:
- Bad PNG URL (`783471c01a894f9ebddd039f83d4ac68.png`) is absent from public HTML.
- `Harmless V1B Test` text is absent from public output.
- `Hosted Smoke Image` text is absent from public output.
- P2 threshold layout remains intact.
- P2 gallery/chamber layout remains intact.
- Lightbox/focus still opens and closes correctly.
- Mobile output renders cleanly.
- CTA remains functional.
- No editor chrome leaked into public output.

---

## 9. Payload Hygiene Result

Script used: `scripts/verify-room-11-correction.mjs` (embedded hygiene scanner based on `scripts/hosted-payload-hygiene.mjs`)

Scanned:
- Public `/p/` route (HTML + visible text)
- Public `/presence/` route (HTML)
- Room key `/room/11/key` route (HTML)
- Mobile viewport public `/p/` route (HTML)

Result:

```txt
TOTAL_VIOLATIONS: 0
VIOLATIONS: NONE
PASS: true
```

No restricted terms leaked:
- No `editable_config`, `style_dna`, `scene_config`, `motion_config`, `asset_config`, `content_config`, `roomkey_config`, `enquiry_config`
- No `hiddenPublic`, `hiddenMobile`, `locked`, `pinned`
- No `localStorage`, `TemplateKit`
- No editor toolbar/panel/handle class names
- No `/api/presence/owner` paths
- No auth/token/session strings

---

## 10. Legacy and Studio Regression Spot-Check

### Legacy room (`/p/hesmaddw`)

Result:
- `.presence-studio-v2-public` count: 0
- `.v2-public-threshold-transition` count: 0
- Legacy renderer remains in place.
- No P2 CSS or structure leaked.

### Studio editor (`/studio/11/editor`)

Result:
- Studio V2 root mounted (`presence-studio-v2-root` visible).
- Top chrome, outline, inspector, Threshold/Chamber/Archive tabs, and chamber tabs all present.
- Legacy owner editor shell did not mount.

### Owner preview (`/studio/11/editor/preview`)

Result:
- Draft preview banner rendered correctly.
- Corrected P2 public renderer appeared with willow threshold image.
- No editor handles/chrome leaked into preview renderer.

---

## 11. Evidence / Screenshots

Evidence path:

```txt
docs/program/evidence/presence-room-11-content-media-correction/
```

| # | File | Purpose |
|---|------|---------|
| 01 | `01-public-desktop-threshold-after.png` | Public desktop threshold with corrected willow image |
| 02 | `02-public-desktop-chamber-after.png` | Public desktop gallery/chamber after correction |
| 03 | `03-public-lightbox-after.png` | Artwork focus/lightbox functioning with corrected image |
| 04 | `04-public-mobile-threshold-after.png` | Mobile threshold after correction |
| 05 | `05-public-mobile-chamber-after.png` | Mobile chamber after correction |
| 06 | `06-owner-preview-after.png` | Owner preview clean with corrected output |
| 07 | `07-studio-editor-after.png` | Studio V2 editor regression check |
| 08 | `08-legacy-negative-after.png` | Legacy room unaffected |
| — | `owner-preview-after-correction.png` | Owner preview captured during correction script |
| — | `public-desktop-after-correction.png` | Public desktop captured during correction script |
| — | `room-11-backup-manifest-*.json` | Backup manifest |
| — | `room-11-editor-overview-*.json` | Pre-correction editor overview |
| — | `room-11-correction-log-*.json` | Step-by-step correction log |

These screenshots are now client-facing clean.

---

## 12. Rollback Status

Rollback path available:
- Full backup exists in `docs/program/evidence/studio-v2-hosted-room-11-backup/`.
- Backup includes pre-correction editor overview and draft.
- If rollback is needed, run `scripts/restore-room-11-from-backup.mts` with the backup timestamp and owner token, or manually PATCH the draft from the backed-up config and republish.

No rollback was required — the correction succeeded on first pass.

---

## 13. Acceptance Criteria

| # | Criterion | Status |
|---|-----------|--------|
| 1 | Room 11 content is backed up before mutation | ✅ PASS |
| 2 | Prior blue smoke/test asset is removed/replaced/hidden from public output | ✅ PASS |
| 3 | No fake or unapproved content is introduced | ✅ PASS |
| 4 | Save/reload works | ✅ PASS |
| 5 | Owner preview is clean | ✅ PASS |
| 6 | Publish succeeds | ✅ PASS |
| 7 | Public `/p` and `/presence` routes are clean | ✅ PASS |
| 8 | Payload hygiene remains 0 violations | ✅ PASS |
| 9 | Legacy room remains legacy | ✅ PASS |
| 10 | Final screenshots are client-facing clean | ✅ PASS |
| 11 | No code changes are made | ✅ PASS |
| 12 | S4A remains parked | ✅ PASS |

---

## 14. Verdict

**Room 11 content/media correction is complete and verified.**

The hosted Gallery/GGM public output is now clean enough for client-facing screenshots and pilot demos. The prior blue smoke-test image has been replaced with the existing `Willow of Port Arthur` artwork, while preserving all P2 renderer polish, mobile behaviour, lightbox interactions, payload hygiene, and legacy isolation.
