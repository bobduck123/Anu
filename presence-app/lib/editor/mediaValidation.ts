export const MAX_EDITOR_IMAGE_BYTES = 8 * 1024 * 1024;
export const ALLOWED_EDITOR_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

const extensions: Record<(typeof ALLOWED_EDITOR_IMAGE_TYPES)[number], string[]> = {
  "image/jpeg": ["jpg", "jpeg"],
  "image/png": ["png"],
  "image/webp": ["webp"],
};

export async function validateMediaUploadFile(file: File): Promise<string | null> {
  if (!file.name) return "Choose a JPG, PNG, or WEBP image to upload.";
  if (file.size <= 0) return "That image is empty. Choose another image.";
  if (file.size > MAX_EDITOR_IMAGE_BYTES) return "That image is too large. Choose an image under 8 MB.";
  if (!ALLOWED_EDITOR_IMAGE_TYPES.includes(file.type as (typeof ALLOWED_EDITOR_IMAGE_TYPES)[number])) {
    return "Choose a JPG, PNG, or WEBP image.";
  }

  const mimeType = file.type as (typeof ALLOWED_EDITOR_IMAGE_TYPES)[number];
  const extension = file.name.toLowerCase().split(".").pop() ?? "";
  if (!extensions[mimeType].includes(extension)) return "The file name and image type do not match.";

  const header = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  const sniffed = sniffImageType(header);
  if (sniffed !== mimeType) return "The file contents do not match this image type.";
  return null;
}

function sniffImageType(header: Uint8Array): string | null {
  if (header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff) return "image/jpeg";
  if (
    header[0] === 0x89 &&
    header[1] === 0x50 &&
    header[2] === 0x4e &&
    header[3] === 0x47 &&
    header[4] === 0x0d &&
    header[5] === 0x0a &&
    header[6] === 0x1a &&
    header[7] === 0x0a
  ) return "image/png";
  if (
    header[0] === 0x52 &&
    header[1] === 0x49 &&
    header[2] === 0x46 &&
    header[3] === 0x46 &&
    header[8] === 0x57 &&
    header[9] === 0x45 &&
    header[10] === 0x42 &&
    header[11] === 0x50
  ) return "image/webp";
  return null;
}
