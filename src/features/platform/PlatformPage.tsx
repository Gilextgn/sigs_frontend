import { useMemo, useState } from 'react';
import { BellRing, ChevronRight, PauseCircle, Plus, PlayCircle, School, Search, Wallet } from 'lucide-react';
import { Loader } from '@/shared/components/Loader';
import { formatDate, formatNumber, timeAgo } from '@/shared/lib/format';
import { REMIND_DAYS_BEFORE, needsReminder, reminderPriority, remindedToday } from './billing';
import { RecordPaymentModal } from './BillingModals';
import { ReminderButton } from './SchoolBillingSections';
import { CreateSchoolModal, ReactivateSchoolModal, SchoolDetailModal, SuspendSchoolModal } from './SchoolModals';
import { StatusPill, dueLabel } from './schoolStatus';
import { usePlatformSchools, type PlatformSchool, type SchoolStatus } from './usePlatform';

type Filter = SchoolStatus | 'all';

const DUE_TONE = { ok: 'text-ink', soon: 'text-gold', late: 'text-danger', none: 'text-ink-muted' } as const;

/**
 * Console du propriétaire : où en est chaque école, et la main pour la
 * suspendre ou la réactiver. On n'y voit jamais leurs données — seulement
 * leur statut d'abonnement.
 */
export default function PlatformPage() {
  const { data, isLoading, isError } = usePlatformSchools();
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState(false);
  const [detailId, setDetailId] = useState<number | null>(null);
  const [suspending, setSuspending] = useState<PlatformSchool | null>(null);
  const [reactivating, setReactivating] = useState<PlatformSchool | null>(null);
  const [paying, setPaying] = useState<PlatformSchool | null>(null);

  const toRemind = useMemo(
    () => (data?.schools ?? []).filter(needsReminder).sort((a, b) => reminderPriority(a) - reminderPriority(b)),
    [data],
  );

  const schools = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return (data?.schools ?? []).filter(
      (school) =>
        (filter === 'all' || school.status === filter) &&
        (!needle || school.name.toLowerCase().includes(needle) || school.admin?.email.toLowerCase().includes(needle) || school.admin?.full_name.toLowerCase().includes(needle)),
    );
  }, [data, filter, search]);

  if (isLoading) {
    return (
      <div className="grid min-h-[50vh] place-items-center">
        <Loader />
      </div>
    );
  }

  if (isError || !data) {
    return <p className="rounded-xl border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger">Impossible de charger les établissements.</p>;
  }

  const tiles: { key: Filter; label: string; value: number; tone: string }[] = [
    { key: 'all', label: 'Établissements', value: data.summary.total, tone: 'text-ink' },
    { key: 'active', label: 'Actifs', value: data.summary.active, tone: 'text-success' },
    { key: 'overdue', label: 'En retard', value: data.summary.overdue, tone: 'text-gold' },
    { key: 'suspended', label: 'Suspendus', value: data.summary.suspended, tone: 'text-danger' },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">Établissements</h1>
          <p className="mt-0.5 text-sm text-ink-soft">Vous gérez l'accès de chaque école. Vous ne voyez jamais leurs élèves, paiements ou classes.</p>
        </div>
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary transition hover:bg-primary-dark"
        >
          <Plus className="h-4 w-4" />
          Nouvel établissement
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tiles.map((tile) => (
          <button
            key={tile.key}
            type="button"
            onClick={() => setFilter(tile.key)}
            aria-pressed={filter === tile.key}
            className={`rounded-2xl border bg-surface p-4 text-left transition hover:border-primary/40 ${
              filter === tile.key ? 'border-primary ring-2 ring-primary/15' : 'border-border'
            }`}
          >
            <p className="text-xs font-medium text-ink-soft">{tile.label}</p>
            <p className={`font-tabular mt-1 text-3xl font-bold ${tile.tone}`}>{tile.value}</p>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-3 divide-x divide-border rounded-2xl border border-border bg-surface">
        {[
          ['Encaissé ce mois', data.revenue.this_month],
          ['Mois dernier', data.revenue.last_month],
          [`Depuis janvier ${new Date().getFullYear()}`, data.revenue.this_year],
        ].map(([label, value]) => (
          <div key={label} className="min-w-0 px-4 py-3">
            <p className="truncate text-xs font-medium text-ink-soft">{label}</p>
            <p className="font-tabular mt-0.5 truncate text-lg font-bold text-ink sm:text-xl">
              {formatNumber(value)} <span className="text-xs font-medium text-ink-muted">XOF</span>
            </p>
          </div>
        ))}
      </div>

      {toRemind.length > 0 && (
        <section className="rounded-2xl border border-gold/30 bg-gold-soft/40">
          <div className="flex items-center justify-between gap-2 px-4 pt-3.5 pb-2">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-ink">
              <BellRing className="h-4 w-4 text-gold" /> À relancer
              <span className="rounded-full bg-gold/15 px-2 py-0.5 text-xs font-semibold text-gold">{toRemind.length}</span>
            </h2>
            <p className="hidden text-xs text-ink-soft sm:block">Échéance dans {REMIND_DAYS_BEFORE} jours ou moins, en retard ou suspendues</p>
          </div>
          <ul className="divide-y divide-gold/15">
            {toRemind.map((school) => {
              const due = dueLabel(school.subscription_due_at);
              return (
                <li key={school.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5">
                  <button type="button" onClick={() => setDetailId(school.id)} className="min-w-0 text-left">
                    <span className="block truncate text-sm font-medium text-ink">{school.name}</span>
                    <span className="block truncate text-xs text-ink-soft">
                      {school.status === 'suspended' ? 'Suspendue' : `Échéance ${due.text}`}
                      {school.plan_amount ? ` · ${formatNumber(school.plan_amount)} XOF/mois` : ''}
                      {' · '}
                      {remindedToday(school) ? (
                        <span className="font-medium text-success">relancée aujourd'hui</span>
                      ) : school.last_reminded_at ? (
                        `relancée ${timeAgo(school.last_reminded_at)}`
                      ) : (
                        'jamais relancée'
                      )}
                    </span>
                  </button>
                  <div className="flex items-center gap-1.5">
                    <ReminderButton school={school} compact />
                    <button
                      type="button"
                      onClick={() => setPaying(school)}
                      className="flex items-center gap-1.5 rounded-lg bg-primary px-2.5 py-1.5 text-xs font-semibold text-on-primary transition hover:bg-primary-dark"
                    >
                      <Wallet className="h-4 w-4" /> Encaisser
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <div className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 sm:max-w-sm">
        <Search className="h-4 w-4 shrink-0 text-ink-muted" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher une école ou un administrateur…"
          aria-label="Rechercher un établissement"
          className="w-full min-w-0 bg-transparent text-sm text-ink outline-none placeholder:text-ink-muted"
        />
      </div>

      {schools.length === 0 ? (
        <div className="rounded-2xl border border-border bg-surface px-6 py-14 text-center">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-primary-soft text-primary">
            <School className="h-5 w-5" />
          </span>
          <p className="mt-3 text-sm font-medium text-ink">{data.summary.total === 0 ? 'Aucun établissement pour le moment' : 'Aucun établissement ne correspond'}</p>
          <p className="mt-1 text-sm text-ink-soft">
            {data.summary.total === 0 ? 'Créez le premier : son administrateur pourra ensuite créer son équipe.' : 'Essayez un autre filtre ou une autre recherche.'}
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {schools.map((school) => {
            const due = dueLabel(school.subscription_due_at);
            return (
              <li key={school.id} className="rounded-2xl border border-border bg-surface transition hover:border-primary/30">
                <div className="grid gap-4 p-4 md:grid-cols-[1.4fr_1fr_1fr_auto] md:items-center">
                  <button type="button" onClick={() => setDetailId(school.id)} className="flex min-w-0 items-center gap-3 text-left">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary-soft font-display text-base font-bold text-primary-dark">
                      {school.name.slice(0, 2).toUpperCase()}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-[15px] font-semibold text-ink">{school.name}</span>
                      <span className="block truncate text-xs text-ink-soft">{school.admin ? `${school.admin.full_name} · ${school.admin.email}` : 'Aucun administrateur'}</span>
                    </span>
                  </button>

                  <div>
                    <StatusPill school={school} />
                  </div>

                  <div className="text-sm">
                    <p className={`font-medium ${DUE_TONE[due.tone]}`}>{school.subscription_due_at ? formatDate(school.subscription_due_at) : '—'}</p>
                    <p className="text-xs text-ink-soft">
                      {due.text} · connexion {timeAgo(school.last_login_at)}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 md:justify-end">
                    <button
                      type="button"
                      onClick={() => setPaying(school)}
                      aria-label={`Encaisser ${school.name}`}
                      title="Encaisser un paiement"
                      className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-primary/30 text-primary transition hover:bg-primary-soft"
                    >
                      <Wallet className="h-4 w-4" />
                    </button>
                    {school.status === 'suspended' ? (
                      <button
                        type="button"
                        onClick={() => setReactivating(school)}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-on-primary transition hover:bg-primary-dark md:flex-none"
                      >
                        <PlayCircle className="h-4 w-4" /> Réactiver
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setSuspending(school)}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-danger/30 px-3 py-2 text-sm font-semibold text-danger transition hover:bg-danger-soft md:flex-none"
                      >
                        <PauseCircle className="h-4 w-4" /> Suspendre
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setDetailId(school.id)}
                      aria-label={`Détails de ${school.name}`}
                      className="grid h-9 w-9 place-items-center rounded-lg border border-border text-ink-soft transition hover:bg-paper hover:text-ink"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {creating && <CreateSchoolModal onClose={() => setCreating(false)} />}
      {suspending && <SuspendSchoolModal school={suspending} onClose={() => setSuspending(null)} />}
      {reactivating && <ReactivateSchoolModal school={reactivating} onClose={() => setReactivating(null)} />}
      {detailId !== null && (
        <SchoolDetailModal
          schoolId={detailId}
          onClose={() => setDetailId(null)}
          onSuspend={(school) => {
            setDetailId(null);
            setSuspending(school);
          }}
          onReactivate={(school) => {
            setDetailId(null);
            setReactivating(school);
          }}
          onRecordPayment={(school) => {
            setDetailId(null);
            setPaying(school);
          }}
        />
      )}
      {paying && <RecordPaymentModal school={paying} onClose={() => setPaying(null)} />}
    </div>
  );
}
