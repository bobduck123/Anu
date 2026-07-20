"use client";

// useStudioState — the Presence Studio state hook.
//
// Owns the studio manifest, the current selection across all steps,
// the current quick-path stage index, and the deep-refinement open
// state. The hook is the single source of truth consumed by every
// studio component.
//
// Selections are persisted to localStorage automatically so the user
// can leave and come back. Backend submission lives in `adapter.ts`.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  LOCAL_STUDIO_MANIFEST,
  findContact, findIdentity, findMaterial, findMood, findMovement, findPace, findWorld,
  type StudioContactStyle, type StudioIdentity, type StudioManifest, type StudioMaterial, type StudioMood, type StudioMovement, type StudioPace, type StudioWorld,
} from "./manifest";
import { loadStudioManifest, type SetupRequestPayload } from "./adapter";

const STORAGE_KEY = "presence-studio:selection";

export interface StudioSelection {
  identityId: string | null;
  worldId: string | null;
  movementId: string | null;
  moodId: string | null;
  materialId: string | null;
  paceId: string | null;
  contactId: string | null;
  tone: string | null;
}

const EMPTY: StudioSelection = {
  identityId: null,
  worldId: null,
  movementId: null,
  moodId: null,
  materialId: null,
  paceId: null,
  contactId: null,
  tone: null,
};

function readPersisted(): StudioSelection | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StudioSelection>;
    return { ...EMPTY, ...parsed };
  } catch {
    return null;
  }
}

function writePersisted(sel: StudioSelection) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sel));
  } catch {
    // ignore
  }
}

export interface ResolvedSelection {
  identity?: StudioIdentity;
  world?: StudioWorld;
  movement?: StudioMovement;
  mood?: StudioMood;
  material?: StudioMaterial;
  pace?: StudioPace;
  contact?: StudioContactStyle;
  tone: string | null;
}

export function useStudioState() {
  const [manifest, setManifest] = useState<StudioManifest>(LOCAL_STUDIO_MANIFEST);
  const [selection, setSelection] = useState<StudioSelection>(EMPTY);
  const [refineOpen, setRefineOpen] = useState(false);
  const initialisedRef = useRef(false);

  // Load manifest + persisted selection on mount
  useEffect(() => {
    const ctrl = new AbortController();
    loadStudioManifest({ signal: ctrl.signal })
      .then(setManifest)
      .catch(() => {
        // fallback already in state; nothing to do
      });
    if (!initialisedRef.current) {
      const persisted = readPersisted();
      if (persisted) setSelection(persisted);
      initialisedRef.current = true;
    }
    return () => ctrl.abort();
  }, []);

  // Persist whenever selection changes
  useEffect(() => {
    if (!initialisedRef.current) return;
    writePersisted(selection);
  }, [selection]);

  // Setters — each takes the human id (never a backendId)
  const setIdentity = useCallback((id: string | null) => {
    setSelection((prev) => {
      // When picking an identity, fill any unset choice with the
      // identity's recommended default. Already-chosen values stay.
      if (!id) return { ...prev, identityId: null };
      const identity = manifest.identities.find((x) => x.id === id);
      if (!identity) return { ...prev, identityId: id };
      return {
        ...prev,
        identityId: id,
        worldId: prev.worldId ?? identity.recommended_world,
        movementId: prev.movementId ?? identity.recommended_movement,
        moodId: prev.moodId ?? identity.recommended_mood,
        materialId: prev.materialId ?? identity.recommended_material,
        paceId: prev.paceId ?? identity.recommended_pace,
        contactId: prev.contactId ?? identity.recommended_contact,
      };
    });
  }, [manifest.identities]);

  const setWorld = useCallback((id: string | null) => setSelection((p) => ({ ...p, worldId: id })), []);
  const setMovement = useCallback((id: string | null) => setSelection((p) => ({ ...p, movementId: id })), []);
  const setMood = useCallback((id: string | null) => setSelection((p) => ({ ...p, moodId: id })), []);
  const setMaterial = useCallback((id: string | null) => setSelection((p) => ({ ...p, materialId: id })), []);
  const setPace = useCallback((id: string | null) => setSelection((p) => ({ ...p, paceId: id })), []);
  const setContact = useCallback((id: string | null) => setSelection((p) => ({ ...p, contactId: id })), []);
  const setTone = useCallback((tone: string | null) => setSelection((p) => ({ ...p, tone })), []);
  const reset = useCallback(() => {
    setSelection(EMPTY);
    setRefineOpen(false);
    if (typeof window !== "undefined") {
      try { window.localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
    }
  }, []);

  const resolved = useMemo<ResolvedSelection>(() => ({
    identity: findIdentity(manifest, selection.identityId),
    world: findWorld(manifest, selection.worldId),
    movement: findMovement(manifest, selection.movementId),
    mood: findMood(manifest, selection.moodId),
    material: findMaterial(manifest, selection.materialId),
    pace: findPace(manifest, selection.paceId),
    contact: findContact(manifest, selection.contactId),
    tone: selection.tone,
  }), [manifest, selection]);

  return {
    manifest,
    selection,
    resolved,
    refineOpen,
    setRefineOpen,
    setIdentity, setWorld, setMovement, setMood, setMaterial, setPace, setContact, setTone,
    reset,
  };
}

// ---------------------------------------------------------------------------
// Build a backend-shaped setup request payload from form fields + selection.
// ---------------------------------------------------------------------------

export interface SetupFormFields {
  displayName: string;
  contactName: string;
  email: string;
  phone: string;
  whatYoureBuilding: string;
  notes: string;
  doNotWants: string;
  references: string[];
  consentToContact: boolean;
}

export function buildSetupRequestPayload(
  fields: SetupFormFields,
  resolved: ResolvedSelection,
  manifest: StudioManifest,
): SetupRequestPayload {
  const refsClean = fields.references.filter((r) => r && r.trim().length > 0);
  return {
    display_name: fields.displayName.trim(),
    contact_name: fields.contactName.trim(),
    email: fields.email.trim(),
    phone: fields.phone.trim() ? fields.phone.trim() : undefined,
    what_youre_building: fields.whatYoureBuilding.trim(),
    notes: fields.notes.trim() ? fields.notes.trim() : undefined,
    references: refsClean.length > 0 ? refsClean : undefined,
    do_not_wants: fields.doNotWants.trim() ? fields.doNotWants.trim() : undefined,
    consent_to_contact: fields.consentToContact,
    archetype: resolved.identity?.backendId,
    room_world: resolved.world?.backendId,
    engagement_dynamic: resolved.movement?.backendId,
    motion_profile: resolved.pace?.backendId,
    object_skin_pack: resolved.material?.backendId,
    atmosphere_pack: resolved.mood?.backendId,
    contact_style: resolved.contact?.backendId,
    copy_tone: resolved.tone ?? undefined,
    customisation_manifest_version: manifest.version,
    customisation_snapshot: {
      identity: resolved.identity ? { id: resolved.identity.id, label: resolved.identity.label } : null,
      world: resolved.world ? { id: resolved.world.id, label: resolved.world.label } : null,
      movement: resolved.movement ? { id: resolved.movement.id, label: resolved.movement.label } : null,
      mood: resolved.mood ? { id: resolved.mood.id, label: resolved.mood.label } : null,
      pace: resolved.pace ? { id: resolved.pace.id, label: resolved.pace.label } : null,
      material: resolved.material ? { id: resolved.material.id, label: resolved.material.label } : null,
      contact: resolved.contact ? { id: resolved.contact.id, label: resolved.contact.label } : null,
      tone: resolved.tone,
      // selected_raw — the visitor's literal local-id picks, kept alongside
      // the canonical backend IDs above so the backend can audit what the
      // visitor actually selected (vs the canonical id it normalised to).
      // Backend response echoes this block back; we send it explicitly so
      // it is always present, even when local fallback ids drift from
      // backend canonicals.
      selected_raw: {
        archetype: resolved.identity?.id ?? null,
        room_world: resolved.world?.id ?? null,
        engagement_dynamic: resolved.movement?.id ?? null,
        motion_profile: resolved.pace?.id ?? null,
        object_skin_pack: resolved.material?.id ?? null,
        atmosphere_pack: resolved.mood?.id ?? null,
        contact_style: resolved.contact?.id ?? null,
        copy_tone: resolved.tone ?? null,
      },
    },
  };
}
