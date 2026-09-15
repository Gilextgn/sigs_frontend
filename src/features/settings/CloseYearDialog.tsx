import { AlertTriangle, Loader2 } from 'lucide-react';
import { Modal } from '@/shared/components/Modal';
import { useClosingPreview, useCloseAcademicYear, type AcademicYearRow } from './useSettings';

const currency = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });

export function CloseYearDialog({ year, onClose }: { year: AcademicYearRow; onClose: () => void }) {
  const { data: debtors, isLoading } = useClosingPreview(year.id);
  const closeYear = useCloseAcademicYear();

  async function handleClose() {
    await closeYear.mutateAsync(year.id);
    onClose();
  }

  const debtorCount = debtors?.length ?? 0;

  return (
    <Modal title={`Clôturer ${year.code}`} onClose={onClose} widthClassName="max-w-xl">
      {isLoading && (
        <div className="flex items-center justify-center gap-2 py-8 text-sm text-ink-soft">
          <Loader2 className="h-4 w-4 animate-spin" /> Calcul des restes dus...
        </div>
      )}

      {!isLoading && debtorCount === 0 && (
        <p className="text-sm text-ink-soft">Aucun élève inscrit cette année n'a de reste dû. Clôture sans blocage à prévoir.</p>
      )}

      {!isLoading && debtorCount > 0 && (
        <>
          <div className="flex items-start gap-2 rounded-lg border border-gold/30 bg-gold-soft px-3 py-2.5 text-sm text-gold">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              {debtorCount} élève{debtorCount > 1 ? 's' : ''} encore débiteur{debtorCount > 1 ? 's' : ''}. Une fois l'année clôturée,
              leur réinscription sera bloquée tant que le solde n'est pas réglé (sauf passage outre habilité).
            </p>
          </div>
          <div className="mt-4 max-h-72 divide-y divide-border overflow-y-auto rounded-lg border border-border">
            {debtors?.map((debtor) => (
              <div key={debtor.student_id} className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm">
                <div>
                  <p className="font-medium text-ink">{debtor.full_name}</p>
                  <p className="text-xs text-ink-soft">{debtor.matricule}</p>
                </div>
                <span className="font-tabular font-semibold text-danger">{currency.format(debtor.outstanding_amount)} XOF</span>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="mt-5 flex justify-end gap-2">
        <button type="button" onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-ink transition hover:bg-paper">
          Annuler
        </button>
        <button
          type="button"
          onClick={handleClose}
          disabled={closeYear.isPending || isLoading}
          className="rounded-lg bg-danger px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-60"
        >
          {closeYear.isPending ? 'Clôture...' : debtorCount > 0 ? `Clôturer quand même (${debtorCount} débiteur${debtorCount > 1 ? 's' : ''})` : 'Clôturer'}
        </button>
      </div>
    </Modal>
  );
}
