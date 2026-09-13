import { useRef, useState } from 'react';
import { ArrowRight, Check, Hand, RotateCcw } from 'lucide-react';
import { parts, operationLabel, resultOf } from '../game';
import { Factory } from '../games/robot-lab/Factory';
import { MathPuzzle } from '../components/maths/MathPuzzle';
import type { AdventureProgress } from './progress';
import { personalize } from './personalization';
import type { BuildScene, Chapter, ComprehensionScene, Scene, SequenceScene } from './types';
import '../games/robot-lab/robot-lab.css';

function shake(element: HTMLElement) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  element.getAnimations().forEach(animation => animation.cancel());
  element.animate([0, -5, 5, -4, 4, 0].map(x => ({ transform: `translateX(${x}px)` })), { duration: 300, easing: 'ease-out' });
}

export function Comprehension({ scene, playerName = '', onNext }: { scene: ComprehensionScene; playerName?: string; onNext: () => void }) {
  const [selected, setSelected] = useState<string | null>(null);
  const answer = scene.options.find(option => option.id === selected);
  return <section className="reading-activity" aria-labelledby="reading-question">
    <h2 id="reading-question">{personalize(scene.question, playerName)}</h2>
    <div className="story-options">{scene.options.map(option => <button key={option.id} className={`story-option ${selected === option.id ? option.correct ? 'is-correct' : 'is-incorrect' : ''}`} aria-pressed={selected === option.id} aria-invalid={selected === option.id && !option.correct || undefined} disabled={Boolean(answer?.correct) && selected !== option.id} onClick={event => {
      setSelected(option.id);
      if (!option.correct) shake(event.currentTarget);
    }}>{personalize(option.label, playerName)}{selected === option.id && answer?.correct && <Check size={22} aria-hidden="true" />}</button>)}</div>
    <span className="sr-only" role="status">{answer ? answer.correct ? 'Respuesta correcta.' : 'Prueba otra respuesta.' : ''}</span>
    {answer?.correct && <button className="primary" onClick={onNext}>Continuar<ArrowRight size={21} /></button>}
  </section>;
}

export function Sequence({ scene, playerName = '', onNext }: { scene: SequenceScene; playerName?: string; onNext: () => void }) {
  const [order, setOrder] = useState<string[]>([]);
  const [checked, setChecked] = useState(false);
  const correct = checked && order.every((id, index) => scene.correctOrder[index] === id) && order.length === scene.correctOrder.length;
  const resetRef = useRef<HTMLButtonElement>(null);
  const optionsRef = useRef<HTMLDivElement>(null);
  return <section className="reading-activity" aria-labelledby="reading-question">
    <h2 id="reading-question">{personalize(scene.question, playerName)}</h2>
    <div className="story-options" ref={optionsRef}>{scene.events.map(event => {
      const position = order.indexOf(event.id);
      const misplaced = checked && scene.correctOrder[position] !== event.id;
      return <button key={event.id} className={`story-option sequence-option ${position >= 0 ? checked ? misplaced ? 'is-incorrect' : 'is-correct' : 'is-selected' : ''}`} aria-invalid={misplaced || undefined} disabled={position >= 0 || correct} onClick={() => { setOrder(previous => [...previous, event.id]); setChecked(false); }}> 
        <span className="sequence-number" aria-hidden="true">{position >= 0 ? position + 1 : '·'}</span>{position >= 0 && <span className="sr-only">Posición {position + 1}: </span>}{personalize(event.text, playerName)}{checked && !misplaced && <Check size={20} aria-hidden="true" />}
      </button>;
    })}</div>
    {order.length > 0 && <ol className="sequence-result" aria-label="Tu relato">{order.map(id => <li key={id}>{personalize(scene.events.find(event => event.id === id)!.text, playerName)}</li>)}</ol>}
    <span className="sr-only" role="status">{checked ? correct ? 'Orden correcto.' : 'Revisa el orden.' : ''}</span>
    <div className="scene-actions">{correct ? <button className="primary" onClick={onNext}>Enviar mi relato<ArrowRight size={21} /></button> : <>
      <button className="primary" disabled={order.length !== scene.events.length} onClick={() => {
        setChecked(true);
        scene.events.forEach((event, index) => {
          if (scene.correctOrder[order.indexOf(event.id)] !== event.id) {
            const button = optionsRef.current?.children[index];
            if (button instanceof HTMLElement) shake(button);
          }
        });
        if (!order.every((id, index) => scene.correctOrder[index] === id)) resetRef.current?.focus();
      }}>Comprobar orden<ArrowRight size={21} /></button>
      <button ref={resetRef} className="text-button" disabled={!order.length} onClick={() => { setOrder([]); setChecked(false); }}>Ordenar de nuevo<RotateCcw size={18} /></button>
    </>}</div>
  </section>;
}

/** Shared actions for ordinary reading and the robot's illustrated dialogue. */
export function DialogueActions({ scene, playerName, onNext, onComplete }: {
  scene: Exclude<Scene, BuildScene>; playerName: string; onNext: (id: string) => void; onComplete: () => void;
}) {
  if (scene.type === 'comprehension') return <Comprehension scene={scene} playerName={playerName} onNext={() => onNext(scene.next)} />;
  if (scene.type === 'sequence') return <Sequence scene={scene} playerName={playerName} onNext={() => onNext(scene.next)} />;
  if (scene.type === 'story') return <section className="reading-activity" aria-label="Elige cómo seguir">
    <div className="story-options">{scene.choices.map(choice => <button className="story-option" key={choice.id} onClick={() => onNext(choice.next)}>{personalize(choice.label, playerName)}<ArrowRight size={20} /></button>)}</div>
  </section>;
  if (scene.type === 'ending') return <section className="chapter-ending">
    <p className="retell-prompt">{personalize(scene.prompt, playerName)}</p>
    <button className="primary" onClick={onComplete}>Terminar capítulo<ArrowRight size={21} /></button>
  </section>;
  return null;
}

export function BuildActivity({ chapter, scene, progress, sound, onEarn, onPlace, onNext }: {
  chapter: Chapter; scene: BuildScene; progress: AdventureProgress; sound: boolean;
  onEarn: () => void; onPlace: () => void; onNext: () => void;
}) {
  const reached = progress.placedCount >= scene.targetPlacedParts;
  const selected = parts[Math.min(progress.placedCount, parts.length - 1)];
  const operation = progress.operations[Math.min(progress.placedCount, parts.length - 1)];
  return <div className={`robot-lab adventure-build ${progress.ready ? 'piece-ready' : ''}`}>
    <div className="workshop-grid">
      <Factory placed={parts.slice(0, progress.placedCount).map(part => part.id)} selected={selected.id} ready={progress.ready} color={chapter.robot.color} design={chapter.robot.design} complete={progress.placedCount === 6} activeParts={parts} onPlace={onPlace} />
      <section className="activity-panel" aria-label="Construye a tu compañera">
        {reached ? <div className="completion-panel"><span className="celebration-icon"><Check size={42} /></span><h2>{`¡Has construido a ${chapter.robot.name}!`}</h2><p>{personalize(scene.completion, progress.playerName)}</p><button className="primary" onClick={onNext}>Seguir la historia<ArrowRight size={21} /></button></div> : progress.ready ? <div className="earned-panel"><span className="success-label"><Check size={22} />{operationLabel(operation)} = {resultOf(operation)}</span><Hand className="drag-instruction-icon" size={62} /><h2>Coloca {selected.name}</h2><p>Arrastra la pieza o tócala y después toca su silueta.</p></div> : <MathPuzzle key={progress.placedCount} operation={operation} partName={selected.name} sound={sound} onSolved={onEarn} />}
      </section>
    </div>
    <span className="sr-only" role="status">{reached ? 'Has terminado el robot. Puedes seguir la historia.' : progress.ready ? `Has conseguido ${selected.name}. Colócala en su silueta.` : ''}</span>
  </div>;
}
