// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { conveyorArrivalMs, conveyorDuration, conveyorTravelMs, useConveyor } from './useConveyor';

const fullTrip = conveyorArrivalMs + conveyorTravelMs + 32;
const advance = (ms: number) => act(() => { vi.advanceTimersByTime(ms); });

beforeEach(() => {
  vi.useFakeTimers();
  Object.defineProperty(document, 'hidden', { configurable: true, value: false });
});
afterEach(() => { cleanup(); vi.useRealTimers(); });

it.each([[0, 8_000], [3, 6_500], [10, 3_000]])('uses the level %i speed for travel, countdown and expiry', (level, duration) => {
  const onExpire = vi.fn();
  const { result } = renderHook(() => useConveyor({ ready: true, selected: 'head', paused: false, onExpire, travelMs: conveyorDuration(level) }));
  expect(result.current.seconds).toBe(duration / 1000);
  advance(conveyorArrivalMs + duration / 2);
  expect(parseFloat(result.current.position.get())).toBeCloseTo(50, 0);
  act(() => { result.current.grab(); });
  advance(20_000);
  expect(onExpire).not.toHaveBeenCalled();
  act(() => { result.current.release(); });
  advance(duration / 2 + 32);
  expect(onExpire).toHaveBeenCalledOnce();
});

it('expires once after arrival and travel, using the latest host callback', () => {
  const initial = vi.fn(), latest = vi.fn();
  const { result, rerender } = renderHook(({ onExpire }) => useConveyor({ ready: true, selected: 'head', paused: false, onExpire }), { initialProps: { onExpire: initial } });
  advance(conveyorArrivalMs + conveyorTravelMs / 2);
  expect(result.current.seconds).toBeGreaterThanOrEqual(4);
  expect(parseFloat(result.current.position.get())).toBeCloseTo(50, 0);
  rerender({ onExpire: latest });
  advance(conveyorTravelMs);
  expect(initial).not.toHaveBeenCalled();
  expect(latest).toHaveBeenCalledOnce();
  act(() => { expect(result.current.grab()).toBe(false); });
  advance(fullTrip);
  expect(latest).toHaveBeenCalledOnce();
});

it('allows unlimited placement time after a catch and resumes the remaining trip on release', () => {
  const onExpire = vi.fn();
  const { result } = renderHook(() => useConveyor({ ready: true, selected: 'head', paused: false, onExpire }));
  advance(4_000);
  act(() => { result.current.grab(); });
  const position = result.current.position.get();
  advance(fullTrip * 2);
  expect(result.current.position.get()).toBe(position);
  expect(onExpire).not.toHaveBeenCalled();
  act(() => { result.current.release(); });
  advance(4_000);
  expect(onExpire).not.toHaveBeenCalled();
  advance(1_000);
  expect(onExpire).toHaveBeenCalledOnce();
});

it('pauses during story review and hidden tabs without charging for elapsed wall time', () => {
  const onExpire = vi.fn();
  const { result, rerender } = renderHook(({ paused }) => useConveyor({ ready: true, selected: 'head', paused, onExpire }), { initialProps: { paused: false } });
  advance(2_000);
  const position = result.current.position.get();
  rerender({ paused: true });
  advance(fullTrip * 2);
  expect(result.current.position.get()).toBe(position);
  rerender({ paused: false });
  act(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  advance(fullTrip * 2);
  expect(result.current.position.get()).toBe(position);
  expect(onExpire).not.toHaveBeenCalled();
  act(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: false });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  advance(6_000);
  expect(onExpire).not.toHaveBeenCalled();
  advance(1_000);
  expect(onExpire).toHaveBeenCalledOnce();
});

it('starts a fresh trip when the same piece is earned again and cancels on unmount', () => {
  const onExpire = vi.fn();
  const { result, rerender, unmount } = renderHook(({ ready }) => useConveyor({ ready, selected: 'head', paused: false, onExpire }), { initialProps: { ready: true } });
  advance(fullTrip);
  expect(onExpire).toHaveBeenCalledOnce();
  rerender({ ready: false });
  advance(fullTrip);
  rerender({ ready: true });
  expect(result.current.seconds).toBe(8);
  expect(result.current.position.get()).toBe('0%');
  advance(fullTrip);
  expect(onExpire).toHaveBeenCalledTimes(2);
  rerender({ ready: false });
  rerender({ ready: true });
  unmount();
  advance(fullTrip);
  expect(onExpire).toHaveBeenCalledTimes(2);
});
