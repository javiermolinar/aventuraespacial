import { describe, expect, it } from 'vitest';
import { completedBoard, createPuzzle, lineSums, matchingLines, starterPuzzle, swapTiles } from './game';

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
    const different = starterPuzzle.initial.map((value, index) => value !== starterPuzzle.solution[index] ? index : -1).filter(index => index >= 0);
    expect(different).toEqual([1, 3]);
    expect(matchingLines(starterPuzzle.initial)).toBeLessThan(6);
    expect(matchingLines(swapTiles(starterPuzzle.initial, 1, 3))).toBe(6);
  });

  it.each(['1', '2', '3'] as const)('creates unsolved %s-swap puzzles with valid solutions', difficulty => {
    for (let index = 0; index < 100; index += 1) {
      const puzzle = createPuzzle(difficulty);
      expect(matchingLines(puzzle.initial)).toBeLessThan(6);
      expect(matchingLines(puzzle.solution)).toBe(6);
      const differences = puzzle.initial.filter((value, cell) => value !== puzzle.solution[cell]).length;
      expect(differences).toBeGreaterThan(0);
      expect(differences).toBeLessThanOrEqual(Number(difficulty) * 2);
    }
  });

  it('swaps without mutating the original board', () => {
    const board = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    const next = swapTiles(board, 0, 8);
    expect(next).toEqual([9, 2, 3, 4, 5, 6, 7, 8, 1]);
    expect(board).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });
});
