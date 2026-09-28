import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { CheckCircle2, ShieldAlert, XCircle } from 'lucide-react';
import { apiClient } from '@/shared/lib/apiClient';
import { Loader } from '@/shared/components/Loader';
import { formatNumber } from '@/shared/lib/format';

interface VerifiedReceipt {
  school_name: string;
  reference_code: string;
  paid_at: string | null;
  total_paid_amount: number;
  currency: string;
  student: string | null;
  class: string | null;
  status: 'valid' | 'cancelled';
}

/**
 * Page publique ouverte en scannant le QR code d'un reçu. Le parent compare
 * son reçu papier à ce que le serveur a enregistré : montant, date, statut.
 */
export default function VerifyReceiptPage() {
  const { token = '' } = useParams();
  const { data, isLoading, isError } = useQuery({
    queryKey: ['receipt-verify', token],
    queryFn: async () => (await apiClient.get<VerifiedReceipt>(`/receipts/verify/${token}`)).data,
    retry: false,
  });

  return (
    <main className="grid min-h-screen place-items-center bg-paper px-4 py-10">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-surface p-6 shadow-sm">
        {isLoading ? (
          <div className="grid place-items-center py-10">
            <Loader size={48} label="" />
          </div>
        ) : isError || !data ? (
          <Verdict tone="danger" icon={<ShieldAlert className="h-10 w-10" />} title="Reçu introuvable">
            Ce reçu n'est pas enregistré par l'établissement. S'il vous a été remis contre un paiement, signalez-le
            directement à la direction.
          </Verdict>
        ) : (
          <>
            {data.status === 'valid' ? (
              <Verdict tone="success" icon={<CheckCircle2 className="h-10 w-10" />} title="Reçu authentique">
                Ce paiement est bien enregistré par {data.school_name}.
              </Verdict>
            ) : (
              <Verdict tone="danger" icon={<XCircle className="h-10 w-10" />} title="Paiement annulé">
                Ce paiement a été annulé par l'établissement. Si vous n'en avez pas été informé, contactez la direction.
              </Verdict>
            )}
            <dl className="mt-5 space-y-2 text-sm">
              <Row label="Référence" value={data.reference_code} />
              <Row
                label="Date"
                value={data.paid_at ? new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long', timeStyle: 'short' }).format(new Date(data.paid_at)) : '—'}
              />
              <Row label="Élève" value={data.student ?? '—'} />
              <Row label="Classe" value={data.class ?? '—'} />
              <Row label="Montant versé" value={`${formatNumber(data.total_paid_amount)} ${data.currency}`} strong />
            </dl>
            <p className="mt-5 text-xs text-ink-soft">
              Le montant ci-dessus doit être identique à celui de votre reçu. En cas de différence, contactez la direction.
            </p>
          </>
        )}
      </div>
    </main>
  );
}

function Verdict({ tone, icon, title, children }: { tone: 'success' | 'danger'; icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="text-center">
      <div className={`mx-auto mb-3 w-fit ${tone === 'success' ? 'text-success' : 'text-danger'}`}>{icon}</div>
      <h1 className="text-lg font-semibold text-ink">{title}</h1>
      <p className="mt-1 text-sm text-ink-soft">{children}</p>
    </div>
  );
}

function Row({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex justify-between gap-3 border-b border-border pb-2">
      <dt className="text-ink-soft">{label}</dt>
      <dd className={`text-right text-ink ${strong ? 'font-semibold' : ''}`}>{value}</dd>
    </div>
  );
}
