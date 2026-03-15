import { ServerResponse } from 'http';
import config from '../config';

export interface FalakUnavailableReason {
  code: string;
  message: string;
  statusCode: number;
  healthStatusCode?: number;
}

export interface FalakUnavailableResponse {
  statusCode: number;
  body: Record<string, unknown>;
}

function falakPath(url: string | undefined): string {
  return new URL(url ?? '/', 'http://localhost').pathname;
}

function falakRuntimePayload() {
  const routeGuardMode = process.env.FALAK_ROUTE_GUARD_MODE ?? 'disabled';
  const mapRouteGuardMode = process.env.FALAK_MAP_ROUTE_GUARD_MODE ?? routeGuardMode;

  return {
    route_guard_mode: routeGuardMode,
    dark_launch: routeGuardMode === 'disabled',
    map_route_guard_mode: mapRouteGuardMode,
    map_dark_launch: mapRouteGuardMode === 'disabled',
    degraded: true,
  };
}

export function buildFalakUnavailableResponse(
  url: string | undefined,
  reason: FalakUnavailableReason
): FalakUnavailableResponse {
  const path = falakPath(url);

  if (path === '/v1/falak/health') {
    const statusCode = reason.healthStatusCode ?? reason.statusCode;
    return {
      statusCode,
      body: {
        status: statusCode < 500 ? 'degraded' : 'error',
        service: 'impact-service',
        protocol: 'Falak Protocol',
        runtime: falakRuntimePayload(),
        dependencies: {
          database: config.hasDatabase ? 'configured' : 'missing',
          redis: config.hasRedis ? 'configured' : 'missing',
        },
        error: {
          code: reason.code,
          message: reason.message,
        },
      },
    };
  }

  if (path === '/v1/falak/readiness') {
    return {
      statusCode: reason.statusCode,
      body: {
        status: 'error',
        error: {
          code: reason.code,
          message: reason.message,
        },
      },
    };
  }

  return {
    statusCode: reason.statusCode,
    body: {
      error: {
        code: reason.code,
        message: reason.message,
      },
    },
  };
}

export function writeJsonResponse(
  res: ServerResponse,
  response: FalakUnavailableResponse
): void {
  res.statusCode = response.statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(response.body));
}
