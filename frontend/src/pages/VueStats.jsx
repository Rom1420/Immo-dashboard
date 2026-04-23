import { useQuery } from '@tanstack/react-query'
import { api } from '../api'

const STATUT_COLORS = {
  nouveau: '#3b82f6',
  vu: '#6b7280',
  intéressant: '#22c55e',
  contacté: '#a855f7',
  écarté: '#ef4444',
}

const SOURCE_COLORS = {
  pap: '#f97316',
  seloger: '#3b82f6',
  leboncoin: '#eab308',
  bienici: '#14b8a6',
  'logic-immo': '#ec4899',
}

function StatCard({ label, value, sub }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      <div className="text-sm font-medium text-gray-700 mt-0.5">{label}</div>
      {sub && <div className="text-xs text-gray-400 mt-0.5">{sub}</div>}
    </div>
  )
}

function BarChart({ data, colors, title }) {
  const total = Object.values(data).reduce((s, v) => s + v, 0)
  if (total === 0) return null
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">{title}</h3>
      <div className="space-y-2">
        {Object.entries(data)
          .sort(([, a], [, b]) => b - a)
          .map(([key, count]) => {
            const pct = Math.round((count / total) * 100)
            const color = colors[key] ?? '#9ca3af'
            return (
              <div key={key}>
                <div className="flex justify-between text-xs text-gray-600 mb-0.5">
                  <span className="capitalize">{key}</span>
                  <span className="font-medium">{count} ({pct}%)</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${pct}%`, background: color }}
                  />
                </div>
              </div>
            )
          })}
      </div>
    </div>
  )
}

export function VueStats() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['stats'],
    queryFn: api.getStats,
  })

  const fmt = (n) => n?.toLocaleString('fr-FR') ?? '—'

  if (isLoading) {
    return <div className="text-center text-gray-400 py-16">Chargement…</div>
  }

  return (
    <div className="space-y-6">
      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          label="Annonces totales"
          value={stats?.total ?? 0}
        />
        <StatCard
          label="Prix médian"
          value={stats?.prix_median ? `${fmt(stats.prix_median)} €` : '—'}
        />
        <StatCard
          label="Prix/m² médian"
          value={stats?.prix_m2_median ? `${fmt(Math.round(stats.prix_m2_median))} €` : '—'}
          sub="par m²"
        />
        <StatCard
          label="Intéressantes"
          value={stats?.by_statut?.['intéressant'] ?? 0}
          sub="à recontacter"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <BarChart
          data={stats?.by_statut ?? {}}
          colors={STATUT_COLORS}
          title="Répartition par statut"
        />
        <BarChart
          data={stats?.by_source ?? {}}
          colors={SOURCE_COLORS}
          title="Répartition par source"
        />
      </div>

      {Object.keys(stats?.by_statut ?? {}).length === 0 && (
        <div className="text-center text-gray-400 py-8 text-sm">
          Aucune donnée — synchronisez vos mails pour commencer.
        </div>
      )}
    </div>
  )
}
