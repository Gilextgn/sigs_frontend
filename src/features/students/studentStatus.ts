import type { BadgeTone } from '@/shared/components/StatusBadge';

export const STUDENT_STATUS_LABELS: Record<string, string> = {
  active: 'Actif',
  transferred: 'Transféré',
  graduated: 'Diplômé',
  archived: 'Archivé',
};

export const STUDENT_STATUS_TONES: Record<string, BadgeTone> = {
  active: 'success',
  transferred: 'gold',
  graduated: 'primary',
  archived: 'danger',
};
