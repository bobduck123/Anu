/**
 * 2D Canvas starfield rendering engine with pan/zoom/interaction.
 * No external dependencies — uses native Canvas2D.
 */

import type { Star, Constellation, UniverseData } from '@/data/adapters/starfieldAdapter';

interface Camera {
  x: number;
  y: number;
  zoom: number;
  targetX: number;
  targetY: number;
  targetZoom: number;
}

interface StarRender {
  star: Star;
  screenX: number;
  screenY: number;
  screenSize: number;
  twinkle: number;
}

export type StarClickHandler = (star: Star) => void;
export type StarHoverHandler = (star: Star | null) => void;

export class StarfieldEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private stars: Star[] = [];
  private constellations: Constellation[] = [];
  private camera: Camera = { x: 0, y: 0, zoom: 1, targetX: 0, targetY: 0, targetZoom: 1 };
  private animFrame = 0;
  private time = 0;
  private renderCache: StarRender[] = [];
  private dragging = false;
  private dragStart = { x: 0, y: 0 };
  private hoveredStar: Star | null = null;
  private reducedMotion = false;

  onStarClick: StarClickHandler | null = null;
  onStarHover: StarHoverHandler | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.setupEvents();
  }

  loadData(data: UniverseData): void {
    this.stars = data.stars;
    this.constellations = data.constellations;
  }

  panTo(x: number, y: number): void {
    this.camera.targetX = x;
    this.camera.targetY = y;
  }

  zoomTo(level: number): void {
    this.camera.targetZoom = Math.max(0.2, Math.min(5, level));
  }

  start(): void {
    const loop = () => {
      this.update();
      this.render();
      this.animFrame = requestAnimationFrame(loop);
    };
    this.animFrame = requestAnimationFrame(loop);
  }

  stop(): void {
    cancelAnimationFrame(this.animFrame);
    this.removeEvents();
  }

  resize(): void {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  /* ---- Private: Update ---- */

  private update(): void {
    this.time += 0.016;

    // Smooth camera interpolation
    const lerp = this.reducedMotion ? 1 : 0.08;
    this.camera.x += (this.camera.targetX - this.camera.x) * lerp;
    this.camera.y += (this.camera.targetY - this.camera.y) * lerp;
    this.camera.zoom += (this.camera.targetZoom - this.camera.zoom) * lerp;

    // Project stars to screen space
    const w = this.canvas.getBoundingClientRect().width;
    const h = this.canvas.getBoundingClientRect().height;
    const cx = w / 2;
    const cy = h / 2;

    this.renderCache = this.stars.map((star) => {
      // Project 3D to 2D using simple perspective
      const perspective = 300 / (300 + star.z * 0.5);
      const sx = cx + (star.x - this.camera.x) * this.camera.zoom * perspective;
      const sy = cy + (star.y - this.camera.y) * this.camera.zoom * perspective;
      const size = star.size * this.camera.zoom * perspective;
      const twinkle = this.reducedMotion ? 1 : 0.7 + 0.3 * Math.sin(this.time * 2 + star.x * 0.1 + star.y * 0.1);

      return { star, screenX: sx, screenY: sy, screenSize: size, twinkle };
    });
  }

  /* ---- Private: Render ---- */

  private render(): void {
    const w = this.canvas.getBoundingClientRect().width;
    const h = this.canvas.getBoundingClientRect().height;
    const ctx = this.ctx;

    // Background
    ctx.fillStyle = '#050510';
    ctx.fillRect(0, 0, w, h);

    // Background stars (static dust)
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    for (let i = 0; i < 200; i++) {
      const x = (i * 7919 + 1234) % w;
      const y = (i * 6271 + 5678) % h;
      ctx.fillRect(x, y, 1, 1);
    }

    // Constellation connections
    ctx.lineWidth = 0.5;
    for (const c of this.constellations) {
      ctx.strokeStyle = c.color + '40';
      ctx.beginPath();
      let first = true;
      for (const id of c.starIds) {
        const sr = this.renderCache.find((r) => r.star.id === id);
        if (!sr) continue;
        if (first) {
          ctx.moveTo(sr.screenX, sr.screenY);
          first = false;
        } else {
          ctx.lineTo(sr.screenX, sr.screenY);
        }
      }
      ctx.stroke();
    }

    // Stars
    for (const sr of this.renderCache) {
      const { screenX: x, screenY: y, screenSize: size, twinkle, star } = sr;

      // Cull offscreen
      if (x < -20 || x > w + 20 || y < -20 || y > h + 20) continue;

      const radius = Math.max(1, size * 1.5);
      const alpha = twinkle;

      // Glow
      if (radius > 2) {
        const grad = ctx.createRadialGradient(x, y, 0, x, y, radius * 3);
        grad.addColorStop(0, star.color + Math.round(alpha * 40).toString(16).padStart(2, '0'));
        grad.addColorStop(1, star.color + '00');
        ctx.fillStyle = grad;
        ctx.fillRect(x - radius * 3, y - radius * 3, radius * 6, radius * 6);
      }

      // Core
      ctx.globalAlpha = alpha;
      ctx.fillStyle = star.color;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;

      // Hovered star highlight
      if (this.hoveredStar?.id === star.id) {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(x, y, radius + 4, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Labels at high zoom
      if (this.camera.zoom > 1.5 && size > 1.5) {
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.font = '10px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(star.label.slice(0, 20), x, y + radius + 12);
      }
    }
  }

  /* ---- Private: Events ---- */

  private hitTest(clientX: number, clientY: number): Star | null {
    const rect = this.canvas.getBoundingClientRect();
    const mx = clientX - rect.left;
    const my = clientY - rect.top;

    let closest: StarRender | null = null;
    let closestDist = 20; // max click distance

    for (const sr of this.renderCache) {
      const dx = sr.screenX - mx;
      const dy = sr.screenY - my;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < closestDist) {
        closestDist = dist;
        closest = sr;
      }
    }

    return closest?.star ?? null;
  }

  private onPointerDown = (e: PointerEvent) => {
    this.dragging = true;
    this.dragStart = { x: e.clientX, y: e.clientY };
    this.canvas.setPointerCapture(e.pointerId);
  };

  private onPointerMove = (e: PointerEvent) => {
    if (this.dragging) {
      const dx = (e.clientX - this.dragStart.x) / this.camera.zoom;
      const dy = (e.clientY - this.dragStart.y) / this.camera.zoom;
      this.camera.targetX -= dx;
      this.camera.targetY -= dy;
      this.dragStart = { x: e.clientX, y: e.clientY };
      return;
    }

    const star = this.hitTest(e.clientX, e.clientY);
    if (star !== this.hoveredStar) {
      this.hoveredStar = star;
      this.onStarHover?.(star);
      this.canvas.style.cursor = star ? 'pointer' : 'grab';
    }
  };

  private onPointerUp = (e: PointerEvent) => {
    if (this.dragging) {
      this.dragging = false;
      // Check if it was a click (minimal movement)
      const dx = Math.abs(e.clientX - this.dragStart.x);
      const dy = Math.abs(e.clientY - this.dragStart.y);
      if (dx < 5 && dy < 5) {
        const star = this.hitTest(e.clientX, e.clientY);
        if (star) this.onStarClick?.(star);
      }
    }
  };

  private onWheel = (e: WheelEvent) => {
    e.preventDefault();
    const delta = -e.deltaY * 0.001;
    this.camera.targetZoom = Math.max(0.2, Math.min(5, this.camera.targetZoom + delta * this.camera.targetZoom));
  };

  private setupEvents(): void {
    this.canvas.addEventListener('pointerdown', this.onPointerDown);
    this.canvas.addEventListener('pointermove', this.onPointerMove);
    this.canvas.addEventListener('pointerup', this.onPointerUp);
    this.canvas.addEventListener('wheel', this.onWheel, { passive: false });
  }

  private removeEvents(): void {
    this.canvas.removeEventListener('pointerdown', this.onPointerDown);
    this.canvas.removeEventListener('pointermove', this.onPointerMove);
    this.canvas.removeEventListener('pointerup', this.onPointerUp);
    this.canvas.removeEventListener('wheel', this.onWheel);
  }
}
