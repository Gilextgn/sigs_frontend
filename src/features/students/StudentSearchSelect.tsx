import { useEffect, useState } from 'react';
import { Loader2, Search, User, UserPlus } from 'lucide-react';
import { useStudents, type StudentRow } from './useStudents';

/**
 * Recherche d'élève existant (matricule ou nom), branchée sur l'endpoint
 * /students?search= déjà utilisé par l'écran Élèves. Volontairement distincte
 * du SearchableSelect partagé : celui-ci est 100% client-filtré sur une liste
 * déjà chargée (classes, enseignants...), alors qu'ici la liste peut compter
 * des centaines d'élèves — la recherche doit passer par l'API.
 *
 * Les résultats sont rendus dans le flux, et non en dropdown positionné en
 * absolu : à l'intérieur d'une modale qui défile, un dropdown absolu se fait
 * rogner par le conteneur de scroll et devient inutilisable sur petit écran.
 */
export function StudentSearchSelect({
  onSelect,
  onCreateNew,
  placeholder = 'Matricule ou nom de l’élève...',
}: {
  onSelect: (student: StudentRow) => void;
  /** Proposé quand la recherche ne renvoie rien : l'élève n'existe pas encore. */
  onCreateNew?: (searchedName: string) => void;
  placeholder?: string;
}) {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedQuery(query.trim()), 250);
    return () => clearTimeout(timeout);
  }, [query]);

  const hasQuery = debouncedQuery.length >= 2;
  const { data, isFetching } = useStudents({ search: debouncedQuery });
  const results = hasQuery ? (data?.data ?? []) : [];

  return (
    <div>
      <div className="flex items-center gap-2 rounded-lg border border-border bg-paper px-3 py-2">
        <Search className="h-4 w-4 shrink-0 text-ink-soft" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="w-full min-w-0 bg-transparent text-sm text-ink outline-none placeholder:text-ink-soft"
        />
        {isFetching && <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-ink-soft" />}
      </div>

      {debouncedQuery.length > 0 && !hasQuery && (
        <p className="mt-1.5 text-xs text-ink-soft">Continuez à taper (2 caractères minimum).</p>
      )}

      {hasQuery && (
        <div className="mt-2 overflow-hidden rounded-lg border border-border">
          {!isFetching && results.length === 0 ? (
            <div className="px-3 py-4 text-center">
              <p className="text-xs text-ink-soft">
                Aucun élève ne correspond à «&nbsp;{debouncedQuery}&nbsp;».
              </p>
              {onCreateNew && (
                <>
                  <p className="mt-1 text-xs text-ink-soft">Il n'est donc pas encore enregistré.</p>
                  <button
                    type="button"
                    onClick={() => onCreateNew(debouncedQuery)}
                    className="mt-3 inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white transition hover:bg-primary-dark"
                  >
                    <UserPlus className="h-4 w-4" />
                    Créer un élève
                  </button>
                </>
              )}
            </div>
          ) : (
            <ul className="max-h-56 divide-y divide-border overflow-y-auto">
              {results.map((student) => (
                <li key={student.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onSelect(student);
                      setQuery('');
                    }}
                    className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left transition hover:bg-paper"
                  >
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary-soft text-primary">
                      <User className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-ink">{student.full_name}</span>
                      <span className="block truncate text-xs text-ink-soft">
                        {student.matricule} · {student.class?.label ?? 'Sans classe'}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
