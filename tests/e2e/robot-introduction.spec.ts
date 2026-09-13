import { expect, test } from '@playwright/test';
import { chispaChapter as chapter } from '../../src/adventure/chapters/chispa';
import { readAdventure } from './adventure-saves';
import { adventureStorageKey, earnPart, moveTo, newAdventure, placePart } from '../../src/adventure/progress';

function completedBuild() {
  let progress = newAdventure(chapter, 0, 'girl', 'Lucía');
  for (const next of ['plan', 'workshop', 'build-start']) progress = moveTo(progress, chapter, next);
  for (let i = 0; i < 6; i++) progress = placePart(earnPart(progress, chapter), chapter);
  return progress;
}

for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }, { width: 768, height: 1024 }, { width: 844, height: 390 }]) {
  test(`Chispa introduction survives resume and fits ${viewport.width} × ${viewport.height}`, async ({ page }) => {
    const progress = completedBuild();
    await page.setViewportSize(viewport);
    await page.goto('/games/adventure.html');
    await page.evaluate(({ key, progress }) => localStorage.setItem(key, JSON.stringify(progress)), { key: adventureStorageKey, progress });
    await page.reload();
    const heading = page.getByRole('heading', { name: 'Chispa', exact: true });
    await expect(heading).toBeFocused();
    await expect(page.getByText(/¡Hola, Lucía!/)).toBeVisible();
    await expect(page.locator('.factory, .pipe-console')).toHaveCount(0);
    const image = page.locator('.robot-introduction-backdrop img');
    const orientation = viewport.height > viewport.width ? 'portrait' : 'landscape';
    await expect.poll(() => image.evaluate(element => (element as HTMLImageElement).currentSrc)).toContain(`chispa-mechanic-${orientation}.webp`);
    await expect.poll(() => image.evaluate(element => (element as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
    await expect(page.locator('.robot-introduction-portrait svg')).toHaveCount(0);
    await page.evaluate(() => document.fonts.ready);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `artifacts/chispa-introduction-${viewport.width}x${viewport.height}.png`, fullPage: true });

    await page.getByRole('button', { name: 'Volver al inicio', exact: true }).click();
    await page.getByRole('button', { name: 'Continuar aventura' }).click();
    await expect(heading).toBeFocused();
    await page.reload();
    await expect(heading).toBeFocused();
    await page.goto('/');
    await page.getByRole('button', { name: 'Continuar aventura' }).click();
    await expect(heading).toBeFocused();
    await expect.poll(() => image.evaluate(element => (element as HTMLImageElement).currentSrc)).toContain(`/adventure/chapters/chispa-radio/chispa-mechanic-${orientation}.webp`);
    await expect.poll(() => image.evaluate(element => (element as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
    // Large text must scroll, not clip the continuation button or force horizontal scrolling.
    await page.addStyleTag({ content: '.robot-introduction .story-passage { font-size: 30px; }' });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.getByRole('button', { name: 'Arreglar la radio.' }).click();
    await expect(page.getByRole('heading', { name: 'El circuito de la radio', exact: true })).toBeFocused();
    await expect(page.locator('.robot-introduction')).toHaveCount(0);
    await page.reload();
    await page.getByRole('button', { name: 'Continuar aventura' }).click();
    await expect(page.getByRole('heading', { name: 'El circuito de la radio', exact: true })).toBeFocused();
    const saved = await readAdventure(page);
    expect(saved).toMatchObject({ sceneId: 'radio-cables', placedCount: 6, operations: progress.operations });
    expect(saved.history.filter((id: string) => id === 'build-start')).toHaveLength(1);
    expect(await page.evaluate(() => localStorage.getItem('little-robot-lab:v1'))).toBeNull();
  });
}
