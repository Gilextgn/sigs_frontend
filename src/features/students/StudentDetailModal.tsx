import { Download, GraduationCap, HandCoins, Phone, Receipt, User } from 'lucide-react';
import { Modal } from '@/shared/components/Modal';
import { Loader } from '@/shared/components/Loader';
import { StatusBadge } from '@/shared/components/StatusBadge';
import { useAuth } from '@/features/auth/AuthContext';
import { useSchoolSettings } from '@/features/settings/useSettings';
import { LineStatus } from '@/features/payments/LineStatus';
import { toReceiptData, useStudentPayments } from '@/features/payments/usePayments';
import { downloadPaymentReceiptPdf } from '@/shared/lib/pdf';
import { formatAmount, formatDate, formatNumber } from '@/shared/lib/format';
import { useStudent, useStudentBalance } from './useStudents';
import { STUDENT_STATUS_LABELS, STUDENT_STATUS_TONES } from './studentStatus';

const GENDER_LABELS: Record<string, string> = { F: 'Féminin', M: 'Masculin' };

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 px-3.5 py-2.5 text-sm">
      <span className="text-ink-soft">{label}</span>
      <span className="text-right font-medium text-ink">{value}</span>
    </div>
  );
}

function SectionTitle({ icon: Icon, children }: { icon: typeof User; children: string }) {
  return (
    <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold tracking-wide text-ink-soft uppercase">
      <Icon className="h-3.5 w-3.5" /> {children}
    </p>
  );
}

/**
 * La fiche répond d'abord à « combien doit-il ? » : solde, lignes restantes
 * (acomptes compris), historique avec reçus, et Encaisser en un clic.
 */
export function StudentDetailModal({
  studentId,
  onClose,
  onPay,
}: {
  studentId: number;
  onClose: () => void;
  /** Ouvre l'encaissement pour cet élève ; absent si l'utilisateur ne peut pas encaisser. */
  onPay?: (studentId: number) => void;
}) {
  const { hasPermission } = useAuth();
  const { data: student, isLoading } = useStudent(studentId);
  const { data: balance } = useStudentBalance(studentId);
  const { data: payments } = useStudentPayments(hasPermission('payments.view') ? studentId : null);
  const { data: settings } = useSchoolSettings();

  const remaining = (balance?.unpaid_items ?? []).reduce((sum, item) => sum + item.remaining, 0);
  const paidRatio = balance && balance.theoretical_amount > 0 ? Math.min(balance.paid_amount / balance.theoretical_amount, 1) : 0;
  const history = payments?.data ?? [];

  return (
    <Modal title="Fiche élève" onClose={onClose} widthClassName="max-w-2xl">
      {isLoading || !student ? (
        <div className="grid place-items-center py-12">
          <Loader size={48} label="" />
        </div>
      ) : (
        <div className="space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-primary-soft font-display text-base font-bold text-primary-dark">
                {student.first_name[0]}
                {student.last_name[0]}
              </span>
              <div className="min-w-0">
                <p className="truncate text-lg font-semibold text-ink">{student.full_name}</p>
                <p className="text-xs text-ink-soft">
                  <span className="font-tabular">{student.matricule}</span> · {student.class?.label ?? 'Aucune classe'}
                  {student.academic_year ? ` · ${student.academic_year.code}` : ''}
                </p>
              </div>
            </div>
            <StatusBadge
              label={STUDENT_STATUS_LABELS[student.status] ?? student.status}
              tone={STUDENT_STATUS_TONES[student.status] ?? 'primary'}
              className="shrink-0"
            />
          </div>

          {/* Solde */}
          <div className="rounded-xl border border-border bg-paper p-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-[11px] font-medium tracking-wide text-ink-soft uppercase">Reste à payer</p>
                <p className={`font-tabular mt-0.5 text-2xl font-semibold ${remaining > 0 ? 'text-danger' : 'text-success'}`}>
                  {balance ? formatAmount(remaining) : '…'}
                </p>
                {balance && (
                  <p className="mt-0.5 text-xs text-ink-soft">
                    Scolarité : {formatNumber(balance.paid_amount)} versés sur {formatNumber(balance.theoretical_amount)}
                  </p>
                )}
              </div>
              {onPay && hasPermission('payments.create') && remaining > 0 && (
                <button
                  type="button"
                  onClick={() => onPay(student.id)}
                  className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary transition hover:bg-primary-dark"
                >
                  <HandCoins className="h-4 w-4" />
                  Encaisser
                </button>
              )}
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-track">
              <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${paidRatio * 100}%` }} />
            </div>

            {balance && balance.unpaid_items.length > 0 && (
              <ul className="mt-3 divide-y divide-border rounded-lg border border-border bg-surface">
                {balance.unpaid_items.map((item) => (
                  <li key={`${item.type}-${item.id}`} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm">
                    <span className="font-medium text-ink">{item.label}</span>
                    <LineStatus paid={item.paid} remaining={item.remaining} />
                  </li>
                ))}
              </ul>
            )}
            {balance && balance.unpaid_items.length === 0 && (
              <p className="mt-3 text-sm font-medium text-success">Tout est réglé pour la classe actuelle.</p>
            )}
          </div>

          {/* Historique */}
          {hasPermission('payments.view') && (
            <div>
              <SectionTitle icon={Receipt}>Paiements</SectionTitle>
              <div className="divide-y divide-border overflow-hidden rounded-lg border border-border">
                {history.length === 0 && <p className="px-3.5 py-4 text-center text-sm text-ink-soft">Aucun paiement enregistré.</p>}
                {history.map((payment) => (
                  <div key={payment.id} className="flex items-center justify-between gap-3 px-3.5 py-2.5 text-sm">
                    <div className="min-w-0">
                      <p className="flex items-center gap-2 font-medium text-ink">
                        <span className="font-tabular text-success">+{formatNumber(payment.total_paid_amount)}</span>
                        {payment.is_partial && (
                          <span className="rounded-full bg-gold-soft px-2 py-0.5 text-[10px] font-semibold text-gold">Acompte</span>
                        )}
                      </p>
                      <p className="truncate text-xs text-ink-soft">
                        {formatDate(payment.payment_date)} · {payment.items.map((item) => item.label).join(', ')}
                      </p>
                    </div>
                    {hasPermission('payments.print') && (
                      <button
                        type="button"
                        onClick={() => downloadPaymentReceiptPdf(toReceiptData(payment, student.class?.label), settings ?? null)}
                        title="Télécharger le reçu"
                        aria-label={`Reçu ${payment.reference_code}`}
                        className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-ink-soft transition hover:bg-paper hover:text-primary"
                      >
                        <Download className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <SectionTitle icon={GraduationCap}>Élève</SectionTitle>
              <div className="divide-y divide-border overflow-hidden rounded-lg border border-border">
                <InfoRow label="Naissance" value={student.birth_date ? formatDate(student.birth_date, 'long') : '—'} />
                <InfoRow label="Sexe" value={student.gender ? (GENDER_LABELS[student.gender] ?? student.gender) : '—'} />
                <InfoRow label="Inscrit le" value={formatDate(student.created_at, 'long')} />
              </div>
            </div>
            <div>
              <SectionTitle icon={User}>Tuteur / parent</SectionTitle>
              <div className="divide-y divide-border overflow-hidden rounded-lg border border-border">
                <InfoRow label="Nom" value={student.guardian?.full_name ?? '—'} />
                <InfoRow label="Lien" value={student.guardian?.relationship_label ?? '—'} />
                <InfoRow label="Téléphone" value={student.guardian?.phone ?? '—'} />
              </div>
            </div>
          </div>

          {student.guardian?.phone && (
            <a
              href={`tel:${student.guardian.phone}`}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-ink no-underline transition hover:bg-paper"
            >
              <Phone className="h-4 w-4" />
              Appeler le tuteur
            </a>
          )}
        </div>
      )}
    </Modal>
  );
}
