export const robotKinds = ['row', 'column', 'diagonal'] as const;
export type RobotKind = typeof robotKinds[number];
export const robotNames: Record<RobotKind, string> = { row: 'Filas', column: 'Columnas', diagonal: 'Diagonales' };
export const directions = [
  { dx: -1, dy: -1, name: 'arriba a la izquierda', arrow: '↖' },
  { dx: 0, dy: -1, name: 'arriba', arrow: '↑' },
  { dx: 1, dy: -1, name: 'arriba a la derecha', arrow: '↗' },
  { dx: -1, dy: 0, name: 'a la izquierda', arrow: '←' },
  { dx: 1, dy: 0, name: 'a la derecha', arrow: '→' },
  { dx: -1, dy: 1, name: 'abajo a la izquierda', arrow: '↙' },
  { dx: 0, dy: 1, name: 'abajo', arrow: '↓' },
  { dx: 1, dy: 1, name: 'abajo a la derecha', arrow: '↘' },
] as const;

export interface Puzzle {
  id: string;
  name: string;
  size: number;
  rats: number[];
  walls: number[];
  start: number;
  robots: RobotKind[];
}
export interface GameState {
  discovered: number[];
  cleared: number[];
  positions: Partial<Record<number, number>>;
  status: 'playing' | 'won' | 'lost';
  loss?: 'rat' | 'robots';
  hit?: number;
  beams: number[][];
}
/** Public information only. The deduction engine never receives the puzzle. */
export interface Observation {
  size: number;
  remaining: number;
  safe: number[];
  walls: number[];
  clues: { cell: number; counts: number[] }[];
}
export const cellName = (cell: number, size: number) => `${String.fromCharCode(65 + cell % size)}${Math.floor(cell / size) + 1}`;
export const cellIndex = (name: string, size: number) => (Number(name.slice(1)) - 1) * size + name.charCodeAt(0) - 65;
export const cells = (size: number) => Array.from({ length: size * size }, (_, i) => i);
const inside = (size: number, cell: number) => Number.isInteger(cell) && cell >= 0 && cell < size * size;

export function ray(size: number, cell: number, direction: number): number[] {
  const { dx, dy } = directions[direction];
  const result: number[] = [];
  let x = cell % size + dx, y = Math.floor(cell / size) + dy;
  while (x >= 0 && x < size && y >= 0 && y < size) {
    result.push(y * size + x); x += dx; y += dy;
  }
  return result;
}
export function firingDirections(kind: RobotKind) {
  return directions.flatMap(({ dx, dy }, i) => (kind === 'row' ? dy === 0 : kind === 'column' ? dx === 0 : dx !== 0 && dy !== 0) ? [i] : []);
}
export function laserPaths(size: number, walls: readonly number[], cell: number, kind: RobotKind): number[][] {
  return firingDirections(kind).map(direction => {
    const path = ray(size, cell, direction);
    const stop = path.findIndex(c => walls.includes(c));
    return [cell, ...(stop < 0 ? path : path.slice(0, stop + 1))];
  });
}
function nearbyWalls(puzzle: Puzzle, cell: number) {
  return puzzle.walls.filter(w => Math.max(Math.abs(w % puzzle.size - cell % puzzle.size), Math.abs(Math.floor(w / puzzle.size) - Math.floor(cell / puzzle.size))) <= 1);
}
export function initialState(_puzzle: Puzzle): GameState {
  return { discovered: [], cleared: [], positions: {}, status: 'playing', beams: [] };
}
export function radar(puzzle: Puzzle, state: GameState, cell: number): number[] {
  return directions.map((_, i) => ray(puzzle.size, cell, i).filter(c => puzzle.rats.includes(c) && !state.cleared.includes(c)).length);
}
export function observe(puzzle: Puzzle, state: GameState): Observation {
  // Only discovered, unoccupied-by-rat cells can contribute clues. Looking at
  // a lost board must never turn the exposed answer into a deduction oracle.
  const safe = state.discovered.filter(c => !puzzle.rats.includes(c) || state.cleared.includes(c));
  return { size: puzzle.size, remaining: puzzle.rats.length - state.cleared.length, safe,
    walls: safe.filter(c => puzzle.walls.includes(c)),
    clues: safe.filter(c => !puzzle.walls.includes(c)).map(cell => ({ cell, counts: radar(puzzle, state, cell) })) };
}
export function scan(puzzle: Puzzle, state: GameState, cell: number): GameState {
  if (state.status !== 'playing' || !inside(puzzle.size, cell)) return state;
  if (puzzle.rats.includes(cell) && !state.cleared.includes(cell)) return { ...state, status: 'lost', loss: 'rat', hit: cell, beams: [] };
  const discovered = [...new Set([...state.discovered, cell, ...nearbyWalls(puzzle, cell)])];
  return { ...state, discovered, beams: [] };
}
/** Only the player's first exploration is protected. Relocate a rat without
 * changing the counts; subsequent clicks use the ordinary losing scan rule. */
export function explore(puzzle: Puzzle, state: GameState, cell: number): { puzzle: Puzzle; state: GameState } {
  let nextPuzzle = puzzle;
  if (state.status === 'playing' && state.discovered.length === 0 && inside(puzzle.size, cell) && puzzle.rats.includes(cell)) {
    const destination = cells(puzzle.size).find(c => c !== cell && !puzzle.rats.includes(c) && !puzzle.walls.includes(c));
    if (destination === undefined) return { puzzle, state };
    nextPuzzle = { ...puzzle, start: cell, rats: puzzle.rats.map(rat => rat === cell ? destination : rat) };
  }
  return { puzzle: nextPuzzle, state: scan(nextPuzzle, state, cell) };
}

export function placementError(puzzle: Puzzle, state: GameState, robot: number, cell: number): string | null {
  if (state.status !== 'playing') return 'La ronda ha terminado.';
  if (!Number.isInteger(robot) || robot < 0 || robot >= puzzle.robots.length) return 'Ese robot no está disponible.';
  if (state.positions[robot] !== undefined) return 'Ese robot ya está colocado y no puede moverse.';
  if (!inside(puzzle.size, cell) || !state.discovered.includes(cell)) return 'Primero descubre esa casilla con el radar.';
  if (puzzle.walls.includes(cell)) return 'No puedes colocar un robot en una pared.';
  if (Object.values(state.positions).includes(cell)) return 'Esa casilla ya tiene un robot.';
  return null;
}
export function placeRobot(puzzle: Puzzle, state: GameState, robot: number, cell: number): GameState {
  if (placementError(puzzle, state, robot, cell)) return state;
  const beams = laserPaths(puzzle.size, puzzle.walls, cell, puzzle.robots[robot]);
  const discovered = [...new Set([...state.discovered, ...beams.flat()])];
  const cleared = [...new Set([...state.cleared, ...beams.flat().filter(c => puzzle.rats.includes(c))])];
  const positions = { ...state.positions, [robot]: cell };
  const status = cleared.length === puzzle.rats.length ? 'won' : puzzle.robots.every((_, robot) => positions[robot] !== undefined) ? 'lost' : 'playing';
  return { discovered, cleared, positions, status, loss: status === 'lost' ? 'robots' : undefined, beams };
}
export function validatePuzzle(puzzle: Puzzle): string | null {
  if (!Number.isInteger(puzzle.size) || puzzle.size < 4 || puzzle.size > 9) return 'El tablero debe tener entre 4 y 9 casillas por lado.';
  if (!puzzle.robots.length || puzzle.robots.length > 12 || puzzle.robots.some(kind => !robotKinds.includes(kind))) return 'Elige entre 1 y 12 robots de filas, columnas o diagonales.';
  const occupied = [...puzzle.rats, ...puzzle.walls, puzzle.start];
  if (!puzzle.rats.length || puzzle.rats.length > 24 || occupied.some(c => !inside(puzzle.size, c)) || new Set(occupied).size !== occupied.length) return 'Las ratas, paredes y salida deben ocupar casillas distintas; admite de 1 a 24 ratas.';
  return null;
}
