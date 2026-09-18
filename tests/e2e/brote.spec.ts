import { expect, test, type Page } from '@playwright/test';
import { broteChapter as chapter, broteScript } from '../../src/adventure/chapters/brote';
import { chispaChapter } from '../../src/adventure/chapters/chispa';
import { chapterCatalog } from '../../src/adventure/chapters/catalog';
import { campaignStorageKey, completeChapter, newCampaign, recordChapter } from '../../src/adventure/campaign';
import { previewProgress } from '../../src/authoring/preview-progress';
import { puzzles, rotate } from '../../src/games/shape-box/puzzle';
import { completeAdventureSetup } from './adventure-setup';
import { readAdventure, readCampaign } from './adventure-saves';
import { placeByTap, solveCurrent } from './helpers';

const puzzle = puzzles[broteScript.game.puzzleIndex];
const firstPieceSize = puzzle.pieces[0].cells.length;

function unlocked() {
  const first = previewProgress(chispaChapter, { sceneId: 'ending', mathsLevel: 0, character: 'girl', playerName: 'Ada' });
  return completeChapter(recordChapter(newCampaign(chapterCatalog), chapterCatalog, first), chapterCatalog, chispaChapter.id);
}
async function seed(page: Page, game = false) {
  let campaign = unlocked();
  if (game) campaign = recordChapter(campaign, chapterCatalog, previewProgress(chapter, { sceneId: 'supply-boxes', mathsLevel: 0, character: 'girl', playerName: 'Ada' }));
  await page.goto('/');
  await page.evaluate(({ key, campaign }) => localStorage.setItem(key, JSON.stringify(campaign)), { key: campaignStorageKey, campaign });
  await page.goto(game ? '/games/adventure.html' : '/');
}
async function placeBox(page: Page, id: string) {
  const target = puzzle.solution[id];
  const piece = puzzle.pieces.find(piece => piece.id === id)!;
  for (let i = 0; i < target.turns; i++) {
    await page.getByRole('button', { name: `Girar pieza ${id}`, exact: true }).focus();
    await page.keyboard.press('Enter');
  }
  await page.getByRole('button', { name: `Pieza ${id}`, exact: true }).focus();
  await page.keyboard.press('Enter');
  const anchor = rotate(piece.cells, target.turns)[0];
  await page.getByRole('button', { name: `Fila ${target.y + anchor.y + 1}, columna ${target.x + anchor.x + 1}: vacía`, exact: true }).focus();
  await page.keyboard.press('Enter');
}

test('Brote plays from hunger through construction, boxes and food, then unlocks only Rayo', async ({ page }) => {
  await seed(page);
  await page.getByRole('button', { name: /Capítulo 2\. Brote.*Empezar/ }).click();
  await completeAdventureSetup(page, 'Ada', 'Niña');
  await expect(page.getByText(/Nada puede ir más rápido que la luz, Ada/)).toBeVisible();
  await page.getByRole('button', { name: 'Buscar comida' }).click();
  await page.getByRole('button', { name: 'Junto a la jarra de agua.' }).click();
  await expect(page.getByRole('button', { name: 'Junto a la jarra de agua.' })).toHaveClass(/is-incorrect/);
  await page.getByRole('button', { name: 'En la estantería más alta del almacén.' }).click();
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await page.getByRole('button', { name: 'Construir a Brote', exact: true }).click();
  for (let i = 0; i < 6; i++) {
    await expect(page.locator('.packing-board')).toHaveCount(0);
    await solveCurrent(page);
    await placeByTap(page);
  }
  await expect(page.getByRole('heading', { name: 'Brote', exact: true })).toBeFocused();
  expect((await readAdventure(page)).placedCount).toBe(6);
  await page.getByRole('button', { name: 'Ordenar las cajas' }).click();
  await expect(page.getByRole('heading', { name: 'Cada caja en su sitio' })).toBeFocused();
  await expect(page.locator('.packing-board')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Siguiente caja' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Continuar', exact: true })).toHaveCount(0);
  await placeBox(page, 'A');
  const partial = await readAdventure(page);
  await page.getByRole('button', { name: 'Volver atrás' }).click();
  await expect(page.getByRole('heading', { name: 'Brote', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await expect(page.locator('.packing-cell.is-filled')).toHaveCount(firstPieceSize);
  expect(await readAdventure(page)).toEqual(partial);
  await page.getByRole('button', { name: 'Volver al inicio' }).click();
  await page.reload();
  await page.getByRole('button', { name: 'Continuar aventura', exact: true }).click();
  await expect(page.locator('.packing-cell.is-filled')).toHaveCount(firstPieceSize);
  expect(await readAdventure(page)).toEqual(partial);
  for (const piece of puzzle.pieces.slice(1)) await placeBox(page, piece.id);
  await expect(page.getByRole('button', { name: 'Continuar', exact: true })).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: 'Continuar aventura', exact: true }).click();
  await expect(page.locator('.packing-cell.is-filled')).toHaveCount(puzzle.width * puzzle.height);
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await expect(page.getByText(/Dentro hay manzanas y pan/)).toBeVisible();
  await page.getByRole('button', { name: 'Volver atrás' }).click();
  await expect(page.getByRole('heading', { name: 'Brote', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await expect(page.getByText(/Dentro hay manzanas y pan/)).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Por fin, barriga llena' })).toBeAttached();
  await expect(page.locator('.retell-prompt')).toHaveCount(0);
  expect((await readCampaign(page)).completed).toEqual([chispaChapter.id]);
  await page.getByRole('button', { name: 'Terminar capítulo' }).click();
  await expect(page.getByRole('button', { name: 'Capítulo 3. Rayo. Próximamente.', exact: true })).toBeDisabled();
  expect((await readCampaign(page)).completed).toEqual([chispaChapter.id, chapter.id]);
});

test('box activity fits desktop, phone, tablet and short landscape; skipping continues without completing the chapter', async ({ page }) => {
  await seed(page, true);
  await expect(page.locator('.packing-board')).toBeVisible();
  for (const [width, height] of [[1440, 1000], [768, 1024], [390, 844], [320, 568], [844, 390]]) {
    await page.setViewportSize({ width, height });
    await page.evaluate(async () => { await document.fonts.ready; });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `artifacts/brote-boxes-${width}x${height}.png`, fullPage: true });
  }
  await page.getByRole('button', { name: 'Saltar', exact: true }).click();
  await expect(page.getByText(/Dentro hay manzanas y pan/)).toBeVisible();
  expect((await readCampaign(page)).completed).toEqual([chispaChapter.id]);
});

test('blocked storage still preserves box moves across Home and rereading in memory', async ({ page }) => {
  const campaign = recordChapter(unlocked(), chapterCatalog, previewProgress(chapter, { sceneId: 'supply-boxes', mathsLevel: 0, character: 'girl', playerName: 'Ada' }));
  await page.addInitScript(({ key, campaign }) => {
    Object.defineProperty(window, 'localStorage', { value: {
      getItem: (requested: string) => requested === key ? JSON.stringify(campaign) : null,
      setItem: () => { throw new Error('blocked'); },
    } });
  }, { key: campaignStorageKey, campaign });
  await page.goto('/games/adventure.html');
  await expect(page.getByText(/No se puede guardar el progreso/)).toBeVisible();
  await placeBox(page, 'A');
  await page.getByRole('button', { name: 'Volver al inicio' }).click();
  await page.getByRole('button', { name: 'Continuar aventura', exact: true }).click();
  await expect(page.locator('.packing-cell.is-filled')).toHaveCount(firstPieceSize);
  await page.getByRole('button', { name: 'Volver atrás' }).click();
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await expect(page.locator('.packing-cell.is-filled')).toHaveCount(firstPieceSize);
  for (const piece of puzzle.pieces.slice(1)) await placeBox(page, piece.id);
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await expect(page.getByText(/Dentro hay manzanas y pan/)).toBeVisible();
});
