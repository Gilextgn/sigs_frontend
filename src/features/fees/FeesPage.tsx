import { useState } from 'react';
import { Pencil, Plus, Search, Trash2, Wallet } from 'lucide-react';
import { ConfirmDialog } from '@/shared/components/ConfirmDialog';
import { Pagination } from '@/shared/components/Pagination';
import { editIconClass, deleteIconClass } from '@/shared/components/actionStyles';
import { usePaginatedRows } from '@/shared/hooks/usePaginatedRows';
import { useDeleteFeeType, useFeeTypes, type FeeTypeRow } from './useFeeTypes';
import { FeeFormModal } from './FeeFormModal';

const currency = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });

export default function FeesPage() {
  const [search, setSearch] = useState('');
  const [modalState, setModalState] = useState<{ open: boolean; editing: FeeTypeRow | null }>({
    open: false,
    editing: null,
  });
  const [toDelete, setToDelete] = useState<FeeTypeRow | null>(null);
  const { data, isLoading, isError } = useFeeTypes(search);
  const deleteFeeType = useDeleteFeeType();
  const { pageRows, ...pagination } = usePaginatedRows(data);

  async function handleConfirmDelete() {
    if (!toDelete) return;
    await deleteFeeType.mutateAsync(toDelete.id);
    setToDelete(null);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-ink-soft" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un frais..."
            className="w-full rounded-lg border border-border bg-surface py-2 pr-3 pl-9 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <button
          onClick={() => setModalState({ open: true, editing: null })}
          className="flex shrink-0 items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-dark"
        >
          <Plus className="h-4 w-4" />
          Nouveau frais
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading && <p className="text-sm text-ink-soft">Chargement...</p>}
        {isError && <p className="text-sm text-danger">Impossible de charger les frais.</p>}
        {!isLoading && !isError && (data?.length ?? 0) === 0 && (
          <div className="col-span-full flex flex-col items-center rounded-xl border border-dashed border-border bg-surface py-14 text-center">
            <Wallet className="h-8 w-8 text-ink-soft" />
            <p className="mt-2 text-sm text-ink-soft">Aucun frais défini pour le moment.</p>
          </div>
        )}
        {pageRows.map((fee) => (
          <article key={fee.id} className="rounded-xl border border-border bg-surface p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-medium text-ink">{fee.label}</p>
                {fee.category && <p className="text-xs text-ink-soft">{fee.category}</p>}
              </div>
              <div className="flex shrink-0 gap-1">
                <button
                  onClick={() => setModalState({ open: true, editing: fee })}
                  className={editIconClass}
                  aria-label="Modifier"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setToDelete(fee)}
                  className={deleteIconClass}
                  aria-label="Supprimer"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
            <p className="font-tabular mt-2 text-lg font-semibold text-ink">
              {currency.format(Number(fee.amount))} XOF
            </p>
            <span className={`mt-2 inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${fee.is_mandatory ? 'bg-danger-soft text-danger' : 'bg-paper text-ink-soft'}`}>
              {fee.is_mandatory ? 'Obligatoire' : 'Optionnel'}
            </span>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {fee.classes.length === 0 && <span className="text-xs text-ink-soft">Aucune classe affectée</span>}
              {fee.classes.map((c) => (
                <span key={c.id} className="rounded-full bg-gold-soft px-2 py-0.5 text-xs font-medium text-gold">
                  {c.label}
                </span>
              ))}
            </div>
          </article>
        ))}
      </div>
      {pagination.totalItems > 0 && (
        <div className="overflow-hidden rounded-xl border border-border bg-surface">
          <Pagination {...pagination} onPageChange={pagination.setPage} />
        </div>
      )}

      {modalState.open && (
        <FeeFormModal editing={modalState.editing} onClose={() => setModalState({ open: false, editing: null })} />
      )}

      <ConfirmDialog
        open={toDelete !== null}
        title="Supprimer ce frais ?"
        message={toDelete ? `"${toDelete.label}" sera définitivement supprimé de toutes les classes concernées.` : ''}
        confirmLabel="Supprimer"
        onConfirm={handleConfirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}
