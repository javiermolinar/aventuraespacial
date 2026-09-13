import { expect, test, type Page } from '@playwright/test';
import { completeAdventureSetup } from './adventure-setup';
import { readCampaign, seedLegacyAdventure } from './adventure-saves';
import { chispaChapter as chapter } from '../../src/adventure/chapters/chispa';
import { chapterCatalog } from '../../src/adventure/chapters/catalog';
import { earnPart, moveTo, newAdventure, placePart } from '../../src/adventure/progress';
import { destinations } from '../../src/adventure/types';
import { campaignStorageKey, newCampaign, recordChapter } from '../../src/adventure/campaign';
import { adventureStorageKey } from '../../src/adventure/progress';

// Check actual production requests, including modulepreloads, not just source-level imports.
test.skip(!process.env.TEST_PRODUCTION, 'These checks enforce production chunk boundaries');

function scripts(page: Page) {
  const requested: string[] = [];
  page.on('request', request => {
    const file = new URL(request.url()).pathname.split('/').at(-1)!;
    if (file.endsWith('.js')) requested.push(file);
  });
  return {
    has: (chunk: string) => requested.some(file => file.startsWith(`${chunk}-`)),
    count: (chunk: string) => requested.filter(file => file.startsWith(`${chunk}-`)).length,
  };
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

test('home defers the narrative, setup warms it, and neither downloads games', async ({ page }) => {
  const requested = scripts(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Una aventura espacial', exact: true })).toBeVisible();
  await page.waitForLoadState('networkidle');
  for (const chunk of ['NarrativeView', 'AdventureSetupDialog', 'BuildActivity', 'PipePuzzle', 'Robot', 'robot-lab']) expect(requested.has(chunk), chunk).toBe(false);

  await page.getByRole('button', { name: 'Empezar aventura' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  expect(requested.has('AdventureSetupDialog')).toBe(true);
  await page.waitForLoadState('networkidle');
  expect(requested.has('NarrativeView')).toBe(true);
  for (const chunk of ['BuildActivity', 'PipePuzzle', 'Robot', 'robot-lab']) expect(requested.has(chunk), chunk).toBe(false);
  await page.evaluate(() => {
    const state = { loadingShown: false };
    Object.assign(window, { warmStoryStart: state });
    new MutationObserver(records => {
      if (records.some(record => [...record.addedNodes].some(node => node.textContent?.includes('Cargando…')))) state.loadingShown = true;
    }).observe(document.getElementById('root')!, { childList: true, subtree: true });
  });
  await completeAdventureSetup(page);
  await expect(page.getByRole('heading', { name: 'Un mensaje para ti' })).toBeFocused();
  expect(await page.evaluate(() => (window as unknown as { warmStoryStart: { loadingShown: boolean } }).warmStoryStart.loadingShown)).toBe(false);
  await page.waitForLoadState('networkidle');
  expect(requested.count('NarrativeView')).toBe(1);
  for (const chunk of ['BuildActivity', 'PipePuzzle', 'Robot', 'robot-lab']) expect(requested.has(chunk), chunk).toBe(false);
});

for (const [orientation, saved, character] of [
  ['landscape', 'fresh', 'boy'], ['portrait', 'fresh', 'boy'],
  ['landscape', 'campaign', 'girl'], ['portrait', 'campaign', 'girl'],
  ['portrait', 'legacy', 'girl'], ['portrait', 'corrupt', 'boy'], ['portrait', 'blocked', 'boy'],
] as const) {
  test(`preloads only matching ${orientation} artwork before React (${saved})`, async ({ page }) => {
    await page.setViewportSize(orientation === 'portrait' ? { width: 390, height: 844 } : { width: 1440, height: 1000 });
    const progress = newAdventure(chapter, 0, 'girl', 'Ada');
    const campaign = recordChapter(newCampaign(chapterCatalog), chapterCatalog, progress);
    await page.addInitScript(({ saved, campaign, progress, campaignKey, legacyKey }) => {
      if (saved === 'campaign') localStorage.setItem(campaignKey, JSON.stringify(campaign));
      if (saved === 'legacy' || saved === 'corrupt') localStorage.setItem(legacyKey, JSON.stringify(progress));
      if (saved === 'corrupt') localStorage.setItem(campaignKey, '{broken');
      if (saved === 'blocked') Object.defineProperty(window, 'localStorage', { get() { throw new Error('blocked'); } });
    }, { saved, campaign, progress, campaignKey: campaignStorageKey, legacyKey: adventureStorageKey });
    const images: string[] = [];
    page.on('request', request => {
      const path = new URL(request.url()).pathname;
      if (path.endsWith('.webp')) images.push(path);
    });
    let release!: () => void;
    const rendering = new Promise<void>(resolve => { release = resolve; });
    await page.route('**/assets/home-*.js', async route => { await rendering; await route.continue(); });
    const expected = chapter.artwork.ship[character][orientation].replace('../', '/');
    try {
      await page.goto('/', { waitUntil: 'commit' });
      await expect.poll(() => images).toEqual([expected]);
      await expect(page.locator('#root')).toBeEmpty();
      release();
      await expect(page.getByRole('heading', { name: 'Una aventura espacial', exact: true })).toBeVisible();
      await page.waitForLoadState('networkidle');
      expect(images).toEqual([expected]);
      expect(await page.locator('.cinematic-backdrop img').evaluate(image => new URL((image as HTMLImageElement).currentSrc).pathname)).toBe(expected);
      expect(await page.evaluate(path => performance.getEntriesByType('resource').filter(entry => new URL(entry.name).pathname === path).map(entry => (entry as PerformanceResourceTiming).initiatorType), expected)).toEqual(['link']);
    } finally { release(); }
  });
}

test('a cold narrative keeps its answer when sound changes after the module resolves', async ({ page }) => {
  await page.goto('/');
  await seedLegacyAdventure(page, newAdventure(chapter, 0, 'girl', 'Ada'));
  await page.goto('/games/adventure.html');
  const answer = page.getByRole('button', { name: 'En la estación Luna.', exact: true });
  await answer.click();
  await expect(answer).toHaveClass(/is-correct/);
  await page.getByRole('button', { name: 'Activar sonido', exact: true }).click();
  await expect(answer).toHaveClass(/is-correct/);
  await expect(page.getByRole('button', { name: 'Continuar', exact: true })).toBeVisible();
});

test('a failed narrative prefetch does not interrupt setup or replace a saved run', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/assets/NarrativeView-*.js', route => route.abort());
  await page.goto('/');
  await seedLegacyAdventure(page, newAdventure(chapter, 0, 'girl', 'Ada'));
  await page.reload();
  await expect(page.getByRole('button', { name: 'Continuar aventura' })).toBeVisible();
  const saved = await readCampaign(page);
  const attempted = page.waitForRequest('**/assets/NarrativeView-*.js');
  await page.getByRole('button', { name: 'Reiniciar capítulo' }).click();
  await attempted;
  await page.waitForLoadState('networkidle');
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('alert')).toHaveCount(0);
  await page.getByRole('textbox', { name: 'Tu nombre' }).fill('Otro nombre');
  await page.getByRole('button', { name: 'Cancelar' }).click();
  expect(await readCampaign(page)).toEqual(saved);
  expect(errors).toEqual([]);
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
