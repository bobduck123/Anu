# Media Flow UX — Presence Studio Editor V1.5

## Why Media Flow needs its own UX

Today's Assets tab is a CRM form: slot dropdown ▾ + URL field +
alt text + Attach button. Even when the canonical-sync banner is
honest, the owner is asked to think in slots and URLs. Media is the
single most-touched primitive in a creative product. It deserves a
dedicated drawer with the language of "images" not "assets".

## When the media drawer opens

Three entry points; one drawer:

1. **Click an image on the canvas** (cover, work tile, portrait,
   inspire-board card) → drawer opens scoped to that image's role.
2. **Click `Images` in the bottom mode strip** → drawer opens with
   the room's full media library.
3. **A readiness chip** like `Pick a cover image` → drawer opens
   pre-scoped to "Cover".

The drawer slides in from the right on desktop (40vw, max 520px),
or from the bottom on mobile (50vh, draggable to 90vh).

## Drawer anatomy

```
┌────────────────────────────────────────┐
│  Images                       [ × ]    │ ← header
├────────────────────────────────────────┤
│  [ Your room ]  [ Live room ]  [ + ]   │ ← source tabs
├────────────────────────────────────────┤
│                                        │
│   ┌──────┐  ┌──────┐  ┌──────┐         │
│   │      │  │      │  │      │         │
│   │      │  │      │  │      │         │
│   └──────┘  └──────┘  └──────┘         │
│   Willow    Bridle    Empty Nest       │
│                                        │
│   ┌──────┐  ┌──────┐  ┌──────┐         │
│   │      │  │      │  │      │         │
│   │      │  │      │  │      │         │
│   └──────┘  └──────┘  └──────┘         │
│   Goodnight Thomas    Gothic           │
│                                        │
├────────────────────────────────────────┤
│  Pick an image to use as your cover    │ ← contextual footer
└────────────────────────────────────────┘
```

### Source tabs

- **Your room** — images already attached to your editable room. Click
  to set as primary or open detail.
- **Live room** — canonical artworks the renderer is using but that
  you haven't yet brought into your editable room. Click to attach.
  These are the canonical-sync items, surfaced inline.
- **+ Upload** — a real upload button if the backend uploader exists.
  An honest helper card if not:

  ```
  ┌──────────────────────────────────────┐
  │  ┌──────────────────────────────┐    │
  │  │   +                          │    │
  │  │                              │    │
  │  │   Upload coming soon         │    │
  │  └──────────────────────────────┘    │
  │  Paste a public image URL, or ask    │
  │  your Presence operator to upload    │
  │  for you.                            │
  │                                      │
  │  [ Paste a URL ]                     │
  └──────────────────────────────────────┘
  ```

  "Paste a URL" expands a small form with the asset validator wired
  in. Validation errors read in plain language.

## Per-image detail panel

Clicking any image card transitions the drawer to a detail view:

```
┌────────────────────────────────────────┐
│  [ ←  back ]   Willow of Port Arthur   │
├────────────────────────────────────────┤
│  ┌────────────────────────────────┐    │
│  │                                │    │
│  │          [image]               │    │
│  │           ● ← drag             │    │ ← focal point dot
│  │                                │    │
│  └────────────────────────────────┘    │
│                                        │
│  Image role                            │
│  [ Cover image       ▾ ]               │
│                                        │
│  Alt text                              │
│  [ A luminous willow with...    ]      │
│  Describe the image for screen         │
│  readers and search engines.           │
│                                        │
│  ─────────────────────────────────     │
│                                        │
│  [ Use this image ]                    │
│  [ Restore previous ]    [ Remove ]    │
└────────────────────────────────────────┘
```

### Focal point

A draggable dot over the image preview. Snaps to a 0..1 / 0..1
coordinate. Renderer reads it as `object-position`. Default centred.

Helper line under the image: `Drag the dot to choose what stays in
view when the image is cropped.`

### Image role

A dropdown of meaningful labels, not slot names:

- Cover image
- Work in the wall
- Practice studio fragment
- Portrait
- (Advanced) attached asset

Selecting a role updates the asset slot in the config. The dropdown
hides slot names entirely from the owner.

### Alt text

Single text field with a helper line. Defaults to a sensible value
when the image is a known canonical (e.g. uses `work.alt`).

### Use this image

The primary green button. Applies + closes drawer. Toast: "Image
updated · saved to draft".

### Restore previous

Shown only when the slot has an `_history` entry — the previously
attached image. Restores it.

### Remove

Asks confirm. Empties the slot. Renderer falls back to canonical.

## Validation states

The asset validator stays the source of truth. UX V1.5 surfaces its
verdicts in plain language:

| Validator result | Owner-facing message |
|---|---|
| local filesystem path | "That looks like a file on your computer. Upload it, or pick from your room images." |
| `file:` URL | (same) |
| `data:` URL | "Images need to be on a public web link, not embedded data." |
| script-like content | "That URL isn't safe to use for a public room." |
| raw secret / signed credential | "This URL has a one-time access code that will expire. Host the image on a stable link, or upload it." |
| localhost / internal host | "Pick an image hosted on the public internet." |
| http (not https) | "Use a secure (https) link, please." |
| protocol-relative `//` | (same as above) |
| broken image (load failure) | "We couldn't load this image. Pick another or try again." |
| OK but unusually long URL | (warning, allows save) "Long URL — works, but consider hosting somewhere shorter." |

## Image readiness

Inline chips on the canvas surface tell the owner what's missing:

- `Pick a cover image` (when the hero slot is empty)
- `Add alt text` (per image without alt)
- `Image won't load` (when an attached URL 404s)
- `Image is using a one-time link — replace soon` (warning for
  signed URLs)

Chips persist until resolved. Click → opens the media drawer scoped
to the offending image.

## Mobile arrangement

On viewports ≤ 920px:

- The drawer becomes a bottom sheet (drag-handle, swipe to
  dismiss, 50vh default, 90vh expanded).
- Source tabs become a segmented control under the header.
- Image grid becomes 2-column.
- Detail panel takes the full sheet height.

## What does NOT enter the editor in V1.5

- Real-time crop / aspect-ratio cropping (Codex P1+; needs
  draft-scoped backend endpoint).
- Image filters / colour adjustments (out of scope).
- Multi-select / bulk operations (out of scope).
- AI alt-text generation (out of scope until backend supports).
- Stock / Unsplash search (out of scope).

## Operator escape hatch

Two operator-only flows exist in Advanced > Staff:

- **Direct asset attach** — paste any URL, bypasses the canonical
  source tabs. Used for one-off images during onboarding.
- **Bulk-import canonicals** — for a brand-new room, attach all
  renderer canonicals to the editable config in one click. The
  owner gets a populated media library on first session.

These are not visible to owners.

## Acceptance criteria

1. A non-technical owner can change a cover image in ≤ 8 seconds
   from clicking the canvas image to seeing it applied.
2. They can set the focal point in ≤ 10 seconds.
3. They can find an image they previously attached in ≤ 6 seconds.
4. They never see the word "asset", "slot", "URL" in the primary
   flow (Advanced is fine).
5. They never see a hex / signed URL string.
6. They can hit the asset validator without getting a developer-
   sounding error.
