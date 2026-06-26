/**
 * HybridEcontProvider — live Econt OFFICE NOMENCLATURE (read-only reference data,
 * works on Econt's public demo credentials, NO owner account needed) while keeping
 * pricing, label creation, COD and tracking on the mock/manual path until the
 * owner's Econt BUSINESS client account exists.
 *
 * Rationale (§5, B.L.A.S.T.): getOffices/getCities/getStreets are public reference
 * data any integrator can read. createLabel/requestCourier/getShipmentStatuses bind
 * to a registered Econt CLIENT (sender CD number) and carry COD + liability — those
 * must wait for the owner's account. One flag (VITE_ECONT_OFFICES_LIVE) exposes the
 * offices without prematurely going live on money operations.
 */
import type { QuoteInput } from '@/schemas';
import type { Quote } from '@/types/domain';
import type { CourierLabel, CourierProvider, CourierStatus, EcontOffice } from './CourierProvider';
import { EcontProvider } from './EcontProvider';
import { MockEcontProvider } from './MockEcontProvider';

export class HybridEcontProvider implements CourierProvider {
  readonly name = 'econt' as const;
  private readonly live = new EcontProvider();
  private readonly mock = new MockEcontProvider();

  /** Live Econt nomenclature; falls back to the mock list if the proxy is down/empty. */
  async getOffices(citySearch: string): Promise<EcontOffice[]> {
    try {
      const offices = await this.live.getOffices(citySearch);
      return offices.length > 0 ? offices : this.mock.getOffices(citySearch);
    } catch {
      return this.mock.getOffices(citySearch);
    }
  }

  // Everything transactional stays on the mock/manual path until the owner's Econt
  // business account is live (then flip VITE_ECONT_ENABLED to use the full EcontProvider).
  calculate(input: QuoteInput): Promise<Quote> {
    return this.mock.calculate(input);
  }
  createLabel(shipmentId: string): Promise<CourierLabel> {
    return this.mock.createLabel(shipmentId);
  }
  getShipmentStatuses(carrierRefs: string[]): Promise<CourierStatus[]> {
    return this.mock.getShipmentStatuses(carrierRefs);
  }
  requestCourier(): Promise<{ requested_at: string }> {
    return this.mock.requestCourier();
  }
}
