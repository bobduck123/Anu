"use client";

import { useEffect, useRef } from "react";
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

function setupCropAnchor(path: string, index: number, xIndex: number, yIndex: number) {
  const h = hashString(path);
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
    const result: PreloadedImage = { image, thumbCanvas, thumbCtx, thumbReady: false };

    image.addEventListener("load", () => {
      result.thumbReady = buildThumbnail(image, 0.5, 0.5, thumbCanvas, thumbCtx);
      resolve(result);
    });
    image.addEventListener("error", () => {
      resolve(result);
    });
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
  const stateRef = useRef<{
    ctx: CanvasRenderingContext2D | null;
    width: number;
    height: number;
    dpr: number;
    numberOfShape: number;
    radius: number;
    size: number;
    shapes: ShapeState[];
    images: Map<string, PreloadedImage>;
    touchInfos: TouchInfos;
    focus: { x: number; y: number; s: number };
    hover: boolean;
    hoveredShape: ShapeState | null;
    animationId: number;
    hasHover: boolean;
    disposed: boolean;
  } | null>(null);

  const reducedMotion = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const propsRef = useRef({ works, activeIndex, reducedMotion, onSelectWork, onFocusWork, focusOpen });
  propsRef.current = { works, activeIndex, reducedMotion, onSelectWork, onFocusWork, focusOpen };

  const worksKey = works.map((w) => w.object.image?.src ?? w.object.id).join(",");

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const reducedMotionActive = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const s = {
      ctx: null as CanvasRenderingContext2D | null,
      width: 0,
      height: 0,
      dpr: 1,
      numberOfShape: 16,
      radius: 0,
      size: 0,
      shapes: [] as ShapeState[],
      images: new Map<string, PreloadedImage>(),
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
      hover: false,
      hoveredShape: null as ShapeState | null,
      animationId: 0,
      hasHover: false,
      disposed: false,
    };
    stateRef.current = s;

    function setupSizes() {
      const rect = canvas!.parentElement?.getBoundingClientRect();
      s.width = rect ? Math.round(rect.width) : window.innerWidth;
      s.height = rect ? Math.round(rect.height) : window.innerHeight;
      s.dpr = window.devicePixelRatio || 1;
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
      s.numberOfShape = 16;
      s.size = s.radius / (s.numberOfShape / 6);
      s.shapes = [];

      const currentWorks = propsRef.current.works;
      if (currentWorks.length === 0) return;

      let index = 0;
      for (let x = 0; x < s.numberOfShape; x++) {
        for (let y = 0; y < s.numberOfShape; y++) {
          const workIndex = index % currentWorks.length;
          const work = currentWorks[workIndex];
          const src = work.object.image?.src ?? "";
          const { cropU, cropV } = setupCropAnchor(src || `${x}-${y}`, index, x, y);

          s.shapes.push({
            xIndex: x,
            yIndex: y,
            index,
            xRadian: (Math.PI * 2 / s.numberOfShape) * x,
            yRadian: (Math.PI * 2 / s.numberOfShape) * y,
            x: 0,
            y: 0,
            ratio: 0,
            displayed: true,
            imageSrc: src,
            workIndex,
            cropU,
            cropV,
          });
          index++;
        }
      }
    }

    async function preloadImages() {
      const currentWorks = propsRef.current.works;
      const uniqueSrcs = Array.from(new Set(currentWorks.map((w) => w.object.image?.src).filter(Boolean))) as string[];

      await Promise.all(
        uniqueSrcs.map(async (src) => {
          if (s.images.has(src)) return;
          const img = await preloadImage(src);
          s.images.set(src, img);
        }),
      );

      // Rebuild thumbnails with correct crop anchors now that images are loaded
      for (const shape of s.shapes) {
        if (!shape.imageSrc) continue;
        const img = s.images.get(shape.imageSrc);
        if (img && img.image.naturalWidth && !img.thumbReady) {
          img.thumbReady = buildThumbnail(img.image, shape.cropU, shape.cropV, img.thumbCanvas, img.thumbCtx);
        }
      }
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

    function render(t: number) {
      if (s.disposed || !s.ctx) return;
      const ctx = s.ctx;

      ctx.clearRect(0, 0, s.width, s.height);
      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, s.width, s.height);
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
        if (img && img.thumbReady) {
          ctx.save();
          ctx.translate(shape.x, shape.y);
          ctx.scale(shape.ratio, shape.ratio);
          ctx.translate(-shape.x, -shape.y);
          ctx.globalAlpha = shape.ratio;
          const frameSize = s.size;
          ctx.drawImage(
            img.thumbCanvas,
            shape.x - frameSize / 2,
            shape.y - frameSize / 2,
            frameSize,
            frameSize,
          );
          ctx.restore();
        }
      }

      drawFocusRect(ctx);

      if (!reducedMotionActive && Math.random() < 0.01) {
        drawGlitch(ctx, t);
      }

      ctx.restore();

      s.animationId = requestAnimationFrame(render);
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
          const currentWorks = propsRef.current.works;
          if (shape.workIndex >= 0 && shape.workIndex < currentWorks.length) {
            propsRef.current.onSelectWork(shape.workIndex);
            propsRef.current.onFocusWork(currentWorks[shape.workIndex].object);
          }
          return;
        }
      }
    }

    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "Enter") return;
      const currentWorks = propsRef.current.works;
      if (s.hoveredShape && s.hoveredShape.workIndex >= 0 && s.hoveredShape.workIndex < currentWorks.length) {
        propsRef.current.onSelectWork(s.hoveredShape.workIndex);
        propsRef.current.onFocusWork(currentWorks[s.hoveredShape.workIndex].object);
      } else if (currentWorks.length > 0) {
        const idx = propsRef.current.activeIndex % currentWorks.length;
        propsRef.current.onSelectWork(idx);
        propsRef.current.onFocusWork(currentWorks[idx].object);
      }
    }

    function onResize() {
      setupSizes();
      setupShapes();
      s.focus = { x: 0, y: 0, s: s.size };
    }

    // Initialize
    s.hasHover = window.matchMedia("(hover: hover)").matches;
    setupSizes();
    setupShapes();
    preloadImages();
    s.focus = { x: 0, y: 0, s: s.size };
    s.animationId = requestAnimationFrame(render);

    // Events
    window.addEventListener("resize", onResize);
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
      canvas.removeEventListener("mousemove", onMouseMove);
      canvas.removeEventListener("wheel", onWheel);
      canvas.removeEventListener("click", onClick);
      canvas.removeEventListener("touchstart", onTouchStart);
      canvas.removeEventListener("touchmove", onTouchMove);
      canvas.removeEventListener("keydown", onKeyDown);
    };
  }, [worksKey, reducedMotion]);

  return (
    <canvas
      ref={canvasRef}
      className="v2-bbb-canvas"
      aria-label="bbb.vision gallery field"
      role="img"
      tabIndex={0}
      data-testid="presence-public-bbbvision-constellation"
    />
  );
}
