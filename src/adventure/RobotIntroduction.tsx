import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { ArrowRight, Check } from 'lucide-react';
import { parts } from '../game';
import { Robot } from '../games/robot-lab/Robot';
import { personalize } from './personalization';
import type { Chapter, RobotIntroduction as Introduction } from './types';
import './robot-introduction.css';

/** Illustrated dialogue, also supporting the legacy completed-build introduction. */
export function RobotIntroduction({ robot, introduction, playerName, assetPrefix, onNext, children }: {
  robot: Chapter['robot']; introduction: Introduction; playerName: string; assetPrefix: './' | '../'; onNext?: () => void; children?: ReactNode;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  const titleId = useId();
  const [failed, setFailed] = useState(false);
  const artwork = introduction.artwork;
  const showArtwork = artwork && !failed;

  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  return <>
    <div className="cinematic-backdrop robot-introduction-backdrop" aria-hidden="true">
      {artwork && <picture>
        <source media="(orientation: portrait)" srcSet={artwork.portrait.replace('../', assetPrefix)} />
        <img src={artwork.landscape.replace('../', assetPrefix)} alt="" fetchPriority="high" hidden={failed} onError={() => setFailed(true)} onLoad={() => setFailed(false)} />
      </picture>}
    </div>
    {failed && <p className="art-warning" role="status">La ilustración no se ha podido cargar. Puedes seguir leyendo.</p>}
    <div className={`robot-introduction-portrait ${showArtwork ? 'has-artwork' : ''}`}>
      {!showArtwork && <Robot placed={parts.map(part => part.id)} color={robot.color} design={robot.design} complete miniature />}
    </div>
    <article className="dialogue-dock robot-introduction" aria-labelledby={titleId}>
      <p className="robot-introduction-earned"><Check size={20} aria-hidden="true" />¡Has construido a {robot.name}!<span className="sr-only" role="progressbar" aria-label="Piezas colocadas" aria-valuenow={6} aria-valuemin={0} aria-valuemax={6}>6 / 6</span></p>
      <h1 id={titleId} ref={heading} tabIndex={-1}>{robot.name}{introduction.title !== robot.name && <>{' '}<span>{personalize(introduction.title, playerName)}</span></>}</h1>
      <div className="story-passage">{introduction.paragraphs.map((paragraph, index) => <p key={index}>{personalize(paragraph, playerName)}</p>)}</div>
      {children ?? <button className="primary" onClick={onNext}>Seguir la historia<ArrowRight size={21} /></button>}
    </article>
  </>;
}
