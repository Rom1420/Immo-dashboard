import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { RefreshCw, Check, AlertCircle } from 'lucide-react'
import { api } from '../api'

export function SyncStatus() {
  const qc = useQueryClient()
  const { data } = useQuery({
    queryKey: ['syncStatus'],
    queryFn: api.syncStatus,
    refetchInterval: 5000,
  })

  const { mutate: triggerSync, isPending } = useMutation({
    mutationFn: api.sync,
    onSuccess: () => {
      setTimeout(() => qc.invalidateQueries(), 3000)
    },
  })

  const lastDate = data?.date
    ? new Date(data.date).toLocaleString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    : null

  return (
    <div className="flex items-center gap-3">
      {lastDate && (
        <span className="text-xs text-gray-500 flex items-center gap-1">
          <Check size={12} className="text-green-500" />
          Sync {lastDate}
        </span>
      )}
      {data?.running && (
        <span className="text-xs text-blue-600 flex items-center gap-1">
          <RefreshCw size={12} className="animate-spin" /> En cours…
        </span>
      )}
      <button
        onClick={() => triggerSync()}
        disabled={isPending || data?.running}
        className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
      >
        <RefreshCw size={14} className={isPending ? 'animate-spin' : ''} />
        Sync
      </button>
    </div>
  )
}
