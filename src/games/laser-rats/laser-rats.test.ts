import { describe, expect, it } from 'vitest';
import { cellIndex, cells, directions, explore, initialState, observe, placeRobot, radar, scan, validatePuzzle, type Puzzle } from './rules';
import { lessons } from './puzzles';
import { certify, deduce, planLasers } from './solver';
import { defaultOptions, generatePuzzle, validateOptions } from './generator';

const at = (puzzle: Puzzle, cell: string) => cellIndex(cell, puzzle.size);

const opened = (puzzle: Puzzle) => scan(puzzle, initialState(puzzle), puzzle.start);

describe('game rules', () => {
  it('starts entirely hidden and protects exactly the first exploration without changing counts', () => {
    const puzzle = lessons[2], before = structuredClone(puzzle);
    expect(initialState(puzzle).discovered).toEqual([]);
    expect(observe(puzzle, initialState(puzzle)).clues).toEqual([]);
    expect(placeRobot(puzzle, initialState(puzzle), puzzle.robots.indexOf('column'), puzzle.start).positions).toEqual({});
    for (const cell of cells(puzzle.size)) {
      const first = explore(puzzle, initialState(puzzle), cell);
      expect(first.state.status).toBe('playing');
      expect(first.state.discovered).toContain(cell);
      expect(first.puzzle.rats).not.toContain(cell);
      expect(first.puzzle.rats).toHaveLength(puzzle.rats.length);
      expect(new Set(first.puzzle.rats).size).toBe(puzzle.rats.length);
      expect(first.puzzle.walls).toEqual(puzzle.walls);
      expect(explore(first.puzzle, first.state, first.puzzle.rats[0]).state.status).toBe('lost');
    }
    expect(puzzle).toEqual(before);
  });
  it('hides rats, reveals nearby walls, and counts through walls', () => {
    const puzzle = lessons[2], state = opened(puzzle);
    expect(state.discovered).toEqual([at(puzzle, 'D4'), at(puzzle, 'E4')]);
    expect(radar(puzzle, state, puzzle.start)[4]).toBe(1);
    expect(observe(puzzle, state).clues).toHaveLength(1);
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
    expect(placeRobot(puzzle, state, puzzle.robots.indexOf('row'), at(puzzle, 'C4'))).toBe(state);
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
    expect(radar(puzzle, state, puzzle.start)[3]).toBe(0);
  });
  it('wins with the last robot or loses when every robot has been placed', () => {
    const puzzle: Puzzle = { ...lessons[0], robots: ['column'], rats: [at(lessons[0], 'C1')] };
    expect(placeRobot(puzzle, opened(puzzle), puzzle.robots.indexOf('column'), puzzle.start).status).toBe('won');
    const wrongRobot: Puzzle = { ...puzzle, robots: ['row'] };
    expect(placeRobot(wrongRobot, opened(wrongRobot), 0, puzzle.start)).toMatchObject({ status: 'lost', loss: 'robots' });
  });
});

describe('deductions and certificates', () => {
  it.each(lessons)('certifies $name and replays every discovery and robot action', puzzle => {
    expect(validatePuzzle(puzzle)).toBeNull();
    const result = certify(puzzle);
    expect(result.status, JSON.stringify(result)).toBe('solved');
    if (result.status !== 'solved') return;
    let state = opened(puzzle);
    for (const discovery of result.certificate.scans) {
      const deduction = deduce(observe(puzzle, state));
      expect(deduction.safe).toContain(discovery.cell);
      expect(puzzle.rats).not.toContain(discovery.cell);
      state = scan(puzzle, state, discovery.cell);
    }
    for (const shot of result.certificate.shots) {
      expect(state.discovered).toContain(shot.cell);
      const before = { ...state.positions };
      state = placeRobot(puzzle, state, shot.robot, shot.cell);
      expect(state.positions).toMatchObject(before);
      expect(Object.keys(state.positions)).toHaveLength(Object.keys(before).length + 1);
    }
    expect(state.status).toBe('won');
    expect(result.certificate.shots.length).toBeLessThanOrEqual(puzzle.robots.length);
  });
  it('leaves indistinguishable cells unknown instead of consulting the answer', () => {
    // Two possible positions in one ray; the public observation is identical.
    const a: Puzzle = { ...lessons[0], rats: [0], start: 2 }, b = { ...a, rats: [1] };
    const observation = observe(a, opened(a));
    expect(observe(b, opened(b))).toEqual(observation);
    const result = deduce(observation);
    expect(result.safe).not.toContain(0);
    expect(result.safe).not.toContain(1);
    expect(result.rats).toEqual([]);
  });
  it('bounds search and reports the limit separately from failing to find a plan', () => {
    expect(planLasers({ size: 5, rats: [0, 4], walls: [] }, ['row'], 0).status).toBe('search-limit');
    expect(planLasers({ size: 5, rats: [0, 24], walls: [] }, ['row']).status).toBe('no-plan');
  });
  it('rejects a board when the permitted deductions stall instead of clicking an unknown cell', () => {
    const puzzle = { ...lessons[0], size: 4, rats: [1, 4, 5], start: 0 };
    expect(certify(puzzle).status).toBe('needs-deduction');
  });
  it('uses overlapping clues and certifies every robot at most once', () => {
    const crossings = certify(lessons[1]), walls = certify(lessons[2]);
    expect(crossings.status).toBe('solved'); expect(walls.status).toBe('solved');
    if (crossings.status === 'solved') expect(crossings.certificate.combinedDeductions).toBeGreaterThan(0);
    if (walls.status === 'solved') expect(new Set(walls.certificate.shots.map(shot => shot.robot)).size).toBe(walls.certificate.shots.length);
  });
  it('every inferred safe or rat cell agrees with ALL consistent small-board layouts', () => {
    // Independent exhaustive oracle, using coordinate geometry rather than
    // the game's ray walker or the deduction engine to count each line.
    const size = 4, board = cells(size), layouts: number[][] = [];
    for (const a of board) for (const b of board) if (a < b) layouts.push([a, b]);
    const count = (rats: number[], source: number, dx: number, dy: number) => rats.filter(rat => {
      const x = rat % size - source % size, y = Math.floor(rat / size) - Math.floor(source / size);
      return (x !== 0 || y !== 0) && Math.sign(x) === dx && Math.sign(y) === dy && (!dx || !dy || Math.abs(x) === Math.abs(y));
    }).length;
    for (const rats of layouts.filter(rats => !rats.includes(5))) {
      const safe = [5, 0, 15].filter(c => !rats.includes(c));
      const clues = safe.map(cell => ({ cell, counts: directions.map(d => count(rats, cell, d.dx, d.dy)) }));
      const possible = layouts.filter(candidate => !safe.some(c => candidate.includes(c)) && clues.every(clue => directions.every((d, i) => count(candidate, clue.cell, d.dx, d.dy) === clue.counts[i])));
      const result = deduce({ size, safe, clues, walls: [], remaining: 2 });
      expect(result.valid).toBe(true);
      expect(possible.length).toBeGreaterThan(0);
      for (const cell of result.safe) expect(possible.every(candidate => !candidate.includes(cell))).toBe(true);
      for (const cell of result.rats) expect(possible.every(candidate => candidate.includes(cell))).toBe(true);
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
      let state = opened(result.puzzle);
      for (const discovery of result.certificate.scans) state = scan(result.puzzle, state, discovery.cell);
      for (const shot of result.certificate.shots) state = placeRobot(result.puzzle, state, shot.robot, shot.cell);
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
    let state = opened(result.puzzle);
    for (const discovery of result.certificate.scans) state = scan(result.puzzle, state, discovery.cell);
    for (const shot of result.certificate.shots) state = placeRobot(result.puzzle, state, shot.robot, shot.cell);
    expect(state.status).toBe('won');
  }
});


describe('La última patrulla', () => {
  it('requires all four pieces and certifies combined clues from D4', () => {
    const puzzle = lessons.find(p => p.id === 'last-patrol')!;
    const result = certify(puzzle);
    expect(result.status).toBe('solved');
    if (result.status !== 'solved') throw new Error(result.status);
    expect(result.certificate.combinedDeductions).toBeGreaterThan(0);
    expect(result.certificate.shots).toHaveLength(4);
    for (const removed of [0, 2, 3]) {
      expect(planLasers(puzzle, puzzle.robots.filter((_, i) => i !== removed)).status).toBe('no-plan');
    }
    let state = opened(puzzle);
    for (const step of result.certificate.scans) state = scan(puzzle, state, step.cell);
    for (const [robot, cell] of [[0, 'B6'], [3, 'A5'], [2, 'G4'], [1, 'D5']] as const) {
      state = placeRobot(puzzle, state, robot, at(puzzle, cell));
    }
    expect(state.status).toBe('won');
    expect(Object.keys(state.positions)).toHaveLength(4);
  });

  it('makes the six-rat diagonal shot at F4 a losing commitment', () => {
    const puzzle = lessons.find(p => p.id === 'last-patrol')!;
    let state = opened(puzzle);
    // Give the player the full safe map: the trap is strategic, not hidden information.
    for (const cell of cells(puzzle.size).filter(c => !puzzle.rats.includes(c))) state = scan(puzzle, state, cell);
    state = placeRobot(puzzle, state, 3, at(puzzle, 'F4'));
    expect(state.cleared).toHaveLength(6);
    expect(state.status).toBe('playing');
    const remaining = { ...puzzle, rats: puzzle.rats.filter(c => !state.cleared.includes(c)) };
    // Even a relaxed planner allowing reuse of the occupied origin cannot finish.
    expect(planLasers(remaining, ['row', 'row', 'column']).status).toBe('no-plan');
  });
});
