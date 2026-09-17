import { formatNumber } from '@/shared/lib/format';

/**
 * Statut d'une ligne à payer (tranche ou frais). Un versement partiel est
 * un acompte : la ligne reste due et l'on affiche ce qui a été versé et ce
 * qu'il reste pour la solder.
 */
export function LineStatus({ paid, remaining }: { paid: number; remaining: number }) {
  if (remaining <= 0) {
    return (
      <span className="inline-flex items-center rounded-full bg-success-soft px-2 py-0.5 text-[11px] font-semibold text-success">
        Soldé
      </span>
    );
  }

  if (paid > 0) {
    return (
      <span className="inline-flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px]">
        <span className="rounded-full bg-gold-soft px-2 py-0.5 font-semibold text-gold">Acompte</span>
        <span className="font-tabular text-ink-soft">
          {formatNumber(paid)} versés · reste {formatNumber(remaining)}
        </span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 text-[11px]">
      <span className="rounded-full bg-danger-soft px-2 py-0.5 font-semibold text-danger">À payer</span>
      <span className="font-tabular text-ink-soft">{formatNumber(remaining)}</span>
    </span>
  );
}
