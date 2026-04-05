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
      bgType: 'solid', bgColor: '#f6d4cb', bgGradient: { type: 'linear', angle: 135, stops: [{ color: '#f6d4cb', position: 0 }, { color: '#f6d4cb', position: 100 }] },
      bgImage: '', bgImageFit: 'cover',
      accentColor: '#7c413c', textColor: '#1e0227', windowBg: 'rgba(246,212,203,0.12)',
      fontFamily: 'Inter', fontSize: 'medium',
      buttonStyle: 'rounded', borderRadius: 12, shadowIntensity: 1, windowBlur: 20, windowOpacity: 0.85,
      iconStyle: 'default',
    },
  },
  {
    name: 'Cool Blue',
    theme: {
      bgType: 'solid', bgColor: '#f6d4cb', bgGradient: { type: 'linear', angle: 135, stops: [{ color: '#f6d4cb', position: 0 }, { color: '#f6d4cb', position: 100 }] },
      bgImage: '', bgImageFit: 'cover',
      accentColor: '#7c413c', textColor: '#1e0227', windowBg: 'rgba(246,212,203,0.12)',
      fontFamily: 'Inter', fontSize: 'medium',
      buttonStyle: 'rounded', borderRadius: 12, shadowIntensity: 1, windowBlur: 20, windowOpacity: 0.85,
      iconStyle: 'default',
    },
  },
  {
    name: 'Warm Gold',
    theme: {
      bgType: 'solid', bgColor: '#f6d4cb', bgGradient: { type: 'linear', angle: 135, stops: [{ color: '#f6d4cb', position: 0 }, { color: '#f6d4cb', position: 100 }] },
      bgImage: '', bgImageFit: 'cover',
      accentColor: '#7c413c', textColor: '#1e0227', windowBg: 'rgba(246,212,203,0.12)',
      fontFamily: 'Inter', fontSize: 'medium',
      buttonStyle: 'rounded', borderRadius: 12, shadowIntensity: 1, windowBlur: 20, windowOpacity: 0.85,
      iconStyle: 'default',
    },
  },
  {
    name: 'Dark Mode',
    theme: {
      bgType: 'solid', bgColor: '#1e0227', bgGradient: { type: 'linear', angle: 135, stops: [{ color: '#1e0227', position: 0 }, { color: '#1e0227', position: 100 }] },
      bgImage: '', bgImageFit: 'cover',
      accentColor: '#7c413c', textColor: '#f6d4cb', windowBg: 'rgba(246,212,203,0.08)',
      fontFamily: 'Inter', fontSize: 'medium',
      buttonStyle: 'rounded', borderRadius: 12, shadowIntensity: 2, windowBlur: 20, windowOpacity: 0.8,
      iconStyle: 'default',
    },
  },
  {
    name: 'Midnight Purple',
    theme: {
      bgType: 'gradient', bgColor: '#1e0227', bgGradient: { type: 'linear', angle: 135, stops: [{ color: '#1e0227', position: 0 }, { color: '#1e0227', position: 50 }, { color: '#1e0227', position: 100 }] },
      bgImage: '', bgImageFit: 'cover',
      accentColor: '#f6d4cb', textColor: '#f6d4cb', windowBg: 'rgba(246,212,203,0.1)',
      fontFamily: 'Inter', fontSize: 'medium',
      buttonStyle: 'pill', borderRadius: 16, shadowIntensity: 2, windowBlur: 24, windowOpacity: 0.75,
      iconStyle: 'rounded',
    },
  },
  {
    name: 'Forest Green',
    theme: {
      bgType: 'gradient', bgColor: '#1e0227', bgGradient: { type: 'linear', angle: 180, stops: [{ color: '#665700', position: 0 }, { color: '#1e0227', position: 100 }] },
      bgImage: '', bgImageFit: 'cover',
      accentColor: '#7c413c', textColor: '#f6d4cb', windowBg: 'rgba(124,65,60,0.08)',
      fontFamily: 'DM Sans', fontSize: 'medium',
      buttonStyle: 'rounded', borderRadius: 10, shadowIntensity: 1, windowBlur: 16, windowOpacity: 0.85,
      iconStyle: 'default',
    },
  },
  {
    name: 'Sunset Orange',
    theme: {
      bgType: 'gradient', bgColor: '#e0b115', bgGradient: { type: 'linear', angle: 135, stops: [{ color: '#e0b115', position: 0 }, { color: '#e0b115', position: 50 }, { color: '#7c413c', position: 100 }] },
      bgImage: '', bgImageFit: 'cover',
      accentColor: '#1e0227', textColor: '#1e0227', windowBg: 'rgba(246,212,203,0.2)',
      fontFamily: 'Poppins', fontSize: 'medium',
      buttonStyle: 'pill', borderRadius: 16, shadowIntensity: 2, windowBlur: 20, windowOpacity: 0.9,
      iconStyle: 'rounded',
    },
  },
  {
    name: 'Ocean Deep',
    theme: {
      bgType: 'gradient', bgColor: '#1e0227', bgGradient: { type: 'linear', angle: 180, stops: [{ color: '#1e0227', position: 0 }, { color: '#1e0227', position: 50 }, { color: '#1e0227', position: 100 }] },
      bgImage: '', bgImageFit: 'cover',
      accentColor: '#f6d4cb', textColor: '#f6d4cb', windowBg: 'rgba(246,212,203,0.08)',
      fontFamily: 'Inter', fontSize: 'medium',
      buttonStyle: 'rounded', borderRadius: 12, shadowIntensity: 2, windowBlur: 24, windowOpacity: 0.75,
      iconStyle: 'minimal',
    },
  },
  {
    name: 'Neon Cyberpunk',
    theme: {
      bgType: 'solid', bgColor: '#1e0227', bgGradient: { type: 'linear', angle: 135, stops: [{ color: '#1e0227', position: 0 }, { color: '#1e0227', position: 100 }] },
      bgImage: '', bgImageFit: 'cover',
      accentColor: '#f6d4cb', textColor: '#f6d4cb', windowBg: 'rgba(246,212,203,0.06)',
      fontFamily: 'JetBrains Mono', fontSize: 'small',
      buttonStyle: 'sharp', borderRadius: 0, shadowIntensity: 3, windowBlur: 8, windowOpacity: 0.7,
      iconStyle: 'square',
    },
  },
  {
    name: 'Paper White',
    theme: {
      bgType: 'solid', bgColor: '#f6d4cb', bgGradient: { type: 'linear', angle: 135, stops: [{ color: '#f6d4cb', position: 0 }, { color: '#f6d4cb', position: 100 }] },
      bgImage: '', bgImageFit: 'cover',
      accentColor: '#1e0227', textColor: '#1e0227', windowBg: 'rgba(246,212,203,0.6)',
      fontFamily: 'Lora', fontSize: 'medium',
      buttonStyle: 'rounded', borderRadius: 8, shadowIntensity: 1, windowBlur: 12, windowOpacity: 0.95,
      iconStyle: 'minimal',
    },
  },
  {
    name: 'Retro Terminal',
    theme: {
      bgType: 'solid', bgColor: '#1e0227', bgGradient: { type: 'linear', angle: 135, stops: [{ color: '#1e0227', position: 0 }, { color: '#1e0227', position: 100 }] },
      bgImage: '', bgImageFit: 'cover',
      accentColor: '#665700', textColor: '#665700', windowBg: 'rgba(102,87,0,0.06)',
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
    case 1: return `0 ${4 * base}px ${12 * base}px rgba(30,2,39,0.1)`;
    case 2: return `0 ${12 * base}px ${32 * base}px rgba(30,2,39,0.2)`;
    case 3: return `0 ${24 * base}px ${48 * base}px rgba(30,2,39,0.35), 0 0 0 1px rgba(246,212,203,0.05)`;
    default: return `0 ${12 * base}px ${24 * base}px rgba(30,2,39,0.15)`;
  }
}
