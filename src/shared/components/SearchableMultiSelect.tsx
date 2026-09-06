import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';

export interface MultiSelectOption {
  value: number;
  label: string;
}

interface SearchableMultiSelectProps {
  options: MultiSelectOption[];
  selected: number[];
  onChange: (values: number[]) => void;
  maxHeightClass?: string;
}

/**
 * Liste à cocher avec recherche + "Tout sélectionner / Tout décocher",
 * utilisée pour affecter un frais à plusieurs classes en un clic.
 * Cases à cocher en taille normale (pas les grandes cases par défaut du navigateur).
 */
export function SearchableMultiSelect({ options, selected, onChange, maxHeightClass = 'max-h-52' }: SearchableMultiSelectProps) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    if (!query.trim()) return options;
    const q = query.trim().toLowerCase();
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query]);

  const allFilteredSelected = filtered.length > 0 && filtered.every((o) => selected.includes(o.value));

  function toggle(value: number) {
    onChange(selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value]);
  }

  function toggleAll() {
    if (allFilteredSelected) {
      const filteredValues = new Set(filtered.map((o) => o.value));
      onChange(selected.filter((v) => !filteredValues.has(v)));
    } else {
      const merged = new Set([...selected, ...filtered.map((o) => o.value)]);
      onChange([...merged]);
    }
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-paper">
      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        <Search className="h-3.5 w-3.5 shrink-0 text-ink-soft" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher une classe..."
          className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-ink-soft"
        />
        <button
          type="button"
          onClick={toggleAll}
          className="shrink-0 rounded-md px-2 py-1 text-xs font-medium text-primary transition hover:bg-primary-soft"
        >
          {allFilteredSelected ? 'Tout décocher' : 'Tout cocher'}
        </button>
      </div>
      <div className={`${maxHeightClass} overflow-y-auto p-2`}>
        {filtered.length === 0 && <p className="px-2 py-3 text-center text-xs text-ink-soft">Aucun résultat.</p>}
        <div className="grid grid-cols-2 gap-x-2 gap-y-0.5">
          {filtered.map((option) => (
            <label key={option.value} className="flex cursor-pointer items-center gap-2 rounded px-1.5 py-1 text-xs text-ink transition hover:bg-surface">
              <input
                type="checkbox"
                checked={selected.includes(option.value)}
                onChange={() => toggle(option.value)}
                className="h-3.5 w-3.5 shrink-0 rounded border-border accent-primary"
              />
              <span className="truncate">{option.label}</span>
            </label>
          ))}
        </div>
      </div>
      <div className="border-t border-border px-3 py-1.5 text-[11px] text-ink-soft">
        {selected.length} classe(s) sélectionnée(s)
      </div>
    </div>
  );
}
