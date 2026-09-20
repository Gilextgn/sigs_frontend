import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Check, CheckCircle2, Lock, Printer, RefreshCcw } from 'lucide-react';
import { useAuth } from '@/features/auth/AuthContext';
import { useClasses } from '@/features/classes/useClasses';
import { usePaymentDesk } from '@/features/payments/PaymentDesk';
import { useSchoolSettings } from '@/features/settings/useSettings';
import {
  useBulkReEnroll,
  useReEnrollmentProgress,
  type ReEnrollmentProgressStudent,
  type ReEnrollmentState,
} from '@/features/students/useStudents';
import { Loader, Spinner } from '@/shared/components/Loader';
import { formatAmount, formatNumber } from '@/shared/lib/format';
import { downloadReminderListPdf } from '@/shared/lib/pdf';

type Filter = ReEnrollmentState | 'all';

const STATE_LABELS: Record<ReEnrollmentState, string> = {
  re_enrolled: 'Réinscrit',
  blocked: 'Bloqué',
  pending: 'Sans nouvelles',
};

/**
 * La rentrée d'un coup d'œil : qui revient, qui est bloqué par une dette,
 * qui n'a pas encore donné signe de vie — et la réinscription en lot,
 * classe par classe. Les tuiles du haut servent de filtres.
 */
export default function RentreePage() {
  const { hasPermission } = useAuth();
  const canReEnroll = hasPermission('students.reenroll');
  const { openPayment, canPay } = usePaymentDesk();
  const [searchParams, setSearchParams] = useSearchParams();
  const filter = (searchParams.get('state') as Filter | null) ?? 'all';

  const { data: progress, isLoading } = useReEnrollmentProgress();
  const { data: classes } = useClasses();
  const { data: settings } = useSchoolSettings();
  const bulkReEnroll = useBulkReEnroll();

  const [pickedClassId, setClassId] = useState<number | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [targets, setTargets] = useState<Record<number, number>>({});
  const [report, setReport] = useState<{ enrolled: number; refused: { full_name: string; reason: string }[] } | null>(null);

  const classRows = progress?.classes ?? [];

  // Sans choix explicite, la classe la plus en retard (en tête de liste).
  const classId = pickedClassId ?? classRows[0]?.class_id ?? null;

  const students = useMemo(
    () =>
      (progress?.students ?? []).filter(
        (s) => s.previous_class.id === classId && (filter === 'all' || s.state === filter),
      ),
    [progress, classId, filter],
  );

  const activeClasses = (classes ?? []).filter((c) => c.is_active);

  // Classes d'arrivée regroupées par cycle : une liste à plat devient illisible dès 15 classes.
  const classOptions = (() => {
    const groups = new Map<string, typeof activeClasses>();
    for (const c of activeClasses) groups.set(c.cycle?.label ?? 'Autres', [...(groups.get(c.cycle?.label ?? 'Autres') ?? []), c]);
    return [...groups].map(([label, items]) => (
      <optgroup key={label} label={label}>
        {items.map((c) => (
          <option key={c.id} value={c.id}>
            {c.label}
          </option>
        ))}
      </optgroup>
    ));
  })();

  function setFilter(next: Filter) {
    setSelected(new Set());
    setSearchParams(next === 'all' ? {} : { state: next }, { replace: true });
  }

  function targetFor(student: ReEnrollmentProgressStudent) {
    return targets[student.student_id] ?? student.previous_class.id;
  }

  function toggle(id: number) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const selectable = students.filter((s) => s.state === 'pending');
  const allSelected = selectable.length > 0 && selectable.every((s) => selected.has(s.student_id));

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(selectable.map((s) => s.student_id)));
  }

  function applyTargetToAll(target: number) {
    setTargets((current) => {
      const next = { ...current };
      for (const s of students) next[s.student_id] = target;
      return next;
    });
  }

  async function handleReEnroll() {
    const chosen = students.filter((s) => selected.has(s.student_id));
    // Une requête par classe d'arrivée : chaque lot passe les mêmes règles
    // que la réinscription unitaire côté serveur.
    const byTarget = new Map<number, number[]>();
    for (const s of chosen) byTarget.set(targetFor(s), [...(byTarget.get(targetFor(s)) ?? []), s.student_id]);

    let enrolled = 0;
    const refused: { full_name: string; reason: string }[] = [];
    for (const [target, ids] of byTarget) {
      const result = await bulkReEnroll.mutateAsync({ class_id: target, student_ids: ids });
      enrolled += result.enrolled.length;
      refused.push(...result.refused);
    }
    setSelected(new Set());
    setReport({ enrolled, refused });
  }

  async function handlePrintReminders() {
    const rows = (progress?.students ?? [])
      .filter((s) => s.state !== 're_enrolled')
      .map((s) => ({
        full_name: s.full_name,
        matricule: s.matricule,
        class: s.previous_class.label ?? '—',
        guardian: s.guardian?.full_name ?? '—',
        phone: s.guardian?.phone ?? '—',
        situation: s.state === 'blocked' ? `Bloqué · ${formatNumber(s.blocking_outstanding)} XOF` : 'Sans nouvelles',
      }));
    await downloadReminderListPdf(rows, `Rentrée ${progress?.active_year?.code ?? ''}`, settings ?? null);
  }

  if (isLoading) {
    return (
      <div className="grid min-h-[50vh] place-items-center">
        <Loader />
      </div>
    );
  }

  if (!progress?.active_year) {
    return (
      <EmptyState
        title="Aucune année scolaire active"
        text="Activez l'année en cours dans Paramètres pour commencer les réinscriptions."
        action={hasPermission('settings.view') ? { to: '/settings', label: 'Ouvrir les paramètres' } : undefined}
      />
    );
  }

  const totals = progress.totals!;
  if (totals.expected === 0) {
    return (
      <EmptyState
        title={`Rentrée ${progress.active_year.code}`}
        text={
          progress.previous_year
            ? `Aucun élève n'était inscrit en ${progress.previous_year.code} : il n'y a personne à réinscrire. Les nouveaux élèves s'ajoutent depuis Élèves.`
            : "Aucune année précédente n'est enregistrée : les réinscriptions apparaîtront ici à la prochaine rentrée."
        }
        action={{ to: '/students', label: 'Aller aux élèves' }}
      />
    );
  }

  const ratio = totals.re_enrolled / totals.expected;
  const blockedAmount = progress.students.filter((s) => s.state === 'blocked').reduce((sum, s) => sum + s.blocking_outstanding, 0);
  const currentClass = classRows.find((c) => c.class_id === classId);
  const excluded = students.filter((s) => s.state === 'blocked');

  const tiles: { key: Filter; label: string; value: number; hint: string; tone: string }[] = [
    { key: 're_enrolled', label: 'Réinscrits', value: totals.re_enrolled, hint: `sur ${totals.expected} attendus`, tone: 'text-primary' },
    { key: 'blocked', label: 'Bloqués pour impayés', value: totals.blocked, hint: `${formatAmount(blockedAmount)} à encaisser`, tone: 'text-danger' },
    { key: 'pending', label: 'Sans nouvelles', value: totals.pending, hint: 'à contacter', tone: 'text-gold' },
    { key: 'all', label: `Cohorte ${progress.previous_year?.code ?? ''}`, value: totals.expected, hint: 'tous les élèves', tone: 'text-ink' },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-5 pb-24">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">Rentrée {progress.active_year.code}</h1>
          <p className="mt-0.5 text-sm text-ink-soft">
            Réinscription des {totals.expected} élèves de {progress.previous_year?.code}
            {totals.new_students > 0 && ` · ${totals.new_students} nouveaux inscrits`}
          </p>
        </div>
        <button
          type="button"
          onClick={handlePrintReminders}
          disabled={totals.pending + totals.blocked === 0}
          className="flex items-center justify-center gap-2 rounded-lg border border-border bg-surface px-3.5 py-2 text-sm font-medium text-ink transition hover:bg-paper disabled:opacity-50"
        >
          <Printer className="h-4 w-4" />
          Imprimer les relances
        </button>
      </div>

      {progress.active_year.closed_at && (
        <div className="flex items-center gap-2 rounded-xl border border-gold/30 bg-gold-soft px-4 py-3 text-sm text-gold">
          <Lock className="h-4 w-4 shrink-0" />
          L'année {progress.active_year.code} est clôturée : rouvrez-la pour pouvoir réinscrire.
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-[auto_1fr_1fr_1fr_1fr]">
        <div className="col-span-2 flex items-center gap-4 rounded-2xl border border-border bg-surface p-4 lg:col-span-1">
          <ProgressRing value={ratio * 100} />
          <p className="text-sm text-ink-soft lg:hidden">
            {totals.re_enrolled} élèves sur {totals.expected} déjà réinscrits
          </p>
        </div>
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
            <p className="flex items-center justify-between gap-2 text-xs font-medium text-ink-soft">
              {tile.label}
              {filter === tile.key && tile.key !== 'all' && (
                <span className="rounded bg-primary-soft px-1.5 py-0.5 text-[9px] font-bold tracking-wide text-primary-dark uppercase">Filtre</span>
              )}
            </p>
            <p className={`font-tabular mt-1 text-2xl font-bold ${tile.tone}`}>{tile.value}</p>
            <p className="mt-0.5 truncate text-xs text-ink-soft">{tile.hint}</p>
          </button>
        ))}
      </div>

      {report && (
        <div className="rounded-xl border border-primary/30 bg-primary-soft px-4 py-3 text-sm">
          <p className="flex items-center gap-2 font-medium text-primary-dark">
            <CheckCircle2 className="h-4 w-4" />
            {report.enrolled} élève{report.enrolled > 1 ? 's' : ''} réinscrit{report.enrolled > 1 ? 's' : ''}.
          </p>
          {report.refused.map((r) => (
            <p key={r.full_name} className="mt-1 text-danger">
              {r.full_name} : {r.reason}
            </p>
          ))}
          <button type="button" onClick={() => setReport(null)} className="mt-1 text-xs font-medium text-ink-soft underline">
            Fermer
          </button>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
        <section className="rounded-2xl border border-border bg-surface p-4">
          <h2 className="text-sm font-semibold text-ink">Avancement par classe</h2>
          <p className="text-xs text-ink-soft">Les classes en retard remontent en tête</p>
          <ul className="mt-3 space-y-1">
            {classRows.map((row) => {
              const pct = row.expected > 0 ? Math.round((row.re_enrolled / row.expected) * 100) : 0;
              return (
                <li key={row.class_id}>
                  <button
                    type="button"
                    onClick={() => {
                      setClassId(row.class_id);
                      setSelected(new Set());
                    }}
                    className={`w-full rounded-xl px-3 py-2.5 text-left transition ${
                      row.class_id === classId ? 'bg-primary-soft' : 'hover:bg-paper'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-ink">{row.label}</span>
                      <span className="font-tabular text-xs font-semibold text-ink-soft">{pct} %</span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-track">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                    </div>
                    <p className="mt-1 text-[11px] text-ink-soft">
                      {row.re_enrolled}/{row.expected} réinscrits
                      {row.blocked > 0 && <span className="text-danger"> · {row.blocked} bloqué{row.blocked > 1 ? 's' : ''}</span>}
                      {row.pending > 0 && <span className="text-gold"> · {row.pending} en attente</span>}
                    </p>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="min-w-0 rounded-2xl border border-border bg-surface">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
            <div>
              <h2 className="text-sm font-semibold text-ink">
                {currentClass?.label ?? '—'} · {students.length} élève{students.length > 1 ? 's' : ''}
                {filter !== 'all' && ` (${STATE_LABELS[filter].toLowerCase()})`}
              </h2>
              <p className="text-xs text-ink-soft">Classe d'arrivée modifiable ligne par ligne</p>
            </div>
            {canReEnroll && selectable.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <select
                  aria-label="Classe d'arrivée pour toute la liste"
                  defaultValue=""
                  onChange={(e) => e.target.value && applyTargetToAll(Number(e.target.value))}
                  className="rounded-lg border border-border bg-paper px-2.5 py-1.5 text-xs text-ink"
                >
                  <option value="">Tous vers…</option>
                  {classOptions}
                </select>
                <button type="button" onClick={toggleAll} className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-ink hover:bg-paper">
                  {allSelected ? 'Tout désélectionner' : 'Tout sélectionner'}
                </button>
              </div>
            )}
          </div>

          {students.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-ink-soft">Aucun élève dans cette classe pour ce filtre.</p>
          ) : (
            <ul className="divide-y divide-border">
              {students.map((student) => {
                const isSelectable = canReEnroll && student.state === 'pending';
                const checked = selected.has(student.student_id);
                return (
                  <li key={student.student_id} className={`flex flex-wrap items-center gap-3 px-4 py-2.5 ${checked ? 'bg-primary-soft/40' : ''}`}>
                    {canReEnroll && (
                      <button
                        type="button"
                        disabled={!isSelectable}
                        onClick={() => toggle(student.student_id)}
                        aria-pressed={checked}
                        aria-label={`Sélectionner ${student.full_name}`}
                        className={`grid h-5 w-5 shrink-0 place-items-center rounded-md border transition disabled:cursor-not-allowed disabled:opacity-40 ${
                          checked ? 'border-primary bg-primary text-on-primary' : 'border-border bg-surface'
                        }`}
                      >
                        {checked && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                      </button>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink">{student.full_name}</p>
                      <p className="font-tabular text-xs text-ink-soft">{student.matricule}</p>
                    </div>

                    <div className="w-36 shrink-0">
                      {student.state === 'pending' && canReEnroll ? (
                        <select
                          aria-label={`Classe d'arrivée de ${student.full_name}`}
                          value={targetFor(student)}
                          onChange={(e) => setTargets((t) => ({ ...t, [student.student_id]: Number(e.target.value) }))}
                          className="w-full rounded-lg border border-border bg-paper px-2 py-1.5 text-xs text-ink"
                        >
                          {classOptions}
                        </select>
                      ) : (
                        <span className="text-xs text-ink-soft">
                          {student.state === 're_enrolled'
                            ? (activeClasses.find((c) => c.id === student.current_class_id)?.label ?? '—')
                            : '—'}
                        </span>
                      )}
                    </div>

                    <div className="flex w-full shrink-0 items-center justify-end gap-2 sm:w-56">
                      {student.state === 're_enrolled' && (
                        <span className="rounded-full bg-success-soft px-2 py-0.5 text-[11px] font-semibold text-success">Réinscrit</span>
                      )}
                      {student.state === 'pending' && (
                        <span className="text-right text-[11px]">
                          <span className="rounded-full bg-gold-soft px-2 py-0.5 font-semibold text-gold">Sans nouvelles</span>
                          {student.previous_year_outstanding > 0 && (
                            <span className="mt-0.5 block text-ink-soft">doit {formatNumber(student.previous_year_outstanding)} (non bloquant)</span>
                          )}
                        </span>
                      )}
                      {student.state === 'blocked' && (
                        <>
                          <span className="rounded-full bg-danger-soft px-2 py-0.5 text-[11px] font-semibold text-danger">
                            Bloqué · {formatNumber(student.blocking_outstanding)}
                          </span>
                          {canPay && (
                            <button
                              type="button"
                              onClick={() => openPayment(student.student_id)}
                              className="rounded-lg border border-primary/30 px-2 py-1 text-[11px] font-semibold text-primary hover:bg-primary-soft"
                            >
                              Encaisser
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      {selected.size > 0 && (
        <div className="fixed inset-x-3 bottom-3 z-30 mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3 rounded-2xl bg-sidebar px-4 py-3 text-white shadow-2xl sm:inset-x-6 animate-[modal-in_0.2s_ease-out]">
          <div className="min-w-0">
            <p className="text-sm font-semibold">
              {selected.size} élève{selected.size > 1 ? 's' : ''} sélectionné{selected.size > 1 ? 's' : ''}
            </p>
            {excluded.length > 0 && (
              <p className="truncate text-xs text-sidebar-text">
                {excluded.length} exclu{excluded.length > 1 ? 's' : ''} : solde d'une année clôturée non réglé
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => setSelected(new Set())} className="rounded-lg px-3 py-2 text-sm text-sidebar-text hover:text-white">
              Désélectionner
            </button>
            <button
              type="button"
              onClick={handleReEnroll}
              disabled={bulkReEnroll.isPending || !!progress.active_year.closed_at}
              className="flex items-center gap-2 rounded-lg bg-sidebar-accent px-4 py-2 text-sm font-semibold text-[#081410] transition hover:opacity-90 disabled:opacity-50"
            >
              {bulkReEnroll.isPending ? <Spinner /> : <RefreshCcw className="h-4 w-4" />}
              Réinscrire {selected.size > 1 ? `les ${selected.size}` : "l'élève"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ProgressRing({ value }: { value: number }) {
  const r = 32;
  const c = 2 * Math.PI * r;
  return (
    <svg width="80" height="80" viewBox="0 0 80 80" role="img" aria-label={`${Math.round(value)} % réinscrits`}>
      <circle cx="40" cy="40" r={r} fill="none" stroke="var(--color-track)" strokeWidth="7" />
      <circle
        cx="40"
        cy="40"
        r={r}
        fill="none"
        stroke="var(--color-primary)"
        strokeWidth="7"
        strokeLinecap="round"
        strokeDasharray={`${(Math.min(value, 100) / 100) * c} ${c}`}
        transform="rotate(-90 40 40)"
      />
      <text x="40" y="45" textAnchor="middle" fontSize="16" fontWeight="700" fill="var(--color-ink)">
        {Math.round(value)}%
      </text>
    </svg>
  );
}

function EmptyState({ title, text, action }: { title: string; text: string; action?: { to: string; label: string } }) {
  return (
    <div className="mx-auto max-w-lg rounded-2xl border border-border bg-surface px-6 py-12 text-center">
      <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-primary-soft text-primary">
        <RefreshCcw className="h-5 w-5" />
      </span>
      <h1 className="mt-4 text-xl font-bold text-ink">{title}</h1>
      <p className="mt-2 text-sm text-ink-soft">{text}</p>
      {action && (
        <Link
          to={action.to}
          className="mt-5 inline-flex rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-on-primary no-underline hover:bg-primary-dark"
        >
          {action.label}
        </Link>
      )}
    </div>
  );
}
