import { lazy, useEffect, useRef } from 'react';
import { Droplet, Radio } from 'lucide-react';
import { DeferredContent } from '../components/DeferredContent';
import { playSound } from '../sound';
import { DialogueActions } from './DialogueActions';
import { RobotIntroduction } from './RobotIntroduction';
import { StoryReview } from './StoryReview';
import { personalize } from './personalization';
import { initialState, puzzles, type PiecesState } from '../games/shape-box/puzzle';
import type { AdventureProgress } from './progress';
import type { Chapter, ReadingScene, RobotIntroduction as Introduction, Scene } from './types';
import './activity-layout.css';

const BuildActivity = lazy(() => import('../games/robot-lab/BuildActivity').then(module => ({ default: module.BuildActivity })));
const PipePuzzle = lazy(() => import('../games/connections/PipePuzzle').then(module => ({ default: module.PipePuzzle })));
const PackingPuzzle = lazy(() => import('../games/shape-box/ShapeBox').then(module => ({ default: module.PackingPuzzle })));

/** Adapts authored scenes to independent activities; games never receive the campaign. */
export default function NarrativeView({ chapter, progress, scene, introduction, reviewId, reviewScene, assetPrefix, sound, onNext, onComplete, onReviewNext, onEarn, onPlace, onRotate, onPackingChange }: {
  chapter: Chapter; progress: AdventureProgress; scene: Scene; introduction?: Introduction;
  reviewId: string | null; reviewScene: ReadingScene | null; assetPrefix: './' | '../'; sound: boolean;
  onNext: (id: string) => void; onComplete: () => void; onReviewNext: () => void;
  onEarn: () => void; onPlace: () => void; onRotate: (index: number, turns: number) => void;
  onPackingChange: (state: PiecesState) => void;
}) {
  const liveScene = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (reviewScene) return;
    liveScene.current?.querySelector('h1')?.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [chapter.id, progress.sceneId, reviewId]);

  return <>
    {/* Rereading must not unmount the live activity or discard its unsaved answer. */}
    <div className="live-scene" ref={liveScene} hidden={Boolean(reviewScene)} inert={Boolean(reviewScene)}>
      {introduction ? <RobotIntroduction key={progress.sceneId} robot={chapter.robot} introduction={introduction} playerName={progress.playerName} assetPrefix={assetPrefix} onNext={scene.type === 'build' ? () => onNext(scene.next) : undefined}>
        {scene.type !== 'build' ? <DialogueActions scene={scene} playerName={progress.playerName} onNext={onNext} onComplete={onComplete} /> : undefined}
      </RobotIntroduction> : scene.type === 'build' ? <section className="construction-console">
        <h1 tabIndex={-1}>{personalize(scene.title, progress.playerName)}</h1>
        <p className="build-instruction">{personalize(scene.instruction, progress.playerName)}</p>
        <DeferredContent key={progress.sceneId}>
          <BuildActivity config={{ robot: chapter.robot, targetPlacedParts: scene.targetPlacedParts, completion: personalize(scene.completion, progress.playerName) }}
            state={{ operations: progress.operations, placedCount: progress.placedCount, ready: progress.ready }} sound={sound}
            onEarn={onEarn} onPlace={() => { playSound(progress.placedCount === 5 ? 'complete' : 'place', sound); onPlace(); }} onComplete={() => onNext(scene.next)} />
        </DeferredContent>
      </section> : scene.type === 'pipes' ? <article className={`pipe-console theme-${scene.theme ?? 'water'}`} key={progress.sceneId}>
        <div className="pipe-story">{scene.theme === 'radio' ? <Radio size={42} aria-hidden="true" /> : <Droplet size={42} aria-hidden="true" />}
          <h1 tabIndex={-1}>{personalize(scene.title, progress.playerName)}</h1>
          {scene.paragraphs.map((paragraph, index) => <p key={index}>{personalize(paragraph, progress.playerName)}</p>)}
        </div>
        <DeferredContent>
          <PipePuzzle theme={scene.theme} layout={scene.layout} rotations={progress.pipeRotations?.[progress.sceneId] ?? scene.layout.initial} sound={sound}
            onRotate={onRotate} onNext={() => onNext(scene.next)} />
        </DeferredContent>
      </article> : scene.type === 'packing' ? <article className="packing-game adventure-packing" key={progress.sceneId}>
        <header className="packing-heading"><h1 tabIndex={-1}>{personalize(scene.title, progress.playerName)}</h1></header>
        <div className="packing-passage">{scene.paragraphs.map((paragraph, index) => <p key={index}>{personalize(paragraph, progress.playerName)}</p>)}</div>
        <p id="packing-instructions" className="packing-instructions">Arrastra para encajar. Gira desde el borde superior derecho.</p>
        <p id="packing-controls" className="sr-only">Toca una pieza para elegirla. Toca una casilla vacía para colocar allí el bloque con su letra. Con teclado, usa Tab, las flechas y Enter; enfoca el borde y pulsa Enter o Espacio para girar. Supr o Retroceso devuelve la pieza elegida a la mesa.</p>
        <DeferredContent>
          <PackingPuzzle puzzle={puzzles[scene.puzzleIndex]} state={progress.packingStates?.[progress.sceneId] ?? initialState(puzzles[scene.puzzleIndex])}
            sound={sound} onChange={onPackingChange} onNext={() => onNext(scene.next)} nextLabel="Continuar" />
        </DeferredContent>
        <button className="text-button packing-skip" onClick={() => onNext(scene.next)}>Saltar</button>
      </article> : <article className="dialogue-dock reading-dock" key={progress.sceneId} aria-label="Lee la historia">
        <h1 className="sr-only" tabIndex={-1}>{personalize(scene.title, progress.playerName)}</h1>
        <div className="story-passage">{scene.paragraphs.map((paragraph, index) => <p key={index}>{personalize(paragraph, progress.playerName)}</p>)}</div>
        <DialogueActions scene={scene} playerName={progress.playerName} onNext={onNext} onComplete={onComplete} />
      </article>}
    </div>
    {reviewScene && <StoryReview key={reviewId} chapter={chapter} scene={reviewScene} playerName={progress.playerName} assetPrefix={assetPrefix} onNext={onReviewNext} />}
  </>;
}
