import { useTranslation } from 'react-i18next';
import { Badge } from './index';
import { isSideStatus } from '@/lib/status';
import type { AnyStatus } from '@/types/domain';

const TONE_FOR: Partial<Record<AnyStatus, 'neutral' | 'brand' | 'success' | 'warning' | 'danger' | 'info'>> = {
  delivered: 'success',
  out_for_delivery: 'info',
  handed_to_econt: 'info',
  exception: 'danger',
  returned: 'danger',
  cancelled: 'danger',
  draft: 'neutral',
};

export function StatusBadge({ status }: { status: AnyStatus }) {
  const { t } = useTranslation();
  const tone = TONE_FOR[status] ?? (isSideStatus(status) ? 'warning' : 'brand');
  return <Badge tone={tone}>{t(`status.${status}`)}</Badge>;
}
