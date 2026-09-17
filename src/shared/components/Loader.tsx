import { BrandMark } from './BrandMark';

/**
 * Anneau émeraude qui tourne autour de la marque. Remplace la barre
 * horizontale et les petites icônes « spinner » éparpillées.
 */
export function Loader({ label = 'Chargement…', size = 72 }: { label?: string; size?: number }) {
  return (
    <div role="status" aria-live="polite" className="flex flex-col items-center gap-3">
      <span className="relative block" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox="0 0 72 72"
          className="absolute inset-0 animate-[spin-ring_0.9s_linear_infinite]"
          aria-hidden="true"
        >
          <circle cx="36" cy="36" r="31" fill="none" stroke="var(--color-track)" strokeWidth={5} />
          <circle
            cx="36"
            cy="36"
            r="31"
            fill="none"
            stroke="var(--color-primary)"
            strokeWidth={5}
            strokeLinecap="round"
            strokeDasharray="60 135"
          />
        </svg>
        <span className="absolute inset-0 grid place-items-center text-ink">
          <BrandMark variant="glyph" size={Math.round(size * 0.42)} />
        </span>
      </span>
      {label && <span className="text-[13px] font-medium text-ink-soft">{label}</span>}
    </div>
  );
}

/** Petit anneau pour les boutons et les zones compactes. */
export function Spinner({ size = 16, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={`animate-[spin-ring_0.9s_linear_infinite] ${className}`}
    >
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeOpacity={0.25} strokeWidth={3} />
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeDasharray="18 40" />
    </svg>
  );
}
