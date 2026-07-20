import { createElement, type ReactElement } from "react";
import type { StudioRoomPreviewSnapshot } from "../../lib/presence/studio-room/previewSnapshot.ts";
import { StudioRoomCanvas } from "./StudioRoomCanvas.ts";

export interface StudioRoomPreviewComparisonProps {
  snapshot: StudioRoomPreviewSnapshot;
}

export function StudioRoomPreviewComparison({ snapshot }: StudioRoomPreviewComparisonProps): ReactElement {
  const sceneList = snapshot.existingRenderModel.scenes.map((scene) => `${scene.label} (${scene.widgets.length})`);
  const chamberList = snapshot.studioRoom.chambers.map((chamber) => `${chamber.title} (${chamber.objects.length})`);

  return createElement(
    "main",
    {
      "data-testid": "studio-room-internal-preview",
      style: {
        minHeight: "100vh",
        background: "#0f1013",
        color: "#f7f2e8",
        padding: "24px",
        fontFamily: "Inter, system-ui, sans-serif",
      },
    },
    createElement(
      "section",
      {
        role: "status",
        style: {
          border: "1px solid rgba(250, 204, 21, 0.35)",
          background: "rgba(250, 204, 21, 0.10)",
          borderRadius: "20px",
          padding: "16px",
          marginBottom: "20px",
        },
      },
      createElement("strong", null, "Internal preview only - not public route output."),
      createElement("p", { style: { margin: "8px 0 0", color: "#e7d9bd" } }, "This route compares the existing resolved render model with the new structured Studio Room canvas. It is not linked from owner or visitor navigation."),
    ),
    createElement(
      "section",
      {
        style: {
          display: "grid",
          gridTemplateColumns: "minmax(0, 0.9fr) minmax(0, 1.2fr)",
          gap: "20px",
          alignItems: "start",
        },
      },
      createElement(
        "aside",
        {
          "data-testid": "studio-room-existing-render-summary",
          style: {
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: "24px",
            padding: "18px",
            background: "rgba(255,255,255,0.04)",
          },
        },
        createElement("p", { style: eyebrowStyle }, "Existing resolved render output"),
        createElement("h1", { style: { marginTop: 8 } }, snapshot.existingRenderModel.identity.displayName.value),
        createElement("p", { style: { color: "#b9ad98" } }, snapshot.existingRenderModel.identity.headline.value),
        createElement(MetadataBlock, { label: "Source", value: snapshot.sourceLabel }),
        createElement(MetadataBlock, { label: "Mode", value: snapshot.debug.renderMode }),
        createElement(MetadataBlock, { label: "Scenes", value: `${snapshot.debug.existingSceneCount}` }),
        createElement(MetadataBlock, { label: "Widgets", value: `${snapshot.debug.existingWidgetCount}` }),
        createElement("ul", null, sceneList.map((item) => createElement("li", { key: item }, item))),
      ),
      createElement(
        "section",
        {
          "data-testid": "studio-room-adapted-canvas",
          style: {
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: "28px",
            padding: "18px",
            background: "rgba(255,255,255,0.04)",
          },
        },
        createElement("p", { style: eyebrowStyle }, "Adapted Studio Room canvas"),
        createElement(StudioRoomCanvas, { room: snapshot.studioRoom, dirty: true }),
      ),
    ),
    createElement(
      "section",
      {
        "data-testid": "studio-room-preview-debug",
        style: {
          marginTop: "20px",
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: "24px",
          padding: "18px",
          background: "rgba(255,255,255,0.04)",
        },
      },
      createElement("p", { style: eyebrowStyle }, "Bridge metadata"),
      createElement(MetadataBlock, { label: "Studio schema", value: snapshot.studioRoom.schemaVersion }),
      createElement(MetadataBlock, { label: "Chambers", value: `${snapshot.debug.studioChamberCount}` }),
      createElement(MetadataBlock, { label: "Objects", value: `${snapshot.debug.studioObjectCount}` }),
      createElement(MetadataBlock, { label: "Restricted keys in Studio payload", value: snapshot.debug.restrictedKeysInStudioPayload.join(", ") || "none" }),
      createElement(MetadataBlock, { label: "Restricted keys in public payload", value: snapshot.debug.restrictedKeysInPublicPayload.join(", ") || "none" }),
      createElement("ul", null, chamberList.map((item) => createElement("li", { key: item }, item))),
    ),
  );
}

function MetadataBlock({ label, value }: { label: string; value: string }) {
  return createElement(
    "p",
    { style: { margin: "10px 0", color: "#d9cdb9" } },
    createElement("span", { style: { color: "#9f927e", display: "inline-block", minWidth: "13rem" } }, label),
    value,
  );
}

const eyebrowStyle = {
  margin: 0,
  color: "#d8a44a",
  fontSize: "11px",
  fontWeight: 700,
  letterSpacing: "0.16em",
  textTransform: "uppercase",
} as const;
