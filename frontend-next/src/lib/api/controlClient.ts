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

export interface ControlTenantNode {
  id: number;
  name: string;
  slug: string;
  status: string;
  member_count?: number;
  created_at?: string;
}

export function listControlTenants() {
  return controlFetchJson<ControlTenantNode[]>('core/api/admin/tenants');
}

export function createControlTenant(payload: Record<string, unknown>) {
  return controlFetchJson<ControlTenantNode>('core/api/admin/tenants', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
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
