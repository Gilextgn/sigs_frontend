import { GraduationCap, Phone, User } from 'lucide-react';
import { Modal } from '@/shared/components/Modal';
import type { StudentRow } from './useStudents';

const STATUS_LABELS: Record<string, string> = {
  active: 'Actif',
  transferred: 'Transféré',
  graduated: 'Diplômé',
  archived: 'Archivé',
};

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-success-soft text-success',
  transferred: 'bg-gold-soft text-gold',
  graduated: 'bg-primary-soft text-primary-dark',
  archived: 'bg-danger-soft text-danger',
};

const GENDER_LABELS: Record<string, string> = { F: 'Féminin', M: 'Masculin' };

const currency = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });

function formatDate(value: string | null) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long' }).format(new Date(value));
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 px-3.5 py-2.5 text-sm">
      <span className="text-ink-soft">{label}</span>
      <span className="font-medium text-ink">{value}</span>
    </div>
  );
}

export function StudentDetailModal({ student, onClose }: { student: StudentRow; onClose: () => void }) {
  return (
    <Modal title="Fiche élève" onClose={onClose} widthClassName="max-w-lg">
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-3 rounded-lg bg-paper px-3.5 py-3">
          <div>
            <p className="font-tabular text-xs text-ink-soft">{student.matricule}</p>
            <p className="mt-0.5 text-base font-semibold text-ink">{student.full_name}</p>
            <p className="text-xs text-ink-soft">{student.class?.label ?? 'Aucune classe'}</p>
          </div>
          <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLES[student.status] ?? 'bg-primary-soft text-primary-dark'}`}>
            {STATUS_LABELS[student.status] ?? student.status}
          </span>
        </div>

        <div>
          <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold tracking-wide text-ink-soft uppercase">
            <GraduationCap className="h-3.5 w-3.5" /> Scolarité
          </p>
          <div className="divide-y divide-border overflow-hidden rounded-lg border border-border">
            <InfoRow label="Date de naissance" value={formatDate(student.birth_date)} />
            <InfoRow label="Sexe" value={student.gender ? (GENDER_LABELS[student.gender] ?? student.gender) : '—'} />
            <InfoRow
              label="Scolarité annuelle"
              value={student.class ? `${currency.format(Number(student.class.tuition_amount))} XOF` : '—'}
            />
            <InfoRow label="Date d'inscription" value={formatDate(student.created_at)} />
          </div>
        </div>

        <div>
          <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold tracking-wide text-ink-soft uppercase">
            <User className="h-3.5 w-3.5" /> Tuteur / parent
          </p>
          <div className="divide-y divide-border overflow-hidden rounded-lg border border-border">
            <InfoRow label="Nom complet" value={student.guardian?.full_name ?? '—'} />
            <InfoRow label="Lien de parenté" value={student.guardian?.relationship_label ?? '—'} />
            <InfoRow label="Téléphone" value={student.guardian?.phone ?? '—'} />
          </div>
        </div>

        {student.guardian?.phone && (
          <a
            href={`tel:${student.guardian.phone}`}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white transition hover:bg-primary-dark"
          >
            <Phone className="h-4 w-4" />
            Appeler le tuteur
          </a>
        )}
      </div>
    </Modal>
  );
}
