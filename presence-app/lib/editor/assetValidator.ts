export interface AssetValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

const LOCAL_PATH_PATTERNS = [
  /^[a-zA-Z]:[\\/]/,
  /^\\\\/,
  /^~[\\/]/,
  /^\/(?:Users|home|mnt|Volumes|var|tmp|private|etc)\//i,
  /\.\.(?:\/|\\)/,
  /(?:\/|\\)\.\.(?:\/|\\|$)/,
];

const SCRIPT_PATTERNS = [
  /<\s*script/i,
  /\bon[a-z]+\s*=/i,
  /javascript:/i,
  /vbscript:/i,
  /data:text\/html/i,
];

const SECRET_PATTERNS = [
  /(?:^|[?&#])(access[_-]?token|auth[_-]?token|token|secret|client[_-]?secret|api[_-]?key|signature|x-amz-signature|x-amz-credential)=/i,
  /(bearer|basic)\s+[a-z0-9._~+/=-]{16,}/i,
  /-----BEGIN\s+(?:RSA\s+)?PRIVATE\s+KEY-----/i,
];

const INTERNAL_HOST_PATTERNS = [
  /^localhost$/i,
  /^.+\.localhost$/i,
  /^.+\.local$/i,
  /^.+\.internal$/i,
  /^0\.0\.0\.0$/,
  /^127\./,
  /^10\./,
  /^192\.168\./,
  /^169\.254\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^\[?::1\]?$/i,
];

export function validateAssetUrl(rawUrl: string | null | undefined): AssetValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const url = String(rawUrl ?? "").trim();

  if (!url) {
    errors.push("Asset URL is required.");
    return { isValid: false, errors, warnings };
  }

  for (const pattern of LOCAL_PATH_PATTERNS) {
    if (pattern.test(url)) {
      errors.push("Local filesystem paths and traversal are not allowed for public assets.");
      break;
    }
  }

  for (const pattern of SCRIPT_PATTERNS) {
    if (pattern.test(url)) {
      errors.push("Script-like asset references are blocked.");
      break;
    }
  }

  for (const pattern of SECRET_PATTERNS) {
    if (pattern.test(url)) {
      errors.push("Asset URLs must not contain raw secrets, access tokens, or signed credentials.");
      break;
    }
  }

  if (/^file:/i.test(url)) errors.push("file: URLs are blocked.");
  if (/^data:/i.test(url)) errors.push("data: URLs are blocked for Presence editor assets.");

  if (url.startsWith("/")) {
    if (url.startsWith("//")) errors.push("Protocol-relative asset URLs are blocked. Use https://.");
    return { isValid: errors.length === 0, errors: unique(errors), warnings };
  }

  let parsed: URL | null = null;
  try {
    parsed = new URL(url);
  } catch {
    errors.push("Asset URL must be https:// or a root-relative public path.");
  }

  if (parsed) {
    if (parsed.protocol !== "https:") {
      errors.push("Asset URL must use https:// unless it is a root-relative public path.");
    }
    const host = parsed.hostname.replace(/^\[(.*)\]$/, "$1");
    if (INTERNAL_HOST_PATTERNS.some((pattern) => pattern.test(host))) {
      errors.push("Localhost and internal network hosts are blocked for public assets.");
    }
    if (parsed.username || parsed.password) {
      errors.push("Asset URLs must not include embedded credentials.");
    }
  }

  if (url.length > 2000) warnings.push("Asset URL is unusually long.");

  return { isValid: errors.length === 0, errors: unique(errors), warnings };
}

export function isAssetUrlSafe(url: string | null | undefined): boolean {
  return validateAssetUrl(url).isValid;
}

export function assetSafetyMessage(url: string | null | undefined): string | null {
  const result = validateAssetUrl(url);
  return result.errors[0] ?? result.warnings[0] ?? null;
}

function unique(values: string[]) {
  return Array.from(new Set(values));
}
