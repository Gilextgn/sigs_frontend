import { useState, type FormEvent } from 'react';
import { Modal } from '@/shared/components/Modal';
import { Field, inputClass } from '@/shared/components/Field';
import { SearchableMultiSelect } from '@/shared/components/SearchableMultiSelect';
import { useClasses } from '@/features/classes/useClasses';
import { MONTH_LABELS, SCHOOL_YEAR_MONTHS } from './useFeeSubscriptions';
import { useCreateFeeType, useUpdateFeeType, type FeeTypeRow } from './useFeeTypes';

const DEFAULT_MONTHS = [9, 10, 11, 12, 1, 2, 3, 4, 5, 6];

const choiceClass = (active: boolean) =>
  `flex-1 rounded-lg border px-3 py-2 text-left text-sm transition ${active ? 'border-primary bg-primary-soft/40 text-ink' : 'border-border text-ink-soft hover:bg-paper'}`;

export function FeeFormModal({ editing, onClose }: { editing?: FeeTypeRow | null; onClose: () => void }) {
  const { data: classes } = useClasses();
  const createFeeType = useCreateFeeType();
  const updateFeeType = useUpdateFeeType();

  const [label, setLabel] = useState(editing?.label ?? '');
  const [category, setCategory] = useState(editing?.category ?? '');
  const [amount, setAmount] = useState(editing?.amount ?? '');
  const [classIds, setClassIds] = useState<number[]>(editing?.classes.map((c) => c.id) ?? []);
  const [isMandatory, setIsMandatory] = useState(editing?.is_mandatory ?? true);
  const [cycle, setCycle] = useState<'once' | 'monthly'>(editing?.billing_cycle ?? 'once');
  const [months, setMonths] = useState<number[]>(editing?.months ?? DEFAULT_MONTHS);
  const [error, setError] = useState<string | null>(null);
  const isSaving = createFeeType.isPending || updateFeeType.isPending;

  function toggleMonth(month: number) {
    setMonths((current) => (current.includes(month) ? current.filter((m) => m !== month) : [...current, month]));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (cycle === 'monthly' && months.length === 0) {
      setError('Choisissez au moins un mois facturé.');
      return;
    }
    const payload = {
      label,
      category: category || undefined,
      amount: Number(amount),
      class_ids: classIds,
      is_mandatory: isMandatory,
      billing_cycle: cycle,
      months: cycle === 'monthly' ? months : null,
    };
    try {
      if (editing) {
        await updateFeeType.mutateAsync({ id: editing.id, payload });
      } else {
        await createFeeType.mutateAsync(payload);
      }
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
    <Modal title={editing ? 'Modifier le frais' : 'Nouveau frais'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">
            {error}
          </div>
        )}

        <Field label="Libellé">
          <input required value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Cantine" className={inputClass} />
        </Field>

        <Field label="Périodicité">
          <div className="flex gap-2">
            <button type="button" onClick={() => setCycle('once')} className={choiceClass(cycle === 'once')}>
              <span className="block font-medium text-ink">Une fois</span>
              <span className="text-xs">Tenue, fournitures…</span>
            </button>
            <button type="button" onClick={() => setCycle('monthly')} className={choiceClass(cycle === 'monthly')}>
              <span className="block font-medium text-ink">Chaque mois</span>
              <span className="text-xs">Cantine, TD…</span>
            </button>
          </div>
        </Field>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Catégorie (optionnel)">
            <input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Restauration" className={inputClass} />
          </Field>
          <Field label={cycle === 'monthly' ? 'Montant par mois (XOF)' : 'Montant (XOF)'}>
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

        {cycle === 'monthly' && (
          <Field label={`Mois facturés (${months.length})`}>
            <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-6">
              {SCHOOL_YEAR_MONTHS.map((month) => (
                <button
                  key={month}
                  type="button"
                  onClick={() => toggleMonth(month)}
                  aria-pressed={months.includes(month)}
                  className={`rounded-md border px-2 py-1.5 text-xs font-medium capitalize transition ${
                    months.includes(month) ? 'border-primary bg-primary text-on-primary' : 'border-border text-ink-soft hover:bg-paper'
                  }`}
                >
                  {MONTH_LABELS[month - 1].slice(0, 4)}.
                </button>
              ))}
            </div>
            {amount !== '' && months.length > 0 && (
              <p className="mt-1 text-xs text-ink-soft">
                Soit {new Intl.NumberFormat('fr-FR').format(Number(amount) * months.length)} XOF sur l'année par élève.
              </p>
            )}
          </Field>
        )}

        <Field label="Classes concernées">
          <SearchableMultiSelect
            options={(classes ?? []).filter((c) => !c.parent_class_id).map((c) => ({ value: c.id, label: c.label }))}
            selected={classIds}
            onChange={setClassIds}
          />
          <p className="mt-1 text-xs text-ink-soft">Une classe dédoublée (ex. CE1 B) suit automatiquement sa classe principale.</p>
        </Field>

        <Field label="Qui paie ?">
          <div className="flex gap-2">
            <button type="button" onClick={() => setIsMandatory(true)} className={choiceClass(isMandatory)}>
              <span className="block font-medium text-ink">Toute la classe</span>
              <span className="text-xs">Dû par chaque élève des classes choisies</span>
            </button>
            <button type="button" onClick={() => setIsMandatory(false)} className={choiceClass(!isMandatory)}>
              <span className="block font-medium text-ink">Les inscrits</span>
              <span className="text-xs">Dû par les élèves inscrits depuis leur fiche</span>
            </button>
          </div>
        </Field>

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
