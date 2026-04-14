import { RequestContext } from '../domain/types';
import { emitPlaneLog } from './planeLog';

export type FalakLogCategory =
  | 'falak.route_guard'
  | 'falak.actor_resolution'
  | 'falak.policy_decision'
  | 'falak.approval_created'
  | 'falak.approval_vote'
  | 'falak.ledger_write'
  | 'falak.allocation_execute'
  | 'falak.rejected_operation'
  | 'falak.event_write';

export function falakContextFields(context: RequestContext): Record<string, unknown> {
  return {
    trace_id: context.traceId,
    tenant_id: context.tenantId,
    tenant_slug: context.tenantSlug,
    falak_execution_plane: context.plane,
    actor_id: context.actor?.id ?? null,
    actor_external_auth_id: context.actor?.externalAuthId ?? null,
    actor_resolution_source: context.actorResolution.source,
    actor_verified: context.actorResolution.isVerified,
    actor_token_audience: context.actorResolution.tokenAudience
  };
}

export function logFalak(
  category: FalakLogCategory,
  payload: Record<string, unknown>,
  level: 'debug' | 'info' | 'warn' | 'error' = 'info'
): void {
  const traceIdFromPayload = typeof payload.trace_id === 'string'
    ? payload.trace_id
    : typeof payload.traceId === 'string'
      ? payload.traceId
      : null;

  emitPlaneLog({
    plane: 'impact',
    serviceName: 'impact-service',
    eventName: category,
    level,
    correlationId: traceIdFromPayload,
    context: payload,
  });
}
