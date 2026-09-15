// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import TimeChef, { RecipeRound } from './TimeChef';
import { cookingResult, menus } from './recipes';

afterEach(cleanup);
it('compares times within the recipe day, not elapsed cooking durations', () => {
  expect(cookingResult(0, 480)).toBe('early');
  expect(cookingResult(480, 480)).toBe('perfect');
  expect(cookingResult(1200, 480)).toBe('burned');
});
it('shows short raw/burned reactions, visual retry hints, and advances only after success', () => {
  const next = vi.fn();
  const { container } = render(<RecipeRound recipe={menus[0].recipes[0]} sound={false} onNext={next} last={false} />);
  expect(screen.getByRole('status').textContent).toBe('');
  fireEvent.click(screen.getByRole('button', { name: '¡Listo!' }));
  expect(screen.getByRole('status').textContent).toBe('¡Crudo! Muy pronto.');
  expect(container.querySelector('.chef-dish.is-early')).toBeTruthy();
  expect(next).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Otra vez' }));
  expect(screen.getByRole('group', { name: 'Pista: dos relojes, la misma hora' })).toBeTruthy();
  const hour = screen.getByRole('slider', { name: 'Aguja corta: horas' });
  for (let i = 0; i < 3; i++) fireEvent.keyDown(hour, { key: 'ArrowRight' });
  fireEvent.click(screen.getByRole('button', { name: '¡Listo!' }));
  expect(screen.getByRole('status').textContent).toBe('¡Quemado! Muy tarde.');
  expect(container.querySelector('.chef-smoke')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Otra vez' }));
  fireEvent.keyDown(hour, { key: 'ArrowLeft' });
  fireEvent.click(screen.getByRole('button', { name: '¡Listo!' }));
  expect(screen.getByRole('status').textContent).toBe('¡En su punto!');
  fireEvent.keyDown(hour, { key: 'ArrowLeft' });
  expect(hour.getAttribute('aria-valuenow')).toBe('8');
  fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
  expect(next).toHaveBeenCalledTimes(1);
});
it('preserves the time when switching inputs and distinguishes morning from evening', () => {
  render(<RecipeRound recipe={menus[0].recipes[2]} sound={false} onNext={vi.fn()} last />);
  for (let i = 0; i < 3; i++) fireEvent.keyDown(screen.getByRole('slider', { name: 'Aguja corta: horas' }), { key: 'ArrowRight' });
  fireEvent.click(screen.getByRole('button', { name: /Desde el mediodía/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Alarma digital' }));
  expect(screen.getByText('21:00')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: '¡Listo!' }));
  expect(screen.getByRole('status').textContent).toContain('¡En su punto!');
  expect(screen.getByRole('button', { name: 'Mi menú' })).toBeTruthy();
});
it('lets children tap numbers for hours and minutes without dragging', () => {
  render(<RecipeRound recipe={menus[1].recipes[0]} sound={false} onNext={vi.fn()} last={false} />);
  fireEvent.click(screen.getByRole('button', { name: 'Poner hora en 8' }));
  fireEvent.click(screen.getByRole('button', { name: 'Minutos' }));
  fireEvent.click(screen.getByRole('button', { name: 'Poner minutos en 30' }));
  expect(screen.getByRole('slider', { name: 'Aguja corta: horas' }).getAttribute('transform')).toBe('rotate(255 150 150)');
  fireEvent.click(screen.getByRole('button', { name: '¡Listo!' }));
  expect(screen.getByRole('status').textContent).toBe('¡En su punto!');
  expect(screen.queryByRole('button', { name: 'Poner minutos en 30' })).toBeNull();
});
it('the 24-hour playground links both clocks and jumps twelve hours without changing the face', () => {
  const { container } = render(<TimeChef />);
  fireEvent.click(screen.getByText('Juega con las 24 h'));
  const before = container.querySelector('.chef-lesson .clock-hand-hour')!.getAttribute('transform');
  fireEvent.click(screen.getByRole('button', { name: '+12 h', hidden: true }));
  expect(container.querySelector('.chef-lesson .clock-hand-hour')!.getAttribute('transform')).toBe(before);
  expect(container.querySelector('.chef-lesson .digital-clock')!.textContent).toContain('19');
});
