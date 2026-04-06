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

---

## 12) Phase 4 UX sweep — Batch A (Pools + Auth Gate consistency)

Date: 2026-04-06
Lens: Usability-first + visual consistency on core trust/impact routes.

Updated files:
- `frontend-next/src/app/(app)/pools/page.tsx`
- `frontend-next/src/app/(app)/pools/[poolId]/page.tsx`
- `frontend-next/src/components/impact/PoolCards.tsx`
- `frontend-next/src/components/auth/AuthGateCard.tsx`

Changes delivered:
- Upgraded pools overview header/actions to ANU route language (bridge links to impact/transparency/memberships).
- Removed legacy low-contrast `--color-earth-*` text usage from pools cards/summaries and aligned to foreground + approved alpha text tones.
- Harmonized inflow/net-positive emphasis to institutional accent for clearer dark-surface contrast.
- Updated pool-detail auth-gate and ledger UI typography/tone to ANU display + readable foreground hierarchy.
- Kept fallback/degraded-state messaging explicit and actionable.

Validation:
- Browser verification on:
  - `/pools`
  - `/pools/1`
- Explicit assertions executed for key headings/CTA text visibility and route correctness.
- `npm run -s lint` passed on touched files.
- `npm run -s typecheck` passed.

## 13) Phase 4 UX sweep — Batch B (Wallet + ledger auth-gate clarity)

Date: 2026-04-06
Lens: Usability-first + continuity messaging on private financial routes.

Updated files:
- `frontend-next/src/app/(app)/wallet/page.tsx`
- `frontend-next/src/app/(app)/wallet/ledger/page.tsx`
- `frontend-next/src/components/auth/AuthGateCard.tsx`

Changes delivered:
- Standardized wallet and wallet-ledger signed-out states to ANU foreground hierarchy for readability on dark shell.
- Added clear continuity actions from wallet surface (`Open wallet ledger`, `Open marketplace`) for faster next-step orientation.
- Improved degraded wallet messaging with explicit “working now” guidance while preserving route continuity.
- Normalized positive/negative transaction color semantics to approved palette emphasis (`institutional` / `accent`).
- Refactored wallet loading/data handling to avoid sync `setState` inside effect branch (lint hygiene improvement).

Validation:
- Browser verification on:
  - `/wallet`
  - `/wallet/ledger`
- Explicit assertions executed for auth-gate headings and CTA labels.
- `npm run -s lint` passed on touched files.
- `npm run -s typecheck` passed.

## 14) Phase 4 UX sweep — Batch C (Profile + Marketplace + Transparency continuity)

Date: 2026-04-06
Lens: Usability-first degraded-mode resilience on member/trust/commerce routes.

Updated files:
- `frontend-next/src/app/(app)/profile/page.tsx`
- `frontend-next/src/app/(app)/marketplace/page.tsx`
- `frontend-next/src/app/(public)/transparency/page.tsx`
- `frontend-next/src/app/globals.css` (labyrinth instrument contrast)

Changes delivered:
- **Profile (signed-out continuity):** clarified protected cockpit messaging and routed fallback CTA to community (`Open community`) instead of dead-end posture.
- **Marketplace degraded-mode recovery:** replaced hard-stop error screen with usable fallback catalog and explicit recovery banner.
  - Added starter listing fallback dataset when live service is unavailable.
  - Preserved browsing/cart utility in fallback mode.
  - Added “working now” continuity actions (`Open memberships`, `Open transparency`, `Open community`).
  - Added clearer checkout-unavailable behavior in fallback mode.
- **Transparency degraded-mode clarity:** expanded degraded notice with actionable continuity language and direct links (`Open docs`, `Route support`, `Open memberships`).
- **Labyrinth stat legibility:** darkened `.anu-labyrinth-instrument` surfaces for materially better contrast in trust/registry sidecar metrics.

Validation:
- Browser verification on:
  - `/profile`
  - `/marketplace`
  - `/transparency`
- Explicit assertions executed for route URL + key fallback/continuity copy and CTA visibility.
- `npm run -s lint` passed on touched files.
- `npm run -s typecheck` passed.

## 15) Phase 5 kickoff — Discovery route resilience and continuity

Date: 2026-04-06
Lens: Usability-first recovery behavior for cross-route discovery entry.

Updated files:
- `frontend-next/src/app/(app)/discover/page.tsx`

Changes delivered:
- Reworked discovery loading to use settled fetches and retain usable browsing when one or more live feeds are down.
- Added explicit degraded-mode notice with continuity CTAs (`Open community`, `Open education`, `Open transparency`).
- Removed silent failure posture by binding action/event lists to available live or feed fallback sources.
- Improved discover form input legibility and kept list/map/calendar pathways available during backend outage.

Validation:
- Browser verification on:
  - `/discover`
- `npm run -s lint` passed on touched files.
- `npm run -s typecheck` passed.

## 16) Phase 5 — Batch 2 (Governance systemic + simulations fallback continuity)

Date: 2026-04-06
Lens: Degraded-mode continuity for steward operations routes.

Updated files:
- `frontend-next/src/app/(app)/governance/systemic/page.tsx`
- `frontend-next/src/app/(app)/governance/simulations/page.tsx`

Changes delivered:
- **Systemic shock route:** replaced bare failure posture with operational fallback messaging + continuity CTAs.
  - Added partial-feed detection and fallback telemetry placeholders.
  - Added explicit “working now” guidance and direct links to governance index, transparency, and docs.
  - Improved heading/data contrast hierarchy for dark shell readability.
- **Governance simulations route:** introduced fallback scenario practice mode when live simulation APIs are unavailable.
  - Added fallback scenarios + step sets.
  - Added local impact estimation for run failures so simulation interaction remains usable.
  - Added continuity messaging and trust-route CTAs (`Open governance index`, `Open transparency`, `Open docs`).

Validation:
- Browser verification on:
  - `/governance/systemic`
  - `/governance/simulations`
- Explicit assertions executed for degraded/fallback messaging and CTA visibility.
- `npm run -s lint` passed on touched files.
- `npm run -s typecheck` passed.

## 17) Phase 5 — Batch 3 (Model registry + education hub fallback continuity)

Date: 2026-04-06
Lens: Keep high-signal learning and governance registry routes usable during backend outage.

Updated files:
- `frontend-next/src/app/(app)/governance/model-registry/page.tsx`
- `frontend-next/src/components/education/hub/EduHubDashboard.tsx`

Changes delivered:
- **Model registry route:** replaced dead-end archive sync failure with continuity-first fallback archive behavior.
  - Added fallback registry model dataset when live `/api/model-registry/` is unavailable.
  - Added degraded-mode continuity banner with direct CTAs (`Return to governance index`, `Cross-check public truth`, `Open doctrine`).
  - Preserved archive traversal + manuscript chamber interaction in fallback mode.
- **Education hub route:** prevented empty/ambiguous program catalog failure posture under feed outages.
  - Added fallback education program cards when live program catalog cannot load.
  - Added explicit “working now” continuity messaging for maps/curriculum/regeneration pathways.
  - Expanded degraded-state actions with direct CTAs (`Open maps`, `Continue curriculum`, `Open regeneration`, `Open docs`).

Validation:
- Browser verification on:
  - `/governance/model-registry`
  - `/education`
- Explicit assertions executed for fallback/degraded continuity copy and CTA visibility.
- `npm run -s lint` passed on touched files.
- `npm run -s typecheck` passed.

## 18) Phase 5 — Batch 4 (Relief + governance collisions fallback continuity)

Date: 2026-04-06
Lens: Keep care-lane stewardship and conflict-review routes operational during service degradation.

Updated files:
- `frontend-next/src/app/(app)/relief/page.tsx`
- `frontend-next/src/app/(app)/governance/collisions/page.tsx`

Changes delivered:
- **Governance collisions route:** replaced hard failure posture with usable fallback moderation flow.
  - Added fallback collision checks + fallback manual reviews when live feeds are unavailable.
  - Added degraded continuity banner and trust-route CTAs (`Open governance index`, `Open transparency`, `Open docs`).
  - Preserved manual approve/reject interaction in fallback mode with local status updates.
- **Relief route:** strengthened signed-in care continuity when request history feed fails.
  - Added fallback request records for private queue visibility continuity.
  - Added explicit “working now” notice with actionable links (`Open transparency`, `Open impact bridge`, `Open docs`).
  - Adjusted route-state instrumentation to reflect fallback request lane posture while preserving private intake flow.

Validation:
- Browser verification on:
  - `/governance/collisions`
  - `/relief`
- Explicit assertions executed for degraded/fallback continuity messaging and CTA visibility.
- `npm run -s lint` passed on touched files.
- `npm run -s typecheck` passed.

## 19) Phase 5 — Batch 5 (Governance sovereignty + needs fallback continuity)

Date: 2026-04-06
Lens: Keep institutional signal-reading routes operational even when live governance telemetry is unavailable.

Updated files:
- `frontend-next/src/app/(app)/governance/sovereignty/page.tsx`
- `frontend-next/src/app/(app)/governance/needs/page.tsx`

Changes delivered:
- **Sovereignty index route:** replaced failure-only posture with continuity-first fallback index behavior.
  - Added fallback sovereignty snapshot with component detail panel when live latest/compute services are unavailable.
  - Added degraded-mode continuity messaging and direct trust-route CTAs (`Open governance index`, `Open transparency`, `Open docs`).
  - Preserved compute interaction in fallback mode via local placeholder recompute behavior.
- **Needs signals route:** replaced empty/error dead-end with actionable fallback signal preview.
  - Added fallback needs signal dataset and severity summary metrics when live feed is unavailable.
  - Added explicit “working now” continuity messaging and direct governance/trust CTAs.
  - Preserved readable signal list structure with fallback indicators.

Validation:
- Browser verification on:
  - `/governance/sovereignty`
  - `/governance/needs`
- Explicit assertions executed for degraded/fallback continuity messaging and CTA visibility.
- `npm run -s lint` passed on touched files.
- `npm run -s typecheck` passed.

## 20) Phase 5 — Batch 6 (Governance formulas + metrics hardcopy fallback synchronization)

Date: 2026-04-06
Lens: Ensure fallback governance registries are a periodically refreshed hardcopy of the latest user-agreed rule set.

Updated files:
- `frontend-next/src/app/(app)/governance/formulas/page.tsx`
- `frontend-next/src/app/(app)/governance/metrics-registry/page.tsx`

Changes delivered:
- **Formula registry route:** upgraded fallback from static placeholder posture to synced hardcopy behavior.
  - Added local hardcopy cache for formula definitions (last successful live ruleset sync).
  - Added periodic auto-resync (90s) so fallback can update when live governance rules change.
  - Added source provenance display (`Live rule set` / `Hardcopy rule set` / `Baseline rule set`) + sync timestamp.
  - Kept activation flow usable with JSON validation and post-activation re-sync attempt.
- **Metrics registry route:** mirrored the same hardcopy synchronization model.
  - Added local hardcopy cache for metrics definitions (including version/unit signatures).
  - Added periodic auto-resync (90s) to refresh fallback when governance metric rules evolve.
  - Added source provenance + sync timestamp to keep fallback transparency explicit.
- **Continuity UX:** both routes now include explicit degraded-state guidance and trust-route CTAs (`Open governance index`, `Open transparency`, `Open docs`).

Validation:
- Browser verification on:
  - `/governance/formulas`
  - `/governance/metrics-registry`
- Explicit assertions executed for degraded/fallback messaging and CTA visibility.
- `npm run -s lint` passed on touched files.
- `npm run -s typecheck` passed.

## 21) Phase 5 — Batch 7 (Federation + institutional hardcopy fallback synchronization)

Date: 2026-04-06
Lens: Keep institutional operating routes writable/readable during outages while maintaining periodically refreshed hardcopy continuity.

Updated files:
- `frontend-next/src/app/(app)/governance/federation/page.tsx`
- `frontend-next/src/app/(app)/governance/institutional/page.tsx`

Changes delivered:
- **Federation route:** replaced compute-only brittle posture with resilient hardcopy-backed snapshot flow.
  - Added live snapshot sync + hardcopy snapshot fallback cache.
  - Added automatic periodic re-sync (120s) so fallback snapshot can catch up to latest agreed federation state when services recover.
  - Added fallback-aware mutual-aid submission queue (local pending replay surface) so operators can continue drafting coordination actions.
  - Added source provenance and sync timestamp (`Live snapshot` / `Hardcopy snapshot` / `Baseline snapshot`).
- **Institutional route:** replaced failure-only config management with hardcopy-backed continuity controls.
  - Added live config sync + hardcopy config fallback cache.
  - Added automatic periodic re-sync (120s) to keep fallback config aligned with latest institutional governance settings.
  - Added fallback save behavior that persists config to hardcopy when live save fails.
  - Added fallback observer queue so observer submissions remain visible and recoverable during outage.
  - Added source provenance and sync timestamp (`Live config` / `Hardcopy config` / `Baseline config`).
- **Continuity UX:** both routes include explicit degraded-state guidance + trust-route CTAs (`Open governance index`, `Open transparency`, `Open docs`).

Validation:
- Browser verification on:
  - `/governance/federation`
  - `/governance/institutional`
- Explicit assertions executed for degraded/hardcopy continuity messaging and CTA visibility.
- `npm run -s lint` passed on touched files.
- `npm run -s typecheck` passed.

## 22) Phase 6 — Batch 1 (Copy clarity + hover-bubble declutter pass)

Date: 2026-04-06
Lens: Reduce cognitive load by simplifying copy, moving secondary context into hover bubbles, and collapsing advanced details.

Updated files:
- `frontend-next/src/ui-system/primitives/HoverBubble.tsx`
- `frontend-next/src/app/(app)/governance/formulas/page.tsx`
- `frontend-next/src/app/(app)/governance/metrics-registry/page.tsx`
- `frontend-next/src/app/(app)/governance/federation/page.tsx`
- `frontend-next/src/app/(app)/governance/institutional/page.tsx`

Changes delivered:
- Introduced reusable **floating hover bubble** primitive for concise contextual help without adding always-visible copy weight.
- Simplified route copy across all four governance surfaces:
  - shorter headings/subheads
  - shorter degraded/continuity notices
  - concise CTA labels
- Applied decluttering UI tactics:
  - hover bubbles for “why this matters” and section guidance
  - collapsed advanced/secondary content via `<details>` on dense sections
  - reduced always-visible explanatory text while preserving critical trust signals.
- Preserved hardcopy synchronization architecture from Phase 5 while making source/status language scan-friendly (`Live`, `Hardcopy`, `Baseline`).

Validation:
- Browser verification on:
  - `/governance/formulas`
  - `/governance/metrics-registry`
  - `/governance/federation`
  - `/governance/institutional`
- Explicit assertions executed for route copy, degraded continuity messaging, and hover-bubble trigger visibility.
- `npm run -s lint` passed on touched files.
- `npm run -s typecheck` passed.

## 23) Phase 6 — Batch 2 (Copy clarity + declutter pass for capital and competency)

Date: 2026-04-06
Lens: Reduce cognitive load on remaining governance operation surfaces with concise copy and progressive disclosure.

Updated files:
- `frontend-next/src/app/(app)/governance/capital/page.tsx`
- `frontend-next/src/app/(app)/governance/competency/page.tsx`

Changes delivered:
- **Capital route (`/governance/capital`):**
  - Simplified page framing and section copy to short scan-first language.
  - Added hover-bubble contextual hints to shift secondary explanation off the primary reading path.
  - Applied progressive disclosure (`<details>`) for full flag/snapshot detail so default view stays calm.
  - Preserved fallback continuity with concise “working now” messaging during feed outages.
- **Competency route (`/governance/competency`):**
  - Simplified headings/labels and reduced visible prose in form/list sections.
  - Added hover-bubble help and optional-description collapse to reduce form noise.
  - Added fallback domain continuity + queued local draft behavior when live creation is unavailable.
  - Added pending/recent draft disclosure block for operational transparency without overcrowding the main view.

Validation:
- Browser verification on:
  - `/governance/capital`
  - `/governance/competency`
- Explicit assertions executed for updated copy and hover-bubble trigger visibility.
- `npm run -s lint` passed on touched files.
- `npm run -s typecheck` passed.

## 24) Phase 6 — Batch 3 (Organizer on-ramp route + copy-clarity navigation pass)

Date: 2026-04-06
Lens: Add a clear user route into organizer work, reduce route-finding friction, and keep organizer entry copy concise.

Updated files:
- `frontend-next/src/app/(app)/organizer/on-ramp/page.tsx` (new)
- `frontend-next/src/ui-system/layout/Header.tsx`
- `frontend-next/src/ui-system/layout/Sidebar.tsx`
- `frontend-next/src/ui-system/layout/pathwayGuidance.ts`
- `frontend-next/src/app/(app)/actions/page.tsx`
- `frontend-next/src/app/(app)/events/page.tsx`
- `frontend-next/src/app/(app)/calendar/page.tsx`

Changes delivered:
- Added dedicated **user-facing organizer on-ramp route** at `/organizer/on-ramp`.
  - Provides one clear entry point for guests, applicants, and active organizers.
  - Uses concise copy and hover-bubble micro-help to avoid dense explanatory blocks.
  - Preserves resilience language when organizer status services are unavailable:
    - `Live organizer status is unavailable in this environment.`
    - `Working now: organizer on-ramp remains available while status services recover.`
- Added organizer-path discoverability in shared navigation surfaces:
  - Header profile menu now includes **Organizer path**.
  - Sidebar fieldwork section now links to `/organizer/on-ramp`.
  - Pathway guidance now points to organizer path (instead of direct cockpit jump) in task/steward flows.
- Updated organizer-entry CTAs in daily workflow routes:
  - Actions/events/calendar organizer CTAs now route to `/organizer/on-ramp` for consistent user entry behavior.

Validation:
- Browser verification on:
  - `/organizer/on-ramp`
- Explicit assertions executed for route URL, heading, hover-bubble trigger, and sign-in continuation copy.
- `npm run -s lint` passed on touched files.
- `npm run -s typecheck` passed.

## 25) Phase 6 — Batch 4 (Organizer route access enforcement via on-ramp redirect)

Date: 2026-04-06
Lens: Convert organizer access control from navigation-only guidance into route-level enforcement while keeping recovery copy clear.

Updated files:
- `frontend-next/src/app/(app)/organizer/layout.tsx` (new)

Changes delivered:
- Added nested organizer layout guard for `/organizer/**` routes.
  - `/organizer/on-ramp` is intentionally bypassed so all users can reach the pathway entry page.
  - Non-authenticated or non-organizer sessions are redirected to `/organizer/on-ramp`.
  - Access is granted when either:
    - role is organizer-class (`organizer`, `node_admin`, `platform_admin`, `board_member`, `treasury_guardian`), or
    - organizer status API returns active organizer access.
- Added concise continuity copy during guard transitions:
  - `Checking organizer access…`
  - `Working now: redirecting to organizer path while access checks complete.`
- Preserved route resilience posture for verification outages:
  - if live organizer verification cannot complete, route redirects to on-ramp instead of exposing organizer-only surfaces.

Validation:
- Browser verification on:
  - `/organizer` → redirects to `/organizer/on-ramp`
  - `/organizer/intelligence` → redirects to `/organizer/on-ramp`
- Explicit assertions executed for redirected URL + on-ramp heading visibility.
- `npm run -s lint` passed on touched files.
- `npx next typegen` executed to refresh route/layout generated types after adding nested layout.
- `npm run -s typecheck` passed.

## 26) Phase 6 — Batch 5 (Organizer workflow copy clarity + progressive disclosure pass)

Date: 2026-04-06
Lens: Reduce cognitive load across organizer routes by shortening visible copy, adding hover micro-help, and moving secondary guidance into collapsible details.

Updated files:
- `frontend-next/src/app/(app)/organizer/page.tsx`
- `frontend-next/src/app/(app)/organizer/intelligence/page.tsx`
- `frontend-next/src/app/(app)/organizer/guilds/page.tsx`
- `frontend-next/src/app/(app)/organizer/guilds/[guildId]/page.tsx`
- `frontend-next/src/app/(app)/organizer/competency/page.tsx`
- `frontend-next/src/app/(app)/organizer/runs/[id]/page.tsx`

Changes delivered:
- **Organizer console (`/organizer`)**
  - Simplified hero and instrumentation copy to short scan-first language.
  - Added hover bubble for route focus guidance and a collapsed advanced-controls block.
  - Upgraded load behavior to partial-feed tolerance with explicit continuity messaging when one or more organizer feeds fail.
  - Added concise continuity banner actions (`Organizer path`, `Open actions`, `Open events`).
- **Organizer intelligence (`/organizer/intelligence`)**
  - Reworked to resilient multi-feed loading with fallback snapshots for needs, competency, analytics, guild recommendations, and burnout advisory.
  - Added concise continuity language and hover-bubble context.
  - Collapsed detailed needs-signal list behind `<details>` to reduce default noise.
- **Organizer guild routes (`/organizer/guilds`, `/organizer/guilds/[guildId]`)**
  - Added concise route framing, hover-bubble hints, and continuity banners.
  - Added fallback guild datasets/detail stubs when live directory/detail services are unavailable.
  - Moved rotation editing to a collapsible `<details>` panel on guild detail for cleaner default view.
- **Organizer competency (`/organizer/competency`)**
  - Added concise competency summary framing with fallback profile continuity.
  - Added hover-bubble context and collapsed evidence note.
- **Organizer run detail (`/organizer/runs/[id]`)**
  - Added concise route framing (`Run console`) with hover-bubble workflow cue.
  - Added continuity banner and actions for load/action/receipt failures.
  - Added collapsed status-transition guidance to reduce always-visible instruction load.

Validation:
- Browser verification on protected organizer routes (guest session):
  - `/organizer/guilds` → redirects to `/organizer/on-ramp`
  - `/organizer/competency` → redirects to `/organizer/on-ramp`
  - `/organizer/runs/1` → redirects to `/organizer/on-ramp`
- Explicit assertions executed for redirected URL + on-ramp heading visibility.
- `npm run -s lint` passed on touched files.
- `npm run -s typecheck` passed.

## 27) Phase 7 — Batch 1 (Intent-preserving organizer handoff)

Date: 2026-04-06
Lens: Preserve user intent during organizer access gating so users are returned to the exact organizer route they originally tried to open.

Updated files:
- `frontend-next/src/app/(app)/organizer/layout.tsx`
- `frontend-next/src/app/(app)/organizer/on-ramp/page.tsx`

Changes delivered:
- **Organizer route guard now preserves target route intent** when redirecting to on-ramp.
  - Redirects now include a safe `next` parameter (for example: `?next=/organizer/intelligence`).
  - Guard CTA now opens on-ramp with the same preserved `next` route.
- **Organizer on-ramp now reads/sanitizes preserved intent** and keeps it through sign-in handoff.
  - Uses safe internal-path sanitization and prevents on-ramp self-loop values.
  - Sign-in link now carries full return path continuity (`/auth?returnTo=/organizer/on-ramp?next=...`).
- **Organizer-active experience now supports fast resume**.
  - When organizer access is active, primary CTA can resume the originally requested organizer route instead of always sending users to `/organizer`.
- **Copy clarity retained** with concise route-preservation cue:
  - `Requested route preserved: /organizer/...`

Validation:
- Browser verification on:
  - `/organizer/intelligence` as guest → redirected to `/organizer/on-ramp?next=%2Forganizer%2Fintelligence`
- Explicit assertions executed for:
  - redirected URL containing encoded `next` route
  - preserved-route copy visibility on on-ramp
- Verified sign-in anchor href includes preserved return intent payload.
- `npm run -s lint` passed on touched files.
- `npm run -s typecheck` passed.
