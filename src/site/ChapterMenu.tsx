import { ArrowRight, Check, Clock3, LockKeyhole, RotateCcw } from 'lucide-react';
import { RobotPortrait } from '../games/robot-lab/RobotArtwork';
import { chapterStatus, type CampaignProgress } from '../adventure/campaign';
import type { ChapterEntry } from '../adventure/chapters/catalog';
import './chapter-menu.css';

export function ChapterMenu({ catalog, campaign, onSelect }: {
  catalog: readonly ChapterEntry[]; campaign: CampaignProgress; onSelect: (id: string) => void;
}) {
  return <section className="chapter-menu" aria-labelledby="chapter-menu-title">
    <div className="chapter-menu-heading"><h2 id="chapter-menu-title">Elige un capítulo</h2><p role="status">{campaign.completed.length} de {catalog.length} completados</p></div>
    <ol className="chapter-list">{catalog.map((entry, index) => {
      const status = chapterStatus(campaign, catalog, entry.id);
      const locked = status === 'locked';
      const disabled = locked || status === 'upcoming';
      const title = entry.title ?? entry.robot.name;
      const action = status === 'upcoming' ? 'Próximamente' : status === 'completed' ? 'Volver a jugar' : status === 'started' ? 'Continuar' : 'Empezar';
      return <li key={entry.id}>
        <button className={`chapter-card is-${status}`} disabled={disabled} onClick={() => onSelect(entry.id)}
          aria-label={locked ? `Capítulo ${index + 1}. Bloqueado. Completa el capítulo ${index}.` : `Capítulo ${index + 1}. ${entry.robot.name}${title !== entry.robot.name ? `. ${title}` : ''}. ${status === 'completed' ? 'Completado. ' : ''}${action}.`}>
          <span className="chapter-number">Capítulo {index + 1}</span>
          {locked ? <>
            <span className="chapter-lock" aria-hidden="true"><LockKeyhole size={28} /></span>
            <span className="chapter-locked-label">Bloqueado</span>
          </> : <>
            <span className="chapter-robot" aria-hidden="true"><RobotPortrait color={entry.robot.color} design={entry.robot.design} /></span>
            <span className="chapter-name">{entry.robot.name}</span>
            {title !== entry.robot.name && <span className="chapter-title">{title}</span>}
            <span className="chapter-card-action">{status === 'completed' ? <><Check size={16} aria-hidden="true" />Completado<RotateCcw size={16} aria-hidden="true" /></> : <>{action}{status === 'upcoming' ? <Clock3 size={16} aria-hidden="true" /> : <ArrowRight size={16} aria-hidden="true" />}</>}</span>
          </>}
        </button>
      </li>;
    })}</ol>
  </section>;
}
