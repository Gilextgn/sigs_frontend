import { useState, type FormEvent } from 'react';
import axios from 'axios';
import { Modal } from '@/shared/components/Modal';
import { Field, inputClass } from '@/shared/components/Field';
import { SearchableSelect } from '@/shared/components/SearchableSelect';
import { useClasses } from '@/features/classes/useClasses';
import { useCreateStudent, useUpdateStudent, type StudentRow } from './useStudents';

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: 'active', label: 'Actif' },
  { value: 'transferred', label: 'Transféré' },
  { value: 'graduated', label: 'Diplômé' },
  { value: 'archived', label: 'Archivé' },
];

export function StudentFormModal({ editing, onClose }: { editing?: StudentRow | null; onClose: () => void }) {
  const { data: classes } = useClasses();
  const createStudent = useCreateStudent();
  const updateStudent = useUpdateStudent();

  const [form, setForm] = useState({
    class_id: editing?.class?.id ? String(editing.class.id) : '',
    first_name: editing?.first_name ?? '',
    last_name: editing?.last_name ?? '',
    birth_date: editing?.birth_date ?? '',
    gender: (editing?.gender ?? '') as '' | 'F' | 'M',
    status: editing?.status ?? 'active',
    guardian_full_name: '',
    guardian_relationship: '',
    guardian_phone: '',
    guardian_address: '',
  });
  const [error, setError] = useState<string | null>(null);
  const isSaving = createStudent.isPending || updateStudent.isPending;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!form.class_id) {
      setError('Veuillez sélectionner une classe.');
      return;
    }

    try {
      if (editing) {
        await updateStudent.mutateAsync({
          id: editing.id,
          payload: {
            class_id: Number(form.class_id),
            first_name: form.first_name,
            last_name: form.last_name,
            birth_date: form.birth_date || null,
            gender: form.gender || null,
            status: form.status,
          },
        });
      } else {
        await createStudent.mutateAsync({
          class_id: Number(form.class_id),
          first_name: form.first_name,
          last_name: form.last_name,
          birth_date: form.birth_date || undefined,
          gender: form.gender || undefined,
          guardian: {
            full_name: form.guardian_full_name,
            relationship_label: form.guardian_relationship,
            phone: form.guardian_phone,
            address: form.guardian_address || undefined,
          },
        });
      }
      onClose();
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const status = err.response?.status;
        if (status === 422) {
          const errors = err.response?.data?.errors as Record<string, string[]> | undefined;
          const firstMessage = errors ? Object.values(errors)[0]?.[0] : undefined;
          setError(firstMessage ?? err.response?.data?.message ?? "Impossible d'enregistrer l'élève. Vérifiez les champs obligatoires.");
        } else if (status === 403) {
          setError("Vous n'avez pas la permission d'effectuer cette action.");
        } else if (status) {
          setError(`Erreur ${status} : ${err.response?.data?.message ?? "échec de l'enregistrement."}`);
        } else {
          setError(`Impossible de contacter le serveur (${err.message}).`);
        }
      } else {
        setError("Impossible d'enregistrer l'élève. Vérifiez les champs obligatoires.");
      }
    }
  }

  return (
    <Modal title={editing ? "Modifier l'élève" : 'Nouvel élève'} onClose={onClose} widthClassName="max-w-2xl">
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="rounded-lg border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">
            {error}
          </div>
        )}

        <div>
          <p className="mb-3 text-sm font-semibold text-ink">Informations de l'élève</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Prénom">
              <input required value={form.first_name} onChange={(e) => setForm((f) => ({ ...f, first_name: e.target.value }))} className={inputClass} />
            </Field>
            <Field label="Nom">
              <input required value={form.last_name} onChange={(e) => setForm((f) => ({ ...f, last_name: e.target.value }))} className={inputClass} />
            </Field>
          </div>

          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Field label="Classe">
              <SearchableSelect
                value={form.class_id}
                onChange={(v) => setForm((f) => ({ ...f, class_id: String(v) }))}
                placeholder="Sélectionner une classe"
                options={(classes ?? []).map((c) => ({ value: c.id, label: c.label, hint: c.cycle?.label }))}
              />
            </Field>
            <Field label="Date de naissance">
              <input type="date" value={form.birth_date ?? ''} onChange={(e) => setForm((f) => ({ ...f, birth_date: e.target.value }))} className={inputClass} />
            </Field>
            <Field label="Sexe">
              <select value={form.gender} onChange={(e) => setForm((f) => ({ ...f, gender: e.target.value as typeof form.gender }))} className={inputClass}>
                <option value="">—</option>
                <option value="F">Féminin</option>
                <option value="M">Masculin</option>
              </select>
            </Field>
          </div>

          {editing && (
            <div className="mt-3">
              <Field label="Statut">
                <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))} className={inputClass}>
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          )}
        </div>

        {!editing && (
          <div className="border-t border-border pt-4">
            <p className="mb-1 text-sm font-semibold text-ink">Tuteur / parent</p>
            <p className="mb-3 text-xs text-ink-soft">Obligatoire à l'inscription.</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Nom complet du tuteur">
                <input required value={form.guardian_full_name} onChange={(e) => setForm((f) => ({ ...f, guardian_full_name: e.target.value }))} className={inputClass} />
              </Field>
              <Field label="Lien de parenté">
                <input required placeholder="Père, mère, tuteur légal..." value={form.guardian_relationship} onChange={(e) => setForm((f) => ({ ...f, guardian_relationship: e.target.value }))} className={inputClass} />
              </Field>
            </div>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Téléphone">
                <input required value={form.guardian_phone} onChange={(e) => setForm((f) => ({ ...f, guardian_phone: e.target.value }))} className={inputClass} />
              </Field>
              <Field label="Adresse (optionnel)">
                <input value={form.guardian_address} onChange={(e) => setForm((f) => ({ ...f, guardian_address: e.target.value }))} className={inputClass} />
              </Field>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-ink transition hover:bg-paper">
            Annuler
          </button>
          <button type="submit" disabled={isSaving} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-dark disabled:opacity-60">
            {isSaving ? 'Enregistrement...' : editing ? 'Enregistrer' : "Inscrire l'élève"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
