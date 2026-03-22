'use client';

import {
  useRef,
  useEffect,
  useLayoutEffect,
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
  disable?: () => void;
  enable?: () => void;
  endDrag?: (...args: unknown[]) => void;
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
  const all = (await import('gsap/all')) as GsapAllModule;
  const draggablePlugin = all.Draggable ?? all.default?.Draggable;
  const flipPlugin = all.Flip ?? all.default?.Flip;
  // Register whichever plugin exports resolved in the current bundle.
  if (draggablePlugin) gsap.registerPlugin(draggablePlugin);
  if (flipPlugin) gsap.registerPlugin(flipPlugin);
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
  showComposer?: boolean;
  showSortBar?: boolean;
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
const ZOOM_ACTIONS = [
  { level: 0.3, label: 'Zoom out', shortLabel: 'Out' },
  { level: 0.6, label: 'Normal', shortLabel: 'Norm' },
  { level: 1.0, label: 'Zoom in', shortLabel: 'In' },
] as const;

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
const TILE_GRADIENTS = [
  ['#16324f', '#0f172a'],
  ['#3f6212', '#14532d'],
  ['#7c2d12', '#431407'],
  ['#5b21b6', '#1e1b4b'],
  ['#0f766e', '#134e4a'],
  ['#9a3412', '#4a044e'],
];

function avatarColor(name: string): string {
  return AVATAR_COLORS[(name.charCodeAt(0) || 0) % AVATAR_COLORS.length];
}

function tileGradient(post: CommunityPost): string {
  const seedSource = post.id || post.author.pseudonym || 'community';
  const seed = Array.from(seedSource).reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const [start, end] = TILE_GRADIENTS[seed % TILE_GRADIENTS.length];
  return `linear-gradient(145deg, ${start} 0%, ${end} 100%)`;
}

function tileEyebrow(post: CommunityPost): string {
  if (post.sourceName) return post.sourceName;
  if (post.tags[0]) return post.tags[0].replace(/-/g, ' ');
  return post.author.role;
}

function tilePlace(post: CommunityPost): string {
  if (post.microcosm) return post.microcosm;
  if (post.sourceName) return 'Trusted source';
  return 'Shared commons';
}

function tileSignalLine(post: CommunityPost): string {
  if (post.sourceName) {
    return `${post.sourceName} / ${tilePlace(post)}`;
  }
  return `${post.author.pseudonym} / ${tilePlace(post)}`;
}

function createDetailPreviewNode(post: CommunityPost, image: HTMLImageElement | null): HTMLElement {
  if (image) {
    const clone = image.cloneNode(true) as HTMLImageElement;
    clone.style.position = 'relative';
    clone.style.left = '0';
    clone.style.top = '0';
    clone.style.width = '100%';
    clone.style.height = '100%';
    clone.style.objectFit = 'cover';
    clone.style.margin = '0';
    clone.style.pointerEvents = 'none';
    return clone;
  }

  const preview = document.createElement('div');
  preview.style.cssText = `
    position: relative;
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    padding: 22px;
    background: ${tileGradient(post)};
    color: white;
    pointer-events: none;
    overflow: hidden;
  `;

  const glow = document.createElement('div');
  glow.style.cssText = `
    position: absolute;
    inset: 0;
    background:
      radial-gradient(circle at top left, rgba(255,255,255,0.22), transparent 42%),
      linear-gradient(180deg, rgba(255,255,255,0.08), rgba(0,0,0,0.12) 40%, rgba(0,0,0,0.45) 100%);
  `;
  preview.appendChild(glow);

  const eyebrow = document.createElement('p');
  eyebrow.textContent = tileEyebrow(post).toUpperCase();
  eyebrow.style.cssText = `
    position: relative;
    margin: 0 0 10px;
    font-size: 10px;
    letter-spacing: 0.22em;
    opacity: 0.7;
  `;
  preview.appendChild(eyebrow);

  const title = document.createElement('h3');
  title.textContent = post.title || post.author.pseudonym;
  title.style.cssText = `
    position: relative;
    margin: 0;
    font-size: 28px;
    line-height: 1.05;
    font-weight: 600;
    max-width: 80%;
  `;
  preview.appendChild(title);

  return preview;
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
  news: 'bg-sky-500/20 text-sky-300',
  opinion: 'bg-fuchsia-500/20 text-fuchsia-300',
  creative: 'bg-teal-500/20 text-teal-300',
  community: 'bg-zinc-200/20 text-zinc-200',
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
  showComposer = false,
  showSortBar = true,
}: DraggableGalleryProps) {
  /* ---- Refs ---- */
  const viewportRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const draggableRef = useRef<DraggableInstance | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const itemRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const splitScreenRef = useRef<HTMLDivElement>(null);
  const zoomTargetRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const didDragRef = useRef(false);
  const introPlayedRef = useRef(false);
  const zoomAnimatingRef = useRef(false);
  const hiddenTileSurfaceRef = useRef<HTMLElement | null>(null);

  /* ---- State ---- */
  const [currentZoom, setCurrentZoom] = useState(0.6);
  const [selectedPost, setSelectedPost] = useState<CommunityPost | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [ready, setReady] = useState(false);
  const [brokenImages, setBrokenImages] = useState<Record<string, boolean>>({});

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
    let cancelled = false;

    const initPlugins = async () => {
      try {
        await ensurePlugins();
      } catch (error) {
        console.error('Failed to initialize community gallery plugins', error);
      } finally {
        if (!cancelled) {
          setReady(true);
        }
      }
    };

    void initPlugins();
    return () => {
      cancelled = true;
    };
  }, []);

  useLayoutEffect(() => {
    if (viewportRef.current) {
      gsap.set(viewportRef.current, { opacity: 0 });
    }
    if (splitScreenRef.current) {
      gsap.set(splitScreenRef.current, { opacity: 0 });
    }
    if (closeButtonRef.current) {
      gsap.set(closeButtonRef.current, { opacity: 0, x: 40 });
    }
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

  useEffect(() => {
    setBrokenImages((prev) => {
      const next: Record<string, boolean> = {};
      posts.forEach((post) => {
        if (prev[post.id]) {
          next[post.id] = true;
        }
      });
      return next;
    });
  }, [posts]);

  /* ---- IntersectionObserver fading ---- */
  useEffect(() => {
    if (!ready) return;

    observerRef.current?.disconnect();
    const viewport = viewportRef.current;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (zoomAnimatingRef.current) return;
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.remove('out-of-view');
            gsap.to(entry.target, {
              opacity: 1,
              scale: 1,
              duration: 0.45,
              ease: 'power2.out',
              overwrite: 'auto',
            });
          } else {
            entry.target.classList.add('out-of-view');
            gsap.to(entry.target, {
              opacity: 0.58,
              scale: 0.985,
              duration: 0.45,
              ease: 'power2.out',
              overwrite: 'auto',
            });
          }
        });
      },
      { root: viewport, threshold: 0.05, rootMargin: '18%' }
    );

    itemRefs.current.forEach((el) => observerRef.current!.observe(el));

    return () => observerRef.current?.disconnect();
  }, [ready, posts, currentZoom]);

  /* ---- Intro animation ---- */
  useEffect(() => {
    if (!ready || introPlayedRef.current) return;
    const canvas = canvasRef.current;
    const viewport = viewportRef.current;
    if (!canvas || !viewport) return;

    if (prefersReducedMotion()) {
      introPlayedRef.current = true;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const scaledW = totalWidth * currentZoom;
      const scaledH = totalHeight * currentZoom;
      gsap.set(viewport, { opacity: 1 });
      gsap.set(canvas, {
        scale: currentZoom,
        x: Math.min((vw - scaledW) / 2, 100),
        y: Math.min((vh - scaledH) / 2, 100),
        transformOrigin: '0 0',
      });
      itemRefs.current.forEach((el) => {
        const postId = el.getAttribute('data-post-id');
        const item = gridItems.find((gridItem) => gridItem.post.id === postId);
        if (!item) return;
        gsap.set(el, {
          left: item.baseX,
          top: item.baseY,
          scale: 1,
          opacity: 1,
        });
      });
      initDraggable();
      return;
    }

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

  useEffect(() => {
    if (!selectedPost) return;
    draggableRef.current?.disable?.();
    draggableRef.current?.endDrag?.();
    return () => {
      draggableRef.current?.enable?.();
    };
  }, [selectedPost]);

  const restoreHiddenTileSurface = useCallback(() => {
    if (!hiddenTileSurfaceRef.current) return;
    gsap.set(hiddenTileSurfaceRef.current, { opacity: 1 });
    hiddenTileSurfaceRef.current = null;
  }, []);

  const revealDetailContent = useCallback((splitContainer: HTMLElement) => {
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

    const closeBtn = closeButtonRef.current;
    if (closeBtn) {
      gsap.to(closeBtn, { opacity: 1, x: 0, duration: 0.6, ease: 'power2.out' });
    }
  }, []);

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
      if (selectedPost) return;
      setSelectedPost(post);

      // Get tile rect for the Flip source
      const rect = el.getBoundingClientRect();
      const imgEl = el.querySelector('img') as HTMLImageElement | null;
      const sourceSurface = (imgEl ?? el) as HTMLElement;

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
      const previewNode = createDetailPreviewNode(post, imgEl);
      previewNode.style.transform = 'none';
      overlay.appendChild(previewNode);
      document.body.appendChild(overlay);

      // Hide the source surface so the animated overlay owns the transition.
      hiddenTileSurfaceRef.current = sourceSurface;
      gsap.set(sourceSurface, { opacity: 0 });

      // Show split container and animate
      const splitContainer = splitScreenRef.current;
      const zoomTarget = zoomTargetRef.current;
      if (!splitContainer || !zoomTarget) {
        overlay.remove();
        restoreHiddenTileSurface();
        setSelectedPost(null);
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
            revealDetailContent(splitContainer);
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
          onComplete: () => {
            revealDetailContent(splitContainer);
          },
        });
      }
    },
    [restoreHiddenTileSurface, revealDetailContent, selectedPost]
  );

  /* ---- Close detail ---- */
  const closeDetail = useCallback(() => {
    const overlay = document.getElementById('gallery-scaling-overlay');
    const splitContainer = splitScreenRef.current;
    const closeBtn = closeButtonRef.current;

    if (!overlay || !selectedPost) {
      restoreHiddenTileSurface();
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
      restoreHiddenTileSurface();
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
          restoreHiddenTileSurface();
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
          restoreHiddenTileSurface();
          overlay.remove();
          if (splitContainer) gsap.set(splitContainer, { opacity: 0, pointerEvents: 'none' });
          setSelectedPost(null);
        },
      });
    }
  }, [restoreHiddenTileSurface, selectedPost]);

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

  const detailImageFailed = selectedPost ? brokenImages[selectedPost.id] : false;

  /* ---- Render ---- */
  return (
    <div className={`w-full h-full relative ${className}`}>
      {/* Viewport */}
      <div
        ref={viewportRef}
        className="fixed inset-0 overflow-hidden"
        style={{ zIndex: 1, cursor: 'grab' }}
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
              const imageFailed = brokenImages[item.post.id];
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
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      const el = itemRefs.current.get(item.post.id);
                      if (el) handleTileClick(item.post, el);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  aria-label={`Open ${item.post.title || item.post.author.pseudonym}`}
                  className="absolute cursor-pointer overflow-hidden rounded-[1.6rem] border border-white/18 bg-[#05070c] shadow-[0_26px_80px_rgba(0,0,0,0.42)] outline-none focus-visible:ring-2 focus-visible:ring-[#f1d3a1] focus-visible:ring-offset-2 focus-visible:ring-offset-[#02050c]"
                  style={{
                    width: ITEM_SIZE,
                    height: ITEM_SIZE,
                    left: item.col * (ITEM_SIZE + gap),
                    top: item.row * (ITEM_SIZE + gap),
                    willChange: 'transform, opacity',
                    transition: 'opacity 0.6s ease',
                    background: tileGradient(item.post),
                  }}
                >
                  {!imageFailed && (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={item.post.coverImage}
                        alt={item.post.title || item.post.author.pseudonym}
                        loading="lazy"
                        className="absolute inset-0 h-full w-full object-cover"
                        style={{ filter: 'contrast(1.05) saturate(1.05)' }}
                        draggable={false}
                        onError={() => {
                          setBrokenImages((prev) => (prev[item.post.id] ? prev : { ...prev, [item.post.id]: true }));
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-black/5" />
                    </>
                  )}

                  {imageFailed && (
                    <div
                      className="absolute inset-0"
                      style={{
                        background: `${tileGradient(item.post)}, radial-gradient(circle at top left, rgba(255,255,255,0.18), transparent 55%)`,
                      }}
                    />
                  )}

                  <div className="absolute inset-0 border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.09),transparent_36%,rgba(0,0,0,0.34))]" />
                  <div className="absolute inset-x-0 top-0 p-4">
                    <div className="flex items-center justify-between gap-2 text-[10px] uppercase tracking-[0.2em] text-white/78">
                      <span className="max-w-[66%] truncate rounded-lg border border-white/16 bg-black/36 px-2.5 py-1">{tileEyebrow(item.post)}</span>
                      <span className="rounded-lg border border-white/14 bg-black/34 px-2 py-1">{timeAgo(item.post.createdAt)}</span>
                    </div>
                  </div>
                  <div className="absolute inset-x-0 bottom-0 p-4">
                    <div className="rounded-[1.1rem] border border-white/14 bg-[linear-gradient(180deg,rgba(4,8,14,0.72),rgba(3,7,12,0.9))] p-4 shadow-[0_20px_42px_-28px_rgba(0,0,0,0.98)] backdrop-blur-md">
                      <p className="text-[11px] uppercase tracking-[0.16em] text-white/52 line-clamp-1">
                        {tileSignalLine(item.post)}
                      </p>
                      <p className="text-[1.02rem] font-semibold leading-[1.08] text-white line-clamp-2">
                        {item.post.title || item.post.author.pseudonym}
                      </p>
                      <p className="mt-1.5 text-[12px] leading-relaxed text-white/78 line-clamp-3">
                        {item.post.content}
                      </p>
                      <div className="mt-3 flex items-center justify-between gap-2">
                        <span className="max-w-[52%] truncate rounded-lg border border-white/12 bg-white/7 px-2.5 py-1 text-[10px] uppercase tracking-[0.12em] text-white/66">
                          {tilePlace(item.post)}
                        </span>
                        <div className="flex items-center gap-2 text-[10px] text-white/70">
                          <span className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-black/22 px-1.5 py-1 font-mono-data">
                            <Heart className="h-3 w-3" />
                            {item.post.likes}
                          </span>
                          <span className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-black/22 px-1.5 py-1 font-mono-data">
                            <MessageCircle className="h-3 w-3" />
                            {item.post.comments}
                          </span>
                          <span className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-black/22 px-1.5 py-1 font-mono-data">
                            <Share2 className="h-3 w-3" />
                            {item.post.shares}
                          </span>
                        </div>
                      </div>
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

      {/* Sort bar */}
      {showSortBar ? (
        <div className="pointer-events-none fixed left-4 top-[4.85rem] z-10 md:left-[17rem]">
          <div className="pointer-events-auto inline-flex items-center gap-1 rounded-xl border border-white/14 bg-[linear-gradient(140deg,rgba(6,12,22,0.78),rgba(6,14,25,0.74))] px-1.5 py-1.5 backdrop-blur-xl shadow-[0_20px_48px_-28px_rgba(0,0,0,0.95)]">
            <span className="hidden rounded-md px-2 text-[10px] uppercase tracking-[0.18em] text-white/48 md:inline">Flow</span>
            {SORT_OPTIONS.map(({ mode, label }) => (
              <button
                key={mode}
                type="button"
                onClick={() => onSortChange(mode)}
                className={`inline-flex min-h-9 items-center rounded-lg px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] transition-colors ${
                  sortMode === mode
                    ? 'border border-white/20 bg-white/14 text-white'
                    : 'text-white/58 hover:bg-white/10 hover:text-white'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {/* Zoom controls */}
      <div
        className="fixed bottom-4 left-1/2 z-10 -translate-x-1/2"
        style={{ opacity: ready ? 1 : 0, transition: 'opacity 0.45s ease' }}
      >
        <div className="inline-flex items-center gap-1 rounded-xl border border-white/14 bg-[linear-gradient(138deg,rgba(6,11,20,0.86),rgba(9,16,28,0.84))] px-1.5 py-1.5 backdrop-blur-xl shadow-[0_20px_52px_-28px_rgba(0,0,0,0.95)]">
          <span className="inline-flex min-h-10 items-center rounded-lg border border-white/14 bg-white/92 px-3 text-[12px] font-semibold text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
            {Math.round(currentZoom * 100)}%
          </span>

          {ZOOM_ACTIONS.map((action) => (
            <button
              key={action.level}
              type="button"
              onClick={() => setZoom(action.level)}
              className={`inline-flex min-h-10 items-center rounded-lg px-3 text-[10px] font-semibold uppercase tracking-[0.14em] transition-colors ${
                currentZoom === action.level
                  ? 'border border-white/16 bg-white/14 text-white'
                  : 'text-white/60 hover:bg-white/10 hover:text-white'
              }`}
            >
              <span className="hidden sm:inline">{action.label}</span>
              <span className="sm:hidden">{action.shortLabel}</span>
            </button>
          ))}

          <button
            type="button"
            onClick={autoFitZoom}
            className="inline-flex min-h-10 items-center rounded-lg px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/60 transition-colors hover:bg-white/10 hover:text-white"
          >
            Fit
          </button>
        </div>
      </div>

      {/* Create post button — bottom-right */}
      {showComposer && (
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="fixed bottom-5 right-5 z-10 flex h-12 w-12 items-center justify-center rounded-2xl border border-black/10 bg-white text-black shadow-lg transition-transform hover:scale-110"
          aria-label="Create post"
        >
          <Plus className="w-6 h-6" />
        </button>
      )}

      {/* ---- Split-screen detail ---- */}
      <div
        ref={splitScreenRef}
        id="gallery-split-screen"
        className="fixed inset-0 flex flex-col lg:flex-row"
        onClick={closeDetail}
        style={{
          zIndex: 50,
          background: 'rgba(2, 6, 14, 0.92)',
          pointerEvents: selectedPost ? 'auto' : 'none',
          visibility: selectedPost ? 'visible' : 'hidden',
        }}
      >
        {/* Image panel */}
        <div
          className="relative flex min-h-[42vh] items-center justify-center overflow-hidden bg-[rgba(4,10,20,0.88)] px-4 py-6 lg:min-h-0 lg:w-[58vw] lg:flex-none lg:px-8 lg:py-8"
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_36%),linear-gradient(180deg,rgba(255,255,255,0.03),rgba(2,6,14,0.28)_35%,rgba(2,6,14,0.68)_100%)]" />
          {selectedPost && detailImageFailed && (
            <div
              className="absolute inset-0 opacity-45"
              style={{
                background: `${tileGradient(selectedPost)}, radial-gradient(circle at top left, rgba(255,255,255,0.16), transparent 42%)`,
              }}
            />
          )}

          <div
            ref={zoomTargetRef}
            id="gallery-zoom-target"
            onClick={(event) => event.stopPropagation()}
            className="relative z-[3] h-full max-h-[72vh] w-full max-w-[min(92vw,760px)] overflow-hidden rounded-[1.75rem] border border-white/12 shadow-[0_35px_120px_rgba(0,0,0,0.55)] lg:max-h-[84vh]"
          />
        </div>

        {/* Content panel */}
        <div
          className="relative flex min-h-[58vh] flex-1 flex-col justify-center overflow-y-auto bg-[rgba(5,9,18,0.9)] px-4 py-5 lg:min-h-0 lg:w-[42vw] lg:flex-none lg:px-8 lg:py-8"
        >
          {selectedPost && (
            <div className="flex min-h-full items-center">
              <div
                className="w-full max-w-xl rounded-[2rem] border border-white/10 bg-white/[0.045] p-6 shadow-[0_28px_100px_rgba(0,0,0,0.45)] backdrop-blur-2xl lg:p-8"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="space-y-6">
                  <div className="space-y-3">
                    <p data-detail-text className="text-[10px] font-mono uppercase tracking-[0.28em] text-white/42">
                      {tileEyebrow(selectedPost)}
                    </p>
                    <h1 data-detail-text className="text-3xl font-semibold leading-[0.98] text-white lg:text-[2.7rem]">
                      {selectedPost.title || selectedPost.author.pseudonym}
                    </h1>
                    <div data-detail-text className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.18em] text-white/48">
                      <span>{selectedPost.id.replace('post-', '#')}</span>
                      <span className="h-1 w-1 rounded-full bg-white/22" />
                      <span>{timeAgo(selectedPost.createdAt)}</span>
                      {selectedPost.microcosm && (
                        <>
                          <span className="h-1 w-1 rounded-full bg-white/22" />
                          <span>{selectedPost.microcosm}</span>
                        </>
                      )}
                    </div>
                    <div data-detail-text className="flex items-center gap-3 pt-1">
                      <span
                        className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold text-white"
                        style={{ backgroundColor: avatarColor(selectedPost.author.pseudonym) }}
                      >
                        {selectedPost.author.pseudonym.charAt(0)}
                      </span>
                      <div>
                        <p className="text-sm font-medium text-white">{selectedPost.author.pseudonym}</p>
                        <p className="text-xs capitalize text-white/48">{selectedPost.author.role}</p>
                      </div>
                    </div>
                  </div>

                  <p data-detail-text className="text-base leading-relaxed text-white/78 whitespace-pre-wrap lg:text-[1.02rem]">
                    {selectedPost.content}
                  </p>

                  <div data-detail-text className="flex flex-wrap gap-2">
                    <span className="rounded-lg border border-white/12 bg-white/[0.05] px-3 py-1 text-[10px] uppercase tracking-[0.16em] text-white/72">
                      {selectedPost.sourceName ? 'Trusted signal' : 'Community trace'}
                    </span>
                    <span className="rounded-lg border border-white/12 bg-white/[0.05] px-3 py-1 text-[10px] uppercase tracking-[0.16em] text-white/72">
                      {selectedPost.microcosm || 'Shared commons'}
                    </span>
                    <span className="rounded-lg border border-white/12 bg-white/[0.05] px-3 py-1 text-[10px] uppercase tracking-[0.16em] text-white/72">
                      {selectedPost.sourceName || selectedPost.author.pseudonym}
                    </span>
                  </div>

                  {selectedPost.tags.length > 0 && (
                    <div data-detail-text className="flex flex-wrap gap-2">
                      {selectedPost.tags.map((tag) => (
                        <span
                          key={tag}
                          className={`rounded-lg px-3 py-1 text-[10px] font-mono uppercase ${tagClass(tag)}`}
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}

                  <div data-detail-text className="grid grid-cols-2 gap-3 text-white/70 sm:grid-cols-4">
                    <div className="rounded-2xl border border-white/8 bg-black/18 px-4 py-3">
                      <p className="mb-1 text-[10px] uppercase tracking-[0.2em] text-white/38">Likes</p>
                      <div className="flex items-center gap-2 text-sm text-white">
                        <Heart className={`h-4 w-4 ${selectedPost.liked ? 'fill-red-500 text-red-500' : ''}`} />
                        {selectedPost.likes}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-white/8 bg-black/18 px-4 py-3">
                      <p className="mb-1 text-[10px] uppercase tracking-[0.2em] text-white/38">Comments</p>
                      <div className="flex items-center gap-2 text-sm text-white">
                        <MessageCircle className="h-4 w-4" />
                        {selectedPost.comments}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-white/8 bg-black/18 px-4 py-3">
                      <p className="mb-1 text-[10px] uppercase tracking-[0.2em] text-white/38">Shares</p>
                      <div className="flex items-center gap-2 text-sm text-white">
                        <Share2 className="h-4 w-4" />
                        {selectedPost.shares}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-white/8 bg-black/18 px-4 py-3">
                      <p className="mb-1 text-[10px] uppercase tracking-[0.2em] text-white/38">Place</p>
                      <div className="flex items-center gap-2 text-sm text-white">
                        <MapPin className="h-4 w-4" />
                        {selectedPost.microcosm || 'Community'}
                      </div>
                    </div>
                  </div>

                  <div data-detail-text className="flex flex-wrap items-center gap-3">
                    {selectedPost.sourceUrl && (
                      <a
                        href={selectedPost.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex w-fit items-center rounded-xl border border-white/16 bg-white/6 px-4 py-2 text-xs font-medium uppercase tracking-[0.18em] text-white/86 transition-colors hover:border-white/30 hover:bg-white/10 hover:text-white"
                      >
                        Read Original Story
                      </a>
                    )}
                    <span className="text-xs uppercase tracking-[0.16em] text-white/38">
                      Published {timeAgo(selectedPost.createdAt)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Close button — right edge arrow */}
      <button
        ref={closeButtonRef}
        id="gallery-close-btn"
        onClick={closeDetail}
        className="fixed top-1/2 right-5 -translate-y-1/2 flex items-center justify-center"
        style={{ zIndex: 55, transform: 'translate(40px, -50%)', pointerEvents: selectedPost ? 'auto' : 'none', visibility: selectedPost ? 'visible' : 'hidden' }}
        aria-label="Close detail"
      >
        <svg width="64" height="64" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ transform: 'rotate(180deg)' }}>
          <path d="M7.89873 16L6.35949 14.48L11.8278 9.08H0V6.92H11.8278L6.35949 1.52L7.89873 0L16 8L7.89873 16Z" fill="white" />
        </svg>
      </button>

      {/* Create post modal */}
      {showComposer && showCreate && <CreatePostModal onClose={() => setShowCreate(false)} />}
    </div>
  );
}
