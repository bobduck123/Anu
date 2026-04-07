# Realm Gate B/C Browser Evidence (2026-04-07)

Date: 2026-04-07  
Operator context: local candidate verification at `http://localhost:3000` (dev server `b9e8548c`) from `C:\Dev\Flora_fauna\frontend-next`.

Evidence artifacts:
- Browser action timeline (35 actions):
  - `C:\Dev\.artifacts\browser\2026-04-07T01-25-30-892Z-session\realm-gate-b-c-timeline-2026-04-07.json`
- Mobile screenshots were captured during verification for each canonical route in-session.

---

## Gate B: Browser Route Proof (canonical routes)

Required routes:
- Labyrinth: `/governance/model-registry`
- Earth: `/actions`, `/events`, `/impact`
- Celestial: `/community`, `/constellations`

### Verification matrix

| Route | Environment loads | Realm navigation appears | Honest fallback/error state | Keyboard/focus | Mobile navigable |
|---|---|---|---|---|---|
| `/governance/model-registry` | PASS (`url_contains`, page title/landmarks present) | PASS (`Model archive`, `ARCHIVE PASSAGE`) | PASS (`FALLBACK MODE ACTIVE`, archive fallback messaging visible) | PASS (`Tab` moved focus to "Manara home"; `Escape` no adverse state) | PASS (`Open menu` visible; route content visible) |
| `/actions` | PASS | PASS (`Field operations`, `GROUNDED FIELD`) | PASS (`Could not load live actions`, operational backup links visible) | PASS (`Tab` focus change; `Escape` stable) | PASS (`Open menu` visible; route content visible) |
| `/events` | PASS | PASS (`Field operations`, Earth proof copy visible) | PASS (`Could not load live events and venues`, backup links visible) | PASS (`Tab` focus change; `Escape` stable) | PASS (`Open menu` visible; route content visible) |
| `/impact` | PASS | PASS (`Impact bridge`, `GROUNDED ASCENT`, Earth nav visible) | PASS (route guidance + bridge/fallback posture copy visible) | PASS (`Tab` focus change; `Escape` stable) | PASS (`Open menu` visible; route content visible) |
| `/community` | PASS | PASS (`MANARA COMMUNITY UNIVERSE`, carved celestial entry + route guidance visible) | PASS (read-only fallback messaging + working-now links visible) | PASS (`Tab` focus change; `Escape` stable) | PASS (`Open menu` visible; route content visible) |
| `/constellations` | PASS | PASS (`Constellation field`, `STARFIELD THRESHOLD`) | PASS (`Failed to fetch` surfaced with fallback posture copy) | PASS (`Tab` focus change; `Escape` stable) | PASS (`Open menu` visible; route content visible) |

Gate B conclusion:
- Canonical realm routes are verified in browser with route identity, fallback honesty, keyboard focus movement, and mobile navigation signals present.

---

## Gate C: Performance/Degradation Proof

### Celestial

Verified:
- Manual 2D fallback toggle works on `/community`:
  - Enter starfield -> switch to `2D backup` -> return to `Starfield`.
- Primary content remains inspectable without starfield:
  - 2D backup showed community trace cards (e.g., `SILVER FOX`, other seeded traces) and remained navigable.
- Automated reduced-motion auto-fallback emulation is now verified in focused frontend tests:
  - `src/test/communityPage.test.tsx` (`auto-falls back to the 2D backup on reduced-motion preference while allowing starfield re-entry`)
  - `src/test/constellationsPage.test.tsx` (`auto-falls back to list mode on reduced-motion preference while keeping starfield available`)

### Earth

Verified:
- Operational backup modes remain functional on `/actions`:
  - `List` and `Map` toggles activate successfully (`anu-filter-button-active` confirmed).
- Fallback pathways remain explicit:
  - Action/event degradation states expose backup links (gatherings/relief/impact).

### Labyrinth

Verified:
- Archive remains readable with fallback content and route guidance visible on both desktop/mobile.
- Keyboard focus behavior verified (`Tab` focus movement stable).

Gate C conclusion:
- Degradation and utility continuity are evidenced for Celestial and Earth; Labyrinth readability and keyboard behavior are evidenced.
- Reduced-motion-specific celestial fallback behavior is now evidenced through deterministic automated emulation tests.
