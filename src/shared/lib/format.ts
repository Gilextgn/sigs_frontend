const amountFormatter = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });

/**
 * 1 250 000 — sans devise. Le format français sépare les milliers par une
 * espace fine insécable que Space Grotesk dessine presque sans largeur
 * (« 1250000 ») : on la remplace par une espace insécable normale.
 */
export function formatNumber(value: number | string | null | undefined): string {
  return amountFormatter.format(Number(value ?? 0)).replace(/\u202f/g, '\u00a0');
}

/** Remplaçant direct des formateurs Intl locaux des écrans. */
export const currency = { format: (value: number | string) => formatNumber(value) };

/** 1 250 000 XOF */
export function formatAmount(value: number | string | null | undefined): string {
  return `${formatNumber(value)} XOF`;
}

export function formatDate(value: string, style: 'medium' | 'long' | 'short' = 'medium'): string {
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: style }).format(new Date(value));
}

export function formatTime(value: string): string {
  return new Intl.DateTimeFormat('fr-FR', { timeStyle: 'short' }).format(new Date(value));
}
