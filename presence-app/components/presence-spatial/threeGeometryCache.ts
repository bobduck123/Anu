import * as THREE from "three";
import {
  GLOBAL_SPATIAL_COMPONENT_CACHE,
  SpatialComponentCache,
} from "../../lib/presence/spatial/assetCache.ts";
import type {
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
  const template = cache.getOrCreate(
    item,
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
      parts = [part(
        new THREE.BoxGeometry(width, height, depth),
        [0, 0, 0],
        undefined,
        item.category === "shell" ? "back" : "front",
      )];
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
      parts = garmentHangerParts(width, height, depth);
      break;
    case "framed-media":
      parts = framedMediaParts(width, height, depth);
      break;
    case "projection-grid":
      parts = projectionGridParts(width, height, depth);
      break;
    default:
      return neverPrimitive(primitive);
  }

  return { source: "procedural-primitive", parts };
}

function openShellParts(width: number, height: number, depth: number): SpatialGeometryTemplatePart[] {
  const wall = Math.max(0.12, Math.min(width, height) * 0.025);
  return [
    part(new THREE.BoxGeometry(wall, height, depth), [-width / 2 + wall / 2, 0, 0], "wall"),
    part(new THREE.BoxGeometry(wall, height, depth), [width / 2 - wall / 2, 0, 0], "wall"),
    part(new THREE.BoxGeometry(width, height, wall), [0, 0, -depth / 2 + wall / 2], "wall"),
    part(new THREE.BoxGeometry(width, wall, depth), [0, height / 2 - wall / 2, 0], "wall"),
  ];
}

function ribbedWallParts(width: number, height: number, depth: number): SpatialGeometryTemplatePart[] {
  const ribCount = Math.max(10, Math.round(width / 0.22));
  const ribWidth = width / ribCount * 0.42;
  const ribs = Array.from({ length: ribCount }, (_, index) => (
    part(
      new THREE.BoxGeometry(ribWidth, height * 0.98, depth * 0.48),
      [-width / 2 + (index + 0.5) * width / ribCount, 0, depth * 0.24],
      "wall",
    )
  ));
  return [part(new THREE.BoxGeometry(width, height, depth * 0.48), [0, 0, -depth * 0.24], "wall"), ...ribs];
}

function displayBayParts(width: number, height: number, depth: number): SpatialGeometryTemplatePart[] {
  const frame = Math.max(0.12, width * 0.035);
  const shelf = Math.max(0.07, height * 0.025);
  return [
    part(new THREE.BoxGeometry(width, height, frame), [0, 0, -depth / 2 + frame / 2], "wall"),
    part(new THREE.BoxGeometry(frame, height, depth), [-width / 2 + frame / 2, 0, 0], "tabletop"),
    part(new THREE.BoxGeometry(frame, height, depth), [width / 2 - frame / 2, 0, 0], "tabletop"),
    part(new THREE.BoxGeometry(width, frame, depth), [0, -height / 2 + frame / 2, 0], "tabletop"),
    part(new THREE.BoxGeometry(width * 0.88, shelf, depth * 0.88), [0, -height * 0.2, 0.02], "tabletop"),
    part(new THREE.BoxGeometry(width * 0.88, shelf, depth * 0.88), [0, height * 0.13, 0.02], "tabletop"),
    part(new THREE.BoxGeometry(width * 0.88, shelf, depth * 0.88), [0, height * 0.44, 0.02], "tabletop"),
  ];
}

function roundedIslandParts(width: number, height: number, depth: number): SpatialGeometryTemplatePart[] {
  const radius = depth / 2;
  const centerWidth = Math.max(0.05, width - depth);
  const baseHeight = Math.max(0.035, height * 0.06);
  return [
    part(new THREE.BoxGeometry(centerWidth, height, depth), [0, 0, 0], "tabletop"),
    part(new THREE.CylinderGeometry(radius, radius, height, 32), [-centerWidth / 2, 0, 0], "tabletop"),
    part(new THREE.CylinderGeometry(radius, radius, height, 32), [centerWidth / 2, 0, 0], "tabletop"),
    part(new THREE.BoxGeometry(width * 0.8, baseHeight, depth * 0.72), [0, -height / 2 + baseHeight / 2, 0], "rack-metal"),
  ];
}

function suspendedRackParts(width: number, height: number, depth: number): SpatialGeometryTemplatePart[] {
  const metal = Math.max(0.05, width * 0.009);
  const railY = height * 0.1;
  const shelfY = height * 0.43;
  return [
    part(new THREE.BoxGeometry(width, height * 0.16, depth), [0, -height * 0.42, 0], "tabletop"),
    part(new THREE.BoxGeometry(width, metal, metal), [0, railY, 0], "rack-metal"),
    part(new THREE.BoxGeometry(width, metal * 1.2, depth * 0.82), [0, shelfY, 0], "rack-metal"),
    part(new THREE.BoxGeometry(metal, height * 0.85, metal), [-width / 2 + metal, height * 0.075, 0], "rack-metal"),
    part(new THREE.BoxGeometry(metal, height * 0.85, metal), [width / 2 - metal, height * 0.075, 0], "rack-metal"),
    part(new THREE.BoxGeometry(metal, height * 0.4, metal), [-width * 0.17, height * 0.3, 0], "rack-metal"),
    part(new THREE.BoxGeometry(metal, height * 0.4, metal), [width * 0.17, height * 0.3, 0], "rack-metal"),
  ];
}

function garmentHangerParts(width: number, height: number, depth: number): SpatialGeometryTemplatePart[] {
  const shape = new THREE.Shape();
  shape.moveTo(-width * 0.12, height * 0.38);
  shape.lineTo(-width * 0.48, height * 0.24);
  shape.lineTo(-width * 0.34, height * 0.08);
  shape.lineTo(-width * 0.29, -height * 0.46);
  shape.lineTo(width * 0.29, -height * 0.46);
  shape.lineTo(width * 0.34, height * 0.08);
  shape.lineTo(width * 0.48, height * 0.24);
  shape.lineTo(width * 0.12, height * 0.38);
  shape.closePath();
  return [
    part(new THREE.ShapeGeometry(shape), [0, 0, depth / 2], "fabric", "double", true),
    part(new THREE.BoxGeometry(width * 0.7, Math.max(0.018, width * 0.018), Math.max(0.018, depth * 0.2)), [0, height * 0.39, 0], "rack-metal"),
    part(new THREE.CylinderGeometry(width * 0.025, width * 0.025, height * 0.1, 10), [0, height * 0.45, 0], "rack-metal"),
  ];
}

function framedMediaParts(width: number, height: number, depth: number): SpatialGeometryTemplatePart[] {
  const frame = Math.max(0.035, Math.min(width, height) * 0.035);
  return [
    part(new THREE.BoxGeometry(width, height, depth), [0, 0, 0], "rack-metal"),
    part(new THREE.PlaneGeometry(width - frame * 2, height - frame * 2), [0, 0, depth / 2 + 0.006], "poster-decal", "double", true),
  ];
}

function projectionGridParts(width: number, height: number, depth: number): SpatialGeometryTemplatePart[] {
  const frame = Math.max(0.04, Math.min(width, height) * 0.02);
  return [
    part(new THREE.BoxGeometry(width, height, depth), [0, 0, 0], "wall"),
    part(
      new THREE.PlaneGeometry(width - frame * 2, height - frame * 2),
      [0, 0, depth / 2 + 0.006],
      "projection",
      "double",
      true,
    ),
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
    part(new THREE.PlaneGeometry(fieldWidth, fieldHeight), [0, 0, depth / 2 + 0.006], "projection"),
    part(horizontalFrame, [0, fieldHeight / 2 + frame / 2, frameZ], "wall"),
    part(horizontalFrame, [0, -fieldHeight / 2 - frame / 2, frameZ], "wall"),
    part(verticalFrame, [-fieldWidth / 2 - frame / 2, 0, frameZ], "wall"),
    part(verticalFrame, [fieldWidth / 2 + frame / 2, 0, frameZ], "wall"),
  ];
}

function part(
  geometry: THREE.BufferGeometry,
  position: SpatialVec3 = [0, 0, 0],
  materialSlot?: SpatialMaterialSlotId,
  materialSide: SpatialGeometryTemplatePart["materialSide"] = "front",
  mediaSurface = false,
  rotation?: SpatialVec3,
  scale?: SpatialVec3,
): SpatialGeometryTemplatePart {
  return { geometry, position, rotation, scale, materialSlot, materialSide, mediaSurface };
}

function spatialGeometrySignature(item: SpatialRenderItem): string {
  return JSON.stringify([
    item.componentKey,
    item.category,
    item.geometry,
    item.dimensions.width,
    item.dimensions.height,
    item.dimensions.depth,
  ]);
}

function neverPrimitive(value: never): never {
  throw new Error(`Unsupported spatial primitive: ${String(value)}`);
}
