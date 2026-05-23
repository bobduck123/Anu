"use client";

// GGM Motion settings — runtime-tunable knobs for the scene stage,
// liquid morph, dither film, and chrome (custom cursor + scroll bar).
//
// State lives in a React Context + localStorage. No backend writes.
// When backend persistence for `metadata.custom_presence.style_dna`
// becomes available, the same shape can be promoted up to it; until
// then this is a local owner/operator tool.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { LiquidStyle } from "./GgmLiquidCanvas";

export interface GgmMotionSettings {
  // Liquid morph
  liquidStyle: LiquidStyle;          // "ripple" | "glass" | "dissolve" | "cut"
  liquidIntensity: number;           // 0..1
  liquidDistortion: number;          // 0..1
  liquidDurationMs: number;          // 400..2400
  // Atmosphere
  ditherStrength: number;            // 0..1
  filmGrainStrength: number;         // 0..1
  blurAmount: number;                // 0..1 — affects atmosphere blur
  parallaxDepth: number;             // 0..1
  // Chrome
  customCursor: boolean;
  scrollProgress: boolean;
  // Master power
  powerSaver: boolean;               // forces cut + disables decorative layers
  heavyMotion: boolean;              // explicit owner override for high-end devices
}

export const GGM_MOTION_DEFAULTS: GgmMotionSettings = {
  liquidStyle: "ripple",
  liquidIntensity: 0.95,
  liquidDistortion: 1.0,
  liquidDurationMs: 1100,
  ditherStrength: 0.62,
  filmGrainStrength: 0.42,
  blurAmount: 0.5,
  parallaxDepth: 0.5,
  customCursor: false,
  scrollProgress: true,
  powerSaver: false,
  heavyMotion: false,
};

const STORAGE_KEY = "ggm:motion-settings:v1";

interface GgmMotionContextValue {
  settings: GgmMotionSettings;
  setSetting: <K extends keyof GgmMotionSettings>(key: K, value: GgmMotionSettings[K]) => void;
  reset: () => void;
  // Effective values that respect powerSaver / reducedMotion overrides.
  effective: GgmMotionSettings;
  reducedMotion: boolean;
}

const Ctx = createContext<GgmMotionContextValue | null>(null);

export function useGgmMotion(): GgmMotionContextValue {
  const ctx = useContext(Ctx);
  if (!ctx) {
    // Sensible fallback so components used outside the provider don't
    // crash — they just see defaults and can't write.
    return {
      settings: GGM_MOTION_DEFAULTS,
      effective: GGM_MOTION_DEFAULTS,
      setSetting: () => {},
      reset: () => {},
      reducedMotion: false,
    };
  }
  return ctx;
}

interface GgmMotionProviderProps {
  children: ReactNode;
  initialSettings?: Partial<GgmMotionSettings>;
  localStorageEnabled?: boolean;
}

function normaliseSettings(initialSettings?: Partial<GgmMotionSettings>): GgmMotionSettings {
  return { ...GGM_MOTION_DEFAULTS, ...(initialSettings ?? {}) };
}

export function GgmMotionProvider({
  children,
  initialSettings,
  localStorageEnabled = true,
}: GgmMotionProviderProps) {
  const [settings, setSettings] = useState<GgmMotionSettings>(() => normaliseSettings(initialSettings));
  const [reducedMotion, setReducedMotion] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorageEnabled ? window.localStorage.getItem(STORAGE_KEY) : null;
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<GgmMotionSettings>;
        setSettings(normaliseSettings({ ...initialSettings, ...parsed }));
      } else {
        setSettings(normaliseSettings(initialSettings));
      }
    } catch {
      // ignore — defaults are fine.
    }
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mql.matches);
    const onChange = () => setReducedMotion(mql.matches);
    mql.addEventListener("change", onChange);
    setHydrated(true);
    return () => mql.removeEventListener("change", onChange);
  }, [initialSettings, localStorageEnabled]);

  // Persist whenever settings change (after first hydrate).
  useEffect(() => {
    if (!hydrated || !localStorageEnabled) return;
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // ignore.
    }
  }, [settings, hydrated, localStorageEnabled]);

  const setSetting: GgmMotionContextValue["setSetting"] = useCallback((key, value) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }, []);

  const reset = useCallback(() => setSettings(GGM_MOTION_DEFAULTS), []);

  const effective = useMemo<GgmMotionSettings>(() => {
    // PowerSaver wins over heavyMotion. Reduced motion wins over both
    // for animation-related fields.
    if (reducedMotion || settings.powerSaver) {
      return {
        ...settings,
        liquidStyle: "cut",
        liquidIntensity: 0,
        liquidDistortion: 0,
        liquidDurationMs: 240,
        ditherStrength: 0,
        filmGrainStrength: 0,
        blurAmount: 0,
        parallaxDepth: 0,
        customCursor: false,
        scrollProgress: settings.scrollProgress,
      };
    }
    if (!settings.heavyMotion) {
      return {
        ...settings,
        liquidIntensity: Math.min(settings.liquidIntensity, 0.58),
        liquidDistortion: Math.min(settings.liquidDistortion, 0.55),
        liquidDurationMs: Math.max(settings.liquidDurationMs, 1150),
        ditherStrength: Math.min(settings.ditherStrength, 0.38),
        filmGrainStrength: Math.min(settings.filmGrainStrength, 0.32),
        blurAmount: Math.min(settings.blurAmount, 0.28),
      };
    }
    return settings;
  }, [settings, reducedMotion]);

  const value = useMemo<GgmMotionContextValue>(
    () => ({ settings, effective, setSetting, reset, reducedMotion }),
    [settings, effective, setSetting, reset, reducedMotion],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
