import { Fragment, useEffect, useState } from 'react';
import { BellRing, ChevronDown, FileText, Mail, MessageCircle, Printer, Send, Settings2 } from 'lucide-react';
import { useAuth } from '@/features/auth/AuthContext';
import { useSchoolSettings } from '@/features/settings/useSettings';
import { getApiErrorMessage } from '@/shared/lib/apiError';
import { formatAmount, formatDate, timeAgo } from '@/shared/lib/format';
import { downloadGeneralNoticePdf, downloadReminderListPdf } from '@/shared/lib/pdf';
import { Modal } from '@/shared/components/Modal';
import { useTranches } from '@/features/tranches/useTranches';
import { useLogManualReminder, useReminders, useSaveReminderSettings, useSendReminders, whatsappLink, type ReminderConfig, type ReminderRow } from './useReminders';

const HORIZONS = [
  { value: 0, label: 'Échues' },
  { value: 7, label: 'Échues + 7 jours' },
  { value: 30, label: 'Échues + 30 jours' },
];

const CHANNEL_LABELS: Record<string, string> = { email: 'E-mail', whatsapp: 'WhatsApp auto', whatsapp_manual: 'WhatsApp (manuel)' };

function dueLabel(days: number) {
  if (days < 0) return { text: `Échue depuis ${-days} j`, tone: 'bg-danger-soft text-danger' };
  if (days === 0) return { text: "Échéance aujourd'hui", tone: 'bg-gold-soft text-gold' };
  return { text: `Dans ${days} j`, tone: 'bg-paper text-ink-soft' };
}

/**
 * Relances des familles : les échéances viennent des tranches, le directeur
 * règle le message, les délais et les canaux. Le secrétariat relance d'un clic
 * (e-mail automatique, ou WhatsApp pré-rempli), et tout est tracé.
 */
export default function RemindersPage() {
  const { hasPermission } = useAuth();
  const canConfigure = hasPermission('settings.manage');
  const [horizon, setHorizon] = useState(7);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [notice, setNotice] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [preview, setPreview] = useState<number | null>(null);

  const { data, isLoading } = useReminders(horizon);
  const { data: settings } = useSchoolSettings();
  const sendReminders = useSendReminders();
  const logManual = useLogManualReminder();
  const [noticeOpen, setNoticeOpen] = useState(false);
  const [trancheFilter, setTrancheFilter] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const allRows = data?.rows ?? [];
  // Filtres pour cibler une tranche (ex. tous ceux qui n'ont pas soldé la 2ème tranche) ou une classe.
  const trancheLabels = [...new Set(allRows.flatMap((row) => row.items.map((item) => item.label)))].sort((a, b) => a.localeCompare(b, 'fr', { numeric: true }));
  const classLabels = [...new Set(allRows.map((row) => row.class ?? '—'))];
  const rows = allRows.filter(
    (row) => (!trancheFilter || row.items.some((item) => item.label === trancheFilter)) && (!classFilter || (row.class ?? '—') === classFilter),
  );

  const toggle = (id: number) =>
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  async function send(ids: number[]) {
    setNotice(null);
    try {
      const results = await sendReminders.mutateAsync(ids);
      const ok = results.filter((r) => r.logs.some((log) => log.status === 'sent')).length;
      setNotice({ tone: ok > 0 ? 'success' : 'error', text: `${ok} famille(s) relancée(s) sur ${ids.length}. Sans e-mail, utilisez le bouton WhatsApp.` });
      setSelected(new Set());
    } catch (error) {
      setNotice({ tone: 'error', text: getApiErrorMessage(error) });
    }
  }

  function openWhatsapp(row: ReminderRow) {
    const link = whatsappLink(row);
    if (!link) return;
    window.open(link, '_blank', 'noopener');
    logManual.mutate(row.student_id);
  }

  function printList() {
    void downloadReminderListPdf(
      rows.map((row) => ({
        full_name: row.full_name,
        matricule: row.matricule,
        class: row.class ?? '—',
        guardian: row.guardian ?? '—',
        phone: row.phone ?? '—',
        situation: `${formatAmount(row.total)} · ${dueLabel(row.days).text}`,
      })),
      'Relances de paiement',
      settings ?? null,
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-end">
        <div>
          <p className="text-xs font-medium tracking-wide text-primary uppercase">Recouvrement</p>
          <h1 className="mt-1 font-display text-2xl font-semibold text-ink">Relances</h1>
          <p className="mt-1 text-sm text-ink-soft">Familles dont une tranche est échue ou arrive à échéance (dates fixées sur les tranches).</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select value={trancheFilter} onChange={(e) => setTrancheFilter(e.target.value)} className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink">
            <option value="">Toutes les tranches</option>
            {trancheLabels.map((label) => (
              <option key={label} value={label}>
                {label}
              </option>
            ))}
          </select>
          <select value={classFilter} onChange={(e) => setClassFilter(e.target.value)} className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink">
            <option value="">Toutes les classes</option>
            {classLabels.map((label) => (
              <option key={label} value={label}>
                {label}
              </option>
            ))}
          </select>
          <select value={horizon} onChange={(e) => setHorizon(Number(e.target.value))} className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink">
            {HORIZONS.map((h) => (
              <option key={h.value} value={h.value}>
                {h.label}
              </option>
            ))}
          </select>
          <button type="button" onClick={printList} disabled={rows.length === 0} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-ink transition hover:bg-paper disabled:opacity-50">
            <Printer className="h-4 w-4" /> Liste d'appels
          </button>
          <button type="button" onClick={() => setNoticeOpen(true)} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-ink transition hover:bg-paper disabled:opacity-50" title="Avis général aux parents, deux par feuille A4 (une feuille pour deux élèves)">
            <FileText className="h-4 w-4" /> Avis papier
          </button>
          {canConfigure && (
            <button type="button" onClick={() => setShowSettings((open) => !open)} className="flex items-center gap-2 rounded-lg border border-primary px-3 py-2 text-sm font-medium text-primary transition hover:bg-primary-soft">
              <Settings2 className="h-4 w-4" /> Réglages
            </button>
          )}
        </div>
      </div>

      {data && (
        <p className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${data.config.enabled ? 'bg-success-soft text-success' : 'bg-paper text-ink-soft'}`}>
          <BellRing className="h-4 w-4 shrink-0" />
          {data.config.enabled
            ? `Relances automatiques actives : ${data.config.days_before.length ? `J-${data.config.days_before.join(', J-')}` : 'aucune avant échéance'}${data.config.overdue_every ? `, puis tous les ${data.config.overdue_every} jours après l'échéance` : ''} (${data.config.channels.map((c) => (c === 'email' ? 'e-mail' : 'WhatsApp')).join(' + ') || 'aucun canal'}).`
            : 'Relances automatiques désactivées : les relances se font à la main depuis cette page.'}
        </p>
      )}

      {showSettings && data && <SettingsCard config={data.config} placeholders={data.placeholders} defaultTemplate={data.default_template} defaultNotice={data.default_notice} whatsappAuto={data.whatsapp_auto} onSaved={() => setShowSettings(false)} />}
      {noticeOpen && data && <NoticeModal template={data.config.notice_template} rows={allRows} initialTranche={trancheFilter} initialClass={classFilter} onClose={() => setNoticeOpen(false)} />}

      {notice && <p className={`rounded-lg px-3 py-2 text-sm ${notice.tone === 'success' ? 'bg-success-soft text-success' : 'bg-danger-soft text-danger'}`}>{notice.text}</p>}

      <section className="overflow-hidden rounded-xl border border-border bg-surface">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
          <h2 className="font-display text-base font-semibold text-ink">{rows.length} famille(s) à relancer</h2>
          <button
            type="button"
            onClick={() => send([...selected])}
            disabled={selected.size === 0 || sendReminders.isPending}
            className="flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-on-primary transition hover:bg-primary-dark disabled:opacity-50"
          >
            <Send className="h-4 w-4" /> Relancer la sélection ({selected.size})
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-paper text-xs text-ink-soft uppercase">
              <tr>
                <th className="w-10 px-4 py-3">
                  <input type="checkbox" aria-label="Tout sélectionner" checked={rows.length > 0 && selected.size === rows.length} onChange={() => setSelected(selected.size === rows.length ? new Set() : new Set(rows.map((r) => r.student_id)))} />
                </th>
                <th className="px-4 py-3">Élève</th>
                <th className="px-4 py-3">Parent</th>
                <th className="px-4 py-3">Tranches dues</th>
                <th className="px-4 py-3 text-right">Montant</th>
                <th className="px-4 py-3">Dernière relance</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-ink-soft">Chargement…</td>
                </tr>
              )}
              {!isLoading && rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-ink-soft">Aucune famille à relancer sur cette période. Vérifiez que les tranches ont une date d'échéance.</td>
                </tr>
              )}
              {rows.map((row) => {
                const due = dueLabel(row.days);
                return (
                  <Fragment key={row.student_id}>
                    <tr className="align-top">
                      <td className="px-4 py-3">
                        <input type="checkbox" checked={selected.has(row.student_id)} onChange={() => toggle(row.student_id)} aria-label={`Sélectionner ${row.full_name}`} />
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-ink">{row.full_name}</p>
                        <p className="text-xs text-ink-soft">{row.class}</p>
                      </td>
                      <td className="px-4 py-3 text-ink-soft">
                        <p className="text-ink">{row.guardian ?? '—'}</p>
                        <p className="font-tabular text-xs">{row.phone ?? '—'}</p>
                      </td>
                      <td className="px-4 py-3">
                        {row.items.map((item) => (
                          <p key={item.label} className="text-xs text-ink-soft">
                            {item.label} · {formatAmount(item.remaining)} · {formatDate(item.due_date, 'short')}
                          </p>
                        ))}
                        <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${due.tone}`}>{due.text}</span>
                      </td>
                      <td className="font-tabular px-4 py-3 text-right font-semibold whitespace-nowrap text-danger">{formatAmount(row.total)}</td>
                      <td className="px-4 py-3 text-xs text-ink-soft">{row.last_reminded_at ? timeAgo(row.last_reminded_at) : 'jamais'}</td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <button type="button" onClick={() => setPreview(preview === row.student_id ? null : row.student_id)} className="rounded-lg p-1.5 text-ink-soft transition hover:bg-paper hover:text-ink" title="Voir le message">
                            <ChevronDown className={`h-4 w-4 transition ${preview === row.student_id ? 'rotate-180' : ''}`} />
                          </button>
                          {row.whatsapp && (
                            <button type="button" onClick={() => openWhatsapp(row)} className="rounded-lg p-1.5 text-success transition hover:bg-success-soft" title="Envoyer sur WhatsApp (message pré-rempli)">
                              <MessageCircle className="h-4 w-4" />
                            </button>
                          )}
                          {row.email && (
                            <button type="button" onClick={() => send([row.student_id])} className="rounded-lg p-1.5 text-primary transition hover:bg-primary-soft" title="Envoyer par e-mail">
                              <Mail className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                    {preview === row.student_id && (
                      <tr className="bg-paper/60">
                        <td />
                        <td colSpan={6} className="px-4 pb-3">
                          <pre className="font-sans text-xs whitespace-pre-wrap text-ink">{row.message}</pre>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {(data?.history.length ?? 0) > 0 && (
        <section className="overflow-hidden rounded-xl border border-border bg-surface">
          <h2 className="border-b border-border px-4 py-3 font-display text-base font-semibold text-ink">Dernières relances</h2>
          <ul className="divide-y divide-border">
            {data!.history.map((log) => (
              <li key={log.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 text-sm">
                <span className="text-ink">
                  {log.student ?? '—'} <span className="text-xs text-ink-soft">· {CHANNEL_LABELS[log.channel]} · {log.sent_by ?? 'automatique'}</span>
                </span>
                <span className={`text-xs ${log.status === 'sent' ? 'text-ink-soft' : 'text-danger'}`} title={log.error ?? ''}>
                  {log.status === 'sent' ? timeAgo(log.created_at) : 'échec'}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );

}

/** Réglage du directeur : activation, délais, canaux et texte du message. */
function SettingsCard({ config, placeholders, defaultTemplate, defaultNotice, whatsappAuto, onSaved }: { config: ReminderConfig; placeholders: string[]; defaultTemplate: string; defaultNotice: string; whatsappAuto: boolean; onSaved: () => void }) {
  const save = useSaveReminderSettings();
  const [enabled, setEnabled] = useState(config.enabled);
  const [daysBefore, setDaysBefore] = useState(config.days_before.join(', '));
  const [overdueEvery, setOverdueEvery] = useState(config.overdue_every);
  const [channels, setChannels] = useState(config.channels);
  const [template, setTemplate] = useState(config.template);
  const [noticeTemplate, setNoticeTemplate] = useState(config.notice_template);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setTemplate(config.template), [config.template]);

  const toggleChannel = (channel: 'email' | 'whatsapp') => setChannels((current) => (current.includes(channel) ? current.filter((c) => c !== channel) : [...current, channel]));

  async function submit() {
    setError(null);
    const days = [...new Set(daysBefore.split(/[,; ]+/).filter(Boolean).map(Number))].filter((d) => Number.isInteger(d) && d >= 0 && d <= 60);
    try {
      await save.mutateAsync({ enabled, days_before: days, overdue_every: overdueEvery, channels, template, notice_template: noticeTemplate });
      onSaved();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    }
  }

  const field = 'rounded-lg border border-border bg-paper px-3 py-2 text-sm text-ink';

  return (
    <section className="space-y-4 rounded-xl border border-primary/30 bg-surface p-5">
      <h2 className="font-display text-base font-semibold text-ink">Réglages des relances</h2>
      {error && <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>}
      <label className="flex items-center gap-2 text-sm text-ink">
        <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} /> Envoyer les relances automatiquement chaque jour
      </label>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="text-sm">
          <span className="mb-1 block font-medium text-ink">Prévenir … jours avant l'échéance</span>
          <input value={daysBefore} onChange={(e) => setDaysBefore(e.target.value)} placeholder="7, 1" className={`w-full ${field}`} />
          <span className="text-xs text-ink-soft">Ex. « 7, 1 » : une semaine avant et la veille. 0 = le jour même.</span>
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium text-ink">Après l'échéance, rappeler tous les</span>
          <div className="flex items-center gap-2">
            <input type="number" min={0} max={60} value={overdueEvery} onChange={(e) => setOverdueEvery(Number(e.target.value))} className={`w-24 ${field}`} />
            <span className="text-ink-soft">jours (0 = jamais)</span>
          </div>
        </label>
        <div className="text-sm">
          <span className="mb-1 block font-medium text-ink">Canaux automatiques</span>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={channels.includes('email')} onChange={() => toggleChannel('email')} /> E-mail
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={channels.includes('whatsapp')} onChange={() => toggleChannel('whatsapp')} /> WhatsApp
          </label>
          {!whatsappAuto && <span className="text-xs text-ink-soft">WhatsApp automatique non configuré : le bouton WhatsApp de chaque famille ouvre le message pré-rempli.</span>}
        </div>
      </div>
      <label className="block text-sm">
        <span className="mb-1 block font-medium text-ink">Message envoyé aux parents</span>
        <textarea rows={7} maxLength={1000} value={template} onChange={(e) => setTemplate(e.target.value)} className={`w-full ${field}`} />
      </label>
      <div className="flex flex-wrap items-center gap-1.5 text-xs">
        <span className="text-ink-soft">Insérer :</span>
        {placeholders.map((key) => (
          <button key={key} type="button" onClick={() => setTemplate((t) => `${t}{${key}}`)} className="rounded-full border border-border px-2 py-0.5 font-mono text-ink transition hover:bg-paper">
            {`{${key}}`}
          </button>
        ))}
        <button type="button" onClick={() => setTemplate(defaultTemplate)} className="ml-auto text-primary hover:underline">
          Revenir au texte par défaut
        </button>
      </div>
      <p className="text-xs text-ink-soft">
        {'{detail}'} liste les tranches dues avec leur montant et leur échéance ; {'{montant}'} en donne le total ; {'{echeance}'} est la plus proche.
      </p>
      <label className="block text-sm">
        <span className="mb-1 block font-medium text-ink">Texte de l'avis papier (le même pour tous les parents)</span>
        <textarea rows={5} maxLength={1500} value={noticeTemplate} onChange={(e) => setNoticeTemplate(e.target.value)} className={`w-full ${field}`} />
        <span className="flex flex-wrap justify-between gap-2 text-xs text-ink-soft">
          <span>{'{tranche}'}, {'{echeance}'} et {'{ecole}'} sont remplis à l'impression ; le montant par classe figure dans un tableau.</span>
          <button type="button" onClick={() => setNoticeTemplate(defaultNotice)} className="text-primary hover:underline">
            Texte par défaut
          </button>
        </span>
      </label>
      <div className="flex justify-end">
        <button type="button" onClick={submit} disabled={save.isPending} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-on-primary transition hover:bg-primary-dark disabled:opacity-50">
          {save.isPending ? 'Enregistrement…' : 'Enregistrer les réglages'}
        </button>
      </div>
    </section>
  );
}

/**
 * Avis papier général : le même texte pour tous, deux exemplaires par feuille.
 * On choisit la tranche (et au besoin une classe) ; le nombre d'élèves à qui
 * le remettre donne le nombre de feuilles (une feuille pour deux élèves).
 */
function NoticeModal({ template, rows, initialTranche, initialClass, onClose }: { template: string; rows: ReminderRow[]; initialTranche: string; initialClass: string; onClose: () => void }) {
  const { data: tranches } = useTranches('');
  const { data: settings } = useSchoolSettings();
  const labels = [...new Set((tranches ?? []).map((t) => t.label))].sort((a, b) => a.localeCompare(b, 'fr', { numeric: true }));
  const [tranche, setTranche] = useState(initialTranche);
  const [classLabel, setClassLabel] = useState(initialClass);
  const chosen = tranche || labels[0] || '';

  const tableRows = (tranches ?? [])
    .filter((t) => t.label === chosen && (!classLabel || t.school_class?.label === classLabel))
    .map((t) => ({ class: t.school_class?.label ?? '—', amount: Number(t.amount), due_date: t.due_date }));
  const dates = [...new Set(tableRows.map((row) => row.due_date).filter(Boolean))] as string[];
  const dueText = dates.length === 1 ? new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long' }).format(new Date(`${dates[0].slice(0, 10)}T00:00:00`)) : 'indiquée dans le tableau ci-dessous';
  const classOptions = [...new Set((tranches ?? []).filter((t) => t.label === chosen).map((t) => t.school_class?.label ?? '—'))];

  // Élèves concernés d'après la liste des relances : point de départ, modifiable.
  const concerned = rows.filter((row) => row.items.some((item) => item.label === chosen) && (!classLabel || row.class === classLabel)).length;
  const [students, setStudents] = useState<number | null>(null);
  const count = students ?? concerned;
  const pages = Math.max(1, Math.ceil(count / 2));

  const filled = template
    .replaceAll('{tranche}', chosen || 'tranche')
    .replaceAll('{echeance}', dueText)
    .replaceAll('{ecole}', settings?.school_name ?? '');
  const [text, setText] = useState<string | null>(null);
  const finalText = text ?? filled;
  const field = 'w-full rounded-lg border border-border bg-paper px-3 py-2 text-sm text-ink';

  return (
    <Modal title="Avis papier aux parents" onClose={onClose} widthClassName="max-w-2xl">
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="text-sm">
            <span className="mb-1 block font-medium text-ink">Tranche</span>
            <select value={chosen} onChange={(e) => { setTranche(e.target.value); setClassLabel(''); setText(null); setStudents(null); }} className={field}>
              {labels.map((label) => (
                <option key={label} value={label}>{label}</option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium text-ink">Classe</span>
            <select value={classLabel} onChange={(e) => { setClassLabel(e.target.value); setText(null); setStudents(null); }} className={field}>
              <option value="">Toutes</option>
              {classOptions.map((label) => (
                <option key={label} value={label}>{label}</option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium text-ink">Élèves à qui le remettre</span>
            <input type="number" min={1} value={count} onChange={(e) => setStudents(Math.max(1, Number(e.target.value) || 1))} className={field} />
          </label>
        </div>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-ink">Texte de l'avis (modifiable pour cette impression)</span>
          <textarea rows={6} value={finalText} onChange={(e) => setText(e.target.value)} className={field} />
        </label>
        {tableRows.length > 0 && (
          <p className="text-xs text-ink-soft">
            Tableau imprimé sous le texte : {tableRows.map((row) => `${row.class} ${formatAmount(row.amount)}`).join(' · ')}
          </p>
        )}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-paper px-3 py-2 text-sm">
          <span className="text-ink">
            <strong>{pages}</strong> feuille(s) A4 pour {count} élève(s) — deux avis par feuille, à couper au pointillé.
          </span>
          <button
            type="button"
            disabled={!chosen}
            onClick={async () => {
              await downloadGeneralNoticePdf({ text: finalText, rows: tableRows }, pages, settings ?? null);
              onClose();
            }}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-on-primary transition hover:bg-primary-dark disabled:opacity-50"
          >
            <Printer className="h-4 w-4" /> Imprimer
          </button>
        </div>
      </div>
    </Modal>
  );
}
