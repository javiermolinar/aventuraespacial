// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { PipePuzzle } from './PipePuzzle';
import { radioInterlude, waterInterlude } from './chapters/interludes';
import { chispaChapter } from './chapters/chispa';

afterEach(cleanup);

describe('connection puzzle themes', () => {
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
