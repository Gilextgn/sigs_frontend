import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Lock, LockOpen } from 'lucide-react';
import { useAuth } from '@/features/auth/AuthContext';
import { usePaymentDesk } from '@/features/payments/PaymentDesk';
import { ConfirmDialog } from '@/shared/components/ConfirmDialog';
import { Loader } from '@/shared/components/Loader';
import { formatAmount, formatDate, formatNumber } from '@/shared/lib/format';
import { CloseYearDialog } from './CloseYearDialog';
import { useAcademicYears, useClosingPreview, useReopenAcademicYear, type AcademicYearRow } from './useSettings';

/**
 * Clôturer une année, c'est figer qui doit encore : un élève débiteur d'une
 * année clôturée ne peut plus être réinscrit tant qu'il n'a pas soldé. Cet
 * écran vit dans Recouvrement, là où l'on regarde justement qui doit.
 */
export default function YearClosingPage() {
  const { hasPermission } = useAuth();
  const canManage = hasPermission('settings.manage');
  const { data: years, isLoading } = useAcademicYears();
  const reopenYear = useReopenAcademicYear();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [closingYear, setClosingYear] = useState<AcademicYearRow | null>(null);
  const [reopeningYear, setReopeningYear] = useState<AcademicYearRow | null>(null);

  const sorted = [...(years ?? [])].sort((a, b) => b.code.localeCompare(a.code));
  const selected = sorted.find((y) => y.id === selectedId) ?? sorted.find((y) => !y.is_active && !y.closed_at) ?? sorted[0];

  if (isLoading) {
    return (
      <div className="grid min-h-[50vh] place-items-center">
        <Loader />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink">Clôture d'année</h1>
        <p className="mt-0.5 max-w-2xl text-sm text-ink-soft">
          Une année clôturée garde la liste de ses débiteurs : leur réinscription est bloquée jusqu'au paiement du solde, qui les
          débloque aussitôt.
        </p>
      </div>

      {sorted.length === 0 ? (
        <div className="rounded-2xl border border-border bg-surface px-6 py-10 text-center text-sm text-ink-soft">
          Aucune année scolaire enregistrée.{' '}
          {hasPermission('settings.view') && (
            <Link to="/settings" className="font-semibold text-primary">
              Créer une année
            </Link>
          )}
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
          <ul className="space-y-2">
            {sorted.map((year) => (
              <li key={year.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(year.id)}
                  className={`flex w-full items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition ${
                    selected?.id === year.id ? 'border-primary bg-primary-soft/50 ring-2 ring-primary/15' : 'border-border bg-surface hover:bg-paper'
                  }`}
                >
                  <span>
                    <span className="font-tabular block text-base font-bold text-ink">{year.code}</span>
                    <span className="text-xs text-ink-soft">
                      {year.is_active ? 'Année en cours' : year.closed_at ? `Clôturée le ${formatDate(year.closed_at)}` : 'Non clôturée'}
                    </span>
                  </span>
                  {year.closed_at ? (
                    <Lock className="h-4 w-4 text-ink-muted" />
                  ) : year.is_active ? (
                    <span className="h-2 w-2 rounded-full bg-primary" />
                  ) : (
                    <LockOpen className="h-4 w-4 text-gold" />
                  )}
                </button>
              </li>
            ))}
          </ul>

          {selected && (
            <YearPanel
              year={selected}
              canManage={canManage}
              onClose={() => setClosingYear(selected)}
              onReopen={() => setReopeningYear(selected)}
            />
          )}
        </div>
      )}

      {closingYear && <CloseYearDialog year={closingYear} onClose={() => setClosingYear(null)} />}

      <ConfirmDialog
        open={reopeningYear !== null}
        title="Rouvrir cette année ?"
        message={
          reopeningYear
            ? `« ${reopeningYear.code} » ne sera plus clôturée : les élèves qui en étaient bloqués pourront être réinscrits sans avoir soldé.`
            : ''
        }
        confirmLabel="Rouvrir"
        danger={false}
        onConfirm={() => {
          if (reopeningYear) reopenYear.mutate(reopeningYear.id);
          setReopeningYear(null);
        }}
        onCancel={() => setReopeningYear(null)}
      />
    </div>
  );
}

function YearPanel({
  year,
  canManage,
  onClose,
  onReopen,
}: {
  year: AcademicYearRow;
  canManage: boolean;
  onClose: () => void;
  onReopen: () => void;
}) {
  const { data: debtors, isLoading } = useClosingPreview(year.id);
  const { openPayment, openStudent, canPay } = usePaymentDesk();
  const total = (debtors ?? []).reduce((sum, d) => sum + d.outstanding_amount, 0);

  return (
    <section className="min-w-0 rounded-2xl border border-border bg-surface">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border p-5">
        <div>
          <p className="text-xs font-medium text-ink-soft">
            {year.closed_at ? 'Reste à payer sur cette année, recalculé à chaque paiement' : 'Si vous clôturez maintenant'}
          </p>
          <p className="font-tabular mt-1 text-3xl font-bold text-ink">
            {isLoading ? '…' : formatNumber(total)} <span className="text-base font-medium text-ink-muted">XOF</span>
          </p>
          <p className="mt-0.5 text-sm text-ink-soft">
            {isLoading
              ? 'Calcul des restes à payer…'
              : debtors && debtors.length > 0
                ? debtors.length > 1
                  ? `${debtors.length} élèves ${year.closed_at ? 'bloqués' : 'seraient bloqués'} à la réinscription`
                  : `1 élève ${year.closed_at ? 'bloqué' : 'serait bloqué'} à la réinscription`
                : 'Aucun élève débiteur pour cette année.'}
          </p>
        </div>
        {canManage &&
          (year.closed_at ? (
            <button
              type="button"
              onClick={onReopen}
              className="flex items-center gap-2 rounded-lg border border-border px-3.5 py-2 text-sm font-medium text-ink transition hover:bg-paper"
            >
              <LockOpen className="h-4 w-4" /> Rouvrir
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="flex items-center gap-2 rounded-lg bg-danger px-3.5 py-2 text-sm font-semibold text-on-danger transition hover:opacity-90"
            >
              <Lock className="h-4 w-4" /> Clôturer {year.code}
            </button>
          ))}
      </div>

      {!isLoading && debtors && debtors.length === 0 && (
        <p className="flex items-center justify-center gap-2 px-5 py-10 text-sm text-success">
          <CheckCircle2 className="h-4 w-4" /> Tout est soldé pour {year.code}.
        </p>
      )}

      {debtors && debtors.length > 0 && (
        <ul className="divide-y divide-border">
          {debtors.map((debtor) => (
            <li key={debtor.student_id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-2.5">
              <button type="button" onClick={() => openStudent(debtor.student_id)} className="min-w-0 text-left">
                <span className="block truncate text-sm font-medium text-ink hover:text-primary">{debtor.full_name}</span>
                <span className="font-tabular block text-xs text-ink-soft">{debtor.matricule}</span>
              </button>
              <div className="flex items-center gap-2">
                <span className="font-tabular text-sm font-semibold text-danger">{formatAmount(debtor.outstanding_amount)}</span>
                {canPay && (
                  <button
                    type="button"
                    onClick={() => openPayment(debtor.student_id)}
                    className="rounded-lg border border-primary/30 px-2.5 py-1 text-xs font-semibold text-primary hover:bg-primary-soft"
                  >
                    Encaisser
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
