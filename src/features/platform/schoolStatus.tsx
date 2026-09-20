import { AlertTriangle, CheckCircle2, PauseCircle } from 'lucide-react';
import { daysFromToday, formatDate } from '@/shared/lib/format';
import type { PlatformSchool } from './usePlatform';

/** Pastille de statut d'une école, avec le détail utile en dessous (motif, jours de retard). */
export function StatusPill({ school }: { school: PlatformSchool }) {
  if (school.status === 'suspended') {
    return (
      <div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-danger-soft px-2.5 py-1 text-xs font-semibold text-danger">
          <PauseCircle className="h-3.5 w-3.5" />
          Suspendu
        </span>
        <p className="mt-1 max-w-[220px] truncate text-[11px] text-ink-soft" title={school.suspension_reason ?? undefined}>
          {school.suspension_kind === 'payment' ? 'Automatique · impayé' : (school.suspension_reason ?? 'Suspension manuelle')}
        </p>
      </div>
    );
  }

  if (school.status === 'overdue') {
    const late = school.subscription_due_at ? -daysFromToday(school.subscription_due_at) : 0;
    return (
      <div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-gold-soft px-2.5 py-1 text-xs font-semibold text-gold">
          <AlertTriangle className="h-3.5 w-3.5" />
          En retard · {late} j
        </span>
        <p className="mt-1 text-[11px] text-ink-soft">
          {school.blocked_from ? `Suspension le ${formatDate(school.blocked_from)}` : 'Pas de suspension automatique'}
        </p>
      </div>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-success-soft px-2.5 py-1 text-xs font-semibold text-success">
      <CheckCircle2 className="h-3.5 w-3.5" />
      Actif
    </span>
  );
}

/** « dans 12 j », « dépassée de 3 j » — l'échéance, en clair. */
export function dueLabel(dueAt: string | null): { text: string; tone: 'ok' | 'soon' | 'late' | 'none' } {
  if (!dueAt) return { text: 'Aucune échéance', tone: 'none' };
  const days = daysFromToday(dueAt);
  if (days < 0) return { text: `dépassée de ${-days} j`, tone: 'late' };
  if (days === 0) return { text: "aujourd'hui", tone: 'soon' };
  return { text: `dans ${days} j`, tone: days <= 7 ? 'soon' : 'ok' };
}

/** Date ISO locale (AAAA-MM-JJ) dans n mois : raccourcis d'échéance. */
export function isoInMonths(months: number): string {
  const date = new Date();
  date.setMonth(date.getMonth() + months);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export const EVENT_LABELS: Record<string, string> = {
  created: 'Établissement créé',
  suspended: 'Suspendu',
  reactivated: 'Réactivé',
  due_date_changed: 'Échéance modifiée',
  password_reset: 'Mot de passe administrateur réinitialisé',
};
