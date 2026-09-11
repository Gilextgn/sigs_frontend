import { useId, useState } from 'react';
import { Eye, EyeOff, type LucideIcon } from 'lucide-react';

interface PasswordFieldProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  autoComplete?: string;
  minLength?: number;
  leftIcon?: LucideIcon;
  showStrength?: boolean;
}

interface Strength {
  score: number;
  label: string;
  tone: 'danger' | 'gold' | 'success';
}

function evaluateStrength(password: string): Strength {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 2) return { score, label: 'Faible', tone: 'danger' };
  if (score <= 3) return { score, label: 'Moyen', tone: 'gold' };
  return { score, label: 'Fort', tone: 'success' };
}

const TONE_BAR: Record<Strength['tone'], string> = {
  danger: 'bg-danger',
  gold: 'bg-gold',
  success: 'bg-success',
};

const TONE_TEXT: Record<Strength['tone'], string> = {
  danger: 'text-danger',
  gold: 'text-gold',
  success: 'text-success',
};

/**
 * Champ mot de passe avec bouton œil (afficher/masquer) et, en option, une
 * barre de force purement indicative côté client (aucune dépendance
 * externe). La force n'est jamais bloquante à la soumission — seul le
 * `min:8` déjà appliqué côté backend l'est.
 */
export function PasswordField({
  id,
  value,
  onChange,
  placeholder,
  required,
  autoComplete,
  minLength,
  leftIcon: LeftIcon,
  showStrength,
}: PasswordFieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const [visible, setVisible] = useState(false);
  const strength = showStrength && value ? evaluateStrength(value) : null;

  return (
    <div>
      <div className="relative">
        {LeftIcon && (
          <LeftIcon className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-ink-soft" />
        )}
        <input
          id={inputId}
          type={visible ? 'text' : 'password'}
          required={required}
          autoComplete={autoComplete}
          minLength={minLength}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`w-full rounded-lg border border-border bg-paper py-2 ${LeftIcon ? 'pl-10' : 'pl-3'} pr-10 text-sm text-ink outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20`}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          tabIndex={-1}
          aria-label={visible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
          className="absolute top-1/2 right-2.5 -translate-y-1/2 rounded p-1 text-ink-soft transition hover:text-ink"
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>

      {strength && (
        <div className="mt-1.5">
          <div className="flex gap-1">
            {[0, 1, 2, 3, 4].map((i) => (
              <span
                key={i}
                className={`h-1 flex-1 rounded-full transition-colors ${i < strength.score ? TONE_BAR[strength.tone] : 'bg-border'}`}
              />
            ))}
          </div>
          <p className={`mt-1 text-xs ${TONE_TEXT[strength.tone]}`}>
            Force du mot de passe : {strength.label}
            {strength.tone !== 'success' && ' — mélangez majuscules, chiffres et symboles pour le renforcer.'}
          </p>
        </div>
      )}
    </div>
  );
}
