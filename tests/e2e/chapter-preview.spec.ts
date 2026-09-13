import { expect, test } from '@playwright/test';
import { access, readFile, readdir, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { createDraft } from '../../scripts/chapter-files';
import { chapterCatalog } from '../../src/adventure/chapters/catalog';

const saveKeys = ['matefaciles:campaign:v1', 'matefaciles:adventure:v1', 'little-robot-lab:v1'];

test.describe('development chapter preview', () => {
  test.skip(Boolean(process.env.TEST_PRODUCTION), 'Preview is deliberately excluded from production');

  test('jumps to games, resets test progress, and never reads or writes real saves/preferences', async ({ page }) => {
    await page.addInitScript(keys => {
      const calls: string[] = [];
      Object.assign(window, { previewStorageCalls: calls });
      for (const key of keys) localStorage.setItem(key, `untouched:${key}`);
      const get = Storage.prototype.getItem, set = Storage.prototype.setItem;
      Storage.prototype.getItem = function (key) { if (this === localStorage && keys.includes(key)) calls.push(`read:${key}`); return get.call(this, key); };
      Storage.prototype.setItem = function (key, value) { if (this === localStorage && keys.includes(key)) calls.push(`write:${key}`); return set.call(this, key, value); };
    }, saveKeys);
    await page.goto('/?chapter-preview=chispa-radio&scene=radio-cables&name=Lucía&character=girl&level=3');
    await expect(page.getByRole('heading', { name: 'Vista previa de capítulos' })).toBeVisible();
    await expect(page.locator('.pipe-board')).toBeVisible();
    const tile = page.locator('.pipe-tile').first();
    const rotation = await tile.getAttribute('data-rotation');
    await tile.click();
    await expect(tile).not.toHaveAttribute('data-rotation', rotation!);
    await page.getByRole('button', { name: 'Aplicar y reiniciar' }).click();
    await expect(tile).toHaveAttribute('data-rotation', rotation!);
    await page.screenshot({ path: 'artifacts/chapter-preview-desktop.png', fullPage: true });

    await page.getByRole('combobox', { name: 'Escena', exact: true }).selectOption('build-start');
    await page.getByRole('button', { name: 'Aplicar y reiniciar' }).click();
    await expect(page.locator('.factory')).toBeVisible();
    await page.getByRole('combobox', { name: 'Escena', exact: true }).selectOption('message');
    await page.getByLabel('Nombre', { exact: true }).fill('');
    await page.getByLabel('Nombre', { exact: true }).pressSequentially('Ada');
    await expect(page.getByLabel('Nombre', { exact: true })).toBeFocused();
    await page.getByRole('button', { name: 'Aplicar y reiniciar' }).click();
    await expect(page.getByText('—Ada, ¿dónde estás? Te estamos esperando para comer.')).toBeVisible();
    await page.getByRole('button', { name: 'Activar sonido', exact: true }).click();
    await page.getByRole('combobox', { name: 'Escena', exact: true }).selectOption('ending');
    await page.getByRole('button', { name: 'Aplicar y reiniciar' }).click();
    await page.getByRole('button', { name: 'Terminar capítulo' }).click();
    await expect(page.getByRole('heading', { name: 'Capítulo terminado (sin guardar)' })).toBeVisible();
    expect(await page.evaluate(() => (window as unknown as { previewStorageCalls: string[] }).previewStorageCalls)).toEqual([]);
    expect(await page.evaluate(keys => keys.map(key => localStorage[key]), saveKeys)).toEqual(saveKeys.map(key => `untouched:${key}`));
    await page.reload();
    await expect(page.getByRole('button', { name: 'Terminar capítulo' })).toBeVisible();
    expect(await page.evaluate(() => (window as unknown as { previewStorageCalls: string[] }).previewStorageCalls)).toEqual([]);
  });

  test('reports invalid links and lets authors recover; controls fit a phone', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/?chapter-preview=missing');
    await expect(page.getByRole('alert')).toContainText('Unknown chapter: missing');
    await page.getByRole('combobox', { name: 'Capítulo', exact: true }).selectOption('chispa-radio');
    await expect(page.getByRole('heading', { name: 'Un mensaje para ti' })).toBeAttached();
    await page.goto('/?chapter-preview=chispa-radio&scene=missing');
    await expect(page.getByRole('alert')).toContainText('Unknown scene: missing');
    await page.getByRole('combobox', { name: 'Escena', exact: true }).selectOption('robot-introduction');
    await page.getByRole('button', { name: 'Aplicar y reiniciar' }).click();
    await expect(page.getByRole('heading', { name: 'Chispa', exact: true })).toBeAttached();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const canvas = await page.locator('.chapter-preview-screen').boundingBox();
    const backdrop = page.locator('.cinematic-backdrop');
    expect(Math.abs((await backdrop.boundingBox())!.y - canvas!.y)).toBeLessThan(1);
    await expect.poll(() => backdrop.locator('img').evaluate(element => (element as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
    await page.screenshot({ path: 'artifacts/chapter-preview-mobile.png', fullPage: true });
  });

  test('discovers a generated unpublished draft without unlocking it on the real homepage', async ({ page }) => {
    // Use an unused catalogue entry and exclusive creation; never overwrite an author's draft.
    let id: string | undefined;
    for (const entry of chapterCatalog.filter(entry => !entry.chapter)) {
      const files = [join('src/adventure/drafts', `${entry.id}.ts`), join('src/adventure/chapters', `${entry.id}.ts`)];
      if ((await Promise.all(files.map(file => access(file).then(() => true, () => false)))).every(exists => !exists)) { id = entry.id; break; }
    }
    test.skip(!id, 'All catalogue entries already have authored files');
    const path = await createDraft(process.cwd(), id!, chapterCatalog);
    try {
      // File watching is asynchronous. Wait for Vite's glob invalidation before
      // navigating, rather than racing its add event and WebSocket connection.
      await expect.poll(async () => (await page.request.get('/src/authoring/sources.ts')).text()).toContain(`${id}.ts`);
      await page.goto(`/?chapter-preview=${id}`);
      await expect(page.getByRole('heading', { name: 'TODO: presentación', exact: true })).toBeAttached();
      await page.getByRole('combobox', { name: 'Escena', exact: true }).selectOption('connections');
      await page.getByRole('button', { name: 'Aplicar y reiniciar' }).click();
      await expect(page.locator('.pipe-board')).toBeVisible();
      await page.goto('/');
      await expect(page.getByRole('heading', { name: 'Una aventura espacial', exact: true })).toBeVisible();
      await expect(page.getByText('TODO:', { exact: false })).toHaveCount(0);
      await expect(page.getByRole('button', { name: 'Capítulo 2. Bloqueado. Completa el capítulo 1.' })).toBeDisabled();
    } finally { await unlink(path); }
  });
});

test('production ignores preview URLs and contains no authoring modules', async ({ page }) => {
  test.skip(!process.env.TEST_PRODUCTION, 'Build dist/ first');
  const files = (await readdir('dist/assets')).filter(file => file.endsWith('.js'));
  for (const file of files) {
    expect(file).not.toMatch(/ChapterPreview|preview-progress|chapter-tools/);
    const body = await readFile(join('dist/assets', file), 'utf8');
    expect(body).not.toContain('Vista previa de capítulos');
    expect(body).not.toContain('Unpublished draft.');
  }
  await page.goto('/?chapter-preview=chispa-radio&scene=radio-cables');
  await expect(page.getByRole('heading', { name: 'Una aventura espacial', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Vista previa de capítulos' })).toHaveCount(0);
  await expect(page.locator('.pipe-board')).toHaveCount(0);
});
