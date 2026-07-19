/**
 * The four physical UK receiving offices. Single source of truth for the
 * operator's "received at" picker, the public Offices section, and anywhere
 * an office slug needs a human label. The ONLINE-parcel ship-to address is
 * ALWAYS the central hub (company.address / OFFICES[0]) — the other offices
 * only receive walk-in parcels.
 */
import type { OfficeSlug } from '@/types/domain';

export interface Office {
  slug: OfficeSlug;
  /** Short display name. */
  name_bg: string;
  name_en: string;
  /** What lives there (helps customers recognise the place). */
  note_bg: string;
  note_en: string;
  address: string;
  city: string;
  postcode: string;
  /** Central hub: the van departs here; online parcels ship here. */
  is_hub: boolean;
}

export const OFFICES: Office[] = [
  {
    slug: 'eccles_central',
    name_bg: 'Централен офис · Манчестър',
    name_en: 'Central office · Manchester',
    note_bg: 'Главен склад — оттук тръгва бусът всеки петък',
    note_en: 'Main depot — the van departs from here every Friday',
    address: '542 Liverpool Road',
    city: 'Eccles, Manchester',
    postcode: 'M30 7JA',
    is_hub: true,
  },
  {
    slug: 'eccles_minimarket',
    name_bg: 'Eccles · Мини маркет',
    name_en: 'Eccles · Mini market',
    note_bg: 'Приемане на пратки в магазина',
    note_en: 'Parcel drop-off inside the shop',
    address: '106–108 Liverpool Road',
    city: 'Eccles, Manchester',
    postcode: 'M30 7JA',
    is_hub: false,
  },
  {
    slug: 'burnley',
    name_bg: 'Бърнли · Пекарна',
    name_en: 'Burnley · Bakery',
    note_bg: 'Приемане на пратки в пекарната',
    note_en: 'Parcel drop-off at the bakery',
    address: '158 Colne Road',
    city: 'Burnley',
    postcode: 'BB10 1DT',
    is_hub: false,
  },
  {
    slug: 'queensferry',
    name_bg: 'Куинсфери · Флинтшър',
    name_en: 'Queensferry · Flintshire',
    note_bg: 'Приемане на пратки',
    note_en: 'Parcel drop-off point',
    address: '50 Station Road',
    city: 'Queensferry, Flintshire',
    postcode: 'CH5 1SX',
    is_hub: false,
  },
];

export function officeBySlug(slug: string | null | undefined): Office | undefined {
  return OFFICES.find((o) => o.slug === slug);
}

/** Short label for lists/detail chips, in the given locale. */
export function officeLabel(slug: string | null | undefined, locale: 'bg' | 'en'): string | null {
  const o = officeBySlug(slug);
  if (!o) return null;
  return locale === 'bg' ? o.name_bg : o.name_en;
}

/** Google Maps directions link for an office (plain URL, no API key). */
export function officeMapsUrl(o: Office): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${o.address}, ${o.city} ${o.postcode}`)}`;
}

/** The Bulgarian drop-off point for BG → UK baggage (Econt office + named recipient). */
export const BG_DROPOFF = {
  office_bg: 'Еконт офис „Гоце Делчев — Панаирски ливади“',
  office_en: 'Econt office “Gotse Delchev — Panairski Livadi”',
  city_bg: 'Гоце Делчев',
  city_en: 'Gotse Delchev',
  recipient: 'Богослав Хубенов',
  recipient_en: 'Bogoslav Hubenov',
  phone: '+359 877 665 144',
  mapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent('Еконт Гоце Делчев Панаирски ливади')}`,
} as const;
