import { useEffect, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import { useAuth } from '@/features/auth/AuthContext';
import { useStudents } from '@/features/students/useStudents';
import { usePaymentDesk } from '@/features/payments/PaymentDesk';
import { Spinner } from './Loader';

/**
 * Recherche d'élève accessible depuis tous les écrans (Ctrl+K / ⌘K).
 * Un résultat ouvre la fiche : solde, historique, Encaisser.
 *
 * Les noms étant chiffrés, le serveur parcourt tout l'effectif à chaque
 * recherche : d'où l'attente de fin de frappe et les 2 caractères minimum.
 */
export function GlobalSearch() {
  const { hasPermission } = useAuth();
  const { openStudent } = usePaymentDesk();
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [open, setOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const allowed = hasPermission('students.view');

  useEffect(() => {
    const timeout = setTimeout(() => setDebounced(query.trim()), 250);
    return () => clearTimeout(timeout);
  }, [query]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setMobileOpen(true);
        setOpen(true);
        requestAnimationFrame(() => inputRef.current?.focus());
      }
    }
    function onClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setMobileOpen(false);
      }
    }
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onClick);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onClick);
    };
  }, []);

  const active = allowed && debounced.length >= 2;
  const { data, isFetching } = useStudents({ search: debounced }, active);
  const results = active ? (data?.data ?? []).slice(0, 6) : [];

  if (!allowed) return null;

  function choose(id: number) {
    openStudent(id);
    setQuery('');
    setOpen(false);
    setMobileOpen(false);
    inputRef.current?.blur();
  }

  function onInputKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === 'Enter' && results[highlight]) {
      e.preventDefault();
      choose(results[highlight].id);
    } else if (e.key === 'Escape') {
      setOpen(false);
      setMobileOpen(false);
      inputRef.current?.blur();
    }
  }

  const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);

  return (
    <div ref={containerRef} className="relative">
      {/* Mobile : une loupe qui déplie un champ pleine largeur. */}
      <button
        type="button"
        onClick={() => {
          setMobileOpen(true);
          setOpen(true);
          requestAnimationFrame(() => inputRef.current?.focus());
        }}
        aria-label="Rechercher un élève"
        className="grid h-9 w-9 place-items-center rounded-full text-ink-soft transition hover:bg-paper hover:text-primary md:hidden"
      >
        <Search className="h-[17px] w-[17px]" />
      </button>

      <div
        className={`${
          mobileOpen ? 'fixed inset-x-0 top-0 z-50 flex h-16 items-center border-b border-border bg-surface px-3' : 'hidden'
        } md:static md:flex md:h-auto md:border-0 md:bg-transparent md:px-0`}
      >
        <div className="flex w-full items-center gap-2 rounded-lg border border-border bg-paper px-3 py-2 transition focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 md:w-64 lg:w-80">
          <Search className="h-4 w-4 shrink-0 text-ink-muted" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setHighlight(0);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={onInputKey}
            placeholder="Rechercher un élève…"
            aria-label="Rechercher un élève par nom ou matricule"
            className="w-full min-w-0 bg-transparent text-sm text-ink outline-none placeholder:text-ink-muted"
          />
          {isFetching && active ? (
            <Spinner size={14} className="shrink-0 text-primary" />
          ) : (
            <kbd className="hidden shrink-0 rounded border border-border bg-surface px-1.5 py-0.5 font-sans text-[10px] font-medium text-ink-muted lg:inline">
              {isMac ? '⌘K' : 'Ctrl K'}
            </kbd>
          )}
          {mobileOpen && (
            <button
              type="button"
              onClick={() => {
                setMobileOpen(false);
                setOpen(false);
              }}
              aria-label="Fermer la recherche"
              className="shrink-0 text-ink-soft md:hidden"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {open && query.trim().length > 0 && (
        <div
          className={`${
            mobileOpen ? 'fixed inset-x-3 top-[60px]' : 'absolute top-[calc(100%+8px)] left-0'
          } z-50 overflow-hidden rounded-xl border border-border bg-surface shadow-2xl animate-[dropdown-in_0.15s_ease-out] md:absolute md:inset-x-auto md:top-[calc(100%+8px)] md:left-0 md:w-96`}
        >
          {query.trim().length < 2 ? (
            <p className="px-4 py-3 text-xs text-ink-soft">Tapez au moins 2 caractères.</p>
          ) : !isFetching && results.length === 0 && active ? (
            <p className="px-4 py-4 text-center text-sm text-ink-soft">Aucun élève pour « {debounced} ».</p>
          ) : (
            <ul className="max-h-80 overflow-y-auto p-1.5">
              {results.map((student, index) => (
                <li key={student.id}>
                  <button
                    type="button"
                    onMouseEnter={() => setHighlight(index)}
                    onClick={() => choose(student.id)}
                    className={`flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition ${
                      index === highlight ? 'bg-paper' : ''
                    }`}
                  >
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary-soft text-[11px] font-bold text-primary-dark">
                      {student.first_name[0]}
                      {student.last_name[0]}
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
