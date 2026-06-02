# Presence Studio V2 Hosted Smoke

Date: 2026-06-03

## Status

Not run.

Hosted smoke is intentionally deferred until the V2 editor UI and V2 public renderer are mounted behind the feature flag. The current completed slice is adapter/payload infrastructure only; running hosted lifecycle smoke now would only exercise the existing editor, not Studio V2.

## Hosted Smoke Preconditions

Before running hosted smoke, complete:

1. Mount Studio V2 editor inside the real owner editor route behind feature flags.
2. Save Studio V2 edits through the real owner draft API.
3. Render private preview using sanitized V2 public projection.
4. Publish through the real publish endpoint.
5. Dispatch published V2 rooms to the V2 public renderer.
6. Add public payload hygiene assertions for the V2 public route.

## Required Environment

```txt
PRESENCE_HOSTED_SMOKE=1
PRESENCE_E2E_BASE_URL=
PRESENCE_E2E_API_URL=
PRESENCE_E2E_OWNER_EMAIL=
PRESENCE_E2E_OWNER_PASSWORD=
NEXT_PUBLIC_PRESENCE_STUDIO_V2=1
NEXT_PUBLIC_PRESENCE_STUDIO_V2_PILOT_IDS=<pilot-room-id-or-slug>
```

Optional cleanup:

```txt
PRESENCE_E2E_CLEANUP_STRATEGY=control-delete
PRESENCE_E2E_CONTROL_TOKEN=
PRESENCE_E2E_CONTROL_SECRET=
```

## Planned Hosted Smoke Flow

1. Sign in as owner.
2. Open feature-flagged pilot room.
3. Load Studio V2 editor.
4. Edit object content.
5. Add object.
6. Adjust Skin Lab.
7. Use Wild Mode transform.
8. Save draft.
9. Reload editor and confirm persistence.
10. Open private preview.
11. Publish.
12. Visit public route.
13. Assert no editor chrome.
14. Assert no internal config names or V2 editor-only terms.
15. Cleanup or document retained pilot fixture.

## Current Blocker

The V2 UI/public renderer integration is not complete yet. Adapter and public payload infrastructure is ready for that next pass.

