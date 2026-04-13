import logger from '../../utils/logger';
import { RequestContext } from '../domain/types';

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
    traceId: context.traceId,
    tenantId: context.tenantId,
    tenantSlug: context.tenantSlug,
    plane: context.plane,
    actorId: context.actor?.id ?? null,
    actorExternalAuthId: context.actor?.externalAuthId ?? null,
    actorResolutionSource: context.actorResolution.source,
    actorVerified: context.actorResolution.isVerified,
    actorTokenAudience: context.actorResolution.tokenAudience
  };
}

export function logFalak(
  category: FalakLogCategory,
  payload: Record<string, unknown>,
  level: 'debug' | 'info' | 'warn' | 'error' = 'info'
): void {
  logger[level](
    {
      ...payload,
      category
    },
    category
  );
}
