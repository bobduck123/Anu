# Security Checklist

| Control | Status | Evidence |
| --- | --- | --- |
| Owner-only upload endpoint | Pass | Route is protected by existing owner authentication and `_load_owned_room`; backend tests cover anonymous and non-owner rejection. |
| Room ownership required | Pass | Upload tests reject another owner for the target room. |
| Public draft configuration hidden | Pass | Existing draft boundary retained; tests assert public output excludes uploaded assignment before publish. |
| Unused uploaded inventory not public | Pass | `attached_assets` is removed from public and preview-render payload serialization. |
| Private preview stays authenticated | Pass | Existing preview flow retained and browser regression passed. |
| Explicit publish only | Pass | Upload flow test publishes only through confirmation. |
| RoomKey published-only | Pass | Browser upload lifecycle asserts RoomKey only follows published state. |
| File type and size controls | Pass | JPG/PNG/WEBP only; SVG/HTML/PDF/executable/mismatch/oversize tests reject. |
| Owner identity absent from new media URLs | Pass | New editor upload key is room/UUID based; backend test rejects legacy owner-scoped path shape. |
| Metadata validated before storage | Pass | Role and alt text are validated before media storage is called. |
| Storage secrets in frontend | Pass | Existing backend service-role handling retained; frontend receives only media URL and safe metadata. |
| Unsafe raw URL normal flow | Pass | Images workflow uploads or selects candidates; advanced URL mechanics remain demoted and existing URL validation retained. |
| Draft bytes storage-private | Not met | Current production bucket is public read; an unreferenced uploaded URL is unlisted/unguessable but not private if obtained. |
| SVG sanitization | Not applicable | SVG is blocked. |
| EXIF/GPS stripping | Deferred | No image processing pass is implemented. Operators must avoid uploading sensitive source metadata pending processing support. |

## Release Constraint

The public-read storage limitation is acceptable only for managed/operator-led pilots using non-sensitive imagery. A private draft storage/delivery design is required before paid or public self-serve upload.
