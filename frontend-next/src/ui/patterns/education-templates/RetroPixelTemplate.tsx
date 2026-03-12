'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import {
  Pencil, Eraser, Minus, Square, Circle, PaintBucket, BoxSelect, Pipette,
  Undo2, Redo2, Copy, ClipboardPaste, Scissors, FlipHorizontal2, FlipVertical2,
  RotateCcw, RotateCw, Trash2, FileDown, FilePlus, HelpCircle, Sun, Moon,
  Grid3x3, Monitor, Maximize, Image as ImageIcon, Paintbrush,
} from 'lucide-react';
import { usePixelEditor } from './tools/pixel-studio/usePixelEditor';
import type { PixelTool, ExportFormat, ZoomLevel } from './tools/pixel-studio/types';
import { TOOL_LABELS, CANVAS_SIZES, ZOOM_LEVELS } from './tools/pixel-studio/types';

// Lazy-load palettes (code-split ~3700 lines)
const loadPalettes = () => import('./tools/pixel-studio/palettes').then(m => m.PALETTES);

interface Props {
  mode?: 'full' | 'compact';
}

const TOOL_ICONS: Record<PixelTool, React.ElementType> = {
  pencil: Pencil, eraser: Eraser, line: Minus, rect: Square,
  circle: Circle, fill: PaintBucket, select: BoxSelect, picker: Pipette,
};

export function RetroPixelTemplate({ mode = 'full' }: Props) {
  const {
    state, dispatch, refs: { canvasRef, gridCanvasRef, previewCanvasRef }, initCanvas,
    handlers: { handlePointerDown, handlePointerMove, handlePointerUp },
    actions,
  } = usePixelEditor({ initialSize: 64, initialZoom: mode === 'compact' ? 6 : 10 });

  const [palettes, setPalettes] = useState<Record<string, Record<string, string[]>> | null>(null);
  const [currentPalette, setCurrentPalette] = useState<string[]>([]);
  const [toast, setToast] = useState('');
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });
  const importInputRef = useRef<HTMLInputElement>(null);
  const [exportFormat, setExportFormat] = useState<ExportFormat>('image/png');

  // Load palettes
  useEffect(() => {
    loadPalettes().then(p => {
      setPalettes(p);
      // Default to C64
      const c64 = p['Commodore']?.['C64'];
      if (c64) setCurrentPalette(c64);
    });
  }, []);

  // Init canvas after mount
  useEffect(() => {
    initCanvas();
  }, [initCanvas]);

  // Re-init on resize
  useEffect(() => {
    initCanvas();
  }, [state.width, state.height]); // eslint-disable-line react-hooks/exhaustive-deps

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2000);
  }, []);

  const handlePaletteChange = useCallback((key: string) => {
    if (!palettes) return;
    const [mfr, name] = key.split('|');
    const colors = palettes[mfr]?.[name];
    if (colors) {
      setCurrentPalette(colors);
      dispatch({ type: 'SET_PALETTE', name, key });
    }
  }, [palettes, dispatch]);

  const handleColorPick = useCallback((color: string) => {
    dispatch({ type: 'SET_COLOR', color });
  }, [dispatch]);

  const handleCanvasPointerMove = useCallback((e: React.PointerEvent) => {
    handlePointerMove(e);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / (rect.width / state.width));
    const y = Math.floor((e.clientY - rect.top) / (rect.height / state.height));
    setCursorPos({ x: Math.max(0, Math.min(x, state.width - 1)), y: Math.max(0, Math.min(y, state.height - 1)) });
  }, [handlePointerMove, canvasRef, state.width, state.height]);

  const displayW = state.width * state.zoom;
  const displayH = state.height * state.zoom;
  const isCompact = mode === 'compact';

  return (
    <div
      className={`flex flex-col ${isCompact ? 'h-full' : 'min-h-[calc(100vh-56px)]'}`}
      style={{
        background: state.lightMode ? '#e8e0d8' : '#1a1a2e',
        fontFamily: '"Press Start 2P", "Courier New", monospace',
        color: state.lightMode ? '#1a1a2e' : '#e8e0d8',
      }}
    >
      {/* Scanline overlay */}
      {state.crtEnabled && (
        <div className="fixed inset-0 pointer-events-none z-50" style={{
          background: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.12) 0px, rgba(0,0,0,0.12) 1px, transparent 1px, transparent 3px)',
        }} />
      )}

      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b"
        style={{ borderColor: state.lightMode ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.15)' }}>
        <div className="flex items-center gap-2">
          <Paintbrush className="w-4 h-4 text-[#ef4444]" />
          <span className="text-[10px] font-bold tracking-wider">PIXEL STUDIO</span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => dispatch({ type: 'SHOW_MODAL', modal: 'help' })} className="p-1.5 rounded hover:bg-white/10" title="Help">
            <HelpCircle className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => dispatch({ type: 'SHOW_MODAL', modal: 'export' })} className="p-1.5 rounded hover:bg-white/10" title="Export">
            <FileDown className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => importInputRef.current?.click()} className="p-1.5 rounded hover:bg-white/10" title="Import">
            <ImageIcon className="w-3.5 h-3.5" />
          </button>
          <input ref={importInputRef} type="file" accept="image/*" className="hidden"
            onChange={(e) => { if (e.target.files?.[0]) { actions.handleImport(e.target.files[0]); showToast('Imported'); e.target.value = ''; } }} />
          <button onClick={() => dispatch({ type: 'SHOW_MODAL', modal: 'newDoc' })} className="p-1.5 rounded hover:bg-white/10" title="New">
            <FilePlus className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => dispatch({ type: 'TOGGLE_THEME' })} className="p-1.5 rounded hover:bg-white/10" title="Theme">
            {state.lightMode ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
          </button>
          {!isCompact && (
            <button onClick={() => document.documentElement.requestFullscreen?.().catch(() => {})}
              className="p-1.5 rounded hover:bg-white/10" title="Fullscreen">
              <Maximize className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Main body */}
      <div className={`flex-1 flex ${isCompact ? 'flex-col' : 'flex-row'} overflow-hidden`}>

        {/* Left sidebar: Tools */}
        <div className={`${isCompact ? 'flex flex-row gap-1 px-2 py-1 border-b overflow-x-auto' : 'flex flex-col gap-1 p-2 border-r w-12'}`}
          style={{ borderColor: state.lightMode ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)' }}>
          {(Object.keys(TOOL_ICONS) as PixelTool[]).map(t => {
            const Icon = TOOL_ICONS[t];
            return (
              <button key={t} onClick={() => dispatch({ type: 'SET_TOOL', tool: t })}
                className={`p-1.5 rounded transition-colors ${state.tool === t
                  ? (state.lightMode ? 'bg-black/20 ring-1 ring-black/30' : 'bg-white/20 ring-1 ring-white/30')
                  : 'hover:bg-white/10'
                }`}
                title={TOOL_LABELS[t]}>
                <Icon className="w-3.5 h-3.5" />
              </button>
            );
          })}

          <div className={isCompact ? 'w-px bg-current opacity-20 mx-1' : 'h-px bg-current opacity-20 my-1'} />

          <button onClick={() => { actions.undo(); showToast('Undo'); }} className="p-1.5 rounded hover:bg-white/10" title="Undo (Ctrl+Z)">
            <Undo2 className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => { actions.redo(); showToast('Redo'); }} className="p-1.5 rounded hover:bg-white/10" title="Redo (Ctrl+Y)">
            <Redo2 className="w-3.5 h-3.5" />
          </button>

          {!isCompact && (
            <>
              <div className="h-px bg-current opacity-20 my-1" />
              <button onClick={() => { actions.copy(); showToast('Copied'); }} className="p-1.5 rounded hover:bg-white/10" title="Copy"><Copy className="w-3.5 h-3.5" /></button>
              <button onClick={() => { actions.paste(); showToast('Pasted'); }} className="p-1.5 rounded hover:bg-white/10" title="Paste"><ClipboardPaste className="w-3.5 h-3.5" /></button>
              <button onClick={() => { actions.cut(); showToast('Cut'); }} className="p-1.5 rounded hover:bg-white/10" title="Cut"><Scissors className="w-3.5 h-3.5" /></button>
              <div className="h-px bg-current opacity-20 my-1" />
              <button onClick={() => { actions.flip('h'); showToast('Flipped H'); }} className="p-1.5 rounded hover:bg-white/10" title="Flip H"><FlipHorizontal2 className="w-3.5 h-3.5" /></button>
              <button onClick={() => { actions.flip('v'); showToast('Flipped V'); }} className="p-1.5 rounded hover:bg-white/10" title="Flip V"><FlipVertical2 className="w-3.5 h-3.5" /></button>
              <button onClick={() => { actions.rotate(-90); showToast('Rotated'); }} className="p-1.5 rounded hover:bg-white/10" title="Rotate L"><RotateCcw className="w-3.5 h-3.5" /></button>
              <button onClick={() => { actions.rotate(90); showToast('Rotated'); }} className="p-1.5 rounded hover:bg-white/10" title="Rotate R"><RotateCw className="w-3.5 h-3.5" /></button>
              <div className="h-px bg-current opacity-20 my-1" />
              <button onClick={() => dispatch({ type: 'SHOW_MODAL', modal: 'clear' })} className="p-1.5 rounded hover:bg-white/10 text-red-400" title="Clear"><Trash2 className="w-3.5 h-3.5" /></button>
            </>
          )}
        </div>

        {/* Center: Canvas viewport */}
        <div className="flex-1 flex items-center justify-center overflow-auto p-4 relative"
          onContextMenu={(e) => e.preventDefault()}>
          <div className="relative" style={{ width: displayW, height: displayH }}>
            <canvas ref={canvasRef}
              style={{ width: displayW, height: displayH, imageRendering: 'pixelated', cursor: 'crosshair' }}
              onPointerDown={handlePointerDown}
              onPointerMove={handleCanvasPointerMove}
              onPointerUp={handlePointerUp}
            />
            {/* Grid overlay */}
            {state.gridVisible && (
              <canvas ref={gridCanvasRef}
                className="absolute inset-0 pointer-events-none"
                style={{ width: displayW, height: displayH }}
              />
            )}
            {/* Selection box */}
            {state.selection && (
              <div className="absolute border-2 border-dashed border-white pointer-events-none"
                style={{
                  left: state.selection.x * state.zoom,
                  top: state.selection.y * state.zoom,
                  width: state.selection.w * state.zoom,
                  height: state.selection.h * state.zoom,
                  boxShadow: '0 0 0 1px rgba(0,0,0,0.5)',
                }}
              />
            )}
          </div>
        </div>

        {/* Right sidebar: Preview + Palette */}
        {!isCompact && (
          <div className="w-56 border-l p-3 flex flex-col gap-3 overflow-y-auto"
            style={{ borderColor: state.lightMode ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)' }}>
            {/* 1:1 Preview */}
            <div>
              <div className="text-[8px] uppercase tracking-wider opacity-50 mb-1">Preview</div>
              <canvas ref={previewCanvasRef}
                className="w-full border"
                style={{
                  imageRendering: 'pixelated',
                  borderColor: state.lightMode ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.15)',
                  aspectRatio: '1',
                }}
              />
            </div>

            {/* Palette selector */}
            <div>
              <div className="text-[8px] uppercase tracking-wider opacity-50 mb-1">Palette</div>
              {palettes && (
                <select
                  value={state.paletteKey}
                  onChange={(e) => handlePaletteChange(e.target.value)}
                  className="w-full text-[9px] p-1 rounded border bg-transparent"
                  style={{ borderColor: state.lightMode ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.2)' }}
                >
                  {Object.entries(palettes).sort(([a], [b]) => a.localeCompare(b)).map(([mfr, systems]) => (
                    <optgroup key={mfr} label={mfr}>
                      {Object.entries(systems).sort(([a], [b]) => a.localeCompare(b)).map(([name]) => (
                        <option key={`${mfr}|${name}`} value={`${mfr}|${name}`}>{name}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              )}
            </div>

            {/* Color swatches */}
            <div>
              <div className="text-[8px] uppercase tracking-wider opacity-50 mb-1">
                Colors ({currentPalette.length})
              </div>
              <div className="grid grid-cols-8 gap-px">
                {currentPalette.map((color, i) => (
                  <button key={`${color}-${i}`}
                    onClick={() => handleColorPick(color)}
                    className={`w-full aspect-square rounded-sm transition-transform ${state.color === color ? 'ring-2 ring-white scale-110 z-10' : 'hover:scale-105'}`}
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
              </div>
            </div>

            {/* Active color */}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded border" style={{ backgroundColor: state.color, borderColor: 'rgba(255,255,255,0.2)' }} />
              <span className="text-[9px] font-mono">{state.color}</span>
            </div>

            {/* Toggles */}
            <div className="space-y-1.5">
              <label className="flex items-center gap-2 text-[9px] cursor-pointer">
                <input type="checkbox" checked={state.gridVisible} onChange={() => dispatch({ type: 'TOGGLE_GRID' })} className="w-3 h-3" />
                <Grid3x3 className="w-3 h-3" /> Grid
              </label>
              <label className="flex items-center gap-2 text-[9px] cursor-pointer">
                <input type="checkbox" checked={state.crtEnabled} onChange={() => dispatch({ type: 'TOGGLE_CRT' })} className="w-3 h-3" />
                <Monitor className="w-3 h-3" /> CRT Scanlines
              </label>
              <label className="flex items-center gap-2 text-[9px] cursor-pointer">
                <input type="checkbox" checked={state.transEnabled} onChange={() => dispatch({ type: 'TOGGLE_TRANS' })} className="w-3 h-3" />
                Transparency
              </label>
              {state.transEnabled && (
                <div className="flex items-center gap-1 ml-5">
                  <div className="w-4 h-4 rounded border" style={{ backgroundColor: state.transColor, borderColor: 'rgba(255,255,255,0.2)' }} />
                  <button onClick={() => dispatch({ type: 'SET_TRANS_COLOR', color: state.color })} className="text-[8px] underline opacity-60 hover:opacity-100">
                    Use current
                  </button>
                </div>
              )}
            </div>

            {/* Zoom */}
            <div>
              <div className="text-[8px] uppercase tracking-wider opacity-50 mb-1">Zoom</div>
              <select value={state.zoom} onChange={(e) => dispatch({ type: 'SET_ZOOM', zoom: parseInt(e.target.value) as ZoomLevel })}
                className="w-full text-[9px] p-1 rounded border bg-transparent"
                style={{ borderColor: state.lightMode ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.2)' }}>
                {ZOOM_LEVELS.map(z => <option key={z} value={z}>{z}x</option>)}
              </select>
            </div>

            {/* Convert to palette */}
            <button onClick={() => { actions.applyPalette(currentPalette); showToast('Palette applied'); }}
              className="text-[9px] px-2 py-1.5 rounded border hover:bg-white/10 transition-colors"
              style={{ borderColor: state.lightMode ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.2)' }}>
              Convert to Palette
            </button>
          </div>
        )}

        {/* Compact mode: horizontal palette strip */}
        {isCompact && (
          <div className="flex items-center gap-1 px-2 py-1.5 border-t overflow-x-auto"
            style={{ borderColor: state.lightMode ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)' }}>
            <div className="w-5 h-5 rounded border shrink-0" style={{ backgroundColor: state.color, borderColor: 'rgba(255,255,255,0.2)' }} />
            <div className="w-px h-4 bg-current opacity-20 mx-1 shrink-0" />
            {currentPalette.slice(0, 32).map((color, i) => (
              <button key={`${color}-${i}`}
                onClick={() => handleColorPick(color)}
                className={`w-4 h-4 rounded-sm shrink-0 ${state.color === color ? 'ring-1 ring-white' : ''}`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer status bar */}
      <div className="flex items-center justify-between px-3 py-1 border-t text-[8px] opacity-60"
        style={{ borderColor: state.lightMode ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)' }}>
        <span>{cursorPos.x},{cursorPos.y}</span>
        <span>{state.width}x{state.height}</span>
        <span>{state.tool.toUpperCase()}</span>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-16 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg text-[10px] z-50"
          style={{ background: state.lightMode ? '#1a1a2e' : '#e8e0d8', color: state.lightMode ? '#e8e0d8' : '#1a1a2e' }}>
          {toast}
        </div>
      )}

      {/* Export Modal */}
      {state.showExportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => dispatch({ type: 'HIDE_MODAL', modal: 'export' })}>
          <div className="rounded-xl p-6 max-w-xs w-full" onClick={e => e.stopPropagation()}
            style={{ background: state.lightMode ? '#f0ece8' : '#1a1a2e', color: state.lightMode ? '#1a1a2e' : '#e8e0d8' }}>
            <h3 className="text-xs font-bold mb-4">Export Image</h3>
            <div className="space-y-3">
              <div>
                <label className="text-[9px] opacity-60">Format</label>
                <select value={exportFormat} onChange={e => setExportFormat(e.target.value as ExportFormat)}
                  className="w-full mt-1 p-1.5 rounded border bg-transparent text-[10px]"
                  style={{ borderColor: 'rgba(128,128,128,0.3)' }}>
                  <option value="image/png">PNG</option>
                  <option value="image/jpeg">JPEG</option>
                  <option value="image/webp">WebP</option>
                </select>
              </div>
              <div className="flex gap-2">
                <button onClick={() => dispatch({ type: 'HIDE_MODAL', modal: 'export' })}
                  className="flex-1 text-[10px] px-3 py-2 rounded border" style={{ borderColor: 'rgba(128,128,128,0.3)' }}>
                  Cancel
                </button>
                <button onClick={() => { actions.doExport(exportFormat); showToast('Exported'); }}
                  className="flex-1 text-[10px] px-3 py-2 rounded bg-[#ef4444] text-white font-bold">
                  Export
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New Document Modal */}
      {state.showNewDocModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => dispatch({ type: 'HIDE_MODAL', modal: 'newDoc' })}>
          <div className="rounded-xl p-6 max-w-xs w-full" onClick={e => e.stopPropagation()}
            style={{ background: state.lightMode ? '#f0ece8' : '#1a1a2e', color: state.lightMode ? '#1a1a2e' : '#e8e0d8' }}>
            <h3 className="text-xs font-bold mb-4">New Document</h3>
            <div className="grid grid-cols-5 gap-2 mb-4">
              {CANVAS_SIZES.map(size => (
                <button key={size} onClick={() => { actions.resizeCanvas(size); showToast(`New ${size}x${size}`); }}
                  className={`text-[10px] px-2 py-2 rounded border transition-colors hover:bg-white/10`}
                  style={{ borderColor: state.width === size ? '#ef4444' : 'rgba(128,128,128,0.3)' }}>
                  {size}
                </button>
              ))}
            </div>
            <button onClick={() => dispatch({ type: 'HIDE_MODAL', modal: 'newDoc' })}
              className="w-full text-[10px] px-3 py-2 rounded border" style={{ borderColor: 'rgba(128,128,128,0.3)' }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Clear Confirm Modal */}
      {state.showClearModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => dispatch({ type: 'HIDE_MODAL', modal: 'clear' })}>
          <div className="rounded-xl p-6 max-w-xs w-full" onClick={e => e.stopPropagation()}
            style={{ background: state.lightMode ? '#f0ece8' : '#1a1a2e', color: state.lightMode ? '#1a1a2e' : '#e8e0d8' }}>
            <h3 className="text-xs font-bold mb-2">Clear Canvas?</h3>
            <p className="text-[10px] opacity-60 mb-4">This cannot be undone.</p>
            <div className="flex gap-2">
              <button onClick={() => dispatch({ type: 'HIDE_MODAL', modal: 'clear' })}
                className="flex-1 text-[10px] px-3 py-2 rounded border" style={{ borderColor: 'rgba(128,128,128,0.3)' }}>Cancel</button>
              <button onClick={() => { actions.clearCanvas(); showToast('Cleared'); }}
                className="flex-1 text-[10px] px-3 py-2 rounded bg-red-500 text-white font-bold">Clear</button>
            </div>
          </div>
        </div>
      )}

      {/* Help Modal */}
      {state.showHelpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => dispatch({ type: 'HIDE_MODAL', modal: 'help' })}>
          <div className="rounded-xl p-6 max-w-sm w-full max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}
            style={{ background: state.lightMode ? '#f0ece8' : '#1a1a2e', color: state.lightMode ? '#1a1a2e' : '#e8e0d8' }}>
            <h3 className="text-xs font-bold mb-4">Keyboard Shortcuts</h3>
            <div className="space-y-2 text-[9px]">
              {[
                ['B', 'Pencil'], ['E', 'Eraser'], ['L', 'Line'], ['R', 'Rectangle'],
                ['C', 'Circle'], ['F', 'Fill'], ['M', 'Select'], ['I', 'Color Picker'],
                ['Ctrl+Z', 'Undo'], ['Ctrl+Y', 'Redo'], ['Ctrl+C', 'Copy'], ['Ctrl+V', 'Paste'],
                ['Ctrl+X', 'Cut'], ['Del', 'Delete Selection'],
              ].map(([key, action]) => (
                <div key={key} className="flex justify-between">
                  <kbd className="px-1.5 py-0.5 rounded bg-white/10 font-mono">{key}</kbd>
                  <span className="opacity-60">{action}</span>
                </div>
              ))}
            </div>
            <button onClick={() => dispatch({ type: 'HIDE_MODAL', modal: 'help' })}
              className="w-full mt-4 text-[10px] px-3 py-2 rounded border" style={{ borderColor: 'rgba(128,128,128,0.3)' }}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
