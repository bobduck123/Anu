'use client';

import type { ReactNode, PointerEvent } from 'react';
import { useRef, useCallback, useState } from 'react';
import type { WindowState, DesktopTheme } from './types';
import { getShadow } from './types';

interface Props {
  win: WindowState;
  focused: boolean;
  theme: DesktopTheme;
  onClose: (id: string) => void;
  onFocus: (id: string) => void;
  onMove: (id: string, x: number, y: number) => void;
  onMinimize: (id: string) => void;
  onMaximize: (id: string) => void;
  onResize?: (id: string, w: number, h: number) => void;
  children: ReactNode;
}

export function DesktopWindow({ win, focused, theme, onClose, onFocus, onMove, onMinimize, onMaximize, onResize, children }: Props) {
  const offset = useRef({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [pos, setPos] = useState({ x: win.x, y: win.y });
  const [size, setSize] = useState({ w: win.width, h: win.height });
  const resizeRef = useRef({ startX: 0, startY: 0, startW: 0, startH: 0 });
  const [resizing, setResizing] = useState(false);
  const preMaxRef = useRef({ x: win.x, y: win.y, w: win.width, h: win.height });

  // Sync pos when window is restored from maximize
  const displayPos = win.isMaximized ? { x: 0, y: 0 } : pos;
  const displaySize = win.isMaximized ? { w: window?.innerWidth ?? 1200, h: window?.innerHeight ?? 800 } : size;

  // --- Drag title bar ---
  const onHeaderDown = useCallback((e: PointerEvent<HTMLDivElement>) => {
    if (win.isMaximized) return;
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    offset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
    setDragging(true);
    onFocus(win.id);
  }, [pos, win.id, win.isMaximized, onFocus]);

  const onPointerMove = useCallback((e: PointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    setPos({ x: e.clientX - offset.current.x, y: e.clientY - offset.current.y });
  }, [dragging]);

  const onPointerUp = useCallback(() => {
    if (!dragging) return;
    setDragging(false);
    onMove(win.id, pos.x, pos.y);
  }, [dragging, win.id, pos, onMove]);

  // --- Resize from bottom-right ---
  const onResizeDown = useCallback((e: PointerEvent<HTMLDivElement>) => {
    if (win.isMaximized) return;
    e.preventDefault();
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    resizeRef.current = { startX: e.clientX, startY: e.clientY, startW: size.w, startH: size.h };
    setResizing(true);
    onFocus(win.id);
  }, [win.id, win.isMaximized, size, onFocus]);

  const onResizeMove = useCallback((e: PointerEvent<HTMLDivElement>) => {
    if (!resizing) return;
    const dx = e.clientX - resizeRef.current.startX;
    const dy = e.clientY - resizeRef.current.startY;
    setSize({
      w: Math.max(200, resizeRef.current.startW + dx),
      h: Math.max(150, resizeRef.current.startH + dy),
    });
  }, [resizing]);

  const onResizeUp = useCallback(() => {
    if (!resizing) return;
    setResizing(false);
    onResize?.(win.id, size.w, size.h);
  }, [resizing, win.id, size, onResize]);

  // --- Maximize toggle ---
  const handleMaximize = useCallback(() => {
    if (!win.isMaximized) {
      preMaxRef.current = { x: pos.x, y: pos.y, w: size.w, h: size.h };
    } else {
      setPos({ x: preMaxRef.current.x, y: preMaxRef.current.y });
      setSize({ w: preMaxRef.current.w, h: preMaxRef.current.h });
    }
    onMaximize(win.id);
  }, [win.id, win.isMaximized, pos, size, onMaximize]);

  if (win.isMinimized) return null;

  const borderRadius = `${theme.borderRadius}px`;

  // Button style classes
  const btnBase = 'w-3 h-3 transition-colors';
  const btnRound = theme.buttonStyle === 'pill' || theme.buttonStyle === 'rounded'
    ? 'rounded-full' : theme.buttonStyle === 'sharp' || theme.buttonStyle === 'ghost'
    ? 'rounded-none' : 'rounded-sm';

  return (
    <div
      className="absolute overflow-hidden"
      style={{
        left: displayPos.x,
        top: displayPos.y,
        width: displaySize.w,
        height: displaySize.h,
        zIndex: win.zIndex,
        borderRadius: win.isMaximized ? 0 : borderRadius,
        background: theme.windowBg,
        backdropFilter: `blur(${theme.windowBlur}px) saturate(1.4)`,
        WebkitBackdropFilter: `blur(${theme.windowBlur}px) saturate(1.4)`,
        opacity: theme.windowOpacity,
        border: `1px solid ${focused ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.2)'}`,
        boxShadow: getShadow(theme.shadowIntensity, focused),
        transition: 'box-shadow 0.2s, border-color 0.2s, opacity 0.2s',
        fontFamily: theme.fontFamily,
      }}
      onClick={() => onFocus(win.id)}
    >
      {/* Title bar */}
      <div
        className="flex items-center justify-between px-3 py-2 cursor-grab active:cursor-grabbing select-none"
        style={{ background: focused ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.05)' }}
        onPointerDown={onHeaderDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        <div className="flex items-center gap-1.5">
          {/* Close = Red */}
          <button
            onClick={(e) => { e.stopPropagation(); onClose(win.id); }}
            className={`${btnBase} ${btnRound} bg-red-500 hover:bg-red-400`}
            aria-label="Close"
          />
          {/* Minimize = Yellow */}
          <button
            onClick={(e) => { e.stopPropagation(); onMinimize(win.id); }}
            className={`${btnBase} ${btnRound} bg-yellow-500 hover:bg-yellow-400`}
            aria-label="Minimize"
          />
          {/* Maximize = Green */}
          <button
            onClick={(e) => { e.stopPropagation(); handleMaximize(); }}
            className={`${btnBase} ${btnRound} ${win.isMaximized ? 'bg-green-300' : 'bg-green-500 hover:bg-green-400'}`}
            aria-label="Maximize"
          />
        </div>
        <span className="text-xs font-medium opacity-80 truncate max-w-[180px]" style={{ color: 'var(--text-color)' }}>
          {win.title}
        </span>
        <span className="w-12" />
      </div>

      {/* Content */}
      <div className="overflow-y-auto" style={{ height: `calc(100% - 36px)`, color: 'var(--text-color)' }}>
        {children}
      </div>

      {/* Resize handle (bottom-right) */}
      {!win.isMaximized && (
        <div
          className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize z-10"
          onPointerDown={onResizeDown}
          onPointerMove={onResizeMove}
          onPointerUp={onResizeUp}
        >
          <svg viewBox="0 0 16 16" className="w-full h-full opacity-30">
            <path d="M14 16L16 14M10 16L16 10M6 16L16 6" stroke="currentColor" strokeWidth="1.5" fill="none" />
          </svg>
        </div>
      )}
    </div>
  );
}
