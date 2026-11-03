import { describe, expect, it } from 'vitest';
import { advancedConnectionGames } from './advanced-levels';
import { connectionGames } from './levels';
import { openings, pipeFlow, pipeGoals, pipeHint, pipeLeaks, validPipeLayout } from './pipes';

describe.each(Object.entries(advancedConnectionGames))('%s advanced networks', (_theme, game) => {
  it('adds six larger networks with increasing destination and loop counts', () => {
    expect(game.levels.map(({ layout }) => layout.size)).toEqual([5, 5, 6, 6, 6, 6]);
    expect(game.levels.map(({ layout }) => pipeGoals(layout).length)).toEqual([3, 4, 4, 5, 6, 6]);
    // Internal edges - vertices + 1 counts independent cycles in a connected graph.
    expect(game.levels.map(({ layout }) => {
      const ports = layout.tiles.reduce((count, kind) => count + openings(kind, 0).length, 0);
      return (ports - pipeGoals(layout).length - 1) / 2 - layout.tiles.length + 1;
    })).toEqual([4, 7, 7, 10, 12, 15]);
  });

  it.each(game.levels)('$name is sealed, fully connected and solvable using optional hints', ({ layout }) => {
    expect(validPipeLayout(layout)).toBe(true);
    expect(layout.network).toBe(true);
    expect(layout.tiles).toContain('cross');
    expect(pipeLeaks(layout, layout.solution)).toEqual([]);
    expect(pipeFlow(layout, layout.solution).wet).toHaveLength(layout.tiles.length);
    const rotations = [...layout.initial];
    for (let index = 0; index < rotations.length; index++) {
      if (layout.tiles[index] !== 'cross') {
        expect(openings(layout.tiles[index], rotations[index]).sort()).not.toEqual(openings(layout.tiles[index], layout.solution[index]).sort());
      }
    }
    for (let step = 0; step < rotations.length && !pipeFlow(layout, rotations).solved; step++) {
      const before = [...rotations];
      const hint = pipeHint(layout, rotations);
      expect(rotations).toEqual(before);
      expect(hint).not.toBeNull();
      expect(layout.tiles[hint!]).not.toBe('cross');
      rotations[hint!] = layout.solution[hint!];
    }
    expect(pipeFlow(layout, rotations).solved).toBe(true);
    expect(pipeHint(layout, rotations)).toBeNull();
    const equivalent = layout.solution.map((turn, index) => (turn + (layout.tiles[index] === 'straight' ? 2 : layout.tiles[index] === 'cross' ? 1 : 0)) % 4);
    expect(pipeFlow(layout, equivalent).solved).toBe(true);
  });

  it('rejects every single rotatable-piece error, including loose branches', () => {
    for (const { layout } of game.levels) {
      layout.tiles.forEach((kind, index) => {
        if (kind === 'cross') return;
        const rotations = [...layout.solution];
        rotations[index] = (rotations[index] + 1) % 4;
        expect(pipeLeaks(layout, rotations).length).toBeGreaterThan(0);
        expect(pipeFlow(layout, rotations).solved).toBe(false);
      });
    }
  });
});

it('keeps all 24 boards and save identifiers distinct without changing the originals', () => {
  const original = Object.values(connectionGames).flatMap(game => game.levels);
  const advanced = Object.values(advancedConnectionGames).flatMap(game => game.levels);
  const levels = [...original, ...advanced];
  expect(new Set(levels.map(level => level.id)).size).toBe(24);
  expect(new Set(levels.map(level => JSON.stringify(level.layout))).size).toBe(24);
  expect(original.every(level => !level.layout.tiles.includes('cross'))).toBe(true);
  expect(advanced.every(level => level.id.includes('-advanced-v1-'))).toBe(true);
});

it('four-way junctions connect all four ports at every orientation; oversized boards are rejected', () => {
  for (let turn = 0; turn < 4; turn++) expect(openings('cross', turn).sort()).toEqual([0, 1, 2, 3]);
  expect(validPipeLayout({ ...advancedConnectionGames.water.levels[5].layout, size: 7 })).toBe(false);
});
