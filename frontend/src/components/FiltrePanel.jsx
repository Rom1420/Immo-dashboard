import { useState } from 'react'
import { SlidersHorizontal, X } from 'lucide-react'
import { LOCATION_LABELS } from '../api'

const SOURCES = ['pap', 'seloger', 'leboncoin', 'bienici', 'logic-immo']
const STATUTS = ['nouveau', 'vu', 'intéressant', 'contacté', 'écarté']

function Field({ label, children }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</label>
      {children}
    </div>
  )
}

function RangeInput({ value, onChange, placeholder, min, max }) {
  return (
    <input
      type="number"
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
      placeholder={placeholder}
      min={min}
      max={max}
      className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
    />
  )
}

export function FiltrePanel({ filters, onChange }) {
  const [open, setOpen] = useState(true)

  const set = (key, val) => onChange({ ...filters, [key]: val })

  const hasActive = Object.values(filters).some((v) => v != null && v !== '')

  return (
    <aside className="w-64 shrink-0">
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <button
          onClick={() => setOpen((o) => !o)}
          className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-gray-700"
        >
          <span className="flex items-center gap-2">
            <SlidersHorizontal size={16} />
            Filtres
            {hasActive && (
              <span className="bg-indigo-600 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                {Object.values(filters).filter((v) => v != null && v !== '').length}
              </span>
            )}
          </span>
          <span className="text-gray-400">{open ? '▲' : '▼'}</span>
        </button>

        {open && (
          <div className="px-4 pb-4 space-y-4 border-t border-gray-100 pt-3">
            <Field label="Prix (€)">
              <div className="flex gap-2">
                <RangeInput
                  value={filters.prix_min}
                  onChange={(v) => set('prix_min', v)}
                  placeholder="Min"
                />
                <RangeInput
                  value={filters.prix_max}
                  onChange={(v) => set('prix_max', v)}
                  placeholder="Max"
                />
              </div>
            </Field>

            <Field label="Surface min (m²)">
              <RangeInput
                value={filters.surface_min}
                onChange={(v) => set('surface_min', v)}
                placeholder="ex: 30"
              />
            </Field>

            <Field label="Source">
              <select
                value={filters.source ?? ''}
                onChange={(e) => set('source', e.target.value || null)}
                className="border border-gray-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              >
                <option value="">Toutes</option>
                {SOURCES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </Field>

            <Field label="Statut">
              <select
                value={filters.statut ?? ''}
                onChange={(e) => set('statut', e.target.value || null)}
                className="border border-gray-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              >
                <option value="">Tous</option>
                {STATUTS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </Field>

            <Field label="Arrondissement">
              <select
                value={filters.arrondissement ?? ''}
                onChange={(e) => set('arrondissement', e.target.value || null)}
                className="border border-gray-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              >
                <option value="">Tous</option>
                {Object.entries(LOCATION_LABELS).map(([code, label]) => (
                  <option key={code} value={code}>{label}</option>
                ))}
              </select>
            </Field>

            {hasActive && (
              <button
                onClick={() => onChange({})}
                className="w-full flex items-center justify-center gap-1.5 text-xs text-gray-500 hover:text-red-500 pt-1"
              >
                <X size={12} /> Réinitialiser
              </button>
            )}
          </div>
        )}
      </div>
    </aside>
  )
}
