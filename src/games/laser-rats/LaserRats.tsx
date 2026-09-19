import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';
import { ArrowRight, CircleHelp, Cloud, Hand, Radar, RotateCcw, Sparkles, X } from 'lucide-react';
import { SiteShell } from '../../components/SiteShell';
import { BackgroundMusic } from '../../components/BackgroundMusic';
import { soundtracks } from '../../music';
import { useSoundPreference } from '../../services/useSoundPreference';
import { playSound } from '../../sound';
import { usePuzzleGenerator } from './usePuzzleGenerator';
import { useRobotDrag } from './useRobotDrag';
import { RatFace } from './RatFace';
import { LaserRobot } from './LaserRobot';
import { lessons } from './puzzles';
import { cellName, directions, explore, initialState, placeRobot, placementError, radar, robotNames, type Puzzle, type RobotKind } from './rules';
import './laser-rats.css';

const compassPositions = [0, 1, 2, 3, 5, 6, 7, 8];
const shortDirections: Record<RobotKind, string> = { row: 'Izquierda y derecha', column: 'Arriba y abajo', diagonal: 'Las cuatro diagonales' };
function RobotGlyph({ kind }: { kind: RobotKind }) {
  return <span className={`laser-robot-glyph kind-${kind}`} aria-hidden="true"><LaserRobot kind={kind} /></span>;
}

export default function LaserRats() {
  const sound = useSoundPreference();
  const [puzzle, setPuzzle] = useState(lessons[0]);
  const [state, setState] = useState(() => initialState(lessons[0]));
  const [selected, setSelected] = useState(-1);
  const [focused, setFocused] = useState(lessons[0].start);
  const [mode, setMode] = useState<'scan' | number>('scan');
  const [message, setMessage] = useState('');
  const [revision, setRevision] = useState(0);
  const [effects, setEffects] = useState<{ id: number; fresh: number[]; hits: number[] }>({ id: 0, fresh: [], hits: [] });
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const heading = useRef<HTMLHeadingElement>(null);
  const resultButton = useRef<HTMLButtonElement>(null);
  const instructions = useRef<HTMLDialogElement>(null);
  const playing = state.status === 'playing';
  const lesson = lessons.findIndex(entry => entry.id === puzzle.id);
  useEffect(() => { if (!playing) resultButton.current?.focus({ preventScroll: true }); }, [playing]);
  function load(next: Puzzle) {
    setPuzzle(next); setState(initialState(next)); setSelected(-1); setFocused(next.start); setMode('scan'); setRevision(value => value + 1);
    setEffects(value => ({ id: value.id + 1, fresh: [], hits: [] }));
    setMessage('');
    heading.current?.focus({ preventScroll: true });
  }
  const generator = usePuzzleGenerator(load, revision);
  function deploy(robot: number, cell: number | null) {
    setMode('scan');
    if (cell === null) { setMessage(''); return; }
    const error = placementError(puzzle, state, robot, cell);
    if (error) { setMessage(error); return; }
    const next = placeRobot(puzzle, state, robot, cell), caught = next.cleared.length - state.cleared.length;
    setState(next); setSelected(cell); setFocused(cell);
    setEffects(value => ({ id: value.id + 1, fresh: next.discovered.filter(c => !state.discovered.includes(c)), hits: next.cleared.filter(c => !state.cleared.includes(c)) }));
    setMessage('');
    playSound('laser', sound.enabled);
    if (next.status === 'won' || caught) playSound(next.status === 'won' ? 'complete' : 'success', sound.enabled, .2);
    if (next.status === 'playing') buttons.current[cell]?.focus({ preventScroll: true });
  }
  const drag = useRobotDrag(deploy, revision);
  const activeRobot = drag.view?.robot ?? (mode === 'scan' ? null : mode);
  const remainingRobots = puzzle.robots.filter((_, robot) => state.positions[robot] === undefined).length;
  function activate(cell: number) {
    if (!playing) return;
    if (mode !== 'scan') { deploy(mode, cell); return; }
    const result = explore(puzzle, state, cell), next = result.state;
    setPuzzle(result.puzzle); setState(next); setSelected(cell);
    setEffects(value => ({ id: value.id + 1, fresh: next.discovered.filter(c => !state.discovered.includes(c)), hits: [] }));
    setMessage('');
    playSound(next.status === 'lost' ? 'rat' : state.discovered.includes(cell) ? 'tap' : 'scan', sound.enabled);
  }
  function moveFocus(event: KeyboardEvent<HTMLButtonElement>, cell: number) {
    const x = cell % puzzle.size, y = Math.floor(cell / puzzle.size);
    const next = event.key === 'ArrowRight' ? y * puzzle.size + Math.min(puzzle.size - 1, x + 1)
      : event.key === 'ArrowLeft' ? y * puzzle.size + Math.max(0, x - 1)
      : event.key === 'ArrowUp' ? Math.max(0, y - 1) * puzzle.size + x
      : event.key === 'ArrowDown' ? Math.min(puzzle.size - 1, y + 1) * puzzle.size + x : null;
    if (event.key === 'Escape') { setMode('scan'); setMessage(''); }
    if (next !== null) { event.preventDefault(); setFocused(next); buttons.current[next]?.focus(); }
  }
  const outcome = state.status === 'won' ? '¡Misión cumplida!' : state.loss === 'rat' ? '¡Había una rata!' : 'No quedan robots';
  return <div className="laser-experience"><div className="laser-backdrop" aria-hidden="true"><img src="../adventure/chapters/chispa-radio/cockpit-boy-landscape.webp" alt="" /></div><SiteShell soundEnabled={sound.enabled} onToggleSound={sound.toggle}>
    <BackgroundMusic enabled={sound.enabled} src={`../music/${soundtracks.game.file}`} />
    <main className={`laser-game ${drag.view?.moved ? 'is-dragging' : ''}`} onClickCapture={drag.onClickCapture} onPointerDownCapture={drag.onPointerDownCapture} onKeyDown={event => { if (event.key === 'Escape') { setMode('scan'); setMessage(''); } }}>
      {sound.saveFailed && <p className="save-warning" role="alert">No se pudo guardar la preferencia de sonido.</p>}
      <header className="laser-heading"><div className="laser-title"><span className="laser-captain" aria-hidden="true"><LaserRobot kind="row" /></span><h1 ref={heading} tabIndex={-1}>La patrulla láser</h1></div>
        <div className="laser-heading-actions"><label><span className="sr-only">Reto</span><select value={lesson < 0 ? 'generated' : lesson} onChange={event => { if (event.target.value !== 'generated') load(lessons[Number(event.target.value)]); }}>
          {lessons.map((entry, index) => <option key={entry.id} value={index}>{index + 1} · {entry.name}</option>)}{lesson < 0 && <option value="generated">Misión sorpresa</option>}
        </select></label><button className="icon-button" onClick={() => instructions.current?.showModal()} aria-label="Cómo se juega"><CircleHelp size={22} /></button><button className="icon-button" onClick={() => load(puzzle)} aria-label="Reiniciar tablero"><RotateCcw size={22} /></button></div>
      </header>
      <div className="laser-workspace">
        <section className="laser-map" aria-label="Mapa de la misión">
          <div className="laser-map-caption"><span><span className="laser-live-dot" />BODEGA · {puzzle.size} × {puzzle.size}</span><span className="laser-console-lights"><i /><i /><i /></span></div>
          <div className="laser-board" data-size={puzzle.size} role="group" aria-label={`Tablero de ${puzzle.size} por ${puzzle.size}`} aria-describedby="laser-board-instructions" style={{ '--laser-size': puzzle.size } as CSSProperties}>
            <div className="laser-axis-corner" />{Array.from({ length: puzzle.size }, (_, i) => <span className="laser-axis" key={`column-${i}`} aria-hidden="true">{String.fromCharCode(65 + i)}</span>)}
            {Array.from({ length: puzzle.size }, (_, row) => <div className="laser-board-row" key={row}><span className="laser-axis" aria-hidden="true">{row + 1}</span>
              {Array.from({ length: puzzle.size }, (_, column) => {
                const cell = row * puzzle.size + column, known = state.discovered.includes(cell), exposed = known || !playing;
                const wall = exposed && puzzle.walls.includes(cell), caught = state.cleared.includes(cell), rat = !playing && puzzle.rats.includes(cell) && !caught;
                const robotId = puzzle.robots.findIndex((_, id) => state.positions[id] === cell);
                const robot = robotId >= 0 ? puzzle.robots[robotId] : undefined;
                const cellCounts = known && !wall && !rat ? radar(puzzle, state, cell) : [];
                const showClues = playing && cellCounts.some(Boolean);
                const clues = cellCounts.flatMap((count, i) => count ? [`${directions[i].name}: ${count}`] : []);
                const label = `${cellName(cell, puzzle.size)}. ${rat ? 'Rata.' : wall ? 'Pared.' : robot ? `Robot de ${robotNames[robot].toLowerCase()}.` : caught ? 'Rata eliminada. Casilla segura.' : known ? 'Casilla segura.' : exposed ? 'Casilla vacía.' : 'Sin explorar.'}${known && !wall && !rat ? ` Radar: ${clues.join('; ') || 'sin ratas en ninguna dirección'}.` : ''}`;
                return <button key={cell} type="button" ref={element => { buttons.current[cell] = element; }} tabIndex={cell === focused ? 0 : -1}
                  className={`laser-cell ${known ? 'is-known' : 'is-fog'} ${wall ? 'is-wall' : ''} ${rat ? 'has-rat' : ''} ${caught ? 'is-cleared' : ''} ${selected === cell ? 'is-selected' : ''} ${state.hit === cell ? 'is-hit' : ''} ${activeRobot !== null && known && !wall && !robot && playing ? 'can-place' : ''} ${robot ? 'has-robot' : ''} ${showClues ? 'has-clues' : ''} ${drag.view?.moved && drag.view.cell === cell ? placementError(puzzle, state, drag.view.robot, cell) ? 'drop-invalid' : 'drop-valid' : ''}`}
                  aria-label={label} aria-pressed={selected === cell} aria-disabled={!playing} data-cell={cellName(cell, puzzle.size)} data-drop-cell={cell} data-robot={robot} data-robot-id={robotId >= 0 ? robotId : undefined}
                  onFocus={() => setFocused(cell)} onKeyDown={event => moveFocus(event, cell)} onClick={() => activate(cell)}>
                  {wall ? <span className="laser-wall" aria-hidden="true"><i /><i /><i /></span> : robot ? <RobotGlyph kind={robot} /> : rat ? <span className="laser-rat" aria-hidden="true"><RatFace /></span> : caught ? <span className="laser-cleared-mark" aria-hidden="true"><RatFace cleared /></span> : <span className="laser-cell-center" aria-hidden="true">{known ? selected === cell ? <Radar /> : '·' : <Cloud />}</span>}
                  {showClues && <span className="laser-cell-clues" aria-hidden="true">{cellCounts.map((count, i) => count > 0 && <span className="laser-direction-count" key={i} style={{ gridArea: `${Math.floor(compassPositions[i] / 3) + 1} / ${compassPositions[i] % 3 + 1}` }}><span>{directions[i].arrow}</span><strong>{count}</strong></span>)}</span>}
                  {effects.fresh.includes(cell) && <span key={`reveal-${effects.id}`} className="laser-reveal-pulse" aria-hidden="true" />}
                  {effects.hits.includes(cell) && <span key={`hit-${effects.id}`} className="laser-caught-pop" aria-hidden="true"><RatFace /><span>✦</span></span>}
                </button>;
              })}
            </div>)}
            <svg className="laser-beams" viewBox={`0 0 ${puzzle.size} ${puzzle.size}`} aria-hidden="true">
              {state.beams.map((path, i) => {
              const start = path[0], end = path.at(-1)!;
              return <line key={`${revision}-${Object.keys(state.positions).length}-${i}`} pathLength={1} x1={start % puzzle.size + .5} y1={Math.floor(start / puzzle.size) + .5} x2={end % puzzle.size + .5} y2={Math.floor(end / puzzle.size) + .5} />;
            })}</svg>
          </div>
          <p className="sr-only" id="laser-board-instructions">{mode === 'scan' ? 'Toca para explorar. Si hay una rata, termina la ronda.' : 'Elige una casilla descubierta: el robot disparará al llegar.'} Usa las flechas para moverte por el tablero y Enter o Espacio para activar una casilla. Escape vuelve al radar.</p>
        </section>
        <section className="laser-counters" aria-label="Progreso de la misión">
          <div><span className="laser-stat-label">Ratas eliminadas</span><strong key={state.cleared.length} className={`laser-rat-count ${state.cleared.length ? 'is-updated' : ''}`} data-testid="rats-cleared">{state.cleared.length}<small> / {puzzle.rats.length}</small></strong></div>
          <div className="laser-rat-track" aria-hidden="true">{puzzle.rats.map((_, i) => <span key={i} className={i < state.cleared.length ? 'is-done' : ''}><RatFace cleared={i < state.cleared.length} /></span>)}</div>
        </section>
        <section className={`laser-reserve ${remainingRobots === 0 ? 'is-empty' : ''}`} aria-label="Robots de la patrulla">
          <div className="laser-reserve-heading"><strong>Robots</strong><span data-testid="robots-left" aria-live="polite">{remainingRobots}<small> / {puzzle.robots.length}</small></span></div>
          <p className="laser-drag-hint"><Hand size={16} aria-hidden="true" />{remainingRobots ? 'Arrastra al tablero' : 'Todos colocados'}</p>
          {remainingRobots > 0 && <div className="laser-tools">
          {puzzle.robots.map((kind, id) => ({ kind, id })).filter(({ id }) => state.positions[id] === undefined).map(({ kind, id }) =>
            <button key={id} className={`laser-tool kind-${kind} ${activeRobot === id ? 'is-active' : ''}`} disabled={!playing} aria-pressed={mode === id}
              aria-label={`Colocar robot de ${robotNames[kind].toLowerCase()}${puzzle.robots.filter(type => type === kind).length > 1 ? ` ${puzzle.robots.slice(0, id + 1).filter(type => type === kind).length}` : ''}`}
              data-reserve-kind={kind} data-reserve-id={id} {...drag.handlers} onPointerDown={event => drag.start(event, id)}
              onClick={() => { setMode(value => value === id ? 'scan' : id); setMessage(''); }}>
              <RobotGlyph kind={kind} />
            </button>
          )}
          </div>}
        </section>

      </div>
      {(!playing || message) && <div className={`laser-status ${!playing ? `is-${state.status}` : ''}`} role="status" aria-live="polite" aria-atomic="true">
        {!playing ? <>
          {state.status === 'won' && <span className="laser-celebration" aria-hidden="true">{Array.from({ length: 9 }, (_, i) => <i key={i} style={{ '--star': i } as CSSProperties}>✦</i>)}</span>}
          <div>{state.status === 'won' ? <Sparkles aria-hidden="true" /> : <CircleHelp aria-hidden="true" />}<span><strong>{outcome}</strong><p>{state.status === 'won' ? '¡Todas las ratas fuera! Buen trabajo, patrulla.' : state.loss === 'rat' ? 'Mira dónde estaban las ratas y prueba otra estrategia.' : 'Cada robot se coloca una sola vez. Prueba otras posiciones.'}</p></span></div>
          <button ref={resultButton} className="primary" disabled={generator.busy} onClick={() => state.status === 'won' ? lesson >= 0 && lesson < lessons.length - 1 ? load(lessons[lesson + 1]) : generator.generate() : load(puzzle)}>
            {generator.busy ? 'Preparando…' : state.status === 'won' ? <>Siguiente reto<ArrowRight size={18} /></> : <>Otra vez<RotateCcw size={18} /></>}
          </button>
        </> : <p>{message}</p>}
      </div>}
      {generator.error && <p className="laser-generation-error" role="alert">{generator.error}</p>}
      <dialog ref={instructions} className="laser-instructions" aria-labelledby="laser-instructions-title" onClick={event => { if (event.target === event.currentTarget) instructions.current?.close(); }}>
        <div className="laser-instructions-heading"><h2 id="laser-instructions-title">Cómo se juega</h2><button className="icon-button" onClick={() => instructions.current?.close()} aria-label="Cerrar instrucciones"><X size={22} /></button></div>
        <div className="laser-instructions-robots">{(['row', 'column', 'diagonal'] as const).map(kind => <div key={kind}><LaserRobot kind={kind} /><strong>{robotNames[kind]}</strong><span>{shortDirections[kind]}</span></div>)}</div><ol>
        <li>La primera casilla que explores siempre es segura. Después, si haces clic en una rata, pierdes. Puedes leer las pistas y explorar sin límite.</li>
        <li>Los números aparecen dentro de cada casilla descubierta, junto a una flecha que indica la dirección. Cuentan las ratas de toda esa dirección, hasta el borde. No se muestran los ceros.</li>
        <li>Coloca cada robot una sola vez, en una casilla descubierta y libre. Dispara al llegar y se queda fijo: no puedes moverlo ni retirarlo.</li>
        <li>El láser elimina ratas y descubre casillas. Atraviesa otros robots y se detiene en la primera pared. El radar sí cuenta a través de las paredes.</li>
        <li>Explorar descubre también las paredes de las ocho casillas vecinas. Las ratas vecinas siguen ocultas.</li>
        <li>Arrastra un robot de la reserva a una casilla descubierta. Después de disparar permanece en esa casilla. También puedes tocar el robot y luego su destino, o usar Enter y las flechas. Escape cancela la selección.</li>
        <li>Elimina todas las ratas con los robots disponibles. Puedes repetir las veces que quieras. Salir o recargar reinicia el reto.</li>
      </ol></dialog>
      {drag.view?.moved && <div className="laser-drag-ghost" aria-hidden="true" style={{ left: drag.view.x, top: drag.view.y }}><LaserRobot kind={puzzle.robots[drag.view.robot]} /></div>}
    </main>
  </SiteShell></div>;
}
