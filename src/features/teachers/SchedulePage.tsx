import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Download, Printer, Settings2 } from 'lucide-react';
import { useAuth } from '@/features/auth/AuthContext';
import { useClasses } from '@/features/classes/useClasses';
import { SearchableSelect } from '@/shared/components/SearchableSelect';
import { useSchoolSettings } from '@/features/settings/useSettings';
import { downloadTimetablePdf } from '@/shared/lib/pdf';
import { useTeachers } from './useTeachers';
import { DAYS, buildTimeGrid, hhmm, subjectColor } from './timetable';
import { TimetableGrid, scheduleDetail } from './TimetableGrid';
import { useSchedules } from './useTeaching';

type View = 'class' | 'teacher';

/** Consultation de l'emploi du temps ; la saisie se fait sur l'écran « Affectations et créneaux ». */
export default function SchedulePage() {
  const { hasPermission } = useAuth();
  // Ce qu'on regarde : l'emploi du temps d'une classe, ou celui d'un enseignant.
  const [view, setView] = useState<View>('class');
  const [viewClassId, setViewClassId] = useState<number | ''>('');
  const [viewTeacherId, setViewTeacherId] = useState<number | ''>('');

  const { data: classes } = useClasses();
  const { data: teachers } = useTeachers('active');
  const { data: settings } = useSchoolSettings();
  const { data: schedules } = useSchedules(view === 'class' ? { classId: viewClassId } : { teacherId: viewTeacherId });

  const teacherRows = teachers?.data ?? [];
  const selectionLabel =
    view === 'class'
      ? (classes ?? []).find((schoolClass) => schoolClass.id === viewClassId)?.label ?? 'Toutes les classes'
      : teacherRows.find((teacher) => teacher.id === viewTeacherId)?.full_name ?? 'Tous les enseignants';
  // Une classe (ou un enseignant) précise : la case dit l'enseignant (ou la classe) ; sinon les deux.
  const specific = view === 'class' ? !!viewClassId : !!viewTeacherId;
  const nothingToExport = (schedules ?? []).length === 0;
  const conflicts = (schedules ?? []).filter((schedule) => schedule.conflict).length;

  /** Les exports reprennent exactement la vue affichée, jamais l'écran. */
  function exportCsv() {
    const header = ['Jour', 'Heure début', 'Heure fin', 'Classe', 'Matière', 'Enseignant', 'Salle'];
    const rows = (schedules ?? []).map((schedule) => [
      DAYS[schedule.day_of_week - 1],
      hhmm(schedule.starts_at),
      hhmm(schedule.ends_at),
      schedule.school_class?.label ?? '',
      schedule.subject?.label ?? '',
      schedule.assignment?.teacher?.full_name ?? '',
      schedule.room ?? '',
    ]);
    const csv = [header, ...rows].map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(';')).join('\n');
    const blob = new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `emploi-du-temps-${selectionLabel.toLowerCase().replaceAll(' ', '-')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function exportPdf() {
    const grid = buildTimeGrid(schedules ?? []);
    await downloadTimetablePdf(
      {
        slots: grid.slots.map((slot) => `${slot.start.replace(':', 'h')} - ${slot.end.replace(':', 'h')}`),
        days: grid.days.map((index) => ({ index, label: DAYS[index - 1] })),
        blocks: grid.days.flatMap((day, dayIndex) =>
          grid.blocks[day].map((block) => ({
            day: dayIndex,
            row: block.row,
            span: block.span,
            text: block.entries.map((entry) => [entry.subject?.label ?? '—', scheduleDetail(entry, view, specific), entry.room ? `Salle ${entry.room}` : null].filter(Boolean).join('\n')).join('\n\n'),
            color: subjectColor(block.entries[0]),
          })),
        ),
      },
      `Emploi du temps — ${selectionLabel}`,
      view === 'class' ? 'Par classe' : 'Par enseignant',
      settings ?? null,
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-medium tracking-wide text-primary uppercase">Organisation pédagogique</p>
          <h1 className="mt-1 font-display text-2xl font-semibold text-ink">Emploi du temps</h1>
          <p className="mt-1 text-sm text-ink-soft">Consultez le planning d’une classe ou d’un enseignant, puis exportez-le.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {hasPermission('teachers.manage') && (
            <Link to="/schedule/setup" className="flex items-center gap-2 rounded-lg border border-primary px-3 py-2 text-sm font-medium text-primary transition hover:bg-primary-soft">
              <Settings2 className="h-4 w-4" /> Affectations et créneaux
            </Link>
          )}
          <button type="button" onClick={exportCsv} disabled={nothingToExport} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-ink transition hover:bg-paper disabled:opacity-50">
            <Download className="h-4 w-4" /> CSV
          </button>
          <button type="button" onClick={exportPdf} disabled={nothingToExport} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-ink transition hover:bg-paper disabled:opacity-50">
            <Printer className="h-4 w-4" /> PDF
          </button>
        </div>
      </div>

      {conflicts > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {conflicts} créneau(x) en conflit (même enseignant ou même classe à la même heure), saisis avant le contrôle automatique.
          {hasPermission('teachers.manage') && (
            <Link to="/schedule/setup" className="font-semibold underline">
              Les corriger
            </Link>
          )}
        </div>
      )}

      <section className="rounded-xl border border-border bg-surface">
        <div className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-3">
          <h2 className="font-display text-base font-semibold text-ink">Voir l’emploi du temps</h2>
          <div className="flex rounded-lg border border-border p-0.5">
            {(
              [
                ['class', 'Par classe'],
                ['teacher', 'Par enseignant'],
              ] as [View, string][]
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setView(key)}
                aria-pressed={view === key}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${view === key ? 'bg-primary text-on-primary' : 'text-ink-soft hover:text-ink'}`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="min-w-[220px] flex-1 sm:max-w-xs">
            {view === 'class' ? (
              <SearchableSelect
                value={viewClassId}
                onChange={(value) => setViewClassId(Number(value))}
                clearable
                placeholder="Toutes les classes"
                options={(classes ?? []).map((schoolClass) => ({ value: schoolClass.id, label: schoolClass.label }))}
              />
            ) : (
              <SearchableSelect
                value={viewTeacherId}
                onChange={(value) => setViewTeacherId(Number(value))}
                clearable
                placeholder="Tous les enseignants"
                options={teacherRows.map((teacher) => ({ value: teacher.id, label: teacher.full_name }))}
              />
            )}
          </div>
        </div>
        <div className="p-4">
          <TimetableGrid rows={schedules ?? []} view={view} specific={specific} />
        </div>
      </section>
    </div>
  );
}
