import { useState, type FormEvent } from 'react';
import { Block, ErrorBox, Toggle } from './formParts';
import { KeyRound, MessageCircle, PauseCircle, Pencil, PlayCircle, RefreshCw, Wallet } from 'lucide-react';
import { whatsappLink } from './billing';
import { ContactSection, PaymentsSection, ReminderButton } from './SchoolBillingSections';
import { Modal } from '@/shared/components/Modal';
import { CopyButton } from '@/shared/components/CopyButton';
import { Loader, Spinner } from '@/shared/components/Loader';
import { inputClass } from '@/shared/components/Field';
import { getApiErrorMessage } from '@/shared/lib/apiError';
import { formatDate, timeAgo } from '@/shared/lib/format';
import { EVENT_LABELS, StatusPill, dueLabel, isoInMonths } from './schoolStatus';
import {
  generatePassword,
  useCreateSchool,
  usePlatformSchool,
  useReactivateSchool,
  useResetAdminPassword,
  useSuspendSchool,
  useUpdateSchool,
  useUpdateSchoolAdmin,
  type PlatformSchool,
} from './usePlatform';


function DateShortcuts({ onPick }: { onPick: (iso: string) => void }) {
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {[
        ['+1 mois', 1],
        ['+3 mois', 3],
        ['+12 mois', 12],
      ].map(([label, months]) => (
        <button
          key={label}
          type="button"
          onClick={() => onPick(isoInMonths(months as number))}
          className="rounded-full border border-border px-2.5 py-1 text-xs font-medium text-ink-soft transition hover:border-primary/40 hover:text-primary"
        >
          {label}
        </button>
      ))}
    </div>
  );
}


/* ───────────────────────────── Création ───────────────────────────── */

export function CreateSchoolModal({ onClose }: { onClose: () => void }) {
  const createSchool = useCreateSchool();
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ school: string; name: string; email: string; password: string; phone: string } | null>(null);
  const [form, setForm] = useState({
    name: '',
    admin_name: '',
    admin_email: '',
    admin_password: generatePassword(),
    subscription_due_at: isoInMonths(1),
    auto_suspend: false,
    grace_days: 5,
    contact_phone: '',
    plan_amount: '',
  });

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => setForm((current) => ({ ...current, [key]: value }));

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      const school = await createSchool.mutateAsync({
        ...form,
        subscription_due_at: form.subscription_due_at || null,
        contact_name: form.admin_name,
        contact_phone: form.contact_phone.trim() || null,
        plan_amount: form.plan_amount ? Number(form.plan_amount) : null,
      });
      setCreated({ school: school.name, name: form.admin_name, email: form.admin_email, password: form.admin_password, phone: form.contact_phone });
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Impossible de créer l'établissement."));
    }
  }

  if (created) {
    const loginUrl = `${window.location.origin}/login`;
    const message = [
      `Bonjour ${created.name},`,
      `Votre espace SIGS pour « ${created.school} » est prêt.`,
      '',
      `Lien : ${loginUrl}`,
      `Identifiant : ${created.email}`,
      `Mot de passe temporaire : ${created.password}`,
      '',
      'À votre première connexion, SIGS vous demandera de choisir votre propre mot de passe. Créez ensuite les comptes de votre équipe (Administration › Utilisateurs).',
    ].join('\n');

    return (
      <Modal title="Établissement créé" onClose={onClose} widthClassName="max-w-lg">
        <div className="space-y-4">
          <p className="text-sm text-ink-soft">
            <strong className="text-ink">{created.school}</strong> est actif, avec son année scolaire en cours. Transmettez ces accès à son administrateur :
            le mot de passe ne sera plus affiché.
          </p>
          <dl className="divide-y divide-border overflow-hidden rounded-xl border border-border text-sm">
            {[
              ['Lien', loginUrl],
              ['Identifiant', created.email],
              ['Mot de passe', created.password],
            ].map(([term, value]) => (
              <div key={term} className="flex items-center justify-between gap-3 px-3.5 py-2.5">
                <dt className="text-ink-soft">{term}</dt>
                <dd className="font-tabular min-w-0 truncate font-medium text-ink">{value}</dd>
              </div>
            ))}
          </dl>
          <pre className="max-h-40 overflow-auto rounded-xl bg-paper p-3 text-xs whitespace-pre-wrap text-ink-soft">{message}</pre>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <CopyButton text={message} label="Copier le message" />
              {whatsappLink(created.phone, message) && (
                <a
                  href={whatsappLink(created.phone, message)!}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 rounded-lg bg-[#25D366] px-3 py-2 text-sm font-semibold text-white no-underline transition hover:opacity-90"
                >
                  <MessageCircle className="h-4 w-4" /> WhatsApp
                </a>
              )}
            </div>
            <button type="button" onClick={onClose} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-on-primary transition hover:bg-primary-dark">
              Terminer
            </button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal title="Nouvel établissement" onClose={onClose} widthClassName="max-w-xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        <ErrorBox message={error} />

        <Block label="Nom de l'établissement">
          <input required value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Complexe scolaire Les Palmiers" className={inputClass} />
        </Block>

        <div className="grid gap-4 sm:grid-cols-2">
          <Block label="Administrateur">
            <input required value={form.admin_name} onChange={(e) => set('admin_name', e.target.value)} placeholder="Nom et prénom" className={inputClass} />
          </Block>
          <Block label="E-mail de connexion">
            <input required type="email" value={form.admin_email} onChange={(e) => set('admin_email', e.target.value)} placeholder="directeur@ecole.com" className={inputClass} />
          </Block>
        </div>

        <Block label="Mot de passe temporaire" hint="Il pourra le changer à sa première connexion. Généré pour vous, modifiable.">
          <div className="flex gap-2">
            <input
              required
              minLength={8}
              value={form.admin_password}
              onChange={(e) => set('admin_password', e.target.value)}
              className={`${inputClass} font-tabular`}
            />
            <button
              type="button"
              onClick={() => set('admin_password', generatePassword())}
              aria-label="Générer un autre mot de passe"
              title="Générer un autre mot de passe"
              className="grid w-10 shrink-0 place-items-center rounded-lg border border-border text-ink-soft transition hover:bg-paper hover:text-primary"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        </Block>

        <div className="grid gap-4 sm:grid-cols-2">
          <Block label="WhatsApp du directeur" hint="Pour envoyer les accès et les relances.">
            <input
              type="tel"
              inputMode="tel"
              value={form.contact_phone}
              onChange={(e) => set('contact_phone', e.target.value)}
              placeholder="01 91 48 97 43"
              className={inputClass}
            />
          </Block>
          <Block label="Tarif mensuel (XOF)" hint="Facultatif. Pré-remplit les encaissements.">
            <input
              type="number"
              min={0}
              inputMode="numeric"
              value={form.plan_amount}
              onChange={(e) => set('plan_amount', e.target.value)}
              placeholder="15000"
              className={`${inputClass} font-tabular`}
            />
          </Block>
        </div>

        <Block label="Échéance de l'abonnement" hint="Facultative. Sert à repérer les retards, et à suspendre automatiquement si vous l'activez.">
          <input type="date" value={form.subscription_due_at} onChange={(e) => set('subscription_due_at', e.target.value)} className={inputClass} />
          <DateShortcuts onPick={(iso) => set('subscription_due_at', iso)} />
        </Block>

        <Toggle
          checked={form.auto_suspend}
          onChange={(value) => set('auto_suspend', value)}
          label="Suspendre automatiquement après l'échéance"
          description="Sans intervention de votre part. Vous réactivez en prolongeant l'échéance."
        />
        {form.auto_suspend && (
          <Block label="Délai de grâce (jours)" hint="L'école reste utilisable ce nombre de jours après l'échéance.">
            <input type="number" min={0} max={90} value={form.grace_days} onChange={(e) => set('grace_days', Number(e.target.value))} className={`${inputClass} w-32`} />
          </Block>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-ink transition hover:bg-paper">
            Annuler
          </button>
          <button
            type="submit"
            disabled={createSchool.isPending}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-on-primary transition hover:bg-primary-dark disabled:opacity-60"
          >
            {createSchool.isPending && <Spinner />}
            Créer l'établissement
          </button>
        </div>
      </form>
    </Modal>
  );
}

/* ───────────────────────────── Suspension ───────────────────────────── */

const REASONS = ['Facture impayée', 'Abonnement expiré', 'À la demande du client'];

export function SuspendSchoolModal({ school, onClose }: { school: PlatformSchool; onClose: () => void }) {
  const suspend = useSuspendSchool();
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setError(null);
    try {
      await suspend.mutateAsync({ id: school.id, reason });
      onClose();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Impossible de suspendre cet établissement.'));
    }
  }

  return (
    <Modal title={`Suspendre ${school.name}`} onClose={onClose} widthClassName="max-w-md">
      <div className="space-y-4">
        <ErrorBox message={error} />
        <p className="text-sm text-ink-soft">
          Tous les utilisateurs de cet établissement perdront l'accès <strong className="text-ink">immédiatement</strong>, même connectés. Leurs données restent
          intactes et reviennent dès la réactivation.
        </p>
        <Block label="Motif (affiché à l'école)">
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={255}
            rows={2}
            placeholder="Facture de septembre en attente de règlement"
            className={inputClass}
          />
          <div className="mt-2 flex flex-wrap gap-1.5">
            {REASONS.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setReason(item)}
                className="rounded-full border border-border px-2.5 py-1 text-xs font-medium text-ink-soft transition hover:border-primary/40 hover:text-primary"
              >
                {item}
              </button>
            ))}
          </div>
        </Block>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-ink transition hover:bg-paper">
            Annuler
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={suspend.isPending}
            className="flex items-center gap-2 rounded-lg bg-danger px-4 py-2 text-sm font-semibold text-on-danger transition hover:opacity-90 disabled:opacity-60"
          >
            {suspend.isPending ? <Spinner /> : <PauseCircle className="h-4 w-4" />}
            Suspendre
          </button>
        </div>
      </div>
    </Modal>
  );
}

export function ReactivateSchoolModal({ school, onClose }: { school: PlatformSchool; onClose: () => void }) {
  const reactivate = useReactivateSchool();
  // Une école bloquée pour impayé exige une nouvelle échéance : on la propose d'office.
  const needsNewDue = school.suspension_kind === 'payment';
  const [due, setDue] = useState(needsNewDue ? isoInMonths(1) : '');
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setError(null);
    try {
      await reactivate.mutateAsync({ id: school.id, subscription_due_at: due || null });
      onClose();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Impossible de réactiver cet établissement.'));
    }
  }

  return (
    <Modal title={`Réactiver ${school.name}`} onClose={onClose} widthClassName="max-w-md">
      <div className="space-y-4">
        <ErrorBox message={error} />
        <p className="text-sm text-ink-soft">L'accès est rétabli pour tous ses utilisateurs, avec toutes leurs données.</p>
        <Block
          label="Nouvelle échéance"
          hint={needsNewDue ? "Obligatoire : l'école a été suspendue automatiquement pour impayé, elle le serait de nouveau aussitôt." : 'Facultatif.'}
        >
          <input type="date" value={due} onChange={(e) => setDue(e.target.value)} className={inputClass} />
          <DateShortcuts onPick={setDue} />
        </Block>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-ink transition hover:bg-paper">
            Annuler
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={reactivate.isPending || (needsNewDue && !due)}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-on-primary transition hover:bg-primary-dark disabled:opacity-60"
          >
            {reactivate.isPending ? <Spinner /> : <PlayCircle className="h-4 w-4" />}
            Réactiver
          </button>
        </div>
      </div>
    </Modal>
  );
}

/* ───────────────────────────── Détail ───────────────────────────── */

export function SchoolDetailModal({
  schoolId,
  onClose,
  onSuspend,
  onReactivate,
  onRecordPayment,
}: {
  schoolId: number;
  onClose: () => void;
  onSuspend: (school: PlatformSchool) => void;
  onReactivate: (school: PlatformSchool) => void;
  onRecordPayment: (school: PlatformSchool) => void;
}) {
  const { data: school, isLoading } = usePlatformSchool(schoolId);
  const update = useUpdateSchool();
  const resetPassword = useResetAdminPassword();
  const updateAdmin = useUpdateSchoolAdmin();
  const [draft, setDraft] = useState<{ name: string; due: string; auto: boolean; grace: number } | null>(null);
  const [editingAdmin, setEditingAdmin] = useState<{ id: number; full_name: string; email: string } | null>(null);
  const [reset, setReset] = useState<{ email: string; password: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const values = draft ?? {
    name: school?.name ?? '',
    due: school?.subscription_due_at ?? '',
    auto: school?.auto_suspend ?? false,
    grace: school?.grace_days ?? 0,
  };
  // Seuls les champs modifiés partent au serveur : l'historique ne note que les vrais changements.
  const changes: { name?: string; subscription_due_at?: string | null; auto_suspend?: boolean; grace_days?: number } = {};
  if (draft && school) {
    if (draft.name.trim() && draft.name.trim() !== school.name) changes.name = draft.name.trim();
    if (draft.due !== (school.subscription_due_at ?? '')) changes.subscription_due_at = draft.due || null;
    if (draft.auto !== school.auto_suspend) changes.auto_suspend = draft.auto;
    if (draft.grace !== school.grace_days) changes.grace_days = draft.grace;
  }
  const dirty = Object.keys(changes).length > 0;
  const due = dueLabel(school?.subscription_due_at ?? null);

  async function handleSave() {
    if (!school || !dirty) return;
    setError(null);
    try {
      await update.mutateAsync({ id: school.id, ...changes });
      setDraft(null);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Impossible d'enregistrer."));
    }
  }

  async function handleSaveAdmin(event: FormEvent) {
    event.preventDefault();
    if (!school || !editingAdmin) return;
    setError(null);
    try {
      await updateAdmin.mutateAsync({
        schoolId: school.id,
        userId: editingAdmin.id,
        full_name: editingAdmin.full_name.trim(),
        email: editingAdmin.email.trim(),
      });
      setEditingAdmin(null);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Impossible de modifier l'administrateur."));
    }
  }

  async function handleReset(userId: number) {
    if (!school) return;
    setError(null);
    try {
      const result = await resetPassword.mutateAsync({ id: school.id, userId });
      setReset({ email: result.email, password: result.temporary_password });
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Impossible de réinitialiser le mot de passe.'));
    }
  }

  return (
    <Modal title={school?.name ?? 'Établissement'} onClose={onClose} widthClassName="max-w-2xl">
      {isLoading || !school ? (
        <div className="grid place-items-center py-12">
          <Loader size={48} label="" />
        </div>
      ) : (
        <div className="space-y-5">
          <ErrorBox message={error} />

          <div className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-border bg-paper p-4">
            <div>
              <StatusPill school={school} />
              <p className="mt-2 text-xs text-ink-soft">
                Créé le {formatDate(school.created_at)} · {school.users_count} compte{school.users_count > 1 ? 's' : ''} · dernière connexion {timeAgo(school.last_login_at)}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => onRecordPayment(school)}
                className="flex items-center gap-2 rounded-lg bg-primary px-3.5 py-2 text-sm font-semibold text-on-primary transition hover:bg-primary-dark"
              >
                <Wallet className="h-4 w-4" /> Encaisser
              </button>
              <ReminderButton school={school} />
              {school.status === 'suspended' ? (
                <button
                  type="button"
                  onClick={() => onReactivate(school)}
                  className="flex items-center gap-2 rounded-lg border border-primary/30 px-3.5 py-2 text-sm font-semibold text-primary transition hover:bg-primary-soft"
                >
                  <PlayCircle className="h-4 w-4" /> Réactiver
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => onSuspend(school)}
                  className="flex items-center gap-2 rounded-lg border border-danger/30 px-3.5 py-2 text-sm font-semibold text-danger transition hover:bg-danger-soft"
                >
                  <PauseCircle className="h-4 w-4" /> Suspendre
                </button>
              )}
            </div>
          </div>

          <ContactSection school={school} onError={setError} />

          <PaymentsSection school={school} onError={setError} />

          <section>
            <h3 className="mb-2 text-xs font-semibold tracking-wide text-ink-soft uppercase">Établissement et abonnement</h3>
            <div className="space-y-3 rounded-xl border border-border p-4">
              <Block label="Nom dans la console" hint="Le nom imprimé par l'école sur ses documents reste réglé dans ses propres paramètres.">
                <input required maxLength={160} value={values.name} onChange={(e) => setDraft({ ...values, name: e.target.value })} className={inputClass} />
              </Block>
              <Block label="Échéance" hint={school.subscription_due_at ? `${formatDate(school.subscription_due_at, 'long')} · ${due.text}` : undefined}>
                <input type="date" value={values.due} onChange={(e) => setDraft({ ...values, due: e.target.value })} className={inputClass} />
                <DateShortcuts onPick={(iso) => setDraft({ ...values, due: iso })} />
              </Block>
              <Toggle
                checked={values.auto}
                onChange={(value) => setDraft({ ...values, auto: value })}
                label="Suspension automatique après l'échéance"
              />
              {values.auto && (
                <Block label="Délai de grâce (jours)">
                  <input
                    type="number"
                    min={0}
                    max={90}
                    value={values.grace}
                    onChange={(e) => setDraft({ ...values, grace: Number(e.target.value) })}
                    className={`${inputClass} w-32`}
                  />
                </Block>
              )}
              {dirty && (
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => setDraft(null)} className="rounded-lg border border-border px-3.5 py-2 text-sm font-medium text-ink hover:bg-paper">
                    Annuler
                  </button>
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={update.isPending}
                    className="flex items-center gap-2 rounded-lg bg-primary px-3.5 py-2 text-sm font-semibold text-on-primary hover:bg-primary-dark disabled:opacity-60"
                  >
                    {update.isPending && <Spinner />} Enregistrer
                  </button>
                </div>
              )}
            </div>
          </section>

          <section>
            <h3 className="mb-2 text-xs font-semibold tracking-wide text-ink-soft uppercase">Administrateurs</h3>
            <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border">
              {school.admins.length === 0 && <li className="px-4 py-4 text-sm text-ink-soft">Aucun administrateur.</li>}
              {school.admins.map((admin) =>
                editingAdmin?.id === admin.id ? (
                  <li key={admin.id} className="px-4 py-3">
                    <form onSubmit={handleSaveAdmin} className="space-y-3">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <Block label="Nom et prénom">
                          <input
                            required
                            maxLength={180}
                            value={editingAdmin.full_name}
                            onChange={(e) => setEditingAdmin({ ...editingAdmin, full_name: e.target.value })}
                            className={inputClass}
                          />
                        </Block>
                        <Block label="E-mail de connexion">
                          <input
                            required
                            type="email"
                            maxLength={180}
                            value={editingAdmin.email}
                            onChange={(e) => setEditingAdmin({ ...editingAdmin, email: e.target.value })}
                            className={inputClass}
                          />
                        </Block>
                      </div>
                      {editingAdmin.email.trim() !== admin.email && (
                        <p className="text-xs text-ink-soft">Prévenez l'administrateur : il devra se connecter avec ce nouvel e-mail.</p>
                      )}
                      <div className="flex justify-end gap-2">
                        <button type="button" onClick={() => setEditingAdmin(null)} className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-ink hover:bg-paper">
                          Annuler
                        </button>
                        <button
                          type="submit"
                          disabled={updateAdmin.isPending}
                          className="flex items-center gap-2 rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-on-primary hover:bg-primary-dark disabled:opacity-60"
                        >
                          {updateAdmin.isPending && <Spinner />} Enregistrer
                        </button>
                      </div>
                    </form>
                  </li>
                ) : (
                  <li key={admin.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-ink">{admin.full_name}</p>
                      <p className="truncate text-xs text-ink-soft">
                        {admin.email} · connecté {timeAgo(admin.last_login_at)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setEditingAdmin({ id: admin.id, full_name: admin.full_name, email: admin.email })}
                        className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-ink transition hover:bg-paper"
                      >
                        <Pencil className="h-3.5 w-3.5" /> Modifier
                      </button>
                      <button
                        type="button"
                        onClick={() => handleReset(admin.id)}
                        disabled={resetPassword.isPending}
                        className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-ink transition hover:bg-paper disabled:opacity-60"
                      >
                        <KeyRound className="h-3.5 w-3.5" /> Nouveau mot de passe
                      </button>
                    </div>
                  </li>
                ),
              )}
            </ul>
            {reset && (
              <div className="mt-3 rounded-xl border border-primary/30 bg-primary-soft px-4 py-3 text-sm">
                <p className="text-primary-dark">
                  Nouveau mot de passe pour <strong>{reset.email}</strong>, affiché une seule fois. Temporaire : il devra en choisir un à sa prochaine connexion.
                </p>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <code className="font-tabular text-base font-semibold text-ink">{reset.password}</code>
                  <CopyButton text={reset.password} />
                </div>
              </div>
            )}
          </section>

          <section>
            <h3 className="mb-2 text-xs font-semibold tracking-wide text-ink-soft uppercase">Historique</h3>
            <ol className="space-y-2.5 border-l border-border pl-4">
              {school.events.map((event) => (
                <li key={event.id} className="relative text-sm">
                  <span className="absolute top-1.5 -left-[21px] h-2 w-2 rounded-full bg-primary" />
                  <p className="font-medium text-ink">
                    {EVENT_LABELS[event.action] ?? event.action}
                    {event.reason && <span className="font-normal text-ink-soft"> · {event.reason}</span>}
                  </p>
                  <p className="text-xs text-ink-soft">
                    {formatDate(event.created_at)}
                    {event.actor ? ` · ${event.actor}` : ''}
                  </p>
                </li>
              ))}
            </ol>
          </section>
        </div>
      )}
    </Modal>
  );
}
