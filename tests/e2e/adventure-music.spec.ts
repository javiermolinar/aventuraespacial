import { expect, test, type Page } from '@playwright/test';
import { chispaChapter as chapter } from '../../src/adventure/chapters/chispa';
import { adventureStorageKey, earnPart, moveTo, newAdventure, placePart } from '../../src/adventure/progress';
import { placeByTap } from './helpers';

async function expectMusic(page: Page, file: string) {
  const audio = page.getByTestId('background-music');
  await expect(audio).toHaveCount(1);
  await expect(audio).toHaveAttribute('src', new RegExp(`/music/${file}\\.mp3$`));
  await expect.poll(() => audio.evaluate(element => {
    const music = element as HTMLAudioElement;
    return !music.paused && music.readyState >= 2 && music.volume === 0.12;
  })).toBe(true);
}

test('home music is opt-in, survives home/continue, and pauses during setup', async ({ page }) => {
  const external: string[] = [];
  page.on('request', request => { if (!request.url().startsWith('http://127.0.0.1:4173/')) external.push(request.url()); });
  await page.goto('/');
  const audio = page.getByTestId('background-music');
  await expect(audio).toHaveAttribute('src', './music/wallpaper.mp3');
  expect(await audio.evaluate(element => (element as HTMLAudioElement).paused)).toBe(true);
  await page.getByRole('button', { name: 'Activar sonido' }).click();
  await expectMusic(page, 'wallpaper');
  await page.getByRole('button', { name: 'Empezar aventura' }).click();
  expect(await audio.evaluate(element => (element as HTMLAudioElement).paused)).toBe(true);
  await page.getByRole('button', { name: 'Comenzar', exact: true }).click();
  await expectMusic(page, 'dream-culture');
  await audio.evaluate(element => { (element as HTMLAudioElement).currentTime = 10; });
  await page.getByRole('button', { name: 'En la estación Luna.', exact: true }).click();
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  expect(await audio.evaluate(element => (element as HTMLAudioElement).currentTime)).toBeGreaterThanOrEqual(10);
  await page.getByRole('button', { name: 'Volver al inicio', exact: true }).click();
  await expectMusic(page, 'wallpaper');
  await page.reload();
  await expect(page.getByRole('button', { name: 'Desactivar sonido' })).toBeVisible();
  await page.keyboard.press('Tab');
  await expectMusic(page, 'wallpaper');
  await page.getByRole('button', { name: 'Desactivar sonido' }).click();
  expect(await audio.evaluate(element => (element as HTMLAudioElement).paused)).toBe(true);
  await page.getByRole('button', { name: 'Continuar aventura' }).click();
  expect(await audio.evaluate(element => (element as HTMLAudioElement).paused)).toBe(true);
  expect(external).toEqual([]);
});

test('finishing the robot and opening the game switch tracks without an extra click', async ({ page }) => {
  let progress = newAdventure(chapter, 0);
  for (const id of ['plan', 'workshop', 'build-start']) progress = moveTo(progress, chapter, id);
  for (let i = 0; i < 5; i++) progress = placePart(earnPart(progress, chapter), chapter);
  progress = earnPart(progress, chapter);
  await page.goto('/games/adventure.html');
  await page.evaluate(({ key, progress }) => localStorage.setItem(key, JSON.stringify(progress)), { key: adventureStorageKey, progress });
  await page.reload();
  await page.getByRole('button', { name: 'Activar sonido' }).click();
  await expectMusic(page, 'carefree');
  await placeByTap(page);
  await expect(page.getByRole('heading', { name: 'Chispa', exact: true })).toBeFocused();
  await expectMusic(page, 'life-of-riley');
  await page.getByRole('button', { name: 'Arreglar la radio.', exact: true }).click();
  await expectMusic(page, 'cipher');
  await page.getByRole('button', { name: 'Saltar', exact: true }).click();
  await expectMusic(page, 'dream-culture');
  await page.getByRole('button', { name: 'Volver al inicio', exact: true }).click();
  await expectMusic(page, 'wallpaper');
});
