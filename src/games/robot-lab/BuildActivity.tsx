import { useState } from 'react';
import { MotionConfig } from 'motion/react';
import { ArrowRight, Check, Hand } from 'lucide-react';
import { parts, operationLabel, resultOf } from '../../game';
import type { Operation } from '../../lib/maths';
import { MathPuzzle } from '../../components/maths/MathPuzzle';
import { Factory } from './Factory';
import { conveyorDuration } from './useConveyor';
import type { RobotDesign } from './design';
import './robot-lab.css';

export type BuildConfiguration = {
  robot: { name: string; color: string; design: RobotDesign };
  targetPlacedParts: number;
  mathsLevel: number;
  completion: string;
};
export type BuildState = { placedCount: number; ready: boolean; operations: Operation[] };

/** The host owns persistence and progression; this activity knows no chapters or scene IDs. */
export function BuildActivity({ config, state, sound, onEarn, onPlace, onExpire, onComplete, paused = false }: {
  config: BuildConfiguration; state: BuildState; sound: boolean; paused?: boolean;
  onEarn: () => void; onPlace: () => void; onExpire: () => void; onComplete: () => void;
}) {
  const [pieceExpired, setPieceExpired] = useState(false);
  const reached = state.placedCount >= config.targetPlacedParts;
  const selected = parts[Math.min(state.placedCount, parts.length - 1)];
  const operation = state.operations[Math.min(state.placedCount, parts.length - 1)];
  return <MotionConfig reducedMotion="user"><div className={`robot-lab adventure-build ${state.ready ? 'piece-ready' : ''}`}>
    <div className="workshop-grid">
      <Factory placed={parts.slice(0, state.placedCount).map(part => part.id)} selected={selected.id} ready={state.ready && !reached} color={config.robot.color} design={config.robot.design} complete={state.placedCount === 6} activeParts={parts} onPlace={onPlace} travelMs={conveyorDuration(config.mathsLevel)} paused={paused} onExpire={() => { setPieceExpired(true); onExpire(); }} />
      <section className="activity-panel" aria-label="Construye a tu compañera">
        {reached ? <div className="completion-panel"><span className="celebration-icon"><Check size={42} /></span><h2>{`¡Has construido a ${config.robot.name}!`}</h2><p>{config.completion}</p><button className="primary" onClick={onComplete}>Seguir la historia<ArrowRight size={21} /></button></div> : state.ready ? <div className="earned-panel"><span className="success-label"><Check size={22} />{operationLabel(operation)} = {resultOf(operation)}</span><Hand className="drag-instruction-icon" size={62} /><h2>Coloca {selected.name}</h2><p>Arrastra la pieza o tócala y después toca su silueta.</p></div> : <div>
          {pieceExpired && <p className="conveyor-retry" role="status">¡Se fue la pieza! Resuelve otra vez para recuperarla.</p>}
          <MathPuzzle key={state.placedCount} operation={operation} partName={selected.name} sound={sound} onSolved={() => { setPieceExpired(false); onEarn(); }} />
        </div>}
      </section>
    </div>
    <span className="sr-only" role="status">{reached ? 'Has terminado el robot. Puedes seguir la historia.' : state.ready ? `Has conseguido ${selected.name}. Colócala en su silueta.` : ''}</span>
  </div></MotionConfig>;
}
