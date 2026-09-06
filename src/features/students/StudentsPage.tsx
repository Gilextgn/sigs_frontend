import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { GraduationCap, Search, UserPlus } from 'lucide-react';
import { Pagination } from '@/shared/components/Pagination';
import { usePaginatedRows } from '@/shared/hooks/usePaginatedRows';
import { useStudents } from './useStudents';
import { StudentFormModal } from './StudentFormModal';

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
  const [modalOpen, setModalOpen] = useState(false);
  const { data, isLoading, isError } = useStudents({ search });
  const { pageRows, ...pagination } = usePaginatedRows(data?.data);

  const location = useLocation();
  const navigate = useNavigate();

  // Permet au dashboard (bouton "Nouvel élève") d'ouvrir directement le formulaire.
  useEffect(() => {
    if ((location.state as { openCreate?: boolean } | null)?.openCreate) {
      setModalOpen(true);
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location, navigate]);

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
          onClick={() => setModalOpen(true)}
          className="flex shrink-0 items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-dark"
        >
          <UserPlus className="h-4 w-4" />
          Nouvel élève
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-surface">
        <table className="w-full text-left text-sm">
          <thead className="bg-paper text-xs font-medium tracking-wide text-ink-soft uppercase">
            <tr>
              <th className="px-4 py-3">Matricule</th>
              <th className="px-4 py-3">Élève</th>
              <th className="px-4 py-3">Classe</th>
              <th className="px-4 py-3">Tuteur</th>
              <th className="px-4 py-3">Statut</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-ink-soft">
                  Chargement...
                </td>
              </tr>
            )}
            {isError && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-danger">
                  Impossible de charger les élèves. Vérifiez que l'API est démarrée.
                </td>
              </tr>
            )}
            {!isLoading && !isError && (data?.data.length ?? 0) === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-14 text-center">
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
              </tr>
            ))}
          </tbody>
        </table>
        <Pagination {...pagination} onPageChange={pagination.setPage} />
      </div>

      {modalOpen && <StudentFormModal onClose={() => setModalOpen(false)} />}
    </div>
  );
}
