# Custom Presence Ingestion And Style DNA Spec

Date: 2026-05-22

## Purpose

Custom Presence ingestion is the controlled-launch path for pilots whose source
site or approved reference material already has a strong identity. It must not
flatten a source into a generic Room template. The output is a Presence-native
Room that preserves the source design intent, adds Presence entry/enquiry and
analytics contracts, and records reusable style DNA for future revisions.

## Source Site Discovery

Each ingestion starts with an evidence inventory before Room setup changes:

| Area | Required evidence |
|---|---|
| Framework | Static/app framework, build/runtime assumptions, data files, env dependency |
| Routes | Home, content index, detail pages, about/contact routes, safe/fallback routes |
| Assets | Hero media, work media, portraits, thumbnails, fonts, favicons, licensed vendor assets |
| Content | Hero hierarchy, page copy, works/services/proof/contact text, metadata, alt text |
| Typography | Font families, fallbacks, type scale, heading rhythm, uppercase/eyebrow rules |
| Palette | Background, paper/surface, ink, muted, border, accent, atmospheric overlays |
| Layout | Hero composition, section widths, grids, detail pages, nav/footer placement |
| Motion | Loaders, transitions, scroll reactions, hover behavior, reduced-motion fallback |
| Responsive | Mobile breakpoints, touch fallbacks, overflow risks, CTA and nav behavior |

The source inventory stores internal paths only in operator evidence or owner
metadata. Public Room responses must not expose local filesystem paths.

## Visual DNA Extraction

The style DNA JSON is a reviewable contract, not a loose mood board. It records:

- colours and named colour roles
- primary fonts and safe substitutes
- spacing scale, section rhythm, container widths, border/frame language
- image crop/object-fit rules and gallery/detail treatments
- background/atmosphere layers
- nav, CTA, form, card, chip, and footer treatments
- motion motifs, durations/easing families, reduced-motion behavior
- atmosphere labels that explain the source identity without marketing copy
- asset and license requirements
- implementation risks and fidelity test targets

The JSON has a separate `public_style_subset` for data safe to return from the
public Room API. Full source extraction can contain operator references.

## Presence Translation

### Preserve

- brand/person/object identity in the first viewport
- source content hierarchy and media hierarchy
- distinctive type, spacing, palette, image framing, and motion motifs
- source route semantics where a Room-native subroute or section is needed

### Translate

| Source concept | Presence translation |
|---|---|
| Source homepage entry | Custom Room renderer entry |
| Work/gallery route | Room work gallery and Room-native work detail path |
| Contact/mailto | Per-Room enquiry capture plus approved contact fallback |
| External link | Source-site portal link |
| Approved QR/NFC entry | RoomKey route into the same Room identity |
| Visitor interactions | Presence analytics events, without inventing realtime |
| Visual extraction | `metadata.custom_presence` style DNA contract |

Room metadata carries the renderer key, explicit public style subset, fidelity
status, safe source reference, and owner/operator-only fidelity/source notes.
Sections, works, links, enquiries, RoomKeys, and analytics remain canonical
Presence data contracts.

## Data Contract

The first backend contract uses existing `PresenceNode.node_metadata`:

```json
{
  "custom_presence": {
    "schema_version": "custom-presence-style-dna-v1",
    "custom_renderer_key": "ggm-faithful-room-v1",
    "fidelity_status": "source_dna_extracted",
    "source_site_reference": {
      "reference_id": "ggm-source-site",
      "label": "GGM static portfolio",
      "public_url": "https://approved-source.example"
    },
    "public_style_dna": {},
    "style_dna": {},
    "fidelity": {}
  }
}
```

Public Room serialization returns only safe custom fields and maps
`public_style_dna` to public `custom_presence.style_dna`. Owner/control reads
retain the full metadata object. Existing Rooms without custom metadata keep the
existing renderer path.

## Fidelity Gates

No custom pilot is visually approved until all applicable gates are recorded:

1. Source route and content inventory reviewed.
2. Source and Presence screenshots compared at desktop and phone widths.
3. Hero, nav, palette, type hierarchy, gallery, contact, and detail-page rhythm reviewed.
4. Mobile overflow, touch controls, CTA reachability, and reduced-motion behavior checked.
5. RoomKey route lands on the same approved visual identity.
6. Enquiry and analytics contracts still pass.
7. Owner/operator approval recorded.

## Reusable Onboarding System

Future pilots use this sequence:

1. Discover source/reference assets and license posture.
2. Extract style DNA markdown and JSON.
3. Define Room metadata, works, links, enquiry, RoomKey, analytics, and rollback scope.
4. Select or implement `custom_renderer_key`.
5. Apply metadata with an explicit public style subset.
6. Run API and browser smoke.
7. Run fidelity screenshots and owner review.
8. Store gap report, final evidence, and override notes.

Manual override points are required for assets, copy edits, safe font
substitutions, motion fallbacks, public metadata redaction, and owner approval.
