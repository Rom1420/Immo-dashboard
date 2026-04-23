const STATUTS = {
  nouveau: { label: 'Nouveau', color: 'bg-blue-100 text-blue-800' },
  vu: { label: 'Vu', color: 'bg-gray-100 text-gray-700' },
  intéressant: { label: 'Intéressant', color: 'bg-green-100 text-green-800' },
  contacté: { label: 'Contacté', color: 'bg-purple-100 text-purple-800' },
  écarté: { label: 'Écarté', color: 'bg-red-100 text-red-700' },
}

export function StatutBadge({ statut, onClick, size = 'sm' }) {
  const cfg = STATUTS[statut] ?? { label: statut, color: 'bg-gray-100 text-gray-700' }
  const padding = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'
  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ${padding} ${cfg.color} ${onClick ? 'cursor-pointer hover:opacity-80' : ''}`}
      onClick={onClick}
    >
      {cfg.label}
    </span>
  )
}

export function StatutSelector({ current, onChange }) {
  return (
    <div className="flex flex-wrap gap-2">
      {Object.entries(STATUTS).map(([key, { label, color }]) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          className={`px-3 py-1 rounded-full text-sm font-medium border-2 transition-all ${
            current === key
              ? `${color} border-current`
              : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
