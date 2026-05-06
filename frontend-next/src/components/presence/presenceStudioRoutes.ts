import type { LucideIcon } from 'lucide-react';
import {
  BarChart3,
  FolderOpen,
  Image,
  Inbox,
  LayoutDashboard,
  Palette,
  QrCode,
  Settings2,
  UserRound,
} from 'lucide-react';

export interface PresenceStudioRoute {
  href: string;
  label: string;
  title: string;
  summary: string;
  icon: LucideIcon;
  aliases?: string[];
}

export const presenceStudioRoutes: PresenceStudioRoute[] = [
  {
    href: '/app/dashboard',
    aliases: ['/app'],
    label: 'Dashboard',
    title: 'Presence Studio',
    summary: 'Portfolio-led home for the owner console and future operating workflows.',
    icon: LayoutDashboard,
  },
  {
    href: '/app/presence',
    label: 'Presence',
    title: 'Presence profile',
    summary: 'Edit the public profile surface that visitors see first.',
    icon: UserRound,
  },
  {
    href: '/app/portfolio',
    label: 'Portfolio',
    title: 'Portfolio direction',
    summary: 'Shape statements, visual mood, and template decisions for the public node.',
    icon: Palette,
  },
  {
    href: '/app/works',
    label: 'Works',
    title: 'Works library',
    summary: 'Prepare individual works, media, and future presentation order.',
    icon: Image,
  },
  {
    href: '/app/collections',
    label: 'Collections',
    title: 'Collections studio',
    summary: 'Group works into curated public sets and story arcs.',
    icon: FolderOpen,
  },
  {
    href: '/app/enquiries',
    label: 'Enquiries',
    title: 'Enquiry inbox',
    summary: 'Review incoming conversations and owner follow-up flows.',
    icon: Inbox,
  },
  {
    href: '/app/qr-nfc',
    label: 'QR/NFC',
    title: 'QR and NFC surfaces',
    summary: 'Manage scan surfaces that bridge the physical world to the public node.',
    icon: QrCode,
  },
  {
    href: '/app/analytics',
    label: 'Analytics',
    title: 'Audience signals',
    summary: 'Read views, enquiries, and scan activity without turning the studio into a spreadsheet.',
    icon: BarChart3,
  },
  {
    href: '/app/settings',
    label: 'Settings',
    title: 'Studio settings',
    summary: 'Control node status, visibility, template, and readiness surfaces.',
    icon: Settings2,
  },
];

export const presenceStudioQuickRoutes = [
  presenceStudioRoutes[0],
  presenceStudioRoutes[1],
  presenceStudioRoutes[5],
  presenceStudioRoutes[8],
];

export const presenceStudioWorkspaceRoutes = presenceStudioRoutes.filter((route) => route.href !== '/app/dashboard');
