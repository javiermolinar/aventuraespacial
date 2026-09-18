import { expect, it } from 'vitest';
import { broteChapter as chapter, broteScript } from './chapters/brote';
import { defineChapter } from './chapter-script';
import { destinations, validateChapter } from './types';
import { earnPart, moveTo, newAdventure, placePart, restoreAdventure, updatePacking, validateProgress } from './progress';
import { initialState, puzzles, type PiecesState } from '../games/shape-box/puzzle';
import { previewProgress } from '../authoring/preview-progress';
import { adventureMusic } from './music';
import { soundtracks } from '../music';

const puzzle = puzzles[broteScript.game.puzzleIndex];
const atGame = () => previewProgress(chapter, { sceneId: 'supply-boxes', mathsLevel: 0, character: 'girl', playerName: 'Ada' });
const solved = (): PiecesState => Object.fromEntries(puzzle.pieces.map(piece => {
  const { x, y, turns } = puzzle.solution[piece.id];
  return [piece.id, { turns, position: { x, y } }];
}));

it('preserves version 1 story progress while discarding placements from the easier board', () => {
  const current = atGame();
  const old = { ...current, chapterVersion: 1, packingStates: { 'supply-boxes': initialState(puzzles[0]) } };
  const restored = restoreAdventure(old, chapter);
  expect(restored).toEqual(current);
  expect(old.packingStates['supply-boxes']).toEqual(initialState(puzzles[0]));
  expect(restoreAdventure({ ...old, packingStates: { 'supply-boxes': {} } }, chapter)).toBeNull();
});

it('requires all six Brote pieces before introducing the robot and opening the box game', () => {
  expect(validateChapter(chapter)).toEqual([]);
  let progress = newAdventure(chapter, 0, 'girl', 'Ada');
  for (const id of ['supplies', 'workshop', 'build-start']) progress = moveTo(progress, chapter, id);
  expect(moveTo(progress, chapter, 'robot-introduction')).toBe(progress);
  for (let i = 0; i < 6; i++) {
    expect(progress.sceneId).toBe('build-start');
    progress = placePart(earnPart(progress, chapter), chapter);
    expect(validateProgress(progress, chapter)).toBe(true);
  }
  expect(progress.sceneId).toBe('robot-introduction');
  progress = moveTo(progress, chapter, 'supply-boxes');
  expect(chapter.scenes[progress.sceneId].type).toBe('packing');
  expect(adventureMusic(chapter.scenes[progress.sceneId])).toBe(soundtracks.game.file);
  progress = updatePacking(progress, chapter, solved());
  while (chapter.scenes[progress.sceneId].type !== 'ending') {
    progress = moveTo(progress, chapter, destinations(chapter.scenes[progress.sceneId])[0]);
    expect(validateProgress(progress, chapter)).toBe(true);
  }
  expect(progress).toMatchObject({ placedCount: 6, playerName: 'Ada', character: 'girl' });
});

it('restores partial and solved boxes, allows skipping, and never changes a completed board', () => {
  const initial = atGame();
  const state = initialState(puzzle);
  state.A = solved().A;
  const partial = updatePacking(initial, chapter, state);
  expect(restoreAdventure(JSON.parse(JSON.stringify(partial)), chapter)).toEqual(partial);
  state.A.position = null;
  expect(partial.packingStates?.['supply-boxes'].A.position).not.toBeNull();
  const complete = updatePacking(partial, chapter, solved());
  expect(restoreAdventure(complete, chapter)).toEqual(complete);
  expect(updatePacking(complete, chapter, initialState(puzzle))).toBe(complete);
  expect(validateProgress(moveTo(initial, chapter, 'snack'), chapter)).toBe(true);
  expect(updatePacking(newAdventure(chapter, 0), chapter, solved()).packingStates).toBeUndefined();
});

it('rejects malformed, overlapping, out-of-bounds, unknown and future box progress', () => {
  const progress = atGame();
  const state = initialState(puzzle);
  const invalid: unknown[] = [null, [], {}, { ...state, extra: state.A },
    { ...state, A: { turns: -1, position: null } }, { ...state, A: { turns: 4, position: null } },
    { ...state, A: { turns: 0.5, position: null } }, { ...state, A: { turns: 0 } },
    { ...state, A: { turns: 0, position: [] } },
    { ...state, A: { turns: 0, position: { x: -1, y: 0 } } },
    { ...state, A: { turns: 0, position: { x: 0, y: 0.5 } } },
    { ...state, A: { turns: 0, position: { x: puzzle.width, y: puzzle.height } } },
    { ...state, A: { turns: 0, position: { x: 0, y: 0 } }, B: { turns: 0, position: { x: 0, y: 0 } } },
  ];
  for (const value of invalid) {
    expect(restoreAdventure({ ...progress, packingStates: { 'supply-boxes': value } }, chapter)).toBeNull();
    expect(updatePacking(progress, chapter, value as PiecesState)).toBe(progress);
  }
  for (const packingStates of [null, [], { unknown: state }, { hungry: state }]) {
    expect(restoreAdventure({ ...progress, packingStates }, chapter)).toBeNull();
  }
  expect(restoreAdventure({ ...newAdventure(chapter, 0), packingStates: { 'supply-boxes': state } }, chapter)).toBeNull();
});

it('rejects unknown packing configurations during chapter compilation', () => {
  for (const puzzleIndex of [-1, 0.5, puzzles.length, NaN]) {
    expect(() => defineChapter({ ...broteScript, game: { ...broteScript.game, puzzleIndex } })).toThrow('Invalid packing puzzle');
  }
});
