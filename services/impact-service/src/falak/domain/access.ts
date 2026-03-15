import { ResolvedActor } from './types';

export const RESTRICTED_READ_ROLE_NAMES = new Set([
  'tenant_admin',
  'system_admin',
  'curator',
  'cultural_custodian',
  'moderator'
]);

export function hasRestrictedReadAccess(actor: ResolvedActor | null): boolean {
  return Boolean(actor?.roles.some((role) => RESTRICTED_READ_ROLE_NAMES.has(role.roleName)));
}
