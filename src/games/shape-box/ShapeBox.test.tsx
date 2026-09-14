// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { PackingPuzzle } from './ShapeBox';
import { puzzles } from './puzzle';

afterEach(cleanup);
const piece = (id: string) => screen.getByRole('button', { name: new RegExp(`^Pieza ${id}(, en la caja)?$`) });
const cell = (x: number, y: number) => screen.getByRole('button', { name: new RegExp(`^Fila ${y + 1}, columna ${x + 1}:`) });
function pointer(target: HTMLElement, type: string, id = 1) {
  target.setPointerCapture = vi.fn();
  target.hasPointerCapture = () => false;
  const event = new MouseEvent(type, { bubbles: true, button: 0, clientX: 50, clientY: 50 });
  Object.defineProperties(event, { pointerId: { value: id }, pointerType: { value: 'touch' }, isPrimary: { value: true } });
  fireEvent(target, event);
}

it('touch selection and placement work without compatibility clicks; later clicks do not duplicate placement', () => {
  const { container } = render(<PackingPuzzle puzzle={puzzles[0]} sound={false} onNext={vi.fn()} />);
  pointer(piece('A'), 'pointerdown');
  pointer(piece('A'), 'pointerup');
  expect(piece('A').getAttribute('aria-pressed')).toBe('true');
  for (let i = 0; i < puzzles[0].solution.A.turns; i++) fireEvent.click(screen.getByRole('button', { name: 'Girar pieza A' }));
  pointer(cell(0, 0), 'pointerdown');
  pointer(cell(0, 0), 'pointerup');
  expect(container.querySelectorAll('.packing-cell.is-filled')).toHaveLength(3);
  expect(piece('A').getAttribute('aria-pressed')).toBe('false');
  fireEvent.click(cell(0, 0), { detail: 1 });
  expect(piece('A').getAttribute('aria-pressed')).toBe('false');
  // Keyboard activation is never suppressed by an absent compatibility click.
  fireEvent.click(piece('A'), { detail: 0 });
  expect(piece('A').getAttribute('aria-pressed')).toBe('true');
});

it.each(['click', 'touch', 'keyboard'])('%s on a placed piece switches selection directly, without moving either piece', mode => {
  const { container } = render(<PackingPuzzle puzzle={puzzles[0]} sound={false} onNext={vi.fn()} />);
  fireEvent.click(piece('A'));
  for (let i = 0; i < puzzles[0].solution.A.turns; i++) fireEvent.click(screen.getByRole('button', { name: 'Girar pieza A' }));
  fireEvent.click(cell(0, 0));
  fireEvent.click(piece('B'));
  const before = [...container.querySelectorAll('.packing-cell')].map(cell => cell.getAttribute('aria-label'));
  if (mode === 'keyboard') fireEvent.click(cell(1, 1), { detail: 0 });
  else {
    pointer(cell(1, 1), 'pointerdown');
    pointer(cell(1, 1), 'pointerup');
    if (mode === 'click') fireEvent.click(cell(1, 1), { detail: 1 });
  }
  expect(piece('A').getAttribute('aria-pressed')).toBe('true');
  expect(piece('B').getAttribute('aria-pressed')).toBe('false');
  expect(container.querySelectorAll('.packing-cell.is-selected')).toHaveLength(3);
  expect([...container.querySelectorAll('.packing-cell')].map(cell => cell.getAttribute('aria-label'))).toEqual(before);
  // Rotation acts on the piece selected in the box, not the old tray selection.
  const handle = screen.getByRole('button', { name: 'Girar pieza A' });
  expect(handle.closest('.packing-board-frame')).not.toBeNull();
  expect(screen.getByRole('button', { name: 'Girar pieza B' }).closest('.packing-piece-slot')).not.toBeNull();
  fireEvent.click(handle);
  expect(screen.getByRole('status').textContent).toBe('Pieza A girada.');
  fireEvent.keyDown(cell(0, 0), { key: 'Delete' });
  expect(container.querySelectorAll('.packing-cell.is-filled')).toHaveLength(0);
});

it('cancelled and lost-capture gestures never place a piece', () => {
  const { container } = render(<PackingPuzzle puzzle={puzzles[0]} sound={false} onNext={vi.fn()} />);
  fireEvent.click(piece('A'));
  pointer(cell(0, 0), 'pointerdown');
  pointer(cell(0, 0), 'pointercancel');
  fireEvent.click(cell(0, 0), { detail: 1 });
  expect(container.querySelectorAll('.packing-cell.is-filled')).toHaveLength(0);
  pointer(cell(0, 0), 'pointerdown', 2);
  pointer(cell(0, 0), 'lostpointercapture', 2);
  pointer(cell(0, 0), 'pointerup', 2);
  expect(container.querySelectorAll('.packing-cell.is-filled')).toHaveLength(0);
});

it.each(['Delete', 'Backspace'])('a blocked rotation preserves the placement; %s returns it without a removal button', key => {
  const { container } = render(<PackingPuzzle puzzle={puzzles[0]} sound={false} onNext={vi.fn()} />);
  fireEvent.click(piece('C'));
  // C starts vertical; turn once, then place across the bottom row.
  fireEvent.click(screen.getByRole('button', { name: 'Girar pieza C' }));
  fireEvent.click(cell(0, 2));
  expect(container.querySelectorAll('.packing-cell.is-filled')).toHaveLength(3);
  fireEvent.click(piece('C'));
  fireEvent.click(screen.getByRole('button', { name: 'Girar pieza C' }));
  expect(screen.getByRole('status').textContent).toContain('Arrástrala fuera de la caja primero');
  expect(cell(2, 2).getAttribute('aria-label')).toContain('pieza C');
  expect(screen.queryByRole('button', { name: 'Sacar' })).toBeNull();
  fireEvent.keyDown(piece('C'), { key });
  expect(container.querySelectorAll('.packing-cell.is-filled')).toHaveLength(0);
  expect(piece('C').getAttribute('aria-pressed')).toBe('true');
});
