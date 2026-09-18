import { expect, test, type Page } from '@playwright/test';
import { chispaChapter as chapter } from '../../src/adventure/chapters/chispa';
import { destinations } from '../../src/adventure/types';
import { earnPart, moveTo, newAdventure, placePart, type AdventureProgress } from '../../src/adventure/progress';
import { readAdventure, readCampaign, seedLegacyAdventure } from './adventure-saves';
import { answer, placeByTap } from './helpers';

function at(id: string) {
  let progress = newAdventure(chapter, 3, 'girl', 'Lucía');
  while (progress.sceneId !== id) {
    const scene = chapter.scenes[progress.sceneId];
    if (scene.type === 'build') {
      while (progress.placedCount < 6) progress = placePart(earnPart(progress, chapter), chapter);
    } else progress = moveTo(progress, chapter, destinations(scene)[0]);
  }
  return progress;
}
async function open(page: Page, progress: AdventureProgress) {
  await page.goto('/games/adventure.html');
  await seedLegacyAdventure(page, progress);
  await page.reload();
}

test('Back rereads visited story pages; forward preserves the live answer and Home remains separate', async ({ page }) => {
  await open(page, at('message'));
  const back = page.getByRole('button', { name: 'Volver atrás', exact: true });
  await expect(back).toBeDisabled();
  await page.getByRole('button', { name: 'En la estación Luna.', exact: true }).click();
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await page.getByRole('button', { name: 'Entrar al taller', exact: true }).click();
  const saved = await readCampaign(page);
  await back.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Mejor en compañía', exact: true })).toBeFocused();
  await expect(page.getByRole('button', { name: 'Empezar aventura' })).toHaveCount(0);
  await back.click();
  await expect(page.getByRole('heading', { name: 'Un mensaje para ti', exact: true })).toBeFocused();
  await expect(back).toBeDisabled();
  await expect(page.getByRole('button', { name: 'En la estación Luna.', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Hora de trabajar', exact: true })).toBeFocused();
  expect(await readCampaign(page)).toEqual(saved);
  await back.click();
  await page.getByRole('button', { name: 'Volver al inicio', exact: true }).click();
  await page.getByRole('button', { name: 'Continuar aventura', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Hora de trabajar', exact: true })).toBeFocused();
  expect(await readCampaign(page)).toEqual(saved);
});

test('rereading preserves intermediate maths and pending parts, and hidden maths ignores keys', async ({ page }) => {
  const progress = at('build-start');
  progress.operations[0] = { a: 36, b: 25, operator: '+' };
  await open(page, progress);
  await answer(page, 11);
  await page.getByRole('button', { name: 'Llevar 1 decena' }).click();
  await page.getByRole('button', { name: 'Decenas: colocar la llevada' }).click();
  await page.keyboard.press('6');
  await expect(page.getByLabel('Respuesta de las decenas')).toHaveText('6');
  await page.getByRole('button', { name: 'Volver atrás', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Hora de trabajar', exact: true })).toBeFocused();
  await page.keyboard.press('Backspace');
  await page.keyboard.press('9');
  await page.keyboard.press('Enter');
  expect(await readAdventure(page)).toEqual(progress);
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await expect(page.getByLabel('Respuesta de las unidades')).toHaveText('1');
  await expect(page.getByLabel('Respuesta de las decenas')).toHaveText('6');
  await page.getByRole('button', { name: 'Comprobar', exact: true }).click();
  await page.getByRole('button', { name: 'Volver atrás', exact: true }).click();
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Arrastrar la cabeza' })).toBeVisible();
  await placeByTap(page);
  expect(await readAdventure(page)).toMatchObject({ placedCount: 1, ready: false, operations: progress.operations });
});

test('touch Back crosses completed construction without replaying it and preserves cable rotations', async ({ browser }) => {
  const context = await browser.newContext({ baseURL: 'http://127.0.0.1:4173', viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, reducedMotion: 'reduce' });
  try {
    const page = await context.newPage();
    await open(page, at('radio-cables'));
    await page.locator('.pipe-tile').first().tap();
    const saved = await readCampaign(page);
    await page.getByRole('button', { name: 'Activar sonido' }).tap();
    const music = page.getByTestId('background-music');
    await expect(music).toHaveAttribute('src', '../music/cipher.mp3');
    await page.getByRole('button', { name: 'Volver atrás', exact: true }).tap();
    await expect(page.getByRole('heading', { name: 'Chispa', exact: true })).toBeFocused();
    await expect(music).toHaveAttribute('src', '../music/life-of-riley.mp3');
    await page.getByRole('button', { name: 'Volver atrás', exact: true }).tap();
    await expect(page.getByRole('heading', { name: 'Hora de trabajar', exact: true })).toBeFocused();
    await expect(music).toHaveAttribute('src', '../music/dream-culture.mp3');
    await page.screenshot({ path: 'artifacts/story-back-mobile.png', animations: 'disabled' });
    await page.getByRole('button', { name: 'Continuar', exact: true }).tap();
    await expect(page.getByRole('heading', { name: 'Chispa', exact: true })).toBeFocused();
    await page.getByRole('button', { name: 'Continuar', exact: true }).tap();
    await expect(page.getByRole('heading', { name: 'El circuito de la radio', exact: true })).toBeFocused();
    await expect(music).toHaveAttribute('src', '../music/cipher.mp3');
    expect(await readCampaign(page)).toEqual(saved);
  } finally { await context.close(); }
});

test('rereading the ending does not unlock chapters; reload resumes the saved position', async ({ page }) => {
  await open(page, at('ending'));
  const saved = await readCampaign(page);
  await page.getByRole('button', { name: 'Volver atrás', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Una historia para contar', exact: true })).toBeFocused();
  await expect(page.getByRole('button', { name: 'Terminar capítulo' })).toHaveCount(0);
  expect(await readCampaign(page)).toEqual(saved);
  await page.reload();
  await expect(page.getByRole('button', { name: 'Terminar capítulo' })).toBeVisible();
  expect((await readCampaign(page)).completed).toEqual([]);
  await page.getByRole('button', { name: 'Terminar capítulo' }).click();
  await expect(page.getByRole('button', { name: /Capítulo 2\. Brote.*Empezar/ })).toBeEnabled();
});
