"use client";

// TreatedImage — image treatment is part of room identity, not random
// decoration. The component applies a stable CSS treatment class
// derived from ThemeGenome.image_treatment plus an optional texture
// overlay derived from ThemeGenome.texture.
//
// The treatment classes themselves are defined in app/globals.css.

import Image from "next/image";
import { useState } from "react";
import { ImageIcon } from "lucide-react";
import type { ImageTreatment, Texture } from "@/lib/presence/dna/types";

interface TreatedImageProps {
  src: string | null | undefined;
  alt: string;
  treatment: ImageTreatment;
  texture?: Texture;
  priority?: boolean;
  className?: string;
  // If set, the image fills its parent (absolute positioning). Otherwise
  // it sits in normal flow at intrinsic aspect ratio.
  fill?: boolean;
  intrinsicWidth?: number;
  intrinsicHeight?: number;
  fallbackIconClassName?: string;
  unoptimized?: boolean;
}

function isHttp(src: string) {
  try {
    const u = new URL(src);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export default function TreatedImage({
  src,
  alt,
  treatment,
  texture = "none",
  priority = false,
  className,
  fill = true,
  intrinsicWidth = 800,
  intrinsicHeight = 1000,
  fallbackIconClassName = "h-10 w-10",
  unoptimized,
}: TreatedImageProps) {
  const [failed, setFailed] = useState(false);
  const treatmentClass = `presence-treatment-${treatment}`;
  const textureClass = texture !== "none" ? `presence-texture-${texture}` : "";

  if (!src || failed) {
    return (
      <div className={`presence-image-fallback ${treatmentClass} ${textureClass} ${className ?? ""}`}>
        <ImageIcon className={`${fallbackIconClassName} text-[var(--presence-muted)]`} />
      </div>
    );
  }

  const shared = {
    src,
    alt,
    priority,
    unoptimized: unoptimized ?? isHttp(src),
    onError: () => setFailed(true),
    className: `presence-treated-img ${className ?? ""}`,
  } as const;

  return (
    <div className={`presence-treated-wrap ${treatmentClass} ${textureClass}`}>
      {fill ? (
        <Image {...shared} fill sizes="100vw" />
      ) : (
        <Image {...shared} width={intrinsicWidth} height={intrinsicHeight} />
      )}
    </div>
  );
}
