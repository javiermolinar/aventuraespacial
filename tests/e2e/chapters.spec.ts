import { expect, test, type Page } from '@playwright/test';
import { chapterCatalog } from '../../src/adventure/chapters/catalog';
import { chispaChapter as chapter } from '../../src/adventure/chapters/chispa';
import { campaignStorageKey, newCampaign } from '../../src/adventure/campaign';
import { adventureStorageKey, earnPart, moveTo, newAdventure, placePart } from '../../src/adventure/progress';
import { destinations } from '../../src/adventure/types';
import { readAdventure, readCampaign } from './adventure-saves';

function ending() {
  let p = newAdventure(chapter, 3, 'girl', 'Lucía');
  while (chapter.scenes[p.sceneId].type !== 'ending') {
    const scene = chapter.scenes[p.sceneId];
    if (scene.type === 'build') while (p.placedCount < 6) p = placePart(earnPart(p, chapter), chapter);
    else p = moveTo(p, chapter, destinations(scene)[0]);
  }
  return p;
}
async function screenshot(page: Page, name: string) {
  await page.evaluate(async () => { await document.fonts.ready; await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))); });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: `artifacts/chapters-${name}.png`, fullPage: true });
}

test('home shows selectable Chispa and six anonymous locked chapters, with keyboard navigation and responsive layouts', async ({ page }) => {
  await page.goto('/');
  const menu = page.getByRole('region', { name: 'Elige un capítulo' });
  await expect(menu.getByRole('button')).toHaveCount(7);
  await expect(menu.locator('button:disabled')).toHaveCount(6);
  for (const entry of chapterCatalog.slice(1)) {
    await expect(menu).not.toContainText(entry.robot.name);
    expect(await menu.getByRole('button').evaluateAll(buttons => buttons.map(button => button.getAttribute('aria-label')).join(' '))).not.toContain(entry.robot.name);
  }
  for (const [width, height] of [[1440, 1000], [768, 1024], [390, 844], [320, 568], [844, 390]]) {
    await page.setViewportSize({ width, height });
    await screenshot(page, `locked-${width}x${height}`);
  }
  await menu.getByRole('button', { name: /Capítulo 1\. Chispa/ }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: '¿Quién viaja hoy?' })).toBeFocused();
  await page.getByRole('button', { name: 'Comenzar', exact: true }).click();
  await page.getByRole('button', { name: 'Volver al inicio', exact: true }).click();
  await expect(menu.getByRole('button', { name: /Capítulo 1\. Chispa.*Continuar/ })).toBeEnabled();
  await page.reload();
  await menu.getByRole('button', { name: /Capítulo 1\. Chispa/ }).click();
  await expect(page.getByRole('heading', { name: 'Un mensaje para ti' })).toBeFocused();
});

test('explicit completion reveals Brote as upcoming; replay confirmation and reload preserve that unlock', async ({ page }) => {
  const saved = ending();
  await page.addInitScript(({ key, saved }) => localStorage.setItem(key, JSON.stringify(saved)), { key: adventureStorageKey, saved });
  await page.goto('/games/adventure.html');
  await expect(page.getByRole('button', { name: 'Terminar capítulo' })).toBeVisible();
  expect((await readCampaign(page)).completed).toEqual([]);
  await page.getByRole('button', { name: 'Volver al inicio', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Capítulo 2. Bloqueado. Completa el capítulo 1.', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Continuar aventura', exact: true }).click();
  await page.getByRole('button', { name: 'Terminar capítulo', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Una aventura espacial', exact: true })).toBeFocused();
  await expect(page.getByRole('button', { name: 'Capítulo 2. Brote. Próximamente.', exact: true })).toBeDisabled();
  await expect(page.getByRole('region', { name: 'Elige un capítulo' })).not.toContainText('Rayo');
  expect((await readCampaign(page)).completed).toEqual([chapter.id]);
  expect(await page.evaluate(() => localStorage.getItem('little-robot-lab:v1'))).toBeNull();
  await screenshot(page, 'revealed-desktop');
  await page.setViewportSize({ width: 390, height: 844 });
  await screenshot(page, 'revealed-mobile');
  await page.getByRole('button', { name: /Capítulo 1\. Chispa/ }).click();
  await expect(page.getByText(/Los capítulos desbloqueados se conservarán/)).toBeVisible();
  await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
  expect(await readAdventure(page)).toEqual(saved);
  await page.getByRole('button', { name: 'Repetir capítulo', exact: true }).click();
  await page.getByRole('button', { name: 'Comenzar de nuevo', exact: true }).click();
  expect(await readAdventure(page)).toMatchObject({ sceneId: 'message', placedCount: 0, character: 'girl', playerName: 'Lucía', mathsLevel: 3 });
  expect((await readCampaign(page)).completed).toEqual([chapter.id]);
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Capítulo 2. Brote. Próximamente.', exact: true })).toBeDisabled();
  // A stale ending in the legacy key cannot overwrite the new replay's position.
  expect((await readAdventure(page)).sceneId).toBe('message');
});

test('completion and replay keep unlocks in memory when storage writes are blocked', async ({ page }) => {
  const saved = ending();
  await page.addInitScript(({ legacyKey, saved }) => {
    Object.defineProperty(window, 'localStorage', { value: {
      getItem: (key: string) => key === legacyKey ? JSON.stringify(saved) : null,
      setItem: () => { throw new Error('blocked'); },
    } });
  }, { legacyKey: adventureStorageKey, saved });
  await page.goto('/games/adventure.html');
  await expect(page.getByText(/No se puede guardar el progreso/)).toBeVisible();
  await page.getByRole('button', { name: 'Terminar capítulo', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Capítulo 2. Brote. Próximamente.', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Repetir capítulo', exact: true }).click();
  await page.getByRole('button', { name: 'Comenzar de nuevo', exact: true }).click();
  await page.getByRole('button', { name: 'Volver al inicio', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Capítulo 2. Brote. Próximamente.', exact: true })).toBeDisabled();
});

test('an invalid campaign cannot expose future titles or fall back to a stale completed chapter', async ({ page }) => {
  const broken = { ...newCampaign(chapterCatalog), completed: ['brote'] };
  await page.addInitScript(({ campaignKey, legacyKey, broken, legacy }) => {
    localStorage.setItem(campaignKey, JSON.stringify(broken));
    localStorage.setItem(legacyKey, JSON.stringify(legacy));
  }, { campaignKey: campaignStorageKey, legacyKey: adventureStorageKey, broken, legacy: ending() });
  await page.goto('/');
  await expect(page.getByText(/La partida guardada no es compatible/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Capítulo 2. Bloqueado. Completa el capítulo 1.', exact: true })).toBeDisabled();
  await expect(page.getByRole('region', { name: 'Elige un capítulo' })).not.toContainText('Brote');
});
