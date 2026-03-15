import { errors } from '../../utils/errors';
import { FanoutMessage, PolicyEvaluationResult } from '../domain/types';
import { FanoutPublisher } from './fanoutPublisher';

export function assertPolicyAllows(
  decision: PolicyEvaluationResult,
  options?: {
    deniedMessage?: string;
    approvalMessage?: string;
  }
): void {
  if (decision.decision === 'allow') {
    return;
  }

  if (decision.decision === 'requires_approval') {
    throw errors.forbidden(
      options?.approvalMessage ?? 'Approval required before this workflow can proceed',
      'APPROVAL_REQUIRED'
    );
  }

  throw errors.forbidden(
    options?.deniedMessage ?? 'Mutation denied by Falak policy',
    'POLICY_DENIED'
  );
}

export async function publishFanoutMessages(
  fanoutPublisher: FanoutPublisher,
  messages: readonly FanoutMessage[]
): Promise<void> {
  for (const message of messages) {
    try {
      await fanoutPublisher.publish(message);
    } catch (error) {
      throw errors.internal(
        error instanceof Error
          ? `Mutation committed but fanout publish failed: ${error.message}`
          : 'Mutation committed but fanout publish failed',
        'FANOUT_PUBLISH_FAILED'
      );
    }
  }
}
