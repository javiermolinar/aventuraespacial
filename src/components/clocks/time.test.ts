import { describe, expect, it } from 'vitest';
import { angleDelta, digitalTime, handAngles, normalizeTime, period, spokenTime } from './time';

describe('shared time-of-day helpers', () => {
  it('wraps through midnight and formats noon without AM/PM ambiguity', () => {
    expect(digitalTime(0)).toBe('00:00');
    expect(digitalTime(720)).toBe('12:00');
    expect(digitalTime(990)).toBe('16:30');
    expect(digitalTime(1440)).toBe('00:00');
    expect(normalizeTime(-5)).toBe(1435);
    expect(spokenTime(0)).toContain('medianoche');
    expect(spokenTime(720)).toContain('mediodía');
    expect(spokenTime(990)).toBe('Las 4 y media de la tarde');
    expect(spokenTime(795)).toBe('La 1 y cuarto de la tarde');
    expect(period(7 * 60)).toBe('de la mañana');
    expect(period(21 * 60)).toBe('de la noche');
  });
  it('moves the hour hand continuously and repeats the face every twelve hours', () => {
    expect(handAngles(450)).toEqual({ hour: 225, minute: 180 });
    for (let time = 0; time < 720; time += 5) expect(handAngles(time)).toEqual(handAngles(time + 720));
  });
  it('measures drag arcs across twelve in either direction', () => {
    expect(angleDelta(355, 5)).toBe(10);
    expect(angleDelta(5, 355)).toBe(-10);
    expect(angleDelta(90, 120)).toBe(30);
  });
});
