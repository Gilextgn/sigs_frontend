import { useState } from 'react';
import { MessageCircle, Trash2 } from 'lucide-react';
import { Spinner } from '@/shared/components/Loader';
import { inputClass } from '@/shared/components/Field';
import { getApiErrorMessage } from '@/shared/lib/apiError';
import { formatAmount, formatDate, timeAgo } from '@/shared/lib/format';
import { METHOD_LABELS, reminderMessage, whatsappLink, whatsappNumber } from './billing';
import { Block } from './formParts';
import { useDeleteSchoolPayment, useLogReminder, useUpdateSchool, type PlatformSchool, type PlatformSchoolDetail } from './usePlatform';

/**
 * Ouvre WhatsApp avec un message de relance adapté (rappel, retard,
 * suspension) et note la relance dans l'historique de l'école.
 */
export function ReminderButton({ school, compact = false }: { school: PlatformSchool; compact?: boolean }) {
  const logReminder = useLogReminder();
  const link = whatsappLink(school.contact_phone, reminderMessage(school));
  const size = compact ? 'px-2.5 py-1.5 text-xs' : 'px-3.5 py-2 text-sm';

  if (!link) {
    return (
      <span
        title="Ajoutez le numéro WhatsApp du contact dans la fiche de l'école"
        className={`flex cursor-not-allowed items-center gap-1.5 rounded-lg border border-dashed border-border font-medium text-ink-muted ${size}`}
      >
        <MessageCircle className="h-4 w-4" /> Pas de numéro
      </span>
    );
  }

  return (
    <a
      href={link}
      target="_blank"
      rel="noreferrer"
      onClick={() => logReminder.mutate(school.id)}
      title={school.last_reminded_at ? `Dernière relance : ${timeAgo(school.last_reminded_at)}` : 'Jamais relancée'}
      className={`flex items-center gap-1.5 rounded-lg border border-[#25D366]/40 font-semibold text-[#128C7E] no-underline transition hover:bg-[#25D366]/10 dark:text-[#25D366] ${size}`}
    >
      <MessageCircle className="h-4 w-4" /> Relancer
    </a>
  );
}

export function ContactSection({ school, onError }: { school: PlatformSchoolDetail; onError: (message: string | null) => void }) {
  const update = useUpdateSchool();
  const initial = {
    contact_name: school.contact_name ?? '',
    contact_phone: school.contact_phone ?? '',
    city: school.city ?? '',
    plan_amount: school.plan_amount !== null ? String(school.plan_amount) : '',
    notes: school.notes ?? '',
  };
  const [draft, setDraft] = useState<typeof initial | null>(null);
  const values = draft ?? initial;
  const dirty = !!draft && (Object.keys(initial) as (keyof typeof initial)[]).some((key) => draft[key] !== initial[key]);
  const set = (key: keyof typeof initial, value: string) => setDraft({ ...values, [key]: value });
  const phoneOk = !values.contact_phone.trim() || whatsappNumber(values.contact_phone) !== null;

  async function handleSave() {
    onError(null);
    try {
      await update.mutateAsync({
        id: school.id,
        contact_name: values.contact_name.trim() || null,
        contact_phone: values.contact_phone.trim() || null,
        city: values.city.trim() || null,
        plan_amount: values.plan_amount ? Number(values.plan_amount) : null,
        notes: values.notes.trim() || null,
      });
      setDraft(null);
    } catch (requestError) {
      onError(getApiErrorMessage(requestError, "Impossible d'enregistrer les coordonnées."));
    }
  }

  return (
    <section>
      <h3 className="mb-2 text-xs font-semibold tracking-wide text-ink-soft uppercase">Contact et tarif</h3>
      <div className="space-y-3 rounded-xl border border-border p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Block label="Contact">
            <input
              maxLength={180}
              value={values.contact_name}
              onChange={(e) => set('contact_name', e.target.value)}
              placeholder="Nom du directeur ou du promoteur"
              className={inputClass}
            />
          </Block>
          <Block label="WhatsApp" hint={phoneOk ? 'Sans indicatif, +229 est ajouté.' : 'Numéro incomplet.'}>
            <input
              type="tel"
              inputMode="tel"
              maxLength={30}
              value={values.contact_phone}
              onChange={(e) => set('contact_phone', e.target.value)}
              placeholder="01 91 48 97 43"
              className={inputClass}
            />
          </Block>
          <Block label="Ville">
            <input maxLength={120} value={values.city} onChange={(e) => set('city', e.target.value)} placeholder="Cotonou" className={inputClass} />
          </Block>
          <Block label="Tarif mensuel (XOF)">
            <input
              type="number"
              min={0}
              inputMode="numeric"
              value={values.plan_amount}
              onChange={(e) => set('plan_amount', e.target.value)}
              className={`${inputClass} font-tabular`}
            />
          </Block>
        </div>
        <Block label="Notes internes" hint="Visibles de vous seul : habitudes de paiement, accords particuliers…">
          <textarea maxLength={2000} rows={2} value={values.notes} onChange={(e) => set('notes', e.target.value)} className={inputClass} />
        </Block>
        {dirty && (
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setDraft(null)} className="rounded-lg border border-border px-3.5 py-2 text-sm font-medium text-ink hover:bg-paper">
              Annuler
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={update.isPending || !phoneOk}
              className="flex items-center gap-2 rounded-lg bg-primary px-3.5 py-2 text-sm font-semibold text-on-primary hover:bg-primary-dark disabled:opacity-60"
            >
              {update.isPending && <Spinner />} Enregistrer
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

export function PaymentsSection({ school, onError }: { school: PlatformSchoolDetail; onError: (message: string | null) => void }) {
  const deletePayment = useDeleteSchoolPayment();
  const [confirmingId, setConfirmingId] = useState<number | null>(null);

  async function handleDelete(paymentId: number) {
    onError(null);
    try {
      await deletePayment.mutateAsync({ schoolId: school.id, paymentId });
      setConfirmingId(null);
    } catch (requestError) {
      onError(getApiErrorMessage(requestError, 'Impossible de supprimer ce paiement.'));
    }
  }

  return (
    <section>
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <h3 className="text-xs font-semibold tracking-wide text-ink-soft uppercase">Paiements reçus</h3>
        {school.total_paid > 0 && (
          <p className="text-xs text-ink-soft">
            Total : <span className="font-tabular font-semibold text-ink">{formatAmount(school.total_paid)}</span>
          </p>
        )}
      </div>
      {school.payments.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border px-4 py-4 text-sm text-ink-soft">Aucun paiement enregistré. Utilisez « Encaisser » à chaque règlement.</p>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border">
          {school.payments.map((payment) => (
            <li key={payment.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5">
              <div className="min-w-0">
                <p className="text-sm font-medium text-ink">
                  <span className="font-tabular">{formatAmount(payment.amount)}</span>
                  <span className="font-normal text-ink-soft">
                    {' '}
                    · {payment.months} mois{payment.method ? ` · ${METHOD_LABELS[payment.method]}` : ''}
                  </span>
                </p>
                <p className="truncate text-xs text-ink-soft">
                  Reçu le {formatDate(payment.paid_at)} · jusqu'au {formatDate(payment.due_after)}
                  {payment.reference ? ` · réf. ${payment.reference}` : ''}
                  {payment.note ? ` · ${payment.note}` : ''}
                </p>
              </div>
              {confirmingId === payment.id ? (
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-ink-soft">Supprimer ?</span>
                  <button type="button" onClick={() => setConfirmingId(null)} className="rounded-lg border border-border px-2 py-1 text-xs text-ink hover:bg-paper">
                    Non
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(payment.id)}
                    disabled={deletePayment.isPending}
                    className="rounded-lg bg-danger px-2 py-1 text-xs font-semibold text-on-danger disabled:opacity-60"
                  >
                    Oui
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmingId(payment.id)}
                  aria-label="Supprimer ce paiement (erreur de saisie)"
                  title="Erreur de saisie ? Supprimer. L'échéance n'est pas modifiée."
                  className="grid h-8 w-8 place-items-center rounded-lg text-ink-muted transition hover:bg-danger-soft hover:text-danger"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
