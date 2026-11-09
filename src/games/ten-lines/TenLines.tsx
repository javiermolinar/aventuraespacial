import { useRef, useState, type CSSProperties, type DragEvent } from 'react';
import { Check, Grid3X3, RotateCcw, Shuffle } from 'lucide-react';
import { SiteShell } from '../../components/SiteShell';
import { useSoundPreference } from '../../services/useSoundPreference';
import { playSound } from '../../sound';
import { createPuzzle, difficultiesFor, lineCount, lineSums, matchingLines, sizes, starterPuzzle, starterPuzzle3, swapTiles, TARGET, type Puzzle, type Size } from './game';
import './ten-lines.css';

export default function TenLines() {
  const sound = useSoundPreference();
  const [puzzle, setPuzzle] = useState<Puzzle>(starterPuzzle);
  const [cells, setCells] = useState([...starterPuzzle.initial]);
  const [moves, setMoves] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [dragging, setDragging] = useState<number | null>(null);
  const [message, setMessage] = useState('');
  const draggedCell = useRef<number | null>(null);
  const size = puzzle.size;
  const total = lineCount(size);
  const sums = lineSums(cells, size);
  const matches = matchingLines(cells, size);
  const solved = matches === total;
  const numberWord = size === 2 ? 'cuatro' : 'seis';

  function load(next: Puzzle) {
    setPuzzle(next);
    setCells([...next.initial]);
    setMoves(0);
    setSelected(null);
    setDragging(null);
    setMessage('');
    draggedCell.current = null;
  }

  function swap(source: number, destination: number) {
    if (solved || source === destination) return;
    const next = swapTiles(cells, source, destination);
    setCells(next);
    setMoves(value => value + 1);
    setSelected(null);
    setMessage('');
    playSound(matchingLines(next, size) === total ? 'complete' : 'place', sound.enabled);
  }

  function selectOrSwap(index: number) {
    if (solved) return;
    if (selected === null) {
      setSelected(index);
      setMessage(`Has elegido ${cells[index]}. Ahora elige dónde colocarlo.`);
    } else if (selected === index) {
      setSelected(null);
      setMessage('Selección cancelada.');
    } else {
      swap(selected, index);
    }
  }

  function dragStart(event: DragEvent<HTMLButtonElement>, index: number) {
    if (solved) {
      event.preventDefault();
      return;
    }
    draggedCell.current = index;
    setDragging(index);
    setSelected(null);
    setMessage('');
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', String(index));
  }

  function drop(event: DragEvent<HTMLButtonElement>, destination: number) {
    event.preventDefault();
    const raw = event.dataTransfer.getData('text/plain');
    const source = draggedCell.current ?? (raw === '' ? null : Number(raw));
    draggedCell.current = null;
    setDragging(null);
    if (source !== null && Number.isInteger(source) && source >= 0 && source < cells.length && source !== destination) {
      swap(source, destination);
    }
  }

  function dragEnd() {
    draggedCell.current = null;
    setDragging(null);
  }

  return <SiteShell soundEnabled={sound.enabled} onToggleSound={sound.toggle}>
    <main className="ten-lines-game">
      <header className="ten-lines-heading">
        <span className="ten-lines-emblem" aria-hidden="true"><Grid3X3 size={29} /></span>
        <div><p>SUMAS E INTERCAMBIOS</p><h1>Diez líneas</h1></div>
      </header>
      <p className="ten-lines-instructions">Arrastra una ficha sobre otra para intercambiarlas, o haz clic en dos fichas. Haz que cada <strong>fila y cada columna sumen 10</strong>.</p>

      <section className="ten-lines-panel" aria-label="Puzle Diez líneas">
        <div className="ten-lines-difficulty ten-lines-size" role="group" aria-label="Tamaño">
          {sizes.map(option => <button key={option.id} type="button" aria-pressed={size === option.id} onClick={() => option.id !== size && load(option.id === 2 ? starterPuzzle : starterPuzzle3)}>{option.label}</button>)}
        </div>
        <div className="ten-lines-difficulty" role="group" aria-label="Dificultad">
          {difficultiesFor(size).map(level => <button key={level.id} type="button" aria-pressed={puzzle.difficulty === level.id} onClick={() => load(createPuzzle(level.id, size))}>{level.label}</button>)}
        </div>
        <div className="ten-lines-actions">
          <button className="primary" type="button" onClick={() => load(createPuzzle(puzzle.difficulty, size))}>Nuevo puzle<Shuffle size={19} aria-hidden="true" /></button>
          <button className="secondary" type="button" onClick={() => load(puzzle)}>Reiniciar<RotateCcw size={18} aria-hidden="true" /></button>
        </div>
        <div className="ten-lines-progress-row">
          <p className="ten-lines-progress" role="status" aria-live="polite">{solved ? `¡Resuelto! Las ${total} líneas suman 10` : `${matches} de ${total} líneas suman 10`}</p>
          <p className="ten-lines-moves">{moves} {moves === 1 ? 'movimiento' : 'movimientos'}</p>
        </div>
        {solved && <div className="ten-lines-success" role="status"><Check size={21} aria-hidden="true" />¡Lo conseguiste! Las {numberWord} líneas suman 10.</div>}
        <div className="ten-lines-board-wrap">
          <div className="ten-lines-board" style={{ '--size': size } as CSSProperties} aria-label="Cuadrícula de números">
            {cells.map((value, index) => {
              const row = Math.floor(index / size) + 1;
              const column = index % size + 1;
              return <button key={index} type="button"
                className={`ten-lines-cell${selected === index ? ' is-selected' : ''}${dragging === index ? ' is-dragging' : ''}`}
                draggable={!solved}
                disabled={solved}
                aria-label={`Fila ${row}, columna ${column}: ${value}`}
                aria-pressed={selected === index}
                onClick={() => selectOrSwap(index)}
                onDragStart={event => dragStart(event, index)}
                onDragOver={event => { if (draggedCell.current !== null && draggedCell.current !== index) event.preventDefault(); }}
                onDrop={event => drop(event, index)}
                onDragEnd={dragEnd}
              >{value}</button>;
            })}
            {sums.rows.map((sum, row) => <div key={`row-${row}`} className={`ten-lines-sum${sum === TARGET ? ' is-match' : sum > TARGET ? ' is-over' : ''}`} style={{ gridRow: row + 1, gridColumn: size + 1 }} aria-label={`Total de la fila ${row + 1}: ${sum}. Objetivo: ${TARGET}.`}>{sum}</div>)}
            {sums.columns.map((sum, column) => <div key={`column-${column}`} className={`ten-lines-sum${sum === TARGET ? ' is-match' : sum > TARGET ? ' is-over' : ''}`} style={{ gridRow: size + 1, gridColumn: column + 1 }} aria-label={`Total de la columna ${column + 1}: ${sum}. Objetivo: ${TARGET}.`}>{sum}</div>)}
            <div className="ten-lines-target" style={{ gridRow: size + 1, gridColumn: size + 1 }} aria-label="Objetivo: sumar 10">Σ 10</div>
          </div>
        </div>
        <p className="ten-lines-selection" aria-live="polite">{message}</p>
      </section>
      <p className="ten-lines-footnote">Solo importan las sumas; los números pueden repetirse. Cada puzle parte de una solución válida.</p>
    </main>
  </SiteShell>;
}
