"use client";

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
  onNamedLookNameChange,
  onApplyLook,
  onStageRoomStyle,
  onCompareSide,
  onApplyStructural,
  onCancelStructural,
  onLockMotion,
  onSaveNamedLook,
  onAlterNamedLook,
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
  onNamedLookNameChange: (value: string) => void;
  onApplyLook: (lookId: StudioV3P1LookId) => void;
  onStageRoomStyle: (styleId: StudioV3P1RoomStyleId) => void;
  onCompareSide: (side: StudioV3CompareSide) => void;
  onApplyStructural: () => void;
  onCancelStructural: () => void;
  onLockMotion: () => void;
  onSaveNamedLook: () => void;
  onAlterNamedLook: () => void;
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
                <span className="studio-v3-option-swatch" aria-hidden="true" />
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
                <span className="studio-v3-room-style-number" aria-hidden="true">0{index + 1}</span>
                <strong>{option.name}</strong>
                <span>{option.description}</span>
                <small>{active ? "Current structure" : previewing ? "Previewing" : "Preview structure"}</small>
              </button>
            );
          })}
        </div>
      </fieldset>

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
          <button type="button" onClick={onAlterNamedLook} disabled={interactionsFrozen}>Alter</button>
          <button type="button" onClick={onRestoreNamedLook} disabled={!hasNamedLooks || interactionsFrozen} data-testid="presence-studio-v3-restore-named-look">Restore</button>
        </div>
      </section>
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
