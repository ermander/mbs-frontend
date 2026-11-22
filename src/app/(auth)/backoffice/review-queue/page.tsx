'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { RefreshCw } from 'lucide-react'

import {
  BO_EMPTY_CELL,
  BO_ROW,
  BO_TABLE,
  BO_TABLE_WRAP,
  BO_TD,
  BO_TH,
  BO_THEAD_ROW,
  BO_TILE_GRID,
  BoPagination,
  BoPanel,
  BoStatTile,
  codeLabel,
} from '@/components/backoffice/backoffice-ds'
import { DsBadge, type DsBadgeTone } from '@/components/landing/ds-data'
import { dsButtonClass } from '@/components/landing/ds-primitives'
import { GSelect, GTextField } from '@/components/profit-tracker/giocate-in-corso/giocate-ds'
import { DsAlert, DsPageHeader } from '@/components/profit-tracker/tracker-ds'
import { cn } from '@/lib/utils'
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

const STATUS_TONE: Record<ReviewQueueStatus, DsBadgeTone> = {
  pending: 'warning',
  attached: 'profit',
  rejected: 'loss',
  created_canonical: 'info',
}

const SYNC_TYPES: Array<{ value: 'catalog' | 'fixtures' | 'status'; label: string }> = [
  { value: 'catalog', label: 'catalog (leagues+teams)' },
  { value: 'fixtures', label: 'fixtures (next 14d)' },
  { value: 'status', label: 'status (live window)' },
]

// La coda degli eventi dei bookmaker senza un evento canonico. Dal §14.365 sul design OddWise:
// numeri in riquadri, sync nel riquadro con titolo, tabella e paginazione del Backoffice.
export default function ReviewQueuePage() {
  const [items, setItems] = useState<ReviewQueueItem[]>([])
  const [stats, setStats] = useState<ReviewQueueStats | null>(null)
  const [budget, setBudget] = useState<ProviderBudget | null>(null)
  const [status, setStatus] = useState<ReviewQueueStatus>('pending')
  const [offset, setOffset] = useState(0)
  const [reloadTick, setReloadTick] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [actionState, setActionState] = useState<
    Record<string, 'attaching' | 'rejecting' | undefined>
  >({})
  const [eventIdInputs, setEventIdInputs] = useState<Record<string, string>>({})
  const [syncSport, setSyncSport] = useState('football')
  const [syncType, setSyncType] = useState<'catalog' | 'fixtures' | 'status'>('fixtures')
  const [syncing, setSyncing] = useState(false)

  // La richiesta corrente: filtro, pagina e un contatore che «Aggiorna» e le azioni fanno salire
  // per ricaricare. Il caricamento è derivato: i dati in mano sono «per» una richiesta, e finché
  // non è quella corrente si sta caricando. Lo stato cambia nei callback della promise, e una
  // risposta arrivata dopo un cambio di richiesta viene ignorata (react-hooks/set-state-in-effect).
  const request = useMemo(
    () => ({ status, offset, tick: reloadTick }),
    [status, offset, reloadTick],
  )
  const [loadedRequest, setLoadedRequest] = useState<typeof request | null>(null)
  const loading = loadedRequest !== request

  const load = useCallback(() => setReloadTick((t) => t + 1), [])

  useEffect(() => {
    let cancelled = false
    Promise.all([
      getReviewQueue({ status: request.status, limit: PAGE_SIZE, offset: request.offset }),
      getReviewQueueStats(),
      getProviderBudget(),
    ])
      .then(([queue, queueStats, providerBudget]) => {
        if (cancelled) return
        setItems(queue.items)
        setStats(queueStats)
        setBudget(providerBudget)
        setError(null)
      })
      .catch((err) => {
        if (!cancelled)
          setError(err instanceof Error ? err.message : 'Errore caricamento coda di review')
      })
      .finally(() => {
        if (!cancelled) setLoadedRequest(request)
      })
    return () => {
      cancelled = true
    }
  }, [request])

  const handleAttach = async (id: string) => {
    const eventId = eventIdInputs[id]?.trim()
    if (!eventId) {
      setError('Inserire un eventId canonico prima di collegare')
      return
    }
    setActionState((s) => ({ ...s, [id]: 'attaching' }))
    try {
      await attachReviewQueueItem(id, eventId)
      load()
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
      load()
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
      load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore sync')
    } finally {
      setSyncing(false)
    }
  }

  return (
    <>
      <DsPageHeader
        title="Review Queue"
        description="Eventi orfani dei bookmaker: da collegare a un evento canonico o da rifiutare."
      />

      {/* Stats */}
      <div className={BO_TILE_GRID}>
        <BoStatTile label="In attesa" value={stats?.pending ?? '—'} />
        <BoStatTile label="Collegati" value={stats?.attached ?? '—'} />
        <BoStatTile label="Rifiutati" value={stats?.rejected ?? '—'} />
        <BoStatTile label="Canonici manuali" value={stats?.createdCanonical ?? '—'} />
        <BoStatTile
          label="Budget api-sports"
          value={budget ? `${budget.callsUsed} / ${budget.planDailyLimit}` : '—'}
        />
      </div>

      {/* Provider sync trigger */}
      <BoPanel title="Trigger manuale sync provider">
        <div className="flex flex-wrap items-center gap-3">
          <GSelect
            id="rq-sync-sport"
            ariaLabel="Sport"
            size="sm"
            value={syncSport}
            onChange={setSyncSport}
            options={SPORT_KEYS.map((s) => ({ value: s, label: s }))}
            className="w-40"
          />
          <GSelect
            id="rq-sync-type"
            ariaLabel="Tipo di sync"
            size="sm"
            value={syncType}
            onChange={(v) => setSyncType(v as 'catalog' | 'fixtures' | 'status')}
            options={SYNC_TYPES}
            className="w-56"
          />
          <button
            type="button"
            onClick={handleTriggerSync}
            disabled={syncing}
            className={cn(dsButtonClass('primary', 'sm'), 'disabled:opacity-60')}
          >
            {syncing ? 'Sincronizzazione…' : 'Avvia sync'}
          </button>
        </div>
      </BoPanel>

      {/* Filter */}
      <div className="flex flex-wrap items-center gap-3">
        <GSelect
          id="rq-status"
          ariaLabel="Stato"
          size="sm"
          value={status}
          onChange={(v) => {
            setStatus(v as ReviewQueueStatus)
            setOffset(0)
          }}
          options={STATUS_OPTIONS}
          className="w-56"
        />
        <button type="button" onClick={() => load()} className={dsButtonClass('secondary', 'sm')}>
          <RefreshCw className="h-4 w-4" aria-hidden />
          Aggiorna
        </button>
      </div>

      {!loading && error && <DsAlert>{error}</DsAlert>}

      <div className={BO_TABLE_WRAP}>
        <table className={BO_TABLE}>
          <thead>
            <tr className={BO_THEAD_ROW}>
              <th className={BO_TH}>Status</th>
              <th className={BO_TH}>Bookmaker</th>
              <th className={BO_TH}>Sport / Lega</th>
              <th className={BO_TH}>Match</th>
              <th className={BO_TH}>Inizio</th>
              <th className={BO_TH}>Azioni</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className={BO_EMPTY_CELL}>
                  Caricamento della coda…
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={6} className={BO_EMPTY_CELL}>
                  Nessun elemento.
                </td>
              </tr>
            ) : (
              items.map((it) => (
                <tr key={it.id} className={cn(BO_ROW, 'align-top')}>
                  <td className={cn(BO_TD, 'align-top')}>
                    <DsBadge tone={STATUS_TONE[it.status]}>{codeLabel(it.status)}</DsBadge>
                  </td>
                  <td className={cn(BO_TD, 'align-top')}>
                    <div className="font-semibold text-ds-ink">{it.bookmakerSlug}</div>
                    <div className="font-mono text-xs text-ds-ink-muted">
                      {it.bookmakerExternalId ?? '—'}
                    </div>
                  </td>
                  <td className={cn(BO_TD, 'align-top')}>
                    <div className="text-ds-ink">{it.bookmakerSportName ?? '—'}</div>
                    <div className="ds-caption text-ds-ink-muted">
                      {it.bookmakerCompetitionName ?? '—'}
                    </div>
                    <div className="ds-caption text-ds-ink-muted">
                      {it.bookmakerCountryName ?? ''}
                    </div>
                  </td>
                  <td className={cn(BO_TD, 'align-top text-ds-ink')}>
                    <div>{it.bookmakerHomeName ?? '—'}</div>
                    <div className="text-ds-ink-muted">vs</div>
                    <div>{it.bookmakerAwayName ?? '—'}</div>
                  </td>
                  <td
                    className={cn(
                      BO_TD,
                      'align-top whitespace-nowrap text-ds-ink-muted tabular-nums',
                    )}
                  >
                    {formatDate(it.startTime)}
                  </td>
                  <td className={cn(BO_TD, 'align-top')}>
                    {it.status === 'pending' ? (
                      <div className="flex min-w-[260px] flex-col gap-2">
                        <GTextField
                          id={`rq-event-${it.id}`}
                          ariaLabel="UUID dell'evento canonico"
                          size="sm"
                          placeholder="canonical event UUID"
                          value={eventIdInputs[it.id] ?? ''}
                          onChange={(v) => setEventIdInputs((s) => ({ ...s, [it.id]: v }))}
                        />
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleAttach(it.id)}
                            disabled={actionState[it.id] === 'attaching'}
                            className={cn(dsButtonClass('primary', 'sm'), 'disabled:opacity-60')}
                          >
                            {actionState[it.id] === 'attaching' ? '…' : 'Collega'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleReject(it.id)}
                            disabled={actionState[it.id] === 'rejecting'}
                            className={cn(
                              dsButtonClass('secondary', 'sm'),
                              'text-ds-loss disabled:opacity-50',
                            )}
                          >
                            {actionState[it.id] === 'rejecting' ? '…' : 'Rifiuta'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="ds-caption text-ds-ink-muted">
                        {it.resolvedBy ? `${it.resolvedBy} · ${formatDate(it.resolvedAt)}` : '—'}
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <BoPagination
        label={`${items.length} in questa pagina`}
        prevDisabled={offset === 0 || loading}
        nextDisabled={items.length < PAGE_SIZE || loading}
        onPrev={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
        onNext={() => setOffset(offset + PAGE_SIZE)}
      />
    </>
  )
}
