/**
 * Blocs de chargement réutilisables. Ils reprennent la forme du contenu
 * attendu plutôt qu'un simple texte "Chargement...", ce qui évite le saut
 * de mise en page au moment où la donnée arrive.
 */
export function SkeletonBlock({ className = 'h-3.5 w-24' }: { className?: string }) {
  return <span className={`block animate-pulse rounded bg-border ${className}`} />;
}

// Largeurs alternées : une grille de barres strictement identiques donne un
// rendu artificiel.
const COLUMN_WIDTHS = ['w-24', 'w-32', 'w-20', 'w-28', 'w-16', 'w-24'];

export function SkeletonTableRows({ rows = 4, columns }: { rows?: number; columns: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <tr key={rowIndex}>
          {Array.from({ length: columns }).map((_, columnIndex) => (
            <td key={columnIndex} className="px-4 py-3">
              <SkeletonBlock className={`h-3.5 ${COLUMN_WIDTHS[columnIndex % COLUMN_WIDTHS.length]}`} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}
