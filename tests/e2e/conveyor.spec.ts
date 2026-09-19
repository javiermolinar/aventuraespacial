import { expect, test } from '@playwright/test';
import { chispaChapter as chapter } from '../../src/adventure/chapters/chispa';
import { adventureStorageKey, earnPart, moveTo, newAdventure, placePart } from '../../src/adventure/progress';
import { readAdventure } from './adventure-saves';
import { placeByTap, readOperation, solveCurrent } from './helpers';

for (const [level, seconds] of [[1, 8], [4, 6.5], [11, 3]]) {
  test(`practice level ${level} gives ${seconds} seconds to catch the piece`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.clock.install();
    await page.goto(`/games/robot-lab.html?level=${level}`);
    await solveCurrent(page);
    const piece = page.getByRole('button', { name: /^Arrastrar / });
    await expect(piece).toHaveAccessibleDescription(new RegExp(`^Tienes ${String(seconds).replace('.', ',')} segundos`));
    const beltDuration = await page.locator('.belt').evaluate(element => parseFloat(getComputedStyle(element).animationDuration));
    expect(beltDuration).toBeCloseTo(seconds / 10);
    await page.clock.fastForward(seconds * 1000 - 1_000);
    await expect(piece).toBeVisible();
    await page.clock.fastForward(2_000);
    await expect(page.getByText('¡Se fue la pieza! Resuelve otra vez para recuperarla.')).toBeVisible();
  });
}

test('a missed practice piece repeats the whole operation and preserves placed parts', async ({ page }) => {
  await page.clock.install();
  await page.goto('/games/robot-lab.html?level=4');
  await solveCurrent(page);
  await placeByTap(page);
  const operation = await solveCurrent(page);
  await page.clock.fastForward(9_000);
  await expect(page.getByText('¡Se fue la pieza! Resuelve otra vez para recuperarla.')).toBeVisible();
  expect(await readOperation(page)).toEqual(operation);
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '1');
  await expect(page.getByRole('button', { name: 'Comprobar', exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: /^Arrastrar / })).toHaveCount(0);
  await solveCurrent(page);
  const piece = page.getByRole('button', { name: /^Arrastrar / });
  await expect(piece).toBeFocused();
  await piece.press('Enter');
  await page.clock.fastForward(20_000);
  await expect(piece).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: /^Encajar / })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '2');
});

test('the piece travels across the belt, stops under the pointer and resumes after a wrong drop', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.clock.install();
  await page.goto('/games/robot-lab.html?level=1');
  await solveCurrent(page);
  await page.clock.runFor(800);
  const piece = page.getByRole('button', { name: /^Arrastrar / });
  const start = (await piece.boundingBox())!;
  await page.clock.runFor(2_000);
  const moving = (await piece.boundingBox())!;
  expect(moving.x).toBeGreaterThan(start.x + 40);
  await page.screenshot({ path: 'artifacts/conveyor-desktop.png', fullPage: true });
  await page.mouse.move(moving.x + moving.width / 2, moving.y + moving.height / 2);
  await page.mouse.down();
  await expect(piece).toHaveAttribute('aria-pressed', 'true');
  const caught = (await piece.boundingBox())!;
  await page.clock.fastForward(20_000);
  expect((await piece.boundingBox())!.x).toBeCloseTo(caught.x, 0);
  await page.mouse.move(20, 20, { steps: 10 });
  await page.mouse.up();
  await expect(piece).toHaveAttribute('aria-pressed', 'false');
  await page.clock.runFor(1_000);
  expect((await piece.boundingBox())!.x).toBeGreaterThan(caught.x + 20);
  await page.clock.fastForward(6_000);
  await expect(page.getByRole('heading', { name: 'Consigue la cabeza' })).toBeVisible();
});

test('a real touch drag catches and places a moving piece on a phone', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, reducedMotion: 'no-preference' });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:4173/games/robot-lab.html?level=1');
  await solveCurrent(page);
  await expect(page.locator('.conveyor-seconds')).toHaveText('6 s');
  await page.screenshot({ path: 'artifacts/conveyor-mobile.png', fullPage: true });
  const source = (await page.getByRole('button', { name: /^Arrastrar / }).boundingBox())!;
  const target = (await page.getByRole('button', { name: /^Encajar / }).boundingBox())!;
  const session = await context.newCDPSession(page);
  const start = { x: source.x + source.width / 2, y: source.y + source.height / 2 };
  const end = { x: target.x + target.width / 2, y: target.y + target.height / 2 };
  await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...start, id: 1 }] });
  for (let step = 1; step <= 20; step++) {
    await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: start.x + (end.x - start.x) * step / 20, y: start.y + (end.y - start.y) * step / 20, id: 1 }] });
  }
  await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '1');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await context.close();
});

test('a cancelled touch over the matching outline returns the piece without placing it', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, reducedMotion: 'reduce' });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:4173/games/robot-lab.html?level=1');
  await solveCurrent(page);
  const piece = page.getByRole('button', { name: /^Arrastrar / });
  const source = (await piece.boundingBox())!;
  const target = (await page.getByRole('button', { name: /^Encajar / }).boundingBox())!;
  const session = await context.newCDPSession(page);
  await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: source.x + source.width / 2, y: source.y + source.height / 2, id: 1 }] });
  await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: target.x + target.width / 2, y: target.y + target.height / 2, id: 1 }] });
  await expect(piece).toHaveAttribute('aria-pressed', 'true');
  await session.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
  await expect(piece).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('.conveyor')).toHaveClass(/running/);
  await placeByTap(page);
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '1');
  await context.close();
});

test('reduced motion keeps the piece still while the visible timer counts down', async ({ page }) => {
  await page.clock.install();
  await page.goto('/games/robot-lab.html?level=1');
  await solveCurrent(page);
  const piece = page.getByRole('button', { name: /^Arrastrar / });
  const start = (await piece.boundingBox())!;
  await page.clock.fastForward(4_000);
  expect((await piece.boundingBox())!.x).toBeCloseTo(start.x, 0);
  await expect(page.locator('.conveyor-seconds')).toHaveText('5 s');
  await piece.click();
  await page.clock.fastForward(20_000);
  await expect(page.getByText('¡La tienes! Encájala.')).toBeVisible();
});

test('story review pauses the belt, and missing a piece persists without undoing the robot', async ({ page }) => {
  let progress = newAdventure(chapter, 6);
  for (const id of ['plan', 'workshop', 'build-start']) progress = moveTo(progress, chapter, id);
  progress = earnPart(placePart(earnPart(progress, chapter), chapter), chapter);
  await page.addInitScript(({ key, progress }) => localStorage.setItem(key, JSON.stringify(progress)), { key: adventureStorageKey, progress });
  await page.clock.install();
  await page.goto('/games/adventure.html');
  await expect(page.getByRole('button', { name: 'Arrastrar el cuerpo' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Arrastrar el cuerpo' })).toHaveAccessibleDescription(/^Tienes 5 segundos/);
  await page.getByRole('button', { name: 'Volver atrás', exact: true }).click();
  await page.clock.fastForward(20_000);
  expect((await readAdventure(page)).ready).toBe(true);
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Arrastrar el cuerpo' })).toBeVisible();
  await page.clock.fastForward(6_000);
  await expect(page.getByRole('heading', { name: 'Consigue el cuerpo' })).toBeVisible();
  expect(await readAdventure(page)).toMatchObject({ ready: false, placedCount: 1, operations: progress.operations, sceneId: progress.sceneId });
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Consigue el cuerpo' })).toBeVisible();
  expect(await readOperation(page)).toEqual(progress.operations[1]);
  await solveCurrent(page);
  await placeByTap(page);
  expect((await readAdventure(page)).placedCount).toBe(2);
});
