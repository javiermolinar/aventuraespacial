import { describe, expect, it } from 'vitest';
import { neighbour, openings, pipeFlow, pipeHint, validPipeLayout, waterTankPuzzle as layout } from './pipes';

describe('pipe puzzle', () => {
  it('authors a solvable 4 × 4 winding route with seven misplaced route tiles', () => {
    expect(validPipeLayout(layout)).toBe(true);
    expect(pipeFlow(layout, layout.initial)).toEqual({ wet: [0, 1], solved: false });
    const solved = pipeFlow(layout, layout.solution);
    expect(solved).toEqual({ wet: [0, 1, 5, 6, 10, 9, 13, 14, 15], solved: true });
    expect(solved.wet.filter(index => layout.initial[index] !== layout.solution[index])).toHaveLength(7);
  });
  it('rotates elbows and straight pipes clockwise', () => {
    expect(openings('elbow', 0)).toEqual([0, 1]);
    expect(openings('elbow', 3)).toEqual([3, 0]);
    expect(openings('straight', 1)).toEqual([1, 3]);
  });
  it('requires reciprocal openings, a connected source, and an outward goal port', () => {
    const rotations = [...layout.solution];
    rotations[0] = 0;
    expect(pipeFlow(layout, rotations)).toEqual({ wet: [], solved: false });
    rotations[0] = 1;
    rotations[5] = 1;
    expect(pipeFlow(layout, rotations)).toEqual({ wet: [0, 1], solved: false });
    rotations[5] = 0;
    rotations[15] = 0;
    expect(pipeFlow(layout, rotations).solved).toBe(false);
  });
  it('never wraps a row or crosses an exterior edge', () => {
    expect(neighbour(3, 1, 4)).toBeNull();
    expect(neighbour(4, 3, 4)).toBeNull();
    expect(neighbour(0, 0, 4)).toBeNull();
    expect(neighbour(15, 2, 4)).toBeNull();
    expect(neighbour(5, 0, 4)).toBe(1);
  });
  it('accepts connected solutions regardless of spare tiles or straight-pipe symmetry', () => {
    const rotations = [...layout.solution];
    const route = pipeFlow(layout, rotations).wet;
    for (let index = 0; index < rotations.length; index++) {
      if (!route.includes(index)) rotations[index] = (rotations[index] + 1) % 4;
      else if (layout.tiles[index] === 'straight') rotations[index] = (rotations[index] + 2) % 4;
    }
    expect(rotations).not.toEqual(layout.solution);
    expect(pipeFlow(layout, rotations).solved).toBe(true);
    expect(pipeHint(layout, rotations)).toBeNull();
  });
  it('offers one useful hint at a time until solved without changing the board itself', () => {
    const rotations = [...layout.initial];
    let hints = 0;
    while (!pipeFlow(layout, rotations).solved && hints < 16) {
      const before = [...rotations];
      const hint = pipeHint(layout, rotations);
      expect(rotations).toEqual(before);
      expect(hint).not.toBeNull();
      rotations[hint!] = layout.solution[hint!];
      hints++;
    }
    expect(hints).toBe(7);
    expect(pipeFlow(layout, rotations).solved).toBe(true);
  });
  it('rejects broken authoring rather than shipping an impossible board', () => {
    expect(validPipeLayout({ ...layout, size: 2 })).toBe(false);
    expect(validPipeLayout({ ...layout, initial: layout.solution })).toBe(false);
    expect(validPipeLayout({ ...layout, solution: layout.initial })).toBe(false);
    expect(validPipeLayout({ ...layout, source: { index: 5, side: 0 } })).toBe(false);
    expect(validPipeLayout({ ...layout, goal: { index: 16, side: 1 } })).toBe(false);
  });
});
