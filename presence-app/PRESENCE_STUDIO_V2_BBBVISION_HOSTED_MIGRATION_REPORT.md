# Presence Studio V2 bbbvision Hosted Migration Report

Date: 2026-06-09

## Verdict

bbbvision is now live on hosted Presence as a real editable Studio V2 room controlled by `e4hatu@gmail.com`.

```txt
room id: 29
slug: bbbvision
title: bbb.vision
renderer: presence-studio-v2-room
public style preset: bbbvision-threshold-gallery
published version: 2
public routes:
  https://your-presence.vercel.app/p/bbbvision
  https://your-presence.vercel.app/presence/bbbvision
```

Ready for controlled operator-led pilot demo: yes, with one limitation. The owner-scoped API access path is proven, but a real browser password sign-in walkthrough was not run because no hosted owner password was present in process env or ignored env files.

## Baseline And Safety

- Starting HEAD: `d68e67f docs(studio-v2): record S6 hosted style-system baseline`.
- S4A remained parked in `stash@{0}`.
- Initial working tree was clean before migration evidence/script creation.
- No credentials, auth state, HARs, traces, logs, or env files were staged.
- Public self-serve onboarding remained out of scope.

## Owner Account Result

`e4hatu@gmail.com` exists as a hosted Supabase auth user and Presence app user.

Final account integrity evidence:

```txt
docs/program/evidence/presence-studio-v2-bbbvision-hosted-migration/account_integrity_final_result.json
```

Final checks:

- Supabase auth user exists, email confirmed, not banned/deleted.
- Presence app user exists, active.
- Supabase subject matches Presence user binding.
- Room `bbbvision` is owned by the target user.
- Target owner detail, analytics, passes, and room-key routes returned `200`.
- Negative-control owner route returned `403`.
- Public room redaction passed.
- `secret_values_printed=false`; `tokens_printed=false`.

## Creation And Assignment Method

Approved path used:

```txt
flora-fauna/backend/scripts/setup_presence_pilot_bbbvision.py
```

The script uses the existing controlled-launch backend app, service-layer validation, and owner editor API:

- account discovery through hosted DB/auth tables;
- room search for `bbbvision`, `bbb-vision`, `bbb.vision`, `bbb`;
- service-layer `create_presence_node` / `update_presence_node`;
- owner-scoped editor API calls using the existing Supabase subject binding;
- draft save, preview, publish, and assets-panel API read;
- no invented credentials;
- no iframe;
- no renderer hardcoding.

The first clean discovery found no bbbvision room and created room 29. A later apply pass cleaned public metadata and republished the same room as version 2.

## Backup And Rollback

Backup directory:

```txt
docs/program/evidence/presence-studio-v2-bbbvision-hosted-migration/backup/
```

Backup files:

- `no_prior_bbbvision_room.json` from the initial no-room discovery.
- `room-29-bbbvision-backup.json` from the pre-cleanup backup of the created room.
- `backup_manifest.json`.
- `seeded_bbbvision_payload_summary.json`.

Rollback path:

- Restore the backed-up room fields and editable config versions from `room-29-bbbvision-backup.json`, or unpublish/archive room 29 if the pilot needs to be withdrawn.

## Source And Seeded Content

Local source inspected:

```txt
C:/Dev/bbb-vision-site
```

Source files inspected included `index.html`, `landing.css`, `gallery.html`, `gallery.css`, `gallery.js`, and the `assets/landing-slider-shots` and `assets/benny` image sets.

Seeded editable Studio V2 structure:

- `threshold` chamber with 10 source landing images and an Enter CTA object.
- `gallery` chamber with 10 source gallery images.
- `practice` chamber with one public-safe text/story object.
- 20 editable image assets visible through the S5 Room Assets API.
- Public style preset `bbbvision-threshold-gallery`.
- Mobile-safe visibility defaults.
- No fake social proof, checkout, upload, or live-commerce data.

The public renderer consumes seeded Studio V2 data only. No bbbvision content was hardcoded into the renderer.

## Edit, Save, Preview, Publish

Final owner editor API result:

```txt
draft_save_status: 201
draft_version: 2
preview_status: 200
publish_status: 200
published_version: 2
assets_status: 200
asset_count: 20
```

Credential-bound browser sign-in was not run because no owner password was available in environment variables or ignored env files. The approved owner API path proved RBAC, draft save, preview, publish, and S5 Room Assets access using the existing Supabase subject binding.

## Hosted Deployment

The hosted Studio V2 pilot allowlist was updated in Vercel production:

```txt
NEXT_PUBLIC_PRESENCE_STUDIO_V2_PILOT_IDS=11,29,bbbvision
PRESENCE_STUDIO_V2_PILOT_IDS=11,29,bbbvision
```

Production redeploys:

```txt
dpl_Aa4S8sEsAiRe5PiV7cQhsVTCQTmd
  https://presence-3w0zph67z-emadhatu-2110s-projects.vercel.app

dpl_6W9LWNmK7MggiykADKteQfRiBRKP
  https://presence-csu0rra6d-emadhatu-2110s-projects.vercel.app
```

The second deployment included a public copy hygiene fix in `app/(public)/p/[slug]/not-found.tsx`, removing the word `draft` from a route-level public fallback message so strict public payload scans can pass without exceptions.

## Public Route Results

Final hosted smoke:

```txt
docs/program/evidence/presence-studio-v2-bbbvision-hosted-migration/hosted_bbbvision_public_smoke_result.json
```

Final public results:

- `/p/bbbvision`: `200`, Studio V2 bbbvision style rendered, threshold and gallery present, 27 bbbvision source asset images in DOM, 0 broken visible images.
- `/presence/bbbvision`: `200`, Studio V2 bbbvision style rendered, threshold and gallery present, 27 bbbvision source asset images in DOM, 0 broken visible images.
- mobile `/p/bbbvision`: `200`, threshold/gallery present, 0 broken visible images.
- Room 11 `/p/ggm-christina-goddard`: `200`, Studio V2 public output remains clean.
- Room 11 `/presence/ggm-christina-goddard`: `200`, Studio V2 public output remains clean.
- legacy `/p/hesmaddw`: `200`, no Studio V2 renderer.

Final payload hygiene:

```txt
TOTAL_VIOLATIONS: 0
RUNTIME_ERRORS: 0
PASS: true
```

## Evidence

Evidence directory:

```txt
docs/program/evidence/presence-studio-v2-bbbvision-hosted-migration/
```

Key files:

- `account_integrity_result.json`
- `account_integrity_final_result.json`
- `bbbvision_setup_dry_run.json`
- `bbbvision_setup_dry_run_after_theme_fix.json`
- `bbbvision_setup_result.json`
- `hosted_bbbvision_public_smoke_result.json`
- `hosted_bbbvision_payload_hygiene_result.txt`
- `01-published-p-bbbvision-threshold-desktop.png`
- `02-published-p-bbbvision-gallery-desktop.png`
- `03-published-p-bbbvision-gallery-next-state.png`
- `04-published-presence-bbbvision-desktop.png`
- `05-published-p-bbbvision-mobile.png`
- `06-room11-regression-p-public.png`
- `07-legacy-hesmaddw-negative.png`

## Commands Run

```powershell
git status --short
git stash list
git log --oneline -8
python flora-fauna\backend\scripts\verify_presence_account_integrity.py --environment hosted_controlled_launch --email e4hatu@gmail.com --room-slug bbbvision --verify --output-json presence-app\docs\program\evidence\presence-studio-v2-bbbvision-hosted-migration\account_integrity_result.json
python -m py_compile flora-fauna\backend\scripts\setup_presence_pilot_bbbvision.py
python flora-fauna\backend\scripts\setup_presence_pilot_bbbvision.py --environment hosted_controlled_launch --dry-run --output-json presence-app\docs\program\evidence\presence-studio-v2-bbbvision-hosted-migration\bbbvision_setup_dry_run.json
python flora-fauna\backend\scripts\setup_presence_pilot_bbbvision.py --environment hosted_controlled_launch --dry-run --output-json presence-app\docs\program\evidence\presence-studio-v2-bbbvision-hosted-migration\bbbvision_setup_dry_run_after_theme_fix.json
python flora-fauna\backend\scripts\setup_presence_pilot_bbbvision.py --environment hosted_controlled_launch --apply --output-json presence-app\docs\program\evidence\presence-studio-v2-bbbvision-hosted-migration\bbbvision_setup_result.json
npx vercel@latest env ls --cwd presence-app
npx vercel@latest env rm NEXT_PUBLIC_PRESENCE_STUDIO_V2_PILOT_IDS production --yes --cwd presence-app
npx vercel@latest env rm PRESENCE_STUDIO_V2_PILOT_IDS production --yes --cwd presence-app
npx vercel@latest --prod --cwd presence-app
npm run build
node scripts\hosted-bbbvision-migration-smoke.mjs
python flora-fauna\backend\scripts\verify_presence_account_integrity.py --environment hosted_controlled_launch --email e4hatu@gmail.com --room-slug bbbvision --verify --output-json presence-app\docs\program\evidence\presence-studio-v2-bbbvision-hosted-migration\account_integrity_final_result.json
```

## Remaining Limitations

1. Real password-based owner browser sign-in was not run because credentials were not supplied in process env or ignored env files.
2. bbbvision images currently reference public source asset URLs from `https://bbbvision.vercel.app/assets/...`; they are editable URL assets, not uploaded Presence media records.
3. The production allowlist now includes `11,29,bbbvision`; future Studio V2 pilot rooms still require explicit allowlist updates.

## Final Readiness

bbbvision is ready for a controlled operator-led pilot demo on hosted Presence. Public self-serve onboarding remains out of scope.
