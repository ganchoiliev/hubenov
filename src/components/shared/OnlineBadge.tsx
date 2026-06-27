import { useTranslation } from 'react-i18next';
import { ShoppingBag } from 'lucide-react';
import { Badge } from '@/components/ui';
import { getParcelOrigin } from '@/lib/parcelOrigin';
import type { Shipment } from '@/types/domain';

/**
 * Distinct pill marking a parcel the customer ordered online (Amazon, eBay…) and
 * had forwarded through our hub. Renders nothing for ordinary parcels, so it is
 * safe to drop into any row/header unconditionally.
 */
export function OnlineBadge({
  shipment,
  showRef = false,
  className,
}: {
  shipment: Pick<Shipment, 'inbound_ref' | 'sender'>;
  showRef?: boolean;
  className?: string;
}) {
  const { t } = useTranslation();
  const origin = getParcelOrigin(shipment);
  if (!origin.isOnline) return null;

  return (
    <Badge tone="accent" className={className}>
      <ShoppingBag className="h-3 w-3 shrink-0" />
      {origin.retailer ?? t('origin.online')}
      {showRef && origin.ref && (
        <span className="ml-0.5 font-mono text-[0.7rem] font-normal opacity-70">{origin.ref}</span>
      )}
    </Badge>
  );
}
