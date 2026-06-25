/**
 * PLACEHOLDER pricing bands — mirror supabase/seed.sql so the public quote
 * works in Wave 1 before the DB is wired. TODO(owner): set real rates in the
 * admin pricing editor; these are illustrative only.
 */
import type { PricingRate } from '@/types/domain';

export const PLACEHOLDER_RATES: PricingRate[] = [
  band('UK_BG', 0, 2, 12),
  band('UK_BG', 2, 5, 18),
  band('UK_BG', 5, 10, 28),
  band('UK_BG', 10, 20, 45),
  band('UK_BG', 20, 30, 65),
  band('UK_BG', 30, 1000, 95),
  band('BG_UK', 0, 2, 14),
  band('BG_UK', 2, 5, 20),
  band('BG_UK', 5, 10, 32),
  band('BG_UK', 10, 20, 52),
  band('BG_UK', 20, 30, 74),
  band('BG_UK', 30, 1000, 110),
];

function band(
  direction: 'UK_BG' | 'BG_UK',
  from: number,
  to: number,
  price: number,
): PricingRate {
  return {
    id: `${direction}-${from}-${to}`,
    direction,
    weight_from_kg: from,
    weight_to_kg: to,
    price,
    currency: 'GBP',
    volumetric_divisor: 5000,
    surcharge_gift: 0,
    surcharge_remote: 6,
  };
}
