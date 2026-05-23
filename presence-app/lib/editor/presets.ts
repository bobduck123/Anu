import type { PresenceEditableConfig } from "@/lib/api/types";

export interface RoomDnaPreset {
  id: string;
  name: string;
  description: string;
  swatch: string;
  style_dna: Record<string, unknown>;
  motion_config: Record<string, unknown>;
}

export const ROOM_DNA_PRESETS: RoomDnaPreset[] = [
  {
    id: "paper-gallery",
    name: "Paper Gallery",
    description: "Light paper field, quiet ink, gallery pace.",
    swatch: "linear-gradient(135deg,#f4f4f4,#e7e1d7)",
    style_dna: {
      palette: { bg: "#f4f4f4", paper: "#eceae7", paper_warm: "#e7e1d7", ink: "#111111", muted: "#6a6a6a", line: "#d7d2c8", hero_stage_bg: "#eaeaea" },
    },
    motion_config: {
      transition_style: "liquid_crossfade",
      liquid_style: "ripple",
      morph_speed_ms: 1100,
      scene_transition_duration_ms: 1100,
      liquid_intensity: 0.72,
      distortion_scale: 0.74,
      heavy_motion_enabled: false,
    },
  },
  {
    id: "ink-room",
    name: "Ink Room",
    description: "Darker stage, high contrast typography, slower morph.",
    swatch: "linear-gradient(135deg,#141414,#3c362e)",
    style_dna: {
      palette: { bg: "#141414", paper: "#23211d", paper_warm: "#2f2a23", ink: "#f7f1e7", muted: "#b7aa98", line: "#51483c", hero_stage_bg: "#191919" },
    },
    motion_config: {
      transition_style: "glass",
      liquid_style: "glass",
      morph_speed_ms: 1400,
      scene_transition_duration_ms: 1400,
      liquid_intensity: 0.64,
      distortion_scale: 0.58,
      heavy_motion_enabled: false,
    },
  },
  {
    id: "liquid-signal",
    name: "Liquid Signal",
    description: "Higher liquid presence for owner-approved immersive rooms.",
    swatch: "linear-gradient(135deg,#dde8ed,#7f958f)",
    style_dna: {
      palette: { bg: "#e8ece9", paper: "#dfe4df", paper_warm: "#d7ddd4", ink: "#111714", muted: "#5c6b63", line: "#b8c4bd", hero_stage_bg: "#dce6e2" },
    },
    motion_config: {
      transition_style: "liquid_crossfade",
      liquid_style: "ripple",
      morph_speed_ms: 900,
      scene_transition_duration_ms: 900,
      liquid_intensity: 0.95,
      distortion_scale: 0.92,
      heavy_motion_enabled: true,
    },
  },
];

export function applyRoomDnaPreset(config: PresenceEditableConfig, preset: RoomDnaPreset): PresenceEditableConfig {
  const currentStyle = asRecord(config.style_dna);
  const currentMotion = asRecord(config.motion_config);
  const nextStyle = asRecord(preset.style_dna);
  return {
    ...config,
    style_dna: {
      ...currentStyle,
      ...nextStyle,
      palette: {
        ...asRecord(currentStyle.palette),
        ...asRecord(nextStyle.palette),
      },
    },
    motion_config: {
      ...currentMotion,
      ...preset.motion_config,
    },
  };
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}
