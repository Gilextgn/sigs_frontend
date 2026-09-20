import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Pencil, Search } from 'lucide-react';
import { useAuth } from '@/features/auth/AuthContext';
import { useClasses } from '@/features/classes/useClasses';
import { formatNumber } from '@/shared/lib/format';

/**
 * Choix d'une classe en deux temps : le cycle, puis la classe — affichée
 * directement dès que le cycle est choisi, avec recherche.
 *
 * Aucune liste déroulante : les classes sont rendues dans le flux de la page,
 * donc jamais rognées par une modale qui défile ni difficiles à toucher sur
 * mobile. Une fois la classe choisie, le sélecteur se replie en résumé.
 */
export function ClassPicker({
  value,
  onChange,
  disabled = false,
}: {
  value: number | '';
  onChange: (classId: number) => void;
  disabled?: boolean;
}) {
  const { hasPermission } = useAuth();
  const { data: classes = [], isLoading } = useClasses();
  const [cycleId, setCycleId] = useState<number | 'all'>('all');
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState(false);

  const active = useMemo(() => classes.filter((c) => c.is_active), [classes]);
  const selected = classes.find((c) => c.id === Number(value));

  // Les cycles proviennent des classes elles-mêmes : pas de droit ni d'appel en plus.
  const cycles = useMemo(() => {
    const byId = new Map<number, { id: number; label: string; count: number }>();
    for (const item of active) {
      if (!item.cycle) continue;
      const entry = byId.get(item.cycle.id) ?? { id: item.cycle.id, label: item.cycle.label, count: 0 };
      entry.count += 1;
      byId.set(item.cycle.id, entry);
    }
    return [...byId.values()].sort((a, b) => a.id - b.id);
  }, [active]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return active.filter(
      (item) =>
        (cycleId === 'all' || item.cycle?.id === cycleId) &&
        (!needle || item.label.toLowerCase().includes(needle) || item.code.toLowerCase().includes(needle)),
    );
  }, [active, cycleId, query]);

  if (isLoading) {
    return <div className="h-24 animate-pulse rounded-xl bg-paper" />;
  }

  if (active.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border px-4 py-5 text-center text-sm text-ink-soft">
        Aucune classe n'existe encore.{' '}
        {hasPermission('classes.manage') ? (
          <Link to="/classes" className="font-semibold text-primary">
            Créer une classe
          </Link>
        ) : (
          "Demandez à un administrateur d'en créer une."
        )}
      </div>
    );
  }

  // Classe choisie : on replie en résumé, modifiable d'un clic.
  if (selected && !editing) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-xl border border-primary/30 bg-primary-soft/50 px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-ink">{selected.label}</p>
          <p className="truncate text-xs text-ink-soft">
            {selected.cycle?.label ?? 'Sans cycle'} · scolarité {formatNumber(selected.tuition_amount)} XOF
          </p>
        </div>
        {!disabled && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="flex shrink-0 items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs font-medium text-ink-soft transition hover:text-ink"
          >
            <Pencil className="h-3.5 w-3.5" />
            Changer
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {/* 1. Le cycle */}
      <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1" role="tablist" aria-label="Cycle">
        {[{ id: 'all' as const, label: 'Tous', count: active.length }, ...cycles].map((cycle) => (
          <button
            key={cycle.id}
            type="button"
            role="tab"
            aria-selected={cycleId === cycle.id}
            onClick={() => setCycleId(cycle.id)}
            className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium whitespace-nowrap transition ${
              cycleId === cycle.id ? 'border-primary bg-primary text-on-primary' : 'border-border bg-surface text-ink-soft hover:border-primary/40 hover:text-ink'
            }`}
          >
            {cycle.label}
            <span className={`ml-1.5 ${cycleId === cycle.id ? 'opacity-80' : 'text-ink-muted'}`}>{cycle.count}</span>
          </button>
        ))}
      </div>

      {/* 2. La classe, avec recherche dès qu'il y en a plusieurs */}
      <div className="overflow-hidden rounded-xl border border-border">
        {visible.length > 5 || query ? (
          <div className="flex items-center gap-2 border-b border-border bg-paper px-3 py-2">
            <Search className="h-3.5 w-3.5 shrink-0 text-ink-muted" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher une classe…"
              aria-label="Rechercher une classe"
              className="w-full min-w-0 bg-transparent text-sm text-ink outline-none placeholder:text-ink-muted"
            />
          </div>
        ) : null}

        <ul className="max-h-52 divide-y divide-border overflow-y-auto" role="listbox" aria-label="Classes">
          {visible.length === 0 && <li className="px-4 py-4 text-center text-xs text-ink-soft">Aucune classe ne correspond.</li>}
          {visible.map((item) => {
            const isSelected = item.id === Number(value);
            return (
              <li key={item.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  disabled={disabled}
                  onClick={() => {
                    onChange(item.id);
                    setEditing(false);
                    setQuery('');
                  }}
                  className={`flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left transition hover:bg-paper ${isSelected ? 'bg-primary-soft/50' : ''}`}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-ink">{item.label}</span>
                    <span className="block truncate text-xs text-ink-soft">{item.cycle?.label ?? 'Sans cycle'}</span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    <span className="font-tabular text-xs text-ink-soft">{formatNumber(item.tuition_amount)}</span>
                    {isSelected && <Check className="h-4 w-4 text-primary" />}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
