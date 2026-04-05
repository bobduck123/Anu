'use client';

import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

type SceneNode = {
  id: string;
  label?: string;
  entity_name?: string;
  x?: number;
  y?: number;
  z?: number;
};

interface WorldExplorerProps {
  sceneGraph: Record<string, unknown>;
  onSelectNode?: (node: SceneNode) => void;
}

const NODE_GEOMETRY = new THREE.SphereGeometry(0.35, 20, 20);

function parseNodes(sceneGraph: Record<string, unknown>): SceneNode[] {
  const maybeNodes = Array.isArray(sceneGraph?.nodes) ? (sceneGraph.nodes as SceneNode[]) : [];
  if (maybeNodes.length > 0) return maybeNodes;
  return [
    { id: 'seed-1', label: 'Community Garden', entity_name: 'Sydney Community Garden', x: -1.5, y: 0.4, z: 0.8 },
    { id: 'seed-2', label: 'Pantry Hub', entity_name: 'Pantry Hub A', x: 1.2, y: 0.3, z: -0.6 },
    { id: 'seed-3', label: 'Civic Commons', entity_name: 'Food Co-op', x: 0.2, y: 0.2, z: 1.5 },
  ];
}

export function WorldExplorer({ sceneGraph, onSelectNode }: WorldExplorerProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const nodes = useMemo(() => parseNodes(sceneGraph), [sceneGraph]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const width = mount.clientWidth;
    const height = Math.max(360, mount.clientHeight);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#1e0227');
    scene.fog = new THREE.Fog('#1e0227', 6, 28);

    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 100);
    camera.position.set(0, 4.2, 7.5);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(width, height);
    mount.innerHTML = '';
    mount.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.target.set(0, 0.5, 0);
    controls.minDistance = 2.5;
    controls.maxDistance = 24;
    controls.maxPolarAngle = Math.PI * 0.49;

    scene.add(new THREE.AmbientLight('#f6d4cb', 0.65));
    const directional = new THREE.DirectionalLight('#f6d4cb', 1.1);
    directional.position.set(5, 12, 6);
    scene.add(directional);

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(24, 24, 24, 24),
      new THREE.MeshStandardMaterial({
        color: '#1e0227',
        wireframe: true,
        transparent: true,
        opacity: 0.3,
      }),
    );
    ground.rotation.x = -Math.PI / 2;
    scene.add(ground);

    const interactiveNodes: Array<{ node: SceneNode; mesh: THREE.Mesh }> = [];
    nodes.forEach((node, index) => {
      const material = new THREE.MeshStandardMaterial({
        color: new THREE.Color().setHSL((index * 0.12) % 1, 0.7, 0.56),
        metalness: 0.08,
        roughness: 0.35,
      });
      const mesh = new THREE.Mesh(NODE_GEOMETRY, material);
      mesh.position.set(
        typeof node.x === 'number' ? node.x : (index - 1) * 1.4,
        typeof node.y === 'number' ? node.y : 0.35 + (index % 2) * 0.25,
        typeof node.z === 'number' ? node.z : (index % 3) * 0.8 - 0.8,
      );
      mesh.userData = { node };
      scene.add(mesh);
      interactiveNodes.push({ node, mesh });
    });

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const onClick = (event: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const intersections = raycaster.intersectObjects(
        interactiveNodes.map((entry) => entry.mesh),
        false,
      );
      if (intersections.length < 1) return;
      const hit = intersections[0].object.userData?.node as SceneNode | undefined;
      if (hit && onSelectNode) onSelectNode(hit);
    };
    renderer.domElement.addEventListener('click', onClick);

    const onResize = () => {
      if (!mountRef.current) return;
      const w = mountRef.current.clientWidth;
      const h = Math.max(360, mountRef.current.clientHeight);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    let frame = 0;
    const animate = () => {
      frame = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', onResize);
      renderer.domElement.removeEventListener('click', onClick);
      controls.dispose();
      renderer.dispose();
      mount.innerHTML = '';
    };
  }, [nodes, onSelectNode]);

  return <div ref={mountRef} className="h-[420px] w-full rounded-xl border border-[var(--color-border)] overflow-hidden" />;
}
