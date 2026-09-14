// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { RotationGesture } from './RotationGesture';

afterEach(cleanup);
function setup() {
  const onRotate = vi.fn(), onActive = vi.fn();
  const { container } = render(<RotationGesture id="A" style={{}} disabled={false} widthInCells={2}
    getBounds={() => ({ left: 100, top: 100, width: 100, height: 100 })} onRotate={onRotate} onActive={onActive}><span>Piece preview</span></RotationGesture>);
  const edge = screen.getByRole('button', { name: 'Girar pieza A' });
  edge.setPointerCapture = vi.fn();
  edge.hasPointerCapture = () => false;
  function pointer(type: string, angle = -45, id = 1, primary = true) {
    const radians = angle * Math.PI / 180;
    const event = new MouseEvent(type, { bubbles: true, cancelable: true, button: 0, clientX: 150 + 60 * Math.cos(radians), clientY: 150 + 60 * Math.sin(radians) });
    Object.defineProperties(event, { pointerId: { value: id }, pointerType: { value: 'touch' }, isPrimary: { value: primary } });
    fireEvent(edge, event);
  }
  function sweep(degrees: number) {
    pointer('pointerdown');
    const steps = Math.ceil(Math.abs(degrees) / 20);
    for (let i = 1; i <= steps; i++) pointer('pointermove', -45 + degrees * i / steps);
  }
  return { edge, container, onRotate, onActive, pointer, sweep };
}

it.each([[85, 1], [-85, -1], [135, 2], [-135, -2], [35, 0], [-35, 0], [360, 0]])('previews %s degrees, then commits %s quarter-turns only on release', (degrees, turns) => {
  const { container, onRotate, onActive, pointer, sweep } = setup();
  sweep(degrees);
  expect(container.querySelector('.packing-rotation-preview')).not.toBeNull();
  expect(onRotate).not.toHaveBeenCalled();
  pointer('pointerup', -45 + degrees);
  if (turns) expect(onRotate).toHaveBeenCalledExactlyOnceWith(turns);
  else expect(onRotate).not.toHaveBeenCalled();
  expect(container.querySelector('.packing-rotation-preview')).toBeNull();
  expect(onActive.mock.calls).toEqual([[true], [false]]);
});

it('tapping or clicking the edge does not turn; keyboard/assistive activation remains available', () => {
  const { edge, onRotate, pointer } = setup();
  pointer('pointerdown');
  pointer('pointerup');
  fireEvent.click(edge, { detail: 1 });
  expect(onRotate).not.toHaveBeenCalled();
  fireEvent.click(edge, { detail: 0 });
  expect(onRotate).toHaveBeenCalledExactlyOnceWith(1);
});

it.each(['pointercancel', 'lostpointercapture', 'Escape', 'blur', 'resize'])('%s cancels without changing orientation', cancellation => {
  const { container, onRotate, onActive, pointer, sweep } = setup();
  sweep(90);
  if (cancellation === 'Escape') fireEvent.keyDown(window, { key: 'Escape' });
  else if (cancellation === 'blur' || cancellation === 'resize') fireEvent(window, new Event(cancellation));
  else pointer(cancellation, 45);
  pointer('pointerup', 45);
  expect(onRotate).not.toHaveBeenCalled();
  expect(container.querySelector('.packing-rotation-preview')).toBeNull();
  expect(onActive).toHaveBeenLastCalledWith(false);
});

it('ignores secondary fingers and their cancellation', () => {
  const { onRotate, pointer, sweep } = setup();
  sweep(90);
  pointer('pointerdown', 0, 2, false);
  pointer('pointermove', -90, 2, false);
  pointer('pointercancel', -90, 2, false);
  pointer('pointerup', 45);
  expect(onRotate).toHaveBeenCalledExactlyOnceWith(1);
});
