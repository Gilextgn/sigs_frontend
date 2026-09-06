import { GraduationCap, ShieldCheck } from 'lucide-react';

const APP_VERSION = 'v5.0';

export function AppFooter() {
  return (
    <footer className="flex h-9 shrink-0 items-center justify-between gap-3 border-t border-border bg-surface px-4 text-[11px] text-ink-soft sm:px-6">
      <span className="flex items-center gap-1.5 truncate">
        <GraduationCap className="h-3.5 w-3.5 shrink-0 text-primary" />
        SIGS Admin <span className="hidden sm:inline">— Gestion scolaire</span>
      </span>
      <span className="flex shrink-0 items-center gap-3">
        <span className="hidden items-center gap-1.5 sm:flex">
          <ShieldCheck className="h-3.5 w-3.5 text-success" />
          Connexion sécurisée
        </span>
        <span className="font-tabular">{APP_VERSION}</span>
      </span>
    </footer>
  );
}
