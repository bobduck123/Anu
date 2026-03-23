export type RealmName = 'earth' | 'labyrinth' | 'celestial' | 'neutral';
export type RealmStrength = 'strong' | 'subtle' | 'none';
export type RealmSurfaceKind =
  | 'standard'
  | 'field'
  | 'archive'
  | 'starfield'
  | 'universe'
  | 'internal';
export type RealmEntryPattern =
  | 'none'
  | 'grounded'
  | 'descent'
  | 'carving'
  | 'bridge'
  | 'threshold';
export type RealmFallbackMode = 'standard' | 'utility' | 'two-dimensional' | 'manuscript';

export interface RealmSurface {
  realm: RealmName;
  strength: RealmStrength;
  surfaceKind: RealmSurfaceKind;
  environmentTitle: string;
  entryPattern: RealmEntryPattern;
  supportsRealmTransition: boolean;
  fallbackMode: RealmFallbackMode;
  hideSupportChrome: boolean;
  immersiveCanvas: boolean;
}
