import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { useAuth } from '@/features/auth/AuthContext';
import { StudentDetailModal } from '@/features/students/StudentDetailModal';
import { NewPaymentModal } from './NewPaymentModal';

interface PaymentDeskValue {
  /** Ouvre l'encaissement, avec l'élève déjà choisi si on le connaît. */
  openPayment: (studentId?: number | null) => void;
  /** Ouvre la fiche d'un élève (solde, historique, Encaisser). */
  openStudent: (studentId: number) => void;
  canPay: boolean;
}

const PaymentDeskContext = createContext<PaymentDeskValue | null>(null);

/**
 * Le guichet est partout : barre du haut, accueil, débiteurs, rentrée.
 * Un seul endroit monte la fiche élève et la modale d'encaissement, pour
 * que « rechercher → cliquer l'élève → encaisser » tienne en trois gestes
 * quel que soit l'écran de départ.
 */
export function PaymentDeskProvider({ children }: { children: ReactNode }) {
  const { hasPermission } = useAuth();
  const canPay = hasPermission('payments.create');
  const [payment, setPayment] = useState<{ studentId: number | null } | null>(null);
  const [studentId, setStudentId] = useState<number | null>(null);

  const openPayment = useCallback(
    (id?: number | null) => {
      if (!canPay) return;
      setStudentId(null);
      setPayment({ studentId: id ?? null });
    },
    [canPay],
  );
  const openStudent = useCallback((id: number) => setStudentId(id), []);

  const value = useMemo(() => ({ openPayment, openStudent, canPay }), [openPayment, openStudent, canPay]);

  return (
    <PaymentDeskContext.Provider value={value}>
      {children}
      {studentId !== null && (
        <StudentDetailModal studentId={studentId} onClose={() => setStudentId(null)} onPay={canPay ? openPayment : undefined} />
      )}
      {payment && <NewPaymentModal initialStudentId={payment.studentId} onClose={() => setPayment(null)} />}
    </PaymentDeskContext.Provider>
  );
}

export function usePaymentDesk(): PaymentDeskValue {
  const ctx = useContext(PaymentDeskContext);
  if (!ctx) throw new Error('usePaymentDesk doit être utilisé sous PaymentDeskProvider');
  return ctx;
}
