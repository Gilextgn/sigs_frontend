import { Fragment, useState } from 'react';
import { ChevronDown, ShieldCheck } from 'lucide-react';
import { SkeletonTableRows } from '@/shared/components/Skeleton';
import { useAuditLogs, type AuditLogRow } from './useAuditLogs';

const CATEGORIES = [
  { value: '', label: 'Toutes les actions' },
  { value: 'caisse', label: 'Caisse (paiements, clôtures)' },
  { value: 'tarifs', label: 'Tarifs (tranches, frais, classes)' },
  { value: 'eleves', label: 'Élèves et tuteurs' },
  { value: 'utilisateurs', label: 'Utilisateurs et droits' },
  { value: 'connexions', label: 'Connexions' },
  { value: 'enseignants', label: 'Enseignants, présences, paie' },
  { value: 'parametres', label: 'Paramètres' },
];

/** Libellés des actions tracées explicitement ; les autres sont déduites (« tranche modifiée »). */
const ACTION_LABELS: Record<string, string> = {
  'payment.created': 'Paiement encaissé',
  'payment.deleted': 'Paiement annulé',
  'payment.receipt_sent': 'Reçu renvoyé au parent',
  'cash.closed': 'Caisse clôturée',
  'cash.reopened': 'Caisse rouverte',
  'auth.login': 'Connexion',
  'auth.logout': 'Déconnexion',
  'auth.login_failed': 'Échec de connexion',
  'auth.password_changed': 'Mot de passe changé',
  'user.permissions_changed': 'Droits modifiés',
  'academic_year.closed': 'Année clôturée',
  'academic_year.reopened': 'Année rouverte',
  'student.reenrolled': 'Élève réinscrit',
  'student.fee_subscriptions': 'Inscriptions aux frais modifiées',
  'guardian.contacts_updated': 'Contacts du tuteur modifiés',
};

const VERBS: Record<string, string> = { created: 'créé(e)', updated: 'modifié(e)', deleted: 'supprimé(e)' };

function actionLabel(log: AuditLogRow): string {
  if (ACTION_LABELS[log.action_code]) return ACTION_LABELS[log.action_code];
  const verb = VERBS[log.action_code.split('.').pop() ?? ''];
  return verb ? `${log.entity_name.charAt(0).toUpperCase()}${log.entity_name.slice(1)} ${verb}` : log.action_code;
}

/** Actions à surveiller de près (argent, tarifs, droits). */
const SENSITIVE = /^(payment\.deleted|cash\.reopened|tuitioninstallment\.|feetype\.(updated|deleted)|schoolclass\.(updated|deleted)|student\.deleted|user\.|payrollentry\.|auth\.login_failed)/;

function show(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

/** Détail d'une ligne : champs avant → après, ou informations de l'action. */
function Detail({ log }: { log: AuditLogRow }) {
  const before = log.changes_json?.before ?? {};
  const after = log.changes_json?.after ?? {};
  const keys = [...new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})])].filter((key) => key !== 'id');

  if (keys.length > 0) {
    return (
      <table className="w-full max-w-2xl text-xs">
        <thead className="text-ink-soft">
          <tr>
            <th className="py-1 pr-4 text-left font-medium">Champ</th>
            <th className="py-1 pr-4 text-left font-medium">Avant</th>
            <th className="py-1 text-left font-medium">Après</th>
          </tr>
        </thead>
        <tbody>
          {keys.map((key) => {
            const changed = show(before?.[key]) !== show(after?.[key]);
            return (
              <tr key={key} className={changed ? 'font-medium text-ink' : 'text-ink-soft'}>
                <td className="py-0.5 pr-4 font-mono">{key}</td>
                <td className="py-0.5 pr-4">{log.changes_json?.before ? show(before?.[key]) : '—'}</td>
                <td className="py-0.5">{log.changes_json?.after ? show(after?.[key]) : '—'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    );
  }

  const details = Object.entries(log.details_json ?? {});
  return details.length ? (
    <ul className="space-y-0.5 text-xs text-ink-soft">
      {details.map(([key, value]) => (
        <li key={key}>
          <span className="font-mono">{key}</span> : {show(value)}
        </li>
      ))}
    </ul>
  ) : (
    <p className="text-xs text-ink-soft">Aucun détail supplémentaire.</p>
  );
}

/**
 * Journal d'audit : qui a fait quoi, quand, d'où, avec le détail avant → après.
 * Les actions sensibles (annulations, tarifs, droits…) sont mises en évidence.
 */
export default function SecurityPage() {
  const [category, setCategory] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState<number | null>(null);
  const { data, isLoading } = useAuditLogs({ category, from, to, page });
  const rows = data?.data ?? [];
  const reset = (fn: () => void) => {
    fn();
    setPage(1);
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-surface p-5">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <h2 className="font-display text-base font-semibold text-ink">Traçabilité</h2>
        </div>
        <ul className="mt-3 grid grid-cols-1 gap-2 text-sm text-ink-soft sm:grid-cols-2">
          <li>• Chaque encaissement, annulation, clôture de caisse et connexion est enregistré.</li>
          <li>• Toute modification de tarif, d’élève, d’utilisateur ou de paie garde l’avant et l’après.</li>
          <li>• Le directeur est notifié des actions de caisse et des changements sensibles faits par d’autres.</li>
          <li>• Les données personnelles chiffrées ne sont jamais recopiées en clair dans le journal.</li>
        </ul>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <select value={category} onChange={(e) => reset(() => setCategory(e.target.value))} className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink">
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
        <label className="text-xs text-ink-soft">
          Du
          <input type="date" value={from} onChange={(e) => reset(() => setFrom(e.target.value))} className="ml-1.5 rounded-lg border border-border bg-surface px-2 py-1.5 text-sm text-ink" />
        </label>
        <label className="text-xs text-ink-soft">
          au
          <input type="date" value={to} onChange={(e) => reset(() => setTo(e.target.value))} className="ml-1.5 rounded-lg border border-border bg-surface px-2 py-1.5 text-sm text-ink" />
        </label>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-surface">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-paper text-xs font-medium tracking-wide text-ink-soft uppercase">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Concerne</th>
                <th className="px-4 py-3">Auteur</th>
                <th className="px-4 py-3">IP</th>
                <th className="w-10 px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading && <SkeletonTableRows columns={6} />}
              {!isLoading && rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-14 text-center text-sm text-ink-soft">
                    Aucune entrée pour ces critères.
                  </td>
                </tr>
              )}
              {rows.map((log) => (
                <Fragment key={log.id}>
                  <tr className={`cursor-pointer transition hover:bg-paper ${SENSITIVE.test(log.action_code) ? 'bg-gold-soft/30' : ''}`} onClick={() => setOpen(open === log.id ? null : log.id)}>
                    <td className="font-tabular px-4 py-3 whitespace-nowrap text-ink-soft">{formatDate(log.created_at)}</td>
                    <td className="px-4 py-3 font-medium text-ink">{actionLabel(log)}</td>
                    <td className="px-4 py-3 text-ink-soft">{log.entity_label ?? (log.entity_id ? `${log.entity_name} #${log.entity_id}` : log.entity_name)}</td>
                    <td className="px-4 py-3 text-ink-soft">{log.actor?.full_name ?? 'Système'}</td>
                    <td className="font-tabular px-4 py-3 text-ink-soft">{log.ip_address ?? '—'}</td>
                    <td className="px-4 py-3 text-ink-soft">
                      <ChevronDown className={`h-4 w-4 transition ${open === log.id ? 'rotate-180' : ''}`} />
                    </td>
                  </tr>
                  {open === log.id && (
                    <tr className="bg-paper/60">
                      <td colSpan={6} className="px-8 py-3">
                        <Detail log={log} />
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
        {data && data.last_page > 1 && (
          <div className="flex items-center justify-between border-t border-border px-4 py-2.5 text-xs text-ink-soft">
            <span>
              {data.total} entrée(s) · page {data.current_page} / {data.last_page}
            </span>
            <div className="flex gap-2">
              <button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)} className="rounded-lg border border-border px-2.5 py-1 disabled:opacity-40">
                Précédent
              </button>
              <button type="button" disabled={page >= data.last_page} onClick={() => setPage(page + 1)} className="rounded-lg border border-border px-2.5 py-1 disabled:opacity-40">
                Suivant
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
