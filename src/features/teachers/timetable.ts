import type { ScheduleRow } from './useTeaching';

export const DAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

/** « 10:30:00 » → « 10:30 » : l'heure telle qu'on la lit sur un emploi du temps. */
export function hhmm(time: string | null | undefined): string {
  return (time ?? '').slice(0, 5);
}

export function timeRange(row: ScheduleRow): string {
  return `${hhmm(row.starts_at)} - ${hhmm(row.ends_at)}`;
}

function minutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

/**
 * Couleurs pastel d'emploi du temps (comme sur un planning affiché en classe),
 * texte foncé lisible en thème clair comme sombre. Une matière garde toujours
 * la même couleur.
 */
export const SUBJECT_COLORS: [number, number, number][] = [
  [253, 230, 138], // jaune
  [125, 211, 252], // bleu
  [251, 207, 232], // rose
  [253, 186, 116], // orange
  [134, 239, 172], // vert
  [199, 210, 254], // lavande
  [252, 165, 165], // rouge clair
  [153, 246, 228], // turquoise
  [217, 249, 157], // citron
  [254, 215, 170], // pêche
  [216, 180, 254], // mauve
  [203, 213, 225], // gris bleu
];

export function subjectColor(row: ScheduleRow): [number, number, number] {
  const key = row.subject?.label ?? String(row.subject_id ?? '');
  let hash = 0;
  for (const char of key) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return SUBJECT_COLORS[hash % SUBJECT_COLORS.length];
}

export const rgb = ([r, g, b]: [number, number, number]) => `rgb(${r} ${g} ${b})`;

export interface TimeBlock {
  /** Index de la première plage couverte. */
  row: number;
  /** Nombre de plages couvertes (un cours de 2 h sur des plages de 1 h = 2). */
  span: number;
  entries: ScheduleRow[];
}

export interface TimeGrid {
  /** Plages consécutives, bornées par tous les débuts et fins de cours. */
  slots: { start: string; end: string; minutes: number }[];
  /** Jours (1 = lundi) où au moins un cours est planifié. */
  days: number[];
  /** Blocs par jour : un cours occupe toute sa durée, comme sur un planning papier. */
  blocks: Record<number, TimeBlock[]>;
}

/**
 * Grille d'emploi du temps : chaque début ou fin de cours découpe la
 * journée en plages ; un cours s'étend sur les plages qu'il couvre. Deux cours
 * qui se chevauchent le même jour (groupes d'une classe, ou conflit à
 * corriger) partagent le même bloc.
 */
export function buildTimeGrid(rows: ScheduleRow[]): TimeGrid {
  const bounds = [...new Set(rows.flatMap((row) => [hhmm(row.starts_at), hhmm(row.ends_at)]))].sort();
  const slots = bounds.slice(0, -1).map((start, index) => ({ start, end: bounds[index + 1], minutes: minutes(bounds[index + 1]) - minutes(start) }));
  const days = [...new Set(rows.map((row) => row.day_of_week))].sort((a, b) => a - b);
  const blocks: Record<number, TimeBlock[]> = {};

  for (const day of days) {
    const dayRows = rows.filter((row) => row.day_of_week === day).sort((a, b) => hhmm(a.starts_at).localeCompare(hhmm(b.starts_at)));
    const merged: { start: string; end: string; entries: ScheduleRow[] }[] = [];
    for (const row of dayRows) {
      const last = merged[merged.length - 1];
      if (last && hhmm(row.starts_at) < last.end) {
        last.entries.push(row);
        if (hhmm(row.ends_at) > last.end) last.end = hhmm(row.ends_at);
      } else {
        merged.push({ start: hhmm(row.starts_at), end: hhmm(row.ends_at), entries: [row] });
      }
    }
    blocks[day] = merged.map((block) => {
      const row = bounds.indexOf(block.start);
      return { row, span: bounds.indexOf(block.end) - row, entries: block.entries };
    });
  }

  return { slots, days, blocks };
}
