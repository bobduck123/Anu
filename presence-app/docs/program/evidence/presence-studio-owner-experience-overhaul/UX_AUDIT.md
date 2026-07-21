# UX audit

## Baseline

The existing Studio V2 proved the important engine behaviors: room composition, environmental styling, owner/private containment, draft save, clean visitor preview, and controlled publication. Its primary weakness was not capability; it was owner comprehension.

The entry experience read like a renderer cockpit. Chamber, zone, object, skin, hydration, and debug language appeared before the owner understood the simple job: shape a digital home and decide when it is ready for visitors. All controls competed at once, the path between rooms and publishing was implicit, and mobile exposed a long technical surface without a clear journey.

## Owner questions the new flow answers

1. Where am I? My digital home and its current status.
2. What can I change? Rooms, pieces, arrangement, and look and feel.
3. What will visitors see? A clean visitor preview with an explicit not-live boundary.
4. Is it safe to publish? A review checklist followed by the existing human-confirmed publish flow.

## Applied UX principles

- Keep one persistent six-step journey with the current task named and explained.
- Make Arrange the spatial centre while revealing technical controls only when requested.
- Use room cards, selected-piece context, and empty-area prompts instead of schema language.
- Group visual controls by owner intent: Mood, Background, Texture, Motion, Density, Accent.
- Show an actual room preview beside style choices.
- Preserve fallback placement buttons as a first-class mobile interaction.
- Separate editing, visitor preview, and publication visually and verbally.

## Reference harvest

The `C:\Dev\tools` examples were reviewed as interaction references. Useful patterns were a compact accessible rail, stage-dominant contextual controls, in-place drag guidance, grouped visual choices, and narrow-screen mode switching. No reference code, heavy animation dependency, WebGL stack, or new architecture was imported.

## Deliberate constraints

- Existing direct `/editor` entry still opens Arrange so the engine and focused tests remain compatible.
- Advanced controls remain available rather than being removed.
- Look & Feel writes only existing skin/environment fields.
- Preview and publication still use their existing authenticated routes and handlers.
- The public BBB renderer and payload were left untouched.
