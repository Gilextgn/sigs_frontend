import { useEffect, useMemo, useState } from 'react';

export const DEFAULT_PAGE_SIZE = 10;

/**
 * Pagine un tableau déjà chargé (10 éléments par page par défaut). Revient
 * automatiquement à la page 1 quand la référence du tableau change (nouvelle
 * recherche, nouveau filtre, données rechargées après une mutation), mais
 * conserve la page courante entre deux rendus qui réutilisent les mêmes
 * données (ex. ouverture d'une modale).
 */
export function usePaginatedRows<T>(rows: T[] | undefined, pageSize: number = DEFAULT_PAGE_SIZE) {
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
    // La dépendance volontaire est la référence du tableau : on veut
    // repartir en page 1 uniquement quand les données changent réellement.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows]);

  const all = rows ?? [];
  const totalItems = all.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(page, totalPages);

  const pageRows = useMemo(
    () => all.slice((safePage - 1) * pageSize, safePage * pageSize),
    [all, safePage, pageSize],
  );

  return { page: safePage, setPage, totalPages, totalItems, pageSize, pageRows };
}
