import { useRef, useState, type CSSProperties, type RefObject } from 'react';
import { ArrowRight, Battery, Check, CircleHelp, Droplet, Lightbulb, Play, Radio, RotateCcw, RotateCw } from 'lucide-react';
import { playSound } from '../../sound';
import { openings, pipeFlow, pipeGoals, pipeHint, pipeLeaks, type ConnectionTheme, type PipeEndpoint, type PipeLayout } from './pipes';
import './pipes.css';

const directionNames = ['arriba', 'derecha', 'abajo', 'izquierda'];
const dragDistance = (dx: number, dy: number) => Math.abs(dx) >= Math.abs(dy) ? dx : dy;
const positionName = (index: number, size: number) => `fila ${Math.floor(index / size) + 1}, columna ${index % size + 1}`;
function endpointPosition(endpoint: PipeEndpoint, size: number): CSSProperties {
  const x = (endpoint.index % size + .5) * 100 / size;
  const y = (Math.floor(endpoint.index / size) + .5) * 100 / size;
  return { left: `${endpoint.side === 3 ? -6 : endpoint.side === 1 ? 106 : x}%`, top: `${endpoint.side === 0 ? -6 : endpoint.side === 2 ? 106 : y}%` };
}

function Destination({ endpoint, size, radio, connected, powered, number }: { endpoint: PipeEndpoint; size: number; radio: boolean; connected: boolean; powered: boolean; number?: number }) {
  const label = radio ? `Radio${number ? ` ${number}` : ''} ${powered ? 'encendida' : connected ? 'conectada, sin corriente' : 'apagada'}` : `Depósito${number ? ` ${number}` : ''} ${connected ? 'lleno' : 'vacío'}`;
  return <svg className={`pipe-endpoint ${radio ? 'cable-radio' : 'pipe-tank'}`} style={endpointPosition(endpoint, size)} viewBox="0 0 36 48" role="img" aria-label={`${label}: ${positionName(endpoint.index, size)}, ${directionNames[endpoint.side]}`}>
    {radio ? <>
      <path d="M 9 10 25 2" stroke="#d6aa68" strokeWidth="2" strokeLinecap="round" />
      <rect x="2" y="11" width="32" height="33" rx="5" fill="#183730" stroke="#d6aa68" strokeWidth="2" />
      <rect className="radio-light" x="7" y="17" width="22" height="7" rx="2" fill={powered ? '#ffe381' : '#486057'} />
      <path d="M 8 30 H 20 M 8 35 H 20" stroke="#92b1a2" strokeWidth="2" />
      <circle cx="26" cy="33" r="3" fill="#d6aa68" />
      {number && <text x="18" y="24" textAnchor="middle" fill={powered ? '#183730' : '#fff1d7'} fontSize="10" fontWeight="900">{number}</text>}
    </> : <>
      <rect x="3" y="3" width="30" height="42" rx="6" fill="#14293d" stroke="#f4d39a" strokeWidth="2" />
      <rect className="pipe-tank-water" x="6" y={connected ? 8 : 40} width="24" height={connected ? 34 : 2} rx="3" fill="#65dce9" />
      {number && <text x="18" y="29" textAnchor="middle" fill={connected ? '#102b3c' : '#fff1d7'} fontSize="18" fontWeight="900">{number}</text>}
    </>}
    {connected && <g className="pipe-destination-check">
      <circle cx="29" cy="7" r="8" fill={radio ? '#ffe381' : '#65dce9'} stroke={radio ? '#183730' : '#14293d'} strokeWidth="2" />
      <path d="m 25 7 3 3 5 -6" fill="none" stroke="#102b3c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </g>}
  </svg>;
}

export function PipePuzzle({ layout, rotations, sound, theme = 'water', onRotate, onNext, nextLabel = 'Continuar', solvedMessage, initiallyChecked = false, onCheck, compact = false, onRestart, boardRef }: {
  layout: PipeLayout; rotations: number[]; sound: boolean; theme?: ConnectionTheme; onRotate: (index: number, turns: number) => void; onNext: () => void;
  nextLabel?: string; solvedMessage?: string; initiallyChecked?: boolean; onCheck?: (solved: boolean) => void;
  compact?: boolean; onRestart?: () => void; boardRef?: RefObject<HTMLDivElement | null>;
}) {
  const [hint, setHint] = useState<number | null>(null);
  const [checkedRotations, setCheckedRotations] = useState<string | null>(() => initiallyChecked ? rotations.join(',') : null);
  const [preview, setPreview] = useState<{ index: number; degrees: number } | null>(null);
  const drag = useRef<{ index: number; pointer: number; x: number; y: number; moved: boolean } | null>(null);
  const suppressClick = useRef<number | null>(null);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const flow = pipeFlow(layout, rotations);
  const checked = checkedRotations === rotations.join(',');
  const solved = flow.solved && (!layout.network || checked);
  const wet = !layout.network || checked ? flow.wet : [];
  const goals = pipeGoals(layout);
  const leaks = layout.network && checked ? pipeLeaks(layout, rotations) : [];
  const connectedGoals = goals.map(goal => wet.includes(goal.index) && openings(layout.tiles[goal.index], rotations[goal.index]).includes(goal.side));
  const reached = connectedGoals.filter(Boolean).length;
  const radio = theme === 'radio';
  const stopped = wet.at(-1);
  const noun = radio ? 'cable' : 'tubo';
  const sourceLabel = radio ? `Batería ${solved ? 'conectada' : 'desconectada'}` : 'Entrada de agua';
  // A connected prefix is only a wiring guide. Current flows only after the
  // complete circuit closes and Chispa reconnects the battery.
  const status = solved ? solvedMessage ?? (radio ? '¡Circuito cerrado! Chispa conecta la batería.' : '¡Lo has conseguido!') : hint !== null ? `Prueba a girar el ${noun} de la ${positionName(hint, layout.size)}.` :
    layout.network ? checked ? `Destinos conectados: ${reached} de ${goals.length}. Piezas conectadas: ${flow.wet.length} de ${layout.tiles.length}. Extremos sueltos: ${leaks.length}.` : `${radio ? 'La batería está desconectada.' : 'El agua está cerrada.'} Prepara toda la red y pulsa Probar.` :
    radio ? 'Une los conectores. La batería está desconectada.' : stopped === undefined ? 'Conecta el primer tubo a la entrada de agua.' : `El agua llega hasta la ${positionName(stopped, layout.size)}.`;
  const sourceY = (Math.floor(layout.source.index / layout.size) + .5) * 100 / layout.size;
  const goalYs = goals.map(goal => (Math.floor(goal.index / layout.size) + .5) * 100 / layout.size);

  const turn = (index: number, turns: number) => {
    if (solved || turns % 4 === 0) return;
    const next = rotations.map((rotation, tile) => tile === index ? ((rotation + turns) % 4 + 4) % 4 : rotation);
    playSound(!layout.network && pipeFlow(layout, next).solved ? 'complete' : 'tap', sound);
    setHint(null);
    setCheckedRotations(null);
    onRotate(index, turns);
  };
  const showHint = () => {
    const index = pipeHint(layout, rotations);
    setHint(index);
    if (index !== null) buttons.current[index]?.focus({ preventScroll: true });
  };

  return <section className={`pipe-puzzle theme-${theme} ${solved ? 'is-solved' : ''}`} aria-labelledby="pipe-instruction">
    <h2 id="pipe-instruction" className={compact ? 'sr-only' : undefined}>{layout.network ? radio ? `Conecta todos los cables y las ${goals.length} radios, sin extremos sueltos.` : `Usa todos los tubos y llena los ${goals.length} depósitos, sin fugas.` : radio ? 'Une los cables para cerrar el circuito de la radio.' : 'Gira los tubos para llevar el agua hasta el depósito.'}</h2>
    <p className={compact ? 'sr-only' : 'pipe-gesture'} id="pipe-gesture">Arrastra o toca un {noun} para girarlo.</p>
    {compact ? <div className="pipe-toolbar"><p>{layout.network ? radio ? 'Todos los cables · Sin extremos sueltos' : 'Todos los tubos · Sin fugas' : radio ? 'Conecta la radio' : 'Lleva agua al depósito'}</p>
      <div className="pipe-toolbar-actions">
        {!solved && <button className="icon-button" aria-label="Ayuda" title="Ayuda" onClick={showHint}><CircleHelp size={22} aria-hidden="true" /></button>}
        {onRestart && <button className="icon-button" aria-label="Reiniciar reto" title="Reiniciar reto" onClick={onRestart}><RotateCcw size={22} aria-hidden="true" /></button>}
      </div>
    </div> : <div className="pipe-legend" aria-hidden="true"><span>{radio ? <Battery size={20} /> : <Droplet size={18} />}{radio ? 'Batería' : 'Agua'}</span><span>{goals.length > 1 ? `${goals.length} ${radio ? 'radios' : 'depósitos'}` : radio ? 'Radio' : 'Depósito'}{radio ? <Radio size={20} /> : <ArrowRight size={18} />}</span></div>}
    <div className="pipe-board-frame">
      <div className="pipe-board" ref={boardRef} tabIndex={boardRef ? -1 : undefined} role="group" aria-label={`Tablero de ${layout.size} por ${layout.size}`} aria-describedby="pipe-instruction pipe-gesture" style={{ '--pipe-columns': layout.size } as CSSProperties}>
        {layout.tiles.map((kind, index) => {
          const connected = wet.includes(index);
          const ports = openings(kind, rotations[index]).map(side => directionNames[side]).join(' y ');
          const path = kind === 'tee' ? 'M 50 0 V 100 M 50 50 H 100' : kind === 'straight' ? 'M 50 0 V 100' : 'M 50 0 V 30 Q 50 50 70 50 H 100';
          return <button key={index} ref={element => { buttons.current[index] = element; }} type="button"
            className={`pipe-tile ${connected ? radio ? solved ? 'has-current' : 'is-linked' : 'has-water' : ''} ${hint === index ? 'is-hint' : ''}`}
            aria-label={`${radio ? 'Cable' : 'Tubo'}, ${positionName(index, layout.size)}: ${ports}.${kind === 'tee' ? ' Unión en T.' : ''}${connected ? radio ? solved ? ' Con corriente.' : ' Unido al cable de la batería, sin corriente.' : ' Con agua.' : ''}${index === layout.source.index ? radio ? ' Conector de la batería.' : ' Entrada de agua.' : goals.some(goal => goal.index === index) ? radio ? ' Conector de radio.' : ' Salida al depósito.' : ''} Girar.`}
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
                {radio && <g className="cable-connectors">{openings(kind, 0).map(side => <rect key={side} x="41" y="0" width="18" height="10" rx="2" transform={`rotate(${side * 90} 50 50)`} />)}</g>}
              </g>
              {radio && <g className="cable-mounts"><circle cx="12" cy="12" r="2" /><circle cx="88" cy="88" r="2" /></g>}
              {hint === index && <circle className="pipe-hint-dot" cx="83" cy="17" r="7" />}
            </svg>
          </button>;
        })}
        {radio && <svg className="cable-return" viewBox="0 0 100 100" aria-hidden="true">
          <path d={`M 106 ${Math.min(...goalYs) + 3.5} V 108 H -6 V ${sourceY + 3.5}`} />
          <path d={`M -4 ${sourceY} H 0 ${goalYs.map(y => `M 100 ${y} H 104`).join(' ')}`} />
        </svg>}
        {radio ? <>
          <svg className="pipe-endpoint cable-battery" style={endpointPosition(layout.source, layout.size)} viewBox="0 0 36 48" role="img" aria-label={`${sourceLabel}: ${positionName(layout.source.index, layout.size)}`}>
            <rect x="12" y="1" width="12" height="5" rx="1" fill="#d6aa68" />
            <rect x="5" y="6" width="26" height="37" rx="5" fill="#183730" stroke="#d6aa68" strokeWidth="2" />
            <path d="M 13 17 H 23 M 18 12 V 22 M 13 33 H 23" fill="none" stroke="#ffe3a1" strokeWidth="2" />
          </svg>
        </> : <><svg className="pipe-endpoint pipe-source" style={endpointPosition(layout.source, layout.size)} viewBox="0 0 36 48" role="img" aria-label={`Entrada de agua: ${positionName(layout.source.index, layout.size)}, ${directionNames[layout.source.side]}`}>
          <circle cx="18" cy="24" r="16" fill="#65dce9" />
          <path d="M 8 24 H 27 M 20 17 L 27 24 L 20 31" fill="none" stroke="#102b3c" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" transform={`rotate(${((layout.source.side + 1) % 4) * 90} 18 24)`} />
        </svg>
        </>}
        {goals.map((goal, index) => <Destination key={`${goal.index}-${goal.side}`} endpoint={goal} size={layout.size} radio={radio} connected={connectedGoals[index]} powered={solved} number={goals.length > 1 ? index + 1 : undefined} />)}
      </div>
    </div>
    {radio && <p className={compact ? 'sr-only' : 'cable-return-label'}>Cable de vuelta ya conectado.</p>}
    <p className={compact && !solved && hint === null ? 'sr-only' : 'pipe-status'} role="status">{solved ? <Check size={21} aria-hidden="true" /> : <RotateCw size={19} aria-hidden="true" />}{status}</p>
    {(solved || layout.network || !compact) && <div className={`pipe-actions ${layout.network && !solved ? 'has-test' : ''}`}>{solved ? <button className="primary" onClick={onNext}>{nextLabel}<ArrowRight size={20} /></button> : <>
      {layout.network && <button className="primary pipe-test" onClick={() => {
        setHint(null);
        setCheckedRotations(rotations.join(','));
        playSound(flow.solved ? 'complete' : 'tap', sound);
        onCheck?.(flow.solved);
      }}><Play size={19} aria-hidden="true" />Probar</button>}
      {!compact && <>
        <button className="pipe-help" onClick={showHint}><Lightbulb size={20} aria-hidden="true" />Ayuda</button>
        <button className="text-button" onClick={onNext}>Saltar<ArrowRight size={18} aria-hidden="true" /></button>
      </>}
    </>}</div>}
  </section>;
}
