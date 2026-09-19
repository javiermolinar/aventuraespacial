// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import TimeChef, { RecipeRound } from './TimeChef';
import { cookingResult, createMenu, menus } from './recipes';
import { passageFor } from './TimePassage';

beforeEach(() => vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true }))));
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
const hour = () => within(document.querySelector('.chef-controls') as HTMLElement).getByRole('slider', { name: 'Aguja corta: horas' });
const minute = () => within(document.querySelector('.chef-controls') as HTMLElement).getByRole('slider', { name: 'Aguja larga: minutos' });
function moveHours(count: number) {
  for (let i = 0; i < Math.abs(count); i++) fireEvent.keyDown(hour(), { key: count > 0 ? 'ArrowRight' : 'ArrowLeft' });
}
function submit() { fireEvent.click(screen.getByRole('button', { name: '¡Listo!' })); }

it('compares times within the recipe day, not elapsed cooking durations', () => {
  expect(cookingResult(0, 480)).toBe('early');
  expect(cookingResult(480, 480)).toBe('perfect');
  expect(cookingResult(1200, 480)).toBe('burned');
});
it('shows useful retry feedback and only advances a correct dish after Next', () => {
  const next = vi.fn();
  const { container } = render(<RecipeRound recipe={menus[0].recipes[0]} sound={false} onNext={next} last={false} />);
  submit();
  expect(screen.getByRole('status').textContent).toContain('¡Crudo! Muy pronto.');
  expect(screen.getByRole('status').textContent).toContain('Has puesto 06:00.');
  expect(container.querySelector('.chef-dish.is-early')).toBeTruthy();
  expect(next).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Otra vez' }));
  expect(screen.queryByRole('group', { name: 'Pista: dos relojes, la misma hora' })).toBeNull();
  moveHours(3);
  submit();
  expect(screen.getByRole('status').textContent).toContain('¡Quemado! Muy tarde.');
  expect(container.querySelector('.chef-smoke')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Otra vez' }));
  moveHours(-1);
  submit();
  expect(screen.getByRole('status').textContent).toBe('¡En su punto!');
  moveHours(-1);
  expect(hour().getAttribute('aria-valuenow')).toBe('8');
  fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
  expect(next).toHaveBeenCalledTimes(1);
});
it('keeps morning/evening meaningful without hand or clock-format mode buttons', () => {
  render(<RecipeRound recipe={menus[0].recipes[2]} sound={false} onNext={vi.fn()} last />);
  expect(screen.queryByRole('button', { name: 'Horas' })).toBeNull();
  expect(screen.queryByRole('group', { name: 'Tipo de reloj' })).toBeNull();
  moveHours(-2);
  submit();
  expect(screen.getByRole('status').textContent).toContain('Mira la mitad del día');
  fireEvent.click(screen.getByRole('button', { name: 'Otra vez' }));
  moveHours(12);
  expect(screen.getByRole('img', { name: /De mediodía a medianoche: Las 4 en punto de la tarde/ })).toBeTruthy();
  submit();
  expect(screen.getByRole('status').textContent).toBe('¡En su punto!');
  expect(screen.getByRole('button', { name: 'Mi menú' })).toBeTruthy();
});
it('starts with a half-hour hint, then offers three practice dishes without hints, including retries', () => {
  render(<TimeChef />);
  fireEvent.change(screen.getByRole('combobox', { name: 'Nivel' }), { target: { value: '1' } });
  expect(screen.getByText('1 hora = 60 minutos')).toBeTruthy();
  expect(screen.getByText(/Media hora son 30 minutos/)).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Una pista' })).toBeNull();
  expect(within(screen.getByRole('list', { name: 'Tus cuatro recetas' })).getAllByRole('listitem')).toHaveLength(4);
  moveHours(2);
  for (let i = 0; i < 6; i++) fireEvent.keyDown(minute(), { key: 'ArrowRight' });
  expect(hour().getAttribute('transform')).toBe('rotate(255 150 150)');
  submit();
  fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
  expect(screen.getByRole('heading', { name: 'Tortitas del sol' })).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Una pista' })).toBeNull();
  submit();
  fireEvent.click(screen.getByRole('button', { name: 'Otra vez' }));
  expect(screen.queryByRole('group', { name: 'Pista: dos relojes, la misma hora' })).toBeNull();
});
it('generates four attainable random-minute targets once per menu without mutating templates', () => {
  const first = createMenu(3, () => 0);
  const last = createMenu(3, () => 0.9999);
  expect(first.recipes.map(recipe => recipe.target % 60)).toEqual([1, 1, 1, 1]);
  expect(last.recipes.map(recipe => recipe.target % 60)).toEqual([59, 59, 59, 59]);
  expect(menus[3].recipes[0].target).toBe(497);
  render(<RecipeRound recipe={first.recipes[0]} sound={false} onNext={vi.fn()} last={false} />);
  moveHours(2);
  fireEvent.keyDown(minute(), { key: 'ArrowRight' });
  expect(minute().getAttribute('aria-valuenow')).toBe('1');
  submit();
  expect(screen.getByRole('status').textContent).toBe('¡En su punto!');
});
it('keeps the random order fixed across input changes and retries', () => {
  const { container } = render(<TimeChef />);
  fireEvent.change(screen.getByRole('combobox', { name: 'Nivel' }), { target: { value: '3' } });
  const target = () => container.querySelector('.chef-order .digital-clock')!.getAttribute('aria-label');
  const original = target();
  fireEvent.keyDown(minute(), { key: 'ArrowRight' });
  submit();
  fireEvent.click(screen.getByRole('button', { name: 'Otra vez' }));
  expect(target()).toBe(original);
});
it('shows one passive marker progressing through the two halves of the day and midnight', () => {
  const { container } = render(<RecipeRound recipe={menus[1].recipes[0]} sound={false} onNext={vi.fn()} last={false} />);
  expect(screen.queryByRole('slider', { name: /mediodía/ })).toBeNull();
  expect(container.querySelectorAll('.chef-timeline-marker')).toHaveLength(1);
  expect(container.querySelector('.is-first .chef-timeline-marker')).toBeTruthy();
  fireEvent.click(screen.getByRole('img', { name: /De mediodía a medianoche/ }));
  expect(hour().getAttribute('aria-valuenow')).toBe('6');
  moveHours(6); // Noon: the first rail is complete and the marker changes sides.
  expect(container.querySelectorAll('.is-first .chef-timeline-slots > .is-past')).toHaveLength(12);
  expect(container.querySelector('.is-first .chef-timeline-marker')).toBeNull();
  expect(container.querySelector('.is-second .chef-timeline-marker')).toBeTruthy();
  moveHours(12); // Midnight resets the day and returns the marker to the first rail.
  expect(container.querySelector('.is-first .chef-timeline-marker')).toBeTruthy();
  expect(container.querySelectorAll('.is-second .chef-timeline-slots > .is-past')).toHaveLength(0);
});
it('animates the submitted time before feedback, moves both hands, and cancels on unmount', () => {
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false })));
  let tick: FrameRequestCallback = () => {};
  vi.stubGlobal('requestAnimationFrame', vi.fn(callback => { tick = callback; return 1; }));
  const cancel = vi.fn();
  vi.stubGlobal('cancelAnimationFrame', cancel);
  const next = vi.fn();
  const { container, unmount } = render(<RecipeRound recipe={menus[1].recipes[0]} sound={false} onNext={next} last={false} />);
  moveHours(2);
  for (let i = 0; i < 6; i++) fireEvent.keyDown(minute(), { key: 'ArrowRight' });
  submit();
  expect(screen.getByRole('group', { name: 'Así pasa el tiempo' })).toBeTruthy();
  expect(screen.getByRole('status').textContent).toBe('');
  expect(screen.getByRole('button', { name: 'Mira el reloj…' }).hasAttribute('disabled')).toBe(true);
  act(() => tick(0));
  act(() => tick(975)); // Half of the 1950 ms, 30-minute demonstration.
  expect(screen.getByText('15 de 30 minutos')).toBeTruthy();
  expect(container.querySelector('.chef-time-passage .clock-hand-hour')!.getAttribute('transform')).toBe('rotate(247.5 150 150)');
  act(() => tick(1950));
  expect(screen.getByRole('status').textContent).toBe('¡En su punto!');
  expect(next).not.toHaveBeenCalled();
  unmount();
  expect(cancel).toHaveBeenCalled();
});
it('shows a full 60-minute turn for exact hours, including the midnight boundary', () => {
  expect(passageFor(480)).toEqual({ start: 420, minutes: 60 });
  expect(passageFor(510)).toEqual({ start: 480, minutes: 30 });
  expect(passageFor(0)).toEqual({ start: -60, minutes: 60 });
});
it('gives each recipe one fixed input clock and removes the separate playground', () => {
  const { rerender } = render(<TimeChef />);
  expect(screen.queryByText('Juega con las 24 h')).toBeNull();
  for (const menu of menus) {
    expect(menu.recipes.map(recipe => recipe.clock)).toEqual(['analog', 'digital', 'analog', 'digital']);
    for (const recipe of menu.recipes) {
      rerender(<RecipeRound recipe={recipe} sound={false} onNext={vi.fn()} last={false} />);
      const controls = within(document.querySelector('.chef-controls') as HTMLElement);
      expect(controls.queryByRole('group', { name: 'Reloj de agujas' }) !== null).toBe(recipe.clock === 'analog');
      expect(controls.queryByRole('group', { name: 'Alarma de cocina' }) !== null).toBe(recipe.clock === 'digital');
      expect(screen.queryByRole('group', { name: 'Tipo de reloj' })).toBeNull();
    }
  }
});
