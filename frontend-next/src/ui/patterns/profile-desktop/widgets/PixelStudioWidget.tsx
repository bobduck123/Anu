'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Pencil, Eraser, PaintBucket, Undo2, Redo2, Save, Edit3 } from 'lucide-react';
import { usePixelEditor } from '../../education-templates/tools/pixel-studio/usePixelEditor';
import type { PixelTool } from '../../education-templates/tools/pixel-studio/types';

const STORAGE_KEY = 'desktop-pixel-art';
const COMPACT_TOOLS: { tool: PixelTool; icon: React.ElementType }[] = [
  { tool: 'pencil', icon: Pencil },
  { tool: 'eraser', icon: Eraser },
  { tool: 'fill', icon: PaintBucket },
];

const QUICK_PALETTE = [
  '#000000', '#ffffff', '#ef4444', '#f59e0b', '#22c55e',
  '#3b82f6', '#8b5cf6', '#ec4899', '#6b7280', '#d4b5a8',
];

export function PixelStudioWidget() {
  const [mode, setMode] = useState<'display' | 'create'>('display');
  const [savedArt, setSavedArt] = useState<string | null>(() => {
    try {
      return typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    } catch { return null; }
  });
  const displayCanvasRef = useRef<HTMLCanvasElement>(null);

  const {
    state, dispatch, refs: { canvasRef: pixelCanvasRef }, initCanvas,
    handlers: { handlePointerDown, handlePointerMove, handlePointerUp },
    actions,
  } = usePixelEditor({ initialSize: 32, initialZoom: 6 });

  // Draw saved art to display canvas
  useEffect(() => {
    if (!savedArt || !displayCanvasRef.current) return;
    const ctx = displayCanvasRef.current.getContext('2d');
    if (!ctx) return;
    const img = new Image();
    img.onload = () => {
      displayCanvasRef.current!.width = img.width;
      displayCanvasRef.current!.height = img.height;
      ctx.drawImage(img, 0, 0);
    };
    img.src = savedArt;
  }, [savedArt]);

  // Init editor canvas in create mode
  useEffect(() => {
    if (mode === 'create') initCanvas();
  }, [mode, initCanvas]);

  const handleSave = useCallback(() => {
    const canvas = pixelCanvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    setSavedArt(dataUrl);
    try { localStorage.setItem(STORAGE_KEY, dataUrl); } catch { /* ignore */ }
    setMode('display');
  }, [pixelCanvasRef]);

  if (mode === 'display') {
    return (
      <div className="p-4 flex flex-col items-center gap-3">
        <h4 className="text-xs font-medium uppercase tracking-wider opacity-60">Pixel Art</h4>
        {savedArt ? (
          <canvas ref={displayCanvasRef}
            className="w-full max-w-[192px] aspect-square border border-white/10 rounded"
            style={{ imageRendering: 'pixelated' }} />
        ) : (
          <div className="w-full max-w-[192px] aspect-square border border-dashed border-white/20 rounded flex items-center justify-center">
            <p className="text-[10px] opacity-30">No art yet</p>
          </div>
        )}
        <button onClick={() => setMode('create')}
          className="flex items-center gap-1 text-[10px] px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 transition-colors">
          <Edit3 className="w-3 h-3" /> {savedArt ? 'Edit' : 'Create'}
        </button>
      </div>
    );
  }

  const displayW = 32 * state.zoom;
  const displayH = 32 * state.zoom;

  return (
    <div className="p-2 flex flex-col gap-2">
      {/* Compact toolbar */}
      <div className="flex items-center gap-1">
        {COMPACT_TOOLS.map(({ tool, icon: Icon }) => (
          <button key={tool} onClick={() => dispatch({ type: 'SET_TOOL', tool })}
            className={`p-1 rounded ${state.tool === tool ? 'bg-white/20' : 'hover:bg-white/10'}`}>
            <Icon className="w-3 h-3" />
          </button>
        ))}
        <div className="w-px h-4 bg-white/20 mx-0.5" />
        <button onClick={actions.undo} className="p-1 rounded hover:bg-white/10"><Undo2 className="w-3 h-3" /></button>
        <button onClick={actions.redo} className="p-1 rounded hover:bg-white/10"><Redo2 className="w-3 h-3" /></button>
        <div className="flex-1" />
        <button onClick={handleSave}
          className="flex items-center gap-1 px-2 py-1 text-[9px] rounded bg-green-600 hover:bg-green-500 text-white">
          <Save className="w-3 h-3" /> Save
        </button>
      </div>

      {/* Canvas */}
      <div className="flex justify-center overflow-auto" onContextMenu={e => e.preventDefault()}>
        <canvas ref={pixelCanvasRef}
          style={{ width: displayW, height: displayH, imageRendering: 'pixelated', cursor: 'crosshair' }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        />
      </div>

      {/* Quick palette */}
      <div className="flex items-center gap-0.5 overflow-x-auto">
        {QUICK_PALETTE.map(color => (
          <button key={color} onClick={() => dispatch({ type: 'SET_COLOR', color })}
            className={`w-5 h-5 rounded-sm shrink-0 ${state.color === color ? 'ring-1 ring-white' : ''}`}
            style={{ backgroundColor: color }} />
        ))}
      </div>
    </div>
  );
}
