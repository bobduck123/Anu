import * as THREE from "three";
import {
  GLOBAL_SPATIAL_COMPONENT_CACHE,
  SpatialComponentCache,
} from "../../lib/presence/spatial/assetCache.ts";
import { SPATIAL_GARMENT_HANG_PROFILES } from "../../lib/presence/spatial/model.ts";
import type {
  SpatialComponentRef,
  SpatialGarmentArtworkRole,
  SpatialGarmentHangProfile,
  SpatialMaterialSlotId,
  SpatialRenderItem,
  SpatialVec3,
} from "../../lib/presence/spatial/model.ts";

export type SpatialGeometryTemplateSource =
  | "procedural-primitive"
  | "cached-asset-bounds-fallback";

export interface SpatialGeometryTemplatePart {
  geometry: THREE.BufferGeometry;
  position: SpatialVec3;
  rotation?: SpatialVec3;
  scale?: SpatialVec3;
  materialSlot?: SpatialMaterialSlotId;
  materialSide?: "front" | "back" | "double";
  mediaSurface?: boolean;
  /**
   * Artwork layer whose alpha channel defines the visible silhouette.
   *
   * Rendered with alpha testing so a cut-out PNG/WebP produces the sleeve,
   * collar, hem or shoe outline without any geometry describing that shape.
   */
  alphaArtwork?: boolean;
  /**
   * Invisible carrier ("mannequin") geometry.
   *
   * Contributes bounds, hang point and selection volume only. It never writes
   * colour or depth, and its material is never shared with an artwork layer, so
   * hiding the carrier can never hide the artwork.
   */
  carrier?: boolean;
  /** Which garment artwork channel this part binds to. */
  mediaRole?: SpatialGarmentArtworkRole;
}

export interface SpatialGeometryTemplate {
  componentKey: string;
  signature: string;
  source: SpatialGeometryTemplateSource;
  parts: readonly SpatialGeometryTemplatePart[];
}

export type SpatialGeometryTemplateFactory = (item: SpatialRenderItem) => SpatialGeometryTemplate;

export function getSpatialGeometryTemplate(
  item: SpatialRenderItem,
  cache: SpatialComponentCache = GLOBAL_SPATIAL_COMPONENT_CACHE,
  factory: SpatialGeometryTemplateFactory = createSpatialGeometryTemplate,
): SpatialGeometryTemplate {
  const expectedSignature = spatialGeometrySignature(item);
  // The cache must be keyed by the same identity the signature describes.
  //
  // Keying on componentId@version alone was a real defect: every garment article
  // shares `presence.garment-hanger@1.0.0`, so binding a pant after a shirt
  // returned the shirt's cached template, failed the signature check below and
  // threw during scene construction. The renderer caught that, reported a
  // runtime failure and unmounted, so the WebGL canvas vanished with no console
  // error. Variants of one component now cache separately instead of colliding.
  const template = cache.getOrCreate(
    geometryVariantRef(item, expectedSignature),
    () => factory(item),
    disposeSpatialGeometryTemplate,
  );
  if (template.componentKey !== item.componentKey || template.signature !== expectedSignature) {
    throw new Error(`Cached geometry template does not match ${item.componentKey}.`);
  }
  return template;
}

export function createSpatialGeometryTemplate(item: SpatialRenderItem): SpatialGeometryTemplate {
  const template = item.geometry.kind === "asset"
    ? createAssetBoundsFallback(item)
    : createPrimitiveTemplate(item);
  return {
    componentKey: item.componentKey,
    signature: spatialGeometrySignature(item),
    ...template,
  };
}

export function disposeSpatialGeometryTemplate(template: SpatialGeometryTemplate): void {
  const uniqueGeometries = new Set(template.parts.map((part) => part.geometry));
  for (const geometry of uniqueGeometries) geometry.dispose();
}

function createAssetBoundsFallback(item: SpatialRenderItem): Pick<SpatialGeometryTemplate, "source" | "parts"> {
  const { width, height, depth } = item.dimensions;
  return {
    source: "cached-asset-bounds-fallback",
    parts: [part(new THREE.BoxGeometry(width, height, depth))],
  };
}

function createPrimitiveTemplate(item: SpatialRenderItem): Pick<SpatialGeometryTemplate, "source" | "parts"> {
  const { width, height, depth } = item.dimensions;
  if (item.geometry.kind !== "primitive") {
    throw new Error(`Expected procedural geometry for ${item.componentKey}.`);
  }
  const primitive = item.geometry.primitive;
  let parts: SpatialGeometryTemplatePart[];

  switch (primitive) {
    case "box":
      parts = boxPrimitiveParts(item);
      break;
    case "plane":
      parts = [part(new THREE.PlaneGeometry(width, height), [0, 0, 0], undefined, "double", true)];
      break;
    case "cylinder": {
      const radius = Math.max(0.02, width / 2);
      parts = [part(new THREE.CylinderGeometry(radius, radius, height, 20))];
      break;
    }
    case "rack":
      parts = rackParts(width, height, depth);
      break;
    case "projection-field":
      parts = projectionFieldParts(width, height, depth);
      break;
    case "open-shell":
      parts = openShellParts(width, height, depth);
      break;
    case "ribbed-wall":
      parts = ribbedWallParts(width, height, depth);
      break;
    case "display-bay":
      parts = displayBayParts(width, height, depth);
      break;
    case "rounded-island":
      parts = roundedIslandParts(width, height, depth);
      break;
    case "suspended-rack":
      parts = suspendedRackParts(width, height, depth);
      break;
    case "garment-hanger":
      parts = garmentHangerParts(width, height, depth, item.garment);
      break;
    case "framed-media":
      parts = framedMediaParts(width, height, depth);
      break;
    case "projection-grid":
      parts = projectionGridParts(width, height, depth);
      break;
    case "display-shelf":
      parts = displayShelfParts(width, height, depth);
      break;
    case "sign-card":
      parts = signCardParts(width, height, depth);
      break;
    case "product-block":
      parts = productBlockParts(width, height, depth);
      break;
    case "light-fixture":
      parts = lightFixtureParts(width, height, depth);
      break;
    case "drape-divider":
      parts = drapeDividerParts(width, height, depth);
      break;
    case "archive-wall":
      parts = archiveWallParts(width, height, depth);
      break;
    case "listening-station":
      parts = listeningStationParts(width, height, depth);
      break;
    case "spherical-gallery":
      parts = sphericalGalleryParts(width, height, depth);
      break;
    default:
      return neverPrimitive(primitive);
  }

  return { source: "procedural-primitive", parts };
}

function openShellParts(width: number, height: number, depth: number): SpatialGeometryTemplatePart[] {
  const wall = Math.max(0.12, Math.min(width, height) * 0.025);
  const rail = Math.max(0.08, wall * 0.72);
  return [
    part(new THREE.BoxGeometry(wall, height, depth), [-width / 2 + wall / 2, 0, 0], "wall"),
    part(new THREE.BoxGeometry(wall, height, depth), [width / 2 - wall / 2, 0, 0], "wall"),
    part(new THREE.BoxGeometry(width, height, wall), [0, 0, -depth / 2 + wall / 2], "wall"),
    part(new THREE.BoxGeometry(width, wall, depth), [0, height / 2 - wall / 2, 0], "wall"),
    part(new THREE.BoxGeometry(width - wall * 2, rail, rail), [0, height / 2 - wall - rail / 2, -depth / 2 + wall + rail / 2], "wall"),
    part(new THREE.BoxGeometry(rail, rail, depth - wall), [-width / 2 + wall + rail / 2, height / 2 - wall - rail / 2, 0], "wall"),
    part(new THREE.BoxGeometry(rail, rail, depth - wall), [width / 2 - wall - rail / 2, height / 2 - wall - rail / 2, 0], "wall"),
  ];
}

function boxPrimitiveParts(item: SpatialRenderItem): SpatialGeometryTemplatePart[] {
  const { width, height, depth } = item.dimensions;
  switch (item.category) {
    case "shell":
      return openShellParts(width, height, depth);
    case "floor":
      return floorSlabParts(width, height, depth);
    case "wall":
      return wallPanelParts(width, height, depth);
    case "surface":
      return surfaceBlockParts(width, height, depth);
    default:
      return [part(new THREE.BoxGeometry(width, height, depth))];
  }
}

function floorSlabParts(width: number, height: number, depth: number): SpatialGeometryTemplatePart[] {
  const bevel = Math.max(0.018, height * 0.18);
  const seam = Math.max(0.012, height * 0.12);
  return [
    part(new THREE.BoxGeometry(width, height - bevel, depth), [0, -bevel / 2, 0], "floor"),
    part(new THREE.BoxGeometry(width * 0.985, bevel, depth * 0.985), [0, height / 2 - bevel / 2, 0], "floor"),
    part(new THREE.BoxGeometry(seam, seam, depth * 0.965), [-width * 0.25, height / 2 + seam / 2, 0], "floor"),
    part(new THREE.BoxGeometry(seam, seam, depth * 0.965), [width * 0.25, height / 2 + seam / 2, 0], "floor"),
    part(new THREE.BoxGeometry(width * 0.965, seam, seam), [0, height / 2 + seam / 2, -depth * 0.25], "floor"),
    part(new THREE.BoxGeometry(width * 0.965, seam, seam), [0, height / 2 + seam / 2, depth * 0.25], "floor"),
  ];
}

function wallPanelParts(width: number, height: number, depth: number): SpatialGeometryTemplatePart[] {
  const frame = Math.max(0.06, Math.min(width, height) * 0.018);
  const faceZ = depth / 2 + 0.004;
  return [
    part(new THREE.BoxGeometry(width, height, depth * 0.72), [0, 0, -depth * 0.08], "wall"),
    part(new THREE.BoxGeometry(width, frame, frame), [0, height / 2 - frame / 2, faceZ], "logo-accent"),
    part(new THREE.BoxGeometry(width, frame, frame), [0, -height / 2 + frame / 2, faceZ], "logo-accent"),
    part(new THREE.BoxGeometry(frame, height, frame), [-width / 2 + frame / 2, 0, faceZ], "wall"),
    part(new THREE.BoxGeometry(frame, height, frame), [width / 2 - frame / 2, 0, faceZ], "wall"),
    part(new THREE.PlaneGeometry(width - frame * 3, height - frame * 3), [0, 0, depth / 2 + 0.008], "poster-decal", "double", true),
  ];
}

function surfaceBlockParts(width: number, height: number, depth: number): SpatialGeometryTemplatePart[] {
  const top = Math.max(0.08, height * 0.16);
  const base = Math.max(0.06, height * 0.1);
  const insetWidth = width * 0.82;
  const insetDepth = depth * 0.76;
  const footWidth = Math.max(0.06, Math.min(width, depth) * 0.08);
  return [
    part(new THREE.BoxGeometry(width, top, depth), [0, height / 2 - top / 2, 0], "tabletop"),
    part(new THREE.BoxGeometry(insetWidth, height - top - base, insetDepth), [0, (base - top) / 2, 0], "tabletop"),
    part(new THREE.BoxGeometry(width * 0.88, base, depth * 0.86), [0, -height / 2 + base / 2, 0], "logo-accent"),
    part(new THREE.BoxGeometry(footWidth, base * 0.7, depth * 0.92), [-width * 0.34, -height / 2 - base * 0.05, 0], "tabletop"),
    part(new THREE.BoxGeometry(footWidth, base * 0.7, depth * 0.92), [width * 0.34, -height / 2 - base * 0.05, 0], "tabletop"),
  ];
}

function ribbedWallParts(width: number, height: number, depth: number): SpatialGeometryTemplatePart[] {
  const ribCount = Math.max(10, Math.round(width / 0.22));
  const ribWidth = width / ribCount * 0.42;
  const trim = Math.max(0.05, depth * 0.28);
  const ribs = Array.from({ length: ribCount }, (_, index) => (
    part(
      new THREE.BoxGeometry(ribWidth, height * 0.98, depth * 0.48),
      [-width / 2 + (index + 0.5) * width / ribCount, 0, depth * 0.24],
      "wall",
    )
  ));
  return [
    part(new THREE.BoxGeometry(width, height, depth * 0.48), [0, 0, -depth * 0.24], "wall"),
    part(new THREE.BoxGeometry(width, trim, depth * 0.7), [0, height / 2 - trim / 2, depth * 0.06], "logo-accent"),
    part(new THREE.BoxGeometry(width, trim, depth * 0.7), [0, -height / 2 + trim / 2, depth * 0.06], "logo-accent"),
    ...ribs,
  ];
}

function displayBayParts(width: number, height: number, depth: number): SpatialGeometryTemplatePart[] {
  const frame = Math.max(0.12, width * 0.035);
  const shelf = Math.max(0.07, height * 0.025);
  const divider = Math.max(0.045, frame * 0.45);
  return [
    part(new THREE.BoxGeometry(width, height, frame), [0, 0, -depth / 2 + frame / 2], "wall"),
    part(new THREE.BoxGeometry(frame, height, depth), [-width / 2 + frame / 2, 0, 0], "tabletop"),
    part(new THREE.BoxGeometry(frame, height, depth), [width / 2 - frame / 2, 0, 0], "tabletop"),
    part(new THREE.BoxGeometry(width, frame, depth), [0, -height / 2 + frame / 2, 0], "tabletop"),
    part(new THREE.BoxGeometry(width, frame, depth), [0, height / 2 - frame / 2, 0], "tabletop"),
    part(new THREE.BoxGeometry(divider, height - frame * 2, depth * 0.82), [-width * 0.18, 0, 0.02], "rack-metal"),
    part(new THREE.BoxGeometry(divider, height - frame * 2, depth * 0.82), [width * 0.18, 0, 0.02], "rack-metal"),
    part(new THREE.BoxGeometry(width * 0.88, shelf, depth * 0.88), [0, -height * 0.2, 0.02], "tabletop"),
    part(new THREE.BoxGeometry(width * 0.88, shelf, depth * 0.88), [0, height * 0.13, 0.02], "tabletop"),
    part(new THREE.BoxGeometry(width * 0.88, shelf, depth * 0.88), [0, height * 0.44, 0.02], "tabletop"),
  ];
}

function roundedIslandParts(width: number, height: number, depth: number): SpatialGeometryTemplatePart[] {
  const radius = depth / 2;
  const centerWidth = Math.max(0.05, width - depth);
  const baseHeight = Math.max(0.035, height * 0.06);
  const lipHeight = Math.max(0.025, height * 0.035);
  return [
    part(new THREE.BoxGeometry(centerWidth, height, depth), [0, 0, 0], "tabletop"),
    part(new THREE.CylinderGeometry(radius, radius, height, 32), [-centerWidth / 2, 0, 0], "tabletop"),
    part(new THREE.CylinderGeometry(radius, radius, height, 32), [centerWidth / 2, 0, 0], "tabletop"),
    part(new THREE.BoxGeometry(width * 0.84, lipHeight, depth * 0.74), [0, height / 2 + lipHeight / 2, 0], "logo-accent"),
    part(new THREE.BoxGeometry(width * 0.8, baseHeight, depth * 0.72), [0, -height / 2 + baseHeight / 2, 0], "rack-metal"),
    part(new THREE.BoxGeometry(width * 0.54, baseHeight * 1.4, depth * 0.44), [0, -height / 2 - baseHeight * 0.25, 0], "rack-metal"),
  ];
}

function suspendedRackParts(width: number, height: number, depth: number): SpatialGeometryTemplatePart[] {
  const metal = Math.max(0.05, width * 0.009);
  const railY = height * 0.1;
  const shelfY = height * 0.43;
  const footY = -height * 0.5 + metal;
  return [
    part(new THREE.BoxGeometry(width, height * 0.16, depth), [0, -height * 0.42, 0], "tabletop"),
    part(new THREE.BoxGeometry(width, metal, metal), [0, railY, 0], "rack-metal"),
    part(new THREE.BoxGeometry(width, metal, metal), [0, railY - metal * 3, depth * 0.28], "rack-metal"),
    part(new THREE.BoxGeometry(width, metal, metal), [0, railY - metal * 3, -depth * 0.28], "rack-metal"),
    part(new THREE.BoxGeometry(width, metal * 1.2, depth * 0.82), [0, shelfY, 0], "rack-metal"),
    part(new THREE.BoxGeometry(metal, height * 0.85, metal), [-width / 2 + metal, height * 0.075, 0], "rack-metal"),
    part(new THREE.BoxGeometry(metal, height * 0.85, metal), [width / 2 - metal, height * 0.075, 0], "rack-metal"),
    part(new THREE.BoxGeometry(metal, height * 0.4, metal), [-width * 0.17, height * 0.3, 0], "rack-metal"),
    part(new THREE.BoxGeometry(metal, height * 0.4, metal), [width * 0.17, height * 0.3, 0], "rack-metal"),
    part(new THREE.BoxGeometry(width * 0.92, metal, depth * 0.08), [0, footY, depth * 0.48], "rack-metal"),
    part(new THREE.BoxGeometry(width * 0.92, metal, depth * 0.08), [0, footY, -depth * 0.48], "rack-metal"),
  ];
}

function garmentHangerParts(
  width: number,
  height: number,
  depth: number,
  garment?: SpatialRenderItem["garment"],
): SpatialGeometryTemplatePart[] {
  // Stage A invisible garment carrier, article-aware.
  //
  // Deliberately NO silhouette geometry. Artwork alpha defines the outline, so
  // one carrier per article serves every design bound to it. Proportions differ
  // by article because a pant plane is tall and narrow while a shoe plane is
  // wide and short; the geometry still describes a bounding area, not a garment.
  const article = garment?.articleType ?? "generic";
  const aspect = garment?.aspect ?? GARMENT_CARRIER_PROFILES[article].aspect;
  const profile = GARMENT_CARRIER_PROFILES[article];
  const hang = SPATIAL_GARMENT_HANG_PROFILES[article];

  const artworkHeight = height * profile.heightFactor;
  const artworkWidth = Math.min(width * profile.maxWidthFactor, artworkHeight * aspect);
  // Artwork centre comes from the shared hang profile so the rail placement and
  // the carrier interior agree about where this article sits.
  const artworkY = height * hang.artworkCentreY;
  const faceOffset = Math.max(0.012, depth * 0.18);

  const carrier = part(
    new THREE.BoxGeometry(
      Math.max(0.05, artworkWidth * 0.82),
      Math.max(0.05, artworkHeight * 0.94),
      Math.max(0.04, depth * 0.5),
    ),
    [0, artworkY, 0],
    "fabric",
    "front",
    false,
    undefined,
    undefined,
    { carrier: true },
  );

  const hardware = garmentHardwareParts(width, height, depth, hang);

  if (article === "shoe") {
    // Footwear is not a front/back garment. A single angled display plane is an
    // honest proxy; outer-side and top artwork are separate channels rather than
    // a pretend "back print".
    return [
      carrier,
      artworkPart(artworkWidth, artworkHeight, [0, artworkY, faceOffset], "display", [-GARMENT_SHOE_TILT, 0, 0]),
      artworkPart(artworkWidth * 0.94, artworkHeight * 0.94, [0, artworkY, -faceOffset], "outer-side", [-GARMENT_SHOE_TILT, Math.PI, 0]),
      ...hardware,
    ];
  }

  return [
    carrier,
    artworkPart(artworkWidth, artworkHeight, [0, artworkY, faceOffset], "front"),
    artworkPart(artworkWidth, artworkHeight, [0, artworkY, -faceOffset], "back", [0, Math.PI, 0]),
    ...hardware,
  ];
}

/**
 * Visible hanger hardware.
 *
 * Hardware is genuinely visible — it is real physical furniture — but it never
 * describes the garment. It stays in the `rack-metal` slot and is never an
 * artwork layer, so it can never become the silhouette.
 */
function garmentHardwareParts(
  width: number,
  height: number,
  depth: number,
  hang: SpatialGarmentHangProfile,
): SpatialGeometryTemplatePart[] {
  const barThickness = Math.max(0.018, width * 0.018);
  const barDepth = Math.max(0.018, depth * 0.2);
  const y = height * hang.hardwareY;

  if (hang.hardware === "clamp-bar") {
    // Trousers hang from a waistband clamp, not a shoulder line.
    const clampWidth = width * 0.09;
    const clampHeight = Math.max(0.035, height * 0.035);
    return [
      part(new THREE.BoxGeometry(width * 0.52, barThickness, barDepth), [0, y, 0], "rack-metal"),
      part(new THREE.BoxGeometry(clampWidth, clampHeight, barDepth * 1.4), [-width * 0.2, y - clampHeight * 0.5, 0], "rack-metal"),
      part(new THREE.BoxGeometry(clampWidth, clampHeight, barDepth * 1.4), [width * 0.2, y - clampHeight * 0.5, 0], "rack-metal"),
      part(new THREE.CylinderGeometry(width * 0.022, width * 0.022, height * 0.12, 10), [0, y + height * 0.07, 0], "rack-metal"),
    ];
  }

  if (hang.hardware === "stand") {
    // Footwear sits on a small stand. This is a rack-display proxy: shoes do not
    // hang, and nothing here claims solved footwear presentation.
    const plateWidth = width * 0.46;
    return [
      part(new THREE.BoxGeometry(plateWidth, Math.max(0.02, height * 0.02), plateWidth * 0.62), [0, y, 0], "rack-metal"),
      part(new THREE.CylinderGeometry(width * 0.03, width * 0.045, height * 0.1, 10), [0, y + height * 0.055, 0], "rack-metal"),
    ];
  }

  // Default shirt/generic hanger: bar plus hook.
  return [
    part(new THREE.BoxGeometry(width * 0.7, barThickness, barDepth), [0, y, 0], "rack-metal"),
    part(new THREE.CylinderGeometry(width * 0.025, width * 0.025, height * 0.1, 10), [0, y + height * 0.06, 0], "rack-metal"),
  ];
}

/** Artwork plane: a plain rectangle whose alpha channel defines the silhouette. */
function artworkPart(
  width: number,
  height: number,
  position: SpatialVec3,
  mediaRole: SpatialGarmentArtworkRole,
  rotation?: SpatialVec3,
): SpatialGeometryTemplatePart {
  return part(
    new THREE.PlaneGeometry(Math.max(0.05, width), Math.max(0.05, height)),
    position,
    "fabric",
    "front",
    true,
    rotation,
    undefined,
    { alphaArtwork: true, mediaRole },
  );
}

function framedMediaParts(width: number, height: number, depth: number): SpatialGeometryTemplatePart[] {
  const frame = Math.max(0.035, Math.min(width, height) * 0.035);
  const faceZ = depth / 2 + 0.006;
  return [
    part(new THREE.BoxGeometry(width, height, depth * 0.45), [0, 0, -depth * 0.22], "rack-metal"),
    part(new THREE.BoxGeometry(width, frame, depth), [0, height / 2 - frame / 2, faceZ], "rack-metal"),
    part(new THREE.BoxGeometry(width, frame, depth), [0, -height / 2 + frame / 2, faceZ], "rack-metal"),
    part(new THREE.BoxGeometry(frame, height, depth), [-width / 2 + frame / 2, 0, faceZ], "rack-metal"),
    part(new THREE.BoxGeometry(frame, height, depth), [width / 2 - frame / 2, 0, faceZ], "rack-metal"),
    part(new THREE.PlaneGeometry(width - frame * 2.4, height - frame * 2.4), [0, 0, faceZ + depth * 0.52], "poster-decal", "double", true),
  ];
}

function projectionGridParts(width: number, height: number, depth: number): SpatialGeometryTemplatePart[] {
  const frame = Math.max(0.04, Math.min(width, height) * 0.02);
  const mullion = Math.max(0.025, frame * 0.65);
  return [
    part(new THREE.BoxGeometry(width, height, depth), [0, 0, 0], "wall"),
    part(
      new THREE.PlaneGeometry(width - frame * 2, height - frame * 2),
      [0, 0, depth / 2 + 0.006],
      "projection",
      "double",
      true,
    ),
    part(new THREE.BoxGeometry(width - frame * 2, mullion, frame), [0, 0, depth / 2 + frame], "rack-metal"),
    part(new THREE.BoxGeometry(mullion, height - frame * 2, frame), [0, 0, depth / 2 + frame], "rack-metal"),
  ];
}

function displayShelfParts(width: number, height: number, depth: number): SpatialGeometryTemplatePart[] {
  const frame = Math.max(0.045, Math.min(width, height) * 0.025);
  const shelfHeight = Math.max(0.045, height * 0.025);
  const divider = Math.max(0.03, frame * 0.72);
  return [
    part(new THREE.BoxGeometry(frame, height, depth), [-width / 2 + frame / 2, 0, 0], "rack-metal"),
    part(new THREE.BoxGeometry(frame, height, depth), [width / 2 - frame / 2, 0, 0], "rack-metal"),
    part(new THREE.BoxGeometry(width, frame, depth), [0, height / 2 - frame / 2, 0], "rack-metal"),
    part(new THREE.BoxGeometry(width, frame, depth), [0, -height / 2 + frame / 2, 0], "rack-metal"),
    part(new THREE.BoxGeometry(divider, height - frame * 2, depth * 0.9), [-width * 0.18, 0, 0], "rack-metal"),
    part(new THREE.BoxGeometry(divider, height - frame * 2, depth * 0.9), [width * 0.18, 0, 0], "rack-metal"),
    part(new THREE.BoxGeometry(width - frame * 2, shelfHeight, depth), [0, -height * 0.22, 0], "tabletop"),
    part(new THREE.BoxGeometry(width - frame * 2, shelfHeight, depth), [0, height * 0.28, 0], "tabletop"),
    part(new THREE.BoxGeometry(width - frame * 2, shelfHeight * 0.75, depth * 0.08), [0, -height * 0.22 + shelfHeight, depth / 2], "tabletop"),
    part(new THREE.BoxGeometry(width - frame * 2, shelfHeight * 0.75, depth * 0.08), [0, height * 0.28 + shelfHeight, depth / 2], "tabletop"),
  ];
}

function signCardParts(width: number, height: number, depth: number): SpatialGeometryTemplatePart[] {
  const inset = Math.max(0.03, Math.min(width, height) * 0.05);
  return [
    part(new THREE.BoxGeometry(width, height, depth), [0, 0, 0], "paper"),
    part(
      new THREE.PlaneGeometry(width - inset * 2, height - inset * 2),
      [0, 0, depth / 2 + 0.004],
      "poster-decal",
      "double",
      true,
    ),
  ];
}

function productBlockParts(width: number, height: number, depth: number): SpatialGeometryTemplatePart[] {
  const accentHeight = Math.max(0.035, height * 0.06);
  const bevel = Math.max(0.025, height * 0.045);
  return [
    part(new THREE.BoxGeometry(width * 0.92, height - accentHeight - bevel, depth * 0.92), [0, -(accentHeight + bevel) / 2, 0], "tabletop"),
    part(new THREE.BoxGeometry(width, bevel, depth), [0, height / 2 - accentHeight - bevel / 2, 0], "tabletop"),
    part(new THREE.BoxGeometry(width * 0.86, accentHeight, depth * 0.86), [0, height / 2 - accentHeight / 2, 0], "logo-accent"),
    part(new THREE.BoxGeometry(width * 0.7, bevel, depth * 0.7), [0, -height / 2 + bevel / 2, 0], "rack-metal"),
  ];
}

function lightFixtureParts(width: number, height: number, depth: number): SpatialGeometryTemplatePart[] {
  const poleRadius = Math.max(0.025, Math.min(width, depth) * 0.075);
  const baseHeight = Math.max(0.04, height * 0.035);
  const shadeHeight = Math.max(0.12, height * 0.16);
  const lensRadius = Math.min(width, depth) * 0.34;
  return [
    part(new THREE.CylinderGeometry(width * 0.42, width * 0.42, baseHeight, 20), [0, -height / 2 + baseHeight / 2, 0], "rack-metal"),
    part(new THREE.CylinderGeometry(poleRadius, poleRadius, height - shadeHeight, 12), [0, -shadeHeight / 2, 0], "rack-metal"),
    part(new THREE.ConeGeometry(width * 0.45, shadeHeight, 24), [0, height / 2 - shadeHeight / 2, 0], "rack-metal"),
    part(new THREE.CylinderGeometry(lensRadius, lensRadius, Math.max(0.018, baseHeight * 0.35), 24), [0, height / 2 - shadeHeight, 0], "logo-accent"),
    part(new THREE.SphereGeometry(Math.min(width, depth) * 0.18, 16, 8), [0, height / 2 - shadeHeight * 0.58, 0], "logo-accent"),
  ];
}

function drapeDividerParts(width: number, height: number, depth: number): SpatialGeometryTemplatePart[] {
  const foldCount = Math.max(8, Math.round(width / 0.28));
  const foldWidth = width / foldCount;
  const railHeight = Math.max(0.035, height * 0.018);
  const folds = Array.from({ length: foldCount }, (_, index) => {
    const phase = index % 2 === 0 ? -1 : 1;
    return part(
      new THREE.BoxGeometry(foldWidth * 1.05, height - railHeight, depth * 0.62),
      [-width / 2 + foldWidth * (index + 0.5), -railHeight / 2, phase * depth * 0.18],
      "fabric",
      "double",
    );
  });
  return [
    part(new THREE.BoxGeometry(width, railHeight, depth), [0, height / 2 - railHeight / 2, 0], "rack-metal"),
    ...folds,
  ];
}

function archiveWallParts(width: number, height: number, depth: number): SpatialGeometryTemplatePart[] {
  const frame = Math.max(0.05, Math.min(width, height) * 0.018);
  const rail = Math.max(0.035, frame * 0.65);
  const cellWidth = (width - frame * 2) / 4;
  const cellHeight = (height - frame * 2) / 3;
  const cells = Array.from({ length: 12 }, (_, index) => {
    const column = index % 4;
    const row = Math.floor(index / 4);
    return part(
      new THREE.PlaneGeometry(cellWidth * 0.68, cellHeight * 0.68),
      [-width / 2 + frame + cellWidth * (column + 0.5), height / 2 - frame - cellHeight * (row + 0.5), depth / 2 + 0.01],
      index % 2 === 0 ? "poster-decal" : "paper",
      "double",
      true,
    );
  });
  return [
    part(new THREE.BoxGeometry(width, height, depth * 0.65), [0, 0, -depth * 0.1], "wall"),
    part(new THREE.BoxGeometry(width, frame, depth), [0, height / 2 - frame / 2, depth * 0.08], "rack-metal"),
    part(new THREE.BoxGeometry(width, frame, depth), [0, -height / 2 + frame / 2, depth * 0.08], "rack-metal"),
    part(new THREE.BoxGeometry(frame, height, depth), [-width / 2 + frame / 2, 0, depth * 0.08], "rack-metal"),
    part(new THREE.BoxGeometry(frame, height, depth), [width / 2 - frame / 2, 0, depth * 0.08], "rack-metal"),
    part(new THREE.BoxGeometry(width - frame * 2, rail, depth * 0.62), [0, height / 2 - frame - cellHeight, depth * 0.14], "rack-metal"),
    part(new THREE.BoxGeometry(width - frame * 2, rail, depth * 0.62), [0, height / 2 - frame - cellHeight * 2, depth * 0.14], "rack-metal"),
    ...cells,
  ];
}

function listeningStationParts(width: number, height: number, depth: number): SpatialGeometryTemplatePart[] {
  const tabletop = Math.max(0.12, height * 0.16);
  const baseHeight = Math.max(0.08, height * 0.12);
  const postRadius = Math.max(0.025, Math.min(width, depth) * 0.025);
  const discRadius = Math.min(width, depth) * 0.22;
  return [
    part(new THREE.BoxGeometry(width, tabletop, depth), [0, height / 2 - tabletop / 2, 0], "tabletop"),
    part(new THREE.BoxGeometry(width * 0.72, height - tabletop - baseHeight, depth * 0.55), [0, (baseHeight - tabletop) / 2, 0], "rack-metal"),
    part(new THREE.BoxGeometry(width * 0.82, baseHeight, depth * 0.72), [0, -height / 2 + baseHeight / 2, 0], "rack-metal"),
    part(new THREE.CylinderGeometry(discRadius, discRadius, Math.max(0.025, tabletop * 0.22), 32), [-width * 0.22, height / 2 + tabletop * 0.08, 0], "logo-accent", "front", false, [Math.PI / 2, 0, 0]),
    part(new THREE.BoxGeometry(width * 0.3, tabletop * 0.26, depth * 0.18), [width * 0.24, height / 2 + tabletop * 0.07, -depth * 0.18], "rack-metal"),
    part(new THREE.CylinderGeometry(postRadius, postRadius, height * 0.42, 12), [-width * 0.42, height * 0.1, 0], "rack-metal"),
    part(new THREE.CylinderGeometry(postRadius, postRadius, height * 0.42, 12), [width * 0.42, height * 0.1, 0], "rack-metal"),
    part(new THREE.PlaneGeometry(width * 0.7, depth * 0.48), [0, height / 2 + tabletop * 0.15, 0], "logo-accent", "double", true, [-Math.PI / 2, 0, 0]),
  ];
}

function sphericalGalleryParts(width: number, height: number, depth: number): SpatialGeometryTemplatePart[] {
  const radius = Math.min(width, height, depth) * 0.42;
  const ringTube = Math.max(0.018, radius * 0.012);
  const cardWidth = radius * 0.42;
  const cardHeight = radius * 0.56;
  const cards = Array.from({ length: 12 }, (_, index) => {
    const angle = index / 12 * Math.PI * 2;
    const y = index % 3 === 0 ? radius * 0.38 : index % 3 === 1 ? 0 : -radius * 0.38;
    return part(
      new THREE.PlaneGeometry(cardWidth, cardHeight),
      [Math.cos(angle) * radius * 0.78, y, Math.sin(angle) * radius * 0.78],
      "projection",
      "double",
      true,
      [0, -angle + Math.PI / 2, 0],
    );
  });
  return [
    part(new THREE.TorusGeometry(radius, ringTube, 8, 64), [0, 0, 0], "rack-metal", "double"),
    part(new THREE.TorusGeometry(radius * 0.82, ringTube, 8, 64), [0, 0, 0], "rack-metal", "double", false, [Math.PI / 2, 0, 0]),
    part(new THREE.TorusGeometry(radius * 0.82, ringTube, 8, 64), [0, 0, 0], "rack-metal", "double", false, [0, Math.PI / 2, 0]),
    part(new THREE.SphereGeometry(Math.max(0.08, radius * 0.045), 16, 8), [0, 0, 0], "logo-accent"),
    ...cards,
  ];
}

function rackParts(width: number, height: number, depth: number): SpatialGeometryTemplatePart[] {
  const thickness = Math.max(0.045, Math.min(width, height) * 0.025);
  const railGeometry = new THREE.BoxGeometry(width, thickness * 1.3, thickness * 1.3);
  const uprightGeometry = new THREE.BoxGeometry(thickness, height, thickness);
  const baseGeometry = new THREE.BoxGeometry(width, thickness, depth);
  const footGeometry = new THREE.BoxGeometry(thickness * 2, thickness, depth * 1.12);
  return [
    part(railGeometry, [0, height / 2 - thickness, 0], "rack-metal"),
    part(uprightGeometry, [-width / 2 + thickness, 0, 0], "rack-metal"),
    part(uprightGeometry, [width / 2 - thickness, 0, 0], "rack-metal"),
    part(baseGeometry, [0, -height / 2 + thickness, 0], "rack-metal"),
    part(footGeometry, [-width / 2 + thickness, -height / 2, 0], "rack-metal"),
    part(footGeometry, [width / 2 - thickness, -height / 2, 0], "rack-metal"),
  ];
}

function projectionFieldParts(width: number, height: number, depth: number): SpatialGeometryTemplatePart[] {
  const fieldWidth = width * 0.93;
  const fieldHeight = height * 0.88;
  const frame = Math.max(0.035, Math.min(width, height) * 0.018);
  const frameZ = depth / 2 + 0.012;
  const horizontalFrame = new THREE.BoxGeometry(fieldWidth + frame * 2, frame, frame);
  const verticalFrame = new THREE.BoxGeometry(frame, fieldHeight, frame);
  return [
    part(new THREE.BoxGeometry(width, height, depth), [0, 0, 0], "wall"),
    part(new THREE.PlaneGeometry(fieldWidth, fieldHeight), [0, 0, depth / 2 + 0.006], "projection", "double", true),
    part(horizontalFrame, [0, fieldHeight / 2 + frame / 2, frameZ], "wall"),
    part(horizontalFrame, [0, -fieldHeight / 2 - frame / 2, frameZ], "wall"),
    part(verticalFrame, [-fieldWidth / 2 - frame / 2, 0, frameZ], "wall"),
    part(verticalFrame, [fieldWidth / 2 + frame / 2, 0, frameZ], "wall"),
  ];
}

/**
 * Per-article carrier proportions.
 *
 * `heightFactor` and `maxWidthFactor` are fractions of the component's own
 * dimensions; `aspect` is the fallback artwork width/height when a piece
 * supplies no override.
 */
const GARMENT_CARRIER_PROFILES: Record<
  NonNullable<SpatialRenderItem["garment"]>["articleType"],
  { heightFactor: number; maxWidthFactor: number; centreY: number; aspect: number }
> = {
  // Upper body: broad and roughly square.
  shirt: { heightFactor: 0.78, maxWidthFactor: 0.94, centreY: -0.02, aspect: 0.95 },
  // Legs: taller, much narrower, hanging lower from the rail.
  pant: { heightFactor: 0.92, maxWidthFactor: 0.52, centreY: -0.08, aspect: 0.46 },
  // Footwear: short and wide, sitting low.
  shoe: { heightFactor: 0.34, maxWidthFactor: 0.86, centreY: -0.24, aspect: 1.6 },
  // Unchanged Stage A behaviour.
  generic: { heightFactor: 0.84, maxWidthFactor: 0.92, centreY: -0.04, aspect: 0.9 },
};

/** Slight forward tilt so a shoe display plane reads as presented, not hung. */
const GARMENT_SHOE_TILT = 0.18;

function part(
  geometry: THREE.BufferGeometry,
  position: SpatialVec3 = [0, 0, 0],
  materialSlot?: SpatialMaterialSlotId,
  materialSide: SpatialGeometryTemplatePart["materialSide"] = "front",
  mediaSurface = false,
  rotation?: SpatialVec3,
  scale?: SpatialVec3,
  extra: Pick<SpatialGeometryTemplatePart, "alphaArtwork" | "carrier" | "mediaRole"> = {},
): SpatialGeometryTemplatePart {
  return { geometry, position, rotation, scale, materialSlot, materialSide, mediaSurface, ...extra };
}

/**
 * Cache identity for one geometry variant.
 *
 * Uses the signature itself, so the cache key and the correctness check can
 * never disagree: any input that changes the produced geometry also changes the
 * cache slot it occupies.
 */
export function spatialGeometryCacheRef(item: SpatialRenderItem): SpatialComponentRef {
  return geometryVariantRef(item, spatialGeometrySignature(item));
}

function geometryVariantRef(item: SpatialRenderItem, signature: string): SpatialComponentRef {
  return { componentId: `${item.componentId}::${hashSignature(signature)}`, version: item.version };
}

function hashSignature(signature: string): string {
  let hash = 2166136261;
  for (let index = 0; index < signature.length; index += 1) {
    hash ^= signature.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function spatialGeometrySignature(item: SpatialRenderItem): string {
  return JSON.stringify([
    item.componentKey,
    item.category,
    item.geometry,
    item.dimensions.width,
    item.dimensions.height,
    item.dimensions.depth,
    // Carrier geometry varies by article and artwork aspect, so both must key
    // the cache; otherwise a pant would reuse a shirt's cached template.
    item.garment?.articleType ?? null,
    item.garment?.aspect ?? null,
  ]);
}

function neverPrimitive(value: never): never {
  throw new Error(`Unsupported spatial primitive: ${String(value)}`);
}
