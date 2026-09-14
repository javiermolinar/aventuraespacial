import { useEffect, useRef, useState, type CSSProperties, type PointerEvent, type ReactNode } from 'react';
import { RotateCw } from 'lucide-react';

type Bounds = { left: number; top: number; width: number; height: number };
type Rotation = { pointer: number; bounds: Bounds; edge: { x: number; y: number }; lastAngle: number; degrees: number };
const angleAt = (event: PointerEvent, bounds: Bounds) => Math.atan2(event.clientY - bounds.top - bounds.height / 2, event.clientX - bounds.left - bounds.width / 2) * 180 / Math.PI;

/** An invisible edge hit area, not a click-to-turn control. Pointer movement
 * previews a continuous rotation; release snaps to the nearest quarter-turn. */
export function RotationGesture({ id, style, disabled, hinted = false, widthInCells, getBounds, onActive, onRotate, children }: {
  id: string; style: CSSProperties; disabled: boolean; hinted?: boolean; widthInCells: number;
  getBounds: () => Bounds | null; onActive: (active: boolean) => void;
  onRotate: (turns: number) => void; children: ReactNode;
}) {
  const gesture = useRef<Rotation | null>(null);
  const [preview, setPreview] = useState<Rotation | null>(null);
  const handle = useRef<HTMLButtonElement>(null);
  const onActiveRef = useRef(onActive);
  onActiveRef.current = onActive;

  function cancel() {
    const active = gesture.current;
    if (!active) return;
    gesture.current = null;
    setPreview(null);
    onActiveRef.current(false);
    if (handle.current?.hasPointerCapture(active.pointer)) handle.current.releasePointerCapture(active.pointer);
  }

  useEffect(() => {
    if (!preview) return;
    const key = (event: KeyboardEvent) => { if (event.key === 'Escape') cancel(); };
    window.addEventListener('keydown', key);
    window.addEventListener('blur', cancel);
    window.addEventListener('resize', cancel);
    return () => {
      window.removeEventListener('keydown', key);
      window.removeEventListener('blur', cancel);
      window.removeEventListener('resize', cancel);
    };
  }, [Boolean(preview)]);

  function update(event: PointerEvent) {
    const active = gesture.current;
    if (!active || event.pointerId !== active.pointer) return null;
    const { bounds } = active;
    // Crossing the center has an unstable angle; wait until the pointer leaves it.
    if (Math.hypot(event.clientX - bounds.left - bounds.width / 2, event.clientY - bounds.top - bounds.height / 2) < 8) return active;
    const next = angleAt(event, bounds);
    active.degrees += ((next - active.lastAngle + 540) % 360) - 180;
    active.lastAngle = next;
    return active;
  }

  let edgeStyle = style;
  if (preview) {
    const { bounds, edge, degrees } = preview;
    const radians = degrees * Math.PI / 180;
    const x = edge.x - bounds.left - bounds.width / 2, y = edge.y - bounds.top - bounds.height / 2;
    edgeStyle = { ...style, position: 'fixed', left: bounds.left + bounds.width / 2 + x * Math.cos(radians) - y * Math.sin(radians),
      top: bounds.top + bounds.height / 2 + x * Math.sin(radians) + y * Math.cos(radians) };
  }

  return <>
    <button ref={handle} type="button" className={`packing-rotate-edge ${preview ? 'is-rotating' : ''} ${hinted && !disabled ? 'is-hinted' : ''}`} style={edgeStyle}
      aria-label={`Girar pieza ${id}`} aria-description="Arrastra el borde alrededor de la pieza. Con teclado, Enter o Espacio gira 90 grados." disabled={disabled}
      onDragStart={event => event.preventDefault()}
      onPointerDown={event => {
        if (disabled || !event.isPrimary || event.button !== 0 || gesture.current) return;
        const bounds = getBounds();
        if (!bounds || !bounds.width || !bounds.height) return;
        event.preventDefault();
        const rect = event.currentTarget.getBoundingClientRect();
        gesture.current = { pointer: event.pointerId, bounds, edge: { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }, lastAngle: angleAt(event, bounds), degrees: 0 };
        setPreview({ ...gesture.current });
        onActive(true);
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onPointerMove={event => { const active = update(event); if (active) setPreview({ ...active }); }}
      onPointerUp={event => {
        const active = update(event);
        if (!active) return;
        // Tolerate atan2 rounding at exact half-turn-step boundaries.
        const turns = Math.sign(active.degrees) * Math.round((Math.abs(active.degrees) + 1e-7) / 90);
        cancel();
        if (turns % 4 !== 0) onRotate(turns);
      }}
      onPointerCancel={event => { if (gesture.current?.pointer === event.pointerId) cancel(); }}
      onLostPointerCapture={event => { if (gesture.current?.pointer === event.pointerId) cancel(); }}
      // Keep a non-drag alternative for keyboard and assistive technology.
      // Real mouse/touch clicks never rotate a piece.
      onClick={event => { if (event.detail === 0 && !gesture.current) onRotate(1); }}>
      <RotateCw className="packing-rotation-cue" size={25} strokeWidth={2.5} aria-hidden="true" />
    </button>
    {preview && <div className="packing-rotation-preview" aria-hidden="true" style={{
      left: preview.bounds.left, top: preview.bounds.top, width: preview.bounds.width, height: preview.bounds.height,
      '--cell': `${preview.bounds.width / widthInCells}px`, transform: `rotate(${preview.degrees}deg)`,
    } as CSSProperties}>{children}</div>}
  </>;
}
