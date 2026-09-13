import { lazy, useEffect, useRef } from 'react';
import { Droplet, Radio } from 'lucide-react';
import { DeferredContent } from '../components/DeferredContent';
import { playSound } from '../sound';
import { DialogueActions } from './DialogueActions';
import { RobotIntroduction } from './RobotIntroduction';
import { StoryReview } from './StoryReview';
import { personalize } from './personalization';
import type { AdventureProgress } from './progress';
import type { Chapter, ReadingScene, RobotIntroduction as Introduction, Scene } from './types';
import './activity-layout.css';

const BuildActivity = lazy(() => import('../games/robot-lab/BuildActivity').then(module => ({ default: module.BuildActivity })));
const PipePuzzle = lazy(() => import('../games/connections/PipePuzzle').then(module => ({ default: module.PipePuzzle })));

/** Adapts authored scenes to independent activities; games never receive the campaign. */
export default function NarrativeView({ chapter, progress, scene, introduction, reviewId, reviewScene, assetPrefix, sound, onNext, onComplete, onReviewNext, onEarn, onPlace, onRotate }: {
  chapter: Chapter; progress: AdventureProgress; scene: Scene; introduction?: Introduction;
  reviewId: string | null; reviewScene: ReadingScene | null; assetPrefix: './' | '../'; sound: boolean;
  onNext: (id: string) => void; onComplete: () => void; onReviewNext: () => void;
  onEarn: () => void; onPlace: () => void; onRotate: (index: number, turns: number) => void;
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
      </article> : <article className="dialogue-dock reading-dock" key={progress.sceneId} aria-label="Lee la historia">
        <h1 className="sr-only" tabIndex={-1}>{personalize(scene.title, progress.playerName)}</h1>
        <div className="story-passage">{scene.paragraphs.map((paragraph, index) => <p key={index}>{personalize(paragraph, progress.playerName)}</p>)}</div>
        <DialogueActions scene={scene} playerName={progress.playerName} onNext={onNext} onComplete={onComplete} />
      </article>}
    </div>
    {reviewScene && <StoryReview key={reviewId} chapter={chapter} scene={reviewScene} playerName={progress.playerName} assetPrefix={assetPrefix} onNext={onReviewNext} />}
  </>;
}
