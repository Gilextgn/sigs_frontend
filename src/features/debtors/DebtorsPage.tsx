import { Spinner } from '@/shared/components/Loader';
import { useMemo, useState } from 'react';
import { ChevronDown, Download, Eye, UserX } from 'lucide-react';
import { useClasses } from '@/features/classes/useClasses';
import { useTranches } from '@/features/tranches/useTranches';
import { useSchoolSettings } from '@/features/settings/useSettings';
import { SearchableSelect } from '@/shared/components/SearchableSelect';
import { viewIconClass } from '@/shared/components/actionStyles';
import { downloadDebtorsListPdf } from '@/shared/lib/pdf';
import { usePaymentDesk } from '@/features/payments/PaymentDesk';
import { useDebtors } from './useDebtors';
import { currency } from '@/shared/lib/format';


export default function DebtorsPage() {
  const [classId, setClassId] = useState<number | ''>('');
  const [trancheId, setTrancheId] = useState<number | ''>('');
  const [downloading, setDownloading] = useState(false);
  const { openPayment, openStudent, canPay } = usePaymentDesk();

  const { data: classes } = useClasses();
  const { data: tranches } = useTranches(classId);
  const { data: debtors, isLoading } = useDebtors({ classId, trancheId });
  const { data: settings } = useSchoolSettings();
  // Débiteurs rangés par classe, dans l'ordre des classes ; les plus gros restes en tête de chaque classe.
  const groups = useMemo(() => {
    const order = new Map((classes ?? []).map((c, index) => [c.label, index]));
    const byClass = new Map<string, typeof debtors>();
    for (const d of debtors ?? []) {
      const key = d.class ?? 'Sans classe';
      byClass.set(key, [...(byClass.get(key) ?? []), d]);
    }
    return [...byClass.entries()]
      .sort(([a], [b]) => (order.get(a) ?? 999) - (order.get(b) ?? 999))
      .map(([label, rows]) => ({
        label,
        rows: [...(rows ?? [])].sort((a, b) => b.outstanding_amount - a.outstanding_amount),
        outstanding: (rows ?? []).reduce((sum, d) => sum + d.outstanding_amount, 0),
        fees: (rows ?? []).reduce((sum, d) => sum + d.fees_outstanding, 0),
      }));
  }, [debtors, classes]);
  const [open, setOpen] = useState<Set<string>>(new Set());
  const toggle = (label: string) =>
    setOpen((current) => {
      const next = new Set(current);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });

  const totalOutstanding = (debtors ?? []).reduce((sum, d) => sum + d.outstanding_amount, 0);

  const selectedClassLabel = classes?.find((c) => c.id === classId)?.label;
  const selectedTrancheLabel = tranches?.find((t) => t.id === trancheId)?.label;
  const filterLabel = [
    selectedClassLabel ? `Classe : ${selectedClassLabel}` : 'Toutes les classes',
    selectedTrancheLabel ? `Tranche : ${selectedTrancheLabel}` : 'Scolarité entière',
  ].join(' · ');

  async function handleDownload() {
    setDownloading(true);
    try {
      // Même ordre qu'à l'écran : par classe, puis du plus gros reste au plus petit.
      await downloadDebtorsListPdf(groups.flatMap((group) => group.rows), filterLabel, settings ?? null);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div className="flex flex-wrap gap-3">
          <div className="w-48">
            <label className="mb-1.5 block text-xs font-medium text-ink-soft">Classe</label>
            <SearchableSelect
              value={classId}
              clearable
              placeholder="Toutes les classes"
              onChange={(v) => {
                setClassId(v === '' ? '' : Number(v));
                setTrancheId('');
              }}
              options={(classes ?? []).map((c) => ({ value: c.id, label: c.label }))}
            />
          </div>
          <div className="w-48">
            <label className="mb-1.5 block text-xs font-medium text-ink-soft">Tranche</label>
            <SearchableSelect
              value={trancheId}
              clearable
              disabled={!classId}
              placeholder="Scolarité entière"
              onChange={(v) => setTrancheId(v === '' ? '' : Number(v))}
              options={(tranches ?? []).map((t) => ({ value: t.id, label: t.label }))}
            />
          </div>
        </div>
        <button
          onClick={handleDownload}
          disabled={downloading || isLoading || (debtors ?? []).length === 0}
          className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-ink transition hover:bg-paper disabled:opacity-50"
        >
          {downloading ? <Spinner /> : <Download className="h-4 w-4" />}
          Télécharger en PDF
        </button>
      </div>

      <div className="rounded-xl border border-border bg-surface p-4">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="text-xs font-medium tracking-wide text-ink-soft uppercase">Total restant dû</p>
            <p className="font-tabular mt-1 text-2xl font-semibold text-danger">{currency.format(totalOutstanding)} XOF</p>
          </div>
          <p className="text-sm text-ink-soft">
            {(debtors ?? []).length} élève{(debtors ?? []).length > 1 ? 's' : ''} en retard de paiement
          </p>
        </div>
      </div>

      {isLoading && <div className="h-32 animate-pulse rounded-xl bg-paper" />}
      {!isLoading && (debtors ?? []).length === 0 && (
        <div className="rounded-xl border border-border bg-surface px-4 py-14 text-center">
          <UserX className="mx-auto h-8 w-8 text-ink-soft" />
          <p className="mt-2 text-sm text-ink-soft">Aucun débiteur pour ces critères.</p>
        </div>
      )}

      {/* Un cadre par classe (ordre pédagogique), dépliable : total et nombre de familles en tête. */}
      <div className="space-y-3">
        {groups.map((group) => {
          const isOpen = !!classId || open.has(group.label);
          return (
            <section key={group.label} className="overflow-hidden rounded-xl border border-border bg-surface">
              <button type="button" onClick={() => toggle(group.label)} aria-expanded={isOpen} className={`flex w-full flex-wrap items-center justify-between gap-2 bg-paper px-4 py-2.5 text-left transition hover:bg-border/40 ${isOpen ? 'border-b border-border' : ''}`}>
                <span className="flex items-center gap-2 font-display text-base font-semibold text-ink">
                  <ChevronDown className={`h-4 w-4 text-ink-soft transition ${isOpen ? 'rotate-180' : ''}`} />
                  {group.label}
                </span>
                <span className="text-sm text-ink-soft">
                  {group.rows.length} élève(s) · <span className="font-tabular font-semibold text-danger">{currency.format(group.outstanding)} XOF</span>
                  {group.fees > 0 && <span className="ml-1 text-xs text-gold">+ {currency.format(group.fees)} de frais</span>}
                </span>
              </button>
              {isOpen && (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[640px] text-left text-sm">
                    <thead className="text-xs font-medium tracking-wide text-ink-soft uppercase">
                      <tr>
                        <th className="px-4 py-2">Matricule</th>
                        <th className="px-4 py-2">Élève</th>
                        <th className="px-4 py-2">Progression</th>
                        <th className="px-4 py-2 text-right">Dû</th>
                        <th className="px-4 py-2 text-right">Payé</th>
                        <th className="px-4 py-2 text-right">Reste</th>
                        <th className="px-4 py-2 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {group.rows.map((d) => {
                        const ratio = d.theoretical_amount > 0 ? Math.min(d.paid_amount / d.theoretical_amount, 1) : 0;
                        return (
                          <tr key={d.student_id} className="transition hover:bg-paper">
                            <td className="font-tabular px-4 py-2.5 text-ink-soft">{d.matricule}</td>
                            <td className="px-4 py-2.5">
                              <button type="button" onClick={() => openStudent(d.student_id)} className="text-left font-medium text-ink transition hover:text-primary">
                                {d.full_name}
                              </button>
                              {d.unpaid_items.some((item) => item.paid > 0) && <span className="mt-0.5 block text-[11px] font-medium text-gold">Acompte en cours</span>}
                            </td>
                            <td className="px-4 py-2.5">
                              <div className="flex items-center gap-2">
                                <div className="h-1.5 w-20 overflow-hidden rounded-full bg-danger-soft">
                                  <div className="h-full rounded-full bg-success" style={{ width: `${ratio * 100}%` }} />
                                </div>
                                <span className="font-tabular text-xs text-ink-soft">{Math.round(ratio * 100)}%</span>
                              </div>
                            </td>
                            <td className="font-tabular px-4 py-2.5 text-right text-ink-soft">{currency.format(d.theoretical_amount)}</td>
                            <td className="font-tabular px-4 py-2.5 text-right text-success">{currency.format(d.paid_amount)}</td>
                            <td className="font-tabular px-4 py-2.5 text-right font-medium text-danger">
                              {currency.format(d.outstanding_amount)}
                              {d.fees_outstanding > 0 && <span className="block text-xs font-normal text-gold">+ {currency.format(d.fees_outstanding)} de frais</span>}
                            </td>
                            <td className="px-4 py-2.5">
                              <div className="flex items-center justify-end gap-1">
                                <button onClick={() => openStudent(d.student_id)} className={viewIconClass} aria-label={`Voir la fiche de ${d.full_name}`} title="Voir les lignes impayées">
                                  <Eye className="h-4 w-4" />
                                </button>
                                {canPay && (
                                  <button type="button" onClick={() => openPayment(d.student_id)} className="rounded-lg border border-primary/30 px-2.5 py-1 text-xs font-semibold text-primary transition hover:bg-primary-soft">
                                    Encaisser
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
