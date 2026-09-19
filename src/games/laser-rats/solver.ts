import { cells, cellName, directions, initialState, laserPaths, observe, placeRobot, ray, scan, validatePuzzle, type Observation, type Puzzle, type RobotKind } from './rules';

export interface Proof { cells: number[]; value: 0 | 1; rule: 'line' | 'difference'; reason: string }
interface Constraint { cells: number[]; count: number; label: string; combined: boolean }
export interface Deductions { safe: number[]; rats: number[]; proofs: Proof[]; valid: boolean }

/** Propagate zero/full lines and subset subtraction, never an assumed rat.
 * Input is deliberately limited to observations available to the player. */
export function deduce(observation: Observation): Deductions {
  const known = new Map<number, 0 | 1>(observation.safe.map(c => [c, 0]));
  const proofs: Proof[] = [];
  let valid = true;
  let constraints: Constraint[] = [
    { cells: cells(observation.size), count: observation.remaining, label: 'el contador de ratas', combined: false },
    ...observation.clues.flatMap(({ cell, counts }) => directions.map((direction, i) => ({
      cells: ray(observation.size, cell, i).sort((a, b) => a - b), count: counts[i],
      label: `el radar de ${cellName(cell, observation.size)} ${direction.name}`, combined: false,
    }))),
  ];
  for (let iteration = 0; iteration < observation.size ** 2 * 3; iteration++) {
    const normalized = new Map<string, Constraint>();
    for (const constraint of constraints) {
      const count = constraint.count - constraint.cells.filter(c => known.get(c) === 1).length;
      const unknown = constraint.cells.filter(c => !known.has(c));
      if (count < 0 || count > unknown.length || !Number.isInteger(count)) { valid = false; break; }
      if (!unknown.length) continue;
      const key = unknown.join(',');
      if (normalized.has(key) && normalized.get(key)!.count !== count) { valid = false; break; }
      if (!normalized.has(key)) normalized.set(key, { ...constraint, cells: unknown, count });
    }
    if (!valid) break;
    constraints = [...normalized.values()];
    let changed = false;
    for (const constraint of constraints) {
      if (constraint.count !== 0 && constraint.count !== constraint.cells.length) continue;
      const value = constraint.count === 0 ? 0 : 1;
      const fresh = constraint.cells.filter(c => !known.has(c));
      if (constraint.cells.some(c => known.has(c) && known.get(c) !== value)) { valid = false; break; }
      if (!fresh.length) continue;
      fresh.forEach(c => known.set(c, value));
      proofs.push({ cells: fresh, value, rule: constraint.combined ? 'difference' : 'line',
        reason: value === 0 ? `Según ${constraint.label}, en estas casillas ya no puede haber ratas.` : `Según ${constraint.label}, todas estas casillas tienen una rata.` });
      changed = true;
    }
    if (!valid) break;
    if (changed) continue;
    const added: Constraint[] = [];
    comparisons: for (const a of constraints) for (const b of constraints) {
      // Keep comparisons to two original clues. Long chains can be formally
      // sound yet unsuitable for the children this first generator targets.
      if (a.combined || b.combined || a.cells.length >= b.cells.length || !a.cells.every(c => b.cells.includes(c))) continue;
      const difference = b.cells.filter(c => !a.cells.includes(c));
      const key = difference.join(',');
      const count = b.count - a.count;
      if (count < 0 || count > difference.length) { valid = false; break comparisons; }
      if (normalized.has(key)) continue;
      const constraint = { cells: difference, count, label: `la comparación entre ${a.label} y ${b.label}`, combined: true };
      normalized.set(key, constraint); added.push(constraint);
      // A bounded, conservative validator: exceeding this stops deductions,
      // rather than declaring an unproved cell safe or blocking the browser.
      if (normalized.size >= 1200) break comparisons;
    }
    if (!valid || !added.length || normalized.size >= 1200) break;
    constraints.push(...added);
  }
  return { safe: [...known].filter(([, v]) => v === 0).map(([c]) => c), rats: [...known].filter(([, v]) => v === 1).map(([c]) => c), proofs, valid };
}

export interface Shot { robot: number; kind: RobotKind; cell: number }
export interface KnownMap { size: number; rats: number[]; walls: number[] }
export type PlanResult = { status: 'solved'; shots: Shot[]; nodes: number } | { status: 'no-plan' | 'search-limit'; nodes: number };
const popcount = (mask: number) => { let count = 0; for (; mask; mask &= mask - 1) count++; return count; };

/** Bounded backtracking over legal shots on an already deduced map. Each robot
 * is placed once and stays fixed. Later robots may use cleared rat cells. */
export function planLasers(map: KnownMap, robots: readonly RobotKind[], nodeLimit = 25000): PlanResult {
  const target = (1 << map.rats.length) - 1;
  const candidates = robots.flatMap((kind, robot) => cells(map.size).filter(c => !map.walls.includes(c)).map(cell => {
    const path = laserPaths(map.size, map.walls, cell, kind).flat().filter(c => c !== cell);
    return { kind, robot, cell, mask: map.rats.reduce((mask, rat, i) => path.includes(rat) ? mask | (1 << i) : mask, 0),
      origin: map.rats.includes(cell) ? 1 << map.rats.indexOf(cell) : 0 };
  })).filter(shot => shot.mask);
  let nodes = 0;
  const failed = new Set<string>();
  function search(mask: number, positions: number[], left: number): Shot[] | null {
    if (!mask) return [];
    if (++nodes > nodeLimit || !left) return null;
    const key = `${mask}/${positions.join(',')}/${left}`;
    if (failed.has(key)) return null;
    const available = candidates.filter(shot => positions[shot.robot] === -1 && robots.findIndex((kind, i) => kind === shot.kind && positions[i] === -1) === shot.robot && !(shot.origin & mask) && !positions.includes(shot.cell) && (shot.mask & mask))
      .map(shot => ({ ...shot, gain: popcount(shot.mask & mask) })).sort((a, b) => b.gain - a.gain);
    const possibleGain = Math.max(0, ...candidates.map(shot => popcount(shot.mask & mask)));
    if (!available.length || possibleGain * left < popcount(mask)) return null;
    for (const shot of available) {
      const nextPositions = [...positions]; nextPositions[shot.robot] = shot.cell;
      const rest = search(mask & ~shot.mask, nextPositions, left - 1);
      if (rest) return [{ robot: shot.robot, kind: shot.kind, cell: shot.cell }, ...rest];
      if (nodes > nodeLimit) return null;
    }
    failed.add(key);
    return null;
  }
  for (let depth = 1; depth <= robots.length; depth++) {
    const shots = search(target, robots.map(() => -1), depth);
    if (shots) return { status: 'solved', shots, nodes };
    if (nodes > nodeLimit) return { status: 'search-limit', nodes };
  }
  return { status: 'no-plan', nodes };
}

export interface Certificate {
  opening: number;
  scans: { cell: number; proof: Proof }[];
  shots: Shot[];
  combinedDeductions: number;
  searchNodes: number;
}
export type Certification = { status: 'solved'; certificate: Certificate } | { status: 'invalid' | 'needs-deduction' | 'no-plan' | 'search-limit'; reason: string };

/** Conservative two-phase certificate. Every non-rat cell is discovered
 * using elementary deductions before the planner receives the inferred map.
 * Some fair puzzles requiring interleaved shots are intentionally rejected. */
export function certify(puzzle: Puzzle, nodeLimit?: number): Certification {
  const error = validatePuzzle(puzzle);
  if (error) return { status: 'invalid', reason: error };
  let state = scan(puzzle, initialState(puzzle), puzzle.start);
  const scans: Certificate['scans'] = [];
  let final: Deductions | undefined;
  for (let round = 0; round <= puzzle.size ** 2; round++) {
    const observation = observe(puzzle, state);
    const deduction = deduce(observation);
    if (!deduction.valid) return { status: 'invalid', reason: 'Las pistas se contradicen.' };
    const next = deduction.safe.filter(c => !state.discovered.includes(c));
    if (!next.length) { final = deduction; break; }
    for (const cell of next) {
      if (state.discovered.includes(cell)) continue;
      const proof = deduction.proofs.find(proof => proof.value === 0 && proof.cells.includes(cell));
      if (!proof) return { status: 'invalid', reason: 'Falta una justificación para una casilla.' };
      scans.push({ cell, proof }); state = scan(puzzle, state, cell);
      if (state.status !== 'playing') return { status: 'invalid', reason: 'Una deducción ha fallado.' };
    }
  }
  if (!final || final.rats.length !== puzzle.rats.length) return { status: 'needs-deduction', reason: 'Las deducciones permitidas no bastan para localizar todas las ratas.' };
  const observation = observe(puzzle, state);
  const plan = planLasers({ size: observation.size, walls: observation.walls, rats: final.rats }, puzzle.robots, nodeLimit);
  if (plan.status !== 'solved') return { status: plan.status, reason: plan.status === 'search-limit' ? 'Se alcanzó el límite de búsqueda.' : 'No se encontró un plan con los robots disponibles.' };
  for (const shot of plan.shots) state = placeRobot(puzzle, state, shot.robot, shot.cell);
  if (state.status !== 'won') return { status: 'invalid', reason: 'El plan no supera la comprobación de las reglas.' };
  return { status: 'solved', certificate: { opening: puzzle.start, scans, shots: plan.shots, combinedDeductions: scans.filter(scan => scan.proof.rule === 'difference').length, searchNodes: plan.nodes } };
}
