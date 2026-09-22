import { daysFromToday, formatDate, formatNumber } from '@/shared/lib/format';
import type { PaymentMethod, PlatformSchool } from './usePlatform';

/** Indicatif ajouté aux numéros saisis sans indicatif (numéros béninois à 10 chiffres). */
const DEFAULT_COUNTRY_CODE = '229';

/** Relancer à partir de ce nombre de jours avant l'échéance. */
export const REMIND_DAYS_BEFORE = 7;

export const METHOD_LABELS: Record<PaymentMethod, string> = {
  mobile_money: 'Mobile Money',
  cash: 'Espèces',
  bank: 'Virement',
  other: 'Autre',
};

/** Chiffres seuls au format international, comme wa.me les attend. Null si inexploitable. */
export function whatsappNumber(phone: string | null | undefined): string | null {
  if (!phone) return null;
  let digits = phone.replace(/\D/g, '');
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.length > 0 && digits.length <= 10 && !digits.startsWith(DEFAULT_COUNTRY_CODE)) digits = DEFAULT_COUNTRY_CODE + digits;
  return digits.length >= 8 ? digits : null;
}

export function whatsappLink(phone: string | null | undefined, text: string): string | null {
  const number = whatsappNumber(phone);
  return number ? `https://wa.me/${number}?text=${encodeURIComponent(text)}` : null;
}

/** L'école est à relancer : suspendue, en retard, ou échéance dans les 7 jours. */
export function needsReminder(school: PlatformSchool): boolean {
  if (school.status === 'suspended' || school.status === 'overdue') return true;
  return !!school.subscription_due_at && daysFromToday(school.subscription_due_at) <= REMIND_DAYS_BEFORE;
}

/** Ordre de la liste « À relancer » : suspendues, puis retards les plus anciens, puis échéances proches. */
export function reminderPriority(school: PlatformSchool): number {
  const days = school.subscription_due_at ? daysFromToday(school.subscription_due_at) : 0;
  return (school.status === 'suspended' ? -10_000 : 0) + days;
}

/** Relancé aujourd'hui : inutile d'insister. */
export function remindedToday(school: PlatformSchool): boolean {
  return !!school.last_reminded_at && new Date(school.last_reminded_at).toDateString() === new Date().toDateString();
}

/** Message de relance prêt à envoyer, adapté à la situation de l'école. */
export function reminderMessage(school: PlatformSchool): string {
  const hello = `Bonjour${school.contact_name ? ` ${school.contact_name}` : ''},`;
  const amount = school.plan_amount ? ` Montant : ${formatNumber(school.plan_amount)} XOF.` : '';
  const due = school.subscription_due_at;

  if (school.status === 'suspended') {
    return [
      hello,
      `L'accès SIGS de « ${school.name} » est actuellement suspendu pour abonnement non réglé.${amount}`,
      "Dès réception de votre paiement, nous rétablissons l'accès immédiatement — toutes vos données sont intactes.",
      'Merci !',
    ].join('\n');
  }

  if (due && daysFromToday(due) < 0) {
    const late = -daysFromToday(due);
    return [
      hello,
      `L'abonnement SIGS de « ${school.name} » est arrivé à échéance le ${formatDate(due, 'long')} (il y a ${late} jour${late > 1 ? 's' : ''}).${amount}`,
      school.blocked_from
        ? `Sans règlement, l'accès de votre équipe sera suspendu le ${formatDate(school.blocked_from, 'long')}.`
        : 'Merci de procéder au règlement dès que possible.',
      'Merci !',
    ].join('\n');
  }

  return [
    hello,
    `Petit rappel : l'abonnement SIGS de « ${school.name} » arrive à échéance le ${due ? formatDate(due, 'long') : 'bientôt'}.${amount}`,
    'Merci de procéder au règlement pour que votre équipe continue sans interruption.',
    'Bonne journée !',
  ].join('\n');
}

/** Date ISO + n mois, bornée à la fin du mois (31 janv. + 1 mois → 28/29 févr.), comme le serveur. */
export function addMonthsIso(iso: string, months: number): string {
  const [year, month, day] = iso.split('-').map(Number);
  const target = new Date(year, month - 1 + months, 1);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(day, lastDay));
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${target.getFullYear()}-${pad(target.getMonth() + 1)}-${pad(target.getDate())}`;
}

export function todayIso(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}
