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

it.each([[0, 8_000], [3, 6_500], [10, 3_000]])('uses the level %i speed for travel, countdown and landing', (level, duration) => {
  const { result } = renderHook(() => useConveyor({ ready: true, selected: 'head', paused: false, travelMs: conveyorDuration(level) }));
  expect(result.current.seconds).toBe(duration / 1000);
  advance(conveyorArrivalMs + duration / 2);
  expect(parseFloat(result.current.position.get())).toBeCloseTo(50, 0);
  act(() => { result.current.grab(); });
  advance(20_000);
  expect(result.current.onFloor).toBe(false);
  act(() => { result.current.release(); });
  advance(duration / 2 + 32);
  expect(result.current.onFloor).toBe(true);
});

it('leaves a missed piece on the floor for unlimited pickup and retries', () => {
  const { result } = renderHook(() => useConveyor({ ready: true, selected: 'head', paused: false }));
  advance(fullTrip);
  expect(result.current.onFloor).toBe(true);
  expect(result.current.running).toBe(false);
  expect(result.current.seconds).toBe(0);
  expect(result.current.position.get()).toBe('100%');
  advance(fullTrip * 3);
  act(() => { expect(result.current.grab()).toBe(true); });
  expect(result.current.caught).toBe(true);
  act(() => { result.current.release(); });
  advance(fullTrip);
  expect(result.current.onFloor).toBe(true);
  expect(result.current.running).toBe(false);
  act(() => { expect(result.current.grab()).toBe(true); });
});

it('allows unlimited placement time after a catch and resumes the remaining trip on release', () => {
  const { result } = renderHook(() => useConveyor({ ready: true, selected: 'head', paused: false }));
  advance(4_000);
  act(() => { result.current.grab(); });
  const position = result.current.position.get();
  advance(fullTrip * 2);
  expect(result.current.position.get()).toBe(position);
  expect(result.current.onFloor).toBe(false);
  act(() => { result.current.release(); });
  advance(4_000);
  expect(result.current.onFloor).toBe(false);
  advance(1_000);
  expect(result.current.onFloor).toBe(true);
});

it('pauses during story review and hidden tabs without charging for elapsed wall time', () => {
  const { result, rerender } = renderHook(({ paused }) => useConveyor({ ready: true, selected: 'head', paused }), { initialProps: { paused: false } });
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
  expect(result.current.onFloor).toBe(false);
  act(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: false });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  advance(6_000);
  expect(result.current.onFloor).toBe(false);
  advance(1_000);
  expect(result.current.onFloor).toBe(true);
});

it('starts a fresh trip when a new piece is earned and cancels on unmount', () => {
  const { result, rerender, unmount } = renderHook(({ ready, selected }) => useConveyor({ ready, selected, paused: false }), { initialProps: { ready: true, selected: 'head' } });
  advance(fullTrip);
  expect(result.current.onFloor).toBe(true);
  rerender({ ready: false, selected: 'body' });
  advance(fullTrip);
  rerender({ ready: true, selected: 'body' });
  expect(result.current.onFloor).toBe(false);
  expect(result.current.seconds).toBe(8);
  expect(result.current.position.get()).toBe('0%');
  advance(fullTrip);
  expect(result.current.onFloor).toBe(true);
  rerender({ ready: false, selected: 'body' });
  rerender({ ready: true, selected: 'body' });
  const position = result.current.position;
  unmount();
  advance(fullTrip);
  expect(position.get()).toBe('0%');
});
