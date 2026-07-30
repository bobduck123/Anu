"use client";

import type { CSSProperties } from "react";
import {
  PRESENCE_LOOK_DEFINITIONS,
  PRESENCE_MOTION_BEHAVIOUR_DEFINITIONS,
  PRESENCE_OWNER_ACTIVE_ATMOSPHERE_DEFINITIONS,
  PRESENCE_OWNER_ACTIVE_PIECE_TREATMENT_DEFINITIONS,
  PRESENCE_ROOM_STYLE_DEFINITIONS,
  PRESENCE_TYPOGRAPHY_FACET_DEFINITIONS,
  getPresenceLookDefinition,
  getPresenceLookSelectionStatus,
  getPresenceRoomStyleDefinition,
  getPresenceRoomStyleSelectionStatus,
  getPresenceStylePairingStatus,
  isStudioV3LookId,
  isStudioV3RoomStyleId,
  isPresenceStylePairingAllowed,
} from "@/lib/presence/studio-v3";
import type {
  PresenceLookDefinition,
  PresenceStyleGuardrailOptions,
  PresenceRoomStyleDefinition,
  PresenceStyleSelectionStatus,
  StudioV3Layer,
  StudioV3LayerOverrideValue,
  StudioV3LookId,
  StudioV3LookValues,
  StudioV3RoomStyleId,
} from "@/lib/presence/studio-v3";

export type StudioV3P1LookId = StudioV3LookId;
export type StudioV3P1RoomStyleId = StudioV3RoomStyleId;
export type StudioV3CompareSide = "before" | "after";

export interface StudioV3CompatibilitySummary {
  changed: number;
  locksPreserved: number;
  overridesPreserved: number;
  moved: number;
  placed: number;
  unplaced: number;
  incompatible: number;
  overflow: number;
  duplicate: number;
  retained: number;
  total: number;
  reasons: string[];
}

export interface StudioV3StructuralPreviewView {
  targetStyleId: StudioV3P1RoomStyleId;
  targetStyleName: string;
  compareSide: StudioV3CompareSide;
  summary: StudioV3CompatibilitySummary;
}

const OWNER_REVIEW_STYLE_GUARDRAILS: PresenceStyleGuardrailOptions = { allowExperimental: true };

const LOOK_OPTIONS = PRESENCE_LOOK_DEFINITIONS.flatMap((definition) => {
  const status = getPresenceLookSelectionStatus(definition.id, OWNER_REVIEW_STYLE_GUARDRAILS);
  if (!status.selectable) return [];
  return [{
    id: definition.id,
    name: definition.name,
    description: definition.description,
    dimensions: definition.dimensionSummary,
    recommendedRoomStyle: studioV3RoomStyleName(definition.recommendedRoomStyleId),
    guardrailLabel: status.label,
    guardrailWarning: status.warning,
  }];
});

const ROOM_STYLE_OPTIONS = PRESENCE_ROOM_STYLE_DEFINITIONS.flatMap((definition) => {
  const status = getPresenceRoomStyleSelectionStatus(definition.id, OWNER_REVIEW_STYLE_GUARDRAILS);
  if (!status.selectable) return [];
  return [{
    id: definition.id,
    name: definition.name,
    description: definition.description,
    guardrailLabel: status.label,
    guardrailWarning: status.warning,
  }];
});

export function studioV3RoomStyleName(styleId: StudioV3P1RoomStyleId): string {
  return PRESENCE_ROOM_STYLE_DEFINITIONS.find((option) => option.id === styleId)?.name ?? styleId;
}

export default function StudioV3LookControls({
  activeLookId,
  activeLookName,
  activeRoomStyleId,
  compatibility,
  structuralPreview,
  lockedLayerCount,
  namedLookName,
  hasNamedLooks,
  latestNamedLookName,
  hasStructuralSavepoint,
  activeLookValues,
  motionLocked,
  onNamedLookNameChange,
  onApplyLook,
  onStageRoomStyle,
  onCompareSide,
  onApplyStructural,
  onCancelStructural,
  onLockMotion,
  onSaveNamedLook,
  onApplyFacet,
  onRestoreNamedLook,
  onRestoreStructural,
}: {
  activeLookId: string;
  activeLookName: string;
  activeRoomStyleId: string;
  compatibility: StudioV3CompatibilitySummary;
  structuralPreview: StudioV3StructuralPreviewView | null;
  lockedLayerCount: number;
  namedLookName: string;
  hasNamedLooks: boolean;
  latestNamedLookName?: string;
  hasStructuralSavepoint: boolean;
  activeLookValues: StudioV3LookValues;
  motionLocked: boolean;
  onNamedLookNameChange: (value: string) => void;
  onApplyLook: (lookId: StudioV3P1LookId) => void;
  onStageRoomStyle: (styleId: StudioV3P1RoomStyleId) => void;
  onCompareSide: (side: StudioV3CompareSide) => void;
  onApplyStructural: () => void;
  onCancelStructural: () => void;
  onLockMotion: () => void;
  onSaveNamedLook: () => void;
  onApplyFacet: (input: { layer: StudioV3Layer; value: StudioV3LayerOverrideValue; label: string }) => void;
  onRestoreNamedLook: () => void;
  onRestoreStructural: () => void;
}) {
  const interactionsFrozen = Boolean(structuralPreview);
  const activeCatalogLookId = resolveActiveCatalogLookId(activeLookId, activeLookValues);
  const activeCatalogRoomStyleId = resolveActiveCatalogRoomStyleId(activeRoomStyleId, activeLookValues);
  const pairingRoomStyleId = structuralPreview?.targetStyleId ?? activeCatalogRoomStyleId;
  const activeLookDefinition = getPresenceLookDefinition(activeCatalogLookId);
  const activeRoomStyleDefinition = getPresenceRoomStyleDefinition(pairingRoomStyleId);
  const styleCompatibility = getPresenceStylePairingStatus(
    activeCatalogLookId,
    pairingRoomStyleId,
    OWNER_REVIEW_STYLE_GUARDRAILS,
  );
  return (
    <div className="studio-v3-look-controls" data-testid="presence-studio-v3-look-controls">
      <div className="studio-v3-look-heading">
        <div>
          <p className="studio-v3-kicker">Look</p>
          <h2>{activeLookName}</h2>
        </div>
        <p>Looks change atmosphere, hierarchy, treatment, density, motion, and journey on this owner-private canvas.</p>
      </div>

      <StyleCatalogSummary
        look={activeLookDefinition}
        roomStyle={activeRoomStyleDefinition}
        compatibility={styleCompatibility}
        previewing={Boolean(structuralPreview)}
      />

      <fieldset className="studio-v3-option-group">
        <legend>Presence Look</legend>
        <p className="studio-v3-option-help">
          {lockedLayerCount} locked {lockedLayerCount === 1 ? "layer remains" : "layers remain"} unchanged when a Look is applied.
        </p>
        <div className="studio-v3-look-cards">
          {LOOK_OPTIONS.map((option) => {
            const active = activeLookId === option.id;
            return (
              <button
                key={option.id}
                type="button"
                className={`studio-v3-option-card look-${option.id}${active ? " is-active" : ""}`}
                aria-pressed={active}
                disabled={interactionsFrozen}
                onClick={() => onApplyLook(option.id)}
                data-testid={`presence-studio-v3-look-option-${option.id}`}
              >
                <span className="studio-v3-look-miniature" aria-hidden="true"><i /><i /><i /></span>
                <strong
                  data-testid={option.id === "soft-editorial"
                    ? "presence-studio-v3-apply-soft-editorial"
                    : option.id === "nocturnal-gallery"
                      ? "presence-studio-v3-apply-nocturnal-gallery"
                      : undefined}
                >
                  {option.name}
                </strong>
                <span>{option.description}</span>
                <small>{option.dimensions}</small>
                <small>Recommended Room Style: {option.recommendedRoomStyle}</small>
                {option.guardrailWarning && <small>{option.guardrailWarning}</small>}
              </button>
            );
          })}
        </div>
      </fieldset>

      <fieldset className="studio-v3-option-group">
        <legend>Room Style</legend>
        <p className="studio-v3-option-help">Structural changes stay in Previewing until you apply or cancel them.</p>
        <div className="studio-v3-room-style-cards">
          {ROOM_STYLE_OPTIONS.map((option, index) => {
            const active = activeRoomStyleId === option.id && !structuralPreview;
            const previewing = structuralPreview?.targetStyleId === option.id;
            const allowed = isPresenceStylePairingAllowed(
              activeCatalogLookId,
              option.id,
              OWNER_REVIEW_STYLE_GUARDRAILS,
            );
            return (
              <button
                key={option.id}
                type="button"
                className={`studio-v3-option-card room-style-${index + 1}${active ? " is-active" : ""}${previewing ? " is-previewing" : ""}`}
                aria-pressed={active || previewing}
                disabled={interactionsFrozen || !allowed}
                onClick={() => onStageRoomStyle(option.id)}
                data-testid={`presence-studio-v3-room-style-${option.id}`}
              >
                <span className="studio-v3-room-style-miniature" aria-hidden="true"><i /><i /><i /><i /></span>
                <span className="studio-v3-room-style-number" aria-hidden="true">0{index + 1}</span>
                <strong>{option.name}</strong>
                <span>{option.description}</span>
                <small>{!allowed ? "Blocked for this Look" : active ? "Current structure" : previewing ? "Previewing" : "Preview structure"}</small>
                {option.guardrailWarning && <small>{option.guardrailWarning}</small>}
              </button>
            );
          })}
        </div>
      </fieldset>

      <StudioV3FacetControls
        activeLookValues={activeLookValues}
        disabled={interactionsFrozen}
        motionLocked={motionLocked}
        onApply={onApplyFacet}
      />

      <CompatibilitySummary summary={structuralPreview?.summary ?? compatibility} />

      <section className="studio-v3-structural-history" aria-labelledby="studio-v3-structural-history-title">
        <div>
          <p className="studio-v3-kicker">Structural savepoint</p>
          <h3 id="studio-v3-structural-history-title">Return to the last applied structure</h3>
        </div>
        <button
          type="button"
          onClick={onRestoreStructural}
          disabled={!hasStructuralSavepoint || interactionsFrozen}
          data-testid="presence-studio-v3-restore-structural-savepoint"
        >
          Restore last structure
        </button>
      </section>

      {structuralPreview && (
        <section
          className="studio-v3-structural-preview"
          data-testid="presence-studio-v3-structural-preview"
          aria-labelledby="studio-v3-structural-preview-title"
          aria-live="polite"
        >
          <div className="studio-v3-preview-heading">
            <span className="studio-v3-preview-badge">Previewing</span>
            <div>
              <h3 id="studio-v3-structural-preview-title">{structuralPreview.targetStyleName}</h3>
              <p>No local snapshot or server state changes until Apply.</p>
            </div>
          </div>
          <div className="studio-v3-compare-switch" aria-label="Compare structural change">
            <button
              type="button"
              aria-pressed={structuralPreview.compareSide === "before"}
              onClick={() => onCompareSide("before")}
              data-testid="presence-studio-v3-compare-before"
            >
              Before
            </button>
            <button
              type="button"
              aria-pressed={structuralPreview.compareSide === "after"}
              onClick={() => onCompareSide("after")}
              data-testid="presence-studio-v3-compare-after"
            >
              After
            </button>
          </div>
          <p className="studio-v3-preview-side">Showing {structuralPreview.compareSide === "before" ? "Before" : "After"}</p>
          <div className="studio-v3-preview-actions">
            <button type="button" className="studio-v3-primary" onClick={onApplyStructural} data-testid="presence-studio-v3-structural-apply">
              Apply structure
            </button>
            <button type="button" onClick={onCancelStructural} data-testid="presence-studio-v3-structural-cancel">
              Cancel preview
            </button>
          </div>
        </section>
      )}

      <section className="studio-v3-named-look" aria-labelledby="studio-v3-named-look-title">
        <div>
          <p className="studio-v3-kicker">Named Look</p>
          <h3 id="studio-v3-named-look-title">Keep an editable layer recipe</h3>
        </div>
        <label className="studio-v3-look-name">
          <span>Look name</span>
          <input
            value={namedLookName}
            maxLength={80}
            onChange={(event) => onNamedLookNameChange(event.target.value)}
            disabled={interactionsFrozen}
            data-testid="presence-studio-v3-named-look-name"
          />
        </label>
        {latestNamedLookName && (
          <p className="studio-v3-saved-look-name" data-testid="presence-studio-v3-saved-look-name">
            Saved Look: {latestNamedLookName}
          </p>
        )}
        <div className="studio-v3-named-look-actions">
          <button type="button" onClick={onLockMotion} disabled={interactionsFrozen} data-testid="presence-studio-v3-lock-layer">Lock motion</button>
          <button type="button" onClick={onSaveNamedLook} disabled={interactionsFrozen} data-testid="presence-studio-v3-save-named-look">Save as Look</button>
          <button type="button" onClick={onRestoreNamedLook} disabled={!hasNamedLooks || interactionsFrozen} data-testid="presence-studio-v3-restore-named-look">Restore</button>
        </div>
      </section>
    </div>
  );
}

function resolveActiveCatalogLookId(activeLookId: string, activeLookValues: StudioV3LookValues): StudioV3LookId {
  if (isStudioV3LookId(activeLookId)) return activeLookId;
  return PRESENCE_LOOK_DEFINITIONS.find((definition) => (
    definition.values.publicStylePreset === activeLookValues.publicStylePreset &&
    definition.values.worldId === activeLookValues.worldId &&
    definition.values.atmosphere === activeLookValues.atmosphere &&
    definition.values.pieceTreatment === activeLookValues.pieceTreatment
  ))?.id ?? "soft-editorial";
}

function resolveActiveCatalogRoomStyleId(activeRoomStyleId: string, activeLookValues: StudioV3LookValues): StudioV3RoomStyleId {
  if (isStudioV3RoomStyleId(activeRoomStyleId)) return activeRoomStyleId;
  return isStudioV3RoomStyleId(activeLookValues.roomStyleId) ? activeLookValues.roomStyleId : "gallery-wall";
}

function formatCatalogList(values: readonly string[], fallback: string): string {
  return values.length ? values.join(", ") : fallback;
}

function StyleCatalogSummary({
  look,
  roomStyle,
  compatibility,
  previewing,
}: {
  look: PresenceLookDefinition;
  roomStyle: PresenceRoomStyleDefinition;
  compatibility: PresenceStyleSelectionStatus;
  previewing: boolean;
}) {
  return (
    <section
      className={`studio-v3-style-compatibility is-${compatibility.tier}`}
      data-testid="presence-studio-v3-style-compatibility"
      aria-live="polite"
    >
      <div className="studio-v3-style-compatibility-heading">
        <div>
          <p className="studio-v3-kicker">{previewing ? "Preview pairing" : "Current pairing"}</p>
          <h3>{compatibility.label}</h3>
          <p>{compatibility.summary}</p>
        </div>
        <strong>{look.name} / {roomStyle.name}</strong>
      </div>
      <p className="studio-v3-style-reason">{compatibility.reason}</p>
      {(compatibility.warning || compatibility.fallbackRoomStyleId) && (
        <div className="studio-v3-style-alerts">
          {compatibility.warning && (
            <p data-testid="presence-studio-v3-style-warning">{compatibility.warning}</p>
          )}
          {compatibility.fallbackRoomStyleId && (
            <p data-testid="presence-studio-v3-style-fallback">Fallback: {studioV3RoomStyleName(compatibility.fallbackRoomStyleId)}</p>
          )}
        </div>
      )}
      <dl className="studio-v3-style-contract">
        <div>
          <dt>Look</dt>
          <dd>{look.description}</dd>
        </div>
        <div>
          <dt>Room Style</dt>
          <dd>{roomStyle.description}</dd>
        </div>
        <div>
          <dt>Safe controls</dt>
          <dd>{formatCatalogList(look.safeOwnerControls, "None")}</dd>
        </div>
        <div>
          <dt>Locked elements</dt>
          <dd>{formatCatalogList(look.lockedElements, "None in this gate")}</dd>
        </div>
        <div>
          <dt>Intended wow</dt>
          <dd>{look.intendedWowMoment}</dd>
        </div>
        <div>
          <dt>Mobile</dt>
          <dd>{roomStyle.mobileBehaviour}</dd>
        </div>
        <div>
          <dt>Reduced motion</dt>
          <dd>{look.reducedMotionBehaviour}</dd>
        </div>
        <div>
          <dt>Performance</dt>
          <dd>{look.performanceExpectation}</dd>
        </div>
        <div>
          <dt>Boundary</dt>
          <dd>Owner-private Studio metadata only; public routes stay unchanged.</dd>
        </div>
      </dl>
    </section>
  );
}

interface StudioV3FacetOption {
  id: string;
  label: string;
  detail: string;
  layer: StudioV3Layer;
  value: StudioV3LayerOverrideValue;
  active: boolean;
  background: string;
  color: string;
  symbol?: string;
  locked?: boolean;
}

function StudioV3FacetControls({
  activeLookValues,
  disabled,
  motionLocked,
  onApply,
}: {
  activeLookValues: StudioV3LookValues;
  disabled: boolean;
  motionLocked: boolean;
  onApply: (input: { layer: StudioV3Layer; value: StudioV3LayerOverrideValue; label: string }) => void;
}) {
  const groups: Array<{
    id: string;
    label: string;
    help: string;
    options: StudioV3FacetOption[];
  }> = [
    {
      id: "background",
      label: "Background / surface atmosphere",
      help: "Changes the material field without moving the Room structure.",
      options: PRESENCE_OWNER_ACTIVE_ATMOSPHERE_DEFINITIONS.map((definition) => ({
        id: definition.preview.optionId,
        label: definition.label,
        detail: definition.description,
        layer: "presence-look",
        value: definition.surfaceValue,
        active: activeLookValues.atmosphere === definition.id,
        background: definition.preview.background,
        color: definition.preview.color,
      })),
    },
    {
      id: "treatment",
      label: "Image treatment",
      help: "A registered visual treatment token for Pieces on the canvas.",
      options: PRESENCE_OWNER_ACTIVE_PIECE_TREATMENT_DEFINITIONS.map((definition) => ({
        id: definition.preview.optionId,
        label: definition.label,
        detail: definition.description,
        layer: "piece-treatment",
        value: { pieceTreatment: definition.id },
        active: activeLookValues.pieceTreatment === definition.id,
        background: definition.preview.background,
        color: definition.preview.color,
      })),
    },
    {
      id: "typography",
      label: "Typography / CTA style",
      help: "Adjusts existing heading and border tokens; link destinations stay unchanged.",
      options: PRESENCE_TYPOGRAPHY_FACET_DEFINITIONS.map((definition) => ({
        id: definition.id,
        label: definition.label,
        detail: definition.description,
        layer: "presence-look",
        value: definition.value,
        active: activeLookValues.headingWeight === definition.value.headingWeight && activeLookValues.borderStyle === definition.value.borderStyle,
        background: definition.preview.background,
        color: definition.preview.color,
      })),
    },
    {
      id: "motion",
      label: "Motion intensity",
      help: motionLocked ? "Motion / Atmosphere is locked. Unlocking is a later explicit action." : "Reduced-motion preferences continue to override decorative movement.",
      options: PRESENCE_MOTION_BEHAVIOUR_DEFINITIONS.map((definition) => ({
        id: definition.id,
        label: definition.label,
        detail: definition.description,
        layer: "motion-atmosphere",
        value: { motionIntensity: definition.id },
        active: activeLookValues.motionIntensity === definition.id,
        background: definition.preview.background,
        color: definition.preview.color,
        symbol: definition.preview.symbol,
        locked: motionLocked,
      })),
    },
  ];
  return (
    <div className="studio-v3-facet-groups" data-testid="presence-studio-v3-visual-facets">
      {groups.map((group) => (
        <fieldset key={group.id} className="studio-v3-option-group">
          <legend>{group.label}</legend>
          <p className="studio-v3-option-help">{group.help}</p>
          <div className="studio-v3-facet-cards">
            {group.options.map((option) => (
              <button
                key={option.id}
                type="button"
                className="studio-v3-facet-card"
                aria-pressed={option.active}
                disabled={disabled || option.locked}
                title={option.locked ? "This layer is locked." : option.detail}
                onClick={() => onApply({ layer: option.layer, value: option.value, label: option.label })}
                data-testid={`presence-studio-v3-facet-${group.id}-${option.id}`}
              >
                <span
                  className="studio-v3-facet-preview"
                  aria-hidden="true"
                  style={{ "--facet-background": option.background, "--facet-color": option.color } as CSSProperties}
                >
                  {group.id === "motion" ? option.symbol : "Aa"}
                </span>
                <strong>{option.label}</strong>
                <small>{option.locked ? "Locked" : option.detail}</small>
              </button>
            ))}
          </div>
        </fieldset>
      ))}
    </div>
  );
}

function CompatibilitySummary({ summary }: { summary: StudioV3CompatibilitySummary }) {
  return (
    <aside className="studio-v3-compatibility" data-testid="presence-studio-v3-compatibility-summary" aria-live="polite">
      <div>
        <p className="studio-v3-kicker">Compatibility summary</p>
        <h3>{summary.total} Pieces accounted for</h3>
      </div>
      <dl>
        <div><dt>Changed</dt><dd>{summary.changed}</dd></div>
        <div><dt>Placed</dt><dd>{summary.placed}</dd></div>
        <div><dt>Moved</dt><dd>{summary.moved}</dd></div>
        <div><dt>Unplaced</dt><dd>{summary.unplaced}</dd></div>
        <div><dt>Incompatible</dt><dd>{summary.incompatible}</dd></div>
        <div><dt>Overflow</dt><dd>{summary.overflow}</dd></div>
        <div><dt>Locks preserved</dt><dd>{summary.locksPreserved}</dd></div>
        <div><dt>Overrides preserved</dt><dd>{summary.overridesPreserved}</dd></div>
        <div><dt>Duplicate</dt><dd>{summary.duplicate}</dd></div>
        <div><dt>Retained in Shelf</dt><dd>{summary.retained}</dd></div>
      </dl>
      {summary.reasons.length > 0 && (
        <ul>
          {summary.reasons.map((reason) => <li key={reason}>{reason}</li>)}
        </ul>
      )}
    </aside>
  );
}
