/**
 * Pricing core (§5 `pricing`, §13 unit-tested). Pure & deterministic so the
 * Edge Function and the client share the exact same math. The server is
 * authoritative — the client uses this only for instant preview.
 *
 * NOTE: rates here are PLACEHOLDERS mirroring the seeded `pricing_rates`.
 * The owner sets the real numbers in the admin pricing editor.
 */
import type { Currency, Direction, PricingRate, Quote } from '@/types/domain';

/** Volumetric (dimensional) weight: (L×W×H) / divisor. */
export function volumetricWeight(
  length_cm: number,
  width_cm: number,
  height_cm: number,
  divisor: number,
): number {
  if (divisor <= 0) return 0;
  return (length_cm * width_cm * height_cm) / divisor;
}

/** Chargeable weight = max(actual, volumetric), rounded up to 0.5 kg. */
export function chargeableWeight(
  weight_kg: number,
  length_cm: number,
  width_cm: number,
  height_cm: number,
  divisor: number,
): number {
  const vol = volumetricWeight(length_cm, width_cm, height_cm, divisor);
  const raw = Math.max(weight_kg, vol);
  return Math.ceil(raw * 2) / 2;
}

export interface PriceArgs {
  direction: Direction;
  weight_kg: number;
  length_cm: number;
  width_cm: number;
  height_cm: number;
  is_gift: boolean;
  remote_area: boolean;
  currency?: Currency;
}

/** Find the rate band covering the chargeable weight for a direction. */
export function findRate(rates: PricingRate[], direction: Direction, weight: number): PricingRate | null {
  const candidates = rates
    .filter((r) => r.direction === direction)
    .filter((r) => weight > r.weight_from_kg - 1e-9 && weight <= r.weight_to_kg + 1e-9)
    .sort((a, b) => a.weight_to_kg - b.weight_to_kg);
  if (candidates[0]) return candidates[0];
  // Over the top band: fall back to the heaviest band (linear top-up could be
  // added once the owner defines per-kg overflow pricing).
  const heaviest = rates
    .filter((r) => r.direction === direction)
    .sort((a, b) => b.weight_to_kg - a.weight_to_kg)[0];
  return heaviest ?? null;
}

export function calculateQuote(args: PriceArgs, rates: PricingRate[]): Quote {
  const divisor = rates.find((r) => r.direction === args.direction)?.volumetric_divisor ?? 5000;
  const chargeable = chargeableWeight(
    args.weight_kg,
    args.length_cm,
    args.width_cm,
    args.height_cm,
    divisor,
  );

  const rate = findRate(rates, args.direction, chargeable);
  if (!rate) {
    throw new Error(`No pricing rate for direction ${args.direction}`);
  }

  const surcharges: Quote['surcharges'] = [];
  if (args.is_gift && rate.surcharge_gift) {
    surcharges.push({ label: 'gift', amount: rate.surcharge_gift });
  }
  if (args.remote_area && rate.surcharge_remote) {
    surcharges.push({ label: 'remote', amount: rate.surcharge_remote });
  }

  const total = round2(rate.price + surcharges.reduce((s, x) => s + x.amount, 0));

  return {
    direction: args.direction,
    chargeable_weight_kg: chargeable,
    base_price: rate.price,
    surcharges,
    total,
    currency: args.currency ?? rate.currency,
    eta_text_bg: args.direction === 'UK_BG' ? '3–5 работни дни след курса' : '4–7 работни дни',
    eta_text_en: args.direction === 'UK_BG' ? '3–5 working days after departure' : '4–7 working days',
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
