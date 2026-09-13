import { useRef, useState, type CSSProperties } from 'react';
import { ArrowRight, Battery, Check, Droplet, Lightbulb, Radio, RotateCw } from 'lucide-react';
import { playSound } from '../../sound';
import { openings, pipeFlow, pipeHint, type ConnectionTheme, type PipeEndpoint, type PipeLayout } from './pipes';
import './pipes.css';

const directionNames = ['arriba', 'derecha', 'abajo', 'izquierda'];
const dragDistance = (dx: number, dy: number) => Math.abs(dx) >= Math.abs(dy) ? dx : dy;
const positionName = (index: number, size: number) => `fila ${Math.floor(index / size) + 1}, columna ${index % size + 1}`;
function endpointPosition(endpoint: PipeEndpoint, size: number): CSSProperties {
  const x = (endpoint.index % size + .5) * 100 / size;
  const y = (Math.floor(endpoint.index / size) + .5) * 100 / size;
  return { left: `${endpoint.side === 3 ? -6 : endpoint.side === 1 ? 106 : x}%`, top: `${endpoint.side === 0 ? -6 : endpoint.side === 2 ? 106 : y}%` };
}

export function PipePuzzle({ layout, rotations, sound, theme = 'water', onRotate, onNext }: {
  layout: PipeLayout; rotations: number[]; sound: boolean; theme?: ConnectionTheme; onRotate: (index: number, turns: number) => void; onNext: () => void;
}) {
  const [hint, setHint] = useState<number | null>(null);
  const [preview, setPreview] = useState<{ index: number; degrees: number } | null>(null);
  const drag = useRef<{ index: number; pointer: number; x: number; y: number; moved: boolean } | null>(null);
  const suppressClick = useRef<number | null>(null);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const { wet, solved } = pipeFlow(layout, rotations);
  const radio = theme === 'radio';
  const stopped = wet.at(-1);
  const noun = radio ? 'cable' : 'tubo';
  const sourceLabel = radio ? `Batería ${solved ? 'conectada' : 'desconectada'}` : 'Entrada de agua';
  const goalLabel = radio ? `Radio ${solved ? 'encendida' : 'apagada'}` : `Depósito ${solved ? 'lleno' : 'vacío'}`;
  // A connected prefix is only a wiring guide. Current flows only after the
  // complete circuit closes and Chispa reconnects the battery.
  const status = solved ? radio ? '¡Circuito cerrado! Chispa conecta la batería.' : '¡Lo has conseguido!' : hint !== null ? `Prueba a girar el ${noun} de la ${positionName(hint, layout.size)}.` :
    radio ? 'Une los conectores. La batería está desconectada.' : stopped === undefined ? 'Conecta el primer tubo a la entrada de agua.' : `El agua llega hasta la ${positionName(stopped, layout.size)}.`;
  const sourceY = (Math.floor(layout.source.index / layout.size) + .5) * 100 / layout.size;
  const goalY = (Math.floor(layout.goal.index / layout.size) + .5) * 100 / layout.size;

  const turn = (index: number, turns: number) => {
    if (solved || turns % 4 === 0) return;
    const next = rotations.map((rotation, tile) => tile === index ? ((rotation + turns) % 4 + 4) % 4 : rotation);
    playSound(pipeFlow(layout, next).solved ? 'complete' : 'tap', sound);
    setHint(null);
    onRotate(index, turns);
  };

  return <section className={`pipe-puzzle theme-${theme} ${solved ? 'is-solved' : ''}`} aria-labelledby="pipe-instruction">
    <h2 id="pipe-instruction">{radio ? 'Une los cables para cerrar el circuito de la radio.' : 'Gira los tubos para llevar el agua hasta el depósito.'}</h2>
    <p className="pipe-gesture" id="pipe-gesture">Arrastra o toca un {noun} para girarlo.</p>
    <div className="pipe-legend" aria-hidden="true"><span>{radio ? <Battery size={20} /> : <Droplet size={18} />}{radio ? 'Batería' : 'Agua'}</span><span>{radio ? 'Radio' : 'Depósito'}{radio ? <Radio size={20} /> : <ArrowRight size={18} />}</span></div>
    <div className="pipe-board-frame">
      <div className="pipe-board" role="group" aria-label={`Tablero de ${layout.size} por ${layout.size}`} aria-describedby="pipe-gesture" style={{ '--pipe-columns': layout.size } as CSSProperties}>
        {layout.tiles.map((kind, index) => {
          const connected = wet.includes(index);
          const ports = openings(kind, rotations[index]).map(side => directionNames[side]).join(' y ');
          const path = kind === 'straight' ? 'M 50 0 V 100' : 'M 50 0 V 30 Q 50 50 70 50 H 100';
          return <button key={index} ref={element => { buttons.current[index] = element; }} type="button"
            className={`pipe-tile ${connected ? radio ? solved ? 'has-current' : 'is-linked' : 'has-water' : ''} ${hint === index ? 'is-hint' : ''}`}
            aria-label={`${radio ? 'Cable' : 'Tubo'}, ${positionName(index, layout.size)}: ${ports}.${connected ? radio ? solved ? ' Con corriente.' : ' Unido al cable de la batería, sin corriente.' : ' Con agua.' : ''}${index === layout.source.index ? radio ? ' Conector de la batería.' : ' Entrada de agua.' : index === layout.goal.index ? radio ? ' Conector de la radio.' : ' Salida al depósito.' : ''} Girar.`}
            aria-disabled={solved} data-rotation={rotations[index]} onDragStart={event => event.preventDefault()}
            onPointerDown={event => {
              if (solved || !event.isPrimary || event.button !== 0 || drag.current) return;
              suppressClick.current = null;
              drag.current = { index, pointer: event.pointerId, x: event.clientX, y: event.clientY, moved: false };
              event.currentTarget.setPointerCapture(event.pointerId);
            }}
            onPointerMove={event => {
              const active = drag.current;
              if (!active || active.pointer !== event.pointerId) return;
              const distance = dragDistance(event.clientX - active.x, event.clientY - active.y);
              if (Math.abs(distance) >= 10) active.moved = true;
              if (active.moved) setPreview({ index, degrees: distance * 90 / 40 });
            }}
            onPointerUp={event => {
              const active = drag.current;
              if (!active || active.pointer !== event.pointerId) return;
              drag.current = null;
              setPreview(null);
              const distance = dragDistance(event.clientX - active.x, event.clientY - active.y);
              if (active.moved || Math.abs(distance) >= 10) {
                suppressClick.current = index;
                if (Math.abs(distance) >= 10) turn(index, Math.sign(distance) * Math.max(1, Math.round(Math.abs(distance) / 40)));
              } else if (event.pointerType === 'touch') {
                // Browsers can omit the compatibility click after a cancelled gesture.
                // Handle the tap here, and suppress that click if it does arrive.
                suppressClick.current = index;
                turn(index, 1);
              }
              if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
            }}
            onPointerCancel={() => { drag.current = null; setPreview(null); suppressClick.current = index; }}
            onLostPointerCapture={() => {
              if (drag.current?.index === index) { drag.current = null; setPreview(null); suppressClick.current = index; }
            }}
            onClick={event => {
              if (event.detail !== 0 && suppressClick.current === index) { suppressClick.current = null; return; }
              turn(index, 1);
            }}>
            <svg viewBox="0 0 100 100" aria-hidden="true">
              <g transform={`rotate(${rotations[index] * 90 + (preview?.index === index ? preview.degrees : 0)} 50 50)`}>
                <path className="pipe-rim" d={path} />
                <path className="pipe-channel" d={path} />
                {connected && (!radio || solved) && <><path className="pipe-water" d={path} /><path className="pipe-glint" d={path} /></>}
                {radio && <g className="cable-connectors"><rect x="41" y="0" width="18" height="10" rx="2" />{kind === 'straight' ? <rect x="41" y="90" width="18" height="10" rx="2" /> : <rect x="90" y="41" width="10" height="18" rx="2" />}</g>}
              </g>
              {radio && <g className="cable-mounts"><circle cx="12" cy="12" r="2" /><circle cx="88" cy="88" r="2" /></g>}
              {hint === index && <circle className="pipe-hint-dot" cx="83" cy="17" r="7" />}
            </svg>
          </button>;
        })}
        {radio && <svg className="cable-return" viewBox="0 0 100 100" aria-hidden="true">
          <path d={`M 106 ${goalY + 3.5} V 108 H -6 V ${sourceY + 3.5}`} />
          <path d={`M -4 ${sourceY} H 0 M 100 ${goalY} H 104`} />
        </svg>}
        {radio ? <>
          <svg className="pipe-endpoint cable-battery" style={endpointPosition(layout.source, layout.size)} viewBox="0 0 36 48" role="img" aria-label={`${sourceLabel}: ${positionName(layout.source.index, layout.size)}`}>
            <rect x="12" y="1" width="12" height="5" rx="1" fill="#d6aa68" />
            <rect x="5" y="6" width="26" height="37" rx="5" fill="#183730" stroke="#d6aa68" strokeWidth="2" />
            <path d="M 13 17 H 23 M 18 12 V 22 M 13 33 H 23" fill="none" stroke="#ffe3a1" strokeWidth="2" />
          </svg>
          <svg className="pipe-endpoint cable-radio" style={endpointPosition(layout.goal, layout.size)} viewBox="0 0 36 48" role="img" aria-label={`${goalLabel}: ${positionName(layout.goal.index, layout.size)}`}>
            <path d="M 9 10 25 2" stroke="#d6aa68" strokeWidth="2" strokeLinecap="round" />
            <rect x="2" y="11" width="32" height="33" rx="5" fill="#183730" stroke="#d6aa68" strokeWidth="2" />
            <rect className="radio-light" x="7" y="17" width="22" height="7" rx="2" fill={solved ? '#ffe381' : '#486057'} />
            <path d="M 8 30 H 20 M 8 35 H 20" stroke="#92b1a2" strokeWidth="2" />
            <circle cx="26" cy="33" r="3" fill="#d6aa68" />
          </svg>
        </> : <><svg className="pipe-endpoint pipe-source" style={endpointPosition(layout.source, layout.size)} viewBox="0 0 36 48" role="img" aria-label={`Entrada de agua: ${positionName(layout.source.index, layout.size)}, ${directionNames[layout.source.side]}`}>
          <circle cx="18" cy="24" r="16" fill="#65dce9" />
          <path d="M 8 24 H 27 M 20 17 L 27 24 L 20 31" fill="none" stroke="#102b3c" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" transform={`rotate(${((layout.source.side + 1) % 4) * 90} 18 24)`} />
        </svg>
        <svg className="pipe-endpoint pipe-tank" style={endpointPosition(layout.goal, layout.size)} viewBox="0 0 36 48" role="img" aria-label={`Depósito ${solved ? 'lleno' : 'vacío'}: ${positionName(layout.goal.index, layout.size)}, ${directionNames[layout.goal.side]}`}>
          <rect x="3" y="3" width="30" height="42" rx="6" fill="#14293d" stroke="#f4d39a" strokeWidth="2" />
          <rect className="pipe-tank-water" x="6" y={solved ? 8 : 40} width="24" height={solved ? 34 : 2} rx="3" fill="#65dce9" />
          {solved && <path d="m 10 24 6 6 11 -12" fill="none" stroke="#102b3c" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />}
        </svg></>}
      </div>
    </div>
    {radio && <p className="cable-return-label">Cable de vuelta ya conectado.</p>}
    <p className="pipe-status" role="status">{solved ? <Check size={21} aria-hidden="true" /> : <RotateCw size={19} aria-hidden="true" />}{status}</p>
    <div className="pipe-actions">{solved ? <button className="primary" onClick={onNext}>Continuar<ArrowRight size={20} /></button> : <>
      <button className="pipe-help" onClick={() => {
        const index = pipeHint(layout, rotations);
        setHint(index);
        if (index !== null) buttons.current[index]?.focus({ preventScroll: true });
      }}><Lightbulb size={20} aria-hidden="true" />Ayuda</button>
      <button className="text-button" onClick={onNext}>Saltar<ArrowRight size={18} aria-hidden="true" /></button>
    </>}</div>
  </section>;
}
