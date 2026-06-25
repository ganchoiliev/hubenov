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
  it('matches the correct band (upper-inclusive)', () => {
    const r = findRate(PLACEHOLDER_RATES, 'UK_BG', 2);
    expect(r?.weight_to_kg).toBe(2);
  });
  it('rolls to the next band just over a boundary', () => {
    const r = findRate(PLACEHOLDER_RATES, 'UK_BG', 2.5);
    expect(r?.weight_from_kg).toBe(2);
    expect(r?.weight_to_kg).toBe(5);
  });
});

describe('calculateQuote', () => {
  it('prices a small UK→BG parcel', () => {
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
    expect(q.total).toBe(12);
    expect(q.currency).toBe('GBP');
    expect(q.chargeable_weight_kg).toBe(2);
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
    expect(q.surcharges).toEqual([{ label: 'remote', amount: 6 }]);
    expect(q.total).toBe(18);
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
    // volumetric = 120000/5000 = 24kg → 20–30 band = 65
    expect(q.chargeable_weight_kg).toBe(24);
    expect(q.total).toBe(65);
  });
});
