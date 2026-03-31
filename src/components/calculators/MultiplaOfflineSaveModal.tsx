'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Loader2, Send, X } from 'lucide-react'
import type { Account, Book, Holder } from '@/types/profit-tracker'
import type { OfflineMultiplaEvent } from '@/types/offline-multipla-event'
import type { MultiplaHedgeResult } from '@/lib/calculators/multipla'
import { useProfitTrackerStore } from '@/stores/profit-tracker-store'
import { getAccounts } from '@/services/api/profit-tracker-client'
import { SearchableSelect } from '@/components/ui/searchable-select'

function parseNum(s: string): number | null {
  if (s.trim() === '') return null
  const n = Number.parseFloat(s.replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

function formatNum(n: number | null): string {
  if (n == null || !Number.isFinite(n)) return '—'
  return n.toFixed(2)
}

function getHolderName(holders: Holder[], holderId: string | undefined): string {
  if (!holderId) return ''
  const h = holders.find((x) => x.id === holderId)
  return h?.nome ?? ''
}

interface MultiplaOfflineSaveModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  events: OfflineMultiplaEvent[]
  stakeReale: number
  stakeBonus: number
  rimborso: number
  hedgeResults: MultiplaHedgeResult[]
}

export function MultiplaOfflineSaveModal({
  open,
  onOpenChange,
  events,
  stakeReale,
  stakeBonus,
  rimborso,
  hedgeResults,
}: MultiplaOfflineSaveModalProps) {
  const holders = useProfitTrackerStore((s) => s.allHolders)
  const books = useProfitTrackerStore((s) => s.allBooks)
  const fetchHolders = useProfitTrackerStore((s) => s.fetchAllHolders)
  const fetchAllBooks = useProfitTrackerStore((s) => s.fetchAllBooks)
  const saveOngoingBetFromCalculator = useProfitTrackerStore((s) => s.saveOngoingBetFromCalculator)

  const [holderIdPunta, setHolderIdPunta] = useState('')
  const [holderIdBanca, setHolderIdBanca] = useState('')
  const [accountsPunta, setAccountsPunta] = useState<Account[]>([])
  const [accountsBanca, setAccountsBanca] = useState<Account[]>([])
  const [accountIdPunta, setAccountIdPunta] = useState('')
  const [accountIdBanca, setAccountIdBanca] = useState('')

  const [isLoadingBasics, setIsLoadingBasics] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedBetId, setSavedBetId] = useState<string | null>(null)
  const [dropdownPortalEl, setDropdownPortalEl] = useState<HTMLDivElement | null>(null)
  const [exchangeHolderIds, setExchangeHolderIds] = useState<Set<string>>(new Set())

  const resetState = useCallback(() => {
    setHolderIdPunta('')
    setHolderIdBanca('')
    setAccountsPunta([])
    setAccountsBanca([])
    setAccountIdPunta('')
    setAccountIdBanca('')
    setIsLoadingBasics(false)
    setIsSaving(false)
    setError(null)
    setSavedBetId(null)
    setExchangeHolderIds(new Set())
  }, [])

  useEffect(() => {
    if (!open) {
      resetState()
      return
    }

    const loadBasics = async () => {
      setIsLoadingBasics(true)
      try {
        if (holders.length === 0) {
          await fetchHolders()
        }
        let currentBooks: Book[] = books
        if (currentBooks.length === 0) {
          await fetchAllBooks()
          currentBooks = useProfitTrackerStore.getState().allBooks
        }

        try {
          const allAccounts = await getAccounts({ status: 'abilitato' })
          const exchangeBookIds = new Set(currentBooks.filter((b) => b.isExchange).map((b) => b.id))
          const holderIdsWithExchange = new Set(
            allAccounts.items
              .filter((acc) => exchangeBookIds.has(acc.bookId))
              .map((acc) => acc.holderId),
          )
          setExchangeHolderIds(holderIdsWithExchange)
        } catch {
          // fallback: non filtrare
        }
      } finally {
        setIsLoadingBasics(false)
      }
    }

    void loadBasics()
  }, [open, holders.length, books.length, fetchHolders, fetchAllBooks, resetState, holders, books])

  const loadAccountsForHolder = useCallback(async (holderId: string, forExchange: boolean) => {
    if (!holderId) return []
    const res = await getAccounts({ holderId, status: 'abilitato' })
    if (!res.items.length) return []
    const currentBooks: Book[] = useProfitTrackerStore.getState().allBooks
    return res.items.filter((acc) => {
      const book = currentBooks.find((b) => b.id === acc.bookId)
      if (!book) return false
      return forExchange ? book.isExchange : !book.isExchange
    })
  }, [])

  const handleChangeHolderPunta = useCallback(
    async (holderId: string) => {
      setHolderIdPunta(holderId)
      setAccountsPunta([])
      setAccountIdPunta('')
      if (!holderId) return
      try {
        const list = await loadAccountsForHolder(holderId, false)
        setAccountsPunta(list)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Errore nel caricamento dei conti')
      }
    },
    [loadAccountsForHolder],
  )

  const handleChangeHolderBanca = useCallback(
    async (holderId: string) => {
      setHolderIdBanca(holderId)
      setAccountsBanca([])
      setAccountIdBanca('')
      if (!holderId) return
      try {
        const list = await loadAccountsForHolder(holderId, true)
        setAccountsBanca(list)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Errore nel caricamento dei conti exchange')
      }
    },
    [loadAccountsForHolder],
  )

  const backStakeTotale = stakeReale + stakeBonus
  const totalBackOdds = useMemo(() => {
    return events.reduce((acc, ev) => {
      const odds = parseNum(ev.mainOdds)
      return odds != null && odds > 0 ? acc * odds : acc
    }, 1)
  }, [events])

  const canSave = useMemo(() => {
    if (!accountIdPunta || !accountIdBanca) return false
    if (backStakeTotale <= 0) return false
    if (events.length < 2) return false
    return hedgeResults.every((r) => r.hedgeStake > 0)
  }, [accountIdPunta, accountIdBanca, backStakeTotale, events.length, hedgeResults])

  const handleSave = useCallback(async () => {
    if (!canSave) return
    setIsSaving(true)
    setError(null)
    try {
      const sorted = [...events].sort((a, b) => a.date.localeCompare(b.date))
      const first = sorted[0]
      const eventoDataFirst = new Date(first.date).toISOString()
      const eventoNome = `MULTIPLA ${first.eventName || 'Evento 1'}`

      const betPayload = {
        eventoData: eventoDataFirst,
        sport: first.sport,
        eventoNome,
        modalitaSaldo: 'reale' as const,
        accountId: accountIdPunta,
        tag: undefined as string | undefined,
        nota: undefined as string | undefined,
      }

      const quotaPuntaTotale = Math.round(totalBackOdds * 100) / 100

      const tipoBonus = stakeBonus > 0 ? 'bonus' : rimborso > 0 ? 'rimborso' : 'none'

      const legPunta = {
        eventoData: eventoDataFirst,
        sport: first.sport,
        eventoNome,
        competizione: 'Multipla',
        mercato: 'Multipla',
        selezione: undefined as string | undefined,
        metodo: 'punta' as const,
        tipoBonus,
        accountId: accountIdPunta,
        stake: stakeReale,
        quota: quotaPuntaTotale,
        rischio: stakeReale,
        bonusValore: stakeBonus > 0 ? stakeBonus : undefined,
        rimborsoValore: rimborso > 0 ? rimborso : undefined,
        commissionePercentuale: 0,
        movimento: 0,
        statoEvento: 'bozza',
        tag: undefined as string | undefined,
        posizione: 0,
      }

      // Use original event order (not sorted) because multiplaLayStakes was called with that order
      const legsCopertura = events.map((ev, i) => {
        const hr = hedgeResults[i]
        const coverOdds = parseNum(ev.coverOdds) ?? 0
        const mainOdds = parseNum(ev.mainOdds) ?? 0
        const commission = parseNum(ev.commissionPercent) ?? 0

        return {
          eventoData: new Date(ev.date).toISOString(),
          sport: ev.sport,
          eventoNome: ev.eventName || `Evento ${i + 1}`,
          competizione: ev.competition || 'N/D',
          mercato: ev.market || 'N/D',
          selezione: ev.selection || undefined,
          metodo: (ev.type === 'punta-punta' ? 'punta' : 'banca') as 'punta' | 'banca',
          tipoBonus: 'none',
          accountId: accountIdBanca,
          stake: hr?.hedgeStake ?? 0,
          quota: coverOdds,
          quotaRiferimento: mainOdds > 0 ? mainOdds : undefined,
          rischio: hr?.hedgeCost ?? 0,
          commissionePercentuale: commission,
          movimento: 0,
          statoEvento: 'bozza',
          tag: undefined as string | undefined,
          posizione: i + 1,
        }
      })

      const legsPayload = [legPunta, ...legsCopertura]
      const bet = await saveOngoingBetFromCalculator(betPayload, legsPayload)
      setSavedBetId(bet.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore nel salvataggio della multipla.')
    } finally {
      setIsSaving(false)
    }
  }, [
    canSave,
    events,
    hedgeResults,
    totalBackOdds,
    stakeReale,
    stakeBonus,
    rimborso,
    accountIdPunta,
    accountIdBanca,
    saveOngoingBetFromCalculator,
  ])

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) resetState()
        onOpenChange(next)
      }}
    >
      <DialogContent className="max-h-[85vh] max-w-lg gap-0 overflow-y-auto p-0" showClose={true}>
        <div
          ref={setDropdownPortalEl}
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
                La multipla è stata salvata correttamente nel Profit Tracker.
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
                  resetState()
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
                Salva Multipla
              </DialogTitle>
              <p className="mt-1.5 text-sm text-muted-foreground">
                Assegna gli intestatari per la puntata e per le coperture della multipla.
              </p>
            </div>

            <div className="grid gap-4 px-6 py-5">
              {/* Intestatario Punta */}
              <div className="space-y-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
                <Label className="text-xs font-medium uppercase tracking-wide text-primary">
                  Intestatario Punta
                </Label>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Seleziona intestatario</Label>
                  <SearchableSelect
                    id="holder-punta"
                    placeholder="Seleziona intestatario"
                    searchPlaceholder="Cerca intestatario..."
                    options={holders
                      .filter((h) => h.stato === 'abilitato')
                      .map((h) => ({ value: h.id, label: h.nome }))}
                    value={holderIdPunta}
                    onChange={(val) => void handleChangeHolderPunta(val)}
                    allowEmpty={false}
                    size="sm"
                    className="w-full"
                    portalContainer={dropdownPortalEl}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Conto punta</Label>
                  <SearchableSelect
                    id="account-punta"
                    placeholder={
                      holderIdPunta ? 'Seleziona conto' : 'Seleziona prima un intestatario'
                    }
                    searchPlaceholder="Cerca conto..."
                    options={accountsPunta.map((acc) => {
                      const holderName = getHolderName(holders, acc.holderId)
                      const book = books.find((b) => b.id === acc.bookId)
                      return {
                        value: acc.id,
                        label: `${holderName} • ${book?.nome ?? acc.nome}`,
                      }
                    })}
                    value={accountIdPunta}
                    onChange={setAccountIdPunta}
                    disabled={!holderIdPunta || accountsPunta.length === 0}
                    allowEmpty={false}
                    size="sm"
                    className="w-full"
                    portalContainer={dropdownPortalEl}
                  />
                  {holderIdPunta && accountsPunta.length === 0 && (
                    <p className="rounded-md bg-amber-500/10 px-3 py-2 text-xs text-amber-600 dark:text-amber-400">
                      Nessun conto punta disponibile per questo intestatario. Aggiungine uno in
                      Profit Tracker → Conti.
                    </p>
                  )}
                </div>
              </div>

              {/* Intestatario Banca */}
              <div className="space-y-3 rounded-xl border border-destructive/20 bg-destructive/5 p-4">
                <Label className="text-xs font-medium uppercase tracking-wide text-destructive">
                  Intestatario Copertura
                </Label>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Seleziona intestatario</Label>
                  <SearchableSelect
                    id="holder-banca"
                    placeholder="Seleziona intestatario"
                    searchPlaceholder="Cerca intestatario..."
                    options={holders
                      .filter(
                        (h) =>
                          h.stato === 'abilitato' &&
                          (exchangeHolderIds.size === 0 || exchangeHolderIds.has(h.id)),
                      )
                      .map((h) => ({ value: h.id, label: h.nome }))}
                    value={holderIdBanca}
                    onChange={(val) => void handleChangeHolderBanca(val)}
                    allowEmpty={false}
                    size="sm"
                    className="w-full"
                    portalContainer={dropdownPortalEl}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">
                    Conto copertura (exchange)
                  </Label>
                  <SearchableSelect
                    id="account-banca"
                    placeholder={
                      holderIdBanca ? 'Seleziona conto exchange' : 'Seleziona prima un intestatario'
                    }
                    searchPlaceholder="Cerca conto exchange..."
                    options={accountsBanca.map((acc) => {
                      const holderName = getHolderName(holders, acc.holderId)
                      const book = books.find((b) => b.id === acc.bookId)
                      return {
                        value: acc.id,
                        label: `${holderName} • ${book?.nome ?? acc.nome}`,
                      }
                    })}
                    value={accountIdBanca}
                    onChange={setAccountIdBanca}
                    disabled={!holderIdBanca || accountsBanca.length === 0}
                    allowEmpty={false}
                    size="sm"
                    className="w-full"
                    portalContainer={dropdownPortalEl}
                  />
                  {holderIdBanca && accountsBanca.length === 0 && (
                    <p className="rounded-md bg-amber-500/10 px-3 py-2 text-xs text-amber-600 dark:text-amber-400">
                      Nessun conto exchange disponibile per questo intestatario. Aggiungine uno in
                      Profit Tracker → Conti.
                    </p>
                  )}
                </div>
              </div>

              {/* Riepilogo importi */}
              <div className="rounded-md bg-muted/30 p-3 text-xs text-muted-foreground">
                <p className="font-medium text-foreground">Riepilogo multipla</p>
                <p className="mt-1">
                  Punta: <span className="font-mono">{formatNum(backStakeTotale)} €</span>
                  {stakeBonus > 0 && <span> (di cui {formatNum(stakeBonus)} € bonus)</span>} a quota{' '}
                  <span className="font-mono">
                    {formatNum(Math.round(totalBackOdds * 100) / 100)}
                  </span>
                </p>
                <p className="mt-1 font-medium text-foreground">
                  Coperture ({events.length} eventi):
                </p>
                {events.map((ev, i) => {
                  const hr = hedgeResults[i]
                  return (
                    <p key={ev.id} className="ml-2">
                      {ev.eventName || `Evento ${i + 1}`}:{' '}
                      <span className="font-mono">{formatNum(hr?.hedgeStake ?? null)} €</span>
                      {ev.type === 'punta-banca' ? ' (banca)' : ' (punta 2)'}
                      <span className="text-muted-foreground/70">
                        {' '}
                        — resp. {formatNum(hr?.hedgeCost ?? null)} €
                      </span>
                    </p>
                  )
                })}
              </div>

              {error && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {error}
                </div>
              )}
            </div>

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
                variant="success"
                className="sm:min-w-[120px]"
                onClick={() => void handleSave()}
                disabled={isSaving || !canSave}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                    Salvataggio...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Salva nel Profit Tracker
                  </>
                )}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
