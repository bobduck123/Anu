# Owner Journey — Presence Studio Editor V1.5

## The eight beats

| # | Beat | One-sentence intent |
|---|---|---|
| 1 | Start | Owner enters the editor and immediately sees their room. |
| 2 | Shape content | Owner edits words and images directly on the canvas. |
| 3 | Shape look | Owner picks a mood; tunes one thing if they want to. |
| 4 | Add or change media | Owner opens the media drawer; picks an image; sets focal point and alt text. |
| 5 | Check readiness | Owner sees one or two gentle chips inline. Nothing alarming. |
| 6 | Preview draft | Owner sees their room exactly as visitors will, with a small amber chip. |
| 7 | Open to visitors | Owner confirms, sees the success state, knows it's live. |
| 8 | Return later | Owner comes back another day and lands in a calm dashboard, not a 47% score. |

## Beat 1 — Start

**What the owner sees:**

The editor opens to the Build mode with the canvas already rendering
their current draft (or the live room if no draft). The room is the
visual masthead. Top bar shows their name, save state, and a single
contextual primary action.

If this is the very first session and no draft exists yet:

- A soft amber chip in the top-centre of the canvas: `✱ Start by
  clicking your title above.`
- The status strip: `Not yet opened to visitors. Start here.`
- The primary action: `Save & preview`.

**What the owner clicks:**

The title in the canvas (or any other affordance).

**Copy:** see COPY_PACK.md > Canvas intro / Empty selection state.

**What must be hidden:**

- Version pills.
- Readiness percentage.
- Tab strip for advanced modes.
- The 11-tab CRM under any default surface.

**What feedback appears:**

The clicked element gets a 1-px amber dashed outline + handles. The
right inspector populates with that element's controls.

**What errors look like:**

Session expired → "Sign in again to keep editing" with a sign-in
button. No technical detail.

**What Emad/operator can do:**

In the Advanced drawer's Staff section, see the renderer key,
schema version, raw config JSON, and "Sync canonical assets" — for
first-session setup.

**What the owner can do alone:**

Everything above. Click, see, edit.

## Beat 2 — Shape content

**What the owner sees:**

Selection state with mini-toolbar above the selected element. For
text: size / weight / colour / alignment / font mood / italic /
reset. For image: Replace / Focal point / Alt text / Restore /
Remove. For scene: Layout / Background / Hide.

**What they click:**

- The title → mini-toolbar slides in; the title becomes editable in
  place (contenteditable). Type. Tab away or click outside saves to
  draft.
- The cover image → mini-toolbar with Replace as the primary; click
  Replace opens the media drawer (see Beat 4).
- The calling-card contact lines → each line is its own selectable
  region; click → edit in place.

**Copy:**

- Saved chip: `Saved to draft ✓` for 1.4s next to the element.
- Save failed: `Couldn't save — try again` with retry button.

**What must be hidden:**

- Schema field paths in tooltips.
- Auto-saved-version-N indicators.

**What feedback appears:**

Element flashes amber briefly on save; status strip updates count
("4 saved changes ready to open").

**What errors look like:**

A small inline `Couldn't save — try again` chip next to the
affected element. No global modal.

**Operator capability:** can use the Advanced drawer to discard a
draft and start over for the owner.

## Beat 3 — Shape look

**What the owner sees:**

Click `Look` in the bottom mode strip. The canvas dims slightly and
a paper-toned drawer slides from the right with three sections:

1. **Mood** — 3 large thumbnails (Paper Gallery / Ink Room / Warm
   Archive). Click applies.
2. **Fonts** — 6 font-pack thumbnails (Editorial Gallery / Soft
   Studio / Luxury Serif / Mono Archive / Brutalist Poster /
   Handwritten Notes). Click applies.
3. **More** (expandable) — per-token colour pickers, individual font
   picker, motion preset (Still / Gentle / Living / Immersive
   advanced).

**What they click:**

A mood thumbnail. The canvas changes immediately. They click another
to compare. They click `Save your changes` in the top bar when
satisfied.

**Copy:** see COPY_PACK.md > Style panel intro / Font picker helper
/ Palette picker helper.

**What must be hidden:**

- Hex inputs at first glance (under "Make your own mood").
- Font-family CSS strings (only labels: "Inter Tight + Inter").
- Disabled coming-soon controls (in a separate "Coming soon"
  collapsible section, not interleaved with live ones).

**What feedback appears:**

Mood thumbnail shows a subtle "Currently applied" tick when the
canvas matches it.

**What errors look like:**

Custom hex picker rejecting a bad value: `Pick a valid colour` next
to the field, no modal.

**Operator capability:** apply advanced packs (Warm Archive, Liquid
Signal) for the owner. Toggle heavy-motion.

## Beat 4 — Add or change media

**What the owner sees:**

Click `Images` in the bottom mode strip. The Images mode opens. Or,
within Build mode, clicking an image affordance opens the media
drawer directly from the canvas.

The media drawer is a panel that slides from the right (desktop) or
from the bottom (mobile). Three columns:

- **Your room images** — already attached. Click to set as primary
  or open detail.
- **Live room images** — canonical artworks the renderer falls back
  to. Click to attach to your editable config.
- **Upload** — file input if backend support exists; honest "Image
  upload coming soon — paste a public URL or ask Emad" placeholder
  otherwise.

**What they click:**

A media card. The drawer collapses to a per-image panel:

- Large preview.
- Focal point dot (drag to set).
- Alt text input.
- Image role selector (Cover / Work tile / Studio fragment /
  Calling-card portrait).
- "Use this image" button — applies + closes drawer.

**Copy:** see COPY_PACK.md > Image picker / Upload image /
Crop/focal point helper / Alt text helper / Media failed state.

**What must be hidden:**

- Slot dropdowns ("attached_assets / hero_image / artwork_images /
  thumbnails / texture_assets / portrait_image / social_preview").
- Asset URL string in the primary flow (Advanced > Raw image URL).

**What feedback appears:**

Selected image applies and the canvas updates in 200ms. "Image
updated · saved to draft" chip in the top-bar status area.

**What errors look like:**

URL paste hitting the asset validator: `That URL isn't safe for a
public room — try a different image.` with link to "Why?" that
shows the validator's reason in plain language.

**Operator capability:** upload images on behalf of the owner via a
direct admin route until owner-side upload ships.

## Beat 5 — Check readiness

**What the owner sees:**

Readiness is **inline**, not header-mounted. Each unfinished thing
appears as a small amber chip pinned to the element that needs it:

- Above the hero image: `✱ Pick a cover image`
- Next to a work tile with no alt text: `Alt text missing`
- Under the calling card: `Add an invitation line`

The chip is a click target. Click → the inspector opens with that
field focused. Address it → chip dissolves.

The Build mode header shows a single quiet line: `2 things to look
at` (or `Looking good` when zero).

**What they click:**

A readiness chip. The inspector opens with the fix focused.

**Copy:** see COPY_PACK.md > Readiness chip.

**What must be hidden:**

- The percentage gauge.
- The Critical / Recommended / Polish count pills.
- The improvement-tips list (folded into the chip).

**What feedback appears:**

Chip animates out when the issue is resolved.

**What errors look like:**

If a readiness rule itself fails (asset validator throws), surface
a calm chip: `Can't read this image — try another` with a single
suggested fix.

**Operator capability:** see full readiness JSON in Advanced > Staff.

## Beat 6 — Preview draft

**What the owner sees:**

Click `Preview` in the bottom mode strip OR `Preview your draft`
primary action. The full-screen draft preview replaces the editor.

- The room is rendered as visitors will see it.
- Amber pill at top-centre: `Draft preview · only you can see this`.
- 1-px amber registration ticks in the four corners.
- A single bottom pill: `← Editor · Desktop · Mobile · Open room
  to visitors →`.

**What they click:**

- Click anywhere on the artwork → cycles slides (it's the real
  Scene 01 behaviour).
- Use the bottom pill to toggle Desktop/Mobile.
- Click `Open room to visitors` → publish confirmation.
- `Esc` returns to Build.

**Copy:** see COPY_PACK.md > Preview button / Preview page label.

**What must be hidden:**

- Editor metrics.
- Save buttons (preview is read-only inspection).

**What feedback appears:**

Mobile toggle reflows the room into a 390px frame. Visitors-mode
toggle (future, P1) hides the amber registration marks for a "see
it as visitors will" moment without the draft chrome.

**What errors look like:**

Preview API failure: a calm `Couldn't load your preview — try again`
panel with retry.

**Operator capability:** open Advanced > Staff in preview to see the
preview API payload.

## Beat 7 — Open to visitors

**What the owner sees:**

Publish confirmation dialog (see DRAFT_LIVE_CONFIDENCE.md). One
green primary button: `Open room to visitors`. Confirm.

**What they click:**

The green button. Spinner. Success toast: `Your room is open.
Visitors now see your changes.` with `View live room ↗`.

**Copy:** see COPY_PACK.md > Open to visitors button / Open to
visitors confirmation / Publish success / Publish blocked.

**What must be hidden:**

- Backend response details.
- Version numbers ("Now live: v3").

**What feedback appears:**

Status strip in editor updates to "Visitors see: opened just now.
All caught up."

**What errors look like:**

Publish failed → red toast `Your room could not be opened. Your
draft is safe. Try again.` with a retry button. Status strip
unchanged.

**Operator capability:** Advanced > Versions shows the new live
version + the archived previous version.

## Beat 8 — Return later

**What the owner sees on next visit:**

Owner enters `/studio/[id]/editor` days later. They see:

- Top bar: room name, `Live · opened 5 days ago`, `All caught up`.
- Status strip: `Visitors see: opened 5 days ago.`
- Canvas: their current live room (because no draft exists).
- Primary action: `Edit room` (greens up the canvas selection mode
  + creates an empty draft on first edit).

**What they click:**

`Edit room` to start a new round. Or `Preview` to look at the live
room as visitors do. Or back to Studio dashboard.

**Copy:** see COPY_PACK.md > Editor header.

**What must be hidden:**

- Readiness gauge on a "caught up" room.
- Diff/comparison panel when there are no draft changes.

**What feedback appears:**

The Build mode header micro-flashes "Welcome back" for 1.4s on
first load. (Optional, can be turned off.)

**What errors look like:**

Owner is no longer the room owner (role removed) → calm full-screen
"This room isn't currently in your account. Contact your operator."
No technical detail.

**Operator capability:** Advanced > Sessions shows the owner's
recent edit history. Advanced > Cleanup offers a draft reset for
support cases.

## What this journey deliberately does NOT include

- A guided onboarding tour. We let the canvas teach itself. A tour
  is optional polish (P1).
- A "Save & preview & publish" macro button. Each step is its own
  intent, named clearly.
- An undo stack at first contact. Session undo is P1.
- Cross-room comparison. Single-room focus.
- An analytics / visitors panel. Not in V1.5.
- An ai-assist button. Not in V1.5 — would distract from the
  shaping intent.
