import { cells, laserPaths, robotKinds, type Puzzle, type RobotKind } from './rules';
import { certify, type Certificate } from './solver';

export interface GeneratorOptions { size: number; rats: number; walls: number; robots: RobotKind[]; seed: string }
export const defaultOptions: GeneratorOptions = { size: 7, rats: 10, walls: 3, robots: [...robotKinds], seed: 'primera-mision' };
export type GenerationResult = { status: 'generated'; puzzle: Puzzle; certificate: Certificate; attempts: number } | { status: 'not-found' | 'invalid'; reason: string; attempts: number };

export function validateOptions(options: GeneratorOptions): string | null {
  if (!Number.isInteger(options.size) || options.size < 4 || options.size > 9) return 'Elige un tamaño entre 4 y 9.';
  if (!Number.isInteger(options.rats) || options.rats < 1 || options.rats > 24) return 'Elige entre 1 y 24 ratas.';
  if (!Number.isInteger(options.walls) || options.walls < 0 || options.walls + options.rats >= options.size ** 2) return 'Deja al menos una casilla libre para empezar.';
  if (!options.robots.length || options.robots.length > 12 || options.robots.some(kind => !robotKinds.includes(kind))) return 'Elige entre 1 y 12 robots de filas, columnas o diagonales.';
  if (!options.seed.trim() || options.seed.length > 80) return 'Escribe una semilla de 1 a 80 caracteres.';
  return null;
}

function seededRandom(seed: string) {
  let state = 2166136261;
  for (const char of seed) { state ^= char.charCodeAt(0); state = Math.imul(state, 16777619); }
  return () => {
    state += 0x6D2B79F5;
    let value = state;
    value = Math.imul(value ^ value >>> 15, value | 1);
    value ^= value + Math.imul(value ^ value >>> 7, value | 61);
    return ((value ^ value >>> 14) >>> 0) / 4294967296;
  };
}

/** Sample targets within one fixed firing position per robot, then require a
 * no-guess certificate. Requested counts never change on failure. */
export function generatePuzzle(options: GeneratorOptions, maxAttempts = 120): GenerationResult {
  const invalid = validateOptions(options);
  if (invalid) return { status: 'invalid', reason: invalid, attempts: 0 };
  const random = seededRandom(options.seed);
  function shuffle(values: number[]) {
    for (let i = values.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [values[i], values[j]] = [values[j], values[i]];
    }
    return values;
  }
  const attempts = Math.max(0, Math.min(500, Math.floor(maxAttempts)));
  for (let attempt = 1; attempt <= attempts; attempt++) {
    const shuffled = shuffle(cells(options.size));
    const walls = shuffled.slice(0, options.walls);
    const origins = shuffled.slice(options.walls, options.walls + options.robots.length);
    const reachable = [...new Set(options.robots.flatMap((kind, i) => origins[i] === undefined ? [] : laserPaths(options.size, walls, origins[i], kind).flat()))]
      .filter(cell => !walls.includes(cell) && !origins.includes(cell));
    if (reachable.length < options.rats) continue;
    const rats = shuffle(reachable).slice(0, options.rats);
    const start = shuffled.find(cell => !walls.includes(cell) && !rats.includes(cell))!;
    const puzzle: Puzzle = {
      id: `generated:${options.seed}:${attempt}`, name: 'Misión sorpresa', size: options.size,
      rats, walls, start, robots: [...options.robots],
    };
    const result = certify(puzzle, 18000);
    if (result.status === 'solved') return { status: 'generated', puzzle, certificate: result.certificate, attempts: attempt };
  }
  return { status: 'not-found', attempts, reason: 'No se ha encontrado un tablero con estos límites. Prueba menos ratas, menos paredes o una semilla distinta.' };
}
