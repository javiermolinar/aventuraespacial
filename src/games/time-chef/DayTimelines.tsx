import type { ReactNode } from 'react';
import { Sun, Sunset } from 'lucide-react';
import { digitalTime, spokenTime } from '../../components/clocks/time';

export function DayTimelines({ value, children }: {
  value: number; children: ReactNode;
}) {
  return <div className="chef-clock-with-day" role="group" aria-label="Las dos vueltas del día">
    {[0, 720].map(offset => {
      const position = Math.min(720, Math.max(0, value - offset));
      const time = position + offset;
      const active = Math.floor(value / 720) === offset / 720;
      const name = offset === 0 ? 'De medianoche a mediodía' : 'De mediodía a medianoche';
      return <div key={offset} role="img" aria-label={name + ': ' + (active ? spokenTime(value) : position === 720 ? '12 horas completas' : 'Todavía no')} className={'chef-day-timeline ' + (offset === 0 ? 'is-first' : 'is-second') + (active ? ' is-active' : '')}>
        <span className="chef-timeline-heading">
          {offset === 0 ? <Sun size={19} aria-hidden="true" /> : <Sunset size={19} aria-hidden="true" />}
          <span>{offset === 0 ? '00–12 h' : '12–24 h'}</span>
        </span>
        <span className="chef-timeline-track" aria-hidden="true">
          <span className="chef-timeline-band">
            {active && <span className="chef-timeline-marker" style={{ top: position / 720 * 100 + '%' }} />}
          </span>
          <span className="chef-timeline-slots" aria-hidden="true">
            {Array.from({ length: 12 }, (_, index) => <span key={index} className={active && Math.floor(position / 60) === index ? 'is-current' : position >= (index + 1) * 60 ? 'is-past' : undefined}><span>{String(index + offset / 60).padStart(2, '0')}</span></span>)}
          </span>
        </span>
        <strong className="chef-timeline-time">{digitalTime(time)}</strong>
      </div>;
    })}
    <div className="chef-clock-center">{children}</div>
  </div>;
}
