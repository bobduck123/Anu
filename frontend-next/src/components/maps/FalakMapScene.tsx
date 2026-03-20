'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { MapCategory, MapEdge, MapNode } from '@/lib/api/educationMaps';
import { categoryColor } from './presentation';

interface FalakMapSceneProps {
  nodes: MapNode[];
  edges: MapEdge[];
  categories: MapCategory[];
  activeNodeId: string | null;
  compareNodeIds: string[];
  visibleNodeIds: string[];
  flattenTo2d: boolean;
  onSelectNodeId: (nodeId: string) => void;
}

type VisualNode = {
  node: MapNode;
  index: number;
  baseColor: THREE.Color;
  basePosition: THREE.Vector3;
  displayPosition: THREE.Vector3;
  size: number;
  driftSeed: number;
  degree: number;
};

type VisualEdge = {
  edge: MapEdge;
  sourceIndex: number;
  targetIndex: number;
  segmentOffset: number;
  segmentCount: number;
};

type GraphVisualState = {
  nodeRecords: VisualNode[];
  edgeRecords: VisualEdge[];
  nodeIdToIndex: Map<string, number>;
  nodeGeometry: THREE.BufferGeometry;
  nodeMaterial: THREE.ShaderMaterial;
  nodeMesh: THREE.Points;
  connectionGeometry: THREE.BufferGeometry | null;
  connectionMaterial: THREE.ShaderMaterial | null;
  connectionMesh: THREE.LineSegments | null;
};

const POSITION_SCALE = 8;
const STARFIELD_COUNT = 3400;
const CONNECTION_SEGMENTS = 32;
const HIDDEN_NODE_OPACITY = 0.12;

const STARFIELD_VERTEX = /* glsl */ `
attribute float size;
attribute vec3 color;
varying vec3 vColor;
uniform float uTime;

void main() {
  vColor = color;
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  float twinkle = sin(uTime * 2.0 + position.x * 97.0) * 0.3 + 0.7;
  gl_PointSize = size * twinkle * (320.0 / -mvPosition.z);
  gl_Position = projectionMatrix * mvPosition;
}
`;

const STARFIELD_FRAGMENT = /* glsl */ `
varying vec3 vColor;

void main() {
  vec2 center = gl_PointCoord - 0.5;
  float dist = length(center);
  if (dist > 0.5) {
    discard;
  }

  float alpha = 1.0 - smoothstep(0.0, 0.5, dist);
  gl_FragColor = vec4(vColor, alpha * 0.8);
}
`;

const NODE_VERTEX = /* glsl */ `
attribute float nodeSize;
attribute vec3 nodeColor;
attribute float nodeOpacity;
attribute float nodeHighlight;
attribute float distanceFromRoot;
attribute float driftSeed;

uniform float uTime;

varying vec3 vColor;
varying float vOpacity;
varying float vHighlight;
varying float vCameraDistance;

void main() {
  vColor = nodeColor;
  vOpacity = nodeOpacity;
  vHighlight = nodeHighlight;

  vec3 displaced = position;
  float breathe = 0.88 + 0.16 * sin(uTime * 0.75 + distanceFromRoot * 0.18 + driftSeed * 8.0);
  displaced.x += cos(uTime * 0.21 + driftSeed * 11.0) * 0.14 * vOpacity;
  displaced.y += sin(uTime * 0.27 + driftSeed * 7.0) * 0.14 * vOpacity;
  displaced.z += sin(uTime * 0.18 + driftSeed * 13.0) * 0.1 * vOpacity;

  vec4 mvPosition = modelViewMatrix * vec4(displaced, 1.0);
  vCameraDistance = -mvPosition.z;
  float highlightScale = 1.0 + nodeHighlight * 0.38;
  gl_PointSize = nodeSize * breathe * highlightScale * (980.0 / -mvPosition.z);
  gl_Position = projectionMatrix * mvPosition;
}
`;

const NODE_FRAGMENT = /* glsl */ `
uniform float uTime;

varying vec3 vColor;
varying float vOpacity;
varying float vHighlight;
varying float vCameraDistance;

void main() {
  vec2 center = 2.0 * gl_PointCoord - 1.0;
  float dist = length(center);
  if (dist > 1.0) {
    discard;
  }

  float innerCore = 1.0 - smoothstep(0.0, 0.12, dist);
  float hotCore = 1.0 - smoothstep(0.0, 0.32, dist);
  float midGlow = 1.0 - smoothstep(0.0, 0.58, dist);
  float outerHalo = 1.0 - smoothstep(0.0, 1.0, dist);

  vec3 baseColor = vColor * (0.92 + 0.08 * sin(uTime * 0.55 + vCameraDistance * 0.03));
  vec3 coreColor = mix(baseColor, vec3(1.0), 0.68 + vHighlight * 0.16);
  vec3 finalColor = mix(baseColor, coreColor, pow(hotCore, 1.9));
  finalColor += vec3(1.0) * innerCore * (0.42 + vHighlight * 0.18);

  float ring = smoothstep(0.28, 0.32, dist) * smoothstep(0.42, 0.38, dist);
  finalColor += baseColor * ring * 0.34;

  float glowStrength = pow(hotCore, 1.45) * 0.82 + midGlow * 0.38 + outerHalo * 0.18;
  glowStrength *= 1.0 + vHighlight * 0.28;

  float distanceFade = smoothstep(170.0, 20.0, vCameraDistance);
  float alpha = glowStrength * (0.97 - 0.24 * dist) * vOpacity * distanceFade;

  gl_FragColor = vec4(finalColor, alpha);
}
`;

const CONNECTION_VERTEX = /* glsl */ `
attribute vec3 startPoint;
attribute vec3 endPoint;
attribute float connectionOpacity;
attribute float connectionHighlight;
attribute float pathIndex;

uniform float uTime;

varying float vConnectionOpacity;
varying float vConnectionHighlight;
varying float vPathPosition;
varying float vCameraDistance;

void main() {
  float t = position.x;
  vPathPosition = t;
  vConnectionOpacity = connectionOpacity;
  vConnectionHighlight = connectionHighlight;

  vec3 chord = endPoint - startPoint;
  float chordLength = max(length(chord), 0.001);
  vec3 up = abs(dot(normalize(chord), vec3(0.0, 1.0, 0.0))) > 0.96
    ? vec3(1.0, 0.0, 0.0)
    : vec3(0.0, 1.0, 0.0);
  vec3 bendAxis = normalize(cross(normalize(chord), up));
  vec3 controlPoint = mix(startPoint, endPoint, 0.5);
  controlPoint.y += clamp(chordLength * 0.18, 0.75, 7.0);
  controlPoint += bendAxis * sin(pathIndex * 12.9898) * 0.9;

  vec3 p0 = mix(startPoint, controlPoint, t);
  vec3 p1 = mix(controlPoint, endPoint, t);
  vec3 finalPos = mix(p0, p1, t);
  finalPos += bendAxis * sin(uTime * 0.35 + pathIndex * 0.85 + t * 8.0) * 0.08;

  vec4 mvPosition = modelViewMatrix * vec4(finalPos, 1.0);
  vCameraDistance = -mvPosition.z;
  gl_Position = projectionMatrix * mvPosition;
}
`;

const CONNECTION_FRAGMENT = /* glsl */ `
uniform float uTime;

varying float vConnectionOpacity;
varying float vConnectionHighlight;
varying float vPathPosition;
varying float vCameraDistance;

void main() {
  float dashPattern = fract(vPathPosition * 18.0);
  if (dashPattern < 0.34) {
    discard;
  }

  float dashGlow = smoothstep(0.34, 0.52, dashPattern) * smoothstep(1.0, 0.82, dashPattern);
  float flow = sin(vPathPosition * 28.0 - uTime * 1.4) * 0.5 + 0.5;
  vec3 baseColor = mix(vec3(0.56, 0.6, 0.68), vec3(0.94, 0.96, 1.0), 0.28 + vConnectionHighlight * 0.46);
  float distanceFade = smoothstep(170.0, 20.0, vCameraDistance);
  float alpha = (0.06 + dashGlow * 0.12 + flow * 0.05 + vConnectionHighlight * 0.18) * vConnectionOpacity * distanceFade;

  gl_FragColor = vec4(baseColor, alpha);
}
`;

function hashValue(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0) / 4294967295;
}

function createStarfield(scene: THREE.Scene): THREE.Points {
  const positions: number[] = [];
  const colors: number[] = [];
  const sizes: number[] = [];

  for (let index = 0; index < STARFIELD_COUNT; index += 1) {
    const radius = THREE.MathUtils.randFloat(54, 165);
    const phi = Math.acos(THREE.MathUtils.randFloatSpread(2));
    const theta = THREE.MathUtils.randFloat(0, Math.PI * 2);
    positions.push(
      radius * Math.sin(phi) * Math.cos(theta),
      radius * Math.sin(phi) * Math.sin(theta),
      radius * Math.cos(phi),
    );

    const tint = Math.random();
    if (tint < 0.72) {
      colors.push(1, 1, 1);
    } else if (tint < 0.88) {
      colors.push(0.72, 0.82, 1);
    } else {
      colors.push(1, 0.92, 0.84);
    }

    sizes.push(THREE.MathUtils.randFloat(0.08, 0.28));
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));

  const material = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 } },
    vertexShader: STARFIELD_VERTEX,
    fragmentShader: STARFIELD_FRAGMENT,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  const field = new THREE.Points(geometry, material);
  scene.add(field);
  return field;
}

function disposeStarfield(field: THREE.Points | null, scene: THREE.Scene | null) {
  if (!field || !scene) {
    return;
  }

  scene.remove(field);
  field.geometry.dispose();
  (field.material as THREE.ShaderMaterial).dispose();
}

function disposeGraph(graph: GraphVisualState | null, scene: THREE.Scene | null) {
  if (!graph || !scene) {
    return;
  }

  scene.remove(graph.nodeMesh);
  graph.nodeGeometry.dispose();
  graph.nodeMaterial.dispose();

  if (graph.connectionMesh && graph.connectionGeometry && graph.connectionMaterial) {
    scene.remove(graph.connectionMesh);
    graph.connectionGeometry.dispose();
    graph.connectionMaterial.dispose();
  }
}

function configureViewMode(camera: THREE.PerspectiveCamera, controls: OrbitControls, flattenTo2d: boolean) {
  if (flattenTo2d) {
    camera.position.set(0, 0, 72);
    controls.enableRotate = false;
    controls.enablePan = true;
    controls.autoRotate = false;
    controls.minDistance = 18;
    controls.maxDistance = 150;
  } else {
    camera.position.set(0, 12, 55);
    controls.enableRotate = true;
    controls.enablePan = false;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.18;
    controls.minDistance = 12;
    controls.maxDistance = 140;
  }

  controls.target.set(0, 0, 0);
  controls.update();
}

function buildNodeSize(node: MapNode): number {
  const importance = Math.max(0, Math.min(1, node.metrics.importance));
  const centrality = Math.max(0, Math.min(1, node.metrics.centrality));
  const pinnedBonus = node.pinned ? 0.5 : 0;
  return Math.max(1.05, Math.min(3.2, 1 + importance * 1.2 + centrality * 0.65 + pinnedBonus));
}

function buildDisplayPosition(node: MapNode, flattenTo2d: boolean): THREE.Vector3 {
  return new THREE.Vector3(
    node.position.x * POSITION_SCALE,
    node.position.y * POSITION_SCALE,
    flattenTo2d ? 0 : node.position.z * POSITION_SCALE,
  );
}

function buildColor(hex: string): THREE.Color {
  return new THREE.Color(hex);
}

function syncGraphStyles(
  graph: GraphVisualState | null,
  activeNodeId: string | null,
  compareNodeIds: string[],
  visibleNodeIds: string[],
) {
  if (!graph) {
    return;
  }

  const visibleSet = new Set(visibleNodeIds);
  const compareSet = new Set(compareNodeIds);
  const relatedToActive = new Set<string>();

  if (activeNodeId) {
    graph.edgeRecords.forEach(({ edge }) => {
      if (edge.sourceId === activeNodeId) {
        relatedToActive.add(edge.targetId);
      }
      if (edge.targetId === activeNodeId) {
        relatedToActive.add(edge.sourceId);
      }
    });
  }

  const nodeColorAttr = graph.nodeGeometry.getAttribute('nodeColor') as THREE.BufferAttribute;
  const nodeOpacityAttr = graph.nodeGeometry.getAttribute('nodeOpacity') as THREE.BufferAttribute;
  const nodeHighlightAttr = graph.nodeGeometry.getAttribute('nodeHighlight') as THREE.BufferAttribute;

  graph.nodeRecords.forEach((record) => {
    const visible = visibleSet.has(record.node.id);
    const active = record.node.id === activeNodeId;
    const compared = compareSet.has(record.node.id);
    const connected = relatedToActive.has(record.node.id);

    const color = record.baseColor.clone();
    if (!visible) {
      color.multiplyScalar(0.18);
    } else if (active) {
      color.lerp(new THREE.Color('#ffffff'), 0.32);
    } else if (compared) {
      color.lerp(new THREE.Color('#f8d66d'), 0.24);
    } else if (connected) {
      color.lerp(new THREE.Color('#dbeafe'), 0.18);
    }

    const opacity = visible ? 0.96 : HIDDEN_NODE_OPACITY;
    const highlight = active ? 1 : compared ? 0.56 : connected ? 0.34 : record.node.pinned ? 0.24 : 0;

    nodeColorAttr.setXYZ(record.index, color.r, color.g, color.b);
    nodeOpacityAttr.setX(record.index, opacity);
    nodeHighlightAttr.setX(record.index, highlight);
  });

  nodeColorAttr.needsUpdate = true;
  nodeOpacityAttr.needsUpdate = true;
  nodeHighlightAttr.needsUpdate = true;

  if (!graph.connectionGeometry) {
    return;
  }

  const opacityAttr = graph.connectionGeometry.getAttribute('connectionOpacity') as THREE.BufferAttribute;
  const highlightAttr = graph.connectionGeometry.getAttribute('connectionHighlight') as THREE.BufferAttribute;

  graph.edgeRecords.forEach((record) => {
    const sourceId = graph.nodeRecords[record.sourceIndex]?.node.id;
    const targetId = graph.nodeRecords[record.targetIndex]?.node.id;
    const visible = visibleSet.has(sourceId) && visibleSet.has(targetId);
    const active = Boolean(activeNodeId) && (sourceId === activeNodeId || targetId === activeNodeId);
    const compared = compareSet.has(sourceId) || compareSet.has(targetId);
    const opacity = visible ? (active ? 0.95 : compared ? 0.52 : Math.max(0.2, record.edge.confidence * 0.42)) : 0.05;
    const highlight = active ? 1 : compared ? 0.46 : 0;

    for (let segment = 0; segment < record.segmentCount; segment += 1) {
      const attributeIndex = record.segmentOffset + segment;
      opacityAttr.setX(attributeIndex, opacity);
      highlightAttr.setX(attributeIndex, highlight);
    }
  });

  opacityAttr.needsUpdate = true;
  highlightAttr.needsUpdate = true;
}

function pickNodeId(
  clientX: number,
  clientY: number,
  camera: THREE.PerspectiveCamera,
  canvas: HTMLCanvasElement,
  graph: GraphVisualState | null,
  visibleNodeIds: Set<string>,
): string | null {
  if (!graph) {
    return null;
  }

  const rect = canvas.getBoundingClientRect();
  const pointerX = ((clientX - rect.left) / rect.width) * 2 - 1;
  const pointerY = -((clientY - rect.top) / rect.height) * 2 + 1;

  let bestDistance = 1.5;
  let bestNodeId: string | null = null;

  graph.nodeRecords.forEach((record) => {
    if (!visibleNodeIds.has(record.node.id)) {
      return;
    }

    const projected = record.displayPosition.clone().project(camera);
    const dx = projected.x - pointerX;
    const dy = projected.y - pointerY;
    const screenDistance = Math.sqrt(dx * dx + dy * dy);

    if (screenDistance < bestDistance) {
      bestDistance = screenDistance;
      bestNodeId = record.node.id;
    }
  });

  return bestDistance < 0.07 ? bestNodeId : null;
}

export function FalakMapScene({
  nodes,
  edges,
  categories,
  activeNodeId,
  compareNodeIds,
  visibleNodeIds,
  flattenTo2d,
  onSelectNodeId,
}: FalakMapSceneProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const graphRef = useRef<GraphVisualState | null>(null);
  const starfieldRef = useRef<THREE.Points | null>(null);
  const clockRef = useRef(new THREE.Clock());
  const frameRef = useRef(0);
  const onSelectNodeIdRef = useRef(onSelectNodeId);
  const activeNodeIdRef = useRef(activeNodeId);
  const compareNodeIdsRef = useRef(compareNodeIds);
  const visibleNodeIdsRef = useRef(new Set(visibleNodeIds));
  const flattenTo2dRef = useRef(flattenTo2d);

  useEffect(() => {
    onSelectNodeIdRef.current = onSelectNodeId;
  }, [onSelectNodeId]);

  useEffect(() => {
    activeNodeIdRef.current = activeNodeId;
  }, [activeNodeId]);

  useEffect(() => {
    compareNodeIdsRef.current = compareNodeIds;
  }, [compareNodeIds]);

  useEffect(() => {
    visibleNodeIdsRef.current = new Set(visibleNodeIds);
  }, [visibleNodeIds]);

  useEffect(() => {
    flattenTo2dRef.current = flattenTo2d;
  }, [flattenTo2d]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) {
      return;
    }

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x05070b, 0.0011);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 1000);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });
    renderer.setClearColor(0x05070b);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    mount.innerHTML = '';
    mount.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.rotateSpeed = 0.6;
    controlsRef.current = controls;

    configureViewMode(camera, controls, flattenTo2dRef.current);

    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    const bloomPass = new UnrealBloomPass(new THREE.Vector2(mount.clientWidth, mount.clientHeight), 1.85, 0.55, 0.78);
    composer.addPass(bloomPass);
    composer.addPass(new OutputPass());

    starfieldRef.current = createStarfield(scene);

    const resize = () => {
      const width = mount.clientWidth;
      const height = Math.max(360, mount.clientHeight);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
      composer.setSize(width, height);
      bloomPass.resolution.set(width, height);
    };

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(mount);
    resize();

    const handlePointerMove = (event: PointerEvent) => {
      const hoveredNodeId = pickNodeId(
        event.clientX,
        event.clientY,
        camera,
        renderer.domElement,
        graphRef.current,
        visibleNodeIdsRef.current,
      );

      renderer.domElement.style.cursor = hoveredNodeId ? 'pointer' : flattenTo2dRef.current ? 'grab' : 'crosshair';
    };

    const handleClick = (event: MouseEvent) => {
      const nodeId = pickNodeId(
        event.clientX,
        event.clientY,
        camera,
        renderer.domElement,
        graphRef.current,
        visibleNodeIdsRef.current,
      );

      if (nodeId) {
        onSelectNodeIdRef.current(nodeId);
      }
    };

    renderer.domElement.addEventListener('pointermove', handlePointerMove);
    renderer.domElement.addEventListener('click', handleClick);

    const animate = () => {
      frameRef.current = window.requestAnimationFrame(animate);
      const time = clockRef.current.getElapsedTime();

      if (starfieldRef.current) {
        starfieldRef.current.rotation.y += flattenTo2dRef.current ? 0.00005 : 0.00018;
        (starfieldRef.current.material as THREE.ShaderMaterial).uniforms.uTime.value = time;
      }

      if (graphRef.current) {
        graphRef.current.nodeMaterial.uniforms.uTime.value = time;
        if (graphRef.current.connectionMaterial) {
          graphRef.current.connectionMaterial.uniforms.uTime.value = time;
        }
      }

      controls.update();
      composer.render();
    };

    clockRef.current.start();
    animate();

    return () => {
      window.cancelAnimationFrame(frameRef.current);
      resizeObserver.disconnect();
      renderer.domElement.removeEventListener('pointermove', handlePointerMove);
      renderer.domElement.removeEventListener('click', handleClick);
      disposeGraph(graphRef.current, scene);
      graphRef.current = null;
      disposeStarfield(starfieldRef.current, scene);
      starfieldRef.current = null;
      composer.dispose();
      renderer.dispose();
      controls.dispose();
      mount.innerHTML = '';
    };
  }, []);

  useEffect(() => {
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!camera || !controls) {
      return;
    }

    configureViewMode(camera, controls, flattenTo2d);
  }, [flattenTo2d]);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) {
      return;
    }

    disposeGraph(graphRef.current, scene);

    const categoryMap = new Map(categories.map((category) => [category.key, category]));
    const degreeMap = new Map<string, number>();
    edges.forEach((edge) => {
      degreeMap.set(edge.sourceId, (degreeMap.get(edge.sourceId) ?? 0) + 1);
      degreeMap.set(edge.targetId, (degreeMap.get(edge.targetId) ?? 0) + 1);
    });

    const nodeIdToIndex = new Map<string, number>();
    const nodeRecords: VisualNode[] = nodes.map((node, index) => {
      nodeIdToIndex.set(node.id, index);
      const category = categoryMap.get(node.categoryKey ?? '');
      const color = buildColor(categoryColor(categories, category?.key ?? node.categoryKey));
      const degree = degreeMap.get(node.id) ?? 0;
      return {
        node,
        index,
        baseColor: color,
        basePosition: buildDisplayPosition(node, false),
        displayPosition: buildDisplayPosition(node, flattenTo2d),
        size: buildNodeSize(node),
        driftSeed: hashValue(node.id + node.label),
        degree,
      };
    });

    const nodePositions = nodeRecords.flatMap((record) => [
      record.displayPosition.x,
      record.displayPosition.y,
      record.displayPosition.z,
    ]);
    const nodeSizes = nodeRecords.map((record) => record.size);
    const nodeColors = nodeRecords.flatMap((record) => [record.baseColor.r, record.baseColor.g, record.baseColor.b]);
    const nodeOpacities = nodeRecords.map(() => 1);
    const nodeHighlights = nodeRecords.map(() => 0);
    const distanceFromRoot = nodeRecords.map((record) => record.degree + record.node.metrics.centrality * 10);
    const driftSeeds = nodeRecords.map((record) => record.driftSeed);

    const nodeGeometry = new THREE.BufferGeometry();
    nodeGeometry.setAttribute('position', new THREE.Float32BufferAttribute(nodePositions, 3));
    nodeGeometry.setAttribute('nodeSize', new THREE.Float32BufferAttribute(nodeSizes, 1));
    nodeGeometry.setAttribute('nodeColor', new THREE.Float32BufferAttribute(nodeColors, 3));
    nodeGeometry.setAttribute('nodeOpacity', new THREE.Float32BufferAttribute(nodeOpacities, 1));
    nodeGeometry.setAttribute('nodeHighlight', new THREE.Float32BufferAttribute(nodeHighlights, 1));
    nodeGeometry.setAttribute('distanceFromRoot', new THREE.Float32BufferAttribute(distanceFromRoot, 1));
    nodeGeometry.setAttribute('driftSeed', new THREE.Float32BufferAttribute(driftSeeds, 1));

    const nodeMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
      },
      vertexShader: NODE_VERTEX,
      fragmentShader: NODE_FRAGMENT,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    const nodeMesh = new THREE.Points(nodeGeometry, nodeMaterial);
    scene.add(nodeMesh);

    const edgeRecords: VisualEdge[] = [];
    const connectionPositions: number[] = [];
    const startPoints: number[] = [];
    const endPoints: number[] = [];
    const connectionOpacities: number[] = [];
    const connectionHighlights: number[] = [];
    const pathIndices: number[] = [];

    edges.forEach((edge, edgeIndex) => {
      const sourceIndex = nodeIdToIndex.get(edge.sourceId);
      const targetIndex = nodeIdToIndex.get(edge.targetId);
      if (sourceIndex === undefined || targetIndex === undefined) {
        return;
      }

      const segmentOffset = connectionPositions.length / 3;
      for (let segment = 0; segment < CONNECTION_SEGMENTS; segment += 1) {
        const t = segment / (CONNECTION_SEGMENTS - 1);
        const source = nodeRecords[sourceIndex]!.displayPosition;
        const target = nodeRecords[targetIndex]!.displayPosition;
        connectionPositions.push(t, 0, 0);
        startPoints.push(source.x, source.y, source.z);
        endPoints.push(target.x, target.y, target.z);
        connectionOpacities.push(Math.max(0.2, edge.confidence * 0.42));
        connectionHighlights.push(0);
        pathIndices.push(edgeIndex);
      }

      edgeRecords.push({
        edge,
        sourceIndex,
        targetIndex,
        segmentOffset,
        segmentCount: CONNECTION_SEGMENTS,
      });
    });

    let connectionGeometry: THREE.BufferGeometry | null = null;
    let connectionMaterial: THREE.ShaderMaterial | null = null;
    let connectionMesh: THREE.LineSegments | null = null;

    if (connectionPositions.length > 0) {
      connectionGeometry = new THREE.BufferGeometry();
      connectionGeometry.setAttribute('position', new THREE.Float32BufferAttribute(connectionPositions, 3));
      connectionGeometry.setAttribute('startPoint', new THREE.Float32BufferAttribute(startPoints, 3));
      connectionGeometry.setAttribute('endPoint', new THREE.Float32BufferAttribute(endPoints, 3));
      connectionGeometry.setAttribute('connectionOpacity', new THREE.Float32BufferAttribute(connectionOpacities, 1));
      connectionGeometry.setAttribute('connectionHighlight', new THREE.Float32BufferAttribute(connectionHighlights, 1));
      connectionGeometry.setAttribute('pathIndex', new THREE.Float32BufferAttribute(pathIndices, 1));

      connectionMaterial = new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
        },
        vertexShader: CONNECTION_VERTEX,
        fragmentShader: CONNECTION_FRAGMENT,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });

      connectionMesh = new THREE.LineSegments(connectionGeometry, connectionMaterial);
      scene.add(connectionMesh);
    }

    const graph: GraphVisualState = {
      nodeRecords,
      edgeRecords,
      nodeIdToIndex,
      nodeGeometry,
      nodeMaterial,
      nodeMesh,
      connectionGeometry,
      connectionMaterial,
      connectionMesh,
    };

    graphRef.current = graph;
    syncGraphStyles(
      graph,
      activeNodeIdRef.current,
      compareNodeIdsRef.current,
      Array.from(visibleNodeIdsRef.current),
    );

    return () => {
      if (graphRef.current === graph) {
        disposeGraph(graph, scene);
        graphRef.current = null;
      }
    };
  }, [nodes, edges, categories, flattenTo2d]);

  useEffect(() => {
    syncGraphStyles(graphRef.current, activeNodeId, compareNodeIds, visibleNodeIds);
  }, [activeNodeId, compareNodeIds, visibleNodeIds]);

  return (
    <div className="h-[28rem] w-full overflow-hidden rounded-[1.5rem] border border-slate-800 bg-[#05070b] md:h-[36rem]">
      <div ref={mountRef} className="h-full w-full" />
    </div>
  );
}
