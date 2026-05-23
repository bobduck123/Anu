# Hosted Renderer Metadata

Date: 2026-05-23

## Applied target

`flora-fauna/backend/scripts/cutover_presence_ggm_renderer_metadata.py`
performed a dry-run and then an apply against the tagged hosted GGM pilot Room:

- environment: `hosted_controlled_launch`
- Room ID: `11`
- Room slug: `ggm-christina-goddard`
- renderer key: `ggm-faithful-room-v1`

The script is idempotent, requires the existing `pilot_code = ggm` tag, does
not create Rooms, and does not print database credentials or tokens.

## Metadata contract

The applied Room metadata carries:

- `metadata.custom_renderer_key`
- `metadata.custom_presence.custom_renderer_key`
- `metadata.custom_presence.style_dna.renderer_key`
- `metadata.custom_presence.public_style_dna.renderer_key`

The public API projects only the safe public style DNA subset. Hosted
verification confirmed:

- public style DNA exposes the renderer key
- no local filesystem path is present
- no `pilot_admin_provisioning` block is public after the backend redaction
  deployment
- no operator email, `platform_admin`, or `internal_lifetime_free` string is
  public

## Evidence

Machine-readable apply output is in `renderer_metadata_result.json`.
