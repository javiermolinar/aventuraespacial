import { describe, expect, it } from 'vitest';
import { connectionGames } from './levels';
import { neighbour, openings, pipeFlow, pipeGoals, pipeHint, pipeLeaks, validPipeLayout, type Direction, type PipeLayout } from './pipes';

/** Explore every legal simple route, independent of the authored solution. */
function shortestRoute(layout: PipeLayout): number {
  let best = Infinity;
  function walk(index: number, incoming: Direction, visited: Set<number>) {
    if (visited.has(index) || visited.size + 1 >= best) return;
    const path = new Set(visited).add(index);
    for (let rotation = 0; rotation < (layout.tiles[index] === 'straight' ? 2 : 4); rotation++) {
      const ports = openings(layout.tiles[index], rotation);
      if (!ports.includes(incoming)) continue;
      const outgoing = ports.find(side => side !== incoming)!;
      if (index === layout.goal.index && outgoing === layout.goal.side) best = Math.min(best, path.size);
      const next = neighbour(index, outgoing, layout.size);
      if (next !== null) walk(next, (outgoing + 2) % 4 as Direction, path);
    }
  }
  walk(layout.source.index, layout.source.side, new Set());
  return best;
}

describe.each(Object.entries(connectionGames))('%s connection levels', (_theme, game) => {
  it('progresses from two introductory routes to increasingly branched, fully scrambled networks', () => {
    expect(shortestRoute(game.levels[1].layout)).toBeGreaterThan(shortestRoute(game.levels[0].layout));
    expect(game.levels.map(({ layout }) => layout.tiles.filter(kind => kind === 'tee').length)).toEqual([0, 0, 1, 4, 6, 11]);
    expect(game.levels.map(({ layout }) => pipeGoals(layout).length)).toEqual([1, 1, 2, 3, 3, 4]);
    for (const { layout } of game.levels.slice(2)) {
      expect(layout.network).toBe(true);
      expect(pipeFlow(layout, layout.solution).wet).toHaveLength(layout.tiles.length);
      expect(pipeLeaks(layout, layout.solution)).toEqual([]);
      for (let index = 0; index < layout.tiles.length; index++) {
        expect(openings(layout.tiles[index], layout.initial[index]).sort()).not.toEqual(openings(layout.tiles[index], layout.solution[index]).sort());
      }
    }
  });

  it.each(game.levels)('$name starts unsolved, can be solved with hints and accepts equivalent rotations', ({ layout }) => {
    expect(validPipeLayout(layout)).toBe(true);
    const rotations = [...layout.initial];
    for (let step = 0; step < layout.tiles.length && !pipeFlow(layout, rotations).solved; step++) {
      const hint = pipeHint(layout, rotations);
      expect(hint).not.toBeNull();
      rotations[hint!] = layout.solution[hint!];
    }
    expect(pipeFlow(layout, rotations).solved).toBe(true);
    const route = pipeFlow(layout, layout.solution).wet;
    const alternative = layout.solution.map((rotation, index) => (rotation + (!route.includes(index) ? 1 : layout.tiles[index] === 'straight' ? 2 : 0)) % 4);
    expect(pipeFlow(layout, alternative).solved).toBe(true);
  });

  it('rejects a loose branch even when all destinations are connected', () => {
    const { layout } = game.levels[5];
    let found = false;
    for (let index = 0; index < layout.tiles.length && !found; index++) {
      for (let turn = 1; turn < 4 && !found; turn++) {
        const rotations = layout.solution.map((rotation, tile) => tile === index ? (rotation + turn) % 4 : rotation);
        if (pipeFlow({ ...layout, network: false }, rotations).solved && pipeLeaks(layout, rotations).length > 0) {
          expect(pipeFlow(layout, rotations).solved).toBe(false);
          found = true;
        }
      }
    }
    expect(found).toBe(true);
  });
});

it('rejects a sealed but isolated loop even with a connected destination and no leaks', () => {
  const layout: PipeLayout = { size: 3, network: true, source: { index: 0, side: 3 }, goal: { index: 2, side: 1 },
    tiles: ['straight', 'straight', 'straight', 'elbow', 'straight', 'elbow', 'elbow', 'straight', 'elbow'],
    initial: [], solution: [] };
  const rotations = [1, 1, 1, 1, 1, 2, 0, 1, 3];
  expect(pipeLeaks(layout, rotations)).toEqual([]);
  expect(pipeFlow({ ...layout, network: false }, rotations).solved).toBe(true);
  expect(pipeFlow(layout, rotations)).toEqual({ wet: [0, 1, 2], solved: false });
});

it('requires every destination and validates their boundary positions', () => {
  const layout = connectionGames.water.levels[5].layout;
  const extra = layout.extraGoals![0];
  const broken = { ...layout, extraGoals: [{ ...extra, side: 0 as const }, ...layout.extraGoals!.slice(1)] };
  expect(pipeFlow(broken, layout.solution).solved).toBe(false);
  expect(validPipeLayout(broken)).toBe(false);
  expect(validPipeLayout({ ...layout, extraGoals: [layout.goal] })).toBe(false);
});

it('has twelve distinct boards with stable save identifiers', () => {
  const levels = Object.values(connectionGames).flatMap(game => game.levels);
  expect(new Set(levels.map(level => level.id)).size).toBe(12);
  expect(new Set(levels.map(level => JSON.stringify(level.layout))).size).toBe(12);
});
