import { expect, test } from '@playwright/test';
import { completeAdventureSetup } from './adventure-setup';
import { createServer, type Server } from 'node:http';
import { createReadStream, statSync } from 'node:fs';
import type { AddressInfo } from 'node:net';
import { extname, resolve, sep } from 'node:path';

/** Serve only the production directory under the real Pages project prefix; no SPA fallback. */
test.describe('GitHub Pages project deployment', () => {
  test.skip(!process.env.TEST_PRODUCTION, 'Build dist/ and run with TEST_PRODUCTION=1');
  const prefix = '/aventuraespacial/';
  let server: Server;
  let origin: string;
  test.beforeAll(async () => {
    const root = resolve('dist');
    const mime: Record<string, string> = {
      '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml',
      '.webp': 'image/webp', '.jpg': 'image/jpeg', '.png': 'image/png', '.woff2': 'font/woff2',
      '.mp3': 'audio/mpeg', '.txt': 'text/plain',
    };
    server = createServer((request, response) => {
      const pathname = new URL(request.url!, 'http://localhost').pathname;
      if (!pathname.startsWith(prefix)) { response.writeHead(404).end(); return; }
      const file = resolve(root, decodeURIComponent(pathname.slice(prefix.length) || 'index.html'));
      if (!file.startsWith(root + sep)) { response.writeHead(404).end(); return; }
      try {
        const info = statSync(file);
        if (!info.isFile()) { response.writeHead(404).end(); return; }
        response.writeHead(200, { 'Content-Type': mime[extname(file)] ?? 'application/octet-stream', 'Content-Length': info.size });
        createReadStream(file).pipe(response);
      } catch { response.writeHead(404).end(); }
    });
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
    origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });
  test.afterAll(async () => {
    if (server) await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  });

  test('all entry pages, navigation, illustrations and music work below /aventuraespacial/', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('response', response => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
    page.on('request', request => { if (!request.url().startsWith(origin + prefix)) errors.push(`Outside project path: ${request.url()}`); });

    await page.goto(origin + prefix);
    await expect(page.getByRole('heading', { name: 'Una aventura espacial', exact: true })).toBeVisible();
    await expect(page.locator('.chapter-card')).toHaveCount(8);
    const image = page.locator('.cinematic-backdrop img');
    await expect.poll(() => image.evaluate(element => (element as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
    await page.getByRole('button', { name: 'Activar sonido' }).click();
    const audio = page.getByTestId('background-music');
    await expect.poll(() => audio.evaluate(element => !(element as HTMLAudioElement).paused)).toBe(true);
    await expect.poll(() => audio.evaluate(element => (element as HTMLAudioElement).currentSrc)).toBe(origin + prefix + 'music/wallpaper.mp3');
    await page.getByRole('button', { name: 'Empezar aventura' }).click();
    await completeAdventureSetup(page);
    await expect(page.getByRole('heading', { name: 'Un mensaje para ti' })).toBeVisible();
    await page.goto(origin + prefix + 'games/adventure.html');
    await expect(page.getByRole('heading', { name: 'Un mensaje para ti' })).toBeVisible();
    await expect.poll(() => image.evaluate(element => (element as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
    await page.getByRole('button', { name: 'Volver al inicio', exact: true }).click();
    await page.getByRole('link', { name: 'Practicar mates' }).click();
    await expect(page).toHaveURL(origin + prefix + 'practice.html');
    await page.locator('.level-card').first().click();
    await expect(page).toHaveURL(origin + prefix + 'games/robot-lab.html?level=1');
    await expect(page.getByRole('heading', { name: 'Construye a Brote' })).toBeVisible();
    await page.getByRole('link', { name: 'Salir', exact: true }).click();
    await expect(page).toHaveURL(origin + prefix + 'practice.html');
    await page.getByRole('region', { name: '¡Todo encaja!' }).getByRole('link', { name: 'Jugar' }).click();
    await expect(page).toHaveURL(origin + prefix + 'games/shape-box.html');
    await expect(page.getByRole('heading', { name: '¡Todo encaja!' })).toBeVisible();
    await page.getByRole('link', { name: 'Salir', exact: true }).click();
    await expect(page).toHaveURL(origin + prefix + 'practice.html');
    await page.getByRole('link', { name: 'Volver al inicio', exact: true }).click();
    await expect(page).toHaveURL(origin + prefix + 'index.html');
    expect(errors).toEqual([]);
  });
});
