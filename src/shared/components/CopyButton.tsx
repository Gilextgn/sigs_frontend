import { useState } from 'react';
import { Check, Copy } from 'lucide-react';

/** Copie un texte dans le presse-papiers et confirme le geste pendant 2 s. */
export function CopyButton({ text, label = 'Copier', className = '' }: { text: string; label?: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Contexte non sécurisé ou permission refusée : repli sur une sélection temporaire.
      const area = document.createElement('textarea');
      area.value = text;
      document.body.appendChild(area);
      area.select();
      document.execCommand('copy');
      area.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={`inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium transition hover:bg-paper ${
        copied ? 'text-success' : 'text-ink'
      } ${className}`}
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? 'Copié' : label}
    </button>
  );
}
