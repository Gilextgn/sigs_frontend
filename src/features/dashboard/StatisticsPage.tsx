import { useState } from 'react';
import { Activity, ArrowDownRight, ArrowUpRight, BarChart3 } from 'lucide-react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useDashboardStatistics } from './useDashboardData';

const currency = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });

export default function StatisticsPage() {
  const [days, setDays] = useState(30);
  const { data, isLoading, isError } = useDashboardStatistics(days);
  const change = data?.comparison.change_percent ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-medium tracking-wide text-primary uppercase">Pilotage</p>
          <h2 className="mt-1 font-display text-2xl font-semibold text-ink">Statistiques et évolution</h2>
          <p className="mt-1 text-sm text-ink-soft">Suivez les encaissements et leur progression dans le temps.</p>
        </div>
        <select value={days} onChange={(event) => setDays(Number(event.target.value))} className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink">
          <option value={7}>7 derniers jours</option>
          <option value={30}>30 derniers jours</option>
          <option value={90}>90 derniers jours</option>
          <option value={365}>12 derniers mois</option>
        </select>
      </div>

      {isError && <p className="rounded-lg border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger">Impossible de charger les statistiques.</p>}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <article className="rounded-xl border border-border bg-surface p-5">
          <div className="flex items-center gap-2 text-sm text-ink-soft"><BarChart3 className="h-4 w-4 text-primary" /> Encaissements</div>
          <p className="font-tabular mt-3 text-2xl font-semibold text-ink">{isLoading ? '—' : `${currency.format(data?.period_total ?? 0)} XOF`}</p>
          <p className={`mt-2 flex items-center gap-1 text-xs font-medium ${change >= 0 ? 'text-success' : 'text-danger'}`}>
            {change >= 0 ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
            {Math.abs(change)}% par rapport à la période précédente
          </p>
        </article>
        <article className="rounded-xl border border-border bg-surface p-5">
          <div className="flex items-center gap-2 text-sm text-ink-soft"><Activity className="h-4 w-4 text-success" /> Paiements</div>
          <p className="font-tabular mt-3 text-2xl font-semibold text-ink">{isLoading ? '—' : data?.period_payment_count ?? 0}</p>
          <p className="mt-2 text-xs text-ink-soft">Transactions enregistrées sur la période</p>
        </article>
        <article className="rounded-xl border border-border bg-surface p-5">
          <div className="text-sm text-ink-soft">Moyenne quotidienne</div>
          <p className="font-tabular mt-3 text-2xl font-semibold text-ink">{isLoading ? '—' : `${currency.format(data?.daily_average ?? 0)} XOF`}</p>
          <p className="mt-2 text-xs text-ink-soft">Montant moyen encaissé par jour</p>
        </article>
      </div>

      <article className="rounded-xl border border-border bg-surface p-5">
        <h3 className="font-display text-base font-semibold text-ink">Évolution des encaissements</h3>
        <div className="mt-4 h-80">
          {isLoading ? <div className="grid h-full place-items-center text-sm text-ink-soft">Chargement...</div> : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data?.daily ?? []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs><linearGradient id="collection" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#2F8F6F" stopOpacity={0.32} /><stop offset="95%" stopColor="#2F8F6F" stopOpacity={0.02} /></linearGradient></defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E4E7EF" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(value) => value.slice(5)} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(value) => `${Math.round(value / 1000)}k`} />
                <Tooltip formatter={(value) => [`${currency.format(Number(value))} XOF`, 'Encaissé']} />
                <Area type="monotone" dataKey="amount" stroke="#2F8F6F" fill="url(#collection)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </article>
    </div>
  );
}
