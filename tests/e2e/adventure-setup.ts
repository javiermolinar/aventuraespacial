import type { Page } from '@playwright/test';

export async function completeAdventureSetup(page: Page, name = 'piloto', character: 'Niño' | 'Niña' = 'Niño') {
  await page.getByRole('textbox', { name: 'Tu nombre' }).fill(name);
  await page.getByRole('button', { name: 'Siguiente', exact: true }).click();
  await page.getByRole('button', { name: character, exact: true }).click();
  await page.getByRole('button', { name: 'Empezar', exact: true }).click();
}
