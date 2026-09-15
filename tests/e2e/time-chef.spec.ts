import { expect, test, type CDPSession, type Page } from '@playwright/test';
import { menus } from '../../src/games/time-chef/recipes';

const hourHand = (page: Page) => page.getByRole('slider', { name: 'Aguja corta: horas' });
const minuteHand = (page: Page) => page.getByRole('slider', { name: 'Aguja larga: minutos' });
async function setAnalog(page: Page, target: number) {
  // Every new recipe starts at 06:00, independent of target or input format.
  for (let i = 6; i < Math.floor(target / 60); i++) await hourHand(page).press('ArrowRight');
  for (let i = 0; i < target % 60; i += 5) await minuteHand(page).press('ArrowRight');
}
async function arc(page: Page, hand: 'hour' | 'minute', startAngle: number, endAngle: number, touch?: CDPSession, cancel = false) {
  const clock = page.getByRole('group', { name: 'Reloj de agujas' });
  await page.evaluate(async () => { await document.fonts.ready; });
  await clock.scrollIntoViewIfNeeded();
  const rect = (await clock.boundingBox())!;
  const radius = rect.width / 300 * (hand === 'hour' ? 60 : 90);
  const point = (angle: number) => ({ x: rect.x + rect.width / 2 + Math.sin(angle * Math.PI / 180) * radius, y: rect.y + rect.height / 2 - Math.cos(angle * Math.PI / 180) * radius });
  const start = point(startAngle);
  if (touch) await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [start] });
  else { await page.mouse.move(start.x, start.y); await page.mouse.down(); }
  for (let i = 1; i <= 24; i++) {
    const next = point(startAngle + (endAngle - startAngle) * i / 24);
    if (touch) await touch.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [next] });
    else await page.mouse.move(next.x, next.y);
  }
  if (touch) await touch.send('Input.dispatchTouchEvent', { type: cancel ? 'touchCancel' : 'touchEnd', touchPoints: [] });
  else { if (cancel) await page.keyboard.press('Escape'); await page.mouse.up(); }
}

test('practice entry, early and burned results, retry, reset, and exit', async ({ page }) => {
  await page.goto('/practice.html');
  await page.getByRole('region', { name: 'El chef del tiempo' }).getByRole('link', { name: 'Jugar' }).click();
  await expect(page.getByRole('heading', { name: 'El chef del tiempo' })).toBeVisible();
  await page.getByRole('button', { name: '¡Listo!' }).click();
  await expect(page.getByRole('status')).toHaveText('¡Crudo! Muy pronto.');
  await page.getByRole('button', { name: 'Otra vez' }).click();
  await expect(page.getByRole('group', { name: 'Pista: dos relojes, la misma hora' })).toBeVisible();
  await arc(page, 'hour', 180, 270);
  await expect(hourHand(page)).toHaveAttribute('aria-valuenow', '9');
  await page.getByRole('button', { name: '¡Listo!' }).click();
  await expect(page.getByRole('status')).toHaveText('¡Quemado! Muy tarde.');
  await page.screenshot({ path: 'artifacts/time-chef-burned.png', fullPage: true });
  await page.getByRole('button', { name: 'Otra vez' }).click();
  await hourHand(page).press('ArrowLeft');
  await page.getByRole('button', { name: '¡Listo!' }).click();
  await expect(page.getByRole('status')).toContainText('¡En su punto!');
  await page.getByRole('button', { name: 'Siguiente', exact: true }).click();
  await expect(page.getByRole('group', { name: 'Alarma de cocina' })).toBeVisible();
  await page.getByRole('button', { name: 'Empezar menú de nuevo' }).click();
  await expect(hourHand(page)).toHaveAttribute('aria-valuenow', '6');
  await page.getByRole('link', { name: 'Salir' }).click();
  await expect(page).toHaveURL(/practice.html$/);
});

test('all menus complete with keyboard controls, including afternoon conversions and replay', async ({ page }) => {
  await page.goto('/games/time-chef.html');
  for (const [level, menu] of menus.entries()) {
    for (const [index, recipe] of menu.recipes.entries()) {
      if (recipe.format === 'analog') {
        for (let i = 6; i < Math.floor(recipe.target / 60); i++) await page.getByRole('button', { name: 'Añadir una hora' }).press('Enter');
        for (let i = 0; i < recipe.target % 60; i += 5) await page.getByRole('button', { name: 'Añadir 5 minutos' }).press('Space');
      } else await setAnalog(page, recipe.target);
      await page.getByRole('button', { name: '¡Listo!' }).press('Enter');
      await expect(page.getByRole('status')).toContainText('¡En su punto!');
      await page.getByRole('button', { name: index === 2 ? 'Mi menú' : 'Siguiente', exact: true }).press('Enter');
    }
    await expect(page.getByRole('heading', { name: '¡Tu menú está servido!' })).toBeVisible();
    await expect(page.locator('.chef-recipe-list .is-done')).toHaveCount(3);
    await page.getByRole('button', { name: level === 2 ? 'Volver a jugar' : 'Siguiente nivel' }).press('Enter');
  }
  await expect(page.getByRole('combobox', { name: 'Nivel' })).toHaveValue('0');
  await expect(hourHand(page)).toHaveAttribute('aria-valuenow', '6');
});

test('drag moves both hands naturally, cancellation restores time, lesson covers noon and midnight', async ({ page }) => {
  await page.goto('/games/time-chef.html');
  await arc(page, 'minute', 0, 180);
  await expect(minuteHand(page)).toHaveAttribute('aria-valuenow', '30');
  await expect(hourHand(page)).toHaveAttribute('transform', 'rotate(195 150 150)');
  await arc(page, 'minute', 180, 360);
  await expect(hourHand(page)).toHaveAttribute('aria-valuenow', '7');
  await expect(minuteHand(page)).toHaveAttribute('aria-valuenow', '0');
  await arc(page, 'hour', 210, 300, undefined, true);
  await expect(hourHand(page)).toHaveAttribute('aria-valuenow', '7');
  for (let i = 0; i < 5; i++) await hourHand(page).press('ArrowRight');
  // Both tips remain selectable when the hands overlap at twelve.
  await arc(page, 'hour', 0, 30);
  await expect(hourHand(page)).toHaveAttribute('aria-valuenow', '1');
  await hourHand(page).press('ArrowLeft');
  await arc(page, 'minute', 0, 30);
  await expect(minuteHand(page)).toHaveAttribute('aria-valuenow', '5');
  await page.getByText('Juega con las 24 h', { exact: true }).click();
  const demo = page.locator('.chef-lesson');
  await demo.getByRole('button', { name: '+12 h' }).click();
  await expect(demo.getByRole('group', { name: 'Reloj de prueba' })).toContainText('19');
  await expect(demo.getByRole('slider', { name: 'Aguja corta: horas' })).toHaveAttribute('aria-valuenow', '7');
  const timeline = page.getByRole('slider', { name: 'Hora del día' });
  await timeline.focus();
  await page.keyboard.press('Home');
  await expect(timeline).toHaveValue('0');
  await expect(timeline).toHaveAttribute('aria-valuetext', /medianoche/);
  for (let i = 0; i < 12; i++) await page.keyboard.press('ArrowRight');
  await expect(timeline).toHaveAttribute('aria-valuetext', /mediodía/);
  await page.keyboard.press('End');
  await expect(timeline).toHaveValue('23');
});

test.describe('mobile touch', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  test('tap clock numbers, pick minutes, and use a visual hint without dragging', async ({ page }) => {
    await page.goto('/games/time-chef.html');
    await page.getByRole('combobox', { name: 'Nivel' }).selectOption('1');
    await page.getByRole('button', { name: 'Poner hora en 12', exact: true }).tap();
    await expect(hourHand(page)).toHaveAttribute('aria-valuenow', '0');
    await page.getByRole('button', { name: 'Poner hora en 8', exact: true }).tap();
    await page.getByRole('button', { name: 'Minutos', exact: true }).tap();
    await page.getByRole('button', { name: 'Poner minutos en 30', exact: true }).tap();
    await expect(hourHand(page)).toHaveAttribute('transform', 'rotate(255 150 150)');
    await page.getByRole('button', { name: 'Una pista' }).tap();
    await expect(page.getByRole('group', { name: 'Pista: dos relojes, la misma hora' })).toBeVisible();
    await page.screenshot({ path: 'artifacts/time-chef-visual-hint.png', fullPage: true });
    await page.getByRole('button', { name: '¡Listo!' }).tap();
    await expect(page.getByRole('status')).toHaveText('¡En su punto!');
  });
  test('touch hands work across twelve and cancel; all screen widths fit', async ({ page }) => {
    await page.goto('/games/time-chef.html');
    const touch = await page.context().newCDPSession(page);
    await arc(page, 'hour', 180, 330, touch);
    await expect(hourHand(page)).toHaveAttribute('aria-valuenow', '11');
    await arc(page, 'minute', 0, -30, touch);
    await expect(hourHand(page)).toHaveAttribute('aria-valuenow', '10');
    await expect(minuteHand(page)).toHaveAttribute('aria-valuenow', '55');
    await hourHand(page).press('ArrowRight');
    await arc(page, 'minute', 330, 390, touch);
    await expect(minuteHand(page)).toHaveAttribute('aria-valuenow', '5');
    await expect(hourHand(page)).toHaveAttribute('aria-valuenow', '0');
    await expect(page.getByRole('button', { name: /Desde el mediodía/ })).toHaveAttribute('aria-pressed', 'true');
    await arc(page, 'minute', 30, 180, touch, true);
    await expect(minuteHand(page)).toHaveAttribute('aria-valuenow', '5');
    await page.getByRole('button', { name: 'Empezar menú de nuevo' }).tap();
    await arc(page, 'hour', 180, 240, touch);
    await page.getByRole('button', { name: '¡Listo!' }).tap();
    await expect(page.getByRole('status')).toContainText('¡En su punto!');
    for (const width of [320, 390, 700, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: 'artifacts/time-chef-mobile.png', fullPage: true });
  });
});

test('desktop visual preview', async ({ page }) => {
  await page.goto('/games/time-chef.html');
  await page.screenshot({ path: 'artifacts/time-chef-desktop.png', fullPage: true });
});
