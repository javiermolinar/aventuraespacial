import { expect, test, type CDPSession, type Page } from '@playwright/test';
import { puzzles, rotate } from '../../src/games/shape-box/puzzle';

const pieceButton = (page: Page, id: string) => page.getByRole('button', { name: new RegExp(`^Pieza ${id}(, en la caja)?$`) });
const cell = (page: Page, x: number, y: number) => page.getByRole('button', { name: new RegExp(`^Fila ${y + 1}, columna ${x + 1}:`) });
async function rotationPath(page: Page, id: string, turns: number) {
  const edge = page.getByRole('button', { name: `Girar pieza ${id}`, exact: true });
  await edge.scrollIntoViewIfNeeded();
  const handle = (await edge.boundingBox())!;
  const placed = await page.getByRole('button', { name: new RegExp(`: pieza ${id}$`) }).evaluateAll(elements => elements.map(element => {
    const rect = element.getBoundingClientRect();
    return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
  }));
  const rects = placed.length ? placed : [(await pieceButton(page, id).locator('.packing-shape').boundingBox())!];
  const left = Math.min(...rects.map(rect => rect.x)), right = Math.max(...rects.map(rect => rect.x + rect.width));
  const top = Math.min(...rects.map(rect => rect.y)), bottom = Math.max(...rects.map(rect => rect.y + rect.height));
  const center = { x: (left + right) / 2, y: (top + bottom) / 2 };
  const start = { x: handle.x + handle.width / 2, y: handle.y + handle.height / 2 };
  const angle = Math.atan2(start.y - center.y, start.x - center.x);
  const radius = Math.hypot(start.x - center.x, start.y - center.y);
  const steps = Math.max(1, Math.ceil(Math.abs(turns) * 12));
  const arc = Array.from({ length: steps }, (_, i) => ({
    x: center.x + radius * Math.cos(angle + turns * Math.PI / 2 * (i + 1) / steps),
    y: center.y + radius * Math.sin(angle + turns * Math.PI / 2 * (i + 1) / steps),
  }));
  return { edge, start, arc };
}
async function gestureRotate(page: Page, id: string, turns: number, touch?: CDPSession) {
  const { edge, start, arc } = await rotationPath(page, id, turns);
  if (touch) await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [start] });
  else { await page.mouse.move(start.x, start.y); await page.mouse.down(); }
  await expect(edge.locator('svg')).toHaveCSS('opacity', '1');
  for (const point of arc) {
    if (touch) await touch.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [point] });
    else await page.mouse.move(point.x, point.y);
  }
  await expect(page.locator('.packing-rotation-preview')).toHaveCount(1);
  if (touch) await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  else await page.mouse.up();
  await expect(page.locator('.packing-rotation-preview')).toHaveCount(0);
}
async function orient(page: Page, id: string, turns: number) {
  await pieceButton(page, id).click();
  for (let turn = 0; turn < turns; turn++) await gestureRotate(page, id, 1);
}
async function dragPiece(page: Page, id: string, x: number, y: number) {
  // Wait for the tray to settle after a rotation changes its flex layout.
  await pieceButton(page, id).hover();
  const source = await pieceButton(page, id).locator('.packing-block').first().boundingBox();
  const destination = await cell(page, x, y).boundingBox();
  await page.mouse.move(source!.x + source!.width / 2, source!.y + source!.height / 2);
  await page.mouse.down();
  await page.mouse.move(destination!.x + destination!.width / 2, destination!.y + destination!.height / 2, { steps: 12 });
  return async () => { await page.mouse.up(); };
}

test('practice links to the game; drag previews, invalid drops, reposition, remove, reset and completion', async ({ page }) => {
  await page.goto('/practice.html');
  await page.getByRole('region', { name: '¡Todo encaja!' }).getByRole('link', { name: 'Jugar' }).click();
  await expect(page.getByRole('heading', { name: '¡Todo encaja!' })).toBeVisible();
  await expect(page.locator('#packing-controls')).toHaveClass('sr-only');
  await expect(page.locator('.packing-count')).toHaveCount(0);
  const reset = page.getByRole('button', { name: 'Empezar de nuevo' });
  await expect(page.locator('.packing-heading')).toContainText('¡Todo encaja!');
  expect(await reset.evaluate(element => Boolean(element.closest('.packing-heading')))).toBe(true);
  await expect(reset).toHaveText('');
  await expect(page.locator('.packing-feedback')).toHaveCount(0);
  await expect(page.getByRole('status')).toHaveClass(/sr-only/);
  const puzzle = puzzles[0];
  const a = puzzle.solution.A;
  await orient(page, 'A', a.turns);
  let release = await dragPiece(page, 'A', 0, 0);
  await expect(page.locator('.valid-drop')).toHaveCount(3);
  await release();
  await expect(page.locator('.packing-cell.is-filled')).toHaveCount(3);
  await expect(page.getByRole('status')).toHaveText('Pieza A colocada.');
  await expect(page.getByRole('status')).toHaveClass(/sr-only/);
  expect((await page.getByRole('status').boundingBox())!.height).toBeLessThanOrEqual(1);
  // Invalid overlap leaves both the existing piece and the dragged piece unchanged.
  await orient(page, 'B', puzzle.solution.B.turns);
  release = await dragPiece(page, 'B', 0, 0);
  await expect(page.locator('.invalid-drop')).toHaveCount(3);
  await release();
  await expect(page.getByRole('status')).toContainText('Ahí no cabe');
  await expect(page.getByRole('status')).not.toHaveClass(/sr-only/);
  await expect(page.locator('.packing-cell.is-filled')).toHaveCount(3);
  // Select A directly on the board while B is selected, then drag A even
  // after selecting B again. Neither action requires returning to A's tray.
  await cell(page, 1, 1).click();
  await expect(pieceButton(page, 'A')).toHaveAttribute('aria-pressed', 'true');
  await expect(pieceButton(page, 'B')).toHaveAttribute('aria-pressed', 'false');
  await pieceButton(page, 'B').click();
  const grab = await cell(page, 1, 1).boundingBox();
  const destination = await cell(page, 2, 1).boundingBox();
  await page.mouse.move(grab!.x + grab!.width / 2, grab!.y + grab!.height / 2);
  await page.mouse.down();
  await page.mouse.move(destination!.x + destination!.width / 2, destination!.y + destination!.height / 2, { steps: 8 });
  await page.mouse.up();
  await expect(cell(page, 0, 0)).toHaveAccessibleName('Fila 1, columna 1: vacía');
  await expect(cell(page, 1, 0)).toHaveAccessibleName('Fila 1, columna 2: pieza A');
  await expect(page.getByRole('button', { name: 'Sacar', exact: true })).toHaveCount(0);
  const placedPiece = await cell(page, 1, 0).boundingBox();
  const tray = await page.getByRole('group', { name: 'Mesa de piezas' }).boundingBox();
  await page.mouse.move(placedPiece!.x + 20, placedPiece!.y + 20);
  await page.mouse.down();
  await page.mouse.move(tray!.x + 10, tray!.y + 10, { steps: 8 });
  await expect(page.getByRole('status')).toHaveText('Suelta para devolver la pieza a la mesa.');
  await page.mouse.up();
  await expect(page.getByRole('status')).toHaveText('Pieza A de vuelta en la mesa.');
  await expect(page.locator('.packing-cell.is-filled')).toHaveCount(0);
  await expect(pieceButton(page, 'A')).toHaveAttribute('aria-pressed', 'true');
  // Returned pieces retain their rotation and can be placed again immediately.
  release = await dragPiece(page, 'A', 0, 0);
  await release();
  await expect(page.locator('.packing-cell.is-filled')).toHaveCount(3);
  await page.getByRole('button', { name: 'Empezar de nuevo' }).click();
  for (const piece of puzzle.pieces) {
    const solution = puzzle.solution[piece.id];
    await orient(page, piece.id, solution.turns);
    // Drop at the actual grabbed cell, not necessarily the bounding box origin.
    const anchor = rotate(piece.cells, solution.turns)[0];
    release = await dragPiece(page, piece.id, solution.x + anchor.x, solution.y + anchor.y);
    await release();
  }
  await expect(page.getByRole('status')).toHaveText('¡Todo encaja! Has llenado la caja.');
  await expect(page.getByRole('status')).not.toHaveClass(/sr-only/);
  await page.getByRole('button', { name: 'Siguiente caja' }).click();
  await expect(page.getByRole('combobox', { name: 'Caja' })).toHaveValue('1');
  await expect(page.locator('.packing-cell.is-filled')).toHaveCount(0);
  await page.getByRole('link', { name: 'Salir' }).click();
  await expect(page).toHaveURL(/practice.html$/);
});

test('all puzzles can be completed with the keyboard, and the last offers replay', async ({ page }) => {
  await page.goto('/games/shape-box.html');
  for (const puzzle of puzzles) {
    for (const piece of puzzle.pieces) {
      const solution = puzzle.solution[piece.id];
      await pieceButton(page, piece.id).focus();
      await page.keyboard.press('Enter');
      for (let turn = 0; turn < solution.turns; turn++) {
        await page.getByRole('button', { name: `Girar pieza ${piece.id}`, exact: true }).focus();
        await page.keyboard.press('Space');
      }
      const anchor = rotate(piece.cells, solution.turns)[0];
      await cell(page, solution.x + anchor.x, solution.y + anchor.y).focus();
      await page.keyboard.press('Enter');
    }
    await expect(page.locator('.packing-cell.is-filled')).toHaveCount(puzzle.width * puzzle.height);
    expect(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight + 1)).toBe(true);
    await page.getByRole('button', { name: puzzle === puzzles.at(-1) ? 'Volver a jugar' : 'Siguiente caja' }).click();
  }
  await expect(page.getByRole('combobox', { name: 'Caja' })).toHaveValue('0');
});

test.describe('touch', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  test('tap/rotate/place, touch drag cancellation, and narrow layouts', async ({ page }) => {
    await page.goto('/games/shape-box.html');
    const cdp = await page.context().newCDPSession(page);
    await pieceButton(page, 'A').tap();
    const cue = page.getByRole('button', { name: 'Girar pieza A' }).locator('svg');
    await expect(cue).toHaveCSS('opacity', '0');
    for (let i = 0; i < puzzles[0].solution.A.turns; i++) await gestureRotate(page, 'A', 1, cdp);
    await expect(cue).toHaveCSS('opacity', '0');
    await cell(page, 0, 0).tap();
    await expect(page.locator('.packing-cell.is-filled')).toHaveCount(3);
    await pieceButton(page, 'B').tap();
    await cell(page, 0, 0).tap();
    await expect(pieceButton(page, 'A')).toHaveAttribute('aria-pressed', 'true');
    await expect(pieceButton(page, 'B')).toHaveAttribute('aria-pressed', 'false');
    // Rotation gestures work on the board too. Four arcs restore the shape.
    for (let i = 0; i < 4; i++) {
      await gestureRotate(page, 'A', 1, cdp);
      await expect(page.getByRole('status')).toHaveText('Pieza A girada.');
      await expect(page.locator('.packing-drag')).toHaveCount(0);
      await expect(page.locator('.packing-cell.is-filled')).toHaveCount(3);
    }
    await page.screenshot({ path: 'artifacts/shape-box-rotation-mobile.png' });
    await pieceButton(page, 'B').tap();
    await cell(page, 0, 0).scrollIntoViewIfNeeded();
    const source = await cell(page, 0, 0).boundingBox();
    const target = await cell(page, 1, 0).boundingBox();
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: source!.x + 15, y: source!.y + 15 }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: target!.x + 15, y: target!.y + 15 }] });
    await expect(page.locator('.valid-drop')).toHaveCount(3);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
    await expect(page.locator('.packing-drag')).toHaveCount(0);
    await expect(cell(page, 0, 0)).toHaveAccessibleName('Fila 1, columna 1: pieza A');
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: source!.x + 15, y: source!.y + 15 }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: target!.x + 15, y: target!.y + 15 }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await expect(cell(page, 0, 0)).toHaveAccessibleName('Fila 1, columna 1: vacía');
    await expect(cell(page, 1, 0)).toHaveAccessibleName('Fila 1, columna 2: pieza A');
    // Dragging just outside the box removes a piece without needing to reach
    // the tray below the viewport. Cancelling that gesture must not remove it.
    const board = await page.getByRole('group', { name: 'Caja para las piezas' }).boundingBox();
    const outside = { x: board!.x - 12, y: target!.y + 15 };
    for (const cancel of [true, false]) {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: target!.x + 15, y: target!.y + 15 }] });
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [outside] });
      await expect(page.getByRole('status')).toHaveText('Suelta para devolver la pieza a la mesa.');
      await cdp.send('Input.dispatchTouchEvent', { type: cancel ? 'touchCancel' : 'touchEnd', touchPoints: [] });
      await expect(page.locator('.packing-cell.is-filled')).toHaveCount(cancel ? 3 : 0);
      await expect(page.locator('.packing-drag')).toHaveCount(0);
    }
    await expect(page.getByRole('status')).toHaveText('Pieza A de vuelta en la mesa.');
    await expect(pieceButton(page, 'A')).toHaveAttribute('aria-pressed', 'true');
    await page.getByRole('combobox', { name: 'Caja' }).selectOption('5');
    for (const width of [320, 390, 700, 768]) {
      await page.setViewportSize({ width, height: 844 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: 'artifacts/shape-box-mobile.png', fullPage: true });
    // The final tray row remains draggable to the pinned board after scrolling.
    await pieceButton(page, 'H').scrollIntoViewIfNeeded();
    const block = await pieceButton(page, 'H').locator('.packing-block').first().boundingBox();
    const h = puzzles[5].solution.H;
    const anchor = rotate(puzzles[5].pieces.find(piece => piece.id === 'H')!.cells, 0)[0];
    const drop = await cell(page, h.x + anchor.x, h.y + anchor.y).boundingBox();
    expect(drop!.y).toBeGreaterThan(0);
    expect(drop!.y + drop!.height).toBeLessThan(844);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: block!.x + block!.width / 2, y: block!.y + block!.height / 2 }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: drop!.x + drop!.width / 2, y: drop!.y + drop!.height / 2 }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await expect(page.locator('.packing-cell.is-filled')).toHaveCount(4);
    await page.screenshot({ path: 'artifacts/shape-box-mobile-scrolled.png' });
  });
});

test('piece hover reveals only its rotation cue; gestures preview, cancel, turn both ways and reject blocked turns', async ({ page }) => {
  await page.goto('/games/shape-box.html');
  const edge = page.getByRole('button', { name: 'Girar pieza A' });
  const cue = edge.locator('svg');
  const shape = pieceButton(page, 'A').locator('.packing-shape');
  const initial = await shape.innerHTML();
  await expect(cue).toHaveCSS('opacity', '0');
  await pieceButton(page, 'A').hover();
  await expect(cue).toHaveCSS('opacity', '1');
  await expect(pieceButton(page, 'A')).toHaveAttribute('aria-pressed', 'false');
  expect(await shape.innerHTML()).toBe(initial);
  await pieceButton(page, 'B').hover();
  await expect(cue).toHaveCSS('opacity', '0');
  await expect(page.getByRole('button', { name: 'Girar pieza B' }).locator('svg')).toHaveCSS('opacity', '1');
  await pieceButton(page, 'A').hover();
  await expect(cue).toHaveCSS('opacity', '1');
  await expect(page.getByRole('button', { name: 'Girar pieza B' }).locator('svg')).toHaveCSS('opacity', '0');
  await edge.hover();
  await expect(cue).toHaveCSS('opacity', '1');
  await edge.click();
  expect(await shape.innerHTML()).toBe(initial);
  await page.mouse.move(10, 10);
  await expect(cue).toHaveCSS('opacity', '0');
  const { start, arc } = await rotationPath(page, 'A', .8);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  for (const point of arc) await page.mouse.move(point.x, point.y);
  await expect(page.locator('.packing-rotation-preview')).toHaveCount(1);
  expect(await shape.innerHTML()).toBe(initial);
  await page.screenshot({ path: 'artifacts/shape-box-rotation-gesture.png' });
  await page.keyboard.press('Escape');
  await page.mouse.up();
  await expect(page.locator('.packing-rotation-preview')).toHaveCount(0);
  expect(await shape.innerHTML()).toBe(initial);
  await gestureRotate(page, 'A', 1);
  expect(await shape.innerHTML()).not.toBe(initial);
  await gestureRotate(page, 'A', -1);
  expect(await shape.innerHTML()).toBe(initial);
  await gestureRotate(page, 'C', 1);
  await cell(page, 0, 2).click();
  await expect(page.locator('.packing-cell.is-filled')).toHaveCount(3);
  const boardCue = page.getByRole('button', { name: 'Girar pieza C' }).locator('svg');
  await page.mouse.move(10, 10);
  await expect(boardCue).toHaveCSS('opacity', '0');
  for (const x of [0, 1, 2]) {
    await cell(page, x, 2).hover();
    await expect(boardCue).toHaveCSS('opacity', '1');
  }
  await expect(pieceButton(page, 'C')).toHaveAttribute('aria-pressed', 'false');
  await cell(page, 0, 0).hover();
  await expect(boardCue).toHaveCSS('opacity', '0');
  await gestureRotate(page, 'C', 1);
  await expect(page.getByRole('status')).toContainText('No hay espacio para girarla');
  await expect(cell(page, 2, 2)).toHaveAccessibleName('Fila 3, columna 3: pieza C');
  await expect(page.locator('.packing-rotation-preview')).toHaveCount(0);
});

test('uses the viewport with larger pieces and a top reset icon, without clipping controls', async ({ page }) => {
  await page.goto('/games/shape-box.html');
  for (const [width, height] of [[1920, 1080], [2560, 1440], [1440, 900], [768, 1024], [390, 844], [844, 390], [320, 640]]) {
    await page.setViewportSize({ width, height });
    await page.evaluate(async () => { await document.fonts.ready; await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))); });
    for (let level = 0; level < puzzles.length; level++) {
      await page.getByRole('combobox', { name: 'Caja' }).selectOption(String(level));
      const area = (await page.locator('.packing-workspace').boundingBox())!;
      expect(area.width).toBeGreaterThanOrEqual(width * .9);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      if (width >= 1440) {
        expect(area.y + area.height).toBeGreaterThanOrEqual(height - 26);
        expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBeLessThanOrEqual(height + 1);
        const cellSize = (await page.locator('.packing-cell').first().boundingBox())!.width;
        expect(cellSize).toBeGreaterThan(50);
        // Every piece orientation must fit, not just the initial arrangement.
        for (let turn = 0; turn < 3; turn++) {
          for (const piece of puzzles[level].pieces) await page.getByRole('button', { name: `Girar pieza ${piece.id}` }).press('Enter');
          await expect.poll(() => page.evaluate(() => document.documentElement.scrollHeight)).toBeLessThanOrEqual(height + 1);
          expect((await page.locator('.packing-cell').first().boundingBox())!.width).toBe(cellSize);
        }
      }
    }
    await page.evaluate(() => scrollTo(0, 0));
    await expect(page.getByRole('button', { name: 'Empezar de nuevo' })).toBeInViewport();
    await page.screenshot({ path: `artifacts/full-viewport-shape-box-${width}x${height}.png`, fullPage: true });
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  const lastLevel = puzzles.length - 1;
  const id = puzzles[lastLevel].pieces[0].id;
  await gestureRotate(page, id, 1);
  await page.getByRole('button', { name: 'Empezar de nuevo' }).click();
  await expect(page.getByRole('combobox', { name: 'Caja' })).toHaveValue(String(lastLevel));
  await expect(page.getByRole('status')).toHaveText('Elige una pieza para empezar.');
  await expect(pieceButton(page, id)).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('.packing-cell.is-filled')).toHaveCount(0);
  const { start, arc } = await rotationPath(page, id, .8);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  for (const point of arc) await page.mouse.move(point.x, point.y);
  await expect(page.locator('.packing-rotation-preview')).toHaveCount(1);
  await page.getByRole('button', { name: 'Empezar de nuevo' }).focus();
  await page.keyboard.press('Enter');
  await page.mouse.up();
  await expect(page.locator('.packing-rotation-preview')).toHaveCount(0);
  await expect(pieceButton(page, id)).toHaveAttribute('aria-pressed', 'false');
  await gestureRotate(page, id, 1);
  await expect(page.getByRole('status')).toHaveText(`Pieza ${id} girada.`);
});

test('desktop preview', async ({ page }) => {
  await page.goto('/games/shape-box.html');
  await page.getByRole('combobox', { name: 'Caja' }).selectOption('3');
  await pieceButton(page, 'B').click();
  const edge = page.getByRole('button', { name: 'Girar pieza B' });
  await page.mouse.move(10, 10);
  await expect(edge.locator('svg')).toHaveCSS('opacity', '0');
  await pieceButton(page, 'B').hover();
  await expect(edge.locator('svg')).toHaveCSS('opacity', '1');
  await page.screenshot({ path: 'artifacts/shape-box-desktop.png', fullPage: true });
});
