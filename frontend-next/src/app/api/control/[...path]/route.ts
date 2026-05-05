import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabaseServerClient } from '@/lib/supabase/server';
import { getCoreApiOrigin, getImpactApiOrigin } from '@/lib/runtime';
import { emitPlaneLog } from '@/lib/observability/planeLog';
import {
  evaluateControlRouteAccess,
  getControlPlaneHostsFromEnv,
  getRequestHostnameFromHeaders,
  hasControlSessionRole,
} from '@/lib/auth/controlSession';

type ProxyTarget = 'core' | 'impact';

type ProxyRule = {
  id: string;
  target: ProxyTarget;
  methods: readonly string[];
  pathPattern: RegExp;
  routeFamily: string;
  requiresPrivilegedAuth: boolean;
};

const PROXY_RULES: readonly ProxyRule[] = [
  {
    id: 'core-admin-tenants-collection',
    target: 'core',
    methods: ['GET', 'POST'],
    pathPattern: /^\/api\/admin\/tenants\/?$/,
    routeFamily: 'core-admin-tenants',
    requiresPrivilegedAuth: true,
  },
  {
    id: 'core-admin-tenants-item',
    target: 'core',
    methods: ['GET'],
    pathPattern: /^\/api\/admin\/tenants\/\d+\/?$/,
    routeFamily: 'core-admin-tenants',
    requiresPrivilegedAuth: true,
  },
  {
    id: 'core-admin-tenants-mutations',
    target: 'core',
    methods: ['PATCH'],
    pathPattern: /^\/api\/admin\/tenants\/\d+\/(?:modules|branding|white-label)\/?$/,
    routeFamily: 'core-admin-tenants',
    requiresPrivilegedAuth: true,
  },
  {
    id: 'core-control-endpoints',
    target: 'core',
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
    pathPattern: /^\/control\/[a-z0-9/_-]+$/,
    routeFamily: 'core-control',
    requiresPrivilegedAuth: true,
  },
  {
    id: 'core-runtime-health',
    target: 'core',
    methods: ['GET'],
    pathPattern: /^\/(?:health|readiness)$/,
    routeFamily: 'core-runtime-health',
    requiresPrivilegedAuth: false,
  },
  {
    id: 'impact-runtime-health',
    target: 'impact',
    methods: ['GET'],
    pathPattern: /^\/v1\/(?:health|falak\/health|falak\/readiness)$/,
    routeFamily: 'impact-runtime-health',
    requiresPrivilegedAuth: false,
  },
  {
    id: 'impact-control-endpoints',
    target: 'impact',
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
    pathPattern: /^\/v1\/falak\/control\/[a-z0-9/_-]+$/,
    routeFamily: 'impact-control',
    requiresPrivilegedAuth: true,
  },
] as const;

type RouteParams = { path?: string[] };
type RouteContext = { params: RouteParams | Promise<RouteParams> };

type ControlSession = {
  userId: string;
  role: string;
  publicAccessToken: string;
};

function logControlProxyEvent(
  traceIdValue: string,
  eventName: string,
  level: 'debug' | 'info' | 'warn' | 'error' = 'info',
  context?: Record<string, unknown>,
) {
  emitPlaneLog({
    plane: 'control',
    serviceName: 'frontend-next',
    eventName,
    level,
    correlationId: traceIdValue,
    context,
  });
}

function traceId(): string {
  return `anu06_${crypto.randomUUID()}`;
}

function jsonError(
  status: number,
  code: string,
  message: string,
  traceIdValue: string,
  details?: Record<string, unknown>,
) {
  return NextResponse.json(
    {
      error: {
        code,
        message,
        trace_id: traceIdValue,
        ...(details ? { details } : {}),
      },
    },
    {
      status,
      headers: {
        'Cache-Control': 'no-store',
      },
    },
  );
}

function extractSafeUpstreamErrorMessage(raw: unknown): string | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }

  const payload = raw as Record<string, unknown>;
  const maybeError = (payload.error as Record<string, unknown> | undefined) || payload;
  const message = typeof maybeError.message === 'string' ? maybeError.message.trim() : '';
  if (!message) {
    return null;
  }

  return message.slice(0, 180);
}

async function getPathParts(context: RouteContext): Promise<string[]> {
  const resolved = await context.params;
  return resolved.path || [];
}

function resolveRule(target: ProxyTarget, method: string, upstreamPath: string): ProxyRule | null {
  return (
    PROXY_RULES.find(
      (rule) => rule.target === target && rule.methods.includes(method.toUpperCase()) && rule.pathPattern.test(upstreamPath),
    ) || null
  );
}

async function resolveControlSession(): Promise<{ session: ControlSession | null; reason?: string }> {
  const supabase = await createSupabaseServerClient();
  const [{ data: userData }, { data: sessionData }] = await Promise.all([
    supabase.auth.getUser(),
    supabase.auth.getSession(),
  ]);

  const user = userData.user;
  const session = sessionData.session;
  if (!user || !session?.access_token) {
    return { session: null, reason: 'missing_session' };
  }

  const role = String(user.user_metadata?.role || '').trim().toLowerCase();
  if (!hasControlSessionRole(role)) {
    return { session: null, reason: 'insufficient_role' };
  }

  return {
    session: {
      userId: user.id,
      role,
      publicAccessToken: session.access_token,
    },
  };
}

async function mintControlToken(coreOrigin: string, publicAccessToken: string, traceIdValue: string): Promise<string | null> {
  const response = await fetch(`${coreOrigin}/auth/control-token`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${publicAccessToken}`,
      'x-control-proxy-trace-id': traceIdValue,
    },
    body: JSON.stringify({ requires_mfa: true }),
    cache: 'no-store',
  });

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json().catch(() => null)) as { access_token?: string } | null;
  const accessToken = payload?.access_token?.trim();
  return accessToken || null;
}

function resolveTargetOrigin(target: ProxyTarget): string | null {
  if (target === 'core') {
    return getCoreApiOrigin();
  }
  return getImpactApiOrigin();
}

function getControlPlaneSharedSecret(): string | null {
  const configured = process.env.CONTROL_PLANE_SHARED_SECRET || process.env.CONTROL_PLANE_SECRET_HEADER || '';
  const trimmed = configured.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function requiresCoreControlSharedSecret(rule: ProxyRule): boolean {
  return rule.requiresPrivilegedAuth && rule.target === 'core';
}

async function forwardControlRequest(
  request: NextRequest,
  upstreamUrl: string,
  rule: ProxyRule,
  controlSession: ControlSession,
  traceIdValue: string,
  requestHostname: string,
): Promise<NextResponse> {
  const coreOrigin = getCoreApiOrigin();
  if (rule.requiresPrivilegedAuth && !coreOrigin) {
    logControlProxyEvent(traceIdValue, 'control_proxy_core_origin_missing', 'error', {
      routeFamily: rule.routeFamily,
      target: rule.target,
    });
    return jsonError(503, 'control_core_origin_missing', 'Control core origin is not configured.', traceIdValue);
  }

  let controlAccessToken: string | null = null;
  if (rule.requiresPrivilegedAuth) {
    if (requiresCoreControlSharedSecret(rule) && process.env.NODE_ENV === 'production' && !getControlPlaneSharedSecret()) {
      logControlProxyEvent(traceIdValue, 'control_proxy_shared_secret_missing', 'error', {
        routeFamily: rule.routeFamily,
        target: rule.target,
      });
      return jsonError(503, 'control_shared_secret_missing', 'Control plane shared secret is not configured.', traceIdValue);
    }

    controlAccessToken = await mintControlToken(coreOrigin as string, controlSession.publicAccessToken, traceIdValue);
    if (!controlAccessToken) {
      logControlProxyEvent(traceIdValue, 'control_proxy_privileged_token_denied', 'warn', {
        routeFamily: rule.routeFamily,
        target: rule.target,
        actorRole: controlSession.role,
      });
      return jsonError(403, 'control_token_denied', 'Unable to establish privileged control session.', traceIdValue);
    }
  }

  const outgoingHeaders: Record<string, string> = {
    Accept: request.headers.get('accept') || 'application/json',
    'x-control-proxy': 'anu-006',
    'x-control-proxy-trace-id': traceIdValue,
    'x-control-proxy-route-family': rule.routeFamily,
    'x-control-proxy-target': rule.target,
    'x-control-proxy-actor-id': controlSession.userId,
    'x-control-proxy-actor-role': controlSession.role,
    'x-control-proxy-host': requestHostname,
  };

  const contentType = request.headers.get('content-type');
  if (contentType) {
    outgoingHeaders['Content-Type'] = contentType;
  }
  if (controlAccessToken) {
    outgoingHeaders.Authorization = `Bearer ${controlAccessToken}`;
  }
  const controlSharedSecret = requiresCoreControlSharedSecret(rule) ? getControlPlaneSharedSecret() : null;
  if (controlSharedSecret) {
    outgoingHeaders['X-Control-Plane-Secret'] = controlSharedSecret;
  }

  let body: BodyInit | undefined;
  if (!['GET', 'HEAD'].includes(request.method.toUpperCase())) {
    const raw = await request.arrayBuffer();
    if (raw.byteLength > 0) {
      body = raw;
    }
  }

  const upstreamResponse = await fetch(upstreamUrl, {
    method: request.method,
    headers: outgoingHeaders,
    body,
    cache: 'no-store',
    redirect: 'manual',
  });

  if (!upstreamResponse.ok) {
    const upstreamPayload = await upstreamResponse.json().catch(() => null);
    logControlProxyEvent(traceIdValue, 'control_proxy_upstream_error', 'warn', {
      routeFamily: rule.routeFamily,
      target: rule.target,
      upstreamStatus: upstreamResponse.status,
    });
    return jsonError(
      upstreamResponse.status,
      'upstream_control_error',
      extractSafeUpstreamErrorMessage(upstreamPayload) || 'Upstream control request failed.',
      traceIdValue,
      {
        route_family: rule.routeFamily,
        target: rule.target,
      },
    );
  }

  const responseHeaders = new Headers();
  responseHeaders.set('Cache-Control', 'no-store');
  responseHeaders.set('x-control-proxy-trace-id', traceIdValue);
  const upstreamContentType = upstreamResponse.headers.get('content-type');
  if (upstreamContentType) {
    responseHeaders.set('Content-Type', upstreamContentType);
  }

  const payload = await upstreamResponse.arrayBuffer();
  logControlProxyEvent(traceIdValue, 'control_proxy_forward_success', 'info', {
    routeFamily: rule.routeFamily,
    target: rule.target,
    upstreamStatus: upstreamResponse.status,
    actorRole: controlSession.role,
  });
  return new NextResponse(payload.byteLength ? payload : null, {
    status: upstreamResponse.status,
    headers: responseHeaders,
  });
}

async function handle(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  const requestHostname = getRequestHostnameFromHeaders(request.headers);
  const traceIdValue = traceId();

  const controlAccess = evaluateControlRouteAccess(requestHostname, getControlPlaneHostsFromEnv());
  if (!controlAccess.allowed) {
    logControlProxyEvent(traceIdValue, 'control_proxy_host_rejected', 'warn', {
      host: requestHostname,
      pathname: request.nextUrl.pathname,
      method: request.method,
    });
    return jsonError(403, 'control_host_required', 'Control proxy is only available on control hosts.', traceIdValue);
  }

  const controlSessionResult = await resolveControlSession();
  if (!controlSessionResult.session) {
    const status = controlSessionResult.reason === 'insufficient_role' ? 403 : 401;
    const code = controlSessionResult.reason === 'insufficient_role' ? 'control_role_required' : 'control_session_required';
    const message =
      controlSessionResult.reason === 'insufficient_role'
        ? 'Control role is required for this proxy route.'
        : 'A valid control session is required.';
    logControlProxyEvent(traceIdValue, 'control_proxy_session_rejected', 'warn', {
      reason: controlSessionResult.reason ?? 'missing_session',
      host: requestHostname,
      pathname: request.nextUrl.pathname,
    });
    return jsonError(status, code, message, traceIdValue);
  }

  const pathParts = await getPathParts(context);
  if (pathParts.length < 2) {
    logControlProxyEvent(traceIdValue, 'control_proxy_route_incomplete', 'warn', {
      pathname: request.nextUrl.pathname,
      method: request.method,
    });
    return jsonError(404, 'control_route_not_found', 'Control proxy route is incomplete.', traceIdValue);
  }

  const [targetRaw, ...upstreamParts] = pathParts;
  const target = (targetRaw || '').toLowerCase() as ProxyTarget;
  if (target !== 'core' && target !== 'impact') {
    logControlProxyEvent(traceIdValue, 'control_proxy_target_rejected', 'warn', {
      target: targetRaw,
      pathname: request.nextUrl.pathname,
    });
    return jsonError(404, 'control_target_not_supported', 'Control proxy target is not supported.', traceIdValue);
  }

  const upstreamPath = `/${upstreamParts.join('/')}`;
  const rule = resolveRule(target, request.method, upstreamPath);
  if (!rule) {
    logControlProxyEvent(traceIdValue, 'control_proxy_route_not_allowlisted', 'warn', {
      target,
      method: request.method,
      upstreamPath,
    });
    return jsonError(404, 'control_route_not_allowlisted', 'Route is not allowlisted for control proxy forwarding.', traceIdValue);
  }

  const targetOrigin = resolveTargetOrigin(target);
  if (!targetOrigin) {
    logControlProxyEvent(traceIdValue, 'control_proxy_origin_missing', 'error', {
      target,
      routeFamily: rule.routeFamily,
    });
    return jsonError(503, 'control_upstream_origin_missing', 'Upstream origin is not configured for this control target.', traceIdValue);
  }

  const upstreamUrl = `${targetOrigin}${upstreamPath}${request.nextUrl.search}`;

  try {
    return await forwardControlRequest(request, upstreamUrl, rule, controlSessionResult.session, traceIdValue, requestHostname);
  } catch {
    logControlProxyEvent(traceIdValue, 'control_proxy_upstream_unreachable', 'error', {
      routeFamily: rule.routeFamily,
      target,
      upstreamUrl,
    });
    return jsonError(502, 'control_upstream_unreachable', 'Control proxy could not reach upstream service.', traceIdValue, {
      route_family: rule.routeFamily,
      target,
    });
  }
}

export async function GET(request: NextRequest, context: RouteContext) {
  return handle(request, context);
}

export async function POST(request: NextRequest, context: RouteContext) {
  return handle(request, context);
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  return handle(request, context);
}

export async function PUT(request: NextRequest, context: RouteContext) {
  return handle(request, context);
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  return handle(request, context);
}

export const __testables = {
  resolveRule,
  getControlPlaneSharedSecret,
};
