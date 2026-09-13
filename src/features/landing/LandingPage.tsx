import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  ClipboardCheck,
  Gauge,
  GraduationCap,
  History,
  KeyRound,
  Mail,
  MapPin,
  Menu,
  MessageCircle,
  Moon,
  Receipt,
  Search,
  Sun,
  UserX,
  Wallet,
  X,
} from 'lucide-react';
import { useTheme } from '@/shared/lib/ThemeContext';

// Compte WhatsApp de contact commercial — un seul point de vérité pour tous
// les boutons "Demander une démo" de la page.
const WHATSAPP_NUMBER = '2290191489743';
const WHATSAPP_MESSAGE = 'Bonjour, je souhaite une démonstration de SIGS pour mon établissement.';
const WHATSAPP_HREF = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`;

const NAV_LINKS = [
  { label: 'Fonctionnalités', href: '#fonctionnalites' },
  { label: 'Comment ça marche', href: '#comment-ca-marche' },
  { label: 'Offre', href: '#offre' },
  { label: 'Contact', href: '#contact' },
];

const FEATURES = [
  {
    icon: GraduationCap,
    title: 'Élèves & classes centralisés',
    description: "Chaque élève, sa classe et sa scolarité au même endroit — recherche instantanée par nom ou matricule.",
  },
  {
    icon: Wallet,
    title: 'Paiements & reçus PDF',
    description: 'Chaque encaissement est contrôlé, documenté et donne lieu à un reçu généré automatiquement.',
  },
  {
    icon: Gauge,
    title: 'Reste dû en temps réel',
    description: "Plus de calcul manuel : le montant restant apparaît immédiatement après chaque paiement.",
  },
  {
    icon: UserX,
    title: 'Débiteurs suivis',
    description: 'La liste des familles en retard se construit seule, prête à être relancée ou exportée.',
  },
  {
    icon: KeyRound,
    title: 'Accès par rôles',
    description: 'Caissier, gestionnaire, direction : chacun voit et modifie seulement ce qui le concerne.',
  },
  {
    icon: History,
    title: 'Journal & sauvegardes',
    description: 'Chaque opération est tracée, et les données sont sauvegardées automatiquement.',
  },
];

const STEPS = [
  {
    number: '01',
    title: 'Démonstration',
    description: 'Un échange de 20 minutes, sur WhatsApp ou en visio, autour d’un cas réel de votre école.',
  },
  {
    number: '02',
    title: 'Configuration',
    description: 'Import de vos élèves et classes, paramétrage des frais, formation de l’équipe qui encaisse.',
  },
  {
    number: '03',
    title: 'Pilote 30 jours',
    description: 'Vous utilisez SIGS en conditions réelles avant de choisir un abonnement mensuel ou annuel.',
  },
];

const OFFERS = [
  {
    name: 'Pilote 30 jours',
    price: 'Pour démarrer',
    description: 'Le temps de vérifier, avec votre propre équipe, que SIGS correspond à votre école.',
    included: [
      'Installation et configuration',
      'Import de vos élèves et classes',
      'Formation du responsable et des caissiers',
      'Assistance prioritaire pendant le pilote',
    ],
    highlighted: false,
  },
  {
    name: 'Abonnement Établissement',
    price: 'Sur devis',
    description: "Le tarif dépend de l'effectif, du nombre d'utilisateurs et du niveau d'accompagnement.",
    included: [
      'Toutes les fonctionnalités de gestion',
      'Hébergement, sauvegardes et sécurité',
      'Support continu et mises à jour',
      'Remise de 10 à 15 % en engagement annuel',
    ],
    highlighted: true,
  },
];

function WhatsAppButton({ className = '', children }: { className?: string; children: ReactNode }) {
  return (
    <a
      href={WHATSAPP_HREF}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center justify-center gap-2 rounded-lg bg-[#25D366] px-5 py-3 text-sm font-semibold text-white transition hover:brightness-95 ${className}`}
    >
      <MessageCircle className="h-4 w-4" />
      {children}
    </a>
  );
}

function ThemeToggleButton({ className = '' }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();
  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={theme === 'dark' ? 'Activer le thème clair' : 'Activer le thème sombre'}
      className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-border text-ink-soft transition hover:bg-paper hover:text-ink ${className}`}
    >
      {theme === 'dark' ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
    </button>
  );
}

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <main className="min-h-screen bg-paper font-landing text-ink">
      {/* ───────────────────────── Navbar ───────────────────────── */}
      <header className="sticky top-0 z-40 border-b border-border bg-surface/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
          <a href="#accueil" className="flex items-center gap-2 text-xl font-bold">
            <GraduationCap className="h-6 w-6 text-primary" /> SIGS
          </a>

          <nav className="hidden items-center gap-8 lg:flex">
            {NAV_LINKS.map((link) => (
              <a key={link.href} href={link.href} className="text-sm font-medium text-ink-soft transition hover:text-ink">
                {link.label}
              </a>
            ))}
          </nav>

          <div className="hidden items-center gap-3 lg:flex">
            <ThemeToggleButton />
            <Link to="/login" className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-ink transition hover:bg-paper">
              Se connecter
            </Link>
            <WhatsAppButton className="px-4 py-2">Demander une démo</WhatsAppButton>
          </div>

          <div className="flex items-center gap-2 lg:hidden">
            <ThemeToggleButton />
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              className="grid h-10 w-10 place-items-center rounded-lg border border-border text-ink"
              aria-label={menuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
              aria-expanded={menuOpen}
            >
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {menuOpen && (
          <div className="border-t border-border bg-surface px-5 py-4 lg:hidden">
            <nav className="flex flex-col gap-1">
              {NAV_LINKS.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className="rounded-lg px-3 py-2.5 text-sm font-medium text-ink-soft transition hover:bg-paper hover:text-ink"
                >
                  {link.label}
                </a>
              ))}
            </nav>
            <div className="mt-3 flex flex-col gap-2 border-t border-border pt-3">
              <Link
                to="/login"
                onClick={() => setMenuOpen(false)}
                className="rounded-lg border border-border px-4 py-2.5 text-center text-sm font-semibold text-ink transition hover:bg-paper"
              >
                Se connecter
              </Link>
              <WhatsAppButton>Demander une démo</WhatsAppButton>
            </div>
          </div>
        )}
      </header>

      {/* ───────────────────────── Hero ───────────────────────── */}
      <section id="accueil" className="relative overflow-hidden border-b border-border px-5 pt-10 pb-[clamp(4rem,9vw,7rem)] sm:px-8 sm:pt-14">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_85%_15%,rgba(37,87,199,0.12),transparent_32%),radial-gradient(circle_at_8%_75%,rgba(219,154,34,0.12),transparent_30%)]" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-14 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary-soft px-3.5 py-1.5 text-xs font-semibold tracking-wide text-primary">
              🏫 Le registre de votre école, enfin centralisé
            </p>

            <h1 className="mt-6 max-w-2xl text-5xl leading-[1.02] font-bold tracking-tight sm:text-6xl lg:text-[4.2rem]">
              Élèves, classes, paiements.
              <br />
              <span className="font-landing-serif text-primary italic">Tout votre registre scolaire,</span>
              <br />
              dans un seul tableau de bord.
            </h1>

            <p className="mt-6 max-w-xl text-lg leading-8 text-ink-soft">
              SIGS réunit les élèves, les classes, les paiements et les restes dus de votre établissement, à jour en
              temps réel — pensé pour les directeurs et les caissiers béninois.
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm font-medium text-ink-soft">
              <span>Démo en 20 minutes</span>
              <span className="h-1 w-1 rounded-full bg-border" />
              <span>Pilote de 30 jours</span>
              <span className="h-1 w-1 rounded-full bg-border" />
              <span>Sur mesure pour votre école</span>
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <WhatsAppButton>
                Demander une démo <ArrowRight className="h-4 w-4" />
              </WhatsAppButton>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-5 py-3 text-sm font-semibold text-ink transition hover:bg-surface-alt"
              >
                Voir l’application
              </Link>
            </div>
          </div>

          {/* Aperçu illustratif du produit (données fictives) */}
          <div className="relative mx-auto w-full max-w-sm">
            <div className="rounded-2xl border border-border bg-surface p-5 shadow-xl">
              <div className="flex items-center gap-2 border-b border-border pb-4">
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary-soft text-primary">
                  <Search className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-semibold">Recherche élève</p>
                  <p className="text-xs text-ink-soft">Matricule ou nom</p>
                </div>
              </div>

              <div className="mt-4 rounded-lg border border-border bg-paper px-3 py-2 text-sm text-ink-soft">Koffi A. — 6ème A</div>

              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-ink-soft">Scolarité payée</span>
                  <span className="font-tabular font-semibold text-ink">150 000 F</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-ink-soft">Reste dû</span>
                  <span className="rounded-md bg-gold-soft px-2 py-0.5 font-tabular font-semibold text-gold">50 000 F</span>
                </div>
              </div>

              <button
                type="button"
                tabIndex={-1}
                className="mt-5 w-full rounded-lg bg-primary py-2.5 text-sm font-semibold text-white"
              >
                Voir le dossier complet
              </button>
            </div>

            <div className="absolute -right-4 -bottom-4 flex items-center gap-2 rounded-xl border border-border bg-surface px-3.5 py-2.5 shadow-lg sm:-right-8">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-success-soft text-success">
                <Receipt className="h-4 w-4" />
              </span>
              <div>
                <p className="text-xs font-semibold">Reçu généré</p>
                <p className="text-xs text-ink-soft">PDF automatique</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ───────────────────────── Fonctionnalités ───────────────────────── */}
      <section id="fonctionnalites" className="border-b border-border px-5 py-[clamp(4rem,9vw,7rem)] sm:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold tracking-[0.2em] text-primary uppercase">Pourquoi SIGS</p>
            <h2 className="mt-3 text-4xl font-bold sm:text-5xl">
              Ce que les cahiers et les tableurs
              <br />
              ne peuvent plus suivre.
            </h2>
            <p className="mt-4 leading-7 text-ink-soft">
              Un carnet ou un fichier Excel tient un temps. Dès que l’école grandit, les erreurs de calcul et les
              paiements oubliés reviennent. SIGS les remplace par un système qui contrôle chaque encaissement.
            </p>
          </div>

          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature) => (
              <div key={feature.title} className="rounded-2xl border border-border bg-surface p-6 transition hover:shadow-md">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary-soft text-primary">
                  <feature.icon className="h-5 w-5" />
                </span>
                <p className="mt-4 text-lg font-bold">{feature.title}</p>
                <p className="mt-1.5 text-sm leading-6 text-ink-soft">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───────────────────────── Comment ça marche ───────────────────────── */}
      <section id="comment-ca-marche" className="border-b border-border bg-surface-alt px-5 py-[clamp(4rem,9vw,7rem)] sm:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold tracking-[0.2em] text-primary uppercase">Comment ça marche</p>
            <h2 className="mt-3 text-4xl font-bold sm:text-5xl">20 minutes d’échange. 30 jours à l’essai.</h2>
            <p className="mt-4 leading-7 text-ink-soft">
              Pas de contrat signé à l’aveugle : on regarde d’abord ensemble si SIGS correspond à la façon dont votre
              école encaisse aujourd’hui.
            </p>
          </div>

          <div className="mt-12 grid gap-8 sm:grid-cols-3">
            {STEPS.map((step) => (
              <div key={step.number}>
                <p className="font-landing-serif text-5xl text-primary/30 italic">{step.number}</p>
                <p className="mt-3 text-lg font-bold">{step.title}</p>
                <p className="mt-1.5 text-sm leading-6 text-ink-soft">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───────────────────────── Offre ───────────────────────── */}
      <section id="offre" className="border-b border-border px-5 py-[clamp(4rem,9vw,7rem)] sm:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold tracking-[0.2em] text-primary uppercase">Une offre claire</p>
            <h2 className="mt-3 text-4xl font-bold sm:text-5xl">Un pilote pour vérifier, un abonnement pour durer.</h2>
            <p className="mt-4 leading-7 text-ink-soft">
              L’abonnement finance l’hébergement, les sauvegardes, le support et les évolutions continues — l’école
              évite un gros investissement initial et reste à jour.
            </p>
          </div>

          <div className="mt-12 grid gap-5 sm:grid-cols-2">
            {OFFERS.map((offer) => (
              <div
                key={offer.name}
                className={`flex flex-col rounded-2xl border p-6 ${
                  offer.highlighted ? 'border-primary/30 bg-surface shadow-lg' : 'border-border bg-surface-alt'
                }`}
              >
                <p className="text-sm font-semibold text-primary">{offer.name}</p>
                <p className="mt-2 text-3xl font-bold">{offer.price}</p>
                <p className="mt-2 text-sm text-ink-soft">{offer.description}</p>
                <ul className="mt-6 flex-1 space-y-3">
                  {offer.included.map((item) => (
                    <li key={item} className="flex gap-2 text-sm text-ink">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                      {item}
                    </li>
                  ))}
                </ul>
                <WhatsAppButton className="mt-7">
                  Parler de mon établissement <ArrowRight className="h-4 w-4" />
                </WhatsAppButton>
              </div>
            ))}
          </div>
          <p className="mt-6 text-xs text-ink-soft">Paiement Mobile Money (MTN, Moov) ou virement bancaire.</p>
        </div>
      </section>

      {/* ───────────────────────── CTA final ───────────────────────── */}
      <section id="contact" className="border-b border-border bg-primary px-5 py-[clamp(3.5rem,8vw,5.5rem)] text-center sm:px-8">
        <div className="mx-auto max-w-2xl">
          <h2 className="text-4xl font-bold text-white sm:text-5xl">Prêt à professionnaliser la gestion de votre école ?</h2>
          <p className="mt-4 text-lg text-white/85">
            Écrivez-nous sur WhatsApp — on organise une démonstration autour d’un cas réel de votre établissement.
          </p>
          <div className="mt-8 flex justify-center">
            <WhatsAppButton className="px-6 py-3.5 text-base">
              Discuter sur WhatsApp <ArrowRight className="h-4 w-4" />
            </WhatsAppButton>
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm font-medium text-white/80">
            <span>Réponse rapide</span>
            <span className="h-1 w-1 rounded-full bg-white/40" />
            <span>Sans engagement</span>
            <span className="h-1 w-1 rounded-full bg-white/40" />
            <span>Échange en français</span>
          </div>
        </div>
      </section>

      {/* ───────────────────────── Footer ───────────────────────── */}
      <footer className="px-5 py-12 sm:px-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-8 sm:flex-row sm:justify-between">
          <div className="max-w-sm">
            <div className="flex items-center gap-2 text-lg font-bold">
              <GraduationCap className="h-5 w-5 text-primary" /> SIGS
            </div>
            <p className="mt-3 text-sm leading-6 text-ink-soft">
              La gestion scolaire réinventée pour les établissements béninois : élèves, paiements et restes dus dans un
              seul tableau de bord.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:flex sm:gap-16">
            <div>
              <p className="text-sm font-semibold">Navigation</p>
              <ul className="mt-3 space-y-2 text-sm text-ink-soft">
                {NAV_LINKS.map((link) => (
                  <li key={link.href}>
                    <a href={link.href} className="transition hover:text-ink">
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className="text-sm font-semibold">Contact</p>
              <ul className="mt-3 space-y-2 text-sm text-ink-soft">
                <li>
                  <a
                    href={WHATSAPP_HREF}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 transition hover:text-ink"
                  >
                    <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                  </a>
                </li>
                <li>
                  <a href="mailto:contact@sigs.app" className="flex items-center gap-1.5 transition hover:text-ink">
                    <Mail className="h-3.5 w-3.5" /> contact@sigs.app
                  </a>
                </li>
                <li className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5" /> Cotonou, Bénin
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mx-auto mt-10 flex max-w-6xl flex-col gap-2 border-t border-border pt-6 text-xs text-ink-soft sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-center gap-1.5">
            <Building2 className="h-3.5 w-3.5" /> © {new Date().getFullYear()} SIGS — Tous droits réservés.
          </p>
          <p className="flex items-center gap-1.5">
            <ClipboardCheck className="h-3.5 w-3.5" /> Données hébergées et sauvegardées de façon sécurisée.
          </p>
        </div>
      </footer>
    </main>
  );
}
