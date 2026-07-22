import type {
  StudioV2LayoutZone,
  StudioV2Object,
  StudioV2ObjectPlacement,
  StudioV2PlacementSize,
  StudioV2PlacementTreatment,
} from "@/lib/presence/studio-v2";

const STUDIO_V3_DRAG_TYPE = "application/x-presence-studio-v3-piece";

export default function StudioV3ArrangeControls({
  object,
  placement,
  zones,
  featured,
  hidden,
  canUnplace,
  unplaceReason,
  canToggleVisibility,
  visibilityReason,
  error,
  onMoveZone,
  onMoveEarlier,
  onMoveLater,
  onToggleFeatured,
  onToggleVisibility,
  onSize,
  onTreatment,
  onUnplace,
  onDone,
  onCancel,
}: {
  object: StudioV2Object;
  placement: StudioV2ObjectPlacement | null;
  zones: readonly StudioV2LayoutZone[];
  featured: boolean;
  hidden: boolean;
  canUnplace: boolean;
  unplaceReason?: string;
  canToggleVisibility: boolean;
  visibilityReason?: string;
  error?: string | null;
  onMoveZone: (zoneId: string) => void;
  onMoveEarlier: () => void;
  onMoveLater: () => void;
  onToggleFeatured: () => void;
  onToggleVisibility: () => void;
  onSize: (size: StudioV2PlacementSize) => void;
  onTreatment: (treatment: StudioV2PlacementTreatment) => void;
  onUnplace: () => void;
  onDone: () => void;
  onCancel: () => void;
}) {
  const activeZone = zones.find((zone) => zone.id === placement?.zoneId);
  return (
    <div className="studio-v3-arrange" data-testid="presence-studio-v3-arrange-controls">
      <header>
        <div>
          <p className="studio-v3-kicker">Arrange · constrained direct manipulation</p>
          <h2>{object.title}</h2>
        </div>
        <dl className="studio-v3-placement-readout" data-testid="presence-studio-v3-placement-summary">
          <div><dt>Zone</dt><dd>{placement?.zoneId ?? "Safe default"}</dd></div>
          <div><dt>Order</dt><dd>{placement ? placement.order + 1 : "—"}</dd></div>
          <div><dt>Size</dt><dd>{placement?.size ?? "Default"}</dd></div>
          <div><dt>Visibility</dt><dd>{hidden ? "Hidden" : "Visible"}</dd></div>
        </dl>
      </header>

      <p id="studio-v3-drag-help">Drag the selected Piece onto a registered zone, or choose a zone with keyboard/tap controls.</p>
      <div className="studio-v3-zone-board" aria-describedby="studio-v3-drag-help">
        <div
          className="studio-v3-drag-piece"
          draggable
          aria-hidden="true"
          onDragStart={(event) => {
            event.dataTransfer.effectAllowed = "move";
            event.dataTransfer.setData("text/plain", object.id);
            event.dataTransfer.setData(STUDIO_V3_DRAG_TYPE, object.id);
          }}
          data-testid="presence-studio-v3-drag-piece"
        >
          <span aria-hidden="true">↕</span>
          <strong>{object.title}</strong>
          <small>Selected Piece</small>
        </div>
        <div className="studio-v3-zone-grid">
          {zones.map((zone) => {
            const accepts = zone.accepts.includes(object.type);
            const active = placement?.zoneId === zone.id;
            return (
              <button
                key={zone.id}
                type="button"
                className={`studio-v3-zone-card${active ? " is-active" : ""}`}
                aria-pressed={active}
                disabled={!accepts}
                title={accepts ? zone.description : `${object.type} Pieces cannot enter this zone.`}
                onClick={() => onMoveZone(zone.id)}
                onDragOver={(event) => {
                  if (!accepts || !event.dataTransfer.types.includes(STUDIO_V3_DRAG_TYPE)) return;
                  event.preventDefault();
                  event.dataTransfer.dropEffect = "move";
                }}
                onDrop={(event) => {
                  if (!accepts || event.dataTransfer.getData(STUDIO_V3_DRAG_TYPE) !== object.id) return;
                  event.preventDefault();
                  onMoveZone(zone.id);
                }}
                data-testid={`presence-studio-v3-zone-${zone.id}`}
              >
                <span className="studio-v3-zone-miniature" aria-hidden="true"><i /><i /><i /></span>
                <strong>{zone.label}</strong>
                <small>{accepts ? zone.mobileBehaviour.replaceAll("-", " ") : "Unavailable for this Piece"}</small>
              </button>
            );
          })}
        </div>
      </div>

      {error && <p className="studio-v3-inline-error" role="alert">{error}</p>}

      <section className="studio-v3-edit-section" aria-labelledby="studio-v3-piece-appearance-heading">
        <div>
          <p className="studio-v3-kicker">Piece appearance · safe registered controls</p>
          <h3 id="studio-v3-piece-appearance-heading">Registered size and treatment</h3>
          <p>Choices are limited to the selected safe zone and update only this Piece.</p>
        </div>
        {activeZone ? (
          <div className="studio-v3-appearance-choices">
            <div role="group" aria-label="Piece size" className="studio-v3-visual-choice-row">
              {activeZone.allowedSizes.map((size) => (
                <button
                  key={size}
                  type="button"
                  className={`studio-v3-appearance-card is-size-${size}${placement?.size === size ? " is-active" : ""}`}
                  aria-pressed={placement?.size === size}
                  onClick={() => onSize(size)}
                  data-testid={`presence-studio-v3-size-${size}`}
                >
                  <span aria-hidden="true" className="studio-v3-appearance-swatch" />
                  <strong>{size}</strong>
                </button>
              ))}
            </div>
            {activeZone.allowedTreatments && activeZone.allowedTreatments.length > 0 ? (
              <div role="group" aria-label="Piece treatment" className="studio-v3-visual-choice-row">
                {activeZone.allowedTreatments.map((treatment) => (
                  <button
                    key={treatment}
                    type="button"
                    className={`studio-v3-appearance-card is-treatment-${treatment}${placement?.treatment === treatment ? " is-active" : ""}`}
                    aria-pressed={placement?.treatment === treatment}
                    onClick={() => onTreatment(treatment)}
                    data-testid={`presence-studio-v3-treatment-${treatment}`}
                  >
                    <span aria-hidden="true" className="studio-v3-appearance-swatch" />
                    <strong>{treatment}</strong>
                  </button>
                ))}
              </div>
            ) : (
              <p className="studio-v3-empty-state">This safe zone has no registered Piece treatments.</p>
            )}
          </div>
        ) : (
          <p className="studio-v3-empty-state">Choose a registered zone before changing size or treatment.</p>
        )}
      </section>

      <div className="studio-v3-arrange-actions" aria-label="Placement actions">
        <button type="button" onClick={onMoveEarlier} data-testid="presence-studio-v3-move-earlier">Move earlier</button>
        <button type="button" onClick={onMoveLater} data-testid="presence-studio-v3-move-later">Move later</button>
        <button type="button" aria-pressed={featured} onClick={onToggleFeatured} data-testid="presence-studio-v3-toggle-feature">
          {featured ? "Unfeature" : "Feature"}
        </button>
        <button
          type="button"
          aria-pressed={hidden}
          aria-disabled={!canToggleVisibility}
          aria-describedby={!canToggleVisibility ? "studio-v3-required-cta-visibility-help" : undefined}
          onClick={() => {
            if (canToggleVisibility) onToggleVisibility();
          }}
          title={!canToggleVisibility ? visibilityReason : undefined}
          data-testid="presence-studio-v3-toggle-visibility"
        >
          {hidden ? "Show" : "Hide"}
        </button>
        {!canToggleVisibility && <span id="studio-v3-required-cta-visibility-help" className="sr-only">{visibilityReason}</span>}
        <button
          type="button"
          onClick={() => {
            if (canUnplace) onUnplace();
          }}
          aria-disabled={!canUnplace}
          aria-describedby={!canUnplace ? "studio-v3-unplace-help" : undefined}
          title={canUnplace ? "Return this placed Piece to the Library." : unplaceReason}
        >
          Unplace
        </button>
        {!canUnplace && <span id="studio-v3-unplace-help" className="sr-only">{unplaceReason}</span>}
      </div>

      <footer className="studio-v3-sheet-actions">
        <button type="button" className="studio-v3-primary" onClick={onDone}>Done</button>
        <button type="button" onClick={onCancel} data-testid="presence-studio-v3-arrange-cancel">Cancel · restore prior state</button>
      </footer>
    </div>
  );
}
