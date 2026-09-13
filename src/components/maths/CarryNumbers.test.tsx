// @vitest-environment jsdom
import { createRef } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { CarryNumbers, tensLabel } from './CarryNumbers';
import { regroupUnits } from '../../lib/maths';

afterEach(cleanup);

describe('numeric carry amounts', () => {
  it.each([[11, 1, 1], [20, 2, 0], [27, 2, 7], [36, 3, 6], [99, 9, 9], [127, 12, 7]])('splits %i units into %i tens and %i ones', (total, tens, ones) => {
    expect(regroupUnits(total)).toEqual({ tens, ones });
    const target = createRef<HTMLButtonElement>();
    const onSelect = vi.fn();
    const { container } = render(<div className="math-puzzle"><button ref={target}>Decenas</button><CarryNumbers total={total} selected={false} onSelect={onSelect} onCarry={vi.fn()} target={target} /></div>);
    const token = screen.getByRole('button', { name: `Llevar ${tensLabel(tens)}` });
    expect(token.querySelector('strong')?.textContent).toBe(String(tens));
    expect(container.querySelector('.remaining-token strong')?.textContent).toBe(String(ones));
    expect(container.querySelectorAll('.cube, .rod')).toHaveLength(0);
    fireEvent.click(token);
    expect(onSelect).toHaveBeenCalledWith(true);
    expect(document.activeElement).toBe(target.current);
  });

  it('handles zero and rejects invalid column totals', () => {
    expect(regroupUnits(0)).toEqual({ tens: 0, ones: 0 });
    for (const value of [-1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) expect(() => regroupUnits(value)).toThrow(RangeError);
  });
});
