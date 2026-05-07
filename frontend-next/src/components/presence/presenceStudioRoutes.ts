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
    label: 'Studio',
    title: 'Presence Studio',
    summary: 'Home base for launch readiness, next actions, preview, and public-world preparation.',
    icon: LayoutDashboard,
  },
  {
    href: '/app/presence',
    label: 'Presence',
    title: 'Public identity',
    summary: 'Shape the name, headline, statements, images, and public context visitors meet first.',
    icon: UserRound,
  },
  {
    href: '/app/portfolio',
    label: 'World',
    title: 'World builder',
    summary: 'Read the Presence as a public world: statements, selected works, collections, and gaps.',
    icon: Palette,
  },
  {
    href: '/app/works',
    label: 'Works',
    title: 'Selected works',
    summary: 'Prepare individual works, proof objects, media, and visibility for the public world.',
    icon: Image,
  },
  {
    href: '/app/collections',
    label: 'Collections',
    title: 'Collections studio',
    summary: 'Group works into rooms, series, dossiers, shelves, or archive bodies.',
    icon: FolderOpen,
  },
  {
    href: '/app/enquiries',
    label: 'Enquiries',
    title: 'Opportunity inbox',
    summary: 'Review incoming conversations and decide what should happen next.',
    icon: Inbox,
  },
  {
    href: '/app/qr-nfc',
    label: 'QR/NFC',
    title: 'Physical-world bridge',
    summary: 'Create scan surfaces for cards, walls, labels, venues, flyers, and gatherings.',
    icon: QrCode,
  },
  {
    href: '/app/analytics',
    label: 'Signals',
    title: 'Audience signals',
    summary: 'Read views, enquiries, and scan activity without pretending it is a full analytics suite.',
    icon: BarChart3,
  },
  {
    href: '/app/settings',
    label: 'Launch',
    title: 'Launch controls',
    summary: 'Review publication state, public route, and safe publish or unpublish controls.',
    icon: Settings2,
  },
];

export const presenceStudioQuickRoutes = [
  presenceStudioRoutes[0],
  presenceStudioRoutes[2],
  presenceStudioRoutes[3],
  presenceStudioRoutes[5],
  presenceStudioRoutes[6],
];

export const presenceStudioWorkspaceRoutes = presenceStudioRoutes.filter((route) => route.href !== '/app/dashboard');
