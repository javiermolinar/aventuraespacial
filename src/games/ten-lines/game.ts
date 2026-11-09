export const TARGET = 10;

export const difficulties = [
  { id: '1', label: '1 intercambio' },
  { id: '2', label: '2 intercambios' },
  { id: '3', label: '3 intercambios' },
  { id: 'free', label: 'Libre' },
] as const;

export type Difficulty = typeof difficulties[number]['id'];
export type Puzzle = { solution: number[]; initial: number[]; difficulty: Difficulty };
type Random = () => number;

export const starterPuzzle: Puzzle = {
  solution: [1, 3, 6, 5, 2, 3, 4, 5, 1],
  initial: [1, 5, 6, 3, 2, 3, 4, 5, 1],
  difficulty: '1',
};

export function lineSums(cells: number[]) {
  return {
    rows: [0, 1, 2].map(row => cells[row * 3] + cells[row * 3 + 1] + cells[row * 3 + 2]),
    columns: [0, 1, 2].map(column => cells[column] + cells[column + 3] + cells[column + 6]),
  };
}

export function matchingLines(cells: number[]) {
  const sums = lineSums(cells);
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

/** Choose the upper-left 2 × 2, then complete all row and column totals. */
export function completedBoard(random: Random = Math.random): number[] {
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

export function scrambledBySwaps(solution: number[], swapCount: number, random: Random = Math.random) {
  let initial: number[];
  do {
    initial = [...solution];
    for (let move = 0; move < swapCount; move += 1) {
      const source = randomInteger(0, 8, random);
      const destinations = initial.map((_, index) => index).filter(index => index !== source && initial[index] !== initial[source]);
      const destination = destinations[Math.floor(random() * destinations.length)];
      initial = swapTiles(initial, source, destination);
    }
  } while (matchingLines(initial) === 6);
  return initial;
}

export function createPuzzle(difficulty: Difficulty, random: Random = Math.random): Puzzle {
  const solution = completedBoard(random);
  let initial: number[];
  if (difficulty === 'free') {
    do {
      initial = shuffled(solution, random);
    } while (matchingLines(initial) > 2);
  } else {
    initial = scrambledBySwaps(solution, Number(difficulty), random);
  }
  return { solution, initial, difficulty };
}
