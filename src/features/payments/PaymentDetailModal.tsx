import { useEffect, useState } from 'react';
import { Download, Mail, MessageCircle, Printer, Receipt, Send } from 'lucide-react';
import { Loader } from '@/shared/components/Loader';
import { Modal } from '@/shared/components/Modal';
import { useSchoolSettings } from '@/features/settings/useSettings';
import { downloadPaymentReceiptPdf } from '@/shared/lib/pdf';
import { formatAmount, formatDate, formatNumber } from '@/shared/lib/format';
import {
  getReceiptPaperWidth,
  printThermalReceipt,
  receiptVerificationUrl,
  setReceiptPaperWidth,
  type ReceiptPaperWidth,
} from '@/shared/lib/thermalReceipt';
import { toReceiptData, usePaymentDetail, useSendReceipt, whatsappReceiptLink, type PaymentDetail } from './usePayments';

type SchoolSettings = { school_name: string; letterhead_url: string | null };

export function PaymentDetailModal({
  paymentId,
  onClose,
  justCreated = false,
}: {
  paymentId: number;
  onClose: () => void;
  justCreated?: boolean;
}) {
  const { data: payment, isLoading, refetch } = usePaymentDetail(paymentId);
  const { data: settings } = useSchoolSettings();

  // Le serveur envoie le reçu au parent juste après avoir répondu : on relit
  // le paiement quelques secondes plus tard pour afficher le résultat de l'envoi.
  useEffect(() => {
    if (!justCreated) return;
    const timer = setTimeout(() => refetch(), 5000);
    return () => clearTimeout(timer);
  }, [justCreated, refetch]);

  return (
    <Modal title={justCreated ? 'Paiement enregistré' : 'Détail du paiement'} onClose={onClose} widthClassName="max-w-lg">
      {isLoading || !payment ? (
        <div className="grid place-items-center py-10">
          <Loader size={48} label="" />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-3 rounded-lg bg-paper px-3.5 py-3">
            <div className="min-w-0">
              <p className="font-tabular text-xs text-ink-soft">{payment.reference_code}</p>
              <p className="mt-0.5 truncate text-sm font-semibold text-ink">
                {payment.student ? `${payment.student.first_name} ${payment.student.last_name}` : '—'}
              </p>
              <p className="text-xs text-ink-soft">
                {payment.student?.matricule} · {payment.student?.school_class?.label ?? '—'}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-xs text-ink-soft">{formatDate(payment.payment_date, 'long')}</p>
              <p className="text-xs text-ink-soft">Caissier : {payment.cashier?.full_name ?? '—'}</p>
            </div>
          </div>

          <div>
            <p className="mb-1.5 text-xs font-semibold tracking-wide text-ink-soft uppercase">Lignes réglées</p>
            <div className="divide-y divide-border overflow-hidden rounded-lg border border-border">
              {payment.items.map((item) => (
                <div key={item.id} className="px-3.5 py-2.5 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-medium text-ink">{item.label}</span>
                    <span className="font-tabular font-medium text-success">+{formatNumber(item.paid_amount)}</span>
                  </div>
                  <p className="mt-0.5 text-xs">
                    {item.line_status === 'partial' ? (
                      <span className="text-gold">
                        Acompte · {formatNumber(item.paid_to_date)} versés sur {formatNumber(item.expected_amount)} · reste{' '}
                        {formatNumber(item.remaining_after)} à ce jour du paiement
                      </span>
                    ) : (
                      <span className="text-success">Ligne soldée</span>
                    )}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg bg-success-soft px-3.5 py-3">
            <span className="flex items-center gap-2 text-sm font-medium text-success">
              <Receipt className="h-4 w-4" />
              Total encaissé
            </span>
            <span className="font-tabular text-lg font-bold text-success">{formatAmount(payment.total_paid_amount)}</span>
          </div>

          <ReceiptActions payment={payment} settings={settings ?? null} />
        </div>
      )}
    </Modal>
  );
}

const secondaryButton =
  'flex items-center justify-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-ink transition hover:bg-paper disabled:opacity-60';

/** Remise du reçu au parent : ticket thermique, PDF, WhatsApp, mail — et trace des envois. */
function ReceiptActions({ payment, settings }: { payment: PaymentDetail; settings: SchoolSettings | null }) {
  const [width, setWidth] = useState<ReceiptPaperWidth>(getReceiptPaperWidth());
  const sendReceipt = useSendReceipt(payment.id);
  const contacts = payment.receipt_contacts;
  const whatsappLink =
    payment.verification_token && !contacts?.whatsapp_auto
      ? whatsappReceiptLink(payment, settings?.school_name ?? '', receiptVerificationUrl(payment.verification_token))
      : null;
  const canResend = !!contacts?.email || (!!contacts?.whatsapp && contacts.whatsapp_auto);
  const sendError = sendReceipt.error as { response?: { data?: { message?: string } } } | null;

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => printThermalReceipt(toReceiptData(payment), settings, width)}
          className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-on-primary transition hover:bg-primary-dark"
        >
          <Printer className="h-4 w-4" />
          Imprimer le ticket
        </button>
        <select
          aria-label="Largeur du papier"
          value={width}
          onChange={(e) => {
            const next = Number(e.target.value) as ReceiptPaperWidth;
            setWidth(next);
            setReceiptPaperWidth(next);
          }}
          className="rounded-lg border border-border bg-surface px-2 text-sm text-ink"
        >
          <option value={58}>58 mm</option>
          <option value={80}>80 mm</option>
        </select>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={() => downloadPaymentReceiptPdf(toReceiptData(payment), settings)} className={secondaryButton}>
          <Download className="h-4 w-4" />
          Reçu A4 (PDF)
        </button>
        {whatsappLink ? (
          <a href={whatsappLink} target="_blank" rel="noreferrer" className={secondaryButton}>
            <MessageCircle className="h-4 w-4" />
            Envoyer sur WhatsApp
          </a>
        ) : (
          <button
            type="button"
            disabled={!canResend || sendReceipt.isPending}
            title={canResend ? undefined : "Renseignez l'e-mail ou le WhatsApp du parent dans la fiche de l'élève."}
            onClick={() => sendReceipt.mutate(undefined)}
            className={secondaryButton}
          >
            <Send className="h-4 w-4" />
            {sendReceipt.isPending ? 'Envoi...' : 'Renvoyer au parent'}
          </button>
        )}
      </div>
      {whatsappLink && contacts?.email && (
        <button type="button" disabled={sendReceipt.isPending} onClick={() => sendReceipt.mutate(['email'])} className={`${secondaryButton} w-full`}>
          <Mail className="h-4 w-4" />
          {sendReceipt.isPending ? 'Envoi...' : 'Renvoyer par e-mail'}
        </button>
      )}
      {sendError && <p className="text-xs text-danger">{sendError.response?.data?.message ?? "L'envoi a échoué."}</p>}

      <div>
        <p className="mb-1.5 text-xs font-semibold tracking-wide text-ink-soft uppercase">Envois au parent</p>
        {payment.deliveries && payment.deliveries.length > 0 ? (
          <ul className="space-y-1 text-xs">
            {payment.deliveries.map((d) => (
              <li key={d.id} className="flex items-center justify-between gap-2">
                <span className="text-ink">
                  {d.channel === 'email' ? 'E-mail' : 'WhatsApp'} · {d.recipient}
                </span>
                <span className={d.status === 'sent' ? 'text-success' : 'text-danger'} title={d.error ?? undefined}>
                  {d.status === 'sent' ? 'Envoyé' : 'Échec'} · {formatDate(d.created_at)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-ink-soft">
            {contacts?.email || contacts?.whatsapp ? 'Aucun envoi automatique enregistré.' : "Aucun contact (e-mail / WhatsApp) renseigné pour ce parent."}
          </p>
        )}
      </div>
    </div>
  );
}
