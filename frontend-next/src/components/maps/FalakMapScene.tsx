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

function buildPosition(node: MapNode, flattenTo2d: boolean): THREE.Vector3 {
  return new THREE.Vector3(
    node.position.x,
    node.position.y,
    flattenTo2d ? 0 : node.position.z,
  );
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
  const visibleNodeIdSet = useMemo(() => new Set(visibleNodeIds), [visibleNodeIds]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) {
      return;
    }

    const nodeGeometry = new THREE.SphereGeometry(1, 18, 18);
    const ringGeometry = new THREE.TorusGeometry(1.26, 0.1, 10, 24);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#07111f');
    scene.fog = new THREE.Fog('#07111f', 20, 120);

    const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 300);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(window.devicePixelRatio);
    mount.innerHTML = '';
    mount.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 8;
    controls.maxDistance = 120;
    controls.target.set(0, 0, 0);

    if (flattenTo2d) {
      camera.position.set(0, 0, 30);
      controls.enableRotate = false;
      controls.enablePan = true;
    } else {
      camera.position.set(12, 10, 22);
      controls.enableRotate = true;
      controls.enablePan = true;
      controls.maxPolarAngle = Math.PI * 0.48;
    }

    scene.add(new THREE.AmbientLight('#b7dcff', 0.74));

    const keyLight = new THREE.DirectionalLight('#f8fafc', 1.05);
    keyLight.position.set(18, 20, 12);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight('#38bdf8', 0.28);
    fillLight.position.set(-14, -10, 8);
    scene.add(fillLight);

    const grid = new THREE.GridHelper(80, 16, '#1e3a8a', '#0f172a');
    if (!flattenTo2d) {
      grid.rotation.x = Math.PI / 2;
      grid.position.y = -10;
    }
    scene.add(grid);

    const nodeIndex = new Map(nodes.map((node) => [node.id, node]));
    const meshes = new Map<string, THREE.Mesh>();
    const disposableMaterials: THREE.Material[] = [];
    const disposableGeometries: THREE.BufferGeometry[] = [];

    edges.forEach((edge) => {
      const source = nodeIndex.get(edge.sourceId);
      const target = nodeIndex.get(edge.targetId);
      if (!source || !target) {
        return;
      }

      const sourceVisible = visibleNodeIdSet.has(source.id);
      const targetVisible = visibleNodeIdSet.has(target.id);
      const geometry = new THREE.BufferGeometry().setFromPoints([
        buildPosition(source, flattenTo2d),
        buildPosition(target, flattenTo2d),
      ]);
      const material = new THREE.LineBasicMaterial({
        color: sourceVisible && targetVisible ? '#38bdf8' : '#334155',
        transparent: true,
        opacity: sourceVisible && targetVisible ? Math.max(0.28, edge.confidence) : 0.12,
      });
      const line = new THREE.Line(geometry, material);
      scene.add(line);
      disposableMaterials.push(material);
      disposableGeometries.push(geometry);
    });

    nodes.forEach((node) => {
      const visible = visibleNodeIdSet.has(node.id);
      const radius = Math.max(0.36, Math.min(1.8, node.metrics.renderRadius || node.metrics.sizeScore || 0.84));
      const material = new THREE.MeshStandardMaterial({
        color: new THREE.Color(categoryColor(categories, node.categoryKey)),
        transparent: true,
        opacity: visible ? 0.94 : 0.18,
        emissive: new THREE.Color(
          node.id === activeNodeId ? '#f8fafc' : compareNodeIds.includes(node.id) ? '#f59e0b' : '#0f172a',
        ),
        emissiveIntensity: node.id === activeNodeId ? 0.45 : compareNodeIds.includes(node.id) ? 0.28 : 0.08,
        metalness: 0.14,
        roughness: 0.32,
      });
      const mesh = new THREE.Mesh(nodeGeometry, material);
      mesh.scale.setScalar(radius);
      mesh.position.copy(buildPosition(node, flattenTo2d));
      mesh.userData = { nodeId: node.id };
      scene.add(mesh);
      meshes.set(node.id, mesh);
      disposableMaterials.push(material);

      if (node.pinned || node.id === activeNodeId || compareNodeIds.includes(node.id)) {
        const ringMaterial = new THREE.MeshBasicMaterial({
          color: node.pinned ? '#f8fafc' : compareNodeIds.includes(node.id) ? '#f59e0b' : '#a5f3fc',
          transparent: true,
          opacity: visible ? 0.78 : 0.16,
        });
        const ring = new THREE.Mesh(ringGeometry, ringMaterial);
        ring.scale.setScalar(radius * 0.9);
        ring.position.copy(mesh.position);
        if (flattenTo2d) {
          ring.rotation.x = Math.PI / 2;
        } else {
          ring.lookAt(camera.position);
        }
        scene.add(ring);
        disposableMaterials.push(ringMaterial);
      }
    });

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();

    const handlePointerMove = (event: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(Array.from(meshes.values()), false);
      renderer.domElement.style.cursor = hits.length > 0 ? 'pointer' : 'grab';
    };

    const handleClick = (event: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(Array.from(meshes.values()), false);
      const nodeId = hits[0]?.object.userData?.nodeId;
      if (typeof nodeId === 'string') {
        onSelectNodeId(nodeId);
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

    let frame = 0;
    const animate = () => {
      frame = window.requestAnimationFrame(animate);
      if (!flattenTo2d) {
        scene.rotation.y += 0.0007;
      }
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      window.cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      renderer.domElement.removeEventListener('pointermove', handlePointerMove);
      renderer.domElement.removeEventListener('click', handleClick);
      controls.dispose();
      disposableMaterials.forEach((material) => material.dispose());
      disposableGeometries.forEach((geometry) => geometry.dispose());
      nodeGeometry.dispose();
      ringGeometry.dispose();
      renderer.dispose();
      mount.innerHTML = '';
    };
  }, [activeNodeId, categories, compareNodeIds, edges, flattenTo2d, nodes, onSelectNodeId, visibleNodeIdSet]);

  return (
    <div className="h-[28rem] w-full overflow-hidden rounded-[1.5rem] border border-slate-800 bg-slate-950 md:h-[36rem]">
      <div ref={mountRef} className="h-full w-full" />
    </div>
  );
}
