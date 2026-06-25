import { useEffect, useState } from 'react';
import { departureInfo, toCountdown, type Countdown } from '@/lib/schedule';

/** Live countdown to the next Friday departure (§7). Ticks every second. */
export function useDepartureCountdown(): { countdown: Countdown; departure: Date; bookingOpen: boolean; bookingCutoff: Date } {
  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const info = departureInfo(new Date(now));
  return {
    countdown: toCountdown(info.msUntilDeparture),
    departure: info.departure,
    bookingOpen: info.bookingOpen,
    bookingCutoff: info.bookingCutoff,
  };
}
