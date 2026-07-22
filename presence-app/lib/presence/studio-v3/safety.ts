const URL_PATTERN = /(?:[a-z][a-z0-9+.-]*:\/\/)|(?:\/\/)|(?:\bwww\.)|(?:\burl\s*\()|(?:\b(?:data|blob|file|mailto|javascript)\s*:)/i;
const LOCAL_PATH_PATTERN = /(?:(?<![a-z0-9])[a-z]:[\\/])|(?:\\\\)|(?:(?:^|[\s:=,(])\.{1,2}[\\/])|(?:\/(?:Users|home|var|etc|tmp|private)\/)|(?:[\\/][^\\/\s]+\.(?:png|jpe?g|webp|gif|svg|mp4|mp3|pdf|json|zip)(?:$|[\s,;)]))/i;
const SECRET_PATTERN = /(?:\bbearer\s+)|(?<![a-z0-9])(?:sk-[a-z0-9_-]{8,}|ghp_[a-z0-9]{8,}|xox[baprs]-[a-z0-9-]{8,})|(?:eyJ[a-z0-9_-]{8,}\.[a-z0-9_-]+\.)|(?<![A-Z0-9])AKIA[A-Z0-9]{16}(?![A-Z0-9])|(?:-----BEGIN\s+(?:RSA\s+)?PRIVATE\s+KEY-----)/i;
const EXECUTABLE_PATTERN = /<\s*(?:script|style|iframe|object|embed)\b|javascript\s*:|expression\s*\(/i;
const CREATOR_CODE_PATTERN = /<\s*\/?\s*[a-z][^>]*>|\b(?:eval|setTimeout|setInterval)\s*\(|\b(?:document\.cookie|window\.location)|\bon[a-z]+\s*=/i;
const CREDENTIAL_ASSIGNMENT_PATTERN = /\b(?:api[_ -]?key|client[_ -]?secret|password|private[_ -]?key|access[_ -]?token|refresh[_ -]?token|auth[_ -]?token)\s*[:=]\s*\S+/i;
const BASE64_PATTERN = /(?<![A-Za-z0-9+/_-])[A-Za-z0-9+/_-]{64,}={0,2}(?![A-Za-z0-9+/_-])/;
const BLOB_MARKER_PATTERN = /\b(?:base64|data64|blob)\s*[:=]/i;
const EMAIL_PATTERN = /[^@\s<>]+@[^@\s<>]+\.[^@\s<>]+/;
const DOMAIN_LIKE_PATTERN = /(?<![a-z0-9.-])(?:(?:(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}|(?:[0-9]{1,3}\.){3}[0-9]{1,3}|localhost)(?:[/:?#]|\.(?![a-z0-9-])|(?![a-z0-9.-]))|\[[0-9a-f:]{2,}\](?:[/:?#]|\.(?![a-z0-9-])|(?![a-z0-9.-])))/i;

export function containsForbiddenStudioV3Text(value: string, allowFingerprint = false): boolean {
  const candidates = [value];
  let decoded = value;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const next = decodeURIComponent(decoded);
      if (next === decoded) break;
      candidates.push(next);
      decoded = next;
    } catch {
      break;
    }
  }
  return candidates.some((candidate) => (
    URL_PATTERN.test(candidate) ||
    LOCAL_PATH_PATTERN.test(candidate) ||
    SECRET_PATTERN.test(candidate) ||
    EXECUTABLE_PATTERN.test(candidate) ||
    CREATOR_CODE_PATTERN.test(candidate) ||
    CREDENTIAL_ASSIGNMENT_PATTERN.test(candidate) ||
    (!allowFingerprint && BASE64_PATTERN.test(candidate)) ||
    BLOB_MARKER_PATTERN.test(candidate) ||
    EMAIL_PATTERN.test(candidate) ||
    DOMAIN_LIKE_PATTERN.test(candidate)
  ));
}
