import { useState } from 'react';
import { Banknote, CheckCircle2, Eye, Plus } from 'lucide-react';
import { ConfirmDialog } from '@/shared/components/ConfirmDialog';
import { Pagination } from '@/shared/components/Pagination';
import { usePaginatedRows } from '@/shared/hooks/usePaginatedRows';
import { useMarkPayrollPaid, usePayrollEntries, type PayrollEntryRow } from './usePayroll';
import { PayrollFormModal } from './PayrollFormModal';
import { PayrollDetailModal } from './PayrollDetailModal';

const currency = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });

export default function PayrollPage() {
  const [period, setPeriod] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [detailEntryId, setDetailEntryId] = useState<number | null>(null);
  const [toMarkPaid, setToMarkPaid] = useState<PayrollEntryRow | null>(null);

  const { data, isLoading } = usePayrollEntries(period);
  const markPaid = useMarkPayrollPaid();
  const { pageRows, ...pagination } = usePaginatedRows(data?.data);

  async function handleConfirmMarkPaid() {
    if (!toMarkPaid) return;
    await markPaid.mutateAsync(toMarkPaid.id);
    setToMarkPaid(null);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <input
          type="month"
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          className="w-full max-w-[200px] rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
        <button onClick={() => setModalOpen(true)} className="flex shrink-0 items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-dark">
          <Plus className="h-4 w-4" />
          Nouvelle fiche
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-surface">
        <table className="w-full text-left text-sm">
          <thead className="bg-paper text-xs font-medium tracking-wide text-ink-soft uppercase">
            <tr>
              <th className="px-4 py-3">Enseignant</th>
              <th className="px-4 py-3">Période</th>
              <th className="px-4 py-3 text-right">Net à payer</th>
              <th className="px-4 py-3">Statut</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading && (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-ink-soft">Chargement...</td></tr>
            )}
            {!isLoading && (data?.data.length ?? 0) === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-14 text-center">
                  <Banknote className="mx-auto h-8 w-8 text-ink-soft" />
                  <p className="mt-2 text-sm text-ink-soft">Aucune fiche de paie pour cette période.</p>
                </td>
              </tr>
            )}
            {pageRows.map((entry) => {
              const net = Number(entry.base_amount) + Number(entry.bonus_amount) - Number(entry.deduction_amount);
              return (
                <tr key={entry.id} className="transition hover:bg-paper">
                  <td className="px-4 py-3 font-medium text-ink">{entry.teacher?.full_name ?? '—'}</td>
                  <td className="font-tabular px-4 py-3 text-ink-soft">{entry.period}</td>
                  <td className="font-tabular px-4 py-3 text-right font-medium text-ink">
                    {currency.format(net)} XOF
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${entry.status === 'paid' ? 'bg-success-soft text-success' : 'bg-gold-soft text-gold'}`}>
                      {entry.status === 'paid' ? 'Payée' : 'En attente'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setDetailEntryId(entry.id)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-primary transition hover:bg-primary-soft"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Détail
                      </button>
                      {entry.status === 'pending' && (
                        <button
                          onClick={() => setToMarkPaid(entry)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-success transition hover:bg-success-soft"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Marquer payée
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <Pagination {...pagination} onPageChange={pagination.setPage} />
      </div>

      {modalOpen && <PayrollFormModal onClose={() => setModalOpen(false)} />}
      {detailEntryId && <PayrollDetailModal payrollId={detailEntryId} onClose={() => setDetailEntryId(null)} />}

      <ConfirmDialog
        open={toMarkPaid !== null}
        title="Marquer cette fiche comme payée ?"
        message={toMarkPaid ? `La fiche de ${toMarkPaid.teacher?.full_name ?? 'cet enseignant'} pour ${toMarkPaid.period} sera marquée payée. Cette action est irréversible.` : ''}
        confirmLabel="Marquer payée"
        danger={false}
        onConfirm={handleConfirmMarkPaid}
        onCancel={() => setToMarkPaid(null)}
      />
    </div>
  );
}
