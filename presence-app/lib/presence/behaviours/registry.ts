// Behaviour preset registry. Each preset documents what it does and
// whether it is fully implemented in this pass. The renderer picks the
// preset from ThemeGenome.motion_preset and respects motion_intensity.
//
// Reduced-motion behaviour: every implemented preset MUST honour
// `prefers-reduced-motion: reduce`. See the components themselves.

import type { BehaviourPreset } from "@/lib/presence/dna/types";

export interface BehaviourEntry {
  preset: BehaviourPreset;
  summary: string;
  implemented: boolean;
  honours_reduced_motion: boolean;
}

export const BEHAVIOUR_REGISTRY: Record<BehaviourPreset, BehaviourEntry> = {
  controlled_glitch: {
    preset: "controlled_glitch",
    summary: "Scanline displacement on hero images and accent text. Random, throttled, never blocks reading.",
    implemented: true,
    honours_reduced_motion: true,
  },
  gallery_breath: {
    preset: "gallery_breath",
    summary: "Subtle scale + opacity rhythm on hero and image-card focus. Quiet, premium.",
    implemented: true,
    honours_reduced_motion: true,
  },
  material_reveal: {
    preset: "material_reveal",
    summary: "Slow on-scroll reveal with texture parallax for craft/material rooms.",
    implemented: true,
    honours_reduced_motion: true,
  },
  editorial_snap: {
    preset: "editorial_snap",
    summary: "Crisp, no-nonsense fade-in for editorial and consulting rooms.",
    implemented: true,
    honours_reduced_motion: true,
  },
  archival_flicker: {
    preset: "archival_flicker",
    summary: "Light projector-style flicker on hero text. Scaffolded — uses editorial_snap as fallback.",
    implemented: false,
    honours_reduced_motion: true,
  },
  cinematic_drift: {
    preset: "cinematic_drift",
    summary: "Slow horizontal drift on hero. Scaffolded.",
    implemented: false,
    honours_reduced_motion: true,
  },
  scanline_noise: {
    preset: "scanline_noise",
    summary: "Static scanline overlay (no animation by default). Scaffolded.",
    implemented: false,
    honours_reduced_motion: true,
  },
  soft_parallax: {
    preset: "soft_parallax",
    summary: "Background parallax on hero. Scaffolded.",
    implemented: false,
    honours_reduced_motion: true,
  },
  kinetic_index: {
    preset: "kinetic_index",
    summary: "Kinetic typography for an index/wall blueprint. Scaffolded.",
    implemented: false,
    honours_reduced_motion: true,
  },
  tactile_hover: {
    preset: "tactile_hover",
    summary: "Card lift + grain shift on hover. Scaffolded.",
    implemented: false,
    honours_reduced_motion: true,
  },
  image_displacement: {
    preset: "image_displacement",
    summary: "Cursor-driven displacement of work thumbnails. Scaffolded.",
    implemented: false,
    honours_reduced_motion: true,
  },
  mobile_portal_nav: {
    preset: "mobile_portal_nav",
    summary: "Portal-style mobile nav transition. Scaffolded.",
    implemented: false,
    honours_reduced_motion: true,
  },
};

export function isImplementedBehaviour(preset: BehaviourPreset): boolean {
  return Boolean(BEHAVIOUR_REGISTRY[preset]?.implemented);
}
