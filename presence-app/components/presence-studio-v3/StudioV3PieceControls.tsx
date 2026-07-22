import type { StudioV2Object } from "@/lib/presence/studio-v2";

export interface StudioV3MediaChoice {
  id: string;
  label: string;
  src: string;
  alt: string;
  kind: "piece" | "asset";
  sourceRef?: string;
  mediaId?: string;
  available: boolean;
  unavailableReason?: string;
}

export default function StudioV3PieceControls({
  object,
  mediaChoices,
  selectedMediaChoiceId,
  requiredTitle,
  uploadEnabled,
  uploadReason,
  uploadBusy,
  onCopyChange,
  onMediaChoice,
  onUpload,
  onDone,
  onCancel,
}: {
  object: StudioV2Object;
  mediaChoices: StudioV3MediaChoice[];
  selectedMediaChoiceId?: string;
  requiredTitle: boolean;
  uploadEnabled: boolean;
  uploadReason: string;
  uploadBusy: boolean;
  onCopyChange: (values: { title?: string; body?: string; caption?: string }) => void;
  onMediaChoice: (choice: StudioV3MediaChoice) => void;
  onUpload: (file: File) => void;
  onDone: () => void;
  onCancel: () => void;
}) {
  const titleLabel = object.type === "cta" || object.type === "link" || object.type === "portal"
    ? "CTA label"
    : "Title";
  return (
    <div className="studio-v3-piece-controls" data-testid="presence-studio-v3-piece-editor">
      <header>
        <div>
          <p className="studio-v3-kicker">Selected Piece · {object.type}</p>
          <h2>{object.title || "Untitled Piece"}</h2>
        </div>
        <span className="studio-v3-private-badge">Private Room override</span>
      </header>

      <section className="studio-v3-edit-section" aria-labelledby="studio-v3-copy-heading">
        <div>
          <p className="studio-v3-kicker">Content</p>
          <h3 id="studio-v3-copy-heading">Edit on the canvas</h3>
          <p>Every keystroke updates this private editor preview. Canonical Library records are not changed.</p>
        </div>
        <div className="studio-v3-field-grid">
          <label>
            <span>{titleLabel}</span>
            <input
              value={object.title ?? ""}
              maxLength={180}
              required={requiredTitle}
              aria-describedby={requiredTitle ? "studio-v3-required-cta-title-help" : undefined}
              onChange={(event) => onCopyChange({ title: event.target.value })}
              data-testid="presence-studio-v3-piece-title"
            />
            {requiredTitle && (
              <small id="studio-v3-required-cta-title-help">This required navigation CTA must keep a visible label.</small>
            )}
          </label>
          <label className="studio-v3-field-wide">
            <span>Body / description</span>
            <textarea
              value={object.detail ?? ""}
              maxLength={4000}
              rows={4}
              onChange={(event) => onCopyChange({ body: event.target.value })}
              data-testid="presence-studio-v3-piece-body"
            />
          </label>
          <label className="studio-v3-field-wide">
            <span>Caption / supporting line</span>
            <input
              value={object.meta ?? ""}
              maxLength={500}
              onChange={(event) => onCopyChange({ caption: event.target.value })}
              data-testid="presence-studio-v3-piece-caption"
            />
          </label>
        </div>
      </section>

      <section className="studio-v3-edit-section" aria-labelledby="studio-v3-media-heading">
        <div>
          <p className="studio-v3-kicker">Image / media</p>
          <h3 id="studio-v3-media-heading">Choose existing visual material</h3>
          <p>Only stable Piece or owner-private media references are saved. Preview URLs and blobs never enter V3 metadata.</p>
        </div>
        {mediaChoices.length > 0 ? (
          <div className="studio-v3-media-choice-grid">
            {mediaChoices.map((choice) => (
              <button
                key={choice.id}
                type="button"
                className={`studio-v3-media-choice${selectedMediaChoiceId === choice.id ? " is-active" : ""}`}
                aria-pressed={selectedMediaChoiceId === choice.id}
                disabled={!choice.available}
                title={choice.available ? `Use ${choice.label}` : choice.unavailableReason}
                onClick={() => onMediaChoice(choice)}
                data-testid={`presence-studio-v3-media-choice-${choice.id.replace(/[^a-z0-9-]+/gi, "-")}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- owner-authorized previews include signed/private URLs. */}
                <img src={choice.src} alt="" />
                <span>{choice.label}</span>
                <small>{choice.kind === "asset" ? "Private media" : "Piece media"}</small>
                {!choice.available && <small>{choice.unavailableReason}</small>}
              </button>
            ))}
          </div>
        ) : (
          <p className="studio-v3-empty-state">No stable existing media is available for this Room yet.</p>
        )}
        <div className="studio-v3-upload-row" data-testid="presence-studio-v3-upload-state">
          <label className={`studio-v3-upload-button${uploadEnabled ? "" : " is-disabled"}`}>
            <span>{uploadBusy ? "Uploading privately…" : "Upload JPG, PNG, or WEBP"}</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              disabled={!uploadEnabled || uploadBusy}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) onUpload(file);
                event.currentTarget.value = "";
              }}
              data-testid="presence-studio-v3-upload-input"
            />
          </label>
          <small>{uploadEnabled ? "Uploads stay in the owner-private media inventory." : uploadReason}</small>
        </div>
        <div className="studio-v3-disabled-capability" data-testid="presence-studio-v3-crop-state" aria-label="Crop and focal position unavailable">
          <div>
            <strong>Crop and focal position</strong>
            <small>Coming in a bounded media-transform gate. This editor will not pretend to save unsupported crop data.</small>
          </div>
          <button type="button" disabled title="No reviewed crop/focal persistence contract is available in M1.">Unavailable</button>
        </div>
      </section>

      <footer className="studio-v3-sheet-actions">
        <button type="button" className="studio-v3-primary" onClick={onDone} data-testid="presence-studio-v3-piece-done">
          Done
        </button>
        <button type="button" onClick={onCancel} data-testid="presence-studio-v3-piece-cancel">
          Cancel changes
        </button>
      </footer>
    </div>
  );
}
