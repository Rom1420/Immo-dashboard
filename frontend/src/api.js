const BASE = '/api'

async function req(path, options = {}) {
  const res = await fetch(BASE + path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
  return res.json()
}

export const api = {
  getAnnonces: (filters = {}) => {
    const params = new URLSearchParams()
    Object.entries(filters).forEach(([k, v]) => v != null && v !== '' && params.set(k, v))
    const qs = params.toString()
    return req(`/annonces${qs ? '?' + qs : ''}`)
  },
  getAnnonce: (id) => req(`/annonces/${id}`),
  updateStatut: (id, statut) =>
    req(`/annonces/${id}/statut`, { method: 'PUT', body: JSON.stringify({ statut }) }),
  updateNote: (id, data) =>
    req(`/annonces/${id}/note`, { method: 'PUT', body: JSON.stringify(data) }),
  getStats: () => req('/stats'),
  sync: () => req('/sync', { method: 'POST' }),
  syncStatus: () => req('/sync/status'),
}
