// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MotionConfig } from 'motion/react';
import { MathPuzzle } from './MathPuzzle';
import type { Operation } from '../../lib/maths';

afterEach(cleanup);

function setup(operation: Operation) {
  const onSolved = vi.fn();
  render(<MotionConfig reducedMotion="always"><MathPuzzle operation={operation} partName="la cabeza" sound={false} onSolved={onSolved} /></MotionConfig>);
  return onSolved;
}

function answer(value: number) {
  for (const digit of String(value)) fireEvent.click(screen.getByRole('button', { name: `Número ${digit}` }));
  fireEvent.click(screen.getByRole('button', { name: 'Comprobar' }));
}

function carry() {
  fireEvent.click(screen.getByRole('button', { name: 'Llevar 1 decena' }));
  fireEvent.click(screen.getByRole('button', { name: 'Decenas: colocar la llevada' }));
}

it('preserves entered digits while hidden and ignores global keyboard shortcuts', () => {
  const solved = vi.fn();
  const puzzle = <MathPuzzle operation={{ a: 4, b: 3, operator: '+' }} partName="la cabeza" sound={false} onSolved={solved} />;
  const view = render(<div hidden={false}>{puzzle}</div>);
  fireEvent.keyDown(document.body, { key: '7' });
  view.rerender(<div hidden>{puzzle}</div>);
  fireEvent.keyDown(document.body, { key: 'Enter' });
  fireEvent.keyDown(document.body, { key: 'Backspace' });
  fireEvent.keyDown(document.body, { key: '9' });
  expect(solved).not.toHaveBeenCalled();
  view.rerender(<div hidden={false}>{puzzle}</div>);
  expect(screen.getByLabelText('Respuesta de la suma').textContent).toBe('7');
  fireEvent.click(screen.getByRole('button', { name: 'Comprobar' }));
  expect(solved).toHaveBeenCalledOnce();
});

describe('simple addition', () => {
  for (const [a, b, result] of [[4, 3, 7], [8, 3, 11], [8, 7, 15], [5, 5, 10], [9, 9, 18]]) {
    it(`${a} + ${b} accepts the complete answer without a separate carry`, () => {
      const solved = setup({ a, b, operator: '+' });
      answer(result);
      expect(solved).toHaveBeenCalledOnce();
      expect(screen.queryByRole('button', { name: 'Llevar 1 decena' })).toBeNull();
      expect(screen.queryByLabelText('Respuesta de las decenas')).toBeNull();
    });
  }
  it('does not accept the units digit alone for a two-digit total', () => {
    const solved = setup({ a: 8, b: 3, operator: '+' });
    answer(1);
    expect(solved).not.toHaveBeenCalled();
    answer(11);
    expect(solved).toHaveBeenCalledOnce();
  });
});

describe('numeric column carrying', () => {
  it('15 + 15 keeps the zero from the accepted 10 and advances directly to tens after carrying', () => {
    const solved = setup({ a: 15, b: 15, operator: '+' });
    expect(screen.getByLabelText('Respuesta de las unidades').textContent).toBe('·');
    expect(screen.queryByRole('button', { name: 'Llevar 1 decena' })).toBeNull();
    answer(10);
    expect(screen.getByLabelText('Suma de las unidades').textContent).toBe('10');
    expect(screen.getByLabelText('Respuesta de las unidades').textContent).toBe('0');
    expect(screen.getByLabelText('Quedan 0 unidades').textContent).toBe('0unidades');
    expect(solved).not.toHaveBeenCalled();
    carry();
    expect(screen.getByLabelText('Respuesta de las unidades').textContent).toBe('0');
    expect(document.activeElement).toBe(screen.getByLabelText('Respuesta de las decenas'));
    expect(screen.queryByLabelText('Suma de las unidades')).toBeNull();
    expect(document.querySelectorAll('.cube, .rod, .carry-token')).toHaveLength(0);
    expect(screen.getByLabelText('Respuesta de las decenas').textContent).toBe('?');
    answer(2);
    expect(solved).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Cálculo de las decenas').textContent).toContain('1+1+1');
    answer(3);
    expect(solved).toHaveBeenCalledOnce();
  });

  it('regression: 36 + 25 does not show the carried ten again among remaining units', () => {
    const solved = setup({ a: 36, b: 25, operator: '+' });
    answer(11);
    // Clicking the destination alone must not bypass moving the number.
    fireEvent.click(screen.getByRole('button', { name: 'Decenas: colocar la llevada' }));
    expect(screen.getByRole('button', { name: 'Llevar 1 decena' })).toBeTruthy();
    carry();
    expect(screen.getByLabelText('Llevamos 1 decena').textContent).toBe('1');
    expect(screen.getByLabelText('Respuesta de las unidades').textContent).toBe('1');
    expect(screen.getByLabelText('Respuesta de las decenas').textContent).toBe('?');
    expect(document.querySelectorAll('.cube, .rod, .intermediate-sum, .carry-token')).toHaveLength(0);
    answer(0);
    expect(solved).not.toHaveBeenCalled();
    expect(screen.getByRole('status').textContent).toBe('Revisa los números y prueba otra vez.');
    expect(screen.getByLabelText('Respuesta de las unidades').textContent).toBe('1');
    expect(screen.getByLabelText('Cálculo de las decenas').textContent).toContain('3+2+1');
    answer(5);
    expect(solved).not.toHaveBeenCalled();
    answer(6);
    expect(solved).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole('button', { name: 'Comprobar' }));
    expect(solved).toHaveBeenCalledOnce();
  });

  it('27 + 16 leaves the number three after carrying one ten', () => {
    const solved = setup({ a: 27, b: 16, operator: '+' });
    answer(3);
    expect(screen.queryByRole('button', { name: 'Llevar 1 decena' })).toBeNull();
    answer(13);
    expect(screen.getByLabelText('Quedan 3 unidades').textContent).toBe('3unidades');
    expect(document.querySelectorAll('.cube, .rod')).toHaveLength(0);
    carry();
    expect(screen.getByLabelText('Respuesta de las unidades').textContent).toBe('3');
    answer(4);
    expect(solved).toHaveBeenCalledOnce();
  });

  it('28 + 16 keeps the 4 when 14 is accepted, without ever asking for it again', () => {
    const solved = setup({ a: 28, b: 16, operator: '+' });
    answer(13);
    expect(screen.getByLabelText('Respuesta de las unidades').textContent).toBe('·');
    answer(14);
    expect(screen.getByLabelText('Suma de las unidades').textContent).toBe('14');
    expect(screen.getByLabelText('Respuesta de las unidades').textContent).toBe('4');
    expect(screen.queryByLabelText('Respuesta de las decenas')).toBeNull();
    expect(solved).not.toHaveBeenCalled();
    carry();
    expect(screen.getByLabelText('Respuesta de las unidades').textContent).toBe('4');
    expect(screen.getByLabelText('Respuesta de las decenas').textContent).toBe('?');
    expect(screen.getByLabelText('Cálculo de las decenas').textContent).toContain('2+1+1');
    answer(4);
    expect(solved).toHaveBeenCalledOnce();
  });

  it('10 + 5 still uses place-value digits and blocks without a carry task', () => {
    const solved = setup({ a: 10, b: 5, operator: '+' });
    expect(screen.queryByLabelText('Suma de las unidades')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Llevar 1 decena' })).toBeNull();
    answer(5);
    expect(solved).not.toHaveBeenCalled();
    answer(1);
    expect(solved).toHaveBeenCalledOnce();
  });
});

it('ignores global answer keys while an adventure dialog is open', () => {
  const solved = setup({ a: 4, b: 3, operator: '+' });
  render(<dialog open><button>Pausa</button></dialog>);
  fireEvent.keyDown(document.body, { key: '7' });
  fireEvent.keyDown(document.body, { key: 'Enter' });
  expect(screen.getByLabelText('Respuesta de la suma').textContent).toBe('?');
  expect(solved).not.toHaveBeenCalled();
  screen.getByRole('dialog').removeAttribute('open');
  fireEvent.keyDown(document.body, { key: '7' });
  fireEvent.keyDown(document.body, { key: 'Enter' });
  expect(solved).toHaveBeenCalledOnce();
});

it('preserves subtraction regrouping for 23 − 7', () => {
  const solved = setup({ a: 23, b: 7, operator: '−' });
  fireEvent.click(screen.getByRole('button', { name: 'Cambiar una decena' }));
  expect(document.querySelector('.borrowed')?.textContent).toBe('13');
  answer(6);
  answer(1);
  expect(solved).toHaveBeenCalledOnce();
});
