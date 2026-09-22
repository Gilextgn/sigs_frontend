import { CalendarDays } from 'lucide-react';
import { DAYS, buildTimetable } from './timetable';
import type { ScheduleRow } from './useTeaching';

/**
 * L'emploi du temps tel qu'on le lit : les heures en lignes, les jours en
 * colonnes. Sur mobile, chaque jour devient un bloc — un tableau de six
 * colonnes y serait illisible.
 */
export function TimetableGrid({ rows, view }: { rows: ScheduleRow[]; view: 'class' | 'teacher' }) {
  const timetable = buildTimetable(rows);
  const detail = (row: ScheduleRow) => (view === 'class' ? (row.assignment?.teacher?.full_name ?? '—') : (row.school_class?.label ?? '—'));

  if (rows.length === 0) {
    return (
      <div className="grid place-items-center gap-2 py-12 text-sm text-ink-soft">
        <CalendarDays className="h-8 w-8" />
        Aucun cours planifié pour cette sélection.
      </div>
    );
  }

  return (
    <>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="bg-paper text-xs tracking-wide text-ink-soft uppercase">
            <tr>
              <th className="border border-border px-3 py-2.5 text-center">Horaire</th>
              {timetable.days.map((day) => (
                <th key={day} className="border border-border px-3 py-2.5 text-center">
                  {DAYS[day - 1]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {timetable.slots.map((slot) => (
              <tr key={slot}>
                <th scope="row" className="font-tabular border border-border bg-paper px-3 py-2.5 text-center text-xs font-semibold whitespace-nowrap text-ink-soft">
                  {slot}
                </th>
                {timetable.days.map((day) => {
                  const cells = timetable.cell(slot, day);
                  return (
                    <td key={day} className="border border-border px-3 py-2 align-top">
                      {cells.map((row) => (
                        <div key={row.id} className="rounded-lg bg-primary-soft/50 px-2.5 py-1.5 not-first:mt-1.5">
                          <p className="text-sm font-semibold text-ink">{row.subject?.label ?? '—'}</p>
                          <p className="text-xs text-ink-soft">{detail(row)}</p>
                          {row.room && <p className="text-[11px] text-ink-muted">Salle {row.room}</p>}
                        </div>
                      ))}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="space-y-4 md:hidden">
        {timetable.days.map((day) => (
          <div key={day}>
            <p className="mb-1.5 text-xs font-semibold tracking-wide text-ink-soft uppercase">{DAYS[day - 1]}</p>
            <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border">
              {timetable.slots.flatMap((slot) =>
                timetable.cell(slot, day).map((row) => (
                  <li key={row.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-ink">{row.subject?.label ?? '—'}</p>
                      <p className="truncate text-xs text-ink-soft">
                        {detail(row)}
                        {row.room ? ` · Salle ${row.room}` : ''}
                      </p>
                    </div>
                    <span className="font-tabular shrink-0 text-xs text-ink-soft">{slot}</span>
                  </li>
                )),
              )}
            </ul>
          </div>
        ))}
      </div>
    </>
  );
}
