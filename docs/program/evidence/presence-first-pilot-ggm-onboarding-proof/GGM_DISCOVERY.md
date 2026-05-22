# GGM Discovery

Date: 2026-05-22  
Source inspected: `C:\Dev\ggm`

## What The Site Is

GGM is a static artist portfolio for Christina Kerkvliet Goddard. The root
experience is a lab-style selected works site, with a self-contained safe
fallback under `/safe/`. The public content focuses on watercolour, memory,
colour, landscape, selected works, and an artist biography.

## Technical Stack

- Static HTML, CSS, JavaScript, JSON content files, and image assets.
- Vercel static hosting config in `vercel.json`; no production runtime server is required.
- Current public routes include `/`, `/about/`, `/work/`, per-work detail pages, and `/safe/` mirrors.
- Work detail memory prompts store browser-local reflections through `localStorage`.
- No production backend/API dependency or analytics integration was found in the inspected GGM scripts.

## Existing Content And Contact

- Current copy and works are present in HTML plus `data/artist.json` and `data/works.json`.
- Existing contact surfaces are direct mailto and external portfolio links.
- The inspected site does not expose an API-backed enquiry form.
- Existing image assets include selected work images, thumbs, and local artwork references suitable for a later approved Presence Room media pass.

## Deployment Assumptions

- README says Vercel should use framework preset Other with no build command.
- GGM can run locally with a static HTTP server.
- No environment file or runtime secret dependency was found during this discovery read.

## Recommended Integration Model

Use both surfaces:

1. Keep GGM as the external public artist portfolio.
2. Create a tagged Presence Room for the controlled-launch Room/storefront entry layer.
3. Use RoomKey NFC/QR entry and owner analytics inside Presence.
4. Configure Presence enquiry routing per Room only after the pilot destination is confirmed, otherwise keep enquiry behavior explicitly disabled for pilot start.

This model proves external-client onboarding without moving or redesigning GGM.

## Risks And Blockers

- A confirmed pilot owner auth handoff is still needed before calling the owner onboarding complete.
- Presence enquiry forwarding must be configured or intentionally disabled per Room. The GGM source contact path alone does not prove Presence delivery.
- Asset reuse into Presence needs approved hosted references and copy review.
- GGM memory prompts are local browser state, not Presence Observer or Garden data.
