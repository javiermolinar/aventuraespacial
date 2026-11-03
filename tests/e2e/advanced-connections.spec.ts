import { expect, test, type Page } from '@playwright/test';
import { advancedConnectionGames } from '../../src/games/connections/advanced-levels';
import type { ConnectionTheme } from '../../src/games/connections/pipes';

async function solve(page: Page, theme: ConnectionTheme, index: number) {
  const layout = advancedConnectionGames[theme].levels[index].layout;
  const tiles = page.locator('.pipe-tile');
  for (let index = 0; index < layout.tiles.length; index++) {
    if (layout.tiles[index] === 'cross') continue;
    const tile = tiles.nth(index);
    const turns = (layout.solution[index] - Number(await tile.getAttribute('data-rotation')) + 4) % 4;
    for (let turn = 0; turn < turns; turn++) {
      await tile.focus();
      await page.keyboard.press(turn % 2 ? 'Space' : 'Enter');
    }
  }
  await expect(page.locator('.has-water, .has-current, .is-linked')).toHaveCount(0);
  await page.getByRole('button', { name: 'Probar', exact: true }).click();
  await expect(page.locator('.pipe-puzzle')).toHaveClass(/is-solved/);
}

for (const theme of ['water', 'radio'] as const) {
  test(`${theme}: advanced version completes six new levels, saves separately and preserves mode across games`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('/practice.html');
    await page.getByRole('region', { name: advancedConnectionGames[theme].title })
      .getByRole('link', { name: 'Versión avanzada · 6 retos nuevos' }).click();
    await expect(page).toHaveURL(/mode=advanced/);
    await expect(page.getByRole('button', { name: /^Avanzada/ })).toHaveAttribute('aria-pressed', 'true');
    await page.getByRole('button', { name: 'Probar', exact: true }).click();
    await expect(page.getByRole('status')).toContainText('Extremos sueltos:');
    await expect(page.getByRole('status')).toBeVisible();
    const fixed = page.locator('.pipe-tile.is-fixed').first();
    const rotation = await fixed.getAttribute('data-rotation');
    await fixed.focus();
    await page.keyboard.press('Enter');
    await expect(fixed).toHaveAttribute('data-rotation', rotation!);
    await page.getByRole('button', { name: 'Ayuda', exact: true }).click();
    await expect(page.locator('.is-hint')).not.toHaveClass(/is-fixed/);
    await expect(page.locator('.is-hint')).toBeFocused();
    for (let index = 0; index < 6; index++) {
      await solve(page, theme, index);
      if (index === 5) await page.screenshot({ path: `artifacts/connections-${theme}-advanced-solved.png`, fullPage: true });
      await page.getByRole('button', { name: index === 5 ? 'Ver mis retos' : 'Siguiente reto' }).click();
    }
    await expect(page.getByText('Has completado 6 de 6 retos.')).toBeVisible();
    await page.getByRole('button', { name: /^Original/ }).click();
    await expect(page.getByText('0 de 6')).toBeVisible();
    await page.getByRole('button', { name: /^Reto 2:/ }).click();
    const tile = page.locator('.pipe-tile').first();
    await tile.click();
    const originalRotation = await tile.getAttribute('data-rotation');
    await page.getByRole('button', { name: /^Avanzada/ }).click();
    await page.reload();
    await expect(page.locator('.pipe-puzzle')).toHaveClass(/is-solved/);
    await expect(page.getByText('6 de 6', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Ver mis retos' }).click();
    await page.getByRole('link', { name: theme === 'water' ? 'Jugar con cables' : 'Jugar con agua' }).click();
    await expect(page).toHaveURL(/mode=advanced/);
    await expect(page.getByText('0 de 6')).toBeVisible();
    await page.goto(`/games/connections.html?theme=${theme}`);
    await expect(page.getByRole('button', { name: /^Reto 2:/ })).toHaveAttribute('aria-current', 'step');
    await expect(page.locator('.pipe-tile').first()).toHaveAttribute('data-rotation', originalRotation!);
    expect(errors).toEqual([]);
  });
}

test('advanced boards retain 44px targets and scroll internally on small screens', async ({ page }) => {
  for (const theme of ['water', 'radio'] as const) {
    await page.goto(`/games/connections.html?theme=${theme}&mode=advanced`);
    await page.getByRole('button', { name: /^Reto 6:/ }).click();
    for (const [name, width, height] of [['small-phone', 320, 568], ['phone', 390, 844], ['tablet', 768, 1024], ['desktop', 1440, 1000], ['landscape', 844, 390]] as const) {
      await page.setViewportSize({ width, height });
      await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
      await expect.poll(async () => {
        const box = (await page.locator('.pipe-tile').first().boundingBox())!;
        return Math.min(box.width, box.height);
      }).toBeGreaterThanOrEqual(44);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      const region = page.getByRole('region', { name: 'Tablero desplazable' });
      if (width >= 768) {
        const dimensions = await region.evaluate(element => ({ scroll: element.scrollWidth, client: element.clientWidth }));
        expect(dimensions.scroll, `${theme} at ${width}`).toBeLessThanOrEqual(dimensions.client);
        await region.evaluate(element => { element.scrollLeft = 0; });
        const source = await page.locator('.cable-battery, .pipe-source').boundingBox();
        const frame = (await region.boundingBox())!;
        expect(source!.x).toBeGreaterThanOrEqual(frame.x);
      }
      await region.evaluate(element => { element.scrollLeft = element.scrollWidth; });
      await page.screenshot({ path: `artifacts/connections-${theme}-advanced-${name}.png`, fullPage: true });
    }
  }
});

test('advanced touch rotation still works after horizontally scrolling a large board', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 320, height: 568 }, hasTouch: true, isMobile: true, reducedMotion: 'reduce' });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:4173/games/connections.html?theme=radio&mode=advanced');
  await page.getByRole('button', { name: /^Reto 6:/ }).tap();
  const region = page.getByRole('region', { name: 'Tablero desplazable' });
  const maxScroll = await region.evaluate(element => element.scrollWidth - element.clientWidth);
  expect(maxScroll).toBeGreaterThan(0);
  await region.evaluate(element => { element.scrollLeft = element.scrollWidth; });
  const tile = page.locator('.pipe-tile').nth(5);
  const initial = Number(await tile.getAttribute('data-rotation'));
  await tile.tap();
  await expect(tile).toHaveAttribute('data-rotation', String((initial + 1) % 4));
  await page.reload();
  await expect(tile).toHaveAttribute('data-rotation', String((initial + 1) % 4));
  await context.close();
});
