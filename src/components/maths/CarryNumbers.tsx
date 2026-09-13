import { useRef, type RefObject } from 'react';
import { motion } from 'motion/react';
import { ArrowUp } from 'lucide-react';
import { regroupUnits } from '../../lib/maths';

export function tensLabel(count: number) { return `${count} ${count === 1 ? 'decena' : 'decenas'}`; }
export function onesLabel(count: number) { return `${count} ${count === 1 ? 'unidad' : 'unidades'}`; }

/** Numeric regrouping is independent of the number of addends: 27 carries 2, not 1. */
export function CarryNumbers({ total, selected, onSelect, onCarry, target }: {
  total: number; selected: boolean; onSelect: (value: boolean) => void; onCarry: () => void; target: RefObject<HTMLButtonElement | null>;
}) {
  const dragged = useRef(false);
  const { tens, ones } = regroupUnits(total);
  return <section className="regrouping-area" aria-label="Separar decenas y unidades">
    <p id="carry-instruction">Lleva el {tens} a las decenas.</p>
    <div className="carry-split">
      <motion.button type="button" className={`carry-token ${selected ? 'selected' : ''}`} drag dragSnapToOrigin dragMomentum={false}
        dragTransition={{ bounceStiffness: 500, bounceDamping: 25 }} aria-label={`Llevar ${tensLabel(tens)}`} aria-describedby="carry-instruction" aria-pressed={selected}
        onPointerDown={() => { dragged.current = false; }}
        onPointerCancel={() => { dragged.current = true; onSelect(false); }}
        onDragStart={() => { dragged.current = true; onSelect(true); }}
        onDragEnd={event => {
          if (event.type === 'pointercancel' || event.type === 'touchcancel') { onSelect(false); return; }
          const point = 'changedTouches' in event ? event.changedTouches[0] : event;
          const rect = target.current?.getBoundingClientRect();
          if (rect && point.clientX >= rect.left && point.clientX <= rect.right && point.clientY >= rect.top && point.clientY <= rect.bottom) onCarry();
          else onSelect(false);
        }}
        onClick={event => {
          if (event.detail === 0 || !dragged.current) {
            onSelect(true);
            target.current?.focus({ preventScroll: true });
          }
        }}>
        <ArrowUp size={18} aria-hidden="true" /><strong>{tens}</strong><span>{tens === 1 ? 'decena' : 'decenas'}</span>
      </motion.button>
      <div className="remaining-token" aria-label={`Quedan ${onesLabel(ones)}`}><strong>{ones}</strong><span>{ones === 1 ? 'unidad' : 'unidades'}</span></div>
    </div>
    <p className="carry-equivalence">{onesLabel(total)} = {tensLabel(tens)} y {onesLabel(ones)}</p>
    <p className="carry-gesture">Arrastra el número o tócalo y después toca su destino.</p>
  </section>;
}
