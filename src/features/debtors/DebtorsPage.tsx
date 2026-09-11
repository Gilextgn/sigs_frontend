import { useState } from 'react';
import { Download, Eye, Loader2, UserX } from 'lucide-react';
import { useClasses } from '@/features/classes/useClasses';
import { useTranches } from '@/features/tranches/useTranches';
import { useSchoolSettings } from '@/features/settings/useSettings';
import { SearchableSelect } from '@/shared/components/SearchableSelect';
import { Pagination } from '@/shared/components/Pagination';
import { SkeletonTableRows } from '@/shared/components/Skeleton';
import { viewIconClass } from '@/shared/components/actionStyles';
import { usePaginatedRows } from '@/shared/hooks/usePaginatedRows';
import { downloadDebtorsListPdf } from '@/shared/lib/pdf';
import { useDebtors, type DebtorRow } from './useDebtors';
import { Modal } from '@/shared/components/Modal';

const currency = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });

export default function DebtorsPage() {
  const [classId, setClassId] = useState<number | ''>('');
  const [trancheId, setTrancheId] = useState<number | ''>('');
  const [downloading, setDownloading] = useState(false);
  const [selectedDebtor, setSelectedDebtor] = useState<DebtorRow | null>(null);

  const { data: classes } = useClasses();
  const { data: tranches } = useTranches(classId);
  const { data: debtors, isLoading } = useDebtors({ classId, trancheId });
  const { data: settings } = useSchoolSettings();
  const { pageRows, ...pagination } = usePaginatedRows(debtors);

  const totalOutstanding = (debtors ?? []).reduce((sum, d) => sum + d.outstanding_amount, 0);

  const selectedClassLabel = classes?.find((c) => c.id === classId)?.label;
  const selectedTrancheLabel = tranches?.find((t) => t.id === trancheId)?.label;
  const filterLabel = [
    selectedClassLabel ? `Classe : ${selectedClassLabel}` : 'Toutes les classes',
    selectedTrancheLabel ? `Tranche : ${selectedTrancheLabel}` : 'Scolarité entière',
  ].join(' · ');

  async function handleDownload() {
    setDownloading(true);
    try {
      await downloadDebtorsListPdf(debtors ?? [], filterLabel, settings ?? null);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div className="flex flex-wrap gap-3">
          <div className="w-48">
            <label className="mb-1.5 block text-xs font-medium text-ink-soft">Classe</label>
            <SearchableSelect
              value={classId}
              clearable
              placeholder="Toutes les classes"
              onChange={(v) => {
                setClassId(v === '' ? '' : Number(v));
                setTrancheId('');
              }}
              options={(classes ?? []).map((c) => ({ value: c.id, label: c.label }))}
            />
          </div>
          <div className="w-48">
            <label className="mb-1.5 block text-xs font-medium text-ink-soft">Tranche</label>
            <SearchableSelect
              value={trancheId}
              clearable
              disabled={!classId}
              placeholder="Scolarité entière"
              onChange={(v) => setTrancheId(v === '' ? '' : Number(v))}
              options={(tranches ?? []).map((t) => ({ value: t.id, label: t.label }))}
            />
          </div>
        </div>
        <button
          onClick={handleDownload}
          disabled={downloading || isLoading || (debtors ?? []).length === 0}
          className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-ink transition hover:bg-paper disabled:opacity-50"
        >
          {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          Télécharger en PDF
        </button>
      </div>

      <div className="rounded-xl border border-border bg-surface p-4">
        <p className="text-xs font-medium tracking-wide text-ink-soft uppercase">Total restant dû</p>
        <p className="font-tabular mt-1 text-2xl font-semibold text-danger">
          {currency.format(totalOutstanding)} XOF
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-surface">
        <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-paper text-xs font-medium tracking-wide text-ink-soft uppercase">
            <tr>
              <th className="px-4 py-3">Matricule</th>
              <th className="px-4 py-3">Élève</th>
              <th className="px-4 py-3">Classe</th>
              <th className="px-4 py-3">Progression</th>
              <th className="px-4 py-3 text-right">Dû</th>
              <th className="px-4 py-3 text-right">Payé</th>
              <th className="px-4 py-3 text-right">Reste</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading && (
              <SkeletonTableRows columns={8} />
            )}
            {!isLoading && (debtors ?? []).length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-14 text-center">
                  <UserX className="mx-auto h-8 w-8 text-ink-soft" />
                  <p className="mt-2 text-sm text-ink-soft">Aucun débiteur pour ces critères.</p>
                </td>
              </tr>
            )}
            {pageRows.map((d) => {
              const ratio = d.theoretical_amount > 0 ? Math.min(d.paid_amount / d.theoretical_amount, 1) : 0;
              return (
                <tr key={d.student_id} className="transition hover:bg-paper">
                  <td className="font-tabular px-4 py-3 text-ink-soft">{d.matricule}</td>
                  <td className="px-4 py-3 font-medium text-ink">{d.full_name}</td>
                  <td className="px-4 py-3 text-ink-soft">{d.class ?? '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-danger-soft">
                        <div className="h-full rounded-full bg-success" style={{ width: `${ratio * 100}%` }} />
                      </div>
                      <span className="font-tabular text-xs text-ink-soft">{Math.round(ratio * 100)}%</span>
                    </div>
                  </td>
                  <td className="font-tabular px-4 py-3 text-right text-ink-soft">
                    {currency.format(d.theoretical_amount)}
                  </td>
                  <td className="font-tabular px-4 py-3 text-right text-success">
                    {currency.format(d.paid_amount)}
                  </td>
                  <td className="font-tabular px-4 py-3 text-right font-medium text-danger">
                    {currency.format(d.outstanding_amount)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end">
                      <button
                        onClick={() => setSelectedDebtor(d)}
                        className={viewIconClass}
                        aria-label={`Voir les impayés de ${d.full_name}`}
                        title="Voir les impayés"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>
        <Pagination {...pagination} onPageChange={pagination.setPage} />
      </div>

      {selectedDebtor && (
        <Modal title={`Impayés de ${selectedDebtor.full_name}`} onClose={() => setSelectedDebtor(null)}>
          <div className="mb-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
            <div><p className="text-xs text-ink-soft">Classe</p><p className="font-medium text-ink">{selectedDebtor.class ?? '—'}</p></div>
            <div><p className="text-xs text-ink-soft">Élève</p><p className="font-medium text-ink">{selectedDebtor.matricule}</p></div>
            <div><p className="text-xs text-ink-soft">Total restant</p><p className="font-tabular font-semibold text-danger">{currency.format(selectedDebtor.outstanding_amount)} XOF</p></div>
          </div>
          <div className="divide-y divide-border rounded-lg border border-border">
            {selectedDebtor.unpaid_items.map((item) => (
              <div key={`${item.type}-${item.label}`} className="flex items-center justify-between gap-3 px-3 py-3 text-sm">
                <span className="font-medium text-ink">{item.label}</span>
                <span className="font-tabular text-right text-danger">Reste {currency.format(item.remaining)} XOF</span>
              </div>
            ))}
            {selectedDebtor.unpaid_items.length === 0 && <p className="px-3 py-4 text-sm text-ink-soft">Aucun détail disponible.</p>}
          </div>
        </Modal>
      )}
    </div>
  );
}
