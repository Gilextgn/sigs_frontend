import { useMemo, useState, type FormEvent } from 'react';
import { Modal } from '@/shared/components/Modal';
import { Field, inputClass } from '@/shared/components/Field';
import { SearchableSelect } from '@/shared/components/SearchableSelect';
import { useClasses } from '@/features/classes/useClasses';
import { useCreateTranche, useTranches } from './useTranches';

const currency = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });

export function TrancheFormModal({ onClose }: { onClose: () => void }) {
  const { data: classes } = useClasses();
  const [classId, setClassId] = useState<string>('');
  const { data: existingTranches } = useTranches(classId ? Number(classId) : '');
  const createTranche = useCreateTranche();

  const [label, setLabel] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [error, setError] = useState<string | null>(null);

  const selectedClass = classes?.find((c) => String(c.id) === classId);
  const alreadyPlanned = useMemo(
    () => (existingTranches ?? []).reduce((sum, t) => sum + Number(t.amount), 0),
    [existingTranches],
  );
  const ceiling = selectedClass ? Number(selectedClass.tuition_amount) : 0;
  const remaining = Math.max(ceiling - alreadyPlanned, 0);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await createTranche.mutateAsync({
        class_id: Number(classId),
        label,
        amount: Number(amount),
        due_date: dueDate || undefined,
      });
      onClose();
    } catch {
      setError('Le total des tranches ne doit jamais dépasser la scolarité de la classe.');
    }
  }

  return (
    <Modal title="Nouvelle tranche" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">
            {error}
          </div>
        )}

        <Field label="Classe">
          <SearchableSelect
            value={classId}
            onChange={(v) => setClassId(String(v))}
            placeholder="Sélectionner une classe"
            options={(classes ?? []).map((c) => ({ value: c.id, label: c.label, hint: c.cycle?.label }))}
          />
        </Field>

        {selectedClass && (
          <div className="rounded-lg bg-primary-soft px-3 py-2 text-xs text-primary-dark">
            Scolarité : {currency.format(ceiling)} XOF · déjà planifié :{' '}
            {currency.format(alreadyPlanned)} XOF · reste disponible :{' '}
            <span className="font-semibold">{currency.format(remaining)} XOF</span>
          </div>
        )}

        <Field label="Libellé de la tranche">
          <input
            required
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="1ère tranche"
            className={inputClass}
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
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
          <Field label="Échéance (optionnel)">
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={inputClass} />
          </Field>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-ink transition hover:bg-paper">
            Annuler
          </button>
          <button
            type="submit"
            disabled={createTranche.isPending || !classId}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-dark disabled:opacity-60"
          >
            {createTranche.isPending ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
