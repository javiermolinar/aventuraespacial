import { useEffect, useRef, useState } from 'react';
import { AnalogClock } from '../../components/clocks/AnalogClock';
import { DigitalClock } from '../../components/clocks/DigitalClock';
import { digitalTime, normalizeTime } from '../../components/clocks/time';
import { DayTimelines } from './DayTimelines';

// A short demonstration of the last part of the hour, not a cooking duration.
// Exact-hour answers show one whole revolution, including 23:00 -> midnight.
export function passageFor(answer: number) {
  const minutes = answer % 60 || 60;
  return { start: answer - minutes, minutes };
}

export function TimePassage({ answer, clock, onComplete }: { answer: number; clock: 'analog' | 'digital'; onComplete: () => void }) {
  const { start, minutes } = passageFor(answer);
  const [elapsed, setElapsed] = useState(0);
  const passage = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      onComplete();
      return;
    }
    passage.current?.focus({ preventScroll: true });
    passage.current?.scrollIntoView?.({ block: 'center' });
    let frame: number;
    let began: number | undefined;
    const duration = Math.max(1800, minutes * 65);
    function tick(now: number) {
      began ??= now;
      const next = Math.min(minutes, (now - began) / duration * minutes);
      setElapsed(next);
      if (next < minutes) frame = requestAnimationFrame(tick);
      else onComplete();
    }
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [minutes, onComplete]);
  const time = normalizeTime(start + elapsed);
  return <div ref={passage} tabIndex={-1} className="chef-time-passage" role="group" aria-label="Así pasa el tiempo">
    <p>De {digitalTime(start)} a {digitalTime(answer)}</p>
    {clock === 'analog' ? <DayTimelines value={Math.floor(time)}>
      <AnalogClock value={time} showMinuteGuide />
    </DayTimelines> : <><span className="chef-clock-label">Reloj de 24 horas</span><DigitalClock value={Math.floor(time)} /></>}
    <p className="chef-elapsed"><strong>{Math.floor(elapsed)} de {minutes} minutos</strong> · a cámara rápida</p>
    <p>{clock === 'analog' ? <>La aguja larga da una vuelta en 60 minutos.<br />La corta avanza una hora.</> : <>Después de 59 minutos viene 00.<br />Empieza la siguiente hora.</>}</p>
  </div>;
}
