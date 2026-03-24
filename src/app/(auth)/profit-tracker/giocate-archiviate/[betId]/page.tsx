'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { notFound, useParams, useRouter } from 'next/navigation'

import { Ban } from 'lucide-react'

import { getErrorMessage } from '@/lib/error-utils'
import { formatEventDateDisplay } from '@/lib/utils'
import { useProfitTrackerStore } from '@/stores/profit-tracker-store'
import { updateBet } from '@/services/api/profit-tracker-client'
import type { BetLeg } from '@/types/profit-tracker'

const TIPO_BONUS_LABEL: Record<BetLeg['tipoBonus'], string> = {
  none: 'Nessuno',
  bonus: 'Bonus',
  rimborso: 'Rimborso',
  freebet: 'Freebet',
}

const STATO_EVENTO_LABEL: Record<BetLeg['statoEvento'], string> = {
  bozza: 'Bozza',
  in_corso: 'In corso',
  vinto: 'Vinto',
  perso: 'Perso',
  annullato: 'Annullato',
}

function statoEventoBadgeClass(stato: BetLeg['statoEvento']): string {
  switch (stato) {
    case 'vinto':
      return 'rounded-md border px-2 py-0.5 text-xs font-medium bg-emerald-500/15 text-emerald-400 border-emerald-500/20'
    case 'perso':
      return 'rounded-md border px-2 py-0.5 text-xs font-medium bg-destructive/15 text-destructive border-destructive/20'
    case 'in_corso':
      return 'rounded-md border px-2 py-0.5 text-xs font-medium bg-amber-500/15 text-amber-400 border-amber-500/20'
    case 'annullato':
      return 'rounded-md border px-2 py-0.5 text-xs font-medium bg-neon-lavender/15 text-neon-lavender border-neon-lavender/20'
    default:
      return 'rounded-md border border-border px-2 py-0.5 text-xs font-medium bg-white/5 text-white/40'
  }
}

export default function ArchivedBetDetailPage() {
  const params = useParams<{ betId: string }>()
  const router = useRouter()
  const betId =
    typeof params.betId === 'string'
      ? params.betId
      : Array.isArray(params.betId)
        ? params.betId[0]
        : ''

  const [loadError, setLoadError] = useState(false)

  const ongoingBets = useProfitTrackerStore((s) => s.ongoingBets)
  const allLegs = useProfitTrackerStore((s) => s.betLegs)
  const allAccounts = useProfitTrackerStore((s) => s.allAccounts)
  const books = useProfitTrackerStore((s) => s.allBooks)
  const holders = useProfitTrackerStore((s) => s.holders)
  const fetchBetWithLegs = useProfitTrackerStore((s) => s.fetchBetWithLegs)
  const fetchAllAccounts = useProfitTrackerStore((s) => s.fetchAllAccounts)

  const bet = useMemo(() => ongoingBets.find((b) => b.id === betId), [ongoingBets, betId])
  const legs = useMemo(() => {
    const filtered = allLegs.filter((l) => l.betId === betId)
    return filtered.sort((a, b) => {
      if (a.metodo === 'punta' && b.metodo !== 'punta') return -1
      if (a.metodo !== 'punta' && b.metodo === 'punta') return 1
      const byDate = new Date(a.eventoData).getTime() - new Date(b.eventoData).getTime()
      if (byDate !== 0) return byDate
      return String(a.id).localeCompare(String(b.id))
    })
  }, [allLegs, betId])
  const loading = betId !== '' && !bet && !loadError

  const resolveAccountLabel = useCallback(
    (accountId: string) => {
      const account = allAccounts.find((a) => a.id === accountId)
      if (!account) return '—'
      const book = books.find((b) => b.id === account.bookId)
      const holder = holders.find((h) => h.id === account.holderId)
      if (!book || !holder) return account.nome
      return `${book.nome} (${holder.nome})`
    },
    [allAccounts, books, holders],
  )

  useEffect(() => {
    if (!betId) return
    let cancelled = false
    queueMicrotask(() => setLoadError(false))
    void fetchAllAccounts()
    fetchBetWithLegs(betId).catch(() => {
      if (!cancelled) setLoadError(true)
    })
    return () => {
      cancelled = true
    }
  }, [betId, fetchBetWithLegs, fetchAllAccounts])

  if (!betId) notFound()
  if (loadError || (!loading && !bet)) notFound()

  if (loading || !bet) {
    return (
      <section className="space-y-4">
        <p className="text-sm text-muted-foreground">Caricamento dettaglio giocata...</p>
      </section>
    )
  }

  const handleRipristina = async () => {
    try {
      await updateBet(bet.id, { archiviata: false })
      router.push(`/profit-tracker/giocate-in-corso/${bet.id}`)
    } catch (err) {
      window.alert(getErrorMessage(err) ?? 'Errore nel ripristino.')
    }
  }

  const totalRischio =
    legs.filter((l) => l.metodo === 'punta').reduce((s, l) => s + l.stake, 0) +
    legs.filter((l) => l.metodo === 'banca').reduce((s, l) => s + l.rischio, 0)
  const totalMovimento = legs.reduce((s, l) => s + l.movimento, 0)

  return (
    <section className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Dettaglio giocata archiviata {bet.eventoNome}
        </h1>
        <p className="text-sm text-muted-foreground">
          Vista in sola lettura. Puoi ripristinare la giocata per spostarla nuovamente in
          &quot;Giocate in corso&quot;.
        </p>
      </header>

      <div className="space-y-4 rounded-xl border border-border bg-card/70 p-4 shadow-sm">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <span className="text-muted-foreground">ID GIOCATA </span>
            <span className="font-mono text-foreground">{bet.id}</span>
          </p>
        </div>

        {bet.nota && (
          <div>
            <p className="text-xs font-medium text-muted-foreground">Nota</p>
            <p className="text-sm text-foreground">{bet.nota}</p>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted"
            onClick={handleRipristina}
          >
            Ripristina
          </button>
          <Link
            href="/profit-tracker/giocate-archiviate"
            className="inline-flex items-center rounded-md border border-border bg-background px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted"
          >
            Torna alla lista
          </Link>
        </div>
      </div>

      {legs.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Visualizzo 1–{legs.length} di {legs.length} elementi.
        </p>
      )}

      {/* Vista mobile: card per leg */}
      {legs.length > 0 ? (
        <div className="block space-y-4 sm:hidden">
          {legs.map((leg) => {
            const { datePart, timePart } = formatEventDateDisplay(leg.eventoData)
            return (
              <div
                key={leg.id}
                className={`rounded-xl border border-border bg-card/70 p-4 shadow-sm ${
                  leg.statoEvento !== 'bozza' ? 'opacity-75' : ''
                }`}
              >
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2 border-b border-border/60 pb-2">
                    <span className="text-xs font-medium capitalize text-muted-foreground">
                      {leg.metodo}
                    </span>
                    <span className="text-xs text-muted-foreground">·</span>
                    <span className="text-xs text-muted-foreground">
                      {datePart} {timePart}
                    </span>
                    <span className="text-xs text-muted-foreground">·</span>
                    <span className="min-w-0 flex-1 text-sm font-medium text-foreground">
                      {leg.eventoNome}
                    </span>
                  </div>

                  <div className="grid gap-2 text-xs">
                    <div className="flex justify-between gap-2">
                      <span className="text-muted-foreground">Competizione</span>
                      <span className="text-foreground">{leg.competizione}</span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-muted-foreground">Mercato</span>
                      <span className="text-right text-foreground">{leg.mercato}</span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-muted-foreground">Tipo bonus</span>
                      <span className="text-right text-foreground">
                        {leg.metodo === 'punta' ? (
                          TIPO_BONUS_LABEL[leg.tipoBonus]
                        ) : (
                          <span className="inline-flex items-center gap-1">
                            <Ban className="h-4 w-4 text-muted-foreground/50" aria-hidden />
                            <span className="text-muted-foreground">—</span>
                          </span>
                        )}
                      </span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-muted-foreground">Conto</span>
                      <span className="text-xs text-foreground">
                        {resolveAccountLabel(leg.accountId)}
                      </span>
                    </div>

                    <div className="flex justify-between gap-2">
                      <span className="text-muted-foreground">Stake</span>
                      <span className="text-foreground">{leg.stake.toFixed(2)} €</span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-muted-foreground">Quota</span>
                      <span className="text-foreground">{leg.quota.toFixed(3)}</span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-muted-foreground">Com %</span>
                      <span className="text-foreground">
                        {leg.metodo === 'punta' ? (
                          <Ban className="mx-auto h-4 w-4 text-muted-foreground/50" aria-hidden />
                        ) : leg.commissionePercentuale != null ? (
                          `${leg.commissionePercentuale.toFixed(1)}%`
                        ) : (
                          '—'
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-muted-foreground">Rischio</span>
                      <span className="text-foreground">{leg.rischio.toFixed(2)} €</span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-muted-foreground">Bonus</span>
                      <span className="text-foreground">
                        {leg.bonusValore != null && leg.bonusValore !== 0
                          ? `${leg.bonusValore.toFixed(2)} €`
                          : '—'}
                      </span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-muted-foreground">Rimborso</span>
                      <span className="text-foreground">
                        {leg.rimborsoValore != null && leg.rimborsoValore !== 0
                          ? `${leg.rimborsoValore.toFixed(2)} €`
                          : '—'}
                      </span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-muted-foreground">Mov.</span>
                      <span className="font-medium text-foreground">
                        {leg.movimento.toFixed(2)} €
                      </span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-muted-foreground">Stato evento</span>
                      <span className="flex items-center justify-end">
                        <span className={statoEventoBadgeClass(leg.statoEvento)}>
                          {STATO_EVENTO_LABEL[leg.statoEvento]}
                        </span>
                      </span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-muted-foreground">Tag</span>
                      <span className="text-foreground">{leg.tag ?? '—'}</span>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="block sm:hidden">
          <div className="rounded-xl border border-border bg-card/70 p-6 text-center text-sm text-muted-foreground">
            Nessun esito registrato per questa giocata.
          </div>
        </div>
      )}

      <div className="hidden overflow-x-auto rounded-xl border border-border bg-card/70 shadow-sm sm:block">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="whitespace-nowrap border-b border-border/60 bg-muted/40 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              <th className="px-3 py-2 text-left">Data evento</th>
              <th className="px-3 py-2 text-left">Evento</th>
              <th className="px-3 py-2 text-left">Competizione</th>
              <th className="whitespace-nowrap px-3 py-2 text-left">Mercato</th>
              <th className="px-3 py-2 text-left">Metodo</th>
              <th className="px-3 py-2 text-left">Tipo bonus</th>
              <th className="px-3 py-2 text-left">Conto</th>
              <th className="px-3 py-2 text-left">Stake</th>
              <th className="px-3 py-2 text-left">Quota</th>
              <th className="px-3 py-2 text-left">Com %</th>
              <th className="px-3 py-2 text-left">Rischio</th>
              <th className="px-3 py-2 text-left">Bonus</th>
              <th className="px-3 py-2 text-left">Rimborso</th>
              <th className="px-3 py-2 text-left">Mov.</th>
              <th className="px-3 py-2 text-left">Stato evento</th>
              <th className="px-3 py-2 text-left">Tag</th>
            </tr>
          </thead>
          <tbody>
            {legs.map((leg) => (
              <tr
                key={leg.id}
                className="border-b border-border/40 align-top transition-colors last:border-b-0 hover:bg-accent"
              >
                <td className="px-3 py-2 text-center text-xs text-muted-foreground">
                  {(() => {
                    const { datePart, timePart } = formatEventDateDisplay(leg.eventoData)
                    return (
                      <span className="whitespace-nowrap">
                        {datePart} {timePart}
                      </span>
                    )
                  })()}
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-xs text-foreground">
                  {leg.eventoNome}
                </td>
                <td className="px-3 py-2 text-xs text-muted-foreground">{leg.competizione}</td>
                <td className="whitespace-nowrap px-3 py-2 text-xs text-muted-foreground">
                  {leg.mercato}
                </td>
                <td className="px-3 py-2 text-xs capitalize text-muted-foreground">{leg.metodo}</td>
                <td className="px-3 py-2 text-xs text-foreground">
                  {leg.metodo === 'punta' ? (
                    TIPO_BONUS_LABEL[leg.tipoBonus]
                  ) : (
                    <Ban className="mx-auto h-4 w-4 text-muted-foreground/50" />
                  )}
                </td>
                <td className="px-3 py-2 text-xs text-foreground">
                  {resolveAccountLabel(leg.accountId)}
                </td>
                <td className="px-3 py-2 font-mono text-xs text-foreground">
                  {leg.stake.toFixed(2)}
                </td>
                <td className="px-3 py-2 font-mono text-xs text-foreground">
                  {leg.quota.toFixed(3)}
                </td>
                <td className="px-3 py-2 text-xs text-foreground">
                  {leg.metodo === 'punta' ? (
                    <Ban className="mx-auto h-4 w-4 text-muted-foreground/50" />
                  ) : leg.commissionePercentuale != null ? (
                    `${leg.commissionePercentuale.toFixed(1)}%`
                  ) : (
                    '—'
                  )}
                </td>
                <td className="whitespace-nowrap px-3 py-2 font-mono text-xs text-foreground">
                  {leg.rischio.toFixed(2)} €
                </td>
                <td className="px-3 py-2 text-xs text-foreground">
                  {leg.bonusValore != null && leg.bonusValore !== 0
                    ? `${leg.bonusValore.toFixed(2)} €`
                    : '—'}
                </td>
                <td className="px-3 py-2 text-xs text-foreground">
                  {leg.rimborsoValore != null && leg.rimborsoValore !== 0
                    ? `${leg.rimborsoValore.toFixed(2)} €`
                    : '—'}
                </td>
                <td className="whitespace-nowrap px-3 py-2 font-mono text-xs font-medium text-foreground">
                  {leg.movimento.toFixed(2)} €
                </td>
                <td className="px-3 py-2">
                  <span className={statoEventoBadgeClass(leg.statoEvento)}>
                    {STATO_EVENTO_LABEL[leg.statoEvento]}
                  </span>
                </td>
                <td className="px-3 py-2 text-xs text-muted-foreground">{leg.tag ?? '—'}</td>
              </tr>
            ))}
            {legs.length === 0 && (
              <tr>
                <td className="px-3 py-6 text-center text-xs text-muted-foreground" colSpan={16}>
                  Nessun esito registrato per questa giocata.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {legs.length > 0 && (
        <div className="rounded-xl border border-border bg-muted/30 px-4 py-3">
          <div className="flex flex-wrap items-center gap-6 text-sm">
            <div>
              <span className="text-muted-foreground">Totale Rischio: </span>
              <span className="font-medium text-foreground">{totalRischio.toFixed(2)} €</span>
            </div>
            <div>
              <span className="text-muted-foreground">Guadagno Totale: </span>
              <span
                className={`font-medium ${
                  totalMovimento >= 0 ? 'text-foreground' : 'text-destructive'
                }`}
              >
                {totalMovimento.toFixed(2)} €
              </span>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
