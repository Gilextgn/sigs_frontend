import { AlertTriangle, CalendarDays } from 'lucide-react';
import { DAYS, buildTimeGrid, hhmm, rgb, subjectColor, timeRange } from './timetable';
import type { ScheduleRow } from './useTeaching';

/** Ce qu'on écrit sous la matière : l'enseignant pour une classe, la classe pour un enseignant, les deux sinon. */
export function scheduleDetail(row: ScheduleRow, view: 'class' | 'teacher', specific: boolean): string {
  const teacher = row.assignment?.teacher?.full_name ?? '—';
  const schoolClass = row.school_class?.label ?? '—';
  if (!specific) return `${schoolClass} · ${teacher}`;
  return view === 'class' ? teacher : schoolClass;
}

/**
 * L'emploi du temps tel qu'on l'affiche en classe : les heures en lignes, les
 * jours en colonnes, chaque cours sur toute sa durée et coloré par matière.
 * Sur mobile, chaque jour devient une liste.
 */
export function TimetableGrid({ rows, view, specific }: { rows: ScheduleRow[]; view: 'class' | 'teacher'; specific: boolean }) {
  const grid = buildTimeGrid(rows);

  if (rows.length === 0) {
    return (
      <div className="grid place-items-center gap-2 py-12 text-sm text-ink-soft">
        <CalendarDays className="h-8 w-8" />
        Aucun cours planifié pour cette sélection.
      </div>
    );
  }

  // Cellules déjà couvertes par un cours commencé plus haut (rowSpan).
  const covered = new Set<string>();
  for (const day of grid.days) {
    for (const block of grid.blocks[day]) {
      for (let i = 1; i < block.span; i += 1) covered.add(`${block.row + i}|${day}`);
    }
  }

  return (
    <>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full table-fixed border-collapse text-sm">
          <thead>
            <tr>
              <th className="w-32 border border-ink/20 bg-paper px-2 py-2 text-xs font-semibold tracking-wide text-ink uppercase">Horaire</th>
              {grid.days.map((day) => (
                <th key={day} className="border border-ink/20 bg-paper px-2 py-2 text-sm font-semibold text-ink">
                  {DAYS[day - 1]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {grid.slots.map((slot, rowIndex) => (
              // Hauteur proportionnelle à la durée : un cours de 2 h se voit deux fois plus haut.
              <tr key={slot.start} style={{ height: Math.max(28, slot.minutes * 1.1) }}>
                <th scope="row" className="font-tabular border border-ink/20 bg-surface px-2 text-center text-xs font-semibold whitespace-nowrap text-ink">
                  {slot.start.replace(':', 'h')} - {slot.end.replace(':', 'h')}
                </th>
                {grid.days.map((day) => {
                  if (covered.has(`${rowIndex}|${day}`)) return null;
                  const block = grid.blocks[day].find((candidate) => candidate.row === rowIndex);
                  if (!block) return <td key={day} className="border border-ink/20" />;
                  const conflict = block.entries.some((entry) => entry.conflict);
                  return (
                    <td
                      key={day}
                      rowSpan={block.span}
                      className={`border border-ink/20 p-0 align-middle ${conflict ? 'outline-2 -outline-offset-2 outline-danger' : ''}`}
                    >
                      <div className="flex h-full flex-col">
                        {block.entries.map((entry) => (
                          <div
                            key={entry.id}
                            style={{ backgroundColor: rgb(subjectColor(entry)) }}
                            className="flex flex-1 flex-col items-center justify-center px-2 py-1.5 text-center text-[#111]"
                            title={entry.conflict ?? `${timeRange(entry)}`}
                          >
                            <p className="text-sm leading-tight font-semibold">{entry.subject?.label ?? '—'}</p>
                            <p className="text-xs opacity-80">{scheduleDetail(entry, view, specific)}</p>
                            {entry.room && <p className="text-[11px] opacity-70">Salle {entry.room}</p>}
                            {entry.conflict && (
                              <p className="mt-0.5 flex items-center gap-1 text-[11px] font-semibold text-[#b91c1c]">
                                <AlertTriangle className="h-3 w-3" /> Conflit
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="space-y-4 md:hidden">
        {grid.days.map((day) => (
          <div key={day}>
            <p className="mb-1.5 text-xs font-semibold tracking-wide text-ink-soft uppercase">{DAYS[day - 1]}</p>
            <ul className="space-y-1.5">
              {grid.blocks[day].flatMap((block) =>
                block.entries.map((row) => (
                  <li key={row.id} style={{ backgroundColor: rgb(subjectColor(row)) }} className="flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-[#111]">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{row.subject?.label ?? '—'}</p>
                      <p className="truncate text-xs opacity-80">
                        {scheduleDetail(row, view, specific)}
                        {row.room ? ` · Salle ${row.room}` : ''}
                      </p>
                    </div>
                    <span className="font-tabular shrink-0 text-xs">
                      {hhmm(row.starts_at)} - {hhmm(row.ends_at)}
                    </span>
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
