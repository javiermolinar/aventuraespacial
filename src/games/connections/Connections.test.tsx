// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import Connections from './Connections';
import { connectionGames } from './levels';
import { connectionsStorageKey, loadConnectionsProgress, saveConnectionsProgress } from './progress';

vi.mock('../../sound', () => ({ playSound: vi.fn() }));
beforeEach(() => {
  const entries = new Map<string, string>();
  vi.stubGlobal('localStorage', { getItem: (key: string) => entries.get(key) ?? null, setItem: (key: string, value: string) => entries.set(key, value) });
  window.history.replaceState(null, '', '/games/connections.html?theme=water');
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

function solve(index: number, theme: 'water' | 'radio' = 'water', check = true) {
  const layout = connectionGames[theme].levels[index].layout;
  const tiles = screen.getAllByRole('button', { name: /^(Tubo|Cable), fila/ });
  for (let tile = 0; tile < tiles.length; tile++) {
    const turns = (layout.solution[tile] - Number(tiles[tile].getAttribute('data-rotation')) + 4) % 4;
    for (let turn = 0; turn < turns; turn++) fireEvent.click(tiles[tile]);
  }
  if (layout.network && check) fireEvent.click(screen.getByRole('button', { name: 'Probar' }));
}

it('saves a partial board, resumes the selected level, and restarts only that board', () => {
  const first = render(<Connections />);
  const tile = screen.getAllByRole('button', { name: /^Tubo, fila/ })[0];
  fireEvent.click(tile);
  const rotation = tile.getAttribute('data-rotation');
  fireEvent.click(screen.getByRole('button', { name: /^Reto 3:/ }));
  first.unmount();
  render(<Connections />);
  expect(screen.getByRole('group', { name: 'Tablero de 4 por 4' })).toBe(document.activeElement);
  fireEvent.click(screen.getByRole('button', { name: /^Reto 1:/ }));
  expect(screen.getAllByRole('button', { name: /^Tubo, fila/ })[0].getAttribute('data-rotation')).toBe(rotation);
  fireEvent.click(screen.getByRole('button', { name: 'Reiniciar reto' }));
  expect(screen.getAllByRole('button', { name: /^Tubo, fila/ })[0].getAttribute('data-rotation')).toBe(String(connectionGames.water.levels[0].layout.initial[0]));
});

it('counts solved levels, leaves skipped levels unfinished, and preserves earned completion on replay', () => {
  render(<Connections />);
  solve(0);
  expect(screen.getByRole('button', { name: /^Reto 1:.*completado/ })).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Reiniciar reto' }));
  expect(screen.getByRole('button', { name: /^Reto 1:.*completado/ })).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Saltar' })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: /^Reto 3:/ }));
  expect(screen.getByRole('button', { name: /^Reto 2:/ }).getAttribute('aria-label')).not.toContain('completado');
  expect(screen.getByRole('group', { name: 'Tablero de 4 por 4' })).toBe(document.activeElement);
  fireEvent.click(screen.getByRole('button', { name: /^Reto 6:/ }));
  solve(5);
  fireEvent.click(screen.getByRole('button', { name: 'Ver mis retos' }));
  expect(screen.getByText('Has completado 2 de 6 retos.')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Seguir practicando' }));
  expect(screen.getByRole('group', { name: 'Tablero de 3 por 3' })).toBe(document.activeElement);
});

it('finishes all six levels, offers the other game and keeps their progress separate', () => {
  window.history.replaceState(null, '', '?theme=radio');
  const game = render(<Connections />);
  for (let index = 0; index < 6; index++) {
    solve(index, 'radio');
    expect(screen.getByRole('status').textContent).toBe(index < 2 ? '¡Circuito cerrado! La radio está encendida.' : '¡Red completa! Todas las radios encendidas.');
    fireEvent.click(screen.getByRole('button', { name: index === 5 ? 'Ver mis retos' : 'Siguiente reto' }));
  }
  expect(screen.getByRole('heading', { name: '¡Todas las radios suenan!' })).toBe(document.activeElement);
  expect(screen.getByRole('link', { name: 'Jugar con agua' }).getAttribute('href')).toBe('./connections.html?theme=water');
  game.unmount();
  window.history.replaceState(null, '', '?theme=water');
  render(<Connections />);
  expect(screen.getByText('0 de 6')).toBeTruthy();
  expect(loadConnectionsProgress().puzzles[connectionGames.radio.levels[5].id].completed).toBe(true);
});

it('hides network feedback until tested, clears it on edits, and only awards a tested solution', () => {
  const game = render(<Connections />);
  fireEvent.click(screen.getByRole('button', { name: /^Reto 3:/ }));
  expect(game.container.querySelectorAll('.has-water, .is-leaking')).toHaveLength(0);
  fireEvent.click(screen.getByRole('button', { name: 'Probar' }));
  expect(screen.getByRole('status').textContent).toContain('Extremos sueltos:');
  expect(game.container.querySelectorAll('.is-leaking, .pipe-leak-mark, .is-hint')).toHaveLength(0);
  fireEvent.click(screen.getByRole('button', { name: 'Ayuda' }));
  expect(game.container.querySelectorAll('.is-hint')).toHaveLength(1);
  expect(game.container.querySelector('.is-hint')).toBe(document.activeElement);
  fireEvent.click(screen.getAllByRole('button', { name: /^Tubo, fila/ })[0]);
  expect(game.container.querySelectorAll('.has-water, .is-leaking')).toHaveLength(0);
  expect(screen.getByRole('status').textContent).toContain('Prepara toda la red');
  solve(2, 'water', false);
  expect(game.container.querySelectorAll('.has-water')).toHaveLength(0);
  expect(loadConnectionsProgress().puzzles[connectionGames.water.levels[2].id].completed).toBe(false);
  game.unmount();
  const resumed = render(<Connections />);
  expect(resumed.container.querySelectorAll('.is-solved')).toHaveLength(0);
  fireEvent.click(screen.getByRole('button', { name: 'Probar' }));
  expect(resumed.container.querySelectorAll('.has-water')).toHaveLength(16);
  expect(screen.getByRole('button', { name: /^Reto 3:.*completado/ })).toBeTruthy();
  expect(loadConnectionsProgress().puzzles[connectionGames.water.levels[2].id]).toMatchObject({ completed: true, tested: true });
});

it('keeps introductory progress but retires the old easy route completions', () => {
  localStorage.setItem(connectionsStorageKey, JSON.stringify({ current: { water: 5, radio: 0 }, puzzles: {
    'water-1': { rotations: connectionGames.water.levels[0].layout.solution, completed: true },
    'water-6': { rotations: Array(25).fill(0), completed: true },
  } }));
  const progress = loadConnectionsProgress();
  expect(progress.puzzles['water-1'].completed).toBe(true);
  expect(progress.puzzles['water-6']).toBeUndefined();
  expect(progress.puzzles[connectionGames.water.levels[5].id]).toBeUndefined();
  expect(progress.current.water).toBe(5);
});

it('continues in memory when storage is blocked, including level navigation', () => {
  vi.spyOn(localStorage, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
  render(<Connections />);
  solve(0);
  expect(screen.getByRole('alert').textContent).toContain('Puedes seguir jugando');
  fireEvent.click(screen.getByRole('button', { name: 'Siguiente reto' }));
  expect(screen.getByRole('button', { name: /^Reto 1:.*completado/ })).toBeTruthy();
});

it('rejects corrupt saves without discarding valid entries or touching adventure saves', () => {
  localStorage.setItem('adventure-sentinel', 'unchanged');
  localStorage.setItem(connectionsStorageKey, JSON.stringify({
    current: { water: 99, radio: 2 },
    puzzles: { 'water-1': { rotations: [-1], completed: true }, 'radio-1': { rotations: connectionGames.radio.levels[0].layout.solution } },
  }));
  const progress = loadConnectionsProgress();
  expect(progress.current).toEqual({ water: 0, radio: 2 });
  expect(progress.puzzles['water-1']).toBeUndefined();
  expect(progress.puzzles['radio-1'].completed).toBe(true);
  expect(saveConnectionsProgress(progress)).toBe(true);
  expect(localStorage.getItem('adventure-sentinel')).toBe('unchanged');
  localStorage.setItem(connectionsStorageKey, '{broken');
  expect(loadConnectionsProgress().puzzles).toEqual({});
});
