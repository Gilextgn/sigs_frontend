/**
 * Marque SIGS : monogramme « S » vert sur pavé noir. Seul endroit où le logo
 * est dessiné — barre latérale, chargement et écran de connexion le
 * reprennent tous d'ici.
 *
 * Les fichiers de public/images/branding (SVG, icônes, grand format) sont la
 * même géométrie : toute retouche ici doit y être répercutée.
 */
interface BrandMarkProps {
  size?: number;
  /** "tile" : pavé graphite (fond clair ou sidebar) ; "glyph" : trait seul, couleur héritée. */
  variant?: 'tile' | 'glyph';
  className?: string;
}

const S_PATH = 'M32 14 H20 A6 6 0 0 0 20 26 H28 A6 6 0 0 1 28 38 H16';

/** Le tracé est plus haut que large : on le recentre et on l'assied dans le pavé. */
const S_TRANSFORM = 'translate(24 24) scale(0.9) translate(-24 -26)';

export function BrandMark({ size = 36, variant = 'tile', className }: BrandMarkProps) {
  if (variant === 'glyph') {
    return (
      <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true" className={className}>
        <path
          d={S_PATH}
          transform={S_TRANSFORM}
          fill="none"
          stroke="currentColor"
          strokeWidth={5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  return (
    <svg width={size} height={size} viewBox="0 0 48 48" role="img" aria-label="SIGS" className={className}>
      <rect x="2" y="2" width="44" height="44" rx="12" fill="#0E1117" />
      <path
        d={S_PATH}
        transform={S_TRANSFORM}
        fill="none"
        stroke="#2FD98A"
        strokeWidth={5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
