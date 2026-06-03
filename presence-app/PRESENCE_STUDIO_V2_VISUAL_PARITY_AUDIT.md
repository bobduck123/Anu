# Presence Studio V2 Visual Parity Audit

Date: 2026-06-04

## Scope

This audit compares the production Studio V2 implementation in `components/presence-studio-v2` against the latest reference prototype from `semi launchable (3).zip`. It is limited to visual parity and interaction-material quality. It does not propose routing, auth, save, publish, payload, backend, or feature-gating changes.

## Summary Finding

Production V2 has the correct lifecycle and safe data boundary, but its current visual layer still reads closer to a clean card renderer and utility editor than to the reference prototype's threshold cinema, gold-standard room surfaces, and premium studio cockpit. The high-impact parity work can be done safely with scoped CSS and small public-renderer presentation hooks.

## Gap Areas

1. Public threshold visual force

Production has a conventional title/CTA opening. The prototype treats the first viewport as a threshold: cinematic, atmospheric, spatial, and world-specific. Gallery/GGM especially needs hush, spotlight, wall depth, and curatorial entry rather than a generic hero block.

2. Chamber layout

Production chambers are simple grid sections. The prototype chambers feel like entered rooms with surfaces, labels, object rhythm, trace layers, and physical spacing. Production needs stronger chamber boundaries and world-aware staging without changing chamber data.

3. Object treatments

Production object cards share one base treatment with minor type classes available but underused. The prototype makes images, proof, CTA, portal, media, event, testimonial, shop, archive, and moodboard objects feel materially different. Production needs type-specific visual treatment using existing object `type` and `role`.

4. Gallery / GGM room atmosphere

Production Gallery is light and pleasant but not yet a private exhibition. It lacks spotlight, negative space, artwork aura, frame depth, museum labels, and curatorial hush. Room 11 should feel like a public digital gallery room, not a profile page.

5. DJ room atmosphere

Production DJ has a dark background, but not enough booth/signal behavior. It needs scan lines, pulse, signal edges, dark stage depth, and brighter portal/event emphasis while staying readable and not becoming a neon dashboard.

6. Archive/evidence room atmosphere

Production Archive is mostly paper colored. It needs ledger rules, document surfaces, red-line authority, stamps, proof-object hierarchy, and more civic memory texture.

7. Market/commercial room atmosphere

Production Market is warm but still card-like. It needs table/stall logic, offering tags, stacked product surfaces, tactile labels, and clearer CTA path.

8. Mobile public room quality

Production mobile is usable and hides mobile-muted objects, but the threshold collapses into a standard stacked page. It needs a designed mobile threshold, readable chamber stacking, larger touch targets, and preserved room atmosphere.

9. Studio cockpit premium feel

Production editor is functional and scoped, but the cockpit reads as a plain toolbar plus stage. The prototype uses a calm dark control shell, ritual-console topbar, premium segmented controls, atmospheric stage, physical side sheets, richer Skin Lab, and stronger selected-object aura.

10. Typography, tokens, aura, surface, glow, motion

Production already has some V2 variables, but token adoption is incomplete. The prototype uses a stronger palette around paper, bone, stage, ink, copper, moss, vermilion, brass, cobalt, aura, shadow, and cinematic easing. Production motion is minimal and should add threshold reveal, hover/focus depth, portal shimmer, DJ pulse, and reduced-motion fallbacks.

## Safe Implementation Direction

- Keep public payload and component contracts unchanged.
- Add only sanitized/public presentation hooks to `PresenceStudioV2PublicRoom.tsx` if needed.
- Keep all public styling under `.presence-studio-v2-public`.
- Keep all owner/editor styling under `.presence-studio-v2`.
- Do not expose editor-only object state publicly.
- Do not change Room 11 feature gating or backend conversion state.
- Use no heavy dependencies, no WebGL, no external font dependency.
