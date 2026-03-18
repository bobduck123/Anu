'use client';

import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
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

type EdgeVisual = {
  sourceId: string;
  targetId: string;
  line: THREE.Line;
  material: THREE.LineBasicMaterial;
  geometry: THREE.BufferGeometry;
  confidence: number;
};

type NodeVisual = {
  node: MapNode;
  radius: number;
  mesh: THREE.Mesh;
  material: THREE.MeshStandardMaterial;
  ring: THREE.Mesh;
  ringMaterial: THREE.MeshBasicMaterial;
};

type GraphVisualState = {
  group: THREE.Group;
  nodes: Map<string, NodeVisual>;
  edges: EdgeVisual[];
};

function buildPosition(node: MapNode, flattenTo2d: boolean): THREE.Vector3 {
  return new THREE.Vector3(
    node.position.x,
    node.position.y,
    flattenTo2d ? 0 : node.position.z,
  );
}

function configureViewMode(
  camera: THREE.PerspectiveCamera,
  controls: OrbitControls,
  grid: THREE.GridHelper,
  flattenTo2d: boolean,
) {
  if (flattenTo2d) {
    camera.position.set(0, 0, 30);
    controls.enableRotate = false;
    controls.enablePan = true;
    controls.maxPolarAngle = Math.PI;
    grid.rotation.set(0, 0, 0);
    grid.position.set(0, 0, 0);
  } else {
    camera.position.set(12, 10, 22);
    controls.enableRotate = true;
    controls.enablePan = true;
    controls.maxPolarAngle = Math.PI * 0.48;
    grid.rotation.set(Math.PI / 2, 0, 0);
    grid.position.set(0, -10, 0);
  }

  controls.target.set(0, 0, 0);
  controls.update();
}

function disposeGraph(graph: GraphVisualState | null) {
  if (!graph) {
    return;
  }

  graph.group.parent?.remove(graph.group);
  graph.edges.forEach((edge) => {
    edge.geometry.dispose();
    edge.material.dispose();
  });
  graph.nodes.forEach(({ material, ringMaterial }) => {
    material.dispose();
    ringMaterial.dispose();
  });
}

function applyGraphStyles(
  graph: GraphVisualState | null,
  categories: MapCategory[],
  activeNodeId: string | null,
  compareNodeIds: string[],
  visibleNodeIds: string[],
  flattenTo2d: boolean,
) {
  if (!graph) {
    return;
  }

  const compareNodeIdSet = new Set(compareNodeIds);
  const visibleNodeIdSet = new Set(visibleNodeIds);

  graph.edges.forEach(({ sourceId, targetId, material, confidence }) => {
    const visible = visibleNodeIdSet.has(sourceId) && visibleNodeIdSet.has(targetId);
    material.color.set(visible ? '#38bdf8' : '#334155');
    material.opacity = visible ? Math.max(0.28, confidence) : 0.12;
  });

  graph.nodes.forEach(({ node, mesh, material, ring, ringMaterial, radius }) => {
    const visible = visibleNodeIdSet.has(node.id);
    const compared = compareNodeIdSet.has(node.id);
    const active = node.id === activeNodeId;

    material.color.set(categoryColor(categories, node.categoryKey));
    material.opacity = visible ? 0.94 : 0.18;
    material.emissive.set(active ? '#f8fafc' : compared ? '#f59e0b' : '#0f172a');
    material.emissiveIntensity = active ? 0.45 : compared ? 0.28 : 0.08;
    mesh.position.copy(buildPosition(node, flattenTo2d));

    ring.visible = node.pinned || active || compared;
    ring.position.copy(mesh.position);
    ring.scale.setScalar(radius * 0.9);
    ringMaterial.color.set(node.pinned ? '#f8fafc' : compared ? '#f59e0b' : '#a5f3fc');
    ringMaterial.opacity = visible ? 0.78 : 0.16;

    if (flattenTo2d) {
      ring.rotation.set(Math.PI / 2, 0, 0);
    }
  });
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
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const gridRef = useRef<THREE.GridHelper | null>(null);
  const nodeGeometryRef = useRef<THREE.SphereGeometry | null>(null);
  const ringGeometryRef = useRef<THREE.TorusGeometry | null>(null);
  const graphRef = useRef<GraphVisualState | null>(null);
  const frameRef = useRef(0);
  const onSelectNodeIdRef = useRef(onSelectNodeId);
  const flattenTo2dRef = useRef(flattenTo2d);

  const compareKey = useMemo(() => compareNodeIds.join('|'), [compareNodeIds]);
  const visibleKey = useMemo(() => visibleNodeIds.join('|'), [visibleNodeIds]);

  onSelectNodeIdRef.current = onSelectNodeId;
  flattenTo2dRef.current = flattenTo2d;

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) {
      return;
    }

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#07111f');
    scene.fog = new THREE.Fog('#07111f', 20, 120);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 300);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    rendererRef.current = renderer;

    mount.innerHTML = '';
    mount.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 8;
    controls.maxDistance = 120;
    controls.target.set(0, 0, 0);
    controlsRef.current = controls;

    scene.add(new THREE.AmbientLight('#b7dcff', 0.74));

    const keyLight = new THREE.DirectionalLight('#f8fafc', 1.05);
    keyLight.position.set(18, 20, 12);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight('#38bdf8', 0.28);
    fillLight.position.set(-14, -10, 8);
    scene.add(fillLight);

    const grid = new THREE.GridHelper(80, 16, '#1e3a8a', '#0f172a');
    gridRef.current = grid;
    scene.add(grid);

    nodeGeometryRef.current = new THREE.SphereGeometry(1, 18, 18);
    ringGeometryRef.current = new THREE.TorusGeometry(1.26, 0.1, 10, 24);
    configureViewMode(camera, controls, grid, flattenTo2dRef.current);

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();

    const pickNodeId = (clientX: number, clientY: number) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const objects = Array.from(graphRef.current?.nodes.values() ?? []).map(({ mesh }) => mesh);
      const hits = raycaster.intersectObjects(objects, false);
      return hits[0]?.object.userData?.nodeId;
    };

    const handlePointerMove = (event: PointerEvent) => {
      const nodeId = pickNodeId(event.clientX, event.clientY);
      renderer.domElement.style.cursor = typeof nodeId === 'string' ? 'pointer' : 'grab';
    };

    const handleClick = (event: MouseEvent) => {
      const nodeId = pickNodeId(event.clientX, event.clientY);
      if (typeof nodeId === 'string') {
        onSelectNodeIdRef.current(nodeId);
      }
    };

    const resize = () => {
      const width = mount.clientWidth;
      const height = Math.max(360, mount.clientHeight);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    };

    resize();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(mount);

    renderer.domElement.addEventListener('pointermove', handlePointerMove);
    renderer.domElement.addEventListener('click', handleClick);

    const animate = () => {
      frameRef.current = window.requestAnimationFrame(animate);

      if (graphRef.current) {
        graphRef.current.group.rotation.y = flattenTo2dRef.current
          ? 0
          : graphRef.current.group.rotation.y + 0.0007;

        if (!flattenTo2dRef.current) {
          graphRef.current.nodes.forEach(({ ring }) => {
            if (ring.visible) {
              ring.lookAt(camera.position);
            }
          });
        }
      }

      controls.update();
      renderer.render(scene, camera);
    };

    animate();

    return () => {
      window.cancelAnimationFrame(frameRef.current);
      resizeObserver.disconnect();
      renderer.domElement.removeEventListener('pointermove', handlePointerMove);
      renderer.domElement.removeEventListener('click', handleClick);
      disposeGraph(graphRef.current);
      graphRef.current = null;
      controls.dispose();
      nodeGeometryRef.current?.dispose();
      ringGeometryRef.current?.dispose();
      renderer.dispose();
      mount.innerHTML = '';
    };
  }, []);

  useEffect(() => {
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    const grid = gridRef.current;
    if (!camera || !controls || !grid) {
      return;
    }

    configureViewMode(camera, controls, grid, flattenTo2d);
    applyGraphStyles(graphRef.current, categories, activeNodeId, compareNodeIds, visibleNodeIds, flattenTo2d);
  }, [activeNodeId, categories, compareKey, flattenTo2d, visibleKey, visibleNodeIds, compareNodeIds]);

  useEffect(() => {
    const scene = sceneRef.current;
    const nodeGeometry = nodeGeometryRef.current;
    const ringGeometry = ringGeometryRef.current;
    if (!scene || !nodeGeometry || !ringGeometry) {
      return;
    }

    disposeGraph(graphRef.current);

    const group = new THREE.Group();
    const graph: GraphVisualState = {
      group,
      nodes: new Map(),
      edges: [],
    };

    const nodeIndex = new Map(nodes.map((node) => [node.id, node]));
    const visibleNodeIdSet = new Set(visibleNodeIds);

    edges.forEach((edge) => {
      const source = nodeIndex.get(edge.sourceId);
      const target = nodeIndex.get(edge.targetId);
      if (!source || !target) {
        return;
      }

      const geometry = new THREE.BufferGeometry().setFromPoints([
        buildPosition(source, flattenTo2d),
        buildPosition(target, flattenTo2d),
      ]);
      const material = new THREE.LineBasicMaterial({
        color: visibleNodeIdSet.has(source.id) && visibleNodeIdSet.has(target.id) ? '#38bdf8' : '#334155',
        transparent: true,
        opacity: visibleNodeIdSet.has(source.id) && visibleNodeIdSet.has(target.id)
          ? Math.max(0.28, edge.confidence)
          : 0.12,
      });
      const line = new THREE.Line(geometry, material);
      group.add(line);
      graph.edges.push({
        sourceId: source.id,
        targetId: target.id,
        line,
        material,
        geometry,
        confidence: edge.confidence,
      });
    });

    nodes.forEach((node) => {
      const radius = Math.max(0.36, Math.min(1.8, node.metrics.renderRadius || node.metrics.sizeScore || 0.84));
      const material = new THREE.MeshStandardMaterial({
        color: new THREE.Color(categoryColor(categories, node.categoryKey)),
        transparent: true,
        opacity: visibleNodeIdSet.has(node.id) ? 0.94 : 0.18,
        emissive: new THREE.Color('#0f172a'),
        emissiveIntensity: 0.08,
        metalness: 0.14,
        roughness: 0.32,
      });
      const mesh = new THREE.Mesh(nodeGeometry, material);
      mesh.scale.setScalar(radius);
      mesh.position.copy(buildPosition(node, flattenTo2d));
      mesh.userData = { nodeId: node.id };
      group.add(mesh);

      const ringMaterial = new THREE.MeshBasicMaterial({
        color: '#a5f3fc',
        transparent: true,
        opacity: visibleNodeIdSet.has(node.id) ? 0.78 : 0.16,
      });
      const ring = new THREE.Mesh(ringGeometry, ringMaterial);
      ring.visible = false;
      ring.scale.setScalar(radius * 0.9);
      ring.position.copy(mesh.position);
      if (flattenTo2d) {
        ring.rotation.set(Math.PI / 2, 0, 0);
      }
      group.add(ring);

      graph.nodes.set(node.id, {
        node,
        radius,
        mesh,
        material,
        ring,
        ringMaterial,
      });
    });

    scene.add(group);
    graphRef.current = graph;
    applyGraphStyles(graph, categories, activeNodeId, compareNodeIds, visibleNodeIds, flattenTo2d);

    return () => {
      disposeGraph(graph);
      if (graphRef.current === graph) {
        graphRef.current = null;
      }
    };
  }, [nodes, edges, categories, flattenTo2d]);

  return (
    <div className="h-[28rem] w-full overflow-hidden rounded-[1.5rem] border border-slate-800 bg-slate-950 md:h-[36rem]">
      <div ref={mountRef} className="h-full w-full" />
    </div>
  );
}
