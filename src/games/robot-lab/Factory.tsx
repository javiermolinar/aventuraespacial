import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Check, Hand, Move, Timer } from 'lucide-react';
import { parts, type PartId } from '../../game';
import { Robot, PartIcon } from './Robot';
import type { RobotDesign } from './design';
import { conveyorArrivalMs, conveyorTravelMs, useConveyor } from './useConveyor';

// Hit areas are in the robot SVG's 400 × 420 coordinate system.
const targets: Record<PartId, { x: number; y: number; width: number; height: number }> = {
  head: { x: 122, y: 24, width: 156, height: 164 },
  body: { x: 139, y: 195, width: 122, height: 111 },
  leftArm: { x: 76, y: 205, width: 61, height: 95 },
  rightArm: { x: 263, y: 205, width: 61, height: 95 },
  leftLeg: { x: 128, y: 307, width: 58, height: 72 },
  rightLeg: { x: 214, y: 307, width: 58, height: 72 },
};

export function Factory({ placed, selected, ready, color, design, complete, activeParts, onPlace, travelMs, paused = false }: {
  placed: PartId[]; selected: PartId; ready: boolean; color: string; design: RobotDesign; complete: boolean; activeParts: typeof parts; onPlace: () => void; travelMs: number; paused?: boolean;
}) {
  const [missed, setMissed] = useState(false);
  const conveyor = useConveyor({ ready, selected, paused, travelMs });
  const armed = conveyor.caught;
  const targetRef = useRef<HTMLButtonElement>(null);
  const pieceRef = useRef<HTMLButtonElement>(null);
  const instructionsId = useId();
  const factoryRef = useRef<HTMLDivElement>(null);
  const hasDragged = useRef(false);
  const reducedMotion = useReducedMotion();
  const target = targets[selected];
  const selectedName = parts.find(part => part.id === selected)!.name;
  const count = activeParts.filter(part => placed.includes(part.id)).length;

  useEffect(() => { setMissed(false); }, [selected, ready]);
  useLayoutEffect(() => {
    if (ready) pieceRef.current?.focus({ preventScroll: true });
    if (ready && window.matchMedia('(max-width: 700px)').matches) {
      factoryRef.current?.scrollIntoView({ block: 'start', behavior: 'instant' });
    }
  }, [ready]);

  return <section className={`factory ${ready ? 'has-piece' : ''} ${armed ? 'piece-selected' : ''}`} aria-label="Fábrica de robots" ref={factoryRef}>
    <div className="factory-stage">
      <div className="factory-floor" aria-hidden="true" />
      <div className="factory-rail" aria-hidden="true"><i /><i /><i /><i /><i /></div>
      <div className={`factory-chute ${ready ? 'open' : ''}`} aria-hidden="true"><span /><i /></div>
      <div className="factory-light" aria-hidden="true"><i className={ready || complete ? 'lit' : ''} /><i /></div>
      <div className="robot-container">
        <Robot placed={placed} selected={selected} ready={ready} color={color} design={design} complete={complete} />
        {ready && <button ref={targetRef} className="part-target" style={{ left: `${target.x / 4}%`, top: `${target.y / 4.2}%`, width: `${target.width / 4}%`, height: `${target.height / 4.2}%` }} aria-label={`Encajar ${selectedName}`} onClick={() => { if (armed) onPlace(); else setMissed(true); }} />}
      </div>
      <div className={`conveyor ${conveyor.running ? 'running' : ''}`} style={{ '--conveyor-pace': travelMs / conveyorTravelMs } as CSSProperties} aria-hidden="true"><div className="belt" /><div className="rollers">{Array.from({ length: 12 }, (_, i) => <i key={i} />)}</div><span className="conveyor-leg leg-left" /><span className="conveyor-leg leg-right" /></div>
      {ready && <div className="conveyor-track"><motion.div className={`falling-piece ${conveyor.onFloor ? 'on-floor' : ''}`} key={selected} style={{ left: reducedMotion ? (conveyor.onFloor ? '100%' : 0) : conveyor.position }} initial={reducedMotion ? false : { y: -480, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ y: { duration: conveyorArrivalMs / 1000, ease: 'easeOut' }, opacity: { duration: 0.15 } }}>
        <motion.button ref={pieceRef} className={`draggable-part ${armed ? 'armed' : ''}`} drag dragSnapToOrigin dragMomentum={false} dragTransition={{ bounceStiffness: 500, bounceDamping: 25 }} aria-label={`Arrastrar ${selectedName}`} aria-pressed={armed} aria-describedby={instructionsId}
          onPointerDown={() => { hasDragged.current = false; conveyor.grab(); setMissed(false); }}
          onPointerCancel={() => { conveyor.release(); setMissed(false); }}
          onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') hasDragged.current = false; }}
          onDragStart={() => { hasDragged.current = true; conveyor.grab(); setMissed(false); }}
          onDragEnd={event => {
            if (event.type === 'pointercancel' || event.type === 'touchcancel') { conveyor.release(); return; }
            const point = 'changedTouches' in event ? event.changedTouches[0] : event;
            const rect = targetRef.current?.getBoundingClientRect();
            if (rect && point.clientX >= rect.left && point.clientX <= rect.right && point.clientY >= rect.top && point.clientY <= rect.bottom) onPlace();
            else { setMissed(true); conveyor.release(); }
          }}
          onClick={event => {
            if (!hasDragged.current && conveyor.grab()) {
              setMissed(false);
              if (event.detail === 0) targetRef.current?.focus({ preventScroll: true });
            }
          }}>
          <PartIcon id={selected} color={color} design={design} /><span className="drag-grip" aria-hidden="true"><Move size={16} /></span>
        </motion.button>
      </motion.div></div>}
      {complete && <div className="confetti" aria-hidden="true">{Array.from({ length: 16 }, (_, index) => <i key={index} style={{ left: `${8 + (index * 17) % 85}%`, top: `${8 + (index * 13) % 66}%`, background: ['#b5a3e8', '#efc775', '#87b99d', '#e9a188'][index % 4], animationDelay: `${index * 0.08}s`, rotate: `${index * 31}deg` }} />)}</div>}
      {missed && <div className="factory-feedback" role="status">{armed ? 'Toca su silueta.' : 'Lleva la pieza a su silueta.'}</div>}
    </div>
    {ready && <div className={`conveyor-status ${armed || conveyor.onFloor ? 'caught' : ''}`}>
      {armed ? <Check size={18} aria-hidden="true" /> : conveyor.onFloor ? <Hand size={18} aria-hidden="true" /> : <Timer size={18} aria-hidden="true" />}
      <span aria-live="polite">{armed ? '¡La tienes! Encájala.' : conveyor.onFloor ? '¡Al suelo! Recoge la pieza.' : '¡Atrápala antes de que caiga!'}</span>
      {!armed && !conveyor.onFloor && <span className="conveyor-seconds" aria-hidden="true">{conveyor.seconds.toLocaleString('es')} s</span>}
      <span id={instructionsId} className="sr-only">{conveyor.onFloor ? 'La pieza está en el suelo. Puedes recogerla sin prisa.' : `Tienes ${(travelMs / 1000).toLocaleString('es')} segundos para atraparla antes de que caiga al suelo.`} Arrastra la pieza o tócala y después toca su silueta. Con teclado, pulsa Enter o Espacio para recogerla y otra vez para encajarla.</span>
    </div>}
    <div className="factory-progress"><div className="parts-tray" aria-label="Piezas del robot">{activeParts.map((part, index) => <div key={part.id} className={`part-card ${part.id === selected && !complete ? 'selected' : ''} ${placed.includes(part.id) ? 'placed' : ''}`} aria-label={`${part.shortName}${placed.includes(part.id) ? ', colocada' : ''}`}><PartIcon id={part.id} color={color} design={design} />{placed.includes(part.id) && <span className="part-check"><Check size={13} /></span>}<span className="sr-only">Pieza {index + 1}</span></div>)}</div><span className="progress-label" role="progressbar" aria-label="Piezas colocadas" aria-valuenow={count} aria-valuemin={0} aria-valuemax={activeParts.length}>{count} / {activeParts.length}</span></div>
  </section>;
}
