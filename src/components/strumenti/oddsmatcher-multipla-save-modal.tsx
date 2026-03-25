'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { ODDSMATCHER_BOOKS } from '@/lib/oddsmatcher-books'
import type { OddsmatcherRow } from '@/types/oddsmatcher'
import type { Account } from '@/types/profit-tracker'
import {
  getAccounts,
  type CreateBetPayload,
  type CreateBetLegPayload,
} from '@/services/api/profit-tracker-client'
import { multiplaLayStakes } from '@/lib/calculators/multipla'
import { useProfitTrackerStore } from '@/stores/profit-tracker-store'
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

function rowToEventoData(row: OddsmatcherRow): string {
  const hour = row.hour.replace('.', ':')
  return new Date(`${row.date}T${hour}:00`).toISOString()
}

function sportFromOddsmatcher(sportId: string): string {
  switch (sportId) {
    case '1':
      return 'tennis'
    case '2':
      return 'basket'
    default:
      return 'calcio'
  }
}

function buildMultiplaEventoNome(row: OddsmatcherRow): string {
  return `MULTIPLA ${row.home} - ${row.away}`
}

const ChevronDown = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="m6 9 6 6 6-6" />
  </svg>
)

export interface OddsmatcherMultiplaSaveModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedEvents: OddsmatcherRow[]
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

  const [accountIdPunta, setAccountIdPunta] = useState('')
  const [accountIdBanca, setAccountIdBanca] = useState('')
  const [accountsPunta, setAccountsPunta] = useState<Account[]>([])
  const [accountsBanca, setAccountsBanca] = useState<Account[]>([])
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
      void loadHolderOptions()
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
      const eventoDataFirst = rowToEventoData(first)
      const sport = sportFromOddsmatcher(first.sport)
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

      const quotaPuntaPrecisa = sorted.reduce((acc, row) => acc * parseFloat(row.back_odd), 1)
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
        sorted.map((row) => ({
          layOdds: parseFloat(row.lay_odd),
          commissionPercent: 3,
        })),
        rimborsoValore,
      )
      const legsBanca: CreateBetLegPayload[] = sorted.map((row, i) => {
        const layOdds_i = parseFloat(row.lay_odd)
        const { layStake: layStake_i, liability: rischio_i } = multiplaResults[i] ?? {
          layStake: 0,
          liability: 0,
        }
        return {
          eventoData: rowToEventoData(row),
          sport: sportFromOddsmatcher(row.sport),
          eventoNome: `${row.home} - ${row.away}`,
          competizione: row.competition,
          mercato: row.market,
          selezione: row.selection,
          metodo: 'banca' as const,
          tipoBonus: 'none',
          accountId: accountIdBanca,
          stake: layStake_i,
          quota: layOdds_i,
          quotaRiferimento: (() => {
            const n = parseFloat(row.back_odd)
            return Number.isFinite(n) ? n : undefined
          })(),
          rischio: rischio_i,
          commissionePercentuale: 3,
          movimento: 0,
          statoEvento: 'bozza',
          tag: undefined,
        }
      })

      const legsPayload: CreateBetLegPayload[] = [legPunta, ...legsBanca]
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
      <DialogContent className="max-w-md gap-0 overflow-hidden p-0" showClose={true}>
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
                <div className="relative">
                  <select
                    value={accountIdPunta}
                    onChange={(e) => setAccountIdPunta(e.target.value)}
                    className="flex h-10 w-full appearance-none rounded-lg border border-input bg-background pl-3 pr-9 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 [&>option]:bg-background"
                  >
                    <option value="">Seleziona intestatario</option>
                    {accountsPunta.map((acc) => {
                      const holder = holders.find((h) => h.id === acc.holderId)
                      return (
                        <option key={acc.id} value={acc.id}>
                          {holder?.nome ?? acc.nome}
                        </option>
                      )
                    })}
                  </select>
                  <span
                    className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                    aria-hidden
                  >
                    <ChevronDown />
                  </span>
                </div>
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
                <div className="relative">
                  <select
                    value={accountIdBanca}
                    onChange={(e) => setAccountIdBanca(e.target.value)}
                    className="flex h-10 w-full appearance-none rounded-lg border border-input bg-background pl-3 pr-9 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 [&>option]:bg-background"
                  >
                    <option value="">Seleziona intestatario</option>
                    {accountsBanca.map((acc) => {
                      const holder = holders.find((h) => h.id === acc.holderId)
                      return (
                        <option key={acc.id} value={acc.id}>
                          {holder?.nome ?? acc.nome}
                        </option>
                      )
                    })}
                  </select>
                  <span
                    className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                    aria-hidden
                  >
                    <ChevronDown />
                  </span>
                </div>
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
