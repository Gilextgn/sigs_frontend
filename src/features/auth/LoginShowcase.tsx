import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { CheckCircle2, FileText, Lock, Wallet } from 'lucide-react';
import { formatNumber } from '@/shared/lib/format';
import { StarField } from './StarField';

const SCENE_MS = 7000;

/** Compteur qui monte en douceur : donne vie aux chiffres dès l'entrée d'une scène. */
function useCountUp(target: number, duration = 1400, delay = 700) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      setValue(target);
      return;
    }
    let frame = 0;
    const start = performance.now() + delay;
    const tick = (now: number) => {
      const progress = Math.min(Math.max((now - start) / duration, 0), 1);
      setValue(Math.round(target * (1 - Math.pow(1 - progress, 3))));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, duration, delay]);

  return value;
}

/** Carte de verre qui entre en scène, puis flotte doucement. */
function Glass({
  className = '',
  delay = 0,
  tilt,
  floatSeconds = 7,
  children,
}: {
  className?: string;
  delay?: number;
  tilt?: number;
  floatSeconds?: number;
  children: ReactNode;
}) {
  return (
    <div className={`absolute ${className}`} style={{ animation: `card-in 0.8s cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms both` }}>
      <div
        className="glass rounded-2xl"
        style={
          {
            '--tilt': `${tilt ?? 0}deg`,
            animation: `${tilt !== undefined ? 'float-y-alt' : 'float-y'} ${floatSeconds}s ease-in-out ${delay}ms infinite`,
          } as CSSProperties
        }
      >
        {children}
      </div>
    </div>
  );
}

function Ring({ value, size = 96, stroke = 9, delay = 500 }: { value: number; size?: number; stroke?: number; delay?: number }) {
  const radius = (size - stroke) / 2;
  const length = 2 * Math.PI * radius;
  const offset = length * (1 - value / 100);
  const shown = useCountUp(value, 1500, delay);

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.10)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#2FD98A"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={length}
          style={{ '--len': length, '--off': offset, animation: `ring-draw 1.5s cubic-bezier(0.22, 1, 0.36, 1) ${delay}ms both` } as CSSProperties}
        />
      </svg>
      <span className="absolute inset-0 grid place-items-center text-xl font-bold text-white">{shown}%</span>
    </div>
  );
}

function Bar({ value, delay }: { value: number; delay: number }) {
  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
      <div
        className="h-full origin-left rounded-full bg-[#2FD98A]"
        style={{ width: `${value}%`, animation: `bar-grow 1.1s cubic-bezier(0.22, 1, 0.36, 1) ${delay}ms both` }}
      />
    </div>
  );
}

/* ───────────────────────── Les scènes ───────────────────────── */

function PaymentScene() {
  const total = useCountUp(140000, 1300, 900);

  return (
    <>
      <Glass className="top-4 left-2 w-[310px]" delay={0} floatSeconds={8}>
        <div className="p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-white">Encaisser</p>
            <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-medium text-white/70">3 gestes</span>
          </div>
          <div className="mt-3 flex items-center justify-between rounded-xl bg-white/5 px-3 py-2.5">
            <div>
              <p className="text-sm font-medium text-white">Awa Kponou</p>
              <p className="text-[11px] text-white/55">ELV-2026-000004 · 5ème B</p>
            </div>
            <div className="text-right">
              <p className="text-[9px] tracking-wide text-white/50 uppercase">Reste</p>
              <p className="font-tabular text-sm font-bold text-[#F98080]">350 000</p>
            </div>
          </div>
          <div className="mt-3 space-y-2">
            <div className="flex items-center gap-2.5 rounded-lg bg-[#2FD98A]/10 px-2.5 py-2 ring-1 ring-[#2FD98A]/30">
              <span className="grid h-4 w-4 place-items-center rounded bg-[#2FD98A] text-[#081410]">
                <CheckCircle2 className="h-3 w-3" strokeWidth={3} />
              </span>
              <span className="flex-1 text-xs font-medium text-white">1ère tranche</span>
              <span className="font-tabular text-xs font-semibold text-white">140 000</span>
            </div>
            <div className="flex items-center gap-2.5 rounded-lg px-2.5 py-2">
              <span className="h-4 w-4 rounded border border-white/25" />
              <span className="flex-1 text-xs text-white/70">2ème tranche</span>
              <span className="font-tabular text-xs text-white/50">105 000</span>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between rounded-xl bg-[#0B0F16] px-3.5 py-3">
            <span className="text-xs text-white/60">Total encaissé</span>
            <span className="font-tabular text-lg font-bold text-[#2FD98A]">{formatNumber(total)}</span>
          </div>
        </div>
      </Glass>

      <Glass className="top-0 right-0 w-[220px]" delay={350} tilt={4} floatSeconds={9}>
        <div className="p-4">
          <div className="flex items-center gap-2 text-white">
            <FileText className="h-4 w-4 text-[#2FD98A]" />
            <p className="text-xs font-semibold">Reçu de paiement</p>
          </div>
          <p className="font-tabular mt-2 text-[10px] text-white/50">PAY-20260917-000013</p>
          <div className="mt-3 space-y-1.5 text-[11px]">
            <div className="flex justify-between text-white/60">
              <span>Montant dû</span>
              <span className="font-tabular">140 000</span>
            </div>
            <div className="flex justify-between text-white/60">
              <span>Versé ce jour</span>
              <span className="font-tabular text-white">46 667</span>
            </div>
            <div className="flex justify-between text-white/60">
              <span>Reste</span>
              <span className="font-tabular text-[#F5C451]">93 333</span>
            </div>
          </div>
          <span className="mt-3 inline-block rounded-full bg-[#F5C451]/15 px-2 py-0.5 text-[10px] font-semibold text-[#F5C451]">Acompte</span>
        </div>
      </Glass>

      <Glass className="bottom-3 left-24 w-[250px]" delay={800} floatSeconds={6}>
        <div className="flex items-center gap-3 p-3.5">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-[#2FD98A] text-[#081410]" style={{ animation: 'pulse-ring 1.8s ease-out 1.4s infinite' }}>
            <Wallet className="h-4 w-4" />
          </span>
          <div>
            <p className="text-xs font-semibold text-white">Paiement enregistré</p>
            <p className="text-[11px] text-white/55">Reçu PDF téléchargé</p>
          </div>
        </div>
      </Glass>
    </>
  );
}

function RentreeScene() {
  const classes: [string, number, string][] = [
    ['3ème A', 41, '12 en attente'],
    ['5ème B', 54, '8 en attente'],
    ['1ère D', 59, '9 en attente'],
    ['6ème A', 71, '5 en attente'],
  ];

  return (
    <>
      <Glass className="top-2 left-0 w-[210px]" delay={0} floatSeconds={8}>
        <div className="flex flex-col items-center p-5">
          <Ring value={62} size={110} stroke={10} />
          <p className="mt-3 text-sm font-semibold text-white">Rentrée 2026-2027</p>
          <p className="text-[11px] text-white/55">89 réinscrits sur 143</p>
        </div>
      </Glass>

      <Glass className="top-6 right-0 w-[300px]" delay={300} floatSeconds={9}>
        <div className="p-4">
          <p className="text-xs font-semibold text-white">Avancement par classe</p>
          <div className="mt-3 space-y-3">
            {classes.map(([name, value, hint], index) => (
              <div key={name}>
                <div className="mb-1 flex items-center justify-between text-[11px]">
                  <span className="font-medium text-white">{name}</span>
                  <span className="text-white/50">
                    {hint} · <span className="font-tabular text-white/80">{value} %</span>
                  </span>
                </div>
                <Bar value={value} delay={600 + index * 140} />
              </div>
            ))}
          </div>
        </div>
      </Glass>

      <Glass className="bottom-4 left-4 w-[230px]" delay={700} tilt={-3} floatSeconds={7}>
        <div className="flex items-center gap-3 p-3.5">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-[#F98080]/15 text-[#F98080]">
            <Lock className="h-4 w-4" />
          </span>
          <div>
            <p className="text-xs font-semibold text-white">12 bloqués pour impayés</p>
            <p className="font-tabular text-[11px] text-white/55">1 240 000 XOF à encaisser</p>
          </div>
        </div>
      </Glass>

      <Glass className="right-8 bottom-0 w-[190px]" delay={950} floatSeconds={6}>
        <div className="p-3.5">
          <p className="text-[11px] text-white/55">Sans nouvelles</p>
          <p className="font-tabular text-2xl font-bold text-[#F5C451]">42</p>
          <p className="text-[11px] text-white/55">à relancer · PDF prêt</p>
        </div>
      </Glass>
    </>
  );
}

function RecoveryScene() {
  const outstanding = useCountUp(12400000, 1500, 600);
  const debtors: [string, string, string][] = [
    ['Idrissou Akplogan', '5ème B', '180 000'],
    ['Bernadette Zinsou', '2nde C', '155 000'],
    ['Koffi Agbo', '6ème A', '140 000'],
  ];

  return (
    <>
      <Glass className="top-2 left-0 w-[320px]" delay={0} floatSeconds={8}>
        <div className="p-5">
          <p className="text-[11px] font-semibold tracking-wide text-white/50 uppercase">Reste à recouvrer</p>
          <p className="font-tabular mt-1 text-3xl font-bold tracking-tight text-white">
            {formatNumber(outstanding)} <span className="text-sm font-medium text-white/45">XOF</span>
          </p>
          <svg viewBox="0 0 280 90" className="mt-3 h-[90px] w-full" aria-hidden="true">
            <defs>
              <linearGradient id="login-area" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2FD98A" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#2FD98A" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path
              d="M0 70 C20 66 32 52 55 56 S95 30 120 38 S165 58 190 30 S245 12 280 8 L280 90 L0 90 Z"
              fill="url(#login-area)"
              style={{ animation: 'card-in 1.2s ease-out 1.2s both' }}
            />
            <path
              d="M0 70 C20 66 32 52 55 56 S95 30 120 38 S165 58 190 30 S245 12 280 8"
              fill="none"
              stroke="#2FD98A"
              strokeWidth="2.5"
              strokeLinecap="round"
              pathLength={1}
              strokeDasharray={1}
              style={{ animation: 'line-draw 1.8s cubic-bezier(0.22, 1, 0.36, 1) 0.5s both' }}
            />
          </svg>
        </div>
      </Glass>

      <Glass className="top-40 right-0 w-[290px]" delay={400} tilt={2} floatSeconds={9}>
        <div className="divide-y divide-white/10">
          {debtors.map(([name, klass, amount], index) => (
            <div key={name} className="flex items-center justify-between gap-3 px-4 py-3" style={{ animation: `caption-in 0.6s ease-out ${900 + index * 180}ms both` }}>
              <div>
                <p className="text-xs font-medium text-white">{name}</p>
                <p className="text-[11px] text-white/50">
                  {klass} · <span className="font-tabular text-[#F98080]">{amount}</span>
                </p>
              </div>
              <span className="rounded-lg border border-[#2FD98A]/40 px-2.5 py-1 text-[11px] font-semibold text-[#2FD98A]">Encaisser</span>
            </div>
          ))}
        </div>
      </Glass>

      <Glass className="bottom-2 left-6 w-[170px]" delay={800} floatSeconds={6}>
        <div className="p-3.5">
          <p className="text-[11px] text-white/55">Taux de recouvrement</p>
          <p className="font-tabular text-2xl font-bold text-[#2FD98A]">64 %</p>
          <p className="text-[11px] text-white/55">31 familles en retard</p>
        </div>
      </Glass>
    </>
  );
}

function TeamScene() {
  const feed: [string, string, string, string][] = [
    ['FZ', 'Fatou Zinsou', 'A. Hounkpatin · 14:32', '+75 000'],
    ['RA', 'Rodrigue Ahouansou', 'A. Hounkpatin · 13:05', '+50 000'],
    ['ES', 'Estelle Sagbo', 'M. Dossou · 11:47', '+120 000'],
    ['GM', 'Grâce Mensah', 'M. Dossou · 09:12', '+45 000'],
  ];

  return (
    <>
      <Glass className="top-2 left-0 w-[300px]" delay={0} floatSeconds={8}>
        <div className="p-4">
          <p className="text-xs font-semibold text-white">Qui a encaissé</p>
          <ul className="mt-2 space-y-1">
            {feed.map(([initials, name, meta, amount], index) => (
              <li key={name} className="flex items-center gap-3 rounded-lg px-1 py-1.5" style={{ animation: `caption-in 0.6s ease-out ${500 + index * 160}ms both` }}>
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#2FD98A]/15 text-[11px] font-bold text-[#2FD98A]">{initials}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-medium text-white">{name}</span>
                  <span className="block truncate text-[11px] text-white/50">{meta}</span>
                </span>
                <span className="font-tabular text-xs font-semibold text-[#2FD98A]">{amount}</span>
              </li>
            ))}
          </ul>
        </div>
      </Glass>

      <Glass className="top-24 right-0 w-[240px]" delay={400} tilt={3} floatSeconds={9}>
        <div className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-white">Fiche de paie · mars</p>
            <span className="rounded-full bg-[#2FD98A]/15 px-2 py-0.5 text-[10px] font-semibold text-[#2FD98A]">Payée</span>
          </div>
          <div className="mt-3 space-y-2 text-[11px]">
            <div className="flex justify-between text-white/60">
              <span>37,5 h × 3 000</span>
              <span className="font-tabular text-white">112 500</span>
            </div>
            <div className="flex justify-between text-white/60">
              <span>Prime</span>
              <span className="font-tabular text-white">10 000</span>
            </div>
            <div className="flex justify-between border-t border-white/10 pt-2 text-white/80">
              <span className="font-semibold">Net à payer</span>
              <span className="font-tabular text-sm font-bold text-[#2FD98A]">122 500</span>
            </div>
          </div>
        </div>
      </Glass>

      <Glass className="bottom-2 left-10 w-[230px]" delay={800} floatSeconds={6}>
        <div className="flex items-center gap-3 p-3.5">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-white/10 text-white">
            <Lock className="h-4 w-4" />
          </span>
          <div>
            <p className="text-xs font-semibold text-white">Journal d'audit</p>
            <p className="text-[11px] text-white/55">Chaque opération est tracée</p>
          </div>
        </div>
      </Glass>
    </>
  );
}

const SCENES = [
  {
    kicker: 'Caisse',
    title: 'Encaissez en trois gestes.',
    text: "Recherchez l'élève, cochez les lignes, le reçu part en PDF. Les acomptes sont suivis ligne par ligne.",
    Scene: PaymentScene,
  },
  {
    kicker: 'Rentrée',
    title: "Toute votre rentrée, d'un coup d'œil.",
    text: "Qui revient, qui est bloqué par une dette, qui n'a pas répondu — et la réinscription en lot.",
    Scene: RentreeScene,
  },
  {
    kicker: 'Recouvrement',
    title: 'Sachez qui vous doit. Relancez.',
    text: "Un reste à payer fiable, identique partout, avec l'action Encaisser à côté de chaque famille.",
    Scene: RecoveryScene,
  },
  {
    kicker: 'Équipe',
    title: 'Chaque opération a son auteur.',
    text: "Journal des encaissements, paie des enseignants calculée à l'heure réellement travaillée.",
    Scene: TeamScene,
  },
];

/**
 * Fond animé de l'écran de connexion : des scènes du produit (dessinées en
 * code, sans photo) qui défilent sur un fond d'aurore et d'étoiles. Chaque
 * scène rejoue ses animations d'entrée à son tour.
 */
export function LoginShowcase() {
  const [active, setActive] = useState(0);
  const [leaving, setLeaving] = useState<number | null>(null);

  function goTo(next: number) {
    if (next === active) return;
    setLeaving(active);
    setActive(next);
  }

  useEffect(() => {
    const timer = setTimeout(() => goTo((active + 1) % SCENES.length), SCENE_MS);
    return () => clearTimeout(timer);
    // goTo ne dépend que de "active", déjà surveillé.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  useEffect(() => {
    if (leaving === null) return;
    const timer = setTimeout(() => setLeaving(null), 700);
    return () => clearTimeout(timer);
  }, [leaving]);

  const current = SCENES[active];

  return (
    <div className="absolute inset-0 overflow-hidden bg-[#070A10]">
      {/* Aurore : trois halos qui dérivent lentement */}
      <div aria-hidden="true" className="absolute -top-1/4 -left-1/6 h-[70%] w-[55%] rounded-full bg-[#2FD98A]/25 blur-[120px]" style={{ animation: 'aurora-a 22s ease-in-out infinite alternate' }} />
      <div aria-hidden="true" className="absolute top-1/3 -right-1/6 h-[65%] w-[50%] rounded-full bg-[#1E6BFF]/20 blur-[130px]" style={{ animation: 'aurora-b 26s ease-in-out infinite alternate' }} />
      <div aria-hidden="true" className="absolute -bottom-1/3 left-1/4 h-[60%] w-[45%] rounded-full bg-[#14B8A6]/20 blur-[120px]" style={{ animation: 'aurora-c 30s ease-in-out infinite alternate' }} />

      {/* Quadrillage discret, fondu vers les bords */}
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage: 'linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)',
          backgroundSize: '56px 56px',
          maskImage: 'radial-gradient(ellipse at 35% 50%, black 20%, transparent 70%)',
          WebkitMaskImage: 'radial-gradient(ellipse at 35% 50%, black 20%, transparent 70%)',
        }}
      />

      <StarField density={70} />

      {/* Scène : visible dès le format ordinateur */}
      <div className="absolute inset-y-0 left-0 hidden w-[58%] items-center justify-center pb-[24vh] lg:flex">
        <div className="relative h-[470px] w-[560px] max-w-full scale-[0.86] xl:scale-100 2xl:scale-110" aria-hidden="true">
          {leaving !== null && (
            <div key={`out-${leaving}`} className="absolute inset-0" style={{ animation: 'scene-out 0.6s ease-in forwards' }}>
              {(() => {
                const Leaving = SCENES[leaving].Scene;
                return <Leaving />;
              })()}
            </div>
          )}
          <div key={`in-${active}`} className="absolute inset-0">
            <current.Scene />
          </div>
        </div>
      </div>

      {/* Légende de la scène */}
      <div className="absolute bottom-10 left-10 hidden max-w-md lg:block xl:left-14">
        <div key={active} style={{ animation: 'caption-in 0.7s ease-out 0.15s both' }}>
          <p className="text-xs font-semibold tracking-[0.18em] text-[#2FD98A] uppercase">{current.kicker}</p>
          <h2 className="mt-2 font-display text-3xl leading-tight font-bold tracking-tight text-white xl:text-4xl">{current.title}</h2>
          <p className="mt-3 text-sm leading-relaxed text-white/60">{current.text}</p>
        </div>

        <div className="mt-6 flex items-center gap-2">
          {SCENES.map((scene, index) => (
            <button
              key={scene.kicker}
              type="button"
              onClick={() => goTo(index)}
              aria-label={`Scène ${index + 1} : ${scene.kicker}`}
              aria-current={index === active}
              className="relative h-1.5 overflow-hidden rounded-full bg-white/20 transition-all"
              style={{ width: index === active ? 44 : 10 }}
            >
              {index === active && (
                <span
                  key={active}
                  className="absolute inset-0 origin-left rounded-full bg-white"
                  style={{ animation: `progress-fill ${SCENE_MS}ms linear both` }}
                />
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
