'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { ODDSMATCHER_BOOKS } from '@/lib/oddsmatcher-books'
import type { MultiplaEvent } from '@/types/multipla-event'
import type { Account } from '@/types/profit-tracker'
import {
  getAccounts,
  type CreateBetPayload,
  type CreateBetLegPayload,
} from '@/services/api/profit-tracker-client'
import { multiplaLayStakes } from '@/lib/calculators/multipla'
import { useProfitTrackerStore } from '@/stores/profit-tracker-store'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { Loader2, X } from 'lucide-react'

function getBookName(id: string): string {
  return ODDSMATCHER_BOOKS.find((b) => b.id === id)?.name ?? '—'
}

function findBookIdByOddsmatcherName(
  books: { id: string; nome: string }[],
  name: string,
): string | null {
  const lower = name.toLowerCase().trim()
  const found = books.find(
    (b) =>
      b.nome.toLowerCase() === lower ||
      b.nome.toLowerCase().replace(/\.it$/, '') === lower ||
      b.nome.toLowerCase().startsWith(lower),
  )
  return found?.id ?? null
}

function eventToEventoData(ev: MultiplaEvent): string {
  const hour = ev.hour.replace('.', ':')
  return new Date(`${ev.date}T${hour}:00`).toISOString()
}

function sportFromId(sportId: string): string {
  switch (sportId) {
    case '1':
      return 'tennis'
    case '2':
      return 'basket'
    default:
      return 'calcio'
  }
}

function buildMultiplaEventoNome(ev: MultiplaEvent): string {
  return `MULTIPLA ${ev.home} - ${ev.away}`
}

export interface OddsmatcherMultiplaSaveModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedEvents: MultiplaEvent[]
  bookOddsId: string
  exchangeOddsId: string
  /** Stake condiviso dalla barra filtri (stesso valore usato per il calcolatore singolo). */
  sharedStake?: string
  /** Bonus condiviso dalla barra filtri (stesso valore usato per il calcolatore singolo). */
  sharedBonus?: string
  /** Rimborso condiviso dalla barra filtri. */
  sharedRimborso?: string
}

export function OddsmatcherMultiplaSaveModal({
  open,
  onOpenChange,
  selectedEvents,
  bookOddsId,
  exchangeOddsId,
  sharedStake = '',
  sharedBonus = '',
  sharedRimborso = '',
}: OddsmatcherMultiplaSaveModalProps) {
  const books = useProfitTrackerStore((s) => s.allBooks)
  const holders = useProfitTrackerStore((s) => s.allHolders)
  const fetchAllBooks = useProfitTrackerStore((s) => s.fetchAllBooks)
  const fetchHolders = useProfitTrackerStore((s) => s.fetchAllHolders)
  const saveOngoingBetFromCalculator = useProfitTrackerStore((s) => s.saveOngoingBetFromCalculator)

  const [isLoadingBasics, setIsLoadingBasics] = useState(false)
  const [accountIdPunta, setAccountIdPunta] = useState('')
  const [accountIdBanca, setAccountIdBanca] = useState('')
  const [accountsPunta, setAccountsPunta] = useState<Account[]>([])
  const [accountsBanca, setAccountsBanca] = useState<Account[]>([])
  const [holderPortalEl, setHolderPortalEl] = useState<HTMLDivElement | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [savedBetId, setSavedBetId] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)

  const sortedSelectedEvents = useMemo(() => {
    return [...selectedEvents].sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date)
      return a.hour.localeCompare(b.hour)
    })
  }, [selectedEvents])

  const bookNamePunta = bookOddsId ? getBookName(bookOddsId) : ''
  const bookNameBanca = exchangeOddsId ? getBookName(exchangeOddsId) : ''

  const loadHolderOptions = useCallback(async () => {
    if (!bookOddsId && !exchangeOddsId) return
    if (holders.length === 0) {
      await fetchHolders()
    }
    let resolvedBooks = books
    if (resolvedBooks.length === 0) {
      await fetchAllBooks()
      resolvedBooks = useProfitTrackerStore.getState().allBooks
    }
    const puntaBookId = findBookIdByOddsmatcherName(resolvedBooks, bookNamePunta)
    const bancaBookId = findBookIdByOddsmatcherName(resolvedBooks, bookNameBanca)
    if (puntaBookId) {
      const res = await getAccounts({ bookId: puntaBookId })
      setAccountsPunta(res.items)
    } else {
      setAccountsPunta([])
    }
    if (bancaBookId) {
      const res = await getAccounts({ bookId: bancaBookId })
      setAccountsBanca(res.items)
    } else {
      setAccountsBanca([])
    }
  }, [
    bookOddsId,
    exchangeOddsId,
    bookNamePunta,
    bookNameBanca,
    books,
    fetchAllBooks,
    holders.length,
    fetchHolders,
  ])

  useEffect(() => {
    if (open) {
      setAccountIdPunta('')
      setAccountIdBanca('')
      setSaveError(null)
      setSavedBetId(null)
    }
  }, [open])

  useEffect(() => {
    if (open && (bookOddsId || exchangeOddsId)) {
      const load = async () => {
        setIsLoadingBasics(true)
        try {
          await loadHolderOptions()
        } finally {
          setIsLoadingBasics(false)
        }
      }
      void load()
    }
  }, [open, bookOddsId, exchangeOddsId, loadHolderOptions])

  const handleSave = async () => {
    if (!accountIdPunta || !accountIdBanca) return
    if (selectedEvents.length < 2) {
      setSaveError('Seleziona almeno 2 eventi per la multipla.')
      return
    }
    const stakeNum = Number.parseFloat(sharedStake) || 0
    const bonusNum = Number.parseFloat(sharedBonus) || 0
    if (stakeNum <= 0 && bonusNum <= 0) {
      setSaveError('Inserisci almeno la puntata (Stake) o il bonus.')
      return
    }
    setIsSaving(true)
    setSaveError(null)
    try {
      const sorted = sortedSelectedEvents
      const first = sorted[0]
      const eventoDataFirst = eventToEventoData(first)
      const sport = sportFromId(first.sport)
      const eventoNome = buildMultiplaEventoNome(sorted[0])

      const betPayload: CreateBetPayload = {
        eventoData: eventoDataFirst,
        sport,
        eventoNome,
        modalitaSaldo: 'reale',
        accountId: accountIdPunta,
        tag: undefined,
        nota: undefined,
      }

      const quotaPuntaPrecisa = sorted.reduce((acc, ev) => acc * parseFloat(ev.mainOdd), 1)
      const quotaPuntaTotale = Math.round(quotaPuntaPrecisa * 100) / 100

      const stakePunta = Number.parseFloat(sharedStake) || 0
      const bonusValore = Number.parseFloat(sharedBonus) || 0
      const rimborsoValore = Number.parseFloat(sharedRimborso) || 0
      const backStakeTotale = stakePunta + bonusValore
      const legPunta: CreateBetLegPayload = {
        eventoData: eventoDataFirst,
        sport,
        eventoNome,
        competizione: 'Multipla',
        mercato: 'Multipla',
        selezione: undefined,
        metodo: 'punta',
        tipoBonus: bonusValore > 0 ? 'bonus' : rimborsoValore > 0 ? 'rimborso' : 'none',
        accountId: accountIdPunta,
        stake: stakePunta,
        quota: quotaPuntaTotale,
        rischio: stakePunta,
        bonusValore: bonusValore > 0 ? bonusValore : undefined,
        rimborsoValore: rimborsoValore > 0 ? rimborsoValore : undefined,
        commissionePercentuale: 0,
        movimento: 0,
        statoEvento: 'bozza',
        tag: undefined,
      }

      const multiplaResults = multiplaLayStakes(
        backStakeTotale,
        quotaPuntaPrecisa,
        sorted.map((ev) => ({
          type: ev.type,
          coverOdds: parseFloat(ev.coverOdd),
          commissionPercent: ev.commissionPercent,
        })),
        rimborsoValore,
      )
      const legsHedge: CreateBetLegPayload[] = sorted.map((ev, i) => {
        const coverOdds_i = parseFloat(ev.coverOdd)
        const { hedgeStake: hedgeStake_i, hedgeCost: rischio_i } = multiplaResults[i] ?? {
          hedgeStake: 0,
          hedgeCost: 0,
        }
        return {
          eventoData: eventToEventoData(ev),
          sport: sportFromId(ev.sport),
          eventoNome: `${ev.home} - ${ev.away}`,
          competizione: ev.competition,
          mercato: ev.market,
          selezione: ev.selection,
          metodo: ev.type === 'punta-punta' ? ('punta' as const) : ('banca' as const),
          tipoBonus: 'none',
          accountId: accountIdBanca,
          stake: hedgeStake_i,
          quota: coverOdds_i,
          quotaRiferimento: (() => {
            const n = parseFloat(ev.mainOdd)
            return Number.isFinite(n) ? n : undefined
          })(),
          rischio: rischio_i,
          commissionePercentuale: ev.commissionPercent,
          movimento: 0,
          statoEvento: 'bozza',
          tag: undefined,
        }
      })

      const legsPayload: CreateBetLegPayload[] = [legPunta, ...legsHedge]
      const bet = await saveOngoingBetFromCalculator(betPayload, legsPayload)
      setSavedBetId(bet.id)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Errore nel salvataggio della multipla.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md gap-0 p-0" showClose={true}>
        {/* Portal container per dropdown SearchableSelect dentro la modale */}
        <div
          ref={setHolderPortalEl}
          className="pointer-events-none fixed inset-0 z-[9998]"
          aria-hidden
        />
        {savedBetId ? (
          <>
            <div className="px-6 pb-4 pt-6">
              <DialogTitle className="text-xl font-semibold tracking-tight text-foreground">
                Giocata salvata
              </DialogTitle>
              <p className="mt-2 text-sm text-muted-foreground">
                La giocata è stata salvata correttamente nel Profit Tracker.
              </p>
              <p className="mt-3 text-sm text-foreground">
                <Link
                  href={`/profit-tracker/giocate-in-corso/${savedBetId}`}
                  className="font-medium text-primary underline-offset-4 hover:underline"
                >
                  Vai al dettaglio della giocata
                </Link>
              </p>
            </div>
            <div className="flex justify-end border-t border-border bg-muted/20 px-6 py-4">
              <Button
                variant="outline"
                onClick={() => {
                  setSavedBetId(null)
                  onOpenChange(false)
                }}
              >
                Chiudi
              </Button>
            </div>
          </>
        ) : isLoadingBasics ? (
          <>
            <DialogTitle className="sr-only">Caricamento</DialogTitle>
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          </>
        ) : (
          <>
            <div className="px-6 pb-1 pt-6">
              <DialogTitle className="text-xl font-semibold tracking-tight text-foreground">
                Assegna intestatari
              </DialogTitle>
              <p className="mt-1.5 text-sm text-muted-foreground">
                Scegli l&apos;intestatario per la puntata (book) e per la bancata (exchange) della
                multipla.
              </p>
            </div>

            <div className="grid gap-4 px-6 py-5">
              <div className="space-y-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
                <div className="flex items-center justify-between gap-2">
                  <Label className="text-xs font-medium uppercase tracking-wide text-primary">
                    Intestatario Punta
                  </Label>
                  <span className="rounded-md bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary">
                    {bookNamePunta || '—'}
                  </span>
                </div>
                <SearchableSelect
                  options={accountsPunta.map((acc) => {
                    const holder = holders.find((h) => h.id === acc.holderId)
                    return { value: acc.id, label: holder?.nome ?? acc.nome }
                  })}
                  value={accountIdPunta}
                  onChange={setAccountIdPunta}
                  placeholder="Seleziona intestatario"
                  searchPlaceholder="Cerca intestatario..."
                  allowEmpty={false}
                  portalContainer={holderPortalEl}
                />
                {accountsPunta.length === 0 && bookNamePunta && (
                  <p className="rounded-md bg-amber-500/10 px-3 py-2 text-xs text-amber-600 dark:text-amber-400">
                    Nessun conto con {bookNamePunta}. Aggiungine uno in Profit Tracker → Conti.
                  </p>
                )}
              </div>

              <div className="space-y-3 rounded-xl border border-destructive/20 bg-destructive/5 p-4">
                <div className="flex items-center justify-between gap-2">
                  <Label className="text-xs font-medium uppercase tracking-wide text-destructive">
                    Intestatario Banca
                  </Label>
                  <span className="rounded-md bg-destructive/15 px-2 py-0.5 text-xs font-medium text-destructive">
                    {bookNameBanca || '—'}
                  </span>
                </div>
                <SearchableSelect
                  options={accountsBanca.map((acc) => {
                    const holder = holders.find((h) => h.id === acc.holderId)
                    return { value: acc.id, label: holder?.nome ?? acc.nome }
                  })}
                  value={accountIdBanca}
                  onChange={setAccountIdBanca}
                  placeholder="Seleziona intestatario"
                  searchPlaceholder="Cerca intestatario..."
                  allowEmpty={false}
                  portalContainer={holderPortalEl}
                />
                {accountsBanca.length === 0 && bookNameBanca && (
                  <p className="rounded-md bg-amber-500/10 px-3 py-2 text-xs text-amber-600 dark:text-amber-400">
                    Nessun conto con {bookNameBanca}. Aggiungine uno in Profit Tracker → Conti.
                  </p>
                )}
              </div>
            </div>

            {saveError && (
              <div className="mx-6 mb-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2">
                <p className="text-sm text-destructive">{saveError}</p>
              </div>
            )}

            <div className="flex flex-col-reverse justify-end gap-2 border-t border-border bg-muted/20 px-6 py-4 sm:flex-row">
              <Button
                variant="outline"
                className="sm:min-w-[100px]"
                onClick={() => onOpenChange(false)}
                disabled={isSaving}
              >
                <X className="mr-2 h-4 w-4" />
                Annulla
              </Button>
              <Button
                className="bg-emerald-600 text-white hover:bg-emerald-700 hover:text-white sm:min-w-[120px]"
                onClick={() => void handleSave()}
                disabled={
                  !accountIdPunta ||
                  !accountIdBanca ||
                  isSaving ||
                  ((Number.parseFloat(sharedStake) || 0) <= 0 &&
                    (Number.parseFloat(sharedBonus) || 0) <= 0)
                }
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                    Salvataggio...
                  </>
                ) : (
                  'Salva'
                )}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
