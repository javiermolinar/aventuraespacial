import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Check, Droplets, Radio, Sparkles } from 'lucide-react';
import { SiteShell } from '../../components/SiteShell';
import { useSoundPreference } from '../../services/useSoundPreference';
import { PipePuzzle } from './PipePuzzle';
import { connectionDifficulties, connectionGames } from './levels';
import { pipeFlow, type ConnectionTheme } from './pipes';
import { loadConnectionsProgress, saveConnectionsProgress, type ConnectionsProgress } from './progress';
import './connections.css';

export default function Connections() {
  const theme: ConnectionTheme = new URLSearchParams(window.location.search).get('theme') === 'radio' ? 'radio' : 'water';
  const game = connectionGames[theme];
  const sound = useSoundPreference();
  const [progress, setProgress] = useState(loadConnectionsProgress);
  const [saveFailed, setSaveFailed] = useState(false);
  const [summary, setSummary] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const heading = useRef<HTMLHeadingElement>(null);
  const board = useRef<HTMLDivElement>(null);
  const index = progress.current[theme];
  const level = game.levels[index];
  const rotations = progress.puzzles[level.id]?.rotations ?? level.layout.initial;
  const solved = pipeFlow(level.layout, rotations).solved && (!level.layout.network || progress.puzzles[level.id]?.tested === true);
  const completed = game.levels.filter(entry => progress.puzzles[entry.id]?.completed).length;
  const allDone = completed === game.levels.length;
  const Icon = theme === 'radio' ? Radio : Droplets;

  useEffect(() => { document.title = `${game.title} · Una aventura espacial`; }, [game.title]);
  useEffect(() => { (summary ? heading.current : board.current)?.focus({ preventScroll: true }); }, [index, attempt, summary]);

  function save(next: ConnectionsProgress) {
    setProgress(next);
    setSaveFailed(!saveConnectionsProgress(next));
  }
  function select(next: number) {
    save({ ...progress, current: { ...progress.current, [theme]: next } });
    setSummary(false);
  }
  function restart() {
    save({ ...progress, puzzles: { ...progress.puzzles, [level.id]: { rotations: [...level.layout.initial], completed: Boolean(progress.puzzles[level.id]?.completed) } } });
    setAttempt(value => value + 1);
  }
  function next() {
    if (solved && (index === game.levels.length - 1 || allDone)) setSummary(true);
    else select((index + 1) % game.levels.length);
  }

  return <SiteShell soundEnabled={sound.enabled} onToggleSound={sound.toggle}>
    <main className={`connections-game connections-${theme}`}>
      {(saveFailed || sound.saveFailed) && <p className="save-warning" role="alert">No se puede guardar ahora. Puedes seguir jugando, pero el progreso puede perderse al salir.</p>}
      <header className="connections-heading"><span className="connections-emblem" aria-hidden="true"><Icon size={29} /></span><div><p className="connections-eyebrow">LÓGICA Y CONEXIONES</p><h1>{game.title}</h1></div><span className="connections-count"><Check size={17} aria-hidden="true" />{completed} de {game.levels.length}</span></header>
      <div className="connections-workspace">
        <aside className="connections-levels" aria-label="Elige un reto">
          <div className="connections-levels-heading"><h2>Tu recorrido</h2><span>De inicio a experto</span></div>
          <ol>{game.levels.map((entry, entryIndex) => {
            const done = progress.puzzles[entry.id]?.completed;
            return <li key={entry.id}><button className={`connection-level ${done ? 'is-complete' : ''}`} aria-current={!summary && entryIndex === index ? 'step' : undefined}
              aria-label={`Reto ${entryIndex + 1}: ${entry.name}${done ? ', completado' : ''}`} onClick={() => select(entryIndex)}>
              <span className="connection-level-number" aria-hidden="true">{done ? <Check size={19} /> : entryIndex + 1}</span><span className="connection-level-name">{entry.name}<small>{connectionDifficulties[entryIndex]} · {entry.layout.size} × {entry.layout.size}</small></span>
            </button></li>;
          })}</ol>
        </aside>
        <div className="connections-console">
          {summary ? <section className="connections-summary" aria-labelledby="connections-summary-title">
            <span className="connections-summary-art" aria-hidden="true"><Icon size={64} /><Sparkles size={28} /></span>
            <h2 id="connections-summary-title" ref={heading} tabIndex={-1}>{allDone ? theme === 'radio' ? '¡Todas las radios suenan!' : '¡Todos los depósitos llenos!' : '¡Buen trabajo!'}</h2>
            <p>Has completado {completed} de {game.levels.length} retos.</p>
            {allDone ? <><a className="primary" href={`./connections.html?theme=${theme === 'water' ? 'radio' : 'water'}`}>{theme === 'water' ? 'Jugar con cables' : 'Jugar con agua'}<ArrowRight size={20} aria-hidden="true" /></a><button className="text-button" onClick={() => select(0)}>Volver a los retos</button></> : <button className="primary" onClick={() => select(game.levels.findIndex(entry => !progress.puzzles[entry.id]?.completed))}>Seguir practicando<ArrowRight size={20} aria-hidden="true" /></button>}
          </section> : <>
            <PipePuzzle key={`${level.id}-${attempt}`} layout={level.layout} rotations={rotations} sound={sound.enabled} theme={theme} compact boardRef={board} onRestart={restart}
              nextLabel={index === game.levels.length - 1 || allDone ? 'Ver mis retos' : 'Siguiente reto'}
              solvedMessage={level.layout.network ? theme === 'radio' ? '¡Red completa! Todas las radios encendidas.' : '¡Red completa! Todos los depósitos llenos, sin fugas.' : theme === 'radio' ? '¡Circuito cerrado! La radio está encendida.' : '¡El agua ha llegado! Depósito lleno.'}
              initiallyChecked={progress.puzzles[level.id]?.tested}
              onCheck={complete => save({ ...progress, puzzles: { ...progress.puzzles, [level.id]: { rotations, tested: true, completed: Boolean(progress.puzzles[level.id]?.completed) || complete } } })}
              onRotate={(tile, turns) => {
                const nextRotations = rotations.map((rotation, current) => current === tile ? ((rotation + turns) % 4 + 4) % 4 : rotation);
                save({ ...progress, puzzles: { ...progress.puzzles, [level.id]: { rotations: nextRotations, tested: false, completed: Boolean(progress.puzzles[level.id]?.completed) || (!level.layout.network && pipeFlow(level.layout, nextRotations).solved) } } });
              }} onNext={next} />
          </>}
        </div>
      </div>
    </main>
  </SiteShell>;
}
