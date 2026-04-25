import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowUpDown, Home } from 'lucide-react'
import { api, LOCATION_LABELS } from '../api'
import { FiltrePanel } from '../components/FiltrePanel'
import { StatutBadge } from '../components/StatutBadge'
import { StarRating } from '../components/StarRating'
import { AnnonceModal } from '../components/AnnonceModal'

const SOURCE_COLORS = {
  pap: 'bg-orange-100 text-orange-700',
  seloger: 'bg-blue-100 text-blue-700',
  leboncoin: 'bg-yellow-100 text-yellow-800',
  bienici: 'bg-teal-100 text-teal-700',
  'logic-immo': 'bg-pink-100 text-pink-700',
}

function SortButton({ field, current, onSort }) {
  const active = current?.field === field
  return (
    <button
      onClick={() => onSort(field)}
      className={`inline-flex items-center gap-0.5 ${active ? 'text-indigo-600' : 'text-gray-400 hover:text-gray-700'}`}
    >
      <ArrowUpDown size={12} />
    </button>
  )
}

function AnnonceRow({ annonce, onOpen }) {
  const qc = useQueryClient()
  const { mutate: setStatut } = useMutation({
    mutationFn: (statut) => api.updateStatut(annonce.id, statut),
    onSuccess: () => qc.invalidateQueries(['annonces']),
  })

  const photos = annonce.photos ? JSON.parse(annonce.photos) : []
  const fmt = (n) => n?.toLocaleString('fr-FR') ?? '—'
  const srcColor = SOURCE_COLORS[annonce.source] ?? 'bg-gray-100 text-gray-600'

  return (
    <tr
      className="border-b border-gray-100 hover:bg-indigo-50/40 cursor-pointer transition-colors"
      onClick={() => onOpen(annonce.id)}
    >
      {/* Miniature */}
      <td className="p-3 w-16">
        {photos[0] ? (
          <img
            src={photos[0]}
            alt=""
            className="w-12 h-10 object-cover rounded-md"
            onError={(e) => { e.target.style.display = 'none' }}
          />
        ) : (
          <div className="w-12 h-10 bg-gray-100 rounded-md flex items-center justify-center">
            <Home size={14} className="text-gray-300" />
          </div>
        )}
      </td>

      {/* Titre + source */}
      <td className="p-3">
        <div className="flex items-start gap-2">
          <span className={`shrink-0 text-xs px-1.5 py-0.5 rounded font-medium ${srcColor}`}>
            {annonce.source}
          </span>
          <span className="text-sm font-medium text-gray-800 line-clamp-2 leading-snug">
            {annonce.titre}
          </span>
        </div>
        {annonce.arrondissement && (
          <span className="text-xs text-gray-400 mt-0.5 block">
            {LOCATION_LABELS[annonce.arrondissement] ?? annonce.arrondissement}
          </span>
        )}
      </td>

      {/* Prix */}
      <td className="p-3 text-right whitespace-nowrap">
        <div className="text-sm font-semibold text-gray-900">{fmt(annonce.prix)} €</div>
        {annonce.prix_m2 && (
          <div className="text-xs text-gray-400">{fmt(annonce.prix_m2)} €/m²</div>
        )}
      </td>

      {/* Surface */}
      <td className="p-3 text-right whitespace-nowrap text-sm text-gray-700">
        {fmt(annonce.surface)} m²
      </td>

      {/* Pièces */}
      <td className="p-3 text-center text-sm text-gray-700">
        {annonce.nb_pieces ?? '—'}
      </td>

      {/* Statut */}
      <td className="p-3" onClick={(e) => e.stopPropagation()}>
        <select
          value={annonce.statut}
          onChange={(e) => setStatut(e.target.value)}
          className="text-xs border border-gray-200 rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-300"
          onClick={(e) => e.stopPropagation()}
        >
          {['nouveau', 'vu', 'intéressant', 'contacté', 'écarté'].map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </td>

      {/* Score */}
      <td className="p-3" onClick={(e) => e.stopPropagation()}>
        <StarRating score={annonce.note_score} readonly />
      </td>

      {/* Date */}
      <td className="p-3 whitespace-nowrap text-xs text-gray-400">
        {new Date(annonce.date_reception_mail).toLocaleDateString('fr-FR')}
      </td>
    </tr>
  )
}

export function VueListe() {
  const [filters, setFilters] = useState({})
  const [sort, setSort] = useState({ field: 'date_reception_mail', asc: false })
  const [selectedId, setSelectedId] = useState(null)

  const { data: annonces = [], isLoading } = useQuery({
    queryKey: ['annonces', filters],
    queryFn: () => api.getAnnonces(filters),
  })

  const handleSort = (field) => {
    setSort((s) => ({ field, asc: s.field === field ? !s.asc : false }))
  }

  const sorted = [...annonces].sort((a, b) => {
    const av = a[sort.field] ?? 0
    const bv = b[sort.field] ?? 0
    if (av < bv) return sort.asc ? -1 : 1
    if (av > bv) return sort.asc ? 1 : -1
    return 0
  })

  return (
    <div className="flex gap-6">
      <FiltrePanel filters={filters} onChange={setFilters} />

      <div className="flex-1 min-w-0">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {/* Toolbar */}
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <span className="text-sm text-gray-500">
              {isLoading ? '…' : `${annonces.length} annonce${annonces.length !== 1 ? 's' : ''}`}
            </span>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  <th className="p-3 w-16"></th>
                  <th className="p-3">Annonce</th>
                  <th className="p-3 text-right">
                    Prix <SortButton field="prix" current={sort} onSort={handleSort} />
                  </th>
                  <th className="p-3 text-right">
                    Surface <SortButton field="surface" current={sort} onSort={handleSort} />
                  </th>
                  <th className="p-3 text-center">P.</th>
                  <th className="p-3">Statut</th>
                  <th className="p-3">Note</th>
                  <th className="p-3">
                    Date <SortButton field="date_reception_mail" current={sort} onSort={handleSort} />
                  </th>
                </tr>
              </thead>
              <tbody>
                {isLoading && (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-gray-400 text-sm">
                      Chargement…
                    </td>
                  </tr>
                )}
                {!isLoading && sorted.length === 0 && (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-gray-400 text-sm">
                      Aucune annonce — synchronisez vos mails ou ajustez les filtres.
                    </td>
                  </tr>
                )}
                {sorted.map((a) => (
                  <AnnonceRow key={a.id} annonce={a} onOpen={setSelectedId} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {selectedId && (
        <AnnonceModal id={selectedId} onClose={() => setSelectedId(null)} />
      )}
    </div>
  )
}
