import { test, expect, type Page } from '@playwright/test';
import { answer, readOperation } from './helpers';
import { resultOf, type Operation } from '../../src/lib/maths';
import { chispaChapter as chapter } from '../../src/adventure/chapters/chispa';
import { adventureStorageKey, moveTo, newAdventure } from '../../src/adventure/progress';

async function openScreenshotOperation(page: Page, operation: Operation = { a: 36, b: 25, operator: '+' }) {
  let progress = newAdventure(chapter, 3);
  for (const next of ['plan', 'workshop', 'build-start']) progress = moveTo(progress, chapter, next);
  progress.operations[0] = operation;
  await page.goto('/games/adventure.html');
  await page.evaluate(({ key, progress }) => localStorage.setItem(key, JSON.stringify(progress)), { key: adventureStorageKey, progress });
  await page.reload();
}

async function captureCarry(page: Page, name: string) {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(200);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: `artifacts/carry-${name}.png`, fullPage: true });
}

test('a column carry uses a separate intermediate sum and a draggable number', async ({ page }) => {
  await page.goto('/games/robot-lab.html?level=4');
  const operation = await readOperation(page);
  expect(operation.operator).toBe('+');
  const sum = operation.a % 10 + operation.b % 10;
  await answer(page, sum);
  await expect(page.getByLabel('Suma de las unidades', { exact: true })).toHaveText(String(sum));
  await expect(page.getByLabel('Respuesta de las unidades')).toHaveText(String(sum % 10));
  await expect(page.locator('.math-puzzle .cube, .math-puzzle .rod')).toHaveCount(0);
  await expect(page.locator('.remaining-token strong')).toHaveText(String(sum % 10));
  await page.getByRole('button', { name: 'Llevar 1 decena' }).click({ trial: true });
  const source = await page.getByRole('button', { name: 'Llevar 1 decena' }).boundingBox();
  const target = await page.getByRole('button', { name: 'Decenas: colocar la llevada' }).boundingBox();
  await page.mouse.move(source!.x + source!.width / 2, source!.y + source!.height / 2);
  await page.mouse.down();
  await page.mouse.move(source!.x + source!.width / 2 + 8, source!.y + source!.height / 2 - 8);
  await page.mouse.move(target!.x + target!.width / 2, target!.y + target!.height / 2, { steps: 15 });
  await page.mouse.up();
  await expect(page.locator('.carry-number')).toHaveText('1');
  await expect(page.getByLabel('Respuesta de las unidades')).toHaveText(String(sum % 10));
  await expect(page.getByLabel('Respuesta de las decenas')).toBeFocused();
  await expect(page.locator('.carry-token, .math-puzzle .rod, .math-puzzle .cube')).toHaveCount(0);
  await answer(page, Math.floor(resultOf(operation) / 10));
  await expect(page.getByRole('button', { name: /^Arrastrar / })).toBeVisible();
});

test('36 + 25 uses numeric carrying, remaining units and a tens sum without double-counting', async ({ page }) => {
  await openScreenshotOperation(page);
  await answer(page, 11);
  await captureCarry(page, '36-25-regroup-desktop');
  const carry = page.getByRole('button', { name: 'Llevar 1 decena' });
  const target = page.getByRole('button', { name: 'Decenas: colocar la llevada' });
  // Keyboard selection moves focus to the destination; Enter places the number.
  await carry.focus();
  await page.keyboard.press('Space');
  await expect(target).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByLabel('Llevamos 1 decena')).toHaveText('1');
  await expect(page.getByLabel('Respuesta de las decenas')).toBeFocused();
  await expect(page.getByLabel('Respuesta de las unidades')).toHaveText('1');
  await expect(page.locator('.math-puzzle .cube, .math-puzzle .rod, .carry-token, .intermediate-sum')).toHaveCount(0);
  await captureCarry(page, '36-25-tens-desktop');
  for (const [name, width, height] of [['mobile', 390, 844], ['small-phone', 320, 568], ['landscape', 844, 390]] as const) {
    await page.setViewportSize({ width, height });
    await captureCarry(page, `36-25-tens-${name}`);
  }
  await answer(page, 0);
  await expect(page.getByText('Revisa los números y prueba otra vez.')).toBeVisible();
  await expect(page.getByLabel('Respuesta de las unidades')).toHaveText('1');
  await expect(page.getByLabel('Cálculo de las decenas')).toContainText('3+2+1');
  await captureCarry(page, '36-25-tens-landscape');
  await answer(page, 5);
  await expect(page.getByRole('button', { name: /^Arrastrar / })).toHaveCount(0);
  await answer(page, 6);
  await expect(page.getByRole('button', { name: /^Arrastrar / })).toBeVisible();
});

test('entering 14 keeps the 4 in the result, then asks only for the tens', async ({ page }) => {
  await openScreenshotOperation(page, { a: 28, b: 16, operator: '+' });
  await answer(page, 14);
  await expect(page.getByLabel('Respuesta de las unidades')).toHaveText('4');
  await expect(page.getByLabel('Respuesta de las decenas')).toHaveCount(0);
  await captureCarry(page, '14-keeps-4');
  await page.getByRole('button', { name: 'Llevar 1 decena' }).click();
  await page.getByRole('button', { name: 'Decenas: colocar la llevada' }).click();
  await expect(page.getByLabel('Respuesta de las unidades')).toHaveText('4');
  await expect(page.getByLabel('Respuesta de las decenas')).toHaveText('?');
  await answer(page, 4);
  await expect(page.getByRole('button', { name: /^Arrastrar / })).toBeVisible();
});

test('finger carry handles cancellation, wrong drops and a successful numeric drop', async ({ browser }) => {
  const context = await browser.newContext({ baseURL: 'http://127.0.0.1:4173', viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, reducedMotion: 'reduce' });
  const page = await context.newPage();
  await openScreenshotOperation(page);
  await answer(page, 11);
  const token = page.getByRole('button', { name: 'Llevar 1 decena' });
  const target = page.getByRole('button', { name: 'Decenas: colocar la llevada' });
  await target.evaluate(element => element.scrollIntoView({ block: 'start' }));
  const session = await context.newCDPSession(page);
  async function drag(mode: 'cancel' | 'wrong' | 'correct') {
    await token.click({ trial: true });
    const source = (await token.boundingBox())!, destination = (await target.boundingBox())!;
    const start = { x: source.x + source.width / 2, y: source.y + source.height / 2 };
    const end = mode === 'correct' ? { x: destination.x + destination.width / 2, y: destination.y + destination.height / 2 } : { x: start.x + 100, y: start.y - 30 };
    await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...start, id: 1 }] });
    for (let step = 1; step <= 16; step++) await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: start.x + (end.x - start.x) * step / 16, y: start.y + (end.y - start.y) * step / 16, id: 1 }] });
    await session.send('Input.dispatchTouchEvent', { type: mode === 'cancel' ? 'touchCancel' : 'touchEnd', touchPoints: [] });
  }
  await captureCarry(page, '36-25-regroup-mobile');
  await drag('cancel');
  await expect(token).toHaveAttribute('aria-pressed', 'false');
  await expect(page.getByLabel('Respuesta de las unidades')).toHaveText('1');
  await drag('wrong');
  await expect(token).toHaveAttribute('aria-pressed', 'false');
  await expect(page.getByLabel('Respuesta de las unidades')).toHaveText('1');
  await drag('correct');
  await expect(page.getByLabel('Llevamos 1 decena')).toHaveText('1');
  await expect(page.getByLabel('Respuesta de las unidades')).toHaveText('1');
  await answer(page, 6);
  await expect(page.getByRole('button', { name: /^Arrastrar / })).toBeVisible();
  await context.close();
});

test('local music is opt-in, quiet, looping, and controlled by the sound toggle', async ({ page }) => {
  const externalRequests: string[] = [];
  page.on('request', request => { if (!request.url().startsWith('http://127.0.0.1:4173/')) externalRequests.push(request.url()); });
  await page.goto('/games/robot-lab.html?level=1');
  const audio = page.getByTestId('background-music');
  expect(await audio.evaluate(element => (element as HTMLAudioElement).paused)).toBe(true);
  await page.getByRole('button', { name: 'Activar sonido' }).click();
  await expect.poll(() => audio.evaluate(element => !(element as HTMLAudioElement).paused && (element as HTMLAudioElement).readyState >= 2)).toBe(true);
  expect(await audio.evaluate(element => (element as HTMLAudioElement).volume)).toBe(0.12);
  expect(await audio.evaluate(element => (element as HTMLAudioElement).loop)).toBe(true);
  await page.getByRole('button', { name: 'Desactivar sonido' }).click();
  await expect.poll(() => audio.evaluate(element => (element as HTMLAudioElement).paused)).toBe(true);
  await page.reload();
  await expect(page.getByRole('button', { name: 'Activar sonido' })).toBeVisible();
  expect(externalRequests).toEqual([]);
});

test('keyboard answers and placement work without dragging', async ({ page }) => {
  await page.goto('/games/robot-lab.html?level=1');
  const result = resultOf(await readOperation(page));
  await page.getByRole('button', { name: `Número ${result}`, exact: true }).focus();
  await page.keyboard.press(String(result));
  await page.getByRole('button', { name: 'Comprobar', exact: true }).focus();
  await page.keyboard.press('Enter');
  await page.getByRole('button', { name: /^Arrastrar / }).focus();
  await page.keyboard.press('Enter');
  await page.getByRole('button', { name: /^Encajar / }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '1');
});
