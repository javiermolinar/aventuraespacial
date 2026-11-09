export const TARGET = 10;

export const sizes = [{ id: 2, label: '2 × 2' }, { id: 3, label: '3 × 3' }] as const;
export type Size = typeof sizes[number]['id'];

export const difficulties = [
  { id: '1', label: '1 intercambio' },
  { id: '2', label: '2 intercambios' },
  { id: '3', label: '3 intercambios' },
  { id: 'free', label: 'Libre' },
] as const;

export type Difficulty = typeof difficulties[number]['id'];
export type Puzzle = { solution: number[]; initial: number[]; difficulty: Difficulty; size: Size };
type Random = () => number;

/** The 2 × 2 board is small enough to have only two distinct solutions per pair of numbers. */
export const difficultiesFor = (size: Size) => difficulties.filter(level => size === 3 || level.id === '1' || level.id === '2');
export const lineCount = (size: Size) => size * 2;

export const starterPuzzle: Puzzle = {
  solution: [3, 7, 7, 3],
  initial: [7, 3, 7, 3],
  difficulty: '1',
  size: 2,
};

export const starterPuzzle3: Puzzle = {
  solution: [1, 3, 6, 5, 2, 3, 4, 5, 1],
  initial: [1, 5, 6, 3, 2, 3, 4, 5, 1],
  difficulty: '1',
  size: 3,
};

export function lineSums(cells: number[], size: Size = 3) {
  const indexes = Array.from({ length: size }, (_, index) => index);
  return {
    rows: indexes.map(row => indexes.reduce((sum, column) => sum + cells[row * size + column], 0)),
    columns: indexes.map(column => indexes.reduce((sum, row) => sum + cells[row * size + column], 0)),
  };
}

export function matchingLines(cells: number[], size: Size = 3) {
  const sums = lineSums(cells, size);
  return [...sums.rows, ...sums.columns].filter(sum => sum === TARGET).length;
}

export function swapTiles(cells: number[], source: number, destination: number) {
  const next = [...cells];
  [next[source], next[destination]] = [next[destination], next[source]];
  return next;
}

function randomInteger(min: number, max: number, random: Random) {
  return Math.floor(random() * (max - min + 1)) + min;
}

/** Choose the upper-left block, then complete all row and column totals. */
export function completedBoard(random: Random = Math.random, size: Size = 3): number[] {
  if (size === 2) {
    // 5 would make all four tiles equal, so no swap could ever change the board.
    const a = randomInteger(1, 8, random);
    const first = a >= 5 ? a + 1 : a;
    return [first, TARGET - first, TARGET - first, first];
  }
  while (true) {
    const a = randomInteger(1, 8, random);
    const b = randomInteger(1, 8, random);
    const d = randomInteger(1, 8, random);
    const e = randomInteger(1, 8, random);
    const board = [
      a, b, TARGET - a - b,
      d, e, TARGET - d - e,
      TARGET - a - d, TARGET - b - e, a + b + d + e - TARGET,
    ];
    if (board.every(value => value >= 1 && value <= 9)) return board;
  }
}

function shuffled(values: number[], random: Random) {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const other = Math.floor(random() * (index + 1));
    [result[index], result[other]] = [result[other], result[index]];
  }
  return result;
}

export function scrambledBySwaps(solution: number[], swapCount: number, random: Random = Math.random, size: Size = 3) {
  let initial: number[];
  do {
    initial = [...solution];
    for (let move = 0; move < swapCount; move += 1) {
      const source = randomInteger(0, solution.length - 1, random);
      const destinations = initial.map((_, index) => index).filter(index => index !== source && initial[index] !== initial[source]);
      const destination = destinations[Math.floor(random() * destinations.length)];
      initial = swapTiles(initial, source, destination);
    }
  } while (matchingLines(initial, size) === lineCount(size));
  return initial;
}

export function createPuzzle(difficulty: Difficulty, size: Size = 3, random: Random = Math.random): Puzzle {
  const solution = completedBoard(random, size);
  let initial: number[];
  if (difficulty === 'free') {
    do {
      initial = shuffled(solution, random);
    } while (matchingLines(initial, size) > 2);
  } else {
    initial = scrambledBySwaps(solution, Number(difficulty), random, size);
  }
  return { solution, initial, difficulty, size };
}
