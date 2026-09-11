import { useState, type FormEvent } from 'react';
import { Modal } from '@/shared/components/Modal';
import { Field, inputClass } from '@/shared/components/Field';
import { useCreateClass, useUpdateClass, useCycles, type SchoolClassRow } from './useClasses';

export function ClassFormModal({
  editing,
  onClose,
}: {
  editing: SchoolClassRow | null;
  onClose: () => void;
}) {
  const { data: cycles } = useCycles();
  const createClass = useCreateClass();
  const updateClass = useUpdateClass();

  const [form, setForm] = useState({
    cycle_id: editing?.cycle?.id ?? '',
    code: editing?.code ?? '',
    label: editing?.label ?? '',
    tuition_amount: editing?.tuition_amount ?? '',
    description: editing?.description ?? '',
  });
  const [error, setError] = useState<string | null>(null);

  const isSaving = createClass.isPending || updateClass.isPending;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const payload = {
      cycle_id: Number(form.cycle_id),
      code: form.code,
      label: form.label,
      tuition_amount: Number(form.tuition_amount),
      description: form.description || undefined,
    };

    try {
      if (editing) {
        await updateClass.mutateAsync({ id: editing.id, payload });
      } else {
        await createClass.mutateAsync(payload);
      }
      onClose();
    } catch {
      setError("Impossible d'enregistrer la classe. Vérifiez les champs (code déjà utilisé ?).");
    }
  }

  return (
    <Modal title={editing ? 'Modifier la classe' : 'Nouvelle classe'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">
            {error}
          </div>
        )}

        <Field label="Cycle">
          <select
            required
            value={form.cycle_id}
            onChange={(e) => setForm((f) => ({ ...f, cycle_id: e.target.value }))}
            className={inputClass}
          >
            <option value="" disabled>
              Sélectionner un cycle
            </option>
            {cycles?.map((cycle) => (
              <option key={cycle.id} value={cycle.id}>
                {cycle.label}
              </option>
            ))}
          </select>
        </Field>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Code">
            <input
              required
              value={form.code}
              onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
              placeholder="CM2-A"
              className={inputClass}
            />
          </Field>
          <Field label="Libellé">
            <input
              required
              value={form.label}
              onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
              placeholder="CM2 A"
              className={inputClass}
            />
          </Field>
        </div>

        <Field label="Scolarité annuelle (XOF)">
          <input
            required
            type="number"
            min={0}
            step="0.01"
            value={form.tuition_amount}
            onChange={(e) => setForm((f) => ({ ...f, tuition_amount: e.target.value }))}
            className={inputClass}
          />
        </Field>

        <Field label="Description (optionnel)">
          <textarea
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            rows={2}
            className={inputClass}
          />
        </Field>

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-ink transition hover:bg-paper">
            Annuler
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-dark disabled:opacity-60"
          >
            {isSaving ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
