import { useState, type FormEvent } from 'react';
import axios from 'axios';
import { Modal } from '@/shared/components/Modal';
import { Field, inputClass } from '@/shared/components/Field';
import { SearchableSelect } from '@/shared/components/SearchableSelect';
import { useClasses } from '@/features/classes/useClasses';
import { useCreateStudent } from './useStudents';

export function StudentFormModal({ onClose }: { onClose: () => void }) {
  const { data: classes } = useClasses();
  const createStudent = useCreateStudent();

  const [form, setForm] = useState({
    class_id: '',
    first_name: '',
    last_name: '',
    birth_date: '',
    gender: '' as '' | 'F' | 'M',
    guardian_full_name: '',
    guardian_relationship: '',
    guardian_phone: '',
    guardian_address: '',
  });
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!form.class_id) {
      setError('Veuillez sélectionner une classe.');
      return;
    }

    try {
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
      onClose();
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const status = err.response?.status;
        if (status === 422) {
          const errors = err.response?.data?.errors as Record<string, string[]> | undefined;
          const firstMessage = errors ? Object.values(errors)[0]?.[0] : undefined;
          setError(firstMessage ?? err.response?.data?.message ?? "Impossible d'inscrire l'élève. Vérifiez les champs obligatoires.");
        } else if (status === 403) {
          setError("Vous n'avez pas la permission d'inscrire un élève.");
        } else if (status) {
          setError(`Erreur ${status} : ${err.response?.data?.message ?? "échec de l'inscription."}`);
        } else {
          setError(`Impossible de contacter le serveur (${err.message}).`);
        }
      } else {
        setError("Impossible d'inscrire l'élève. Vérifiez les champs obligatoires.");
      }
    }
  }

  return (
    <Modal title="Nouvel élève" onClose={onClose} widthClassName="max-w-2xl">
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="rounded-lg border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">
            {error}
          </div>
        )}

        <div>
          <p className="mb-3 text-sm font-semibold text-ink">Informations de l'élève</p>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Prénom">
              <input required value={form.first_name} onChange={(e) => setForm((f) => ({ ...f, first_name: e.target.value }))} className={inputClass} />
            </Field>
            <Field label="Nom">
              <input required value={form.last_name} onChange={(e) => setForm((f) => ({ ...f, last_name: e.target.value }))} className={inputClass} />
            </Field>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-3">
            <Field label="Classe">
              <SearchableSelect
                value={form.class_id}
                onChange={(v) => setForm((f) => ({ ...f, class_id: String(v) }))}
                placeholder="Sélectionner une classe"
                options={(classes ?? []).map((c) => ({ value: c.id, label: c.label, hint: c.cycle?.label }))}
              />
            </Field>
            <Field label="Date de naissance">
              <input type="date" value={form.birth_date} onChange={(e) => setForm((f) => ({ ...f, birth_date: e.target.value }))} className={inputClass} />
            </Field>
            <Field label="Sexe">
              <select value={form.gender} onChange={(e) => setForm((f) => ({ ...f, gender: e.target.value as typeof form.gender }))} className={inputClass}>
                <option value="">—</option>
                <option value="F">Féminin</option>
                <option value="M">Masculin</option>
              </select>
            </Field>
          </div>
        </div>

        <div className="border-t border-border pt-4">
          <p className="mb-1 text-sm font-semibold text-ink">Tuteur / parent</p>
          <p className="mb-3 text-xs text-ink-soft">Obligatoire à l'inscription.</p>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Nom complet du tuteur">
              <input required value={form.guardian_full_name} onChange={(e) => setForm((f) => ({ ...f, guardian_full_name: e.target.value }))} className={inputClass} />
            </Field>
            <Field label="Lien de parenté">
              <input required placeholder="Père, mère, tuteur légal..." value={form.guardian_relationship} onChange={(e) => setForm((f) => ({ ...f, guardian_relationship: e.target.value }))} className={inputClass} />
            </Field>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <Field label="Téléphone">
              <input required value={form.guardian_phone} onChange={(e) => setForm((f) => ({ ...f, guardian_phone: e.target.value }))} className={inputClass} />
            </Field>
            <Field label="Adresse (optionnel)">
              <input value={form.guardian_address} onChange={(e) => setForm((f) => ({ ...f, guardian_address: e.target.value }))} className={inputClass} />
            </Field>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-ink transition hover:bg-paper">
            Annuler
          </button>
          <button type="submit" disabled={createStudent.isPending} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-dark disabled:opacity-60">
            {createStudent.isPending ? 'Inscription...' : "Inscrire l'élève"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
