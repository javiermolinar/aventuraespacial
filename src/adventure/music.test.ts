import { existsSync } from 'node:fs';
import { expect, it } from 'vitest';
import { soundtracks } from '../music';
import { chispaChapter } from './chapters/chispa';
import { adventureMusic } from './music';

it('selects distinct local tracks for reading, maths, introduction and games', () => {
  const scenes = chispaChapter.scenes;
  expect(adventureMusic(null)).toBe('dream-culture.mp3');
  for (const id of ['message', 'plan', 'workshop', 'repair', 'recap']) expect(adventureMusic(scenes[id])).toBe('dream-culture.mp3');
  expect(adventureMusic(scenes['build-start'])).toBe('carefree.mp3');
  expect(adventureMusic(scenes['robot-introduction'])).toBe('life-of-riley.mp3');
  expect(adventureMusic(scenes['build-start'], true)).toBe('life-of-riley.mp3');
  expect(adventureMusic(scenes['radio-cables'])).toBe('cipher.mp3');
  expect(adventureMusic(scenes.ending)).toBe('life-of-riley.mp3');
});

it('ships every configured recording locally, including the separate home theme', () => {
  expect(soundtracks.home.file).toBe('wallpaper.mp3');
  expect(new Set(Object.values(soundtracks).map(track => track.file)).size).toBe(5);
  for (const track of Object.values(soundtracks)) expect(existsSync(`public/music/${track.file}`)).toBe(true);
});
