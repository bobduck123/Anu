# UX Diagnosis — Why the editor still feels unpleasant

Date: 2026-05-24
Reviewer: Claude (UX architect mode)
Object: Presence Studio editor after Canvas Builder v2 hosted-lifecycle smoke clear.

The lifecycle works. Auth, draft, save, preview, publish, RoomKey,
cleanup — all green. But the editor still reads as a technical
admin surface. This document names the eleven reasons why.

## D1. The editor opens with metadata, not the room

The header surfaces `Renderer: ggm-faithful-room-v1` / `Draft: v1` /
`Published: missing` / `Last saved: 23 May 2026, 21:32` BEFORE the
artwork loads. The first thing the owner reads is database state.
Premium tools (Figma, Procreate, Squarespace, Cargo) lead with the
canvas; system state is folded into a single, unobtrusive line.

**Fix:** the room is the masthead. Metadata becomes a single quiet
status strip at the bottom.

## D2. Twelve tabs telegraph "this is complicated"

Canvas / Overview / Scenes / Work Wall / Practice / Calling Card /
Style DNA / Motion / Texture / RoomKey / Assets / Preview / History.
Even when Canvas is the default, the tab row is visible. The owner
reads "twelve places I have to go" and arrives anxious.

**Fix:** five top modes — Build · Look · Images · Preview · Advanced
— with everything else folded under Advanced.

## D3. The Canvas is a launcher, not a builder

Today's "Edit work wall / Edit studio / Edit calling card" jump
buttons live INSIDE the canvas. They take the owner OUT of the
canvas into the deep CRM. So the canvas reads as a preview-with-
shortcuts.

**Fix:** every visible thing is editable in place. Jump-buttons go
away. Right inspector swaps content per selection. Deep CRM
becomes "Advanced", reachable from a single overflow.

## D4. Three states and three actions in one header row

Header row currently holds: Save Draft button, Preview panel button,
Full preview link, Open room button, Public Room link, Unsaved
chip, Readiness 47% chip, Desktop/Mobile toggle.

Eight elements competing for one row. The owner can't tell which
action is primary.

**Fix:** one bar, three states (Live status / Save state / Readiness),
one primary action (Open room when ready, Preview otherwise).

## D5. Draft and Live are described in version numbers

`Live version: v1` / `Draft version: v2` is database language. The
owner doesn't know what `v1` means. They know what "what visitors
see right now" means.

**Fix:** timestamps + plain language. "Visitors see: opened 3 days
ago." / "Your draft: saved 2 minutes ago." Versions move to Advanced.

## D6. Readiness reads as a SEO score

A coloured ring + a percentage + three count pills (Critical 2 /
Recommended 2 / Polish 1) is the language of Yoast / Lighthouse,
not of a calm cultural product. First-time owners see "47%" before
they've done anything and feel they have failed.

**Fix:** readiness becomes inline chips next to the affected
element ("Add a cover image"), not a header gauge. The percentage
moves to Advanced.

## D7. Editor chrome contrasts with the room

The editor is dark-mode designer-app aesthetic (#0d0e10 + amber
accents). The published room is paper-warm + ink type. Switching
between editor and preview is cognitive whiplash.

**Fix:** editor chrome matches the room aesthetic. Paper canvas
frame, ink inspector, soft amber selection. No dark designer-tool
mode unless the owner has chosen Ink Room.

## D8. Asset attach is a form, not a media flow

The Assets tab is: slot dropdown ▾ + URL field + alt text field +
Attach button. This is a database row editor. Owners think in
"change the cover image", not in "attach to slot
attached_assets".

**Fix:** Images mode opens a media drawer. Three columns: your
images / live-room canonicals / upload. Each image card is its own
target. No slot dropdowns.

## D9. No clear next action

The header shows Save Draft as the first action. But there's
nothing to save yet. Then Preview. Then Open room. The owner has
to read all of them to know what to do.

**Fix:** the primary action button is contextual. On first session
it says "Start with your title". After first edit, "Save your
changes". After save, "Preview your draft". When ready, "Open room
to visitors". One button at a time, never three.

## D10. Style controls don't feel rewarding

The Style DNA tab is hex inputs + font-family dropdowns + disabled
"coming soon" rows. Choosing a mood feels like editing a JSON file.
Owners want a feeling, not a hex code.

**Fix:** Look mode opens with mood thumbnails first. The owner
clicks a thumbnail and the canvas changes. Hex pickers and font
stacks move under "Make your own mood" / "Pick a specific font".

## D11. Language exposes the schema

Visible strings include: `config`, `editable_config`, `Locked
fields`, `Renderer`, `Schema version`, `payload`, `Mutate`,
`Production version`. Each one tells the owner they are looking at
the wrong layer of the product.

**Fix:** complete vocabulary replacement. The COPY_PACK.md file
in this evidence pack rewrites the 26 most-visible strings.

## D12 (bonus). Preview is full of chrome

The full-screen preview surface has a "Draft preview not public"
chip top-left, a Back-to-editor button + Desktop/Mobile toggle +
"Open room to visitors" top-right. Five elements layered over the
artwork. The artwork has to compete with three rows of editor
chrome.

**Fix:** one chip at top-centre ("Visitors will see this once you
open the room"). One pill at bottom-centre ("Editor · Desktop /
Mobile · Open room"). The artwork breathes.

## What the diagnosis adds up to

The editor today works. It is honest. It is safe. It is technically
correct. But it reads as a backend with a preview tab.

UX V1.5 is not a feature pass. It is a confidence + calmness pass.
The fixes above are mechanical — they don't require new
infrastructure beyond what Canvas Builder v2 already shipped. They
require copy, hierarchy, IA, and the discipline to hide what the
owner shouldn't have to see.
