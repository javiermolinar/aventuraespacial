import { expect, test, type Page } from '@playwright/test';
import { lessons } from '../../src/games/laser-rats/puzzles';
import { certify } from '../../src/games/laser-rats/solver';
import { cellName } from '../../src/games/laser-rats/rules';

const square = (page: Page, name: string) => page.locator(`[data-cell="${name}"]`);
const robot = (page: Page, kind: string) => page.getByRole('button', { name: new RegExp(`(?:Colocar|Mover) robot de ${kind}`) });

async function openCell(page: Page, name: string) {
  await square(page, name).click();
  await expect(square(page, name)).toHaveClass(/is-known/);
}

test('practice navigation, no hidden information, placement restrictions, losing and retrying', async ({ page }) => {
  await page.goto('/practice.html');
  await page.getByRole('region', { name: 'La patrulla láser' }).getByRole('link', { name: 'Jugar' }).click();
  await expect(page.getByRole('heading', { name: 'La patrulla láser' })).toBeVisible();
  await expect(square(page, 'C1')).toHaveAccessibleName('C1. Sin explorar.');
  await expect(page.locator('.laser-cell-clues')).toHaveCount(0);
  await expect(page.locator('.laser-cell.is-known')).toHaveCount(0);
  await expect(page.locator('.laser-direction-count')).toHaveCount(0);
  await openCell(page, 'A4');
  await openCell(page, 'C3');
  await expect(square(page, 'C3').locator('.laser-adjacent-count')).toHaveText('0');
  await expect(square(page, 'C2').locator('.laser-adjacent-count')).toHaveText('1');
  await expect(square(page, 'C2')).toHaveClass(/is-known/);
  await expect(page.locator('.laser-direction-count, .laser-radar-panel, .laser-map-hint, .is-clue-neighbor, [aria-label*="Radar"]')).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Explorar|Una pista|Otro tablero/ })).toHaveCount(0);
  await expect(page.getByText('Crear un reto a tu medida', { exact: true })).toHaveCount(0);
  await expect(page.locator('.laser-status')).toHaveCount(0);
  const help = page.getByRole('button', { name: 'Cómo se juega' });
  await help.click();
  await expect(page.getByRole('dialog', { name: 'Cómo se juega' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(help).toBeFocused();
  await robot(page, 'columnas').click();
  await square(page, 'C1').click();
  await expect(page.locator('.laser-status')).toContainText('Primero descubre');
  await expect(page.getByTestId('robots-left')).toHaveText('2 / 2');
  await square(page, 'C1').click();
  await expect(page.locator('.laser-status')).toContainText('¡Había una rata!');
  await expect(page.locator('.laser-cell.has-rat')).toHaveCount(4);
  await expect(page.getByRole('button', { name: 'Otra vez' })).toBeFocused();
  await page.getByRole('button', { name: 'Otra vez' }).click();
  await expect(page.locator('.laser-cell.has-rat')).toHaveCount(0);
  await expect(page.getByTestId('rats-cleared')).toHaveText('0 / 4');
  await page.getByRole('link', { name: 'Salir' }).click();
  await expect(page).toHaveURL(/practice.html$/);
});

test('all handcrafted proof paths are playable with keyboard and advance in order', async ({ page }) => {
  await page.goto('/games/laser-rats.html');
  for (const [index, puzzle] of lessons.entries()) {
    if (index > 0) await page.getByRole('button', { name: 'Siguiente reto' }).click();
    await expect(page.getByRole('combobox', { name: 'Reto' })).toHaveValue(String(index));
    const proof = certify(puzzle);
    expect(proof.status).toBe('solved');
    if (proof.status !== 'solved') return;
    await openCell(page, cellName(proof.certificate.opening, puzzle.size));
    for (const step of proof.certificate.steps) {
      if (step.type === 'shot') await page.locator(`[data-reserve-id="${step.robot}"]`).press('Enter');
      await square(page, cellName(step.cell, puzzle.size)).press('Space');
    }
    await expect(page.locator('.laser-status')).toContainText('¡Misión cumplida!');
    await expect(page.getByTestId('rats-cleared')).toHaveText(`${puzzle.rats.length} / ${puzzle.rats.length}`);
  }
});

test('finishing the lessons generates another board and retry preserves it', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/games/laser-rats.html');
  await page.getByRole('combobox', { name: 'Reto' }).selectOption(String(lessons.length - 1));
  const puzzle = lessons.at(-1)!, proof = certify(puzzle);
  expect(proof.status).toBe('solved');
  if (proof.status !== 'solved') return;
  await openCell(page, cellName(proof.certificate.opening, puzzle.size));
  for (const step of proof.certificate.steps) {
    if (step.type === 'shot') await page.locator(`[data-reserve-id="${step.robot}"]`).click();
    await square(page, cellName(step.cell, puzzle.size)).click();
  }
  await page.getByRole('button', { name: 'Siguiente reto' }).click();
  await expect(page.getByRole('combobox', { name: 'Reto' })).toHaveValue('generated');
  await expect(page.locator('.laser-cell')).toHaveCount(49);
  await expect(page.getByTestId('rats-cleared')).toHaveText('0 / 10');
  await expect(page.getByTestId('robots-left')).toHaveText('3 / 3');
  const opening = (await page.locator('.is-start').getAttribute('data-cell'))!;
  await openCell(page, opening);
  const reading = await square(page, opening).getAttribute('aria-label');
  await page.getByRole('button', { name: 'Reiniciar tablero' }).click();
  await expect(page.locator('.laser-cell.is-known')).toHaveCount(0);
  await expect(page.locator('.laser-cell.is-selected')).toHaveCount(0);
  await openCell(page, opening);
  await expect(square(page, opening)).toHaveAccessibleName(reading!);
  expect(errors).toEqual([]);
});

test('only the marked opening starts a round, then ordinary rat clicks lose', async ({ page }) => {
  await page.goto('/games/laser-rats.html');
  await square(page, 'C1').click();
  await expect(page.locator('.laser-cell.is-known')).toHaveCount(0);
  await expect(page.locator('.laser-status')).toContainText('Empieza en A4');
  await expect(square(page, 'A4')).toHaveAccessibleName('A4. Inicio seguro. Toca para empezar.');
  await openCell(page, 'A4');
  await openCell(page, 'C3');
  await expect(page.locator('.laser-status.is-lost')).toHaveCount(0);
  await expect(page.getByTestId('rats-cleared')).toHaveText('0 / 4');
  await square(page, 'C1').click();
  await expect(page.locator('.laser-status')).toContainText('¡Había una rata!');
});

test('music is opt-in and stops with the shared sound switch', async ({ page }) => {
  await page.goto('/games/laser-rats.html');
  const audio = page.getByTestId('background-music');
  await expect.poll(() => audio.evaluate(el => (el as HTMLAudioElement).paused)).toBe(true);
  await page.getByRole('button', { name: 'Activar sonido', exact: true }).click();
  await expect.poll(() => audio.evaluate(el => (el as HTMLAudioElement).paused)).toBe(false);
  await expect(audio).toHaveAttribute('src', '../music/cipher.mp3');
  await square(page, 'A4').click();
  await page.getByRole('button', { name: 'Desactivar sonido', exact: true }).click();
  await expect.poll(() => audio.evaluate(el => (el as HTMLAudioElement).paused)).toBe(true);
});

test('dragging consumes a finite piece, invalid drops are harmless, and placed robots stay fixed', async ({ page }) => {
  await page.goto('/games/laser-rats.html');
  await openCell(page, 'A4');
  await openCell(page, 'C3');
  const reserve = (kind: string) => page.locator(`[data-reserve-kind="${kind}"]`);
  async function dragTo(source: ReturnType<typeof reserve>, destination: ReturnType<typeof square>) {
    const from = (await source.boundingBox())!, to = (await destination.boundingBox())!;
    await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
    await page.mouse.down();
    await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 10 });
  }
  await dragTo(reserve('column'), square(page, 'C1'));
  await expect(square(page, 'C1')).toHaveClass(/drop-invalid/);
  await page.mouse.up();
  await expect(square(page, 'C1')).toHaveAccessibleName('C1. Sin explorar.');
  await expect(page.getByTestId('robots-left')).toHaveText('2 / 2');
  await expect(reserve('column')).toBeEnabled();

  await dragTo(reserve('column'), square(page, 'C3'));
  await expect(square(page, 'C3')).toHaveClass(/drop-valid/);
  await page.keyboard.press('Escape');
  await page.mouse.up();
  await expect(page.locator('.laser-drag-ghost')).toHaveCount(0);
  await expect(page.getByTestId('robots-left')).toHaveText('2 / 2');

  await dragTo(reserve('column'), square(page, 'C3'));
  await page.mouse.up();
  await expect(page.getByTestId('robots-left')).toHaveText('1 / 2');
  await expect(reserve('column')).toHaveCount(0);
  await expect(reserve('column').locator('.laser-robot-art')).toHaveCount(0);
  await expect(square(page, 'C3')).toHaveAttribute('data-robot', 'column');
  await expect(page.getByTestId('rats-cleared')).toHaveText('2 / 4');

  await dragTo(square(page, 'C3'), square(page, 'D3'));
  await page.mouse.up();
  await expect(square(page, 'C3')).toHaveAttribute('data-robot', 'column');
  await expect(square(page, 'D3')).not.toHaveAttribute('data-robot');

  await dragTo(reserve('row'), square(page, 'C2'));
  await page.mouse.up();
  await expect(page.getByTestId('robots-left')).toHaveText('0 / 2');
  await expect(page.locator('.laser-cell[data-robot]')).toHaveCount(2);
  await expect(page.locator('.laser-status')).toContainText('¡Misión cumplida!');
});

test('three row figures can be dragged independently in any order and remain on the board', async ({ page }) => {
  await page.goto('/games/laser-rats.html');
  await page.getByRole('combobox', { name: 'Reto' }).selectOption('3');
  for (const cell of ['C3', 'C1', 'C5']) await openCell(page, cell);
  await expect(page.locator('[data-reserve-kind="row"]')).toHaveCount(3);
  for (const [step, [id, cell]] of [[2, 'C3'], [0, 'C1'], [1, 'C5']].entries()) {
    const source = page.locator(`[data-reserve-id="${id}"]`), target = square(page, String(cell));
    const from = (await source.boundingBox())!, to = (await target.boundingBox())!;
    await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
    await page.mouse.down();
    await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 10 });
    await page.mouse.up();
    await expect(target).toHaveAttribute('data-robot-id', String(id));
    await expect(source).toHaveCount(0);
    await expect(page.getByTestId('robots-left')).toHaveText(`${2 - step} / 3`);
  }
  await expect(page.locator('.laser-cell[data-robot="row"]')).toHaveCount(3);
  await expect(page.locator('.laser-status')).toContainText('¡Misión cumplida!');
});

test.describe('touch and responsive layout', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  test('a real touch drag places one piece and a cancelled touch leaves the reserve unchanged', async ({ page }) => {
    await page.goto('/games/laser-rats.html');
    await openCell(page, 'A4');
    await openCell(page, 'C3');
    const source = page.locator('[data-reserve-kind="column"]');
    await source.scrollIntoViewIfNeeded();
    const from = (await source.boundingBox())!, to = (await square(page, 'C3').boundingBox())!;
    const cdp = await page.context().newCDPSession(page);
    async function touch(type: 'touchStart' | 'touchMove' | 'touchEnd' | 'touchCancel', x = 0, y = 0) {
      await cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' || type === 'touchCancel' ? [] : [{ x, y, id: 1 }] });
    }
    await touch('touchStart', from.x + from.width / 2, from.y + from.height / 2);
    await touch('touchMove', to.x + to.width / 2, to.y + to.height / 2);
    await expect(square(page, 'C3')).toHaveClass(/drop-valid/);
    await touch('touchCancel');
    await expect(page.getByTestId('robots-left')).toHaveText('2 / 2');
    await expect(page.locator('.laser-drag-ghost')).toHaveCount(0);
    await touch('touchStart', from.x + from.width / 2, from.y + from.height / 2);
    await touch('touchMove', to.x + to.width / 2, to.y + to.height / 2);
    await touch('touchEnd');
    await expect(square(page, 'C3')).toHaveAttribute('data-robot', 'column');
    await expect(page.getByTestId('robots-left')).toHaveText('1 / 2');
    await expect(source).toHaveCount(0);
  });
  test('walls, permanent robot placement, and full mission on a phone', async ({ page }) => {
    await page.goto('/games/laser-rats.html');
    await page.getByRole('combobox', { name: 'Reto' }).selectOption('2');
    await openCell(page, 'D4');
    await square(page, 'E3').tap();
    await square(page, 'E5').tap();
    await expect(square(page, 'F5')).toHaveAccessibleName('F5. Pared.');
    await robot(page, 'diagonales').tap(); await square(page, 'E5').tap();
    await expect(page.getByTestId('rats-cleared')).toHaveText('6 / 10');
    await expect(page.locator('.laser-rat-track .is-caught')).toHaveCount(6);
    await expect(square(page, 'C3')).toHaveClass(/is-known/);
    await robot(page, 'columnas').tap(); await square(page, 'D4').tap();
    await square(page, 'C4').tap();
    await robot(page, 'filas').tap(); await square(page, 'C4').tap();
    await expect(page.locator('.laser-status')).toContainText('¡Misión cumplida!');
    await expect(page.getByTestId('robots-left')).toHaveText('0 / 3');
    await expect(page.locator('.laser-tools')).toHaveCount(0);
    expect((await page.locator('.laser-reserve').boundingBox())!.height).toBeLessThan(90);
    await page.screenshot({ path: 'artifacts/laser-rats-mobile-win.png', fullPage: true });
    for (const width of [320, 390, 699, 700, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
    await page.setViewportSize({ width: 320, height: 700 });
    await page.getByRole('button', { name: 'Cómo se juega' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.getByRole('button', { name: 'Cerrar instrucciones' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });
});
