import { Moon, Sun, Sunrise, Sunset } from 'lucide-react';
import { AnalogClock } from '../../components/clocks/AnalogClock';
import { DigitalClock } from '../../components/clocks/DigitalClock';
import { digitalTime, normalizeTime } from '../../components/clocks/time';

export function dayPeriod(time: number) {
  const hour = Math.floor(normalizeTime(time) / 60);
  if (hour < 6) return { name: 'Madrugada', className: 'night', Icon: Moon };
  if (hour < 12) return { name: 'Mañana', className: 'morning', Icon: Sunrise };
  if (hour === 12) return { name: 'Mediodía', className: 'noon', Icon: Sun };
  if (hour < 20) return { name: 'Tarde', className: 'afternoon', Icon: Sunset };
  return { name: 'Noche', className: 'night', Icon: Moon };
}

export function DayPeriod({ time }: { time: number }) {
  const { name, className, Icon } = dayPeriod(time);
  return <span className={'chef-day-period is-' + className}><Icon size={19} aria-hidden="true" />{name}</span>;
}

function minuteHint(time: number) {
  const minute = time % 60, hour = Math.floor(time / 60) % 12 || 12;
  if (minute === 0) return 'En punto: la aguja larga señala el 12 (00 minutos). La corta señala el ' + hour + '.';
  if (minute === 30) return 'Media hora son 30 minutos: media vuelta hasta el 6. La aguja corta queda a mitad entre el ' + hour + ' y el ' + (hour % 12 + 1) + '.';
  if (minute === 15 || minute === 45) return 'Un cuarto de hora son 15 minutos: hasta el 3. Tres cuartos son 45 minutos: hasta el 9.';
  const fives = Math.floor(minute / 5) * 5, extra = minute % 5;
  return 'Cada rayita vale 1 minuto. Cuenta de 5 en 5: ' + fives + ', y añade ' + extra + (extra === 1 ? ' rayita' : ' rayitas') + ' para llegar a ' + minute + '.';
}

export function ClockHint({ time, guided }: { time: number; guided: boolean }) {
  const hour = Math.floor(time / 60);
  return <aside className="chef-hint" role="group" aria-label="Pista: dos relojes, la misma hora">
    <h3>{guided ? 'La primera, con una pista' : 'Una pista'}</h3>
    <p>{minuteHint(time)}</p>
    <div className="chef-hint-clocks">
      <div><span className="chef-clock-label">Reloj de 12 horas</span><AnalogClock value={time} showMinuteGuide /></div>
      <span className="chef-equals" aria-hidden="true">=</span>
      <div><span className="chef-clock-label">Reloj de 24 horas</span><DigitalClock value={time} /><DayPeriod time={time} /></div>
    </div>
    {hour >= 12 && <p>Después de las 12 seguimos contando. {hour === 12 ? 'Las 12 son el mediodía.' : 'Las ' + (hour % 12) + (hour >= 20 ? ' de la noche' : ' de la tarde') + ' se escriben ' + digitalTime(hour * 60) + '.'}</p>}
  </aside>;
}
