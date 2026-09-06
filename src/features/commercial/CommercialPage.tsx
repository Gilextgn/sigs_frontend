import { ArrowRight, Check, GraduationCap, ShieldCheck, Wallet } from 'lucide-react';
import { Link } from 'react-router-dom';

const benefits = [
  'Suivi des élèves, classes et scolarités',
  'Paiements sécurisés avec reçus PDF',
  'Reste dû et débiteurs visibles en temps réel',
  'Accès protégés par rôles et permissions',
  'Sauvegardes et journal des opérations',
];

export default function CommercialPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-paper text-ink">
      <header className="border-b border-border bg-surface/90 px-5 py-4 backdrop-blur sm:px-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-2 font-display text-xl font-semibold"><GraduationCap className="h-6 w-6 text-primary" /> SIGS</div>
          <Link to="/login" className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-ink transition hover:bg-paper">Se connecter</Link>
        </div>
      </header>

      <section className="relative border-b border-border px-5 py-16 sm:px-8 sm:py-24">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_85%_20%,rgba(217,164,65,0.18),transparent_28%),radial-gradient(circle_at_10%_80%,rgba(47,143,111,0.13),transparent_30%)]" />
        <div className="relative mx-auto grid max-w-6xl items-end gap-12 lg:grid-cols-[1.15fr_0.85fr]">
          <div>
            <p className="text-xs font-semibold tracking-[0.2em] text-primary uppercase">Gestion scolaire simple et contrôlable</p>
            <h1 className="mt-4 max-w-3xl font-display text-5xl leading-[0.98] font-semibold sm:text-7xl">Les chiffres de votre école, enfin lisibles.</h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-ink-soft">SIGS aide les établissements à encaisser correctement, suivre les restes dus et donner à chaque équipe le bon niveau d’accès.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="mailto:contact@sigs.app?subject=Demande%20de%20d%C3%A9monstration%20SIGS" className="flex items-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-primary-dark">Demander une démonstration <ArrowRight className="h-4 w-4" /></a>
              <Link to="/login" className="rounded-lg border border-border bg-surface px-5 py-3 text-sm font-semibold text-ink transition hover:bg-surface-alt">Voir l’application</Link>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            <div className="border-l-4 border-success bg-surface px-5 py-4 shadow-sm"><Wallet className="h-5 w-5 text-success" /><p className="mt-3 font-display text-xl font-semibold">Encaisser juste</p><p className="mt-1 text-sm text-ink-soft">Chaque paiement est contrôlé et documenté.</p></div>
            <div className="border-l-4 border-gold bg-surface px-5 py-4 shadow-sm"><ShieldCheck className="h-5 w-5 text-gold" /><p className="mt-3 font-display text-xl font-semibold">Travailler serein</p><p className="mt-1 text-sm text-ink-soft">Permissions, historique et sauvegardes structurent l’équipe.</p></div>
            <div className="border-l-4 border-primary bg-surface px-5 py-4 shadow-sm"><GraduationCap className="h-5 w-5 text-primary" /><p className="mt-3 font-display text-xl font-semibold">Décider vite</p><p className="mt-1 text-sm text-ink-soft">Les indicateurs importants restent à portée de main.</p></div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-12 px-5 py-16 sm:px-8 lg:grid-cols-[0.9fr_1.1fr]">
        <div><p className="text-xs font-semibold tracking-[0.2em] text-primary uppercase">Une offre claire</p><h2 className="mt-3 font-display text-4xl font-semibold">Un abonnement qui accompagne l’école.</h2><p className="mt-4 leading-7 text-ink-soft">L’abonnement finance l’hébergement, les sauvegardes, le support et les améliorations continues. L’école évite un gros investissement initial et reste à jour.</p></div>
        <div className="border border-primary/30 bg-surface p-6 shadow-sm"><p className="text-sm font-semibold text-primary">SIGS Établissement</p><p className="mt-2 font-display text-3xl font-semibold">Sur devis</p><p className="mt-2 text-sm text-ink-soft">Le tarif dépend de l’effectif, du nombre d’utilisateurs et du niveau d’accompagnement.</p><ul className="mt-6 space-y-3">{benefits.map((benefit) => <li key={benefit} className="flex gap-2 text-sm text-ink"><Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />{benefit}</li>)}</ul><a href="mailto:contact@sigs.app?subject=Tarification%20SIGS" className="mt-7 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-dark">Parler de mon établissement <ArrowRight className="h-4 w-4" /></a></div>
      </section>
    </main>
  );
}
