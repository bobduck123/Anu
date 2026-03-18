/**
 * QuantumEngine — 3D Quantum Neural Network visualization using Three.js.
 *
 * Renders Flora Fauna entities (Stars/Constellations) as a 3D neural network
 * with custom GLSL shaders, UnrealBloom post-processing, energy pulse
 * interactions, 3 color palettes, and live N-body gravitational simulation.
 *
 * Each node's mass is derived from its metadata.impact score (0-100).
 * Positions and velocities are deterministically seeded from entity data.
 * Nodes move under mutual gravitational attraction every frame using
 * Velocity Verlet integration with Plummer softening.
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

import type { Star, Constellation } from '@/data/adapters/starfieldAdapter';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface InternalNode {
  star: Star;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  acceleration: THREE.Vector3;
  mass: number;
  size: number;
  type: number;       // 0 = core, 1 = leaf
  level: number;      // palette color index
  distanceFromRoot: number;
  connections: { nodeIndex: number; strength: number }[];
}

// ---------------------------------------------------------------------------
// Gravity simulation constants
// ---------------------------------------------------------------------------

const G = 0.8;                // Gravitational constant (tuned for visual scale)
const SOFTENING = 2.0;        // Plummer softening length
const V_BASE = 0.5;           // Base orbital speed
const R_MIN = 8;              // Minimum spawn radius
const R_MAX = 30;             // Maximum spawn radius
const R_BOUNDARY = 45;        // Soft boundary radius
const K_BOUNDARY = 0.02;      // Boundary spring constant
const MASS_MIN = 0.5;         // Mass for impact=0
const MASS_MAX = 5.0;         // Mass for impact=100

// ---------------------------------------------------------------------------
// Color palettes
// ---------------------------------------------------------------------------

const COLOR_PALETTES: THREE.Color[][] = [
  // Purple Nebula
  [new THREE.Color(0x667eea), new THREE.Color(0x764ba2), new THREE.Color(0xf093fb), new THREE.Color(0x9d50bb), new THREE.Color(0x6e48aa)],
  // Sunset Fire
  [new THREE.Color(0xf857a6), new THREE.Color(0xff5858), new THREE.Color(0xfeca57), new THREE.Color(0xff6348), new THREE.Color(0xff9068)],
  // Ocean Aurora
  [new THREE.Color(0x4facfe), new THREE.Color(0x00f2fe), new THREE.Color(0x43e97b), new THREE.Color(0x38f9d7), new THREE.Color(0x4484ce)],
];

// ---------------------------------------------------------------------------
// GLSL noise functions (simplex 3D)
// ---------------------------------------------------------------------------

const NOISE_GLSL = /* glsl */ `
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) {
  const vec2 C = vec2(1.0/6.0, 1.0/3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod289(i);
  vec4 p = permute(permute(permute(
      i.z + vec4(0.0, i1.z, i2.z, 1.0))
      + i.y + vec4(0.0, i1.y, i2.y, 1.0))
      + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m * m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}`;

// ---------------------------------------------------------------------------
// Shaders
// ---------------------------------------------------------------------------

const NODE_VERTEX = /* glsl */ `${NOISE_GLSL}
attribute float nodeSize;
attribute float nodeType;
attribute vec3 nodeColor;
attribute float distanceFromRoot;

uniform float uTime;
uniform vec3 uPulsePositions[3];
uniform float uPulseTimes[3];
uniform float uPulseSpeed;
uniform float uBaseNodeSize;

varying vec3 vColor;
varying float vNodeType;
varying vec3 vPosition;
varying float vPulseIntensity;
varying float vDistanceFromRoot;
varying float vGlow;

float getPulseIntensity(vec3 worldPos, vec3 pulsePos, float pulseTime) {
  if (pulseTime < 0.0) return 0.0;
  float timeSinceClick = uTime - pulseTime;
  if (timeSinceClick < 0.0 || timeSinceClick > 4.0) return 0.0;
  float pulseRadius = timeSinceClick * uPulseSpeed;
  float distToClick = distance(worldPos, pulsePos);
  float pulseThickness = 3.0;
  float waveProximity = abs(distToClick - pulseRadius);
  return smoothstep(pulseThickness, 0.0, waveProximity) * smoothstep(4.0, 0.0, timeSinceClick);
}

void main() {
  vNodeType = nodeType;
  vColor = nodeColor;
  vDistanceFromRoot = distanceFromRoot;
  vec3 worldPos = (modelMatrix * vec4(position, 1.0)).xyz;
  vPosition = worldPos;
  float totalPulse = 0.0;
  for (int i = 0; i < 3; i++) {
    totalPulse += getPulseIntensity(worldPos, uPulsePositions[i], uPulseTimes[i]);
  }
  vPulseIntensity = min(totalPulse, 1.0);
  float breathe = sin(uTime * 0.7 + distanceFromRoot * 0.15) * 0.15 + 0.85;
  float baseSize = nodeSize * breathe;
  float pulseSize = baseSize * (1.0 + vPulseIntensity * 2.5);
  vGlow = 0.5 + 0.5 * sin(uTime * 0.5 + distanceFromRoot * 0.2);
  vec3 modifiedPosition = position;
  if (nodeType > 0.5) {
    float noise = snoise(position * 0.08 + uTime * 0.08);
    modifiedPosition += normal * noise * 0.15;
  }
  vec4 mvPosition = modelViewMatrix * vec4(modifiedPosition, 1.0);
  gl_PointSize = pulseSize * uBaseNodeSize * (1000.0 / -mvPosition.z);
  gl_Position = projectionMatrix * mvPosition;
}`;

const NODE_FRAGMENT = /* glsl */ `
uniform float uTime;
uniform vec3 uPulseColors[3];

varying vec3 vColor;
varying float vNodeType;
varying vec3 vPosition;
varying float vPulseIntensity;
varying float vDistanceFromRoot;
varying float vGlow;

void main() {
  vec2 center = 2.0 * gl_PointCoord - 1.0;
  float dist = length(center);
  if (dist > 1.0) discard;

  // Multi-layer glow for depth
  float innerCore = 1.0 - smoothstep(0.0, 0.15, dist);
  float hotCore   = 1.0 - smoothstep(0.0, 0.35, dist);
  float midGlow   = 1.0 - smoothstep(0.0, 0.6, dist);
  float outerHalo = 1.0 - smoothstep(0.0, 1.0, dist);
  float glowStrength = pow(hotCore, 1.5) * 0.8 + midGlow * 0.4 + outerHalo * 0.2;

  float breatheColor = 0.9 + 0.1 * sin(uTime * 0.6 + vDistanceFromRoot * 0.25);
  vec3 baseColor = vColor * breatheColor;

  // Color shift toward white in the core for a realistic star look
  vec3 coreColor = mix(baseColor, vec3(1.0), 0.7);
  vec3 finalColor = mix(baseColor, coreColor, pow(hotCore, 2.0));

  if (vPulseIntensity > 0.0) {
    vec3 pulseColor = mix(vec3(1.0), uPulseColors[0], 0.4);
    finalColor = mix(finalColor, pulseColor, vPulseIntensity * 0.8);
    finalColor *= (1.0 + vPulseIntensity * 1.2);
    glowStrength *= (1.0 + vPulseIntensity);
  }

  // Bright inner core point
  finalColor += vec3(1.0) * innerCore * 0.5;
  // Subtle chromatic ring at mid-radius
  float ring = smoothstep(0.28, 0.32, dist) * smoothstep(0.42, 0.38, dist);
  finalColor += baseColor * ring * 0.4;

  float alpha = glowStrength * (0.97 - 0.25 * dist);
  float camDistance = length(vPosition - cameraPosition);
  float distanceFade = smoothstep(160.0, 20.0, camDistance);

  if (vNodeType > 0.5) {
    finalColor *= 1.15;
    alpha *= 0.85;
  }
  finalColor *= (1.0 + vGlow * 0.12);
  gl_FragColor = vec4(finalColor, alpha * distanceFade);
}`;

const CONNECTION_VERTEX = /* glsl */ `${NOISE_GLSL}
attribute vec3 startPoint;
attribute vec3 endPoint;
attribute float connectionStrength;
attribute float pathIndex;
attribute vec3 connectionColor;

uniform float uTime;
uniform vec3 uPulsePositions[3];
uniform float uPulseTimes[3];
uniform float uPulseSpeed;

varying vec3 vColor;
varying float vConnectionStrength;
varying float vPulseIntensity;
varying float vPathPosition;
varying float vDistanceFromCamera;

float getPulseIntensity(vec3 worldPos, vec3 pulsePos, float pulseTime) {
  if (pulseTime < 0.0) return 0.0;
  float timeSinceClick = uTime - pulseTime;
  if (timeSinceClick < 0.0 || timeSinceClick > 4.0) return 0.0;
  float pulseRadius = timeSinceClick * uPulseSpeed;
  float distToClick = distance(worldPos, pulsePos);
  float pulseThickness = 3.0;
  float waveProximity = abs(distToClick - pulseRadius);
  return smoothstep(pulseThickness, 0.0, waveProximity) * smoothstep(4.0, 0.0, timeSinceClick);
}

void main() {
  float t = position.x;
  vPathPosition = t;
  vec3 midPoint = mix(startPoint, endPoint, 0.5);
  float pathOffset = sin(t * 3.14159) * 0.15;
  vec3 perpendicular = normalize(cross(normalize(endPoint - startPoint), vec3(0.0, 1.0, 0.0)));
  if (length(perpendicular) < 0.1) perpendicular = vec3(1.0, 0.0, 0.0);
  midPoint += perpendicular * pathOffset;
  vec3 p0 = mix(startPoint, midPoint, t);
  vec3 p1 = mix(midPoint, endPoint, t);
  vec3 finalPos = mix(p0, p1, t);
  float noiseTime = uTime * 0.15;
  float noise = snoise(vec3(pathIndex * 0.08, t * 0.6, noiseTime));
  finalPos += perpendicular * noise * 0.12;
  vec3 worldPos = (modelMatrix * vec4(finalPos, 1.0)).xyz;
  float totalPulse = 0.0;
  for (int i = 0; i < 3; i++) {
    totalPulse += getPulseIntensity(worldPos, uPulsePositions[i], uPulseTimes[i]);
  }
  vPulseIntensity = min(totalPulse, 1.0);
  vColor = connectionColor;
  vConnectionStrength = connectionStrength;
  vDistanceFromCamera = length(worldPos - cameraPosition);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(finalPos, 1.0);
}`;

const CONNECTION_FRAGMENT = /* glsl */ `
uniform float uTime;
uniform vec3 uPulseColors[3];

varying vec3 vColor;
varying float vConnectionStrength;
varying float vPulseIntensity;
varying float vPathPosition;
varying float vDistanceFromCamera;

void main() {
  float flowPattern1 = sin(vPathPosition * 25.0 - uTime * 4.0) * 0.5 + 0.5;
  float flowPattern2 = sin(vPathPosition * 15.0 - uTime * 2.5 + 1.57) * 0.5 + 0.5;
  float combinedFlow = (flowPattern1 + flowPattern2 * 0.5) / 1.5;
  vec3 baseColor = vColor * (0.8 + 0.2 * sin(uTime * 0.6 + vPathPosition * 12.0));
  float flowIntensity = 0.4 * combinedFlow * vConnectionStrength;
  vec3 finalColor = baseColor;
  if (vPulseIntensity > 0.0) {
    vec3 pulseColor = mix(vec3(1.0), uPulseColors[0], 0.3);
    finalColor = mix(baseColor, pulseColor * 1.2, vPulseIntensity * 0.7);
    flowIntensity += vPulseIntensity * 0.8;
  }
  finalColor *= (0.7 + flowIntensity + vConnectionStrength * 0.5);
  float baseAlpha = 0.7 * vConnectionStrength;
  float flowAlpha = combinedFlow * 0.3;
  float alpha = baseAlpha + flowAlpha;
  alpha = mix(alpha, min(1.0, alpha * 2.5), vPulseIntensity);
  float distanceFade = smoothstep(160.0, 20.0, vDistanceFromCamera);
  gl_FragColor = vec4(finalColor, alpha * distanceFade);
}`;

const STARFIELD_VERTEX = /* glsl */ `
attribute float size;
attribute vec3 color;
varying vec3 vColor;
uniform float uTime;
void main() {
  vColor = color;
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  float twinkle = sin(uTime * 2.0 + position.x * 100.0) * 0.3 + 0.7;
  gl_PointSize = size * twinkle * (300.0 / -mvPosition.z);
  gl_Position = projectionMatrix * mvPosition;
}`;

const STARFIELD_FRAGMENT = /* glsl */ `
varying vec3 vColor;
void main() {
  vec2 center = gl_PointCoord - 0.5;
  float dist = length(center);
  if (dist > 0.5) discard;
  float alpha = 1.0 - smoothstep(0.0, 0.5, dist);
  gl_FragColor = vec4(vColor, alpha * 0.8);
}`;

// ---------------------------------------------------------------------------
// Shared pulse uniforms factory
// ---------------------------------------------------------------------------

function createPulseUniforms() {
  return {
    uTime: { value: 0.0 },
    uPulsePositions: { value: [
      new THREE.Vector3(1e3, 1e3, 1e3),
      new THREE.Vector3(1e3, 1e3, 1e3),
      new THREE.Vector3(1e3, 1e3, 1e3),
    ] },
    uPulseTimes: { value: [-1e3, -1e3, -1e3] },
    uPulseColors: { value: [
      new THREE.Color(1, 1, 1),
      new THREE.Color(1, 1, 1),
      new THREE.Color(1, 1, 1),
    ] },
    uPulseSpeed: { value: 18.0 },
    uBaseNodeSize: { value: 1.2 },
  };
}

// ---------------------------------------------------------------------------
// Star-type -> level mapping (7 types -> 0-6)
// ---------------------------------------------------------------------------

const TYPE_TO_LEVEL: Record<string, number> = {
  event: 0,
  action: 1,
  community: 2,
  donor: 3,
  relief: 4,
  education: 5,
  marketplace: 6,
};

// ---------------------------------------------------------------------------
// Deterministic hash (djb2)
// ---------------------------------------------------------------------------

function djb2(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) | 0; // force 32-bit int
  }
  return hash >>> 0; // unsigned
}

/** Fractional part of a product — maps integer hash to [0,1) */
function fract(x: number): number {
  const v = x - Math.floor(x);
  return v < 0 ? v + 1 : v;
}

// ---------------------------------------------------------------------------
// Engine
// ---------------------------------------------------------------------------

export class QuantumEngine {
  // Public callbacks
  onStarClick: ((star: Star) => void) | null = null;

  // Three.js core
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private composer: EffectComposer;
  private bloomPass: UnrealBloomPass;
  private controls: OrbitControls;
  private clock = new THREE.Clock();
  private canvas: HTMLCanvasElement;

  // Meshes
  private starField: THREE.Points | null = null;
  private nodesMesh: THREE.Points | null = null;
  private connectionsMesh: THREE.LineSegments | null = null;

  // Data
  private nodes: InternalNode[] = [];
  private stars: Star[] = [];
  private constellations: Constellation[] = [];

  // State
  private paletteIndex = 0;
  private paused = false;
  private animFrameId = 0;
  private densityFactor = 1.0;
  private starfieldCount: number;

  // Interaction helpers
  private raycaster = new THREE.Raycaster();
  private pointer = new THREE.Vector2();

  // Bound handlers (for removal)
  private handleClick: (e: MouseEvent) => void;
  private handleTouch: (e: TouchEvent) => void;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.starfieldCount = Math.min(
      6000,
      (window.devicePixelRatio || 1) > 1.5 ? 4500 : 6000,
    );

    // Scene
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x000000, 0.0008);

    // Camera
    this.camera = new THREE.PerspectiveCamera(60, canvas.clientWidth / canvas.clientHeight, 0.1, 1000);
    this.camera.position.set(0, 12, 55);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    this.renderer.setClearColor(0x000000);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    // Controls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.rotateSpeed = 0.6;
    this.controls.minDistance = 8;
    this.controls.maxDistance = 140;
    this.controls.autoRotate = true;
    this.controls.autoRotateSpeed = 0.2;
    this.controls.enablePan = false;

    // Composer + bloom
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(canvas.clientWidth, canvas.clientHeight),
      2.2, 0.5, 0.8,
    );
    this.composer.addPass(this.bloomPass);
    this.composer.addPass(new OutputPass());

    // Background starfield
    this.createStarfield();

    // Click handler
    this.handleClick = (e: MouseEvent) => {
      this.trySelectStar(e.clientX, e.clientY);
    };
    this.handleTouch = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        this.trySelectStar(e.touches[0].clientX, e.touches[0].clientY);
      }
    };
    canvas.addEventListener('click', this.handleClick);
    canvas.addEventListener('touchstart', this.handleTouch, { passive: true });
  }

  // -----------------------------------------------------------------------
  // Public API
  // -----------------------------------------------------------------------

  loadStars(stars: Star[], constellations: Constellation[]): void {
    this.stars = stars;
    this.constellations = constellations;
    this.buildNodes();
    this.seedPositions();
    this.seedVelocities();
    this.computeAccelerations();
    this.buildVisualization();
  }

  setTheme(paletteIndex: number): void {
    this.paletteIndex = Math.max(0, Math.min(2, paletteIndex));
    this.updateColors();
  }

  setDensity(factor: number): void {
    const nextDensity = Math.max(0.3, Math.min(1.0, factor));
    if (Math.abs(nextDensity - this.densityFactor) < 0.01) {
      return;
    }
    this.densityFactor = nextDensity;
    this.buildVisualization();
  }

  scatter(): void {
    // Re-seed velocities with slight randomization for visual variety
    for (const node of this.nodes) {
      const hash = djb2(node.star.label + node.star.id + String(Date.now()));
      const speed = V_BASE * (0.6 + 0.8 * fract(hash * 0.00003717));

      // Tangential velocity
      const up = new THREE.Vector3(0, 1, 0);
      const tangent = new THREE.Vector3().crossVectors(node.position, up).normalize();
      if (tangent.lengthSq() < 0.01) {
        tangent.crossVectors(node.position, new THREE.Vector3(1, 0, 0)).normalize();
      }

      const radialBias = (fract(hash * 0.00002137) - 0.5) * 0.5;
      const radialDir = node.position.clone().normalize();

      node.velocity.copy(tangent).multiplyScalar(speed);
      node.velocity.addScaledVector(radialDir, speed * radialBias);
    }
    this.computeAccelerations();
    this.controls.autoRotate = false;
    setTimeout(() => { this.controls.autoRotate = true; }, 2500);
  }

  togglePause(): boolean {
    this.paused = !this.paused;
    this.controls.autoRotate = !this.paused;
    return this.paused;
  }

  resetCamera(): void {
    this.controls.reset();
    this.controls.autoRotate = false;
    setTimeout(() => { this.controls.autoRotate = true; }, 2000);
  }

  start(): void {
    this.clock.start();
    this.animate();
  }

  stop(): void {
    cancelAnimationFrame(this.animFrameId);
    this.canvas.removeEventListener('click', this.handleClick);
    this.canvas.removeEventListener('touchstart', this.handleTouch);
    this.disposeNetwork();
    if (this.starField) {
      this.starField.geometry.dispose();
      (this.starField.material as THREE.ShaderMaterial).dispose();
    }
    this.composer.dispose();
    this.renderer.dispose();
    this.controls.dispose();
  }

  resize(): void {
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    if (w === 0 || h === 0) return;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
    this.composer.setSize(w, h);
    this.bloomPass.resolution.set(w, h);
  }

  getNodeCount(): number {
    return this.nodes.length;
  }

  // -----------------------------------------------------------------------
  // Background starfield
  // -----------------------------------------------------------------------

  private createStarfield(): void {
    const count = this.starfieldCount;
    const positions: number[] = [];
    const colors: number[] = [];
    const sizes: number[] = [];

    for (let i = 0; i < count; i++) {
      const r = THREE.MathUtils.randFloat(50, 150);
      const phi = Math.acos(THREE.MathUtils.randFloatSpread(2));
      const theta = THREE.MathUtils.randFloat(0, Math.PI * 2);
      positions.push(
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.sin(phi) * Math.sin(theta),
        r * Math.cos(phi),
      );
      const c = Math.random();
      if (c < 0.7) colors.push(1, 1, 1);
      else if (c < 0.85) colors.push(0.7, 0.8, 1);
      else colors.push(1, 0.9, 0.8);
      sizes.push(THREE.MathUtils.randFloat(0.1, 0.3));
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geo.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));

    const mat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 } },
      vertexShader: STARFIELD_VERTEX,
      fragmentShader: STARFIELD_FRAGMENT,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.starField = new THREE.Points(geo, mat);
    this.scene.add(this.starField);
  }

  // -----------------------------------------------------------------------
  // Star -> Node mapping
  // -----------------------------------------------------------------------

  private buildNodes(): void {
    const constellationStarIds = new Set<string>();
    for (const c of this.constellations) {
      for (const id of c.starIds) constellationStarIds.add(id);
    }

    const starIndex = new Map<string, number>();
    this.nodes = this.stars.map((star, idx) => {
      starIndex.set(star.id, idx);
      const impact = Number(star.metadata.impact) || 0;
      const isCore = constellationStarIds.has(star.id);
      return {
        star,
        position: new THREE.Vector3(),
        velocity: new THREE.Vector3(),
        acceleration: new THREE.Vector3(),
        mass: MASS_MIN + (impact / 100) * (MASS_MAX - MASS_MIN),
        size: 0.8 + ((star.size - 0.3) / 2.5) * 1.4,
        type: isCore ? 0 : 1,
        level: TYPE_TO_LEVEL[star.type] ?? 0,
        distanceFromRoot: 0,
        connections: [],
      };
    });

    // Build connections from star.connections
    for (let i = 0; i < this.stars.length; i++) {
      const star = this.stars[i];
      for (const targetId of star.connections) {
        const targetIdx = starIndex.get(targetId);
        if (targetIdx !== undefined && !this.nodes[i].connections.some(c => c.nodeIndex === targetIdx)) {
          const strength = 0.6; // will be updated after positions are seeded
          this.nodes[i].connections.push({ nodeIndex: targetIdx, strength });
          this.nodes[targetIdx].connections.push({ nodeIndex: i, strength });
        }
      }
    }

    // Add constellation proximity connections (3 nearest neighbors per star in each constellation)
    for (const c of this.constellations) {
      const memberIndices = c.starIds.map(id => starIndex.get(id)).filter((v): v is number => v !== undefined);
      for (const idx of memberIndices) {
        const node = this.nodes[idx];
        const sorted = memberIndices
          .filter(j => j !== idx)
          .sort(() => 0.5 - Math.random()) // random since positions aren't set yet
          .slice(0, 3);
        for (const j of sorted) {
          if (!node.connections.some(c => c.nodeIndex === j)) {
            node.connections.push({ nodeIndex: j, strength: 0.5 });
            this.nodes[j].connections.push({ nodeIndex: idx, strength: 0.5 });
          }
        }
      }
    }
  }

  // -----------------------------------------------------------------------
  // Deterministic position seeding
  // -----------------------------------------------------------------------

  private seedPositions(): void {
    for (const node of this.nodes) {
      const hashBase = djb2(node.star.label);
      const typeIndex = TYPE_TO_LEVEL[node.star.type] ?? 0;
      const typeAngle = (typeIndex / 7) * Math.PI * 2;

      // Date bias: older entities closer to center, newer further out
      const created = node.star.metadata.created;
      let dateBias = 0.5;
      if (typeof created === 'string') {
        const d = new Date(created);
        const dayOfYear = Math.floor((d.getTime() - new Date(d.getFullYear(), 0, 0).getTime()) / 86400000);
        dateBias = dayOfYear / 365;
      }

      // Spherical coordinates with data-driven offsets
      const phi = Math.acos(1 - 2 * fract(hashBase * 0.00003717));     // uniform on sphere
      const theta = typeAngle + fract(hashBase * 0.00008513) * (Math.PI * 2 / 7);
      const r = R_MIN + (R_MAX - R_MIN) * (0.3 * dateBias + 0.7 * fract(hashBase * 0.00001631));

      node.position.set(
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.sin(phi) * Math.sin(theta),
        r * Math.cos(phi),
      );
      node.distanceFromRoot = node.position.length();
    }

    // Update connection strengths based on actual distances
    for (const node of this.nodes) {
      for (const conn of node.connections) {
        const dist = node.position.distanceTo(this.nodes[conn.nodeIndex].position);
        conn.strength = Math.max(0.3, 1.0 - dist / 20);
      }
    }
  }

  // -----------------------------------------------------------------------
  // Deterministic velocity seeding
  // -----------------------------------------------------------------------

  private seedVelocities(): void {
    const up = new THREE.Vector3(0, 1, 0);
    const right = new THREE.Vector3(1, 0, 0);

    for (const node of this.nodes) {
      const hashVel = djb2(node.star.label + node.star.id);
      const participants = Number(node.star.metadata.participants) || 0;

      // Tangential velocity (perpendicular to radial vector)
      const speed = V_BASE * (0.4 + 0.6 * participants / 100);
      const tangent = new THREE.Vector3().crossVectors(node.position, up).normalize();
      if (tangent.lengthSq() < 0.01) {
        tangent.crossVectors(node.position, right).normalize();
      }

      // Slight radial component from hash for ellipticity
      const radialBias = (fract(hashVel * 0.00002137) - 0.5) * 0.3;
      const radialDir = node.position.clone().normalize();

      node.velocity.copy(tangent).multiplyScalar(speed);
      node.velocity.addScaledVector(radialDir, speed * radialBias);

      // Connection-based velocity nudge toward connected neighbors' centroid
      if (node.connections.length > 0) {
        const centroid = new THREE.Vector3();
        for (const conn of node.connections) {
          centroid.add(this.nodes[conn.nodeIndex].position);
        }
        centroid.divideScalar(node.connections.length);
        const bondPull = centroid.sub(node.position).normalize().multiplyScalar(V_BASE * 0.15);
        node.velocity.add(bondPull);
      }
    }
  }

  // -----------------------------------------------------------------------
  // Gravity: O(N^2) direct summation with Plummer softening
  // -----------------------------------------------------------------------

  private computeAccelerations(): void {
    const n = this.nodes.length;
    const softSq = SOFTENING * SOFTENING;

    // Zero all accelerations
    for (let i = 0; i < n; i++) {
      this.nodes[i].acceleration.set(0, 0, 0);
    }

    // Pairwise gravitational force
    const rij = new THREE.Vector3();
    for (let i = 0; i < n; i++) {
      const ni = this.nodes[i];
      for (let j = i + 1; j < n; j++) {
        const nj = this.nodes[j];
        rij.subVectors(nj.position, ni.position);
        const distSq = rij.lengthSq();
        const denom = Math.pow(distSq + softSq, 1.5);
        const fMag = G / denom;

        // a_i += G * m_j * rij / (|rij|^2 + eps^2)^(3/2)
        ni.acceleration.addScaledVector(rij, fMag * nj.mass);
        // a_j -= G * m_i * rij / (|rij|^2 + eps^2)^(3/2)
        nj.acceleration.addScaledVector(rij, -fMag * ni.mass);
      }
    }

    // Boundary damping
    for (let i = 0; i < n; i++) {
      const node = this.nodes[i];
      const dist = node.position.length();
      if (dist > R_BOUNDARY) {
        const overshoot = dist - R_BOUNDARY;
        const dir = node.position.clone().normalize();
        // Soft spring pushback
        node.acceleration.addScaledVector(dir, -K_BOUNDARY * overshoot);
        // Reduce outward radial velocity
        const vRadial = node.velocity.dot(dir);
        if (vRadial > 0) {
          node.velocity.addScaledVector(dir, -0.5 * vRadial);
        }
      }
    }
  }

  // -----------------------------------------------------------------------
  // Velocity Verlet integration (symplectic, energy-conserving)
  // -----------------------------------------------------------------------

  private integrateVerlet(dt: number): void {
    const n = this.nodes.length;
    if (n === 0) return;

    // Step 1: Half-kick velocity
    for (let i = 0; i < n; i++) {
      const node = this.nodes[i];
      node.velocity.addScaledVector(node.acceleration, dt * 0.5);
    }

    // Step 2: Full-drift position
    for (let i = 0; i < n; i++) {
      const node = this.nodes[i];
      node.position.addScaledVector(node.velocity, dt);
    }

    // Step 3: Compute new accelerations at new positions
    this.computeAccelerations();

    // Step 4: Half-kick velocity again
    for (let i = 0; i < n; i++) {
      const node = this.nodes[i];
      node.velocity.addScaledVector(node.acceleration, dt * 0.5);
      node.distanceFromRoot = node.position.length();
    }
  }

  // -----------------------------------------------------------------------
  // Push updated positions to GPU buffers
  // -----------------------------------------------------------------------

  private updatePositionBuffers(): void {
    if (!this.nodesMesh) return;

    // Update node positions
    const posAttr = this.nodesMesh.geometry.attributes.position as THREE.BufferAttribute;
    const distAttr = this.nodesMesh.geometry.attributes.distanceFromRoot as THREE.BufferAttribute;
    for (let i = 0; i < this.nodes.length && i < posAttr.count; i++) {
      const node = this.nodes[i];
      posAttr.setXYZ(i, node.position.x, node.position.y, node.position.z);
      distAttr.setX(i, node.distanceFromRoot);
    }
    posAttr.needsUpdate = true;
    distAttr.needsUpdate = true;

    // Update connection start/end points
    if (!this.connectionsMesh) return;
    const startAttr = this.connectionsMesh.geometry.attributes.startPoint as THREE.BufferAttribute;
    const endAttr = this.connectionsMesh.geometry.attributes.endPoint as THREE.BufferAttribute;
    if (!startAttr || !endAttr) return;

    const NUM_SEGMENTS = 28;
    const processed = new Set<string>();
    let segIdx = 0;

    // Re-walk connections in same order as buildVisualization
    const visibleSet = this.getVisibleNodes();
    const visibleNodeToIndex = new Map<InternalNode, number>();
    visibleSet.forEach((n, i) => visibleNodeToIndex.set(n, i));

    for (const node of visibleSet) {
      for (const conn of node.connections) {
        const target = this.nodes[conn.nodeIndex];
        if (!visibleNodeToIndex.has(target)) continue;
        const ni = visibleNodeToIndex.get(node)!;
        const ti = visibleNodeToIndex.get(target)!;
        const key = `${Math.min(ni, ti)}-${Math.max(ni, ti)}`;
        if (processed.has(key)) continue;
        processed.add(key);

        for (let s = 0; s < NUM_SEGMENTS; s++) {
          if (segIdx < startAttr.count) {
            startAttr.setXYZ(segIdx, node.position.x, node.position.y, node.position.z);
            endAttr.setXYZ(segIdx, target.position.x, target.position.y, target.position.z);
          }
          segIdx++;
        }
      }
    }

    startAttr.needsUpdate = true;
    endAttr.needsUpdate = true;
  }

  /** Get the current visible node list (respects density filter). */
  private getVisibleNodes(): InternalNode[] {
    if (this.densityFactor >= 1.0) return this.nodes;
    const targetCount = Math.ceil(this.nodes.length * this.densityFactor);
    const scored = this.nodes.map((n, i) => ({
      node: n,
      index: i,
      score: n.connections.length * (1 / (n.distanceFromRoot + 1)),
    }));
    scored.sort((a, b) => b.score - a.score);
    const keepSet = new Set(scored.slice(0, targetCount).map(s => s.index));
    return this.nodes.filter((_, i) => keepSet.has(i));
  }

  // -----------------------------------------------------------------------
  // Build visualization geometry
  // -----------------------------------------------------------------------

  private buildVisualization(): void {
    this.disposeNetwork();

    if (this.nodes.length === 0) return;

    const visibleNodes = this.getVisibleNodes();
    const visibleSet = new Set(visibleNodes);
    const palette = COLOR_PALETTES[this.paletteIndex];

    // --- Nodes geometry ---
    const nodePositions: number[] = [];
    const nodeTypes: number[] = [];
    const nodeSizes: number[] = [];
    const nodeColors: number[] = [];
    const distancesFromRoot: number[] = [];

    for (const node of visibleNodes) {
      nodePositions.push(node.position.x, node.position.y, node.position.z);
      nodeTypes.push(node.type);
      nodeSizes.push(node.size);
      distancesFromRoot.push(node.distanceFromRoot);

      const colorIndex = node.level % palette.length;
      const baseColor = palette[colorIndex].clone();
      baseColor.offsetHSL(
        THREE.MathUtils.randFloatSpread(0.03),
        THREE.MathUtils.randFloatSpread(0.08),
        THREE.MathUtils.randFloatSpread(0.08),
      );
      nodeColors.push(baseColor.r, baseColor.g, baseColor.b);
    }

    const nodesGeo = new THREE.BufferGeometry();
    nodesGeo.setAttribute('position', new THREE.Float32BufferAttribute(nodePositions, 3));
    nodesGeo.setAttribute('nodeType', new THREE.Float32BufferAttribute(nodeTypes, 1));
    nodesGeo.setAttribute('nodeSize', new THREE.Float32BufferAttribute(nodeSizes, 1));
    nodesGeo.setAttribute('nodeColor', new THREE.Float32BufferAttribute(nodeColors, 3));
    nodesGeo.setAttribute('distanceFromRoot', new THREE.Float32BufferAttribute(distancesFromRoot, 1));

    const nodesMat = new THREE.ShaderMaterial({
      uniforms: createPulseUniforms(),
      vertexShader: NODE_VERTEX,
      fragmentShader: NODE_FRAGMENT,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.nodesMesh = new THREE.Points(nodesGeo, nodesMat);
    this.scene.add(this.nodesMesh);

    // --- Connections geometry ---
    const connPositions: number[] = [];
    const startPoints: number[] = [];
    const endPoints: number[] = [];
    const connStrengths: number[] = [];
    const connColors: number[] = [];
    const pathIndices: number[] = [];
    const processed = new Set<string>();
    let pathIdx = 0;
    const NUM_SEGMENTS = 28;

    const visibleNodeToIndex = new Map<InternalNode, number>();
    visibleNodes.forEach((n, i) => visibleNodeToIndex.set(n, i));

    for (const node of visibleNodes) {
      for (const conn of node.connections) {
        const target = this.nodes[conn.nodeIndex];
        if (!visibleSet.has(target)) continue;
        const ni = visibleNodeToIndex.get(node)!;
        const ti = visibleNodeToIndex.get(target)!;
        const key = `${Math.min(ni, ti)}-${Math.max(ni, ti)}`;
        if (processed.has(key)) continue;
        processed.add(key);

        for (let s = 0; s < NUM_SEGMENTS; s++) {
          const t = s / (NUM_SEGMENTS - 1);
          connPositions.push(t, 0, 0);
          startPoints.push(node.position.x, node.position.y, node.position.z);
          endPoints.push(target.position.x, target.position.y, target.position.z);
          pathIndices.push(pathIdx);
          connStrengths.push(conn.strength);

          const avgLevel = Math.floor((node.level + target.level) / 2) % palette.length;
          const baseColor = palette[avgLevel].clone();
          baseColor.offsetHSL(
            THREE.MathUtils.randFloatSpread(0.03),
            THREE.MathUtils.randFloatSpread(0.08),
            THREE.MathUtils.randFloatSpread(0.08),
          );
          connColors.push(baseColor.r, baseColor.g, baseColor.b);
        }
        pathIdx++;
      }
    }

    if (connPositions.length > 0) {
      const connGeo = new THREE.BufferGeometry();
      connGeo.setAttribute('position', new THREE.Float32BufferAttribute(connPositions, 3));
      connGeo.setAttribute('startPoint', new THREE.Float32BufferAttribute(startPoints, 3));
      connGeo.setAttribute('endPoint', new THREE.Float32BufferAttribute(endPoints, 3));
      connGeo.setAttribute('connectionStrength', new THREE.Float32BufferAttribute(connStrengths, 1));
      connGeo.setAttribute('connectionColor', new THREE.Float32BufferAttribute(connColors, 3));
      connGeo.setAttribute('pathIndex', new THREE.Float32BufferAttribute(pathIndices, 1));

      const connMat = new THREE.ShaderMaterial({
        uniforms: createPulseUniforms(),
        vertexShader: CONNECTION_VERTEX,
        fragmentShader: CONNECTION_FRAGMENT,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });

      this.connectionsMesh = new THREE.LineSegments(connGeo, connMat);
      this.scene.add(this.connectionsMesh);

      // Sync pulse colors
      palette.forEach((color, i) => {
        if (i < 3) {
          connMat.uniforms.uPulseColors.value[i].copy(color);
          nodesMat.uniforms.uPulseColors.value[i].copy(color);
        }
      });
    }
  }

  private disposeNetwork(): void {
    if (this.nodesMesh) {
      this.scene.remove(this.nodesMesh);
      this.nodesMesh.geometry.dispose();
      (this.nodesMesh.material as THREE.ShaderMaterial).dispose();
      this.nodesMesh = null;
    }
    if (this.connectionsMesh) {
      this.scene.remove(this.connectionsMesh);
      this.connectionsMesh.geometry.dispose();
      (this.connectionsMesh.material as THREE.ShaderMaterial).dispose();
      this.connectionsMesh = null;
    }
  }

  // -----------------------------------------------------------------------
  // Color updates (no rebuild)
  // -----------------------------------------------------------------------

  private updateColors(): void {
    if (!this.nodesMesh || !this.connectionsMesh) {
      if (this.nodes.length > 0) this.buildVisualization();
      return;
    }

    const palette = COLOR_PALETTES[this.paletteIndex];

    // Update node colors
    const nodeColorsAttr = this.nodesMesh.geometry.attributes.nodeColor as THREE.BufferAttribute;
    for (let i = 0; i < nodeColorsAttr.count; i++) {
      const node = this.nodes[i];
      if (!node) continue;
      const colorIndex = node.level % palette.length;
      const baseColor = palette[colorIndex].clone();
      baseColor.offsetHSL(
        THREE.MathUtils.randFloatSpread(0.03),
        THREE.MathUtils.randFloatSpread(0.08),
        THREE.MathUtils.randFloatSpread(0.08),
      );
      nodeColorsAttr.setXYZ(i, baseColor.r, baseColor.g, baseColor.b);
    }
    nodeColorsAttr.needsUpdate = true;

    // Rebuild connection colors
    const connColors: number[] = [];
    const processed = new Set<string>();
    const NUM_SEGMENTS = 28;

    for (let ni = 0; ni < this.nodes.length; ni++) {
      const node = this.nodes[ni];
      for (const conn of node.connections) {
        const ti = conn.nodeIndex;
        const key = `${Math.min(ni, ti)}-${Math.max(ni, ti)}`;
        if (processed.has(key)) continue;
        processed.add(key);
        for (let s = 0; s < NUM_SEGMENTS; s++) {
          const avgLevel = Math.floor((node.level + this.nodes[ti].level) / 2) % palette.length;
          const baseColor = palette[avgLevel].clone();
          baseColor.offsetHSL(
            THREE.MathUtils.randFloatSpread(0.03),
            THREE.MathUtils.randFloatSpread(0.08),
            THREE.MathUtils.randFloatSpread(0.08),
          );
          connColors.push(baseColor.r, baseColor.g, baseColor.b);
        }
      }
    }

    if (connColors.length > 0) {
      this.connectionsMesh.geometry.setAttribute(
        'connectionColor',
        new THREE.Float32BufferAttribute(connColors, 3),
      );
    }

    // Sync pulse colors
    palette.forEach((color, i) => {
      if (i < 3) {
        (this.nodesMesh!.material as THREE.ShaderMaterial).uniforms.uPulseColors.value[i].copy(color);
        (this.connectionsMesh!.material as THREE.ShaderMaterial).uniforms.uPulseColors.value[i].copy(color);
      }
    });
  }

  // -----------------------------------------------------------------------
  // Interactions
  // -----------------------------------------------------------------------

  private trySelectStar(clientX: number, clientY: number): void {
    if (!this.onStarClick || !this.nodesMesh) return;

    const rect = this.canvas.getBoundingClientRect();
    this.pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.camera);

    let bestDist = 2.0;
    let bestNode: InternalNode | null = null;

    for (const node of this.nodes) {
      const projected = node.position.clone().project(this.camera);
      const dx = projected.x - this.pointer.x;
      const dy = projected.y - this.pointer.y;
      const screenDist = Math.sqrt(dx * dx + dy * dy);
      if (screenDist < bestDist) {
        bestDist = screenDist;
        bestNode = node;
      }
    }

    if (bestNode && bestDist < 0.08) {
      this.onStarClick(bestNode.star);
    }
  }

  // -----------------------------------------------------------------------
  // Animation loop
  // -----------------------------------------------------------------------

  private animate = (): void => {
    this.animFrameId = requestAnimationFrame(this.animate);
    const t = this.clock.getElapsedTime();
    const dt = Math.min(this.clock.getDelta(), 0.033); // cap at ~30fps minimum

    if (!this.paused) {
      // Gravity simulation step
      this.integrateVerlet(dt);
      this.updatePositionBuffers();

      // Update shader time uniforms (breathing, flow, etc.)
      if (this.nodesMesh) {
        (this.nodesMesh.material as THREE.ShaderMaterial).uniforms.uTime.value = t;
      }
      if (this.connectionsMesh) {
        (this.connectionsMesh.material as THREE.ShaderMaterial).uniforms.uTime.value = t;
      }
    }

    if (this.starField) {
      this.starField.rotation.y += 0.0002;
      (this.starField.material as THREE.ShaderMaterial).uniforms.uTime.value = t;
    }

    this.controls.update();
    this.composer.render();
  };
}
