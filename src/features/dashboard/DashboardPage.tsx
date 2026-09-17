import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDownRight, ArrowRight, ArrowUpRight, FileText, HandCoins, Printer, UserPlus } from 'lucide-react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useAuth } from '@/features/auth/AuthContext';
import { usePaymentDesk } from '@/features/payments/PaymentDesk';
import { useReEnrollmentProgress } from '@/features/students/useStudents';
import { formatAmount, formatNumber, formatTime } from '@/shared/lib/format';
import { useDashboardStatistics, useDashboardSummary, useRecentPayments, useTopDebtors } from './useDashboardData';

const PERIODS = [
  { days: 30, label: '30 j' },
  { days: 90, label: '90 j' },
  { days: 365, label: 'Année' },
] as const;

const MONTH = new Intl.DateTimeFormat('fr-FR', { month: 'long' });

function Card({ children, className = 'p-5' }: { children: React.ReactNode; className?: string }) {
  return <article className={`rounded-2xl border border-border bg-surface ${className}`}>{children}</article>;
}

function CardTitle({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h3 className="text-[13px] font-semibold tracking-wide text-ink-soft uppercase">{children}</h3>
      {action}
    </div>
  );
}

/** Anneau de progression (taux de recouvrement). */
function Ring({ value }: { value: number }) {
  const radius = 30;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(value, 100));
  return (
    <svg width="76" height="76" viewBox="0 0 76 76" role="img" aria-label={`${clamped} % recouvré`}>
      <circle cx="38" cy="38" r={radius} fill="none" stroke="var(--color-track)" strokeWidth="7" />
      <circle
        cx="38"
        cy="38"
        r={radius}
        fill="none"
        stroke="var(--color-primary)"
        strokeWidth="7"
        strokeLinecap="round"
        strokeDasharray={`${(clamped / 100) * circumference} ${circumference}`}
        transform="rotate(-90 38 38)"
      />
      <text x="38" y="43" textAnchor="middle" fontSize="15" fontWeight="700" fill="var(--color-ink)">
        {Math.round(clamped)}%
      </text>
    </svg>
  );
}

function YearBanner() {
  const { data: progress } = useReEnrollmentProgress();
  if (!progress?.active_year) return null;

  const totals = progress.totals;
  const blockedAmount = progress.students.filter((s) => s.state === 'blocked').reduce((sum, s) => sum + s.blocking_outstanding, 0);
  const ratio = totals && totals.expected > 0 ? totals.re_enrolled / totals.expected : 0;

  return (
    <Card className="overflow-hidden">
      <div className="grid gap-px bg-border sm:grid-cols-2 xl:grid-cols-4">
        <div className="bg-surface p-5">
          <p className="text-xs font-medium text-ink-soft">Année en cours</p>
          <p className="font-tabular mt-1 text-2xl font-bold text-ink">{progress.active_year.code}</p>
          <p className="mt-1 flex items-center gap-1.5 text-xs text-ink-soft">
            <span className={`h-1.5 w-1.5 rounded-full ${progress.active_year.closed_at ? 'bg-ink-muted' : 'bg-primary'}`} />
            {progress.active_year.closed_at ? 'clôturée' : 'ouverte'}
            {totals && totals.expected > 0 && ` · ${totals.expected} élèves attendus`}
          </p>
        </div>
        {totals && totals.expected > 0 ? (
          <>
            <Link to="/rentree" className="group bg-surface p-5 no-underline transition hover:bg-surface-alt">
              <p className="text-xs font-medium text-ink-soft">Réinscrits</p>
              <p className="font-tabular mt-1 text-2xl font-bold text-ink">
                {totals.re_enrolled} <span className="text-base font-medium text-ink-muted">/ {totals.expected}</span>
              </p>
              <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-track">
                <div className="h-full rounded-full bg-primary" style={{ width: `${ratio * 100}%` }} />
              </div>
            </Link>
            <Link to="/rentree?state=blocked" className="bg-surface p-5 no-underline transition hover:bg-surface-alt">
              <p className="text-xs font-medium text-ink-soft">Bloqués pour impayés</p>
              <p className="font-tabular mt-1 text-2xl font-bold text-danger">{totals.blocked}</p>
              <p className="mt-1 text-xs text-ink-soft">{totals.blocked > 0 ? `${formatAmount(blockedAmount)} à régler` : 'Aucun blocage'}</p>
            </Link>
            <Link to="/rentree?state=pending" className="bg-surface p-5 no-underline transition hover:bg-surface-alt">
              <p className="text-xs font-medium text-ink-soft">Sans nouvelles</p>
              <p className="font-tabular mt-1 text-2xl font-bold text-gold">{totals.pending}</p>
              <p className="mt-1 text-xs text-ink-soft">{totals.pending > 0 ? 'à relancer' : 'Tout le monde a répondu'}</p>
            </Link>
          </>
        ) : (
          <div className="bg-surface p-5 sm:col-span-1 xl:col-span-3">
            <p className="text-sm text-ink-soft">
              {progress.previous_year
                ? `Aucun élève inscrit en ${progress.previous_year.code} : rien à réinscrire.`
                : "Pas d'année précédente enregistrée : les réinscriptions apparaîtront ici à la prochaine rentrée."}
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}

function MoneyCard() {
  const [days, setDays] = useState<number>(30);
  const { data: summary } = useDashboardSummary();
  const { data: stats, isLoading } = useDashboardStatistics(days);

  const month = summary?.month;
  const change = month?.change_percent ?? null;
  const monthName = month ? MONTH.format(new Date(month.start)) : '';

  return (
    <Card>
      <CardTitle
        action={
          <div className="flex rounded-lg border border-border p-0.5" role="tablist" aria-label="Période de la courbe">
            {PERIODS.map((period) => (
              <button
                key={period.days}
                type="button"
                role="tab"
                aria-selected={days === period.days}
                onClick={() => setDays(period.days)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
                  days === period.days ? 'bg-sidebar text-white' : 'text-ink-soft hover:text-ink'
                }`}
              >
                {period.label}
              </button>
            ))}
          </div>
        }
      >
        Encaissé · {monthName}
      </CardTitle>

      <div className="mt-3 flex flex-wrap items-end gap-x-3 gap-y-1">
        <p className="font-tabular text-4xl font-bold tracking-tight text-ink">
          {month ? formatNumber(month.total) : '—'}
          <span className="ml-1.5 text-base font-medium text-ink-muted">XOF</span>
        </p>
        {change !== null && (
          <span
            className={`mb-1.5 inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-semibold ${
              change >= 0 ? 'bg-success-soft text-success' : 'bg-danger-soft text-danger'
            }`}
          >
            {change >= 0 ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
            {Math.abs(change)} %
          </span>
        )}
      </div>
      {month && (
        <p className="mt-1 text-xs text-ink-soft">
          {month.payment_count} paiement{month.payment_count > 1 ? 's' : ''} ce mois · même période le mois dernier :{' '}
          {formatAmount(month.previous_total)}
        </p>
      )}

      <div className="mt-4 h-52">
        {isLoading ? (
          <div className="h-full animate-pulse rounded-xl bg-paper" />
        ) : (
          <ResponsiveContainer width="100%" height={208} minWidth={0}>
            <AreaChart data={stats?.daily ?? []} margin={{ top: 6, right: 4, left: -8, bottom: 0 }}>
              <defs>
                <linearGradient id="home-collected" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.28} />
                  <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="var(--color-border)" />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11, fill: 'var(--color-ink-muted)' }}
                tickFormatter={(value: string) => new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short' }).format(new Date(value))}
                minTickGap={24}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={44}
                tick={{ fontSize: 11, fill: 'var(--color-ink-muted)' }}
                tickFormatter={(value: number) => (value >= 1_000_000 ? `${(value / 1_000_000).toFixed(1)}M` : `${Math.round(value / 1000)}k`)}
              />
              <Tooltip
                cursor={{ stroke: 'var(--color-border)' }}
                contentStyle={{
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 10,
                  fontSize: 12,
                  color: 'var(--color-ink)',
                }}
                labelFormatter={(value) => new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' }).format(new Date(String(value)))}
                formatter={(value) => [formatAmount(Number(value)), 'Encaissé']}
              />
              <Area type="monotone" dataKey="amount" stroke="var(--color-primary)" strokeWidth={2} fill="url(#home-collected)" />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </Card>
  );
}

function RecoveryCard() {
  const { openPayment, openStudent, canPay } = usePaymentDesk();
  const { data: summary } = useDashboardSummary();
  const { data: debtors } = useTopDebtors();

  return (
    <Card>
      <CardTitle
        action={
          <Link to="/debtors" className="flex items-center gap-1 text-xs font-semibold text-primary no-underline hover:underline">
            Tous <ArrowRight className="h-3 w-3" />
          </Link>
        }
      >
        Reste à recouvrer
      </CardTitle>
      <div className="mt-3 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="font-tabular text-3xl font-bold tracking-tight text-ink">
            {summary ? formatNumber(summary.outstanding) : '—'}
            <span className="ml-1.5 text-sm font-medium text-ink-muted">XOF</span>
          </p>
          <p className="mt-1 text-xs text-ink-soft">
            {summary
              ? summary.debtors > 0
                ? `${summary.debtors} famille${summary.debtors > 1 ? 's' : ''} en retard`
                : 'Aucune famille en retard'
              : ''}
          </p>
        </div>
        <Ring value={summary?.recovery_rate ?? 0} />
      </div>

      <ul className="mt-4 divide-y divide-border">
        {debtors && debtors.items.length === 0 && (
          <li className="py-4 text-center text-sm text-ink-soft">Tout est encaissé. Rien à relancer.</li>
        )}
        {(debtors?.items ?? []).slice(0, 4).map((debtor) => (
          <li key={debtor.student_id} className="flex items-center justify-between gap-3 py-2.5">
            <button type="button" onClick={() => openStudent(debtor.student_id)} className="min-w-0 text-left">
              <span className="block truncate text-sm font-medium text-ink hover:text-primary">{debtor.full_name}</span>
              <span className="block truncate text-xs text-ink-soft">
                {debtor.class ?? '—'} · <span className="font-tabular text-danger">{formatNumber(debtor.outstanding_amount)}</span>
              </span>
            </button>
            {canPay && (
              <button
                type="button"
                onClick={() => openPayment(debtor.student_id)}
                className="shrink-0 rounded-lg border border-primary/30 px-2.5 py-1 text-xs font-semibold text-primary transition hover:bg-primary-soft"
              >
                Encaisser
              </button>
            )}
          </li>
        ))}
      </ul>
    </Card>
  );
}

function CashiersCard() {
  const { hasPermission } = useAuth();
  const { openStudent } = usePaymentDesk();
  const { data: payments } = useRecentPayments();

  return (
    <Card>
      <CardTitle
        action={
          hasPermission('audit.view') ? (
            <Link to="/security" className="flex items-center gap-1 text-xs font-semibold text-primary no-underline hover:underline">
              Journal <ArrowRight className="h-3 w-3" />
            </Link>
          ) : undefined
        }
      >
        Qui a encaissé
      </CardTitle>
      <ul className="mt-2 divide-y divide-border">
        {payments && payments.length === 0 && <li className="py-6 text-center text-sm text-ink-soft">Aucun paiement pour le moment.</li>}
        {(payments ?? []).map((payment) => (
          <li key={payment.id} className="flex items-center justify-between gap-3 py-2.5">
            <button
              type="button"
              disabled={!payment.student}
              onClick={() => payment.student && openStudent(payment.student.id)}
              className="min-w-0 text-left"
            >
              <span className="block truncate text-sm font-medium text-ink">
                {payment.student ? `${payment.student.first_name} ${payment.student.last_name}` : '—'}
              </span>
              <span className="block truncate text-xs text-ink-soft">
                {payment.cashier?.full_name ?? '—'} · {formatTime(payment.created_at)}
              </span>
            </button>
            <span className="font-tabular shrink-0 text-sm font-semibold text-success">+{formatNumber(payment.total_paid_amount)}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function DocumentsCard() {
  const { hasPermission } = useAuth();
  const { data: summary } = useDashboardSummary();

  return (
    <Card>
      <CardTitle>Documents</CardTitle>
      <div className="mt-3 space-y-2">
        {hasPermission('payments.view') && (
          <Link
            to="/payments"
            className="flex items-center justify-between gap-3 rounded-xl border border-border px-3.5 py-3 no-underline transition hover:border-primary/40 hover:bg-paper"
          >
            <span className="flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary-soft text-primary">
                <FileText className="h-4 w-4" />
              </span>
              <span>
                <span className="block text-sm font-medium text-ink">Reçus du jour</span>
                <span className="block text-xs text-ink-soft">
                  {summary ? `${summary.today.payment_count} reçu${summary.today.payment_count > 1 ? 's' : ''} · ${formatAmount(summary.today.total)}` : '…'}
                </span>
              </span>
            </span>
            <span className="text-xs font-semibold text-primary">PDF</span>
          </Link>
        )}
        {hasPermission('debtors.print') && (
          <Link
            to="/debtors"
            className="flex items-center justify-between gap-3 rounded-xl border border-border px-3.5 py-3 no-underline transition hover:border-primary/40 hover:bg-paper"
          >
            <span className="flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-danger-soft text-danger">
                <Printer className="h-4 w-4" />
              </span>
              <span>
                <span className="block text-sm font-medium text-ink">Liste des débiteurs</span>
                <span className="block text-xs text-ink-soft">Par classe ou par tranche</span>
              </span>
            </span>
            <span className="text-xs font-semibold text-primary">Imprimer</span>
          </Link>
        )}
      </div>
    </Card>
  );
}

/**
 * L'accueil répond aux questions du directeur, dans l'ordre où il se les
 * pose : où en est la rentrée, combien est rentré, qui doit encore, qui a
 * encaissé — avec l'action à portée de main à chaque fois.
 */
export default function DashboardPage() {
  const { user, hasPermission } = useAuth();
  const { openPayment, canPay } = usePaymentDesk();
  const firstName = user?.full_name.split(' ')[0] ?? '';
  const today = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm text-ink-soft first-letter:uppercase">{today}</p>
          <h1 className="mt-0.5 text-2xl font-bold tracking-tight text-ink sm:text-3xl">Bonjour {firstName}</h1>
        </div>
        <div className="flex gap-2">
          {hasPermission('students.create') && (
            <Link
              to="/students"
              state={{ openCreate: true }}
              className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3.5 py-2 text-sm font-medium text-ink no-underline transition hover:bg-paper"
            >
              <UserPlus className="h-4 w-4" />
              Nouvel élève
            </Link>
          )}
          {canPay && (
            <button
              type="button"
              onClick={() => openPayment()}
              className="flex items-center gap-2 rounded-lg bg-primary px-3.5 py-2 text-sm font-semibold text-on-primary transition hover:bg-primary-dark"
            >
              <HandCoins className="h-4 w-4" />
              Encaisser
            </button>
          )}
        </div>
      </div>

      {hasPermission('students.view') && <YearBanner />}

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <MoneyCard />
          <div className="grid gap-5 md:grid-cols-2">
            <CashiersCard />
            <DocumentsCard />
          </div>
        </div>
        <RecoveryCard />
      </div>
    </div>
  );
}
