import { describe, expect, it } from 'vitest';
import { canPlace, initialState, isSolved, normalize, occupiedCells, puzzles, rotate, type Cell } from './puzzle';

const sorted = (cells: Cell[]) => cells.map(({ x, y }) => `${x},${y}`).sort();

describe('shape packing geometry', () => {
  it('rotates clockwise, normalizes, and returns to the same shape after four turns', () => {
    const shape = [{ x: 3, y: 4 }, { x: 3, y: 5 }, { x: 4, y: 5 }];
    expect(sorted(rotate(shape, 1))).toEqual(['0,0', '0,1', '1,0']);
    expect(sorted(rotate(shape, 4))).toEqual(sorted(normalize(shape)));
    expect(sorted(rotate(shape, -1))).toEqual(sorted(rotate(shape, 3)));
  });

  for (const puzzle of puzzles) {
    it(`${puzzle.name}: connected pieces tile the entire board using rotations only`, () => {
      const state = initialState(puzzle);
      expect(isSolved(puzzle, state)).toBe(false);
      for (const piece of puzzle.pieces) {
        const seen = new Set<string>();
        const remaining = [piece.cells[0]];
        while (remaining.length) {
          const cell = remaining.pop()!;
          const key = `${cell.x},${cell.y}`;
          if (seen.has(key)) continue;
          seen.add(key);
          remaining.push(...piece.cells.filter(other => Math.abs(other.x - cell.x) + Math.abs(other.y - cell.y) === 1 && !seen.has(`${other.x},${other.y}`)));
        }
        expect(seen.size).toBe(piece.cells.length);
        const placement = puzzle.solution[piece.id];
        expect(canPlace(puzzle, state, piece.id, placement)).toBe(true);
        state[piece.id] = { turns: placement.turns, position: placement };
      }
      expect(isSolved(puzzle, state)).toBe(true);
      expect(new Set(puzzle.pieces.flatMap(piece => occupiedCells(piece, state[piece.id])).map(cell => `${cell.x},${cell.y}`)).size).toBe(puzzle.width * puzzle.height);
    });
  }

  it('rejects overlap and all boundaries, but ignores the piece itself when moving', () => {
    const puzzle = puzzles[0];
    const state = initialState(puzzle);
    const a = puzzle.solution.A;
    state.A = { turns: a.turns, position: a };
    expect(canPlace(puzzle, state, 'A', a)).toBe(true);
    expect(canPlace(puzzle, state, 'B', { x: 0, y: 0, turns: 0 })).toBe(false);
    for (const position of [{ x: -1, y: 0 }, { x: 0, y: -1 }, { x: 3, y: 0 }, { x: 0, y: 3 }, { x: .5, y: 0 }]) {
      expect(canPlace(puzzle, state, 'A', { ...position, turns: 0 })).toBe(false);
    }
    expect(isSolved(puzzle, state)).toBe(false);
  });

  it('does not require the authored solution: accepts other complete tilings', () => {
    const puzzle = puzzles[0];
    const state = initialState(puzzle);
    for (const piece of puzzle.pieces) {
      const solution = puzzle.solution[piece.id];
      const cells = rotate(piece.cells, solution.turns);
      state[piece.id] = { turns: (solution.turns + 2) % 4, position: {
        x: puzzle.width - solution.x - Math.max(...cells.map(cell => cell.x)) - 1,
        y: puzzle.height - solution.y - Math.max(...cells.map(cell => cell.y)) - 1,
      } };
    }
    expect(isSolved(puzzle, state)).toBe(true);
  });
});
