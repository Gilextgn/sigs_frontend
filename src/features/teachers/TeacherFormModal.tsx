import { useState, type FormEvent } from 'react';
import { Modal } from '@/shared/components/Modal';
import { Field, inputClass } from '@/shared/components/Field';
import { SearchableSelect } from '@/shared/components/SearchableSelect';
import { useCreateTeacher, useUpdateTeacher, type TeacherRow } from './useTeachers';
import { useSubjects } from './useTeaching';

export function TeacherFormModal({ editing, onClose }: { editing: TeacherRow | null; onClose: () => void }) {
  const createTeacher = useCreateTeacher();
  const updateTeacher = useUpdateTeacher();
  const { data: subjects } = useSubjects();

  const [form, setForm] = useState({
    full_name: editing?.full_name ?? '',
    phone: editing?.phone ?? '',
    subject: editing?.subject ?? '',
    pay_mode: editing?.pay_mode ?? 'hourly',
    monthly_salary: editing?.monthly_salary ?? '',
    status: editing?.status ?? 'active',
  });
  const paidHourly = form.pay_mode === 'hourly';
  const [error, setError] = useState<string | null>(null);
  const isSaving = createTeacher.isPending || updateTeacher.isPending;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const payload = {
      full_name: form.full_name,
      phone: form.phone || undefined,
      subject: form.subject || undefined,
      pay_mode: form.pay_mode as 'hourly' | 'monthly',
      // À l'heure, la paie sort des présences : aucun salaire fixe à saisir.
      monthly_salary: paidHourly ? undefined : Number(form.monthly_salary || 0),
      status: form.status as 'active' | 'inactive',
    };

    try {
      if (editing) {
        await updateTeacher.mutateAsync({ id: editing.id, payload });
      } else {
        await createTeacher.mutateAsync(payload);
      }
      onClose();
    } catch {
      setError("Impossible d'enregistrer l'enseignant.");
    }
  }

  return (
    <Modal title={editing ? "Modifier l'enseignant" : 'Nouvel enseignant'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">
            {error}
          </div>
        )}

        <Field label="Nom complet">
          <input
            required
            value={form.full_name}
            onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
            className={inputClass}
          />
        </Field>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Téléphone">
            <input
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              className={inputClass}
            />
          </Field>
          <Field label="Matière">
            <SearchableSelect
              value={form.subject}
              clearable
              placeholder="Choisir une matière"
              emptyLabel="Aucune matière — ajoutez-la dans le référentiel Matières"
              onChange={(value) => setForm((f) => ({ ...f, subject: String(value) }))}
              options={(subjects ?? []).map((subject) => ({ value: subject.label, label: subject.label, hint: subject.code }))}
            />
          </Field>
        </div>

        <Field label="Rémunération">
          <div className="grid gap-2 sm:grid-cols-2">
            {(
              [
                ['hourly', 'À l’heure', 'Calculée chaque mois d’après les heures faites (présences).'],
                ['monthly', 'Salaire fixe', 'Montant mensuel identique, saisi ci-dessous.'],
              ] as ['hourly' | 'monthly', string, string][]
            ).map(([mode, label, hint]) => (
              <button
                key={mode}
                type="button"
                onClick={() => setForm((f) => ({ ...f, pay_mode: mode }))}
                aria-pressed={form.pay_mode === mode}
                className={`rounded-xl border px-3 py-2.5 text-left transition ${
                  form.pay_mode === mode ? 'border-primary bg-primary-soft/50 ring-2 ring-primary/15' : 'border-border hover:border-primary/40'
                }`}
              >
                <span className="block text-sm font-medium text-ink">{label}</span>
                <span className="block text-xs text-ink-soft">{hint}</span>
              </button>
            ))}
          </div>
        </Field>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {!paidHourly && (
            <Field label="Salaire mensuel (XOF)">
              <input
                required
                type="number"
                min={0}
                step="0.01"
                value={form.monthly_salary}
                onChange={(e) => setForm((f) => ({ ...f, monthly_salary: e.target.value }))}
                className={inputClass}
              />
            </Field>
          )}
          <Field label="Statut">
            <select
              value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as 'active' | 'inactive' }))}
              className={inputClass}
            >
              <option value="active">Actif</option>
              <option value="inactive">Inactif</option>
            </select>
          </Field>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-ink transition hover:bg-paper">
            Annuler
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-on-primary transition hover:bg-primary-dark disabled:opacity-60"
          >
            {isSaving ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
