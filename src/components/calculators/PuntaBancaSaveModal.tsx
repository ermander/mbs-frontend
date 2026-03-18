'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Send, X } from 'lucide-react'
import Link from 'next/link'
import type { TipologiaCalcolo } from '@/stores/agenda-store'
import type { Account, Book, Holder } from '@/types/profit-tracker'
import { useProfitTrackerStore } from '@/stores/profit-tracker-store'
import { getAccounts } from '@/services/api/profit-tracker-client'
import { SearchableSelect } from '@/components/ui/searchable-select'

interface PuntaBancaSaveModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void

  tipologia: TipologiaCalcolo

  puntataEffettiva: number
  puntataNum: number
  bonusNum: number
  rimborsoNum: number
  quotaPuntaNum: number
  quotaBancaNum: number
  layStake: number
  responsabilita: number
  commissioneNum: number
}

function getDefaultEventDateTimeLocal(): string {
  const now = new Date()
  const withMinutes = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    now.getHours(),
    now.getMinutes(),
  )
  return withMinutes.toISOString().slice(0, 16)
}

function getHolderName(holders: Holder[], holderId: string | undefined): string {
  if (!holderId) return ''
  const h = holders.find((x) => x.id === holderId)
  return h?.nome ?? ''
}

export function PuntaBancaSaveModal({
  open,
  onOpenChange,
  tipologia,
  puntataEffettiva,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- API consistency; puntataEffettiva used for stake
  puntataNum,
  bonusNum,
  rimborsoNum,
  quotaPuntaNum,
  quotaBancaNum,
  layStake,
  responsabilita,
  commissioneNum,
}: PuntaBancaSaveModalProps) {
  const holders = useProfitTrackerStore((s) => s.holders)
  const books = useProfitTrackerStore((s) => s.books)
  const fetchHolders = useProfitTrackerStore((s) => s.fetchHolders)
  const fetchBooks = useProfitTrackerStore((s) => s.fetchBooks)
  const saveOngoingBetFromCalculator = useProfitTrackerStore((s) => s.saveOngoingBetFromCalculator)

  const [eventoNome, setEventoNome] = useState('')
  const [eventoDataLocal, setEventoDataLocal] = useState(getDefaultEventDateTimeLocal)
  const [mercato, setMercato] = useState('')

  const [holderIdPunta, setHolderIdPunta] = useState('')
  const [holderIdBanca, setHolderIdBanca] = useState('')
  const [accountsPunta, setAccountsPunta] = useState<Account[]>([])
  const [accountsBanca, setAccountsBanca] = useState<Account[]>([])
  const [accountIdPunta, setAccountIdPunta] = useState('')
  const [accountIdBanca, setAccountIdBanca] = useState('')

  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedBetId, setSavedBetId] = useState<string | null>(null)
  const [dropdownPortalEl, setDropdownPortalEl] = useState<HTMLDivElement | null>(null)

  const resetState = useCallback(() => {
    setEventoNome('')
    setEventoDataLocal(getDefaultEventDateTimeLocal())
    setMercato('')
    setHolderIdPunta('')
    setHolderIdBanca('')
    setAccountsPunta([])
    setAccountsBanca([])
    setAccountIdPunta('')
    setAccountIdBanca('')
    setIsSaving(false)
    setError(null)
    setSavedBetId(null)
  }, [])

  useEffect(() => {
    if (!open) {
      resetState()
      return
    }

    const loadBasics = async () => {
      if (holders.length === 0) {
        await fetchHolders()
      }
      let currentBooks: Book[] = books
      if (currentBooks.length === 0) {
        await fetchBooks()
        currentBooks = useProfitTrackerStore.getState().books
      }
      if (!mercato) {
        const hasExchangeBooks = currentBooks.some((b) => b.isExchange)
        if (hasExchangeBooks) {
          setMercato('Punta-Banca')
        }
      }
    }

    void loadBasics()
  }, [
    open,
    holders.length,
    books.length,
    fetchHolders,
    fetchBooks,
    mercato,
    resetState,
    holders,
    books,
  ])

  const loadAccountsForHolder = useCallback(async (holderId: string, forExchange: boolean) => {
    if (!holderId) {
      return []
    }
    const res = await getAccounts({ holderId, status: 'abilitato' })
    if (!res.items.length) return []
    const currentBooks: Book[] = useProfitTrackerStore.getState().books
    const filtered = res.items.filter((acc) => {
      const book = currentBooks.find((b) => b.id === acc.bookId)
      if (!book) return false
      return forExchange ? book.isExchange : !book.isExchange
    })
    return filtered
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

  const canSave = useMemo(() => {
    if (!eventoNome.trim()) return false
    if (!mercato.trim()) return false
    if (!eventoDataLocal) return false
    if (!accountIdPunta || !accountIdBanca) return false
    if (!Number.isFinite(puntataEffettiva) || puntataEffettiva <= 0) return false
    if (!Number.isFinite(quotaPuntaNum) || !Number.isFinite(quotaBancaNum)) return false
    if (!Number.isFinite(layStake) || layStake <= 0) return false
    if (!Number.isFinite(responsabilita) || responsabilita <= 0) return false
    return true
  }, [
    eventoNome,
    mercato,
    eventoDataLocal,
    accountIdPunta,
    accountIdBanca,
    puntataEffettiva,
    quotaPuntaNum,
    quotaBancaNum,
    layStake,
    responsabilita,
  ])

  const tipoBonus = useMemo(() => {
    if (tipologia === 'RIMBORSO (CR%)') return 'rimborso'
    if (tipologia === 'BONUS') return 'bonus'
    return 'none'
  }, [tipologia])

  const handleSave = useCallback(async () => {
    if (!canSave) return
    setIsSaving(true)
    setError(null)
    try {
      const eventoDataIso = new Date(eventoDataLocal).toISOString()
      const betPayload = {
        eventoData: eventoDataIso,
        sport: 'altro' as const,
        eventoNome,
        modalitaSaldo: 'reale' as const,
        accountId: accountIdPunta,
        tag: undefined as string | undefined,
        nota: undefined as string | undefined,
      }

      const legsPayload = [
        {
          eventoData: eventoDataIso,
          sport: 'altro',
          eventoNome,
          competizione: 'N/D',
          mercato,
          metodo: 'punta' as const,
          tipoBonus,
          accountId: accountIdPunta,
          stake: puntataEffettiva,
          quota: quotaPuntaNum,
          rischio: 0,
          bonusValore: tipologia === 'BONUS' ? bonusNum || undefined : undefined,
          rimborsoValore: tipologia === 'RIMBORSO (CR%)' ? rimborsoNum || undefined : undefined,
          commissionePercentuale: commissioneNum,
          movimento: 0,
          statoEvento: 'bozza',
          quotaRiferimento: undefined,
          tag: undefined as string | undefined,
        },
        {
          eventoData: eventoDataIso,
          sport: 'altro',
          eventoNome,
          competizione: 'N/D',
          mercato,
          metodo: 'banca' as const,
          tipoBonus,
          accountId: accountIdBanca,
          stake: layStake,
          quota: quotaBancaNum,
          quotaRiferimento: quotaPuntaNum,
          rischio: responsabilita,
          bonusValore: undefined,
          rimborsoValore: undefined,
          commissionePercentuale: commissioneNum,
          movimento: 0,
          statoEvento: 'bozza',
          tag: undefined as string | undefined,
        },
      ]

      const bet = await saveOngoingBetFromCalculator(betPayload, legsPayload)
      if (process.env.NODE_ENV !== 'production') {
        await new Promise((r) => setTimeout(r, 500))
      }
      setSavedBetId(bet.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore nel salvataggio della giocata')
    } finally {
      setIsSaving(false)
    }
  }, [
    canSave,
    eventoDataLocal,
    eventoNome,
    mercato,
    accountIdPunta,
    accountIdBanca,
    puntataEffettiva,
    quotaPuntaNum,
    quotaBancaNum,
    layStake,
    responsabilita,
    tipoBonus,
    commissioneNum,
    bonusNum,
    rimborsoNum,
    tipologia,
    saveOngoingBetFromCalculator,
  ])

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          resetState()
        }
        onOpenChange(next)
      }}
    >
      <DialogContent className="max-h-[85vh] max-w-lg gap-0 overflow-y-auto p-0" showClose={true}>
        {/* Container per i dropdown SearchableSelect: in-modal portal così ricevono i click (Radix blocca body) */}
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
                  resetState()
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
                Salva giocata Punta-Banca
              </DialogTitle>
              <p className="mt-1.5 text-sm text-muted-foreground">
                Compila i dettagli dell&apos;evento e assegna gli intestatari per puntata e bancata.
              </p>
            </div>

            <div className="grid gap-4 px-6 py-5">
              <div className="space-y-2">
                <Label htmlFor="evento-nome">Nome evento</Label>
                <Input
                  id="evento-nome"
                  value={eventoNome}
                  onChange={(e) => setEventoNome(e.target.value)}
                  placeholder="Es. Juventus - Milan"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="evento-data">Data e ora evento</Label>
                <Input
                  id="evento-data"
                  type="datetime-local"
                  value={eventoDataLocal}
                  onChange={(e) => setEventoDataLocal(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="mercato">Mercato</Label>
                <Input
                  id="mercato"
                  value={mercato}
                  onChange={(e) => setMercato(e.target.value)}
                  placeholder="Es. Esito finale 1X2"
                />
              </div>

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

              <div className="space-y-3 rounded-xl border border-destructive/20 bg-destructive/5 p-4">
                <Label className="text-xs font-medium uppercase tracking-wide text-destructive">
                  Intestatario Banca
                </Label>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Seleziona intestatario</Label>
                  <SearchableSelect
                    id="holder-banca"
                    placeholder="Seleziona intestatario"
                    searchPlaceholder="Cerca intestatario..."
                    options={holders
                      .filter((h) => h.stato === 'abilitato')
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
                  <Label className="text-xs text-muted-foreground">Conto bancata (exchange)</Label>
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

              <div className="rounded-md bg-muted/30 p-3 text-xs text-muted-foreground">
                <p className="font-medium text-foreground">Riepilogo importi</p>
                <p className="mt-1">
                  Punta: <span className="font-mono">{puntataEffettiva.toFixed(2)} €</span> a quota{' '}
                  <span className="font-mono">{quotaPuntaNum.toFixed(2)}</span>
                </p>
                <p>
                  Banca: <span className="font-mono">{layStake.toFixed(2)} €</span> a quota{' '}
                  <span className="font-mono">{quotaBancaNum.toFixed(2)}</span> con responsabilità{' '}
                  <span className="font-mono">{responsabilita.toFixed(2)} €</span>.
                </p>
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
