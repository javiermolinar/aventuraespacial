import { expect, test, type Page } from '@playwright/test';
import { chapterCatalog } from '../../src/adventure/chapters/catalog';
import { chispaChapter } from '../../src/adventure/chapters/chispa';
import { broteChapter } from '../../src/adventure/chapters/brote';
import { rayoChapter as chapter } from '../../src/adventure/chapters/rayo';
import { campaignStorageKey, completeChapter, newCampaign, recordChapter } from '../../src/adventure/campaign';
import { previewProgress } from '../../src/authoring/preview-progress';
import type { Character } from '../../src/adventure/types';
import { completeAdventureSetup } from './adventure-setup';
import { readAdventure, readCampaign } from './adventure-saves';
import { placeByTap, solveCurrent } from './helpers';

async function seed(page: Page, sceneId?: string, character: Character = 'girl') {
  let campaign = newCampaign(chapterCatalog);
  for (const [chapter, sceneId] of [[chispaChapter, 'ending'], [broteChapter, 'snack']] as const) {
    campaign = completeChapter(recordChapter(campaign, chapterCatalog,
      previewProgress(chapter, { sceneId, mathsLevel: 0, character, playerName: 'Ada' })), chapterCatalog, chapter.id);
  }
  if (sceneId) campaign = recordChapter(campaign, chapterCatalog, previewProgress(chapter, { sceneId, mathsLevel: 0, character, playerName: 'Ada' }));
  await page.goto('/');
  await page.evaluate(({ key, campaign }) => localStorage.setItem(key, JSON.stringify(campaign)), { key: campaignStorageKey, campaign });
  await page.goto(sceneId ? '/games/adventure.html' : '/');
}
async function place(page: Page, piece: string, slot: string) {
  await page.getByRole('button', { name: piece, exact: true }).click();
  await page.getByRole('button', { name: new RegExp(`^Hueco ${slot},`) }).click();
}

test('Rayo plays from alarm through three-digit subtraction, vocabulary, resistors and restored lights', async ({ page }) => {
  await seed(page);
  await page.getByRole('button', { name: /Capítulo 3\. Rayo.*Empezar/ }).click();
  await completeAdventureSetup(page, 'Ada', 'Niña');
  await expect(page.getByText(/Te despierta en mitad de la noche una alarma/)).toBeVisible();
  await expect(page.getByTestId('background-music')).toHaveAttribute('src', './music/the-descent.mp3');
  await page.getByRole('button', { name: 'Llegar a la cabina' }).click();
  await expect(page.getByText(/ha caído de culo al suelo/)).toBeVisible();
  await page.getByRole('button', { name: 'Porque un meteorito ha dañado el sistema de electricidad.' }).click();
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await page.getByRole('button', { name: 'Construir a Rayo', exact: true }).click();
  expect((await readAdventure(page)).mathsLevel).toBe(13);
  for (let i = 0; i < 6; i++) {
    const operation = await solveCurrent(page);
    expect(operation.operator).toBe('−');
    expect(operation.a).toBeGreaterThanOrEqual(100);
    expect(operation.b).toBeGreaterThanOrEqual(100);
    for (const place of [1, 10, 100]) expect(Math.floor(operation.a / place) % 10).toBeGreaterThanOrEqual(Math.floor(operation.b / place) % 10);
    await placeByTap(page);
  }
  await expect(page.getByText(/Esto es una resistencia/)).toBeVisible();
  await expect(page.getByText('—Ayúdame a colocarla, Ada.')).toBeVisible();
  await expect(page.locator('.robot-introduction-backdrop img')).toHaveAttribute('src', './adventure/chapters/rayo/rayo-introduction-girl-landscape.webp');
  await page.getByRole('button', { name: 'Reparar el circuito' }).click();
  await expect(page.getByRole('navigation', { name: 'Nivel', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Continuar', exact: true })).toHaveCount(0);
  await place(page, 'Puente', 'A');
  const partial = await readAdventure(page);
  await page.getByRole('button', { name: 'Volver atrás' }).click();
  await expect(page.getByText(/Esto es una resistencia/)).toBeVisible();
  await expect(page.locator('.story-review .robot-introduction-backdrop img')).toHaveAttribute('src', './adventure/chapters/rayo/rayo-introduction-girl-landscape.webp');
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  expect(await readAdventure(page)).toEqual(partial);
  await page.getByRole('button', { name: 'Volver al inicio' }).click();
  await page.reload();
  await page.getByRole('button', { name: 'Continuar aventura', exact: true }).click();
  await expect(page.getByRole('button', { name: /^Hueco A,.*Puente/ })).toBeVisible();
  await place(page, 'Resistencia −1', 'B');
  await place(page, 'Resistencia −3', 'C');
  await page.getByRole('button', { name: 'Probar', exact: true }).click();
  await expect(page.getByRole('img', { name: /Rota por exceso/ })).toBeVisible();
  await page.getByRole('button', { name: /^Hueco B,/ }).click();
  await page.getByRole('button', { name: /^Hueco C,/ }).click();
  await page.getByRole('button', { name: 'Probar', exact: true }).click();
  await expect(page.getByRole('img', { name: /Bombilla:.*Encendida/ })).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: 'Continuar aventura', exact: true }).click();
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await expect(page.getByText(/La molesta alarma se calla por fin/)).toBeVisible();
  expect((await readCampaign(page)).completed).toEqual(['chispa-radio', 'brote']);
  await expect(page.getByRole('button', { name: 'Terminar capítulo' })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: '¿Qué es una resistencia?' })).toBeVisible();
  await page.getByRole('button', { name: 'Una batería que envía corriente eléctrica.' }).click();
  await expect(page.getByRole('button', { name: 'Una batería que envía corriente eléctrica.' })).toHaveClass(/is-incorrect/);
  await page.getByRole('button', { name: 'Una pieza que dificulta el paso de la corriente eléctrica.' }).click();
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  expect((await readCampaign(page)).completed).toEqual(['chispa-radio', 'brote']);
  await page.getByRole('button', { name: 'Terminar capítulo' }).click();
  await expect(page.getByRole('button', { name: 'Capítulo 4. Tuerca. Próximamente.', exact: true })).toBeDisabled();
  expect((await readCampaign(page)).completed).toEqual(['chispa-radio', 'brote', 'rayo']);
});

for (const character of ['boy', 'girl'] as const) {
  test(`${character} sleeps under a warm light and keeps calm music through the final question and ending`, async ({ page }) => {
    await seed(page, 'lights-back', character);
    await expect(page.getByRole('heading', { name: '¿Qué es una resistencia?' })).toBeVisible();
    await page.evaluate(async () => { await document.fonts.ready; });
    const image = page.locator('.cinematic-backdrop img');
    await expect(page.getByTestId('background-music')).toHaveAttribute('src', '../music/dream-culture.mp3');
    for (const [width, height] of [[1440, 1000], [390, 844], [768, 1024], [844, 390]]) {
      await page.setViewportSize({ width, height });
      const orientation = height > width ? 'portrait' : 'landscape';
      await expect.poll(() => image.evaluate((img: HTMLImageElement) => img.currentSrc)).toContain(`sleep-${character}-${orientation}.webp`);
      await expect.poll(() => image.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
      await page.screenshot({ path: `artifacts/rayo-sleep-${character}-${width}x${height}.png`, fullPage: true });
    }
    await page.getByRole('button', { name: 'Una pieza que dificulta el paso de la corriente eléctrica.' }).click();
    await page.getByRole('button', { name: 'Continuar', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Terminar capítulo' })).toBeVisible();
    await expect(image).toHaveAttribute('src', `../adventure/chapters/rayo/sleep-${character}-landscape.webp`);
    await expect(page.getByTestId('background-music')).toHaveAttribute('src', '../music/dream-culture.mp3');
  });

  test(`${character} introduction selects its own artwork on desktop, phone, tablet and landscape phone`, async ({ page }) => {
    await seed(page, 'robot-introduction', character);
    const image = page.locator('.robot-introduction-backdrop img');
    for (const [width, height] of [[1440, 1000], [390, 844], [768, 1024], [844, 390]]) {
      await page.setViewportSize({ width, height });
      const orientation = height > width ? 'portrait' : 'landscape';
      await expect.poll(() => image.evaluate((img: HTMLImageElement) => img.currentSrc)).toContain(`rayo-introduction-${character}-${orientation}.webp`);
      await expect.poll(() => image.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.screenshot({ path: `artifacts/rayo-introduction-${character}-${width}x${height}.png`, fullPage: true });
    }
  });
}

test('resistor board fits small screens and can be skipped without completing the chapter', async ({ page }) => {
  await seed(page, 'power-board');
  await expect(page.locator('.pcb-board')).toBeVisible();
  for (const [width, height] of [[1440, 1000], [390, 844], [320, 568], [844, 390]]) {
    await page.setViewportSize({ width, height });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `artifacts/rayo-resistors-${width}x${height}.png`, fullPage: true });
  }
  await page.getByRole('button', { name: 'Saltar', exact: true }).click();
  await expect(page.getByText(/La molesta alarma se calla por fin/)).toBeVisible();
  await page.getByRole('button', { name: 'Volver atrás' }).click();
  await expect(page.getByText(/Esto es una resistencia/)).toBeVisible();
  expect((await readCampaign(page)).completed).toEqual(['chispa-radio', 'brote']);
});
