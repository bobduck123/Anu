import { createElement, type ReactElement } from "react";
import type { Room } from "../../lib/presence/studio-room/model.ts";
import { StudioRoomRenderer } from "./StudioRoomRenderer.ts";

export interface StudioRoomCanvasProps {
  room: Room;
  dirty?: boolean;
  viewport?: "desktop" | "mobile";
  selectedObjectId?: string | null;
  selectionMode?: "ring" | "spotlight";
  density?: "compact" | "cozy" | "calm";
  reducedMotion?: boolean;
  onSelectObject?: (objectId: string) => void;
}

export const STUDIO_ROOM_CANVAS_CSS = `
.studio-room-canvas-shell {
  width: 100%;
  max-width: 100%;
  overflow-x: hidden;
  border-radius: 30px;
  border: 1px solid rgba(216, 164, 74, 0.26);
  background:
    radial-gradient(circle at 18% 0%, rgba(216,164,74,0.14), transparent 28rem),
    linear-gradient(180deg, rgba(255,255,255,0.06), rgba(0,0,0,0.2));
  padding: 12px;
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.1), 0 28px 70px rgba(0,0,0,0.24);
}
.studio-room-canvas-shell__status {
  display: flex;
  align-items: center;
  gap: 8px;
  border-radius: 18px;
  background: rgba(0,0,0,0.24);
  color: #f4e8d4;
  font-size: 0.82rem;
  line-height: 1.5;
  margin-bottom: 12px;
  padding: 10px 12px;
}
.studio-room-canvas-shell__status::before {
  content: "";
  width: 8px;
  height: 8px;
  border-radius: 999px;
  flex: none;
  background: #fb923c;
  box-shadow: 0 0 0 4px rgba(251,146,60,0.16);
}
.studio-room-canvas-shell__frame {
  width: 100%;
  margin: 0 auto;
  overflow: hidden;
  background: #0d0b08;
  box-shadow: 0 36px 90px -44px rgba(0,0,0,0.78);
}
.studio-room-canvas-shell[data-viewport="mobile"] .studio-room-canvas-shell__frame {
  max-width: 430px;
  min-height: 640px;
  border-radius: 34px;
  border: 10px solid #15110c;
}
.studio-room-canvas-shell[data-viewport="desktop"] .studio-room-canvas-shell__frame {
  max-width: 980px;
  border-radius: 18px;
  border: 1px solid rgba(255,255,255,0.08);
}
.studio-room-canvas-shell[data-density="compact"] {
  padding: 8px;
}
.studio-room-canvas-shell[data-density="calm"] {
  padding: 16px;
}
@media (max-width: 760px) {
  .studio-room-canvas-shell {
    margin-inline: -4px;
    border-radius: 24px;
    padding: 8px;
  }
  .studio-room-canvas-shell__status {
    font-size: 0.76rem;
  }
  .studio-room-canvas-shell[data-viewport="mobile"] .studio-room-canvas-shell__frame {
    max-width: min(100%, 420px);
    min-height: 62dvh;
    border-width: 6px;
    border-radius: 28px;
  }
}
`;

export function StudioRoomCanvas({
  room,
  dirty = false,
  viewport = "mobile",
  selectedObjectId = null,
  selectionMode = "ring",
  density = "cozy",
  reducedMotion = false,
  onSelectObject,
}: StudioRoomCanvasProps): ReactElement {
  return createElement(
    "section",
    {
      "data-testid": "studio-room-canvas-shell",
      "data-dirty": dirty ? "true" : "false",
      "data-preview-only": "true",
      "data-viewport": viewport,
      "data-density": density,
      className: "studio-room-canvas-shell",
    },
    createElement("style", null, STUDIO_ROOM_CANVAS_CSS),
    createElement(
      "div",
      {
        className: "studio-room-canvas-shell__status",
      },
      dirty
        ? "You are shaping the Draft room. Visitors still see the Live room."
        : "All changes saved. Visitors will not see them until you open the room.",
    ),
    createElement(
      "div",
      { className: "studio-room-canvas-shell__frame" },
      createElement(StudioRoomRenderer, {
        room,
        viewport,
        canvas: true,
        selectedObjectId,
        selectionMode,
        reducedMotion,
        onSelectObject,
      }),
    ),
  );
}
