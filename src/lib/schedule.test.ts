import { describe, it, expect } from 'vitest';
import { nextDeparture, departureInfo, toCountdown, DEPARTURE_WEEKDAY } from './schedule';

describe('nextDeparture', () => {
  it('always lands on a Friday', () => {
    for (const day of [1, 2, 3, 4, 5, 6, 7, 10, 20]) {
      const now = new Date(2026, 5, day, 9, 0, 0); // June 2026
      expect(nextDeparture(now).getDay()).toBe(DEPARTURE_WEEKDAY);
    }
  });

  it('rolls to next week if Friday departure already passed', () => {
    // Fri 2026-06-26 16:00, departure is 14:00 → next is 2026-07-03
    const now = new Date(2026, 5, 26, 16, 0, 0);
    const dep = nextDeparture(now);
    expect(dep.getDate()).toBe(3);
    expect(dep.getMonth()).toBe(6);
  });

  it('returns the same Friday if before departure time', () => {
    const now = new Date(2026, 5, 26, 9, 0, 0); // Fri morning
    const dep = nextDeparture(now);
    expect(dep.getDate()).toBe(26);
  });
});

describe('departureInfo', () => {
  it('puts the booking cut-off before departure', () => {
    const now = new Date(2026, 5, 22, 9, 0, 0);
    const info = departureInfo(now);
    expect(info.bookingCutoff.getTime()).toBeLessThan(info.departure.getTime());
    expect(info.bookingOpen).toBe(true);
  });
});

describe('toCountdown', () => {
  it('breaks ms into d/h/m/s', () => {
    const c = toCountdown((2 * 86400 + 3 * 3600 + 4 * 60 + 5) * 1000);
    expect(c).toMatchObject({ days: 2, hours: 3, minutes: 4, seconds: 5, done: false });
  });
  it('clamps negatives to done', () => {
    expect(toCountdown(-1000).done).toBe(true);
  });
});
