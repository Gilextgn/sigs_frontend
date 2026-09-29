import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ChevronRight, GraduationCap, Repeat, Search, UserPlus, Users } from 'lucide-react';
import { useAuth } from '@/features/auth/AuthContext';
import { useClasses } from '@/features/classes/useClasses';
import { useStudents } from './useStudents';
import { StudentFormModal } from './StudentFormModal';
import { ReEnrollStudentModal } from './ReEnrollStudentModal';
import { StudentsTable } from './StudentsTable';

/**
 * Les élèves rangés par classe : un cadre par classe (ordre pédagogique), qui
 * ouvre la liste de la classe. La recherche, elle, porte sur toute l'école.
 */
export default function StudentsPage() {
  const { hasPermission } = useAuth();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [creating, setCreating] = useState(false);
  const [reEnrollOpen, setReEnrollOpen] = useState(false);
  // Les noms sont chiffrés en base : chaque recherche parcourt tout l'effectif
  // côté serveur, on attend donc la fin de la frappe.
  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(timeout);
  }, [search]);

  const { data: classes, isLoading: classesLoading } = useClasses();
  const searching = debouncedSearch.length > 0;
  const { data: results, isLoading, isError } = useStudents({ search: debouncedSearch, perPage: 2000 }, searching);

  const location = useLocation();
  const navigate = useNavigate();

  // Permet au dashboard (bouton "Nouvel élève") d'ouvrir directement le formulaire.
  useEffect(() => {
    if ((location.state as { openCreate?: boolean } | null)?.openCreate) {
      setCreating(true);
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location, navigate]);

  const totalStudents = (classes ?? []).reduce((sum, c) => sum + (c.students_count ?? 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div className="relative w-full sm:max-w-sm">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-ink-soft" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un élève dans toute l'école…"
            className="w-full rounded-lg border border-border bg-surface py-2 pr-3 pl-9 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <div className="flex shrink-0 gap-2">
          {hasPermission('students.reenroll') && (
            <button onClick={() => setReEnrollOpen(true)} className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-ink transition hover:bg-paper">
              <Repeat className="h-4 w-4" />
              Réinscription
            </button>
          )}
          {hasPermission('students.create') && (
            <button onClick={() => setCreating(true)} className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-on-primary transition hover:bg-primary-dark">
              <UserPlus className="h-4 w-4" />
              Nouvel élève
            </button>
          )}
        </div>
      </div>

      {searching ? (
        <StudentsTable rows={results?.data ?? []} isLoading={isLoading} isError={isError} emptyLabel={`Aucun élève ne correspond à « ${debouncedSearch} ».`} />
      ) : (
        <>
          <p className="text-sm text-ink-soft">
            {totalStudents} élève(s) actif(s) dans {(classes ?? []).length} classe(s). Cliquez sur une classe pour voir ses élèves.
          </p>
          {classesLoading && <div className="h-32 animate-pulse rounded-xl bg-paper" />}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {(classes ?? []).map((schoolClass) => (
              <Link
                key={schoolClass.id}
                to={`/students/class/${schoolClass.id}`}
                className="group flex items-center justify-between gap-3 rounded-xl border border-border bg-surface p-4 no-underline transition hover:border-primary/50 hover:shadow-md"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary">
                    <GraduationCap className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-display text-base font-semibold text-ink">{schoolClass.label}</p>
                    <p className="flex items-center gap-1 text-xs text-ink-soft">
                      <Users className="h-3.5 w-3.5" /> {schoolClass.students_count ?? 0} élève(s)
                      {schoolClass.cycle && <span>· {schoolClass.cycle.label}</span>}
                    </p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-ink-soft transition group-hover:translate-x-0.5 group-hover:text-primary" />
              </Link>
            ))}
          </div>
          {!classesLoading && (classes ?? []).length === 0 && <p className="rounded-xl border border-border bg-surface px-4 py-10 text-center text-sm text-ink-soft">Aucune classe créée pour le moment.</p>}
        </>
      )}

      {creating && <StudentFormModal editing={null} onClose={() => setCreating(false)} />}

      {reEnrollOpen && (
        <ReEnrollStudentModal
          onClose={() => setReEnrollOpen(false)}
          onCreateStudent={() => {
            setReEnrollOpen(false);
            setCreating(true);
          }}
        />
      )}
    </div>
  );
}
