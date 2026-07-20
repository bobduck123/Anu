# Draft / Live Confidence System

## The promise

At every moment, an owner inside the editor can answer four questions
without scanning the screen:

1. **What am I editing?** (the canvas surface answers this)
2. **What do visitors see right now?** (the status strip)
3. **Are my changes saved?** (the save state in the top bar)
4. **When will my changes go public?** (the primary action's label)

If any of those is ambiguous, the system has failed.

## Two-world colour grammar

Two soft tones, used everywhere.

- **Amber / paper-warm** — the *draft world*. Your unsaved + saved-
  not-yet-published shaping space.
- **Green / paper-cool** — the *live world*. What visitors see.

Status pills, frame edges, button accents, and inline reminders all
use this grammar. Never red for either — red is reserved for error
states.

| Surface | Tone | Why |
|---|---|---|
| Editor canvas dashed selection outline | Amber | Selected element is in the draft world |
| Status strip — draft side | Amber | "You have unsaved changes" |
| Status strip — live side | Green muted | "Visitors see: opened 2 days ago" |
| Top-right primary action — when there are changes to publish | Green-filled | "Open room to visitors" |
| Top-right primary action — when nothing has changed | Ghost (no fill) | "Open room is up to date" |
| Preview surface | Amber 1-px corner ticks + tiny chip top-centre | "Visitors will see this once you open the room" |
| Public route | No chip | The world IS live |
| Success toast after publish | Green soft | "Your room is open. Visitors now see your changes." |

## State diagram

```
       [ no draft ]                        [ draft saved ]
       (first session)                     (changes ready)
              │                                   │
       owner opens editor                  owner clicks
              │                            Open room
              ▼                                   ▼
      ╔════════════╗  edit            ╔════════════╗
      ║  CANVAS    ║─────────────────▶║   LIVE     ║
      ║  (draft)   ║◀─────────────────║  (public)  ║
      ╚════════════╝   restore        ╚════════════╝
              │                                   │
        Preview your                       Visitors see
        draft (auth                        the current
        only)                              published config
```

## States in plain language

The editor's status strip carries exactly one line, chosen by the
state below.

| State | Status strip copy | Primary action label |
|---|---|---|
| No published config yet, no draft | "Not yet opened to visitors. Start with your title above." | `Save & preview` |
| Draft saved, no live | "Draft saved. Not yet opened to visitors." | `Open room to visitors` |
| Live published, no draft changes | "Visitors see: opened 2 days ago. All caught up." | `Update room` (disabled) |
| Live published, draft changes saved | "Visitors see: opened 2 days ago. You have 4 saved changes ready to open." | `Open room to visitors` |
| Live published, draft changes unsaved | "Visitors see: opened 2 days ago. You have unsaved changes." | `Save your changes` |
| Publishing in flight | "Opening your room to visitors…" | (disabled, spinner) |
| Publish failed | "Your room could not be opened. Try again or contact support." | `Try again` |
| Session expired | "Sign in again to keep editing." | `Sign in` |

## Preview surface — what carries the draft world signal

When the owner enters Preview, the surface they see is rendered through
the same resolver visitors will use after publish. To make sure they
know it isn't live yet:

- A small amber pill at the **top-centre**: `Draft preview · only you can see this`.
- 1-px amber tick marks in the **four corners** of the visible
  viewport — like a film registration mark. Visible but not loud.
- Bottom-centre pill that opens the publish dialog: `Open room to visitors →`.

That's it. No "Back to editor" button on the preview surface itself
— `Esc` returns to Build; or the top-left back-arrow.

## Publish confirmation dialog

The current dialog is too information-dense (3 metrics + warning
block + 2 buttons). Replace with:

```
┌─────────────────────────────────────────────────────────────┐
│  Open your room to visitors?                                │
│                                                             │
│  Visitors will see your saved draft. You can always edit    │
│  and open again later. The current live room (opened 2      │
│  days ago) will be archived.                                │
│                                                             │
│         [ Not yet ]              [ Open room to visitors ]  │
└─────────────────────────────────────────────────────────────┘
```

No version numbers in the dialog. The Advanced drawer's Versions
section is where v1/v2 live for staff/operators.

If readiness has critical items:

```
┌─────────────────────────────────────────────────────────────┐
│  A few things need attention                                │
│                                                             │
│  Before you open your room to visitors:                     │
│  ✱ Add a cover image                                        │
│  ✱ Write your statement                                     │
│                                                             │
│  [ Show me where ]            [ Open anyway ]               │
└─────────────────────────────────────────────────────────────┘
```

The `Open anyway` button only appears if no item is a hard blocker
(unsafe asset, broken auth, etc.). For hard blockers it disappears.

## After-publish success

A calm green toast at the top-centre of the editor (3 seconds, then
auto-dismisses, dismissable):

```
✓ Your room is open. Visitors now see your changes.
[ View live room ↗ ]
```

Then the status strip updates to "Visitors see: opened just now. All
caught up."

## Public-unchanged reminder

When the owner has unsaved changes and starts navigating away from
the editor (tab close, route change), one-time confirm:

```
Leave the editor?

Your latest changes will be saved as a draft. Visitors will keep
seeing the current live room until you open the room to visitors.

[ Stay editing ]                      [ Save & leave ]
```

## Cleanup / restore language

Owners may want to discard changes. UX V1.5 surfaces this only in
the Advanced drawer, never as a primary action:

- `Discard my draft changes` — restores the canvas to the current
  live room. Confirm: "Discard your unsaved + saved-but-not-opened
  changes? Your live room won't change."
- `Restore an earlier version` — opens the version picker. Each
  entry shows timestamp + a one-line summary ("Updated calling
  card · 3 days ago"). Selecting one previews it in the canvas;
  applying creates a new draft, not a publish.

Owners never see "rollback". Operators see it in the Staff section.

## Why amber not red for unsaved

Amber says "you're shaping something". Red says "you've broken
something". The owner has done nothing wrong by having unsaved
changes — they're in the middle of editing. Reserve red for asset
validator errors, auth failures, and the "publish failed" state.

## Acceptance criteria

The Draft / Live confidence system passes when, in a one-take
five-minute usability test, a non-technical owner can:

1. Tell you what visitors see right now.
2. Tell you what they have changed since visitors last saw the room.
3. Tell you what will happen when they press the primary action.
4. Press the primary action without anxiety.

Until they can do all four without thinking, V1.5 hasn't landed.
