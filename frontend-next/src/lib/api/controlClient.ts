export interface ControlApiErrorPayload {
  code: string;
  message: string;
  trace_id?: string;
  details?: unknown;
}

export class ControlApiError extends Error {
  status: number;
  code: string;
  traceId?: string;
  details?: unknown;

  constructor(status: number, payload: ControlApiErrorPayload) {
    super(payload.message);
    this.status = status;
    this.code = payload.code;
    this.traceId = payload.trace_id;
    this.details = payload.details;
  }
}

function normalizeControlProxyPath(path: string): string {
  return path.replace(/^\/+/, '');
}

async function parseControlError(response: Response): Promise<ControlApiErrorPayload> {
  const payload = await response.json().catch(() => null);
  const errorPayload = payload?.error || payload;

  const code = typeof errorPayload?.code === 'string' ? errorPayload.code : 'control_proxy_error';
  const message =
    typeof errorPayload?.message === 'string'
      ? errorPayload.message
      : `Control proxy request failed (${response.status}).`;
  const traceId = typeof errorPayload?.trace_id === 'string' ? errorPayload.trace_id : undefined;

  return {
    code,
    message,
    trace_id: traceId,
    details: errorPayload?.details,
  };
}

export async function controlFetchJson<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(`/api/control/${normalizeControlProxyPath(path)}`, {
    ...options,
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers || {}),
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new ControlApiError(response.status, await parseControlError(response));
  }

  return (await response.json()) as T;
}

function unwrapData<T>(payload: T | { data: T }): T {
  if (payload && typeof payload === 'object' && 'data' in (payload as Record<string, unknown>)) {
    return (payload as { data: T }).data;
  }
  return payload as T;
}

export interface ControlTenantNode {
  id: number;
  name: string;
  slug: string;
  status: string;
  member_count?: number;
  created_at?: string;
}

export interface ManifestAuthoringNavItem {
  label: string;
  href: string;
  module?: string | null;
}

export interface ManifestAuthoringLink {
  label: string;
  href: string;
}

export interface ControlSiteManifestAuthoringPayload {
  node_id: number;
  node_slug: string;
  revision_token: string;
  published_revision_token?: string;
  published_at?: string | null;
  published_by?: string | null;
  authoring: {
    site_name?: string;
    tagline?: string;
    logo_asset_ref?: string | null;
    favicon_asset_ref?: string | null;
    theme_tokens?: {
      primary_color?: string | null;
      secondary_color?: string | null;
      accent_color?: string | null;
    };
    nav_items?: ManifestAuthoringNavItem[];
    enabled_modules?: string[];
    footer_links?: ManifestAuthoringLink[];
    legal_links?: Record<string, string>;
    trust_links?: Record<string, string>;
    contact?: {
      email?: string | null;
      public_contact_url?: string;
      location_label?: string | null;
    };
  };
  read_only: {
    site_key: string;
    canonical_domains: string[];
    preview_host: string | null;
  };
  site_manifest: Record<string, unknown>;
  published_site_manifest?: Record<string, unknown>;
  audit?: Record<string, unknown>;
}

export type ControlSiteManifestAuthoringUpdate = Partial<ControlSiteManifestAuthoringPayload['authoring']>;

export function listControlTenants() {
  return controlFetchJson<ControlTenantNode[] | { data: ControlTenantNode[] }>('core/api/admin/tenants').then((payload) =>
    unwrapData<ControlTenantNode[]>(payload),
  );
}

export function getControlSiteManifestAuthoring(nodeId: number) {
  return controlFetchJson<ControlSiteManifestAuthoringPayload | { data: ControlSiteManifestAuthoringPayload }>(
    `core/control/sites/${nodeId}/manifest-authoring`,
  ).then((payload) => unwrapData<ControlSiteManifestAuthoringPayload>(payload));
}

export function updateControlSiteManifestAuthoring(
  nodeId: number,
  revisionToken: string,
  payload: ControlSiteManifestAuthoringUpdate,
) {
  return controlFetchJson<ControlSiteManifestAuthoringPayload | { data: ControlSiteManifestAuthoringPayload }>(
    `core/control/sites/${nodeId}/manifest-authoring`,
    {
      method: 'PATCH',
      body: JSON.stringify({
        revision_token: revisionToken,
        ...payload,
      }),
    },
  ).then((responsePayload) => unwrapData<ControlSiteManifestAuthoringPayload>(responsePayload));
}

export function publishControlSiteManifestAuthoring(nodeId: number, revisionToken: string) {
  return controlFetchJson<ControlSiteManifestAuthoringPayload | { data: ControlSiteManifestAuthoringPayload }>(
    `core/control/sites/${nodeId}/manifest-authoring/publish`,
    {
      method: 'POST',
      body: JSON.stringify({ revision_token: revisionToken }),
    },
  ).then((responsePayload) => unwrapData<ControlSiteManifestAuthoringPayload>(responsePayload));
}

export function createControlTenant(payload: Record<string, unknown>) {
  return controlFetchJson<ControlTenantNode>('core/api/admin/tenants', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export interface ControlSiteBootstrapInput {
  node_name: string;
  node_slug?: string;
  site_name: string;
  site_key?: string;
  tagline?: string;
  canonical_domains?: string[];
  operator_usernames?: string[];
}

export interface ControlSiteBootstrapPayload {
  node: {
    id: number;
    name: string;
    slug: string;
    status: string;
  };
  site_manifest: {
    site_key: string;
    site_name: string;
    tagline: string;
    canonical_domains: string[];
    preview_host?: string | null;
  };
  domain_bindings: {
    canonical_domains: string[];
    count: number;
  };
  operator_assignments: {
    usernames: string[];
    user_ids: number[];
    count: number;
  };
  audit?: Record<string, unknown>;
}

export function createControlSiteBootstrap(payload: ControlSiteBootstrapInput) {
  return controlFetchJson<ControlSiteBootstrapPayload | { data: ControlSiteBootstrapPayload }>('core/control/sites/bootstrap', {
    method: 'POST',
    body: JSON.stringify(payload),
  }).then((responsePayload) => unwrapData<ControlSiteBootstrapPayload>(responsePayload));
}

export interface ControlRuntimeEndpointProbe {
  endpoint: string;
  proxyPath: string;
}

export interface ControlRuntimeProbeResult {
  endpoint: string;
  ok: boolean;
  statusCode: number | null;
  statusText: string;
  payload: unknown;
  latencyMs: number | null;
}

const CONTROL_RUNTIME_ENDPOINTS: ControlRuntimeEndpointProbe[] = [
  { endpoint: '/_core/health', proxyPath: 'core/health' },
  { endpoint: '/_core/readiness', proxyPath: 'core/readiness' },
  { endpoint: '/_impact/v1/health', proxyPath: 'impact/v1/health' },
  { endpoint: '/_impact/v1/falak/health', proxyPath: 'impact/v1/falak/health' },
  { endpoint: '/_impact/v1/falak/readiness', proxyPath: 'impact/v1/falak/readiness' },
];

export async function probeControlRuntimeContracts(): Promise<ControlRuntimeProbeResult[]> {
  const results: ControlRuntimeProbeResult[] = [];

  for (const probe of CONTROL_RUNTIME_ENDPOINTS) {
    const start = performance.now();
    try {
      const response = await fetch(`/api/control/${probe.proxyPath}`, {
        method: 'GET',
        credentials: 'include',
        headers: { Accept: 'application/json' },
        cache: 'no-store',
      });

      let payload: unknown = null;
      try {
        payload = await response.json();
      } catch {
        payload = await response.text();
      }

      results.push({
        endpoint: probe.endpoint,
        ok: response.ok,
        statusCode: response.status,
        statusText: response.statusText,
        payload,
        latencyMs: Math.round((performance.now() - start) * 100) / 100,
      });
    } catch (error) {
      results.push({
        endpoint: probe.endpoint,
        ok: false,
        statusCode: null,
        statusText: error instanceof Error ? error.message : 'Request failed',
        payload: null,
        latencyMs: Math.round((performance.now() - start) * 100) / 100,
      });
    }
  }

  return results;
}

export interface ControlOperatorAssignmentsPayload {
  node_id: number;
  assignments: {
    usernames: string[];
    user_ids: number[];
    count: number;
  };
  mutation?: {
    action: 'assign' | 'unassign';
    requested_username: string;
    normalized_username: string;
    operator_user_id: number | null;
    applied: boolean;
    idempotent_noop: boolean;
  };
}

export interface ControlSiteDomainBinding {
  domain: string;
  status: string;
  tls_ready: boolean;
  created_at: string | null;
}

export interface ControlSiteDomainBindingsPayload {
  node_id: number;
  node_slug: string;
  canonical_domains: string[];
  domain_bindings: ControlSiteDomainBinding[];
  mutation?: {
    applied: boolean;
    added_domains: string[];
    removed_domains: string[];
    normalized_domains: string[];
    idempotent_noop: boolean;
  };
}

export interface ControlSitePublishReadinessIssue {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface ControlSitePublishReadinessPayload {
  node_id: number;
  node_slug: string;
  ready: boolean;
  blocking_issues: ControlSitePublishReadinessIssue[];
  warnings: ControlSitePublishReadinessIssue[];
  checks: {
    canonical_domain_binding_present: boolean;
    published_manifest_present: boolean;
    required_legal_links_present: boolean;
    required_trust_links_present: boolean;
  };
}

export function normalizeControlOperatorUsername(input: string): string {
  return input.trim().toLowerCase();
}

export function getControlSiteOperatorAssignments(nodeId: number) {
  return controlFetchJson<ControlOperatorAssignmentsPayload | { data: ControlOperatorAssignmentsPayload }>(
    `core/control/sites/${nodeId}/operator-assignments`,
  ).then((payload) => unwrapData<ControlOperatorAssignmentsPayload>(payload));
}

export function assignControlSiteOperatorUsername(nodeId: number, username: string) {
  return controlFetchJson<ControlOperatorAssignmentsPayload | { data: ControlOperatorAssignmentsPayload }>(
    `core/control/sites/${nodeId}/operator-assignments`,
    {
      method: 'POST',
      body: JSON.stringify({
        username: normalizeControlOperatorUsername(username),
      }),
    },
  ).then((payload) => unwrapData<ControlOperatorAssignmentsPayload>(payload));
}

export function unassignControlSiteOperatorUsername(nodeId: number, username: string) {
  return controlFetchJson<ControlOperatorAssignmentsPayload | { data: ControlOperatorAssignmentsPayload }>(
    `core/control/sites/${nodeId}/operator-assignments/${encodeURIComponent(normalizeControlOperatorUsername(username))}`,
    {
      method: 'DELETE',
    },
  ).then((payload) => unwrapData<ControlOperatorAssignmentsPayload>(payload));
}

export function normalizeControlCanonicalDomain(input: string): string {
  return input.trim().toLowerCase().replace(/\.$/, '');
}

export function getControlSiteDomainBindings(nodeId: number) {
  return controlFetchJson<ControlSiteDomainBindingsPayload | { data: ControlSiteDomainBindingsPayload }>(
    `core/control/sites/${nodeId}/domain-bindings`,
  ).then((payload) => unwrapData<ControlSiteDomainBindingsPayload>(payload));
}

export function updateControlSiteDomainBindings(nodeId: number, canonicalDomains: string[]) {
  return controlFetchJson<ControlSiteDomainBindingsPayload | { data: ControlSiteDomainBindingsPayload }>(
    `core/control/sites/${nodeId}/domain-bindings`,
    {
      method: 'PUT',
      body: JSON.stringify({
        canonical_domains: canonicalDomains.map(normalizeControlCanonicalDomain).filter(Boolean),
      }),
    },
  ).then((payload) => unwrapData<ControlSiteDomainBindingsPayload>(payload));
}

export function getControlSitePublishReadiness(nodeId: number) {
  return controlFetchJson<ControlSitePublishReadinessPayload | { data: ControlSitePublishReadinessPayload }>(
    `core/control/sites/${nodeId}/publish-readiness`,
  ).then((payload) => unwrapData<ControlSitePublishReadinessPayload>(payload));
}
