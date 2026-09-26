import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { open, stat } from "node:fs/promises";
import path from "node:path";

import type { SourceFormat } from "../types/source.ts";

const GLB_MAGIC = 0x46546c67; // "glTF"
const GLB_CHUNK_JSON = 0x4e4f534a; // "JSON"
const GLB_CHUNK_BIN = 0x004e4942; // "BIN\0"

export interface GltfAsset {
  version?: string;
  generator?: string;
  copyright?: string;
  minVersion?: string;
  extras?: unknown;
  extensions?: Record<string, unknown>;
}

export interface GltfNode {
  name?: string;
  children?: number[];
  mesh?: number;
  camera?: number;
  skin?: number;
  matrix?: number[];
  translation?: number[];
  rotation?: number[];
  scale?: number[];
  extensions?: Record<string, unknown>;
  extras?: unknown;
}

export interface GltfPrimitive {
  attributes?: Record<string, number>;
  indices?: number;
  material?: number;
  mode?: number;
  targets?: Array<Record<string, number>>;
  extensions?: Record<string, unknown>;
}

export interface GltfMesh {
  name?: string;
  primitives?: GltfPrimitive[];
}

export interface GltfAccessor {
  bufferView?: number;
  byteOffset?: number;
  componentType?: number;
  count?: number;
  type?: string;
  min?: number[];
  max?: number[];
  sparse?: {
    count?: number;
    indices?: { bufferView?: number };
    values?: { bufferView?: number };
  };
}

export interface GltfBufferView {
  buffer?: number;
  byteOffset?: number;
  byteLength?: number;
  byteStride?: number;
}

export interface GltfBuffer {
  uri?: string;
  byteLength?: number;
}

export interface GltfImage {
  name?: string;
  uri?: string;
  mimeType?: string;
  bufferView?: number;
}

export interface GltfMaterial {
  name?: string;
  pbrMetallicRoughness?: Record<string, unknown>;
  normalTexture?: unknown;
  occlusionTexture?: unknown;
  emissiveTexture?: unknown;
  extensions?: Record<string, unknown>;
}

export interface GltfScene {
  name?: string;
  nodes?: number[];
}

export interface GltfJson {
  asset?: GltfAsset;
  scene?: number;
  scenes?: GltfScene[];
  nodes?: GltfNode[];
  meshes?: GltfMesh[];
  materials?: GltfMaterial[];
  textures?: Array<Record<string, unknown>>;
  images?: GltfImage[];
  accessors?: GltfAccessor[];
  bufferViews?: GltfBufferView[];
  buffers?: GltfBuffer[];
  animations?: Array<Record<string, unknown>>;
  cameras?: Array<Record<string, unknown>>;
  skins?: Array<Record<string, unknown>>;
  extensionsUsed?: string[];
  extensionsRequired?: string[];
  extensions?: Record<string, unknown>;
  extras?: unknown;
}

export interface GltfExternalResource {
  kind: "buffer" | "image";
  uri: string;
  resolvedPath: string | null;
  bytes: number | null;
  missing: boolean;
}

export interface GltfContainer {
  format: SourceFormat;
  json: GltfJson;
  /** Bytes in the GLB BIN chunk; zero for `.gltf`. */
  binaryChunkBytes: number;
  fileBytes: number;
  filePath: string;
  contentHash: string;
  externalResources: readonly GltfExternalResource[];
  parseErrors: readonly string[];
}

/** Streaming SHA-256 so a 140 MB source never has to be held in memory. */
export async function hashFile(filePath: string): Promise<string> {
  const hash = createHash("sha256");
  await new Promise<void>((resolve, reject) => {
    const stream = createReadStream(filePath);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("error", reject);
    stream.on("end", () => resolve());
  });
  return hash.digest("hex");
}

/**
 * Reads a GLB header plus its JSON chunk without loading the binary payload.
 * Source files are opened read-only and never modified.
 */
async function readGlb(filePath: string, fileBytes: number): Promise<{
  json: GltfJson;
  binaryChunkBytes: number;
  parseErrors: string[];
}> {
  const parseErrors: string[] = [];
  const handle = await open(filePath, "r");
  try {
    const header = Buffer.alloc(12);
    await handle.read(header, 0, 12, 0);
    if (header.readUInt32LE(0) !== GLB_MAGIC) {
      return { json: {}, binaryChunkBytes: 0, parseErrors: ["File does not start with the glTF binary magic."] };
    }

    let offset = 12;
    let json: GltfJson = {};
    let binaryChunkBytes = 0;
    let sawJson = false;

    while (offset + 8 <= fileBytes) {
      const chunkHeader = Buffer.alloc(8);
      await handle.read(chunkHeader, 0, 8, offset);
      const chunkLength = chunkHeader.readUInt32LE(0);
      const chunkType = chunkHeader.readUInt32LE(4);
      const chunkStart = offset + 8;
      if (chunkLength < 0 || chunkStart + chunkLength > fileBytes) {
        parseErrors.push(`Chunk at offset ${offset} declares ${chunkLength} bytes but the file ends earlier.`);
        break;
      }

      if (chunkType === GLB_CHUNK_JSON && !sawJson) {
        const payload = Buffer.alloc(chunkLength);
        await handle.read(payload, 0, chunkLength, chunkStart);
        try {
          json = JSON.parse(payload.toString("utf8")) as GltfJson;
          sawJson = true;
        } catch (error) {
          parseErrors.push(`JSON chunk could not be parsed: ${(error as Error).message}`);
        }
      } else if (chunkType === GLB_CHUNK_BIN) {
        binaryChunkBytes += chunkLength;
      }

      offset = chunkStart + chunkLength + ((4 - (chunkLength % 4)) % 4);
    }

    if (!sawJson) parseErrors.push("No JSON chunk was found in the GLB container.");
    return { json, binaryChunkBytes, parseErrors };
  } finally {
    await handle.close();
  }
}

function isDataUri(uri: string): boolean {
  return uri.startsWith("data:");
}

function dataUriBytes(uri: string): number {
  const commaIndex = uri.indexOf(",");
  if (commaIndex < 0) return 0;
  const payload = uri.slice(commaIndex + 1);
  if (!uri.slice(0, commaIndex).includes(";base64")) return payload.length;
  const padding = payload.endsWith("==") ? 2 : payload.endsWith("=") ? 1 : 0;
  return Math.max(0, Math.floor((payload.length * 3) / 4) - padding);
}

async function resolveExternalResources(
  json: GltfJson,
  baseDir: string,
): Promise<GltfExternalResource[]> {
  const resources: GltfExternalResource[] = [];
  const entries: Array<{ kind: "buffer" | "image"; uri: string | undefined }> = [
    ...(json.buffers ?? []).map((buffer) => ({ kind: "buffer" as const, uri: buffer.uri })),
    ...(json.images ?? []).map((image) => ({ kind: "image" as const, uri: image.uri })),
  ];

  for (const entry of entries) {
    if (!entry.uri) continue;
    if (isDataUri(entry.uri)) {
      resources.push({ kind: entry.kind, uri: "data:", resolvedPath: null, bytes: dataUriBytes(entry.uri), missing: false });
      continue;
    }
    const decoded = decodeURIComponent(entry.uri);
    const resolvedPath = path.resolve(baseDir, decoded);
    try {
      const stats = await stat(resolvedPath);
      resources.push({ kind: entry.kind, uri: entry.uri, resolvedPath, bytes: stats.size, missing: false });
    } catch {
      resources.push({ kind: entry.kind, uri: entry.uri, resolvedPath, bytes: null, missing: true });
    }
  }

  return resources;
}

export async function readGltfContainer(filePath: string): Promise<GltfContainer> {
  const stats = await stat(filePath);
  const format: SourceFormat = path.extname(filePath).toLowerCase() === ".glb" ? "glb" : "gltf";
  const contentHash = await hashFile(filePath);

  if (format === "glb") {
    const { json, binaryChunkBytes, parseErrors } = await readGlb(filePath, stats.size);
    const externalResources = await resolveExternalResources(json, path.dirname(filePath));
    return {
      format,
      json,
      binaryChunkBytes,
      fileBytes: stats.size,
      filePath,
      contentHash,
      externalResources,
      parseErrors,
    };
  }

  const parseErrors: string[] = [];
  let json: GltfJson = {};
  try {
    const handle = await open(filePath, "r");
    try {
      const buffer = Buffer.alloc(stats.size);
      await handle.read(buffer, 0, stats.size, 0);
      json = JSON.parse(buffer.toString("utf8")) as GltfJson;
    } finally {
      await handle.close();
    }
  } catch (error) {
    parseErrors.push(`glTF JSON could not be parsed: ${(error as Error).message}`);
  }

  const externalResources = await resolveExternalResources(json, path.dirname(filePath));
  return {
    format,
    json,
    binaryChunkBytes: 0,
    fileBytes: stats.size,
    filePath,
    contentHash,
    externalResources,
    parseErrors,
  };
}

// --- Minimal column-major 4x4 maths, matching the glTF node transform contract. ---

export type Mat4 = readonly number[];

export const IDENTITY_MATRIX: Mat4 = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];

export function multiplyMat4(a: Mat4, b: Mat4): Mat4 {
  const out = new Array<number>(16).fill(0);
  for (let column = 0; column < 4; column += 1) {
    for (let row = 0; row < 4; row += 1) {
      let sum = 0;
      for (let k = 0; k < 4; k += 1) sum += a[k * 4 + row] * b[column * 4 + k];
      out[column * 4 + row] = sum;
    }
  }
  return out;
}

export function nodeLocalMatrix(node: GltfNode): Mat4 {
  if (node.matrix && node.matrix.length === 16) return node.matrix.slice();

  const [tx, ty, tz] = node.translation ?? [0, 0, 0];
  const [qx, qy, qz, qw] = node.rotation ?? [0, 0, 0, 1];
  const [sx, sy, sz] = node.scale ?? [1, 1, 1];

  const x2 = qx + qx;
  const y2 = qy + qy;
  const z2 = qz + qz;
  const xx = qx * x2;
  const xy = qx * y2;
  const xz = qx * z2;
  const yy = qy * y2;
  const yz = qy * z2;
  const zz = qz * z2;
  const wx = qw * x2;
  const wy = qw * y2;
  const wz = qw * z2;

  return [
    (1 - (yy + zz)) * sx, (xy + wz) * sx, (xz - wy) * sx, 0,
    (xy - wz) * sy, (1 - (xx + zz)) * sy, (yz + wx) * sy, 0,
    (xz + wy) * sz, (yz - wx) * sz, (1 - (xx + yy)) * sz, 0,
    tx, ty, tz, 1,
  ];
}

export function transformPoint(matrix: Mat4, point: readonly [number, number, number]): [number, number, number] {
  const [x, y, z] = point;
  return [
    matrix[0] * x + matrix[4] * y + matrix[8] * z + matrix[12],
    matrix[1] * x + matrix[5] * y + matrix[9] * z + matrix[13],
    matrix[2] * x + matrix[6] * y + matrix[10] * z + matrix[14],
  ];
}

const PRIMITIVE_MODE_TRIANGLES = 4;
const PRIMITIVE_MODE_TRIANGLE_STRIP = 5;
const PRIMITIVE_MODE_TRIANGLE_FAN = 6;

export function primitiveTriangleCount(primitive: GltfPrimitive, accessors: readonly GltfAccessor[]): number {
  const mode = primitive.mode ?? PRIMITIVE_MODE_TRIANGLES;
  const indexAccessor = primitive.indices !== undefined ? accessors[primitive.indices] : undefined;
  const positionIndex = primitive.attributes?.POSITION;
  const positionAccessor = positionIndex !== undefined ? accessors[positionIndex] : undefined;
  const vertexCount = indexAccessor?.count ?? positionAccessor?.count ?? 0;

  if (mode === PRIMITIVE_MODE_TRIANGLES) return Math.floor(vertexCount / 3);
  if (mode === PRIMITIVE_MODE_TRIANGLE_STRIP || mode === PRIMITIVE_MODE_TRIANGLE_FAN) {
    return Math.max(0, vertexCount - 2);
  }
  return 0;
}
