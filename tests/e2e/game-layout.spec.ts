import { expect, test } from '@playwright/test';
import { chispaChapter as chapter } from '../../src/adventure/chapters/chispa';
import { adventureStorageKey, earnPart, moveTo, newAdventure, placePart } from '../../src/adventure/progress';

for (const game of ['maths', 'wires', 'practice'] as const) {
  test(`${game} uses the viewport on wide screens and remains usable on phones`, async ({ page }) => {
    let progress = newAdventure(chapter, 0);
    for (const id of ['plan', 'workshop', 'build-start']) progress = moveTo(progress, chapter, id);
    if (game === 'wires') {
      for (let i = 0; i < 6; i++) progress = placePart(earnPart(progress, chapter), chapter);
      progress = moveTo(progress, chapter, 'radio-cables');
    }
    await page.addInitScript(({ key, progress }) => localStorage.setItem(key, JSON.stringify(progress)), { key: adventureStorageKey, progress });
    await page.goto(game === 'practice' ? '/games/robot-lab.html?level=1' : '/games/adventure.html');
    for (const [width, height] of [[1920, 1080], [2560, 1440], [1440, 900], [768, 1024], [390, 844], [844, 390]]) {
      await page.setViewportSize({ width, height });
      // Dynamic viewport units settle after the resize event, not setViewportSize's return.
      await page.evaluate(async () => { await document.fonts.ready; await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))); });
      const content = page.locator(game === 'wires' ? '.pipe-console' : '.workshop-grid');
      const box = (await content.boundingBox())!;
      expect(box.width).toBeGreaterThan(width * .9);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      if (width >= 1440) {
        expect(box.y + box.height).toBeGreaterThanOrEqual(height - 30);
        expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBeLessThanOrEqual(height + 1);
        if (game === 'wires') expect((await page.locator('.pipe-board').boundingBox())!.width).toBeGreaterThan(400);
      }
      if (game === 'wires') {
        const board = (await page.locator('.pipe-board').boundingBox())!;
        const label = (await page.locator('.cable-return-label').boundingBox())!;
        expect(label.y).toBeGreaterThan(board.y + board.height * 1.09);
        expect((await page.locator('.pipe-tile').first().boundingBox())!.width).toBeGreaterThanOrEqual(44);
        await page.getByRole('button', { name: 'Ayuda', exact: true }).scrollIntoViewIfNeeded();
        await expect(page.getByRole('button', { name: 'Ayuda', exact: true })).toBeInViewport();
      } else {
        const robot = (await page.locator('.robot-container').boundingBox())!;
        const belt = (await page.locator('.conveyor').boundingBox())!;
        expect(robot.x + robot.width / 2).toBeCloseTo(belt.x + belt.width / 2, 0);
        await page.locator('.keypad button').first().scrollIntoViewIfNeeded();
        await expect(page.locator('.keypad button').first()).toBeInViewport();
      }
      await page.evaluate(() => scrollTo(0, 0));
      await page.screenshot({ path: `artifacts/full-viewport-${game}-${width}x${height}.png`, fullPage: true });
    }
  });
}
