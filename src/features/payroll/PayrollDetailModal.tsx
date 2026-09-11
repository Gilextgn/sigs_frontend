import { CalendarDays, Download, Loader2, ReceiptText } from 'lucide-react';
import { Modal } from '@/shared/components/Modal';
import { useSchoolSettings } from '@/features/settings/useSettings';
import { downloadPayrollSlipPdf } from '@/shared/lib/pdf';
import { usePayrollDetail } from './usePayroll';

const currency = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });

export function PayrollDetailModal({ payrollId, onClose }: { payrollId: number; onClose: () => void }) {
  const { data: payroll, isLoading } = usePayrollDetail(payrollId);
  const { data: settings } = useSchoolSettings();

  async function handleDownload() {
    if (!payroll) return;

    await downloadPayrollSlipPdf(
      {
        teacher_name: payroll.teacher?.full_name ?? 'Enseignant',
        period: payroll.period,
        base_amount: Number(payroll.base_amount),
        bonus_amount: Number(payroll.bonus_amount),
        deduction_amount: Number(payroll.deduction_amount),
        net_amount: Number(payroll.net_amount),
        status: payroll.status,
        sessions: payroll.sessions.map((session) => ({
          session_date: session.session_date,
          class_label: session.class_label,
          subject_label: session.subject_label,
          status: session.status,
          paid_minutes: session.paid_minutes,
        })),
      },
      settings ?? null,
    );
  }

  return (
    <Modal title="Détail de la paie" onClose={onClose} widthClassName="max-w-3xl">
      {isLoading || !payroll ? (
        <div className="flex items-center justify-center py-10 text-ink-soft">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : (
        <div className="space-y-5">
          <div className="rounded-lg bg-paper p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-ink-soft">Enseignant</p>
                <h3 className="mt-1 text-lg font-semibold text-ink">{payroll.teacher?.full_name ?? '—'}</h3>
              </div>
              <div className="rounded-full bg-success-soft px-3 py-1 text-xs font-medium text-success">
                {payroll.status === 'paid' ? 'Payée' : 'En attente'}
              </div>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-border bg-surface px-3 py-2">
                <p className="text-xs text-ink-soft">Période</p>
                <p className="mt-1 font-medium text-ink">{payroll.period}</p>
              </div>
              <div className="rounded-lg border border-border bg-surface px-3 py-2">
                <p className="text-xs text-ink-soft">Base</p>
                <p className="mt-1 font-medium text-ink">{currency.format(Number(payroll.base_amount))} XOF</p>
              </div>
              <div className="rounded-lg border border-border bg-surface px-3 py-2">
                <p className="text-xs text-ink-soft">Net</p>
                <p className="mt-1 font-medium text-ink">{currency.format(Number(payroll.net_amount))} XOF</p>
              </div>
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-ink">
              <CalendarDays className="h-4 w-4 text-primary" />
              Séances comptabilisées
            </div>
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead className="bg-paper text-xs uppercase text-ink-soft">
                  <tr>
                    <th className="px-3 py-2">Date</th>
                    <th className="px-3 py-2">Classe</th>
                    <th className="px-3 py-2">Matière</th>
                    <th className="px-3 py-2">Présence</th>
                    <th className="px-3 py-2 text-right">Minutes payées</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {payroll.sessions.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-3 py-8 text-center text-ink-soft">Aucune séance enregistrée pour cette période.</td>
                    </tr>
                  ) : (
                    payroll.sessions.map((session) => (
                      <tr key={session.id}>
                        <td className="px-3 py-2 font-tabular">{session.session_date}</td>
                        <td className="px-3 py-2">{session.class_label}</td>
                        <td className="px-3 py-2">{session.subject_label}</td>
                        <td className="px-3 py-2">
                          <span className="rounded-full bg-paper px-2 py-1 text-[11px] font-medium text-ink-soft">
                            {session.status === 'present' ? 'Présent' : session.status === 'justified' ? 'Justifié' : session.status === 'replaced' ? 'Remplacé' : session.status === 'absent' ? 'Absent' : 'Non saisi'}
                          </span>
                          {session.reason && <div className="mt-1 text-[11px] text-ink-soft">{session.reason}</div>}
                        </td>
                        <td className="px-3 py-2 text-right font-tabular font-medium text-ink">{session.paid_minutes} min</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-surface p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-ink">
              <ReceiptText className="h-4 w-4 text-primary" />
              Récapitulatif financier
            </div>
            <div className="mt-3 space-y-2 text-sm">
              <div className="flex items-center justify-between text-ink-soft">
                <span>Base calculée</span>
                <span className="font-tabular text-ink">{currency.format(Number(payroll.base_amount))} XOF</span>
              </div>
              <div className="flex items-center justify-between text-ink-soft">
                <span>Prime</span>
                <span className="font-tabular text-ink">{currency.format(Number(payroll.bonus_amount))} XOF</span>
              </div>
              <div className="flex items-center justify-between text-ink-soft">
                <span>Retenue</span>
                <span className="font-tabular text-ink">{currency.format(Number(payroll.deduction_amount))} XOF</span>
              </div>
              <div className="flex items-center justify-between border-t border-border pt-2 text-base font-semibold text-ink">
                <span>Net à payer</span>
                <span className="font-tabular">{currency.format(Number(payroll.net_amount))} XOF</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleDownload}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white transition hover:bg-primary-dark"
          >
            <Download className="h-4 w-4" />
            Télécharger la fiche PDF
          </button>
        </div>
      )}
    </Modal>
  );
}
