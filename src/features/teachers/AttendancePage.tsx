import { useEffect, useState } from 'react';
import { CheckCircle2, ClipboardCheck, RefreshCcw, X } from 'lucide-react';
import { useCreateAttendance, useGenerateSessions, useSessions } from './useTeaching';

const statusOptions = [
  { value: 'present', label: 'Présent' },
  { value: 'absent', label: 'Absent' },
  { value: 'justified', label: 'Absent justifié' },
  { value: 'replaced', label: 'Remplacé' },
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

  async function save(sessionId: number, teacherId: number) {
    const status = statuses[sessionId] ?? sessionId ? 'present' : 'present';
    const minutes = Math.max(0, Number(absenceMinutes[sessionId] ?? 0));
    const reason = reasons[sessionId] ?? '';

    if (['absent', 'justified'].includes(status) && minutes > 0 && reason.trim().length === 0) {
      setNotice({ type: 'error', message: 'Le motif est requis lorsque vous indiquez une absence.' });
      return;
    }

    if (minutes > 0 && status === 'present') {
      setNotice({ type: 'error', message: 'Les minutes d’absence ne sont valides que pour un statut Absent ou Justifié.' });
      return;
    }

    try {
      await saveAttendance.mutateAsync({
        teaching_session_id: sessionId,
        teacher_id: teacherId,
        status,
        absence_minutes: minutes,
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
        <div><p className="text-xs font-medium tracking-wide text-primary uppercase">Suivi des cours</p><h1 className="mt-1 font-display text-2xl font-semibold text-ink">Présence des enseignants</h1><p className="mt-1 text-sm text-ink-soft">Un seul statut par séance, avec les minutes d’absence et le motif quand c’est nécessaire.</p></div>
        <div className="flex items-center gap-2">
          <input type="date" value={date} onChange={(event) => setDate(event.target.value)} className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink" />
          <button type="button" onClick={generateForSelectedDate} disabled={generateSessions.isPending} className="inline-flex items-center gap-2 rounded-lg border border-primary bg-primary/5 px-3 py-2 text-xs font-medium text-primary disabled:opacity-50">
            <RefreshCcw className={`h-3.5 w-3.5 ${generateSessions.isPending ? 'animate-spin' : ''}`} />
            {generateSessions.isPending ? 'Génération...' : 'Générer les séances'}
          </button>
        </div>
      </div>
      {notice && <NoticeBanner type={notice.type} message={notice.message} onClose={() => setNotice(null)} />}
      <section className="overflow-hidden rounded-xl border border-border bg-surface">
        <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm"><thead className="bg-paper text-xs uppercase text-ink-soft"><tr><th className="px-4 py-3">Horaire</th><th className="px-4 py-3">Classe</th><th className="px-4 py-3">Matière</th><th className="px-4 py-3">Enseignant</th><th className="px-4 py-3">Présence</th><th className="px-4 py-3" /></tr></thead>
          <tbody className="divide-y divide-border">
            {isLoading && <tr><td colSpan={6} className="px-4 py-10 text-center text-ink-soft">Chargement...</td></tr>}
            {!isLoading && (sessions ?? []).length === 0 && <tr><td colSpan={6} className="px-4 py-14 text-center"><ClipboardCheck className="mx-auto h-8 w-8 text-ink-soft" /><p className="mt-2 text-sm text-ink-soft">Aucune séance pour cette date. Cliquez sur “Générer les séances” pour créer le planning du jour.</p></td></tr>}
            {sessions?.map((session) => {
              const teacherId = session.assignment?.teacher?.id ?? 0;
              const selectedStatus = statuses[session.id] ?? session.attendance?.status ?? 'present';
              const canInputAbsence = selectedStatus === 'absent' || selectedStatus === 'justified';
              const isSaved = savedIds.has(session.id);
              const isSavingThisRow = saveAttendance.isPending && saveAttendance.variables?.teaching_session_id === session.id;

              return (
                <tr key={session.id}>
                  <td className="font-tabular px-4 py-3">{session.starts_at} - {session.ends_at}</td>
                  <td className="px-4 py-3">{session.school_class?.label ?? '—'}</td>
                  <td className="px-4 py-3">{session.assignment?.subject?.label ?? '—'}</td>
                  <td className="px-4 py-3 font-medium">{session.assignment?.teacher?.full_name ?? '—'}</td>
                  <td className="px-4 py-3">
                    <div className="space-y-3">
                      <div className="flex flex-wrap gap-2">
                        {statusOptions.map((option) => {
                          const active = selectedStatus === option.value;
                          return (
                            <button
                              key={option.value}
                              type="button"
                              disabled={isSaved}
                              onClick={() => {
                                setStatuses((current) => ({ ...current, [session.id]: option.value }));
                                markDirty(session.id);
                              }}
                              className={`rounded-full border px-2.5 py-1.5 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${
                                active
                                  ? 'border-primary bg-primary text-white'
                                  : 'border-border bg-surface text-ink-soft hover:border-primary/50 hover:text-ink'
                              }`}
                            >
                              {option.label}
                            </button>
                          );
                        })}
                      </div>

                      {canInputAbsence && (
                        <div className="space-y-2">
                          <input
                            type="number"
                            min={0}
                            max={session.planned_minutes}
                            disabled={isSaved}
                            value={absenceMinutes[session.id] ?? session.attendance?.absence_minutes ?? 0}
                            onChange={(event) => {
                              setAbsenceMinutes((current) => ({ ...current, [session.id]: Math.max(0, Number(event.target.value) || 0) }));
                              markDirty(session.id);
                            }}
                            className="w-full rounded-lg border border-border bg-surface px-2 py-1.5 text-xs text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
                            placeholder="Minutes d'absence"
                          />
                          <input
                            type="text"
                            disabled={isSaved}
                            value={reasons[session.id] ?? session.attendance?.reason ?? ''}
                            onChange={(event) => {
                              setReasons((current) => ({ ...current, [session.id]: event.target.value }));
                              markDirty(session.id);
                            }}
                            className="w-full rounded-lg border border-border bg-surface px-2 py-1.5 text-xs text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
                            placeholder="Motif"
                          />
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {isSaved ? (
                      <span className="inline-flex items-center gap-1.5 rounded-lg bg-success-soft px-3 py-1.5 text-xs font-medium text-success">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Enregistré
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => save(session.id, teacherId)}
                        disabled={isSavingThisRow || !teacherId}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-success px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" /> {isSavingThisRow ? 'Enregistrement...' : 'Enregistrer'}
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>
      </section>
    </div>
  );
}
