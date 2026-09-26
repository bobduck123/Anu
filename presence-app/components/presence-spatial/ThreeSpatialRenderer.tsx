"use client";

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { SPATIAL_MATERIAL_PRESETS } from "@/lib/presence/spatial/materials";
import type {
  SpatialGarmentArtworkRole,
  SpatialMaterialSlotId,
  SpatialLightDefinition,
  SpatialMediaRef,
  SpatialRenderItem,
  SpatialRenderPlan,
  SpatialSceneState,
} from "@/lib/presence/spatial/model";
import {
  isSpatialTextureDimensionSafe,
  resolveSpatialMediaSource,
  resolveSpatialSceneState,
  spatialContainMapping,
  spatialItemsForState,
  spatialInspectionTransform,
  spatialMediaLocatorSignature,
  spatialMediaPlacementIdsToLoad,
  type SafeSpatialMediaLocatorMap,
} from "@/lib/presence/spatial/rendererAdapter";
import styles from "./SpatialRoomViewport.module.css";
import {
  getSpatialGeometryTemplate,
  type SpatialGeometryTemplatePart,
} from "./threeGeometryCache";
import {
  collectGlbInstanceResources,
  loadSpatialGlbRenderGeometry,
} from "./threeGlbRenderGeometry";

export interface ThreeSpatialRendererProps {
  plan: SpatialRenderPlan;
  activeStateId: string;
  selectedPlacementId?: string;
  mediaLocators: SafeSpatialMediaLocatorMap;
  onItemActivate: (placementId: string) => void;
  onRuntimeFailure: () => void;
  /** Internal authoring aid: reveals invisible garment carriers. Never persisted. */
  debugCarriers?: boolean;
}

interface RuntimeItemHandle {
  item: SpatialRenderItem;
  root: THREE.Group;
  basePosition: THREE.Vector3;
  targetPosition: THREE.Vector3;
  baseQuaternion: THREE.Quaternion;
  targetQuaternion: THREE.Quaternion;
}

interface SpatialThreeRuntime {
  setSceneState: (state: SpatialSceneState, animate?: boolean) => void;
  setSelectedPlacement: (placementId?: string) => void;
  dispose: () => void;
}

interface PlacementOwnedResources {
  geometries: Set<THREE.BufferGeometry>;
  materials: Set<THREE.Material>;
  textures: Set<THREE.Texture>;
}

/** Alpha cutoff for garment artwork. Mid-range keeps soft edges without haloing. */
const SPATIAL_ARTWORK_ALPHA_TEST = 0.5;
/** Ghost opacity used only when the internal carrier debug toggle is on. */
const SPATIAL_CARRIER_DEBUG_OPACITY = 0.28;

interface SpatialMediaBinding {
  item: SpatialRenderItem;
  material: THREE.MeshStandardMaterial;
  fallback: THREE.Texture;
  surfaceWidth: number;
  surfaceHeight: number;
  requested: boolean;
  /**
   * Alpha artwork surfaces must keep their transparency through the contain
   * step. Opaque media surfaces (projection walls, posters) keep the letterbox
   * backing, which is what makes them read as a screen rather than a cut-out.
   */
  alphaArtwork: boolean;
  /** Garment front/back artwork overrides the placement's single media ref. */
  mediaOverride?: SpatialMediaRef;
}

interface SpatialMediaRuntime {
  register: (binding: SpatialMediaBinding) => void;
}

export function ThreeSpatialRenderer({
  plan,
  activeStateId,
  selectedPlacementId,
  mediaLocators,
  onItemActivate,
  onRuntimeFailure,
  debugCarriers = false,
}: ThreeSpatialRendererProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const runtimeRef = useRef<SpatialThreeRuntime | null>(null);
  const activateRef = useRef(onItemActivate);
  const failureRef = useRef(onRuntimeFailure);
  const locatorSignature = useMemo(
    () => spatialMediaLocatorSignature(mediaLocators),
    [mediaLocators],
  );
  const runtimeKey = `${plan.fingerprint}\u0000${locatorSignature}\u0000${debugCarriers ? "debug" : "clean"}`;

  useEffect(() => {
    activateRef.current = onItemActivate;
    failureRef.current = onRuntimeFailure;
  }, [onItemActivate, onRuntimeFailure]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    try {
      const initialState = resolveSpatialSceneState(plan, activeStateId);
      const runtime = createSpatialThreeRuntime({
        host,
        plan,
        initialState,
        initialSelectedPlacementId: selectedPlacementId,
        mediaLocators,
        onItemActivate: (placementId) => activateRef.current(placementId),
        onRuntimeFailure: () => failureRef.current(),
        debugCarriers,
      });
      runtimeRef.current = runtime;
      return () => {
        runtimeRef.current = null;
        runtime.dispose();
      };
    } catch {
      failureRef.current();
      return undefined;
    }
    // The complete plan fingerprint and locator signature are the runtime identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runtimeKey]);

  useEffect(() => {
    runtimeRef.current?.setSceneState(resolveSpatialSceneState(plan, activeStateId));
  }, [activeStateId, plan]);

  useEffect(() => {
    runtimeRef.current?.setSelectedPlacement(selectedPlacementId);
  }, [selectedPlacementId]);

  return (
    <div
      aria-label="Interactive spatial room"
      className={styles.threeHost}
      data-testid="presence-spatial-three-renderer"
      ref={hostRef}
      role="img"
    />
  );
}

function createSpatialThreeRuntime(input: {
  host: HTMLDivElement;
  plan: SpatialRenderPlan;
  initialState: SpatialSceneState;
  initialSelectedPlacementId?: string;
  mediaLocators: SafeSpatialMediaLocatorMap;
  onItemActivate: (placementId: string) => void;
  onRuntimeFailure: () => void;
  debugCarriers?: boolean;
}): SpatialThreeRuntime {
  const {
    host,
    plan,
    initialState,
    initialSelectedPlacementId,
    mediaLocators,
    onItemActivate,
    onRuntimeFailure,
  } = input;
  const resources: PlacementOwnedResources = {
    geometries: new Set(),
    materials: new Set(),
    textures: new Set(),
  };
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(plan.lighting.background);
  const camera = new THREE.PerspectiveCamera(55, 1, 0.08, 120);
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: false,
    powerPreference: "high-performance",
  });
  const itemHandles = new Map<string, RuntimeItemHandle>();
  const interactiveRoots: THREE.Object3D[] = [];
  const mediaBindings = new Map<string, SpatialMediaBinding[]>();
  const externalTextureLoads = new Map<string, Promise<THREE.Texture | null>>();
  const renderGeometryStats = {
    requested: plan.items.filter((item) => item.renderGeometry?.kind === "glb").length,
    loaded: 0,
    failed: 0,
  };
  const cameraTarget = new THREE.Vector3(0, 1.5, 0);
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let disposed = false;
  let failureSignalled = false;
  let animationFrame = 0;
  let selectedPlacementId = initialSelectedPlacementId;
  let currentState: SpatialSceneState | undefined;
  let activePointerId: number | undefined;
  let pointerStart: { x: number; y: number } | undefined;
  let resizeObserver: ResizeObserver | undefined;
  let cameraAnimation:
    | {
        startedAt: number;
        fromPosition: THREE.Vector3;
        fromTarget: THREE.Vector3;
        fromFov: number;
        toPosition: THREE.Vector3;
        toTarget: THREE.Vector3;
        toFov: number;
      }
    | undefined;

  const requestRender = () => {
    if (!disposed && animationFrame === 0) {
      animationFrame = window.requestAnimationFrame(renderFrame);
    }
  };

  const mediaRuntime: SpatialMediaRuntime = {
    register: (binding) => {
      const existing = mediaBindings.get(binding.item.placementId) ?? [];
      existing.push(binding);
      mediaBindings.set(binding.item.placementId, existing);
    },
  };

  const dispose = () => {
    if (disposed) return;
    disposed = true;
    if (animationFrame !== 0) window.cancelAnimationFrame(animationFrame);
    resizeObserver?.disconnect();
    window.removeEventListener("resize", safeResize);
    renderer.domElement.removeEventListener("pointerdown", onPointerDown);
    renderer.domElement.removeEventListener("pointerup", onPointerUp);
    renderer.domElement.removeEventListener("pointercancel", clearPointer);
    renderer.domElement.removeEventListener("pointerleave", clearPointer);
    renderer.domElement.removeEventListener("lostpointercapture", clearPointer);
    renderer.domElement.removeEventListener("webglcontextlost", onContextLost);
    for (const geometry of resources.geometries) {
      try { geometry.dispose(); } catch { /* continue disposing the remaining runtime */ }
    }
    for (const texture of resources.textures) {
      try { texture.dispose(); } catch { /* continue disposing the remaining runtime */ }
    }
    for (const material of resources.materials) {
      try { material.dispose(); } catch { /* continue disposing the remaining runtime */ }
    }
    scene.clear();
    try { renderer.renderLists.dispose(); } catch { /* best-effort teardown */ }
    try { renderer.dispose(); } catch { /* best-effort teardown */ }
    try { renderer.forceContextLoss(); } catch { /* best-effort teardown */ }
    renderer.domElement.remove();
    delete host.dataset.renderedItemCount;
    delete host.dataset.componentKeys;
    delete host.dataset.roomFingerprint;
    delete host.dataset.lightingProfile;
    delete host.dataset.glbRenderRequestedCount;
    delete host.dataset.glbRenderLoadedCount;
    delete host.dataset.glbRenderFailedCount;
  };

  const failRuntime = () => {
    if (failureSignalled || disposed) return;
    failureSignalled = true;
    onRuntimeFailure();
    dispose();
  };

  function renderFrame(now: number) {
    animationFrame = 0;
    if (disposed) return;
    try {
      let needsAnotherFrame = false;

      if (cameraAnimation) {
        const progress = Math.min(1, (now - cameraAnimation.startedAt) / 460);
        const eased = 1 - Math.pow(1 - progress, 3);
        camera.position.lerpVectors(cameraAnimation.fromPosition, cameraAnimation.toPosition, eased);
        cameraTarget.lerpVectors(cameraAnimation.fromTarget, cameraAnimation.toTarget, eased);
        camera.fov = THREE.MathUtils.lerp(cameraAnimation.fromFov, cameraAnimation.toFov, eased);
        camera.updateProjectionMatrix();
        if (progress < 1) needsAnotherFrame = true;
        else cameraAnimation = undefined;
      }

      for (const handle of itemHandles.values()) {
        if (handle.root.position.distanceToSquared(handle.targetPosition) < 0.00001) {
          handle.root.position.copy(handle.targetPosition);
        } else {
          handle.root.position.lerp(handle.targetPosition, 0.2);
          needsAnotherFrame = true;
        }
        if (handle.root.quaternion.angleTo(handle.targetQuaternion) >= 0.0001) {
          handle.root.quaternion.slerp(handle.targetQuaternion, 0.2);
          needsAnotherFrame = true;
        } else {
          handle.root.quaternion.copy(handle.targetQuaternion);
        }
      }

      camera.lookAt(cameraTarget);
      renderer.render(scene, camera);
      markSuccessfulRender(host, renderer.domElement, plan, itemHandles);
      if (needsAnotherFrame) requestRender();
    } catch {
      failRuntime();
    }
  }

  const setSceneState = (state: SpatialSceneState, animate = true) => {
    if (disposed) return;
    const isSameState = currentState?.id === state.id;
    currentState = state;
    const nextPosition = new THREE.Vector3().fromArray(state.cameraPosition);
    const nextTarget = new THREE.Vector3().fromArray(state.cameraTarget);
    if (!isSameState) {
      if (animate) {
        cameraAnimation = {
          startedAt: performance.now(),
          fromPosition: camera.position.clone(),
          fromTarget: cameraTarget.clone(),
          fromFov: camera.fov,
          toPosition: nextPosition,
          toTarget: nextTarget,
          toFov: state.fieldOfView,
        };
      } else {
        camera.position.copy(nextPosition);
        cameraTarget.copy(nextTarget);
        camera.fov = state.fieldOfView;
        camera.updateProjectionMatrix();
      }
    }
    const visiblePlacementIds = new Set(
      spatialItemsForState(plan, state).map((item) => item.placementId),
    );
    for (const handle of itemHandles.values()) {
      handle.root.visible = visiblePlacementIds.has(handle.item.placementId);
    }
    updateInspectionTargets(nextPosition);
    requestMediaForState();
    requestRender();
  };

  const setSelectedPlacement = (placementId?: string) => {
    if (disposed) return;
    selectedPlacementId = placementId;
    updateInspectionTargets(cameraAnimation?.toPosition ?? camera.position);
    requestMediaForState();
    requestRender();
  };

  const updateInspectionTargets = (inspectionCameraPosition: THREE.Vector3) => {
    for (const handle of itemHandles.values()) {
      handle.targetPosition.copy(handle.basePosition);
      handle.targetQuaternion.copy(handle.baseQuaternion);
    }
    const selected = selectedPlacementId ? itemHandles.get(selectedPlacementId) : undefined;
    if (selected?.item.category === "piece") {
      selected.root.visible = true;
      if (selected.item.interaction?.preserveParentContext) {
        let parentPlacementId = selected.item.parentPlacementId;
        const visited = new Set<string>();
        while (parentPlacementId && !visited.has(parentPlacementId)) {
          visited.add(parentPlacementId);
          const parent = itemHandles.get(parentPlacementId);
          if (!parent) break;
          parent.root.visible = true;
          parentPlacementId = parent.item.parentPlacementId;
        }
      }
      const target = spatialInspectionTransform(selected.item, [
          inspectionCameraPosition.x,
          inspectionCameraPosition.y,
          inspectionCameraPosition.z,
        ]);
      selected.targetPosition.fromArray(target.position);
      selected.targetQuaternion.setFromEuler(new THREE.Euler(...target.rotation));
    }
  };

  const requestMediaForState = () => {
    if (!currentState) return;
    const placementIds = spatialMediaPlacementIdsToLoad(plan, currentState, selectedPlacementId);
    for (const placementId of placementIds) requestMediaForPlacement(placementId);
  };

  const requestMediaForPlacement = (placementId: string) => {
    for (const binding of mediaBindings.get(placementId) ?? []) {
      if (binding.requested) continue;
      binding.requested = true;
      // A garment's artwork overrides the placement's single media ref. Reading
      // `binding.item.media` here ignored the override entirely, so garment
      // front/back artwork could never be fetched and every garment kept its
      // procedural placeholder.
      const media = binding.mediaOverride ?? binding.item.media;
      const source = resolveSpatialMediaSource(media, mediaLocators);
      if (!source || !media) continue;
      const cacheKey = `${media.assetId}\u0000${source}`;
      let textureLoad = externalTextureLoads.get(cacheKey);
      if (!textureLoad) {
        textureLoad = loadGuardedTexture(source, resources, () => disposed);
        externalTextureLoads.set(cacheKey, textureLoad);
      }
      void textureLoad.then((sourceTexture) => {
        if (!sourceTexture || disposed) return;
        const containedTexture = createContainedMediaTexture(
          sourceTexture,
          binding.surfaceWidth,
          binding.surfaceHeight,
          binding.alphaArtwork,
        );
        if (!containedTexture || disposed) {
          containedTexture?.dispose();
          return;
        }
        resources.textures.add(containedTexture);
        binding.material.map = containedTexture;
        if (binding.material.emissiveIntensity > 0) binding.material.emissiveMap = containedTexture;
        binding.material.needsUpdate = true;
        if (resources.textures.delete(binding.fallback)) binding.fallback.dispose();
        requestRender();
      });
    }
  };

  const clearPointer = (event?: PointerEvent) => {
    if (event && activePointerId !== undefined && event.pointerId !== activePointerId) return;
    const pointerId = activePointerId;
    activePointerId = undefined;
    pointerStart = undefined;
    if (pointerId !== undefined && renderer.domElement.hasPointerCapture(pointerId)) {
      try { renderer.domElement.releasePointerCapture(pointerId); } catch { /* capture already ended */ }
    }
  };

  const onPointerDown = (event: PointerEvent) => {
    if (!event.isPrimary || event.button !== 0 || activePointerId !== undefined) return;
    activePointerId = event.pointerId;
    pointerStart = { x: event.clientX, y: event.clientY };
    try { renderer.domElement.setPointerCapture(event.pointerId); } catch { clearPointer(event); }
  };

  const onPointerUp = (event: PointerEvent) => {
    if (!event.isPrimary || event.button !== 0 || event.pointerId !== activePointerId || !pointerStart) return;
    const start = pointerStart;
    clearPointer(event);
    const travel = Math.hypot(event.clientX - start.x, event.clientY - start.y);
    if (travel > 7) return;
    const bounds = renderer.domElement.getBoundingClientRect();
    if (bounds.width === 0 || bounds.height === 0) return;
    pointer.set(
      ((event.clientX - bounds.left) / bounds.width) * 2 - 1,
      -((event.clientY - bounds.top) / bounds.height) * 2 + 1,
    );
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObjects(interactiveRoots, true)[0];
    let object: THREE.Object3D | null = hit?.object ?? null;
    while (object && typeof object.userData.placementId !== "string") object = object.parent;
    if (object && typeof object.userData.placementId === "string") {
      onItemActivate(object.userData.placementId);
    }
  };

  const onContextLost = (event: Event) => {
    event.preventDefault();
    failRuntime();
  };

  const safeResize = () => {
    if (disposed) return;
    try {
      const bounds = host.getBoundingClientRect();
      const width = Math.max(1, Math.round(bounds.width));
      const height = Math.max(1, Math.round(bounds.height));
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
      renderer.setSize(width, height, false);
      requestRender();
    } catch {
      failRuntime();
    }
  };

  try {
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = plan.lighting.toneMappingExposure;
    renderer.shadowMap.enabled = false;
    renderer.domElement.dataset.testid = "presence-spatial-three-canvas";
    renderer.domElement.setAttribute("aria-hidden", "true");
    host.replaceChildren(renderer.domElement);

    addSpatialLighting(scene, plan.lighting.lights);

    for (const item of plan.items) {
      if (!item.visible) continue;
      const root = createSpatialObject(item, resources, mediaRuntime, input.debugCarriers ?? false);
      root.position.fromArray(item.transform.position);
      root.rotation.set(...item.transform.rotation);
      root.scale.fromArray(item.transform.scale);
      markPlacement(root, item.placementId);
      scene.add(root);
      const handle = {
        item,
        root,
        basePosition: root.position.clone(),
        targetPosition: root.position.clone(),
        baseQuaternion: root.quaternion.clone(),
        targetQuaternion: root.quaternion.clone(),
      };
      itemHandles.set(item.placementId, handle);
      if (item.actions.length > 0 || item.interaction) interactiveRoots.push(root);
      requestRenderGeometryForItem({
        item,
        root,
        resources,
        renderGeometryStats,
        requestRender,
        isDisposed: () => disposed,
      });
    }

    renderer.domElement.addEventListener("pointerdown", onPointerDown);
    renderer.domElement.addEventListener("pointerup", onPointerUp);
    renderer.domElement.addEventListener("pointercancel", clearPointer);
    renderer.domElement.addEventListener("pointerleave", clearPointer);
    renderer.domElement.addEventListener("lostpointercapture", clearPointer);
    renderer.domElement.addEventListener("webglcontextlost", onContextLost);
    resizeObserver = typeof ResizeObserver === "undefined"
      ? undefined
      : new ResizeObserver(() => safeResize());
    resizeObserver?.observe(host);
    window.addEventListener("resize", safeResize);
    safeResize();
    setSceneState(initialState, false);
    setSelectedPlacement(initialSelectedPlacementId);
  } catch (error) {
    dispose();
    throw error;
  }

  return { setSceneState, setSelectedPlacement, dispose };
}

function createSpatialObject(
  item: SpatialRenderItem,
  resources: PlacementOwnedResources,
  mediaRuntime: SpatialMediaRuntime,
  debugCarriers = false,
): THREE.Group {
  const group = new THREE.Group();
  const proxyGroup = new THREE.Group();
  proxyGroup.name = "proxy-geometry";
  const template = getSpatialGeometryTemplate(item);
  const materialByPartKey = new Map<string, THREE.MeshStandardMaterial>();
  group.userData.componentKey = item.componentKey;
  group.userData.geometryTemplateSource = template.source;

  for (const [partIndex, templatePart] of template.parts.entries()) {
    // Carrier and artwork must never share a material: hiding the carrier must
    // not hide the artwork. The key keeps them in separate buckets.
    const materialKey = [
      templatePart.materialSlot ?? "default",
      templatePart.materialSide ?? "front",
      templatePart.mediaSurface ? `media-${partIndex}` : "solid",
      templatePart.carrier ? "carrier" : "visible",
      templatePart.alphaArtwork ? `alpha-${templatePart.mediaRole ?? "any"}` : "opaque",
    ].join(":");
    let material = materialByPartKey.get(materialKey);
    if (!material) {
      material = spatialMaterial(item, resources, templatePart.materialSlot);
      material.side = threeMaterialSide(templatePart);
      if (templatePart.carrier) {
        applyCarrierVisibility(material, debugCarriers);
      } else if (templatePart.mediaSurface) {
        if (templatePart.alphaArtwork) applyArtworkAlpha(material);
        applyGeneratedMediaToMaterial(
          item,
          material,
          resources,
          mediaRuntime,
          templatePart.alphaArtwork === true,
          garmentMediaForRole(item, templatePart.mediaRole),
        );
      }
      materialByPartKey.set(materialKey, material);
    }
    const mesh = new THREE.Mesh(templatePart.geometry, material);
    mesh.position.fromArray(templatePart.position);
    if (templatePart.rotation) mesh.rotation.set(...templatePart.rotation);
    if (templatePart.scale) mesh.scale.fromArray(templatePart.scale);
    proxyGroup.add(mesh);
  }
  group.add(proxyGroup);
  return group;
}

function requestRenderGeometryForItem(input: {
  item: SpatialRenderItem;
  root: THREE.Group;
  resources: PlacementOwnedResources;
  renderGeometryStats: { requested: number; loaded: number; failed: number };
  requestRender: () => void;
  isDisposed: () => boolean;
}): void {
  const { item, root, resources, renderGeometryStats, requestRender, isDisposed } = input;
  if (item.renderGeometry?.kind !== "glb") return;
  root.userData.renderGeometryStatus = "loading";
  void loadSpatialGlbRenderGeometry(item.renderGeometry, item.dimensions)
    .then((loaded) => {
      if (isDisposed()) {
        disposeGlbInstance(loaded);
        return;
      }
      loaded.name = "glb-render-geometry";
      loaded.userData.geometryTemplateSource = "glb-render-geometry";
      markPlacement(loaded, item.placementId);
      const collected = collectGlbInstanceResources(loaded);
      for (const geometry of collected.geometries) resources.geometries.add(geometry);
      for (const material of collected.materials) resources.materials.add(material);
      for (const texture of collected.textures) resources.textures.add(texture);
      root.add(loaded);
      const proxy = root.getObjectByName("proxy-geometry");
      if (proxy) proxy.visible = false;
      root.userData.renderGeometryStatus = "loaded";
      renderGeometryStats.loaded += 1;
      requestRender();
    })
    .catch(() => {
      if (isDisposed()) return;
      root.userData.renderGeometryStatus = "failed";
      renderGeometryStats.failed += 1;
      requestRender();
    });
}

function disposeGlbInstance(object: THREE.Object3D): void {
  const collected = collectGlbInstanceResources(object);
  for (const geometry of collected.geometries) {
    try { geometry.dispose(); } catch { /* best-effort orphan cleanup */ }
  }
  for (const texture of collected.textures) {
    try { texture.dispose(); } catch { /* best-effort orphan cleanup */ }
  }
  for (const material of collected.materials) {
    try { material.dispose(); } catch { /* best-effort orphan cleanup */ }
  }
}

function applyGeneratedMediaToMaterial(
  item: SpatialRenderItem,
  material: THREE.MeshStandardMaterial,
  resources: PlacementOwnedResources,
  mediaRuntime: SpatialMediaRuntime,
  alphaArtwork: boolean,
  mediaOverride?: SpatialMediaRef,
): void {
  const surfaceWidth = item.dimensions.width * Math.abs(item.transform.scale[0]);
  const surfaceHeight = item.dimensions.height * Math.abs(item.transform.scale[1]);
  const generatedTexture = createGeneratedMediaTexture(item, surfaceWidth, surfaceHeight);
  resources.textures.add(generatedTexture);
  material.map = generatedTexture;
  if (material.emissiveIntensity > 0) material.emissiveMap = generatedTexture;
  material.color.set(0xffffff);
  material.needsUpdate = true;
  mediaRuntime.register({
    item,
    material,
    fallback: generatedTexture,
    surfaceWidth,
    surfaceHeight,
    requested: false,
    alphaArtwork,
    ...(mediaOverride ? { mediaOverride } : {}),
  });
}

function loadGuardedTexture(
  source: string,
  resources: PlacementOwnedResources,
  isDisposed: () => boolean,
): Promise<THREE.Texture | null> {
  return new Promise((resolve) => {
    new THREE.TextureLoader().load(
      source,
      (texture) => {
        const dimensions = textureImageDimensions(texture);
        if (isDisposed() || !dimensions || !isSpatialTextureDimensionSafe(dimensions.width, dimensions.height)) {
          texture.dispose();
          resolve(null);
          return;
        }
        texture.colorSpace = THREE.SRGBColorSpace;
        resources.textures.add(texture);
        resolve(texture);
      },
      undefined,
      () => resolve(null),
    );
  });
}

function textureImageDimensions(texture: THREE.Texture): { width: number; height: number } | null {
  const image = texture.image as {
    naturalWidth?: number;
    naturalHeight?: number;
    videoWidth?: number;
    videoHeight?: number;
    width?: number;
    height?: number;
  } | undefined;
  if (!image) return null;
  const width = image.naturalWidth ?? image.videoWidth ?? image.width;
  const height = image.naturalHeight ?? image.videoHeight ?? image.height;
  return typeof width === "number" && typeof height === "number" ? { width, height } : null;
}

function createContainedMediaTexture(
  sourceTexture: THREE.Texture,
  surfaceWidth: number,
  surfaceHeight: number,
  preserveAlpha: boolean,
): THREE.CanvasTexture | null {
  const dimensions = textureImageDimensions(sourceTexture);
  if (!dimensions) return null;
  const mapping = spatialContainMapping(
    dimensions.width,
    dimensions.height,
    surfaceWidth,
    surfaceHeight,
  );
  if (!mapping) return null;
  const canvas = document.createElement("canvas");
  canvas.width = mapping.canvasWidth;
  canvas.height = mapping.canvasHeight;
  const context = canvas.getContext("2d");
  if (!context) return null;
  if (!preserveAlpha) {
    // An opaque backing is correct for a projection wall or poster: it should
    // read as a screen, and the letterbox bars must not be see-through.
    //
    // It is wrong for garment artwork. Filling here painted over the alpha
    // channel, so `alphaTest` had nothing left to carve and every garment
    // rendered as a full rectangle no matter what artwork was assigned.
    context.fillStyle = "#111318";
    context.fillRect(0, 0, canvas.width, canvas.height);
  }
  context.drawImage(
    sourceTexture.image as CanvasImageSource,
    mapping.drawX,
    mapping.drawY,
    mapping.drawWidth,
    mapping.drawHeight,
  );
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function threeMaterialSide(part: SpatialGeometryTemplatePart): THREE.Side {
  switch (part.materialSide) {
    case "back":
      return THREE.BackSide;
    case "double":
      return THREE.DoubleSide;
    default:
      return THREE.FrontSide;
  }
}

function createGeneratedMediaTexture(
  item: SpatialRenderItem,
  surfaceWidth: number,
  surfaceHeight: number,
): THREE.CanvasTexture {
  const mapping = spatialContainMapping(1, 1, surfaceWidth, surfaceHeight, 512);
  const canvas = document.createElement("canvas");
  canvas.width = mapping?.canvasWidth ?? 512;
  canvas.height = mapping?.canvasHeight ?? 512;
  const context = canvas.getContext("2d");
  if (context) {
    const width = canvas.width;
    const height = canvas.height;
    const seed = hashText(item.media?.assetId ?? item.placementId);
    const hue = seed % 360;
    const gradient = context.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, `hsl(${hue} 28% 13%)`);
    gradient.addColorStop(1, `hsl(${(hue + 58) % 360} 50% 34%)`);
    context.fillStyle = gradient;
    context.fillRect(0, 0, width, height);
    context.globalAlpha = 0.62;
    context.fillStyle = `hsl(${(hue + 178) % 360} 72% 62%)`;
    context.beginPath();
    context.arc(width * 0.74, height * 0.25, Math.min(width, height) * 0.25, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = `hsl(${(hue + 304) % 360} 48% 55%)`;
    context.fillRect(-width * 0.06, height * 0.59, width * 0.82, Math.max(18, height * 0.19));
    context.globalAlpha = 1;
    context.fillStyle = "rgba(255,255,255,.92)";
    context.font = `600 ${Math.max(14, Math.round(Math.min(width, height) * 0.047))}px system-ui, sans-serif`;
    context.textBaseline = "bottom";
    drawWrappedText(
      context,
      item.media?.alt ?? item.semanticLabel,
      width * 0.067,
      height * 0.934,
      width * 0.86,
      Math.max(18, height * 0.059),
      3,
    );
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function drawWrappedText(
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  bottom: number,
  maxWidth: number,
  lineHeight: number,
  maxLines: number,
) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (context.measureText(candidate).width <= maxWidth || line === "") line = candidate;
    else {
      lines.push(line);
      line = word;
      if (lines.length === maxLines - 1) break;
    }
  }
  if (line && lines.length < maxLines) lines.push(line);
  lines.reverse().forEach((value, index) => context.fillText(value, x, bottom - index * lineHeight));
}

function spatialMaterial(
  item: SpatialRenderItem,
  resources: PlacementOwnedResources,
  preferredSlot?: SpatialMaterialSlotId,
): THREE.MeshStandardMaterial {
  const slot = preferredSlot ?? item.primaryMaterialSlot;
  const resolved =
    (slot ? item.materials.find((material) => material.slot === slot) : undefined) ??
    item.materials[0];
  const preset = resolved ? SPATIAL_MATERIAL_PRESETS[resolved.presetId] : undefined;
  const material = new THREE.MeshStandardMaterial({
    color: resolved?.color ?? preset?.baseColor ?? "#a8a8a2",
    roughness: preset?.roughness ?? 0.72,
    metalness: preset?.metalness ?? 0,
    emissive: preset?.emissive ?? "#000000",
    emissiveIntensity: preset?.emissiveIntensity ?? 0,
  });
  resources.materials.add(material);
  return material;
}

/**
 * Invisible carrier material.
 *
 * The mesh stays in the scene so it still contributes bounds and remains
 * raycast-selectable, but it writes neither colour nor depth. Selection of a
 * garment therefore works across the whole carrier volume rather than only
 * where the artwork happens to be opaque.
 */
function applyCarrierVisibility(material: THREE.MeshStandardMaterial, debug = false): void {
  material.transparent = true;
  // Debug mode reveals the carrier as a faint ghost for authoring QA only. It
  // never changes artwork, saved data, or the public meaning of the room, and it
  // is not an indication of final visual quality.
  material.opacity = debug ? SPATIAL_CARRIER_DEBUG_OPACITY : 0;
  material.depthWrite = false;
  material.colorWrite = debug;
  material.wireframe = debug;
  material.needsUpdate = true;
}

/**
 * Alpha-tested artwork material.
 *
 * `alphaTest` is preferred over blended transparency: it writes depth correctly,
 * so a rail of overlapping garment planes does not depend on sort order.
 */
function applyArtworkAlpha(material: THREE.MeshStandardMaterial): void {
  material.transparent = false;
  material.alphaTest = SPATIAL_ARTWORK_ALPHA_TEST;
  material.depthWrite = true;
  material.needsUpdate = true;
}

function garmentMediaForRole(
  item: SpatialRenderItem,
  role: SpatialGarmentArtworkRole | undefined,
): SpatialMediaRef | undefined {
  const garment = item.garment;
  if (!role || !garment) return undefined;
  // Each channel falls back along an honest chain rather than leaving a plane
  // blank: a back print falls back to the front, and footwear falls back to its
  // display image, which is the shoe's primary channel.
  switch (role) {
    case "front": return garment.frontMedia ?? garment.displayMedia;
    case "back": return garment.backMedia ?? garment.frontMedia ?? garment.displayMedia;
    case "display": return garment.displayMedia ?? garment.outerSideMedia ?? garment.frontMedia;
    case "outer-side": return garment.outerSideMedia ?? garment.topMedia ?? garment.displayMedia;
    case "top": return garment.topMedia ?? garment.displayMedia;
  }
}

function markPlacement(object: THREE.Object3D, placementId: string) {
  object.traverse((child) => {
    child.userData.placementId = placementId;
  });
}

function markSuccessfulRender(
  host: HTMLDivElement,
  canvas: HTMLCanvasElement,
  plan: SpatialRenderPlan,
  itemHandles: Map<string, RuntimeItemHandle>,
) {
  const renderedItems = [...itemHandles.values()].filter((handle) => handle.root.visible);
  const componentKeys = [...new Set(renderedItems.map((handle) => handle.item.componentKey))]
    .sort()
    .join(",");
  const count = String(renderedItems.length);
  host.dataset.roomFingerprint = plan.fingerprint;
  host.dataset.lightingProfile = plan.lighting.id;
  host.dataset.renderedItemCount = count;
  host.dataset.componentKeys = componentKeys;
  host.dataset.glbRenderRequestedCount = String(plan.items.filter((item) => item.renderGeometry?.kind === "glb").length);
  host.dataset.glbRenderLoadedCount = String([...itemHandles.values()].filter((handle) => handle.root.userData.renderGeometryStatus === "loaded").length);
  host.dataset.glbRenderFailedCount = String([...itemHandles.values()].filter((handle) => handle.root.userData.renderGeometryStatus === "failed").length);
  canvas.dataset.roomFingerprint = plan.fingerprint;
  canvas.dataset.lightingProfile = plan.lighting.id;
  canvas.dataset.renderedItemCount = count;
  canvas.dataset.componentKeys = componentKeys;
  canvas.dataset.glbRenderRequestedCount = host.dataset.glbRenderRequestedCount;
  canvas.dataset.glbRenderLoadedCount = host.dataset.glbRenderLoadedCount;
  canvas.dataset.glbRenderFailedCount = host.dataset.glbRenderFailedCount;
}

function addSpatialLighting(scene: THREE.Scene, definitions: readonly SpatialLightDefinition[]) {
  for (const definition of definitions) {
    let light: THREE.Light;
    switch (definition.kind) {
      case "ambient":
        light = new THREE.AmbientLight(definition.color, definition.intensity);
        break;
      case "hemisphere":
        light = new THREE.HemisphereLight(
          definition.color,
          definition.groundColor ?? "#111111",
          definition.intensity,
        );
        break;
      case "directional":
        light = new THREE.DirectionalLight(definition.color, definition.intensity);
        break;
      case "point":
        light = new THREE.PointLight(
          definition.color,
          definition.intensity,
          definition.distance ?? 0,
        );
        break;
      case "spot":
        light = new THREE.SpotLight(
          definition.color,
          definition.intensity,
          definition.distance ?? 0,
          definition.angle ?? Math.PI / 3,
          definition.penumbra ?? 0,
        );
        break;
    }
    light.name = definition.id;
    if (definition.position) light.position.fromArray(definition.position);
    if ((light instanceof THREE.DirectionalLight || light instanceof THREE.SpotLight) && definition.target) {
      light.target.position.fromArray(definition.target);
      scene.add(light.target);
    }
    scene.add(light);
  }
}

function hashText(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}
