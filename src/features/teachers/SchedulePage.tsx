import { useMemo, useState } from 'react';
import { Download, Plus, Printer, CalendarDays, Trash2 } from 'lucide-react';
import { useClasses } from '@/features/classes/useClasses';
import { SearchableSelect } from '@/shared/components/SearchableSelect';
import { ConfirmDialog } from '@/shared/components/ConfirmDialog';
import { Pagination } from '@/shared/components/Pagination';
import { deleteIconClass } from '@/shared/components/actionStyles';
import { usePaginatedRows } from '@/shared/hooks/usePaginatedRows';
import { useTeachers } from './useTeachers';
import {
  useAssignments,
  useCreateAssignment,
  useCreateSchedule,
  useCreateSubject,
  useDeleteSchedule,
  useSchedules,
  useSubjects,
  type ScheduleRow,
} from './useTeaching';

const days = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

export default function SchedulePage() {
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
  const [subjectLabel, setSubjectLabel] = useState('');
  const [subjectCode, setSubjectCode] = useState('');
  const [hourlyRate, setHourlyRate] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<ScheduleRow | null>(null);

  const { data: classes } = useClasses();
  const { data: teachers } = useTeachers('active');
  const { data: subjects } = useSubjects();
  const { data: assignments } = useAssignments();
  const { data: schedules } = useSchedules(classId);
  const createSubject = useCreateSubject();
  const createAssignment = useCreateAssignment();
  const createSchedule = useCreateSchedule();
  const deleteSchedule = useDeleteSchedule();
  const { pageRows, ...pagination } = usePaginatedRows(schedules);

  const selectedAssignment = assignments?.find((assignment) => assignment.id === assignmentId);
  const filteredAssignments = useMemo(
    () => (assignments ?? []).filter((assignment) => (!classId || assignment.class_id === classId) && (!subjectId || assignment.subject_id === subjectId) && (!teacherId || assignment.teacher_id === teacherId)),
    [assignments, classId, subjectId, teacherId],
  );

  async function addSubject() {
    setError(null);
    if (!subjectCode || !subjectLabel) return setError('Renseignez le code et le nom de la matière.');
    try {
      await createSubject.mutateAsync({ code: subjectCode, label: subjectLabel });
      setSubjectCode('');
      setSubjectLabel('');
    } catch {
      setError('Impossible de créer cette matière.');
    }
  }

  async function addAssignment() {
    setError(null);
    if (!teacherId || !classId || !subjectId || !hourlyRate) return setError('Sélectionnez l’enseignant, la classe, la matière et le tarif horaire.');
    try {
      const assignment = await createAssignment.mutateAsync({ teacher_id: Number(teacherId), class_id: Number(classId), subject_id: Number(subjectId), hourly_rate: Number(hourlyRate) });
      setAssignmentId(assignment.id);
    } catch {
      setError('Cette affectation existe déjà ou est invalide.');
    }
  }

  async function addSchedule() {
    setError(null);
    if (!classId || !subjectId || !assignmentId) return setError('Sélectionnez une classe, une matière et une affectation.');
    try {
      await createSchedule.mutateAsync({ class_id: Number(classId), subject_id: Number(subjectId), teacher_assignment_id: Number(assignmentId), day_of_week: day, starts_at: startsAt, ends_at: endsAt, room: room || undefined });
    } catch {
      setError('Ce créneau chevauche déjà un cours de cette classe.');
    }
  }

  async function handleConfirmDelete() {
    if (!toDelete) return;
    await deleteSchedule.mutateAsync(toDelete.id);
    setToDelete(null);
  }

  function exportCsv() {
    const header = ['Jour', 'Heure début', 'Heure fin', 'Classe', 'Matière', 'Enseignant', 'Salle'];
    const rows = (schedules ?? []).map((schedule) => [days[schedule.day_of_week - 1], schedule.starts_at, schedule.ends_at, schedule.school_class?.label ?? '', schedule.subject?.label ?? '', schedule.assignment?.teacher?.full_name ?? '', schedule.room ?? '']);
    const csv = [header, ...rows].map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(';')).join('\n');
    const blob = new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'emploi-du-temps.csv';
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-medium tracking-wide text-primary uppercase">Organisation pédagogique</p>
          <h1 className="mt-1 font-display text-2xl font-semibold text-ink">Emploi du temps</h1>
          <p className="mt-1 text-sm text-ink-soft">Affectez les enseignants, planifiez les cours et exportez le tableau.</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={exportCsv} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-ink hover:bg-paper">
            <Download className="h-4 w-4" /> CSV
          </button>
          <button type="button" onClick={() => window.print()} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-ink hover:bg-paper">
            <Printer className="h-4 w-4" /> PDF
          </button>
        </div>
      </div>
      {error && <div className="rounded-lg border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">{error}</div>}
      <div className="grid gap-4 lg:grid-cols-3">
        <section className="rounded-xl border border-border bg-surface p-4">
          <h2 className="font-display text-base font-semibold text-ink">Nouvelle matière</h2>
          <div className="mt-3 space-y-2">
            <input value={subjectCode} onChange={(e) => setSubjectCode(e.target.value)} placeholder="Code, ex. MATH" className="w-full rounded-lg border border-border bg-paper px-3 py-2 text-sm" />
            <input value={subjectLabel} onChange={(e) => setSubjectLabel(e.target.value)} placeholder="Mathématiques" className="w-full rounded-lg border border-border bg-paper px-3 py-2 text-sm" />
            <button type="button" onClick={addSubject} className="flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white">
              <Plus className="h-4 w-4" /> Ajouter
            </button>
          </div>
        </section>
        <section className="rounded-xl border border-border bg-surface p-4 lg:col-span-2">
          <h2 className="font-display text-base font-semibold text-ink">Affectation et tarif horaire</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <SearchableSelect value={teacherId} onChange={setTeacherId} placeholder="Choisir un enseignant" options={(teachers?.data ?? []).map((teacher) => ({ value: teacher.id, label: teacher.full_name }))} />
            <SearchableSelect value={classId} onChange={setClassId} placeholder="Choisir une classe" options={(classes ?? []).map((schoolClass) => ({ value: schoolClass.id, label: schoolClass.label }))} />
            <SearchableSelect value={subjectId} onChange={setSubjectId} placeholder="Choisir une matière" options={(subjects ?? []).map((subject) => ({ value: subject.id, label: subject.label, hint: subject.code }))} />
            <input type="number" min="0.01" step="0.01" value={hourlyRate} onChange={(e) => setHourlyRate(e.target.value)} placeholder="Tarif horaire (XOF)" className="rounded-lg border border-border bg-paper px-3 py-2 text-sm" />
          </div>
          <button type="button" onClick={addAssignment} className="mt-3 flex items-center gap-2 rounded-lg border border-primary px-3 py-2 text-sm font-medium text-primary hover:bg-primary-soft">
            <Plus className="h-4 w-4" /> Enregistrer l’affectation
          </button>
        </section>
      </div>
      <section className="rounded-xl border border-border bg-surface p-4">
        <h2 className="font-display text-base font-semibold text-ink">Ajouter un créneau</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <SearchableSelect value={classId} onChange={setClassId} placeholder="Classe" options={(classes ?? []).map((schoolClass) => ({ value: schoolClass.id, label: schoolClass.label }))} />
          <SearchableSelect value={subjectId} onChange={setSubjectId} placeholder="Matière" options={(subjects ?? []).map((subject) => ({ value: subject.id, label: subject.label }))} />
          <SearchableSelect value={assignmentId} onChange={setAssignmentId} placeholder="Affectation" options={filteredAssignments.map((assignment) => ({ value: assignment.id, label: `${assignment.teacher?.full_name ?? 'Enseignant'} · ${assignment.hourly_rate} XOF/h` }))} />
          <select value={day} onChange={(e) => setDay(Number(e.target.value))} className="rounded-lg border border-border bg-paper px-3 py-2 text-sm">
            <option value={1}>Lundi</option>
            <option value={2}>Mardi</option>
            <option value={3}>Mercredi</option>
            <option value={4}>Jeudi</option>
            <option value={5}>Vendredi</option>
            <option value={6}>Samedi</option>
          </select>
          <input type="time" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} className="rounded-lg border border-border bg-paper px-3 py-2 text-sm" />
          <input type="time" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} className="rounded-lg border border-border bg-paper px-3 py-2 text-sm" />
        </div>
        <div className="mt-3 flex gap-3">
          <input value={room} onChange={(e) => setRoom(e.target.value)} placeholder="Salle (optionnel)" className="rounded-lg border border-border bg-paper px-3 py-2 text-sm" />
          <button type="button" onClick={addSchedule} className="flex items-center gap-2 rounded-lg bg-success px-3 py-2 text-sm font-medium text-white">
            <Plus className="h-4 w-4" /> Ajouter au planning
          </button>
        </div>
        {selectedAssignment && <p className="mt-2 text-xs text-ink-soft">Tarif appliqué : {selectedAssignment.hourly_rate} XOF par heure pour cette classe.</p>}
      </section>
      <section className="overflow-hidden rounded-xl border border-border bg-surface">
        <div className="border-b border-border px-4 py-3">
          <h2 className="font-display text-base font-semibold text-ink">Créneaux planifiés</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-paper text-xs uppercase text-ink-soft">
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
                  <td className="px-4 py-3">{days[schedule.day_of_week - 1]}</td>
                  <td className="font-tabular px-4 py-3">{schedule.starts_at} - {schedule.ends_at}</td>
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
        {(schedules ?? []).length === 0 && (
          <div className="grid place-items-center gap-2 py-12 text-sm text-ink-soft">
            <CalendarDays className="h-8 w-8" />
            Aucun créneau pour cette classe.
          </div>
        )}
        <Pagination {...pagination} onPageChange={pagination.setPage} />
      </section>

      <ConfirmDialog
        open={toDelete !== null}
        title="Désactiver ce créneau ?"
        message={toDelete ? `Le créneau du ${days[toDelete.day_of_week - 1]} ${toDelete.starts_at}-${toDelete.ends_at} sera retiré de l’emploi du temps.` : ''}
        confirmLabel="Désactiver"
        onConfirm={handleConfirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}
