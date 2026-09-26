import * as THREE from "three";
import type { SpatialDimensions, SpatialRenderGeometry } from "@/lib/presence/spatial/model";
import { spatialGlbLoaderPlan } from "@/lib/presence/spatial/renderGeometry";

type GlbRenderGeometry = Extract<SpatialRenderGeometry, { kind: "glb" }>;

interface GltfResult {
  scene: THREE.Group;
}

type GltfLoaderInstance = {
  load: (
    url: string,
    onLoad: (result: GltfResult) => void,
    onProgress?: (event: ProgressEvent) => void,
    onError?: (error: unknown) => void,
  ) => void;
  setDRACOLoader?: (loader: unknown) => void;
};

type DracoLoaderInstance = {
  setDecoderPath: (path: string) => void;
};

type GltfLoaderConstructor = new () => GltfLoaderInstance;
type DracoLoaderConstructor = new () => DracoLoaderInstance;

const glbTemplateCache = new Map<string, Promise<THREE.Group>>();

export async function loadSpatialGlbRenderGeometry(
  geometry: GlbRenderGeometry,
  dimensions: SpatialDimensions,
): Promise<THREE.Group> {
  const template = await loadGlbTemplate(geometry);
  const instance = cloneGlbTemplate(template);
  normalizeGlbInstance(instance, dimensions);
  return instance;
}

function loadGlbTemplate(geometry: GlbRenderGeometry): Promise<THREE.Group> {
  const plan = spatialGlbLoaderPlan(geometry);
  const cacheKey = JSON.stringify(plan);
  const existing = glbTemplateCache.get(cacheKey);
  if (existing) return existing;
  const load = Promise.resolve()
    .then(async () => {
      const [{ GLTFLoader }, dracoModule] = await Promise.all([
        import("three/examples/jsm/loaders/GLTFLoader.js") as Promise<{ GLTFLoader: GltfLoaderConstructor }>,
        plan.useDraco
          ? import("three/examples/jsm/loaders/DRACOLoader.js") as Promise<{ DRACOLoader: DracoLoaderConstructor }>
          : Promise.resolve(undefined),
      ]);
      const loader = new GLTFLoader();
      if (plan.useDraco && dracoModule) {
        const dracoLoader = new dracoModule.DRACOLoader();
        dracoLoader.setDecoderPath(plan.decoderPath ?? "/presence-spatial/draco/gltf/");
        loader.setDRACOLoader?.(dracoLoader);
      }
      return new Promise<THREE.Group>((resolve, reject) => {
        loader.load(
          plan.url,
          (gltf) => resolve(gltf.scene),
          undefined,
          reject,
        );
      });
    })
    .catch((error) => {
      glbTemplateCache.delete(cacheKey);
      throw error;
    });
  glbTemplateCache.set(cacheKey, load);
  return load;
}

function cloneGlbTemplate(template: THREE.Group): THREE.Group {
  const clone = template.clone(true);
  clone.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    child.geometry = child.geometry.clone();
    if (Array.isArray(child.material)) {
      child.material = child.material.map((material) => material.clone());
    } else {
      child.material = child.material.clone();
    }
  });
  return clone;
}

function normalizeGlbInstance(group: THREE.Group, dimensions: SpatialDimensions): void {
  const bounds = new THREE.Box3().setFromObject(group);
  const size = bounds.getSize(new THREE.Vector3());
  if (size.x <= 0 || size.y <= 0 || size.z <= 0) return;
  const center = bounds.getCenter(new THREE.Vector3());
  group.position.sub(center);
  group.scale.multiply(new THREE.Vector3(
    dimensions.width / size.x,
    dimensions.height / size.y,
    dimensions.depth / size.z,
  ));
}

export function collectGlbInstanceResources(
  object: THREE.Object3D,
): { geometries: Set<THREE.BufferGeometry>; materials: Set<THREE.Material>; textures: Set<THREE.Texture> } {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();
  object.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    geometries.add(child.geometry);
    const meshMaterials = Array.isArray(child.material) ? child.material : [child.material];
    for (const material of meshMaterials) {
      materials.add(material);
      for (const value of Object.values(material)) {
        if (value instanceof THREE.Texture) textures.add(value);
      }
    }
  });
  return { geometries, materials, textures };
}
