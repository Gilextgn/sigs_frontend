import { useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { Pagination } from '@/shared/components/Pagination';
import { usePaginatedRows } from '@/shared/hooks/usePaginatedRows';
import { useAuditLogs } from './useAuditLogs';

const ACTION_LABELS: Record<string, string> = {
  PAYMENT_CREATED: 'Paiement encaissé',
  STUDENT_CREATED: 'Élève inscrit',
  STUDENT_UPDATED: 'Élève modifié',
  USER_CREATED: 'Utilisateur créé',
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

export default function SecurityPage() {
  const [entity, setEntity] = useState('');
  const { data, isLoading } = useAuditLogs(entity);
  const { pageRows, ...pagination } = usePaginatedRows(data?.data);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-surface p-5">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <h2 className="font-display text-base font-semibold text-ink">Politique de sécurité</h2>
        </div>
        <ul className="mt-3 grid grid-cols-1 gap-2 text-sm text-ink-soft sm:grid-cols-2">
          <li>• Mots de passe hachés (bcrypt), jamais stockés en clair.</li>
          <li>• Session inactive expirée après 10 minutes.</li>
          <li>• Données sensibles (noms, coordonnées) chiffrées au repos.</li>
          <li>• Permissions par rôle + surcharges individuelles, vérifiées à chaque requête.</li>
        </ul>
      </div>

      <div className="flex items-center gap-3">
        <select value={entity} onChange={(e) => setEntity(e.target.value)} className="w-full max-w-[220px] rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20">
          <option value="">Toutes les entités</option>
          <option value="payments">Paiements</option>
          <option value="students">Élèves</option>
          <option value="users">Utilisateurs</option>
        </select>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-surface">
        <table className="w-full text-left text-sm">
          <thead className="bg-paper text-xs font-medium tracking-wide text-ink-soft uppercase">
            <tr>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">Entité</th>
              <th className="px-4 py-3">Auteur</th>
              <th className="px-4 py-3">IP</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading && (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-ink-soft">Chargement...</td></tr>
            )}
            {!isLoading && (data?.data.length ?? 0) === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-14 text-center">
                  <ShieldCheck className="mx-auto h-8 w-8 text-ink-soft" />
                  <p className="mt-2 text-sm text-ink-soft">Aucune entrée dans le journal pour le moment.</p>
                </td>
              </tr>
            )}
            {pageRows.map((log) => (
              <tr key={log.id} className="transition hover:bg-paper">
                <td className="font-tabular px-4 py-3 whitespace-nowrap text-ink-soft">{formatDate(log.created_at)}</td>
                <td className="px-4 py-3 font-medium text-ink">{ACTION_LABELS[log.action_code] ?? log.action_code}</td>
                <td className="px-4 py-3 text-ink-soft">
                  {log.entity_name}{log.entity_id ? ` #${log.entity_id}` : ''}
                </td>
                <td className="px-4 py-3 text-ink-soft">{log.actor?.full_name ?? 'Système'}</td>
                <td className="font-tabular px-4 py-3 text-ink-soft">{log.ip_address ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <Pagination {...pagination} onPageChange={pagination.setPage} />
      </div>
    </div>
  );
}
