/**
 * Weekly departure schedule (§0, §7). A van departs every Friday; bookings
 * close at a cut-off before departure. Used by the public countdown + load
 * scheduling. TODO(owner): confirm departure time and booking cut-off.
 */

export const DEPARTURE_WEEKDAY = 5; // Friday (0=Sun … 5=Fri)
export const DEPARTURE_HOUR = 14; // 14:00 local — TODO(owner) confirm
export const BOOKING_CUTOFF_HOURS_BEFORE = 24; // bookings close 24h before

export interface DepartureInfo {
  departure: Date;
  bookingCutoff: Date;
  msUntilDeparture: number;
  msUntilCutoff: number;
  bookingOpen: boolean;
}

/** Next Friday departure at or after `now`. */
export function nextDeparture(now: Date = new Date()): Date {
  const d = new Date(now);
  d.setHours(DEPARTURE_HOUR, 0, 0, 0);
  const daysAhead = (DEPARTURE_WEEKDAY - d.getDay() + 7) % 7;
  if (daysAhead === 0 && d.getTime() <= now.getTime()) {
    d.setDate(d.getDate() + 7);
  } else {
    d.setDate(d.getDate() + daysAhead);
  }
  return d;
}

export function departureInfo(now: Date = new Date()): DepartureInfo {
  const departure = nextDeparture(now);
  const bookingCutoff = new Date(
    departure.getTime() - BOOKING_CUTOFF_HOURS_BEFORE * 3600_000,
  );
  const msUntilDeparture = departure.getTime() - now.getTime();
  const msUntilCutoff = bookingCutoff.getTime() - now.getTime();
  return {
    departure,
    bookingCutoff,
    msUntilDeparture,
    msUntilCutoff,
    bookingOpen: msUntilCutoff > 0,
  };
}

export interface Countdown {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  done: boolean;
}

export function toCountdown(ms: number): Countdown {
  const clamped = Math.max(0, ms);
  const totalSec = Math.floor(clamped / 1000);
  return {
    days: Math.floor(totalSec / 86400),
    hours: Math.floor((totalSec % 86400) / 3600),
    minutes: Math.floor((totalSec % 3600) / 60),
    seconds: totalSec % 60,
    done: clamped === 0,
  };
}
