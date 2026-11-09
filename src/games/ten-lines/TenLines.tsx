import { useRef, useState, type DragEvent } from 'react';
import { Check, Grid3X3, RotateCcw, Shuffle } from 'lucide-react';
import { SiteShell } from '../../components/SiteShell';
import { useSoundPreference } from '../../services/useSoundPreference';
import { playSound } from '../../sound';
import { createPuzzle, difficulties, lineSums, matchingLines, starterPuzzle, swapTiles, TARGET, type Puzzle } from './game';
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
  const sums = lineSums(cells);
  const matches = matchingLines(cells);
  const solved = matches === 6;

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
    playSound(matchingLines(next) === 6 ? 'complete' : 'place', sound.enabled);
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
    if (source !== null && Number.isInteger(source) && source >= 0 && source < 9 && source !== destination) {
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
        <div className="ten-lines-difficulty" role="group" aria-label="Dificultad">
          {difficulties.map(level => <button key={level.id} type="button" aria-pressed={puzzle.difficulty === level.id} onClick={() => load(createPuzzle(level.id))}>{level.label}</button>)}
        </div>
        <div className="ten-lines-actions">
          <button className="primary" type="button" onClick={() => load(createPuzzle(puzzle.difficulty))}>Nuevo puzle<Shuffle size={19} aria-hidden="true" /></button>
          <button className="secondary" type="button" onClick={() => load(puzzle)}>Reiniciar<RotateCcw size={18} aria-hidden="true" /></button>
        </div>
        <div className="ten-lines-progress-row">
          <p className="ten-lines-progress" role="status" aria-live="polite">{solved ? '¡Resuelto! Las 6 líneas suman 10' : `${matches} de 6 líneas suman 10`}</p>
          <p className="ten-lines-moves">{moves} {moves === 1 ? 'movimiento' : 'movimientos'}</p>
        </div>
        {solved && <div className="ten-lines-success" role="status"><Check size={21} aria-hidden="true" />¡Lo conseguiste! Las seis líneas suman 10.</div>}
        <div className="ten-lines-board-wrap">
          <div className="ten-lines-board" aria-label="Cuadrícula de números">
            {cells.map((value, index) => {
              const row = Math.floor(index / 3) + 1;
              const column = index % 3 + 1;
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
            {sums.rows.map((sum, row) => <div key={`row-${row}`} className={`ten-lines-sum${sum === TARGET ? ' is-match' : sum > TARGET ? ' is-over' : ''}`} style={{ gridRow: row + 1, gridColumn: 4 }} aria-label={`Total de la fila ${row + 1}: ${sum}. Objetivo: ${TARGET}.`}>{sum}</div>)}
            {sums.columns.map((sum, column) => <div key={`column-${column}`} className={`ten-lines-sum${sum === TARGET ? ' is-match' : sum > TARGET ? ' is-over' : ''}`} style={{ gridRow: 4, gridColumn: column + 1 }} aria-label={`Total de la columna ${column + 1}: ${sum}. Objetivo: ${TARGET}.`}>{sum}</div>)}
            <div className="ten-lines-target" style={{ gridRow: 4, gridColumn: 4 }} aria-label="Objetivo: sumar 10">Σ 10</div>
          </div>
        </div>
        <p className="ten-lines-selection" aria-live="polite">{message}</p>
      </section>
      <p className="ten-lines-footnote">Solo importan las sumas; los números pueden repetirse. Cada puzle parte de una solución válida.</p>
    </main>
  </SiteShell>;
}
