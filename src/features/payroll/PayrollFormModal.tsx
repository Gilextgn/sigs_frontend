import { useState, type FormEvent } from 'react';
import { Modal } from '@/shared/components/Modal';
import { Field, inputClass } from '@/shared/components/Field';
import { SearchableSelect } from '@/shared/components/SearchableSelect';
import { useTeachers } from '@/features/teachers/useTeachers';
import { useCreatePayrollEntry, usePayrollEstimate } from './usePayroll';

const currentPeriod = new Date().toISOString().slice(0, 7);

export function PayrollFormModal({ onClose }: { onClose: () => void }) {
  const { data: teachers } = useTeachers('active');
  const createEntry = useCreatePayrollEntry();

  const [form, setForm] = useState({
    teacher_id: '',
    period: currentPeriod,
    bonus_amount: '',
    deduction_amount: '',
  });
  const [error, setError] = useState<string | null>(null);
  const estimate = usePayrollEstimate(form.teacher_id ? Number(form.teacher_id) : '', form.period);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!form.teacher_id) {
      setError('Veuillez sélectionner un enseignant.');
      return;
    }

    try {
      await createEntry.mutateAsync({
        teacher_id: Number(form.teacher_id),
        period: form.period,
        base_amount: estimate.data?.amount ?? 0,
        bonus_amount: form.bonus_amount ? Number(form.bonus_amount) : undefined,
        deduction_amount: form.deduction_amount ? Number(form.deduction_amount) : undefined,
      });
      onClose();
    } catch {
      setError('Impossible d\'enregistrer la paie (une fiche existe peut-être déjà pour cette période).');
    }
  }

  return (
    <Modal title="Nouvelle fiche de paie" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">
            {error}
          </div>
        )}

        <Field label="Enseignant">
          <SearchableSelect
            value={form.teacher_id}
            onChange={(v) => setForm((f) => ({ ...f, teacher_id: String(v) }))}
            placeholder="Sélectionner un enseignant"
            options={(teachers?.data ?? []).map((t) => ({ value: t.id, label: t.full_name, hint: t.subject ?? undefined }))}
          />
        </Field>

        <Field label="Période (AAAA-MM)">
          <input
            required
            type="month"
            value={form.period}
            onChange={(e) => setForm((f) => ({ ...f, period: e.target.value }))}
            className={inputClass}
          />
        </Field>

        <div className="grid grid-cols-3 gap-3">
          <Field label="Heures réalisées">
            <div className={`${inputClass} flex items-center justify-between`}><span>{estimate.data?.worked_hours ?? 0} h</span><span className="text-xs text-ink-soft">Calcul automatique</span></div>
          </Field>
          <Field label="Prime">
            <input type="number" min={0} step="0.01" value={form.bonus_amount} onChange={(e) => setForm((f) => ({ ...f, bonus_amount: e.target.value }))} className={inputClass} />
          </Field>
          <Field label="Retenue">
            <input type="number" min={0} step="0.01" value={form.deduction_amount} onChange={(e) => setForm((f) => ({ ...f, deduction_amount: e.target.value }))} className={inputClass} />
          </Field>
        </div>
        <p className="text-xs text-ink-soft">Base calculée : {estimate.data?.amount ?? 0} XOF selon les séances complétées et le tarif de chaque classe.</p>

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-ink transition hover:bg-paper">
            Annuler
          </button>
          <button type="submit" disabled={createEntry.isPending} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-dark disabled:opacity-60">
            {createEntry.isPending ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
