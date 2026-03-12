/**
 * Feature flags for Flora Fauna alpha UI enhancements.
 *
 * Flags can be overridden per-environment via NEXT_PUBLIC_FF_* env vars
 * (e.g. NEXT_PUBLIC_FF_STARFIELD=false) or at runtime via localStorage
 * (key: "ff-flags", JSON object of overrides).
 *
 * Usage:
 *   import { flags, useFeatureFlag } from '@/lib/featureFlags';
 *   const enabled = useFeatureFlag('starfield');
 */

export interface FeatureFlags {
  starfield: boolean;
  augmentedMatrixHeatmap: boolean;
  draggableCommunityGallery: boolean;
  educationTemplates: boolean;
  chromaticBento: boolean;
  profileDesktopUi: boolean;
}

const defaults: FeatureFlags = {
  starfield: true,
  augmentedMatrixHeatmap: true,
  draggableCommunityGallery: true,
  educationTemplates: true,
  chromaticBento: true,
  profileDesktopUi: true,
};

function envOverride(key: keyof FeatureFlags): boolean | undefined {
  if (typeof process === 'undefined') return undefined;
  const envKey = `NEXT_PUBLIC_FF_${key.replace(/([A-Z])/g, '_$1').toUpperCase()}`;
  const val = process.env[envKey];
  if (val === 'true') return true;
  if (val === 'false') return false;
  return undefined;
}

function localOverrides(): Partial<FeatureFlags> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem('ff-flags');
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/** Resolved flags (env > localStorage > defaults) */
export function resolveFlags(): FeatureFlags {
  const local = localOverrides();
  const resolved = { ...defaults };

  for (const key of Object.keys(defaults) as (keyof FeatureFlags)[]) {
    const env = envOverride(key);
    if (env !== undefined) {
      resolved[key] = env;
    } else if (local[key] !== undefined) {
      resolved[key] = local[key]!;
    }
  }

  return resolved;
}

/** Static snapshot (safe for server components) */
export const flags: FeatureFlags = resolveFlags();

/** React hook for client components */
export function useFeatureFlag(key: keyof FeatureFlags): boolean {
  // Resolve fresh each render so localStorage changes take effect
  return resolveFlags()[key];
}

/** Set a flag at runtime (persists via localStorage) */
export function setFeatureFlag(key: keyof FeatureFlags, value: boolean): void {
  if (typeof window === 'undefined') return;
  const current = localOverrides();
  current[key] = value;
  localStorage.setItem('ff-flags', JSON.stringify(current));
}

/** Reset all runtime overrides */
export function resetFeatureFlags(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('ff-flags');
}
