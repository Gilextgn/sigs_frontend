import { useNavigate } from 'react-router-dom';
import {
  GraduationCap,
  School,
  Wallet,
  UserX,
  ReceiptText,
  Users2,
  UserPlus,
  CircleDollarSign,
  TrendingUp,
  ArrowRight,
} from 'lucide-react';
import { StatCard } from '@/shared/components/StatCard';
import {
  useDashboardSummary,
  useRecentPayments,
  useTopDebtors,
} from './useDashboardData';

const currency = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });

function formatAmount(value: number) {
  return `${currency.format(value)} XOF`;
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

/**
 * Dashboard volontairement épuré : uniquement des chiffres-clés et des
 * listes d'activité — pas de graphiques ni de widgets superflus, pour
 * rester lisible d'un seul coup d'œil sur un poste de caisse.
 */
export default function DashboardPage() {
  const navigate = useNavigate();
  const { data: summary, isLoading: summaryLoading } = useDashboardSummary();
  const { data: recentPayments } = useRecentPayments();
  const { data: topDebtors } = useTopDebtors();

  const recoveryRate = summary?.recovery_rate ?? 0;

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="flex flex-col justify-between gap-4 rounded-2xl border border-border bg-surface p-6 sm:flex-row sm:items-center">
        <div>
          <p className="text-xs font-medium tracking-wide text-primary uppercase">Vue d'ensemble</p>
          <h2 className="mt-1 font-display text-2xl font-semibold text-ink">
            Bienvenue sur SIGS Admin
          </h2>
          <p className="mt-1 text-sm text-ink-soft">
            Effectifs, encaissements et débiteurs en un coup d'œil.
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            onClick={() => navigate('/students', { state: { openCreate: true } })}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white transition hover:bg-primary-dark"
          >
            <UserPlus className="h-4 w-4" />
            Nouvel élève
          </button>
          <button
            onClick={() => navigate('/payments', { state: { openCreate: true } })}
            className="flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-ink transition hover:bg-paper"
          >
            <CircleDollarSign className="h-4 w-4" />
            Nouveau paiement
          </button>
        </div>
      </div>

      {/* KPI - grille compacte, auto-fit */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard
          label="Élèves"
          value={summaryLoading ? '—' : String(summary?.students ?? 0)}
          icon={GraduationCap}
          accent="primary"
        />
        <StatCard
          label="Classes"
          value={summaryLoading ? '—' : String(summary?.classes ?? 0)}
          icon={School}
          accent="primary"
        />
        <StatCard
          label="Encaissé"
          value={summaryLoading ? '—' : formatAmount(summary?.total_collected ?? 0)}
          icon={Wallet}
          accent="success"
        />
        <StatCard
          label="Débiteurs"
          value={summaryLoading ? '—' : String(summary?.debtors ?? 0)}
          icon={UserX}
          accent="danger"
        />
        <StatCard
          label="Reste dû"
          value={summaryLoading ? '—' : formatAmount(summary?.outstanding ?? 0)}
          icon={ReceiptText}
          accent="gold"
        />
        <StatCard
          label="Enseignants"
          value={summaryLoading ? '—' : String(summary?.teachers ?? 0)}
          icon={Users2}
          accent="primary"
        />
      </div>

      {/* Taux de recouvrement — barre simple, pas de graphique */}
      <article className="rounded-xl border border-border bg-surface p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-success-soft text-success">
              <TrendingUp className="h-4 w-4" />
            </span>
            <div>
              <h3 className="font-display text-base font-semibold text-ink">Taux de recouvrement</h3>
              <p className="text-xs text-ink-soft">Part déjà réglée du montant théorique global</p>
            </div>
          </div>
          <span className="font-tabular text-2xl font-bold text-success">{recoveryRate}%</span>
        </div>
        <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-danger-soft">
          <div className="h-full rounded-full bg-success transition-all" style={{ width: `${Math.min(recoveryRate, 100)}%` }} />
        </div>
        <div className="mt-2 flex justify-between text-xs text-ink-soft">
          <span>Encaissé : <strong className="font-tabular text-success">{formatAmount(summary?.total_collected ?? 0)}</strong></span>
          <span>Reste dû : <strong className="font-tabular text-danger">{formatAmount(summary?.outstanding ?? 0)}</strong></span>
        </div>
      </article>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Derniers paiements */}
        <article className="rounded-xl border border-border bg-surface p-5">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-base font-semibold text-ink">Derniers paiements</h3>
            <button
              onClick={() => navigate('/payments')}
              className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              Tout voir <ArrowRight className="h-3 w-3" />
            </button>
          </div>
          <div className="mt-2 divide-y divide-border">
            {(recentPayments ?? []).length === 0 && (
              <p className="py-6 text-center text-sm text-ink-soft">Aucun paiement pour le moment.</p>
            )}
            {(recentPayments ?? []).map((payment) => (
              <div key={payment.id} className="flex items-center justify-between py-2.5 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium text-ink">
                    {payment.student ? `${payment.student.first_name} ${payment.student.last_name}` : '—'}
                  </p>
                  <p className="font-tabular text-xs text-ink-soft">
                    {payment.reference_code} · {formatDateTime(payment.payment_date)}
                  </p>
                </div>
                <span className="font-tabular shrink-0 font-medium text-success">
                  +{formatAmount(Number(payment.total_paid_amount))}
                </span>
              </div>
            ))}
          </div>
        </article>

        {/* Top débiteurs */}
        <article className="rounded-xl border border-border bg-surface p-5">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-base font-semibold text-ink">Élèves les plus débiteurs</h3>
            <button
              onClick={() => navigate('/debtors')}
              className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              Tout voir <ArrowRight className="h-3 w-3" />
            </button>
          </div>
          <div className="mt-2 divide-y divide-border">
            {(topDebtors ?? []).length === 0 && (
              <p className="py-6 text-center text-sm text-ink-soft">Aucun débiteur pour le moment.</p>
            )}
            {(topDebtors ?? []).slice(0, 5).map((debtor) => (
              <div key={debtor.student_id} className="flex items-center justify-between py-2.5 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium text-ink">{debtor.full_name}</p>
                  <p className="text-xs text-ink-soft">{debtor.class ?? '—'}</p>
                </div>
                <span className="font-tabular shrink-0 font-medium text-danger">
                  {formatAmount(debtor.outstanding_amount)}
                </span>
              </div>
            ))}
          </div>
        </article>
      </div>
    </div>
  );
}
