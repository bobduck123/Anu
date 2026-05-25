# Pilot Test Script — Operator-led GGM Sandbox, UX V1.5

Audience: a real owner-style user (Christina, or a stand-in artist
with similar tech comfort) and the Presence operator (Emad / team
member).

Duration: 45 minutes. Recorded with consent. Observer notes for
each task.

The script tests:
- whether the editor feels less intimidating,
- whether media flow is understandable,
- whether draft/live is understood,
- whether publish confidence improves,
- whether customisation feels meaningful,
- where the operator still has to intervene.

## Setup (5 min)

1. Operator opens `/studio/[id]/editor?pilot=1` on a clean device
   (not the owner's). Owner is signed in.
2. Operator: "I'm going to ask you to do a few small tasks. Talk
   me through what you're seeing. If you don't know what to do,
   tell me — your confusion is the most useful thing here. Don't
   try to be polite."
3. Hand the laptop / tablet to the owner. Operator notes the
   owner's first 30 seconds — where their eyes go, what they read
   first, when they reach for the trackpad.

**Score on these questions (operator's notes):**
- Did the owner immediately understand they were looking at their
  room? Y/N
- Did the owner read any technical-looking text in the first 30s? Y/N
- Did the owner feel the need to ask "what is this?" Y/N

## Task 1 — Change the room title (target: 1 min)

> "Could you change the name showing on your room to something else
> — anything. Maybe add a middle name. Try without my help first."

**Pass criteria:**
- Owner finds the title without asking.
- Owner clicks it.
- Editing happens in place, not in a modal.
- Owner sees "Saved to draft ✓" feedback.
- Owner does NOT think they have made the change live.

**Operator notes:**
- Time to first click on the title: ___s
- Did they understand the change was a draft? Y/N
- Did they look for a "save" button before / after? Y/N

## Task 2 — Change a work's caption (target: 1.5 min)

> "Pick any of your works and change its description. Don't worry
> about getting the words right."

**Pass criteria:**
- Owner finds the wall scene (scene 02) via the scene rail.
- Owner clicks a work tile.
- Inspector populates with the work's edit fields.
- Owner edits and sees saved feedback.

**Operator notes:**
- Time to find the wall scene: ___s
- Did they understand the scene rail concept? Y/N
- Did they look for a tab labelled "Works"? Y/N

## Task 3 — Change a cover image (target: 3 min)

> "Could you change the main image people see when they land on
> your room?"

**Pass criteria:**
- Owner clicks the cover image directly on the canvas.
- Media drawer opens.
- Owner finds the "Live room" tab and picks a different artwork.
- Owner sees the canvas update.
- Owner does NOT need help with a URL or upload.

**Operator notes:**
- Time to find the cover affordance: ___s
- Did they try to drag a file in? Y/N (note: drag-drop isn't built;
  fall through to "click Replace" gracefully)
- Did they understand "Live room images" vs "Your room images"? Y/N

**Operator intervention OK:** if they don't intuit the canonical
sync, operator can hint "those are images your room is already
showing visitors — bring them into your draft to be able to swap
them around".

## Task 4 — Change the mood (target: 1.5 min)

> "Try a different feel for the whole room. There are some moods
> you can pick from."

**Pass criteria:**
- Owner finds Look mode via the mode strip.
- Owner sees the 3 mood thumbnails.
- Owner clicks one, sees canvas change immediately.
- Owner tries another to compare.
- Owner picks the one they prefer or returns to original.

**Operator notes:**
- Time to find Look mode: ___s
- Did they enjoy the comparison? Y/N
- Did they ask "can I keep some of the changes?" Y/N

## Task 5 — Pick a font (target: 2 min)

> "Could you change the look of the type / fonts in your room?"

**Pass criteria:**
- Owner finds the Fonts section inside Look mode.
- Owner sees pack thumbnails with sample text.
- Owner picks one, sees canvas update.
- Owner does NOT see CSS font-family strings.

**Operator notes:**
- Time to find Fonts: ___s
- Did they understand "Editorial Gallery" / "Soft Studio" etc.? Y/N
- Did they want to pick a specific font (would have required "More
  fonts" expansion)? Y/N

## Task 6 — Read the readiness chips (target: 1 min)

> "Is there anything else your room is missing?"

**Pass criteria:**
- Owner notices the inline chips on the canvas.
- Owner clicks a chip and is taken to the fix.
- Owner does NOT see a percentage gauge.
- Owner does NOT feel scolded.

**Operator notes:**
- Did they notice chips without prompting? Y/N
- Did they understand each chip's request? Y/N
- Did they feel anxious about an unresolved chip? Y/N

## Task 7 — Preview the draft (target: 1 min)

> "Could you see what visitors will see if you opened the room
> right now?"

**Pass criteria:**
- Owner clicks Preview mode.
- Owner sees their room in full-screen with the amber chip.
- Owner understands this is a private preview.
- Owner returns to Build with Esc or the back arrow.

**Operator notes:**
- Did they ask "is this live yet?" Y/N
- Did they trust that visitors couldn't see it? Y/N
- Did they find their way back? Y/N

## Task 8 — Open the room to visitors (target: 2 min)

> "Now open your room to visitors with your changes."

**Pass criteria:**
- Owner clicks the primary action (`Open room to visitors`).
- Owner reads the confirmation dialog.
- Owner confirms.
- Owner sees the success toast.
- Owner views the live room and sees their changes.

**Operator notes:**
- Did they hesitate before confirming? (good — means they understood
  the consequence)
- Did they understand "the current live room will be kept as an
  earlier version"? Y/N
- Did they want to undo immediately? Y/N

## Task 9 — Discard a change (operator-led, target: 2 min)

> "Imagine you made a change you didn't like. Could you undo it?"

**Pass criteria:**
- Owner looks for an undo / discard option.
- Owner finds Advanced > Discard my draft changes OR
- Owner asks the operator (which surfaces the gap if undo is hard
  to find).

**Operator notes:**
- Did they look for Cmd-Z? Y/N (we don't have session undo in V1.5
  P0; logged as P1 feedback)
- Did they find Advanced > Discard? Y/N

## Task 10 — Return tomorrow (simulated, target: 1 min)

> "Close the tab. Open it again. Pretend a day has passed. What do
> you see, and what would you do next?"

**Pass criteria:**
- Owner sees the calm "caught up" state.
- Owner understands their room is live.
- Owner knows how to make a new change.

**Operator notes:**
- Did they trust the live-room status? Y/N
- Did they feel they had done good work? Y/N
- Did they want to come back? Y/N

## Post-session (10 min)

Open conversation with the owner:

1. "What confused you the most?"
2. "What felt good?"
3. "Were there moments you wanted to do something but couldn't
   find how?"
4. "Did this feel like editing your room, or editing a settings
   panel?"
5. "Would you trust this with a real launch?"

Operator logs:
- Three biggest pain points (with timestamps from the recording).
- Three biggest delights.
- Any unexpected behaviour from the editor.
- One sentence: would you let this owner edit unsupervised?

## Scoring rubric

| Dimension | Pass | Borderline | Fail |
|---|---|---|---|
| First impression | Owner immediately understood they were looking at their room | Took 10-30s to orient | Asked "what is this?" |
| Direct editability | Owner edited text + image + mood without help | Needed one hint from operator | Could not edit without operator driving |
| Draft / live confidence | Owner confidently knew current state at every step | Asked once or twice | Repeatedly confused |
| Publish confidence | Owner confirmed publish without anxiety | Hesitated but proceeded | Refused to confirm without operator |
| Customisation joy | Owner enjoyed trying moods + fonts | Tried but didn't care | Did not engage |
| Media flow | Owner swapped a cover image without URL paste | Needed one hint about Live room tab | Could not change image without operator |
| Pilot pass / fail | ≤ 1 operator intervention | 2-3 interventions | 4+ interventions |

**Threshold for declaring UX V1.5 successful:**
- 8 of 10 tasks pass on a single non-technical owner.
- ≤ 2 operator interventions across the full session.
- Owner answers "yes" to "Would you trust this with a real
  launch?" with no qualifying caveats.

## What this script does NOT test

- Mobile editing (separate session on phone).
- Multi-owner / team editing (out of scope).
- Long-form content authoring (a sustained 30-min editing session).
- Accessibility (screen reader, keyboard-only) — separate test.
- Performance under poor network (separate test).

These are separate test scripts to add after V1.5 ships.
