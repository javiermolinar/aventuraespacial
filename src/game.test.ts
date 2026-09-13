import { describe, expect, it, vi, afterEach } from 'vitest';
import { columnAnswer, getOperations, levelExamples, levels, loadProgress, needsExchange, needsTens, resultOf, saveProgress } from './game';

import { largerFirst } from './lib/maths';

afterEach(() => vi.unstubAllGlobals());

describe('addition presentation', () => {
  it('puts the larger addend first without changing the sum or the source', () => {
    const operation = { a: 8, b: 10, operator: '+' } as const;
    expect(largerFirst(operation)).toEqual({ a: 10, b: 8, operator: '+' });
    expect(resultOf(largerFirst(operation))).toBe(18);
    expect(operation.a).toBe(8);
    expect(largerFirst({ a: 15, b: 15, operator: '+' })).toEqual({ a: 15, b: 15, operator: '+' });
  });
  it('never reverses subtraction', () => {
    expect(largerFirst({ a: 3, b: 8, operator: '−' })).toEqual({ a: 3, b: 8, operator: '−' });
  });
});

describe('column arithmetic', () => {
  it('aligns a single digit with a two-digit number', () => {
    const operation = { a: 5, b: 10, operator: '+' } as const;
    expect(needsExchange(operation)).toBe(false);
    expect(needsTens(operation)).toBe(true);
    expect(columnAnswer(operation, 'ones')).toBe(5);
    expect(columnAnswer(operation, 'tens')).toBe(1);
  });
  it('carries a ten for 15 + 15, leaving zero ones', () => {
    const operation = { a: 15, b: 15, operator: '+' } as const;
    expect(needsExchange(operation)).toBe(true);
    expect(columnAnswer(operation, 'ones')).toBe(0);
    expect(columnAnswer(operation, 'tens')).toBe(3);
  });
  it('exchanges a ten before subtracting 23 − 7', () => {
    const operation = { a: 23, b: 7, operator: '−' } as const;
    expect(needsExchange(operation)).toBe(true);
    expect(columnAnswer(operation, 'ones')).toBe(6);
    expect(columnAnswer(operation, 'tens')).toBe(1);
  });
  it('includes a tens step when making exactly ten', () => {
    expect(needsTens({ a: 5, b: 5, operator: '+' })).toBe(true);
    expect(needsExchange({ a: 5, b: 5, operator: '+' })).toBe(true);
  });
  it('handles a zero result', () => {
    const operation = { a: 9, b: 9, operator: '−' } as const;
    expect(resultOf(operation)).toBe(0);
    expect(needsExchange(operation)).toBe(false);
    expect(needsTens(operation)).toBe(false);
  });
});

function seededRandom(seed: number) {
  let state = seed >>> 0;
  return () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 4294967296; };
}

describe('level generation', () => {
  for (let level = 0; level < levels.length; level++) {
    it(`preserves the teaching rules of level ${level + 1}`, () => {
      const random = seededRandom(level + 1);
      const distinct = new Set<string>();
      for (let round = 0; round < 100; round++) {
        const operations = getOperations(level, random);
        expect(operations).toHaveLength(levels[level].pieceCount);
        const additionCount = level === 3 ? levels[level].pieceCount : level === 5 ? 0 : levels[level].pieceCount / 2;
        expect(operations.filter(operation => operation.operator === '+')).toHaveLength(additionCount);
        expect(operations.filter(operation => operation.operator === '−')).toHaveLength(levels[level].pieceCount - additionCount);
        distinct.add(JSON.stringify(operations));
        for (const operation of operations) {
          const result = resultOf(operation);
          expect(result).toBeGreaterThanOrEqual(0);
          expect(result).toBeLessThan(100);
          expect(columnAnswer(operation, 'ones') + columnAnswer(operation, 'tens') * 10).toBe(result);
          expect(operation.a).toBeGreaterThanOrEqual(operation.b);
          if (operation.operator === '−' && level !== 5) expect(needsExchange(operation)).toBe(false);
          if (level === 0) { expect(result).toBeLessThan(10); expect(operation.a).toBeLessThan(10); expect(needsExchange(operation)).toBe(false); }
          if (level === 1 || level === 4) expect(needsExchange(operation)).toBe(false);
          if (level === 2) {
            expect(result).toBeLessThanOrEqual(20);
            if (operation.operator === '+') { expect(operation.a).toBeLessThan(10); expect(result).toBeGreaterThanOrEqual(10); }
            else expect(needsExchange(operation)).toBe(false);
          }
          if (level === 3 || level === 5) expect(needsExchange(operation)).toBe(true);
          if (level === 3 || level === 4 || level === 5) { expect(operation.a).toBeGreaterThanOrEqual(10); expect(operation.b).toBeGreaterThanOrEqual(10); }
        }
      }
      expect(distinct.size).toBeGreaterThan(90);
    });
  }
  it('keeps landing examples consistent with the separated borrowing level', () => {
    expect(levelExamples[3].operator).toBe('+');
    expect(levelExamples[5].operator).toBe('−');
    expect(needsExchange(levelExamples[5])).toBe(true);
    expect(needsExchange(levelExamples[6])).toBe(false);
  });
  it('supports deterministic tests without fixed game rounds or shared mutable operations', () => {
    const operations = getOperations(0, seededRandom(42));
    const again = getOperations(0, seededRandom(42));
    expect(operations).toEqual(again);
    operations[0].a = 999;
    expect(again[0].a).not.toBe(999);
    expect(getOperations(0, seededRandom(43))).not.toEqual(again);
  });
  it('handles RNG boundary values without rejection loops or invalid subtraction', () => {
    for (let level = 0; level < levels.length; level++) for (const value of [0, 0.999999]) {
      for (const operation of getOperations(level, () => value)) {
        expect(resultOf(operation)).toBeGreaterThanOrEqual(0);
        expect(resultOf(operation)).toBeLessThan(100);
        expect(operation.a).toBeGreaterThanOrEqual(operation.b);
      }
    }
  });
});

describe('browser persistence', () => {
  it('recovers from malformed and unavailable storage', () => {
    vi.stubGlobal('localStorage', { getItem: () => '{bad', setItem: () => { throw new Error('blocked'); } });
    expect(loadProgress()).toEqual({ completed: {}, sound: false });
    expect(saveProgress({ completed: {}, sound: false })).toBe(false);
  });
  it('only accepts valid completion counts and a boolean sound preference', () => {
    vi.stubGlobal('localStorage', { getItem: () => JSON.stringify({ completed: { 0: 3, 1: -2, 2: '4', 3: 1.5, 4: 999999, 99: 5 }, sound: 'yes' }) });
    expect(loadProgress()).toEqual({ completed: { 0: 3, 4: 9999 }, sound: false });
  });
});
