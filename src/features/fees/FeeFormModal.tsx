import { useState, type FormEvent } from 'react';
import { Modal } from '@/shared/components/Modal';
import { Field, inputClass } from '@/shared/components/Field';
import { SearchableMultiSelect } from '@/shared/components/SearchableMultiSelect';
import { useClasses } from '@/features/classes/useClasses';
import { useCreateFeeType } from './useFeeTypes';

export function FeeFormModal({ onClose }: { onClose: () => void }) {
  const { data: classes } = useClasses();
  const createFeeType = useCreateFeeType();

  const [label, setLabel] = useState('');
  const [category, setCategory] = useState('');
  const [amount, setAmount] = useState('');
  const [classIds, setClassIds] = useState<number[]>([]);
  const [isMandatory, setIsMandatory] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await createFeeType.mutateAsync({
        label,
        category: category || undefined,
        amount: Number(amount),
        class_ids: classIds,
        is_mandatory: isMandatory,
      });
      onClose();
    } catch (requestError: unknown) {
      const response = (requestError as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } }).response;
      const validationMessage = response?.data?.errors
        ? Object.values(response.data.errors).flat()[0]
        : undefined;
      setError(validationMessage ?? response?.data?.message ?? "Impossible d'enregistrer ce frais.");
    }
  }

  return (
    <Modal title="Nouveau frais" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">
            {error}
          </div>
        )}

        <Field label="Libellé">
          <input required value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Cantine" className={inputClass} />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Catégorie (optionnel)">
            <input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Restauration" className={inputClass} />
          </Field>
          <Field label="Montant (XOF)">
            <input
              required
              type="number"
              min={0}
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className={inputClass}
            />
          </Field>
        </div>

        <Field label="Classes concernées">
          <SearchableMultiSelect
            options={(classes ?? []).map((c) => ({ value: c.id, label: c.label }))}
            selected={classIds}
            onChange={setClassIds}
          />
        </Field>

        <label className="flex items-center gap-2 text-sm text-ink">
          <input type="checkbox" checked={isMandatory} onChange={(e) => setIsMandatory(e.target.checked)} />
          Frais obligatoire pour les élèves concernés
        </label>

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-ink transition hover:bg-paper">
            Annuler
          </button>
          <button
            type="submit"
            disabled={createFeeType.isPending}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-dark disabled:opacity-60"
          >
            {createFeeType.isPending ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
