import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Search, X } from 'lucide-react';

export interface SearchableOption {
  value: string | number;
  label: string;
  hint?: string;
}

interface SearchableSelectProps {
  options: SearchableOption[];
  value: string | number | '';
  onChange: (value: string | number) => void;
  placeholder?: string;
  disabled?: boolean;
  clearable?: boolean;
  emptyLabel?: string;
}

/**
 * Select avec recherche intégrée (combobox), utilisé partout dans l'app à
 * la place des <select> natifs dès que la liste peut devenir longue
 * (classes, élèves, enseignants, rôles...).
 */
export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = 'Sélectionner...',
  disabled,
  clearable = false,
  emptyLabel = 'Aucun résultat',
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = options.find((o) => String(o.value) === String(value));

  const filtered = useMemo(() => {
    if (!query.trim()) return options;
    const q = query.trim().toLowerCase();
    return options.filter((o) => o.label.toLowerCase().includes(q) || o.hint?.toLowerCase().includes(q));
  }, [options, query]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className={`flex w-full items-center justify-between gap-2 rounded-lg border border-border bg-paper px-3 py-2 text-left text-sm text-ink outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-50 ${
          open ? 'border-primary ring-2 ring-primary/20' : ''
        }`}
      >
        <span className={`truncate ${selected ? 'text-ink' : 'text-ink-soft'}`}>
          {selected ? selected.label : placeholder}
        </span>
        <span className="flex shrink-0 items-center gap-1">
          {clearable && selected && (
            <span
              role="button"
              tabIndex={-1}
              onClick={(e) => {
                e.stopPropagation();
                onChange('');
              }}
              className="rounded p-0.5 text-ink-soft hover:bg-border hover:text-ink"
            >
              <X className="h-3.5 w-3.5" />
            </span>
          )}
          <ChevronDown className={`h-4 w-4 text-ink-soft transition-transform ${open ? 'rotate-180' : ''}`} />
        </span>
      </button>

      {open && (
        <div className="absolute z-30 mt-1.5 w-full overflow-hidden rounded-lg border border-border bg-surface shadow-xl">
          <div className="flex items-center gap-2 border-b border-border px-3 py-2">
            <Search className="h-3.5 w-3.5 shrink-0 text-ink-soft" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher..."
              className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-ink-soft"
            />
          </div>
          <ul className="max-h-56 overflow-y-auto py-1">
            {filtered.length === 0 && (
              <li className="px-3 py-2.5 text-center text-xs text-ink-soft">{emptyLabel}</li>
            )}
            {filtered.map((option) => {
              const isSelected = String(option.value) === String(value);
              return (
                <li key={option.value}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange(option.value);
                      setOpen(false);
                      setQuery('');
                    }}
                    className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm transition hover:bg-paper ${
                      isSelected ? 'font-medium text-primary' : 'text-ink'
                    }`}
                  >
                    <span className="min-w-0">
                      <span className="block truncate">{option.label}</span>
                      {option.hint && <span className="block truncate text-xs text-ink-soft">{option.hint}</span>}
                    </span>
                    {isSelected && <Check className="h-3.5 w-3.5 shrink-0" />}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
