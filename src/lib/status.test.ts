import { describe, it, expect } from 'vitest';
import { canTransition, nextStatuses, isTerminal, timelineIndex, isSideStatus } from './status';

describe('status state machine', () => {
  it('allows the happy-path forward transitions', () => {
    expect(canTransition('at_uk_hub', 'on_load')).toBe(true);
    expect(canTransition('on_load', 'departed_uk')).toBe(true);
    expect(canTransition('out_for_delivery', 'delivered')).toBe(true);
  });

  it('rejects skipping or going backwards', () => {
    expect(canTransition('booked', 'delivered')).toBe(false);
    expect(canTransition('delivered', 'booked')).toBe(false);
  });

  it('permits side exits to exception/cancelled', () => {
    expect(canTransition('booked', 'cancelled')).toBe(true);
    expect(canTransition('collected_uk', 'exception')).toBe(true);
  });

  it('marks terminal states', () => {
    expect(isTerminal('delivered')).toBe(true);
    expect(isTerminal('cancelled')).toBe(true);
    expect(isTerminal('booked')).toBe(false);
  });

  it('orders the main timeline and excludes side states', () => {
    expect(timelineIndex('draft')).toBe(0);
    expect(timelineIndex('delivered')).toBe(9);
    expect(isSideStatus('exception')).toBe(true);
    expect(isSideStatus('delivered')).toBe(false);
  });

  it('exposes next statuses', () => {
    expect(nextStatuses('arrived_bg_hub')).toContain('handed_to_econt');
  });
});
