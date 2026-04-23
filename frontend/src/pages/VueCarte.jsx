import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import { api } from '../api'
import { StatutBadge } from '../components/StatutBadge'
import { AnnonceModal } from '../components/AnnonceModal'

// Fix leaflet default icon
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({ iconUrl: markerIcon, iconRetinaUrl: markerIcon2x, shadowUrl: markerShadow })

const STATUT_COLORS = {
  nouveau: '#3b82f6',
  vu: '#6b7280',
  intéressant: '#22c55e',
  contacté: '#a855f7',
  écarté: '#ef4444',
}

function createColoredIcon(color) {
  return L.divIcon({
    html: `<div style="width:12px;height:12px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,.4)"></div>`,
    className: '',
    iconSize: [12, 12],
    iconAnchor: [6, 6],
  })
}

// Coordonnées approximatives par arrondissement parisien
const ARRDT_COORDS = {
  '75001': [48.8606, 2.3477], '75002': [48.8671, 2.3477], '75003': [48.8636, 2.3610],
  '75004': [48.8552, 2.3523], '75005': [48.8462, 2.3500], '75006': [48.8496, 2.3343],
  '75007': [48.8566, 2.3199], '75008': [48.8752, 2.3087], '75009': [48.8798, 2.3373],
  '75010': [48.8757, 2.3622], '75011': [48.8591, 2.3793], '75012': [48.8403, 2.3907],
  '75013': [48.8293, 2.3619], '75014': [48.8319, 2.3260], '75015': [48.8416, 2.2974],
  '75016': [48.8635, 2.2651], '75017': [48.8869, 2.3120], '75018': [48.8927, 2.3446],
  '75019': [48.8844, 2.3826], '75020': [48.8656, 2.4000],
}

export function VueCarte() {
  const [selectedId, setSelectedId] = useState(null)
  const { data: annonces = [], isLoading } = useQuery({
    queryKey: ['annonces', {}],
    queryFn: () => api.getAnnonces({}),
  })

  // Only annonces with known arrondissement
  const mappable = annonces.filter((a) => a.arrondissement && ARRDT_COORDS[a.arrondissement])

  const fmt = (n) => n?.toLocaleString('fr-FR') ?? '—'

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-3">
        <div className="flex items-center gap-4 flex-wrap">
          <span className="text-sm text-gray-500">
            {mappable.length} annonce{mappable.length !== 1 ? 's' : ''} localisées
          </span>
          <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
            {Object.entries(STATUT_COLORS).map(([s, c]) => (
              <span key={s} className="flex items-center gap-1">
                <span
                  style={{ background: c }}
                  className="w-3 h-3 rounded-full border border-white shadow-sm inline-block"
                />
                {s}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="h-[calc(100vh-220px)] rounded-xl overflow-hidden border border-gray-200 shadow-sm">
        {isLoading ? (
          <div className="h-full flex items-center justify-center bg-gray-50 text-gray-400 text-sm">
            Chargement de la carte…
          </div>
        ) : (
          <MapContainer
            center={[48.8566, 2.3522]}
            zoom={13}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {mappable.map((a) => {
              const coords = ARRDT_COORDS[a.arrondissement]
              // Slight jitter so pins don't stack perfectly
              const lat = coords[0] + (Math.random() - 0.5) * 0.004
              const lng = coords[1] + (Math.random() - 0.5) * 0.004
              const color = STATUT_COLORS[a.statut] ?? '#6b7280'
              return (
                <Marker
                  key={a.id}
                  position={[lat, lng]}
                  icon={createColoredIcon(color)}
                  eventHandlers={{ click: () => setSelectedId(a.id) }}
                >
                  <Popup>
                    <div className="text-sm min-w-[160px]">
                      <p className="font-semibold text-gray-900 mb-1 leading-tight">{a.titre}</p>
                      <p className="text-gray-700">{fmt(a.prix)} € · {fmt(a.surface)} m²</p>
                      {a.prix_m2 && <p className="text-gray-400 text-xs">{fmt(a.prix_m2)} €/m²</p>}
                      <button
                        onClick={() => setSelectedId(a.id)}
                        className="mt-2 text-xs text-indigo-600 hover:underline block"
                      >
                        Voir le détail →
                      </button>
                    </div>
                  </Popup>
                </Marker>
              )
            })}
          </MapContainer>
        )}
      </div>

      {selectedId && <AnnonceModal id={selectedId} onClose={() => setSelectedId(null)} />}
    </div>
  )
}
