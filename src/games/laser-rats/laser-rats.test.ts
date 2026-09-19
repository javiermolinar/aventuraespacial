import { describe, expect, it } from 'vitest';
import { adjacentRats, cellIndex, cells, initialState, laserPaths, observe, placeRobot, scan, validatePuzzle, type Puzzle } from './rules';
import { lessons } from './puzzles';
import { certify, deduce, knownShots, planLasers, type Certificate } from './solver';
import { defaultOptions, generatePuzzle, validateOptions } from './generator';

const at = (puzzle: Puzzle, cell: string) => cellIndex(cell, puzzle.size);

const opened = (puzzle: Puzzle) => scan(puzzle, initialState(puzzle), puzzle.start);
function replay(puzzle: Puzzle, certificate: Certificate) {
  let state = opened(puzzle);
  for (const step of certificate.steps) {
    const observation = observe(puzzle, state), deduction = deduce(observation);
    if (step.type === 'scan') {
      expect(deduction.safe).toContain(step.cell);
      state = scan(puzzle, state, step.cell);
      expect(state.status).toBe('playing');
    } else {
      expect(state.discovered).toContain(step.cell);
      expect(step.guaranteedHits).toBeGreaterThan(0);
      expect(knownShots(observation, puzzle.robots, state.positions)).toEqual(expect.arrayContaining([expect.objectContaining({ cell: step.cell, robot: step.robot })]));
      for (const target of step.targets) expect(deduction.rats).toContain(target);
      const before = { ...state.positions };
      const previousHits = state.cleared.length;
      state = placeRobot(puzzle, state, step.robot, step.cell);
      expect(state.cleared.length - previousHits).toBeGreaterThanOrEqual(step.guaranteedHits);
      expect(state.positions).toMatchObject(before);
      expect(Object.keys(state.positions)).toHaveLength(Object.keys(before).length + 1);
      expect(state.cleared).toEqual(expect.arrayContaining(step.targets));
    }
  }
  return state;
}

describe('game rules', () => {
  it('starts hidden and opens the designated safe cell without moving any rats', () => {
    const puzzle = lessons[2], before = structuredClone(puzzle);
    expect(initialState(puzzle).discovered).toEqual([]);
    expect(observe(puzzle, initialState(puzzle)).clues).toEqual([]);
    expect(placeRobot(puzzle, initialState(puzzle), puzzle.robots.indexOf('column'), puzzle.start).positions).toEqual({});
    const state = opened(puzzle);
    expect(state.status).toBe('playing');
    expect(state.discovered).toContain(puzzle.start);
    expect(scan(puzzle, state, puzzle.rats[0]).status).toBe('lost');
    expect(puzzle).toEqual(before);
  });
  it('hides rats, reveals nearby walls, and exposes only adjacent counts', () => {
    const puzzle = lessons[2], state = opened(puzzle);
    expect(state.discovered).toEqual(expect.arrayContaining([at(puzzle, 'D4'), at(puzzle, 'E4')]));
    expect(observe(puzzle, state).clues).toEqual(expect.arrayContaining([{ cell: puzzle.start, adjacent: 0 }]));
    expect(state.discovered.some(c => puzzle.rats.includes(c))).toBe(false);
  });
  it('has unlimited safe scans, but hitting a rat loses and freezes the round', () => {
    const puzzle = lessons[2]; let state = opened(puzzle);
    for (const cell of cells(puzzle.size).filter(c => !puzzle.rats.includes(c))) state = scan(puzzle, state, cell);
    expect(state.positions).toEqual({});
    state = scan(puzzle, state, puzzle.rats[0]);
    expect(state).toMatchObject({ status: 'lost', loss: 'rat' });
    expect(scan(puzzle, state, puzzle.start)).toBe(state);
    expect(placeRobot(puzzle, state, puzzle.robots.indexOf('column'), puzzle.start)).toBe(state);
  });
  it('requires discovered empty cells and permanently fixes each robot after placement', () => {
    const puzzle = lessons[2], state = opened(puzzle);
    expect(placeRobot(puzzle, state, puzzle.robots.indexOf('row'), at(puzzle, 'A1'))).toBe(state);
    expect(placeRobot(puzzle, state, puzzle.robots.indexOf('row'), at(puzzle, 'E4'))).toBe(state);
    const placed = placeRobot(puzzle, state, puzzle.robots.indexOf('column'), puzzle.start);
    expect(placed.positions).toEqual({ 1: puzzle.start });
    expect(placed.cleared).toHaveLength(3);
    expect(placeRobot(puzzle, placed, puzzle.robots.indexOf('row'), puzzle.start)).toBe(placed);
    expect(placeRobot(puzzle, placed, puzzle.robots.indexOf('column'), at(puzzle, 'D1'))).toBe(placed);
    expect(placed.positions[1]).toBe(puzzle.start);
  });
  it('clears multiple rats, passes friendly robots, and reveals the stopping wall only', () => {
    const puzzle = lessons[2]; let state = opened(puzzle);
    state = placeRobot(puzzle, state, puzzle.robots.indexOf('column'), puzzle.start);
    state = scan(puzzle, state, at(puzzle, 'C4'));
    state = placeRobot(puzzle, state, puzzle.robots.indexOf('row'), at(puzzle, 'C4'));
    expect(state.cleared).toEqual(expect.arrayContaining([at(puzzle, 'A4'), at(puzzle, 'B4')]));
    expect(state.beams.flat()).toContain(at(puzzle, 'D4'));
    expect(state.beams.flat()).toContain(at(puzzle, 'E4'));
    expect(state.discovered).not.toContain(at(puzzle, 'F4'));
  });
  it('wins with the last robot or loses when every robot has been placed', () => {
    const puzzle: Puzzle = { ...lessons[0], start: at(lessons[0], 'C3'), robots: ['column'], rats: [at(lessons[0], 'C1')] };
    expect(placeRobot(puzzle, opened(puzzle), puzzle.robots.indexOf('column'), puzzle.start).status).toBe('won');
    const wrongRobot: Puzzle = { ...puzzle, robots: ['row'] };
    expect(placeRobot(wrongRobot, opened(wrongRobot), 0, puzzle.start)).toMatchObject({ status: 'lost', loss: 'robots' });
  });
  it('opens zero regions without expanding through walls or exposing live rats', () => {
    const puzzle: Puzzle = { ...lessons[0], size: 4, start: 0, rats: [15], walls: [4, 5, 6, 7] };
    const state = opened(puzzle);
    expect([...state.discovered].sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
    expect(scan(puzzle, state, 4).discovered).toEqual(state.discovered);
    expect(state.discovered).not.toContain(15);
  });
  it('updates nearby counts after a kill and expands old cells that now have zero neighbors', () => {
    const puzzle: Puzzle = { ...lessons[0], size: 4, start: 0, rats: [1, 10], walls: [] };
    const before = opened(puzzle);
    expect(before.discovered).toEqual([0]);
    expect(adjacentRats(puzzle, before, 0)).toBe(1);
    const after = placeRobot(puzzle, before, 0, 0);
    expect(after.cleared).toEqual([1]);
    expect(adjacentRats(puzzle, after, 0)).toBe(0);
    expect(after.discovered).toContain(4);
    expect(after.discovered).not.toContain(10);
    expect(observe(puzzle, after).clues).toEqual(expect.arrayContaining([expect.objectContaining({ cell: 1, adjacent: 0 })]));
    expect(after.status).toBe('playing');
  });
});

describe('deductions and certificates', () => {
  it.each(lessons)('certifies $name and replays every discovery and robot action', puzzle => {
    expect(validatePuzzle(puzzle)).toBeNull();
    const result = certify(puzzle);
    expect(result.status, JSON.stringify(result)).toBe('solved');
    if (result.status !== 'solved') return;
    const state = replay(puzzle, result.certificate);
    expect(state.status).toBe('won');
    expect(result.certificate.shots.length).toBeLessThanOrEqual(puzzle.robots.length);
  });
  it('leaves indistinguishable cells unknown instead of consulting the answer', () => {
    // Distant rats cannot change an adjacent clue.
    const a: Puzzle = { ...lessons[0], size: 7, rats: [0, 47], start: 48 }, b = { ...a, rats: [8, 47] };
    const observation = observe(a, opened(a));
    expect(observe(b, opened(b))).toEqual(observation);
    const result = deduce(observation);
    expect(result.safe).not.toContain(0);
    expect(result.safe).not.toContain(8);
    expect(result.rats).not.toContain(0);
    expect(result.rats).not.toContain(8);
  });
  it('bounds search and reports the limit separately from failing to find a plan', () => {
    expect(planLasers({ size: 5, rats: [0, 4], walls: [] }, ['row'], 0).status).toBe('search-limit');
    expect(planLasers({ size: 5, rats: [0, 24], walls: [] }, ['row']).status).toBe('no-plan');
  });
  it('rejects a board when the permitted deductions stall instead of clicking an unknown cell', () => {
    const puzzle = { ...lessons[2], start: 0 };
    expect(certify(puzzle).status).toBe('no-plan');
  });
  it('certifies every robot at most once', () => {
    const crossings = certify(lessons[1]), walls = certify(lessons[2]);
    expect(crossings.status).toBe('solved'); expect(walls.status).toBe('solved');
    if (walls.status === 'solved') expect(new Set(walls.certificate.shots.map(shot => shot.robot)).size).toBe(walls.certificate.shots.length);
  });
  it('uses a guaranteed-hit shot when adjacent clues cannot locate individual rats', () => {
    const puzzle = lessons.find(p => p.id === 'open-a-path')!;
    const result = certify(puzzle);
    expect(result.status).toBe('solved');
    if (result.status !== 'solved') throw new Error(result.status);
    let state = opened(puzzle);
    const firstShot = result.certificate.steps.findIndex(step => step.type === 'shot');
    for (const step of result.certificate.steps.slice(0, firstShot)) state = scan(puzzle, state, step.cell);
    const deduction = deduce(observe(puzzle, state));
    expect(deduction.safe.filter(c => !state.discovered.includes(c))).toEqual([]);
    expect(deduction.rats).toEqual([]);
    expect(knownShots(observe(puzzle, state), puzzle.robots, {})).toEqual([
      { robot: 0, kind: 'row', cell: puzzle.start, targets: [], guaranteedHits: 1 },
    ]);
    expect(result.certificate.steps.slice(firstShot + 1).some(step => step.type === 'scan')).toBe(true);
    expect(replay(puzzle, result.certificate).status).toBe('won');
    expect(certify(puzzle, 0).status).toBe('search-limit');
  });
  it('does not count a target behind an unknown cell as a guaranteed laser hit', () => {
    const puzzle: Puzzle = { ...lessons[0], size: 7, start: 21, rats: [15, 29, 27], walls: [24] };
    const observation = observe(puzzle, { ...initialState(puzzle), discovered: ['A4', 'F2', 'G2', 'F3', 'G3', 'F4', 'F5', 'G5'].map(c => at(puzzle, c)) });
    expect(deduce(observation).rats).toContain(at(puzzle, 'G4'));
    expect(observation.walls).toEqual([]);
    expect(knownShots(observation, ['row'], {}).filter(shot => shot.cell === puzzle.start)).toEqual([]);
  });
  it('deductions and guaranteed hits agree with ALL layouts consistent with adjacent clues', () => {
    // Independent exhaustive oracle: local geometry, no directional clues.
    const size = 4, board = cells(size), layouts: number[][] = [];
    for (const a of board) for (const b of board) if (a < b) layouts.push([a, b]);
    for (const rats of layouts.filter(rats => !rats.includes(5))) {
      const safe = [5, 0, 15].filter(c => !rats.includes(c));
      const adjacent = (candidate: number[], cell: number) => candidate.filter(c => Math.max(Math.abs(c % size - cell % size), Math.abs(Math.floor(c / size) - Math.floor(cell / size))) === 1).length;
      const clues = safe.map(cell => ({ cell, adjacent: adjacent(rats, cell) }));
      const possible = layouts.filter(candidate => !safe.some(c => candidate.includes(c)) && clues.every(clue => adjacent(candidate, clue.cell) === clue.adjacent));
      const result = deduce({ size, safe, clues, walls: [], remaining: 2 });
      expect(result.valid).toBe(true);
      expect(possible.length).toBeGreaterThan(0);
      for (const cell of result.safe) expect(possible.every(candidate => !candidate.includes(cell))).toBe(true);
      for (const cell of result.rats) expect(possible.every(candidate => candidate.includes(cell))).toBe(true);
      for (const shot of knownShots({ size, safe, clues, walls: [], remaining: 2 }, ['row', 'column', 'diagonal'], {})) {
        for (const candidate of possible) {
          // Fill every cell that could still hide a wall with one. This is the
          // worst possible occlusion consistent with these public observations.
          const walls = board.filter(c => !candidate.includes(c) && !safe.some(s => Math.max(Math.abs(c % size - s % size), Math.abs(Math.floor(c / size) - Math.floor(s / size))) <= 1));
          const vectors = shot.kind === 'row' ? [[-1, 0], [1, 0]] : shot.kind === 'column' ? [[0, -1], [0, 1]] : [[-1, -1], [1, -1], [-1, 1], [1, 1]];
          let hits = 0;
          for (const [dx, dy] of vectors) {
            let x = shot.cell % size + dx, y = Math.floor(shot.cell / size) + dy;
            while (x >= 0 && x < size && y >= 0 && y < size) {
              if (walls.includes(y * size + x)) break;
              if (candidate.includes(y * size + x)) hits++;
              x += dx; y += dy;
            }
          }
          expect(hits).toBeGreaterThanOrEqual(shot.guaranteedHits);
        }
      }
    }
  });
});

describe('generation', () => {
  it('rejects impossible parameters and bounds attempts without substituting a different board', () => {
    expect(validateOptions({ ...defaultOptions, size: 4, rats: 15, walls: 1 })).not.toBeNull();
    expect(validateOptions({ ...defaultOptions, robots: [] })).not.toBeNull();
    expect(generatePuzzle(defaultOptions, 0)).toMatchObject({ status: 'not-found', attempts: 0 });
    expect(generatePuzzle({ ...defaultOptions, rats: 0 })).toMatchObject({ status: 'invalid', attempts: 0 });
  });
  it('produces reproducible, certified boards with exactly the requested parameters', () => {
    const first = generatePuzzle(defaultOptions);
    expect(first.status, JSON.stringify(first)).toBe('generated');
    expect(generatePuzzle(defaultOptions)).toEqual(first);
    if (first.status !== 'generated') return;
    expect(first.puzzle).toMatchObject({ size: 7, robots: defaultOptions.robots });
    expect(first.puzzle.rats).toHaveLength(10);
    expect(first.puzzle.walls).toHaveLength(3);
    expect(certify(first.puzzle).status).toBe('solved');
  });
  it('generates distinct certified boards across seeds, board sizes and robot inventories', () => {
    const ids = new Set<string>();
    for (let seed = 0; seed < 12; seed++) {
      const options = seed < 6 ? { ...defaultOptions, seed: `test-${seed}` } : { ...defaultOptions, size: 5, rats: 4, walls: 1, robots: ['row' as const, 'column' as const], seed: `test-${seed}` };
      const result = generatePuzzle(options);
      expect(result.status).toBe('generated');
      if (result.status !== 'generated') continue;
      ids.add(`${result.puzzle.size}:${[...result.puzzle.rats].sort().join(',')}`);
      expect(result.puzzle.robots).toEqual(options.robots);
      expect(result.puzzle.walls).toHaveLength(options.walls);
      const state = replay(result.puzzle, result.certificate);
      expect(state.status).toBe('won');
    }
    expect(ids.size).toBe(12);
  });
});

it('keeps identical robots independent and requires three row pieces for three occupied rows', () => {
  const puzzle = lessons[3];
  let state = opened(puzzle);
  state = scan(puzzle, state, at(puzzle, 'C1'));
  state = scan(puzzle, state, at(puzzle, 'C5'));
  state = placeRobot(puzzle, state, 2, at(puzzle, 'C3'));
  expect(state.positions).toEqual({ 2: at(puzzle, 'C3') });
  expect(placeRobot(puzzle, state, 2, at(puzzle, 'C1'))).toBe(state);
  state = placeRobot(puzzle, state, 0, at(puzzle, 'C1'));
  expect(state.status).toBe('playing');
  state = placeRobot(puzzle, state, 1, at(puzzle, 'C5'));
  expect(state.status).toBe('won');
  expect(Object.keys(state.positions)).toHaveLength(3);
  expect(planLasers(puzzle, ['row', 'row']).status).toBe('no-plan');
  expect(planLasers(puzzle, ['row', 'row', 'row']).status).toBe('solved');
});

it('generates an exact duplicate-type inventory and replays distinct piece IDs', () => {
  for (const robots of [['row', 'row', 'row'], ['row', 'row', 'column', 'column', 'diagonal']] as const) {
    const result = generatePuzzle({ ...defaultOptions, robots: [...robots], seed: robots.join('-') });
    expect(result.status).toBe('generated');
    if (result.status !== 'generated') continue;
    expect(result.puzzle.robots).toEqual(robots);
    expect(new Set(result.certificate.shots.map(shot => shot.robot)).size).toBe(result.certificate.shots.length);
    const state = replay(result.puzzle, result.certificate);
    expect(state.status).toBe('won');
  }
});


describe('the three lessons before the final patrol', () => {
  const bridgeLessons = ['follow-the-clues', 'recovered-ground', 'plan-two-shots'].map(id => lessons.find(p => p.id === id)!);

  it.each(bridgeLessons)('$name starts with one useful shot and resumes deduction without revealing most of the board', puzzle => {
    const before = opened(puzzle), observation = observe(puzzle, before);
    expect(deduce(observation).safe.filter(cell => !before.discovered.includes(cell))).toEqual([]);
    expect(knownShots(observation, puzzle.robots, {})).toEqual([
      expect.objectContaining({ kind: 'row', cell: puzzle.start }),
    ]);
    const after = placeRobot(puzzle, before, 0, puzzle.start);
    expect(after.status).toBe('playing');
    expect(after.discovered.length - before.discovered.length).toBeLessThanOrEqual(puzzle.size ** 2 * .4);
    expect(deduce(observe(puzzle, after)).safe.some(cell => !after.discovered.includes(cell))).toBe(true);
    for (const robot of puzzle.robots.keys()) {
      expect(planLasers(puzzle, puzzle.robots.filter((_, i) => i !== robot)).status).toBe('no-plan');
    }
  });

  it('requires a cleared rat cell to win Terreno recuperado, even with the entire map known', () => {
    const puzzle = bridgeLessons[1];
    // Exhaust every union of firing coverage from originally empty cells.
    // Even allowing overlapping origins cannot cover all rats without reuse.
    let coverage = new Set([0]);
    for (const kind of puzzle.robots) {
      const masks = cells(puzzle.size).filter(cell => !puzzle.rats.includes(cell) && !puzzle.walls.includes(cell)).map(cell => {
        const path = laserPaths(puzzle.size, puzzle.walls, cell, kind).flat();
        return puzzle.rats.reduce((mask, rat, i) => path.includes(rat) ? mask | (1 << i) : mask, 0);
      });
      coverage = new Set([...coverage].flatMap(mask => masks.map(shot => mask | shot)));
    }
    expect(coverage.has((1 << puzzle.rats.length) - 1)).toBe(false);
    const result = certify(puzzle);
    if (result.status !== 'solved') throw new Error(result.status);
    expect(result.certificate.shots).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: 'column', cell: at(puzzle, 'C4') }),
    ]));
    expect(puzzle.rats).toContain(at(puzzle, 'C4'));
    expect(replay(puzzle, result.certificate).status).toBe('won');
  });

  it('makes the final pair a visible planning choice in Piensa dos jugadas', () => {
    const puzzle = bridgeLessons[2], result = certify(puzzle);
    if (result.status !== 'solved') throw new Error(result.status);
    let state = opened(puzzle), shots = 0;
    for (const step of result.certificate.steps) {
      if (step.type === 'scan') state = scan(puzzle, state, step.cell);
      else if (shots++ === 0) state = placeRobot(puzzle, state, step.robot, step.cell);
      else break;
    }
    const observation = observe(puzzle, state);
    expect(observation.remaining).toBe(5);
    expect(deduce(observation).rats).toHaveLength(observation.remaining);
    // Both diagonals hit three known rats. Only B1 leaves the other two in
    // the same unobstructed column for the last piece.
    for (const [origin, expected] of [['B1', 'solved'], ['C4', 'no-plan']] as const) {
      const after = placeRobot(puzzle, state, 2, at(puzzle, origin));
      expect(after.cleared.length - state.cleared.length).toBe(3);
      const remaining = { ...puzzle, rats: puzzle.rats.filter(rat => !after.cleared.includes(rat)) };
      expect(planLasers(remaining, puzzle.robots, 25000, puzzle.robots.map((_, i) => after.positions[i] ?? -1)).status).toBe(expected);
    }
  });
});

describe('La última patrulla', () => {
  it('requires all four pieces and certifies a route from F1', () => {
    const puzzle = lessons.find(p => p.id === 'last-patrol')!;
    const result = certify(puzzle);
    expect(result.status).toBe('solved');
    if (result.status !== 'solved') throw new Error(result.status);
    expect(result.certificate.shots).toHaveLength(4);
    for (const removed of [0, 2, 3]) {
      expect(planLasers(puzzle, puzzle.robots.filter((_, i) => i !== removed)).status).toBe('no-plan');
    }
    const state = replay(puzzle, result.certificate);
    expect(state.status).toBe('won');
    expect(Object.keys(state.positions)).toHaveLength(4);
  });

  it('makes the four-rat diagonal shot at F3 a losing commitment', () => {
    const puzzle = lessons.find(p => p.id === 'last-patrol')!;
    let state = opened(puzzle);
    // Give the player the full safe map: the trap is strategic, not hidden information.
    for (const cell of cells(puzzle.size).filter(c => !puzzle.rats.includes(c))) state = scan(puzzle, state, cell);
    state = placeRobot(puzzle, state, 3, at(puzzle, 'F3'));
    expect(state.cleared).toHaveLength(4);
    expect(state.status).toBe('playing');
    const remaining = { ...puzzle, rats: puzzle.rats.filter(c => !state.cleared.includes(c)) };
    // Even a relaxed planner allowing reuse of the occupied origin cannot finish.
    expect(planLasers(remaining, ['row', 'row', 'column']).status).toBe('no-plan');
  });
});
