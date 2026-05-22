# GGM Style DNA

Date: 2026-05-22  
Source of truth: `C:\Dev\ggm`

## Source Summary

GGM is a static artist portfolio for Christina Kerkvliet Goddard. It is not a
generic artist landing page. The source experience is artwork-first and uses a
quiet paper gallery system around a deliberately high-impact hero.

## Route And Content Inventory

| Route | Content role |
|---|---|
| `/` | Full viewport selected-work hero, practice intro, featured works |
| `/work/` | Work index, year filters, grid/list switch, serendipity path panel |
| `/work/<slug>/` | Work detail page, artwork hero, memory response UI, process/context/memory copy, related works |
| `/about/` | Artist bio, working path, concerns, inspiration board, direct contact |
| `/safe/` mirrors | Static fallback copy of the same site family |

Data inventory:

- Artist JSON contains Christina's name, subtitle, location, direct email,
  practice intro/body, statement quote, influences, timeline, reference URL.
- Works JSON contains eight works with slug, title, year, medium, dimensions,
  work and thumbnail images, alt text, description, context, process, memory,
  and mood tags.
- Home HTML explicitly features Willow of Port Arthur, Bridle Road, Thomas
  Road, Gothic Tapestry, and Empty Nest in the hero sequence.

## Asset Inventory

- eight WebP work images and eight WebP thumbnails under
  `assets/images/works` and `assets/images/thumbs`
- Christina portrait asset under `assets/images/portrait`
- legacy JPG/PNG source image files at the root
- static HTML/CSS/JS and JSON data files
- external Slater stylesheet and CDN scripts for GSAP and Three.js on home
- Osmo license note present in the source directory

Asset reuse into Presence needs an approved hosted asset path and license review
for any vendor-derived home interaction code.

## Typography And Palette

Type:

- source font stack uses `Haffer XH` for headings and `Haffer` for body with
  Arial fallback
- headings are low weight, tight and editorial
- labels/nav/buttons rely on uppercase text and loose positive letter spacing
- detail copy remains restrained and readable rather than oversized

Palette:

| Role | Value |
|---|---|
| background | `#f4f4f4` |
| paper | `#eceae7` |
| ink | `#111111` |
| muted | `#6a6a6a` |
| rule | `rgba(0, 0, 0, 0.12)` |
| atmospheric water | blue-green and warm muted radial overlays |

## Layout DNA

- Home starts with a full viewport artwork stage, fixed difference-blend nav,
  art title/counter controls, and the brand visible immediately.
- Content sections use `min(1200px, 92vw)` with wide quiet space and top rules.
- Intro is two-column desktop and single-column mobile.
- Featured works are a four-column strip desktop and two-column mobile.
- Work index is a controlled filterable gallery and optionally list-like.
- About route uses split biography/timeline grids and a moving pinned inspiration
  board rather than generic bio cards.
- Work details preserve the artwork as the visual object with contained object
  fit, story blocks, related cards, and a local memory response UI.

## Image And Gallery Treatment

- Artwork dominates the hero with cover behavior on home and contain behavior on
  detail pages.
- Home cards overlay minimal title/year metadata over image gradients.
- Work index cards retain title, year, dimensions, medium, description, and a
  slight perspective tilt hover.
- Atmosphere layers complement the images; they do not replace them.

## Motion And Responsive Behavior

Distinctive motion:

- dithered Willow intro resolving on scroll input
- liquid WebGL morph slideshow with arrows, year dots, counter, and drag/wheel
  behavior
- page transition wipe and reveal-on-scroll
- bottom zoom/blur near page footer
- tiny difference cursor on fine pointers
- featured image hover reveal and work-card tilt

Fallbacks:

- reduced-motion disables page transitions, atmospheric canvas/cursor, and
  reveal transforms
- mobile disables custom cursor and compacts hero controls/nav
- touch path remains usable with single-column layout and smaller control sizes

## Presence Translation Notes

The faithful Presence Room should:

1. Keep the GGM external portfolio portal and direct artist identity.
2. Use a custom GGM renderer path rather than the generic `artist_studio`
   split-hero renderer.
3. Put real approved artwork media in the first viewport.
4. Translate `/work/` and detail semantics through Room works/detail support.
5. Use Presence enquiry, RoomKey, and analytics beneath that visual identity.
6. Preserve World hidden/forming posture and avoid V2 promises.

## Implementation Risks

- Current Presence theme presets cannot express the dither/WebGL home stage by
  metadata alone.
- Source font availability and vendor code license need a deliberate fallback
  plan.
- Public API must not return `C:\Dev\ggm` or other operator-only source paths.
- Source text currently shows mojibake in shell output for some punctuation;
  content ingestion should read UTF-8 assets cleanly and review final copy.
- Public enquiry and owner analytics must survive the custom renderer path.
