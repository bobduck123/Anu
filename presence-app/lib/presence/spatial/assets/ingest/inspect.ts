import path from "node:path";

import type {
  SourceAssetReport,
  SourceBoundingBox,
  SourceNodeSummary,
  SourceWarning,
} from "../types/source.ts";
import { SPATIAL_ASSET_SCHEMA_VERSION } from "../types/source.ts";
import { reviewScale } from "./budgets.ts";
import { classifySource } from "./classify.ts";
import type { GltfAccessor, GltfContainer, GltfJson, GltfNode, Mat4 } from "./gltf.ts";
import {
  IDENTITY_MATRIX,
  multiplyMat4,
  nodeLocalMatrix,
  primitiveTriangleCount,
  transformPoint,
} from "./gltf.ts";
import { extractLicenseMetadata } from "./license.ts";
import { sourceAssetId } from "./ids.ts";

interface MutableBounds {
  min: [number, number, number];
  max: [number, number, number];
}

function emptyBounds(): MutableBounds {
  return {
    min: [Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY],
    max: [Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY],
  };
}

function expandBounds(target: MutableBounds, point: readonly [number, number, number]): void {
  for (let axis = 0; axis < 3; axis += 1) {
    if (point[axis] < target.min[axis]) target.min[axis] = point[axis];
    if (point[axis] > target.max[axis]) target.max[axis] = point[axis];
  }
}

function mergeBounds(target: MutableBounds, other: MutableBounds): void {
  if (!isFinite(other)) return;
  expandBounds(target, other.min);
  expandBounds(target, other.max);
}

function isFinite(bounds: MutableBounds): boolean {
  return bounds.min.every(Number.isFinite) && bounds.max.every(Number.isFinite);
}

function round(value: number): number {
  return Math.round(value * 10000) / 10000;
}

function finaliseBounds(bounds: MutableBounds): SourceBoundingBox | null {
  if (!isFinite(bounds)) return null;
  const min: [number, number, number] = [round(bounds.min[0]), round(bounds.min[1]), round(bounds.min[2])];
  const max: [number, number, number] = [round(bounds.max[0]), round(bounds.max[1]), round(bounds.max[2])];
  return {
    min,
    max,
    dimensions: {
      width: round(max[0] - min[0]),
      height: round(max[1] - min[1]),
      depth: round(max[2] - min[2]),
    },
    center: [round((min[0] + max[0]) / 2), round((min[1] + max[1]) / 2), round((min[2] + max[2]) / 2)],
  };
}

function accessorBounds(accessor: GltfAccessor | undefined, matrix: Mat4, target: MutableBounds): boolean {
  if (!accessor?.min || !accessor?.max || accessor.min.length < 3 || accessor.max.length < 3) return false;
  const [minX, minY, minZ] = accessor.min;
  const [maxX, maxY, maxZ] = accessor.max;
  for (const corner of [
    [minX, minY, minZ], [maxX, minY, minZ], [minX, maxY, minZ], [minX, minY, maxZ],
    [maxX, maxY, minZ], [maxX, minY, maxZ], [minX, maxY, maxZ], [maxX, maxY, maxZ],
  ] as ReadonlyArray<[number, number, number]>) {
    expandBounds(target, transformPoint(matrix, corner));
  }
  return true;
}

interface TraversalTotals {
  meshNodeCount: number;
  triangleCount: number;
  primitiveCount: number;
  meshNames: Set<string>;
  materialNames: Set<string>;
  hasSkin: boolean;
  boundsResolved: boolean;
}

function traverse(
  json: GltfJson,
  nodeIndex: number,
  parentMatrix: Mat4,
  bounds: MutableBounds,
  totals: TraversalTotals,
  visited: Set<number>,
): void {
  if (visited.has(nodeIndex)) return;
  visited.add(nodeIndex);

  const node: GltfNode | undefined = json.nodes?.[nodeIndex];
  if (!node) return;

  const worldMatrix = multiplyMat4(parentMatrix, nodeLocalMatrix(node));
  if (node.skin !== undefined) totals.hasSkin = true;

  if (node.mesh !== undefined) {
    const mesh = json.meshes?.[node.mesh];
    if (mesh) {
      totals.meshNodeCount += 1;
      if (mesh.name) totals.meshNames.add(mesh.name);
      for (const primitive of mesh.primitives ?? []) {
        totals.primitiveCount += 1;
        totals.triangleCount += primitiveTriangleCount(primitive, json.accessors ?? []);
        if (primitive.material !== undefined) {
          const materialName = json.materials?.[primitive.material]?.name;
          if (materialName) totals.materialNames.add(materialName);
        }
        const positionIndex = primitive.attributes?.POSITION;
        const accessor = positionIndex !== undefined ? json.accessors?.[positionIndex] : undefined;
        if (accessorBounds(accessor, worldMatrix, bounds)) totals.boundsResolved = true;
      }
    }
  }

  for (const child of node.children ?? []) {
    traverse(json, child, worldMatrix, bounds, totals, visited);
  }
}

function sceneRootIndices(json: GltfJson): number[] {
  const scene = json.scenes?.[json.scene ?? 0];
  if (scene?.nodes && scene.nodes.length > 0) return [...scene.nodes];

  const childIndices = new Set<number>();
  for (const node of json.nodes ?? []) {
    for (const child of node.children ?? []) childIndices.add(child);
  }
  return (json.nodes ?? []).map((_, index) => index).filter((index) => !childIndices.has(index));
}

/**
 * Descends through pass-through wrapper nodes to reach the real objects.
 *
 * Sketchfab and FBX round-trips wrap whole scenes in one or more mesh-less
 * empties (`Sketchfab_model` -> `<file>.fbx` -> `RootNode` -> objects). Treating
 * the literal scene roots as separable objects would yield exactly one candidate
 * per file, so the walk keeps descending while the level is a single mesh-less
 * node. This mirrors `separation_roots()` in the Blender script.
 */
function separationRoots(json: GltfJson): { roots: number[]; descended: string[]; parentMatrix: Mat4 } {
  let roots = sceneRootIndices(json);
  const descended: string[] = [];
  // Wrapper nodes routinely carry the unit scale and the Y-up correction, so
  // their transforms must be carried down or every measurement is wrong.
  let parentMatrix: Mat4 = IDENTITY_MATRIX;
  while (roots.length === 1) {
    const node = json.nodes?.[roots[0]];
    if (!node || node.mesh !== undefined || (node.children ?? []).length === 0) break;
    descended.push(node.name ?? `node-${roots[0]}`);
    parentMatrix = multiplyMat4(parentMatrix, nodeLocalMatrix(node));
    roots = [...(node.children ?? [])];
  }
  return { roots, descended, parentMatrix };
}

interface ByteAccounting {
  textureBytes: number;
  geometryBytes: number;
  otherBufferBytes: number;
}

function accountBytes(container: GltfContainer): ByteAccounting {
  const json = container.json;
  const bufferViews = json.bufferViews ?? [];
  const imageViews = new Set<number>();
  const accessorViews = new Set<number>();

  for (const image of json.images ?? []) {
    if (image.bufferView !== undefined) imageViews.add(image.bufferView);
  }
  for (const accessor of json.accessors ?? []) {
    if (accessor.bufferView !== undefined) accessorViews.add(accessor.bufferView);
    if (accessor.sparse?.indices?.bufferView !== undefined) accessorViews.add(accessor.sparse.indices.bufferView);
    if (accessor.sparse?.values?.bufferView !== undefined) accessorViews.add(accessor.sparse.values.bufferView);
  }

  let textureBytes = 0;
  let geometryBytes = 0;
  for (const [index, view] of bufferViews.entries()) {
    const length = view.byteLength ?? 0;
    if (imageViews.has(index)) textureBytes += length;
    else if (accessorViews.has(index)) geometryBytes += length;
  }

  for (const resource of container.externalResources) {
    if (resource.kind === "image" && resource.bytes !== null) textureBytes += resource.bytes;
  }

  const declaredBufferBytes = container.format === "glb"
    ? container.binaryChunkBytes
    : (json.buffers ?? []).reduce((total, buffer) => total + (buffer.byteLength ?? 0), 0);

  const otherBufferBytes = Math.max(0, declaredBufferBytes - textureBytes - geometryBytes);
  return { textureBytes, geometryBytes, otherBufferBytes };
}

const KNOWN_UNSUPPORTED_EXTENSIONS: Readonly<Record<string, "draco-compressed" | "meshopt-compressed">> = {
  KHR_draco_mesh_compression: "draco-compressed",
  EXT_meshopt_compression: "meshopt-compressed",
};

/** Bounds far outside a plausible interior scale usually mean a non-metre export. */
const IMPLAUSIBLE_MAX_DIMENSION = 500;
const IMPLAUSIBLE_MIN_DIMENSION = 0.05;

export async function inspectSource(input: {
  container: GltfContainer;
  sourceRoot: string;
}): Promise<SourceAssetReport> {
  const { container, sourceRoot } = input;
  const json = container.json;
  const warnings: SourceWarning[] = [];

  for (const parseError of container.parseErrors) {
    warnings.push({ code: "unparseable-json", message: parseError });
  }

  const sceneRoots = sceneRootIndices(json);
  const { roots: topLevel, descended, parentMatrix } = separationRoots(json);
  const nodeSummaries: SourceNodeSummary[] = [];
  const sceneBounds = emptyBounds();
  let totalTriangles = 0;
  let totalPrimitives = 0;
  let anyBoundsResolved = false;

  for (const nodeIndex of topLevel) {
    const bounds = emptyBounds();
    const totals: TraversalTotals = {
      meshNodeCount: 0,
      triangleCount: 0,
      primitiveCount: 0,
      meshNames: new Set<string>(),
      materialNames: new Set<string>(),
      hasSkin: false,
      boundsResolved: false,
    };
    traverse(json, nodeIndex, parentMatrix, bounds, totals, new Set<number>());
    mergeBounds(sceneBounds, bounds);
    totalTriangles += totals.triangleCount;
    totalPrimitives += totals.primitiveCount;
    anyBoundsResolved = anyBoundsResolved || totals.boundsResolved;

    nodeSummaries.push({
      nodeIndex,
      name: json.nodes?.[nodeIndex]?.name ?? `node-${nodeIndex}`,
      meshNodeCount: totals.meshNodeCount,
      meshNames: [...totals.meshNames],
      materialNames: [...totals.materialNames],
      triangleCount: totals.triangleCount,
      primitiveCount: totals.primitiveCount,
      bounds: finaliseBounds(bounds),
      hasSkin: totals.hasSkin,
    });
  }

  const bounds = finaliseBounds(sceneBounds);
  const bytes = accountBytes(container);
  const license = await extractLicenseMetadata(json, container.filePath);

  const extensionsUsed = json.extensionsUsed ?? [];
  const extensionsRequired = json.extensionsRequired ?? [];
  for (const extension of extensionsRequired) {
    const code = KNOWN_UNSUPPORTED_EXTENSIONS[extension];
    if (code) {
      warnings.push({ code, message: `Source requires ${extension}; geometry counts and Blender extraction may need the matching importer.` });
    } else if (!extensionsUsed.includes(extension)) {
      warnings.push({ code: "unsupported-extension-required", message: `Source requires ${extension}, which is not listed in extensionsUsed.` });
    }
  }

  const meshCount = json.meshes?.length ?? 0;
  const materialCount = json.materials?.length ?? 0;
  const imageCount = json.images?.length ?? 0;
  const animationCount = json.animations?.length ?? 0;
  const cameraCount = json.cameras?.length ?? 0;
  const lightCount = countLights(json);

  if (meshCount === 0) warnings.push({ code: "no-meshes", message: "No mesh was found; nothing can be extracted as a component candidate." });
  if ((json.nodes?.length ?? 0) === 0) warnings.push({ code: "no-node-hierarchy", message: "No node hierarchy was found; object splitting will depend on Blender." });
  if (animationCount > 0) warnings.push({ code: "animations-present", message: `${animationCount} animation(s) present; shape-only exports strip them.` });
  if (cameraCount > 0) warnings.push({ code: "cameras-present", message: `${cameraCount} camera(s) present; shape-only exports strip them.` });
  if (lightCount > 0) warnings.push({ code: "lights-present", message: `${lightCount} light(s) present; shape-only exports strip them.` });
  if (nodeSummaries.some((node) => node.hasSkin)) warnings.push({ code: "skinned-meshes-present", message: "Skinned meshes present; splitting may separate a mesh from its armature." });
  if (!anyBoundsResolved) warnings.push({ code: "bounding-box-unavailable", message: "No POSITION accessor min/max was available; dimensions are unknown." });
  if (license.source === "unknown") warnings.push({ code: "no-license-metadata", message: "No embedded, sidecar or filename licence signal was found." });

  for (const resource of container.externalResources) {
    if (!resource.missing) continue;
    warnings.push({
      code: resource.kind === "buffer" ? "missing-external-buffer" : "missing-external-image",
      message: `Referenced external ${resource.kind} "${resource.uri}" could not be resolved on disk.`,
    });
  }

  if (bounds) {
    const maxDimension = Math.max(bounds.dimensions.width, bounds.dimensions.height, bounds.dimensions.depth);
    if (maxDimension > IMPLAUSIBLE_MAX_DIMENSION || (maxDimension > 0 && maxDimension < IMPLAUSIBLE_MIN_DIMENSION)) {
      warnings.push({
        code: "scale-check-required",
        message: `Scene bounds span ${maxDimension} units; the source is almost certainly not authored in metres.`,
      });
    }
  }

  const relativePath = path.relative(sourceRoot, container.filePath).split(path.sep).join("/");
  const classification = classifySource({
    meshCount,
    materialCount,
    imageCount,
    topLevelNodes: nodeSummaries,
    bounds,
    textureBytes: bytes.textureBytes,
    geometryBytes: bytes.geometryBytes,
    fileBytes: container.fileBytes,
    licenseSource: license.source,
    sourcePath: relativePath,
    warnings,
  });

  for (const warning of classification.warnings) warnings.push(warning);

  const scaleReview = reviewScale({ bounds, isInterior: classification.appearsCompleteInterior });
  if (scaleReview.required) warnings.push({ code: "scale-check-required", message: scaleReview.note });

  return {
    schemaVersion: SPATIAL_ASSET_SCHEMA_VERSION,
    sourceAssetId: sourceAssetId(relativePath),
    sourceFilename: path.basename(container.filePath),
    sourcePath: relativePath,
    absoluteSourcePath: container.filePath,
    fileBytes: container.fileBytes,
    format: container.format,
    gltfVersion: json.asset?.version ?? "unknown",
    contentHash: container.contentHash,

    nodeCount: json.nodes?.length ?? 0,
    sceneRootCount: sceneRoots.length,
    topLevelNodeCount: topLevel.length,
    separationRootPath: descended,
    meshCount,
    primitiveCount: totalPrimitives,
    materialCount,
    imageCount,
    textureCount: json.textures?.length ?? 0,
    animationCount,
    cameraCount,
    lightCount,
    triangleCount: totalPrimitives > 0 ? totalTriangles : null,

    textureBytes: bytes.textureBytes,
    geometryBytes: bytes.geometryBytes,
    otherBufferBytes: bytes.otherBufferBytes,

    bounds,

    appearsSingleObject: classification.appearsSingleObject,
    appearsMultiObject: classification.appearsMultiObject,
    appearsCompleteInterior: classification.appearsCompleteInterior,
    hasSeparableNodes: classification.hasSeparableNodes,
    loosePartSplitUseful: classification.loosePartSplitUseful,

    classifications: classification.tags,
    interiorSignals: classification.interiorSignals,
    scaleReview,
    license,
    extensionsUsed,
    extensionsRequired,
    topLevelNodes: nodeSummaries,
    warnings,
  };
}

function countLights(json: GltfJson): number {
  const lightsExtension = json.extensions?.KHR_lights_punctual as { lights?: unknown[] } | undefined;
  return lightsExtension?.lights?.length ?? 0;
}
