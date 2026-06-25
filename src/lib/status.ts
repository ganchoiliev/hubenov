/**
 * Shipment status state machine (§6). Single source of truth for valid
 * transitions, which leg drives them, and bilingual labels. The customer sees
 * one timeline; legs (own / econt) sit underneath.
 */
import {
  SHIPMENT_STATUSES,
  type AnyStatus,
  type ShipmentStatus,
  type TrackingLeg,
} from '@/types/domain';

export interface StatusMeta {
  status: AnyStatus;
  leg: TrackingLeg;
  /** Where the transition originates. */
  trigger: 'operator' | 'load' | 'econt' | 'system';
  label_bg: string;
  label_en: string;
}

export const STATUS_META: Record<AnyStatus, StatusMeta> = {
  draft: { status: 'draft', leg: 'own', trigger: 'system', label_bg: 'Чернова', label_en: 'Draft' },
  booked: { status: 'booked', leg: 'own', trigger: 'operator', label_bg: 'Заявена', label_en: 'Booked' },
  collected_uk: { status: 'collected_uk', leg: 'own', trigger: 'operator', label_bg: 'Приета в UK', label_en: 'Collected (UK)' },
  at_uk_hub: { status: 'at_uk_hub', leg: 'own', trigger: 'operator', label_bg: 'В склад Манчестър', label_en: 'At UK hub' },
  on_load: { status: 'on_load', leg: 'own', trigger: 'load', label_bg: 'Натоварена', label_en: 'On load' },
  departed_uk: { status: 'departed_uk', leg: 'own', trigger: 'load', label_bg: 'Тръгна от UK', label_en: 'Departed UK' },
  arrived_bg_hub: { status: 'arrived_bg_hub', leg: 'own', trigger: 'load', label_bg: 'Пристигна в България', label_en: 'Arrived in BG' },
  handed_to_econt: { status: 'handed_to_econt', leg: 'econt', trigger: 'econt', label_bg: 'Предадена на Еконт', label_en: 'Handed to Econt' },
  out_for_delivery: { status: 'out_for_delivery', leg: 'econt', trigger: 'econt', label_bg: 'За доставка', label_en: 'Out for delivery' },
  delivered: { status: 'delivered', leg: 'econt', trigger: 'econt', label_bg: 'Доставена', label_en: 'Delivered' },
  exception: { status: 'exception', leg: 'own', trigger: 'operator', label_bg: 'Проблем', label_en: 'Exception' },
  returned: { status: 'returned', leg: 'own', trigger: 'operator', label_bg: 'Върната', label_en: 'Returned' },
  cancelled: { status: 'cancelled', leg: 'own', trigger: 'system', label_bg: 'Отказана', label_en: 'Cancelled' },
};

/** Allowed forward transitions along the happy path + side exits. */
const TRANSITIONS: Record<AnyStatus, AnyStatus[]> = {
  draft: ['booked', 'cancelled'],
  booked: ['collected_uk', 'cancelled', 'exception'],
  collected_uk: ['at_uk_hub', 'exception'],
  at_uk_hub: ['on_load', 'exception'],
  on_load: ['departed_uk', 'at_uk_hub', 'exception'],
  departed_uk: ['arrived_bg_hub', 'exception'],
  arrived_bg_hub: ['handed_to_econt', 'exception'],
  handed_to_econt: ['out_for_delivery', 'exception', 'returned'],
  out_for_delivery: ['delivered', 'exception', 'returned'],
  delivered: [],
  exception: ['at_uk_hub', 'arrived_bg_hub', 'returned', 'cancelled'],
  returned: [],
  cancelled: [],
};

export function canTransition(from: AnyStatus, to: AnyStatus): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}

export function nextStatuses(from: AnyStatus): AnyStatus[] {
  return TRANSITIONS[from] ?? [];
}

/** 0-based index along the main timeline, or -1 for side states. */
export function timelineIndex(status: AnyStatus): number {
  return (SHIPMENT_STATUSES as readonly string[]).indexOf(status);
}

export function isSideStatus(status: AnyStatus): boolean {
  return timelineIndex(status) === -1;
}

export function isTerminal(status: AnyStatus): boolean {
  return TRANSITIONS[status]?.length === 0;
}

/** The full ordered main timeline, for rendering the progress tracker. */
export const MAIN_TIMELINE: ShipmentStatus[] = [...SHIPMENT_STATUSES];

export function statusLabel(status: AnyStatus, locale: 'bg' | 'en'): string {
  const meta = STATUS_META[status];
  return locale === 'bg' ? meta.label_bg : meta.label_en;
}
