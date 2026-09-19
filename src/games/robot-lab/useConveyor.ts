import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useMotionValue, useTransform } from 'motion/react';

export const conveyorTravelMs = 8_000;
export const conveyorArrivalMs = 700;

/** Maths levels are zero-based; each step shortens the trip by half a second. */
export function conveyorDuration(level: number) {
  return Math.max(3_000, conveyorTravelMs - Math.max(0, level) * 500);
}

/** One clock drives travel to the floor. Catching, hidden tabs and story review pause it. */
export function useConveyor({ ready, selected, paused, travelMs = conveyorTravelMs }: {
  ready: boolean; selected: string; paused: boolean; travelMs?: number;
}) {
  const progress = useMotionValue(0);
  const position = useTransform(progress, value => `${value * 100}%`);
  const elapsed = useRef(-conveyorArrivalMs);
  const [onFloor, setOnFloor] = useState(false);
  const held = useRef(false);
  const [caught, setCaught] = useState(false);
  const [seconds, setSeconds] = useState(travelMs / 1000);
  const [visible, setVisible] = useState(() => !document.hidden);

  useLayoutEffect(() => {
    elapsed.current = -conveyorArrivalMs;
    setOnFloor(false);
    held.current = false;
    progress.set(0);
    setCaught(false);
    setSeconds(travelMs / 1000);
  }, [ready, selected, travelMs, progress]);

  useEffect(() => {
    const update = () => setVisible(!document.hidden);
    document.addEventListener('visibilitychange', update);
    return () => document.removeEventListener('visibilitychange', update);
  }, []);

  useEffect(() => {
    if (!ready || paused || caught || !visible || onFloor) return;
    let previous = performance.now();
    let frame: number;
    const tick = (now: number) => {
      if (document.hidden || held.current) return;
      elapsed.current += now - previous;
      previous = now;
      const fraction = Math.min(1, Math.max(0, elapsed.current / travelMs));
      progress.set(fraction);
      setSeconds(Math.min(travelMs / 1000, Math.ceil((1 - fraction) * travelMs / 1000)));
      if (fraction === 1) {
        setOnFloor(true);
      } else frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [ready, selected, paused, caught, visible, onFloor, travelMs, progress]);

  return {
    position, seconds, caught, onFloor, running: ready && !caught && !paused && visible && !onFloor,
    grab: () => {
      if (!ready || paused) return false;
      held.current = true;
      setCaught(true);
      return true;
    },
    release: () => { held.current = false; setCaught(false); },
  };
}
