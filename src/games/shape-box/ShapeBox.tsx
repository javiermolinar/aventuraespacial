import { useRef, useState, type CSSProperties, type PointerEvent } from 'react';
import { ArrowRight, Check, RotateCcw } from 'lucide-react';
import { RotationGesture } from './RotationGesture';
import { SiteShell } from '../../components/SiteShell';
import { useSoundPreference } from '../../services/useSoundPreference';
import { playSound } from '../../sound';
import { canPlace, dimensions, initialState, isSolved, occupiedCells, puzzles, rotate, type Cell, type Piece, type Puzzle } from './puzzle';
import './shape-box.css';

type Drag = { id: string; pointer: number; start: Cell; point: Cell; grab: Cell; moved: boolean };

function Shape({ piece, turns }: { piece: Piece; turns: number }) {
  const cells = rotate(piece.cells, turns);
  const { width, height } = dimensions(cells);
  return <span className="packing-shape" aria-hidden="true" style={{ width: `calc(${width} * var(--cell))`, height: `calc(${height} * var(--cell))`, '--piece-color': piece.color } as CSSProperties}>
    {cells.map(({ x, y }, index) => <span className="packing-block" key={`${x},${y}`} style={{ left: `calc(${x} * var(--cell))`, top: `calc(${y} * var(--cell))` }}>{index === 0 ? piece.id : ''}</span>)}
  </span>;
}

export function PackingPuzzle({ puzzle, sound, onNext, last = false }: { puzzle: Puzzle; sound: boolean; onNext: () => void; last?: boolean }) {
  const [state, setState] = useState(() => initialState(puzzle));
  const [selected, setSelected] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [feedback, setFeedback] = useState({ text: 'Elige una pieza para empezar.', visible: false });
  const announce = (text: string, visible = false) => setFeedback({ text, visible });
  const [dragView, setDragView] = useState<Drag | null>(null);
  const [rotating, setRotating] = useState<string | null>(null);
  const pieceSlots = useRef<Record<string, HTMLDivElement | null>>({});
  const drag = useRef<Drag | null>(null);
  const tap = useRef<{ pointer: number; cell: Cell; start: Cell; moved: boolean } | null>(null);
  const suppressClick = useRef(false);
  const board = useRef<HTMLDivElement>(null);
  const solved = isSolved(puzzle, state);
  const selectedPiece = puzzle.pieces.find(piece => piece.id === selected);
  const owner = (x: number, y: number) => puzzle.pieces.find(piece => occupiedCells(piece, state[piece.id]).some(cell => cell.x === x && cell.y === y));

  function select(id: string) {
    if (solved) return;
    setSelected(id);
    announce(`Pieza ${id} elegida.`);
  }

  function place(id: string, position: Cell) {
    if (solved || rotating) return;
    if (!canPlace(puzzle, state, id, { ...position, turns: state[id].turns })) {
      announce('Ahí no cabe. Prueba otro hueco o gira la pieza.', true);
      return;
    }
    const next = { ...state, [id]: { ...state[id], position } };
    setState(next);
    setSelected(null);
    announce(`Pieza ${id} colocada.`);
    playSound(isSolved(puzzle, next) ? 'complete' : 'place', sound);
  }

  function returnToTable(id: string) {
    if (solved || !state[id].position) return;
    setState({ ...state, [id]: { ...state[id], position: null } });
    setSelected(id);
    announce(`Pieza ${id} de vuelta en la mesa.`);
    playSound('tap', sound);
  }

  function activateCell(position: Cell) {
    const piece = owner(position.x, position.y);
    if (piece) select(piece.id);
    else if (selectedPiece) {
      // Anchor taps to the visible letter, not a potentially empty bounding-box
      // corner. Occupied cells can then always select their own piece.
      const anchor = rotate(selectedPiece.cells, state[selectedPiece.id].turns)[0];
      place(selectedPiece.id, { x: position.x - anchor.x, y: position.y - anchor.y });
    } else if (!solved) announce('Elige primero una pieza.', true);
  }

  function turn(id: string, quarterTurns: number) {
    if (solved || drag.current) return;
    select(id);
    const entry = state[id];
    const turns = ((entry.turns + quarterTurns) % 4 + 4) % 4;
    if (entry.position && !canPlace(puzzle, state, id, { ...entry.position, turns })) {
      announce('No hay espacio para girarla aquí. Arrástrala fuera de la caja primero.', true);
      return;
    }
    setState({ ...state, [id]: { ...entry, turns } });
    announce(`Pieza ${id} girada.`);
    playSound('tap', sound);
  }

  function target(active: Drag): Cell | null {
    const rect = board.current?.getBoundingClientRect();
    if (!rect || active.point.x < rect.left || active.point.x >= rect.right || active.point.y < rect.top || active.point.y >= rect.bottom) return null;
    return { x: Math.floor((active.point.x - rect.left) / (rect.width / puzzle.width)) - active.grab.x,
      y: Math.floor((active.point.y - rect.top) / (rect.height / puzzle.height)) - active.grab.y };
  }

  function startDrag(event: PointerEvent<HTMLButtonElement>, id: string, grab: Cell) {
    if (solved || !event.isPrimary || event.button !== 0 || drag.current || tap.current || rotating) return;
    suppressClick.current = false;
    select(id);
    const point = { x: event.clientX, y: event.clientY };
    drag.current = { id, pointer: event.pointerId, start: point, point, grab, moved: false };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function cancelDrag() {
    if (!drag.current && !tap.current) return;
    drag.current = null;
    tap.current = null;
    setDragView(null);
    suppressClick.current = true;
  }

  const hoverHandlers = (id: string | undefined) => ({
    onPointerEnter: (event: PointerEvent<HTMLButtonElement>) => setHovered(event.pointerType === 'mouse' ? id ?? null : null),
    onPointerLeave: () => setHovered(current => current === id ? null : current),
  });

  const pointerHandlers = {
    onPointerMove(event: PointerEvent<HTMLButtonElement>) {
      if (tap.current?.pointer === event.pointerId) tap.current.moved ||= Math.hypot(event.clientX - tap.current.start.x, event.clientY - tap.current.start.y) > 7;
      const active = drag.current;
      if (!active || active.pointer !== event.pointerId) return;
      active.point = { x: event.clientX, y: event.clientY };
      active.moved ||= Math.hypot(active.point.x - active.start.x, active.point.y - active.start.y) > 7;
      if (active.moved) setDragView({ ...active });
    },
    onPointerUp(event: PointerEvent<HTMLButtonElement>) {
      if (tap.current?.pointer === event.pointerId) {
        const pending = tap.current;
        tap.current = null;
        suppressClick.current = true;
        if (!pending.moved) activateCell(pending.cell);
        if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
        return;
      }
      const active = drag.current;
      if (!active || active.pointer !== event.pointerId) return;
      active.point = { x: event.clientX, y: event.clientY };
      drag.current = null;
      setDragView(null);
      // Handle taps here as well: touch browsers need not emit a compatibility click.
      suppressClick.current = true;
      if (active.moved) {
        const position = target(active);
        if (position) place(active.id, position);
        else if (state[active.id].position) returnToTable(active.id);
        else announce('Suelta la pieza dentro de la caja. Sigue en su sitio.', true);
      } else select(active.id);
      if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    },
    onPointerCancel: cancelDrag,
    onLostPointerCapture: cancelDrag,
    onDragStart(event: React.DragEvent) { event.preventDefault(); },
  };

  function rotationEdge(piece: Piece) {
    const entry = state[piece.id];
    const cells = rotate(piece.cells, entry.turns);
    const size = dimensions(cells);
    const corner = cells.filter(cell => cell.y === 0).reduce((rightmost, cell) => cell.x > rightmost.x ? cell : rightmost);
    return <RotationGesture key={piece.id} id={piece.id} hinted={hovered === piece.id} widthInCells={size.width}
      disabled={solved || Boolean(dragView) || (rotating !== null && rotating !== piece.id)}
      style={entry.position ? {
        left: `calc(8px + ${entry.position.x + corner.x + 1} * var(--cell))`, top: `calc(8px + ${entry.position.y} * var(--cell))`,
      } : { left: `calc(var(--piece-inset) + ${corner.x + 1} * var(--cell))`, top: 'var(--piece-inset)' }}
      getBounds={() => {
        if (!entry.position) return pieceSlots.current[piece.id]?.querySelector('.packing-shape')?.getBoundingClientRect() ?? null;
        const rect = board.current?.getBoundingClientRect();
        if (!rect) return null;
        const cell = rect.width / puzzle.width;
        return { left: rect.left + entry.position.x * cell, top: rect.top + entry.position.y * cell, width: size.width * cell, height: size.height * cell };
      }}
      onActive={active => { setRotating(active ? piece.id : null); if (active) select(piece.id); }}
      onRotate={turns => turn(piece.id, turns)}>
      <Shape piece={piece} turns={entry.turns} />
    </RotationGesture>;
  }
  const previewPosition = dragView ? target(dragView) : null;
  const returningToTable = dragView && !previewPosition && state[dragView.id].position;
  const previewValid = dragView && previewPosition ? canPlace(puzzle, state, dragView.id, { ...previewPosition, turns: state[dragView.id].turns }) : false;
  const previewCells = dragView && previewPosition ? occupiedCells(puzzle.pieces.find(piece => piece.id === dragView.id)!, { turns: state[dragView.id].turns, position: previewPosition }) : [];

  // Size against each piece's largest quarter-turn span so rotating cannot
  // overflow the desktop tray or change the shared board/tray cell size.
  const spans = puzzle.pieces.map(piece => { const size = dimensions(piece.cells); return Math.max(size.width, size.height); });
  const trayColumns = puzzle.pieces.length <= 4 ? 2 : 3;
  const trayRows = Math.ceil(spans.length / trayColumns);
  const trayHeight = Array.from({ length: trayRows }, (_, row) => Math.max(...spans.slice(row * trayColumns, (row + 1) * trayColumns))).reduce((sum, height) => sum + height, 0);

  return <section className={`packing-puzzle ${solved ? 'is-solved' : ''}`} aria-label={puzzle.name} style={{
    '--board-columns': puzzle.width,
    '--wide-tray-columns': trayColumns,
    '--tray-rows': trayRows,
    '--packing-width-units': 2 * trayColumns * Math.max(...spans),
    '--packing-height-units': trayHeight,
  } as CSSProperties} onKeyDown={event => {
    if (event.key === 'Escape') { cancelDrag(); setSelected(null); announce('Elige una pieza para empezar.'); }
    if ((event.key === 'Delete' || event.key === 'Backspace') && selected && state[selected].position && !solved && !drag.current && !tap.current && !rotating) {
      event.preventDefault();
      returnToTable(selected);
    }
  }}>
    <div className="packing-workspace">
      <div className="packing-box-area">
        <div className="packing-area-heading"><h2>Tu caja</h2><span>{puzzle.width} × {puzzle.height}</span></div>
        <div className="packing-board-frame">
          <div className="packing-board" ref={board} role="group" aria-label="Caja para las piezas" aria-describedby="packing-instructions packing-controls" style={{ gridTemplateColumns: `repeat(${puzzle.width}, var(--cell))` }}>
            {Array.from({ length: puzzle.width * puzzle.height }, (_, index) => {
              const x = index % puzzle.width, y = Math.floor(index / puzzle.width);
              const piece = owner(x, y);
              const preview = previewCells.some(cell => cell.x === x && cell.y === y);
              return <button type="button" key={index} className={`packing-cell ${piece ? 'is-filled' : ''} ${piece?.id === selected ? 'is-selected' : ''} ${piece?.id === rotating ? 'is-rotating' : ''} ${preview ? previewValid ? 'valid-drop' : 'invalid-drop' : ''}`}
                style={piece ? { '--piece-color': piece.color } as CSSProperties : undefined}
                aria-label={`Fila ${y + 1}, columna ${x + 1}: ${piece ? `pieza ${piece.id}` : 'vacía'}`} aria-disabled={solved}
                {...pointerHandlers}
                {...hoverHandlers(piece?.id)}
                onPointerDown={event => {
                  if (solved || !event.isPrimary || event.button !== 0 || drag.current || tap.current || rotating) return;
                  suppressClick.current = false;
                  // A piece always selects/drags directly, regardless of the previous selection.
                  if (piece) startDrag(event, piece.id, { x: x - state[piece.id].position!.x, y: y - state[piece.id].position!.y });
                  else {
                    tap.current = { pointer: event.pointerId, cell: { x, y }, start: { x: event.clientX, y: event.clientY }, moved: false };
                    event.currentTarget.setPointerCapture(event.pointerId);
                  }
                }}
                onClick={event => {
                  if (event.detail !== 0 && suppressClick.current) { suppressClick.current = false; return; }
                  activateCell({ x, y });
                }}
                onKeyDown={event => {
                  const next = event.key === 'ArrowLeft' ? index - 1 : event.key === 'ArrowRight' ? index + 1 : event.key === 'ArrowUp' ? index - puzzle.width : event.key === 'ArrowDown' ? index + puzzle.width : -1;
                  if (event.key.startsWith('Arrow')) { event.preventDefault(); (board.current?.children[next] as HTMLButtonElement | undefined)?.focus(); }
                }}>
                <span aria-hidden="true">{piece?.id}</span>
              </button>;
            })}
          </div>
          {puzzle.pieces.filter(piece => state[piece.id].position).map(rotationEdge)}
        </div>
        <p className={`packing-status ${solved || feedback.visible || returningToTable ? '' : 'sr-only'}`} role="status">{solved ? last ? '¡Todas las cajas listas! ¡Lo has conseguido!' : '¡Todo encaja! Has llenado la caja.' : returningToTable ? 'Suelta para devolver la pieza a la mesa.' : feedback.text}</p>
        {solved && <div className="packing-feedback">
          <button className="primary" onClick={onNext}>{last ? 'Volver a jugar' : 'Siguiente caja'}<ArrowRight size={20} aria-hidden="true" /></button>
        </div>}
      </div>
      <div className="packing-table">
        <div className="packing-area-heading"><h2>Tus piezas</h2></div>
        <div className="packing-tray" role="group" aria-label="Mesa de piezas">
          {puzzle.pieces.map((piece, index) => <div className="packing-piece-slot" key={piece.id} style={{ '--piece-span': spans[index] } as CSSProperties} ref={element => { pieceSlots.current[piece.id] = element; }}><div className="packing-piece-contents"><button type="button" className={`packing-piece ${selected === piece.id ? 'is-selected' : ''} ${state[piece.id].position ? 'is-packed' : ''} ${rotating === piece.id ? 'is-rotating' : ''}`}
            aria-label={`Pieza ${piece.id}${state[piece.id].position ? ', en la caja' : ''}`} aria-pressed={selected === piece.id} aria-disabled={solved}
            {...pointerHandlers}
            {...hoverHandlers(piece.id)}
            onPointerDown={event => {
              const shape = event.currentTarget.querySelector('.packing-shape')!.getBoundingClientRect();
              const cells = rotate(piece.cells, state[piece.id].turns);
              const size = shape.width / dimensions(cells).width;
              const point = { x: Math.floor((event.clientX - shape.left) / size), y: Math.floor((event.clientY - shape.top) / size) };
              const grab = cells.find(cell => cell.x === point.x && cell.y === point.y) ?? cells[0];
              startDrag(event, piece.id, grab);
            }}
            onClick={event => {
              if (event.detail !== 0 && suppressClick.current) { suppressClick.current = false; return; }
              select(piece.id);
            }}>
            <Shape piece={piece} turns={state[piece.id].turns} />
            <span className="packing-piece-label">{piece.id}{state[piece.id].position && <Check size={14} aria-hidden="true" />}</span>
          </button>
            {!state[piece.id].position && rotationEdge(piece)}
          </div></div>)}
        </div>
      </div>
    </div>
    {dragView && <div className="packing-drag" aria-hidden="true" style={{ left: dragView.point.x, top: dragView.point.y, marginLeft: `calc(-${dragView.grab.x + .5} * var(--cell))`, marginTop: `calc(-${dragView.grab.y + .5} * var(--cell))` }}>
      <Shape piece={puzzle.pieces.find(piece => piece.id === dragView.id)!} turns={state[dragView.id].turns} />
    </div>}
  </section>;
}

export default function ShapeBox() {
  const sound = useSoundPreference();
  const [level, setLevel] = useState(0);
  const [attempt, setAttempt] = useState(0);
  return <SiteShell soundEnabled={sound.enabled} onToggleSound={sound.toggle}>
    <main className="packing-game">
      {sound.saveFailed && <p className="save-warning" role="alert">No se pudo guardar la preferencia de sonido.</p>}
      <header className="packing-heading"><h1>¡Todo encaja!</h1>
        <div className="packing-heading-actions">
          <label className="packing-level">Caja<select value={level} onChange={event => setLevel(Number(event.target.value))}>{puzzles.map((puzzle, index) => <option key={puzzle.name} value={index}>{index + 1} de {puzzles.length} · {puzzle.name}</option>)}</select></label>
          <button type="button" className="icon-button packing-reset" aria-label="Empezar de nuevo" title="Empezar de nuevo" onClick={() => setAttempt(value => value + 1)}><RotateCcw size={23} aria-hidden="true" /></button>
        </div>
      </header>
      <p id="packing-instructions" className="packing-instructions">Arrastra para encajar. Gira desde el borde superior derecho.</p>
      <p id="packing-controls" className="sr-only">Toca una pieza para elegirla, esté donde esté. Para colocarla, toca una casilla vacía: allí irá el bloque con su letra. Con teclado, usa Tab, las flechas y Enter; enfoca el borde y pulsa Enter o Espacio para girar. Supr o Retroceso devuelve la pieza elegida a la mesa.</p>
      <PackingPuzzle key={`${level}-${attempt}`} puzzle={puzzles[level]} sound={sound.enabled} last={level === puzzles.length - 1} onNext={() => setLevel((level + 1) % puzzles.length)} />
    </main>
  </SiteShell>;
}
