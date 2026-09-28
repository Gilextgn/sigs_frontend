import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Printer } from 'lucide-react';
import { Modal } from '@/shared/components/Modal';
import { SearchableSelect } from '@/shared/components/SearchableSelect';
import { useSchoolSettings } from '@/features/settings/useSettings';
import { useTeachers } from '@/features/teachers/useTeachers';
import { apiClient } from '@/shared/lib/apiClient';
import { formatAmount } from '@/shared/lib/format';
import { downloadTeacherAnnualSummaryPdf, type TeacherAnnualSummaryData } from '@/shared/lib/pdf';

const STATUS: Record<string, string> = { paid: 'Payé', pending: 'À payer', not_generated: 'Fiche non établie' };

/** Année scolaire en cours : elle commence en septembre. */
function currentStartYear() {
  const now = new Date();
  return now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1;
}

/** Récapitulatif de fin d'année d'un enseignant (septembre → août), imprimable. */
export function AnnualSummaryModal({ onClose }: { onClose: () => void }) {
  const { data: teachers } = useTeachers();
  const { data: settings } = useSchoolSettings();
  const [teacherId, setTeacherId] = useState<number | ''>('');
  const [startYear, setStartYear] = useState(currentStartYear());

  const { data: summary, isFetching } = useQuery({
    queryKey: ['payroll-annual', teacherId, startYear],
    enabled: !!teacherId,
    queryFn: async () =>
      (await apiClient.get<TeacherAnnualSummaryData>('/payroll/annual-summary', { params: { teacher_id: teacherId, start_year: startYear } })).data,
  });

  const years = [0, 1, 2].map((offset) => currentStartYear() - offset);
  const month = (period: string) => new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(new Date(`${period}-01T00:00:00`));

  return (
    <Modal title="Récapitulatif annuel d'un enseignant" onClose={onClose} widthClassName="max-w-3xl">
      {/* Hauteur minimale : la liste déroulante des enseignants ne doit pas être rognée par la fenêtre. */}
      <div className="min-h-[26rem] space-y-4">
        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <SearchableSelect
            value={teacherId}
            onChange={(value) => setTeacherId(Number(value))}
            placeholder="Choisir un enseignant"
            options={(teachers?.data ?? []).map((teacher) => ({ value: teacher.id, label: teacher.full_name }))}
          />
          <select value={startYear} onChange={(e) => setStartYear(Number(e.target.value))} className="rounded-lg border border-border bg-paper px-3 py-2 text-sm text-ink">
            {years.map((year) => (
              <option key={year} value={year}>
                Année {year}-{year + 1}
              </option>
            ))}
          </select>
        </div>

        {teacherId && isFetching && <p className="py-6 text-center text-sm text-ink-soft">Calcul…</p>}
        {summary && !isFetching && (
          <>
            {summary.months.length === 0 ? (
              <p className="py-6 text-center text-sm text-ink-soft">Aucune heure ni fiche de paie sur cette année.</p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-border">
                <table className="w-full text-left text-sm">
                  <thead className="bg-paper text-xs text-ink-soft uppercase">
                    <tr>
                      <th className="px-3 py-2">Mois</th>
                      <th className="px-3 py-2 text-right">Heures</th>
                      <th className="px-3 py-2 text-right">Net</th>
                      <th className="px-3 py-2">Statut</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {summary.months.map((row) => (
                      <tr key={row.period}>
                        <td className="px-3 py-2 capitalize">{month(row.period)}</td>
                        <td className="font-tabular px-3 py-2 text-right">{row.worked_hours.toLocaleString('fr-FR')}</td>
                        <td className="font-tabular px-3 py-2 text-right">{row.net_amount === null ? '—' : formatAmount(row.net_amount)}</td>
                        <td className="px-3 py-2 text-ink-soft">{STATUS[row.status] ?? row.status}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-paper font-semibold">
                    <tr>
                      <td className="px-3 py-2">Total</td>
                      <td className="font-tabular px-3 py-2 text-right">{summary.totals.worked_hours.toLocaleString('fr-FR')}</td>
                      <td className="font-tabular px-3 py-2 text-right">{formatAmount(summary.totals.net_amount)}</td>
                      <td className="px-3 py-2 text-xs font-normal text-ink-soft">reste à payer {formatAmount(summary.totals.pending_amount)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => downloadTeacherAnnualSummaryPdf(summary, settings ?? null)}
                disabled={summary.months.length === 0}
                className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-on-primary transition hover:bg-primary-dark disabled:opacity-50"
              >
                <Printer className="h-4 w-4" /> Imprimer (PDF)
              </button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
