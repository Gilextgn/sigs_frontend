import { useState, type FormEvent } from 'react';
import { CheckCircle2, MessageCircle, Wallet } from 'lucide-react';
import { Modal } from '@/shared/components/Modal';
import { Spinner } from '@/shared/components/Loader';
import { inputClass } from '@/shared/components/Field';
import { getApiErrorMessage } from '@/shared/lib/apiError';
import { formatAmount, formatDate } from '@/shared/lib/format';
import { METHOD_LABELS, addMonthsIso, todayIso, whatsappLink } from './billing';
import { Block, ErrorBox, Toggle } from './formParts';
import { useRecordSchoolPayment, type PaymentMethod, type PlatformSchool } from './usePlatform';

const PERIODS = [1, 3, 6, 12];

/**
 * Encaisser l'abonnement d'une école : le paiement est enregistré et
 * l'échéance prolongée d'autant (depuis l'échéance en cours, ou aujourd'hui
 * s'il n'y en a pas). Une école suspendue à la main est réactivée d'office.
 */
export function RecordPaymentModal({ school, onClose }: { school: PlatformSchool; onClose: () => void }) {
  const record = useRecordSchoolPayment();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ amount: number; dueAfter: string; months: number } | null>(null);
  const [form, setForm] = useState({
    amount: school.plan_amount ? String(school.plan_amount) : '',
    months: 1,
    paid_at: todayIso(),
    method: 'mobile_money' as PaymentMethod,
    reference: '',
    note: '',
    reactivate: true,
  });
  // Échéance proposée ; le propriétaire peut la corriger (geste commercial, date négociée).
  const [dueOverride, setDueOverride] = useState<string | null>(null);

  const baseDue = school.subscription_due_at ?? todayIso();
  const proposedDue = addMonthsIso(baseDue, form.months);
  const dueAfter = dueOverride ?? proposedDue;
  const amount = Number(form.amount);
  const monthly = school.plan_amount ?? 0;
  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => setForm((current) => ({ ...current, [key]: value }));

  function pickMonths(months: number) {
    setDueOverride(null);
    setForm((current) => ({
      ...current,
      months,
      // Montant suivi tant qu'il correspond au tarif : 3 mois → 3 × mensualité.
      amount: monthly && (current.amount === '' || Number(current.amount) === monthly * current.months) ? String(monthly * months) : current.amount,
    }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      await record.mutateAsync({
        schoolId: school.id,
        amount,
        paid_at: form.paid_at,
        months: form.months,
        due_after: dueAfter,
        method: form.method,
        reference: form.reference.trim() || null,
        note: form.note.trim() || null,
        reactivate: form.reactivate,
      });
      setDone({ amount, dueAfter, months: form.months });
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Impossible d'enregistrer le paiement."));
    }
  }

  if (done) {
    const receipt = [
      `Bonjour${school.contact_name ? ` ${school.contact_name}` : ''},`,
      `Nous avons bien reçu votre paiement de ${formatAmount(done.amount)} pour l'abonnement SIGS de « ${school.name} » (${done.months} mois).`,
      `Votre accès est valable jusqu'au ${formatDate(done.dueAfter, 'long')}. Merci pour votre confiance !`,
    ].join('\n');
    const link = whatsappLink(school.contact_phone, receipt);

    return (
      <Modal title="Paiement enregistré" onClose={onClose} widthClassName="max-w-md">
        <div className="space-y-4 text-center">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-success-soft text-success">
            <CheckCircle2 className="h-6 w-6" />
          </span>
          <p className="text-sm text-ink-soft">
            <strong className="text-ink">{formatAmount(done.amount)}</strong> encaissés. {school.name} est à jour jusqu'au{' '}
            <strong className="text-ink">{formatDate(done.dueAfter, 'long')}</strong>.
          </p>
          <div className="flex flex-col gap-2">
            {link && (
              <a
                href={link}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-2 rounded-lg bg-[#25D366] px-4 py-2.5 text-sm font-semibold text-white no-underline transition hover:opacity-90"
              >
                <MessageCircle className="h-4 w-4" /> Envoyer la confirmation sur WhatsApp
              </a>
            )}
            <button type="button" onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-ink transition hover:bg-paper">
              Terminer
            </button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal title={`Encaisser · ${school.name}`} onClose={onClose} widthClassName="max-w-lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <ErrorBox message={error} />

        <Block label="Période payée">
          <div className="flex flex-wrap gap-1.5">
            {PERIODS.map((months) => (
              <button
                key={months}
                type="button"
                onClick={() => pickMonths(months)}
                aria-pressed={form.months === months}
                className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                  form.months === months ? 'border-primary bg-primary-soft text-primary-dark' : 'border-border text-ink-soft hover:border-primary/40'
                }`}
              >
                {months} mois
              </button>
            ))}
          </div>
        </Block>

        <div className="grid gap-4 sm:grid-cols-2">
          <Block label="Montant reçu (XOF)" hint={monthly ? `Tarif : ${formatAmount(monthly)} / mois` : 'Astuce : renseignez le tarif dans la fiche pour pré-remplir.'}>
            <input
              required
              type="number"
              min={1}
              inputMode="numeric"
              value={form.amount}
              onChange={(e) => set('amount', e.target.value)}
              className={`${inputClass} font-tabular`}
            />
          </Block>
          <Block label="Reçu le">
            <input required type="date" max={todayIso()} value={form.paid_at} onChange={(e) => set('paid_at', e.target.value)} className={inputClass} />
          </Block>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Block label="Moyen de paiement">
            <select value={form.method} onChange={(e) => set('method', e.target.value as PaymentMethod)} className={inputClass}>
              {(Object.keys(METHOD_LABELS) as PaymentMethod[]).map((method) => (
                <option key={method} value={method}>
                  {METHOD_LABELS[method]}
                </option>
              ))}
            </select>
          </Block>
          <Block label="Référence (facultatif)">
            <input maxLength={120} value={form.reference} onChange={(e) => set('reference', e.target.value)} placeholder="N° de transaction" className={inputClass} />
          </Block>
        </div>

        <Block
          label="Nouvelle échéance"
          hint={
            dueOverride
              ? 'Modifiée à la main.'
              : school.subscription_due_at
                ? `Échéance actuelle (${formatDate(school.subscription_due_at)}) + ${form.months} mois.`
                : `Aujourd'hui + ${form.months} mois (aucune échéance jusqu'ici).`
          }
        >
          <input required type="date" value={dueAfter} onChange={(e) => setDueOverride(e.target.value || null)} className={inputClass} />
        </Block>

        <Block label="Note (facultatif)">
          <input maxLength={255} value={form.note} onChange={(e) => set('note', e.target.value)} placeholder="Payé par le promoteur, geste commercial…" className={inputClass} />
        </Block>

        {school.suspension_kind === 'manual' && (
          <Toggle
            checked={form.reactivate}
            onChange={(value) => set('reactivate', value)}
            label="Réactiver l'école"
            description="Elle est suspendue manuellement : l'accès est rétabli dès l'enregistrement."
          />
        )}

        <div className="flex items-center justify-between gap-2 border-t border-border pt-4">
          <p className="text-sm text-ink-soft">
            {amount > 0 ? (
              <>
                <strong className="font-tabular text-ink">{formatAmount(amount)}</strong> · jusqu'au {formatDate(dueAfter)}
              </>
            ) : (
              'Saisissez le montant reçu.'
            )}
          </p>
          <button
            type="submit"
            disabled={record.isPending || !(amount > 0)}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-on-primary transition hover:bg-primary-dark disabled:opacity-60"
          >
            {record.isPending ? <Spinner /> : <Wallet className="h-4 w-4" />}
            Encaisser
          </button>
        </div>
      </form>
    </Modal>
  );
}
