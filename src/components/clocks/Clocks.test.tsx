// @vitest-environment jsdom
import { useState } from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { AnalogClock } from './AnalogClock';
import { DigitalClock } from './DigitalClock';

afterEach(cleanup);
function Pair({ initial = 690, disabled = false }: { initial?: number; disabled?: boolean }) {
  const [time, setTime] = useState(initial);
  return <><AnalogClock value={time} onChange={setTime} disabled={disabled} /><DigitalClock value={time} onChange={setTime} disabled={disabled} /></>;
}
it('reusable clocks share controlled state, carry minutes, and cross noon and midnight', () => {
  render(<Pair initial={715} />);
  fireEvent.keyDown(screen.getByRole('slider', { name: 'Aguja larga: minutos' }), { key: 'ArrowRight' });
  expect(screen.getByText('12:00')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Quitar 5 minutos' }));
  expect(screen.getByText('11:55')).toBeTruthy();
  for (let i = 0; i < 12; i++) fireEvent.keyDown(screen.getByRole('slider', { name: 'Aguja corta: horas' }), { key: 'ArrowUp' });
  expect(screen.getByText('23:55')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Añadir 5 minutos' }));
  expect(screen.getByText('00:00')).toBeTruthy();
});
it('disabled clocks cannot change, and display-only clocks have no input controls', () => {
  const { rerender } = render(<Pair disabled />);
  fireEvent.keyDown(screen.getByRole('slider', { name: 'Aguja corta: horas' }), { key: 'ArrowRight' });
  fireEvent.click(screen.getByRole('button', { name: 'Añadir una hora' }));
  expect(screen.getByText('11:30')).toBeTruthy();
  rerender(<><AnalogClock value={990} /><DigitalClock value={990} /></>);
  expect(screen.queryAllByRole('slider')).toHaveLength(0);
  expect(screen.queryAllByRole('button')).toHaveLength(0);
  expect(screen.getByRole('img', { name: 'Las 4 y media de la tarde' })).toBeTruthy();
  expect(screen.getByRole('img', { name: 'Reloj digital de 24 horas: 16:30' })).toBeTruthy();
});
it('optionally lets games select a hand and tap numbers, preserving the half-day', () => {
  const change = vi.fn();
  const { rerender } = render(<AnalogClock value={990} onChange={change} activeHand="hour" />);
  fireEvent.click(screen.getByRole('button', { name: 'Poner hora en 12' }));
  expect(change).toHaveBeenLastCalledWith(750); // 12:30, not midnight.
  rerender(<AnalogClock value={990} onChange={change} activeHand="minute" />);
  fireEvent.keyDown(screen.getByRole('button', { name: 'Poner minutos en 15' }), { key: 'Enter' });
  expect(change).toHaveBeenLastCalledWith(975); // 16:15.
  rerender(<AnalogClock value={990} onChange={change} activeHand="minute" disabled />);
  expect(screen.queryAllByRole('button')).toHaveLength(0);
});
it('allows games to choose a finer minute step without changing their rules', () => {
  const change = vi.fn();
  render(<AnalogClock value={449} onChange={change} minuteStep={1} />);
  fireEvent.keyDown(screen.getByRole('slider', { name: 'Aguja larga: minutos' }), { key: 'ArrowRight' });
  expect(change).toHaveBeenCalledWith(450);
});
