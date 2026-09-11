export type BadgeTone = 'success' | 'danger' | 'gold' | 'primary' | 'neutral';

const TONE_CLASSES: Record<BadgeTone, string> = {
  success: 'bg-success-soft text-success',
  danger: 'bg-danger-soft text-danger',
  gold: 'bg-gold-soft text-gold',
  primary: 'bg-primary-soft text-primary-dark',
  neutral: 'bg-paper text-ink-soft',
};

/**
 * Pastille de statut unique pour toute l'application : chaque page
 * redéfinissait auparavant ses propres classes, ce qui faisait diverger
 * tailles et couleurs au fil des ajouts.
 */
export function StatusBadge({
  label,
  tone = 'neutral',
  className = '',
}: {
  label: string;
  tone?: BadgeTone;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap ${TONE_CLASSES[tone]} ${className}`}
    >
      {label}
    </span>
  );
}
