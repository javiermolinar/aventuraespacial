// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import LaserRats from './LaserRats';
import { playSound } from '../../sound';

vi.mock('../../sound', () => ({ playSound: vi.fn() }));
vi.mock('../../services/useSoundPreference', () => ({ useSoundPreference: () => ({ enabled: true, saveFailed: false, toggle: vi.fn() }) }));
vi.mock('../../components/BackgroundMusic', () => ({ BackgroundMusic: ({ src, enabled }: { src: string; enabled: boolean }) => <span data-testid="music" data-enabled={enabled}>{src}</span> }));
afterEach(() => { cleanup(); vi.clearAllMocks(); });

it('pairs discovery, rat surprises, lasers and wins with distinct effects and music', () => {
  const { container } = render(<LaserRats />);
  const cell = (id: string) => container.querySelector<HTMLButtonElement>(`[data-cell="${id}"]`)!;
  expect(screen.getByTestId('music').textContent).toBe('../music/cipher.mp3');
  fireEvent.click(cell('A4'));
  expect(playSound).toHaveBeenLastCalledWith('scan', true);
  expect(cell('A4').querySelector('.laser-reveal-pulse')).toBeTruthy();
  fireEvent.click(cell('C1'));
  expect(playSound).toHaveBeenLastCalledWith('rat', true);
  expect(cell('C1').className).toContain('is-hit');
  fireEvent.click(screen.getByRole('button', { name: 'Otra vez' }));
  fireEvent.click(cell('A4'));
  fireEvent.click(cell('C3'));
  fireEvent.click(screen.getByRole('button', { name: 'Colocar robot de columnas' }));
  fireEvent.click(cell('C3'));
  expect(playSound).toHaveBeenCalledWith('laser', true);
  expect(playSound).toHaveBeenLastCalledWith('success', true, .2);
  expect(container.querySelectorAll('.laser-caught-pop')).toHaveLength(2);
  expect(container.querySelectorAll('.laser-rat-track .laser-rat-face')).toHaveLength(4);
  expect(container.querySelectorAll('.laser-rat-track .is-caught')).toHaveLength(2);
  fireEvent.click(screen.getByRole('button', { name: 'Colocar robot de filas' }));
  fireEvent.click(cell('C2'));
  expect(playSound).toHaveBeenLastCalledWith('complete', true, .2);
  expect(container.querySelector('.laser-celebration')).toBeTruthy();
  expect(screen.getByRole('status').textContent).toContain('¡Misión cumplida!');
});

it('moves keyboard focus without scanning and cancels robot mode with Escape', () => {
  const { container } = render(<LaserRats />);
  const start = container.querySelector<HTMLButtonElement>('[data-cell="C3"]')!;
  const next = container.querySelector<HTMLButtonElement>('[data-cell="D3"]')!;
  fireEvent.click(container.querySelector<HTMLButtonElement>('[data-cell="A4"]')!);
  fireEvent.click(start);
  const discoveries = container.querySelectorAll('.laser-cell.is-known').length;
  fireEvent.click(screen.getByRole('button', { name: 'Colocar robot de filas' }));
  start.focus(); fireEvent.keyDown(start, { key: 'ArrowRight' });
  expect(document.activeElement).toBe(next);
  expect(container.querySelectorAll('.laser-cell.is-known')).toHaveLength(discoveries);
  fireEvent.keyDown(next, { key: 'Escape' });
  expect(screen.getByRole('button', { name: 'Colocar robot de filas' }).getAttribute('aria-pressed')).toBe('false');
  fireEvent.click(next);
  expect(next.className).toContain('is-known');
});

it('shows only nearby counts and refreshes them after firing', () => {
  const { container } = render(<LaserRats />);
  const cell = (id: string) => container.querySelector<HTMLButtonElement>(`[data-cell="${id}"]`)!;
  expect(container.querySelectorAll('.laser-cell.is-known')).toHaveLength(0);
  expect(container.querySelectorAll('.laser-cell.is-selected')).toHaveLength(0);
  expect(container.querySelectorAll('.laser-direction-count')).toHaveLength(0);
  fireEvent.click(cell('A4'));
  fireEvent.click(cell('C3'));
  expect(cell('C3').querySelector('.laser-adjacent-count')?.textContent).toBe('0');
  expect(cell('C2').querySelector('.laser-adjacent-count')?.textContent).toBe('1');
  expect(cell('C2').className).toContain('is-known');
  expect(container.querySelector('.laser-radar-panel')).toBeNull();
  expect(container.querySelector('.laser-map-hint')).toBeNull();
  expect(container.querySelector('.is-clue-neighbor')).toBeNull();
  expect(container.querySelector('[aria-label*="Radar"]')).toBeNull();
  fireEvent.click(cell('C2'));
  expect(cell('C2').className).toContain('is-known');
  expect(cell('C3').querySelector('.laser-adjacent-count')?.textContent).toBe('0');
  fireEvent.click(screen.getByRole('button', { name: 'Colocar robot de columnas' }));
  fireEvent.click(cell('C3'));
  expect(cell('C2').querySelector('.laser-adjacent-count')?.textContent).toBe('0');
  expect(cell('C1').querySelector('.laser-adjacent-count')).not.toBeNull();
  expect(cell('C1').getAttribute('aria-label')).toContain('Rata eliminada. Casilla segura. Ratas vecinas: 0.');
  expect(cell('B2').className).toContain('is-known');
  expect(cell('A2').className).toContain('is-fog');
  fireEvent.click(screen.getByRole('button', { name: 'Reiniciar tablero' }));
  expect(container.querySelectorAll('.laser-cell.is-known')).toHaveLength(0);
  expect(container.querySelectorAll('.laser-direction-count')).toHaveLength(0);
});

it('marks the certified opening and prevents another first click from creating an unvalidated round', () => {
  const { container } = render(<LaserRats />);
  const cell = (id: string) => container.querySelector<HTMLButtonElement>(`[data-cell="${id}"]`)!;
  expect(cell('A4').className).toContain('is-start');
  fireEvent.click(cell('A1'));
  expect(container.querySelectorAll('.laser-cell.is-known')).toHaveLength(0);
  expect(screen.getByRole('status').textContent).toContain('Empieza en A4');
  fireEvent.click(cell('A4'));
  expect(container.querySelector('.laser-cell.is-start')).toBeNull();
  expect(container.querySelectorAll('.laser-cell.is-known').length).toBeGreaterThan(1);
});
