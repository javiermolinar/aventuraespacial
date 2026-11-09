// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import ResistorBoard from './ResistorBoard';
import { branchLevels, evaluateBoard, emptyPlacements, type Placements } from './game';

afterEach(cleanup);

describe('printed resistance board', () => {
  it('accepts either order of bridge and −3 on the main channel', () => {
    expect(evaluateBoard({ A: 'bridge', B: 'r3', C: 'r1' })).toMatchObject({ arrival: 2, outcome: 'correct', solved: true });
    expect(evaluateBoard({ A: 'r3', B: 'bridge', C: 'r1' })).toMatchObject({ arrival: 2, outcome: 'correct', solved: true });
  });

  it('rejects every other complete permutation by its actual numerical result', () => {
    const wrong: Placements[] = [
      { A: 'bridge', B: 'r1', C: 'r3' }, { A: 'r1', B: 'bridge', C: 'r3' },
      { A: 'r1', B: 'r3', C: 'bridge' }, { A: 'r3', B: 'r1', C: 'bridge' },
    ];
    expect(wrong.map(board => evaluateBoard(board))).toEqual([
      expect.objectContaining({ arrival: 4, outcome: 'high', solved: false }),
      expect.objectContaining({ arrival: 4, outcome: 'high', solved: false }),
      expect.objectContaining({ arrival: 1, outcome: 'low', solved: false }),
      expect.objectContaining({ arrival: 1, outcome: 'low', solved: false }),
    ]);
  });

  it('requires all three pieces to be placed without using an authored-layout check', () => {
    expect(evaluateBoard({ ...emptyPlacements(), A: 'r3', B: 'bridge' })).toMatchObject({ arrival: 2, outcome: 'incomplete', solved: false });
    expect(evaluateBoard(emptyPlacements())).toMatchObject({ arrival: null, afterFirst: null, outcome: 'incomplete' });
  });

  it('level 2: branch currents add, a branch floors at 0 and two placements win', () => {
    const pieces = ['bridge', 'r1', 'r3'] as const;
    const winners: string[] = [];
    for (const A of pieces) for (const B of pieces) if (A !== B && evaluateBoard({ A, B, C: null }, 2).solved) winners.push(`${A}/${B}`);
    expect(winners).toEqual(['bridge/r3', 'r3/r1']);
    expect(evaluateBoard({ A: 'bridge', B: 'r3', C: null }, 2)).toMatchObject({ outs: { A: 2, B: 0 }, arrival: 2 });
    expect(evaluateBoard({ A: 'r3', B: 'r1', C: null }, 2)).toMatchObject({ outs: { A: 0, B: 2 }, arrival: 2 });
    expect(evaluateBoard({ A: 'r1', B: 'r3', C: null }, 2)).toMatchObject({ arrival: 1, outcome: 'low' });
    expect(evaluateBoard({ A: 'bridge', B: 'r1', C: null }, 2)).toMatchObject({ arrival: 4, outcome: 'high' });
  });

  it('level 3: three branches, only −3 in the free middle branch wins', () => {
    const pieces = ['bridge', 'r1', 'r2', 'r3'] as const;
    const winners: string[] = [];
    for (const A of pieces) for (const B of pieces) for (const C of pieces) {
      if (new Set([A, B, C]).size === 3 && evaluateBoard({ A, B, C }, 3).solved) winners.push(`${A}/${B}/${C}`);
    }
    expect(winners).toEqual(['r1/r3/r2', 'r2/r3/r1']);
    expect(evaluateBoard({ A: 'r1', B: 'r3', C: 'r2' }, 3)).toMatchObject({ outs: { A: 1, B: 1, C: 0 }, arrival: 2 });
    expect(evaluateBoard({ A: 'r1', B: 'bridge', C: 'r2' }, 3)).toMatchObject({ arrival: 5, outcome: 'high' });
  });

  it('every branch board has few, intended solutions that leave at least one piece out', () => {
    const pieces = ['bridge', 'r1', 'r2', 'r3'] as const;
    const expected: Record<number, number> = { 3: 2, 4: 3, 5: 4, 6: 4, 7: 4 };
    for (const [level, count] of Object.entries(expected)) {
      const { slots, target } = branchLevels[Number(level) as 3];
      let solutions = 0;
      for (const A of pieces) for (const B of pieces) for (const C of pieces) {
        if (new Set([A, B, C]).size !== 3) continue;
        const result = evaluateBoard({ A, B, C }, Number(level) as 3);
        if (result.solved) { solutions++; expect(result.arrival).toBe(target); }
      }
      expect(slots).toHaveLength(3);
      expect(solutions, `level ${level}`).toBe(count);
    }
  });

  it('shows too much energy instead of lighting the bulb with −1', () => {
    render(<ResistorBoard />);
    for (const [piece, slot] of [['Puente', 'A'], ['Resistencia −1', 'B'], ['Resistencia −3', 'C']] as const) {
      fireEvent.click(screen.getByRole('button', { name: piece }));
      fireEvent.click(screen.getByRole('button', { name: new RegExp(`^Hueco ${slot},`) }));
    }
    fireEvent.click(screen.getByRole('button', { name: 'Probar' }));
    expect(screen.getByRole('img', { name: /Rota por exceso/ })).toBeTruthy();
    expect(screen.getByRole('status').textContent).toContain('Llegan 4');
  });

  it('plays level 2 with the bridge on top and −3 below', () => {
    render(<ResistorBoard />);
    fireEvent.click(screen.getByRole('button', { name: '2' }));
    for (const [piece, slot] of [['Puente', 'A'], ['Resistencia −3', 'B']] as const) {
      fireEvent.click(screen.getByRole('button', { name: piece }));
      fireEvent.click(screen.getByRole('button', { name: new RegExp(`^Hueco ${slot},`) }));
    }
    fireEvent.click(screen.getByRole('button', { name: 'Probar' }));
    expect(screen.getByRole('img', { name: /Bombilla: necesita 2. Encendida/ })).toBeTruthy();
    expect(screen.getByRole('status').textContent).toContain('2 + 0 = 2');
  });
});
