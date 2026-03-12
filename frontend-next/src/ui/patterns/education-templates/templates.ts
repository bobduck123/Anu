import type { TemplateInfo } from './types';

export const TEMPLATE_REGISTRY: TemplateInfo[] = [
  {
    id: 'retro-pixel',
    name: 'Pixel Studio',
    description: 'Full pixel art editor with 8 tools, 100+ retro palettes, undo/redo, and export.',
    icon: '👾',
    preview: 'Interactive drawing tool: pencil, eraser, shapes, fill, select, color picker',
  },
  {
    id: 'time-travel',
    name: 'Time Travel Gallery',
    description: 'Interactive Met Museum art gallery with year dialer (1440-1940), user image uploads.',
    icon: '🏛️',
    preview: 'Browse art by decade across Renaissance to Impressionist periods',
  },
  {
    id: 'cosmic-clock',
    name: 'Cosmic Clock',
    description: 'Fully customizable 9-ring concentric clock with speed controls and editable events.',
    icon: '🌌',
    preview: 'Live-animated clock with 150+ events, category filters, and time simulation',
  },
  {
    id: 'scroll-snap',
    name: 'Scroll Snap',
    description: 'Full-page sections that snap into view with CSS transitions.',
    icon: '📜',
    preview: 'Clean, focused reading experience with smooth page transitions',
  },
  {
    id: 'zoom-center',
    name: 'Zoom Focus',
    description: 'Content zooms into center on scroll, creating depth and focus.',
    icon: '🔍',
    preview: 'Each section scales in as you scroll for cinematic immersion',
  },
  {
    id: 'physics-wire',
    name: 'Connected Wires',
    description: 'Sections connected by animated SVG wires between nodes.',
    icon: '⚡',
    preview: 'Interactive wire connections that draw as you progress',
  },
];
