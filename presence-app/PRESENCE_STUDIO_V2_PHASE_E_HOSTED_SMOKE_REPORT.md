# Presence Studio V2 Phase E Hosted Smoke Report

Date: 2026-06-03

## Verdict

Phase E hosted lifecycle smoke failed before any mutation.

Owner sign-in and owner room access worked, but candidate room `11` did not mount Studio V2. It rendered the existing Canvas/GGM editor, and owner API inspection showed the published renderer is `ggm-faithful-room-v1`, not `presence-studio-v2-room`.

No edit, save, publish, or public mutation occurred.

## Hosted URLs Tested

```txt
Frontend: https://your-presence.vercel.app
API: https://anu-back-end.vercel.app
```

## Room ID / Slug Tested

```txt
Room ID: 11
Slug: ggm-christina-goddard
Display name: Christina Kerkvliet Goddard
Status: published
Published renderer: ggm-faithful-room-v1
Draft renderer: none
Studio V2 root visible: false
Legacy Studio Room shell visible: false
```

## Room ID Verification

Verified with a non-mutating hosted preflight:

1. Signed into hosted Studio with the supplied owner account.
2. Opened `/studio/11/editor`.
3. Confirmed owner access was real.
4. Fetched `GET /api/presence/owner/rooms/11/editor` with the owner bearer token.
5. Confirmed room `11` resolves to `ggm-christina-goddard`.
6. Confirmed `presence-studio-v2-root` did not appear.
7. Confirmed published renderer is `ggm-faithful-room-v1`.

The preflight reported:

```json
{
  "ok": true,
  "status": 200,
  "roomId": 11,
  "slug": "ggm-christina-goddard",
  "displayName": "Christina Kerkvliet Goddard",
  "v2Visible": false,
  "legacyCount": 0,
  "hasDraft": false,
  "hasPublished": true,
  "draftRenderer": "",
  "publishedRenderer": "ggm-faithful-room-v1",
  "pageErrors": [],
  "consoleErrorCount": 0
}
```

## Hosted Candidate Scan

A read-only owner room scan found 28 owner rooms.

Result:

- No room had `presence-studio-v2-room` as node, draft, or published renderer.
- Rooms `19` to `28` are hosted TemplateKit draft rooms with `studio-room-template-kit-v1`.
- Room `11` is the published GGM room with `ggm-faithful-room-v1`.
- Several older public/demo rooms returned editor status `500` from the owner editor endpoint and were not V2 candidates.

Conclusion: there is no currently discoverable hosted Studio V2 pilot candidate for this owner account.

## Feature Flag State

The hosted runtime did not activate V2 for room `11`.

Possible causes:

- hosted V2 feature flag is not enabled on the deployed frontend, or
- room `11` is not in `NEXT_PUBLIC_PRESENCE_STUDIO_V2_PILOT_IDS`, or
- room `11` is not a Studio V2 config, which is confirmed by its `ggm-faithful-room-v1` published renderer.

Repo rollback path remains:

```txt
NEXT_PUBLIC_PRESENCE_STUDIO_V2=0
NEXT_PUBLIC_PRESENCE_STUDIO_V2_PILOT_IDS=
PRESENCE_STUDIO_V2_ENABLED=0
PRESENCE_STUDIO_V2_PILOT_IDS=
```

## Hosted Lifecycle Result

Command run:

```powershell
npx.cmd playwright test presence-studio-v2-hosted-lifecycle.spec.ts --project=chromium --workers=1
```

Environment used:

```txt
PRESENCE_HOSTED_SMOKE=1
PRESENCE_E2E_BASE_URL=https://your-presence.vercel.app
PRESENCE_E2E_API_URL=https://anu-back-end.vercel.app
PRESENCE_STUDIO_V2_HOSTED_PILOT_ROOM_ID=11
```

Result:

```txt
1 failed
```

Failing step:

```txt
open V2 owner editor
```

Failure:

```txt
getByTestId('presence-studio-v2-root') was not found after 30000ms
```

What passed before failure:

- Hosted owner sign-in.
- Owner session/token extraction.
- Anonymous context did not see `presence-studio-v2-root` on the owner editor route.
- Owner editor route for room `11` loaded.
- Owner editor overview API returned `200`.

What did not run because the test stopped safely:

- V2 object edit/add.
- Save draft.
- Reload persistence.
- V2 owner draft preview.
- Real publish.
- Anonymous V2 public render.
- Hosted public payload hygiene.
- Cleanup/restoration mutation.

## Evidence Paths

Playwright failure evidence:

```txt
test-results/presence-studio-v2-hosted--16269--a-flagged-V2-room-publicly-chromium/error-context.md
test-results/presence-studio-v2-hosted--16269--a-flagged-V2-room-publicly-chromium-retry1/error-context.md
```

The error context snapshot shows the hosted room rendering the existing Canvas/GGM editor with title `Christina Kerkvliet Goddard`, not the Studio V2 cockpit.

No explicit success screenshots were captured because the lifecycle failed before reaching V2 editor, preview, or public render states.

## Console / Page Error Status

Safe room verification:

- page errors: none
- console error count: 0

Formal hosted lifecycle:

- failed due missing V2 root selector
- no content mutation occurred

## Payload Hygiene

Hosted public payload hygiene was not reached because the smoke failed before publish/public V2 render.

Local payload hygiene still passes:

- nested editable config names are stripped from sanitized V2 public payloads
- editor-only lock/pin/hidden state is not rendered publicly
- TemplateKit/control-plane paths are absent from local public output
- hidden public objects are removed from public projection

## Cleanup / Restoration Status

No cleanup was required.

The hosted smoke failed before:

- adding objects
- saving draft
- publishing
- changing public content

Room `11` remains on its original published GGM state.

## Conversion Pass (Kimi, 2026-06-03)

A subsequent conversion pass executed the minimal fix plan:

1. ✅ **Backed up** room 11 original state to `docs/program/evidence/studio-v2-hosted-room-11-backup/`.
2. ✅ **Converted** published config to V2 via owner editor draft API (`POST /api/presence/owner/rooms/11/editor/draft` with `renderer_key: presence-studio-v2-room`, then `POST .../publish`).
3. ✅ **Updated** node metadata via `PATCH /api/presence/owner/nodes/11` to set `metadata.custom_renderer_key: presence-studio-v2-room`.
4. ✅ **Added frontend metadata fallback** in `lib/presence/studio-v2/feature.ts` so `shouldUsePresenceStudioV2` checks metadata when owner API omits `node.renderer_key`.
5. ✅ **Added unit tests** for metadata fallback (`lib/presence/studio-v2/feature.test.ts`, 8/8 pass).
6. ⚠️ **Pending:** Vercel env var confirmation + frontend redeployment.

Post-conversion backend state:
- Published config version: 27, renderer_key: `presence-studio-v2-room`
- Public API node.renderer_key: `presence-studio-v2-room`
- Owner API metadata.custom_renderer_key: `presence-studio-v2-room`
- Public page still renders legacy GGM (deployed frontend lacks fix + env vars)
- Owner editor still renders legacy GGM (same reason)

## Remaining Blockers

1. **Frontend deployment:** The metadata fallback fix is not deployed to Vercel.
2. **Vercel env vars:** `NEXT_PUBLIC_PRESENCE_STUDIO_V2` and `NEXT_PUBLIC_PRESENCE_STUDIO_V2_PILOT_IDS` must be set and the frontend redeployed.
3. **Hosted smoke rerun:** After deployment, run `presence-studio-v2-hosted-lifecycle.spec.ts`.

## Rollback

If conversion causes problems, run:
```bash
ROOM11_OWNER_TOKEN=<token> npx tsx scripts/restore-room-11-from-backup.mts
```

## Readiness Verdicts

- Local integration readiness: ready.
- Backend V2 data readiness: converted.
- Frontend code readiness: fixed, pending deployment.
- Hosted V2 editor readiness: blocked; pending deployment + env vars.
- Hosted owner preview readiness: blocked; depends on editor mount.
- Hosted public render readiness: blocked; depends on env vars + deployment.
- Controlled operator-led pilot readiness: not ready until hosted lifecycle smoke passes.
- Public self-serve onboarding readiness: not ready.
