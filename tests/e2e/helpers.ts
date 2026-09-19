import { expect, type Page } from '@playwright/test';
import { needsExchange, needsTens, resultOf, type Operation } from '../../src/lib/maths';

export async function readOperation(page: Page): Promise<Operation> {
  const label = await page.locator('.simple-sum, .column-board').getAttribute('aria-label');
  const match = label?.match(/(\d+) ([+−]) (\d+)(?: \+ (\d+))?$/);
  if (!match) throw new Error(`Missing operation: ${label}`);
  return { a: Number(match[1]), b: Number(match[3]), operator: match[2] as Operation['operator'], ...(match[4] ? { extraAddends: [Number(match[4])] } : {}) };
}

export async function answer(page: Page, value: number) {
  for (const digit of String(value)) await page.getByRole('button', { name: `Número ${digit}`, exact: true }).click();
  await page.getByRole('button', { name: 'Comprobar', exact: true }).click();
}

export async function carryByTap(page: Page) {
  await page.getByRole('button', { name: 'Llevar 1 decena', exact: true }).click();
  await page.getByRole('button', { name: 'Decenas: colocar la llevada', exact: true }).click();
}

export async function solveCurrent(page: Page) {
  const operation = await readOperation(page);
  const result = resultOf(operation);
  if (Math.max(operation.a, operation.b, result) >= 100) {
    let carry = 0;
    for (let place = 0; place < 3; place++) {
      const exchange = page.getByRole('button', { name: /^Cambiar una/ });
      if (await exchange.isVisible()) await exchange.click();
      if (operation.operator === '+') {
        const total = Math.floor(operation.a / 10 ** place) % 10 + Math.floor(operation.b / 10 ** place) % 10 + carry + (operation.extraAddends ?? []).reduce((sum, n) => sum + Math.floor(n / 10 ** place) % 10, 0);
        await answer(page, total);
        carry = Math.floor(total / 10);
        if (carry) await page.getByRole('button', { name: /^Llevar \d+ a las/ }).click();
      } else await answer(page, Math.floor(result / 10 ** place) % 10);
    }
  } else if (operation.operator === '+' && operation.a < 10 && operation.b < 10) {
    await answer(page, result);
  } else {
    if (needsExchange(operation)) {
      if (operation.operator === '+') {
        await answer(page, operation.a % 10 + operation.b % 10);
        await carryByTap(page);
      } else {
        await page.getByRole('button', { name: 'Cambiar una decena' }).click();
      }
    }
    // An accepted addition column total already commits its units digit.
    if (!(operation.operator === '+' && needsExchange(operation))) await answer(page, result % 10);
    if (needsTens(operation)) await answer(page, Math.floor(result / 10));
  }
  await expect(page.getByRole('button', { name: /^Arrastrar / })).toBeVisible();
  return operation;
}

export async function placeByTap(page: Page) {
  await page.getByRole('button', { name: /^Arrastrar / }).click();
  await page.getByRole('button', { name: /^Encajar / }).click();
}

export async function dragPiece(page: Page, correct = true) {
  const sourceLocator = page.getByRole('button', { name: /^Arrastrar / });
  await sourceLocator.click({ trial: true });
  const source = await sourceLocator.boundingBox();
  const target = await page.getByRole('button', { name: /^Encajar / }).boundingBox();
  if (!source || !target) throw new Error('The source or target is missing');
  await page.mouse.move(source.x + source.width / 2, source.y + source.height / 2);
  await page.mouse.down();
  await page.mouse.move(source.x + source.width / 2 + 8, source.y + source.height / 2 - 8);
  await page.mouse.move(correct ? target.x + target.width / 2 : 20, correct ? target.y + target.height / 2 : 20, { steps: 20 });
  await page.mouse.up();
}
