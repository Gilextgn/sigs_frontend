import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Modal } from '@/shared/components/Modal';
import { Field, inputClass } from '@/shared/components/Field';
import { ClassPicker } from '@/shared/components/ClassPicker';
import { useClasses } from '@/features/classes/useClasses';
import { getApiErrorMessage } from '@/shared/lib/apiError';
import { currency } from '@/shared/lib/format';
import { useCreateTranches, useTranches, useUpdateTranche, type TrancheRow } from './useTranches';

const ORDINALS = ['1ère', '2ème', '3ème', '4ème', '5ème', '6ème', '7ème', '8ème', '9ème', '10ème', '11ème', '12ème'];

interface Draft {
  key: number;
  label: string;
  amount: string;
  due_date: string;
}

let nextKey = 1;
const newDraft = (index: number, amount = ''): Draft => ({
  key: nextKey++,
  label: `${ORDINALS[index] ?? `${index + 1}ème`} tranche`,
  amount,
  due_date: '',
});

/**
 * Découper la scolarité en tranches, toutes en une fois : à chaque ligne
 * ajoutée, le reste à répartir se recalcule, pour que le directeur n'ait
 * jamais à poser l'opération lui-même.
 */
export function TrancheFormModal({ editing, onClose }: { editing?: TrancheRow | null; onClose: () => void }) {
  const { data: classes } = useClasses();
  const [classId, setClassId] = useState<string>(editing ? String(editing.class_id) : '');
  const { data: existingTranches } = useTranches(classId ? Number(classId) : '');
  const createTranches = useCreateTranches();
  const updateTranche = useUpdateTranche();

  const [drafts, setDrafts] = useState<Draft[]>(
    editing ? [{ key: 0, label: editing.label, amount: String(editing.amount), due_date: editing.due_date ?? '' }] : [],
  );
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isSaving = createTranches.isPending || updateTranche.isPending;

  const selectedClass = classes?.find((schoolClass) => String(schoolClass.id) === classId);
  const ceiling = selectedClass ? Number(selectedClass.tuition_amount) : 0;
  const alreadyPlanned = useMemo(
    () => (existingTranches ?? []).filter((tranche) => tranche.id !== editing?.id).reduce((sum, tranche) => sum + Number(tranche.amount), 0),
    [existingTranches, editing],
  );
  const roomLeft = Math.max(ceiling - alreadyPlanned, 0);
  const drafted = drafts.reduce((sum, draft) => sum + (Number(draft.amount) || 0), 0);
  const remaining = roomLeft - drafted;

  // Classe choisie : une première tranche est proposée pour tout le reste,
  // tant que le directeur n'a rien saisi lui-même.
  useEffect(() => {
    if (editing || touched || !selectedClass || !existingTranches) return;
    setDrafts([newDraft(existingTranches.length, String(Math.max(ceiling - alreadyPlanned, 0) || ''))]);
  }, [editing, touched, selectedClass, existingTranches, ceiling, alreadyPlanned]);

  const update = (key: number, patch: Partial<Draft>) => {
    setTouched(true);
    setDrafts((current) => current.map((draft) => (draft.key === key ? { ...draft, ...patch } : draft)));
  };

  function addRow() {
    setTouched(true);
    setDrafts((current) => [...current, newDraft((existingTranches ?? []).length + current.length, remaining > 0 ? String(remaining) : '')]);
  }

  function removeRow(key: number) {
    setTouched(true);
    setDrafts((current) => current.filter((draft) => draft.key !== key));
  }

  /** Découpe le reste en parts égales, la dernière absorbant les arrondis. */
  function splitEqually(count: number) {
    setTouched(true);
    const base = Math.floor(roomLeft / count / 500) * 500 || Math.floor(roomLeft / count);
    const start = (existingTranches ?? []).length;
    setDrafts(
      Array.from({ length: count }, (_, index) =>
        newDraft(start + index, String(index === count - 1 ? roomLeft - base * (count - 1) : base)),
      ),
    );
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    try {
      if (editing) {
        const [draft] = drafts;
        await updateTranche.mutateAsync({
          id: editing.id,
          payload: { class_id: Number(classId), label: draft.label, amount: Number(draft.amount), due_date: draft.due_date || undefined },
        });
      } else {
        await createTranches.mutateAsync({
          class_id: Number(classId),
          tranches: drafts.map((draft) => ({ label: draft.label, amount: Number(draft.amount), due_date: draft.due_date || undefined })),
        });
      }
      onClose();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Impossible d'enregistrer les tranches."));
    }
  }

  const overCeiling = remaining < 0;
  const incomplete = drafts.some((draft) => !draft.label.trim() || !(Number(draft.amount) > 0));

  return (
    <Modal title={editing ? 'Modifier la tranche' : 'Découper la scolarité en tranches'} onClose={onClose} widthClassName="max-w-2xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="rounded-lg border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">{error}</div>}

        <div>
          <p className="mb-1.5 text-sm font-medium text-ink">Classe</p>
          <ClassPicker value={classId ? Number(classId) : ''} onChange={(id) => setClassId(String(id))} disabled={!!editing} />
        </div>

        {selectedClass && (
          <div className={`rounded-xl border px-4 py-3 ${overCeiling ? 'border-danger/30 bg-danger-soft' : 'border-border bg-paper'}`}>
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-sm">
              <span className="text-ink-soft">
                Scolarité <span className="font-tabular font-semibold text-ink">{currency.format(ceiling)} XOF</span>
                {alreadyPlanned > 0 && <> · déjà réparti <span className="font-tabular text-ink">{currency.format(alreadyPlanned)}</span></>}
              </span>
              <span className={`font-tabular text-base font-bold ${overCeiling ? 'text-danger' : remaining === 0 ? 'text-success' : 'text-gold'}`}>
                {overCeiling ? `${currency.format(-remaining)} XOF de trop` : `${currency.format(remaining)} XOF à répartir`}
              </span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-track">
              <div
                className={`h-full rounded-full transition-all ${overCeiling ? 'bg-danger' : 'bg-primary'}`}
                style={{ width: `${ceiling > 0 ? Math.min(((alreadyPlanned + drafted) / ceiling) * 100, 100) : 0}%` }}
              />
            </div>
            {!editing && roomLeft > 0 && (
              <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                <span className="text-xs text-ink-soft">Répartir en :</span>
                {[2, 3, 4].map((count) => (
                  <button
                    key={count}
                    type="button"
                    onClick={() => splitEqually(count)}
                    className="rounded-full border border-border px-2.5 py-1 text-xs font-medium text-ink-soft transition hover:border-primary/40 hover:text-primary"
                  >
                    {count} tranches égales
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {selectedClass && (
          <div className="space-y-3">
            {drafts.map((draft, index) => (
              <div key={draft.key} className="grid gap-3 rounded-xl border border-border p-3 sm:grid-cols-[1.4fr_1fr_1fr_auto]">
                <Field label={index === 0 ? 'Libellé' : ''}>
                  <input required value={draft.label} onChange={(e) => update(draft.key, { label: e.target.value })} placeholder="1ère tranche" className={inputClass} />
                </Field>
                <Field label={index === 0 ? 'Montant (XOF)' : ''}>
                  <input
                    required
                    type="number"
                    min={1}
                    step="1"
                    inputMode="numeric"
                    value={draft.amount}
                    onChange={(e) => update(draft.key, { amount: e.target.value })}
                    className={`${inputClass} font-tabular`}
                  />
                </Field>
                <Field label={index === 0 ? 'Échéance (facultatif)' : ''}>
                  <input type="date" value={draft.due_date} onChange={(e) => update(draft.key, { due_date: e.target.value })} className={inputClass} />
                </Field>
                {!editing && (
                  <div className={index === 0 ? 'flex items-end pb-1' : 'flex items-center'}>
                    <button
                      type="button"
                      onClick={() => removeRow(draft.key)}
                      disabled={drafts.length === 1}
                      aria-label="Retirer cette tranche"
                      className="grid h-9 w-9 place-items-center rounded-lg text-ink-muted transition hover:bg-danger-soft hover:text-danger disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-ink-muted"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            ))}

            {!editing && (
              <button
                type="button"
                onClick={addRow}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border py-2.5 text-sm font-medium text-ink-soft transition hover:border-primary/40 hover:text-primary"
              >
                <Plus className="h-4 w-4" /> Ajouter une tranche
                {remaining > 0 && <span className="font-tabular text-xs">({currency.format(remaining)} XOF restants)</span>}
              </button>
            )}

            {!editing && remaining > 0 && !overCeiling && (
              <p className="text-xs text-gold">
                {currency.format(remaining)} XOF de scolarité ne seront portés par aucune tranche : ce montant restera dû sans pouvoir être encaissé.
              </p>
            )}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-ink transition hover:bg-paper">
            Annuler
          </button>
          <button
            type="submit"
            disabled={isSaving || !classId || drafts.length === 0 || overCeiling || incomplete}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-on-primary transition hover:bg-primary-dark disabled:opacity-60"
          >
            {isSaving ? 'Enregistrement…' : editing ? 'Enregistrer' : `Enregistrer ${drafts.length} tranche${drafts.length > 1 ? 's' : ''}`}
          </button>
        </div>
      </form>
    </Modal>
  );
}
