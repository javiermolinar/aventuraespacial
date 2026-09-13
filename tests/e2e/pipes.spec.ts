import { expect, test, type Page } from '@playwright/test';
import { chispaChapter as chapter } from '../../src/adventure/chapters/chispa';
import { adventureStorageKey, earnPart, moveTo, newAdventure, placePart } from '../../src/adventure/progress';
import { pipeFlow, waterTankPuzzle as layout } from '../../src/games/connections/pipes';
import { readAdventure, seedLegacyAdventure } from './adventure-saves';

async function openPipes(page: Page) {
  let progress = newAdventure(chapter, 0, 'girl', 'Lucía');
  for (const id of ['plan', 'workshop', 'build-start', 'radio-cables']) {
    if (chapter.scenes[progress.sceneId].type === 'build') while (progress.placedCount < 6) progress = placePart(earnPart(progress, chapter), chapter);
    progress = moveTo(progress, chapter, id);
  }
  await page.goto('/games/adventure.html');
  await page.evaluate(({ key, progress }) => localStorage.setItem(key, JSON.stringify(progress)), { key: adventureStorageKey, progress });
  await page.reload();
  await expect(page.getByRole('heading', { name: 'El circuito de la radio', exact: true })).toBeFocused();
}

async function solvePipes(page: Page) {
  for (const index of pipeFlow(layout, layout.solution).wet) {
    const tile = page.locator('.pipe-tile').nth(index);
    const rotation = Number(await tile.getAttribute('data-rotation'));
    const turns = (layout.solution[index] - rotation + 4) % 4;
    await tile.focus();
    for (let step = 0; step < turns; step++) await page.keyboard.press(step % 2 ? 'Space' : 'Enter');
  }
  await expect(page.getByRole('status')).toHaveText('¡Circuito cerrado! Chispa conecta la batería.');
  await expect(page.getByRole('img', { name: /^Radio encendida/ })).toBeVisible();
}

async function screenshot(page: Page, name: string) {
  await page.evaluate(async () => { await document.fonts.ready; await Promise.all([...document.images].map(image => image.decode().catch(() => {}))); });
  // Allow viewport-unit layout to settle after orientation changes before full-page capture.
  await page.waitForTimeout(150);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: `artifacts/radio-cables-${name}.png`, fullPage: true });
}

test('mouse dragging previews and snaps rotations once, including outside the tile; taps and keyboard still work', async ({ page }) => {
  await openPipes(page);
  await expect(page.getByRole('img', { name: /^Batería desconectada/ })).toBeVisible();
  await expect(page.getByRole('img', { name: /^Radio apagada/ })).toBeVisible();
  await expect(page.locator('.has-current, .has-water')).toHaveCount(0);
  await expect(page.getByRole('button', { name: /^Cable, fila 1, columna 1:/ })).toHaveAttribute('aria-label', /sin corriente/);
  await expect(page.locator('.pipe-console')).not.toContainText(/agua|tubo|depósito/i);
  await expect(page.getByText('Cable de vuelta ya conectado.')).toBeVisible();
  const tile = page.locator('.pipe-tile').nth(0);
  const box = (await tile.boundingBox())!;
  const start = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(start.x + 40, start.y, { steps: 8 });
  await expect(tile.locator('g[transform]')).toHaveAttribute('transform', 'rotate(180 50 50)');
  await expect(tile).toHaveAttribute('data-rotation', '1');
  await page.mouse.up();
  await expect(tile).toHaveAttribute('data-rotation', '2');
  await expect(page.locator('.pipe-tile.has-current, .pipe-tile.is-linked')).toHaveCount(0);
  await tile.click();
  await expect(tile).toHaveAttribute('data-rotation', '3');
  await tile.focus();
  await page.keyboard.press('Space');
  await expect(tile).toHaveAttribute('data-rotation', '0');
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(start.x - 80, start.y, { steps: 8 });
  await page.mouse.up();
  await expect(tile).toHaveAttribute('data-rotation', '2');
  await page.getByRole('button', { name: 'Ayuda', exact: true }).click();
  await expect(tile).toBeFocused();
  await expect(tile).toHaveClass(/is-hint/);
  await expect(page.getByRole('status')).toContainText('fila 1, columna 1');
  await page.keyboard.press('Enter');
  await expect(tile).toHaveAttribute('data-rotation', '3');
  await expect(tile).not.toHaveClass(/is-hint/);
});

test('rotations survive reload and home; keyboard completes the path and completion survives reload', async ({ page }) => {
  await openPipes(page);
  await page.getByRole('button', { name: 'Ayuda', exact: true }).click();
  const hint = page.locator('.pipe-tile').nth(1);
  await expect(hint).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(hint).toHaveAttribute('data-rotation', '0');
  await page.reload();
  await expect(hint).toHaveAttribute('data-rotation', '0');
  await page.getByRole('button', { name: 'Volver al inicio', exact: true }).click();
  await page.getByRole('button', { name: 'Continuar aventura' }).click();
  await expect(hint).toHaveAttribute('data-rotation', '0');
  await solvePipes(page);
  await screenshot(page, 'complete-desktop');
  await expect(page.locator('.pipe-tile.has-current')).toHaveCount(9);
  const before = await hint.getAttribute('data-rotation');
  await hint.focus();
  await page.keyboard.press('Enter');
  await expect(hint).toHaveAttribute('data-rotation', before!);
  await page.reload();
  await expect(page.getByRole('status')).toHaveText('¡Circuito cerrado! Chispa conecta la batería.');
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Ahora sí nos escuchan' })).toBeFocused();
  const saved = await readAdventure(page);
  expect(saved.history).toContain('radio-cables');
  expect(saved.placedCount).toBe(6);
});

test('real finger drags, tap rotation, and cancelled gestures work without scrolling the board', async ({ browser }) => {
  const context = await browser.newContext({ baseURL: 'http://127.0.0.1:4173', viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, reducedMotion: 'reduce' });
  const page = await context.newPage();
  await openPipes(page);
  const tile = page.locator('.pipe-tile').nth(1);
  await tile.scrollIntoViewIfNeeded();
  const box = (await tile.boundingBox())!;
  const start = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  const scroll = await page.evaluate(() => scrollY);
  const session = await context.newCDPSession(page);
  async function drag(cancel: boolean) {
    await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...start, id: 1 }] });
    for (let step = 1; step <= 8; step++) await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: start.x, y: start.y - step * 5, id: 1 }] });
    await session.send('Input.dispatchTouchEvent', { type: cancel ? 'touchCancel' : 'touchEnd', touchPoints: [] });
  }
  const events = await tile.evaluateHandle(element => {
    const recorded: Record<string, string | number | boolean>[] = [];
    for (const type of ['pointerdown', 'pointerup', 'pointercancel', 'lostpointercapture', 'click']) {
      element.addEventListener(type, event => {
        const pointer = event as PointerEvent;
        recorded.push({ type, time: performance.now(), pointerId: pointer.pointerId, isPrimary: pointer.isPrimary,
          button: pointer.button, detail: pointer.detail, x: pointer.clientX, y: pointer.clientY });
      });
    }
    return recorded;
  });
  try {
    await drag(true);
    await expect(tile).toHaveAttribute('data-rotation', '3');
    await expect(tile.locator('g[transform]')).toHaveAttribute('transform', 'rotate(270 50 50)');
    await drag(false);
    await expect(tile).toHaveAttribute('data-rotation', '2');
    expect(await page.evaluate(() => scrollY)).toBe(scroll);
    await tile.tap();
    await expect(tile).toHaveAttribute('data-rotation', '3');
    await page.getByRole('button', { name: 'Ayuda', exact: true }).tap();
    await screenshot(page, 'hint-mobile');
    await solvePipes(page);
    await screenshot(page, 'complete-mobile');
  } finally {
    await test.info().attach('pipe-pointer-events', { body: JSON.stringify(await events.jsonValue(), null, 2), contentType: 'application/json' });
    await context.close();
  }
});

test('board fits desktop, phones, tablet and short landscape with large touch targets', async ({ page }) => {
  await openPipes(page);
  for (const [name, width, height] of [['desktop', 1440, 1000], ['mobile', 390, 844], ['small-phone', 320, 568], ['tablet', 768, 1024], ['landscape', 844, 390]] as const) {
    await page.setViewportSize({ width, height });
    await screenshot(page, name);
    const tile = (await page.locator('.pipe-tile').first().boundingBox())!;
    expect(tile.width).toBeGreaterThanOrEqual(44);
    expect(tile.height).toBeGreaterThanOrEqual(44);
  }
  await page.setViewportSize({ width: 320, height: 568 });
  await page.addStyleTag({ content: '.pipe-story p, .pipe-puzzle h2, .pipe-status, .pipe-gesture { font-size: 28px !important; }' });
  await screenshot(page, 'large-text');
  await page.getByRole('button', { name: 'Saltar', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Ahora sí nos escuchan' })).toBeFocused();
});

test('old water saves resume as radio cables, preserving partial and completed rotations', async ({ page }) => {
  await openPipes(page);
  for (const rotations of [layout.initial.map((rotation, index) => index === 1 ? 2 : rotation), layout.solution]) {
    await seedLegacyAdventure(page, {
      ...await readAdventure(page), chapterVersion: 3, sceneId: 'water-pipes',
      history: ['message', 'plan', 'workshop', 'build-start', 'tool', 'hello', 'wave'],
      pipeRotations: { 'water-pipes': rotations },
    });
    await page.reload();
    await expect(page.getByRole('heading', { name: 'El circuito de la radio', exact: true })).toBeFocused();
    await expect(page.locator('.pipe-tile').nth(1)).toHaveAttribute('data-rotation', String(rotations[1]));
    await expect(page.getByRole('img', { name: rotations === layout.solution ? /^Radio encendida/ : /^Radio apagada/ })).toBeVisible();
    const saved = await readAdventure(page);
    expect(saved).toMatchObject({ chapterVersion: 6, sceneId: 'radio-cables', character: 'girl', playerName: 'Lucía', placedCount: 6 });
    expect(saved.pipeRotations).toEqual({ 'radio-cables': rotations });
  }
});

test('storage failure preserves pipe rotations in memory and still allows skipping', async ({ page }) => {
  await openPipes(page);
  await page.evaluate(() => { Storage.prototype.setItem = () => { throw new Error('blocked'); }; });
  const tile = page.locator('.pipe-tile').nth(1);
  await tile.click();
  await expect(page.getByText(/No se puede guardar el progreso/)).toBeVisible();
  await page.getByRole('button', { name: 'Volver al inicio', exact: true }).click();
  await page.getByRole('button', { name: 'Continuar aventura' }).click();
  await expect(tile).toHaveAttribute('data-rotation', '0');
  await page.getByRole('button', { name: 'Saltar', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Ahora sí nos escuchan' })).toBeFocused();
});
