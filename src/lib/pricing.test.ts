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

describe('calculateQuote (£2/kg linear, £20 minimum)', () => {
  it('floors a small UK→BG parcel at the £20 minimum (up to 10 kg)', () => {
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
    // volumetric 1.6 > actual 1.5 → chargeable 2.0kg → 2 × £2 = £4 → floored to £20
    expect(q.chargeable_weight_kg).toBe(2);
    expect(q.total).toBe(20);
    expect(q.currency).toBe('GBP');
  });

  it('prices exactly £20 at the 10 kg threshold', () => {
    const q = calculateQuote(
      {
        direction: 'UK_BG',
        weight_kg: 10,
        length_cm: 10,
        width_cm: 10,
        height_cm: 10,
        is_gift: false,
        remote_area: false,
      },
      PLACEHOLDER_RATES,
    );
    // 10kg × £2 = £20 — the floor and the linear price meet here
    expect(q.total).toBe(20);
  });

  it('goes linear above 10 kg', () => {
    const q = calculateQuote(
      {
        direction: 'UK_BG',
        weight_kg: 15,
        length_cm: 10,
        width_cm: 10,
        height_cm: 10,
        is_gift: false,
        remote_area: false,
      },
      PLACEHOLDER_RATES,
    );
    // 15kg × £2 = £30 > £20 floor
    expect(q.total).toBe(30);
  });

  it('adds a remote-area surcharge on top of the floored base', () => {
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
    // base floored to £20, + £6 remote = £26
    expect(q.surcharges).toEqual([{ label: 'remote', amount: 6 }]);
    expect(q.total).toBe(26);
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
    // volumetric = 120000/5000 = 24kg → 24 × £2 = £48 (above the floor)
    expect(q.chargeable_weight_kg).toBe(24);
    expect(q.total).toBe(48);
  });
});
