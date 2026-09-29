import { useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { Ban, Download, HandCoins, Printer, Receipt, Wallet } from 'lucide-react';
import { useAuth } from '@/features/auth/AuthContext';
import { useSchoolSettings } from '@/features/settings/useSettings';
import { Modal } from '@/shared/components/Modal';
import { getApiErrorMessage } from '@/shared/lib/apiError';
import { formatAmount, formatDate, formatTime } from '@/shared/lib/format';
import { downloadCashPointPdf, downloadHandoverPdf } from '@/shared/lib/pdf';
import { fetchHandover, useCashReport, usePendingHandovers, useReceiveCash, type PendingCash, type PendingHandoverRow } from './useCash';

type PeriodMode = 'day' | 'week' | 'month' | 'custom';

const PERIODS: { mode: PeriodMode; label: string }[] = [
  { mode: 'day', label: 'Jour' },
  { mode: 'week', label: 'Semaine' },
  { mode: 'month', label: 'Mois' },
  { mode: 'custom', label: 'Période' },
];

/** Date locale au format AAAA-MM-JJ (toISOString décalerait d'un jour selon le fuseau). */
function isoDate(date: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function periodBounds(mode: PeriodMode, anchor: string, customTo: string): [string, string] {
  const date = new Date(`${anchor}T00:00:00`);
  if (mode === 'week') {
    const monday = new Date(date);
    monday.setDate(date.getDate() - ((date.getDay() + 6) % 7));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return [isoDate(monday), isoDate(sunday)];
  }
  if (mode === 'month') {
    return [isoDate(new Date(date.getFullYear(), date.getMonth(), 1)), isoDate(new Date(date.getFullYear(), date.getMonth() + 1, 0))];
  }
  if (mode === 'custom') return [anchor, customTo < anchor ? anchor : customTo];
  return [anchor, anchor];
}

function periodLabel(mode: PeriodMode, from: string, to: string) {
  if (mode === 'day') return `Journée du ${formatDate(from, 'long')}`;
  if (mode === 'month') return new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(new Date(`${from}T00:00:00`));
  return `Du ${formatDate(from, 'long')} au ${formatDate(to, 'long')}`;
}

const card = 'rounded-xl border border-border bg-surface';
const th = 'px-4 py-2.5';

export default function CashPointPage() {
  const { hasPermission } = useAuth();
  const today = isoDate(new Date());
  const [mode, setMode] = useState<PeriodMode>('day');
  const [anchor, setAnchor] = useState(today);
  const [customTo, setCustomTo] = useState(today);
  const [from, to] = useMemo(() => periodBounds(mode, anchor, customTo), [mode, anchor, customTo]);
  const label = periodLabel(mode, from, to);

  const { data: report, isLoading, isError } = useCashReport(from, to);
  const { data: settings } = useSchoolSettings();
  const [exporting, setExporting] = useState(false);

  async function handleExport() {
    if (!report) return;
    setExporting(true);
    try {
      await downloadCashPointPdf(report, label, settings ?? null);
    } finally {
      setExporting(false);
    }
  }

  /** Bordereau de remise : liste des paiements remis, montants et signatures. */
  async function printHandover(id: number) {
    await downloadHandoverPdf(await fetchHandover(id), settings ?? null);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-end">
        <div>
          <p className="text-xs font-medium tracking-wide text-primary uppercase">Caisse</p>
          <h2 className="mt-1 font-display text-2xl font-semibold text-ink">Point de caisse</h2>
          <p className="mt-1 text-sm text-ink-soft">{label}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg border border-border bg-surface p-0.5">
            {PERIODS.map((period) => (
              <button
                key={period.mode}
                type="button"
                onClick={() => setMode(period.mode)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${mode === period.mode ? 'bg-primary text-on-primary' : 'text-ink-soft hover:text-ink'}`}
              >
                {period.label}
              </button>
            ))}
          </div>
          <input type="date" value={anchor} max={today} onChange={(e) => e.target.value && setAnchor(e.target.value)} className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-ink" aria-label="Date" />
          {mode === 'custom' && (
            <input type="date" value={customTo} min={anchor} max={today} onChange={(e) => e.target.value && setCustomTo(e.target.value)} className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-ink" aria-label="Jusqu'au" />
          )}
          <button
            type="button"
            onClick={handleExport}
            disabled={!report || exporting}
            className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm font-medium text-ink transition hover:bg-paper disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            {exporting ? 'Export…' : 'Imprimer (PDF)'}
          </button>
        </div>
      </div>

      {isError && <p className="rounded-lg border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger">Impossible de charger le point de caisse.</p>}

      <HandoverPanel myPending={report?.my_pending} canReceive={hasPermission('cash.receive')} onPrint={printHandover} />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Stat icon={<Wallet className="h-4 w-4 text-primary" />} label="Total encaissé" value={isLoading ? '—' : formatAmount(report?.total_amount)} />
        <Stat icon={<Receipt className="h-4 w-4 text-success" />} label="Paiements" value={isLoading ? '—' : String(report?.payment_count ?? 0)} />
        <Stat icon={<Ban className="h-4 w-4 text-danger" />} label="Annulations" value={isLoading ? '—' : String(report?.cancellations.length ?? 0)} />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <section className={`${card} overflow-hidden xl:col-span-2`}>
          <h3 className="border-b border-border px-4 py-3 font-display text-base font-semibold text-ink">Détail par classe</h3>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="bg-paper text-xs font-medium tracking-wide text-ink-soft uppercase">
                <tr>
                  <th className={th}>Élève</th>
                  <th className={th}>Heure / réf.</th>
                  <th className={th}>Détail</th>
                  <th className={`${th} text-right`}>Montant</th>
                </tr>
              </thead>
              {!isLoading && report?.by_class.length === 0 && (
                <tbody>
                  <tr><td colSpan={4} className="px-4 py-12 text-center text-sm text-ink-soft">Aucun paiement sur la période.</td></tr>
                </tbody>
              )}
              {report?.by_class.map((group) => (
                <tbody key={group.class} className="divide-y divide-border border-b border-border">
                  <tr className="bg-primary/5">
                    <td colSpan={3} className="px-4 py-2 font-semibold text-ink">{group.class} <span className="font-normal text-ink-soft">· {group.payment_count} paiement(s)</span></td>
                    <td className="font-tabular px-4 py-2 text-right font-semibold text-ink">{formatAmount(group.total_amount)}</td>
                  </tr>
                  {group.students.flatMap((student) =>
                    student.payments.map((payment, index) => (
                      <tr key={payment.id}>
                        <td className="px-4 py-2 align-top font-medium text-ink">{index === 0 ? student.full_name : ''}</td>
                        <td className="font-tabular px-4 py-2 align-top whitespace-nowrap text-ink-soft">
                          {mode === 'day' ? formatTime(payment.created_at) : formatDate(payment.payment_date, 'short')}
                          <span className="block text-xs">{payment.reference_code}</span>
                        </td>
                        <td className="px-4 py-2 align-top text-ink-soft">
                          {payment.lines.map((line) => `${line.label} (${formatAmount(line.amount)})`).join(', ')}
                          {payment.cashier && <span className="block text-xs">par {payment.cashier}</span>}
                        </td>
                        <td className="font-tabular px-4 py-2 text-right align-top font-medium whitespace-nowrap text-success">{formatAmount(payment.total_paid_amount)}</td>
                      </tr>
                    )),
                  )}
                </tbody>
              ))}
            </table>
          </div>
        </section>

        <div className="space-y-5">
          <SummaryList title="Par caissier" rows={(report?.by_cashier ?? []).map((row) => ({ key: String(row.cashier_id), label: row.full_name ?? '—', hint: `${row.payment_count} paiement(s)`, amount: row.total_amount }))} />
          <SummaryList title="Par ligne encaissée" rows={(report?.by_line ?? []).map((row) => ({ key: row.label, label: row.label, amount: row.total_amount }))} />
          {mode !== 'day' && <SummaryList title="Par jour" rows={(report?.by_day ?? []).map((row) => ({ key: row.date, label: formatDate(row.date), hint: `${row.payment_count} paiement(s)`, amount: row.total_amount }))} />}
        </div>
      </div>

      {(report?.handovers.length ?? 0) > 0 && (
        <section className={`${card} overflow-hidden`}>
          <h3 className="border-b border-border px-4 py-3 font-display text-base font-semibold text-ink">Remises de caisse de la période</h3>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-paper text-xs font-medium tracking-wide text-ink-soft uppercase">
                <tr>
                  <th className={th}>Date</th>
                  <th className={th}>Remis par</th>
                  <th className={th}>Reçu par</th>
                  <th className={`${th} text-right`}>Attendu</th>
                  <th className={`${th} text-right`}>Reçu</th>
                  <th className={`${th} text-right`}>Écart</th>
                  <th className={th} />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {report?.handovers.map((handover) => (
                  <tr key={handover.id}>
                    <td className="px-4 py-2.5 whitespace-nowrap text-ink">{formatDate(handover.created_at)} <span className="text-xs text-ink-soft">à {formatTime(handover.created_at)}</span></td>
                    <td className="px-4 py-2.5 text-ink-soft">{handover.cashier ?? '—'}<span className="block text-xs">{handover.payment_count} paiement(s)</span></td>
                    <td className="px-4 py-2.5 text-ink-soft">{handover.received_by ?? '—'}</td>
                    <td className="font-tabular px-4 py-2.5 text-right text-ink">{formatAmount(handover.expected_amount)}</td>
                    <td className="font-tabular px-4 py-2.5 text-right text-ink">{formatAmount(handover.received_amount)}</td>
                    <td className={`font-tabular px-4 py-2.5 text-right font-medium ${handover.difference === 0 ? 'text-success' : 'text-danger'}`}>
                      {handover.difference > 0 ? '+' : ''}{formatAmount(handover.difference)}
                      {handover.note && <span className="block text-xs font-normal text-ink-soft">{handover.note}</span>}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <button type="button" onClick={() => printHandover(handover.id)} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-ink-soft transition hover:bg-paper hover:text-ink">
                        <Printer className="h-3.5 w-3.5" /> Bordereau
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {(report?.cancellations.length ?? 0) > 0 && (
        <section className={`${card} overflow-hidden`}>
          <h3 className="border-b border-border px-4 py-3 font-display text-base font-semibold text-danger">Paiements annulés</h3>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-paper text-xs font-medium tracking-wide text-ink-soft uppercase">
                <tr>
                  <th className={th}>Référence</th>
                  <th className={th}>Élève</th>
                  <th className={`${th} text-right`}>Montant</th>
                  <th className={th}>Annulé</th>
                  <th className={th}>Motif</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {report?.cancellations.map((row) => (
                  <tr key={row.reference_code}>
                    <td className="font-tabular px-4 py-2.5 whitespace-nowrap text-ink-soft">{row.reference_code}</td>
                    <td className="px-4 py-2.5 text-ink">{row.student ?? '—'}<span className="block text-xs text-ink-soft">{row.class}</span></td>
                    <td className="font-tabular px-4 py-2.5 text-right text-danger line-through">{formatAmount(row.total_paid_amount)}</td>
                    <td className="px-4 py-2.5 whitespace-nowrap text-ink-soft">{formatDate(row.deleted_at)} {formatTime(row.deleted_at)}<span className="block text-xs">par {row.deleted_by ?? '—'}</span></td>
                    <td className="px-4 py-2.5 text-ink-soft">{row.reason ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

    </div>
  );
}

function Stat({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <article className={`${card} p-5`}>
      <div className="flex items-center gap-2 text-sm text-ink-soft">{icon} {label}</div>
      <p className="font-tabular mt-3 text-2xl font-semibold text-ink">{value}</p>
    </article>
  );
}

function SummaryList({ title, rows }: { title: string; rows: { key: string; label: string; hint?: string; amount: number }[] }) {
  return (
    <section className={card}>
      <h3 className="border-b border-border px-4 py-3 font-display text-base font-semibold text-ink">{title}</h3>
      {rows.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-ink-soft">—</p>
      ) : (
        <ul className="divide-y divide-border">
          {rows.map((row) => (
            <li key={row.key} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
              <span className="text-ink">{row.label}{row.hint && <span className="block text-xs text-ink-soft">{row.hint}</span>}</span>
              <span className="font-tabular font-medium whitespace-nowrap text-ink">{formatAmount(row.amount)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}


const inputClass = 'mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink';

function sinceLabel(pending: PendingCash) {
  if (!pending.first_date) return '';
  return pending.first_date === pending.last_date ? `du ${formatDate(pending.first_date)}` : `du ${formatDate(pending.first_date)} au ${formatDate(pending.last_date!)}`;
}

/**
 * Remise de caisse : chaque caissier voit l'argent qu'il a en main (encaissé
 * depuis sa dernière remise) ; le directeur voit ce que chacun doit lui
 * remettre et enregistre ce qu'il reçoit.
 */
function HandoverPanel({ myPending, canReceive, onPrint }: { myPending?: PendingCash; canReceive: boolean; onPrint: (id: number) => void }) {
  const { data: pending } = usePendingHandovers(canReceive);
  const [receiving, setReceiving] = useState<PendingHandoverRow | null>(null);

  return (
    <>
      {myPending && myPending.payment_count > 0 && !canReceive && (
        <div className={`${card} flex items-center gap-3 p-4`}>
          <span className="grid h-10 w-10 place-items-center rounded-full bg-gold-soft text-gold">
            <Wallet className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm font-semibold text-ink">
              Argent à remettre au directeur : <span className="font-tabular">{formatAmount(myPending.expected_amount)}</span>
            </p>
            <p className="text-sm text-ink-soft">
              {myPending.payment_count} paiement(s) encaissé(s) {sinceLabel(myPending)}, depuis votre dernière remise.
            </p>
          </div>
        </div>
      )}

      {canReceive && (
        <section className={`${card} overflow-hidden`}>
          <h3 className="flex items-center gap-2 border-b border-border px-4 py-3 font-display text-base font-semibold text-ink">
            <HandCoins className="h-4 w-4 text-primary" /> Caisses à recevoir
          </h3>
          {(pending ?? []).length === 0 ? (
            <p className="px-4 py-5 text-sm text-ink-soft">Tout l'argent encaissé vous a été remis.</p>
          ) : (
            <ul className="divide-y divide-border">
              {pending!.map((row) => (
                <li key={row.cashier_id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                  <div>
                    <p className="font-medium text-ink">{row.cashier}</p>
                    <p className="text-xs text-ink-soft">
                      {row.payment_count} paiement(s) {sinceLabel(row)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-tabular font-semibold text-ink">{formatAmount(row.expected_amount)}</span>
                    <button type="button" onClick={() => setReceiving(row)} className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-on-primary transition hover:bg-primary-dark">
                      Recevoir la caisse
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {receiving && <ReceiveCashModal row={receiving} onClose={() => setReceiving(null)} onPrint={onPrint} />}
    </>
  );
}

/** Le directeur compte l'argent remis par le caissier et l'enregistre ; le bordereau s'imprime ensuite. */
function ReceiveCashModal({ row, onClose, onPrint }: { row: PendingHandoverRow; onClose: () => void; onPrint: (id: number) => void }) {
  const receive = useReceiveCash();
  const [received, setReceived] = useState(String(row.expected_amount));
  const [note, setNote] = useState('');
  const [doneId, setDoneId] = useState<number | null>(null);
  const difference = received === '' ? null : Math.round((Number(received) - row.expected_amount) * 100) / 100;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const handover = await receive.mutateAsync({ cashier_user_id: row.cashier_id, received_amount: Number(received), note: note.trim() || undefined });
    setDoneId(handover.id);
  }

  if (doneId) {
    return (
      <Modal title="Remise enregistrée" onClose={onClose} widthClassName="max-w-sm">
        <p className="text-sm text-ink-soft">La remise de {row.cashier} est enregistrée. Imprimez le bordereau et faites-le signer par les deux parties.</p>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-ink transition hover:bg-paper">Fermer</button>
          <button type="button" onClick={() => onPrint(doneId)} className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-on-primary transition hover:bg-primary-dark">
            <Printer className="h-4 w-4" /> Imprimer le bordereau
          </button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal title={`Recevoir la caisse de ${row.cashier}`} onClose={onClose} widthClassName="max-w-md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="rounded-lg bg-paper px-4 py-3 text-sm">
          <p className="text-ink-soft">
            {row.payment_count} paiement(s) {sinceLabel(row)}, depuis sa dernière remise
          </p>
          <p className="font-tabular mt-1 text-lg font-semibold text-ink">{formatAmount(row.expected_amount)} attendus</p>
        </div>
        <label className="block text-sm">
          <span className="font-medium text-ink">Montant réellement reçu (XOF)</span>
          <input type="number" min={0} step="1" required autoFocus value={received} onChange={(e) => setReceived(e.target.value)} className={`font-tabular ${inputClass}`} />
        </label>
        {difference !== null && (
          <p className={`text-sm font-medium ${difference === 0 ? 'text-success' : 'text-danger'}`}>
            {difference === 0 ? 'Le compte est juste.' : `Écart : ${difference > 0 ? '+' : ''}${formatAmount(difference)} — expliquez-le ci-dessous.`}
          </p>
        )}
        <label className="block text-sm">
          <span className="font-medium text-ink">Observation {difference !== null && difference !== 0 ? '(obligatoire)' : '(facultatif)'}</span>
          <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} required={difference !== null && difference !== 0} className={inputClass} />
        </label>
        <p className="text-xs text-ink-soft">Une fois la remise enregistrée, ces paiements ne peuvent plus être annulés. Les encaissements suivants iront dans la prochaine remise.</p>
        {receive.isError && <p className="text-sm text-danger">{getApiErrorMessage(receive.error)}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-ink transition hover:bg-paper">Annuler</button>
          <button type="submit" disabled={receive.isPending || received === ''} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-on-primary transition hover:bg-primary-dark disabled:opacity-50">
            Enregistrer la remise
          </button>
        </div>
      </form>
    </Modal>
  );
}