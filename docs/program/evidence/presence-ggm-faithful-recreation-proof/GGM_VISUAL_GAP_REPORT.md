# GGM Visual Gap Report

Date: 2026-05-22

## Verdict

The current Presence GGM Room is not a faithful recreation. It is a generic
`artist_studio` Room populated with a small GGM summary and an external link.
That is useful as a RoomKey/onboarding proof, but it is visually weaker than
the source site and is not acceptable as the first custom-ingestion example.

## What The Source Does Well

- Makes Christina and real artwork the first-viewport signal.
- Uses a controlled neutral paper gallery palette around artwork colour.
- Opens with a deliberate dither/WebGL sequence that feels specific to the work.
- Preserves a coherent work index, work detail, about, inspiration, and contact
  hierarchy.
- Uses motion, framing, and type rhythm to support images instead of burying
  them in generic product cards.
- Keeps mobile behavior deliberate with smaller controls and touch fallbacks.

## What Current Presence Gets Wrong

| Area | Current gap |
|---|---|
| Hero | Generic Presence Room hero instead of full-screen artwork entry |
| Layout | Split Room sections and standard cards flatten the source section rhythm |
| Typography | Theme preset typography does not reflect Haffer editorial scale |
| Palette | `gallery_white` is adjacent but not the GGM paper/mixed-blend system |
| Media | No faithful source hero sequence, work wall, or detail image treatment |
| Content | Current setup copy is only a pilot summary, not the source inventory |
| Motion | No dither intro, liquid artwork morph, difference cursor, or source reveal language |
| Route hierarchy | Work index/detail/about structures are not translated |
| Mobile | Generic Room responsiveness cannot prove the source touch-control behavior |

## Missing Assets And Content

- approved hosted GGM work images and thumbnails
- hero slideshow sequence from the source
- work detail context/process/memory copy
- artist about/working-path/inspiration content
- safe font strategy and source motion/license decision
- screenshot parity baseline for source and custom Room

## Replace Versus Reuse

Replace:

- generic first viewport and generic artist hero composition for GGM
- placeholder pilot copy as the visual content source
- stock Presence work-wall assumptions where they crop art incorrectly

Reuse:

- Presence public Room route, RoomKey route, enquiry capture, analytics,
  Room work/detail contracts, and graph actions where they do not distort GGM
- existing Room ownership/auth/rollback evidence
- `metadata.custom_presence` safe style DNA contract added in this recovery pass

## Required Fidelity Work

1. Implement `ggm-faithful-room-v1` in the frontend.
2. Ingest approved source artwork/content into Presence Room data or approved
   renderer assets.
3. Compare source and Room screenshots at desktop and phone widths.
4. Verify enquiry, RoomKey, owner analytics, logout, and World hidden posture
   after custom renderer integration.
5. Record owner/operator visual approval before GGM pilot resumes.
