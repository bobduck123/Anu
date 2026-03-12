export type WindowType =
  | 'about'
  | 'links'
  | 'wall'
  | 'microcosms'
  | 'impact'
  | 'badges'
  | 'settings'
  | 'notes'
  | 'todos'
  | 'challenges'
  | 'timebank'
  | 'pixel-studio'
  | 'scroll-snap'
  | 'time-travel-gallery'
  | 'customization';

export type IconKind = 'image' | 'folder' | 'app' | 'file';

export interface DesktopIconData {
  id: string;
  kind: IconKind;
  label: string;
  x: number;
  y: number;
  windowType: WindowType;
}

export interface WindowState {
  id: string;
  type: WindowType;
  title: string;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  isOpen: boolean;
  isMinimized: boolean;
  isMaximized: boolean;
}

export type BgType = 'solid' | 'gradient' | 'image';
export type GradientType = 'linear' | 'radial' | 'conic';
export type ButtonStyle = 'rounded' | 'sharp' | 'pill' | 'ghost' | 'outline';
export type IconStyle = 'default' | 'minimal' | 'rounded' | 'square';
export type FontSize = 'small' | 'medium' | 'large';

export interface GradientStop {
  color: string;
  position: number; // 0-100
}

export interface DesktopTheme {
  // Background
  bgType: BgType;
  bgColor: string;
  bgGradient: {
    type: GradientType;
    angle: number;
    stops: GradientStop[];
  };
  bgImage: string;
  bgImageFit: 'cover' | 'contain' | 'fill' | 'tile';
  // Colors
  accentColor: string;
  textColor: string;
  windowBg: string;
  // Typography
  fontFamily: string;
  fontSize: FontSize;
  // Windows
  buttonStyle: ButtonStyle;
  borderRadius: number; // 0-24
  shadowIntensity: number; // 0-3
  windowBlur: number; // 0-40
  windowOpacity: number; // 0.1-1.0
  // Icons
  iconStyle: IconStyle;
}

export const GOOGLE_FONTS = [
  'Inter', 'Roboto', 'Poppins', 'Playfair Display', 'Space Mono',
  'JetBrains Mono', 'Press Start 2P', 'VT323', 'Lora', 'Fira Code',
  'DM Sans', 'Nunito', 'Merriweather', 'Source Code Pro', 'Oswald',
];

export const PRESET_THEMES: { name: string; theme: DesktopTheme }[] = [
  {
    name: 'Warm Beige',
    theme: {
      bgType: 'solid', bgColor: '#d4b5a8', bgGradient: { type: 'linear', angle: 135, stops: [{ color: '#d4b5a8', position: 0 }, { color: '#c4a598', position: 100 }] },
      bgImage: '', bgImageFit: 'cover',
      accentColor: '#8b6f5c', textColor: '#2d2520', windowBg: 'rgba(255,255,255,0.12)',
      fontFamily: 'Inter', fontSize: 'medium',
      buttonStyle: 'rounded', borderRadius: 12, shadowIntensity: 1, windowBlur: 20, windowOpacity: 0.85,
      iconStyle: 'default',
    },
  },
  {
    name: 'Cool Blue',
    theme: {
      bgType: 'solid', bgColor: '#a8c4d4', bgGradient: { type: 'linear', angle: 135, stops: [{ color: '#a8c4d4', position: 0 }, { color: '#98b4c4', position: 100 }] },
      bgImage: '', bgImageFit: 'cover',
      accentColor: '#5c7a8b', textColor: '#1a2a33', windowBg: 'rgba(255,255,255,0.12)',
      fontFamily: 'Inter', fontSize: 'medium',
      buttonStyle: 'rounded', borderRadius: 12, shadowIntensity: 1, windowBlur: 20, windowOpacity: 0.85,
      iconStyle: 'default',
    },
  },
  {
    name: 'Warm Gold',
    theme: {
      bgType: 'solid', bgColor: '#d4c4a8', bgGradient: { type: 'linear', angle: 135, stops: [{ color: '#d4c4a8', position: 0 }, { color: '#c4b498', position: 100 }] },
      bgImage: '', bgImageFit: 'cover',
      accentColor: '#8b7a5c', textColor: '#2d2820', windowBg: 'rgba(255,255,255,0.12)',
      fontFamily: 'Inter', fontSize: 'medium',
      buttonStyle: 'rounded', borderRadius: 12, shadowIntensity: 1, windowBlur: 20, windowOpacity: 0.85,
      iconStyle: 'default',
    },
  },
  {
    name: 'Dark Mode',
    theme: {
      bgType: 'solid', bgColor: '#2d2d2d', bgGradient: { type: 'linear', angle: 135, stops: [{ color: '#2d2d2d', position: 0 }, { color: '#1a1a1a', position: 100 }] },
      bgImage: '', bgImageFit: 'cover',
      accentColor: '#6b8cae', textColor: '#e0e0e0', windowBg: 'rgba(255,255,255,0.08)',
      fontFamily: 'Inter', fontSize: 'medium',
      buttonStyle: 'rounded', borderRadius: 12, shadowIntensity: 2, windowBlur: 20, windowOpacity: 0.8,
      iconStyle: 'default',
    },
  },
  {
    name: 'Midnight Purple',
    theme: {
      bgType: 'gradient', bgColor: '#1a1030', bgGradient: { type: 'linear', angle: 135, stops: [{ color: '#1a1030', position: 0 }, { color: '#2d1b4e', position: 50 }, { color: '#0f0a1a', position: 100 }] },
      bgImage: '', bgImageFit: 'cover',
      accentColor: '#a78bfa', textColor: '#e8e0f0', windowBg: 'rgba(160,130,220,0.1)',
      fontFamily: 'Inter', fontSize: 'medium',
      buttonStyle: 'pill', borderRadius: 16, shadowIntensity: 2, windowBlur: 24, windowOpacity: 0.75,
      iconStyle: 'rounded',
    },
  },
  {
    name: 'Forest Green',
    theme: {
      bgType: 'gradient', bgColor: '#1a2e1a', bgGradient: { type: 'linear', angle: 180, stops: [{ color: '#2d4a2d', position: 0 }, { color: '#1a2e1a', position: 100 }] },
      bgImage: '', bgImageFit: 'cover',
      accentColor: '#4ade80', textColor: '#d4e8d4', windowBg: 'rgba(74,222,128,0.08)',
      fontFamily: 'DM Sans', fontSize: 'medium',
      buttonStyle: 'rounded', borderRadius: 10, shadowIntensity: 1, windowBlur: 16, windowOpacity: 0.85,
      iconStyle: 'default',
    },
  },
  {
    name: 'Sunset Orange',
    theme: {
      bgType: 'gradient', bgColor: '#f97316', bgGradient: { type: 'linear', angle: 135, stops: [{ color: '#fbbf24', position: 0 }, { color: '#f97316', position: 50 }, { color: '#dc2626', position: 100 }] },
      bgImage: '', bgImageFit: 'cover',
      accentColor: '#1e293b', textColor: '#1e293b', windowBg: 'rgba(255,255,255,0.2)',
      fontFamily: 'Poppins', fontSize: 'medium',
      buttonStyle: 'pill', borderRadius: 16, shadowIntensity: 2, windowBlur: 20, windowOpacity: 0.9,
      iconStyle: 'rounded',
    },
  },
  {
    name: 'Ocean Deep',
    theme: {
      bgType: 'gradient', bgColor: '#0c1426', bgGradient: { type: 'linear', angle: 180, stops: [{ color: '#0c1426', position: 0 }, { color: '#1e3a5f', position: 50 }, { color: '#0c1426', position: 100 }] },
      bgImage: '', bgImageFit: 'cover',
      accentColor: '#38bdf8', textColor: '#bae6fd', windowBg: 'rgba(56,189,248,0.08)',
      fontFamily: 'Inter', fontSize: 'medium',
      buttonStyle: 'rounded', borderRadius: 12, shadowIntensity: 2, windowBlur: 24, windowOpacity: 0.75,
      iconStyle: 'minimal',
    },
  },
  {
    name: 'Neon Cyberpunk',
    theme: {
      bgType: 'solid', bgColor: '#0a0a0a', bgGradient: { type: 'linear', angle: 135, stops: [{ color: '#0a0a0a', position: 0 }, { color: '#1a0a2e', position: 100 }] },
      bgImage: '', bgImageFit: 'cover',
      accentColor: '#f0abfc', textColor: '#f0abfc', windowBg: 'rgba(240,171,252,0.06)',
      fontFamily: 'JetBrains Mono', fontSize: 'small',
      buttonStyle: 'sharp', borderRadius: 0, shadowIntensity: 3, windowBlur: 8, windowOpacity: 0.7,
      iconStyle: 'square',
    },
  },
  {
    name: 'Paper White',
    theme: {
      bgType: 'solid', bgColor: '#f5f0eb', bgGradient: { type: 'linear', angle: 135, stops: [{ color: '#f5f0eb', position: 0 }, { color: '#ebe5df', position: 100 }] },
      bgImage: '', bgImageFit: 'cover',
      accentColor: '#1a1a1a', textColor: '#1a1a1a', windowBg: 'rgba(255,255,255,0.6)',
      fontFamily: 'Lora', fontSize: 'medium',
      buttonStyle: 'rounded', borderRadius: 8, shadowIntensity: 1, windowBlur: 12, windowOpacity: 0.95,
      iconStyle: 'minimal',
    },
  },
  {
    name: 'Retro Terminal',
    theme: {
      bgType: 'solid', bgColor: '#0a0a0a', bgGradient: { type: 'linear', angle: 135, stops: [{ color: '#0a0a0a', position: 0 }, { color: '#0a1a0a', position: 100 }] },
      bgImage: '', bgImageFit: 'cover',
      accentColor: '#22c55e', textColor: '#22c55e', windowBg: 'rgba(34,197,94,0.06)',
      fontFamily: 'VT323', fontSize: 'large',
      buttonStyle: 'sharp', borderRadius: 0, shadowIntensity: 0, windowBlur: 0, windowOpacity: 0.9,
      iconStyle: 'square',
    },
  },
];

export interface DesktopState {
  icons: DesktopIconData[];
  windows: WindowState[];
  focusedWindowId: string | null;
  theme: DesktopTheme;
}

/** Build a CSS background string from theme */
export function buildBackground(theme: DesktopTheme): string {
  switch (theme.bgType) {
    case 'gradient': {
      const { type, angle, stops } = theme.bgGradient;
      const stopsStr = stops.map(s => `${s.color} ${s.position}%`).join(', ');
      if (type === 'radial') return `radial-gradient(circle, ${stopsStr})`;
      if (type === 'conic') return `conic-gradient(from ${angle}deg, ${stopsStr})`;
      return `linear-gradient(${angle}deg, ${stopsStr})`;
    }
    case 'image':
      if (!theme.bgImage) return theme.bgColor;
      return theme.bgColor; // Image is handled via <img> tag
    default:
      return theme.bgColor;
  }
}

/** Font size in px */
export function getFontSize(size: FontSize): number {
  switch (size) {
    case 'small': return 12;
    case 'large': return 16;
    default: return 14;
  }
}

/** Shadow CSS from intensity */
export function getShadow(intensity: number, focused: boolean): string {
  const base = focused ? 1.5 : 1;
  switch (intensity) {
    case 0: return 'none';
    case 1: return `0 ${4 * base}px ${12 * base}px rgba(0,0,0,0.1)`;
    case 2: return `0 ${12 * base}px ${32 * base}px rgba(0,0,0,0.2)`;
    case 3: return `0 ${24 * base}px ${48 * base}px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.05)`;
    default: return `0 ${12 * base}px ${24 * base}px rgba(0,0,0,0.15)`;
  }
}
