import { expect, test, type Page } from '@playwright/test';
import { connectionGames } from '../../src/games/connections/levels';
import type { ConnectionTheme } from '../../src/games/connections/pipes';

async function solve(page: Page, theme: ConnectionTheme, index: number) {
  const layout = connectionGames[theme].levels[index].layout;
  const tiles = page.locator('.pipe-tile');
  for (let tile = 0; tile < layout.tiles.length; tile++) {
    if (await page.locator('.pipe-puzzle.is-solved').count()) break;
    const turns = (layout.solution[tile] - Number(await tiles.nth(tile).getAttribute('data-rotation')) + 4) % 4;
    for (let turn = 0; turn < turns; turn++) {
      await tiles.nth(tile).focus();
      await page.keyboard.press('Enter');
    }
  }
  if (layout.network) {
    await expect(page.locator('.has-water, .has-current, .is-linked')).toHaveCount(0);
    await expect(page.locator('.pipe-puzzle')).not.toHaveClass(/is-solved/);
    await page.getByRole('button', { name: 'Probar', exact: true }).click();
  }
  await expect(page.locator('.pipe-puzzle')).toHaveClass(/is-solved/);
}

for (const theme of ['water', 'radio'] as const) {
  test(`${theme}: play all six levels from the games section and retain progress on reload`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('/practice.html');
    await page.getByRole('region', { name: connectionGames[theme].title }).getByRole('link', { name: 'Jugar' }).click();
    await expect(page.getByRole('heading', { name: connectionGames[theme].title, exact: true })).toBeVisible();
    const tile = page.locator('.pipe-tile').first();
    const initial = Number(await tile.getAttribute('data-rotation'));
    await tile.click();
    await page.reload();
    await expect(tile).toHaveAttribute('data-rotation', String((initial + 1) % 4));
    await page.getByRole('button', { name: 'Reiniciar reto' }).click();
    await expect(tile).toHaveAttribute('data-rotation', String(initial));
    await page.getByRole('button', { name: 'Ayuda', exact: true }).click();
    await expect(page.locator('.pipe-tile.is-hint')).toBeFocused();
    for (let index = 0; index < 6; index++) {
      await expect(page.getByRole('button', { name: new RegExp(`^Reto ${index + 1}:`) })).toHaveAttribute('aria-current', 'step');
      if (theme === 'radio') await expect(page.locator('.has-current')).toHaveCount(0);
      await solve(page, theme, index);
      await expect(page.getByRole('button', { name: new RegExp(`^Reto ${index + 1}:.*completado`) })).toBeVisible();
      if (index === 5) await page.screenshot({ path: `artifacts/connections-${theme}-solved.png`, fullPage: true });
      await page.getByRole('button', { name: index === 5 ? 'Ver mis retos' : 'Siguiente reto' }).click();
    }
    await expect(page.getByText('Has completado 6 de 6 retos.')).toBeVisible();
    await page.getByRole('link', { name: theme === 'water' ? 'Jugar con cables' : 'Jugar con agua' }).click();
    await expect(page.getByText('0 de 6')).toBeVisible();
    await page.getByRole('link', { name: 'Salir', exact: true }).click();
    await page.getByRole('region', { name: connectionGames[theme].title }).getByRole('link', { name: 'Jugar' }).click();
    await expect(page.getByText('6 de 6', { exact: true })).toBeVisible();
    await expect(page.locator('.pipe-puzzle')).toHaveClass(/is-solved/);
    expect(errors).toEqual([]);
  });
}

test('largest boards fit small phones, tablets and desktop with 44px touch targets', async ({ page }) => {
  for (const theme of ['water', 'radio'] as const) {
    await page.goto(`/games/connections.html?theme=${theme}`);
    await page.getByRole('button', { name: /^Reto 6:/ }).click();
    for (const [name, width, height] of [['small-phone', 320, 568], ['phone', 390, 844], ['tablet', 768, 1024], ['desktop', 1440, 1000], ['landscape', 844, 390]] as const) {
      await page.setViewportSize({ width, height });
      // Resizing can resolve before the next frame applies all media queries.
      await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
      await expect.poll(async () => {
        const tile = (await page.locator('.pipe-tile').first().boundingBox())!;
        return Math.min(tile.width, tile.height);
      }, { message: `${theme} touch targets at ${width} × ${height}` }).toBeGreaterThanOrEqual(44);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.screenshot({ path: `artifacts/connections-${theme}-${name}.png`, fullPage: true });
    }
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/practice.html');
  await page.locator('.connections-picker').screenshot({ path: 'artifacts/connections-game-picker.png' });
});

test('touch rotation and dragging work on the standalone board', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, reducedMotion: 'reduce' });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:4173/games/connections.html?theme=radio');
  const tile = page.locator('.pipe-tile').nth(1);
  const initial = Number(await tile.getAttribute('data-rotation'));
  await tile.tap();
  await expect(tile).toHaveAttribute('data-rotation', String((initial + 1) % 4));
  const bounds = (await tile.boundingBox())!;
  const start = { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 };
  const session = await context.newCDPSession(page);
  await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...start, id: 1 }] });
  for (let step = 1; step <= 8; step++) await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: start.x + step * 5, y: start.y, id: 1 }] });
  await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect(tile).toHaveAttribute('data-rotation', String((initial + 2) % 4));
  await context.close();
});
