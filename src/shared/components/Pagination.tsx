import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  page: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

/**
 * Barre de pagination générique utilisée par toutes les listes de
 * l'application (10 lignes par page, voir useIdlePaginatedRows). N'affiche
 * rien s'il n'y a rien à paginer.
 */
export function Pagination({ page, totalPages, totalItems, pageSize, onPageChange }: PaginationProps) {
  if (totalItems === 0) return null;

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalItems);

  return (
    <div className="flex flex-col items-center justify-between gap-3 border-t border-border px-4 py-3 sm:flex-row">
      <p className="text-xs text-ink-soft">
        <span className="font-tabular font-medium text-ink">
          {start}–{end}
        </span>{' '}
        sur <span className="font-tabular font-medium text-ink">{totalItems}</span>
      </p>
      {totalPages > 1 && (
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-ink-soft transition hover:bg-paper hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            Précédent
          </button>
          <span className="font-tabular px-2 text-xs font-medium text-ink">
            Page {page} / {totalPages}
          </span>
          <button
            type="button"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-ink-soft transition hover:bg-paper hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
          >
            Suivant
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
