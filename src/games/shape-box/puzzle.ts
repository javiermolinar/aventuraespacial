export type Cell = { x: number; y: number };
export type Placement = Cell & { turns: number };
export type Piece = { id: string; color: string; cells: Cell[] };
export type Puzzle = { name: string; width: number; height: number; pieces: Piece[]; solution: Record<string, Placement> };
export type PiecesState = Record<string, { turns: number; position: Cell | null }>;

export function normalize(cells: Cell[]): Cell[] {
  const minX = Math.min(...cells.map(cell => cell.x));
  const minY = Math.min(...cells.map(cell => cell.y));
  return cells.map(({ x, y }) => ({ x: x - minX, y: y - minY }));
}

export function rotate(cells: Cell[], turns: number): Cell[] {
  let result = normalize(cells);
  for (let i = 0; i < ((turns % 4) + 4) % 4; i++) result = normalize(result.map(({ x, y }) => ({ x: -y, y: x })));
  return result;
}

export function dimensions(cells: Cell[]) {
  return { width: Math.max(...cells.map(cell => cell.x)) + 1, height: Math.max(...cells.map(cell => cell.y)) + 1 };
}

const colors = ['#efab54', '#79bbaf', '#ad97d6', '#e88e98', '#79afe0', '#b9c969', '#dca47e', '#a5aeda'];
// Each letter is one connected piece. Authoring from a complete tiling guarantees
// that every challenge can be solved using rotations alone (never reflections).
function puzzle(name: string, rows: string[]): Puzzle {
  const ids = [...new Set(rows.join(''))];
  const solution: Puzzle['solution'] = {};
  const pieces = ids.map((id, index) => {
    const cells = rows.flatMap((row, y) => [...row].flatMap((letter, x) => letter === id ? [{ x, y }] : []));
    const scramble = index % 3 + 1;
    solution[id] = { x: Math.min(...cells.map(cell => cell.x)), y: Math.min(...cells.map(cell => cell.y)), turns: (4 - scramble) % 4 };
    return { id, color: colors[index % colors.length], cells: rotate(cells, scramble) };
  });
  return { name, width: rows[0].length, height: rows.length, pieces, solution };
}

export const puzzles: Puzzle[] = [
  puzzle('Una caja pequeña', ['ABB', 'AAB', 'CCC']),
  puzzle('Un poco más larga', ['AAAB', 'ACBB', 'CCCB']),
  puzzle('Cuatro esquinas', ['AABB', 'ACCB', 'ACDB', 'DDDD']),
  puzzle('Una caja de colores', ['AAABB', 'ACBBB', 'ACDDD', 'CCDEE']),
  puzzle('El gran cuadrado', ['AAABB', 'ACBBB', 'ACDDD', 'CCEDF', 'EEEFF']),
  puzzle('La última mudanza', ['AAABBC', 'ADBBCC', 'ADDEEC', 'FDGEHH', 'FFGGHH']),
  // Append new boxes: adventure chapters and saved progress reference existing indices.
  puzzle('Zigzag de colores', ['AABB', 'CAAB', 'CCDB', 'CDDD']),
  puzzle('Puentes y esquinas', ['AAADD', 'ACADD', 'CCBDB', 'CCBBB']),
  puzzle('Una cruz en la caja', ['BBDDD', 'BBDAD', 'BCAAA', 'CCEAE', 'CCEEE']),
  puzzle('Escaleras de colores', ['EEEDDD', 'EABBDD', 'EAABBF', 'CCAABF', 'CCCFFF']),
  puzzle('Letras escondidas', ['ABBBCC', 'AABBCC', 'EAAFCD', 'EEEFDD', 'EFFFDD']),
  puzzle('La gran mezcla', ['CCCDDD', 'CACBBD', 'AAAEBD', 'FFAEBB', 'FFFEEE']),
];

export function initialState(puzzle: Puzzle): PiecesState {
  return Object.fromEntries(puzzle.pieces.map(piece => [piece.id, { turns: 0, position: null }]));
}

export function occupiedCells(piece: Piece, state: PiecesState[string]): Cell[] {
  if (!state.position) return [];
  return rotate(piece.cells, state.turns).map(({ x, y }) => ({ x: x + state.position!.x, y: y + state.position!.y }));
}

export function canPlace(puzzle: Puzzle, state: PiecesState, id: string, placement: Placement): boolean {
  const piece = puzzle.pieces.find(piece => piece.id === id);
  if (!piece || ![placement.x, placement.y, placement.turns].every(Number.isInteger)) return false;
  const occupied = new Set(puzzle.pieces.filter(piece => piece.id !== id).flatMap(piece => occupiedCells(piece, state[piece.id])).map(({ x, y }) => `${x},${y}`));
  return occupiedCells(piece, { turns: placement.turns, position: placement }).every(({ x, y }) =>
    x >= 0 && y >= 0 && x < puzzle.width && y < puzzle.height && !occupied.has(`${x},${y}`));
}

/** Validate saved or host-supplied state before passing it to the interactive board. */
export function validPiecesState(puzzle: Puzzle, value: unknown): value is PiecesState {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const state = value as PiecesState;
  if (Object.keys(state).length !== puzzle.pieces.length) return false;
  for (const piece of puzzle.pieces) {
    if (!Object.hasOwn(state, piece.id)) return false;
    const entry = state[piece.id];
    if (!entry || typeof entry !== 'object' || Array.isArray(entry) || !Number.isInteger(entry.turns) || entry.turns < 0 || entry.turns > 3) return false;
    if (entry.position !== null && (!entry.position || typeof entry.position !== 'object' || Array.isArray(entry.position) ||
      !Number.isInteger(entry.position.x) || !Number.isInteger(entry.position.y))) return false;
  }
  return puzzle.pieces.every(piece => {
    const entry = state[piece.id];
    return !entry.position || canPlace(puzzle, state, piece.id, { ...entry.position, turns: entry.turns });
  });
}

export function isSolved(puzzle: Puzzle, state: PiecesState): boolean {
  return puzzle.pieces.every(piece => {
    const entry = state[piece.id];
    return entry.position && canPlace(puzzle, state, piece.id, { ...entry.position, turns: entry.turns });
  }) && puzzle.pieces.reduce((total, piece) => total + piece.cells.length, 0) === puzzle.width * puzzle.height;
}
