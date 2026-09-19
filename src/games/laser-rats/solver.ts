import { cells, cellName, firingDirections, initialState, laserPaths, neighbors, observe, placeRobot, ray, scan, validatePuzzle, type GameState, type Observation, type Puzzle, type RobotKind } from './rules';

export interface Proof { cells: number[]; value: 0 | 1; rule: 'line' | 'difference'; reason: string }
interface Constraint { cells: number[]; count: number; label: string; combined: boolean }
export interface Deductions { safe: number[]; rats: number[]; proofs: Proof[]; valid: boolean }

/** Propagate zero/full neighbor groups and subset subtraction, never an assumed rat.
 * Input is deliberately limited to observations available to the player. */
export function deduce(observation: Observation): Deductions {
  const known = new Map<number, 0 | 1>(observation.safe.map(c => [c, 0]));
  const proofs: Proof[] = [];
  let valid = true;
  let constraints: Constraint[] = [
    { cells: cells(observation.size), count: observation.remaining, label: 'el contador de ratas', combined: false },
    ...observation.clues.map(({ cell, adjacent }) => ({ cells: neighbors(observation.size, cell).sort((a, b) => a - b), count: adjacent,
      label: `las vecinas de ${cellName(cell, observation.size)}`, combined: false })),
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
export function planLasers(map: KnownMap, robots: readonly RobotKind[], nodeLimit = 25000, positions = robots.map(() => -1)): PlanResult {
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
  for (let depth = 1; depth <= positions.filter(cell => cell === -1).length; depth++) {
    const shots = search(target, positions, depth);
    if (shots) return { status: 'solved', shots, nodes };
    if (nodes > nodeLimit) return { status: 'search-limit', nodes };
  }
  return { status: 'no-plan', nodes };
}

export interface Certificate {
  opening: number;
  steps: CertificateStep[];
  scans: { cell: number; proof: Proof }[];
  shots: Shot[];
  combinedDeductions: number;
  searchNodes: number;
}
export type GuaranteedShot = Shot & { targets: number[]; guaranteedHits: number };
export type CertificateStep = { type: 'scan'; cell: number; proof: Proof } | ({ type: 'shot' } & GuaranteedShot);
export type Certification = { status: 'solved'; certificate: Certificate } | { status: 'invalid' | 'no-plan' | 'search-limit'; reason: string };

/** A shot may be useful without identifying individual rats. If three of four
 * neighbors contain rats, covering two guarantees at least one hit. Only use
 * publicly known wall-free ray prefixes; unseen walls may stop the rest. */
export function knownShots(observation: Observation, robots: readonly RobotKind[], positions: GameState['positions']): GuaranteedShot[] {
  const deduction = deduce(observation);
  if (!deduction.valid) return [];
  // Discovering a non-wall cell reveals every neighboring wall, so the other
  // neighbors are known wall-free even while their rat contents stay hidden.
  const wallFree = new Set(observation.clues.flatMap(({ cell }) => [cell, ...neighbors(observation.size, cell)]));
  const groups = [
    { cells: cells(observation.size), count: observation.remaining },
    ...observation.clues.map(({ cell, adjacent }) => ({ cells: neighbors(observation.size, cell), count: adjacent })),
  ].map(group => ({ ...group, cells: group.cells.filter(cell => !deduction.safe.includes(cell)) }));
  return robots.flatMap((kind, robot) => {
    if (positions[robot] !== undefined || robots.findIndex((type, i) => type === kind && positions[i] === undefined) !== robot) return [];
    return observation.safe.filter(cell => !observation.walls.includes(cell) && !Object.values(positions).includes(cell)).flatMap(cell => {
      const covered = new Set<number>();
      for (const direction of firingDirections(kind)) {
        for (const c of ray(observation.size, cell, direction)) {
          if (observation.walls.includes(c)) break;
          if (!wallFree.has(c) && !deduction.rats.includes(c)) break;
          covered.add(c);
        }
      }
      const targets = deduction.rats.filter(c => covered.has(c));
      const guaranteedHits = Math.max(targets.length, ...groups.map(group => group.count - group.cells.filter(c => !covered.has(c)).length));
      return guaranteedHits > 0 ? [{ robot, kind, cell, targets, guaranteedHits }] : [];
    });
  }).sort((a, b) => b.guaranteedHits - a.guaranteedHits || a.robot - b.robot || a.cell - b.cell);
}

/** Ordered certificate of proved-safe scans and shots guaranteed to hit rats.
 * Recompute clues after every shot; cleared rat cells can unlock deductions.
 * Search certifies a route, not that every legal use of a finite robot wins. */
export function certify(puzzle: Puzzle, nodeLimit = 25000): Certification {
  const error = validatePuzzle(puzzle);
  if (error) return { status: 'invalid', reason: error };
  let nodes = 0, limit = false;
  const failed = new Set<string>();
  function search(input: GameState): CertificateStep[] | null {
    if (input.status === 'won') return [];
    if (input.status !== 'playing') return null;
    if (++nodes > nodeLimit) { limit = true; return null; }
    let state = input;
    const steps: CertificateStep[] = [];
    let observation = observe(puzzle, state), deduction = deduce(observation);
    while (deduction.valid) {
      const cell = deduction.safe.find(c => !state.discovered.includes(c));
      if (cell === undefined) break;
      const proof = deduction.proofs.find(p => p.value === 0 && p.cells.includes(cell));
      if (!proof) return null;
      steps.push({ type: 'scan', cell, proof });
      state = scan(puzzle, state, cell);
      if (state.status !== 'playing') return null;
      observation = observe(puzzle, state); deduction = deduce(observation);
    }
    if (!deduction.valid) return null;
    const key = `${[...state.discovered].sort((a, b) => a - b)}/${[...state.cleared].sort((a, b) => a - b)}/${puzzle.robots.map((_, i) => state.positions[i] ?? -1)}`;
    if (failed.has(key)) return null;
    // Once the remaining map is inferred, use the cheaper complete-map planner.
    if (deduction.rats.length === observation.remaining) {
      const plan = planLasers({ size: observation.size, walls: observation.walls, rats: deduction.rats }, puzzle.robots,
        Math.max(0, nodeLimit - nodes), puzzle.robots.map((_, i) => state.positions[i] ?? -1));
      nodes += plan.nodes;
      if (plan.status === 'search-limit') limit = true;
      if (plan.status !== 'solved') { failed.add(key); return null; }
      for (const shot of plan.shots) {
        const targets = laserPaths(puzzle.size, observation.walls, shot.cell, shot.kind).flat().filter(c => deduction.rats.includes(c) && !state.cleared.includes(c));
        steps.push({ type: 'shot', ...shot, targets: [...new Set(targets)], guaranteedHits: new Set(targets).size });
        state = placeRobot(puzzle, state, shot.robot, shot.cell);
      }
      return state.status === 'won' ? steps : null;
    }
    for (const shot of knownShots(observation, puzzle.robots, state.positions)) {
      const rest = search(placeRobot(puzzle, state, shot.robot, shot.cell));
      if (rest) return [...steps, { type: 'shot', ...shot }, ...rest];
      if (limit) return null;
    }
    failed.add(key);
    return null;
  }
  const steps = search(scan(puzzle, initialState(puzzle), puzzle.start));
  if (!steps) return { status: limit ? 'search-limit' : 'no-plan', reason: limit ? 'Se alcanzó el límite de búsqueda.' : 'No se encontró una ruta de exploración y disparos justificados.' };
  const scans = steps.filter(step => step.type === 'scan'), shots = steps.filter(step => step.type === 'shot');
  return { status: 'solved', certificate: { opening: puzzle.start, steps, scans, shots,
    combinedDeductions: scans.filter(step => step.proof.rule === 'difference').length, searchNodes: nodes } };
}
