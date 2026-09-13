import { afterEach, expect, it, vi } from 'vitest';
import { chispaChapter } from '../adventure/chapters/chispa';
import { chispaV4Chapter } from '../adventure/chapters/chispa-v4';
import { validateProgress } from '../adventure/progress';
import { previewProgress } from './preview-progress';

const options = { playerName: 'Lucía', character: 'girl' as const, mathsLevel: 3 };
afterEach(() => vi.unstubAllGlobals());

it('seeds every current and legacy branched scene with a legal history and completed prerequisites', () => {
  vi.stubGlobal('localStorage', { getItem: () => { throw new Error('Preview must not read saves'); }, setItem: () => { throw new Error('Preview must not write saves'); } });
  for (const chapter of [chispaChapter, chispaV4Chapter]) {
    for (const sceneId of Object.keys(chapter.scenes)) {
      const progress = previewProgress(chapter, { ...options, sceneId });
      expect(validateProgress(progress, chapter), sceneId).toBe(true);
      expect(progress).toMatchObject({ sceneId, playerName: 'Lucía', character: 'girl', mathsLevel: 3 });
      if (chapter.scenes[sceneId].type === 'build') expect(progress.placedCount).toBe(0);
      if (chapter.scenes[sceneId].type === 'ending') expect(progress.placedCount).toBe(6);
    }
  }
});

it('does not mutate chapter data, invent an unknown scene or accept invalid settings', () => {
  const before = structuredClone(chispaChapter);
  expect(previewProgress(chispaChapter, { ...options, sceneId: '' }).sceneId).toBe(chispaChapter.start);
  expect(() => previewProgress(chispaChapter, { ...options, sceneId: 'missing' })).toThrow('Unknown scene');
  expect(() => previewProgress(chispaChapter, { ...options, sceneId: 'ending', mathsLevel: 99 })).toThrow('Unknown maths level');
  expect(() => previewProgress(chispaChapter, { ...options, sceneId: 'ending', playerName: 'x'.repeat(25) })).toThrow('too long');
  expect(chispaChapter).toEqual(before);
});
