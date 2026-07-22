"use client";

import type { CSSProperties } from "react";
import type { StudioV3Layer, StudioV3LayerOverrideValue, StudioV3LookValues } from "@/lib/presence/studio-v3";

export type StudioV3P1LookId = "soft-editorial" | "nocturnal-gallery" | "zine-archive";
export type StudioV3P1RoomStyleId = "threshold-portal" | "gallery-wall" | "film-strip-selected-works";
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

const LOOK_OPTIONS: ReadonlyArray<{
  id: StudioV3P1LookId;
  name: string;
  description: string;
  dimensions: string;
  recommendedRoomStyle: string;
}> = [
  {
    id: "soft-editorial",
    name: "Soft Editorial",
    description: "Airy editorial pacing with a light linen field and quiet framing.",
    dimensions: "Spacious hierarchy · restrained treatment · still motion",
    recommendedRoomStyle: "Gallery Wall",
  },
  {
    id: "nocturnal-gallery",
    name: "Nocturnal Gallery",
    description: "A near-black threshold with concentrated signal, depth, and cinematic focus.",
    dimensions: "Focused hierarchy · luminous treatment · gentle motion",
    recommendedRoomStyle: "Threshold Portal",
  },
  {
    id: "zine-archive",
    name: "Zine Archive",
    description: "A tactile ledger rhythm with assertive labels, clipped frames, and denser sequence.",
    dimensions: "Archive hierarchy · captioned treatment · living motion",
    recommendedRoomStyle: "Film Strip / Selected Works",
  },
];

const ROOM_STYLE_OPTIONS: ReadonlyArray<{
  id: StudioV3P1RoomStyleId;
  name: string;
  description: string;
}> = [
  {
    id: "threshold-portal",
    name: "Threshold Portal",
    description: "One dominant arrival, framing statement, signal, and protected onward path.",
  },
  {
    id: "gallery-wall",
    name: "Gallery Wall",
    description: "A paced exhibition wall with an opening work, supporting context, and exit.",
  },
  {
    id: "film-strip-selected-works",
    name: "Film Strip / Selected Works",
    description: "One active Work at a time with previous, next, progress, and direct index movement.",
  },
];

export function studioV3RoomStyleName(styleId: StudioV3P1RoomStyleId): string {
  return ROOM_STYLE_OPTIONS.find((option) => option.id === styleId)?.name ?? styleId;
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
  return (
    <div className="studio-v3-look-controls" data-testid="presence-studio-v3-look-controls">
      <div className="studio-v3-look-heading">
        <div>
          <p className="studio-v3-kicker">Look</p>
          <h2>{activeLookName}</h2>
        </div>
        <p>Looks change atmosphere, hierarchy, treatment, density, motion, and journey on this owner-private canvas.</p>
      </div>

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
            return (
              <button
                key={option.id}
                type="button"
                className={`studio-v3-option-card room-style-${index + 1}${active ? " is-active" : ""}${previewing ? " is-previewing" : ""}`}
                aria-pressed={active || previewing}
                disabled={interactionsFrozen}
                onClick={() => onStageRoomStyle(option.id)}
                data-testid={`presence-studio-v3-room-style-${option.id}`}
              >
                <span className="studio-v3-room-style-miniature" aria-hidden="true"><i /><i /><i /><i /></span>
                <span className="studio-v3-room-style-number" aria-hidden="true">0{index + 1}</span>
                <strong>{option.name}</strong>
                <span>{option.description}</span>
                <small>{active ? "Current structure" : previewing ? "Previewing" : "Preview structure"}</small>
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
    options: Array<{
      id: string;
      label: string;
      detail: string;
      layer: StudioV3Layer;
      value: StudioV3LayerOverrideValue;
      active: boolean;
      background: string;
      color: string;
      locked?: boolean;
    }>;
  }> = [
    {
      id: "background",
      label: "Background / surface atmosphere",
      help: "Changes the material field without moving the Room structure.",
      options: [
        { id: "paper", label: "Paper Light", detail: "Warm paper, soft grain", layer: "presence-look", value: { background: "#f7f3ea", texture: "paper", atmosphere: "paper-light" }, active: activeLookValues.background === "#f7f3ea", background: "#f7f3ea", color: "#17120a" },
        { id: "night", label: "Nocturnal Depth", detail: "Black field, concentrated signal", layer: "presence-look", value: { background: "#050505", texture: "grain", atmosphere: "nocturnal-depth" }, active: activeLookValues.background === "#050505", background: "#050505", color: "#ffd84d" },
        { id: "ledger", label: "Ledger Scan", detail: "Burgundy archive surface", layer: "presence-look", value: { background: "#2b1118", texture: "ledger", atmosphere: "ledger-scan" }, active: activeLookValues.background === "#2b1118", background: "#2b1118", color: "#f1c96a" },
      ],
    },
    {
      id: "treatment",
      label: "Image treatment",
      help: "A registered visual treatment token for Pieces on the canvas.",
      options: [
        { id: "quiet", label: "Quiet Framed", detail: "Fine edge, low shadow", layer: "piece-treatment", value: { pieceTreatment: "quiet-framed" }, active: activeLookValues.pieceTreatment === "quiet-framed", background: "#eee6d6", color: "#594628" },
        { id: "luminous", label: "Luminous Depth", detail: "Deep field, radiant edge", layer: "piece-treatment", value: { pieceTreatment: "luminous-depth" }, active: activeLookValues.pieceTreatment === "luminous-depth", background: "#090909", color: "#ffd84d" },
        { id: "captioned", label: "Captioned Ledger", detail: "Indexed, tactile label", layer: "piece-treatment", value: { pieceTreatment: "captioned-ledger" }, active: activeLookValues.pieceTreatment === "captioned-ledger", background: "#d3b887", color: "#2b1118" },
      ],
    },
    {
      id: "typography",
      label: "Typography / CTA style",
      help: "Adjusts existing heading and border tokens; link destinations stay unchanged.",
      options: [
        { id: "editorial", label: "Editorial", detail: "Quiet weight, hairline action", layer: "presence-look", value: { headingWeight: 600, borderStyle: "hairline" }, active: activeLookValues.headingWeight === 600 && activeLookValues.borderStyle === "hairline", background: "#fffaf0", color: "#15120f" },
        { id: "signal", label: "Signal", detail: "Strong heading, framed action", layer: "presence-look", value: { headingWeight: 800, borderStyle: "framed" }, active: activeLookValues.headingWeight === 800 && activeLookValues.borderStyle === "framed", background: "#17120a", color: "#f3c85d" },
        { id: "archive", label: "Archive", detail: "Ledger edge, indexed weight", layer: "presence-look", value: { headingWeight: 700, borderStyle: "ledger" }, active: activeLookValues.headingWeight === 700 && activeLookValues.borderStyle === "ledger", background: "#ead7a6", color: "#2b1118" },
      ],
    },
    {
      id: "motion",
      label: "Motion intensity",
      help: motionLocked ? "Motion / Atmosphere is locked. Unlocking is a later explicit action." : "Reduced-motion preferences continue to override decorative movement.",
      options: [
        { id: "still", label: "Still", detail: "No decorative movement", layer: "motion-atmosphere", value: { motionIntensity: "still" }, active: activeLookValues.motionIntensity === "still", background: "#e5e0d7", color: "#15120f", locked: motionLocked },
        { id: "gentle", label: "Gentle", detail: "Measured ambient movement", layer: "motion-atmosphere", value: { motionIntensity: "gentle" }, active: activeLookValues.motionIntensity === "gentle", background: "#ccb882", color: "#15120f", locked: motionLocked },
        { id: "living", label: "Living", detail: "Most expressive registered motion", layer: "motion-atmosphere", value: { motionIntensity: "living" }, active: activeLookValues.motionIntensity === "living", background: "#2b1118", color: "#f1c96a", locked: motionLocked },
      ],
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
                  {group.id === "motion" ? (option.id === "still" ? "—" : option.id === "gentle" ? "↝" : "≈") : "Aa"}
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
