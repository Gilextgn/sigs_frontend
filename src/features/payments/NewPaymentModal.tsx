import { useMemo, useState, type FormEvent } from 'react';
import { Modal } from '@/shared/components/Modal';
import { Field, inputClass } from '@/shared/components/Field';
import { useStudents } from '@/features/students/useStudents';
import { useTranches } from '@/features/tranches/useTranches';
import { useFeeTypes } from '@/features/fees/useFeeTypes';
import { useSchoolSettings } from '@/features/settings/useSettings';
import { downloadPaymentReceiptPdf } from '@/shared/lib/pdf';
import { useCreatePayment, useStudentPayments, type NewPaymentLine, type PaymentItemWithLabel } from './usePayments';

const currency = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });

export function NewPaymentModal({ onClose }: { onClose: () => void }) {
  const [studentSearch, setStudentSearch] = useState('');
  const [studentId, setStudentId] = useState<number | null>(null);
  const [selectedAmounts, setSelectedAmounts] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  const { data: studentResults } = useStudents({ search: studentSearch });
  const selectedStudent = studentResults?.data.find((s) => s.id === studentId);
  const classId = selectedStudent?.class?.id;

  const { data: tranches } = useTranches(classId ?? '');
  const { data: feeTypes } = useFeeTypes();
  const { data: studentPayments } = useStudentPayments(studentId);
  const createPayment = useCreatePayment();
  const { data: settings } = useSchoolSettings();

  const applicableFees = useMemo(
    () => (feeTypes ?? []).filter((fee) => fee.classes.some((c) => c.id === classId)),
    [feeTypes, classId],
  );

  const paidByKey = useMemo(() => {
    const map = new Map<string, number>();
    for (const payment of studentPayments?.data ?? []) {
      for (const item of payment.items) {
        const key = item.item_type === 'TRANCHE' ? `T-${item.tuition_installment_id}` : `F-${item.fee_type_id}`;
        map.set(key, (map.get(key) ?? 0) + Number(item.paid_amount));
      }
    }
    return map;
  }, [studentPayments]);

  function lineFor(key: string, referenceAmount: number) {
    const already = paidByKey.get(key) ?? 0;
    const remaining = Math.max(referenceAmount - already, 0);
    return { already, remaining };
  }

  function toggleLine(key: string, remaining: number) {
    setSelectedAmounts((current) => {
      const copy = { ...current };
      if (key in copy) {
        delete copy[key];
      } else {
        copy[key] = String(remaining);
      }
      return copy;
    });
  }

  function updateAmount(key: string, value: string, remaining: number) {
    if (value === '') {
      setSelectedAmounts((current) => ({ ...current, [key]: value }));
      return;
    }

    const amount = Number(value);
    setSelectedAmounts((current) => ({
      ...current,
      [key]: Number.isFinite(amount) ? String(Math.min(Math.max(amount, 0), remaining)) : current[key] ?? '',
    }));
  }

  const total = Object.values(selectedAmounts).reduce((sum, v) => sum + (Number(v) || 0), 0);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!studentId) {
      setError('Sélectionnez un élève.');
      return;
    }

    const items: NewPaymentLine[] = Object.entries(selectedAmounts)
      .filter(([, amount]) => Number(amount) > 0)
      .map(([key, amount]) => {
        const [type, id] = key.split('-');
        return type === 'T'
          ? { item_type: 'TRANCHE', tuition_installment_id: Number(id), paid_amount: Number(amount) }
          : { item_type: 'AUTRE_FRAIS', fee_type_id: Number(id), paid_amount: Number(amount) };
      });

    const invalidLine = Object.entries(selectedAmounts).find(([key, amount]) => {
      const [type, id] = key.split('-');
      const reference = type === 'T'
        ? tranches?.find((tranche) => tranche.id === Number(id))?.amount
        : applicableFees.find((fee) => fee.id === Number(id))?.amount;
      return reference !== undefined && Number(amount) > lineFor(key, Number(reference)).remaining;
    });

    if (invalidLine) {
      const [type, id] = invalidLine[0].split('-');
      const label = type === 'T'
        ? tranches?.find((tranche) => tranche.id === Number(id))?.label
        : applicableFees.find((fee) => fee.id === Number(id))?.label;
      const reference = type === 'T'
        ? tranches?.find((tranche) => tranche.id === Number(id))?.amount
        : applicableFees.find((fee) => fee.id === Number(id))?.amount;
      setError(`Le montant de « ${label ?? 'cette ligne'} » dépasse le reste autorisé de ${currency.format(lineFor(invalidLine[0], Number(reference)).remaining)} XOF.`);
      return;
    }

    if (items.length === 0) {
      setError('Sélectionnez au moins une tranche ou un frais à encaisser.');
      return;
    }

    try {
      const payment = await createPayment.mutateAsync({ student_id: studentId, items });
      await downloadPaymentReceiptPdf(
        {
          reference_code: payment.reference_code,
          payment_date: payment.payment_date,
          student: payment.student
            ? { ...payment.student, class: selectedStudent?.class?.label ?? null }
            : null,
          cashier: payment.cashier,
          items: payment.items.map((item) => ({
            label: item.item_type === 'TRANCHE'
              ? ((item as PaymentItemWithLabel).tuition_installment?.label ?? 'Tranche')
              : ((item as PaymentItemWithLabel).fee_type?.label ?? 'Autre frais'),
            paid_amount: item.paid_amount,
          })),
          total_paid_amount: payment.total_paid_amount,
        },
        settings ?? null,
      );
      onClose();
    } catch (requestError: unknown) {
      const response = (requestError as {
        response?: { data?: { message?: string; errors?: Record<string, string[]> } };
      }).response;
      const validationMessage = response?.data?.errors
        ? Object.values(response.data.errors).flat()[0]
        : undefined;
      setError(validationMessage ?? response?.data?.message ?? 'Impossible d’enregistrer le paiement.');
    }
  }

  return (
    <Modal title="Nouveau paiement" onClose={onClose} widthClassName="max-w-2xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">
            {error}
          </div>
        )}

        <Field label="Élève">
          <input
            value={studentId ? `${selectedStudent?.full_name} (${selectedStudent?.matricule})` : studentSearch}
            onChange={(e) => {
              setStudentId(null);
              setStudentSearch(e.target.value);
            }}
            placeholder="Rechercher par matricule ou par nom..."
            className={inputClass}
          />
          {!studentId && studentSearch && (
            <div className="mt-1 max-h-40 overflow-y-auto rounded-lg border border-border bg-surface">
              {(studentResults?.data ?? []).map((s) => (
                <button
                  type="button"
                  key={s.id}
                  onClick={() => {
                    setStudentId(s.id);
                    setSelectedAmounts({});
                  }}
                  className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-paper"
                >
                  <span>{s.full_name}</span>
                  <span className="font-tabular text-xs text-ink-soft">{s.matricule}</span>
                </button>
              ))}
              {(studentResults?.data ?? []).length === 0 && (
                <p className="px-3 py-2 text-sm text-ink-soft">Aucun élève trouvé.</p>
              )}
            </div>
          )}
        </Field>

        {studentId && (
          <div className="space-y-3">
            <div className="grid grid-cols-1 gap-2 rounded-lg border border-border bg-paper px-3 py-3 text-sm sm:grid-cols-3">
              <div><p className="text-xs text-ink-soft">Nom et prénom</p><p className="font-medium text-ink">{selectedStudent?.full_name ?? '—'}</p></div>
              <div><p className="text-xs text-ink-soft">Classe</p><p className="font-medium text-ink">{selectedStudent?.class?.label ?? '—'}</p></div>
              <div><p className="text-xs text-ink-soft">Reste à payer</p><p className="font-tabular font-semibold text-danger">
                {currency.format(
                  (tranches ?? []).reduce((sum, t) => sum + lineFor(`T-${t.id}`, Number(t.amount)).remaining, 0) +
                    applicableFees.reduce((sum, fee) => sum + lineFor(`F-${fee.id}`, Number(fee.amount)).remaining, 0),
                )}{' '}
                XOF
              </p></div>
            </div>
            <div>
              <p className="mb-1.5 text-sm font-medium text-ink">Tranches</p>
              <div className="divide-y divide-border rounded-lg border border-border">
                {(tranches ?? []).length === 0 && (
                  <p className="px-3 py-3 text-sm text-ink-soft">Aucune tranche pour cette classe.</p>
                )}
                {tranches?.map((t) => {
                  const key = `T-${t.id}`;
                  const { remaining } = lineFor(key, Number(t.amount));
                  const checked = key in selectedAmounts;
                  return (
                    <label
                      key={t.id}
                      className={`flex items-center justify-between gap-3 px-3 py-2.5 text-sm ${
                        remaining <= 0 ? 'opacity-50' : 'cursor-pointer hover:bg-paper'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          disabled={remaining <= 0}
                          checked={checked}
                          onChange={() => toggleLine(key, remaining)}
                        />
                        {t.label}
                      </span>
                      <span className="flex items-center gap-2">
                        {checked ? (
                          <input
                            type="number"
                            min={0}
                            max={remaining}
                            step="0.01"
                            value={selectedAmounts[key]}
                            onChange={(e) => updateAmount(key, e.target.value, remaining)}
                            className="font-tabular w-28 rounded border border-border px-2 py-1 text-right text-sm"
                          />
                        ) : (
                          <span className="font-tabular text-ink-soft">
                            {remaining <= 0 ? 'Soldé' : `Reste ${currency.format(remaining)}`}
                          </span>
                        )}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div>
              <p className="mb-1.5 text-sm font-medium text-ink">Autres frais</p>
              <div className="divide-y divide-border rounded-lg border border-border">
                {applicableFees.length === 0 && (
                  <p className="px-3 py-3 text-sm text-ink-soft">Aucun frais applicable à cette classe.</p>
                )}
                {applicableFees.map((fee) => {
                  const key = `F-${fee.id}`;
                  const { remaining } = lineFor(key, Number(fee.amount));
                  const checked = key in selectedAmounts;
                  return (
                    <label
                      key={fee.id}
                      className={`flex items-center justify-between gap-3 px-3 py-2.5 text-sm ${
                        remaining <= 0 ? 'opacity-50' : 'cursor-pointer hover:bg-paper'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          disabled={remaining <= 0}
                          checked={checked}
                          onChange={() => toggleLine(key, remaining)}
                        />
                        {fee.label}
                      </span>
                      <span className="flex items-center gap-2">
                        {checked ? (
                          <input
                            type="number"
                            min={0}
                            max={remaining}
                            step="0.01"
                            value={selectedAmounts[key]}
                            onChange={(e) => updateAmount(key, e.target.value, remaining)}
                            className="font-tabular w-28 rounded border border-border px-2 py-1 text-right text-sm"
                          />
                        ) : (
                          <span className="font-tabular text-ink-soft">
                            {remaining <= 0 ? 'Soldé' : `Reste ${currency.format(remaining)}`}
                          </span>
                        )}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg bg-success-soft px-4 py-3">
              <span className="text-sm font-medium text-success">Total à encaisser</span>
              <span className="font-tabular text-lg font-semibold text-success">{currency.format(total)} XOF</span>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-ink transition hover:bg-paper">
            Annuler
          </button>
          <button
            type="submit"
            disabled={createPayment.isPending || total <= 0}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-dark disabled:opacity-60"
          >
            {createPayment.isPending ? 'Encaissement...' : 'Encaisser'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
