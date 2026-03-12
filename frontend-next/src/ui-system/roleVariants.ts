import {
  User, Users, ShieldCheck, Store, Crown, Leaf,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface RoleVariant {
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  icon: LucideIcon;
}

export const roleVariants: Record<string, RoleVariant> = {
  participant: {
    label: 'Volunteer',
    color: 'var(--color-sage)',
    bgColor: 'var(--color-sage-light)',
    borderColor: 'var(--color-sage)',
    icon: User,
  },
  volunteer: {
    label: 'Volunteer',
    color: 'var(--color-sage)',
    bgColor: 'var(--color-sage-light)',
    borderColor: 'var(--color-sage)',
    icon: User,
  },
  organizer: {
    label: 'Organizer',
    color: 'var(--color-institutional)',
    bgColor: 'var(--color-institutional-light)',
    borderColor: 'var(--color-institutional)',
    icon: Users,
  },
  merchant: {
    label: 'Merchant',
    color: 'var(--color-accent)',
    bgColor: 'var(--color-accent-light)',
    borderColor: 'var(--color-accent)',
    icon: Store,
  },
  node_admin: {
    label: 'Tenant Admin',
    color: 'var(--color-forest)',
    bgColor: 'var(--color-forest-light)',
    borderColor: 'var(--color-forest)',
    icon: ShieldCheck,
  },
  platform_admin: {
    label: 'Super Admin',
    color: 'var(--color-danger)',
    bgColor: 'var(--color-danger-light)',
    borderColor: 'var(--color-danger)',
    icon: Crown,
  },
  board_member: {
    label: 'Board Member',
    color: 'var(--color-institutional)',
    bgColor: 'var(--color-institutional-light)',
    borderColor: 'var(--color-institutional)',
    icon: ShieldCheck,
  },
  treasury_guardian: {
    label: 'Treasury Guardian',
    color: 'var(--color-forest)',
    bgColor: 'var(--color-forest-light)',
    borderColor: 'var(--color-forest)',
    icon: Leaf,
  },
};

export function getRoleVariant(role: string): RoleVariant {
  return roleVariants[role] || roleVariants.participant;
}
