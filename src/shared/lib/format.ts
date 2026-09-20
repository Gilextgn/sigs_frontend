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

const MS_PER_DAY = 86_400_000;

/** Nombre de jours calendaires entre aujourd'hui et une date (négatif = passé). */
export function daysFromToday(value: string): number {
  const target = new Date(value);
  target.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / MS_PER_DAY);
}

/** « il y a 3 h », « hier », « il y a 12 j » — pour une activité passée. */
export function timeAgo(value: string | null | undefined): string {
  if (!value) return 'jamais';
  const minutes = Math.round((Date.now() - new Date(value).getTime()) / 60_000);
  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `il y a ${hours} h`;
  const days = Math.round(hours / 24);
  if (days === 1) return 'hier';
  if (days < 45) return `il y a ${days} j`;
  return formatDate(value);
}
