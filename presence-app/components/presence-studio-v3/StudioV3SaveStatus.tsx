export type StudioV3SavePhase =
  | "clean"
  | "dirty"
  | "saving"
  | "saved"
  | "failed"
  | "conflict"
  | "memory-only"
  | "disabled";

export default function StudioV3SaveStatus({
  phase,
  message,
  browserPersistence,
  onRetry,
  onReload,
}: {
  phase: StudioV3SavePhase;
  message: string;
  browserPersistence: "available" | "memory-only";
  onRetry?: () => void;
  onReload?: () => void;
}) {
  const canRetry = phase === "failed";
  const canReload = phase === "conflict";
  return (
    <aside
      className={`studio-v3-save-status is-${phase}`}
      data-testid="presence-studio-v3-save-status"
      data-save-phase={phase}
      role="status"
      aria-live={phase === "failed" || phase === "conflict" ? "assertive" : "polite"}
    >
      <span className="studio-v3-save-status-dot" aria-hidden="true" />
      <div>
        <strong>{savePhaseLabel(phase)}</strong>
        <span>{message}</span>
        <small>
          Still unpublished · Visitor site unchanged
          {browserPersistence === "memory-only" ? " · Browser recovery is memory-only" : ""}
        </small>
      </div>
      {canRetry && onRetry && (
        <button type="button" onClick={onRetry} data-testid="presence-studio-v3-save-retry">
          Retry
        </button>
      )}
      {canReload && onReload && (
        <button type="button" onClick={onReload} data-testid="presence-studio-v3-save-reload">
          Reload latest
        </button>
      )}
    </aside>
  );
}

function savePhaseLabel(phase: StudioV3SavePhase): string {
  if (phase === "clean") return "Private state current";
  if (phase === "dirty") return "Private changes not saved";
  if (phase === "saving") return "Saving";
  if (phase === "saved") return "Saved privately";
  if (phase === "failed") return "Could not save private editor state";
  if (phase === "conflict") return "Conflict · stale base";
  if (phase === "memory-only") return "Memory-only mode";
  return "Durable save disabled";
}
