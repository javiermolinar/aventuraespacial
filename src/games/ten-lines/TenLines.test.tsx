// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import TenLines from './TenLines';

const playThreeByThree = () => fireEvent.click(screen.getByRole('button', { name: '3 × 3' }));

afterEach(cleanup);

it('starts with a 2 × 2 tutorial that is solved with one swap', () => {
  render(<TenLines />);
  expect(screen.getByRole('button', { name: '2 × 2' }).getAttribute('aria-pressed')).toBe('true');
  expect(screen.getByText('2 de 4 líneas suman 10')).not.toBeNull();
  expect(screen.queryByRole('button', { name: '3 intercambios' })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Fila 1, columna 1: 7' }));
  fireEvent.click(screen.getByRole('button', { name: 'Fila 1, columna 2: 3' }));
  expect(screen.getByText('¡Resuelto! Las 4 líneas suman 10')).not.toBeNull();
});

it('moves on to the 3 × 3 board and solves its tutorial by selecting two tiles', () => {
  render(<TenLines />);
  playThreeByThree();
  fireEvent.click(screen.getByRole('button', { name: 'Fila 1, columna 2: 5' }));
  expect(screen.getByText('Has elegido 5. Ahora elige dónde colocarlo.')).not.toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Fila 2, columna 1: 3' }));
  expect(screen.getByText('¡Resuelto! Las 6 líneas suman 10')).not.toBeNull();
  expect(screen.getByText('1 movimiento')).not.toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Reiniciar' }));
  expect(screen.getByText('2 de 6 líneas suman 10')).not.toBeNull();
  expect(screen.getByText('0 movimientos')).not.toBeNull();
});

it('allows tile selection immediately after a drag', () => {
  render(<TenLines />);
  playThreeByThree();
  const dataTransfer = { effectAllowed: '', setData: vi.fn(), getData: vi.fn(() => '0') };
  fireEvent.dragStart(screen.getByRole('button', { name: 'Fila 1, columna 1: 1' }), { dataTransfer });
  fireEvent.drop(screen.getByRole('button', { name: 'Fila 1, columna 2: 5' }), { dataTransfer });
  fireEvent.dragEnd(screen.getByRole('button', { name: 'Fila 1, columna 1: 5' }));
  const next = screen.getByRole('button', { name: 'Fila 1, columna 3: 6' });
  fireEvent.click(next);
  expect(next.getAttribute('aria-pressed')).toBe('true');
  expect(screen.getByText('Has elegido 6. Ahora elige dónde colocarlo.')).not.toBeNull();
});

it('changes difficulty and preserves it for a new puzzle', () => {
  render(<TenLines />);
  playThreeByThree();
  const easy = screen.getByRole('button', { name: '2 intercambios' });
  fireEvent.click(easy);
  expect(easy.getAttribute('aria-pressed')).toBe('true');
  fireEvent.click(screen.getByRole('button', { name: 'Nuevo puzle' }));
  expect(screen.getByRole('button', { name: '2 intercambios' }).getAttribute('aria-pressed')).toBe('true');
  expect(screen.getByText('0 movimientos')).not.toBeNull();
});
