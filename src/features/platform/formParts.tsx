import type { ReactNode } from 'react';

/** Bloc de formulaire à étiquette : jamais un <label> englobant (il avalerait les taps sur les boutons). */
export function Block({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div>
      <p className="mb-1.5 text-sm font-medium text-ink">{label}</p>
      {children}
      {hint && <p className="mt-1 text-xs text-ink-soft">{hint}</p>}
    </div>
  );
}

export function Toggle({ checked, onChange, label, description }: { checked: boolean; onChange: (value: boolean) => void; label: string; description?: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-start gap-3 rounded-xl border border-border bg-paper px-3.5 py-3 text-left transition hover:border-primary/40"
    >
      <span className={`mt-0.5 h-5 w-9 shrink-0 rounded-full p-0.5 transition ${checked ? 'bg-primary' : 'bg-track'}`}>
        <span className={`block h-4 w-4 rounded-full bg-white shadow transition ${checked ? 'translate-x-4' : ''}`} />
      </span>
      <span>
        <span className="block text-sm font-medium text-ink">{label}</span>
        {description && <span className="block text-xs text-ink-soft">{description}</span>}
      </span>
    </button>
  );
}

export function ErrorBox({ message }: { message: string | null }) {
  return message ? <div className="rounded-lg border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">{message}</div> : null;
}
