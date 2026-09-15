import { useEffect, useRef, useState } from 'react';
import { Loader2, Search, User, UserPlus } from 'lucide-react';
import { useStudents, type StudentRow } from './useStudents';

/**
 * Combobox de recherche d'élève existant (matricule ou nom), branché sur
 * l'endpoint /students?search= déjà utilisé par l'écran Élèves. Volontairement
 * distinct du SearchableSelect partagé : celui-ci est 100% client-filtré sur
 * une liste déjà chargée (classes, enseignants...), alors qu'ici la liste
 * peut compter des centaines d'élèves — la recherche doit passer par l'API.
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
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedQuery(query.trim()), 250);
    return () => clearTimeout(timeout);
  }, [query]);

  const { data, isFetching } = useStudents({ search: debouncedQuery });
  const results = debouncedQuery.length >= 2 ? (data?.data ?? []) : [];

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <div className="flex items-center gap-2 rounded-lg border border-border bg-paper px-3 py-2">
        <Search className="h-4 w-4 shrink-0 text-ink-soft" />
        <input
          ref={inputRef}
          value={query}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          placeholder={placeholder}
          className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-ink-soft"
        />
        {isFetching && <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-ink-soft" />}
      </div>

      {open && debouncedQuery.length >= 2 && (
        <div className="absolute z-30 mt-1.5 w-full overflow-hidden rounded-lg border border-border bg-surface shadow-xl">
          <ul className="max-h-64 overflow-y-auto py-1">
            {!isFetching && results.length === 0 && (
              <li className="px-3 py-4 text-center">
                <p className="text-xs text-ink-soft">Aucun élève ne correspond à «&nbsp;{debouncedQuery}&nbsp;».</p>
                {onCreateNew && (
                  <>
                    <p className="mt-1 text-xs text-ink-soft">Il n'est donc pas encore enregistré.</p>
                    <button
                      type="button"
                      onClick={() => {
                        onCreateNew(debouncedQuery);
                        setOpen(false);
                      }}
                      className="mt-3 inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white transition hover:bg-primary-dark"
                    >
                      <UserPlus className="h-4 w-4" />
                      Créer un élève
                    </button>
                  </>
                )}
              </li>
            )}
            {results.map((student) => (
              <li key={student.id}>
                <button
                  type="button"
                  onClick={() => {
                    onSelect(student);
                    setOpen(false);
                    setQuery('');
                  }}
                  className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm transition hover:bg-paper"
                >
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary-soft text-primary">
                    <User className="h-4 w-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-ink">{student.full_name}</span>
                    <span className="block truncate text-xs text-ink-soft">
                      {student.matricule} · {student.class?.label ?? 'Sans classe'}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      {debouncedQuery.length > 0 && debouncedQuery.length < 2 && (
        <p className="mt-1 text-xs text-ink-soft">Continuez à taper (2 caractères minimum).</p>
      )}
    </div>
  );
}
