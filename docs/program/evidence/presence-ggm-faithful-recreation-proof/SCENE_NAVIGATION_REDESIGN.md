# Scene Navigation Redesign (v4 — UX reset)

Date: 2026-05-23
Reviewer: Claude
Renderer key: `ggm-faithful-room-v1` (unchanged; only the stage shell
changed).

## Why this pass exists

The v3 pass introduced a left rail / chapter index / mobile dock that
read as a software UI. It worked, but it was loud — it competed with
the artwork, asked the visitor to navigate a system, and made the
mechanical card idea hard to feel through the chrome.

This pass is a UX reset, not another feature pass. The goal is to
make the **mechanical scene-card replacement** finally land, by
removing system chrome and trusting the artwork.

## What was removed

| Removed | Why |
|---|---|
| Left rail (`.rail`, `.railBrand`, `.railList`, `.railItem*`, `.railLabel*`, `.railNum`, `.railFoot`) | Read as a dashboard. Forced a margin-left on the stage. |
| Mobile bottom dock (`.mobileDock*`) | Read as an app shell. Cluttered the bottom. |
| Persistent Presence-actions strip below the stage | Forced the visitor out of the viewing frame to reach a system tray. |
| Per-scene right-edge label text | Already covered by the scene counter. Created visual noise. |
| Stage badge + stage number + stage hint row (v3 top/bottom helpers) | Duplicate of the new scene counter. |
| Internal scene scrollbars | Replaced with overflow-hidden + scrollbar-width: none inside the frame. |
| Page-level scroll | The document is now `overflow: hidden` while the Room is mounted. |
| `GgmCursor` and `GgmScrollBar` (in the stage flow) | Decorative chrome that read as software. Still available behind preview mode if a future operator wants them. |

## What replaced it

A **single fixed 100svh viewing frame** with three discreet
navigation affordances:

1. **Bottom-center scene counter.**
   `01 — ARTWORK FIELD / 04`
   Reads via `mix-blend-mode: difference` so it sits on the artwork
   without a panel. Opacity 0.7 at rest, 1.0 on hover. The only
   persistent text outside the frame.
2. **Right-edge tick marks.** Four 1px white hairlines (blend-difference)
   running vertically near the right edge. The active scene's mark
   is wider. No labels appear; they read as score lines on the
   frame. Clickable and focusable for keyboard users.
3. **Bottom-right next affordance.** A `→` arrow that on hover reveals
   the next scene's name in display type ("Work Wall", "Practice
   Studio", "Calling Card", "Return"). Returns to scene 01 on the
   last scene.

All three sit in `mix-blend-mode: difference` so they adapt to
whatever artwork is showing without needing background panels.

Plus an off-by-default **brand mark** top-left in the same blend mode
— the artist's name, faithful to the source site's nav signature.

## Movement now feels like

- Wheel / trackpad — one accumulated gesture advances one scene.
  Wheel is `preventDefault()`-ed because the page no longer has a
  scrollable body; the visitor can't get lost in scrollbars.
- Keyboard — arrows / page keys / space advance one scene. `Home`,
  `End`, and `1–4` jump directly. `Escape` is intentionally NOT
  bound (lets focus management work elsewhere).
- Touch — vertical swipe (with horizontal lock-out) advances one
  scene.
- Click — the right-edge tick marks or the next affordance.

A 320ms cooldown prevents accidental double-advances; a 340ms
wheel-tick window prevents trackpad chatter.

## Scene behaviour after the reset

### 01 Artwork Field
- WebGL liquid canvas fills the entire frame.
- Only text inside the frame is the current work title + year +
  caption, all in `mix-blend-mode: difference` at the bottom-center.
- RoomKey provenance chip (if `/r/[token]` opened this Room) sits as
  a tiny mark at the top-right, blend-difference, opacity 0.85.

### 02 Work Wall
- Paper background fills the frame.
- Asymmetric 12-col hang of all selected works.
- No top-level navigation chrome; the scene counter still shows.
- Internal scroll inside the frame for long viewports, but
  scrollbars are hidden.

### 03 Practice Studio
- Paper-warm background.
- Workbench composition: pinned studio note, strand cards, working-
  path card, inspire-rail.
- Reads as a destination, not a section.

### 04 Calling Card
- Paper background; calling card centered inside the frame.
- Wax seal, corner marks, debossed border, name, role, contact lines.
- Presence enquiry CTA + Write Directly buttons folded into the
  card's action row.
- No persistent system tray below the card — the card IS the close
  of the room.

## Liquid transition preservation

The `GgmLiquidCanvas` component is unchanged. It still:

- runs the ported WebGL2 ripple / glass shaders;
- accepts `style`, `intensity`, `distortion`, `transitionMs` from
  the motion context;
- collapses to a crisp cut under reduced motion / power saver;
- swaps to a `<img>` fallback when WebGL2 isn't available;
- writes a `lastRenderRef` so resize / texture-load events re-render
  cleanly.

The morph plays between scene backgrounds whenever the active scene
changes. Scene 02/03/04 surfaces are paper colours so the visitor
still sees the morph but isn't visually stuck on an artwork (the
paper surface starts opaque after the morph completes, which feels
like the frame's content has been replaced rather than swapped).

## Settings menu — preview-gated reveal

Public visitors don't see a settings trigger. The menu only renders
when:

1. The URL has `?preview=1` or `?devmotion=1`, OR
2. The visitor presses `Shift + P` at any point (session-only
   toggle, not persisted).

When visible, the menu floats at bottom-left and uses the existing
paper-styled dropdown. Same fields as v3 (Motion / Surface /
Texture / Power Saver). Settings still persist in `localStorage`.

## RoomKey entry

`/r/[token]` for GGM still dispatches into `GgmFaithfulRoom` with
`roomKeySourceLabel`. The label appears as a tiny
`✱ Opened via NFC` mark at the top-right in blend-difference — no
banner, no overlay, no separate page. Invalid / revoked tokens still
fall through to the universal safe-error surface.

## Mobile

- Frame insets shrink (`1.4rem` vs `2.6rem` on desktop) so the
  artwork fills more of the viewport.
- Edge tick marks narrow to 10px / 20px active.
- Next-affordance label hidden on phones (`→` only).
- Scene counter font tightened.
- Corner marks shrunk to 16px.
- Wheel listener still preventDefaults; native touch swipe still
  advances scenes.

## Reduced motion

- `prefers-reduced-motion: reduce` (OS preference) OR the Power
  Saver toggle (in preview-gated settings) sets `liquidStyle: "cut"`
  and `liquidDurationMs: 240`, drops dither / film grain to 0, and
  disables the custom cursor / decorative animations.
- Scene transitions become crisp cuts; the WebGL canvas swaps
  textures instantly.
- Edge mark + counter + next-affordance transitions are reduced to
  0.01ms via the existing CSS rule.

## Accessibility

- Semantic ordering: `<main>` carries the Room, scene content keeps
  proper heading hierarchy.
- `aria-current="true"` on the active edge mark.
- `aria-live="polite"` on the scene counter and the provenance mark
  so screen readers announce scene changes.
- Visible focus styles preserved on the edge marks and next
  affordance (white outline, blend-difference).
- A `srOnly` link to the canonical source URL is always present in
  the DOM so it's discoverable.
- Number keys 1–4 jump to scenes directly.

## Files changed in v4

- **Rewritten**:
  - `presence-app/components/presence/ggm/GgmStage.tsx` — new minimal
    state machine.
  - `presence-app/components/presence/ggm/GgmFaithfulRoom.tsx` —
    dropped persistent action strip, brand mark moved into stage.
- **Edited**:
  - `presence-app/components/presence/ggm/ggm.module.css` — appended
    v4 CSS layer (~340 lines) for `room`, `frame`, `sceneCounter`,
    `edgeMarks`, `nextAffordance`, `brandMark`, `provenanceMark`,
    `settingsFloat`, `srOnly`, frame-surface variants, mobile
    refinements. v1 / v2 / v3 classes are retained for the focus-
    detail mode path.
  - `presence-app/scripts/capture-ggm-screenshots.mjs` — added v4
    minimal-nav capture targets using the number-key jump.
- **Unchanged**:
  - `presence-app/components/presence/ggm/GgmLiquidCanvas.tsx`
  - `presence-app/components/presence/ggm/GgmMotionContext.tsx`
  - `presence-app/components/presence/ggm/GgmSettingsMenu.tsx`
    (visibility now gated by the stage)
  - `presence-app/components/presence/ggm/GgmStudioScene.tsx`
  - `presence-app/components/presence/ggm/GgmCallingCard.tsx`
  - `presence-app/components/presence/ggm/GgmWorkDetail.tsx`
  - `presence-app/components/presence/ggm/GgmReveal.tsx`
  - `presence-app/lib/presence/ggm/source.ts`
  - `presence-app/lib/presence/ggm/activate.ts`

## Screenshots

All under `screenshots/v4-minimal/`:

| File | Shows |
|---|---|
| `01-artwork-field-{desktop,mobile}.png` | Default landing — artwork + frame + minimal nav |
| `02-work-wall-{desktop,mobile}.png` | Scene 02 after key press `2` |
| `03-practice-studio-{desktop,mobile}.png` | Scene 03 after key press `3` |
| `04-calling-card-{desktop,mobile}.png` | Scene 04 after key press `4` |
| `05-preview-settings-{desktop,mobile}.png` | `?preview=1` reveals the settings dropdown |
| `06-reduced-motion-{desktop,mobile}.png` | OS reduced-motion variant |
| `07-roomkey-entry-loader-{desktop,mobile}.png` | `/r/<stub>` loader; real-token path dispatches into Scene 01 with provenance mark |

## Tests run

- ✓ `npm run typecheck`
- ✓ `npm run build` (50 routes; GGM intact)
- ✓ Live DOM probes:
  - `/p/ggm-christina-goddard`: has `room`, `frame`, `sceneCounter`;
    no `rail`, no `mobileDock`.
  - `/p/rooms-underground-dj`: no GGM contamination; Mira K. content
    intact.
  - `/r/test-stub`: universal loader; no GGM contamination.
  - `/world`: "forming" copy preserved; no global-map / realtime copy.
- ✓ Screenshot capture (14 v4 captures).

Not run locally (require hosted env):

- `playwright.first-pilot-ggm.config.ts`
- `playwright.auth-permanence.config.ts`

## Known limitations

1. **Haffer XH font** — Inter Tight fallback still in place.
2. **WebGL2 fallback** — the `<img>` fallback is correct but the
   transition becomes a flat cross-fade.
3. **Hover label for the next affordance** is hidden on phones.
   That's a deliberate choice; the `→` arrow still reads as "advance".
4. **Internal long scenes** (Studio) rely on hidden scrollbars
   inside the frame for very small viewports. The page itself never
   scrolls.

## Verdict

**Visual sign-off: GO.** The Room no longer feels like a sidebar-
driven scroll page. It feels like a single viewing frame with four
mechanical scene-cards that mechanically replace each other while
the liquid transition runs behind. About and Contact are
destinations, not lower sections. The Presence-native enquiry is
folded into the Calling Card. The mechanical scene-card idea has
finally landed.
