'use client'

import { useCallback, useEffect, useState } from 'react'
import { Container } from '@/components/ui/container'
import {
  getReviewQueue,
  getReviewQueueStats,
  attachReviewQueueItem,
  rejectReviewQueueItem,
  getProviderBudget,
  triggerProviderSync,
} from '@/services/api/odds-collection-client'
import type {
  ReviewQueueItem,
  ReviewQueueStats,
  ReviewQueueStatus,
  ProviderBudget,
} from '@/types/odds-collection'

const PAGE_SIZE = 100

const STATUS_OPTIONS: Array<{ value: ReviewQueueStatus; label: string }> = [
  { value: 'pending', label: 'In attesa' },
  { value: 'attached', label: 'Collegati' },
  { value: 'rejected', label: 'Rifiutati' },
  { value: 'created_canonical', label: 'Promossi a canonico' },
]

const SPORT_KEYS = [
  'football',
  'basketball',
  'hockey',
  'baseball',
  'rugby',
  'volleyball',
  'handball',
  'formula1',
  'nba',
  'nfl',
  'mma',
  'afl',
]

function formatDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function statusBadge(status: ReviewQueueStatus) {
  const base = 'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium'
  switch (status) {
    case 'pending':
      return `${base} bg-amber-500/15 text-amber-400`
    case 'attached':
      return `${base} bg-emerald-500/15 text-emerald-400`
    case 'rejected':
      return `${base} bg-red-500/15 text-red-400`
    case 'created_canonical':
      return `${base} bg-blue-500/15 text-blue-400`
  }
}

export default function ReviewQueuePage() {
  const [items, setItems] = useState<ReviewQueueItem[]>([])
  const [stats, setStats] = useState<ReviewQueueStats | null>(null)
  const [budget, setBudget] = useState<ProviderBudget | null>(null)
  const [status, setStatus] = useState<ReviewQueueStatus>('pending')
  const [offset, setOffset] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionState, setActionState] = useState<
    Record<string, 'attaching' | 'rejecting' | undefined>
  >({})
  const [eventIdInputs, setEventIdInputs] = useState<Record<string, string>>({})
  const [syncSport, setSyncSport] = useState('football')
  const [syncType, setSyncType] = useState<'catalog' | 'fixtures' | 'status'>('fixtures')
  const [syncing, setSyncing] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [queue, queueStats, providerBudget] = await Promise.all([
        getReviewQueue({ status, limit: PAGE_SIZE, offset }),
        getReviewQueueStats(),
        getProviderBudget(),
      ])
      setItems(queue.items)
      setStats(queueStats)
      setBudget(providerBudget)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore caricamento coda di review')
    } finally {
      setLoading(false)
    }
  }, [status, offset])

  useEffect(() => {
    load()
  }, [load])

  const handleAttach = async (id: string) => {
    const eventId = eventIdInputs[id]?.trim()
    if (!eventId) {
      setError('Inserire un eventId canonico prima di collegare')
      return
    }
    setActionState((s) => ({ ...s, [id]: 'attaching' }))
    try {
      await attachReviewQueueItem(id, eventId)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore attach')
    } finally {
      setActionState((s) => ({ ...s, [id]: undefined }))
    }
  }

  const handleReject = async (id: string) => {
    setActionState((s) => ({ ...s, [id]: 'rejecting' }))
    try {
      await rejectReviewQueueItem(id)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore reject')
    } finally {
      setActionState((s) => ({ ...s, [id]: undefined }))
    }
  }

  const handleTriggerSync = async () => {
    setSyncing(true)
    setError(null)
    try {
      await triggerProviderSync(syncSport, syncType)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore sync')
    } finally {
      setSyncing(false)
    }
  }

  return (
    <Container className="py-8">
      <h1 className="mb-6 text-2xl font-semibold">Review Queue — Eventi orfani bookmaker</h1>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-5">
        <div className="rounded-lg border border-border p-3">
          <div className="text-xs text-muted-foreground">In attesa</div>
          <div className="text-xl font-medium">{stats?.pending ?? '—'}</div>
        </div>
        <div className="rounded-lg border border-border p-3">
          <div className="text-xs text-muted-foreground">Collegati</div>
          <div className="text-xl font-medium">{stats?.attached ?? '—'}</div>
        </div>
        <div className="rounded-lg border border-border p-3">
          <div className="text-xs text-muted-foreground">Rifiutati</div>
          <div className="text-xl font-medium">{stats?.rejected ?? '—'}</div>
        </div>
        <div className="rounded-lg border border-border p-3">
          <div className="text-xs text-muted-foreground">Canonici manuali</div>
          <div className="text-xl font-medium">{stats?.createdCanonical ?? '—'}</div>
        </div>
        <div className="rounded-lg border border-border p-3">
          <div className="text-xs text-muted-foreground">Budget api-sports</div>
          <div className="text-xl font-medium">
            {budget ? `${budget.callsUsed} / ${budget.planDailyLimit}` : '—'}
          </div>
        </div>
      </div>

      {/* Provider sync trigger */}
      <div className="mb-6 rounded-lg border border-border p-4">
        <h2 className="mb-3 font-medium">Trigger manuale sync provider</h2>
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={syncSport}
            onChange={(e) => setSyncSport(e.target.value)}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            {SPORT_KEYS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <select
            value={syncType}
            onChange={(e) => setSyncType(e.target.value as 'catalog' | 'fixtures' | 'status')}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="catalog">catalog (leagues+teams)</option>
            <option value="fixtures">fixtures (next 14d)</option>
            <option value="status">status (live window)</option>
          </select>
          <button
            type="button"
            onClick={handleTriggerSync}
            disabled={syncing}
            className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            {syncing ? 'Sincronizzazione…' : 'Avvia sync'}
          </button>
        </div>
      </div>

      {/* Filter */}
      <div className="mb-4 flex items-center gap-3">
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as ReviewQueueStatus)
            setOffset(0)
          }}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => load()}
          className="rounded-md border border-border px-3 py-2 text-sm"
        >
          Aggiorna
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-sm text-muted-foreground">Caricamento…</div>
      ) : items.length === 0 ? (
        <div className="text-sm text-muted-foreground">Nessun elemento.</div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="min-w-full text-sm">
            <thead className="bg-muted text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="p-2">Status</th>
                <th className="p-2">Bookmaker</th>
                <th className="p-2">Sport / Lega</th>
                <th className="p-2">Match</th>
                <th className="p-2">Inizio</th>
                <th className="p-2">Azioni</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr key={it.id} className="border-t border-border">
                  <td className="p-2 align-top">
                    <span className={statusBadge(it.status)}>{it.status}</span>
                  </td>
                  <td className="p-2 align-top">
                    <div>{it.bookmakerSlug}</div>
                    <div className="text-xs text-muted-foreground">
                      {it.bookmakerExternalId ?? '—'}
                    </div>
                  </td>
                  <td className="p-2 align-top">
                    <div>{it.bookmakerSportName ?? '—'}</div>
                    <div className="text-xs text-muted-foreground">
                      {it.bookmakerCompetitionName ?? '—'}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {it.bookmakerCountryName ?? ''}
                    </div>
                  </td>
                  <td className="p-2 align-top">
                    <div>{it.bookmakerHomeName ?? '—'}</div>
                    <div className="text-muted-foreground">vs</div>
                    <div>{it.bookmakerAwayName ?? '—'}</div>
                  </td>
                  <td className="p-2 align-top">{formatDate(it.startTime)}</td>
                  <td className="p-2 align-top">
                    {it.status === 'pending' ? (
                      <div className="flex min-w-[260px] flex-col gap-2">
                        <input
                          type="text"
                          placeholder="canonical event UUID"
                          value={eventIdInputs[it.id] ?? ''}
                          onChange={(e) =>
                            setEventIdInputs((s) => ({ ...s, [it.id]: e.target.value }))
                          }
                          className="rounded-md border border-input bg-background px-2 py-1 text-xs"
                        />
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleAttach(it.id)}
                            disabled={actionState[it.id] === 'attaching'}
                            className="rounded-md bg-emerald-600 px-2 py-1 text-xs font-medium text-white disabled:opacity-50"
                          >
                            {actionState[it.id] === 'attaching' ? '…' : 'Collega'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleReject(it.id)}
                            disabled={actionState[it.id] === 'rejecting'}
                            className="rounded-md border border-border px-2 py-1 text-xs disabled:opacity-50"
                          >
                            {actionState[it.id] === 'rejecting' ? '…' : 'Rifiuta'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs text-muted-foreground">
                        {it.resolvedBy ? `${it.resolvedBy} · ${formatDate(it.resolvedAt)}` : '—'}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-4 flex items-center gap-3">
        <button
          type="button"
          disabled={offset === 0 || loading}
          onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
          className="rounded-md border border-border px-3 py-2 text-sm disabled:opacity-50"
        >
          ← Precedente
        </button>
        <button
          type="button"
          disabled={items.length < PAGE_SIZE || loading}
          onClick={() => setOffset(offset + PAGE_SIZE)}
          className="rounded-md border border-border px-3 py-2 text-sm disabled:opacity-50"
        >
          Successiva →
        </button>
      </div>
    </Container>
  )
}
