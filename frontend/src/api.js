const BASE = '/api'

export const LOCATION_LABELS = {
  // Paris intra-muros
  '75001': 'Paris 1er', '75002': 'Paris 2e', '75003': 'Paris 3e', '75004': 'Paris 4e',
  '75005': 'Paris 5e', '75006': 'Paris 6e', '75007': 'Paris 7e', '75008': 'Paris 8e',
  '75009': 'Paris 9e', '75010': 'Paris 10e', '75011': 'Paris 11e', '75012': 'Paris 12e',
  '75013': 'Paris 13e', '75014': 'Paris 14e', '75015': 'Paris 15e', '75016': 'Paris 16e',
  '75017': 'Paris 17e', '75018': 'Paris 18e', '75019': 'Paris 19e', '75020': 'Paris 20e',
  // 92 - Hauts-de-Seine
  '92000': 'Nanterre', '92100': 'Boulogne-Billancourt', '92110': 'Clichy',
  '92120': 'Montrouge', '92130': 'Issy-les-Moulineaux', '92140': 'Clamart',
  '92170': 'Vanves', '92190': 'Meudon', '92200': 'Neuilly-sur-Seine',
  '92210': 'Saint-Cloud', '92240': 'Malakoff', '92300': 'Levallois-Perret',
  '92310': 'Sèvres', '92400': 'Courbevoie', '92500': 'Rueil-Malmaison',
  '92600': 'Asnières-sur-Seine', '92700': 'Colombes', '92800': 'Puteaux',
  // 93 - Seine-Saint-Denis
  '93100': 'Montreuil', '93170': 'Bagnolet', '93400': 'Saint-Ouen', '93500': 'Pantin',
  // 94 - Val-de-Marne
  '94110': 'Arcueil', '94120': 'Fontenay-sous-Bois', '94130': 'Nogent-sur-Marne',
  '94160': 'Saint-Mandé', '94200': 'Ivry-sur-Seine', '94220': 'Charenton-le-Pont',
  '94230': 'Cachan', '94250': 'Gentilly', '94270': 'Le Kremlin-Bicêtre',
  '94300': 'Vincennes', '94340': 'Joinville-le-Pont', '94700': 'Maisons-Alfort',
}

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
