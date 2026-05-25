# Upload Policy

## Accepted Images

- `image/jpeg` with `.jpg` or `.jpeg`.
- `image/png` with `.png`.
- `image/webp` with `.webp`.
- Maximum size: 8 MB.

Both browser and backend inspect file type. The backend is authoritative and checks byte signature, declared MIME type, and extension consistency before storage.

## Rejected

- SVG.
- HTML or script-bearing non-images.
- PDF.
- Executable/binary uploads.
- Empty files.
- Files over 8 MB.
- Filename/MIME/signature mismatches.
- Unsupported image role metadata.

## Workflow

1. Owner opens Images and selects Upload.
2. Browser performs early type/signature/size checks.
3. Authenticated multipart request is sent to the owner-only room upload endpoint.
4. Backend confirms owner access and validates metadata before storage.
5. Backend validates bytes and stores the image under a UUID room image key.
6. A safe item is written to draft inventory.
7. Owner chooses `Use this image` to place it in a visible draft image role.
8. Public visitors see no draft assignment until `Open room to visitors`.

## Failure Copy

Failures are shown as recoverable image-selection errors. No raw storage error, stack trace, object key, credential, or internal access identity is shown in the normal owner flow.
