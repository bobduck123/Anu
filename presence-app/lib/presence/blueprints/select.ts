// DNA → RoomBlueprint selection. The rule of the system: profession does
// not select the blueprint. Multiple DNA axes vote.

import type { PresenceDna, RoomBlueprint } from "@/lib/presence/dna/types";

export function selectBlueprint(dna: PresenceDna): RoomBlueprint {
  // Signature module is the strongest single signal — when the room has
  // committed to a hero-level signature, the blueprint follows it.
  if (dna.signature.signature_intensity === "hero_level") {
    switch (dna.signature.signature_module) {
      case "glitch_gallery":
        return dna.composition.entry_type === "audio_first" ? "nocturnal_sonic" : "glitch_gallery";
      case "materials_board":
        return "material_studio";
      case "before_after_slider":
        return "trust_conversion";
      case "program_grid":
        return "program";
      case "audio_strip":
        return "nocturnal_sonic";
    }
  }

  // Strong audience + decision_need signals
  if (dna.audience.decision_need === "trust" && dna.audience.audience_temperature === "cold") {
    return "trust_conversion";
  }
  if (dna.audience.decision_need === "safety") {
    return "program";
  }
  if (dna.audience.decision_need === "competence" && dna.personality.energy === "sharp") {
    return "editorial_identity";
  }

  // Practice + personality
  if (dna.practice.field === "music") return dna.composition.entry_type === "audio_first" ? "nocturnal_sonic" : "glitch_gallery";
  if (dna.practice.field === "visual_art") return "editorial_identity";
  if (dna.practice.field === "building_trade") {
    return dna.personality.status_signal === "craft" ? "material_studio" : "trust_conversion";
  }
  if (dna.practice.field === "healing") return "program";
  if (dna.practice.field === "consulting") return "editorial_identity";
  if (dna.practice.field === "culture" || dna.practice.field === "community") return "civic";
  if (dna.practice.field === "hospitality") return "atmosphere";
  if (dna.practice.field === "design") return "editorial_identity";

  return "editorial_identity";
}

// Trust pathway — ordered list of proof types this room should surface,
// derived from DNA. Used to drive the proof section composition.
export function trustPathway(dna: PresenceDna): typeof dna.proof.proof_type {
  return dna.proof.proof_type.slice(0, dna.proof.proof_density === "heavy" ? 4 : 2);
}

// CTA label — derived from goal + conversion_style.
export function ctaLabel(dna: PresenceDna): string {
  const goal = dna.goal.primary_goal;
  const style = dna.goal.conversion_style;

  if (goal === "bookings") return style === "soft" ? "Begin a conversation" : "Request a booking";
  if (goal === "commissions") return style === "editorial" ? "Commission a work" : "Begin a commission";
  if (goal === "enquiries") {
    if (style === "premium") return "Open a project conversation";
    if (style === "direct") return "Get a quote";
    return "Send an enquiry";
  }
  if (goal === "memberships") return "Join the program";
  if (goal === "event_attendance") return "See what's on";
  if (goal === "press") return "Press and bookings";
  if (goal === "sales") return "Buy";
  if (goal === "donations") return "Support the work";
  if (goal === "volunteers") return "Volunteer";
  if (goal === "credibility") return "Open a conversation";
  if (goal === "grant_readiness") return "Partner with us";
  return "Open a conversation";
}
