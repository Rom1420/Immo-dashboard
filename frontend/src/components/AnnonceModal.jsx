import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { X, ExternalLink, ChevronLeft, ChevronRight } from 'lucide-react'
import { api } from '../api'
import { StatutSelector } from './StatutBadge'
import { StarRating } from './StarRating'

function PhotoCarousel({ photos }) {
  const [idx, setIdx] = useState(0)
  if (!photos?.length) {
    return (
      <div className="h-48 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 text-sm">
        Pas de photo
      </div>
    )
  }
  return (
    <div className="relative h-56 rounded-lg overflow-hidden bg-gray-100">
      <img src={photos[idx]} alt="" className="w-full h-full object-cover" />
      {photos.length > 1 && (
        <>
          <button
            onClick={() => setIdx((i) => (i - 1 + photos.length) % photos.length)}
            className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/40 text-white rounded-full p-1 hover:bg-black/60"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={() => setIdx((i) => (i + 1) % photos.length)}
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/40 text-white rounded-full p-1 hover:bg-black/60"
          >
            <ChevronRight size={18} />
          </button>
          <span className="absolute bottom-2 right-2 bg-black/50 text-white text-xs px-2 py-0.5 rounded-full">
            {idx + 1}/{photos.length}
          </span>
        </>
      )}
    </div>
  )
}

export function AnnonceModal({ id, onClose }) {
  const qc = useQueryClient()
  const { data: annonce, isLoading } = useQuery({
    queryKey: ['annonce', id],
    queryFn: () => api.getAnnonce(id),
  })

  const { mutate: setStatut } = useMutation({
    mutationFn: (statut) => api.updateStatut(id, statut),
    onSuccess: () => {
      qc.invalidateQueries(['annonce', id])
      qc.invalidateQueries(['annonces'])
    },
  })

  const { mutate: saveNote } = useMutation({
    mutationFn: (data) => api.updateNote(id, data),
    onSuccess: () => {
      qc.invalidateQueries(['annonce', id])
      qc.invalidateQueries(['annonces'])
    },
  })

  const [noteText, setNoteText] = useState(null)

  const photos = annonce?.photos ? JSON.parse(annonce.photos) : []

  const fmt = (n) => n?.toLocaleString('fr-FR') ?? '—'

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 overflow-y-auto"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-8">
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-gray-100">
          <div>
            <span className="text-xs font-medium text-indigo-600 uppercase tracking-wide">
              {annonce?.source}
            </span>
            <h2 className="text-lg font-semibold text-gray-900 mt-0.5">
              {isLoading ? '…' : annonce?.titre}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700"
          >
            <X size={20} />
          </button>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-gray-400">Chargement…</div>
        ) : (
          <div className="p-5 space-y-5">
            <PhotoCarousel photos={photos} />

            {/* Prix + surface */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <div className="text-xl font-bold text-gray-900">{fmt(annonce?.prix)} €</div>
                <div className="text-xs text-gray-500">Prix</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <div className="text-xl font-bold text-gray-900">{fmt(annonce?.surface)} m²</div>
                <div className="text-xs text-gray-500">Surface</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <div className="text-xl font-bold text-gray-900">{fmt(annonce?.prix_m2)} €/m²</div>
                <div className="text-xs text-gray-500">Prix/m²</div>
              </div>
            </div>

            {/* Infos */}
            <div className="grid grid-cols-2 gap-2 text-sm">
              {annonce?.arrondissement && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Arrondissement</span>
                  <span className="font-medium">{annonce.arrondissement}</span>
                </div>
              )}
              {annonce?.nb_pieces && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Pièces</span>
                  <span className="font-medium">{annonce.nb_pieces}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-500">Reçu le</span>
                <span className="font-medium">
                  {new Date(annonce?.date_reception_mail).toLocaleDateString('fr-FR')}
                </span>
              </div>
            </div>

            {/* Description */}
            {annonce?.description && (
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                  Description
                </p>
                <p className="text-sm text-gray-700 leading-relaxed line-clamp-4">
                  {annonce.description}
                </p>
              </div>
            )}

            {/* Statut */}
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                Statut
              </p>
              <StatutSelector current={annonce?.statut} onChange={setStatut} />
            </div>

            {/* Note */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Note</p>
                <StarRating
                  score={annonce?.note_score}
                  onChange={(score) => saveNote({ note_score: score })}
                />
              </div>
              <textarea
                defaultValue={annonce?.note ?? ''}
                onChange={(e) => setNoteText(e.target.value)}
                onBlur={(e) => saveNote({ note: e.target.value })}
                placeholder="Ajouter un commentaire…"
                rows={3}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
            </div>

            {/* Lien */}
            <a
              href={annonce?.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
            >
              <ExternalLink size={15} />
              Voir l'annonce originale
            </a>
          </div>
        )}
      </div>
    </div>
  )
}
