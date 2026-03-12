'use client';

import type { PointerEvent } from 'react';
import { useRef, useState, useCallback } from 'react';
import { Image, Folder, AppWindow, FileText } from 'lucide-react';
import type { DesktopIconData } from './types';

interface Props {
  icon: DesktopIconData;
  selected: boolean;
  onOpen: (icon: DesktopIconData) => void;
  onSelect: (id: string) => void;
  onMove: (id: string, x: number, y: number) => void;
}

const ICON_MAP = {
  image:  { Icon: Image, gradient: 'from-pink-100 to-purple-100', color: 'text-pink-500' },
  folder: { Icon: Folder, gradient: 'from-amber-100 to-orange-100', color: 'text-amber-600' },
  app:    { Icon: AppWindow, gradient: 'from-blue-100 to-cyan-100', color: 'text-blue-500' },
  file:   { Icon: FileText, gradient: 'from-gray-100 to-stone-100', color: 'text-gray-600' },
} as const;

export function DesktopIcon({ icon, selected, onOpen, onSelect, onMove }: Props) {
  const offset = useRef({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [pos, setPos] = useState({ x: icon.x, y: icon.y });
  const clickTime = useRef(0);

  const { Icon, gradient, color } = ICON_MAP[icon.kind];

  const onPointerDown = useCallback((e: PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    offset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
    setDragging(true);
    onSelect(icon.id);
  }, [pos, icon.id, onSelect]);

  const onPointerMove = useCallback((e: PointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    setPos({ x: e.clientX - offset.current.x, y: e.clientY - offset.current.y });
  }, [dragging]);

  const onPointerUp = useCallback(() => {
    if (!dragging) return;
    setDragging(false);
    onMove(icon.id, pos.x, pos.y);

    const now = Date.now();
    if (now - clickTime.current < 400) {
      onOpen(icon);
    }
    clickTime.current = now;
  }, [dragging, icon, pos, onMove, onOpen]);

  return (
    <div
      className={`absolute flex flex-col items-center w-[80px] cursor-pointer select-none touch-none ${selected ? 'z-10' : ''}`}
      style={{ left: pos.x, top: pos.y }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      role="button"
      tabIndex={0}
      aria-label={icon.label}
      onKeyDown={(e) => { if (e.key === 'Enter') onOpen(icon); }}
    >
      <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-sm ${
        selected ? 'ring-2 ring-white/60' : ''
      }`}>
        <Icon className={`w-7 h-7 ${color}`} />
      </div>
      <span
        className="mt-1 text-[10px] font-medium text-center leading-tight max-w-[80px] truncate"
        style={{
          color: 'var(--text-color)',
          textShadow: '0 1px 3px rgba(0,0,0,0.5)',
        }}
      >
        {icon.label}
      </span>
    </div>
  );
}
