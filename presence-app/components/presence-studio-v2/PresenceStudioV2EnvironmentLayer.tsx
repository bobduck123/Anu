"use client";

import type { CSSProperties } from "react";
import type { StudioV2EnvironmentModel } from "@/lib/presence/studio-v2/environment";

interface PresenceStudioV2EnvironmentLayerProps {
  environment: StudioV2EnvironmentModel;
  accent: string;
  background: string;
  preview?: boolean;
}

/**
 * Decorative, DOM-only depth layer shared by Studio and preview. All room
 * content remains semantic DOM above it, so no-WebGL capability loss cannot
 * block editing, navigation, or private preview.
 */
export default function PresenceStudioV2EnvironmentLayer({
  environment,
  accent,
  background,
  preview = false,
}: PresenceStudioV2EnvironmentLayerProps) {
  const style = {
    "--v2-environment-accent": accent,
    "--v2-environment-background": background,
  } as CSSProperties;

  return (
    <div
      className={`v2-environment-layer world-${environment.worldId} focus-${environment.focus}${preview ? " is-preview" : ""}`}
      style={style}
      data-testid={preview ? "presence-studio-v2-preview-environment" : "presence-studio-v2-environment"}
      data-environment-runtime="dom"
      data-environment-depth={environment.depthLayers}
      data-environment-camera={environment.camera}
      data-environment-performance={environment.performance}
      data-environment-chamber={environment.focusedChamberId ?? "room"}
      data-environment-object={environment.focusedObjectId ?? "none"}
      aria-hidden="true"
    >
      <div className="v2-environment-depth v2-environment-depth-back" />
      <div className="v2-environment-depth v2-environment-depth-middle" />
      <div className="v2-environment-depth v2-environment-depth-front" />
    </div>
  );
}
