import { Fragment, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, ClipboardCheck, RefreshCcw, X } from 'lucide-react';
import { SkeletonTableRows } from '@/shared/components/Skeleton';
import { useCreateAttendance, useGenerateSessions, useSaveDayAttendance, useSessions, type SessionRow } from './useTeaching';
import { hhmm } from './timetable';
import { getApiErrorMessage } from '@/shared/lib/apiError';
import { useAuth } from '@/features/auth/AuthContext';

const statusOptions = [
  { value: 'present', label: 'Présent' },
  { value: 'late', label: 'En retard' },
  { value: 'absent', label: 'Absent' },
  { value: 'justified', label: 'Absent justifié' },
] as const;

function NoticeBanner({
  type,
  message,
  onClose,
}: {
  type: 'error' | 'success';
  message: string;
  onClose: () => void;
}) {
  const tone = type === 'error'
    ? 'border-danger/30 bg-danger-soft text-danger'
    : 'border-success/30 bg-success-soft text-success';

  return (
    <div className={`flex items-start justify-between gap-3 rounded-lg border px-3 py-2 text-sm ${tone}`}>
      <p className="flex-1">{message}</p>
      <button type="button" aria-label="Fermer la notification" onClick={onClose} className="rounded p-1 transition hover:bg-black/5">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export default function AttendancePage() {
  // Sans « gérer les enseignants » : consultation seule (pas de génération ni d'enregistrement).
  const canManage = useAuth().hasPermission('teachers.manage');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [statuses, setStatuses] = useState<Record<number, string>>({});
  const [absenceMinutes, setAbsenceMinutes] = useState<Record<number, number>>({});
  const [reasons, setReasons] = useState<Record<number, string>>({});
  // Séances déjà enregistrées (bouton "Enregistrer" -> statut "Enregistré").
  // Toute nouvelle modification locale d'une séance déjà enregistrée la
  // retire de cet ensemble pour redonner accès au bouton d'enregistrement.
  const [savedIds, setSavedIds] = useState<Set<number>>(new Set());
  const [notice, setNotice] = useState<{ type: 'error' | 'success'; message: string } | null>(null);
  const { data: sessions, isLoading } = useSessions(date);
  const saveAttendance = useCreateAttendance();

  // Séances rangées par classe (ordre pédagogique). Une classe dont tous les cours du jour sont
  // tenus par un même maître du primaire se saisit en une fois, pour la journée.
  const groups = useMemo(() => {
    const byClass = new Map<string, SessionRow[]>();
    for (const session of sessions ?? []) {
      const key = String(session.class_id ?? session.school_class?.label ?? '—');
      byClass.set(key, [...(byClass.get(key) ?? []), session]);
    }
    return [...byClass.entries()]
      .map(([key, rows]) => {
        const teacherIds = new Set(rows.map((row) => row.assignment?.teacher?.id));
        return {
          key,
          label: rows[0]?.school_class?.label ?? '—',
          order: rows[0]?.school_class?.sort_order ?? 999,
          sessions: [...rows].sort((a, b) => a.starts_at.localeCompare(b.starts_at)),
          primary: teacherIds.size === 1 && rows[0]?.assignment?.teacher?.level === 'primary',
        };
      })
      .sort((a, b) => a.order - b.order);
  }, [sessions]);
  const generateSessions = useGenerateSessions();

  // À chaque chargement de séances (changement de date, régénération...),
  // les séances qui ont déjà une présence enregistrée côté serveur
  // repartent avec le statut "Enregistré" affiché d'emblée.
  useEffect(() => {
    const alreadySaved = new Set((sessions ?? []).filter((s) => s.attendance).map((s) => s.id));
    setSavedIds(alreadySaved);
    setStatuses({});
    setAbsenceMinutes({});
    setReasons({});
  }, [sessions]);

  function markDirty(sessionId: number) {
    setSavedIds((current) => {
      if (!current.has(sessionId)) return current;
      const next = new Set(current);
      next.delete(sessionId);
      return next;
    });
  }

  async function generateForSelectedDate() {
    try {
      const result = await generateSessions.mutateAsync({ date });
      const isAlreadyGenerated = result.created === 0 && result.active_schedules_count > 0;
      setNotice({
        type: result.created > 0 || isAlreadyGenerated ? 'success' : 'error',
        message: result.message || `Séances générées : ${result.created}.`,
      });
    } catch (error: unknown) {
      const message = error && typeof error === 'object' && 'response' in error && error.response && typeof error.response === 'object' && 'data' in error.response && error.response.data && typeof error.response.data === 'object' && 'message' in error.response.data && typeof error.response.data.message === 'string'
        ? error.response.data.message
        : 'Impossible de générer les séances pour cette date.';
      setNotice({ type: 'error', message });
    }
  }

  async function save(session: NonNullable<typeof sessions>[number], teacherId: number) {
    const sessionId = session.id;
    const status = statuses[sessionId] ?? session.attendance?.status ?? 'present';
    const minutes = Math.max(0, Number(absenceMinutes[sessionId] ?? session.attendance?.absence_minutes ?? 0));
    const reason = reasons[sessionId] ?? session.attendance?.reason ?? '';

    if (status === 'late' && minutes <= 0) {
      setNotice({ type: 'error', message: 'Indiquez le nombre de minutes de retard.' });
      return;
    }
    if (status === 'justified' && reason.trim().length === 0) {
      setNotice({ type: 'error', message: 'Indiquez le motif de l’absence justifiée.' });
      return;
    }

    try {
      await saveAttendance.mutateAsync({
        teaching_session_id: sessionId,
        teacher_id: teacherId,
        status,
        absence_minutes: status === 'late' ? minutes : 0,
        reason: reason.trim() || undefined,
      });
      setSavedIds((current) => new Set(current).add(sessionId));
      setNotice({ type: 'success', message: 'Présence enregistrée avec succès.' });
    } catch (error: unknown) {
      const message = error && typeof error === 'object' && 'response' in error && error.response && typeof error.response === 'object' && 'data' in error.response && error.response.data && typeof error.response.data === 'object' && 'message' in error.response.data && typeof error.response.data.message === 'string'
        ? error.response.data.message
        : 'Impossible d’enregistrer cette présence.';
      setNotice({ type: 'error', message });
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div><p className="text-xs font-medium tracking-wide text-primary uppercase">Suivi des cours</p><h1 className="mt-1 font-display text-2xl font-semibold text-ink">Présence des enseignants</h1><p className="mt-1 text-sm text-ink-soft">Un statut par séance. Retard : les minutes sont déduites de la paie. Absent justifié : le motif est obligatoire.</p></div>
        <div className="flex items-center gap-2">
          <input type="date" value={date} onChange={(event) => setDate(event.target.value)} className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink" />
          {canManage && (
          <button type="button" onClick={generateForSelectedDate} disabled={generateSessions.isPending} className="inline-flex items-center gap-2 rounded-lg border border-primary bg-primary/5 px-3 py-2 text-xs font-medium text-primary disabled:opacity-50">
            <RefreshCcw className={`h-3.5 w-3.5 ${generateSessions.isPending ? 'animate-spin' : ''}`} />
            {generateSessions.isPending ? 'Génération...' : 'Générer les séances'}
          </button>
          )}
        </div>
      </div>
      {notice && <NoticeBanner type={notice.type} message={notice.message} onClose={() => setNotice(null)} />}
      <section className="overflow-hidden rounded-xl border border-border bg-surface">
        <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm"><thead className="bg-paper text-xs uppercase text-ink-soft"><tr><th className="px-4 py-3">Horaire</th><th className="px-4 py-3" /><th className="px-4 py-3">Matière</th><th className="px-4 py-3">Enseignant</th><th className="px-4 py-3">Présence</th><th className="px-4 py-3" /></tr></thead>
          <tbody className="divide-y divide-border">
            {isLoading && <SkeletonTableRows columns={6} />}
            {!isLoading && (sessions ?? []).length === 0 && <tr><td colSpan={6} className="px-4 py-14 text-center"><ClipboardCheck className="mx-auto h-8 w-8 text-ink-soft" /><p className="mt-2 text-sm text-ink-soft">Aucune séance pour cette date. Cliquez sur “Générer les séances” pour créer le planning du jour.</p></td></tr>}
            {groups.map((group) => (
              <Fragment key={group.key}>
                <tr className="bg-paper/70">
                  <td colSpan={6} className="px-4 py-2 text-sm font-semibold text-ink">
                    {group.label}
                    {group.primary && <span className="ml-2 rounded-full bg-primary-soft px-2 py-0.5 text-[11px] font-medium text-primary">Primaire · maître de la classe</span>}
                  </td>
                </tr>
                {group.primary ? (
                  <PrimaryDayRow sessions={group.sessions} date={date} canManage={canManage} onNotice={setNotice} />
                ) : group.sessions.map((session) => {
              const teacherId = session.assignment?.teacher?.id ?? 0;
              const selectedStatus = statuses[session.id] ?? session.attendance?.status ?? 'present';
              const isLate = selectedStatus === 'late';
              const needsReason = selectedStatus !== 'present';
              const isSaved = savedIds.has(session.id);
              const isSavingThisRow = saveAttendance.isPending && saveAttendance.variables?.teaching_session_id === session.id;

              return (
                <tr key={session.id}>
                  <td className="font-tabular px-4 py-3">{hhmm(session.starts_at)} - {hhmm(session.ends_at)}</td>
                  <td className="px-4 py-3" />
                  <td className="px-4 py-3">{session.assignment?.subject?.label ?? '—'}</td>
                  <td className="px-4 py-3 font-medium">
                    {session.assignment?.teacher?.full_name ?? '—'}
                    {session.conflict && (
                      <span className="mt-1 flex max-w-[220px] items-start gap-1 text-[11px] font-medium text-danger" title={session.conflict}>
                        <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" /> Conflit : même heure dans une autre classe
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="space-y-3">
                      <div className="flex flex-wrap gap-2">
                        {statusOptions.map((option) => {
                          const active = selectedStatus === option.value;
                          return (
                            <button
                              key={option.value}
                              type="button"
                              disabled={isSaved || !canManage}
                              onClick={() => {
                                setStatuses((current) => ({ ...current, [session.id]: option.value }));
                                markDirty(session.id);
                              }}
                              className={`rounded-full border px-2.5 py-1.5 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${
                                active
                                  ? 'border-primary bg-primary text-on-primary'
                                  : 'border-border bg-surface text-ink-soft hover:border-primary/50 hover:text-ink'
                              }`}
                            >
                              {option.label}
                            </button>
                          );
                        })}
                      </div>

                      {(isLate || needsReason) && (
                        <div className="space-y-2">
                          {isLate && (
                            <label className="flex items-center gap-2 text-xs text-ink-soft">
                              Minutes de retard
                              <input
                                type="number"
                                min={1}
                                max={session.planned_minutes}
                                disabled={isSaved}
                                value={absenceMinutes[session.id] ?? session.attendance?.absence_minutes ?? 0}
                                onChange={(event) => {
                                  setAbsenceMinutes((current) => ({ ...current, [session.id]: Math.max(0, Number(event.target.value) || 0) }));
                                  markDirty(session.id);
                                }}
                                className="w-24 rounded-lg border border-border bg-surface px-2 py-1.5 text-xs text-ink outline-none focus:border-primary disabled:opacity-60"
                              />
                              <span>déduites de la paie</span>
                            </label>
                          )}
                          <input
                            type="text"
                            disabled={isSaved}
                            value={reasons[session.id] ?? session.attendance?.reason ?? ''}
                            onChange={(event) => {
                              setReasons((current) => ({ ...current, [session.id]: event.target.value }));
                              markDirty(session.id);
                            }}
                            className="w-full rounded-lg border border-border bg-surface px-2 py-1.5 text-xs text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
                            placeholder={selectedStatus === 'justified' ? 'Motif (obligatoire)' : 'Motif (facultatif)'}
                          />
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {!canManage ? (
                      <span className="text-xs text-ink-soft">{session.attendance ? 'Enregistré' : 'Non saisi'}</span>
                    ) : isSaved ? (
                      <span className="inline-flex items-center gap-1.5 rounded-lg bg-success-soft px-3 py-1.5 text-xs font-medium text-success">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Enregistré
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => save(session, teacherId)}
                        disabled={isSavingThisRow || !teacherId}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-success px-3 py-1.5 text-xs font-medium text-on-success disabled:opacity-50"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" /> {isSavingThisRow ? 'Enregistrement...' : 'Enregistrer'}
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
              </Fragment>
            ))}
          </tbody>
        </table>
        </div>
      </section>
    </div>
  );
}

/**
 * Primaire : le maître tient sa classe toute la journée. Une seule saisie pour
 * tous ses cours du jour (un retard n'est compté que sur le premier cours).
 */
function PrimaryDayRow({
  sessions,
  date,
  canManage,
  onNotice,
}: {
  sessions: SessionRow[];
  date: string;
  canManage: boolean;
  onNotice: (notice: { type: 'error' | 'success'; message: string }) => void;
}) {
  const saveDay = useSaveDayAttendance();
  const first = sessions[0];
  const recorded = sessions.every((session) => session.attendance);
  const [status, setStatus] = useState<string>(first?.attendance?.status ?? 'present');
  const [minutes, setMinutes] = useState<number>(first?.attendance?.absence_minutes ?? 0);
  const [reason, setReason] = useState(first?.attendance?.reason ?? '');
  const [dirty, setDirty] = useState(false);
  const teacher = first?.assignment?.teacher;
  const locked = (recorded && !dirty) || !canManage;

  async function save() {
    if (!teacher || !first?.class_id) return;
    if (status === 'late' && minutes <= 0) return onNotice({ type: 'error', message: 'Indiquez le nombre de minutes de retard.' });
    if (status === 'justified' && !reason.trim()) return onNotice({ type: 'error', message: 'Indiquez le motif de l’absence justifiée.' });
    try {
      await saveDay.mutateAsync({ teacher_id: teacher.id, class_id: first.class_id, date, status, absence_minutes: status === 'late' ? minutes : 0, reason: reason.trim() || undefined });
      setDirty(false);
      onNotice({ type: 'success', message: `Présence de la journée enregistrée pour ${teacher.full_name}.` });
    } catch (error) {
      onNotice({ type: 'error', message: getApiErrorMessage(error, 'Impossible d’enregistrer cette présence.') });
    }
  }

  return (
    <tr>
      <td className="font-tabular px-4 py-3 whitespace-nowrap">
        {hhmm(first?.starts_at)} - {hhmm(sessions[sessions.length - 1]?.ends_at)}
        <span className="block text-xs text-ink-soft">journée · {sessions.length} cours</span>
      </td>
      <td className="px-4 py-3" />
      <td className="px-4 py-3 text-xs text-ink-soft">{sessions.map((session) => session.assignment?.subject?.label).filter(Boolean).join(', ')}</td>
      <td className="px-4 py-3 font-medium">{teacher?.full_name ?? '—'}</td>
      <td className="px-4 py-3">
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            {statusOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                disabled={locked}
                onClick={() => {
                  setStatus(option.value);
                  setDirty(true);
                }}
                className={`rounded-full border px-2.5 py-1.5 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${
                  status === option.value ? 'border-primary bg-primary text-on-primary' : 'border-border bg-surface text-ink-soft hover:border-primary/50 hover:text-ink'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
          {status === 'late' && (
            <label className="flex items-center gap-2 text-xs text-ink-soft">
              Minutes de retard
              <input type="number" min={1} disabled={locked} value={minutes} onChange={(e) => { setMinutes(Math.max(0, Number(e.target.value) || 0)); setDirty(true); }} className="w-24 rounded-lg border border-border bg-surface px-2 py-1.5 text-xs text-ink disabled:opacity-60" />
            </label>
          )}
          {status !== 'present' && (
            <input type="text" disabled={locked} value={reason} onChange={(e) => { setReason(e.target.value); setDirty(true); }} placeholder={status === 'justified' ? 'Motif (obligatoire)' : 'Motif (facultatif)'} className="w-full rounded-lg border border-border bg-surface px-2 py-1.5 text-xs text-ink disabled:opacity-60" />
          )}
          <p className="text-[11px] text-ink-soft">Salaire mensuel fixe : la présence sert au suivi ; une retenue éventuelle se saisit sur la fiche de paie.</p>
        </div>
      </td>
      <td className="px-4 py-3 text-right">
        {!canManage ? (
          <span className="text-xs text-ink-soft">{recorded ? 'Enregistré' : 'Non saisi'}</span>
        ) : locked ? (
          <button type="button" onClick={() => setDirty(true)} className="inline-flex items-center gap-1.5 rounded-lg bg-success-soft px-3 py-1.5 text-xs font-medium text-success">
            <CheckCircle2 className="h-3.5 w-3.5" /> Enregistré · modifier
          </button>
        ) : (
          <button type="button" onClick={save} disabled={saveDay.isPending} className="inline-flex items-center gap-1.5 rounded-lg bg-success px-3 py-1.5 text-xs font-medium text-on-success disabled:opacity-50">
            <CheckCircle2 className="h-3.5 w-3.5" /> {saveDay.isPending ? 'Enregistrement…' : 'Enregistrer la journée'}
          </button>
        )}
      </td>
    </tr>
  );
}
