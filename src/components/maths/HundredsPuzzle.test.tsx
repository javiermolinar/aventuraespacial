// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MathPuzzle } from './MathPuzzle';
vi.mock('../../sound', () => ({ playSound: vi.fn() }));
afterEach(cleanup);
function answer(value: number) {
  for (const digit of String(value)) fireEvent.click(screen.getByRole('button', { name: `Número ${digit}` }));
  fireEvent.click(screen.getByRole('button', { name: 'Comprobar' }));
}
it('carries across both units and tens in 278 + 156', () => {
  const solved = vi.fn();
  render(<MathPuzzle operation={{a:278,b:156,operator:'+'}} partName="la cabeza" sound={false} onSolved={solved} />);
  answer(14);
  expect(solved).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', {name:'Llevar 1 a las decenas'}));
  answer(13);
  fireEvent.click(screen.getByRole('button', {name:'Llevar 1 a las centenas'}));
  answer(4);
  expect(solved).toHaveBeenCalledTimes(1);
  answer(4);
  expect(solved).toHaveBeenCalledTimes(1);
});
it('borrows through zero in 402 − 178 and keeps the changed digits', () => {
  const solved = vi.fn();
  render(<MathPuzzle operation={{a:402,b:178,operator:'−'}} partName="la cabeza" sound={false} onSolved={solved} />);
  fireEvent.click(screen.getByRole('button', {name:'Cambiar una centena'}));
  expect(screen.getByLabelText('centenas tras cambiar').textContent).toBe('3');
  expect(screen.getByLabelText('decenas tras cambiar').textContent).toBe('9');
  expect(screen.getByLabelText('unidades tras cambiar').textContent).toBe('12');
  answer(4); answer(2); answer(2);
  expect(solved).toHaveBeenCalledTimes(1);
});
it('borrows twice in 321 − 187', () => {
  const solved = vi.fn();
  render(<MathPuzzle operation={{a:321,b:187,operator:'−'}} partName="la cabeza" sound={false} onSolved={solved} />);
  fireEvent.click(screen.getByRole('button', {name:'Cambiar una decena'}));
  answer(4);
  fireEvent.click(screen.getByRole('button', {name:'Cambiar una centena'}));
  answer(3); answer(1);
  expect(solved).toHaveBeenCalledTimes(1);
});
it('rejects a wrong answer and supports keyboard correction', () => {
  const solved = vi.fn();
  render(<MathPuzzle operation={{a:324,b:152,operator:'+'}} partName="la cabeza" sound={false} onSolved={solved} />);
  answer(9); expect(solved).not.toHaveBeenCalled();
  expect(screen.getByRole('status').textContent).toContain('Revisa');
  fireEvent.keyDown(document.body,{key:'6'}); fireEvent.keyDown(document.body,{key:'Enter'});
  answer(7); answer(4);
  expect(solved).toHaveBeenCalledTimes(1);
});
it('carries 2 from units and tens when adding three numbers', () => {
  const solved = vi.fn();
  render(<MathPuzzle operation={{a:289,b:178,operator:'+',extraAddends:[177]}} partName="la cabeza" sound={false} onSolved={solved} />);
  answer(24);
  fireEvent.click(screen.getByRole('button', {name:'Llevar 2 a las decenas'}));
  expect(screen.getByLabelText('Llevada de decenas').textContent).toBe('2');
  answer(24);
  fireEvent.click(screen.getByRole('button', {name:'Llevar 2 a las centenas'}));
  expect(screen.getByLabelText('Llevada de centenas').textContent).toBe('2');
  answer(6);
  expect(solved).toHaveBeenCalledTimes(1);
});
it('handles borrowing across two zeros and a one-digit result in 100 − 99', () => {
  const solved = vi.fn();
  render(<MathPuzzle operation={{a:100,b:99,operator:'−'}} partName="la cabeza" sound={false} onSolved={solved} />);
  fireEvent.click(screen.getByRole('button', {name:'Cambiar una centena'}));
  answer(1); answer(0); answer(0);
  expect(solved).toHaveBeenCalledTimes(1);
});
