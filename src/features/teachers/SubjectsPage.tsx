import { useState, type FormEvent } from 'react';
import { BookOpen, Pencil, Plus, Trash2 } from 'lucide-react';
import { Modal } from '@/shared/components/Modal';
import { Field, inputClass } from '@/shared/components/Field';
import { ConfirmDialog } from '@/shared/components/ConfirmDialog';
import { Pagination } from '@/shared/components/Pagination';
import { editIconClass, deleteIconClass } from '@/shared/components/actionStyles';
import { usePaginatedRows } from '@/shared/hooks/usePaginatedRows';
import { useCreateSubject, useDeleteSubject, useUpdateSubject, useSubjects, type SubjectRow } from './useTeaching';

export default function SubjectsPage() {
  const [search, setSearch] = useState('');
  const [modalState, setModalState] = useState<{ open: boolean; editing: SubjectRow | null }>({
    open: false,
    editing: null,
  });
  const [code, setCode] = useState('');
  const [label, setLabel] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<SubjectRow | null>(null);
  const { data: subjects, isLoading } = useSubjects(search);
  const createSubject = useCreateSubject();
  const updateSubject = useUpdateSubject();
  const deleteSubject = useDeleteSubject();
  const { pageRows, ...pagination } = usePaginatedRows(subjects);
  const isSaving = createSubject.isPending || updateSubject.isPending;

  function openCreate() {
    setCode('');
    setLabel('');
    setError(null);
    setModalState({ open: true, editing: null });
  }

  function openEdit(subject: SubjectRow) {
    setCode(subject.code);
    setLabel(subject.label);
    setError(null);
    setModalState({ open: true, editing: subject });
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      const payload = { code: code.trim().toUpperCase(), label: label.trim() };
      if (modalState.editing) {
        await updateSubject.mutateAsync({ id: modalState.editing.id, payload });
      } else {
        await createSubject.mutateAsync(payload);
      }
      setModalState({ open: false, editing: null });
    } catch (requestError: unknown) {
      const response = (requestError as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } }).response;
      const validationMessage = response?.data?.errors ? Object.values(response.data.errors).flat()[0] : undefined;
      setError(validationMessage ?? response?.data?.message ?? 'Impossible d’enregistrer la matière.');
    }
  }

  async function handleConfirmDelete() {
    if (!toDelete) return;
    await deleteSubject.mutateAsync(toDelete.id);
    setToDelete(null);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <p className="text-xs font-medium tracking-wide text-primary uppercase">Référentiel</p>
          <h1 className="mt-1 font-display text-2xl font-semibold text-ink">Matières</h1>
          <p className="mt-1 text-sm text-ink-soft">Gérez les matières utilisées dans les affectations et les emplois du temps.</p>
        </div>
        <button type="button" onClick={openCreate} className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-dark">
          <Plus className="h-4 w-4" /> Nouvelle matière
        </button>
      </div>

      <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Rechercher une matière..." className="w-full max-w-sm rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />

      <div className="overflow-hidden rounded-xl border border-border bg-surface">
        <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-paper text-xs uppercase text-ink-soft">
            <tr><th className="px-4 py-3">Code</th><th className="px-4 py-3">Matière</th><th className="px-4 py-3">Statut</th><th className="px-4 py-3" /></tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading && <tr><td colSpan={4} className="px-4 py-10 text-center text-ink-soft">Chargement...</td></tr>}
            {!isLoading && (subjects ?? []).length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-14 text-center">
                  <BookOpen className="mx-auto h-8 w-8 text-ink-soft" />
                  <p className="mt-2 text-sm text-ink-soft">Aucune matière enregistrée.</p>
                </td>
              </tr>
            )}
            {pageRows.map((subject) => (
              <tr key={subject.id} className="hover:bg-paper">
                <td className="font-tabular px-4 py-3 text-ink-soft">{subject.code}</td>
                <td className="px-4 py-3 font-medium text-ink">{subject.label}</td>
                <td className="px-4 py-3"><span className="rounded-full bg-success-soft px-2.5 py-1 text-xs font-medium text-success">Active</span></td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1">
                    <button type="button" onClick={() => openEdit(subject)} className={editIconClass} aria-label="Modifier">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button type="button" onClick={() => setToDelete(subject)} className={deleteIconClass} aria-label={`Désactiver ${subject.label}`}>
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
        <Pagination {...pagination} onPageChange={pagination.setPage} />
      </div>

      {modalState.open && (
        <Modal title={modalState.editing ? 'Modifier la matière' : 'Nouvelle matière'} onClose={() => setModalState({ open: false, editing: null })}>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <p className="rounded-lg border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>}
            <Field label="Code">
              <input required value={code} onChange={(event) => setCode(event.target.value)} placeholder="MATH" className={inputClass} />
            </Field>
            <Field label="Libellé">
              <input required value={label} onChange={(event) => setLabel(event.target.value)} placeholder="Mathématiques" className={inputClass} />
            </Field>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setModalState({ open: false, editing: null })} className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-ink">Annuler</button>
              <button type="submit" disabled={isSaving} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-60">{isSaving ? 'Enregistrement...' : 'Enregistrer'}</button>
            </div>
          </form>
        </Modal>
      )}

      <ConfirmDialog
        open={toDelete !== null}
        title="Désactiver cette matière ?"
        message={toDelete ? `"${toDelete.label}" ne sera plus proposée dans les affectations et emplois du temps.` : ''}
        confirmLabel="Désactiver"
        onConfirm={handleConfirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}
