import { useState } from 'react';
import { LifeBuoy, LockKeyhole, LogOut, MessageCircle, RefreshCw } from 'lucide-react';
import { BrandMark } from '@/shared/components/BrandMark';
import { Spinner } from '@/shared/components/Loader';
import { useAuth, type SuspensionInfo } from './AuthContext';

/**
 * Écran affiché à toute personne d'un établissement suspendu, y compris sur
 * une session déjà ouverte. Il dit clairement ce qui se passe, rassure sur
 * les données, et donne le moyen d'agir : contacter SIGS, ou réessayer une
 * fois la situation régularisée.
 */
export function SuspendedScreen({ info }: { info: SuspensionInfo }) {
  const { logout, recheck } = useAuth();
  const [checking, setChecking] = useState(false);
  const [stillSuspended, setStillSuspended] = useState(false);

  const whatsapp = info.support_whatsapp;
  const whatsappText = encodeURIComponent(
    `Bonjour, l'accès de notre établissement${info.school_name ? ` « ${info.school_name} »` : ''} à SIGS est suspendu. Pouvez-vous m'aider à le rétablir ?`,
  );

  async function handleRecheck() {
    setChecking(true);
    setStillSuspended(false);
    await recheck();
    // Si la session est rétablie, l'écran disparaît de lui-même ; sinon on le dit.
    setStillSuspended(true);
    setChecking(false);
  }

  return (
    <main className="relative grid min-h-dvh place-items-center overflow-hidden bg-sidebar px-4 py-10 text-white">
      <div aria-hidden="true" className="pointer-events-none absolute -top-40 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-[#F5C451]/10 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-52 -left-24 h-[420px] w-[420px] rounded-full bg-sidebar-accent/10 blur-3xl" />

      <section className="relative w-full max-w-md text-center animate-[modal-in_0.4s_cubic-bezier(0.16,1,0.3,1)]">
        <BrandMark size={44} className="mx-auto" />

        <div className="mx-auto mt-8 grid h-16 w-16 place-items-center rounded-2xl border border-[#F5C451]/30 bg-[#F5C451]/10 text-[#F5C451]">
          <LockKeyhole className="h-7 w-7" />
        </div>

        <h1 className="mt-6 text-2xl font-bold tracking-tight text-white">Accès suspendu</h1>
        {info.school_name && <p className="mt-1 text-sm font-medium text-sidebar-accent">{info.school_name}</p>}
        <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-sidebar-text">{info.message}</p>

        {info.reason && (
          <p className="mx-auto mt-4 max-w-sm rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-left text-sm text-white/85">
            <span className="mb-0.5 block text-[11px] font-semibold tracking-wide text-sidebar-text uppercase">Motif</span>
            {info.reason}
          </p>
        )}

        <p className="mx-auto mt-4 flex max-w-sm items-center justify-center gap-2 text-left text-xs text-sidebar-text">
          <LifeBuoy className="h-4 w-4 shrink-0" />
          Vos données sont conservées intactes. Tout redevient disponible dès la réactivation.
        </p>

        <div className="mt-8 flex flex-col gap-2.5">
          {whatsapp && (
            <a
              href={`https://wa.me/${whatsapp}?text=${whatsappText}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-2 rounded-xl bg-sidebar-accent px-4 py-3 text-sm font-semibold text-[#081410] no-underline transition hover:opacity-90"
            >
              <MessageCircle className="h-4 w-4" />
              Contacter SIGS sur WhatsApp
            </a>
          )}
          <button
            type="button"
            onClick={handleRecheck}
            disabled={checking}
            className="flex items-center justify-center gap-2 rounded-xl border border-white/15 px-4 py-3 text-sm font-medium text-white transition hover:bg-white/5 disabled:opacity-60"
          >
            {checking ? <Spinner /> : <RefreshCw className="h-4 w-4" />}
            J'ai régularisé, réessayer
          </button>
          {stillSuspended && !checking && <p className="text-xs text-[#F5C451]">L'accès est toujours suspendu.</p>}
          <button
            type="button"
            onClick={() => logout()}
            className="flex items-center justify-center gap-2 px-4 py-2 text-sm text-sidebar-text transition hover:text-white"
          >
            <LogOut className="h-4 w-4" />
            Se déconnecter
          </button>
        </div>
      </section>
    </main>
  );
}
