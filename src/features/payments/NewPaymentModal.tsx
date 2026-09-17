import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Check, RefreshCcw } from 'lucide-react';
import { Modal } from '@/shared/components/Modal';
import { Spinner } from '@/shared/components/Loader';
import { StudentSearchSelect } from '@/features/students/StudentSearchSelect';
import { useStudent, type StudentRow } from '@/features/students/useStudents';
import { useTranches } from '@/features/tranches/useTranches';
import { useFeeTypes } from '@/features/fees/useFeeTypes';
import { useSchoolSettings } from '@/features/settings/useSettings';
import { downloadPaymentReceiptPdf } from '@/shared/lib/pdf';
import { formatAmount, formatNumber } from '@/shared/lib/format';
import { LineStatus } from './LineStatus';
import { toReceiptData, useCreatePayment, useStudentPayments, type NewPaymentLine } from './usePayments';

interface PayableLine {
  key: string;
  label: string;
  group: 'Tranches' | 'Autres frais';
  amount: number;
  paid: number;
  remaining: number;
}

/**
 * Encaisser : choisir l'élève (ou l'arriver déjà choisi depuis sa fiche,
 * les débiteurs, l'accueil), cocher les lignes, valider. Le reçu part
 * aussitôt en PDF.
 *
 * Un montant inférieur au reste d'une ligne est accepté : c'est un acompte,
 * la ligne n'est pas soldée et l'écran comme le reçu le disent.
 */
export function NewPaymentModal({ initialStudentId = null, onClose }: { initialStudentId?: number | null; onClose: () => void }) {
  const [pickedStudent, setPickedStudent] = useState<StudentRow | null>(null);
  const [studentId, setStudentId] = useState<number | null>(initialStudentId);
  const [selectedAmounts, setSelectedAmounts] = useState<Record<string, string>>({});
  const [prefilledFor, setPrefilledFor] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: fetchedStudent } = useStudent(pickedStudent ? null : studentId);
  const student = pickedStudent ?? fetchedStudent ?? null;
  const classId = student?.class?.id;

  const { data: tranches, isLoading: tranchesLoading } = useTranches(classId ?? '');
  const { data: feeTypes } = useFeeTypes();
  const { data: studentPayments, isLoading: paymentsLoading } = useStudentPayments(studentId);
  const createPayment = useCreatePayment();
  const { data: settings } = useSchoolSettings();

  const lines = useMemo<PayableLine[]>(() => {
    if (!classId) return [];

    const paidByKey = new Map<string, number>();
    for (const payment of studentPayments?.data ?? []) {
      for (const item of payment.items) {
        const key = item.item_type === 'TRANCHE' ? `T-${item.tuition_installment_id}` : `F-${item.fee_type_id}`;
        paidByKey.set(key, (paidByKey.get(key) ?? 0) + Number(item.paid_amount));
      }
    }

    const build = (key: string, label: string, group: PayableLine['group'], amount: number): PayableLine => {
      const paid = paidByKey.get(key) ?? 0;
      return { key, label, group, amount, paid, remaining: Math.max(amount - paid, 0) };
    };

    return [
      ...(tranches ?? []).map((t) => build(`T-${t.id}`, t.label, 'Tranches', Number(t.amount))),
      ...(feeTypes ?? [])
        .filter((fee) => fee.classes.some((c) => c.id === classId))
        .map((fee) => build(`F-${fee.id}`, fee.label, 'Autres frais', Number(fee.amount))),
    ];
  }, [classId, tranches, feeTypes, studentPayments]);

  const linesReady = !!classId && !tranchesLoading && !paymentsLoading;

  // Arrivé depuis une fiche ou un débiteur : la prochaine ligne due est
  // pré-cochée pour son reste exact, le montant est visible avant le clic.
  useEffect(() => {
    if (!linesReady || !studentId || prefilledFor === studentId) return;
    const next = lines.find((line) => line.remaining > 0);
    setSelectedAmounts(next ? { [next.key]: String(next.remaining) } : {});
    setPrefilledFor(studentId);
  }, [linesReady, lines, studentId, prefilledFor]);

  const outstanding = lines.reduce((sum, line) => sum + line.remaining, 0);
  const total = Object.values(selectedAmounts).reduce((sum, v) => sum + (Number(v) || 0), 0);
  const remainingAfter = lines
    .filter((line) => line.key in selectedAmounts)
    .reduce((sum, line) => sum + Math.max(line.remaining - (Number(selectedAmounts[line.key]) || 0), 0), 0);

  function chooseStudent(row: StudentRow) {
    setPickedStudent(row);
    setStudentId(row.id);
    setSelectedAmounts({});
    setPrefilledFor(null);
    setError(null);
  }

  function resetStudent() {
    setPickedStudent(null);
    setStudentId(null);
    setSelectedAmounts({});
    setPrefilledFor(null);
  }

  function toggleLine(line: PayableLine) {
    setSelectedAmounts((current) => {
      const copy = { ...current };
      if (line.key in copy) delete copy[line.key];
      else copy[line.key] = String(line.remaining);
      return copy;
    });
  }

  function updateAmount(line: PayableLine, value: string) {
    if (value === '') {
      setSelectedAmounts((current) => ({ ...current, [line.key]: '' }));
      return;
    }
    const amount = Number(value);
    setSelectedAmounts((current) => ({
      ...current,
      [line.key]: Number.isFinite(amount) ? String(Math.min(Math.max(amount, 0), line.remaining)) : current[line.key] ?? '',
    }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!studentId || !student) {
      setError('Choisissez un élève.');
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

    if (items.length === 0) {
      setError('Cochez au moins une ligne et indiquez un montant.');
      return;
    }

    try {
      const payment = await createPayment.mutateAsync({ student_id: studentId, items });
      await downloadPaymentReceiptPdf(toReceiptData(payment, student.class?.label), settings ?? null);
      onClose();
    } catch (requestError: unknown) {
      const response = (requestError as {
        response?: { data?: { message?: string; errors?: Record<string, string[]> } };
      }).response;
      const validationMessage = response?.data?.errors ? Object.values(response.data.errors).flat()[0] : undefined;
      setError(validationMessage ?? response?.data?.message ?? 'Impossible d’enregistrer le paiement.');
    }
  }

  const groups: PayableLine['group'][] = ['Tranches', 'Autres frais'];

  return (
    <Modal title="Encaisser" onClose={onClose} widthClassName="max-w-2xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="rounded-lg border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">{error}</div>}

        {!studentId ? (
          <div>
            <p className="mb-1.5 text-sm font-medium text-ink">Élève</p>
            <StudentSearchSelect onSelect={chooseStudent} />
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-paper px-4 py-3">
            <div className="min-w-0">
              <p className="truncate text-[15px] font-semibold text-ink">{student?.full_name ?? '…'}</p>
              <p className="text-xs text-ink-soft">
                {student?.matricule ?? ''} · {student?.class?.label ?? 'Sans classe'}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-[11px] font-medium tracking-wide text-ink-soft uppercase">Reste à payer</p>
                <p className={`font-tabular text-lg font-semibold ${outstanding > 0 ? 'text-danger' : 'text-success'}`}>
                  {linesReady ? formatAmount(outstanding) : '…'}
                </p>
              </div>
              <button
                type="button"
                onClick={resetStudent}
                className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-ink-soft transition hover:bg-surface hover:text-ink"
              >
                <RefreshCcw className="h-3.5 w-3.5" />
                Changer
              </button>
            </div>
          </div>
        )}

        {studentId && !linesReady && (
          <div className="flex items-center justify-center gap-2 py-8 text-sm text-ink-soft">
            <Spinner className="text-primary" /> Calcul du reste à payer…
          </div>
        )}

        {studentId && linesReady && (
          <div className="space-y-4">
            {groups.map((group) => {
              const groupLines = lines.filter((line) => line.group === group);
              return (
                <div key={group}>
                  <p className="mb-1.5 text-xs font-semibold tracking-wide text-ink-soft uppercase">{group}</p>
                  <div className="divide-y divide-border overflow-hidden rounded-xl border border-border">
                    {groupLines.length === 0 && (
                      <p className="px-3 py-3 text-sm text-ink-soft">
                        {group === 'Tranches' ? 'Aucune tranche définie pour cette classe.' : 'Aucun frais applicable à cette classe.'}
                      </p>
                    )}
                    {groupLines.map((line) => {
                      const checked = line.key in selectedAmounts;
                      const settled = line.remaining <= 0;
                      const typed = Number(selectedAmounts[line.key]) || 0;
                      const leftAfter = Math.max(line.remaining - typed, 0);
                      return (
                        <div key={line.key} className={`px-3 py-2.5 ${settled ? 'opacity-60' : ''} ${checked ? 'bg-primary-soft/40' : ''}`}>
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <button
                              type="button"
                              disabled={settled}
                              onClick={() => toggleLine(line)}
                              aria-pressed={checked}
                              className="flex min-w-0 flex-1 items-center gap-2.5 text-left disabled:cursor-not-allowed"
                            >
                              <span
                                className={`grid h-5 w-5 shrink-0 place-items-center rounded-md border transition ${
                                  checked ? 'border-primary bg-primary text-on-primary' : 'border-border bg-surface'
                                }`}
                              >
                                {checked && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                              </span>
                              <span className="min-w-0">
                                <span className="block truncate text-sm font-medium text-ink">{line.label}</span>
                                <span className="block">
                                  <LineStatus paid={line.paid} remaining={line.remaining} />
                                </span>
                              </span>
                            </button>
                            {checked && (
                              <input
                                type="number"
                                inputMode="numeric"
                                min={0}
                                max={line.remaining}
                                step="1"
                                value={selectedAmounts[line.key]}
                                onChange={(e) => updateAmount(line, e.target.value)}
                                aria-label={`Montant pour ${line.label}`}
                                className="font-tabular w-32 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-right text-sm text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                              />
                            )}
                          </div>
                          {checked && typed > 0 && (
                            <p className={`mt-1.5 pl-7.5 text-xs ${leftAfter > 0 ? 'text-gold' : 'text-success'}`}>
                              {leftAfter > 0
                                ? `Acompte : il restera ${formatAmount(leftAfter)} pour solder cette ligne.`
                                : 'Cette ligne sera soldée.'}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            <div className="rounded-xl bg-sidebar px-4 py-3 text-white">
              <div className="flex items-center justify-between">
                <span className="text-sm text-sidebar-text">Total encaissé</span>
                <span className="font-tabular text-xl font-semibold text-sidebar-accent">{formatAmount(total)}</span>
              </div>
              {total > 0 && remainingAfter > 0 && (
                <p className="mt-1 text-right text-xs text-[#F5C451]">
                  Acompte · reste {formatNumber(remainingAfter)} XOF sur les lignes cochées
                </p>
              )}
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-ink transition hover:bg-paper">
            Annuler
          </button>
          <button
            type="submit"
            disabled={createPayment.isPending || total <= 0}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-on-primary transition hover:bg-primary-dark disabled:opacity-50"
          >
            {createPayment.isPending && <Spinner />}
            {createPayment.isPending ? 'Encaissement…' : total > 0 ? `Encaisser ${formatAmount(total)}` : 'Encaisser'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
