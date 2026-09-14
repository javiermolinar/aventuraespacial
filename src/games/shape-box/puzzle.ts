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

export function isSolved(puzzle: Puzzle, state: PiecesState): boolean {
  return puzzle.pieces.every(piece => {
    const entry = state[piece.id];
    return entry.position && canPlace(puzzle, state, piece.id, { ...entry.position, turns: entry.turns });
  }) && puzzle.pieces.reduce((total, piece) => total + piece.cells.length, 0) === puzzle.width * puzzle.height;
}
