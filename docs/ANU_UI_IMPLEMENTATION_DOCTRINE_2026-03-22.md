# ANU UI Implementation Doctrine

Date: 2026-03-22
Status: Active implementation doctrine
Scope: `frontend-next`
Companion docs:
- `docs/ANU_UI_SOURCE_MAP_AND_COMPONENT_MIGRATION_2026-03-22.md`
- `docs/ANU_UI_EXECUTION_PLAN_2026-03-22.md`
- `docs/ANU_UI_DETAILED_EXECUTION_PLAYBOOK_2026-03-22.md`
- `docs/PLATFORM_USER_SATISFACTION_AUDIT_2026-03-20.md`
- `frontend-next/AUDIT_DELIVERABLES.md`

## 1. Purpose

This document turns the ANU UI reference-integration discussion into a production doctrine for the frontend.

It defines:
- the visual and interaction character the product must project
- how external references may be transformed into ANU production work
- what is allowed on public, operational, and subsystem surfaces
- concrete token, motion, material, and density rules
- hard bans
- definition of done for UI work that claims alignment with the ANU direction

This is not a generic design-system brief. It is a doctrine for a cultural-operating product that must remain operationally usable under real hosted conditions.

## 2. Non-Negotiable Outcome

ANU must become:
- unmistakably non-generic
- culturally warm before it is merely premium
- operationally clear before it is merely expressive
- spatial and authored on public surfaces
- restrained and semantically legible on operational surfaces

The system must avoid both failure modes:
- flattening into generic SaaS
- becoming visually striking while operationally weak

## 3. Decided Product Posture

The direction established in the multi-round brief is:
- public ANU should be bold, ceremonial, warm, and distinct
- the shell is the signature surface and should set the language for the rest of the product
- `C:\Dev\home-page-design` and `C:\Dev\home-page-playground` are first-class source material, not optional references
- `C:\Dev\tools` should be used aggressively as production source material, but transformed into ANU structure rather than copied raw
- `/universe` is not to be collapsed into the same doctrine blindly; it requires its own later pass
- community should feel like a signal-rich commons, not a flat feed
- internal messaging, notifications, to-do flows, and microcosms should become a distinct subsystem language within ANU
- operational surfaces should use minimal motion and stronger semantic clarity

## 4. Surface Classes

ANU UI work must be designed by surface class rather than by one undifferentiated style.

### A. Public shell surfaces

Examples:
- `src/ui-system/layout/Header.tsx`
- `src/ui-system/layout/Sidebar.tsx`
- `src/ui-system/layout/LayoutShell.tsx`
- `src/ui-system/layout/PathwayGuideBar.tsx`
- `src/app/(app)/home/page.tsx`
- `src/app/(app)/manara/page.tsx`

Required character:
- atmospheric
- ceremonial
- spacious
- visibly authored
- immediate orientation and pathway clarity

### B. Public browse surfaces

Examples:
- `src/app/(app)/community/page.tsx`
- `src/app/(app)/education/page.tsx`
- `src/app/(app)/impact/page.tsx`
- `src/app/(app)/transparency/page.tsx`
- `src/app/(app)/docs/*`

Required character:
- still distinct and expressive
- clearer information hierarchy than the shell
- meaningful filtering and task emergence
- motion only where it supports browsing comprehension

### C. Operational and trust interiors

Examples:
- `src/app/(app)/governance/*`
- `src/app/(app)/admin/*`
- `src/app/(app)/organizer/*`
- `src/app/(app)/memberships/page.tsx`
- `src/app/(app)/pools/*`
- `src/app/(app)/runs/*`

Required character:
- dense but legible
- semantically structured
- restrained motion
- stronger instrumentation and observatory logic
- no ornamental theatrics

### D. Private subsystem surfaces

Examples:
- `src/app/(app)/profile/page.tsx`
- future or existing notification, message, and to-do surfaces
- microcosm interiors and chamber-like team spaces

Required character:
- structurally clear
- more stylized than admin surfaces
- more intimate and chambered than the global shell
- capable of borrowing stronger internal-system references

### E. Universe track

Examples:
- `src/app/(app)/universe/page.tsx`
- `src/components/maps/FalakMapViewer.tsx`
- `src/components/maps/universe/*`

Rule:
- preserve current progress
- do not force shell/community doctrine onto it
- treat as separate design and implementation track

## 5. Source Transformation Rules

These rules govern how references are used.

### Rule 1: Source material is for transformation, not imitation

References are implementation seeds.

Allowed:
- importing a browsing mechanic, spatial idea, panel rhythm, material cue, or motion sequence
- rebuilding the information architecture around it
- changing the hierarchy, semantics, content logic, accessibility, and responsiveness to fit ANU

Not allowed:
- copy-pasting a page or component unchanged into production
- preserving decorative behavior that no longer carries meaning
- inheriting weak interaction or weak information structure because the reference looks good

### Rule 2: The default transformation mode is "keep both mood and interaction, rewrite structure"

When a reference is strong:
- keep the mood
- keep the interaction principle
- rewrite the layout and content architecture for ANU

When a reference is structurally weak:
- preserve the expressive side
- rebuild the structure around it

When a reference fights content:
- strip the interfering behavior
- retain only the useful compositional or material idea

### Rule 3: Public and operational surfaces have different permission models

Public surfaces may be:
- more atmospheric
- more cinematic
- more spacious
- more materially expressive

Operational surfaces must be:
- semantically stronger
- denser
- calmer
- more predictable

### Rule 4: No silent degradation

If a live dependency, data path, or interactive mode degrades, the UI must say so clearly.

Allowed:
- graceful fallback
- clearly named demo or read-only modes
- visible explanation of missing capability

Not allowed:
- a visually complete surface that is secretly degraded
- a fallback that pretends to be live
- a reference-derived interaction that obscures state or capability

## 6. Art Direction System

## 6.1 Typography

Required posture:
- ceremonial serif-led
- restrained sans support

Recommended production pairing:
- primary display serif: `Fraunces` or `Cormorant Garamond`
- supporting operational sans: `Manrope`, `Source Sans 3`, or `IBM Plex Sans`
- mono/data accent: keep existing mono data face where it already serves instrumentation surfaces

Rules:
- shell headings, section titles, and major statements use serif
- operational labels, filters, data rows, and controls use sans
- avoid defaulting to `Inter` for primary identity surfaces
- avoid overly technical type posture on public surfaces

## 6.2 Color and light

The palette must feel layered: commons below, heavens above.

Base color families:
- midnight and maritime blues for structural field
- mineral gold for authority, invitation, and ceremony
- deep purples and reds as celestial emanation accents
- muted stone, parchment, or clay tones for tactile grounding

Suggested token seed:

```css
:root {
  --anu-bg-deep: #08111d;
  --anu-bg-maritime: #12243a;
  --anu-bg-altar: #182b44;
  --anu-panel-mineral: rgba(16, 29, 47, 0.82);
  --anu-panel-glow: rgba(255, 255, 255, 0.07);
  --anu-panel-line: rgba(255, 255, 255, 0.12);
  --anu-text-primary: #f7f4ee;
  --anu-text-secondary: rgba(240, 236, 228, 0.8);
  --anu-text-muted: rgba(223, 217, 204, 0.6);
  --anu-gold: #e8c07a;
  --anu-gold-strong: #f1cc8d;
  --anu-sky-blue: #5f89bf;
  --anu-ember-red: #8e3d4f;
  --anu-heaven-purple: #5a477d;
  --anu-earth-clay: #8a7158;
  --anu-success: #6ea383;
  --anu-warning: #d7a65f;
  --anu-danger: #b96b69;
}
```

Rules:
- gold is not the background; it is a signal and ceremonial edge
- purple and red should emanate, not flood the canvas
- bright accents should appear at edges, glows, focal points, and callouts rather than blanket surfaces

## 6.3 Material language

Public shell material should combine:
- luminous parchment haze
- mineral glass
- dark atmospheric depth
- edge glow rather than full-fill brightness

Operational surfaces should use:
- darker matte panel bodies
- clearer borders
- less glow
- stronger row/card separation

Subsystem surfaces may use:
- chamber-like gradients
- stronger local contrast
- richer inner panel treatments

## 6.4 Shape language

Use:
- softened rectangles
- inset border layers
- occasional shield, chapel-window, or arch-derived motifs only where structurally justified
- rounded corners that feel crafted, not toy-like

Avoid:
- sterile perfect capsules everywhere
- excessive micro-rounding on every element
- novelty clipping without semantic purpose

### Shape defaults
- hero containers: `24px` to `32px`
- panels/cards: `18px` to `24px`
- chips and pills: `12px` to `18px`
- icon buttons: crafted rounds or softened squares, not default circles everywhere

## 6.5 Motion tiers

Motion must be tiered.

### Tier 1: Structural motion

Use on:
- page entry
- panel reveal
- drawer navigation
- shell transitions

Behavior:
- calm
- short
- ease-out
- no perpetual loops

### Tier 2: Browsing motion

Use on:
- gallery movement
- hover reveal
- selected-state reinforcement
- content grouping

Behavior:
- expressive but bounded
- no motion that competes with reading

### Tier 3: Hero atmospheric motion

Use on:
- landing hero
- selected public showcases
- lab concepts

Behavior:
- opt-in
- sparse
- never allowed to reduce control clarity

Operational surfaces are limited to Tier 1 and selected Tier 2.

## 6.6 Density rules

Density must split by surface.

Public shell:
- large margins
- clear focal zones
- sparse copy
- high visual hierarchy

Public browse:
- moderate density
- filtering and sorting close to content
- readable block separation

Operational interiors:
- denser panels
- compressed but legible spacing
- stronger grid discipline

Subsystem chambers:
- denser than shell, softer than admin

## 7. Component Doctrine

## 7.1 Header

Target file:
- `src/ui-system/layout/Header.tsx`

Must become:
- ceremonial anchor
- pathway indicator, not just utility bar
- visibly tied to shell atmosphere

Must contain:
- clear route identity
- restrained status utilities
- user entry and role presence
- room for subsystem doorways without clutter

Must not become:
- a crowded utility shelf
- a bell/avatar/control dumping ground

## 7.2 Sidebar and navigation

Target file:
- `src/ui-system/layout/Sidebar.tsx`

Must become:
- the primary ANU navigation signature
- chambered, pathway-aware, and spatial
- more authored than a normal dashboard rail

Rules:
- section labels should feel like named domains, not random link groups
- state emphasis should come from panel body, edge glow, and hierarchy, not only pill fills
- allow stronger microcosm and observatory subworld entry later

## 7.3 Buttons and chips

Targets:
- shell primitives throughout `src/ui-system` and `src/components`

Rules:
- buttons are not generic SaaS pills
- primary CTAs should feel ceremonial and consequential
- secondary actions should feel crafted, not weak
- chips must indicate state, category, or mode, not become decoration

## 7.4 Panels and cards

Rules:
- shell and public cards may use richer layered material
- operational cards should privilege scanability and row logic
- card headers need semantic hierarchy: eyebrow, title, support text, active state, action edge

## 7.5 Filters and controls

Rules:
- community and browse filters must feel tool-like, not form-like
- operational filters may be denser and more explicit
- never hide essential filtering behind novelty interactions

## 7.6 Notifications, messages, to-do, microcosms

Primary current and likely target surfaces:
- `src/app/(app)/profile/page.tsx`
- future message and notification modules using `api.messages`, `api.todos`, `api.notifications`

Rules:
- treat these as a distinct subsystem style
- use stronger chamber language and local system identity
- preserve high task clarity
- allow some internal-network reference language
- do not restyle them to match the shell so closely that task legibility drops

## 8. Surface Doctrine

## 8.1 Shell-first doctrine

The shell must be the most recognizable ANU surface after the next implementation pass.

That means:
- the shell sets material language
- the shell sets pathway naming rhythm
- the shell sets card and button tone
- the shell sets the rule that ANU is not generic software

## 8.2 Community doctrine

Community should become:
- a signal-rich commons
- filtered and explorable
- media-capable without becoming a media toy

It must not become:
- a bland feed
- an unstructured social wall
- a cinematic gallery with no semantic filtering

## 8.3 Education, Manara, Impact, Transparency

These are secondary public systems and should inherit shell doctrine while keeping stronger informational clarity.

Rules:
- public atmospheric framing remains
- content density increases relative to shell
- trust and clarity win over spectacle
- public explanation should remain minimal and layered

## 8.4 Admin, trust, observatory

These surfaces must feel:
- competent
- instrumented
- semantically rigorous

Not:
- ornamental
- theatrical
- over-animated

## 8.5 Universe

Universe remains separate.

Immediate rule:
- preserve current packet/viewer/scene investment
- do not restyle it opportunistically to match shell experiments
- schedule a separate universe doctrine once shell, subsystem, and community are stable

## 9. Hard Bans

The following are banned in the first production pass unless explicitly justified and reviewed:
- always-on ornamental motion
- novelty controls with no semantic value
- FX-heavy backgrounds that interfere with reading or action
- direct import of chaotic or general-experimental references into production
- filter bars that reduce discoverability in favor of visual cleverness
- pills everywhere as a substitute for hierarchy
- silent fallback and hidden degraded modes
- public shell typography that defaults to generic SaaS sans stacks

## 10. Accessibility and Production Standards

All reference-derived production work must meet these conditions:
- keyboard operability for all major flows
- visible focus states on all interactive controls
- reduced-motion fallback for non-essential motion
- clear contrast on body text and controls
- mobile-safe touch targets
- no information conveyed by motion alone
- no state conveyed by color alone

## 11. Definition of Done

A surface is aligned with this doctrine only if:
- it is visibly ANU and not generic SaaS
- it preserves operational clarity
- it uses transformed reference logic rather than copied reference structure
- motion is meaningful and bounded
- degraded states are explicit
- mobile behavior remains viable
- accessibility holds
- the result could be reused as a pattern for adjacent ANU surfaces

If a redesign is visually stronger but harder to navigate, harder to scan, or harder to trust, it is not done.
