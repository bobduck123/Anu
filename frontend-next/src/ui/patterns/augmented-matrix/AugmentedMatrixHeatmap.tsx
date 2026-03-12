'use client';

import {
  useRef,
  useEffect,
  useState,
  useCallback,
  useMemo,
  type KeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type WheelEvent as ReactWheelEvent,
} from 'react';
import type { HeatmapData, HeatmapCell } from '@/data/adapters/heatmapAdapter';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type ColorScale = 'warm' | 'cool' | 'divergent';

export interface AugmentedMatrixHeatmapProps {
  data: HeatmapData;
  width?: number;
  height?: number;
  onCellHover?: (cell: HeatmapCell | null) => void;
  onCellClick?: (cell: HeatmapCell) => void;
  colorScale?: ColorScale;
}

interface Transform {
  x: number;
  y: number;
  scale: number;
}

interface FocusedCell {
  row: number;
  col: number;
}

/* ------------------------------------------------------------------ */
/*  Color interpolation with LRU cache                                 */
/* ------------------------------------------------------------------ */

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function rgbToString(r: number, g: number, b: number): string {
  return `rgb(${Math.round(r)},${Math.round(g)},${Math.round(b)})`;
}

type RGB = [number, number, number];

const COLOR_STOPS: Record<ColorScale, RGB[]> = {
  warm: [
    [34, 139, 34],   // forest green
    [200, 200, 0],   // yellow
    [220, 38, 38],   // red
  ],
  cool: [
    [59, 130, 246],  // blue
    [139, 92, 246],  // purple
    [220, 38, 38],   // red
  ],
  divergent: [
    [59, 130, 246],  // blue
    [255, 255, 255], // white
    [220, 38, 38],   // red
  ],
};

function interpolateStops(stops: RGB[], t: number): RGB {
  const clamped = Math.max(0, Math.min(1, t));
  const segments = stops.length - 1;
  const segment = Math.min(Math.floor(clamped * segments), segments - 1);
  const localT = clamped * segments - segment;
  const a = stops[segment];
  const b = stops[segment + 1];
  return [lerp(a[0], b[0], localT), lerp(a[1], b[1], localT), lerp(a[2], b[2], localT)];
}

/** Pre-compute a lookup table of 256 colors for a given scale */
function buildColorLUT(scale: ColorScale): string[] {
  const stops = COLOR_STOPS[scale];
  const lut: string[] = new Array(256);
  for (let i = 0; i < 256; i++) {
    const [r, g, b] = interpolateStops(stops, i / 255);
    lut[i] = rgbToString(r, g, b);
  }
  return lut;
}

/* ------------------------------------------------------------------ */
/*  Geometry helpers                                                    */
/* ------------------------------------------------------------------ */

const LABEL_GUTTER_X = 120; // left gutter for row labels
const LABEL_GUTTER_Y = 40;  // top gutter for column labels
const CELL_PAD = 1;          // gap between cells
const MIN_SCALE = 0.3;
const MAX_SCALE = 5;

function cellDimensions(
  canvasW: number,
  canvasH: number,
  rowCount: number,
  colCount: number,
) {
  if (rowCount === 0 || colCount === 0) return { cellW: 0, cellH: 0 };
  const availW = canvasW - LABEL_GUTTER_X;
  const availH = canvasH - LABEL_GUTTER_Y;
  const cellW = Math.max(4, availW / colCount);
  const cellH = Math.max(4, availH / rowCount);
  return { cellW, cellH };
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function AugmentedMatrixHeatmap({
  data,
  width,
  height,
  onCellHover,
  onCellClick,
  colorScale = 'warm',
}: AugmentedMatrixHeatmapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const labelCanvasRef = useRef<HTMLCanvasElement>(null);
  const rafId = useRef<number>(0);
  const needsRedraw = useRef(true);

  // State
  const fixedSize = useMemo(
    () => (width && height ? { w: width, h: height } : null),
    [width, height],
  );
  const [containerSize, setContainerSize] = useState({ w: width ?? 900, h: height ?? 600 });
  const viewportSize = fixedSize ?? containerSize;
  const [transform, setTransform] = useState<Transform>({ x: 0, y: 0, scale: 1 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hoveredCell, setHoveredCell] = useState<HeatmapCell | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [focusedCell, setFocusedCell] = useState<FocusedCell>({ row: 0, col: 0 });
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  // Build colour LUT once per scale change
  const colorLUT = useMemo(() => buildColorLUT(colorScale), [colorScale]);

  // Build a fast cell lookup grid: cellGrid[row][col] = HeatmapCell | undefined
  const cellGrid = useMemo(() => {
    const grid: (HeatmapCell | undefined)[][] = Array.from(
      { length: data.rows.length },
      () => new Array(data.cols.length).fill(undefined),
    );
    for (const cell of data.cells) {
      if (cell.row < data.rows.length && cell.col < data.cols.length) {
        grid[cell.row][cell.col] = cell;
      }
    }
    return grid;
  }, [data]);

  // Detect prefers-reduced-motion
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Responsive sizing
  useEffect(() => {
    if (fixedSize) return;
    const container = containerRef.current;
    if (!container) return;
    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        const { width: cw, height: ch } = entry.contentRect;
        setContainerSize({ w: Math.floor(cw), h: Math.max(Math.floor(ch), 300) });
        needsRedraw.current = true;
      }
    });
    ro.observe(container);
    return () => ro.disconnect();
  }, [fixedSize]);

  // Mark redraw needed when data / transform / color changes
  useEffect(() => {
    needsRedraw.current = true;
  }, [data, transform, colorScale, viewportSize, focusedCell]);

  /* ---------------------------------------------------------------- */
  /*  Canvas draw loop                                                 */
  /* ---------------------------------------------------------------- */

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const labelCanvas = labelCanvasRef.current;
    if (!canvas || !labelCanvas) return;

    const ctx = canvas.getContext('2d', { alpha: false });
    const labelCtx = labelCanvas.getContext('2d');
    if (!ctx || !labelCtx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = viewportSize.w;
    const h = viewportSize.h;

    // Resize backing store (only when size changes)
    if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      labelCanvas.width = w * dpr;
      labelCanvas.height = h * dpr;
      labelCanvas.style.width = `${w}px`;
      labelCanvas.style.height = `${h}px`;
    }

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    labelCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Clear
    ctx.fillStyle = 'var(--color-background, #faf9f7)';
    ctx.fillRect(0, 0, w, h);
    labelCtx.clearRect(0, 0, w, h);

    const rowCount = data.rows.length;
    const colCount = data.cols.length;
    if (rowCount === 0 || colCount === 0) return;

    const { cellW, cellH } = cellDimensions(w, h, rowCount, colCount);
    const { x: tx, y: ty, scale } = transform;
    const range = data.maxValue - data.minValue || 1;

    // Draw cells in batch
    ctx.save();
    ctx.translate(LABEL_GUTTER_X + tx, LABEL_GUTTER_Y + ty);
    ctx.scale(scale, scale);

    for (let r = 0; r < rowCount; r++) {
      for (let c = 0; c < colCount; c++) {
        const cell = cellGrid[r]?.[c];
        if (!cell) continue;

        const t = (cell.value - data.minValue) / range;
        const lutIdx = Math.round(t * 255);
        ctx.fillStyle = colorLUT[lutIdx];

        const cx = c * cellW + CELL_PAD;
        const cy = r * cellH + CELL_PAD;
        const cw = cellW - CELL_PAD * 2;
        const ch = cellH - CELL_PAD * 2;

        ctx.fillRect(cx, cy, cw, ch);

        // Focused cell highlight (keyboard navigation)
        if (focusedCell.row === r && focusedCell.col === c) {
          ctx.strokeStyle = 'var(--color-ring, #1e3a5f)';
          ctx.lineWidth = 2 / scale;
          ctx.strokeRect(cx - 1, cy - 1, cw + 2, ch + 2);
        }
      }
    }

    ctx.restore();

    // Row labels (left gutter)
    labelCtx.fillStyle = 'var(--color-foreground, #2c241b)';
    labelCtx.font = '11px system-ui, sans-serif';
    labelCtx.textAlign = 'right';
    labelCtx.textBaseline = 'middle';

    for (let r = 0; r < rowCount; r++) {
      const y = LABEL_GUTTER_Y + ty + (r * cellH + cellH / 2) * scale;
      if (y < 10 || y > h + 20) continue; // frustum cull
      const label = data.rows[r];
      const truncated = label.length > 18 ? label.slice(0, 17) + '\u2026' : label;
      labelCtx.fillText(truncated, LABEL_GUTTER_X - 6, y);
    }

    // Column labels (top gutter)
    labelCtx.textAlign = 'center';
    labelCtx.textBaseline = 'bottom';

    for (let c = 0; c < colCount; c++) {
      const x = LABEL_GUTTER_X + tx + (c * cellW + cellW / 2) * scale;
      if (x < LABEL_GUTTER_X - 20 || x > w + 20) continue;
      labelCtx.fillText(data.cols[c], x, LABEL_GUTTER_Y - 4);
    }
  }, [data, transform, colorLUT, viewportSize, cellGrid, focusedCell]);

  // RAF render loop
  useEffect(() => {
    const loop = () => {
      if (needsRedraw.current) {
        needsRedraw.current = false;
        draw();
      }
      rafId.current = requestAnimationFrame(loop);
    };
    rafId.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId.current);
  }, [draw]);

  /* ---------------------------------------------------------------- */
  /*  Pointer / wheel interaction                                      */
  /* ---------------------------------------------------------------- */

  const screenToCell = useCallback(
    (clientX: number, clientY: number): HeatmapCell | null => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const rect = canvas.getBoundingClientRect();
      const mx = clientX - rect.left;
      const my = clientY - rect.top;

      const { cellW, cellH } = cellDimensions(
        viewportSize.w,
        viewportSize.h,
        data.rows.length,
        data.cols.length,
      );

      const { x: tx, y: ty, scale } = transform;
      const localX = (mx - LABEL_GUTTER_X - tx) / scale;
      const localY = (my - LABEL_GUTTER_Y - ty) / scale;
      const col = Math.floor(localX / cellW);
      const row = Math.floor(localY / cellH);

      if (row < 0 || row >= data.rows.length || col < 0 || col >= data.cols.length) {
        return null;
      }

      return cellGrid[row]?.[col] ?? null;
    },
    [viewportSize, data, transform, cellGrid],
  );

  const handleMouseMove = useCallback(
    (e: ReactMouseEvent<HTMLDivElement>) => {
      if (dragging) {
        const dx = e.clientX - dragStart.x;
        const dy = e.clientY - dragStart.y;
        setTransform((prev) => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
        setDragStart({ x: e.clientX, y: e.clientY });
        return;
      }

      const cell = screenToCell(e.clientX, e.clientY);
      setHoveredCell(cell);
      onCellHover?.(cell);

      if (cell) {
        const rect = containerRef.current?.getBoundingClientRect();
        if (rect) {
          setTooltipPos({
            x: e.clientX - rect.left + 12,
            y: e.clientY - rect.top - 8,
          });
        }
      }
    },
    [dragging, dragStart, screenToCell, onCellHover],
  );

  const handleMouseDown = useCallback((e: ReactMouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    setDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  }, []);

  const handleMouseUp = useCallback(
    (e: ReactMouseEvent<HTMLDivElement>) => {
      if (dragging) {
        setDragging(false);
        return;
      }
      const cell = screenToCell(e.clientX, e.clientY);
      if (cell) {
        onCellClick?.(cell);
      }
    },
    [dragging, screenToCell, onCellClick],
  );

  const handleMouseLeave = useCallback(() => {
    setDragging(false);
    setHoveredCell(null);
    onCellHover?.(null);
  }, [onCellHover]);

  const handleWheel = useCallback(
    (e: ReactWheelEvent<HTMLDivElement>) => {
      e.preventDefault();
      const delta = -e.deltaY * 0.001;
      setTransform((prev) => {
        const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, prev.scale + delta * prev.scale));
        // Zoom towards cursor
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return { ...prev, scale: newScale };
        const mx = e.clientX - rect.left - LABEL_GUTTER_X;
        const my = e.clientY - rect.top - LABEL_GUTTER_Y;
        const ratio = newScale / prev.scale;
        return {
          x: mx - ratio * (mx - prev.x),
          y: my - ratio * (my - prev.y),
          scale: newScale,
        };
      });
    },
    [],
  );

  /* ---------------------------------------------------------------- */
  /*  Keyboard navigation                                              */
  /* ---------------------------------------------------------------- */

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      const rowCount = data.rows.length;
      const colCount = data.cols.length;
      if (rowCount === 0 || colCount === 0) return;

      let newRow = focusedCell.row;
      let newCol = focusedCell.col;
      let handled = false;

      switch (e.key) {
        case 'ArrowUp':
          newRow = Math.max(0, focusedCell.row - 1);
          handled = true;
          break;
        case 'ArrowDown':
          newRow = Math.min(rowCount - 1, focusedCell.row + 1);
          handled = true;
          break;
        case 'ArrowLeft':
          newCol = Math.max(0, focusedCell.col - 1);
          handled = true;
          break;
        case 'ArrowRight':
          newCol = Math.min(colCount - 1, focusedCell.col + 1);
          handled = true;
          break;
        case 'Home':
          newCol = 0;
          handled = true;
          break;
        case 'End':
          newCol = colCount - 1;
          handled = true;
          break;
        case 'Enter':
        case ' ': {
          const cell = cellGrid[focusedCell.row]?.[focusedCell.col];
          if (cell) onCellClick?.(cell);
          handled = true;
          break;
        }
      }

      if (handled) {
        e.preventDefault();
        setFocusedCell({ row: newRow, col: newCol });
        const cell = cellGrid[newRow]?.[newCol] ?? null;
        onCellHover?.(cell);
        setHoveredCell(cell);
        needsRedraw.current = true;
      }
    },
    [data, focusedCell, cellGrid, onCellClick, onCellHover],
  );

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

  return (
    <div
      ref={containerRef}
      className="relative w-full overflow-hidden rounded-lg focus-within:ring-2 focus-within:ring-[var(--color-ring)]"
      style={{
        height: height ?? '100%',
        minHeight: 300,
        cursor: dragging ? 'grabbing' : 'grab',
        contain: 'layout paint',
      }}
      onMouseMove={handleMouseMove}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      onWheel={handleWheel}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="grid"
      aria-label={`Heatmap with ${data.rows.length} rows and ${data.cols.length} columns`}
      aria-rowcount={data.rows.length}
      aria-colcount={data.cols.length}
    >
      {/* Main heatmap canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0"
        style={{ imageRendering: 'pixelated' }}
      />
      {/* Label overlay canvas (transparent bg so labels sit above) */}
      <canvas
        ref={labelCanvasRef}
        className="absolute inset-0 pointer-events-none"
      />

      {/* Tooltip */}
      {hoveredCell && (
        <div
          className={`
            absolute z-50 pointer-events-none px-3 py-2 rounded-md shadow-md
            bg-[var(--color-card)] text-[var(--color-card-foreground)]
            border border-[var(--color-border)] text-xs
            ${prefersReducedMotion ? '' : 'transition-opacity duration-150'}
          `}
          style={{
            left: tooltipPos.x,
            top: tooltipPos.y,
            maxWidth: 260,
            transform: 'translateY(-100%)',
          }}
          role="tooltip"
        >
          <div className="font-semibold mb-1 truncate">{hoveredCell.label}</div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
            <span className="text-[var(--color-muted-foreground)]">Value</span>
            <span className="font-mono tabular-nums text-right">{hoveredCell.value.toFixed(1)}</span>
            <span className="text-[var(--color-muted-foreground)]">Category</span>
            <span className="text-right">{hoveredCell.category}</span>
            <span className="text-[var(--color-muted-foreground)]">Tenant</span>
            <span className="text-right">{hoveredCell.tenant}</span>
          </div>
        </div>
      )}

      {/* Screen-reader live region for keyboard nav */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {hoveredCell
          ? `${hoveredCell.label}, value ${hoveredCell.value.toFixed(1)}, category ${hoveredCell.category}, tenant ${hoveredCell.tenant}`
          : ''}
      </div>
    </div>
  );
}

/** Expose canvas ref getter for export functionality */
AugmentedMatrixHeatmap.displayName = 'AugmentedMatrixHeatmap';
