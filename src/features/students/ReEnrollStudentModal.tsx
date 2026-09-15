import { useState, type ReactNode } from 'react';
import axios from 'axios';
import { AlertTriangle, ArrowRight, CalendarCheck, CalendarPlus } from 'lucide-react';
import { useAuth } from '@/features/auth/AuthContext';
import { useClasses } from '@/features/classes/useClasses';
import { useCreateAcademicYear } from '@/features/settings/useSettings';
import { Modal } from '@/shared/components/Modal';
import { SearchableSelect } from '@/shared/components/SearchableSelect';
import { StudentSearchSelect } from './StudentSearchSelect';
import { useReEnrollStudent, useReEnrollmentContext, type StudentRow } from './useStudents';

const currency = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });

/**
 * Titre de section. Volontairement un <div> et non le composant Field
 * partagé, qui rend un <label> : un <label> contenant un <input> détourne
 * vers celui-ci les taps sur les boutons qu'il enveloppe, ce qui rendait la
 * sélection d'un résultat de recherche inopérante sur mobile.
 */
function FieldBlock({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <span className="mb-1.5 block text-sm font-medium text-ink">{label}</span>
      {children}
    </div>
  );
}

export function ReEnrollStudentModal({
  onClose,
  onCreateStudent,
}: {
  onClose: () => void;
  /** L'élève cherché n'existe pas : bascule vers le formulaire d'inscription. */
  onCreateStudent: () => void;
}) {
  const { hasPermission } = useAuth();
  const canManageYears = hasPermission('settings.manage');
  const { data: classes } = useClasses();
  const reEnroll = useReEnrollStudent();
  const createYear = useCreateAcademicYear();

  const [student, setStudent] = useState<StudentRow | null>(null);
  const [classId, setClassId] = useState<number | ''>('');
  const [error, setError] = useState<string | null>(null);

  const { data: context, isLoading: contextLoading, refetch } = useReEnrollmentContext(student?.id ?? null);
  const blocked = Boolean(context?.blocked_reason);
  const debts = context?.debts ?? [];
  const missingYearCode = context?.expected_next_code ?? null;

  function selectStudent(next: StudentRow) {
    setStudent(next);
    setClassId('');
    setError(null);
  }

  async function handleCreateMissingYear() {
    if (!missingYearCode) return;
    setError(null);
    try {
      await createYear.mutateAsync({ code: missingYearCode });
      await refetch();
    } catch {
      setError(`Impossible de créer l'année ${missingYearCode}.`);
    }
  }

  async function handleSubmit() {
    if (!student || !classId) {
      setError('Sélectionnez un élève puis sa classe pour l’année suivante.');
      return;
    }
    setError(null);
    try {
      await reEnroll.mutateAsync({ studentId: student.id, classId: Number(classId) });
      onClose();
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.message ?? 'Impossible de réinscrire cet élève.');
      } else {
        setError('Impossible de réinscrire cet élève.');
      }
    }
  }

  return (
    <Modal title="Réinscription" onClose={onClose} widthClassName="max-w-lg">
      <div className="space-y-4">
        {error && <p className="rounded-lg border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>}

        <FieldBlock label="Élève à réinscrire">
          {student ? (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-paper px-3 py-2.5">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-ink">{student.full_name}</p>
                <p className="truncate text-xs text-ink-soft">
                  {student.matricule} · classe actuelle : {student.class?.label ?? '—'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setStudent(null)}
                className="shrink-0 text-xs font-medium text-primary hover:underline"
              >
                Changer
              </button>
            </div>
          ) : (
            <StudentSearchSelect onSelect={selectStudent} onCreateNew={onCreateStudent} />
          )}
        </FieldBlock>

        {student && context?.target_year && (
          <div className="flex items-start gap-2 rounded-lg border border-primary/25 bg-primary-soft px-3 py-2.5 text-sm text-primary">
            <CalendarCheck className="mt-0.5 h-4 w-4 shrink-0" />
            <span className="min-w-0">
              Réinscription pour l’année <strong>{context.target_year.code}</strong>
              {context.current_year ? ` (année en cours : ${context.current_year.code})` : ''}
            </span>
          </div>
        )}

        {student && blocked && (
          <div className="rounded-lg border border-danger/30 bg-danger-soft px-3 py-3">
            <div className="flex items-start gap-2 text-sm font-medium text-danger">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <p className="min-w-0">{context?.blocked_reason}</p>
            </div>

            {debts.length > 0 && (
              <>
                <div className="mt-3 space-y-1.5">
                  {debts.map((debt) => (
                    <div key={debt.academic_year} className="flex items-center justify-between gap-2 text-sm">
                      <span className="text-ink">{debt.academic_year}</span>
                      <span className="font-tabular shrink-0 font-semibold text-danger">
                        {currency.format(debt.outstanding_amount)} XOF
                      </span>
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-xs text-ink-soft">
                  Enregistrez le paiement du solde : l’élève sera débloqué automatiquement.
                </p>
              </>
            )}

            {missingYearCode && (
              <div className="mt-3">
                {canManageYears ? (
                  <button
                    type="button"
                    onClick={handleCreateMissingYear}
                    disabled={createYear.isPending}
                    className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white transition hover:bg-primary-dark disabled:opacity-60"
                  >
                    <CalendarPlus className="h-4 w-4" />
                    {createYear.isPending ? 'Création...' : `Créer l’année ${missingYearCode}`}
                  </button>
                ) : (
                  <p className="text-xs text-ink-soft">
                    Demandez à un administrateur de créer l’année {missingYearCode} dans Paramètres.
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {student && !blocked && !contextLoading && (
          <FieldBlock label="Classe pour l’année suivante">
            <SearchableSelect
              value={classId}
              onChange={(v) => setClassId(Number(v))}
              placeholder="Sélectionner une classe"
              options={(classes ?? []).map((c) => ({ value: c.id, label: c.label, hint: c.cycle?.label }))}
            />
          </FieldBlock>
        )}

        <div className="flex flex-wrap justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-ink transition hover:bg-paper"
          >
            {blocked ? 'Fermer' : 'Annuler'}
          </button>
          {!blocked && (
            <button
              type="button"
              disabled={!student || !classId || reEnroll.isPending || contextLoading}
              onClick={handleSubmit}
              className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-dark disabled:opacity-60"
            >
              {reEnroll.isPending ? 'Réinscription...' : 'Réinscrire'} <ArrowRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}
