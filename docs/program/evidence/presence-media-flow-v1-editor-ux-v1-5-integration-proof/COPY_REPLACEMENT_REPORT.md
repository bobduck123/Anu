# Copy Replacement Report

## Normal Owner Path

Implemented owner-facing language:

- Build, Look, Images, Preview, Advanced
- Draft room and Live room
- All changes saved
- Preview your draft
- Open room to visitors
- Choose an image for your room
- Cover image and Work in the wall
- Upload coming soon
- Pick a cover image, Add alt text, Add an invitation, Replace this image

## Technical Language Removed or Demoted

The normal shell no longer foregrounds renderer keys, version metrics, raw image links, technical preview endpoint wording, or readiness percentages. Existing deep editor terminology remains inside Advanced because those tools are retained for operators.

## Browser Assertion

The new local browser flow asserts that the default Build surface does not render selected internal field language (`editable_config`, `asset_config`, `content_config`, `style_dna`, `motion_config`, `payload`, or `schema`) and does not expose the old Assets tab or Renderer label before Advanced is opened.

