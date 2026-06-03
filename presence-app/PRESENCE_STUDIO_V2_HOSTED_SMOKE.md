# Presence Studio V2 Hosted Smoke

Date: 2026-06-03

## Current Status

Hosted Studio V2 lifecycle smoke was run against the provided hosted URLs and failed before mutation.

Initial failure reason: the supplied pilot room ID `11` was not a hosted Studio V2 room. It rendered the existing Canvas/GGM editor and had published renderer `ggm-faithful-room-v1`.

**Subsequent conversion pass (Kimi):**
- Room 11 backend data was converted to V2 via the owner editor API.
- Published config now has `renderer_key: presence-studio-v2-room` (version 27).
- Node metadata updated to `custom_renderer_key: presence-studio-v2-room`.
- Frontend metadata fallback fix added to `lib/presence/studio-v2/feature.ts`.
- **Blocked on:** Vercel env var confirmation + frontend redeployment.

No draft save, publish, public content change, or cleanup was required during the smoke attempt.

## Hosted Environment Used

```txt
PRESENCE_HOSTED_SMOKE=1
PRESENCE_E2E_BASE_URL=https://your-presence.vercel.app
PRESENCE_E2E_API_URL=https://anu-back-end.vercel.app
PRESENCE_STUDIO_V2_HOSTED_PILOT_ROOM_ID=11
```

## Room Verification

Read-only verification confirmed:

```txt
Room ID: 11
Slug: ggm-christina-goddard
Display name: Christina Kerkvliet Goddard
Status: published
Draft renderer: none
Published renderer: ggm-faithful-room-v1
Studio V2 root visible: false
```

Owner room scan:

- 28 owner rooms were inspected.
- No room had `presence-studio-v2-room` as node, draft, or published renderer.
- TemplateKit draft rooms exist, but they use `studio-room-template-kit-v1`.

## Command Run

```powershell
npx.cmd playwright test presence-studio-v2-hosted-lifecycle.spec.ts --project=chromium --workers=1
```

Result:

```txt
1 failed
```

Failing assertion:

```txt
getByTestId('presence-studio-v2-root') was not visible
```

The test stopped before all mutating steps.

## Evidence

```txt
test-results/presence-studio-v2-hosted--16269--a-flagged-V2-room-publicly-chromium/error-context.md
test-results/presence-studio-v2-hosted--16269--a-flagged-V2-room-publicly-chromium-retry1/error-context.md
```

## Smoke Flow Status

Passed:

1. Hosted owner sign-in.
2. Owner session/token extraction.
3. Anonymous visitor did not see the V2 editor root on owner editor route.
4. Owner editor route for room `11` loaded.
5. Owner editor API returned `200`.

Failed:

1. V2 editor mount for room `11`.

Not reached:

1. Edit/save.
2. Reload persistence.
3. Owner V2 preview.
4. Real publish.
5. Anonymous V2 public render.
6. Hosted payload hygiene after publish.
7. Cleanup/restoration mutation.

## Required For Next Run

Create or identify a real hosted Studio V2 pilot room:

```txt
renderer_key=presence-studio-v2-room
```

Then configure hosted V2 gating for that ID/slug:

```txt
NEXT_PUBLIC_PRESENCE_STUDIO_V2=1
NEXT_PUBLIC_PRESENCE_STUDIO_V2_PILOT_IDS=<v2-room-id-or-slug>
```

Server-side, if used:

```txt
PRESENCE_STUDIO_V2_ENABLED=1
PRESENCE_STUDIO_V2_PILOT_IDS=<v2-room-id-or-slug>
```

Rerun:

```powershell
$env:PRESENCE_HOSTED_SMOKE="1"
$env:PRESENCE_E2E_BASE_URL="https://your-presence.vercel.app"
$env:PRESENCE_E2E_API_URL="https://anu-back-end.vercel.app"
$env:PRESENCE_STUDIO_V2_HOSTED_PILOT_ROOM_ID="<actual-v2-room-id>"
npx.cmd playwright test presence-studio-v2-hosted-lifecycle.spec.ts --project=chromium --workers=1
```

## Readiness

- Local integration: ready.
- Hosted V2 editor: blocked; no V2 pilot room mounted.
- Hosted owner preview: blocked.
- Hosted public render: blocked.
- Controlled operator-led pilot: not ready until hosted lifecycle passes.
- Public self-serve onboarding: not ready.
