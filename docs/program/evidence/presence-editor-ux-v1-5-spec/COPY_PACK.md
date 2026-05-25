# Copy Pack — Presence Studio Editor V1.5

Exact strings for every owner-visible surface. Codex copies these
verbatim. No exceptions, no embellishment.

The pack also lists banned words and replacement vocabulary so
future strings stay consistent.

## Vocabulary

| ✗ Don't use | ✓ Use instead |
|---|---|
| config / editable_config / configuration | room |
| schema / schema_version | (don't surface) |
| renderer / renderer key | (don't surface) |
| mutation / payload / patch | change |
| asset / asset_config / slot | image (or invitation, calling-card line, etc.) |
| API / endpoint / backend | (don't surface) |
| publish / unpublished / production / staging | open to visitors / draft / live |
| fallback / default | room default |
| user / account | owner / you |
| section / tab | scene / mode |
| button | invitation (when it's a CTA); button is fine for chrome |
| theme | mood |
| validation / validator | safety check |
| metadata | (don't surface) |
| v1 / v2 / version | (only in Advanced > Versions) |
| readiness percentage | things to look at |
| critical / warning | (use plain language per item) |
| readiness score / completeness | (don't surface) |

## 1. Editor header

When live + caught up:
- Top bar: room name · `Live · opened 2 days ago` · `All caught up` · `Edit room`

When live + draft changes saved:
- Top bar: room name · `Live · opened 2 days ago` · `4 changes ready` · `Open room to visitors`

When live + draft changes unsaved:
- Top bar: room name · `Live · opened 2 days ago` · `Unsaved` · `Save your changes`

When no live, no draft:
- Top bar: room name · `Draft only — not yet open to visitors` · `Start with your title` · `Save & preview`

## 2. Canvas intro (first visit only)

Tiny amber chip appearing in the top-centre of the canvas for 6
seconds, dismissible:

> `✱ Click anything to start. Your changes save as a draft.`

After dismissal or first click, never appears again.

## 3. Empty selection state (right inspector)

> **Click anything to start editing.**
>
> Or pick a mood for the whole room.
>
> [ Paper Gallery ] [ Ink Room ] [ Warm Archive ]

## 4. Save state (top bar)

| State | Copy |
|---|---|
| No changes since last save | `All changes saved` |
| Unsaved changes | `Unsaved` |
| Saving | `Saving…` (with small spinner) |
| Save failed | `Couldn't save — try again` |
| Auto-saved just now | `Saved to draft ✓` (1.4s flash, then back to "All changes saved") |

## 5. Draft / Live note (status strip)

| State | Copy |
|---|---|
| Live, no draft | `Visitors see: opened 2 days ago.` |
| Live, draft saved | `Visitors see: opened 2 days ago. You have 4 saved changes ready to open.` |
| Live, draft unsaved | `Visitors see: opened 2 days ago. You have unsaved changes.` |
| Draft only | `Not yet opened to visitors. Save & preview to see it as visitors will.` |
| Publishing | `Opening your room to visitors…` |

## 6. Preview button

| State | Copy |
|---|---|
| Default | `Preview your draft` |
| Disabled (nothing to preview) | `Preview your draft` (tooltip: `Save your changes first.`) |

## 7. Preview page label

Top-centre pill on the full-screen preview:

> `Draft preview · only you can see this`

Bottom-centre action pill:

> `← Editor   ·   Desktop · Mobile   ·   Open room to visitors →`

## 8. Open to visitors button

| State | Copy |
|---|---|
| Default | `Open room to visitors` |
| Disabled because nothing to publish | `Open room is up to date` (tooltip: `No new changes since last opened.`) |
| Disabled because critical readiness item | `Open room to visitors` (with `Fix N things first` chip next to it) |
| Publishing | `Opening your room…` |

## 9. Open to visitors confirmation

Dialog title:
> `Open your room to visitors?`

Body:
> `Visitors will see your saved draft. You can always edit and open again later. The current live room (opened 2 days ago) will be kept as an earlier version.`

If first publish (no prior live):
> `Visitors will see your saved draft from this moment on. You can always edit and open again later.`

Buttons:
- Secondary: `Not yet`
- Primary green: `Open room to visitors`

## 10. Publish success

Toast at top-centre, green, dismisses in 4 seconds:

> `✓ Your room is open. Visitors now see your changes.`
> `[ View live room ↗ ]`

## 11. Publish blocked

If readiness has hard-blockers:

Dialog title:
> `A few things need attention`

Body:
> `Before you open your room to visitors:`
> `✱ Add a cover image`
> `✱ Add alt text to your works`

Buttons:
- Secondary: `Show me where`
- (no Primary — owner must fix)

If readiness has soft-blockers only (none today):

Dialog title:
> `A few things to look at`

Body:
> `These aren't required, but visitors may notice:`
> `✱ Your statement is empty`

Buttons:
- Secondary: `Show me where`
- Primary: `Open anyway`

## 12. Readiness chip (inline on canvas)

Pinned next to the affected element. Pattern: `✱ {short
imperative}`.

| Issue | Chip copy |
|---|---|
| Missing cover image | `✱ Pick a cover image` |
| Missing hero alt text | `✱ Add alt text` |
| Missing work alt text (singular) | `✱ Add alt text to "Bridle Road"` |
| Missing work alt text (many) | `✱ Add alt text to N works` |
| Empty wall | `✱ Add at least one work` |
| Empty calling card | `✱ Write your invitation` |
| Missing primary invitation | `✱ Add an invitation line` |
| Unsafe asset URL | `✱ Replace this image — link isn't safe` |
| Asset signed URL expiring | `Image link will expire — replace soon` (warning, not blocker) |
| No published config yet | (do not surface as readiness; surface in status strip instead) |
| Heavy motion on without confirm | `Heavy motion is on — visitors with reduced-motion will still see Gentle.` |

## 13. Image picker (drawer header + helpers)

Header:
> `Images`

Source tabs:
> `Your room` · `Live room` · `+ Upload`

Empty "Your room" state:
> `No images attached yet. Bring in your live room artworks, or upload your own.`
> [ Bring in live room images ]

Empty "Live room" state:
> `Your live room isn't using any default images.`

Per-image detail footer:
> `[ Use this image ]`
> Tertiary: `[ Restore previous ] [ Remove ]`

## 14. Upload image

When upload is supported:
> `Drag an image here, or [ pick a file ]`
> Below: `JPG, PNG, or WebP. Up to 10MB. Square or landscape works best.`

When upload is NOT supported (current state):
> Card title: `Upload coming soon`
> Body: `Paste a public image URL, or ask your Presence operator to upload for you.`
> [ Paste a URL ]

When upload fails:
> `Couldn't upload that image. Try a different file, or paste a public URL.`

## 15. Crop / focal point helper

Below the focal point dot in the image detail panel:

> `Drag the dot to choose what stays in view when the image is cropped.`

When the dot is set:

> `Focal point set. The image will keep this point in view on mobile and in tile views.`

## 16. Alt text helper

Below the alt text input:

> `Describe the image in one sentence — for visitors using screen readers, and for search engines.`

When empty and the image is in a public-visible slot, append the
inline chip on the canvas: `✱ Add alt text`.

## 17. Media failed state

Image didn't load:
> `We couldn't load this image. The link may be broken or the image was removed.`
> [ Try again ] [ Replace image ]

URL rejected by safety check:
> `That link isn't safe for a public room.`
> [ Why? ] (opens a small explanation panel)

Explanation panel for each reason — see MEDIA_FLOW_UX.md > Validation states.

## 18. Style panel intro

Top of the Look panel (or first time the owner opens it):

> `Shape how your room feels. Pick a mood to start, then tune anything you want.`

## 19. Font picker helper

Above the font pack thumbnails:

> `Pick a font that matches your room's voice. You can change it for individual headings later.`

Above the custom font selector:

> `Pick a specific font for headings or body. We use safe web fonts that load quickly.`

When a font is loading:

> `Loading "Inter Tight"…`

When a font fails to load:

> `Couldn't load that font. Try another, or [ keep the room default ].`

## 20. Palette picker helper

Above the swatch row:

> `These colours come from your mood. Click any swatch to try alternates, or [ make your own mood ].`

Custom hex input:

> `Pick a colour. We'll keep it readable against the rest of your room.`

When a custom colour fails contrast:

> `That colour might be hard to read. Want a [ similar one with better contrast ]?` (suggests an alternative)

## 21. Advanced controls warning

When the owner clicks `[ ··· ]` (Advanced) for the first time:

> `Advanced controls`
> `These are for fine-tuning. Most rooms don't need them. Your changes still save as a draft.`
> [ Got it, continue ]

When the owner enables Heavy motion:

> `Heavy motion is more intense. Visitors with reduced-motion settings will still see Gentle automatically.`
> [ Cancel ] [ Try heavy motion ]

## 22. Diagnostics / debug label

Only shown when `?staff=1` URL param is present:

> `Staff diagnostics`
> `Visible only to operators. Hidden from owners.`

Inside:
- `Renderer key`
- `Schema version`
- `Live version`
- `Draft version`
- `Last save · 2 minutes ago · by you`
- `[ Reload from server ]  [ Show raw room JSON ]`

## 23. Owner access gate

When the owner is logged in but not the room owner:

> `This room isn't currently in your account.`
> `If this is wrong, contact your Presence operator.`
> [ Back to your rooms ]

## 24. Non-owner denial

Anonymous visitor hitting the editor route:

> `Sign in to edit your room.`
> [ Sign in ] [ Back to live room ]

## 25. Session warming state

First-load spinner with copy:

> `Opening your editor…`

After 4 seconds with no response:

> `Just a moment — loading your room data.`

After 10 seconds:

> `This is taking longer than usual. [ Try again ]`

## 26. Try again state

Generic retry panel:

> `Something went wrong.`
> `Your draft is safe. Try again, or contact your Presence operator if this keeps happening.`
> [ Try again ]

If the error is specifically a session expiry:

> `Your session expired. Sign in again to keep editing — your draft is safe.`
> [ Sign in ]

---

## Tone notes for any future copy

- Speak to the owner directly: "you", "your room".
- Be confident, not apologetic. Avoid "Sorry, but…".
- Be specific. "Add alt text" not "There's a problem with accessibility".
- Avoid `please` (except after an error, where it softens).
- Never use exclamation marks in default state. Save them for genuine success ("Your room is open." — no `!`).
- Avoid jargon. If the user needs to know what an asset slot is, the UX is wrong.
- Avoid abbreviations: "Save as draft" over "Save draft" when there's room.
- Keep sentences under 14 words wherever possible.
