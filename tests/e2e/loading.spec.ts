import { expect, test, type Page } from '@playwright/test';
import { completeAdventureSetup } from './adventure-setup';
import { readCampaign, seedLegacyAdventure } from './adventure-saves';
import { chispaChapter as chapter } from '../../src/adventure/chapters/chispa';
import { earnPart, moveTo, newAdventure, placePart } from '../../src/adventure/progress';
import { destinations } from '../../src/adventure/types';

// Check actual production requests, including modulepreloads, not just source-level imports.
test.skip(!process.env.TEST_PRODUCTION, 'These checks enforce production chunk boundaries');

function scripts(page: Page) {
  const requested = new Set<string>();
  page.on('request', request => {
    const file = new URL(request.url()).pathname.split('/').at(-1)!;
    if (file.endsWith('.js')) requested.add(file);
  });
  return { has: (chunk: string) => [...requested].some(file => file.startsWith(`${chunk}-`)) };
}

function at(id: string) {
  let progress = newAdventure(chapter, 0, 'girl', 'Lucía');
  while (progress.sceneId !== id) {
    const scene = chapter.scenes[progress.sceneId];
    if (scene.type === 'build') {
      while (progress.placedCount < 6) progress = placePart(earnPart(progress, chapter), chapter);
    } else progress = moveTo(progress, chapter, destinations(scene)[0]);
  }
  return progress;
}

test('home and reading do not download game renderers; setup loads only when opened', async ({ page }) => {
  const requested = scripts(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Una aventura espacial', exact: true })).toBeVisible();
  await page.waitForLoadState('networkidle');
  for (const chunk of ['NarrativeView', 'AdventureSetupDialog', 'BuildActivity', 'PipePuzzle', 'Robot', 'robot-lab']) expect(requested.has(chunk), chunk).toBe(false);

  await page.getByRole('button', { name: 'Empezar aventura' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  expect(requested.has('AdventureSetupDialog')).toBe(true);
  expect(requested.has('NarrativeView')).toBe(false);
  await completeAdventureSetup(page);
  await expect(page.getByRole('heading', { name: 'Un mensaje para ti' })).toBeFocused();
  await page.waitForLoadState('networkidle');
  expect(requested.has('NarrativeView')).toBe(true);
  for (const chunk of ['BuildActivity', 'PipePuzzle', 'Robot', 'robot-lab']) expect(requested.has(chunk), chunk).toBe(false);
});

for (const [sceneId, loaded, deferred, selector] of [
  ['build-start', 'BuildActivity', 'PipePuzzle', '.factory'],
  ['radio-cables', 'PipePuzzle', 'BuildActivity', '.pipe-board'],
] as const) {
  test(`resuming ${sceneId} downloads only that game and retains its save`, async ({ page }) => {
    await page.goto('/');
    const progress = at(sceneId);
    await seedLegacyAdventure(page, progress);
    const requested = scripts(page);
    await page.goto('/games/adventure.html');
    await expect(page.locator(selector)).toBeVisible();
    await page.waitForLoadState('networkidle');
    expect(requested.has(loaded)).toBe(true);
    expect(requested.has(deferred)).toBe(false);
    expect((await readCampaign(page)).chapters[chapter.id]).toEqual(progress);
  });
}

test('navigation remains usable during a slow narrative download and focus moves after loading', async ({ page }) => {
  let release!: () => void;
  const download = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/assets/NarrativeView-*.js', async route => { await download; await route.continue(); });
  try {
    await page.goto('/');
    await page.getByRole('button', { name: 'Empezar aventura' }).click();
    await completeAdventureSetup(page);
    await expect(page.getByRole('status').filter({ hasText: 'Cargando' })).toBeVisible();
    const saved = await readCampaign(page);
    await page.getByRole('button', { name: 'Volver al inicio', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Continuar aventura' })).toBeVisible();
    expect(await readCampaign(page)).toEqual(saved);
    release();
    await page.getByRole('button', { name: 'Continuar aventura' }).click();
    await expect(page.getByRole('heading', { name: 'Un mensaje para ti' })).toBeFocused();
    expect(await readCampaign(page)).toEqual(saved);
  } finally { release(); }
});

test('a failed game download leaves Home and the saved campaign available', async ({ page }) => {
  await page.route('**/assets/BuildActivity-*.js', route => route.abort());
  await page.goto('/');
  const progress = at('build-start');
  await seedLegacyAdventure(page, progress);
  await page.goto('/games/adventure.html');
  await expect(page.getByRole('alert')).toContainText('No se ha podido cargar');
  expect((await readCampaign(page)).chapters[chapter.id]).toEqual(progress);
  await page.getByRole('button', { name: 'Volver al inicio', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Continuar aventura' })).toBeVisible();
  expect((await readCampaign(page)).chapters[chapter.id]).toEqual(progress);
});
