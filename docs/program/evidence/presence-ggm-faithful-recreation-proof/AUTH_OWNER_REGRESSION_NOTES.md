# Auth & Owner Regression Notes

Date: 2026-05-23
Scope: confirm the GGM faithful renderer pass does not regress
authentication, owner access, RoomKey entry, World posture, or other
non-GGM Rooms.

## Surfaces verified locally (Presence dev at http://localhost:3001)

### Public redaction

Verified live via `preview_eval` on the rendered `/p/ggm` page:

```js
({
  leaksLocalPath: false,
  leaksOperatorEmail: false,    // no "e4hatu" string anywhere in DOM
  leaksPlatformAdmin: false,    // no "platform_admin" string anywhere
  showsArtistEmail: true,       // christina.8@bigpond.com — intentional, public
  showsWorld: false,            // no "world map canvas / realtime" copy
})
```

- The artist's email (`christina.8@bigpond.com`) IS surfaced. It is the
  artist's published public email, present on the source's live demo
  and on `C:\Dev\ggm\data\artist.json`. It is NOT the Presence operator
  email and is not platform admin data.
- No frontend file references `platform_admin` or `e4hatu`. Grepping
  the whole `presence-app` tree returns no hits for either string.

### World posture

`/world` still renders the "forming" copy and does NOT expose world map
canvas, global map, or realtime multiplayer copy:

```js
({
  hasFormingCopy: true,
  hasWorldMapCanvas: false,
})
```

This matches the existing `tests/e2e/first-pilot-ggm.spec.ts:14-18`
assertion shape.

### Non-GGM Rooms still use the normal DNA renderer

A fetch against `/p/rooms-underground-dj` (the underground-dj demo
profile) shows:

```js
({
  hasGgmClass: false,           // .ggm-module-* never appears
  hasGenericRenderer: true,     // page still names Mira K., Berghain, etc.
})
```

This proves the renderer dispatch in `PresenceDnaRenderer.tsx:48-66`
correctly short-circuits ONLY when
`resolveCustomRendererKey(node) === GGM_RENDERER_KEY`. All other rooms
take the existing path.

### Non-GGM RoomKey entry untouched

A fetch against `/r/test-stub` still hits the universal loader path:

```js
({
  hasOpeningRoom: true,
  hasGgmClass: false,
})
```

When the resolved Room is GGM, the loader resolves to the faithful Room
with an "Opened via NFC/QR" chip in the paper palette
(`components/presence/graph/RoomKeyEntry.tsx:81-87`). Otherwise it falls
through to the existing stone-950 + orange-300 entry surface.

## Surfaces requiring hosted verification

The local dev environment cannot exercise:

1. **e4hatu@gmail.com sign-in** — requires Supabase Auth credentials
   pointing at the deployed backend. The auth-permanence recovery (see
   `../presence-auth-permanence-recovery-proof/`) added a Next proxy
   session-refresh path that already passes its own e2e harness, but
   the GGM-specific browser proof requires `npm run test:e2e` with the
   GGM env loaded:

   ```text
   PRESENCE_PILOT_GGM_FRONTEND_URL=<deployed app>
   PRESENCE_PILOT_GGM_BACKEND_URL=<deployed backend>
   PRESENCE_PILOT_GGM_ROOM_SLUG=ggm
   PRESENCE_PILOT_GGM_ROOM_ID=<id>
   PRESENCE_PILOT_GGM_ROOMKEY_TOKEN=<token>
   npx playwright test --config=playwright.first-pilot-ggm.config.ts
   ```

2. **GGM Studio analytics owner-gating** — the route exists at
   `/studio/[id]/analytics`. The existing e2e test
   (`tests/e2e/first-pilot-ggm.spec.ts:32-42`) probes this route and
   asserts it surfaces a `Presence|Studio|Sign in` body and not a
   `Traceback`. The renderer pass did not modify any
   `app/(studio)/studio/[id]/**` files, so the route shape is
   unchanged. **Status: not regressed; hosted smoke required to claim
   passing.**

3. **Logout** — handled by the existing `/auth/sign-out` route, which
   the renderer pass did not touch.

4. **Non-owner access denial** — backend RLS / route guards, untouched
   by the renderer pass.

## Renderer dispatch safety review

`lib/presence/ggm/activate.ts` is the only place where a GGM signature
is checked. The function:

- Only reads node fields that are part of the public PresenceNode
  contract.
- Never inspects `owner_user_id`, `enquiry_email`, `metadata.owner.*`,
  or any other private field.
- Returns null for any node whose slug / display name / metadata does
  not match the GGM signature. Falsy returns skip the GGM branch.

`PresenceDnaRenderer.tsx` calls `resolveCustomRendererKey` AFTER the
`useMemo` plan hook (rules-of-hooks safe) and AFTER the
`forceBlueprint` escape hatch (so Studio preview can still compare
against blueprint variants without dispatching to the faithful Room).

`RoomKeyEntry.tsx` adds the GGM dispatch AFTER the loading and error
returns, again rules-of-hooks safe. The error / revoked-token state
remains the existing stone-950 surface (unchanged), so invalid RoomKey
states still feel safe and never leak GGM content.

## Manual hosted verification checklist

When the hosted smoke runs, confirm each of:

- [ ] e4hatu@gmail.com signs in via the deployed sign-in page.
- [ ] `/studio/[ggm_id]` loads for the owner and shows the Studio
      shell.
- [ ] `/studio/[ggm_id]/analytics` loads and shows the owner-gated
      analytics body.
- [ ] `/studio/[ggm_id]/analytics` shown to a fresh anonymous user
      returns a 401/302 (existing behaviour).
- [ ] `/p/ggm` shown to an anonymous user renders the GGM faithful
      Room with no studio chrome and no private fields.
- [ ] `/r/<real-ggm-token>` shown to an anonymous user opens directly
      into the GGM faithful Room with an "Opened via NFC" chip.
- [ ] `/r/<revoked-token>` shows the "Room Key is no longer active"
      state (universal, not GGM).
- [ ] `/world` shows "The World is forming" — no global map.
- [ ] Signing out from Studio returns the user to the public surface.

The existing `first-pilot-ggm.spec.ts` (4 tests) covers items 5 / 6 /
8 directly when the env file is provided. Items 1 / 2 / 3 / 4 / 7 / 9
are covered by `auth-permanence.spec.ts` and the controlled-launch
specs.

## Verdict

The renderer pass introduces zero changes to auth, Studio, World, or
non-GGM rooms. Public redaction is verified locally. Hosted smoke is
required only to claim a green GGM pilot launch (which is the existing
gate; this pass did not relax it).
