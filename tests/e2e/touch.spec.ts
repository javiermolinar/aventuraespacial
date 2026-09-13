import { test, expect } from '@playwright/test';
import { solveCurrent } from './helpers';

test('a finger can drag a factory part onto its matching silhouette', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, reducedMotion: 'reduce' });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:4173/games/robot-lab.html?level=1');
  await solveCurrent(page);
  await expect(page.getByRole('button', { name: /^Arrastrar / })).toBeVisible();
  // Match a real gesture: wait for the mobile layout and drop animation to be actionable.
  await page.getByRole('button', { name: /^Arrastrar / }).click({ trial: true });
  const source = await page.getByRole('button', { name: /^Arrastrar / }).boundingBox();
  const target = await page.getByRole('button', { name: /^Encajar / }).boundingBox();
  const session = await context.newCDPSession(page);
  const start = { x: source!.x + source!.width / 2, y: source!.y + source!.height / 2 };
  const end = { x: target!.x + target!.width / 2, y: target!.y + target!.height / 2 };
  await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...start, id: 1 }] });
  for (let step = 1; step <= 20; step++) {
    await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: start.x + (end.x - start.x) * step / 20, y: start.y + (end.y - start.y) * step / 20, id: 1 }] });
  }
  await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '1');
  await context.close();
});
