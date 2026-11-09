import { describe, expect, it } from 'vitest';
import { completedBoard, createPuzzle, lineSums, matchingLines, starterPuzzle, starterPuzzle3, swapTiles } from './game';

describe('Diez líneas rules', () => {
  it('creates completed boards with nine positive numbers', () => {
    for (let index = 0; index < 100; index += 1) {
      const board = completedBoard();
      expect(board).toHaveLength(9);
      expect(board.every(value => value >= 1 && value <= 9)).toBe(true);
      expect(matchingLines(board)).toBe(6);
      expect(lineSums(board).rows).toEqual([10, 10, 10]);
      expect(lineSums(board).columns).toEqual([10, 10, 10]);
    }
  });

  it('starts the tutorial one swap away from its solution', () => {
    const different = starterPuzzle3.initial.map((value, index) => value !== starterPuzzle3.solution[index] ? index : -1).filter(index => index >= 0);
    expect(different).toEqual([1, 3]);
    expect(matchingLines(starterPuzzle3.initial)).toBeLessThan(6);
    expect(matchingLines(swapTiles(starterPuzzle3.initial, 1, 3))).toBe(6);
  });

  it.each(['1', '2', '3'] as const)('creates unsolved %s-swap puzzles with valid solutions', difficulty => {
    for (let index = 0; index < 100; index += 1) {
      const puzzle = createPuzzle(difficulty, 3);
      expect(matchingLines(puzzle.initial)).toBeLessThan(6);
      expect(matchingLines(puzzle.solution)).toBe(6);
      const differences = puzzle.initial.filter((value, cell) => value !== puzzle.solution[cell]).length;
      expect(differences).toBeGreaterThan(0);
      expect(differences).toBeLessThanOrEqual(Number(difficulty) * 2);
    }
  });

  it('starts with a 2 × 2 tutorial one swap from its solution', () => {
    expect(starterPuzzle.size).toBe(2);
    expect(matchingLines(starterPuzzle.solution, 2)).toBe(4);
    expect(matchingLines(starterPuzzle.initial, 2)).toBe(2);
    expect(matchingLines(swapTiles(starterPuzzle.initial, 0, 1), 2)).toBe(4);
  });

  it('creates solvable 2 × 2 boards whose tiles are never all equal', () => {
    for (let value = 0; value < 100; value += 1) {
      const board = completedBoard(Math.random, 2);
      expect(board).toHaveLength(4);
      expect(lineSums(board, 2)).toEqual({ rows: [10, 10], columns: [10, 10] });
      expect(new Set(board).size).toBe(2);
      for (const difficulty of ['1', '2'] as const) {
        const puzzle = createPuzzle(difficulty, 2);
        expect(puzzle.size).toBe(2);
        expect(matchingLines(puzzle.initial, 2)).toBeLessThan(4);
        expect(matchingLines(puzzle.solution, 2)).toBe(4);
      }
    }
    expect(completedBoard(() => 0, 2)).toEqual([1, 9, 9, 1]);
    expect(completedBoard(() => 0.999999, 2)).toEqual([9, 1, 1, 9]);
  });

  it('swaps without mutating the original board', () => {
    const board = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    const next = swapTiles(board, 0, 8);
    expect(next).toEqual([9, 2, 3, 4, 5, 6, 7, 8, 1]);
    expect(board).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });
});
