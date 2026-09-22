import type { ScheduleRow } from './useTeaching';

export const DAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

/** « 10:30:00 » → « 10:30 » : l'heure telle qu'on la lit sur un emploi du temps. */
export function hhmm(time: string | null | undefined): string {
  return (time ?? '').slice(0, 5);
}

export function timeRange(row: ScheduleRow): string {
  return `${hhmm(row.starts_at)} - ${hhmm(row.ends_at)}`;
}

export interface Timetable {
  /** Plages horaires rencontrées, de la plus matinale à la plus tardive. */
  slots: string[];
  /** Jours (1 = lundi) où au moins un cours est planifié. */
  days: number[];
  /** Cours d'une plage et d'un jour : plusieurs si la classe a des groupes. */
  cell: (slot: string, day: number) => ScheduleRow[];
}

/**
 * Range les créneaux en grille hebdomadaire : une ligne par plage horaire,
 * une colonne par jour — la forme sous laquelle un emploi du temps se lit,
 * à l'écran comme sur le PDF affiché en salle des profs.
 */
export function buildTimetable(rows: ScheduleRow[]): Timetable {
  const sorted = [...rows].sort((a, b) => hhmm(a.starts_at).localeCompare(hhmm(b.starts_at)) || a.day_of_week - b.day_of_week);

  const slots: string[] = [];
  for (const row of sorted) {
    const slot = timeRange(row);
    if (!slots.includes(slot)) slots.push(slot);
  }

  const days = [...new Set(rows.map((row) => row.day_of_week))].sort((a, b) => a - b);

  return {
    slots,
    days,
    cell: (slot, day) => sorted.filter((row) => timeRange(row) === slot && row.day_of_week === day),
  };
}
