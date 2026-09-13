import { expect, test, type Page } from '@playwright/test';
import { placeByTap, readOperation, solveCurrent } from './helpers';
import { adventureStorageKey, earnPart, moveTo, newAdventure, placePart, type AdventureProgress } from '../../src/adventure/progress';
import { chispaChapter as chapter, chispaScript } from '../../src/adventure/chapters/chispa';
import { personalize } from '../../src/adventure/personalization';
import { readAdventure, seedLegacyAdventure } from './adventure-saves';
import { completeAdventureSetup } from './adventure-setup';

declare global { interface Window { shakes: number } }

async function begin(page: Page, level = '0') {
  await page.goto('/games/adventure.html');
  if (level !== '0') {
    // Existing saves retain their difficulty; new setup no longer asks for one.
    await seedLegacyAdventure(page, newAdventure(chapter, Number(level), 'boy', 'piloto'));
    await page.reload();
  } else await completeAdventureSetup(page);
}

async function expectFullScene(page: Page, playerName = '') {
  const title = await page.locator('.reading-dock h1').textContent();
  const scene = Object.values(chapter.scenes).find(scene => personalize(scene.title, playerName) === title);
  if (!scene || scene.type === 'build') throw new Error(`Unknown reading scene: ${title}`);
  await expect(page.locator('.story-passage p')).toHaveText(scene.paragraphs.map(paragraph => personalize(paragraph, playerName)));
  await expect(page.getByRole('button', { name: /Seguir leyendo|Volver a leer/ })).toHaveCount(0);
  await expect(page.locator('dialog, .reading-feedback')).toHaveCount(0);
}

async function toBuild(page: Page) {
  await expectFullScene(page);
  await page.getByRole('button', { name: 'En la estación Luna.', exact: true }).click();
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await expectFullScene(page);
  await page.getByRole('button', { name: 'Entrar al taller', exact: true }).click();
  await expectFullScene(page);
  await page.getByRole('button', { name: 'Construir a Chispa.', exact: true }).click();
}

async function completeRobot(page: Page, placed = 0, playerName = '') {
  for (let index = placed; index < 6; index++) {
    await expect(page.getByRole('button', { name: 'Arreglar la radio.', exact: true })).toHaveCount(0);
    await solveCurrent(page);
    await expect(page.locator('.robot-introduction')).toHaveCount(0);
    await placeByTap(page);
    await expect(page.getByRole('progressbar', { name: 'Piezas colocadas' })).toHaveAttribute('aria-valuenow', String(index + 1));
    if (index === 1 || index === 3) {
      // Former breakpoints must keep the same maths section, including after reload.
      const operation = await readOperation(page);
      await page.reload();
      expect(await readOperation(page)).toEqual(operation);
      await expect(page.getByRole('heading', { name: 'Una nueva compañera', exact: true })).toBeVisible();
    }
  }
  await expect(page.getByRole('heading', { name: 'Chispa', exact: true })).toBeFocused();
  await expect(page.locator('.robot-introduction .story-passage p')).toHaveText(chispaScript.robotIntroduction.pages[0].text.map(paragraph => personalize(paragraph, playerName)));
  await expect(page.locator('.factory, .pipe-console')).toHaveCount(0);
  await capture(page, 'cinematic-robot-complete');
  await page.getByRole('button', { name: 'Arreglar la radio.', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'El circuito de la radio', exact: true })).toBeFocused();
}

async function capture(page: Page, name: string) {
  await page.evaluate(async () => { await document.fonts.ready; await Promise.all([...document.images].map(image => image.decode().catch(() => {}))); });
  await page.waitForTimeout(650);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: `artifacts/${name}.png`, fullPage: true });
}

async function expectArtwork(page: Page, variant: string) {
  await expect.poll(() => page.locator('.cinematic-backdrop img').evaluate(image => (image as HTMLImageElement).currentSrc)).toContain(`${variant}.webp`);
}

async function restart(page: Page) {
  await page.getByRole('button', { name: 'Volver al inicio', exact: true }).click();
  await page.getByRole('button', { name: 'Reiniciar capítulo', exact: true }).click();
}

test('home: single main action, practice tile beside chapters, and continuous start/continue flow', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('little-robot-lab:v1', JSON.stringify({ completed: { 1: 3 }, sound: false })));
  await page.goto('/');
  await expect(page.locator('.home-actions button')).toHaveCount(1);
  await expect(page.locator('.chapter-card')).toHaveCount(8);
  await expect(page.getByRole('button', { name: 'Empezar aventura' })).toBeVisible();
  await expect(page.getByRole('link')).toHaveCount(1);
  await capture(page, 'adventure-home-desktop');
  await page.setViewportSize({ width: 390, height: 844 });
  await capture(page, 'adventure-home-mobile');
  const practice = page.getByRole('link', { name: 'Practicar mates' });
  const bounds = await practice.boundingBox();
  expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(844);
  expect(bounds!.height).toBeGreaterThanOrEqual(56);
  await expect(practice.locator('.chapter-robot svg')).toBeVisible();
  await expect(practice).toHaveClass(/chapter-card/);
  const firstChapter = await page.locator('.chapter-card').first().boundingBox();
  expect(bounds!.y).toBe(firstChapter!.y);
  await practice.click();
  await expect(page.locator('.level-card')).toHaveCount(7);
  await expect(page.locator('.collected-robot')).toHaveCount(1);
  await page.getByRole('link', { name: 'Volver al inicio' }).click();
  await page.getByRole('button', { name: 'Empezar aventura' }).click();
  await expect(page).toHaveURL(/index.html$/);
  await completeAdventureSetup(page, 'piloto', 'Niña');
  await expectFullScene(page);
  await expectArtwork(page, 'girl-portrait');
  await page.getByRole('button', { name: 'Activar sonido' }).click();
  const audio = page.getByTestId('background-music');
  await expect.poll(() => audio.evaluate(element => !(element as HTMLAudioElement).paused)).toBe(true);
  await expect(audio).toHaveAttribute('src', './music/dream-culture.mp3');
  await page.getByRole('button', { name: 'Volver al inicio', exact: true }).click();
  await expect(page.locator('.home-actions button')).toHaveCount(2);
  await expect(audio).toHaveAttribute('src', './music/wallpaper.mp3');
  await expect.poll(() => audio.evaluate(element => !(element as HTMLAudioElement).paused)).toBe(true);
  await capture(page, 'adventure-home-continue-mobile');
  await page.reload();
  await page.getByRole('button', { name: 'Continuar aventura' }).click();
  await expectFullScene(page);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('little-robot-lab:v1')!).completed)).toEqual({ 1: 3 });
});

test('name entry focuses and traps the keyboard; cancel preserves the draft profile and saves personalize the story', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Empezar aventura' }).click();
  const opener = page.getByRole('button', { name: 'Empezar aventura' });
  const dialog = page.getByRole('dialog', { name: '¿Cómo te llamas?' });
  const input = dialog.getByRole('textbox', { name: 'Tu nombre' });
  await expect(input).toBeFocused();
  await expect(input).toHaveAttribute('maxlength', '24');
  await expect(dialog.getByRole('button', { name: 'Siguiente' })).toBeDisabled();
  await input.fill('   ');
  await expect(dialog.getByRole('button', { name: 'Siguiente' })).toBeDisabled();
  await input.fill('No guardar');
  await page.keyboard.press('Tab');
  await expect(dialog.getByRole('button', { name: 'Siguiente' })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(dialog.getByRole('button', { name: 'Cancelar' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(opener).toBeFocused();
  await opener.click();
  await expect(input).toHaveValue('');
  await input.fill('  Lucía  ');
  await capture(page, 'adventure-name-desktop');
  await page.setViewportSize({ width: 390, height: 844 });
  await capture(page, 'adventure-name-mobile');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog', { name: '¿Niño o niña?' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Niño', exact: true })).toBeFocused();
  await expect(page.getByRole('button', { name: 'Empezar', exact: true })).toBeDisabled();
  await expect(page.locator('select, details, [role="tab"]')).toHaveCount(0);
  await page.getByRole('button', { name: 'Niña', exact: true }).click();
  await capture(page, 'adventure-named-setup-mobile');
  await page.getByRole('button', { name: 'Empezar', exact: true }).click();
  await expectFullScene(page, 'Lucía');
  await page.reload();
  await page.getByRole('button', { name: 'Continuar aventura' }).click();
  await expectFullScene(page, 'Lucía');
  expect((await readAdventure(page)).playerName).toBe('Lucía');
  await restart(page);
  await expect(input).toHaveValue('Lucía');
  await input.fill('Mateo');
  await dialog.getByRole('button', { name: 'Siguiente' }).click();
  await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
  await page.getByRole('button', { name: 'Continuar aventura' }).click();
  await expectFullScene(page, 'Lucía');
});

test('two-step setup fits small and landscape phones and writes nothing until starting', async ({ page }) => {
  await page.goto('/games/adventure.html');
  await page.getByRole('textbox', { name: 'Tu nombre' }).fill('Ana');
  for (const [width, height] of [[320, 568], [844, 390]]) {
    await page.setViewportSize({ width, height });
    for (const step of ['name', 'character']) {
      const dialog = page.getByRole('dialog');
      const box = (await dialog.boundingBox())!;
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.y).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(width);
      expect(box.y + box.height).toBeLessThanOrEqual(height);
      await page.screenshot({ path: `artifacts/setup-${step}-${width}x${height}.png`, animations: 'disabled' });
      if (step === 'name') await page.getByRole('button', { name: 'Siguiente', exact: true }).click();
      else {
        await page.getByRole('button', { name: 'Niña', exact: true }).click();
        await page.getByRole('button', { name: 'Anterior', exact: true }).click();
        await expect(page.getByRole('textbox')).toHaveValue('Ana');
      }
    }
  }
  await page.getByRole('button', { name: 'Siguiente', exact: true }).click();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem('matefaciles:campaign:v1'))).toBeNull();
  await page.getByRole('button', { name: 'Empezar aventura' }).click();
  await expect(page.getByRole('textbox')).toHaveValue('');
  await completeAdventureSetup(page, 'Mateo');
  expect(await readAdventure(page)).toMatchObject({ playerName: 'Mateo', character: 'boy', mathsLevel: 0 });
});

test('names are rendered as text, not HTML, and survive in-memory play with blocked storage', async ({ page }) => {
  await page.addInitScript(() => { Object.defineProperty(window, 'localStorage', { get() { throw new Error('blocked'); } }); });
  await page.goto('/games/adventure.html');
  await completeAdventureSetup(page, '<b>Ana</b>');
  await expectFullScene(page, '<b>Ana</b>');
  await expect(page.locator('.story-passage b')).toHaveCount(0);
  await page.getByRole('button', { name: 'Volver al inicio', exact: true }).click();
  await page.getByRole('button', { name: 'Continuar aventura' }).click();
  await expectFullScene(page, '<b>Ana</b>');
});

test('whole chapter: text and choices share each screen; answers use only red/green states', async ({ page }) => {
  test.setTimeout(90_000);
  const errors: string[] = [], external: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => { if (!request.url().startsWith('http://127.0.0.1:4173/')) external.push(request.url()); });
  await begin(page);
  await expect(page.getByRole('heading', { name: 'Un mensaje para ti' })).toBeFocused();
  await expectFullScene(page);
  await expect(page.locator('.adventure-chrome button')).toHaveCount(3);
  expect(await page.locator('.cinematic-backdrop').boundingBox()).toEqual({ x: 0, y: 0, width: 1440, height: 1000 });
  await capture(page, 'cinematic-reading-desktop');
  const height = (await page.locator('.reading-dock').boundingBox())!.height;
  const wrong = page.getByRole('button', { name: 'En tu pequeña nave.', exact: true });
  await wrong.click();
  await expect(wrong).toHaveClass(/is-incorrect/);
  await expect(wrong).toHaveAttribute('aria-invalid', 'true');
  await expect(page.getByRole('status')).toHaveClass('sr-only');
  expect((await page.locator('.reading-dock').boundingBox())!.height).toBe(height);
  await expect(page.getByRole('button', { name: 'Continuar', exact: true })).toHaveCount(0);
  await capture(page, 'cinematic-wrong-desktop');
  await page.getByRole('button', { name: 'En la estación Luna.', exact: true }).click();
  await expect(page.getByRole('button', { name: 'En la estación Luna.', exact: true })).toHaveClass(/is-correct/);
  await expectFullScene(page);
  await capture(page, 'cinematic-correct-desktop');
  await toBuild(page);
  await capture(page, 'cinematic-build-desktop');
  await completeRobot(page);
  await expect(page.getByRole('heading', { name: 'El circuito de la radio', exact: true })).toBeFocused();
  await page.getByRole('button', { name: 'Saltar', exact: true }).click();
  await expectFullScene(page);
  await page.getByRole('button', { name: 'Contar lo que ha pasado.', exact: true }).click();
  await expectFullScene(page);
  for (const name of ['Chispa reparó la radio.', 'Escuché el mensaje de mis padres.', 'Construí a Chispa.']) await page.getByRole('button', { name }).click();
  await page.getByRole('button', { name: 'Comprobar orden' }).click();
  await expect(page.locator('.sequence-option.is-incorrect')).toHaveCount(3);
  await expect(page.getByRole('status')).toHaveClass('sr-only');
  await page.getByRole('button', { name: 'Ordenar de nuevo' }).click();
  for (const name of ['Escuché el mensaje de mis padres.', 'Construí a Chispa.', 'Chispa reparó la radio.']) await page.getByRole('button', { name }).click();
  await page.getByRole('button', { name: 'Comprobar orden' }).click();
  await expect(page.locator('.sequence-option.is-correct')).toHaveCount(3);
  await page.getByRole('button', { name: 'Enviar mi relato' }).click();
  await expectFullScene(page);
  await capture(page, 'cinematic-ending-desktop');
  await page.reload();
  await expect(page.locator('.retell-prompt')).toBeVisible();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('little-robot-lab:v1') || '{}').completed || {})).toEqual({});
  await page.locator('.chapter-ending').getByRole('button', { name: 'Terminar capítulo', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Repetir capítulo', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Capítulo 2. Brote. Próximamente.', exact: true })).toBeDisabled();
  expect(errors).toEqual([]);
  expect(external).toEqual([]);
});

test('wrong answers shake on every retry, but not with reduced motion; correct answers never shake', async ({ page }) => {
  await page.addInitScript(() => {
    const original = Element.prototype.animate;
    (window as Window & { shakes: number }).shakes = 0;
    Element.prototype.animate = function (keyframes, options) {
      if (this.matches('.story-option')) (window as Window & { shakes: number }).shakes++;
      return original.call(this, keyframes, options);
    };
  });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await begin(page);
  const wrong = page.getByRole('button', { name: 'En tu pequeña nave.', exact: true });
  await wrong.click();
  await wrong.focus();
  await page.keyboard.press('Enter');
  await expect(wrong).toBeFocused();
  expect(await page.evaluate(() => (window as Window & { shakes: number }).shakes)).toBe(2);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await wrong.click();
  expect(await page.evaluate(() => (window as Window & { shakes: number }).shakes)).toBe(2);
  await page.getByRole('button', { name: 'En la estación Luna.', exact: true }).click();
  expect(await page.evaluate(() => (window as Window & { shakes: number }).shakes)).toBe(2);
  await expectFullScene(page);
});

test('ready parts and operations survive home/continue; new adventure requires confirmation', async ({ page }) => {
  await begin(page, '3');
  await toBuild(page);
  const operation = await readOperation(page);
  await page.reload();
  expect(await readOperation(page)).toEqual(operation);
  await solveCurrent(page);
  await page.reload();
  await expect(page.getByRole('button', { name: 'Arrastrar la cabeza', exact: true })).toBeVisible();
  await placeByTap(page);
  const second = await readOperation(page);
  await restart(page);
  await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
  await page.getByRole('button', { name: 'Continuar aventura' }).click();
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '1');
  expect(await readOperation(page)).toEqual(second);
  await restart(page);
  await completeAdventureSetup(page);
  await toBuild(page);
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
});

test('old interrupted construction resumes the same robot and pending piece, then finishes without another interruption', async ({ page }) => {
  const saved = { ...newAdventure(chapter, 0, 'girl', 'Lucía'), chapterVersion: 1, sceneId: 'build-arms', history: ['message', 'plan', 'workshop', 'build-start', 'tool'], placedCount: 3, ready: true };
  await page.goto('/games/adventure.html');
  await page.evaluate(({ key, saved }) => localStorage.setItem(key, JSON.stringify(saved)), { key: adventureStorageKey, saved });
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Una nueva compañera', exact: true })).toBeVisible();
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '3');
  await placeByTap(page);
  await completeRobot(page, 4, 'Lucía');
  const loaded = await readAdventure(page);
  expect(loaded).toMatchObject({ chapterVersion: 6, sceneId: 'radio-cables', placedCount: 6, playerName: 'Lucía', character: 'girl', operations: saved.operations });
});

test('legacy paragraph saves show full text; images follow orientation; large text remains usable', async ({ page }) => {
  const saved = { ...newAdventure(chapter, 0, 'girl'), beat: 2 };
  await page.addInitScript(({ key, saved }) => localStorage.setItem(key, JSON.stringify(saved)), { key: adventureStorageKey, saved });
  await page.goto('/games/adventure.html');
  await expectFullScene(page);
  await expectArtwork(page, 'girl-landscape');
  await page.setViewportSize({ width: 390, height: 844 });
  await expectArtwork(page, 'girl-portrait');
  await capture(page, 'cinematic-girl-reading-mobile');
  await page.getByRole('button', { name: 'En tu pequeña nave.', exact: true }).click();
  await capture(page, 'cinematic-wrong-mobile');
  await page.setViewportSize({ width: 844, height: 390 });
  await expectArtwork(page, 'girl-landscape');
  await capture(page, 'cinematic-phone-landscape');
  await page.setViewportSize({ width: 320, height: 568 });
  await page.addStyleTag({ content: '.adventure-experience .story-passage { font-size: 32px !important; }' });
  await page.getByRole('button', { name: 'En la estación Luna.', exact: true }).click();
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await expectFullScene(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('mobile touch and keyboard, construction and tablet layouts', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, reducedMotion: 'reduce' });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:4173/games/adventure.html');
  await page.getByRole('textbox', { name: 'Tu nombre' }).fill('piloto');
  await page.getByRole('button', { name: 'Siguiente', exact: true }).tap();
  await page.getByRole('button', { name: 'Niño', exact: true }).tap();
  await page.getByRole('button', { name: 'Empezar', exact: true }).tap();
  await capture(page, 'cinematic-boy-reading-mobile');
  await expectFullScene(page);
  await page.getByRole('button', { name: 'En la estación Luna.', exact: true }).focus();
  await page.keyboard.press('Enter');
  await page.getByRole('button', { name: 'Continuar', exact: true }).focus();
  await page.keyboard.press('Enter');
  await page.getByRole('button', { name: 'Entrar al taller', exact: true }).tap();
  await page.getByRole('button', { name: 'Construir a Chispa.', exact: true }).tap();
  await capture(page, 'cinematic-build-mobile');
  await solveCurrent(page);
  await capture(page, 'cinematic-piece-mobile');
  await page.getByRole('button', { name: /^Arrastrar / }).tap();
  await page.getByRole('button', { name: /^Encajar / }).tap();
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '1');
  let p: AdventureProgress = newAdventure(chapter, 0);
  for (const id of ['plan', 'workshop', 'build-start', 'radio-cables', 'repair']) {
    const scene = chapter.scenes[p.sceneId];
    if (scene.type === 'build') while (p.placedCount < scene.targetPlacedParts) p = placePart(earnPart(p, chapter), chapter);
    p = moveTo(p, chapter, id);
  }
  await seedLegacyAdventure(page, p);
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.reload();
  await capture(page, 'cinematic-reading-tablet');
  await expectFullScene(page);
  await context.close();
});

test('blocked storage and missing artwork still allow home/start/continue', async ({ page }) => {
  await page.addInitScript(() => { Object.defineProperty(window, 'localStorage', { get() { throw new Error('blocked'); } }); });
  await page.route('**/cockpit-*.webp', route => route.abort());
  await page.goto('/');
  await page.getByRole('button', { name: 'Empezar aventura' }).click();
  await completeAdventureSetup(page);
  await expect(page.getByText(/No se puede guardar el progreso/)).toBeVisible();
  await expect(page.getByText(/La ilustración no se ha podido cargar/)).toBeVisible();
  await toBuild(page);
  await solveCurrent(page);
  await page.getByRole('button', { name: 'Volver al inicio', exact: true }).click();
  await page.getByRole('button', { name: 'Continuar aventura' }).click();
  await expect(page.getByRole('button', { name: 'Arrastrar la cabeza', exact: true })).toBeVisible();
});

test('incompatible chapter saves show an explicit fresh-start notice', async ({ page }) => {
  await page.addInitScript(key => localStorage.setItem(key, '{"chapterVersion":99}'), adventureStorageKey);
  await page.goto('/');
  await page.getByRole('button', { name: 'Empezar aventura' }).click();
  await expect(page.getByText(/La partida guardada no es compatible/)).toBeVisible();
  await completeAdventureSetup(page);
  await expectFullScene(page);
});
