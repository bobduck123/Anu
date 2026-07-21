export type PresenceStudioV2EditorActivationInput =
  | "pointer"
  | "touch"
  | "keyboard-enter"
  | "keyboard-space";

export type PresenceStudioV2EditorIntent =
  | {
      kind: "activate-piece";
      pieceId: string;
      input: PresenceStudioV2EditorActivationInput;
    }
  | {
      kind: "suppress-action-without-piece";
      action: "cta" | "link";
      input: PresenceStudioV2EditorActivationInput;
    }
  | {
      kind: "navigate-room";
      roomId: string;
      source: "direct" | "arrow-previous" | "arrow-next";
    }
  | { kind: "clear-selection"; source: "escape" }
  | { kind: "suppress-unsupported-chrome"; controlId: string };

export type PresenceStudioV2EditorResult =
  | { kind: "piece-selected"; pieceId: string; suppressVisitor: true }
  | { kind: "action-suppressed"; reason: "missing-piece-id"; suppressVisitor: true }
  | { kind: "room-selected"; roomId: string; suppressVisitor: true }
  | { kind: "selection-cleared"; suppressVisitor: true }
  | { kind: "chrome-suppressed"; controlId: string; suppressVisitor: true };

export interface PresenceStudioV2EditorBridge {
  handleIntent(intent: PresenceStudioV2EditorIntent): PresenceStudioV2EditorResult;
}

export function validateStudioV2EditorBridgeResult(
  intent: PresenceStudioV2EditorIntent,
  result: PresenceStudioV2EditorResult,
): boolean {
  if (result.suppressVisitor !== true) return false;
  switch (intent.kind) {
    case "activate-piece":
      return result.kind === "piece-selected" && result.pieceId === intent.pieceId;
    case "suppress-action-without-piece":
      return result.kind === "action-suppressed" && result.reason === "missing-piece-id";
    case "navigate-room":
      return result.kind === "room-selected" && result.roomId === intent.roomId;
    case "clear-selection":
      return result.kind === "selection-cleared";
    case "suppress-unsupported-chrome":
      return result.kind === "chrome-suppressed" && result.controlId === intent.controlId;
    default:
      return false;
  }
}
