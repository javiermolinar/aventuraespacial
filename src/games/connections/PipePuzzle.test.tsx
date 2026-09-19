// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { PipePuzzle } from './PipePuzzle';
import { radioInterlude, waterInterlude } from '../../adventure/chapters/interludes';
import { chispaChapter } from '../../adventure/chapters/chispa';
import { connectionGames } from './levels';
import { pipeFlow, pipeGoals } from './pipes';

afterEach(cleanup);

describe('connection puzzle themes', () => {
  it.each(['water', 'radio'] as const)('%s marks reached destinations independently, only after testing and with an outward connection', theme => {
    const layout = connectionGames[theme].levels[2].layout;
    const rotations = [...layout.solution];
    // This T still carries flow to both destination cells, but its outlet
    // to the first destination points the wrong way.
    rotations[layout.goal.index] = (rotations[layout.goal.index] + 1) % 4;
    const flow = pipeFlow(layout, rotations);
    expect(flow.solved).toBe(false);
    expect(pipeGoals(layout).every(goal => flow.wet.includes(goal.index))).toBe(true);
    const onCheck = vi.fn();
    const props = { layout, sound: false, theme, onRotate: vi.fn(), onNext: vi.fn(), onCheck };
    const { container, rerender } = render(<PipePuzzle {...props} rotations={rotations} />);
    expect(container.querySelectorAll('.pipe-destination-check')).toHaveLength(0);
    fireEvent.click(screen.getByRole('button', { name: 'Probar' }));
    expect(onCheck).toHaveBeenLastCalledWith(false);
    expect(screen.getByRole('img', { name: theme === 'water' ? /^Depósito 1 vacío/ : /^Radio 1 apagada/ })).toBeTruthy();
    const connected = screen.getByRole('img', { name: theme === 'water' ? /^Depósito 2 lleno/ : /^Radio 2 conectada, sin corriente/ });
    expect(connected.querySelector('.pipe-destination-check')).toBeTruthy();
    expect(connected.querySelector('text')?.textContent).toBe('2');
    expect(container.querySelectorAll('.pipe-destination-check')).toHaveLength(1);
    expect(screen.getByRole('status').textContent).toContain('Destinos conectados: 1 de 2');
    expect(screen.queryByRole('button', { name: 'Continuar' })).toBeNull();
    fireEvent.click(screen.getAllByRole('button', { name: /^(Tubo|Cable), fila/ })[0]);
    expect(container.querySelectorAll('.pipe-destination-check')).toHaveLength(0);
    rerender(<PipePuzzle {...props} rotations={layout.solution} />);
    fireEvent.click(screen.getByRole('button', { name: 'Probar' }));
    expect(onCheck).toHaveBeenLastCalledWith(true);
    expect(container.querySelectorAll('.pipe-destination-check')).toHaveLength(2);
    if (theme === 'radio') expect(screen.getAllByRole('img', { name: /^Radio \d encendida/ })).toHaveLength(2);
  });

  it('handles touch taps without compatibility clicks, suppresses duplicate clicks, and keeps keyboard activation', () => {
    const onRotate = vi.fn();
    render(<PipePuzzle layout={radioInterlude.layout} rotations={radioInterlude.layout.initial} sound={false} onRotate={onRotate} onNext={vi.fn()} />);
    const tile = screen.getByRole('button', { name: /^Tubo, fila 1, columna 1:/ });
    tile.setPointerCapture = vi.fn();
    tile.hasPointerCapture = () => false;
    const pointer = (type: string, id: number) => {
      const event = new MouseEvent(type, { bubbles: true, button: 0, clientX: 50, clientY: 50 });
      Object.defineProperties(event, { pointerId: { value: id }, pointerType: { value: 'touch' }, isPrimary: { value: true } });
      fireEvent(tile, event);
    };
    pointer('pointerdown', 1);
    pointer('pointercancel', 1);
    expect(onRotate).not.toHaveBeenCalled();
    pointer('pointerdown', 2);
    pointer('pointerup', 2);
    expect(onRotate).toHaveBeenCalledExactlyOnceWith(0, 1);
    // No compatibility click for this tap; the next tap must still work.
    pointer('pointerdown', 3);
    pointer('pointerup', 3);
    expect(onRotate).toHaveBeenCalledTimes(2);
    fireEvent.click(tile, { detail: 1 });
    expect(onRotate).toHaveBeenCalledTimes(2);
    fireEvent.click(tile, { detail: 0 });
    expect(onRotate).toHaveBeenCalledTimes(3);
  });

  it('keeps the water puzzle reusable without including it in this chapter', () => {
    expect(Object.values(chispaChapter.scenes).filter(scene => scene.type === 'pipes').map(scene => scene.theme)).toEqual(['radio']);
    const onRotate = vi.fn(), onNext = vi.fn();
    const { rerender, container } = render(<PipePuzzle layout={waterInterlude.layout} rotations={waterInterlude.layout.initial} sound={false} onRotate={onRotate} onNext={onNext} />);
    expect(screen.getByRole('heading').textContent).toContain('agua');
    expect(container.querySelectorAll('.has-water')).toHaveLength(2);
    fireEvent.click(screen.getByRole('button', { name: /^Tubo, fila 1, columna 1:/ }));
    expect(onRotate).toHaveBeenCalledWith(0, 1);
    fireEvent.click(screen.getByRole('button', { name: 'Ayuda' }));
    expect(screen.getByRole('status').textContent).toContain('tubo');
    rerender(<PipePuzzle layout={waterInterlude.layout} rotations={waterInterlude.layout.solution} sound={false} theme="water" onRotate={onRotate} onNext={onNext} />);
    expect(screen.getByRole('img', { name: /^Depósito lleno/ })).toBeTruthy();
    expect(screen.getByRole('status').textContent).toBe('¡Lo has conseguido!');
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));
    expect(onNext).toHaveBeenCalledOnce();
  });

  it('teaches cable vocabulary and keeps the open circuit unpowered until complete', () => {
    const props = { layout: radioInterlude.layout, sound: false, theme: 'radio' as const, onRotate: vi.fn(), onNext: vi.fn() };
    const { container, rerender } = render(<PipePuzzle {...props} rotations={props.layout.initial} />);
    expect(container.textContent).not.toMatch(/agua|tubo|depósito/i);
    expect(container.querySelectorAll('.has-current, .pipe-water')).toHaveLength(0);
    expect(container.querySelectorAll('.is-linked')).toHaveLength(2);
    expect(screen.getByRole('img', { name: /^Batería desconectada/ })).toBeTruthy();
    expect(screen.getByRole('img', { name: /^Radio apagada/ })).toBeTruthy();
    expect(screen.getByText('Cable de vuelta ya conectado.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Ayuda' }));
    expect(screen.getByRole('status').textContent).toContain('cable');
    expect(document.activeElement?.getAttribute('aria-label')).toMatch(/^Cable, fila 1, columna 2:/);
    rerender(<PipePuzzle {...props} rotations={props.layout.solution} />);
    expect(container.querySelectorAll('.has-current')).toHaveLength(9);
    expect(screen.getByRole('img', { name: /^Radio encendida/ })).toBeTruthy();
    expect(screen.getByRole('img', { name: /^Batería conectada/ })).toBeTruthy();
    expect(screen.getByRole('status').textContent).toContain('¡Circuito cerrado!');
  });
});
