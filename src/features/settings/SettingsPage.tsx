import { useRef, useState, type FormEvent } from 'react';
import { CalendarPlus, CheckCircle2, ImagePlus, Settings as SettingsIcon, Trash2, Upload } from 'lucide-react';
import { ConfirmDialog } from '@/shared/components/ConfirmDialog';
import {
  useAcademicYears,
  useActivateAcademicYear,
  useCreateAcademicYear,
  useDeleteLetterhead,
  useSchoolSettings,
  useUploadLetterhead,
} from './useSettings';

export default function SettingsPage() {
  const { data: settings } = useSchoolSettings();
  const uploadLetterhead = useUploadLetterhead();
  const deleteLetterhead = useDeleteLetterhead();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  const { data: academicYears } = useAcademicYears();
  const createYear = useCreateAcademicYear();
  const activateYear = useActivateAcademicYear();
  const [newYearCode, setNewYearCode] = useState('');
  const [yearError, setYearError] = useState<string | null>(null);

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) await uploadLetterhead.mutateAsync(file);
    e.target.value = '';
  }

  async function handleCreateYear(e: FormEvent) {
    e.preventDefault();
    setYearError(null);
    if (!/^\d{4}-\d{4}$/.test(newYearCode)) {
      setYearError('Format attendu : AAAA-AAAA, ex. 2026-2027.');
      return;
    }
    try {
      await createYear.mutateAsync({ code: newYearCode });
      setNewYearCode('');
    } catch {
      setYearError('Impossible de créer cette année (déjà existante ou format invalide).');
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <SettingsIcon className="h-5 w-5 text-primary" />
        <h2 className="font-display text-xl font-semibold text-ink">Paramètres de l'établissement</h2>
      </div>

      {/* En-tête des documents */}
      <article className="rounded-xl border border-border bg-surface p-5">
        <h3 className="font-display text-base font-semibold text-ink">En-tête des documents</h3>
        <p className="mt-0.5 text-xs text-ink-soft">
          Ce logo apparaît en haut des reçus de paiement et listes de débiteurs téléchargés en PDF.
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-4">
          <div className="grid h-24 w-40 shrink-0 place-items-center rounded-lg border border-dashed border-border bg-paper">
            {settings?.letterhead_url ? (
              <img src={settings.letterhead_url} alt="En-tête actuel" className="max-h-20 max-w-36 object-contain" />
            ) : (
              <span className="text-xs text-ink-soft">Aucune image</span>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelected} />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadLetterhead.isPending}
              className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-dark disabled:opacity-60"
            >
              {uploadLetterhead.isPending ? <Upload className="h-4 w-4 animate-pulse" /> : <ImagePlus className="h-4 w-4" />}
              {settings?.letterhead_url ? "Changer l'image" : 'Téléverser une image'}
            </button>
            {settings?.letterhead_url && (
              <button
                type="button"
                onClick={() => setConfirmDeleteOpen(true)}
                className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-danger transition hover:bg-danger-soft"
              >
                <Trash2 className="h-4 w-4" />
                Retirer l'en-tête
              </button>
            )}
            <p className="text-[11px] text-ink-soft">PNG ou JPG, 2 Mo maximum.</p>
          </div>
        </div>
      </article>

      {/* Années scolaires */}
      <article className="rounded-xl border border-border bg-surface p-5">
        <h3 className="font-display text-base font-semibold text-ink">Années scolaires</h3>
        <p className="mt-0.5 text-xs text-ink-soft">Format imposé : AAAA-AAAA (deux années consécutives).</p>

        <form onSubmit={handleCreateYear} className="mt-3 flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-ink-soft">Nouvelle année</label>
            <input
              value={newYearCode}
              onChange={(e) => setNewYearCode(e.target.value)}
              placeholder="2026-2027"
              className="w-40 rounded-lg border border-border bg-paper px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <button
            type="submit"
            disabled={createYear.isPending}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-dark disabled:opacity-60"
          >
            <CalendarPlus className="h-4 w-4" />
            Ajouter
          </button>
        </form>
        {yearError && <p className="mt-2 text-xs text-danger">{yearError}</p>}

        <div className="mt-4 divide-y divide-border rounded-lg border border-border">
          {(academicYears ?? []).length === 0 && (
            <p className="px-4 py-4 text-center text-sm text-ink-soft">Aucune année scolaire créée.</p>
          )}
          {academicYears?.map((year) => (
            <div key={year.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
              <span className="font-tabular font-medium text-ink">{year.code}</span>
              {year.is_active ? (
                <span className="flex items-center gap-1.5 rounded-full bg-success-soft px-2.5 py-1 text-xs font-medium text-success">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Année active
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => activateYear.mutate(year.id)}
                  className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-ink transition hover:bg-paper"
                >
                  Activer
                </button>
              )}
            </div>
          ))}
        </div>
      </article>

      <ConfirmDialog
        open={confirmDeleteOpen}
        title="Retirer l'en-tête"
        message="Le logo sera retiré des prochains documents téléchargés. Continuer ?"
        confirmLabel="Retirer"
        onConfirm={() => {
          deleteLetterhead.mutate();
          setConfirmDeleteOpen(false);
        }}
        onCancel={() => setConfirmDeleteOpen(false)}
      />
    </div>
  );
}
