import { useEffect, useRef, useState, type MouseEvent, type PointerEvent } from 'react';

type Drag = { robot: number; x: number; y: number; cell: number | null; moved: boolean };
type Gesture = Drag & { id: number; startX: number; startY: number; source: HTMLButtonElement };

/** Pointer capture supports mouse, pen and touch without native image dragging. */
export function useRobotDrag(onDrop: (robot: number, cell: number | null) => void, revision: number) {
  const [view, setView] = useState<Drag | null>(null);
  const active = useRef<Gesture | null>(null);
  const frame = useRef(0), suppressClick = useRef(false);
  const drop = useRef(onDrop);
  drop.current = onDrop;
  function cellAt(x: number, y: number) {
    const cell = document.elementFromPoint(x, y)?.closest<HTMLElement>('[data-drop-cell]');
    return cell ? Number(cell.dataset.dropCell) : null;
  }
  function stop() {
    const gesture = active.current;
    active.current = null; cancelAnimationFrame(frame.current); setView(null);
    if (gesture?.source.hasPointerCapture(gesture.id)) gesture.source.releasePointerCapture(gesture.id);
    return gesture;
  }
  function cancel() { if (active.current) { suppressClick.current = true; stop(); } }
  useEffect(() => {
    const escape = (event: globalThis.KeyboardEvent) => { if (event.key === 'Escape') cancel(); };
    window.addEventListener('keydown', escape);
    window.addEventListener('blur', cancel);
    window.addEventListener('resize', cancel);
    return () => {
      cancel();
      window.removeEventListener('keydown', escape);
      window.removeEventListener('blur', cancel);
      window.removeEventListener('resize', cancel);
    };
  }, [revision]);
  function tick() {
    const gesture = active.current;
    if (!gesture?.moved) return;
    const edge = 64;
    const speed = gesture.y < edge ? -Math.ceil((edge - gesture.y) / 6)
      : gesture.y > innerHeight - edge ? Math.ceil((gesture.y - innerHeight + edge) / 6) : 0;
    if (speed) {
      window.scrollBy(0, Math.max(-14, Math.min(14, speed)));
      gesture.cell = cellAt(gesture.x, gesture.y); setView({ ...gesture });
    }
    frame.current = requestAnimationFrame(tick);
  }
  function start(event: PointerEvent<HTMLButtonElement>, robot: number) {
    if (active.current || !event.isPrimary || event.button !== 0) return;
    suppressClick.current = false;
    const gesture: Gesture = { robot, id: event.pointerId, source: event.currentTarget, startX: event.clientX, startY: event.clientY,
      x: event.clientX, y: event.clientY, cell: null, moved: false };
    active.current = gesture; setView(gesture);
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  const handlers = {
    onPointerMove(event: PointerEvent<HTMLButtonElement>) {
      const gesture = active.current;
      if (!gesture || gesture.id !== event.pointerId) return;
      gesture.x = event.clientX; gesture.y = event.clientY;
      if (!gesture.moved && Math.hypot(gesture.x - gesture.startX, gesture.y - gesture.startY) > 7) {
        gesture.moved = true; frame.current = requestAnimationFrame(tick);
      }
      if (gesture.moved) { gesture.cell = cellAt(gesture.x, gesture.y); setView({ ...gesture }); }
    },
    onPointerUp(event: PointerEvent<HTMLButtonElement>) {
      if (active.current?.id !== event.pointerId) return;
      const gesture = stop()!;
      if (gesture.moved) {
        suppressClick.current = true;
        const cell = cellAt(event.clientX, event.clientY);
        drop.current(gesture.robot, cell);
      }
    },
    onPointerCancel(event: PointerEvent<HTMLButtonElement>) { if (active.current?.id === event.pointerId) cancel(); },
    onLostPointerCapture(event: PointerEvent<HTMLButtonElement>) { if (active.current?.id === event.pointerId) cancel(); },
  };
  function onClickCapture(event: MouseEvent<HTMLElement>) {
    if (suppressClick.current && event.detail > 0) { event.preventDefault(); event.stopPropagation(); }
    suppressClick.current = false;
  }
  function onPointerDownCapture() { if (!active.current) suppressClick.current = false; }
  return { view, start, handlers, onClickCapture, onPointerDownCapture };
}
