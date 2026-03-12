'use client';

import { useReducer, useRef, useCallback, useEffect } from 'react';
import type {
  PixelEditorState, PixelEditorAction, ZoomLevel,
  ClipboardData,
} from './types';
import { TOOL_SHORTCUTS } from './types';
import {
  bresenhamLine, drawPixel, floodFill, drawLine, drawRect, drawCircle,
  pickColor, flipPixels, rotatePixels, invertPixels, convertToPalette,
  drawGrid, exportCanvas,
} from './engine';

function reducer(state: PixelEditorState, action: PixelEditorAction): PixelEditorState {
  switch (action.type) {
    case 'SET_TOOL': return { ...state, tool: action.tool, selection: action.tool !== 'select' ? null : state.selection };
    case 'SET_COLOR': return { ...state, color: action.color };
    case 'SET_ZOOM': return { ...state, zoom: action.zoom };
    case 'SET_PALETTE': return { ...state, paletteName: action.name, paletteKey: action.key };
    case 'SET_SELECTION': return { ...state, selection: action.selection };
    case 'TOGGLE_GRID': return { ...state, gridVisible: !state.gridVisible };
    case 'TOGGLE_CRT': return { ...state, crtEnabled: !state.crtEnabled };
    case 'TOGGLE_THEME': return { ...state, lightMode: !state.lightMode };
    case 'TOGGLE_TRANS': return { ...state, transEnabled: !state.transEnabled };
    case 'SET_TRANS_COLOR': return { ...state, transColor: action.color };
    case 'SHOW_MODAL':
      if (action.modal === 'export') return { ...state, showExportModal: true };
      if (action.modal === 'newDoc') return { ...state, showNewDocModal: true };
      if (action.modal === 'help') return { ...state, showHelpModal: true };
      return { ...state, showClearModal: true };
    case 'HIDE_MODAL':
      if (action.modal === 'export') return { ...state, showExportModal: false };
      if (action.modal === 'newDoc') return { ...state, showNewDocModal: false };
      if (action.modal === 'help') return { ...state, showHelpModal: false };
      return { ...state, showClearModal: false };
    case 'RESIZE': return { ...state, width: action.width, height: action.height };
    default: return state;
  }
}

const INITIAL_STATE: PixelEditorState = {
  tool: 'pencil',
  color: '#000000',
  zoom: 10 as ZoomLevel,
  width: 64,
  height: 64,
  paletteName: 'C64',
  paletteKey: 'Commodore|C64',
  transEnabled: false,
  transColor: '#ffffff',
  lightMode: true,
  gridVisible: true,
  crtEnabled: false,
  selection: null,
  showExportModal: false,
  showNewDocModal: false,
  showHelpModal: false,
  showClearModal: false,
};

export interface UsePixelEditorOptions {
  initialSize?: number;
  initialZoom?: ZoomLevel;
}

export function usePixelEditor(options?: UsePixelEditorOptions) {
  const [state, dispatch] = useReducer(reducer, {
    ...INITIAL_STATE,
    width: options?.initialSize ?? 64,
    height: options?.initialSize ?? 64,
    zoom: options?.initialZoom ?? (10 as ZoomLevel),
  });

  // Refs for non-reactive data
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gridCanvasRef = useRef<HTMLCanvasElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const gridCtxRef = useRef<CanvasRenderingContext2D | null>(null);
  const previewCtxRef = useRef<CanvasRenderingContext2D | null>(null);

  // History (ImageData snapshots, not in React state)
  const historyRef = useRef<ImageData[]>([]);
  const historyIndexRef = useRef(-1);
  const maxHistory = 50;

  // Drawing state refs (not in React state for perf)
  const isDrawingRef = useRef(false);
  const startPosRef = useRef({ x: 0, y: 0 });
  const lastPosRef = useRef({ x: -1, y: -1 });
  const previewImageRef = useRef<ImageData | null>(null);
  const clipboardRef = useRef<ClipboardData | null>(null);
  const isRightClickRef = useRef(false);

  // --- Preview & Grid ---
  const updatePreview = useCallback(() => {
    const pCtx = previewCtxRef.current;
    const canvas = canvasRef.current;
    if (!pCtx || !canvas) return;
    pCtx.clearRect(0, 0, state.width, state.height);
    pCtx.drawImage(canvas, 0, 0);
  }, [state.width, state.height]);

  const updateGrid = useCallback(() => {
    const gridCtx = gridCtxRef.current;
    const gridCanvas = gridCanvasRef.current;
    if (!gridCtx || !gridCanvas) return;
    const displayW = state.width * state.zoom;
    const displayH = state.height * state.zoom;
    gridCanvas.width = displayW;
    gridCanvas.height = displayH;
    gridCanvas.style.width = `${displayW}px`;
    gridCanvas.style.height = `${displayH}px`;
    drawGrid(gridCtx, displayW, displayH, state.zoom);
  }, [state.width, state.height, state.zoom]);

  const updateGridAndPreview = useCallback(() => {
    updateGrid();
    updatePreview();
  }, [updateGrid, updatePreview]);

  // --- History ---
  const saveHistoryState = useCallback(() => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    const imgData = ctx.getImageData(0, 0, state.width, state.height);
    historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1);
    historyRef.current.push(imgData);
    if (historyRef.current.length > maxHistory) {
      historyRef.current.shift();
    } else {
      historyIndexRef.current++;
    }
  }, [state.width, state.height]);

  const undo = useCallback(() => {
    if (historyIndexRef.current > 0) {
      historyIndexRef.current--;
      ctxRef.current?.putImageData(historyRef.current[historyIndexRef.current], 0, 0);
      updatePreview();
    }
  }, [updatePreview]);

  const redo = useCallback(() => {
    if (historyIndexRef.current < historyRef.current.length - 1) {
      historyIndexRef.current++;
      ctxRef.current?.putImageData(historyRef.current[historyIndexRef.current], 0, 0);
      updatePreview();
    }
  }, [updatePreview]);

  // --- Canvas setup ---
  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;
    ctxRef.current = ctx;

    canvas.width = state.width;
    canvas.height = state.height;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, state.width, state.height);

    // Preview canvas
    if (previewCanvasRef.current) {
      previewCtxRef.current = previewCanvasRef.current.getContext('2d');
      previewCanvasRef.current.width = state.width;
      previewCanvasRef.current.height = state.height;
    }

    // Grid canvas
    if (gridCanvasRef.current) {
      gridCtxRef.current = gridCanvasRef.current.getContext('2d');
    }

    saveHistoryState();
    updateGridAndPreview();
  }, [state.width, state.height, saveHistoryState, updateGridAndPreview]);

  // --- Coordinate mapping ---
  const getCoords = useCallback((e: React.MouseEvent | React.PointerEvent): { x: number; y: number } => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    let x = Math.floor((e.clientX - rect.left) / (rect.width / state.width));
    let y = Math.floor((e.clientY - rect.top) / (rect.height / state.height));
    x = Math.max(0, Math.min(x, state.width - 1));
    y = Math.max(0, Math.min(y, state.height - 1));
    return { x, y };
  }, [state.width, state.height]);

  // --- Mouse handlers ---
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    const ctx = ctxRef.current;
    if (!ctx) return;

    isRightClickRef.current = e.button === 2;
    isDrawingRef.current = true;
    const { x, y } = getCoords(e);
    lastPosRef.current = { x, y };
    startPosRef.current = { x, y };

    const color = isRightClickRef.current ? '#ffffff' : state.color;
    previewImageRef.current = ctx.getImageData(0, 0, state.width, state.height);

    if (state.tool === 'fill') {
      floodFill(ctx, x, y, color, state.width, state.height);
      isDrawingRef.current = false;
      saveHistoryState();
      updatePreview();
    } else if (state.tool === 'pencil' || state.tool === 'eraser') {
      drawPixel(ctx, x, y, state.tool === 'eraser' ? '#ffffff' : color, state.width, state.height);
    } else if (state.tool === 'picker') {
      const picked = pickColor(ctx, x, y);
      dispatch({ type: 'SET_COLOR', color: picked });
      isDrawingRef.current = false;
    } else if (state.tool === 'select') {
      dispatch({ type: 'SET_SELECTION', selection: { x, y, w: 1, h: 1 } });
    }
  }, [state.tool, state.color, state.width, state.height, getCoords, saveHistoryState, updatePreview]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    const ctx = ctxRef.current;
    if (!ctx || !isDrawingRef.current) return;

    const { x, y } = getCoords(e);
    const color = isRightClickRef.current ? '#ffffff' : state.color;

    if (state.tool === 'pencil' || state.tool === 'eraser') {
      bresenhamLine(lastPosRef.current.x, lastPosRef.current.y, x, y, (px, py) => {
        drawPixel(ctx, px, py, state.tool === 'eraser' ? '#ffffff' : color, state.width, state.height);
      });
      lastPosRef.current = { x, y };
    } else if (state.tool === 'line' && previewImageRef.current) {
      ctx.putImageData(previewImageRef.current, 0, 0);
      drawLine(ctx, startPosRef.current.x, startPosRef.current.y, x, y, color, state.width, state.height);
    } else if (state.tool === 'rect' && previewImageRef.current) {
      ctx.putImageData(previewImageRef.current, 0, 0);
      drawRect(ctx, startPosRef.current.x, startPosRef.current.y, x, y, color);
    } else if (state.tool === 'circle' && previewImageRef.current) {
      ctx.putImageData(previewImageRef.current, 0, 0);
      drawCircle(ctx, startPosRef.current.x, startPosRef.current.y, x, y, color);
    } else if (state.tool === 'select') {
      const rx = Math.min(startPosRef.current.x, x);
      const ry = Math.min(startPosRef.current.y, y);
      const rw = Math.abs(x - startPosRef.current.x) + 1;
      const rh = Math.abs(y - startPosRef.current.y) + 1;
      dispatch({ type: 'SET_SELECTION', selection: { x: rx, y: ry, w: rw, h: rh } });
    }
  }, [state.tool, state.color, state.width, state.height, getCoords]);

  const handlePointerUp = useCallback(() => {
    if (!isDrawingRef.current) return;

    if (['line', 'rect', 'circle', 'pencil', 'eraser'].includes(state.tool)) {
      updatePreview();
      saveHistoryState();
    }

    isDrawingRef.current = false;
    previewImageRef.current = null;
  }, [state.tool, updatePreview, saveHistoryState]);

  // --- Actions ---
  const copy = useCallback(() => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    const sel = state.selection;
    if (sel && sel.w > 0 && sel.h > 0) {
      clipboardRef.current = { data: ctx.getImageData(sel.x, sel.y, sel.w, sel.h), x: sel.x, y: sel.y, w: sel.w, h: sel.h };
    } else {
      clipboardRef.current = { data: ctx.getImageData(0, 0, state.width, state.height), x: 0, y: 0, w: state.width, h: state.height };
    }
  }, [state.selection, state.width, state.height]);

  const paste = useCallback(() => {
    const ctx = ctxRef.current;
    if (!ctx || !clipboardRef.current) return;
    const px = state.selection ? state.selection.x : 0;
    const py = state.selection ? state.selection.y : 0;
    ctx.putImageData(clipboardRef.current.data, px, py);
    updatePreview();
    saveHistoryState();
  }, [state.selection, updatePreview, saveHistoryState]);

  const cut = useCallback(() => {
    const ctx = ctxRef.current;
    if (!ctx || !state.selection || state.selection.w <= 0) return;
    copy();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(state.selection.x, state.selection.y, state.selection.w, state.selection.h);
    updatePreview();
    saveHistoryState();
  }, [state.selection, copy, updatePreview, saveHistoryState]);

  const deleteSelection = useCallback(() => {
    const ctx = ctxRef.current;
    if (!ctx || !state.selection) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(state.selection.x, state.selection.y, state.selection.w, state.selection.h);
    dispatch({ type: 'SET_SELECTION', selection: null });
    updatePreview();
    saveHistoryState();
  }, [state.selection, updatePreview, saveHistoryState]);

  const clearCanvas = useCallback(() => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, state.width, state.height);
    updatePreview();
    saveHistoryState();
    dispatch({ type: 'HIDE_MODAL', modal: 'clear' });
  }, [state.width, state.height, updatePreview, saveHistoryState]);

  const flip = useCallback((dir: 'h' | 'v') => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    const sel = state.selection;
    const x = sel?.w ? sel.x : 0;
    const y = sel?.w ? sel.y : 0;
    const w = sel?.w ? sel.w : state.width;
    const h = sel?.w ? sel.h : state.height;
    flipPixels(ctx, x, y, w, h, dir);
    updatePreview();
    saveHistoryState();
  }, [state.selection, state.width, state.height, updatePreview, saveHistoryState]);

  const rotate = useCallback((deg: 90 | -90 | 180) => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    const sel = state.selection;
    const x = sel?.w ? sel.x : 0;
    const y = sel?.w ? sel.y : 0;
    const w = sel?.w ? sel.w : state.width;
    const h = sel?.w ? sel.h : state.height;
    rotatePixels(ctx, x, y, w, h, deg);
    updatePreview();
    saveHistoryState();
  }, [state.selection, state.width, state.height, updatePreview, saveHistoryState]);

  const invert = useCallback(() => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    const sel = state.selection;
    const x = sel?.w ? sel.x : 0;
    const y = sel?.w ? sel.y : 0;
    const w = sel?.w ? sel.w : state.width;
    const h = sel?.w ? sel.h : state.height;
    invertPixels(ctx, x, y, w, h);
    updatePreview();
    saveHistoryState();
  }, [state.selection, state.width, state.height, updatePreview, saveHistoryState]);

  const applyPalette = useCallback((palette: string[]) => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    convertToPalette(ctx, state.width, state.height, palette);
    updatePreview();
    saveHistoryState();
  }, [state.width, state.height, updatePreview, saveHistoryState]);

  const doExport = useCallback((format: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    exportCanvas(canvas, state.width, state.height, format, state.transEnabled, state.transColor);
    dispatch({ type: 'HIDE_MODAL', modal: 'export' });
  }, [state.width, state.height, state.transEnabled, state.transColor]);

  const handleImport = useCallback((file: File) => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, state.width, state.height);
        updatePreview();
        saveHistoryState();
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  }, [state.width, state.height, updatePreview, saveHistoryState]);

  const resizeCanvas = useCallback((size: number) => {
    dispatch({ type: 'RESIZE', width: size, height: size });
    dispatch({ type: 'HIDE_MODAL', modal: 'newDoc' });
    // Canvas will re-init via effect
    historyRef.current = [];
    historyIndexRef.current = -1;
  }, []);

  // --- Keyboard shortcuts ---
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'SELECT') return;
      const key = e.key.toLowerCase();

      if ((e.ctrlKey || e.metaKey) && key === 'z') { e.preventDefault(); undo(); }
      else if ((e.ctrlKey || e.metaKey) && key === 'y') { e.preventDefault(); redo(); }
      else if ((e.ctrlKey || e.metaKey) && key === 'c') { e.preventDefault(); copy(); }
      else if ((e.ctrlKey || e.metaKey) && key === 'v') { e.preventDefault(); paste(); }
      else if ((e.ctrlKey || e.metaKey) && key === 'x') { e.preventDefault(); cut(); }
      else if (key === 'delete' || key === 'backspace') {
        if (state.selection) { e.preventDefault(); deleteSelection(); }
      } else if (TOOL_SHORTCUTS[key]) {
        dispatch({ type: 'SET_TOOL', tool: TOOL_SHORTCUTS[key] });
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [undo, redo, copy, paste, cut, deleteSelection, state.selection]);

  // Re-render grid on zoom change
  useEffect(() => {
    updateGrid();
  }, [updateGrid]);

  return {
    state,
    dispatch,
    refs: { canvasRef, gridCanvasRef, previewCanvasRef },
    initCanvas,
    getCoords,
    handlers: {
      handlePointerDown,
      handlePointerMove,
      handlePointerUp,
    },
    actions: {
      undo, redo, copy, paste, cut,
      deleteSelection, clearCanvas,
      flip, rotate, invert,
      applyPalette, doExport, handleImport,
      resizeCanvas,
    },
    updateGridAndPreview,
  };
}
