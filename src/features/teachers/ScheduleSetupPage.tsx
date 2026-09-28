import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, Pencil, Plus, Trash2 } from 'lucide-react';
import { useClasses } from '@/features/classes/useClasses';
import { SearchableSelect } from '@/shared/components/SearchableSelect';
import { ConfirmDialog } from '@/shared/components/ConfirmDialog';
import { Pagination } from '@/shared/components/Pagination';
import { deleteIconClass, editIconClass } from '@/shared/components/actionStyles';
import { usePaginatedRows } from '@/shared/hooks/usePaginatedRows';
import { getApiErrorMessage } from '@/shared/lib/apiError';
import { useTeachers } from './useTeachers';
import { DAYS, timeRange } from './timetable';
import { EditSlotModal } from './EditSlotModal';
import { useAssignments, useCreateAssignment, useCreateSchedule, useDeleteSchedule, useSchedules, useSubjects, type ScheduleRow } from './useTeaching';

const field = 'rounded-lg border border-border bg-paper px-3 py-2 text-sm';

/**
 * Configuration de l'emploi du temps, sur son propre écran : l'écran de
 * consultation reste une grille lisible, sans formulaires empilés dessous.
 */
export default function ScheduleSetupPage() {
  const [classId, setClassIdState] = useState<number | ''>('');
  const [teacherId, setTeacherIdState] = useState<number | ''>('');
  const [subjectId, setSubjectIdState] = useState<number | ''>('');
  const [assignmentId, setAssignmentIdState] = useState<number | ''>('');
  // Enseignant du primaire : plusieurs matières (souvent toutes) en une fois.
  const [subjectIds, setSubjectIds] = useState<number[]>([]);
  const [day, setDay] = useState(1);
  const [startsAt, setStartsAt] = useState('08:00');
  const [endsAt, setEndsAt] = useState('09:00');
  const [room, setRoom] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [listClassId, setListClassId] = useState<number | ''>('');
  // Créneau : la classe, puis un de ses cours (matière + enseignant, fixés à l'affectation).
  const [slotClassId, setSlotClassId] = useState<number | ''>('');
  const [toDelete, setToDelete] = useState<ScheduleRow | null>(null);
  const [toEdit, setToEdit] = useState<ScheduleRow | null>(null);

  const { data: classes } = useClasses();
  const { data: teachers } = useTeachers('active');
  const { data: subjects } = useSubjects();
  const { data: assignments } = useAssignments();
  const { data: schedules } = useSchedules({ classId: listClassId });
  const createAssignment = useCreateAssignment();
  const createSchedule = useCreateSchedule();
  const deleteSchedule = useDeleteSchedule();
  const { pageRows, ...pagination } = usePaginatedRows(schedules);

  const teacherRows = teachers?.data ?? [];
  const teacherLevel = teacherRows.find((teacher) => teacher.id === teacherId)?.level;
  const isPrimary = teacherLevel === 'primary';
  // Seules les matières du niveau de l'enseignant (et celles communes aux deux).
  const levelSubjects = (subjects ?? []).filter((subject) => !teacherLevel || subject.level === 'both' || subject.level === teacherLevel);
  const allSubjectIds = levelSubjects.map((subject) => subject.id);
  const allKey = allSubjectIds.join(',');

  // Primaire : toutes ses matières cochées d'office, il n'y a rien à choisir.
  useEffect(() => {
    setSubjectIds(isPrimary && allKey ? allKey.split(',').map(Number) : []);
    setSubjectIdState('');
  }, [teacherId, isPrimary, allKey]);
  const classOptions = (classes ?? []).map((schoolClass) => ({ value: schoolClass.id, label: schoolClass.label }));
  const classCourses = (assignments ?? []).filter((assignment) => assignment.class_id === slotClassId);
  const conflicts = (schedules ?? []).filter((schedule) => schedule.conflict).length;

  async function addAssignment() {
    setError(null);
    setSuccess(null);
    if (!teacherId || !classId || (!isPrimary && !subjectId)) {
      return setError(isPrimary ? 'Sélectionnez l’enseignant et la classe.' : 'Sélectionnez l’enseignant, la classe et la matière.');
    }
    try {
      // Le tarif est celui de la fiche de l'enseignant.
      if (isPrimary) {
        // Aucune case cochée : le serveur prend toutes les matières du primaire.
        await createAssignment.mutateAsync({ teacher_id: Number(teacherId), class_id: Number(classId), subject_ids: subjectIds.length ? subjectIds : undefined });
        setSlotClassId(Number(classId));
        setSuccess(`Affectation enregistrée pour ${subjectIds.length || 'toutes les'} matière(s) : ajoutez maintenant ses créneaux.`);
        return;
      }
      const assignment = await createAssignment.mutateAsync({ teacher_id: Number(teacherId), class_id: Number(classId), subject_id: Number(subjectId) });
      setSlotClassId(Number(classId));
      setAssignmentIdState(assignment.id);
      setSuccess('Affectation enregistrée : vous pouvez maintenant lui ajouter des créneaux.');
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Cette affectation existe déjà ou est invalide.'));
    }
  }

  async function addSchedule() {
    setError(null);
    setSuccess(null);
    const course = classCourses.find((assignment) => assignment.id === assignmentId);
    if (!slotClassId || !course) return setError('Sélectionnez la classe et le cours.');
    try {
      await createSchedule.mutateAsync({ class_id: Number(slotClassId), subject_id: course.subject_id, teacher_assignment_id: course.id, day_of_week: day, starts_at: startsAt, ends_at: endsAt, room: room || undefined });
      setListClassId(Number(slotClassId));
      setSuccess(`Créneau ajouté : ${DAYS[day - 1]} ${startsAt} - ${endsAt}.`);
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-medium tracking-wide text-primary uppercase">Organisation pédagogique</p>
          <h1 className="mt-1 font-display text-2xl font-semibold text-ink">Affectations et créneaux</h1>
          <p className="mt-1 text-sm text-ink-soft">1. Affectez un enseignant à une classe et une matière. 2. Placez ses créneaux dans la semaine.</p>
        </div>
        <Link to="/schedule" className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-ink transition hover:bg-paper">
          <ArrowLeft className="h-4 w-4" /> Voir l’emploi du temps
        </Link>
      </div>

      {error && <div className="rounded-lg border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">{error}</div>}
      {success && <div className="rounded-lg border border-success/30 bg-success-soft px-3 py-2 text-sm text-success">{success}</div>}

      <div className="grid gap-4 xl:grid-cols-2">
        <section className="rounded-xl border border-border bg-surface p-4">
          <h2 className="font-display text-base font-semibold text-ink">1. Affectation</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <SearchableSelect value={teacherId} onChange={(value) => setTeacherIdState(Number(value))} placeholder="Enseignant" options={teacherRows.map((teacher) => ({ value: teacher.id, label: teacher.full_name }))} />
            <SearchableSelect value={classId} onChange={(value) => setClassIdState(Number(value))} placeholder="Classe" options={classOptions} />
            {!isPrimary && (
              <SearchableSelect value={subjectId} onChange={(value) => setSubjectIdState(Number(value))} placeholder="Matière" options={levelSubjects.map((subject) => ({ value: subject.id, label: subject.label, hint: subject.code }))} />
            )}
          </div>
          {isPrimary && (
            <div className="mt-3 rounded-lg border border-border p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-ink">Matières enseignées ({subjectIds.length})</p>
                <button
                  type="button"
                  onClick={() => setSubjectIds(subjectIds.length === allSubjectIds.length ? [] : allSubjectIds)}
                  className="text-xs font-semibold text-primary hover:underline"
                >
                  {subjectIds.length === allSubjectIds.length ? 'Tout décocher' : 'Tout cocher'}
                </button>
              </div>
              <div className="grid max-h-48 grid-cols-2 gap-1.5 overflow-y-auto sm:grid-cols-3">
                {levelSubjects.map((subject) => (
                  <label key={subject.id} className="flex items-center gap-2 text-sm text-ink">
                    <input
                      type="checkbox"
                      checked={subjectIds.includes(subject.id)}
                      onChange={() => setSubjectIds((current) => (current.includes(subject.id) ? current.filter((id) => id !== subject.id) : [...current, subject.id]))}
                    />
                    {subject.label}
                  </label>
                ))}
              </div>
              <p className="mt-2 text-xs text-ink-soft">Toutes les matières du primaire sont cochées d’office : décochez seulement celles confiées à un autre (anglais, EPS…).</p>
            </div>
          )}
          <button type="button" onClick={addAssignment} disabled={createAssignment.isPending} className="mt-3 flex items-center gap-2 rounded-lg border border-primary px-3 py-2 text-sm font-medium text-primary hover:bg-primary-soft disabled:opacity-50">
            <Plus className="h-4 w-4" /> Enregistrer l’affectation
          </button>
        </section>

        <section className="rounded-xl border border-border bg-surface p-4">
          <h2 className="font-display text-base font-semibold text-ink">2. Créneau</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <SearchableSelect
              value={slotClassId}
              onChange={(value) => {
                setSlotClassId(Number(value));
                setAssignmentIdState('');
              }}
              placeholder="Classe"
              options={classOptions}
            />
            <div className="sm:col-span-2">
              <SearchableSelect
                value={assignmentId}
                onChange={(value) => setAssignmentIdState(Number(value))}
                placeholder={slotClassId ? 'Cours (matière — enseignant)' : 'Choisissez d’abord la classe'}
                disabled={!slotClassId}
                emptyLabel="Aucun cours affecté à cette classe : faites d’abord l’affectation."
                options={classCourses.map((assignment) => ({ value: assignment.id, label: `${assignment.subject?.label ?? 'Matière'} — ${assignment.teacher?.full_name ?? 'Enseignant'}` }))}
              />
            </div>
            <select value={day} onChange={(e) => setDay(Number(e.target.value))} className={field}>
              {DAYS.slice(0, 6).map((label, index) => (
                <option key={label} value={index + 1}>
                  {label}
                </option>
              ))}
            </select>
            <input type="time" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} className={field} aria-label="Début" />
            <input type="time" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} className={field} aria-label="Fin" />
          </div>
          <div className="mt-3 flex flex-wrap gap-3">
            <input value={room} onChange={(e) => setRoom(e.target.value)} placeholder="Salle (optionnel)" className={field} />
            <button type="button" onClick={addSchedule} disabled={createSchedule.isPending} className="flex items-center gap-2 rounded-lg bg-success px-3 py-2 text-sm font-medium text-on-success disabled:opacity-50">
              <Plus className="h-4 w-4" /> Ajouter au planning
            </button>
          </div>
        </section>
      </div>

      <section className="overflow-hidden rounded-xl border border-border bg-surface">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
          <h2 className="font-display text-base font-semibold text-ink">Créneaux planifiés</h2>
          <div className="w-full sm:w-64">
            <SearchableSelect value={listClassId} onChange={(value) => setListClassId(Number(value))} clearable placeholder="Toutes les classes" options={classOptions} />
          </div>
        </div>
        {conflicts > 0 && (
          <p className="flex items-center gap-2 border-b border-border bg-danger-soft px-4 py-2 text-sm text-danger">
            <AlertTriangle className="h-4 w-4 shrink-0" /> {conflicts} créneau(x) en conflit à corriger (bouton crayon).
          </p>
        )}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
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
                <tr key={schedule.id} className={schedule.conflict ? 'bg-danger-soft/40' : ''}>
                  <td className="px-4 py-3">{DAYS[schedule.day_of_week - 1]}</td>
                  <td className="font-tabular px-4 py-3">{timeRange(schedule)}</td>
                  <td className="px-4 py-3">{schedule.school_class?.label ?? '—'}</td>
                  <td className="px-4 py-3">{schedule.subject?.label ?? '—'}</td>
                  <td className="px-4 py-3">
                    {schedule.assignment?.teacher?.full_name ?? '—'}
                    {schedule.conflict && (
                      <span className="mt-0.5 flex items-center gap-1 text-[11px] font-semibold text-danger" title={schedule.conflict}>
                        <AlertTriangle className="h-3 w-3" /> {schedule.conflict}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">{schedule.room ?? '—'}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <button type="button" onClick={() => setToEdit(schedule)} className={editIconClass} aria-label="Modifier le créneau" title="Modifier">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button type="button" onClick={() => setToDelete(schedule)} className={deleteIconClass} aria-label="Retirer le créneau" title="Retirer">
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

      {toEdit && <EditSlotModal slot={toEdit} assignments={assignments ?? []} onClose={() => setToEdit(null)} />}

      <ConfirmDialog
        open={toDelete !== null}
        title="Retirer ce créneau ?"
        message={toDelete ? `Le créneau du ${DAYS[toDelete.day_of_week - 1]} ${timeRange(toDelete)} sera retiré de l’emploi du temps.` : ''}
        confirmLabel="Retirer"
        onConfirm={handleConfirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}
