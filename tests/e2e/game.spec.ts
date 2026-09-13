import { test, expect } from '@playwright/test';
import { levels } from '../../src/game';
import { needsExchange, resultOf } from '../../src/lib/maths';
import { answer, dragPiece, placeByTap, readOperation, solveCurrent } from './helpers';

test('distinct robot silhouettes appear above the practice levels; the game has no menus', async ({ page }) => {
  await page.goto('/practice.html');
  await expect(page.locator('html')).toHaveAttribute('lang', 'es');
  await expect(page.locator('.level-card')).toHaveCount(7);
  await expect(page.locator('.robot-silhouette')).toHaveCount(7);
  const collection = await page.locator('.collection-section').boundingBox();
  const picker = await page.locator('.game-picker').boundingBox();
  expect(collection!.y + collection!.height).toBeLessThan(picker!.y);
  const silhouettes = await page.locator('.collection-portrait svg').evaluateAll(elements => elements.map(svg =>
    Array.from(svg.querySelectorAll('path, rect, circle, ellipse')).map(shape =>
      [shape.tagName, ...['d', 'x', 'y', 'rx', 'ry', 'r', 'cx', 'cy', 'width', 'height'].map(name => shape.getAttribute(name))].join(':')
    ).join('|')
  ));
  expect(new Set(silhouettes).size).toBe(7);
  await page.getByRole('link', { name: 'Nivel 1: Primeras cuentas' }).click();
  await expect(page).toHaveURL(/games\/robot-lab.html\?level=1$/);
  await expect(page.getByRole('navigation')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Consigue la cabeza' })).toBeVisible();
  await page.getByRole('link', { name: 'Salir', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Vamos a jugar.' })).toBeVisible();
});

test('wrong answers give no pieces; a completed mixed round reveals and saves its robot', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/games/robot-lab.html?level=1');
  await expect(page.getByRole('button', { name: 'Comprobar', exact: true })).toBeDisabled();
  const operation = await readOperation(page);
  await answer(page, (resultOf(operation) + 1) % 10);
  await expect(page.getByRole('status')).toContainText('prueba otra vez');
  await expect(page.getByRole('button', { name: /^Arrastrar / })).toHaveCount(0);
  await page.getByRole('button', { name: 'Borrar respuesta' }).click();
  const operators = new Set<string>();
  for (let index = 0; index < 4; index++) {
    operators.add((await solveCurrent(page)).operator);
    await expect(page.getByRole('button', { name: 'Colocar pieza', exact: true })).toHaveCount(0);
    await placeByTap(page);
    await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', String(index + 1));
  }
  expect(operators.size).toBe(2);
  await expect(page.getByRole('heading', { name: '¡Lo has conseguido!' })).toBeVisible();
  await page.getByRole('button', { name: 'Otra vez', exact: true }).click();
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
  await solveCurrent(page);
  await page.getByRole('link', { name: 'Salir', exact: true }).click();
  await expect(page.locator('.collected-robot')).toHaveCount(1);
  await expect(page.locator('.robot-silhouette')).toHaveCount(6);
  await page.reload();
  await expect(page.locator('.collected-robot')).toHaveCount(1);
  expect(errors).toEqual([]);
});

test('wrong drops return to the conveyor; the correct outline accepts the part', async ({ page }) => {
  await page.goto('/games/robot-lab.html?level=1');
  await solveCurrent(page);
  await page.getByRole('button', { name: /^Arrastrar / }).click({ trial: true });
  const original = await page.getByRole('button', { name: /^Arrastrar / }).boundingBox();
  await dragPiece(page, false);
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
  await expect(page.getByRole('status')).toContainText('silueta');
  await expect.poll(async () => {
    const box = await page.getByRole('button', { name: /^Arrastrar / }).boundingBox();
    return Math.abs(box!.x - original!.x) + Math.abs(box!.y - original!.y);
  }).toBeLessThan(2);
  await dragPiece(page);
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '1');
});

test('all seven random levels respect the separated carrying skills and remain playable', async ({ page }) => {
  test.setTimeout(120_000);
  for (let level = 0; level < levels.length; level++) {
    await page.goto(`/games/robot-lab.html?level=${level + 1}`);
    const operators = new Set<string>();
    for (let index = 0; index < levels[level].pieceCount; index++) {
      const operation = await solveCurrent(page);
      operators.add(operation.operator);
      expect(operation.a).toBeGreaterThanOrEqual(operation.b);
      if (operation.operator === '−' && level !== 5) expect(needsExchange(operation)).toBe(false);
      await dragPiece(page);
      await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', String(index + 1));
    }
    expect([...operators].sort()).toEqual(level === 3 ? ['+'] : level === 5 ? ['−'] : ['+', '−']);
    await expect(page.getByRole('heading', { name: '¡Lo has conseguido!' })).toBeVisible();
  }
  await page.goto('/practice.html');
  await expect(page.locator('.collected-robot')).toHaveCount(7);
});

test('mobile selection, sound, and exit work without overflow', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, reducedMotion: 'reduce' });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:4173/practice.html');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('link', { name: 'Nivel 1: Primeras cuentas' }).tap();
  await page.getByRole('button', { name: 'Activar sonido' }).tap();
  await solveCurrent(page);
  await page.getByRole('button', { name: /^Arrastrar / }).tap();
  await page.getByRole('button', { name: /^Encajar / }).tap();
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '1');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.reload();
  await expect(page.getByRole('button', { name: 'Desactivar sonido' })).toBeVisible();
  await page.getByRole('link', { name: 'Salir', exact: true }).tap();
  await expect(page.getByRole('heading', { name: 'Vamos a jugar.' })).toBeVisible();
  await context.close();
});

test('blocked storage and invalid level URLs do not prevent play', async ({ page }) => {
  await page.addInitScript(() => { Object.defineProperty(window, 'localStorage', { get() { throw new Error('Storage disabled'); } }); });
  await page.goto('/games/robot-lab.html?level=999');
  await expect(page.getByText('No se puede guardar el progreso en este navegador.')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Construye a Brote' })).toBeVisible();
  await solveCurrent(page);
});
