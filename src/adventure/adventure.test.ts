import { afterEach, describe, expect, it, vi } from 'vitest';
import { chispaChapter as chapter } from './chapters/chispa';
import { chispaV1Chapter, chispaV2Chapter, chispaV3Chapter, chispaV5Chapter } from './chapters/chispa-migration';
import { chispaV4Chapter } from './chapters/chispa-v4';
import { destinations, validateChapter, type Chapter } from './types';
import { adventureStorageKey, earnPart, loadAdventure, moveTo, newAdventure, placePart, rotatePipe, saveAdventure, validateProgress, type AdventureProgress } from './progress';
import { needsExchange } from '../lib/maths';
import { normalizePlayerName, personalize, playerNameMaxLength } from './personalization';

afterEach(() => vi.unstubAllGlobals());

function firstBuild(level = 0) {
  let p = newAdventure(chapter, level);
  for (const next of ['plan', 'workshop', 'build-start']) p = moveTo(p, chapter, next);
  return p;
}

function finishBuild(p: AdventureProgress) {
  const scene = chapter.scenes[p.sceneId];
  if (scene.type !== 'build') throw new Error('Expected build');
  while (p.placedCount < scene.targetPlacedParts) p = placePart(earnPart(p, chapter), chapter);
  return p;
}

function migratedScene(p: AdventureProgress) {
  if (p.sceneId === 'window') return 'workshop';
  if (['high-five', 'wave', 'water-pipes', 'tool', 'hello'].includes(p.sceneId)) return 'radio-cables';
  if (p.sceneId === 'build-start' && p.placedCount === 6) return 'robot-introduction';
  return p.sceneId;
}

function canonicalHistory(sceneId: string) {
  const ids = Object.keys(chapter.scenes);
  return ids.slice(0, ids.indexOf(sceneId));
}

describe('chapter authoring', () => {
  it('has valid scene links, questions and uninterrupted construction', () => {
    expect(validateChapter(chapter)).toEqual([]);
  });
  it('rejects missing links, unreachable content and loops', () => {
    const broken = structuredClone(chapter);
    broken.scenes.orphan = { type: 'story', title: 'Unused', image: 'ship', paragraphs: [], choices: [] };
    broken.scenes.message = { ...broken.scenes.message, next: 'missing' } as Chapter['scenes'][string];
    expect(validateChapter(broken)).toContain('Missing scene: missing');
    expect(validateChapter(broken)).toContain('Unreachable scene: orphan');
    const cycle = structuredClone(chapter);
    if (cycle.scenes.plan.type === 'story') cycle.scenes.plan.choices[0].next = 'message';
    expect(validateChapter(cycle)).toContain('Cycle at: message');
  });
  it('rejects ambiguous answers, inconsistent sequences and invalid build targets', () => {
    const broken = structuredClone(chapter);
    if (broken.scenes.message.type === 'comprehension') broken.scenes.message.options[0].correct = true;
    if (broken.scenes.recap.type === 'sequence') broken.scenes.recap.correctOrder = ['build', 'build', 'repair'];
    if (broken.scenes['build-start'].type === 'build') broken.scenes['build-start'].targetPlacedParts = 2;
    expect(validateChapter(broken)).toEqual(expect.arrayContaining(['Invalid answers: message', 'Invalid sequence: recap', 'Invalid build target: build-start']));
  });
  it('rejects radio panels whose terminals do not match the fixed return lead', () => {
    const broken = structuredClone(chapter);
    const scene = broken.scenes['radio-cables'];
    if (scene.type === 'pipes') scene.layout.source.side = 0;
    expect(validateChapter(broken)).toContain('Invalid pipe layout: radio-cables');
  });
  it('the linear chapter finishes with exactly six pieces and valid saves at every scene', () => {
    function walk(p: AdventureProgress): number {
      expect(validateProgress(p, chapter)).toBe(true);
      const scene = chapter.scenes[p.sceneId];
      if (scene.type === 'ending') { expect(p.placedCount).toBe(6); return 1; }
      if (scene.type === 'build') p = finishBuild(p);
      return destinations(scene).reduce((count, next) => count + walk(moveTo(p, chapter, next)), 0);
    }
    expect(walk(newAdventure(chapter, 0))).toBe(1);
  });
});

describe('adventure construction', () => {
  it('decouples all maths stages from Chispa and generates six operations', () => {
    for (let level = 0; level < 7; level++) {
      const p = firstBuild(level);
      expect(p.operations).toHaveLength(6);
      expect(p.operations.filter(op => op.operator === '+')).toHaveLength(level === 3 ? 6 : level === 5 ? 0 : 3);
      if (level === 5) expect(p.operations.every(needsExchange)).toBe(true);
      if (level !== 5) expect(p.operations.filter(op => op.operator === '−').every(op => !needsExchange(op))).toBe(true);
    }
  });
  it('requires all six pieces before continuing; repeated callbacks are harmless', () => {
    const p = firstBuild();
    expect(placePart(p, chapter)).toEqual(p);
    expect(moveTo(p, chapter, 'robot-introduction')).toEqual(p);
    expect(moveTo(p, chapter, 'ending')).toEqual(p);
    const earned = earnPart(p, chapter);
    expect(earnPart(earned, chapter)).toEqual(earned);
    const placed = placePart(earned, chapter);
    expect(placePart(placed, chapter)).toEqual(placed);
    let finished = placed;
    while (finished.placedCount < 6) {
      expect(moveTo(finished, chapter, 'robot-introduction')).toEqual(finished);
      finished = placePart(earnPart(finished, chapter), chapter);
    }
    expect(earnPart(finished, chapter)).toEqual(finished);
    const next = moveTo(finished, chapter, 'radio-cables');
    expect(next.sceneId).toBe('radio-cables');
    expect(next.operations).toEqual(p.operations);
    expect(earnPart(next, chapter)).toEqual(next);
  });
});

describe('v1 construction migration', () => {
  it('preserves pieces, pending rewards, operands and identity at every point on every old branch', () => {
    const oldChapter = chispaV1Chapter();
    function check(p: AdventureProgress) {
      expect(validateProgress(p, oldChapter)).toBe(true);
      vi.stubGlobal('localStorage', { getItem: () => JSON.stringify(p) });
      const loaded = loadAdventure(chapter);
      expect(loaded.reset).toBe(false);
      expect(validateProgress(loaded.progress, chapter)).toBe(true);
      expect(loaded.progress).toMatchObject({ chapterVersion: 6, placedCount: p.placedCount, ready: p.ready, operations: p.operations, mathsLevel: p.mathsLevel, character: 'girl', playerName: 'Lucía' });
      if (p.placedCount < 6 && p.history.includes('build-start')) expect(loaded.progress?.sceneId).toBe('build-start');
      if (['repair', 'recap', 'ending'].includes(p.sceneId)) expect(loaded.progress?.sceneId).toBe(p.sceneId);
    }
    function walk(p: AdventureProgress) {
      check(p);
      const scene = oldChapter.scenes[p.sceneId];
      if (scene.type === 'build') while (p.placedCount < scene.targetPlacedParts) {
        p = earnPart(p, oldChapter); check(p);
        p = placePart(p, oldChapter); check(p);
      }
      for (const next of destinations(scene)) walk(moveTo(p, oldChapter, next));
    }
    walk(newAdventure(oldChapter, 3, 'girl', 'Lucía'));
  });
  it('rejects impossible old construction states rather than granting missing pieces', () => {
    const p = { ...firstBuild(), chapterVersion: 1, sceneId: 'build-arms', history: ['message', 'plan', 'workshop', 'build-start', 'tool'], placedCount: 5 };
    vi.stubGlobal('localStorage', { getItem: () => JSON.stringify(p) });
    expect(loadAdventure(chapter).reset).toBe(true);
  });
});

describe('pipe interlude persistence', () => {
  function toPipes() {
    let p = finishBuild(firstBuild());
    for (const next of ['radio-cables']) p = moveTo(p, chapter, next);
    return p;
  }
  it('saves rotations, supports either direction, and allows an optional skip', () => {
    const p = toPipes();
    expect(validateProgress(p, chapter)).toBe(true);
    const rotated = rotatePipe(p, chapter, 1, -1);
    expect(rotated.pipeRotations?.['radio-cables'][1]).toBe(2);
    expect(rotatePipe(rotated, chapter, 1, 1).pipeRotations?.['radio-cables'][1]).toBe(3);
    expect(rotatePipe(p, chapter, -1)).toBe(p);
    expect(rotatePipe(p, chapter, 16)).toBe(p);
    expect(rotatePipe(p, chapter, 0, 4)).toBe(p);
    vi.stubGlobal('localStorage', { getItem: () => JSON.stringify(rotated) });
    expect(loadAdventure(chapter).progress).toEqual(rotated);
    const skipped = moveTo(rotated, chapter, 'repair');
    expect(validateProgress(skipped, chapter)).toBe(true);
    expect(skipped.placedCount).toBe(6);
    expect(rotatePipe(skipped, chapter, 0)).toBe(skipped);
  });
  it('rejects malformed rotations and state attached to unknown, future or non-pipe scenes', () => {
    const p = toPipes();
    for (const value of [null, [], 4, { 'radio-cables': [] }, { 'radio-cables': Array(16).fill(4) }, { 'radio-cables': Array(16).fill(.5) }, { repair: Array(16).fill(0) }, { unknown: Array(16).fill(0) }]) {
      expect(validateProgress({ ...p, pipeRotations: value }, chapter)).toBe(false);
    }
    expect(validateProgress({ ...firstBuild(), pipeRotations: { 'radio-cables': Array(16).fill(0) } }, chapter)).toBe(false);
  });
  it('migrates every v2 branch without replaying scenes or resetting the robot', () => {
    const previous = chispaV2Chapter();
    function walk(p: AdventureProgress) {
      vi.stubGlobal('localStorage', { getItem: () => JSON.stringify(p) });
      const loaded = loadAdventure(chapter);
      expect(loaded.reset).toBe(false);
      expect(validateProgress(loaded.progress, chapter)).toBe(true);
      expect(loaded.progress).toMatchObject({ sceneId: migratedScene(p), operations: p.operations, placedCount: p.placedCount, chapterVersion: 6 });
      const pastPipes = p.sceneId === 'repair' || p.history.includes('repair');
      expect(loaded.progress?.history.includes('radio-cables')).toBe(pastPipes);
      const scene = previous.scenes[p.sceneId];
      if (scene.type === 'build') while (p.placedCount < 6) p = placePart(earnPart(p, previous), previous);
      for (const next of destinations(scene)) walk(moveTo(p, previous, next));
    }
    walk(newAdventure(previous, 0));
  });
});

describe('v3 water-to-radio migration', () => {
  it('preserves all branches and partial, solved and skipped water boards as radio boards', () => {
    const previous = chispaV3Chapter();
    function check(p: AdventureProgress) {
      expect(validateProgress(p, previous)).toBe(true);
      vi.stubGlobal('localStorage', { getItem: () => JSON.stringify(p) });
      const { progress: migrated, reset } = loadAdventure(chapter);
      expect(reset).toBe(false);
      expect(validateProgress(migrated, chapter)).toBe(true);
      expect(migrated).toMatchObject({ chapterVersion: 6, sceneId: migratedScene(p), operations: p.operations, placedCount: p.placedCount, ready: p.ready, character: p.character, playerName: p.playerName });
      expect(migrated?.history).toEqual(canonicalHistory(migratedScene(p)));
      expect(migrated?.pipeRotations?.['radio-cables']).toEqual(p.pipeRotations?.['water-pipes']);
      expect(migrated?.pipeRotations ?? {}).not.toHaveProperty('water-pipes');
    }
    function walk(p: AdventureProgress) {
      check(p);
      const scene = previous.scenes[p.sceneId];
      if (scene.type === 'build') while (p.placedCount < 6) p = placePart(earnPart(p, previous), previous);
      if (scene.type === 'pipes') {
        for (const rotations of [scene.layout.initial.map((rotation, index) => index === 1 ? 0 : rotation), scene.layout.solution]) {
          const saved = { ...p, pipeRotations: { 'water-pipes': rotations } };
          check(saved);
          check(moveTo(saved, previous, scene.next));
        }
      }
      for (const next of destinations(scene)) walk(moveTo(p, previous, next));
    }
    walk(newAdventure(previous, 0, 'girl', 'Lucía'));
  });
});

describe.each([chispaV4Chapter, chispaV5Chapter()])('v$version migration to the direct game flow', previous => {
  it('preserves every branch, pending piece, completed introduction and game state', () => {
    function check(p: AdventureProgress) {
      expect(validateProgress(p, previous)).toBe(true);
      vi.stubGlobal('localStorage', { getItem: () => JSON.stringify(p) });
      const { progress, reset } = loadAdventure(chapter);
      expect(reset).toBe(false);
      expect(progress).toEqual({ ...p, chapterVersion: 6, sceneId: migratedScene(p), history: canonicalHistory(migratedScene(p)) });
      expect(validateProgress(progress, chapter)).toBe(true);
    }
    function walk(p: AdventureProgress) {
      check(p);
      const scene = previous.scenes[p.sceneId];
      if (scene.type === 'build') while (p.placedCount < 6) {
        p = earnPart(p, previous); check(p);
        p = placePart(p, previous); check(p);
      }
      if (scene.type === 'pipes') for (const rotations of [scene.layout.initial, scene.layout.solution]) {
        const saved = { ...p, pipeRotations: { 'radio-cables': rotations } };
        check(saved);
        check(moveTo(saved, previous, scene.next));
      }
      for (const next of destinations(scene)) walk(moveTo(p, previous, next));
    }
    walk(newAdventure(previous, 3, 'girl', 'Lucía'));
  });

  it('rejects corrupt paths before migrating history', () => {
    const p = { ...newAdventure(previous, 0), sceneId: 'ending', placedCount: 6 };
    vi.stubGlobal('localStorage', { getItem: () => JSON.stringify(p) });
    expect(loadAdventure(chapter).reset).toBe(true);
  });
});

describe('whole-scene reading', () => {
  it('preserves the character on scene changes without paragraph cursors', () => {
    const start = newAdventure(chapter, 0, 'girl', 'Lucía');
    const next = moveTo(start, chapter, 'plan');
    expect(next.sceneId).toBe('plan');
    expect(next.character).toBe('girl');
    expect(next.playerName).toBe('Lucía');
    expect(next).not.toHaveProperty('beat');
    expect(validateProgress(next, chapter)).toBe(true);
  });
});

describe('personalization', () => {
  it('normalizes names without losing accents and rejects oversized names', () => {
    expect(normalizePlayerName('  María   José  ')).toBe('María José');
    expect(newAdventure(chapter, 0, 'girl', '  María   José  ').playerName).toBe('María José');
    expect(() => newAdventure(chapter, 0, 'boy', 'a'.repeat(playerNameMaxLength + 1))).toThrow(RangeError);
  });
  it('replaces every name token literally and supplies a fallback for unnamed saves', () => {
    expect(personalize('¡Hola, {{name}}! Gracias, {{name}}.', 'Lucía')).toBe('¡Hola, Lucía! Gracias, Lucía.');
    expect(personalize('¡Hola, {{name}}!', '')).toBe('¡Hola, piloto!');
    expect(personalize('{{name}}', '$&<b>Ana</b>')).toBe('$&<b>Ana</b>');
  });
  it('adds an empty name to existing saves without changing character or construction', () => {
    const original = { ...earnPart(firstBuild(3), chapter), character: 'girl' as const };
    const { playerName: _name, ...legacy } = original;
    vi.stubGlobal('localStorage', { getItem: () => JSON.stringify(legacy) });
    expect(loadAdventure(chapter).progress).toEqual(original);
  });
});

describe('adventure persistence', () => {
  it('round-trips ready parts, operations and chapter position without touching practice', () => {
    const entries = new Map([['little-robot-lab:v1', '{"completed":{"1":3},"sound":true}']]);
    vi.stubGlobal('localStorage', { getItem: (key: string) => entries.get(key) ?? null, setItem: (key: string, value: string) => entries.set(key, value) });
    const p = earnPart({ ...firstBuild(3), playerName: 'Lucía' }, chapter);
    expect(saveAdventure(p)).toBe(true);
    expect(loadAdventure(chapter)).toEqual({ progress: p, unavailable: false, reset: false });
    expect(entries.get('little-robot-lab:v1')).toBe('{"completed":{"1":3},"sound":true}');
    expect(entries.has(adventureStorageKey)).toBe(true);
  });
  it('rejects incompatible versions, broken histories, invalid operations and impossible construction states', () => {
    const p = firstBuild();
    const invalid = [
      null, [], {}, { ...p, chapterVersion: 99 }, { ...p, sceneId: '__proto__' },
      { ...p, history: ['workshop'] }, { ...p, sceneId: 'ending' }, { ...p, mathsLevel: -1 },
      { ...p, operations: [] }, { ...p, operations: [{ a: 100, b: 1, operator: '+' }, ...p.operations.slice(1)] },
      { ...p, placedCount: 7 }, { ...p, placedCount: -1 }, { ...p, placedCount: 6, ready: true },
      { ...p, character: 'unknown' },
      { ...p, playerName: null }, { ...p, playerName: 7 }, { ...p, playerName: ' Ana ' },
      { ...p, playerName: 'a'.repeat(playerNameMaxLength + 1) },
      { ...p, sceneId: 'tool', history: [...p.history, 'build-start'], placedCount: 0 },
    ];
    for (const value of invalid) expect(validateProgress(value, chapter)).toBe(false);
  });
  it('migrates pre-cinematic saves without losing the robot, scene, history or operations', () => {
    const original = earnPart(firstBuild(3), chapter);
    const { character: _character, playerName: _name, ...legacy } = original;
    vi.stubGlobal('localStorage', { getItem: () => JSON.stringify(legacy) });
    expect(loadAdventure(chapter)).toEqual({ progress: original, unavailable: false, reset: false });
  });
  it('migrates all legacy paragraph positions to the same complete scene', () => {
    const p = moveTo(newAdventure(chapter, 0, 'girl'), chapter, 'plan');
    for (const beat of [0, 1, 2, 3]) {
      vi.stubGlobal('localStorage', { getItem: () => JSON.stringify({ ...p, beat }) });
      expect(loadAdventure(chapter).progress).toEqual(p);
      expect(loadAdventure(chapter).progress).not.toHaveProperty('beat');
    }
  });
  it('distinguishes damaged saves from unavailable storage and never throws', () => {
    vi.stubGlobal('localStorage', { getItem: () => '{bad', setItem: () => { throw new Error('blocked'); } });
    expect(loadAdventure(chapter)).toEqual({ progress: null, unavailable: false, reset: true });
    expect(saveAdventure(firstBuild())).toBe(false);
    vi.stubGlobal('localStorage', { getItem: () => { throw new Error('blocked'); } });
    expect(loadAdventure(chapter)).toEqual({ progress: null, unavailable: true, reset: false });
  });
});
