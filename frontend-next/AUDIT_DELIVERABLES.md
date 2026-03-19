# Manara UI Audit Deliverables Log

_Last updated: 2026-03-19_

## 1) Completed deliverables from previous audit rounds

### Reliability + navigation + onboarding
- [x] Global system health banner across shell surfaces (Core/API/Auth), with resilience messaging and continuity routes.
- [x] Actionable fallback errors replacing raw/technical fetch failures with recovery CTAs.
- [x] "Start here" onboarding rail for new visitors on Home.
- [x] Naming hierarchy normalization toward **Manara-first** public language.
- [x] React Query devtools gated to **development only**.
- [x] Missing mobile navigation aria labels added.

### Visual redesign (Phase 1)
- [x] Home + shell redesigned to calm-premium, non-SaaS visual direction.
- [x] Header, sidebar, footer, theme controls, and global styling updated for immersive cultural operations feel.

### Universe immersive experience
- [x] `/universe` switched to immersive fullscreen constellation experience.
- [x] Existing map functionality preserved (index/search/filter/scope/compare/snapshots/outgoing-relations flow).
- [x] Floating explainer opens on node selection.
- [x] Desktop explainer constrained to ~1/3 viewport (`md:w-[min(32rem,33vw)]`).
- [x] Universe-specific shell behavior: hide nonessential chrome (health banner/footer).
- [x] Sidebar collapsed by default on `/universe`, summonable by user via header toggle.
- [x] Contextual edge-dock controls added; single-major-panel behavior enforced (controls OR index OR explainer).
- [x] Mobile immersive height/ergonomics pass applied.

## 2) Known open technical debt (non-blocking)
- [ ] Lint warnings in `src/components/maps/FalakMapViewer.tsx` (`react-hooks/set-state-in-effect`, around active-node synchronization).
- [ ] Next.js deprecation warning: `middleware` convention should migrate to `proxy`.
- [ ] Local environment still reports fallback states when backend/API/Supabase are unavailable.

## 3) Current direction: Whole-UI coherence pass (not token-only work)

### Shell character reset (header + sidebar first)
- [x] Replace residual "corporate dashboard" look/feel with a warmer cultural-operating identity.
- [x] Refine spacing, hierarchy, and copy rhythm in shell chrome to feel editorial/ritual rather than SaaS.
- [x] Keep accessibility and keyboard behavior intact while redesigning chrome surfaces.

### Community section solidification (using draggable gallery demo as reference)
- [x] Make draggable gallery the stable default surface for Community, even when live feed is degraded.
- [x] Improve Community status messaging so users understand live vs fallback mode without losing immersion.
- [x] Preserve composer, auth flow, and refresh affordances while reducing visual clutter.
- [x] Keep deterministic fallback universe packet available as contextual support, not a hard blocking replacement.

### Cross-route consistency
- [ ] Audit `/home`, `/manara`, `/community`, `/education`, `/universe`, `/transparency`, `/docs`, `/contact` for consistent visual language.
- [ ] Normalize component density, border language, and contrast cadence across primary surfaces.

## 4) Animation / opacity / timing (address when relevant)
- [ ] Tune transitions and opacity behavior only where needed to support overall UI feel.
- [ ] Avoid abstract tokenization work unless a specific surface needs it for quality or clarity.

## 5) Suggested execution order for this cycle
1. Header + sidebar holistic restyle.
2. Community gallery-first stabilization pass.
3. Route-by-route coherence sweep.
4. Targeted interaction polish where the UI still feels abrupt.
5. Technical debt cleanup (lint + middleware/proxy migration).
