# ANU Phase 1 — Color Styling Guide

Date: 2026-04-06
Scope: Visual brand consistency overhaul (Phase 1: color system only)
Reference image: `C:\Users\emadh\OneDrive\Pictures\Screenshots 1\Screenshot 2026-04-06 044808.png`

---

## 1) Brand Direction (from reference image)

The reference visual reads as:
- **Celestial + ceremonial** (orbital geometry, star maps)
- **Dark, premium atmosphere** (deep night canvas)
- **Metallic accents** (gold lines/details used as emphasis, not flood fill)
- **Fine-detail craft** (textured depth, layered linework)

Phase 1 direction: **Dark celestial luxe** with controlled contrast.

---

## 2) Canonical Palette (hard constraint)

Only these hex values are allowed:

- **Midnight Violet** `#1e0227`
- **Olive Bark** `#665700`
- **Almond Silk** `#f6d4cb`
- **Metallic Gold** `#e0b115`
- **Clay Soil** `#7c413c`

### Non-negotiables
1. No additional hex colors.
2. Tints/shades must be done via **alpha overlays** of the five allowed colors (e.g. `rgba(246,212,203,0.08)`).
3. Gold is an **accent/ornament**, not a default body-text color.

---

## 3) Semantic Color Roles

### Core roles
- **Background / stage**: `#1e0227` (Midnight Violet)
- **Primary text on dark**: `#f6d4cb` (Almond Silk)
- **Primary accent / CTA**: `#e0b115` (Metallic Gold)
- **Secondary structure / borders**: `#7c413c` (Clay Soil)
- **Muted UI support**: `#665700` (Olive Bark)

### Contrast-safe pairings (recommended)
- `#f6d4cb` text on `#1e0227` (AAA)
- `#e0b115` text/icon on `#1e0227` (AAA)
- `#1e0227` text on `#f6d4cb` (AAA)
- `#f6d4cb` text on `#7c413c` (AA)

### Pairings to avoid for body text
- `#e0b115` on `#f6d4cb`
- `#665700` on `#1e0227`
- `#7c413c` on `#1e0227`

---

## 4) UI Token Contract (Phase 1)

Use these semantic assignments in theme variables:

```css
:root[data-theme='anu-phase1-dark'] {
  --color-background: #1e0227;
  --color-foreground: #f6d4cb;

  --color-card: rgba(124, 65, 60, 0.22);      /* Clay Soil overlay */
  --color-card-foreground: #f6d4cb;

  --color-primary: #e0b115;                   /* CTA / key action */
  --color-primary-foreground: #1e0227;

  --color-secondary: #7c413c;
  --color-secondary-foreground: #f6d4cb;

  --color-muted: rgba(102, 87, 0, 0.20);      /* Olive Bark overlay */
  --color-muted-foreground: rgba(246, 212, 203, 0.78);

  --color-border: rgba(224, 177, 21, 0.35);   /* Gold linework */
  --color-input: rgba(124, 65, 60, 0.35);
  --color-ring: #e0b115;
}
```

---

## 5) Component Styling Rules

### A) App shell / page background
- Base: `#1e0227`
- Add subtle layered texture via alpha overlays of Gold + Clay (very low opacity)
- Keep highest visual weight at top hero and section anchors

### B) Cards / panels
- Background: Clay overlay (`rgba(124,65,60,0.18–0.28)`)
- Border: Gold stroke (`rgba(224,177,21,0.24–0.40)`)
- Heading: Almond Silk
- Metadata: Almond Silk at 65–78% opacity

### C) Buttons
- Primary: Gold fill + Midnight Violet label
- Secondary: transparent with Gold border + Almond label
- Quiet: Clay overlay + Almond label
- Hover: brighten border/shine (not hue shift)

### D) Inputs / forms
- Input bg: Clay overlay
- Text: Almond Silk
- Placeholder: Almond Silk @ ~55%
- Focus ring: Metallic Gold with clear 2px emphasis

### E) Status communication (within 5-color constraint)
- Positive/success: Olive Bark + Almond label
- Warning/attention: Metallic Gold + Midnight label
- Critical/high severity: Clay Soil + Almond label

---

## 6) Ornament & Depth Language

Inspired by the reference image, use:
- thin orbital lines (Gold @ low opacity)
- radial glows behind hero marks (Gold alpha only)
- starfield micro-speckles (Gold alpha only)
- soft cloud-like masks in corners (Clay + Violet overlays)

Avoid:
- flat full-screen gold backgrounds
- heavy gradients that reduce text legibility
- introducing blues/teals/greys outside the allowed palette

---

## 7) Typography & Color Interaction

- Body text default: Almond Silk on Midnight Violet
- Large display headings: Almond Silk or Gold (only when contrast is strong)
- Numeric/stat chips: use tabular numerics + Almond text for readability
- Keep Gold for headings, icons, active states, and separators

---

## 8) Implementation Map (current codebase)

Primary files to update first:
- `frontend-next/src/ui-system/tokens.ts`
- `frontend-next/src/ui-system/theme.ts`
- `frontend-next/src/app/globals.css` (or equivalent root theme declarations)

Then propagate to high-frequency surfaces:
- auth + landing shell
- app shell nav/header/footer
- actions/events/feed cards
- form controls and focus states

---

## 9) Phase 1 Completion Criteria

1. Every semantic token maps to one of the five approved colors (or alpha derivative).
2. No legacy hex values remain in core shell/components.
3. Body text contrast is readable in all major flows.
4. CTA hierarchy is obvious at first glance.
5. Dark celestial brand feel is consistent across auth + shell + feed.

---

## 10) Multichoice Audit Results (Rounds 1–5)

### Round 1 — Focus areas
Selected: Color hierarchy, readability, visual consistency, depth/atmosphere, interaction clarity.

### Round 2 — Brand direction
Selected: **Dark celestial luxe**.

### Round 3 — Rollout priorities
Selected: Landing/auth, core shell, actions/events/feed, forms/input states, cards/tables/charts.

### Round 4 — Contrast profile
Selected: **Atmosphere-first contrast**.

### Round 5 — Interaction tone
Selected: **Crisp + restrained**.

### Design implication
Use a dark cinematic base with disciplined interactions and readable primary content, while preserving ceremonial mood through linework, glow, and accent placement.

---

## 11) Implementation Status Snapshot (Phase 1B)

Updated in this pass (priority rollout):
- `frontend-next/src/ui-system/layout/Header.tsx`
- `frontend-next/src/ui-system/layout/Sidebar.tsx`
- `frontend-next/src/ui-system/layout/MobileDock.tsx`
- `frontend-next/src/ui-system/layout/LayoutShell.tsx`
- `frontend-next/src/app/auth/page.tsx`
- `frontend-next/src/app/(app)/actions/page.tsx`
- `frontend-next/src/app/(app)/events/page.tsx`
- `frontend-next/src/app/(app)/community/page.tsx`
- `frontend-next/src/app/sections/HeroSection.tsx`
- `frontend-next/src/app/sections/CommunitySection.tsx`
- `frontend-next/src/app/sections/DashboardSection.tsx`
- `frontend-next/src/app/(app)/actions/ActionsFloating.module.css`
- `frontend-next/src/app/(app)/events/EventsFloating.module.css`
- `frontend-next/src/app/(app)/calendar/CalendarFloating.module.css`
- `frontend-next/src/components/landing/ScrollSnapLanding.module.css`
- `frontend-next/src/app/(public)/transparency/page.tsx`
- `frontend-next/src/app/(public)/docs/page.tsx`
- `frontend-next/src/app/(app)/governance/model-registry/page.tsx`

Status:
- Hardcoded legacy hex/rgb literals in the listed files were remapped to the approved 5-color palette or alpha derivatives.
- In core shell/layout/auth/community/actions/events and selected public/governance pages, legacy Tailwind utility shortcuts were normalized to palette-safe arbitrary values and CSS variables.
- Background gradients, shadow tones, and state accents were normalized to the palette language.

### Phase 1C execution result (current)
- Expanded enforcement pass across user-facing UI surfaces in:
  - `frontend-next/src/app/**`
  - `frontend-next/src/components/**`
  - `frontend-next/src/ui-system/**`
  - `frontend-next/src/ui/patterns/**` (excluding `ui/patterns/education-templates/tools/**`)
- Enforcement scope rule (selected): **UI surfaces only**; intentional color-data/tool assets were excluded.
- Validation: `npm run -s typecheck` passed after Phase 1C.
- Literal color audit result:
  - **0** non-compliant hex/rgb literals in the Phase 1C UI-surface scope.
  - Repository-wide (`frontend-next/src`) moved from **4818 → 3664** non-compliant literals.
  - The largest remaining block is still `ui/patterns/education-templates/tools/pixel-studio/palettes.ts` (**3591** literals, intentional dataset).
  - Excluding `pixel-studio/palettes.ts`, only **73** literals remain, concentrated in tools/test/data/sdk files.

Follow-up (post-Phase 1C):
- Keep strict 5-color enforcement on UI surfaces.
- Treat color datasets and internal tooling palettes as explicitly out-of-scope unless a future requirement changes that decision.
