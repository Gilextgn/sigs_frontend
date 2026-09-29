import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Search, UserPlus } from 'lucide-react';
import { useAuth } from '@/features/auth/AuthContext';
import { useClasses } from '@/features/classes/useClasses';
import { useStudents } from './useStudents';
import { StudentFormModal } from './StudentFormModal';
import { StudentsTable } from './StudentsTable';

/** Élèves d'une classe, avec une recherche limitée à cette classe. */
export default function ClassStudentsPage() {
  const { classId } = useParams();
  const id = Number(classId);
  const { hasPermission } = useAuth();
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState(false);
  const { data: classes } = useClasses();
  const schoolClass = classes?.find((c) => c.id === id);
  const { data, isLoading, isError } = useStudents({ classId: id, perPage: 2000 }, !!id);

  // Filtre instantané dans la classe (noms déchiffrés déjà reçus).
  const needle = search.trim().toLocaleLowerCase('fr-FR');
  const rows = (data?.data ?? []).filter(
    (student) => !needle || student.full_name.toLocaleLowerCase('fr-FR').includes(needle) || student.matricule.toLocaleLowerCase('fr-FR').includes(needle) || (student.guardian?.full_name ?? '').toLocaleLowerCase('fr-FR').includes(needle),
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <Link to="/students" className="inline-flex items-center gap-1 text-sm text-ink-soft no-underline hover:text-primary">
            <ArrowLeft className="h-4 w-4" /> Toutes les classes
          </Link>
          <h1 className="mt-1 font-display text-2xl font-semibold text-ink">{schoolClass?.label ?? 'Classe'}</h1>
          <p className="text-sm text-ink-soft">
            {data ? `${data.data.length} élève(s)` : '…'}
            {schoolClass?.parent ? ` · groupe de ${schoolClass.parent.label}` : ''}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-ink-soft" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher dans cette classe…"
              className="w-full rounded-lg border border-border bg-surface py-2 pr-3 pl-9 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>
          {hasPermission('students.create') && (
            <button onClick={() => setCreating(true)} className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-on-primary transition hover:bg-primary-dark">
              <UserPlus className="h-4 w-4" /> Nouvel élève
            </button>
          )}
        </div>
      </div>

      <StudentsTable
        rows={rows}
        isLoading={isLoading}
        isError={isError}
        showClass={false}
        emptyLabel={needle ? `Aucun élève de cette classe ne correspond à « ${search.trim()} ».` : 'Aucun élève dans cette classe.'}
      />

      {creating && <StudentFormModal editing={null} onClose={() => setCreating(false)} />}
    </div>
  );
}
