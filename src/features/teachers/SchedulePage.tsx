import { useMemo, useState } from 'react';
import { Download, Plus, Printer, Settings2, Trash2 } from 'lucide-react';
import { useClasses } from '@/features/classes/useClasses';
import { SearchableSelect } from '@/shared/components/SearchableSelect';
import { ConfirmDialog } from '@/shared/components/ConfirmDialog';
import { Pagination } from '@/shared/components/Pagination';
import { deleteIconClass } from '@/shared/components/actionStyles';
import { usePaginatedRows } from '@/shared/hooks/usePaginatedRows';
import { useSchoolSettings } from '@/features/settings/useSettings';
import { getApiErrorMessage } from '@/shared/lib/apiError';
import { downloadTimetablePdf, type TimetableCellData } from '@/shared/lib/pdf';
import { useTeachers } from './useTeachers';
import { DAYS, buildTimetable, hhmm, timeRange } from './timetable';
import { TimetableGrid } from './TimetableGrid';
import {
  useAssignments,
  useCreateAssignment,
  useCreateSchedule,
  useDeleteSchedule,
  useSchedules,
  useSubjects,
  type ScheduleRow,
} from './useTeaching';

type View = 'class' | 'teacher';

export default function SchedulePage() {
  // Ce qu'on regarde : l'emploi du temps d'une classe, ou celui d'un enseignant.
  const [view, setView] = useState<View>('class');
  const [viewClassId, setViewClassId] = useState<number | ''>('');
  const [viewTeacherId, setViewTeacherId] = useState<number | ''>('');

  const [showConfig, setShowConfig] = useState(false);
  const [classId, setClassIdState] = useState<number | ''>('');
  const [teacherId, setTeacherIdState] = useState<number | ''>('');
  const [subjectId, setSubjectIdState] = useState<number | ''>('');
  const [assignmentId, setAssignmentIdState] = useState<number | ''>('');
  const setClassId = (value: string | number) => setClassIdState(Number(value));
  const setTeacherId = (value: string | number) => setTeacherIdState(Number(value));
  const setSubjectId = (value: string | number) => setSubjectIdState(Number(value));
  const setAssignmentId = (value: string | number) => setAssignmentIdState(Number(value));
  const [day, setDay] = useState(1);
  const [startsAt, setStartsAt] = useState('08:00');
  const [endsAt, setEndsAt] = useState('09:00');
  const [room, setRoom] = useState('');
  const [hourlyRate, setHourlyRate] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<ScheduleRow | null>(null);

  const { data: classes } = useClasses();
  const { data: teachers } = useTeachers('active');
  const { data: subjects } = useSubjects();
  const { data: assignments } = useAssignments();
  const { data: settings } = useSchoolSettings();
  const { data: schedules } = useSchedules(
    view === 'class' ? { classId: viewClassId } : { teacherId: viewTeacherId },
  );
  const createAssignment = useCreateAssignment();
  const createSchedule = useCreateSchedule();
  const deleteSchedule = useDeleteSchedule();
  const { pageRows, ...pagination } = usePaginatedRows(schedules);

  const teacherRows = teachers?.data ?? [];
  const selectedAssignment = assignments?.find((assignment) => assignment.id === assignmentId);
  const filteredAssignments = useMemo(
    () =>
      (assignments ?? []).filter(
        (assignment) =>
          (!classId || assignment.class_id === classId) && (!subjectId || assignment.subject_id === subjectId) && (!teacherId || assignment.teacher_id === teacherId),
      ),
    [assignments, classId, subjectId, teacherId],
  );

  const selectionLabel =
    view === 'class'
      ? (classes ?? []).find((schoolClass) => schoolClass.id === viewClassId)?.label ?? 'Toutes les classes'
      : teacherRows.find((teacher) => teacher.id === viewTeacherId)?.full_name ?? 'Tous les enseignants';

  async function addAssignment() {
    setError(null);
    if (!teacherId || !classId || !subjectId || !hourlyRate) return setError('Sélectionnez l’enseignant, la classe, la matière et le tarif horaire.');
    try {
      const assignment = await createAssignment.mutateAsync({ teacher_id: Number(teacherId), class_id: Number(classId), subject_id: Number(subjectId), hourly_rate: Number(hourlyRate) });
      setAssignmentId(assignment.id);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Cette affectation existe déjà ou est invalide.'));
    }
  }

  async function addSchedule() {
    setError(null);
    if (!classId || !subjectId || !assignmentId) return setError('Sélectionnez une classe, une matière et une affectation.');
    try {
      await createSchedule.mutateAsync({ class_id: Number(classId), subject_id: Number(subjectId), teacher_assignment_id: Number(assignmentId), day_of_week: day, starts_at: startsAt, ends_at: endsAt, room: room || undefined });
      // Ce qu'on vient de planifier doit se voir : la vue suit la classe saisie.
      if (view === 'class' && viewClassId !== classId) setViewClassId(Number(classId));
    } catch (requestError) {
      // Le serveur dit précisément ce qui coince (classe occupée, enseignant déjà en cours ailleurs).
      setError(getApiErrorMessage(requestError, 'Ce créneau chevauche un cours existant.'));
    }
  }

  async function handleConfirmDelete() {
    if (!toDelete) return;
    await deleteSchedule.mutateAsync(toDelete.id);
    setToDelete(null);
  }

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
    const rows = schedules ?? [];
    const timetable = buildTimetable(rows);
    const cells: Record<string, TimetableCellData[]> = {};

    for (const row of rows) {
      const key = `${timeRange(row)}|${row.day_of_week}`;
      cells[key] = [
        ...(cells[key] ?? []),
        {
          subject: row.subject?.label ?? '—',
          detail: view === 'class' ? (row.assignment?.teacher?.full_name ?? '—') : (row.school_class?.label ?? '—'),
          room: row.room,
        },
      ];
    }

    await downloadTimetablePdf(
      { slots: timetable.slots, days: timetable.days.map((index) => ({ index, label: DAYS[index - 1] })), cells },
      `Emploi du temps — ${selectionLabel}`,
      view === 'class' ? 'Par classe' : 'Par enseignant',
      settings ?? null,
    );
  }

  const nothingToExport = (schedules ?? []).length === 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-medium tracking-wide text-primary uppercase">Organisation pédagogique</p>
          <h1 className="mt-1 font-display text-2xl font-semibold text-ink">Emploi du temps</h1>
          <p className="mt-1 text-sm text-ink-soft">Consultez le planning d’une classe ou d’un enseignant, puis exportez-le.</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={exportCsv}
            disabled={nothingToExport}
            className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-ink transition hover:bg-paper disabled:opacity-50"
          >
            <Download className="h-4 w-4" /> CSV
          </button>
          <button
            type="button"
            onClick={exportPdf}
            disabled={nothingToExport}
            className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-ink transition hover:bg-paper disabled:opacity-50"
          >
            <Printer className="h-4 w-4" /> PDF
          </button>
        </div>
      </div>

      {error && <div className="rounded-lg border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">{error}</div>}

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
          <TimetableGrid rows={schedules ?? []} view={view} />
        </div>
      </section>

      <div>
        <button
          type="button"
          onClick={() => setShowConfig((open) => !open)}
          aria-expanded={showConfig}
          className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-ink transition hover:bg-paper"
        >
          <Settings2 className="h-4 w-4" />
          {showConfig ? 'Masquer la configuration' : 'Configurer les affectations et les créneaux'}
        </button>
      </div>

      {showConfig && (
        <>
          <section className="rounded-xl border border-border bg-surface p-4">
            <h2 className="font-display text-base font-semibold text-ink">Affectation et tarif horaire</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <SearchableSelect value={teacherId} onChange={setTeacherId} placeholder="Choisir un enseignant" options={teacherRows.map((teacher) => ({ value: teacher.id, label: teacher.full_name }))} />
              <SearchableSelect value={classId} onChange={setClassId} placeholder="Choisir une classe" options={(classes ?? []).map((schoolClass) => ({ value: schoolClass.id, label: schoolClass.label }))} />
              <SearchableSelect value={subjectId} onChange={setSubjectId} placeholder="Choisir une matière" options={(subjects ?? []).map((subject) => ({ value: subject.id, label: subject.label, hint: subject.code }))} />
              <input type="number" min="0.01" step="0.01" value={hourlyRate} onChange={(e) => setHourlyRate(e.target.value)} placeholder="Tarif horaire (XOF)" className="rounded-lg border border-border bg-paper px-3 py-2 text-sm" />
            </div>
            <button type="button" onClick={addAssignment} className="mt-3 flex items-center gap-2 rounded-lg border border-primary px-3 py-2 text-sm font-medium text-primary hover:bg-primary-soft">
              <Plus className="h-4 w-4" /> Enregistrer l’affectation
            </button>
          </section>

          <section className="rounded-xl border border-border bg-surface p-4">
            <h2 className="font-display text-base font-semibold text-ink">Ajouter un créneau</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
              <SearchableSelect value={classId} onChange={setClassId} placeholder="Classe" options={(classes ?? []).map((schoolClass) => ({ value: schoolClass.id, label: schoolClass.label }))} />
              <SearchableSelect value={subjectId} onChange={setSubjectId} placeholder="Matière" options={(subjects ?? []).map((subject) => ({ value: subject.id, label: subject.label }))} />
              <SearchableSelect value={assignmentId} onChange={setAssignmentId} placeholder="Affectation" options={filteredAssignments.map((assignment) => ({ value: assignment.id, label: `${assignment.teacher?.full_name ?? 'Enseignant'} · ${assignment.hourly_rate} XOF/h` }))} />
              <select value={day} onChange={(e) => setDay(Number(e.target.value))} className="rounded-lg border border-border bg-paper px-3 py-2 text-sm">
                {DAYS.slice(0, 6).map((label, index) => (
                  <option key={label} value={index + 1}>
                    {label}
                  </option>
                ))}
              </select>
              <input type="time" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} className="rounded-lg border border-border bg-paper px-3 py-2 text-sm" />
              <input type="time" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} className="rounded-lg border border-border bg-paper px-3 py-2 text-sm" />
            </div>
            <div className="mt-3 flex gap-3">
              <input value={room} onChange={(e) => setRoom(e.target.value)} placeholder="Salle (optionnel)" className="rounded-lg border border-border bg-paper px-3 py-2 text-sm" />
              <button type="button" onClick={addSchedule} className="flex items-center gap-2 rounded-lg bg-success px-3 py-2 text-sm font-medium text-on-success">
                <Plus className="h-4 w-4" /> Ajouter au planning
              </button>
            </div>
            {selectedAssignment && <p className="mt-2 text-xs text-ink-soft">Tarif appliqué : {selectedAssignment.hourly_rate} XOF par heure pour cette classe.</p>}
          </section>

          <section className="overflow-hidden rounded-xl border border-border bg-surface">
            <div className="border-b border-border px-4 py-3">
              <h2 className="font-display text-base font-semibold text-ink">Créneaux planifiés · {selectionLabel}</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-paper text-xs text-ink-soft uppercase">
                  <tr>
                    <th className="px-4 py-3">Jour</th>
                    <th className="px-4 py-3">Horaire</th>
                    <th className="px-4 py-3">Classe</th>
                    <th className="px-4 py-3">Matière</th>
                    <th className="px-4 py-3">Enseignant</th>
                    <th className="px-4 py-3">Salle</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {pageRows.map((schedule) => (
                    <tr key={schedule.id}>
                      <td className="px-4 py-3">{DAYS[schedule.day_of_week - 1]}</td>
                      <td className="font-tabular px-4 py-3">{timeRange(schedule)}</td>
                      <td className="px-4 py-3">{schedule.school_class?.label ?? '—'}</td>
                      <td className="px-4 py-3">{schedule.subject?.label ?? '—'}</td>
                      <td className="px-4 py-3">{schedule.assignment?.teacher?.full_name ?? '—'}</td>
                      <td className="px-4 py-3">{schedule.room ?? '—'}</td>
                      <td className="px-4 py-3 text-right">
                        <button type="button" onClick={() => setToDelete(schedule)} className={deleteIconClass} aria-label="Désactiver le créneau">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {(schedules ?? []).length === 0 && <p className="px-4 py-8 text-center text-sm text-ink-soft">Aucun créneau pour cette sélection.</p>}
            <Pagination {...pagination} onPageChange={pagination.setPage} />
          </section>
        </>
      )}

      <ConfirmDialog
        open={toDelete !== null}
        title="Désactiver ce créneau ?"
        message={toDelete ? `Le créneau du ${DAYS[toDelete.day_of_week - 1]} ${timeRange(toDelete)} sera retiré de l’emploi du temps.` : ''}
        confirmLabel="Désactiver"
        onConfirm={handleConfirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}
