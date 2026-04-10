import { describe, it, expect } from 'vitest';
import { ComboTracker } from '../combo-tracker';

describe('ComboTracker', () => {
  it('starts at 0', () => {
    const tracker = new ComboTracker();
    expect(tracker.getState().current).toBe(0);
    expect(tracker.getState().tier).toBe('none');
  });

  it('increments on hit', () => {
    const tracker = new ComboTracker();
    tracker.hit();
    tracker.hit();
    tracker.hit();
    const state = tracker.getState();
    expect(state.current).toBe(3);
    expect(state.tier).toBe('good');
    expect(state.multiplier).toBe(1.5);
  });

  it('resets to 0 on miss', () => {
    const tracker = new ComboTracker();
    tracker.hit();
    tracker.hit();
    tracker.hit();
    tracker.miss();
    expect(tracker.getState().current).toBe(0);
    expect(tracker.getState().tier).toBe('none');
  });

  it('tracks max combo', () => {
    const tracker = new ComboTracker();
    for (let i = 0; i < 7; i++) tracker.hit();
    tracker.miss();
    tracker.hit();
    tracker.hit();

    expect(tracker.getState().current).toBe(2);
    expect(tracker.getState().max).toBe(7);
  });

  it('reaches legendary tier at 10+', () => {
    const tracker = new ComboTracker();
    for (let i = 0; i < 10; i++) tracker.hit();

    expect(tracker.getState().tier).toBe('legendary');
    expect(tracker.getState().multiplier).toBe(3.0);
  });
});
