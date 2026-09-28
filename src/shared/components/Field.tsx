import type { ReactNode } from 'react';

export function Field({
  label,
  children,
  error,
}: {
  label: string;
  children: ReactNode;
  error?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-ink">{label}</span>
      {children}
      {error && <span className="mt-1 block text-xs text-danger">{error}</span>}
    </label>
  );
}

export const inputClass =
  'w-full rounded-lg border border-border bg-paper px-3 py-2 text-sm text-ink outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20';

/** Numéro de téléphone : chiffres seulement, 10 au maximum (« 01 66… » → « 0166… »). */
export function digitsOnly(value: string): string {
  return value.replace(/\D/g, '').slice(0, 10);
}

/** Propriétés communes des champs téléphone (10 chiffres). */
export const phoneInputProps = { inputMode: 'numeric', pattern: '\\d{10}', maxLength: 10, title: '10 chiffres', placeholder: '0166189877' } as const;
