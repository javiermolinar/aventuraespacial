import { useState, type DragEvent } from 'react';
import { Check, CircleHelp, Play, RotateCcw, Zap } from 'lucide-react';
import { SiteShell } from '../../components/SiteShell';
import { useSoundPreference } from '../../services/useSoundPreference';
import { branchLevels, components, targetFor, type BranchLevelId, evaluateBoard, levelPieces, slotIds, type ComponentId, type LevelId, type SlotId, emptyResistorState, type ResistorState } from './game';
import './resistor.css';

const slotPositions: Record<1 | 2 | 3, Record<SlotId, { left: string; top: string }>> = {
  1: { A: { left: '30%', top: '50%' }, B: { left: '70%', top: '50%' }, C: { left: '50%', top: '75%' } },
  2: { A: { left: '50%', top: '25%' }, B: { left: '50%', top: '75%' }, C: { left: '70%', top: '50%' } },
  3: { A: { left: '50%', top: '25%' }, B: { left: '50%', top: '50%' }, C: { left: '50%', top: '75%' } },
};

function Piece({ id, vertical = false }: { id: ComponentId; vertical?: boolean }) {
  const piece = components[id];
  return <span className={`pcb-piece pcb-${id} ${vertical ? 'is-vertical' : ''}`} aria-hidden="true">
    <svg className="component-drawing" viewBox="0 0 120 50">
      {id === 'bridge' ? <>
        <path className="metal-lead" d="M0 25H24 M96 25H120" />
        <path className="wire-insulation" d="M24 25C35 7 85 7 96 25" />
        <path className="wire-highlight" d="M27 23C40 11 80 11 93 23" />
        <circle className="wire-end" cx="24" cy="25" r="4" /><circle className="wire-end" cx="96" cy="25" r="4" />
      </> : <>
        <path className="metal-lead" d="M0 25H29 M91 25H120" />
        <rect className="resistor-body" x="29" y="13" width="62" height="24" rx="11" />
        <path className="resistor-shade" d="M34 31H86" />
        <path className="resistor-band band-one" d="M43 15V35" />
        <path className="resistor-band band-two" d="M51 14V36" />
        <path className="resistor-band band-three" d="M76 15V35" />
      </>}
    </svg>
    <small>{id === 'bridge' ? 'PUENTE' : 'RESISTENCIA'}</small>
    <strong>{id === 'bridge' ? '0' : `−${piece.loss}`}</strong>
  </span>;
}

/** Controlled puzzle shared by practice and adventure; the host owns progress. */
export function ResistorPuzzle({ level, state, onChange, onNext }: {
  level: LevelId; state: ResistorState; onChange: (state: ResistorState) => void; onNext?: () => void;
}) {
  const placements = state.placements;
  const [selected, setSelected] = useState<ComponentId | null>(null);
  const [hint, setHint] = useState(false);
  const checked = state.tested;
  const result = evaluateBoard(placements, level);
  const solved = checked && result.solved;
  const broken = checked && result.outcome === 'high';

  function place(slot: SlotId, id: ComponentId) {
    if (solved) return;
    {
      const next = { ...placements };
      const source = slotIds.find(candidate => next[candidate] === id);
      const displaced = next[slot];
      if (source) next[source] = displaced;
      next[slot] = id;
      onChange({ placements: next, tested: false });
    }
    setSelected(null);
    setHint(false);
  }
  function remove(id: ComponentId) {
    if (solved) return;
    {
      const next = { ...placements };
      const source = slotIds.find(slot => next[slot] === id);
      if (source) next[source] = null;
      onChange({ placements: next, tested: false });
    }
    setSelected(null);
  }
  function reset() {
    onChange(emptyResistorState());
    setSelected(null);
    setHint(false);
  }
  function dragStart(event: DragEvent, id: ComponentId) {
    event.dataTransfer.setData('text/plain', id);
    event.dataTransfer.effectAllowed = 'move';
    setSelected(id);
  }
  function drop(event: DragEvent, slot?: SlotId) {
    event.preventDefault();
    const id = event.dataTransfer.getData('text/plain') as ComponentId;
    if (id in components) slot ? place(slot, id) : remove(id);
  }

  const status = solved ? (level > 1 ? `${branchLevels[level as BranchLevelId].slots.map(slot => result.outs[slot]).join(' + ')} = ${targetFor(level)}` : `5${[placements.A, placements.B].map(id => id && components[id].loss > 0 ? ` − ${components[id].loss}` : '').join('')} = ${targetFor(level)}`) : hint ? (level === 2 ? 'Un camino no puede bajar de 0.' : 'C no llega a la bombilla.') : !checked ? '' :
    result.outcome === 'incomplete' ? 'Faltan piezas.' : result.outcome === 'high' ? `Llegan ${result.arrival}: demasiado.` : `Llegan ${result.arrival}: muy poco.`;

  return <div className="resistor-game resistor-puzzle">
      <section className="resistor-console" aria-label="Circuito">
        <div className={`pcb-board pcb-level-${Math.min(level, 3)}`}>
          <svg className="pcb-traces" viewBox="0 0 500 400" preserveAspectRatio="none" aria-hidden="true">
            {level === 1 ? <>
              <path d="M50 200H400 M250 200V360" /><circle cx="250" cy="200" r="9" /><path d="M235 360H265" />
            </> : <>
              <path d="M40 200H90" />
              <path className={checked && result.complete ? 'is-chosen' : ''} d="M90 200V100H300V200" />
              <path className={checked && result.complete ? 'is-chosen' : ''} d="M90 200V300H300V200" />
              {level === 3 && <path className={checked && result.complete ? 'is-chosen' : ''} d="M90 200H300" />}
              <path className={checked && result.complete ? 'is-chosen' : ''} d="M300 200H400" />
              <circle cx="90" cy="200" r="8" /><circle cx="300" cy="200" r="8" />
            </>}
          </svg>
          <span className="pcb-screw screw-a" /><span className="pcb-screw screw-b" /><span className="pcb-screw screw-c" /><span className="pcb-screw screw-d" />
          <div className="pcb-battery" role="img" aria-label={level > 1 ? `Batería: ${branchLevels[level as BranchLevelId].start} chispas por camino` : 'Batería: envía 5 chispas'}><strong>{level === 1 ? '5⚡' : `${branchLevels[level as BranchLevelId].start * branchLevels[level as BranchLevelId].slots.length}⚡`}</strong></div>
          {level > 1 && branchLevels[level as BranchLevelId].slots.map(slot => <span key={`start-${slot}`} className="branch-start" style={{ top: slotPositions[Math.min(level, 3) as 1 | 2 | 3][slot].top }} aria-label={`Empieza con ${branchLevels[level as BranchLevelId].start}`}>{branchLevels[level as BranchLevelId].start}</span>)}
          {level > 1 && branchLevels[level as BranchLevelId].slots.map(slot => result.outs[slot] != null && <span key={`out-${slot}`} className="branch-out" style={{ top: slotPositions[Math.min(level, 3) as 1 | 2 | 3][slot].top }} aria-label={`Camino ${slot}: ${result.outs[slot]}`}>{result.outs[slot]}</span>)}
          {level > 1 && (Object.entries(branchLevels[level as BranchLevelId].fixed) as [SlotId, number][]).map(([slot, loss]) => <div key={`fixed-${slot}`} className="pcb-fixed-resistor" style={{ top: slotPositions[Math.min(level, 3) as 1 | 2 | 3][slot].top }} role="img" aria-label={`Resistencia fija −${loss} en el camino ${slot}`}><Piece id={loss === 1 ? 'r1' : loss === 2 ? 'r2' : 'r3'} /></div>)}
          {slotIds.filter(slot => level === 1 || branchLevels[level as BranchLevelId].slots.includes(slot)).map(slot => {
            const placed = placements[slot];
            return <button key={slot} className={`pcb-slot pcb-slot-${slot.toLowerCase()} ${placed ? 'is-filled' : ''} ${selected && placed === selected ? 'is-selected' : ''}`} style={slotPositions[Math.min(level, 3) as 1 | 2 | 3][slot]} draggable={Boolean(placed) && !solved}
              onDragStart={event => placed && dragStart(event, placed)} onDragOver={event => event.preventDefault()} onDrop={event => drop(event, slot)}
              aria-label={`Hueco ${slot}, ${level > 1 ? `camino ${slot}` : slot === 'C' ? 'sin salida' : 'canal principal'}: ${placed ? components[placed].name : 'vacío'}.${placed ? ' Seleccionar o arrastrar.' : ''}`}
              onClick={() => {
                if (solved) return;
                if (selected) place(slot, selected);
                else if (placed) setSelected(placed);
              }}>
              {placed ? <Piece id={placed} vertical={level === 1 && slot === 'C'} /> : <span className="empty-slot" aria-hidden="true">+</span>}
            </button>;
          })}
          <div className={`pcb-bulb ${solved ? 'is-lit' : ''} ${broken ? 'is-broken' : ''}`} role="img" aria-label={`Bombilla: necesita ${targetFor(level)}. ${solved ? 'Encendida' : broken ? 'Rota por exceso' : checked && result.complete ? 'Apagada' : 'Sin probar'}.`}>
            {broken && <span className="bulb-pop">¡POP!</span>}<svg className="bulb-drawing" viewBox="0 0 100 70" aria-hidden="true">
              {solved && <path className="bulb-rays" d="M58 2V8 M83 6L79 12 M94 25L87 28 M91 55L85 50" />}
              <path className="bulb-lead" d="M0 35H13" />
              <path className="bulb-base" d="M13 24H32V46H13Z M16 29H31 M16 35H31 M16 41H31" />
              <path className="bulb-glass" d="M32 26C39 7 61 4 77 13C94 23 94 47 77 57C61 66 39 63 32 44Z" />
              <path className="bulb-filament" d="M32 35H46L52 27L60 44L67 35H78" />
              {broken && <path className="bulb-crack" d="M67 12L60 27L70 34L60 47L65 60" />}
            </svg><div className="bulb-caption"><strong>{targetFor(level)}</strong></div>
          </div>
        </div>
        <div className="pcb-tray" onDragOver={event => event.preventDefault()} onDrop={event => drop(event)}>
          <div className="tray-pieces">
            {levelPieces[level].filter(id => !slotIds.some(slot => placements[slot] === id)).map(id => <button key={id} className={selected === id ? 'is-selected' : ''} draggable={!solved} onDragStart={event => dragStart(event, id)} onClick={() => setSelected(current => current === id ? null : id)} aria-pressed={selected === id} aria-label={components[id].name}><Piece id={id} /></button>)}
          </div>
        </div>
        <p className={`resistor-status ${solved ? 'is-solved' : ''}`} role="status">{solved && <Check size={21} />}{status}</p>
        <div className="resistor-actions"><button className="primary" onClick={() => { onChange({ placements, tested: true }); setHint(false); }} disabled={solved || !result.complete}><Play size={19} />Probar</button><button onClick={() => setHint(true)} disabled={solved} aria-label="Pista" title="Pista"><CircleHelp size={20} /></button><button onClick={reset} aria-label="Reiniciar tablero" title="Reiniciar tablero"><RotateCcw size={20} /></button></div>
        {solved && onNext && <button className="primary resistor-continue" onClick={onNext}>Continuar</button>}
      </section>
  </div>;
}


export default function ResistorBoard() {
  const sound = useSoundPreference();
  const [state, setState] = useState(emptyResistorState);
  const [level, setLevel] = useState<LevelId>(() => {
    const requested = Number(new URLSearchParams(window.location.search).get('level'));
    return (Number.isInteger(requested) && requested >= 1 && requested <= 7 ? requested : 1) as LevelId;
  });
  function changeLevel(next: LevelId) {
    setLevel(next);
    setState(emptyResistorState());
    const url = new URL(window.location.href);
    if (next === 1) url.searchParams.delete('level');
    else url.searchParams.set('level', String(next));
    window.history.replaceState(null, '', url);
  }
  return <SiteShell soundEnabled={sound.enabled} onToggleSound={sound.toggle}>
    <main className="resistor-game">
      <header className="resistor-heading"><span className="resistor-emblem" aria-hidden="true"><Zap size={29} /></span><h1>El circuito impreso</h1>
        <nav className="resistor-levels" aria-label="Nivel">{([1, 2, 3, 4, 5, 6, 7] as LevelId[]).map(n => <button key={n} aria-pressed={level === n} onClick={() => changeLevel(n)}>{n}</button>)}</nav>
      </header>
      <ResistorPuzzle key={level} level={level} state={state} onChange={setState} />
    </main>
  </SiteShell>;
}
