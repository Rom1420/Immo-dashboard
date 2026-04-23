import { useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Home, Map, BarChart2 } from 'lucide-react'
import { SyncStatus } from './components/SyncStatus'
import { VueListe } from './pages/VueListe'
import { VueCarte } from './pages/VueCarte'
import { VueStats } from './pages/VueStats'
import 'leaflet/dist/leaflet.css'

const qc = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
})

const TABS = [
  { id: 'liste', label: 'Annonces', icon: Home },
  { id: 'carte', label: 'Carte', icon: Map },
  { id: 'stats', label: 'Stats', icon: BarChart2 },
]

function AppInner() {
  const [tab, setTab] = useState('liste')

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-xl">🏠</span>
            <span className="font-semibold text-gray-900 text-sm">Immo Dashboard</span>
          </div>

          {/* Nav tabs */}
          <nav className="flex items-center gap-1">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  tab === id
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <Icon size={15} />
                {label}
              </button>
            ))}
          </nav>

          <SyncStatus />
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {tab === 'liste' && <VueListe />}
        {tab === 'carte' && <VueCarte />}
        {tab === 'stats' && <VueStats />}
      </main>
    </div>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={qc}>
      <AppInner />
    </QueryClientProvider>
  )
}
