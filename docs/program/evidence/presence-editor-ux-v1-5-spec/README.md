# Presence Studio Editor UX V1.5 — Specification Pack

Date: 2026-05-24
Status: **specification complete; Codex implementation pending.**

## What this pack is

A complete UX specification for raising the Presence Studio editor
from a working-but-clunky operator tool into a calm, beautiful,
owner-trustable editor suitable for operator-led pilots and
eventually self-serve.

This pack does **not** code. It instructs Codex precisely.

## Documents in this pack (read in order)

1. **`UX_DIAGNOSIS.md`** — the 11 reasons the editor still feels
   unpleasant despite the cleared hosted lifecycle.
2. **`INFORMATION_ARCHITECTURE.md`** — the 5-mode editor shell,
   top bar / status strip / scene rail / inspector / mode strip /
   advanced drawer layout.
3. **`DRAFT_LIVE_CONFIDENCE.md`** — the two-world (amber draft /
   green live) colour grammar, status copy, publish dialog,
   success / failure / discard / restore language.
4. **`OWNER_JOURNEY.md`** — the 8-beat journey (Start → Shape
   content → Shape look → Add media → Check readiness → Preview →
   Open to visitors → Return later) with per-beat copy, feedback,
   errors, owner-vs-operator capabilities.
5. **`MEDIA_FLOW_UX.md`** — the media drawer, source tabs,
   per-image detail, focal point, alt text, validator copy.
6. **`CUSTOMISATION_UX.md`** — the 8 customisation categories,
   quick vs custom surfaces, performance guardrails.
7. **`VISUAL_DESIGN_DIRECTION.md`** — the paper editor chrome,
   spacing, typography, button hierarchy, canvas frame, status
   strips, motion guidelines.
8. **`COPY_PACK.md`** — exact strings for 26 owner-visible
   surfaces + vocabulary table (banned words ↔ replacements).
9. **`HIDE_SHOW_STAFF_GATE.md`** — visibility classification for
   every current editor surface.
10. **`PILOT_TEST_SCRIPT.md`** — operator-led pilot test for the
    next GGM sandbox session.
11. **`CODEX_HANDOFF.md`** — exact Codex implementation prompt
    (P0 + P1 + P2 + new files + revisions + tests + evidence +
    safety rules).
12. **This `README.md`.**

## Core principle (recap)

> **Presence Studio guides the owner through shaping a live-ready
> room. It never exposes the machinery of the room.**

## What this specification enables

- An operator-led GGM sandbox pilot where the owner edits without
  needing the operator to drive.
- A real friendly pilot with one trusted artist.
- A pathway to paid pilots once P1 polish and remaining V2 widget
  wiring lands.
- A self-consistent design vocabulary so future passes don't drift.

## What this specification deliberately does NOT include

- Widget marketplace / community packs (V2+).
- Custom CSS for owners (V2+).
- Freeform drag-anywhere layout (V2+).
- AI-assisted writing / auto-alt-text (later).
- Real-time co-editing (out of roadmap).
- Public self-serve onboarding (well past V1.5).

## How Codex consumes this

The Codex prompt in `CODEX_HANDOFF.md` references each spec file
explicitly. Codex copies COPY_PACK strings verbatim, applies
HIDE_SHOW classifications mechanically, and builds the new
components per the IA + visual direction. No design decisions are
left to Codex.

## Pilot launch implications

UX V1.5 does NOT add features beyond what the V2 foundation already
exposes. It re-presents what's there.

After UX V1.5 ships:
- **Internal demo readiness**: 9 / 10. The editor demos as
  professional, calm, credible.
- **Operator-led pilot readiness**: 7.5 / 10. Owner can complete
  10 task pilot script with ≤ 2 operator interventions.
- **Friendly self-serve pilot readiness**: 5 / 10. Still requires
  the operator on call but the owner drives.
- **Paid pilot readiness**: still 3 / 10 — V2 widget wiring +
  upload + undo are the gates.
- **Public self-serve readiness**: still 1 / 10.

## What to build first

Codex implements P0 first. P0 is the minimum to ship V1.5:

- Simplified 5-mode shell.
- New top bar + status strip.
- Look panel (mood / fonts / colours / motion).
- Inline readiness chips.
- New publish flow.
- Media drawer.
- Visual polish (paper chrome).
- Copy replacement (COPY_PACK).
- Hide / show / staff gate applied.
- Session warming + auth state copy.

P1 follows in a polish pass. P2 is deferred.

## Final standard

The editor passes V1.5 when, in a recorded 45-minute pilot session
with a non-technical owner and a single operator, the owner:

1. Edits text + image + mood without operator help.
2. Understands at all times what visitors see vs. what they're
   editing.
3. Confidently presses "Open room to visitors" without anxiety.
4. Says yes to "would you trust this with a real launch?"

Until those four are true, V1.5 has not landed.
