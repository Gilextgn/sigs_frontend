import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, ArrowRight, Building2, CheckCircle2, Lock } from 'lucide-react';
import { apiClient, SITE_STORAGE_KEY } from '@/shared/lib/apiClient';
import { formatAmount, formatNumber } from '@/shared/lib/format';

interface SiteRow {
  id: number;
  label: string;
  suspended: boolean;
  students: number;
  classes: number;
  teachers: number;
  total_collected: number;
  outstanding: number;
  debtors: number;
  recovery_rate: number;
  theoretical_total: number;
  month: { total: number; payment_count: number; change_percent: number | null };
  today: { total: number; payment_count: number };
  cash: { cashiers_with_pending: number; pending_amount: number; cancellations_today: number; cancelled_amount_today: number };
}

interface GroupOverview {
  sites: SiteRow[];
  totals: { students: number; today: number; today_payments: number; month: number; total_collected: number; outstanding: number; debtors: number; theoretical_total: number; cancellations_today: number; pending_amount: number };
}

function Metric({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div>
      <p className="text-[11px] font-medium tracking-wide text-ink-soft uppercase">{label}</p>
      <p className="font-tabular mt-0.5 text-lg font-semibold text-ink">{value}</p>
      {hint && <p className="text-xs text-ink-soft">{hint}</p>}
    </div>
  );
}

/**
 * Tableau de bord du groupe scolaire : chaque site côte à côte (encaissements,
 * reste à recouvrer, caisses du jour, annulations) et le total du groupe.
 */
export default function SitesOverviewPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['dashboard', 'group'],
    queryFn: async () => (await apiClient.get<GroupOverview>('/dashboard/group')).data,
    refetchInterval: 60_000,
  });

  function openSite(siteId: number) {
    try {
      localStorage.setItem(SITE_STORAGE_KEY, String(siteId));
    } catch {
      return;
    }
    window.location.assign('/');
  }

  const totals = data?.totals;
  const recovery = totals && totals.theoretical_total > 0 ? Math.round(((totals.theoretical_total - totals.outstanding) / totals.theoretical_total) * 1000) / 10 : 0;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-medium tracking-wide text-primary uppercase">Groupe scolaire</p>
        <h1 className="mt-1 font-display text-2xl font-semibold text-ink">Vue des sites</h1>
        <p className="mt-1 text-sm text-ink-soft">Chaque site garde ses élèves, sa caisse et son personnel ; ici, vous les voyez ensemble.</p>
      </div>

      {isError && <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">Impossible de charger la vue des sites.</p>}
      {isLoading && <div className="h-40 animate-pulse rounded-xl bg-paper" />}

      {totals && (
        <section className="rounded-xl border border-primary/30 bg-surface p-5">
          <h2 className="font-display text-base font-semibold text-ink">Total du groupe</h2>
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            <Metric label="Élèves" value={formatNumber(totals.students)} />
            <Metric label="Encaissé aujourd'hui" value={formatAmount(totals.today)} hint={`${totals.today_payments} paiement(s)`} />
            <Metric label="Encaissé ce mois" value={formatAmount(totals.month)} />
            <Metric label="Encaissé au total" value={formatAmount(totals.total_collected)} />
            <Metric label="Reste à recouvrer" value={formatAmount(totals.outstanding)} hint={`${totals.debtors} famille(s) · ${recovery} % recouvré`} />
            <Metric label="Non remis au directeur" value={formatAmount(totals.pending_amount)} hint={`${totals.cancellations_today} annulation(s) aujourd'hui`} />
          </div>
        </section>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {data?.sites.map((site) => {
          return (
            <section key={site.id} className="rounded-xl border border-border bg-surface p-5">
              <div className="flex items-start justify-between gap-3">
                <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-ink">
                  <Building2 className="h-5 w-5 text-primary" /> {site.label}
                </h2>
                <button type="button" onClick={() => openSite(site.id)} className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-ink transition hover:bg-paper">
                  Ouvrir ce site <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
              {site.suspended && <p className="mt-2 rounded-lg bg-danger-soft px-3 py-1.5 text-xs text-danger">Accès suspendu pour ce site.</p>}

              <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
                <Metric label="Élèves" value={formatNumber(site.students)} hint={`${site.classes} classe(s) · ${site.teachers} enseignant(s)`} />
                <Metric label="Aujourd'hui" value={formatAmount(site.today.total)} hint={`${site.today.payment_count} paiement(s)`} />
                <Metric
                  label="Ce mois"
                  value={formatAmount(site.month.total)}
                  hint={site.month.change_percent === null ? undefined : `${site.month.change_percent >= 0 ? '+' : ''}${site.month.change_percent} % vs mois précédent`}
                />
                <Metric label="Encaissé au total" value={formatAmount(site.total_collected)} />
                <Metric label="Reste à recouvrer" value={formatAmount(site.outstanding)} hint={`${site.debtors} famille(s)`} />
                <Metric label="Recouvrement" value={`${site.recovery_rate} %`} />
              </div>

              {/* Traçabilité du jour : caisses non clôturées et annulations. */}
              <div className="mt-4 space-y-1.5 border-t border-border pt-3 text-sm">
                {site.cash.cashiers_with_pending > 0 ? (
                  <p className="flex items-center gap-2 text-gold">
                    <Lock className="h-4 w-4" /> {formatAmount(site.cash.pending_amount)} encaissés pas encore remis ({site.cash.cashiers_with_pending} caissier(s)).
                  </p>
                ) : (
                  <p className="flex items-center gap-2 text-success">
                    <CheckCircle2 className="h-4 w-4" /> Tout l'argent encaissé a été remis.
                  </p>
                )}
                {site.cash.cancellations_today > 0 && (
                  <p className="flex items-center gap-2 text-danger">
                    <AlertTriangle className="h-4 w-4" /> {site.cash.cancellations_today} paiement(s) annulé(s) aujourd'hui ({formatAmount(site.cash.cancelled_amount_today)}).
                  </p>
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
