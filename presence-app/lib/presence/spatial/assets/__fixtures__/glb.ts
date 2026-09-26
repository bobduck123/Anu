/**
 * Minimal in-memory GLB builder used by the ingestion tests.
 *
 * Binary GLB fixtures are awkward to commit and review, so the tests synthesise
 * containers instead. Real binary QA against the actual source batch is manual
 * and recorded in the ingestion report.
 */

const GLB_MAGIC = 0x46546c67;
const GLB_VERSION = 2;
const GLB_CHUNK_JSON = 0x4e4f534a;
const GLB_CHUNK_BIN = 0x004e4942;

function padTo4(length: number): number {
  return (4 - (length % 4)) % 4;
}

export function buildGlb(json: unknown, binaryBytes: number): Buffer {
  const jsonBuffer = Buffer.from(JSON.stringify(json), "utf8");
  const jsonPadding = Buffer.alloc(padTo4(jsonBuffer.length), 0x20);
  const binaryBuffer = Buffer.alloc(binaryBytes + padTo4(binaryBytes), 0);

  const jsonChunkLength = jsonBuffer.length + jsonPadding.length;
  const binaryChunkLength = binaryBuffer.length;
  const totalLength = 12 + 8 + jsonChunkLength + (binaryChunkLength > 0 ? 8 + binaryChunkLength : 0);

  const header = Buffer.alloc(12);
  header.writeUInt32LE(GLB_MAGIC, 0);
  header.writeUInt32LE(GLB_VERSION, 4);
  header.writeUInt32LE(totalLength, 8);

  const jsonHeader = Buffer.alloc(8);
  jsonHeader.writeUInt32LE(jsonChunkLength, 0);
  jsonHeader.writeUInt32LE(GLB_CHUNK_JSON, 4);

  const parts = [header, jsonHeader, jsonBuffer, jsonPadding];
  if (binaryChunkLength > 0) {
    const binaryHeader = Buffer.alloc(8);
    binaryHeader.writeUInt32LE(binaryChunkLength, 0);
    binaryHeader.writeUInt32LE(GLB_CHUNK_BIN, 4);
    parts.push(binaryHeader, binaryBuffer);
  }
  return Buffer.concat(parts);
}

export interface FixtureObject {
  name: string;
  min: [number, number, number];
  max: [number, number, number];
  triangles: number;
  materialName: string;
}

/** A multi-object interior wrapped in Sketchfab-style pass-through nodes. */
export function interiorSceneGlb(options: {
  objects: readonly FixtureObject[];
  geometryBytes: number;
  textureBytes: number;
  imageCount: number;
  wrapNodes?: readonly string[];
  extras?: Record<string, string>;
}): Buffer {
  const wrapNodes = options.wrapNodes ?? ["Sketchfab_model", "RootNode"];
  const nodes: Array<Record<string, unknown>> = [];
  const meshes: Array<Record<string, unknown>> = [];
  const accessors: Array<Record<string, unknown>> = [];
  const materials: Array<Record<string, unknown>> = [];
  const bufferViews: Array<Record<string, unknown>> = [];
  const images: Array<Record<string, unknown>> = [];

  // Wrapper chain first; children are appended once the object nodes exist.
  for (const [index, name] of wrapNodes.entries()) {
    nodes.push({ name, children: [index + 1] });
  }

  const geometryPerObject = Math.floor(options.geometryBytes / Math.max(1, options.objects.length));
  const objectNodeIndices: number[] = [];
  for (const [index, object] of options.objects.entries()) {
    const accessorIndex = accessors.length;
    bufferViews.push({ buffer: 0, byteOffset: bufferViews.length * 16, byteLength: geometryPerObject });
    accessors.push({
      bufferView: bufferViews.length - 1,
      componentType: 5126,
      count: object.triangles * 3,
      type: "VEC3",
      min: object.min,
      max: object.max,
    });
    materials.push({ name: object.materialName });
    meshes.push({
      name: `${object.name}_mesh`,
      primitives: [{ attributes: { POSITION: accessorIndex }, material: materials.length - 1, mode: 4 }],
    });
    const nodeIndex = wrapNodes.length + index;
    nodes.push({ name: object.name, mesh: meshes.length - 1 });
    objectNodeIndices.push(nodeIndex);
  }

  if (wrapNodes.length > 0) {
    nodes[wrapNodes.length - 1] = { name: wrapNodes[wrapNodes.length - 1], children: objectNodeIndices };
  }

  const imageBytes = Math.floor(options.textureBytes / Math.max(1, options.imageCount));
  for (let index = 0; index < options.imageCount; index += 1) {
    bufferViews.push({ buffer: 0, byteOffset: 10_000_000 + index * 16, byteLength: imageBytes });
    images.push({ name: `image-${index}`, mimeType: "image/png", bufferView: bufferViews.length - 1 });
  }

  const totalBinary = options.geometryBytes + options.textureBytes;
  const json = {
    asset: {
      version: "2.0",
      generator: "presence-test-fixture",
      ...(options.extras ? { extras: options.extras } : {}),
    },
    scene: 0,
    scenes: [{ name: "Scene", nodes: wrapNodes.length > 0 ? [0] : objectNodeIndices }],
    nodes,
    meshes,
    materials,
    accessors,
    bufferViews,
    buffers: [{ byteLength: totalBinary }],
    images,
    textures: images.map((_, index) => ({ source: index })),
  };

  return buildGlb(json, totalBinary);
}

/** A single small object with no wrapper chain and no provenance metadata. */
export function singleObjectGlb(name = "Table"): Buffer {
  return interiorSceneGlb({
    objects: [{ name, min: [-0.6, 0, -0.4], max: [0.6, 0.75, 0.4], triangles: 400, materialName: "oak" }],
    geometryBytes: 20_000,
    textureBytes: 0,
    imageCount: 0,
    wrapNodes: [],
  });
}
