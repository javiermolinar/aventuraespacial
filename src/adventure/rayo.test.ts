import { expect, it } from 'vitest';
import { rayoChapter as chapter } from './chapters/rayo';
import { chapterCatalog } from './chapters/catalog';
import { chispaChapter } from './chapters/chispa';
import { broteChapter } from './chapters/brote';
import { chapterStatus, completeChapter, newCampaign, recordChapter, restoreCampaign } from './campaign';
import { earnPart, moveTo, newAdventure, placePart, restoreAdventure, updateResistors, validateProgress } from './progress';
import { previewProgress } from '../authoring/preview-progress';
import { emptyResistorState, type ResistorState } from '../games/resistor-board/game';
import { adventureMusic } from './music';

const options = { mathsLevel: 0, character: 'girl' as const, playerName: 'Ada' };
const at = (sceneId: string) => previewProgress(chapter, { ...options, sceneId });
const solved: ResistorState = { placements: { A: 'bridge', B: 'r3', C: 'r1' }, tested: true };

it('always builds Rayo with six three-digit subtractions without borrowing, including after reload', () => {
  for (const requested of [0, 3, 9, 13]) {
    const progress = newAdventure(chapter, requested, 'girl', 'Ada');
    expect(progress.mathsLevel).toBe(13);
    expect(progress.operations).toHaveLength(6);
    for (const operation of progress.operations) {
      expect(operation.operator).toBe('−');
      expect(operation.a).toBeGreaterThanOrEqual(100);
      expect(operation.b).toBeGreaterThanOrEqual(100);
      for (const place of [1, 10, 100]) expect(Math.floor(operation.a / place) % 10).toBeGreaterThanOrEqual(Math.floor(operation.b / place) % 10);
    }
    expect(restoreAdventure(JSON.parse(JSON.stringify(progress)), chapter)).toEqual(progress);
  }
  const progress = newAdventure(chapter, 0);
  progress.operations[0] = { a: 350, b: 120, operator: '−' };
  expect(validateProgress(progress, chapter)).toBe(true);
  for (const operation of [{ a: 350, b: 121, operator: '−' }, { a: 350, b: 120, operator: '+' }, { a: 35, b: 12, operator: '−' }] as const) {
    expect(restoreAdventure({ ...progress, operations: [operation, ...progress.operations.slice(1)] }, chapter)).toBeNull();
  }
  expect(restoreAdventure({ ...progress, mathsLevel: 0 }, chapter)).toBeNull();
});

it('introduces the vocabulary only after placing all six parts, then opens the resistor board', () => {
  let progress = at('build-start');
  expect(moveTo(progress, chapter, 'robot-introduction')).toBe(progress);
  for (let part = 0; part < 6; part++) {
    expect(progress.sceneId).toBe('build-start');
    progress = placePart(earnPart(progress, chapter), chapter);
  }
  expect(progress.sceneId).toBe('robot-introduction');
  const scene = chapter.scenes[progress.sceneId];
  expect(scene.type !== 'build' && scene.paragraphs.join(' ')).toContain('Esto es una resistencia');
  progress = moveTo(progress, chapter, 'power-board');
  expect(chapter.scenes[progress.sceneId].type).toBe('resistors');
  expect(adventureMusic(chapter.scenes.alarm)).toBe('the-descent.mp3');
  expect(adventureMusic(chapter.scenes['power-board'])).toBe('cipher.mp3');
});

it('restores partial and tested boards, freezes a solved board, and allows skipping without losing maths', () => {
  const start = at('power-board');
  const partial = updateResistors(start, chapter, { placements: { A: 'r3', B: null, C: null }, tested: false });
  expect(restoreAdventure(JSON.parse(JSON.stringify(partial)), chapter)).toEqual(partial);
  const completed = updateResistors(partial, chapter, solved);
  expect(restoreAdventure(completed, chapter)).toEqual(completed);
  expect(updateResistors(completed, chapter, emptyResistorState())).toBe(completed);
  expect(moveTo(start, chapter, 'lights-back')).toMatchObject({ sceneId: 'lights-back', placedCount: 6, mathsLevel: 13 });
  expect(updateResistors(newAdventure(chapter, 0), chapter, solved).resistorStates).toBeUndefined();
});

it('rejects duplicate, unknown, incomplete-tested and unvisited resistor placements', () => {
  const progress = at('power-board');
  for (const state of [null, [], {}, { placements: { A: 'bridge', B: 'bridge', C: 'r1' }, tested: false },
    { placements: { A: 'unknown', B: null, C: null }, tested: false },
    { ...emptyResistorState(), tested: true }, { ...solved, tested: 'yes' },
    { placements: { ...solved.placements, D: null }, tested: true }]) {
    expect(restoreAdventure({ ...progress, resistorStates: { 'power-board': state } }, chapter)).toBeNull();
  }
  expect(restoreAdventure({ ...progress, resistorStates: { alarm: solved } }, chapter)).toBeNull();
  expect(restoreAdventure({ ...newAdventure(chapter, 0), resistorStates: { 'power-board': solved } }, chapter)).toBeNull();
});

it('loads existing two-chapter campaigns and unlocks Rayo without granting completion', () => {
  let campaign = newCampaign(chapterCatalog);
  for (const [chapter, sceneId] of [[chispaChapter, 'ending'], [broteChapter, 'snack']] as const) {
    const progress = previewProgress(chapter, { ...options, sceneId });
    campaign = completeChapter(recordChapter(campaign, chapterCatalog, progress), chapterCatalog, chapter.id);
  }
  expect(restoreCampaign(JSON.parse(JSON.stringify(campaign)), chapterCatalog)).toEqual(campaign);
  expect(chapterStatus(campaign, chapterCatalog, 'rayo')).toBe('available');
  expect(chapterStatus(campaign, chapterCatalog, 'tuerca')).toBe('locked');
  campaign = recordChapter(campaign, chapterCatalog, at('lights-back'));
  expect(campaign.completed).toEqual(['chispa-radio', 'brote']);
  expect(completeChapter(campaign, chapterCatalog, 'rayo')).toBe(campaign);
  campaign = recordChapter(campaign, chapterCatalog, at('lights-back:ending'));
  campaign = completeChapter(campaign, chapterCatalog, 'rayo');
  expect(chapterStatus(campaign, chapterCatalog, 'tuerca')).toBe('upcoming');
});
