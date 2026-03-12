'use client';

import { useState, useCallback, useRef, type PointerEvent } from 'react';

interface Position { x: number; y: number; }

export function useDrag(
  initial: Position,
  onEnd?: (pos: Position) => void,
) {
  const [pos, setPos] = useState(initial);
  const [dragging, setDragging] = useState(false);
  const offset = useRef({ x: 0, y: 0 });
  const target = useRef<HTMLElement | null>(null);

  const onPointerDown = useCallback((e: PointerEvent<HTMLElement>) => {
    e.preventDefault();
    const el = e.currentTarget;
    el.setPointerCapture(e.pointerId);
    target.current = el;
    offset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
    setDragging(true);
  }, [pos]);

  const onPointerMove = useCallback((e: PointerEvent<HTMLElement>) => {
    if (!dragging) return;
    const next = { x: e.clientX - offset.current.x, y: e.clientY - offset.current.y };
    setPos(next);
  }, [dragging]);

  const onPointerUp = useCallback(() => {
    if (!dragging) return;
    setDragging(false);
    onEnd?.(pos);
  }, [dragging, pos, onEnd]);

  return {
    pos,
    setPos,
    dragging,
    handlers: { onPointerDown, onPointerMove, onPointerUp },
  };
}
