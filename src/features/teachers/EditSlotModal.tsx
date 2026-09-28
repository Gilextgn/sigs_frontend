import { useState } from 'react';
import { Modal } from '@/shared/components/Modal';
import { getApiErrorMessage } from '@/shared/lib/apiError';
import { DAYS, hhmm } from './timetable';
import { useUpdateSchedule, type AssignmentRow, type ScheduleRow } from './useTeaching';

/** Déplacer un créneau (jour, horaire, salle) ou changer d'enseignant ; le serveur refuse tout chevauchement. */
export function EditSlotModal({ slot, assignments, onClose }: { slot: ScheduleRow; assignments: AssignmentRow[]; onClose: () => void }) {
  const update = useUpdateSchedule();
  const [day, setDay] = useState(slot.day_of_week);
  const [startsAt, setStartsAt] = useState(hhmm(slot.starts_at));
  const [endsAt, setEndsAt] = useState(hhmm(slot.ends_at));
  const [room, setRoom] = useState(slot.room ?? '');
  const [assignmentId, setAssignmentId] = useState(slot.teacher_assignment_id);
  const [error, setError] = useState<string | null>(null);
  const choices = assignments.filter((a) => a.class_id === slot.class_id && a.subject_id === slot.subject_id);
  const field = 'w-full rounded-lg border border-border bg-paper px-3 py-2 text-sm text-ink';

  async function save() {
    setError(null);
    try {
      await update.mutateAsync({ id: slot.id, payload: { day_of_week: day, starts_at: startsAt, ends_at: endsAt, room: room || null, teacher_assignment_id: assignmentId } });
      onClose();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Impossible de modifier ce créneau.'));
    }
  }

  return (
    <Modal title={`Modifier le créneau · ${slot.school_class?.label ?? ''} · ${slot.subject?.label ?? ''}`} onClose={onClose}>
      <div className="space-y-3">
        {slot.conflict && <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{slot.conflict}</p>}
        {error && <p className="rounded-lg border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>}
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-ink">Enseignant</span>
          <select value={assignmentId} onChange={(e) => setAssignmentId(Number(e.target.value))} className={field}>
            {choices.map((a) => (
              <option key={a.id} value={a.id}>
                {a.teacher?.full_name ?? 'Enseignant'}
              </option>
            ))}
          </select>
        </label>
        <div className="grid grid-cols-3 gap-2">
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-ink">Jour</span>
            <select value={day} onChange={(e) => setDay(Number(e.target.value))} className={field}>
              {DAYS.slice(0, 6).map((label, index) => (
                <option key={label} value={index + 1}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-ink">Début</span>
            <input type="time" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} className={field} />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-ink">Fin</span>
            <input type="time" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} className={field} />
          </label>
        </div>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-ink">Salle (optionnel)</span>
          <input value={room} onChange={(e) => setRoom(e.target.value)} className={field} />
        </label>
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-ink transition hover:bg-paper">
            Annuler
          </button>
          <button type="button" onClick={save} disabled={update.isPending} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-on-primary transition hover:bg-primary-dark disabled:opacity-60">
            {update.isPending ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </Modal>
  );
}