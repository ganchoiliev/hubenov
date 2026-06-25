/**
 * EcontProvider — real Econt last-mile via the `econt-proxy` Edge Function
 * (credentials stay server-side, B.L.A.S.T.). Enabled by VITE_ECONT_ENABLED.
 *
 * - calculate(): customer price uses OUR tariff (pricing_rates), not Econt's cost.
 * - getOffices(): real Econt office nomenclature (cached, searchable BG/Latin).
 * - getShipmentStatuses(): real tracking (Econt is pull-based → track-poll).
 * - createLabel(): builds the BG-domestic label; needs the company registered as
 *   an Econt client (sender profile) for production — finalize with owner's account.
 */
import { calculateQuote } from '@/lib/pricing';
import { supabase } from '@/lib/supabase';
import { transliterate } from '@/lib/translit';
import type { PricingRate, Quote } from '@/types/domain';
import type { QuoteInput } from '@/schemas';
import type { CourierLabel, CourierProvider, CourierStatus, EcontOffice } from './CourierProvider';

interface ProxyResponse<T> {
  ok: boolean;
  status: number;
  data: T;
}

async function callProxy<T>(method: string, payload: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await supabase.functions.invoke<ProxyResponse<T>>('econt-proxy', {
    body: { method, payload },
  });
  if (error) throw error;
  if (!data?.ok) throw new Error(`econt_${method}_failed`);
  return data.data;
}

interface RawOffice {
  code?: string;
  name?: string;
  nameEn?: string;
  address?: { city?: { name?: string; nameEn?: string }; fullAddress?: string; fullAddressEn?: string };
}
interface RawTrackingEvent {
  destinationDetails?: string;
  destinationDetailsEn?: string;
  cityName?: string;
  officeName?: string;
  officeNameEn?: string;
  time?: string;
}
interface RawStatus {
  shipmentNumber?: string;
  deliveryTime?: string;
  trackingEvents?: RawTrackingEvent[];
}
interface ReceiverSnap {
  name: string;
  phone: string;
  line1: string;
  city: string;
  postcode: string;
  econt_office_code?: string | null;
}

function mapOffice(o: RawOffice): EcontOffice {
  return {
    code: o.code ?? '',
    name: o.name ?? o.nameEn ?? '',
    city: o.address?.city?.name ?? o.address?.city?.nameEn ?? '',
    address: o.address?.fullAddress ?? o.address?.fullAddressEn ?? '',
  };
}

export class EcontProvider implements CourierProvider {
  readonly name = 'econt' as const;
  private officesCache: EcontOffice[] | null = null;

  async calculate(input: QuoteInput): Promise<Quote> {
    const { data } = await supabase.from('pricing_rates').select('*');
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
      (data ?? []) as PricingRate[],
    );
  }

  private async loadOffices(): Promise<EcontOffice[]> {
    if (this.officesCache) return this.officesCache;
    const res = await callProxy<{ offices?: RawOffice[] }>('getOffices', { countryCode: 'BGR' });
    this.officesCache = (res.offices ?? []).map(mapOffice).filter((o) => o.code);
    return this.officesCache;
  }

  async getOffices(citySearch: string): Promise<EcontOffice[]> {
    const all = await this.loadOffices();
    const q = citySearch.trim().toLowerCase();
    if (!q) return all.slice(0, 60);
    return all
      .filter((o) =>
        [o.city, o.name, o.code, transliterate(o.city), transliterate(o.name)].some((h) =>
          h.toLowerCase().includes(q),
        ),
      )
      .slice(0, 60);
  }

  async getShipmentStatuses(carrierRefs: string[]): Promise<CourierStatus[]> {
    if (carrierRefs.length === 0) return [];
    const res = await callProxy<{ shipmentStatuses?: { status?: RawStatus }[] }>('getShipmentStatuses', {
      shipmentNumbers: carrierRefs,
    });
    const out: CourierStatus[] = [];
    for (const row of res.shipmentStatuses ?? []) {
      const st = row.status;
      if (!st?.shipmentNumber) continue;
      const last = st.trackingEvents?.[st.trackingEvents.length - 1];
      out.push({
        carrier_ref: st.shipmentNumber,
        status: st.deliveryTime ? 'delivered' : 'out_for_delivery',
        location: last?.cityName ?? last?.officeName ?? null,
        occurred_at: last?.time ?? new Date().toISOString(),
        note_bg: last?.destinationDetails ?? last?.officeName ?? '',
        note_en: last?.destinationDetailsEn ?? last?.officeNameEn ?? '',
      });
    }
    return out;
  }

  async createLabel(shipmentId: string): Promise<CourierLabel> {
    const { data: shipment } = await supabase.from('shipments').select('*').eq('id', shipmentId).maybeSingle();
    if (!shipment) throw new Error('shipment_not_found');
    const s = shipment as unknown as {
      receiver: ReceiverSnap;
      weight_kg: number;
      declared_value: number;
      currency: string;
      public_code: string;
    };
    const r = s.receiver;
    const label: Record<string, unknown> = {
      senderClient: { name: 'Доставки Хубенов' }, // TODO(prod): owner's Econt client profile
      receiverClient: { name: r.name, phones: [r.phone] },
      ...(r.econt_office_code
        ? { receiverOfficeCode: r.econt_office_code }
        : {
            receiverAddress: {
              city: { country: { code3: 'BGR' }, name: r.city, postCode: r.postcode },
              street: r.line1,
              num: '1',
            },
          }),
      packCount: 1,
      shipmentType: 'parcel',
      weight: s.weight_kg,
      shipmentDescription: `Hubenov ${s.public_code}`,
      services: { declaredValueAmount: s.declared_value, declaredValueCurrency: s.currency },
    };
    const res = await callProxy<{ label?: { shipmentNumber?: string; pdfURL?: string } }>('createLabel', {
      label,
      mode: 'create',
    });
    const ref = res.label?.shipmentNumber ?? '';
    return {
      carrier_ref: ref,
      label_url: res.label?.pdfURL ?? '',
      tracking_url: ref ? `https://www.econt.com/services/track-shipment/${ref}` : '',
    };
  }

  async requestCourier(): Promise<{ requested_at: string }> {
    await callProxy('requestCourier', { shipmentType: 'parcel', shipmentPackCount: 1 });
    return { requested_at: new Date().toISOString() };
  }
}
