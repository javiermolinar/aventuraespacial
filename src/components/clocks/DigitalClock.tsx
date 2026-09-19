import { ChevronDown, ChevronUp } from 'lucide-react';
import { digitalTime, normalizeTime } from './time';
import './clocks.css';

/** A controlled 24-hour display; supplying onChange enables the time controls. */
export function DigitalClock({ value, onChange, disabled = false, minuteStep = 5, label = 'Reloj digital de 24 horas' }: {
  value: number; onChange?: (time: number) => void; disabled?: boolean; minuteStep?: 1 | 5 | 15 | 30; label?: string;
}) {
  const parts = digitalTime(value).split(':');
  return <div className={`digital-clock ${onChange ? 'is-interactive' : ''}`} role={onChange ? 'group' : 'img'} aria-label={onChange ? label : `${label}: ${digitalTime(value)}`}>
    {parts.map((part, index) => <div className="digital-clock-column" key={index}>
      {onChange && <button type="button" aria-label={index === 0 ? 'Añadir una hora' : minuteStep === 1 ? 'Añadir un minuto' : `Añadir ${minuteStep} minutos`} disabled={disabled}
        onClick={() => onChange(normalizeTime(value + (index === 0 ? 60 : minuteStep)))}><ChevronUp aria-hidden="true" /></button>}
      <span className="digital-clock-digits" aria-hidden="true">{part}</span>
      {onChange && <button type="button" aria-label={index === 0 ? 'Quitar una hora' : minuteStep === 1 ? 'Quitar un minuto' : `Quitar ${minuteStep} minutos`} disabled={disabled}
        onClick={() => onChange(normalizeTime(value - (index === 0 ? 60 : minuteStep)))}><ChevronDown aria-hidden="true" /></button>}
      {onChange && <span className="digital-clock-label">{index === 0 ? 'horas' : 'minutos'}</span>}
    </div>)}
    {onChange && <span className="sr-only" aria-live="polite">{digitalTime(value)}</span>}
  </div>;
}
