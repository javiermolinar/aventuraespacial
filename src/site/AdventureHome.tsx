import { useEffect, useRef } from 'react';
import { ArrowRight } from 'lucide-react';
import type { CampaignProgress } from '../adventure/campaign';
import type { ChapterEntry } from '../adventure/chapters/catalog';
import { ChapterMenu } from './ChapterMenu';

/** Site navigation only: no narrative renderer, game UI, or animation runtime. */
export function AdventureHome({ catalog, campaign, hasProgress, finishedRun, reset, setupOpen, practiceHref, onContinue, onRestart, onSelect }: {
  catalog: readonly ChapterEntry[]; campaign: CampaignProgress;
  hasProgress: boolean; finishedRun: boolean; reset: boolean; setupOpen: boolean; practiceHref: string;
  onContinue: () => void; onRestart: () => void; onSelect: (id: string) => void;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (setupOpen) return;
    heading.current?.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  return <section className="dialogue-dock home-dock">
    <h1 ref={heading} tabIndex={-1}>Una aventura espacial</h1>
    {reset && !hasProgress && <p className="inline-notice">La partida guardada no es compatible o está dañada. Puedes empezar de nuevo.</p>}
    <div className="home-actions"><button className="primary" onClick={onContinue}>{finishedRun ? 'Repetir capítulo' : hasProgress ? 'Continuar aventura' : 'Empezar aventura'}<ArrowRight size={21} /></button>{hasProgress && !finishedRun && <button className="text-button" onClick={onRestart}>Reiniciar capítulo</button>}</div>
    <ChapterMenu catalog={catalog} campaign={campaign} onSelect={onSelect} practiceHref={practiceHref} />
  </section>;
}
