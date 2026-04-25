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

// Coordonnées approximatives par arrondissement / commune
const ARRDT_COORDS = {
  // Paris intra-muros
  '75001': [48.8606, 2.3477], '75002': [48.8671, 2.3477], '75003': [48.8636, 2.3610],
  '75004': [48.8552, 2.3523], '75005': [48.8462, 2.3500], '75006': [48.8496, 2.3343],
  '75007': [48.8566, 2.3199], '75008': [48.8752, 2.3087], '75009': [48.8798, 2.3373],
  '75010': [48.8757, 2.3622], '75011': [48.8591, 2.3793], '75012': [48.8403, 2.3907],
  '75013': [48.8293, 2.3619], '75014': [48.8319, 2.3260], '75015': [48.8416, 2.2974],
  '75016': [48.8635, 2.2651], '75017': [48.8869, 2.3120], '75018': [48.8927, 2.3446],
  '75019': [48.8844, 2.3826], '75020': [48.8656, 2.4000],
  // 92 - Hauts-de-Seine
  '92000': [48.8912, 2.2057], '92100': [48.8352, 2.2407], '92110': [48.9054, 2.3085],
  '92120': [48.8173, 2.3201], '92130': [48.8234, 2.2706], '92140': [48.8004, 2.2626],
  '92170': [48.8218, 2.2946], '92190': [48.8122, 2.2316], '92200': [48.8848, 2.2685],
  '92210': [48.8449, 2.2125], '92240': [48.8179, 2.3041], '92300': [48.8944, 2.2872],
  '92310': [48.8214, 2.2282], '92400': [48.8980, 2.2568], '92500': [48.8791, 2.1834],
  '92600': [48.9174, 2.2878], '92700': [48.9225, 2.2563], '92800': [48.8844, 2.2374],
  // 93 - Seine-Saint-Denis
  '93100': [48.8610, 2.4431], '93170': [48.8650, 2.4162],
  '93400': [48.9110, 2.3301], '93500': [48.8979, 2.4007],
  // 94 - Val-de-Marne
  '94110': [48.8042, 2.3369], '94120': [48.8529, 2.4823], '94130': [48.8358, 2.4825],
  '94160': [48.8437, 2.4199], '94200': [48.8143, 2.3835], '94220': [48.8237, 2.4094],
  '94230': [48.7970, 2.3299], '94250': [48.8134, 2.3438], '94270': [48.8124, 2.3541],
  '94300': [48.8471, 2.4372], '94340': [48.8203, 2.4399], '94700': [48.8037, 2.4374],
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
