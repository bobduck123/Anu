'use client';

import {
  useRef,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from 'react';
import gsap from 'gsap';
import { Heart, MessageCircle, Share2, MapPin, Plus, X } from 'lucide-react';
import type {
  CommunityPost,
  SortMode,
  ImagePosition,
  ImageSize,
  PostLayout,
} from '@/data/adapters/communityAdapter';

/* -------------------------------------------------------------------------- */
/*  GSAP plugin registration (client-only)                                    */
/* -------------------------------------------------------------------------- */

let pluginsRegistered = false;

type DraggableInstance = {
  kill: () => void;
};

type DraggablePlugin = {
  create: (
    target: HTMLElement,
    vars: {
      type: string;
      bounds: { minX: number; maxX: number; minY: number; maxY: number };
      edgeResistance: number;
      inertia: boolean;
      throwProps: {
        x: { velocity: string; resistance: number };
        y: { velocity: string; resistance: number };
      };
      onDragStart: () => void;
      onDrag: () => void;
      onDragEnd: () => void;
    }
  ) => DraggableInstance[];
};

type FlipPlugin = {
  fit: (
    fromElement: HTMLElement,
    toElement: HTMLElement,
    vars: {
      duration: number;
      ease: string;
      absolute: boolean;
      onComplete?: () => void;
    }
  ) => unknown;
};

type GsapAllModule = {
  Draggable?: DraggablePlugin;
  Flip?: FlipPlugin;
  default?: {
    Draggable?: DraggablePlugin;
    Flip?: FlipPlugin;
  };
};

type GsapWithPlugins = typeof gsap & {
  Draggable?: DraggablePlugin;
  Flip?: FlipPlugin;
};

type GalleryWindow = Window & {
  Draggable?: DraggablePlugin;
  Flip?: FlipPlugin;
};

const getDraggablePlugin = (): DraggablePlugin | undefined => {
  if (typeof window === 'undefined') return undefined;
  const win = window as GalleryWindow;
  const gsapCore = gsap as GsapWithPlugins;
  return win.Draggable ?? gsapCore.Draggable;
};

const getFlipPlugin = (): FlipPlugin | undefined => {
  if (typeof window === 'undefined') return undefined;
  const win = window as GalleryWindow;
  const gsapCore = gsap as GsapWithPlugins;
  return win.Flip ?? gsapCore.Flip;
};

async function ensurePlugins() {
  if (pluginsRegistered || typeof window === 'undefined') return;
  const all = (await import(/* webpackIgnore: true */ 'gsap/all')) as GsapAllModule;
  const Draggable = all.Draggable ?? all.default?.Draggable;
  const Flip = all.Flip ?? all.default?.Flip;
  // Register whatever we got — gsap/all auto-registers most plugins
  if (Draggable) gsap.registerPlugin(Draggable);
  if (Flip) gsap.registerPlugin(Flip);
  pluginsRegistered = true;
}

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

export interface DraggableGalleryProps {
  posts: CommunityPost[];
  sortMode: SortMode;
  onSortChange: (mode: SortMode) => void;
  className?: string;
}

interface GridItem {
  post: CommunityPost;
  row: number;
  col: number;
  baseX: number;
  baseY: number;
  element: HTMLDivElement | null;
}

/* -------------------------------------------------------------------------- */
/*  Sort config                                                               */
/* -------------------------------------------------------------------------- */

const SORT_OPTIONS: { mode: SortMode; label: string }[] = [
  { mode: 'new', label: 'NEW' },
  { mode: 'trending', label: 'TRENDING' },
  { mode: 'near-me', label: 'NEAR ME' },
];

/* -------------------------------------------------------------------------- */
/*  Constants                                                                 */
/* -------------------------------------------------------------------------- */

const ITEM_SIZE = 320;
const ZOOM_LEVELS = [0.3, 0.6, 1.0] as const;
const ZOOM_LABELS = ['ZOOM OUT', 'NORMAL', 'ZOOM IN', 'FIT'] as const;

function gapForZoom(zoom: number): number {
  if (zoom <= 0.3) return 64;
  if (zoom <= 0.6) return 32;
  return 16;
}

/* -------------------------------------------------------------------------- */
/*  Colour & helper utilities                                                 */
/* -------------------------------------------------------------------------- */

const AVATAR_COLORS = [
  '#4f7942', '#6b8e6b', '#2e8b57', '#3b7a57', '#5f9ea0',
  '#4682b4', '#6a5acd', '#7b68ee', '#9370db', '#db7093',
];

function avatarColor(name: string): string {
  return AVATAR_COLORS[(name.charCodeAt(0) || 0) % AVATAR_COLORS.length];
}

const TAG_COLORS: Record<string, string> = {
  'mutual-aid': 'bg-emerald-500/20 text-emerald-300',
  garden: 'bg-green-500/20 text-green-300',
  skills: 'bg-blue-500/20 text-blue-300',
  events: 'bg-purple-500/20 text-purple-300',
  relief: 'bg-red-500/20 text-red-300',
  education: 'bg-amber-500/20 text-amber-300',
  marketplace: 'bg-cyan-500/20 text-cyan-300',
  governance: 'bg-indigo-500/20 text-indigo-300',
  impact: 'bg-rose-500/20 text-rose-300',
  stories: 'bg-orange-500/20 text-orange-300',
};

function tagClass(tag: string): string {
  return TAG_COLORS[tag] ?? 'bg-white/10 text-white/70';
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

/* -------------------------------------------------------------------------- */
/*  MiniLayoutPreview — tiny rectangle showing image vs content position      */
/* -------------------------------------------------------------------------- */

function MiniLayoutPreview({
  position,
  size,
  selected,
  onClick,
}: {
  position: ImagePosition;
  size: ImageSize;
  selected: boolean;
  onClick: () => void;
}) {
  const ratio = size / 100;
  const isHorizontal = position === 'left' || position === 'right';
  const imgFirst = position === 'left' || position === 'top';

  const imgBlock = (
    <div
      className="bg-white/40 rounded-[2px]"
      style={{
        [isHorizontal ? 'width' : 'height']: `${ratio * 100}%`,
        [isHorizontal ? 'height' : 'width']: '100%',
      }}
    />
  );
  const contentBlock = (
    <div
      className="bg-white/15 rounded-[2px]"
      style={{
        [isHorizontal ? 'width' : 'height']: `${(1 - ratio) * 100}%`,
        [isHorizontal ? 'height' : 'width']: '100%',
      }}
    />
  );

  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        w-12 h-12 rounded border-2 p-0.5 flex transition-colors
        ${isHorizontal ? 'flex-row' : 'flex-col'}
        ${selected ? 'border-white' : 'border-white/20 hover:border-white/50'}
      `}
    >
      {imgFirst ? (
        <>
          {imgBlock}
          {contentBlock}
        </>
      ) : (
        <>
          {contentBlock}
          {imgBlock}
        </>
      )}
    </button>
  );
}

/* -------------------------------------------------------------------------- */
/*  CreatePostModal                                                           */
/* -------------------------------------------------------------------------- */

function CreatePostModal({ onClose }: { onClose: () => void }) {
  const [content, setContent] = useState('');
  const [layout, setLayout] = useState<PostLayout>({ imagePosition: 'left', imageSize: 50 });
  const backdropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const positions: ImagePosition[] = ['left', 'right', 'top', 'bottom'];
  const sizes: ImageSize[] = [25, 33, 50];

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-[60] flex items-center justify-center"
      onClick={(e) => { if (e.target === backdropRef.current) onClose(); }}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div className="relative w-full max-w-md mx-4 rounded-xl bg-[#1a1a1a] border border-white/10 p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-white font-semibold text-lg">New Post</h2>
          <button onClick={onClose} className="text-white/50 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="What's happening in your community?"
          rows={4}
          className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white text-sm placeholder:text-white/30 resize-none focus:outline-none focus:border-white/30"
        />

        {/* Image upload placeholder */}
        <div className="border-2 border-dashed border-white/20 rounded-lg p-4 text-center">
          <p className="text-white/40 text-sm">Click to upload cover image</p>
        </div>

        {/* Layout picker */}
        <div>
          <p className="text-white/60 text-xs uppercase tracking-wider mb-2 font-mono">Image Layout</p>
          <div className="grid grid-cols-4 gap-2">
            {positions.map((pos) =>
              sizes.map((sz) => (
                <MiniLayoutPreview
                  key={`${pos}-${sz}`}
                  position={pos}
                  size={sz}
                  selected={layout.imagePosition === pos && layout.imageSize === sz}
                  onClick={() => setLayout({ imagePosition: pos, imageSize: sz })}
                />
              ))
            )}
          </div>
        </div>

        {/* Submit */}
        <button
          type="button"
          className="w-full py-2.5 rounded-lg bg-white text-black font-semibold text-sm hover:bg-white/90 transition-colors"
        >
          Post
        </button>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  DraggableGallery                                                          */
/* -------------------------------------------------------------------------- */

export function DraggableGallery({
  posts,
  sortMode,
  onSortChange,
  className = '',
}: DraggableGalleryProps) {
  /* ---- Refs ---- */
  const viewportRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const draggableRef = useRef<DraggableInstance | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const itemRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const didDragRef = useRef(false);
  const introPlayedRef = useRef(false);
  const zoomAnimatingRef = useRef(false);

  /* ---- State ---- */
  const [currentZoom, setCurrentZoom] = useState(0.6);
  const [selectedPost, setSelectedPost] = useState<CommunityPost | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [ready, setReady] = useState(false);

  /* ---- Grid layout computation ---- */
  const gridData = useMemo(() => {
    const count = posts.length;
    // Target ~16:9 ratio
    const cols = Math.ceil(Math.sqrt(count * (16 / 9)));
    const rows = Math.ceil(count / cols);
    return { cols, rows };
  }, [posts.length]);

  const gridItems = useMemo((): GridItem[] => {
    const gap = gapForZoom(currentZoom);
    return posts.map((post, i) => {
      const col = i % gridData.cols;
      const row = Math.floor(i / gridData.cols);
      return {
        post,
        row,
        col,
        baseX: col * (ITEM_SIZE + gap),
        baseY: row * (ITEM_SIZE + gap),
        element: null,
      };
    });
  }, [posts, gridData.cols, currentZoom]);

  const totalWidth = useMemo(() => {
    const gap = gapForZoom(currentZoom);
    return gridData.cols * ITEM_SIZE + (gridData.cols - 1) * gap;
  }, [gridData.cols, currentZoom]);

  const totalHeight = useMemo(() => {
    const gap = gapForZoom(currentZoom);
    return gridData.rows * ITEM_SIZE + (gridData.rows - 1) * gap;
  }, [gridData.rows, currentZoom]);

  /* ---- Plugin init ---- */
  useEffect(() => {
    ensurePlugins().then(() => setReady(true));
  }, []);

  /* ---- Calculate bounds ---- */
  const calculateBounds = useCallback(() => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const scaledW = totalWidth * currentZoom;
    const scaledH = totalHeight * currentZoom;
    return {
      minX: Math.min(0, vw - scaledW - 100),
      maxX: 100,
      minY: Math.min(0, vh - scaledH - 100),
      maxY: 100,
    };
  }, [totalWidth, totalHeight, currentZoom]);

  const createDraggable = useCallback(
    (Draggable: DraggablePlugin, canvas: HTMLElement, bounds: ReturnType<typeof calculateBounds>) => {
      draggableRef.current = Draggable.create(canvas, {
        type: 'x,y',
        bounds: {
          minX: bounds.minX,
          maxX: bounds.maxX,
          minY: bounds.minY,
          maxY: bounds.maxY,
        },
        edgeResistance: 0.8,
        inertia: true,
        throwProps: {
          x: { velocity: 'auto', resistance: 300 },
          y: { velocity: 'auto', resistance: 300 },
        },
        onDragStart: () => {
          didDragRef.current = false;
          document.body.style.cursor = 'grabbing';
        },
        onDrag: () => {
          didDragRef.current = true;
        },
        onDragEnd: () => {
          document.body.style.cursor = '';
        },
      })[0];
    },
    []
  );

  /* ---- Init Draggable ---- */
  const initDraggable = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || typeof window === 'undefined') return;

    if (draggableRef.current) {
      draggableRef.current.kill();
    }

    const bounds = calculateBounds();

    // Draggable is registered globally via ensurePlugins()
    const Draggable = getDraggablePlugin();
    if (!Draggable) return;
    createDraggable(Draggable, canvas, bounds);
  }, [calculateBounds, createDraggable]);

  /* ---- IntersectionObserver fading ---- */
  useEffect(() => {
    if (!ready) return;

    observerRef.current?.disconnect();

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (zoomAnimatingRef.current) return;
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.remove('out-of-view');
            gsap.to(entry.target, { opacity: 1, duration: 0.6, ease: 'power2.out' });
          } else {
            entry.target.classList.add('out-of-view');
            gsap.to(entry.target, { opacity: 0.1, duration: 0.6, ease: 'power2.out' });
          }
        });
      },
      { root: null, threshold: 0.15, rootMargin: '10%' }
    );

    itemRefs.current.forEach((el) => observerRef.current!.observe(el));

    return () => observerRef.current?.disconnect();
  }, [ready, posts, currentZoom]);

  /* ---- Intro animation ---- */
  useEffect(() => {
    if (!ready || introPlayedRef.current || prefersReducedMotion()) return;
    const canvas = canvasRef.current;
    const viewport = viewportRef.current;
    if (!canvas || !viewport) return;

    introPlayedRef.current = true;

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const centerX = vw / 2 - ITEM_SIZE / 2;
    const centerY = vh / 2 - ITEM_SIZE / 2;

    // Position viewport visible
    gsap.set(viewport, { opacity: 1 });

    // Set initial scale
    gsap.set(canvas, { scale: currentZoom, transformOrigin: '0 0' });

    // Stack all tiles at center
    const elements: HTMLDivElement[] = [];
    itemRefs.current.forEach((el) => {
      elements.push(el);
    });

    elements.forEach((el, i) => {
      gsap.set(el, {
        left: centerX / currentZoom,
        top: centerY / currentZoom,
        scale: 0.8,
        opacity: 0,
        zIndex: elements.length - i,
      });
    });

    // Animate to grid positions
    const gap = gapForZoom(currentZoom);
    gsap.to(elements, {
      duration: 0.2,
      left: (_index: number, el: HTMLDivElement) => {
        const postId = el.getAttribute('data-post-id');
        const item = gridItems.find((g) => g.post.id === postId);
        return item ? item.col * (ITEM_SIZE + gap) : 0;
      },
      top: (_index: number, el: HTMLDivElement) => {
        const postId = el.getAttribute('data-post-id');
        const item = gridItems.find((g) => g.post.id === postId);
        return item ? item.row * (ITEM_SIZE + gap) : 0;
      },
      scale: 1,
      opacity: 1,
      ease: 'power2.out',
      stagger: {
        amount: 1.5,
        from: 'start',
        grid: [gridData.rows, gridData.cols],
      },
      onComplete: () => {
        // Center the canvas
        const scaledW = totalWidth * currentZoom;
        const scaledH = totalHeight * currentZoom;
        const startX = (vw - scaledW) / 2;
        const startY = (vh - scaledH) / 2;
        gsap.to(canvas, {
          x: Math.min(startX, 100),
          y: Math.min(startY, 100),
          duration: 0.6,
          ease: 'power2.out',
          onComplete: () => initDraggable(),
        });
      },
    });
  }, [ready, gridItems, gridData, currentZoom, totalWidth, totalHeight, initDraggable]);

  /* ---- Zoom system ---- */
  const setZoom = useCallback(
    (level: number) => {
      if (zoomAnimatingRef.current) return;
      zoomAnimatingRef.current = true;
      const canvas = canvasRef.current;
      if (!canvas) { zoomAnimatingRef.current = false; return; }

      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const newGap = gapForZoom(level);
      const oldGap = gapForZoom(currentZoom);

      // Custom ease values from reference
      const smoothEase = 'power4.inOut'; // approximation of .87,0,.13,1

      // Phase 1: center the grid
      const scaledW = totalWidth * currentZoom;
      const scaledH = totalHeight * currentZoom;
      const centerX = (vw - scaledW) / 2;
      const centerY = (vh - scaledH) / 2;

      gsap.to(canvas, {
        duration: 0.6,
        x: centerX,
        y: centerY,
        ease: 'power2.out',
        onComplete: () => {
          // Phase 2: reposition tiles if gap changed
          if (newGap !== oldGap) {
            itemRefs.current.forEach((el) => {
              const postId = el.getAttribute('data-post-id');
              const idx = posts.findIndex((p) => p.id === postId);
              if (idx === -1) return;
              const col = idx % gridData.cols;
              const row = Math.floor(idx / gridData.cols);
              gsap.to(el, {
                duration: 1.2,
                left: col * (ITEM_SIZE + newGap),
                top: row * (ITEM_SIZE + newGap),
                ease: smoothEase,
              });
            });
          }

          // Phase 3: scale + recenter
          const newTotalW = gridData.cols * ITEM_SIZE + (gridData.cols - 1) * newGap;
          const newTotalH = gridData.rows * ITEM_SIZE + (gridData.rows - 1) * newGap;
          const newScaledW = newTotalW * level;
          const newScaledH = newTotalH * level;
          const finalX = (vw - newScaledW) / 2;
          const finalY = (vh - newScaledH) / 2;

          gsap.to(canvas, {
            duration: 1.2,
            scale: level,
            x: Math.min(finalX, 100),
            y: Math.min(finalY, 100),
            ease: smoothEase,
            onComplete: () => {
              setCurrentZoom(level);
              zoomAnimatingRef.current = false;
              // Re-create draggable with new bounds
              setTimeout(() => initDraggable(), 50);
            },
          });
        },
      });
    },
    [currentZoom, totalWidth, totalHeight, posts, gridData, initDraggable]
  );

  const autoFitZoom = useCallback(() => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const gap = gapForZoom(0.6);
    const gridW = gridData.cols * ITEM_SIZE + (gridData.cols - 1) * gap;
    const gridH = gridData.rows * ITEM_SIZE + (gridData.rows - 1) * gap;
    const fitZoom = Math.min(vw / gridW, vh / gridH, 1.0);
    const clamped = Math.max(0.1, Math.min(fitZoom, 1.0));
    setZoom(clamped);
  }, [gridData, setZoom]);

  /* ---- Tile click → split-screen detail ---- */
  const handleTileClick = useCallback(
    (post: CommunityPost, el: HTMLDivElement) => {
      if (didDragRef.current) return;
      setSelectedPost(post);

      // Get tile rect for the Flip source
      const rect = el.getBoundingClientRect();
      const imgEl = el.querySelector('img') as HTMLImageElement | null;

      // Create scaling overlay
      const overlay = document.createElement('div');
      overlay.id = 'gallery-scaling-overlay';
      overlay.style.cssText = `
        position: fixed;
        left: ${rect.left}px;
        top: ${rect.top}px;
        width: ${rect.width}px;
        height: ${rect.height}px;
        z-index: 55;
        overflow: hidden;
        pointer-events: none;
      `;
      if (imgEl) {
        const clonedImg = imgEl.cloneNode(true) as HTMLImageElement;
        clonedImg.style.cssText = 'width:100%;height:100%;object-fit:cover;';
        overlay.appendChild(clonedImg);
      }
      document.body.appendChild(overlay);

      // Hide original tile image
      if (imgEl) gsap.set(imgEl, { opacity: 0 });

      // Show split container and animate
      const splitContainer = document.getElementById('gallery-split-screen');
      const zoomTarget = document.getElementById('gallery-zoom-target');
      if (!splitContainer || !zoomTarget) {
        overlay.remove();
        if (imgEl) gsap.set(imgEl, { opacity: 1 });
        return;
      }

      gsap.set(splitContainer, { opacity: 1, pointerEvents: 'all' });

      try {
        const Flip = getFlipPlugin();
        if (!Flip) throw new Error('no Flip');

        Flip.fit(overlay, zoomTarget, {
          duration: 1.2,
          ease: 'power4.inOut',
          absolute: true,
          onComplete: () => {
            // Animate text in
            const textEls = splitContainer.querySelectorAll('[data-detail-text]');
            gsap.fromTo(
              textEls,
              { y: 40, opacity: 0, clipPath: 'inset(100% 0 0 0)' },
              {
                y: 0,
                opacity: 1,
                clipPath: 'inset(0% 0 0 0)',
                duration: 0.8,
                stagger: 0.1,
                ease: 'power4.inOut',
              }
            );

            // Show close button
            const closeBtn = document.getElementById('gallery-close-btn');
            if (closeBtn) {
              gsap.to(closeBtn, { opacity: 1, x: 0, duration: 0.6, ease: 'power2.out' });
            }
          },
        });
      } catch {
        // Fallback without Flip — just animate directly
        gsap.to(overlay, {
          duration: 1.2,
          left: zoomTarget.getBoundingClientRect().left,
          top: zoomTarget.getBoundingClientRect().top,
          width: zoomTarget.getBoundingClientRect().width,
          height: zoomTarget.getBoundingClientRect().height,
          ease: 'power4.inOut',
        });
      }
    },
    []
  );

  /* ---- Close detail ---- */
  const closeDetail = useCallback(() => {
    const overlay = document.getElementById('gallery-scaling-overlay');
    const splitContainer = document.getElementById('gallery-split-screen');
    const closeBtn = document.getElementById('gallery-close-btn');

    if (!overlay || !selectedPost) {
      setSelectedPost(null);
      return;
    }

    // Hide text
    const textEls = splitContainer?.querySelectorAll('[data-detail-text]');
    if (textEls) {
      gsap.to(textEls, { y: -20, opacity: 0, duration: 0.3, stagger: 0.05 });
    }
    if (closeBtn) {
      gsap.to(closeBtn, { opacity: 0, x: 40, duration: 0.3 });
    }

    // Find original tile
    const tileEl = itemRefs.current.get(selectedPost.id);
    if (!tileEl) {
      overlay.remove();
      if (splitContainer) gsap.set(splitContainer, { opacity: 0, pointerEvents: 'none' });
      setSelectedPost(null);
      return;
    }

    const rect = tileEl.getBoundingClientRect();

    try {
      const Flip = getFlipPlugin();
      if (!Flip) throw new Error('no Flip');

      Flip.fit(overlay, tileEl, {
        duration: 1.2,
        ease: 'power4.inOut',
        absolute: true,
        onComplete: () => {
          const imgEl = tileEl.querySelector('img');
          if (imgEl) gsap.set(imgEl, { opacity: 1 });
          overlay.remove();
          if (splitContainer) gsap.set(splitContainer, { opacity: 0, pointerEvents: 'none' });
          setSelectedPost(null);
        },
      });
    } catch {
      gsap.to(overlay, {
        duration: 1.2,
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
        ease: 'power4.inOut',
        onComplete: () => {
          const imgEl = tileEl.querySelector('img');
          if (imgEl) gsap.set(imgEl, { opacity: 1 });
          overlay.remove();
          if (splitContainer) gsap.set(splitContainer, { opacity: 0, pointerEvents: 'none' });
          setSelectedPost(null);
        },
      });
    }
  }, [selectedPost]);

  /* ---- Escape key to close ---- */
  useEffect(() => {
    if (!selectedPost) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeDetail();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [selectedPost, closeDetail]);

  /* ---- Sort animation ---- */
  useEffect(() => {
    if (!ready || !introPlayedRef.current) return;
    const gap = gapForZoom(currentZoom);
    itemRefs.current.forEach((el) => {
      const postId = el.getAttribute('data-post-id');
      const idx = posts.findIndex((p) => p.id === postId);
      if (idx === -1) return;
      const col = idx % gridData.cols;
      const row = Math.floor(idx / gridData.cols);
      gsap.to(el, {
        duration: 0.8,
        left: col * (ITEM_SIZE + gap),
        top: row * (ITEM_SIZE + gap),
        ease: 'power2.inOut',
      });
    });
  }, [posts, sortMode, ready, currentZoom, gridData.cols]);

  /* ---- Detail layout helpers ---- */
  const detailLayout = selectedPost?.layout ?? { imagePosition: 'left', imageSize: 50 };
  const isDetailHorizontal = detailLayout.imagePosition === 'left' || detailLayout.imagePosition === 'right';
  const imgSizePct = `${detailLayout.imageSize}${isDetailHorizontal ? 'vw' : 'vh'}`;
  const contentSizePct = `${100 - detailLayout.imageSize}${isDetailHorizontal ? 'vw' : 'vh'}`;
  const isReversed = detailLayout.imagePosition === 'right' || detailLayout.imagePosition === 'bottom';

  /* ---- Render ---- */
  return (
    <div className={`w-full h-full relative ${className}`}>
      {/* Viewport */}
      <div
        ref={viewportRef}
        className="fixed inset-0 overflow-hidden"
        style={{ zIndex: 1, opacity: 0, cursor: 'grab' }}
      >
        {/* Canvas wrapper */}
        <div
          ref={canvasRef}
          className="absolute top-0 left-0"
          style={{
            transformOrigin: '0 0',
            willChange: 'transform',
            isolation: 'isolate',
            width: totalWidth,
            height: totalHeight,
          }}
        >
          {/* Grid container */}
          <div ref={gridRef} className="relative" style={{ width: totalWidth, height: totalHeight }}>
            {gridItems.map((item) => {
              const gap = gapForZoom(currentZoom);
              return (
                <div
                  key={item.post.id}
                  data-post-id={item.post.id}
                  data-gallery-tile
                  ref={(el) => {
                    if (el) itemRefs.current.set(item.post.id, el);
                    else itemRefs.current.delete(item.post.id);
                  }}
                  onClick={() => {
                    const el = itemRefs.current.get(item.post.id);
                    if (el) handleTileClick(item.post, el);
                  }}
                  className="absolute cursor-pointer"
                  style={{
                    width: ITEM_SIZE,
                    height: ITEM_SIZE,
                    left: item.col * (ITEM_SIZE + gap),
                    top: item.row * (ITEM_SIZE + gap),
                    willChange: 'transform, opacity',
                    transition: 'opacity 0.6s ease',
                  }}
                >
                  {/* Tile image */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.post.coverImage}
                    alt=""
                    loading="lazy"
                    className="w-full h-full object-cover"
                    draggable={false}
                  />
                  {/* Tile overlay on hover */}
                  <div className="absolute inset-0 bg-black/0 hover:bg-black/30 transition-colors duration-300 flex items-end p-3 opacity-0 hover:opacity-100">
                    <div className="text-white">
                      <p className="text-xs font-semibold truncate">{item.post.author.pseudonym}</p>
                      <p className="text-[10px] text-white/60">{timeAgo(item.post.createdAt)}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Vignette */}
      <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 2 }}>
        <div
          className="absolute inset-0"
          style={{
            mixBlendMode: 'overlay',
            background: 'linear-gradient(to bottom, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.5) 20%, transparent 40%)',
          }}
        />
      </div>

      {/* Sort bar — top-left */}
      <div className="fixed top-6 left-6 flex items-center gap-1 z-10">
        {SORT_OPTIONS.map(({ mode, label }) => (
          <button
            key={mode}
            type="button"
            onClick={() => onSortChange(mode)}
            className={`
              px-3 py-1.5 text-[11px] font-mono uppercase tracking-wider rounded transition-colors
              ${
                sortMode === mode
                  ? 'bg-white/20 text-white'
                  : 'text-white/40 hover:text-white/60'
              }
            `}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Zoom controls — bottom-center */}
      <div
        className="fixed bottom-5 left-1/2 -translate-x-1/2 flex items-stretch gap-0 z-10"
        style={{ opacity: ready ? 1 : 0, transition: 'opacity 0.6s ease' }}
      >
        {/* Percentage indicator */}
        <div
          className="flex items-center px-5 rounded-l text-sm font-mono"
          style={{
            backgroundColor: '#f0f0f0',
            backgroundImage: 'radial-gradient(rgba(0,0,0,0.015) 1px, transparent 0)',
            backgroundSize: '0.44em 0.44em',
            color: '#000',
          }}
        >
          {Math.round(currentZoom * 100)}%
        </div>

        {/* Zoom buttons */}
        <div
          className="flex items-center gap-5 px-5 rounded-r"
          style={{
            backgroundColor: '#222',
            backgroundImage: 'radial-gradient(rgba(255,255,255,0.015) 1px, transparent 0)',
            backgroundSize: '0.44em 0.44em',
          }}
        >
          {ZOOM_LEVELS.map((level, i) => (
            <button
              key={level}
              type="button"
              onClick={() => setZoom(level)}
              className={`
                relative text-[11px] font-mono uppercase tracking-wider py-2.5 px-2.5
                transition-colors duration-300 group
                ${currentZoom === level ? 'text-[#f0f0f0]' : 'text-[#666] hover:text-[#999]'}
              `}
            >
              <span
                className="absolute left-[-8px] top-1/2 -translate-y-1/2 w-[5px] h-[5px] rounded-full bg-[#f0f0f0] opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              />
              {ZOOM_LABELS[i]}
            </button>
          ))}
          <button
            type="button"
            onClick={autoFitZoom}
            className="
              relative text-[11px] font-mono uppercase tracking-wider py-2.5 px-2.5
              text-[#666] hover:text-[#999] transition-colors duration-300 group
            "
          >
            <span
              className="absolute left-[-8px] top-1/2 -translate-y-1/2 w-[5px] h-[5px] rounded-full bg-[#f0f0f0] opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            />
            FIT
          </button>
        </div>
      </div>

      {/* Create post button — bottom-right */}
      <button
        type="button"
        onClick={() => setShowCreate(true)}
        className="fixed bottom-5 right-5 z-10 w-12 h-12 rounded-full bg-white text-black flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
        aria-label="Create post"
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* ---- Split-screen detail ---- */}
      <div
        id="gallery-split-screen"
        className="fixed inset-0 flex"
        style={{
          zIndex: 50,
          opacity: 0,
          pointerEvents: 'none',
          flexDirection: isDetailHorizontal ? 'row' : 'column',
        }}
      >
        {/* Image panel */}
        <div
          className="relative flex items-center justify-center cursor-pointer"
          onClick={closeDetail}
          style={{
            width: isDetailHorizontal ? imgSizePct : '100%',
            height: isDetailHorizontal ? '100%' : imgSizePct,
            background: 'rgba(0,0,0,0.6)',
            order: isReversed ? 1 : 0,
          }}
        >
          <div
            id="gallery-zoom-target"
            style={{
              width: isDetailHorizontal ? '80%' : '60%',
              height: isDetailHorizontal ? '80%' : '80%',
            }}
          />
        </div>

        {/* Content panel */}
        <div
          className="relative flex flex-col justify-center overflow-y-auto"
          onClick={closeDetail}
          style={{
            width: isDetailHorizontal ? contentSizePct : '100%',
            height: isDetailHorizontal ? '100%' : contentSizePct,
            background: 'rgba(0,0,0,0.6)',
            order: isReversed ? 0 : 1,
          }}
        >
          {selectedPost && (
            <div className="px-8 py-10 lg:px-12 space-y-6 max-w-xl" onClick={(e) => e.stopPropagation()}>
              {/* Number */}
              <p data-detail-text className="text-white/30 text-xs font-mono uppercase tracking-widest">
                {selectedPost.id.replace('post-', '#')}
              </p>

              {/* Author as title */}
              <h1 data-detail-text className="text-white text-3xl lg:text-4xl font-semibold leading-tight">
                {selectedPost.author.pseudonym}
              </h1>

              {/* Content */}
              <p data-detail-text className="text-white/70 text-sm leading-relaxed whitespace-pre-wrap">
                {selectedPost.content}
              </p>

              {/* Tags */}
              {selectedPost.tags.length > 0 && (
                <div data-detail-text className="flex flex-wrap gap-2">
                  {selectedPost.tags.map((tag) => (
                    <span
                      key={tag}
                      className={`text-[10px] font-mono uppercase px-2.5 py-1 rounded ${tagClass(tag)}`}
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Stats */}
              <div data-detail-text className="flex items-center gap-6 text-white/50">
                <span className="flex items-center gap-1.5 text-sm">
                  <Heart className={`w-4 h-4 ${selectedPost.liked ? 'fill-red-500 text-red-500' : ''}`} />
                  {selectedPost.likes}
                </span>
                <span className="flex items-center gap-1.5 text-sm">
                  <MessageCircle className="w-4 h-4" />
                  {selectedPost.comments}
                </span>
                <span className="flex items-center gap-1.5 text-sm">
                  <Share2 className="w-4 h-4" />
                  {selectedPost.shares}
                </span>
                {selectedPost.microcosm && (
                  <span className="flex items-center gap-1 text-sm ml-auto">
                    <MapPin className="w-3.5 h-3.5" />
                    {selectedPost.microcosm}
                  </span>
                )}
              </div>

              {/* Meta */}
              <div data-detail-text className="flex items-center gap-3 pt-2">
                <span
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-semibold"
                  style={{ backgroundColor: avatarColor(selectedPost.author.pseudonym) }}
                >
                  {selectedPost.author.pseudonym.charAt(0)}
                </span>
                <div>
                  <p className="text-white/60 text-xs capitalize">{selectedPost.author.role}</p>
                  <p className="text-white/40 text-xs">{timeAgo(selectedPost.createdAt)}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Close button — right edge arrow */}
      <button
        id="gallery-close-btn"
        onClick={closeDetail}
        className="fixed top-1/2 right-5 -translate-y-1/2 flex items-center justify-center"
        style={{ zIndex: 55, opacity: 0, transform: 'translate(40px, -50%)', pointerEvents: selectedPost ? 'auto' : 'none' }}
        aria-label="Close detail"
      >
        <svg width="64" height="64" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ transform: 'rotate(180deg)' }}>
          <path d="M7.89873 16L6.35949 14.48L11.8278 9.08H0V6.92H11.8278L6.35949 1.52L7.89873 0L16 8L7.89873 16Z" fill="white" />
        </svg>
      </button>

      {/* Create post modal */}
      {showCreate && <CreatePostModal onClose={() => setShowCreate(false)} />}
    </div>
  );
}
