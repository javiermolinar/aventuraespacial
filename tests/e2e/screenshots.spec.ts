import { test, expect, type Page } from '@playwright/test';
import { answer, readOperation, solveCurrent } from './helpers';

async function capture(page: Page, path: string) {
  await page.evaluate(() => document.fonts.ready);
  // These are visual artifacts, not timing assertions: let JS-driven entrance fades settle.
  await page.waitForTimeout(650);
  await page.screenshot({ path, fullPage: true });
}

test('settled desktop and mobile visual previews', async ({ page }) => {
  await page.goto('/');
  await capture(page, 'artifacts/preview-landing.png');
  await page.goto('/games/robot-lab.html?level=1');
  await expect(page.getByRole('heading', { name: 'Consigue la cabeza' })).toBeVisible();
  await capture(page, 'artifacts/preview-factory.png');
  await solveCurrent(page);
  await capture(page, 'artifacts/preview-falling-piece.png');
  await page.setViewportSize({ width: 390, height: 844 });
  await capture(page, 'artifacts/preview-mobile-piece.png');
  await page.goto('/games/robot-lab.html?level=1');
  await capture(page, 'artifacts/preview-mobile-factory.png');
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/games/robot-lab.html?level=4');
  const operation = await readOperation(page);
  expect(operation.operator).toBe('+');
  await capture(page, 'artifacts/preview-intermediate-sum.png');
  await answer(page, operation.a % 10 + operation.b % 10);
  await capture(page, 'artifacts/preview-carry-number.png');
});
