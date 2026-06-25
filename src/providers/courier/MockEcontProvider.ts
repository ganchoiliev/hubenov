/**
 * MockEcontProvider — realistic data so the whole flow works in Wave 1 with no
 * credentials (§2). Same interface as the real EcontProvider, so swapping is a
 * one-line change in providers/courier/index.ts.
 */
import { calculateQuote } from '@/lib/pricing';
import { PLACEHOLDER_RATES } from '@/lib/rates';
import { sleep } from '@/lib/utils';
import { transliterate } from '@/lib/translit';
import type { QuoteInput } from '@/schemas';
import type { Quote } from '@/types/domain';
import type {
  CourierLabel,
  CourierProvider,
  CourierStatus,
  EcontOffice,
} from './CourierProvider';

// Mock list (Wave 1) — broad enough that city search works while testing.
// Wave 2 replaces this entirely with Econt's live nomenclature via
// econt-proxy.getOffices(), which returns every office in the country.
const MOCK_OFFICES: EcontOffice[] = [
  { code: '1010', name: 'Офис Витоша', city: 'София', address: 'бул. Витоша 1' },
  { code: '1020', name: 'Офис Младост', city: 'София', address: 'ж.к. Младост 4' },
  { code: '4000', name: 'Офис Център', city: 'Пловдив', address: 'ул. Райко Даскалов 3' },
  { code: '9000', name: 'Офис Морска', city: 'Варна', address: 'бул. Сливница 12' },
  { code: '8000', name: 'Офис Бургас', city: 'Бургас', address: 'ул. Александровска 21' },
  { code: '5000', name: 'Офис Център', city: 'Велико Търново', address: 'ул. Васил Левски 2' },
  { code: '7500', name: 'Офис Силистра', city: 'Силистра', address: 'ул. Симеон Велики 8' },
  { code: '7000', name: 'Офис Русе', city: 'Русе', address: 'ул. Александровска 30' },
  { code: '6000', name: 'Офис Стара Загора', city: 'Стара Загора', address: 'ул. Цар Симеон 100' },
  { code: '5800', name: 'Офис Плевен', city: 'Плевен', address: 'ул. Дойран 5' },
  { code: '2700', name: 'Офис Благоевград', city: 'Благоевград', address: 'ул. Тодор Александров 23' },
  { code: '9300', name: 'Офис Добрич', city: 'Добрич', address: 'ул. България 3' },
  { code: '8800', name: 'Офис Сливен', city: 'Сливен', address: 'ул. Хаджи Димитър 12' },
  { code: '9700', name: 'Офис Шумен', city: 'Шумен', address: 'бул. Славянски 17' },
  { code: '6300', name: 'Офис Хасково', city: 'Хасково', address: 'ул. Отец Паисий 4' },
  { code: '2300', name: 'Офис Перник', city: 'Перник', address: 'ул. Кракра 2' },
  { code: '3700', name: 'Офис Видин', city: 'Видин', address: 'ул. Цар Симеон Велики 1' },
  { code: '5300', name: 'Офис Габрово', city: 'Габрово', address: 'ул. Радецка 10' },
  { code: '4400', name: 'Офис Пазарджик', city: 'Пазарджик', address: 'ул. Есперанто 6' },
  { code: '6100', name: 'Офис Казанлък', city: 'Казанлък', address: 'ул. Розова долина 9' },
];

const STATUS_FLOW = [
  { status: 'handed_to_econt', bg: 'Приета в Еконт', en: 'Received by Econt' },
  { status: 'out_for_delivery', bg: 'Предадена за доставка', en: 'Out for delivery' },
  { status: 'delivered', bg: 'Доставена успешно', en: 'Delivered' },
];

export class MockEcontProvider implements CourierProvider {
  readonly name = 'econt' as const;

  async calculate(input: QuoteInput): Promise<Quote> {
    await sleep(180);
    return calculateQuote(
      {
        direction: input.direction,
        weight_kg: input.weight_kg,
        length_cm: input.length_cm,
        width_cm: input.width_cm,
        height_cm: input.height_cm,
        is_gift: input.is_gift,
        remote_area: input.remote_area,
        currency: input.currency,
      },
      PLACEHOLDER_RATES,
    );
  }

  async createLabel(shipmentId: string): Promise<CourierLabel> {
    await sleep(220);
    const ref = `ECT${shipmentId.replace(/-/g, '').slice(0, 10).toUpperCase()}`;
    return {
      carrier_ref: ref,
      label_url: `mock://econt/label/${ref}.pdf`,
      tracking_url: `https://www.econt.com/services/track-shipment/${ref}`,
    };
  }

  async getShipmentStatuses(carrierRefs: string[]): Promise<CourierStatus[]> {
    await sleep(150);
    // Deterministically pick a stage from the ref so demos are stable.
    return carrierRefs.map((ref) => {
      const idx = hash(ref) % STATUS_FLOW.length;
      const s = STATUS_FLOW[idx]!;
      return {
        carrier_ref: ref,
        status: s.status,
        location: 'София',
        occurred_at: new Date().toISOString(),
        note_bg: s.bg,
        note_en: s.en,
      };
    });
  }

  async getOffices(citySearch: string): Promise<EcontOffice[]> {
    await sleep(120);
    const q = citySearch.trim().toLowerCase();
    if (!q) return MOCK_OFFICES;
    // Match on city/name/code in Cyrillic AND Latin (transliterated), so both
    // "Силистра", "Silistra" and the office code "7500" find the office.
    return MOCK_OFFICES.filter((o) => {
      const haystacks = [
        o.city.toLowerCase(),
        o.name.toLowerCase(),
        o.code.toLowerCase(),
        transliterate(o.city).toLowerCase(),
        transliterate(o.name).toLowerCase(),
      ];
      return haystacks.some((h) => h.includes(q));
    });
  }

  async requestCourier(): Promise<{ requested_at: string }> {
    await sleep(120);
    return { requested_at: new Date().toISOString() };
  }
}

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}
