# Image Preparation

## Implemented

- Supported inputs: JPEG, PNG and WEBP.
- Rejected inputs: SVG, HTML, PDF, executables and unsupported/mismatched
  payloads.
- Eight megabyte maximum, or a lower configured maximum.
- Server-side MIME, extension and signature verification.
- Basic dimension capture for parsable PNG, JPEG and WEBP headers.
- SHA-256 checksum stored on the private media lifecycle record.
- Clear recoverable error behavior inherited by the Media drawer.

## Deferred

- EXIF/GPS removal.
- Compression.
- Thumbnail/display derivative generation.
- WebP conversion.
- Full corrupt-image decode verification beyond signature/header inspection.

These deferrals mean V1C protected originals are safer in visibility terms,
but are not yet a complete media processing pipeline for sensitive or
high-volume self-serve uploads.
