"use client";

import { useEffect, useRef, useState } from "react";
import type { StudioV2PublicObject } from "@/lib/presence/studio-v2";

export interface CanvasGalleryWork {
  object: StudioV2PublicObject;
  chamberId: string;
  chamberLabel: string;
}

interface BbbVisionCanvasGalleryProps {
  works: CanvasGalleryWork[];
  activeIndex: number;
  onSelectWork: (index: number) => void;
  onFocusWork: (object: StudioV2PublicObject) => void;
  focusOpen?: boolean;
}

interface PreloadedImage {
  image: HTMLImageElement;
  thumbCanvas: HTMLCanvasElement;
  thumbCtx: CanvasRenderingContext2D;
  thumbReady: boolean;
  failed: boolean;
}

interface ShapeState {
  xIndex: number;
  yIndex: number;
  index: number;
  xRadian: number;
  yRadian: number;
  x: number;
  y: number;
  ratio: number;
  displayed: boolean;
  imageSrc: string;
  workIndex: number;
  cropU: number;
  cropV: number;
  thumbCanvas: HTMLCanvasElement | null;
  thumbReady: boolean;
}

interface FieldLoaderState {
  attempted: number;
  failed: number;
  ready: boolean;
  readyThumbs: number;
  total: number;
}

interface FocusTransitionState {
  shape: ShapeState;
  work: CanvasGalleryWork;
  startedAt: number;
  duration: number;
  completed: boolean;
  thumbCanvas: HTMLCanvasElement | null;
  seed: number;
}

interface TouchInfos {
  mouse: { x: number; y: number };
  delta: { x: number; y: number };
  fing: {
    start: { x: number; y: number };
    move: { x: number; y: number };
    end: { x: number; y: number };
  };
}

const FIELD_GRID_SIZE = 16;
const FOCUS_TRANSITION_MS = 360;
const IMAGE_PRELOAD_TIMEOUT_MS = 2200;
const THUMB_SIZE = 192;

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function fract(value: number): number {
  return value - Math.floor(value);
}

function ease(t: number): number {
  return t * t * t;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function easeOutCubic(t: number): number {
  const inverted = 1 - clamp01(t);
  return 1 - inverted * inverted * inverted;
}

function seededRandom(seed: number) {
  let value = seed >>> 0;
  return () => {
    value += 0x6D2B79F5;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function stableUnit(seed: string): number {
  const h = hashString(seed);
  return fract(Math.sin((h + 1) * 12.9898) * 43758.5453123);
}

function stableWorkSeed(work: CanvasGalleryWork): string {
  return `${work.chamberId}:${work.object.id}:${work.object.image?.src ?? ""}`;
}

function buildFieldSeed(works: readonly CanvasGalleryWork[]): string {
  return works.map(stableWorkSeed).join("|") || "empty-field";
}

function currentWorksReady(works: readonly CanvasGalleryWork[]): boolean {
  return works.filter((work) => Boolean(work.object.image?.src)).length === 0;
}

function shuffleDeterministic<T>(items: T[], seed: number): T[] {
  const random = seededRandom(seed);
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}

function buildWorkAssignments(works: readonly CanvasGalleryWork[], total: number, fieldSeed: string): number[] {
  if (works.length === 0) return [];
  const order = shuffleDeterministic(
    works.map((_, index) => index),
    hashString(`${fieldSeed}:work-order`),
  );
  const assignments = Array.from({ length: total }, (_, index) => order[index % order.length]);
  return shuffleDeterministic(assignments, hashString(`${fieldSeed}:shape-assignment`));
}

function setupCropAnchor(seed: string, index: number, xIndex: number, yIndex: number) {
  const h = hashString(seed);
  const seedA = (h + (index + 1) * 9719 + (xIndex + 1) * 6151 + (yIndex + 1) * 3137) * 0.0001;
  const seedB = (h + (index + 1) * 1879 + (xIndex + 1) * 1117 + (yIndex + 1) * 7211) * 0.0001;
  return {
    cropU: fract(Math.sin(seedA) * 43758.5453123),
    cropV: fract(Math.sin(seedB) * 96321.3145789),
  };
}

function buildThumbnail(
  source: HTMLImageElement,
  cropU: number,
  cropV: number,
  thumbCanvas: HTMLCanvasElement,
  thumbCtx: CanvasRenderingContext2D,
) {
  const sourceWidth = source.naturalWidth;
  const sourceHeight = source.naturalHeight;
  if (!sourceWidth || !sourceHeight) return false;

  const maxCropArea = (sourceWidth * sourceHeight) / 3;
  const cropSide = Math.min(sourceWidth, sourceHeight, Math.sqrt(maxCropArea));
  const cropWidth = cropSide;
  const cropHeight = cropSide;
  const srcX = (sourceWidth - cropWidth) * cropU;
  const srcY = (sourceHeight - cropHeight) * cropV;

  thumbCanvas.width = THUMB_SIZE;
  thumbCanvas.height = THUMB_SIZE;
  thumbCtx.clearRect(0, 0, THUMB_SIZE, THUMB_SIZE);
  thumbCtx.drawImage(source, srcX, srcY, cropWidth, cropHeight, 0, 0, THUMB_SIZE, THUMB_SIZE);
  return true;
}

function preloadImage(src: string): Promise<PreloadedImage> {
  return new Promise((resolve) => {
    const image = new Image();
    if (/^https?:\/\//.test(src)) {
      image.crossOrigin = "anonymous";
    }
    const thumbCanvas = document.createElement("canvas");
    const thumbCtx = thumbCanvas.getContext("2d")!;
    const result: PreloadedImage = { image, thumbCanvas, thumbCtx, thumbReady: false, failed: false };
    let settled = false;

    const finish = (failed: boolean) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeoutId);
      result.failed = failed;
      resolve(result);
    };

    const timeoutId = window.setTimeout(() => finish(true), IMAGE_PRELOAD_TIMEOUT_MS);

    image.addEventListener("load", () => {
      result.thumbReady = buildThumbnail(image, 0.5, 0.5, thumbCanvas, thumbCtx);
      finish(!result.thumbReady);
    });
    image.addEventListener("error", () => {
      finish(true);
    });
    image.decoding = "async";
    image.src = src;
  });
}

export default function BbbVisionCanvasGallery({
  works,
  activeIndex,
  onSelectWork,
  onFocusWork,
  focusOpen = false,
}: BbbVisionCanvasGalleryProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loaderState, setLoaderState] = useState<FieldLoaderState>({
    attempted: 0,
    failed: 0,
    ready: works.length === 0,
    readyThumbs: 0,
    total: works.length,
  });
  const stateRef = useRef<{
    ctx: CanvasRenderingContext2D | null;
    width: number;
    height: number;
    dpr: number;
    isMobile: boolean;
    numberOfShape: number;
    radius: number;
    size: number;
    shapes: ShapeState[];
    images: Map<string, PreloadedImage>;
    loader: FieldLoaderState;
    touchInfos: TouchInfos;
    focus: { x: number; y: number; s: number };
    focusTransition: FocusTransitionState | null;
    hover: boolean;
    hoveredShape: ShapeState | null;
    animationId: number;
    hasHover: boolean;
    disposed: boolean;
    hidden: boolean;
  } | null>(null);

  const reducedMotion = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const propsRef = useRef({ works, activeIndex, reducedMotion, onSelectWork, onFocusWork, focusOpen });
  propsRef.current = { works, activeIndex, reducedMotion, onSelectWork, onFocusWork, focusOpen };

  const worksKey = works.map(stableWorkSeed).join("|");

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const reducedMotionActive = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const s = {
      ctx: null as CanvasRenderingContext2D | null,
      width: 0,
      height: 0,
      dpr: 1,
      isMobile: false,
      numberOfShape: FIELD_GRID_SIZE,
      radius: 0,
      size: 0,
      shapes: [] as ShapeState[],
      images: new Map<string, PreloadedImage>(),
      loader: {
        attempted: 0,
        failed: 0,
        ready: currentWorksReady(propsRef.current.works),
        readyThumbs: 0,
        total: 0,
      } as FieldLoaderState,
      touchInfos: {
        mouse: { x: 0, y: 0 },
        delta: { x: 0, y: 0 },
        fing: {
          start: { x: 0, y: 0 },
          move: { x: 0, y: 0 },
          end: { x: 0, y: 0 },
        },
      },
      focus: { x: 0, y: 0, s: 0 },
      focusTransition: null as FocusTransitionState | null,
      hover: false,
      hoveredShape: null as ShapeState | null,
      animationId: 0,
      hasHover: false,
      disposed: false,
      hidden: typeof document !== "undefined" ? document.hidden : false,
    };
    stateRef.current = s;

    function publishLoader(next: FieldLoaderState) {
      s.loader = next;
      if (!s.disposed) setLoaderState(next);
    }

    function setupSizes() {
      const rect = canvas!.parentElement?.getBoundingClientRect();
      s.width = rect ? Math.round(rect.width) : window.innerWidth;
      s.height = rect ? Math.round(rect.height) : window.innerHeight;
      s.isMobile = Math.min(s.width, s.height) <= 640;
      s.dpr = Math.min(window.devicePixelRatio || 1, s.isMobile ? 2 : 2.5);
      canvas!.width = s.width * s.dpr;
      canvas!.height = s.height * s.dpr;
      canvas!.style.width = `${s.width}px`;
      canvas!.style.height = `${s.height}px`;
      s.ctx = canvas!.getContext("2d");
      if (s.ctx) {
        s.ctx.setTransform(s.dpr, 0, 0, s.dpr, 0, 0);
      }
    }

    function setupShapes() {
      const edge = Math.max(s.width, s.height);
      s.radius = edge / 2;
      s.numberOfShape = FIELD_GRID_SIZE;
      s.size = s.radius / (s.numberOfShape / 6);
      s.shapes = [];

      const currentWorks = propsRef.current.works;
      if (currentWorks.length === 0) return;

      const fieldSeed = buildFieldSeed(currentWorks);
      const assignments = buildWorkAssignments(currentWorks, s.numberOfShape * s.numberOfShape, fieldSeed);
      const cell = (Math.PI * 2) / s.numberOfShape;
      let index = 0;
      for (let x = 0; x < s.numberOfShape; x++) {
        for (let y = 0; y < s.numberOfShape; y++) {
          const workIndex = assignments[index] ?? index % currentWorks.length;
          const work = currentWorks[workIndex];
          const src = work.object.image?.src ?? "";
          const shapeSeed = `${fieldSeed}:shape:${index}:${stableWorkSeed(work)}`;
          const { cropU, cropV } = setupCropAnchor(shapeSeed, index, x, y);
          const xJitter = (stableUnit(`${shapeSeed}:x`) - 0.5) * cell * 0.46;
          const yJitter = (stableUnit(`${shapeSeed}:y`) - 0.5) * cell * 0.46;

          s.shapes.push({
            xIndex: x,
            yIndex: y,
            index,
            xRadian: cell * x + xJitter,
            yRadian: cell * y + yJitter,
            x: 0,
            y: 0,
            ratio: 0,
            displayed: true,
            imageSrc: src,
            workIndex,
            cropU,
            cropV,
            thumbCanvas: null,
            thumbReady: false,
          });
          index++;
        }
      }
    }

    async function preloadImages() {
      const currentWorks = propsRef.current.works;
      const uniqueSrcs = Array.from(new Set(currentWorks.map((w) => w.object.image?.src).filter(Boolean))) as string[];
      publishLoader({
        attempted: 0,
        failed: 0,
        ready: uniqueSrcs.length === 0,
        readyThumbs: 0,
        total: uniqueSrcs.length,
      });

      await Promise.all(
        uniqueSrcs.map(async (src) => {
          if (s.images.has(src)) return;
          const img = await preloadImage(src);
          s.images.set(src, img);
          const readyThumbs = Array.from(s.images.values()).filter((item) => item.thumbReady).length;
          const failed = Array.from(s.images.values()).filter((item) => item.failed).length;
          const attempted = Array.from(s.images.values()).length;
          publishLoader({
            attempted,
            failed,
            ready: false,
            readyThumbs,
            total: uniqueSrcs.length,
          });
        }),
      );

      // Rebuild thumbnails with correct crop anchors now that images are loaded
      for (const shape of s.shapes) {
        if (!shape.imageSrc) continue;
        const img = s.images.get(shape.imageSrc);
        if (img && img.image.naturalWidth) {
          const thumbCanvas = document.createElement("canvas");
          const thumbCtx = thumbCanvas.getContext("2d");
          if (thumbCtx) {
            shape.thumbReady = buildThumbnail(img.image, shape.cropU, shape.cropV, thumbCanvas, thumbCtx);
            shape.thumbCanvas = shape.thumbReady ? thumbCanvas : null;
          }
        }
      }
      const readyThumbs = s.shapes.filter((shape) => shape.thumbReady).length;
      const failed = Array.from(s.images.values()).filter((item) => item.failed).length;
      const attempted = Array.from(s.images.values()).length;
      publishLoader({
        attempted,
        failed,
        ready: true,
        readyThumbs,
        total: uniqueSrcs.length,
      });
    }

    function updateShapeParams(shape: ShapeState, delta: { x: number; y: number }) {
      shape.x = Math.sin(shape.xRadian + delta.x) * s.radius;
      shape.y = Math.cos(shape.yRadian + delta.y) * s.radius;

      const dist = Math.sqrt(shape.x * shape.x + shape.y * shape.y) / s.radius;
      shape.ratio = 1 - Math.min(ease(dist), 1);

      if (
        Math.sin(shape.yRadian + delta.y) > 0 ||
        Math.cos(shape.xRadian + delta.x) > 0
      ) {
        shape.displayed = false;
      } else {
        shape.displayed = true;
      }
    }

    function isHovered(shape: ShapeState, mx: number, my: number): boolean {
      if (!shape.displayed) return false;
      const half = (s.size / 2) * shape.ratio;
      return mx > shape.x - half && mx < shape.x + half && my > shape.y - half && my < shape.y + half;
    }

    function drawGlitch(ctx: CanvasRenderingContext2D, t: number) {
      const w = s.width;
      const h = s.height;
      const min = 50;
      const max = 200;
      const dataArr: { image: ImageData; height: number }[] = [];

      let preHeight = 0;
      let addHeight = 0;
      for (let i = 0; i < h; i += addHeight) {
        addHeight = Math.floor(min + Math.random() * (max - min + 1));
        if (preHeight + addHeight > h) {
          addHeight = Math.floor(h - preHeight);
        }
        if (addHeight <= 0) break;
        try {
          const image = ctx.getImageData(0, preHeight, w, addHeight);
          dataArr.push({ image, height: preHeight });
        } catch {
          break;
        }
        preHeight += addHeight;
      }

      for (let i = 0; i < dataArr.length; i++) {
        if (Math.random() > 0.01) {
          ctx.putImageData(
            dataArr[i].image,
            Math.tan(dataArr[i].height * 0.1 + t) * 10 * Math.random(),
            dataArr[i].height,
          );
        } else {
          const randomIdx = Math.floor(dataArr.length * Math.random());
          ctx.putImageData(
            dataArr[randomIdx].image,
            w * Math.random() - w / 2,
            dataArr[i].height,
          );
        }
      }
    }

    function drawFocusRect(ctx: CanvasRenderingContext2D) {
      const { hover, hoveredShape, focus, touchInfos } = s;
      const targetS = hover && hoveredShape ? s.size * hoveredShape.ratio : 0;
      const targetX = hover && hoveredShape ? hoveredShape.x : touchInfos.mouse.x;
      const targetY = hover && hoveredShape ? hoveredShape.y : touchInfos.mouse.y;

      focus.s += (targetS - focus.s) * 0.16;
      focus.x += (targetX - focus.x) * 0.16;
      focus.y += (targetY - focus.y) * 0.16;

      ctx.save();
      ctx.strokeStyle = "#ffd84d";
      ctx.shadowColor = hover ? "rgba(255, 216, 77, 0.95)" : "rgba(255, 216, 77, 0.85)";
      ctx.shadowBlur = hover ? 20 : 12;
      ctx.lineWidth = hover && hoveredShape ? 5 * hoveredShape.ratio : 1;
      ctx.strokeRect(focus.x - focus.s / 2, focus.y - focus.s / 2, focus.s, focus.s);
      ctx.restore();
    }

    function drawLoader(ctx: CanvasRenderingContext2D, t: number) {
      const cx = s.width / 2;
      const cy = s.height / 2;
      const pulse = reducedMotionActive ? 0.68 : 0.52 + Math.sin(t * 0.004) * 0.18;
      const lineWidth = Math.min(120, Math.max(76, s.width * 0.18));

      ctx.save();
      ctx.globalAlpha = 0.9;
      ctx.strokeStyle = `rgba(255, 216, 77, ${pulse})`;
      ctx.fillStyle = "rgba(255, 216, 77, 0.84)";
      ctx.shadowColor = "rgba(255, 216, 77, 0.42)";
      ctx.shadowBlur = reducedMotionActive ? 0 : 14;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx - lineWidth / 2, cy);
      ctx.lineTo(cx + lineWidth / 2, cy);
      ctx.stroke();

      for (let i = 0; i < 7; i++) {
        const offset = (i - 3) * (lineWidth / 7);
        const phase = reducedMotionActive ? 0.5 : Math.sin(t * 0.006 + i * 0.8) * 0.5 + 0.5;
        const size = 2 + phase * 2;
        ctx.globalAlpha = 0.24 + phase * 0.62;
        ctx.fillRect(cx + offset - size / 2, cy - 13 - phase * 4, size, size);
        ctx.fillRect(cx + offset - size / 2, cy + 11 + phase * 4, size, size);
      }
      ctx.restore();
    }

    function drawFocusTransition(ctx: CanvasRenderingContext2D, t: number) {
      const transition = s.focusTransition;
      if (!transition) return;

      const rawProgress = clamp01((t - transition.startedAt) / transition.duration);
      const progress = easeOutCubic(rawProgress);
      const sourceSize = Math.max(24, s.size * Math.max(transition.shape.ratio, 0.22));
      const targetSize = Math.min(Math.max(s.width, s.height) * 0.72, Math.min(s.width, s.height) * 0.96);
      const frameSize = sourceSize + (targetSize - sourceSize) * progress;
      const centerX = transition.shape.x * (1 - progress);
      const centerY = transition.shape.y * (1 - progress);
      const stripCount = 14;
      const stripHeight = THUMB_SIZE / stripCount;
      const alpha = Math.min(1, rawProgress * 3) * (1 - rawProgress * 0.18);

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.shadowColor = "rgba(255, 216, 77, 0.5)";
      ctx.shadowBlur = 18 * (1 - rawProgress);

      if (transition.thumbCanvas) {
        for (let i = 0; i < stripCount; i++) {
          const stripSeed = stableUnit(`${transition.seed}:strip:${i}`) - 0.5;
          const tanScatter = Math.tan((i - stripCount / 2) * 0.18 + rawProgress * 0.9);
          const scatter = tanScatter * (1 - rawProgress) * 18 + stripSeed * (1 - rawProgress) * 70;
          const yJitter = (stableUnit(`${transition.seed}:strip-y:${i}`) - 0.5) * (1 - rawProgress) * 28;
          const sourceY = i * stripHeight;
          const destHeight = frameSize / stripCount + 1.5;
          ctx.drawImage(
            transition.thumbCanvas,
            0,
            sourceY,
            THUMB_SIZE,
            stripHeight,
            centerX - frameSize / 2 + scatter,
            centerY - frameSize / 2 + (i * frameSize) / stripCount + yJitter,
            frameSize,
            destHeight,
          );
        }
      }

      ctx.globalAlpha = 0.92 * (1 - rawProgress * 0.35);
      ctx.strokeStyle = "rgba(255, 216, 77, 0.86)";
      ctx.lineWidth = 1 + 3 * (1 - rawProgress);
      ctx.strokeRect(centerX - frameSize / 2, centerY - frameSize / 2, frameSize, frameSize);
      ctx.restore();

      if (!transition.completed && rawProgress >= 1) {
        transition.completed = true;
        propsRef.current.onFocusWork(transition.work.object);
      }
      if (transition.completed && rawProgress >= 1) {
        s.focusTransition = null;
      }
    }

    function scheduleFrame() {
      if (s.disposed || s.hidden) return;
      s.animationId = requestAnimationFrame(render);
    }

    function render(t: number) {
      if (s.disposed || !s.ctx || s.hidden) return;
      const ctx = s.ctx;

      ctx.clearRect(0, 0, s.width, s.height);
      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, s.width, s.height);
      if (!s.loader.ready) {
        drawLoader(ctx, t);
      }
      ctx.save();
      ctx.translate(s.width / 2, s.height / 2);

      s.hover = false;
      s.hoveredShape = null;
      canvas!.style.cursor = "crosshair";

      // Draw shapes back-to-front by distance (farther first)
      const sortedShapes = s.shapes.slice().sort((a, b) => {
        const da = Math.sqrt(a.x * a.x + a.y * a.y);
        const db = Math.sqrt(b.x * b.x + b.y * b.y);
        return db - da;
      });

      for (const shape of sortedShapes) {
        updateShapeParams(shape, s.touchInfos.delta);
        if (!shape.displayed) continue;

        if (isHovered(shape, s.touchInfos.mouse.x, s.touchInfos.mouse.y)) {
          s.hover = true;
          s.hoveredShape = shape;
          canvas!.style.cursor = "zoom-in";
        }

        const img = shape.imageSrc ? s.images.get(shape.imageSrc) : undefined;
        const thumbCanvas = shape.thumbReady ? shape.thumbCanvas : img?.thumbReady ? img.thumbCanvas : null;
        if (thumbCanvas) {
          ctx.save();
          ctx.translate(shape.x, shape.y);
          ctx.scale(shape.ratio, shape.ratio);
          ctx.translate(-shape.x, -shape.y);
          ctx.globalAlpha = shape.ratio;
          const frameSize = s.size;
          ctx.drawImage(
            thumbCanvas,
            shape.x - frameSize / 2,
            shape.y - frameSize / 2,
            frameSize,
            frameSize,
          );
          ctx.restore();
        }
      }

      drawFocusRect(ctx);
      drawFocusTransition(ctx, t);

      const glitchChance = s.isMobile ? 0.0025 : 0.01;
      if (!reducedMotionActive && Math.random() < glitchChance) {
        drawGlitch(ctx, t);
      }

      ctx.restore();

      if (!s.loader.ready) {
        drawLoader(ctx, t);
      }
      scheduleFrame();
    }

    function onMouseMove(e: MouseEvent) {
      s.touchInfos.mouse.x = e.clientX - s.width / 2;
      s.touchInfos.mouse.y = e.clientY - s.height / 2;
    }

    function onWheel(e: WheelEvent) {
      if (reducedMotionActive) return;
      e.preventDefault();
      s.touchInfos.delta.x += e.deltaX * 0.0005;
      s.touchInfos.delta.y += e.deltaY * 0.0005;
    }

    function onTouchStart(e: TouchEvent) {
      const t = e.targetTouches[0];
      s.touchInfos.fing.start.x = t.pageX;
      s.touchInfos.fing.start.y = t.pageY;
    }

    function onTouchMove(e: TouchEvent) {
      if (reducedMotionActive) return;
      const t = e.targetTouches[0];
      s.touchInfos.mouse.x = t.pageX - s.width / 2;
      s.touchInfos.mouse.y = t.pageY - s.height / 2;
      s.touchInfos.fing.move.x = t.pageX;
      s.touchInfos.fing.move.y = t.pageY;
      s.touchInfos.fing.end.x = s.touchInfos.fing.start.x - s.touchInfos.fing.move.x;
      s.touchInfos.fing.end.y = s.touchInfos.fing.start.y - s.touchInfos.fing.move.y;
      s.touchInfos.delta.x += s.touchInfos.fing.end.x * 0.0003;
      s.touchInfos.delta.y += s.touchInfos.fing.end.y * 0.0003;
    }

    function findVisibleShapeForWork(workIndex: number): ShapeState | null {
      const candidates = s.shapes
        .filter((shape) => shape.workIndex === workIndex && shape.displayed)
        .sort((a, b) => b.ratio - a.ratio);
      return candidates[0] ?? s.shapes.find((shape) => shape.workIndex === workIndex) ?? null;
    }

    function openWorkFromShape(shape: ShapeState) {
      if (propsRef.current.focusOpen) return;
      if (s.focusTransition && !s.focusTransition.completed) return;
      const currentWorks = propsRef.current.works;
      if (shape.workIndex < 0 || shape.workIndex >= currentWorks.length) return;
      const work = currentWorks[shape.workIndex];

      propsRef.current.onSelectWork(shape.workIndex);
      if (reducedMotionActive) {
        propsRef.current.onFocusWork(work.object);
        return;
      }

      const img = shape.imageSrc ? s.images.get(shape.imageSrc) : undefined;
      s.focusTransition = {
        shape,
        work,
        startedAt: performance.now(),
        duration: FOCUS_TRANSITION_MS,
        completed: false,
        thumbCanvas: shape.thumbReady ? shape.thumbCanvas : img?.thumbReady ? img.thumbCanvas : null,
        seed: hashString(`${stableWorkSeed(work)}:${shape.index}:focus`),
      };
    }

    function onClick(e: MouseEvent) {
      const mx = e.clientX - s.width / 2;
      const my = e.clientY - s.height / 2;
      s.touchInfos.mouse.x = mx;
      s.touchInfos.mouse.y = my;

      // Check from front to back (reverse of draw order) for accurate hit testing
      const sortedShapes = s.shapes.slice().sort((a, b) => {
        const da = Math.sqrt(a.x * a.x + a.y * a.y);
        const db = Math.sqrt(b.x * b.x + b.y * b.y);
        return da - db;
      });

      for (const shape of sortedShapes) {
        if (isHovered(shape, mx, my)) {
          openWorkFromShape(shape);
          return;
        }
      }
    }

    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "Enter") return;
      const currentWorks = propsRef.current.works;
      if (s.hoveredShape && s.hoveredShape.workIndex >= 0 && s.hoveredShape.workIndex < currentWorks.length) {
        openWorkFromShape(s.hoveredShape);
      } else if (currentWorks.length > 0) {
        const idx = propsRef.current.activeIndex % currentWorks.length;
        const shape = findVisibleShapeForWork(idx);
        if (shape) {
          openWorkFromShape(shape);
        } else {
          propsRef.current.onSelectWork(idx);
          propsRef.current.onFocusWork(currentWorks[idx].object);
        }
      }
    }

    function onResize() {
      setupSizes();
      setupShapes();
      s.focus = { x: 0, y: 0, s: s.size };
    }

    function onVisibilityChange() {
      s.hidden = document.hidden;
      if (s.hidden) {
        if (s.animationId) cancelAnimationFrame(s.animationId);
        s.animationId = 0;
        return;
      }
      if (!s.animationId) {
        scheduleFrame();
      }
    }

    // Initialize
    s.hasHover = window.matchMedia("(hover: hover)").matches;
    setupSizes();
    setupShapes();
    preloadImages();
    s.focus = { x: 0, y: 0, s: s.size };
    scheduleFrame();

    // Events
    window.addEventListener("resize", onResize);
    document.addEventListener("visibilitychange", onVisibilityChange);
    canvas.addEventListener("mousemove", onMouseMove);
    canvas.addEventListener("wheel", onWheel, { passive: false });
    canvas.addEventListener("click", onClick);
    canvas.addEventListener("touchstart", onTouchStart, { passive: true });
    canvas.addEventListener("touchmove", onTouchMove, { passive: true });
    canvas.addEventListener("keydown", onKeyDown);

    return () => {
      s.disposed = true;
      if (s.animationId) cancelAnimationFrame(s.animationId);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      canvas.removeEventListener("mousemove", onMouseMove);
      canvas.removeEventListener("wheel", onWheel);
      canvas.removeEventListener("click", onClick);
      canvas.removeEventListener("touchstart", onTouchStart);
      canvas.removeEventListener("touchmove", onTouchMove);
      canvas.removeEventListener("keydown", onKeyDown);
    };
  }, [worksKey, reducedMotion]);

  return (
    <div
      className={`v2-bbb-canvas-shell${loaderState.ready ? " is-field-ready" : " is-field-loading"}`}
      data-testid="presence-public-bbbvision-canvas-shell"
      data-loader-state={loaderState.ready ? "ready" : "loading"}
      data-loader-ready-thumbs={loaderState.readyThumbs}
      data-loader-total={loaderState.total}
    >
      <canvas
        ref={canvasRef}
        className="v2-bbb-canvas"
        aria-label="bbb.vision gallery field"
        role="img"
        tabIndex={0}
        data-testid="presence-public-bbbvision-constellation"
      />
      <div
        className="v2-bbb-field-loader"
        data-testid="presence-public-bbbvision-loader"
        data-state={loaderState.ready ? "ready" : "loading"}
        aria-hidden="true"
      >
        <span className="v2-bbb-field-loader-copy">Loading field</span>
        <span className="v2-bbb-field-loader-line" />
        <span className="v2-bbb-field-loader-dots">
          <i />
          <i />
          <i />
          <i />
          <i />
        </span>
      </div>
    </div>
  );
}
