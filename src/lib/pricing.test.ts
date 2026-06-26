import { describe, it, expect } from 'vitest';
import { calculateQuote, chargeableWeight, findRate, volumetricWeight } from './pricing';
import { PLACEHOLDER_RATES } from './rates';

describe('volumetricWeight', () => {
  it('computes L*W*H / divisor', () => {
    expect(volumetricWeight(50, 40, 30, 5000)).toBe(12);
  });
  it('guards against zero divisor', () => {
    expect(volumetricWeight(10, 10, 10, 0)).toBe(0);
  });
});

describe('chargeableWeight', () => {
  it('takes the greater of actual vs volumetric and rounds up to 0.5kg', () => {
    // volumetric 12 > actual 3 → 12
    expect(chargeableWeight(3, 50, 40, 30, 5000)).toBe(12);
  });
  it('uses actual weight when it dominates', () => {
    // actual 8.2 > volumetric small → ceil to 8.5
    expect(chargeableWeight(8.2, 10, 10, 10, 5000)).toBe(8.5);
  });
});

describe('findRate', () => {
  it('returns the per-kg band for a weight in range', () => {
    const r = findRate(PLACEHOLDER_RATES, 'UK_BG', 2);
    expect(r?.price_per_kg).toBe(2);
    expect(r?.weight_to_kg).toBe(1000);
  });
  it('returns the per-kg band for a heavier parcel too', () => {
    const r = findRate(PLACEHOLDER_RATES, 'UK_BG', 2.5);
    expect(r?.price_per_kg).toBe(2);
  });
});

describe('calculateQuote (£2/kg linear)', () => {
  it('prices a small UK→BG parcel at £2/kg of chargeable weight', () => {
    const q = calculateQuote(
      {
        direction: 'UK_BG',
        weight_kg: 1.5,
        length_cm: 20,
        width_cm: 20,
        height_cm: 20,
        is_gift: false,
        remote_area: false,
      },
      PLACEHOLDER_RATES,
    );
    // volumetric 1.6 > actual 1.5 → chargeable 2.0kg → 2 × £2 = £4
    expect(q.chargeable_weight_kg).toBe(2);
    expect(q.total).toBe(4);
    expect(q.currency).toBe('GBP');
  });

  it('adds a remote-area surcharge', () => {
    const q = calculateQuote(
      {
        direction: 'UK_BG',
        weight_kg: 1,
        length_cm: 10,
        width_cm: 10,
        height_cm: 10,
        is_gift: false,
        remote_area: true,
      },
      PLACEHOLDER_RATES,
    );
    // 1kg × £2 = £2, + £6 remote = £8
    expect(q.surcharges).toEqual([{ label: 'remote', amount: 6 }]);
    expect(q.total).toBe(8);
  });

  it('uses volumetric weight when bulky-but-light', () => {
    const q = calculateQuote(
      {
        direction: 'UK_BG',
        weight_kg: 1,
        length_cm: 60,
        width_cm: 50,
        height_cm: 40,
        is_gift: false,
        remote_area: false,
      },
      PLACEHOLDER_RATES,
    );
    // volumetric = 120000/5000 = 24kg → 24 × £2 = £48
    expect(q.chargeable_weight_kg).toBe(24);
    expect(q.total).toBe(48);
  });
});
