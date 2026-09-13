import { useEffect, useRef } from 'react';
import { ArrowRight } from 'lucide-react';
import { RobotIntroduction } from './RobotIntroduction';
import { personalize } from './personalization';
import type { Chapter, Scene } from './types';

export type ReadingScene = Exclude<Scene, { type: 'build' | 'pipes' }>;

/** Reread visited text without rewinding the saved run or repeating activities. */
export function StoryReview({ chapter, scene, playerName, assetPrefix, onNext }: {
  chapter: Chapter; scene: ReadingScene; playerName: string; assetPrefix: './' | '../'; onNext: () => void;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);
  const actions = <>
    <p className="review-notice">Volviendo a leer</p>
    {(scene.type === 'comprehension' || scene.type === 'sequence') && <p className="review-question">{personalize(scene.question, playerName)}</p>}
    <button className="primary" onClick={onNext}>Continuar<ArrowRight size={21} aria-hidden="true" /></button>
  </>;
  return <div className="story-review">
    {scene.robotIntroduction ? <RobotIntroduction robot={chapter.robot}
      introduction={{ title: scene.title, paragraphs: scene.paragraphs, artwork: scene.robotIntroduction.artwork }}
      playerName={playerName} assetPrefix={assetPrefix}>{actions}</RobotIntroduction> : <article className="dialogue-dock reading-dock" aria-label="Vuelve a leer la historia">
      <h1 className="sr-only" ref={heading} tabIndex={-1}>{personalize(scene.title, playerName)}</h1>
      <div className="story-passage">{scene.paragraphs.map((paragraph, index) => <p key={index}>{personalize(paragraph, playerName)}</p>)}</div>
      {actions}
    </article>}
  </div>;
}
