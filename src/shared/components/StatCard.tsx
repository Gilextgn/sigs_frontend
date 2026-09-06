import type { LucideIcon } from 'lucide-react';

type Accent = 'primary' | 'success' | 'danger' | 'gold';

const ACCENT_STYLES: Record<Accent, { bg: string; text: string; bar: string }> = {
  primary: { bg: 'bg-primary-soft', text: 'text-primary-dark', bar: 'bg-primary' },
  success: { bg: 'bg-success-soft', text: 'text-success', bar: 'bg-success' },
  danger: { bg: 'bg-danger-soft', text: 'text-danger', bar: 'bg-danger' },
  gold: { bg: 'bg-gold-soft', text: 'text-gold', bar: 'bg-gold' },
};

interface StatCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  accent?: Accent;
  hint?: string;
}

/**
 * Fiche KPI compacte façon registre : remplace les gros blocs collés de
 * l'ancien dashboard (stats-grid kpi-6). Grille auto-fit => plus de blocs
 * gigantesques, chaque fiche garde sa taille naturelle avec de l'air autour.
 */
export function StatCard({ label, value, icon: Icon, accent = 'primary', hint }: StatCardProps) {
  const styles = ACCENT_STYLES[accent];

  return (
    <article className="relative overflow-hidden rounded-xl border border-border bg-surface p-4">
      <span className={`absolute top-0 left-0 h-1 w-10 rounded-br-lg ${styles.bar}`} />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-xs font-medium tracking-wide text-ink-soft uppercase">
            {label}
          </p>
          <p className="font-tabular mt-1.5 text-2xl font-semibold text-ink">{value}</p>
          {hint && <p className="mt-1 truncate text-xs text-ink-soft">{hint}</p>}
        </div>
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${styles.bg} ${styles.text}`}>
          <Icon className="h-[18px] w-[18px]" />
        </span>
      </div>
    </article>
  );
}
