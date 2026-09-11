import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Eye, GraduationCap, Pencil, Search, Trash2, UserPlus } from 'lucide-react';
import { ConfirmDialog } from '@/shared/components/ConfirmDialog';
import { Pagination } from '@/shared/components/Pagination';
import { editIconClass, deleteIconClass, viewIconClass } from '@/shared/components/actionStyles';
import { usePaginatedRows } from '@/shared/hooks/usePaginatedRows';
import { useDeleteStudent, useStudents, type StudentRow } from './useStudents';
import { StudentFormModal } from './StudentFormModal';
import { StudentDetailModal } from './StudentDetailModal';

const STATUS_LABELS: Record<string, string> = {
  active: 'Actif',
  transferred: 'Transféré',
  graduated: 'Diplômé',
  archived: 'Archivé',
};

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-success-soft text-success',
  transferred: 'bg-gold-soft text-gold',
  graduated: 'bg-primary-soft text-primary-dark',
  archived: 'bg-danger-soft text-danger',
};

export default function StudentsPage() {
  const [search, setSearch] = useState('');
  const [modalState, setModalState] = useState<{ open: boolean; editing: StudentRow | null }>({
    open: false,
    editing: null,
  });
  const [viewing, setViewing] = useState<StudentRow | null>(null);
  const [toDelete, setToDelete] = useState<StudentRow | null>(null);
  const { data, isLoading, isError } = useStudents({ search });
  const deleteStudent = useDeleteStudent();
  const { pageRows, ...pagination } = usePaginatedRows(data?.data);

  const location = useLocation();
  const navigate = useNavigate();

  // Permet au dashboard (bouton "Nouvel élève") d'ouvrir directement le formulaire.
  useEffect(() => {
    if ((location.state as { openCreate?: boolean } | null)?.openCreate) {
      setModalState({ open: true, editing: null });
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location, navigate]);

  async function handleConfirmDelete() {
    if (!toDelete) return;
    await deleteStudent.mutateAsync(toDelete.id);
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
            placeholder="Rechercher un matricule..."
            className="w-full rounded-lg border border-border bg-surface py-2 pr-3 pl-9 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <button
          onClick={() => setModalState({ open: true, editing: null })}
          className="flex shrink-0 items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-dark"
        >
          <UserPlus className="h-4 w-4" />
          Nouvel élève
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-surface">
        <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-paper text-xs font-medium tracking-wide text-ink-soft uppercase">
            <tr>
              <th className="px-4 py-3">Matricule</th>
              <th className="px-4 py-3">Élève</th>
              <th className="px-4 py-3">Classe</th>
              <th className="px-4 py-3">Tuteur</th>
              <th className="px-4 py-3">Statut</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-ink-soft">
                  Chargement...
                </td>
              </tr>
            )}
            {isError && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-danger">
                  Impossible de charger les élèves. Vérifiez que l'API est démarrée.
                </td>
              </tr>
            )}
            {!isLoading && !isError && (data?.data.length ?? 0) === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-14 text-center">
                  <GraduationCap className="mx-auto h-8 w-8 text-ink-soft" />
                  <p className="mt-2 text-sm text-ink-soft">Aucun élève inscrit pour le moment.</p>
                </td>
              </tr>
            )}
            {pageRows.map((student) => (
              <tr key={student.id} className="transition hover:bg-paper">
                <td className="font-tabular px-4 py-3 text-ink-soft">{student.matricule}</td>
                <td className="px-4 py-3 font-medium text-ink">{student.full_name}</td>
                <td className="px-4 py-3 text-ink-soft">{student.class?.label ?? '—'}</td>
                <td className="px-4 py-3 text-ink-soft">{student.guardian?.full_name ?? '—'}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLES[student.status] ?? 'bg-primary-soft text-primary-dark'}`}>
                    {STATUS_LABELS[student.status] ?? student.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1">
                    <button onClick={() => setViewing(student)} className={viewIconClass} aria-label="Voir">
                      <Eye className="h-4 w-4" />
                    </button>
                    <button onClick={() => setModalState({ open: true, editing: student })} className={editIconClass} aria-label="Modifier">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button onClick={() => setToDelete(student)} className={deleteIconClass} aria-label="Supprimer">
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
        <StudentFormModal editing={modalState.editing} onClose={() => setModalState({ open: false, editing: null })} />
      )}

      {viewing && <StudentDetailModal student={viewing} onClose={() => setViewing(null)} />}

      <ConfirmDialog
        open={toDelete !== null}
        title="Supprimer cet élève ?"
        message={
          toDelete
            ? `${toDelete.full_name} sera définitivement supprimé. S'il a des paiements enregistrés, archivez-le plutôt via son statut.`
            : ''
        }
        confirmLabel="Supprimer"
        onConfirm={handleConfirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}
