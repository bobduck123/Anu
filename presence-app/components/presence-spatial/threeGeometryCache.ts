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
    default:
      return neverPrimitive(primitive);
  }

  return { source: "procedural-primitive", parts };
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
): SpatialGeometryTemplatePart {
  return { geometry, position, materialSlot, materialSide, mediaSurface };
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
