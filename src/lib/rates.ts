/**
 * PLACEHOLDER pricing — mirrors supabase/seed.sql so the public quote works
 * before the DB is wired. The business charges a flat £2/kg (chargeable weight =
 * the greater of actual and volumetric). Owner can override in the admin pricing
 * editor / DB.
 */
import type { PricingRate } from '@/types/domain';

export const PLACEHOLDER_RATES: PricingRate[] = [perKg('UK_BG', 2), perKg('BG_UK', 2)];

/** A single linear per-kg band covering all weights for a direction. */
function perKg(direction: 'UK_BG' | 'BG_UK', pricePerKg: number): PricingRate {
  return {
    id: `${direction}-perkg`,
    direction,
    weight_from_kg: 0,
    weight_to_kg: 1000,
    price: 0,
    price_per_kg: pricePerKg,
    min_charge: 0,
    currency: 'GBP',
    volumetric_divisor: 5000,
    surcharge_gift: 0,
    surcharge_remote: 6,
  };
}
