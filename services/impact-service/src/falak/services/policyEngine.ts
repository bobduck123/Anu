import { FalakRepository, JsonObject, JsonValue, PolicyEvaluationInput, PolicyEvaluationResult, RequestContext } from '../domain/types';
import { falakContextFields, logFalak } from '../observability/falakTelemetry';

interface PolicyConditions {
  roles_any?: string[];
  roles_all?: string[];
  region_node_ids?: string[];
  tenant_scope?: 'same_tenant' | 'cross_tenant' | 'any';
  resource_visibility_in?: Array<'public' | 'tenant' | 'restricted'>;
  sensitivity_class_in?: string[];
  node_types_in?: string[];
  context_equals?: Record<string, JsonValue>;
  context_in?: Record<string, JsonValue[]>;
  context_number_gt?: Record<string, number>;
  approval_threshold?: number;
  require_actor?: boolean;
}

function isJsonObject(value: JsonValue | undefined): value is JsonObject {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function readStringArray(value: JsonValue | undefined): string[] | null | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
    return null;
  }

  return value as string[];
}

function readStringRecord(value: JsonValue | undefined): Record<string, JsonValue> | null | undefined {
  return isJsonObject(value) ? value : value === undefined ? undefined : null;
}

function readNumberRecord(value: JsonValue | undefined): Record<string, number> | null | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (!isJsonObject(value)) {
    return null;
  }

  const result: Record<string, number> = {};
  for (const [key, candidate] of Object.entries(value)) {
    if (typeof candidate !== 'number' || !Number.isFinite(candidate)) {
      return null;
    }
    result[key] = candidate;
  }

  return result;
}

function readBoolean(value: JsonValue | undefined): boolean | null {
  if (value === undefined) {
    return false;
  }

  return typeof value === 'boolean' ? value : null;
}

function readApprovalThreshold(value: JsonValue | undefined): number | null {
  if (value === undefined) {
    return null;
  }

  return typeof value === 'number' && Number.isInteger(value) && value > 0 ? value : null;
}

function normalizeConditions(raw: JsonObject): PolicyConditions | null {
  const rolesAny = readStringArray(raw.roles_any);
  const rolesAll = readStringArray(raw.roles_all);
  const regionNodeIds = readStringArray(raw.region_node_ids);
  const resourceVisibilityIn = readStringArray(raw.resource_visibility_in);
  const sensitivityClassIn = readStringArray(raw.sensitivity_class_in);
  const nodeTypesIn = readStringArray(raw.node_types_in);
  const contextEquals = readStringRecord(raw.context_equals);
  const contextInRaw = readStringRecord(raw.context_in);
  const contextNumberGt = readNumberRecord(raw.context_number_gt);
  const approvalThreshold = readApprovalThreshold(raw.approval_threshold);
  const requireActor = readBoolean(raw.require_actor);

  if (
    rolesAny === null ||
    rolesAll === null ||
    regionNodeIds === null ||
    resourceVisibilityIn === null ||
    sensitivityClassIn === null ||
    nodeTypesIn === null ||
    contextEquals === null ||
    contextInRaw === null ||
    contextNumberGt === null ||
    requireActor === null ||
    (raw.approval_threshold !== undefined && approvalThreshold === null)
  ) {
    return null;
  }

  let tenantScope: PolicyConditions['tenant_scope'];
  if (raw.tenant_scope === undefined) {
    tenantScope = undefined;
  } else if (
    raw.tenant_scope === 'same_tenant' ||
    raw.tenant_scope === 'cross_tenant' ||
    raw.tenant_scope === 'any'
  ) {
    tenantScope = raw.tenant_scope;
  } else {
    return null;
  }

  let contextIn: Record<string, JsonValue[]> | undefined;
  if (contextInRaw) {
    contextIn = {};
    for (const [path, candidates] of Object.entries(contextInRaw)) {
      if (!Array.isArray(candidates)) {
        return null;
      }
      contextIn[path] = candidates as JsonValue[];
    }
  }

  return {
    roles_any: rolesAny,
    roles_all: rolesAll,
    region_node_ids: regionNodeIds,
    tenant_scope: tenantScope,
    resource_visibility_in: resourceVisibilityIn as Array<'public' | 'tenant' | 'restricted'> | undefined,
    sensitivity_class_in: sensitivityClassIn,
    node_types_in: nodeTypesIn,
    context_equals: contextEquals,
    context_in: contextIn,
    context_number_gt: contextNumberGt,
    approval_threshold: approvalThreshold ?? undefined,
    require_actor: requireActor
  };
}

function readPath(source: JsonObject | undefined, path: string): JsonValue | undefined {
  if (!source) {
    return undefined;
  }

  return path.split('.').reduce<JsonValue | undefined>((current, key) => {
    if (current && typeof current === 'object' && !Array.isArray(current) && key in current) {
      return (current as JsonObject)[key];
    }
    return undefined;
  }, source);
}

function valuesEqual(left: JsonValue | undefined, right: JsonValue): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function readNumericValue(value: JsonValue | undefined): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export class PolicyEngine {
  constructor(private readonly repository: FalakRepository) {}

  async evaluate(context: RequestContext, input: PolicyEvaluationInput): Promise<PolicyEvaluationResult> {
    const policies = await this.repository.listPolicies(context.tenantId, input.resourceType, input.action);
    const matched = policies.flatMap((policy) => {
      const conditions = normalizeConditions(policy.conditions);
      if (!conditions || !this.matchesPolicy(context, input, conditions)) {
        return [];
      }

      return [{ policy, conditions }];
    });

    if (matched.length === 0) {
      const result: PolicyEvaluationResult = {
        decision: 'deny',
        matchedPolicyIds: [],
        reasons: ['No enabled policy matched this action'],
        requiredApprovals: null,
        approvalId: null
      };
      logFalak('falak.policy_decision', {
        ...falakContextFields(context),
        resourceType: input.resourceType,
        action: input.action,
        targetId: input.targetId ?? null,
        decision: result.decision,
        matchedPolicyIds: result.matchedPolicyIds,
        reasons: result.reasons,
        requiredApprovals: result.requiredApprovals
      }, 'warn');
      return result;
    }

    const denyPolicy = matched.find(({ policy }) => policy.effect === 'deny');
    if (denyPolicy) {
      const result: PolicyEvaluationResult = {
        decision: 'deny',
        matchedPolicyIds: matched.map(({ policy }) => policy.id),
        reasons: matched.map(({ policy }) => `Policy ${policy.name} matched (${policy.effect})`),
        requiredApprovals: null,
        approvalId: null
      };
      logFalak('falak.policy_decision', {
        ...falakContextFields(context),
        resourceType: input.resourceType,
        action: input.action,
        targetId: input.targetId ?? null,
        decision: result.decision,
        matchedPolicyIds: result.matchedPolicyIds,
        reasons: result.reasons,
        requiredApprovals: result.requiredApprovals
      }, 'warn');
      return result;
    }

    const approvalPolicies = matched.filter(({ policy }) => policy.effect === 'requires_approval');
    if (approvalPolicies.length > 0) {
      const requiredApprovals = Math.max(
        1,
        ...approvalPolicies.map(({ conditions }) => conditions.approval_threshold ?? 1)
      );

      const result: PolicyEvaluationResult = {
        decision: 'requires_approval',
        matchedPolicyIds: matched.map(({ policy }) => policy.id),
        reasons: matched.map(({ policy }) => `Policy ${policy.name} matched (${policy.effect})`),
        requiredApprovals,
        approvalId: null
      };
      logFalak('falak.policy_decision', {
        ...falakContextFields(context),
        resourceType: input.resourceType,
        action: input.action,
        targetId: input.targetId ?? null,
        decision: result.decision,
        matchedPolicyIds: result.matchedPolicyIds,
        reasons: result.reasons,
        requiredApprovals: result.requiredApprovals
      });
      return result;
    }

    const result: PolicyEvaluationResult = {
      decision: 'allow',
      matchedPolicyIds: matched.map(({ policy }) => policy.id),
      reasons: matched.map(({ policy }) => `Policy ${policy.name} matched (${policy.effect})`),
      requiredApprovals: null,
      approvalId: null
    };
    logFalak('falak.policy_decision', {
      ...falakContextFields(context),
      resourceType: input.resourceType,
      action: input.action,
      targetId: input.targetId ?? null,
      decision: result.decision,
      matchedPolicyIds: result.matchedPolicyIds,
      reasons: result.reasons,
      requiredApprovals: result.requiredApprovals
    });
    return result;
  }

  private matchesPolicy(context: RequestContext, input: PolicyEvaluationInput, conditions: PolicyConditions): boolean {
    const roleNames = context.actor?.roles.map((role) => role.roleName) ?? [];
    const regionIds = context.actor?.roles.map((role) => role.regionNodeId).filter(Boolean) ?? [];

    if (conditions.require_actor && !context.actor) {
      return false;
    }

    if (conditions.roles_any && !conditions.roles_any.some((role) => roleNames.includes(role))) {
      return false;
    }

    if (conditions.roles_all && !conditions.roles_all.every((role) => roleNames.includes(role))) {
      return false;
    }

    if (conditions.region_node_ids && !conditions.region_node_ids.some((regionId) => regionIds.includes(regionId))) {
      return false;
    }

    if (conditions.tenant_scope === 'cross_tenant' && input.targetTenantId === context.tenantId) {
      return false;
    }

    if (conditions.tenant_scope === 'same_tenant' && input.targetTenantId && input.targetTenantId !== context.tenantId) {
      return false;
    }

    if (conditions.resource_visibility_in && input.resourceVisibility && !conditions.resource_visibility_in.includes(input.resourceVisibility)) {
      return false;
    }

    if (conditions.sensitivity_class_in && input.sensitivityClass && !conditions.sensitivity_class_in.includes(input.sensitivityClass)) {
      return false;
    }

    if (conditions.node_types_in && input.nodeType && !conditions.node_types_in.includes(input.nodeType)) {
      return false;
    }

    if (conditions.context_equals) {
      for (const [path, expected] of Object.entries(conditions.context_equals)) {
        if (!valuesEqual(readPath(input.context, path), expected)) {
          return false;
        }
      }
    }

    if (conditions.context_in) {
      for (const [path, expected] of Object.entries(conditions.context_in)) {
        const actual = readPath(input.context, path);
        if (!expected.some((candidate) => valuesEqual(actual, candidate))) {
          return false;
        }
      }
    }

    if (conditions.context_number_gt) {
      for (const [path, threshold] of Object.entries(conditions.context_number_gt)) {
        const actual = readNumericValue(readPath(input.context, path));
        if (actual === null || actual <= threshold) {
          return false;
        }
      }
    }

    return true;
  }
}
