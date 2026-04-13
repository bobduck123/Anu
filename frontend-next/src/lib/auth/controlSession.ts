const DEFAULT_CONTROL_PLANE_HOSTS = ['control.anu.eco', 'localhost', '127.0.0.1'] as const;
const DEFAULT_CONTROL_SESSION_ROLES = [
  'admin',
  'platform_admin',
  'node_admin',
  'board_member',
  'treasury_guardian',
] as const;

export function normalizeHostname(input: string | null | undefined): string {
  if (!input) {
    return '';
  }

  const trimmed = input.trim().toLowerCase();
  if (!trimmed) {
    return '';
  }

  const withoutProtocol = trimmed.replace(/^https?:\/\//, '');
  return withoutProtocol.split(':')[0] ?? '';
}

export function parseControlPlaneHosts(raw: string | null | undefined): string[] {
  if (!raw) {
    return [];
  }

  return Array.from(
    new Set(
      raw
        .split(',')
        .map((host) => normalizeHostname(host))
        .filter(Boolean),
    ),
  );
}

export function getControlPlaneHostsFromEnv(raw = process.env.CONTROL_PLANE_HOSTS): string[] {
  const parsed = parseControlPlaneHosts(raw);
  if (parsed.length > 0) {
    return parsed;
  }

  return [...DEFAULT_CONTROL_PLANE_HOSTS];
}

export function isControlPlaneHost(hostname: string, controlPlaneHosts = getControlPlaneHostsFromEnv()): boolean {
  const normalized = normalizeHostname(hostname);
  if (!normalized) {
    return false;
  }

  return controlPlaneHosts.includes(normalized);
}

export function getRequestHostnameFromHeaders(headersLike: { get(name: string): string | null } | null | undefined): string {
  if (!headersLike) {
    return '';
  }

  const forwarded = headersLike.get('x-forwarded-host');
  if (forwarded) {
    return normalizeHostname(forwarded.split(',')[0]);
  }

  return normalizeHostname(headersLike.get('host'));
}

export function isControlRoutePath(pathname: string | null | undefined): boolean {
  if (!pathname) {
    return false;
  }

  return pathname === '/control' || pathname.startsWith('/control/');
}

export type ControlRouteAccessResult = {
  allowed: boolean;
  reason: 'control-host' | 'public-host';
  hostname: string;
  controlPlaneHosts: string[];
};

export function evaluateControlRouteAccess(
  hostname: string | null | undefined,
  controlPlaneHosts = getControlPlaneHostsFromEnv(),
): ControlRouteAccessResult {
  const normalizedHostname = normalizeHostname(hostname);
  const allowed = isControlPlaneHost(normalizedHostname, controlPlaneHosts);

  return {
    allowed,
    reason: allowed ? 'control-host' : 'public-host',
    hostname: normalizedHostname,
    controlPlaneHosts,
  };
}

export function getControlSessionRolesFromEnv(raw = process.env.CONTROL_PLANE_ALLOWED_ROLES): string[] {
  if (!raw) {
    return [...DEFAULT_CONTROL_SESSION_ROLES];
  }

  const parsed = raw
    .split(',')
    .map((role) => role.trim().toLowerCase())
    .filter(Boolean);

  if (parsed.length === 0) {
    return [...DEFAULT_CONTROL_SESSION_ROLES];
  }

  return Array.from(new Set(parsed));
}

export function hasControlSessionRole(
  role: string | null | undefined,
  allowedRoles = getControlSessionRolesFromEnv(),
): boolean {
  if (!role) {
    return false;
  }

  return allowedRoles.includes(role.trim().toLowerCase());
}
