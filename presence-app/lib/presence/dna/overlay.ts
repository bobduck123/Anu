// Merge: backend persisted DNA > inferred DNA.
//
// The renderer always calls `resolvePresenceDna(node)`. Backend-seeded
// and fixture-backed demo rooms carry DNA at node.metadata.presence_dna;
// inferred DNA remains only a fallback for legacy nodes without metadata.

import type { PresenceNode } from "@/lib/api/types";
import { inferPresenceDna } from "./infer";
import type { PresenceDna } from "./types";

interface NodeWithMetadata extends PresenceNode {
  metadata?: { presence_dna?: PresenceDna | Partial<PresenceDna> } | null;
}

function readPersistedDna(node: PresenceNode): Partial<PresenceDna> | null {
  const withMeta = node as NodeWithMetadata;
  const fromMeta = withMeta.metadata?.presence_dna;
  if (fromMeta && typeof fromMeta === "object") return fromMeta as Partial<PresenceDna>;
  return null;
}

function mergeDna(base: PresenceDna, overlay: Partial<PresenceDna> | null | undefined, source: PresenceDna["source"]): PresenceDna {
  if (!overlay) return base;
  return {
    entity: { ...base.entity, ...overlay.entity },
    practice: { ...base.practice, ...overlay.practice },
    audience: { ...base.audience, ...overlay.audience },
    goal: { ...base.goal, ...overlay.goal },
    personality: { ...base.personality, ...overlay.personality },
    proof: { ...base.proof, ...overlay.proof },
    visual: { ...base.visual, ...overlay.visual },
    composition: { ...base.composition, ...overlay.composition },
    signature: { ...base.signature, ...overlay.signature },
    source,
    notes: overlay.notes ?? base.notes,
  };
}

export function resolvePresenceDna(node: PresenceNode): PresenceDna {
  const base = inferPresenceDna(node);

  // Highest priority: DNA persisted on the backend (node.metadata.presence_dna).
  const persisted = readPersistedDna(node);
  if (persisted) {
    return mergeDna(base, persisted, "backend_persisted");
  }

  // Last: inferred from existing node fields.
  return base;
}
