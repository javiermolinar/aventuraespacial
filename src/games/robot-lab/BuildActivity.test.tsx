// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { BuildActivity, type BuildConfiguration, type BuildState } from './BuildActivity';

beforeEach(() => {
  vi.stubGlobal('matchMedia', (query: string) => ({ matches: query.includes('prefers-reduced-motion'), addListener: vi.fn(), removeListener: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn() }));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

it('runs from host configuration and reports actions without changing supplied state', () => {
  const config: BuildConfiguration = { robot: { name: 'Prueba', color: '#87b99d', design: 'sprout' }, targetPlacedParts: 6, mathsLevel: 0, completion: 'Robot listo.' };
  const state: BuildState = { placedCount: 0, ready: false, operations: Array.from({ length: 6 }, () => ({ a: 2, b: 1, operator: '+' })) };
  const original = structuredClone(state);
  const callbacks = { onEarn: vi.fn(), onPlace: vi.fn(), onExpire: vi.fn(), onComplete: vi.fn() };
  const view = render(<BuildActivity config={config} state={state} sound={false} {...callbacks} />);

  fireEvent.click(screen.getByRole('button', { name: 'Número 3' }));
  fireEvent.click(screen.getByRole('button', { name: 'Comprobar' }));
  expect(callbacks.onEarn).toHaveBeenCalledOnce();
  expect(callbacks.onPlace).not.toHaveBeenCalled();
  expect(callbacks.onComplete).not.toHaveBeenCalled();
  expect(state).toEqual(original);

  // Only a host update grants the part, and only a later host update completes assembly.
  view.rerender(<BuildActivity config={config} state={{ ...state, ready: true }} sound={false} {...callbacks} />);
  fireEvent.click(screen.getByRole('button', { name: 'Arrastrar la cabeza' }));
  fireEvent.click(screen.getByRole('button', { name: 'Encajar la cabeza' }));
  expect(callbacks.onPlace).toHaveBeenCalledOnce();
  expect(callbacks.onComplete).not.toHaveBeenCalled();

  view.rerender(<BuildActivity config={config} state={{ ...state, placedCount: 6 }} sound={false} {...callbacks} />);
  expect(screen.getByRole('heading', { name: '¡Has construido a Prueba!' })).toBeTruthy();
  expect(screen.getByText('Robot listo.')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Seguir la historia' }));
  expect(callbacks.onComplete).toHaveBeenCalledOnce();
  expect(state).toEqual(original);
});
