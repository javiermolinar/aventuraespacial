import { useRef, type PointerEvent } from 'react';
import './clocks.css';
import { angleDelta, handAngles, normalizeTime, spokenTime, wrap } from './time';

export type ClockHand = 'hour' | 'minute';
type Hand = ClockHand;
type Drag = { pointer: number; hand: Hand; start: number; previous: number; rotation: number };

/** Controlled time-of-day input (minutes since midnight). No game state or scoring.
 * Omit onChange for display-only use. Drag either hand or use arrow keys.
 * Theme with --clock-* CSS variables on an ancestor.
 */
export function AnalogClock({ value, onChange, disabled = false, minuteStep = 5, activeHand, onActiveHandChange }: {
  value: number; onChange?: (time: number) => void; disabled?: boolean; minuteStep?: 1 | 5 | 15 | 30;
  activeHand?: ClockHand; onActiveHandChange?: (hand: ClockHand) => void;
}) {
  const svg = useRef<SVGSVGElement>(null);
  const drag = useRef<Drag | null>(null);
  const angles = handAngles(value);
  const interactive = Boolean(onChange) && !disabled;
  function angle(event: PointerEvent) {
    const rect = svg.current!.getBoundingClientRect();
    return Math.atan2(event.clientY - rect.top - rect.height / 2, event.clientX - rect.left - rect.width / 2) * 180 / Math.PI + 90;
  }
  function move(event: PointerEvent<SVGGElement>) {
    const active = drag.current;
    if (!active || active.pointer !== event.pointerId) return;
    const next = angle(event);
    active.rotation += angleDelta(active.previous, next);
    active.previous = next;
    const step = active.hand === 'hour' ? 30 : minuteStep * 6;
    const minutes = active.hand === 'hour' ? 60 : minuteStep;
    onChange?.(normalizeTime(active.start + Math.round(active.rotation / step) * minutes));
  }
  function cancel() {
    if (!drag.current) return;
    onChange?.(drag.current.start);
    drag.current = null;
  }
  function numbers() {
    return Array.from({ length: 12 }, (_, index) => {
      const number = index + 1, radians = number * Math.PI / 6;
      const canTap = interactive && activeHand !== undefined;
      const choose = () => {
        if (!canTap || drag.current) return;
        onChange?.(activeHand === 'hour'
          ? Math.floor(value / 720) * 720 + (number % 12) * 60 + value % 60
          : Math.floor(value / 60) * 60 + (number % 12) * 5);
      };
      return <g key={number} className={canTap ? 'clock-number-button' : undefined} role={canTap ? 'button' : undefined}
        tabIndex={canTap ? 0 : undefined} aria-label={canTap ? activeHand === 'hour' ? `Poner hora en ${number}` : `Poner minutos en ${(number % 12) * 5}` : undefined}
        onClick={choose} onKeyDown={event => { if (canTap && ['Enter', ' '].includes(event.key)) { event.preventDefault(); choose(); } }}>
        {canTap && <circle cx={150 + Math.sin(radians) * 114} cy={150 - Math.cos(radians) * 114} r="18" fill="transparent" />}
        <text x={150 + Math.sin(radians) * 108} y={150 - Math.cos(radians) * 108} textAnchor="middle" dominantBaseline="central" fontSize="25" fontWeight="850" fill="var(--clock-ink, #514737)" pointerEvents="none">{number}</text>
      </g>;
    });
  }
  return <svg ref={svg} className={`analog-clock ${onChange ? 'is-interactive' : ''}`} viewBox="0 0 300 300"
    role={onChange ? 'group' : 'img'} aria-label={onChange ? 'Reloj de agujas' : spokenTime(value)}>
    <circle cx="150" cy="150" r="146" fill="var(--clock-face, #fffdf6)" stroke="var(--clock-rim, #e7b775)" strokeWidth="7" />
    {Array.from({ length: 60 }, (_, index) => <line key={index} x1="150" y1={index % 5 ? 15 : 12} x2="150" y2={index % 5 ? 19 : 24} stroke={index % 5 ? 'var(--clock-minor-tick, #d9cdb9)' : 'var(--clock-major-tick, #8b7660)'} strokeWidth={index % 5 ? 1.5 : 3} transform={`rotate(${index * 6} 150 150)`} />)}
    {(['minute', 'hour'] as const).map(hand => <g key={hand} className={`clock-hand clock-hand-${hand}`} transform={`rotate(${angles[hand]} 150 150)`}
      role={onChange ? 'slider' : undefined} tabIndex={interactive ? 0 : undefined}
      aria-label={onChange ? hand === 'hour' ? 'Aguja corta: horas' : 'Aguja larga: minutos' : undefined}
      aria-valuemin={onChange ? 0 : undefined} aria-valuemax={onChange ? hand === 'hour' ? 11 : 59 : undefined}
      aria-valuenow={onChange ? hand === 'hour' ? Math.floor(value / 60) % 12 : value % 60 : undefined}
      aria-valuetext={onChange ? hand === 'hour' ? String(Math.floor(value / 60) % 12 || 12) : String(value % 60) : undefined}
      aria-disabled={onChange ? disabled : undefined}
      onPointerDown={event => {
        if (!interactive || !event.isPrimary || event.button !== 0 || drag.current) return;
        event.preventDefault();
        event.currentTarget.focus();
        onActiveHandChange?.(hand);
        drag.current = { pointer: event.pointerId, hand, start: value, previous: angle(event), rotation: 0 };
        event.currentTarget.setPointerCapture(event.pointerId);
      }} onPointerMove={move}
      onPointerUp={event => {
        if (drag.current?.pointer !== event.pointerId) return;
        move(event);
        drag.current = null;
        if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
      }} onPointerCancel={cancel} onLostPointerCapture={cancel}
      onKeyDown={event => {
        if (!interactive) return;
        if (event.key === 'Escape') { cancel(); return; }
        if (!['ArrowUp', 'ArrowRight', 'ArrowDown', 'ArrowLeft'].includes(event.key) || drag.current) return;
        event.preventDefault();
        const direction = ['ArrowUp', 'ArrowRight'].includes(event.key) ? 1 : -1;
        onChange?.(wrap(value + direction * (hand === 'hour' ? 60 : minuteStep), 1440));
      }}>
      <line className="clock-hand-hit" x1="150" y1="155" x2="150" y2={hand === 'hour' ? 90 : 60} stroke="transparent" strokeWidth="30" />
      {onChange && <circle className="clock-hand-hit" cx="150" cy={hand === 'hour' ? 90 : 60} r="24" fill="transparent" pointerEvents="all" />}
      <line x1="150" y1="158" x2="150" y2={hand === 'hour' ? 90 : 60} stroke={hand === 'hour' ? 'var(--clock-hour, #9550ad)' : 'var(--clock-minute, #147e89)'} strokeWidth={hand === 'hour' ? 12 : 8} strokeLinecap="round" pointerEvents="none" />
      {onChange && <circle cx="150" cy={hand === 'hour' ? 90 : 60} r="9" fill={hand === 'hour' ? 'var(--clock-hour, #9550ad)' : 'var(--clock-minute, #147e89)'} stroke="white" strokeWidth="3" pointerEvents="none" />}
    </g>)}
    {numbers()}
    <circle cx="150" cy="150" r="10" fill="var(--clock-ink, #514737)" pointerEvents="none" />
  </svg>;
}
