'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ChevronDown, Loader2, Send, X } from 'lucide-react'
import { equalProfit, ratingPercent, stakeBFromStakeA } from '@/lib/calculators/punta-punta'
import { useProfitTrackerStore } from '@/stores/profit-tracker-store'
import { getAccounts, type CreateBetLegPayload } from '@/services/api/profit-tracker-client'
import { SearchableSelect } from '@/components/ui/searchable-select'
import type { Account, Holder } from '@/types/profit-tracker'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

const TIPOLOGIE = ['NORMALE'] as const

const MERCATI_PUNTA_PUNTA = [
  '1X2 - 1',
  '1X2 - X',
  '1X2 - 2',
  'Under/Over 0.5 - Under',
  'Under/Over 0.5 - Over',
  'Under/Over 1.5 - Under',
  'Under/Over 1.5 - Over',
  'Under/Over 2.5 - Under',
  'Under/Over 2.5 - Over',
  'Under/Over 3.5 - Under',
  'Under/Over 3.5 - Over',
  'GG/NG - GG',
  'GG/NG - NG',
  'Doppia Chance - 1X',
  'Doppia Chance - X2',
  'Doppia Chance - 12',
  'Handicap',
  'Parziale/Finale',
  'Altro',
] as const

function parseNum(s: string): number | null {
  if (s.trim() === '') return null
  const n = Number.parseFloat(s.replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

function formatNum(n: number | null): string {
  if (n == null || !Number.isFinite(n)) return '—'
  return n.toFixed(2)
}

function formatSigned(n: number): string {
  if (!Number.isFinite(n)) return '—'
  const v = n.toFixed(2)
  return n >= 0 ? `+${v}` : v
}

function defaultEventoData(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  const h = String(now.getHours()).padStart(2, '0')
  const min = String(now.getMinutes()).padStart(2, '0')
  return `${y}-${m}-${d}T${h}:${min}`
}

function getHolderName(holders: Holder[], holderId: string | undefined): string {
  if (!holderId) return ''
  const h = holders.find((x) => x.id === holderId)
  return h?.nome ?? ''
}

export function PuntaPuntaCalculator() {
  const books = useProfitTrackerStore((s) => s.books)
  const holders = useProfitTrackerStore((s) => s.holders)
  const fetchHolders = useProfitTrackerStore((s) => s.fetchHolders)
  const fetchBooks = useProfitTrackerStore((s) => s.fetchBooks)
  const saveOngoingBetFromCalculator = useProfitTrackerStore((s) => s.saveOngoingBetFromCalculator)

  const [tipologia, setTipologia] = useState<(typeof TIPOLOGIE)[number]>('NORMALE')
  const [puntataA, setPuntataA] = useState('100')
  const [quotaA, setQuotaA] = useState('2.3')
  const [quotaB, setQuotaB] = useState('2.5')
  const [bonus, setBonus] = useState('')
  const [holderModalOpen, setHolderModalOpen] = useState(false)
  const [holderIdPuntaA, setHolderIdPuntaA] = useState('')
  const [holderIdPuntaB, setHolderIdPuntaB] = useState('')
  const [accountsPuntaA, setAccountsPuntaA] = useState<Account[]>([])
  const [accountsPuntaB, setAccountsPuntaB] = useState<Account[]>([])
  const [accountIdPuntaA, setAccountIdPuntaA] = useState('')
  const [accountIdPuntaB, setAccountIdPuntaB] = useState('')
  const [eventoData, setEventoData] = useState(() => defaultEventoData())
  const [eventoNome, setEventoNome] = useState('')
  const [mercatoPuntaA, setMercatoPuntaA] = useState('')
  const [mercatoPuntaB, setMercatoPuntaB] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [holderModalError, setHolderModalError] = useState<string | null>(null)
  const [savedBetId, setSavedBetId] = useState<string | null>(null)
  const [dropdownPortalEl, setDropdownPortalEl] = useState<HTMLDivElement | null>(null)

  const puntataANum = parseNum(puntataA)
  const bonusNum = parseNum(bonus) ?? 0
  const puntataEffettivaA = (puntataANum ?? 0) + bonusNum
  const quotaANum = parseNum(quotaA)
  const quotaBNum = parseNum(quotaB)

  const stakeB = useMemo(() => {
    if (puntataEffettivaA <= 0 || quotaANum == null || quotaBNum == null) return null
    return stakeBFromStakeA(puntataEffettivaA, quotaANum, quotaBNum)
  }, [puntataEffettivaA, quotaANum, quotaBNum])

  const guadagnoMinimo = useMemo(() => {
    if (stakeB == null || quotaANum == null || quotaBNum == null) return null
    const base = equalProfit(puntataEffettivaA, quotaANum, stakeB, quotaBNum)
    if (base == null) return null
    return base + bonusNum
  }, [puntataEffettivaA, stakeB, quotaANum, quotaBNum, bonusNum])

  const rating = useMemo(() => {
    if (quotaANum == null || quotaBNum == null || quotaANum <= 0 || quotaBNum <= 0) return null
    return ratingPercent(quotaANum, quotaBNum)
  }, [quotaANum, quotaBNum])

  const showSummary =
    puntataEffettivaA > 0 &&
    quotaANum != null &&
    quotaANum > 0 &&
    quotaBNum != null &&
    quotaBNum > 0 &&
    stakeB != null &&
    guadagnoMinimo != null

  const loadAccountsForHolder = useCallback(async (holderId: string) => {
    if (!holderId) return []
    const res = await getAccounts({ holderId, status: 'abilitato' })
    if (!res.items.length) return []
    const currentBooks = useProfitTrackerStore.getState().books
    return res.items.filter((acc) => {
      const book = currentBooks.find((b) => b.id === acc.bookId)
      if (!book) return false
      return !book.isExchange
    })
  }, [])

  const handleChangeHolderPuntaA = useCallback(
    async (holderId: string) => {
      setHolderIdPuntaA(holderId)
      setAccountsPuntaA([])
      setAccountIdPuntaA('')
      if (!holderId) return
      try {
        const list = await loadAccountsForHolder(holderId)
        setAccountsPuntaA(list)
      } catch (err) {
        setHolderModalError(err instanceof Error ? err.message : 'Errore nel caricamento dei conti')
      }
    },
    [loadAccountsForHolder],
  )

  const handleChangeHolderPuntaB = useCallback(
    async (holderId: string) => {
      setHolderIdPuntaB(holderId)
      setAccountsPuntaB([])
      setAccountIdPuntaB('')
      if (!holderId) return
      try {
        const list = await loadAccountsForHolder(holderId)
        setAccountsPuntaB(list)
      } catch (err) {
        setHolderModalError(err instanceof Error ? err.message : 'Errore nel caricamento dei conti')
      }
    },
    [loadAccountsForHolder],
  )

  useEffect(() => {
    if (!holderModalOpen || savedBetId) return
    const loadBasics = async () => {
      if (holders.length === 0) await fetchHolders()
      if (books.length === 0) await fetchBooks()
    }
    void loadBasics()
  }, [holderModalOpen, savedBetId, holders.length, books.length, fetchHolders, fetchBooks])

  const resetModalState = useCallback(() => {
    setHolderIdPuntaA('')
    setHolderIdPuntaB('')
    setAccountsPuntaA([])
    setAccountsPuntaB([])
    setAccountIdPuntaA('')
    setAccountIdPuntaB('')
    setHolderModalError(null)
    setSavedBetId(null)
  }, [])

  const handleOpenModal = () => {
    resetModalState()
    setEventoData(defaultEventoData())
    setHolderModalOpen(true)
  }

  const canSave = useMemo(() => {
    if (!eventoNome.trim()) return false
    if (!accountIdPuntaA || !accountIdPuntaB) return false
    if (
      puntataEffettivaA <= 0 ||
      quotaANum == null ||
      quotaBNum == null ||
      stakeB == null ||
      guadagnoMinimo == null
    )
      return false
    return true
  }, [
    eventoNome,
    accountIdPuntaA,
    accountIdPuntaB,
    puntataEffettivaA,
    quotaANum,
    quotaBNum,
    stakeB,
    guadagnoMinimo,
  ])

  const handleSendToProfitTracker = async () => {
    if (!canSave) return
    if (quotaANum == null || quotaBNum == null || stakeB == null) return
    const eventoDataIso = new Date(eventoData).toISOString()
    const eventoNomeVal = eventoNome.trim() || 'Punta-Punta'
    const competizione = 'N/D'
    setIsSaving(true)
    setHolderModalError(null)
    try {
      const betPayload = {
        eventoData: eventoDataIso,
        sport: 'calcio' as const,
        eventoNome: eventoNomeVal,
        modalitaSaldo: 'reale' as const,
        accountId: accountIdPuntaA,
        tag: undefined as string | undefined,
        nota: undefined as string | undefined,
      }
      const legsPayload: CreateBetLegPayload[] = [
        {
          eventoData: eventoDataIso,
          sport: 'calcio',
          eventoNome: eventoNomeVal,
          competizione,
          mercato: mercatoPuntaA || '—',
          metodo: 'punta' as const,
          tipoBonus: bonusNum > 0 ? 'bonus' : 'none',
          accountId: accountIdPuntaA,
          stake: puntataEffettivaA,
          quota: quotaANum,
          rischio: 0,
          bonusValore: bonusNum > 0 ? bonusNum : undefined,
          rimborsoValore: undefined,
          commissionePercentuale: 0,
          movimento: 0,
          statoEvento: 'bozza',
          tag: undefined as string | undefined,
        },
        {
          eventoData: eventoDataIso,
          sport: 'calcio',
          eventoNome: eventoNomeVal,
          competizione,
          mercato: mercatoPuntaB || '—',
          metodo: 'punta' as const,
          tipoBonus: 'none',
          accountId: accountIdPuntaB,
          stake: stakeB,
          quota: quotaBNum,
          rischio: 0,
          bonusValore: undefined,
          rimborsoValore: undefined,
          commissionePercentuale: 0,
          movimento: 0,
          statoEvento: 'bozza',
          tag: undefined as string | undefined,
        },
      ]
      const bet = await saveOngoingBetFromCalculator(betPayload, legsPayload)
      setSavedBetId(bet.id)
    } catch (err) {
      setHolderModalError(err instanceof Error ? err.message : 'Errore nel salvataggio')
    } finally {
      setIsSaving(false)
    }
  }

  const realOutlay = (puntataANum ?? 0) + (stakeB ?? 0)
  const profitIfAWins =
    quotaANum != null && stakeB != null ? puntataEffettivaA * quotaANum - realOutlay : null
  const profitIfBWins = stakeB != null && quotaBNum != null ? stakeB * quotaBNum - realOutlay : null
  const returnA = quotaANum != null ? puntataEffettivaA * quotaANum : null
  const returnB = stakeB != null && quotaBNum != null ? stakeB * quotaBNum : null

  return (
    <div className="mx-auto max-w-2xl rounded-lg border border-border bg-card p-0 shadow-xl backdrop-blur-xl">
      {/* Barra superiore */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-card px-3 py-2 backdrop-blur-xl">
        <div className="flex items-center gap-2">
          <Label htmlFor="tipologia" className="text-sm text-muted-foreground">
            Tipologia
          </Label>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                id="tipologia"
                variant="secondary"
                size="sm"
                className="min-w-[10rem] justify-between"
              >
                {tipologia}
                <ChevronDown className="h-4 w-4 opacity-70" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {TIPOLOGIE.map((t) => (
                <DropdownMenuItem key={t} onSelect={() => setTipologia(t)}>
                  {t}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Sezione input */}
      <div className="border-b border-border bg-primary/5 p-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="puntata-a">Puntata A</Label>
            <div className="relative">
              <Input
                id="puntata-a"
                type="number"
                inputMode="decimal"
                placeholder="0"
                value={puntataA}
                onChange={(e) => setPuntataA(e.target.value)}
                className="pr-8"
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                €
              </span>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="quota-a">Quota Punta A</Label>
            <div className="relative">
              <Input
                id="quota-a"
                type="number"
                inputMode="decimal"
                step="0.01"
                placeholder="0"
                value={quotaA}
                onChange={(e) => setQuotaA(e.target.value)}
                className="pr-8"
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                @
              </span>
            </div>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="quota-b">Quota Punta B</Label>
            <div className="relative">
              <Input
                id="quota-b"
                type="number"
                inputMode="decimal"
                step="0.01"
                placeholder="0"
                value={quotaB}
                onChange={(e) => setQuotaB(e.target.value)}
                className="pr-8"
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                @
              </span>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="bonus">Saldo bonus (opz.)</Label>
            <div className="relative">
              <Input
                id="bonus"
                type="number"
                inputMode="decimal"
                placeholder="0"
                value={bonus}
                onChange={(e) => setBonus(e.target.value)}
                className="pr-8"
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                €
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Riepilogo */}
      {showSummary && (
        <div className="border-b border-border bg-card">
          <div className="border-b border-border bg-muted px-4 py-2 text-center text-sm font-medium text-foreground">
            Riepilogo
          </div>
          <div className="space-y-2 p-4 text-sm">
            {rating != null && <p>Rating: {rating.toFixed(2)}%</p>}
            <p>
              Punta{' '}
              <span className="font-mono font-medium text-primary">
                {formatNum(puntataEffettivaA)} €
              </span>
              {bonusNum > 0 && (
                <span className="text-muted-foreground">
                  {' '}
                  (di cui {formatNum(bonusNum)} € bonus)
                </span>
              )}{' '}
              a quota <span className="font-mono">{formatNum(quotaANum)}</span> sul Book A.
            </p>
            <p>
              Punta{' '}
              <span className="font-mono font-medium text-primary">{formatNum(stakeB)} €</span> a
              quota <span className="font-mono">{formatNum(quotaBNum)}</span> sul Book B.
            </p>
            <p>
              Il guadagno minimo sarà{' '}
              <span
                className={cn(
                  'font-mono',
                  guadagnoMinimo >= 0 ? 'text-primary' : 'text-destructive',
                )}
              >
                {formatSigned(guadagnoMinimo)} €
              </span>
            </p>
          </div>
        </div>
      )}

      {/* Tabella dei profitti */}
      {showSummary &&
        returnA != null &&
        returnB != null &&
        profitIfAWins != null &&
        profitIfBWins != null && (
          <div className="border-b border-border bg-card">
            <div className="border-b border-border bg-muted px-4 py-2 text-center text-sm font-medium text-foreground">
              Tabella dei profitti
            </div>

            {/* Layout a card solo su mobile (< sm) */}
            <div className="block space-y-3 p-4 sm:hidden">
              <div className="rounded-xl border border-border bg-primary/10 p-4">
                <p className="mb-3 text-sm font-medium text-foreground">Se vinci sul Book A:</p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Book A</span>
                    <span className="text-primary">
                      {formatSigned(
                        bonusNum > 0 ? returnA - (puntataANum ?? 0) : returnA - puntataEffettivaA,
                      )}{' '}
                      €
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Book B</span>
                    <span className="text-destructive">{formatSigned(-(stakeB ?? 0))} €</span>
                  </div>
                  <div className="flex justify-between border-t border-border pt-2 font-medium">
                    <span className="text-foreground">Totale</span>
                    <span className={cn(profitIfAWins >= 0 ? 'text-primary' : 'text-destructive')}>
                      = {formatSigned(profitIfAWins)} €
                    </span>
                  </div>
                </div>
              </div>
              <div className="rounded-xl border border-border bg-primary/10 p-4">
                <p className="mb-3 text-sm font-medium text-foreground">Se vinci sul Book B:</p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Book A</span>
                    <span className="text-destructive">
                      {formatSigned(bonusNum > 0 ? -(puntataANum ?? 0) : -puntataEffettivaA)} €
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Book B</span>
                    <span className="text-primary">
                      {formatSigned((returnB ?? 0) - (stakeB ?? 0))} €
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-border pt-2 font-medium">
                    <span className="text-foreground">Totale</span>
                    <span className={cn(profitIfBWins >= 0 ? 'text-primary' : 'text-destructive')}>
                      = {formatSigned(profitIfBWins)} €
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Tabella da sm in su */}
            <div className="hidden overflow-x-auto sm:block">
              <table className="w-full whitespace-nowrap text-sm">
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
                    <th className="w-[50%] p-3 text-left font-normal"></th>
                    <th className="w-[16%] p-3 text-right font-normal">Book A</th>
                    <th className="w-[16%] p-3 text-right font-normal">Book B</th>
                    <th className="w-[18%] min-w-[5.5rem] p-3 text-right font-normal">Totale</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-border bg-primary/10 transition-colors hover:bg-accent">
                    <td className="p-3">Se vinci sul Book A:</td>
                    <td className="p-3 text-right text-primary">
                      {formatSigned(
                        bonusNum > 0 ? returnA - (puntataANum ?? 0) : returnA - puntataEffettivaA,
                      )}
                    </td>
                    <td className="p-3 text-right text-destructive">
                      {formatSigned(-(stakeB ?? 0))}
                    </td>
                    <td className="min-w-[5.5rem] whitespace-nowrap p-3 text-right">
                      <span
                        className={cn(profitIfAWins >= 0 ? 'text-primary' : 'text-destructive')}
                      >
                        = {formatSigned(profitIfAWins)} €
                      </span>
                    </td>
                  </tr>
                  <tr className="bg-primary/10 transition-colors hover:bg-accent">
                    <td className="p-3">Se vinci sul Book B:</td>
                    <td className="p-3 text-right text-destructive">
                      {formatSigned(bonusNum > 0 ? -(puntataANum ?? 0) : -puntataEffettivaA)}
                    </td>
                    <td className="p-3 text-right text-primary">
                      {formatSigned((returnB ?? 0) - (stakeB ?? 0))}
                    </td>
                    <td className="min-w-[5.5rem] whitespace-nowrap p-3 text-right">
                      <span
                        className={cn(profitIfBWins >= 0 ? 'text-primary' : 'text-destructive')}
                      >
                        = {formatSigned(profitIfBWins)} €
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

      {/* Invia al Profit Tracker */}
      <div className="flex flex-col items-center gap-2 p-4">
        <Button onClick={handleOpenModal} variant="default" disabled={!showSummary}>
          Invia al Profit Tracker
        </Button>
      </div>

      {/* Modale: Assegna intestatari e dati evento */}
      <Dialog
        open={holderModalOpen}
        onOpenChange={(open) => {
          setHolderModalOpen(open)
          if (!open) resetModalState()
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
                    setHolderModalOpen(false)
                    setSavedBetId(null)
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
                  Salva giocata Punta-Punta
                </DialogTitle>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  Compila i dettagli dell&apos;evento e assegna gli intestatari per puntata 1 e
                  puntata 2.
                </p>
              </div>

              <div className="grid gap-4 px-6 py-5">
                <div className="space-y-2">
                  <Label htmlFor="pp-modal-evento">Nome evento</Label>
                  <Input
                    id="pp-modal-evento"
                    type="text"
                    placeholder="Es. Juventus - Milan"
                    value={eventoNome}
                    onChange={(e) => setEventoNome(e.target.value)}
                    className="h-10"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pp-modal-data">Data e ora evento</Label>
                  <Input
                    id="pp-modal-data"
                    type="datetime-local"
                    value={eventoData}
                    onChange={(e) => setEventoData(e.target.value)}
                    className="h-10"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pp-modal-mercato-a">Mercato Punta 1</Label>
                  <select
                    id="pp-modal-mercato-a"
                    value={mercatoPuntaA}
                    onChange={(e) => setMercatoPuntaA(e.target.value)}
                    className="flex h-10 w-full appearance-none rounded-lg border border-input bg-background pl-3 pr-9 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 [&>option]:bg-background"
                  >
                    <option value="">Seleziona</option>
                    {MERCATI_PUNTA_PUNTA.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pp-modal-mercato-b">Mercato Punta 2</Label>
                  <select
                    id="pp-modal-mercato-b"
                    value={mercatoPuntaB}
                    onChange={(e) => setMercatoPuntaB(e.target.value)}
                    className="flex h-10 w-full appearance-none rounded-lg border border-input bg-background pl-3 pr-9 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 [&>option]:bg-background"
                  >
                    <option value="">Seleziona</option>
                    {MERCATI_PUNTA_PUNTA.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <Label className="text-xs font-medium uppercase tracking-wide text-primary">
                      Intestatario Punta 1
                    </Label>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Seleziona intestatario</Label>
                    <SearchableSelect
                      id="holder-punta-a"
                      placeholder="Seleziona intestatario"
                      searchPlaceholder="Cerca intestatario..."
                      options={holders
                        .filter((h) => h.stato === 'abilitato')
                        .map((h) => ({ value: h.id, label: h.nome }))}
                      value={holderIdPuntaA}
                      onChange={(val) => void handleChangeHolderPuntaA(val)}
                      allowEmpty={false}
                      size="sm"
                      className="w-full"
                      portalContainer={dropdownPortalEl}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Conto punta 1</Label>
                    <SearchableSelect
                      id="account-punta-a"
                      placeholder={
                        holderIdPuntaA ? 'Seleziona conto' : 'Seleziona prima un intestatario'
                      }
                      searchPlaceholder="Cerca conto..."
                      options={accountsPuntaA.map((acc) => {
                        const holderName = getHolderName(holders, acc.holderId)
                        const book = books.find((b) => b.id === acc.bookId)
                        return {
                          value: acc.id,
                          label: `${holderName} • ${book?.nome ?? acc.nome}`,
                        }
                      })}
                      value={accountIdPuntaA}
                      onChange={setAccountIdPuntaA}
                      disabled={!holderIdPuntaA || accountsPuntaA.length === 0}
                      allowEmpty={false}
                      size="sm"
                      className="w-full"
                      portalContainer={dropdownPortalEl}
                    />
                    {holderIdPuntaA && accountsPuntaA.length === 0 && (
                      <p className="rounded-md bg-amber-500/10 px-3 py-2 text-xs text-amber-600 dark:text-amber-400">
                        Nessun conto punta disponibile per questo intestatario. Aggiungine uno in
                        Profit Tracker → Conti.
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
                  <Label className="text-xs font-medium uppercase tracking-wide text-primary">
                    Intestatario Punta 2
                  </Label>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Seleziona intestatario</Label>
                    <SearchableSelect
                      id="holder-punta-b"
                      placeholder="Seleziona intestatario"
                      searchPlaceholder="Cerca intestatario..."
                      options={holders
                        .filter((h) => h.stato === 'abilitato')
                        .map((h) => ({ value: h.id, label: h.nome }))}
                      value={holderIdPuntaB}
                      onChange={(val) => void handleChangeHolderPuntaB(val)}
                      allowEmpty={false}
                      size="sm"
                      className="w-full"
                      portalContainer={dropdownPortalEl}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">
                      Conto punta 2 (copertura)
                    </Label>
                    <SearchableSelect
                      id="account-punta-b"
                      placeholder={
                        holderIdPuntaB ? 'Seleziona conto' : 'Seleziona prima un intestatario'
                      }
                      searchPlaceholder="Cerca conto..."
                      options={accountsPuntaB.map((acc) => {
                        const holderName = getHolderName(holders, acc.holderId)
                        const book = books.find((b) => b.id === acc.bookId)
                        return {
                          value: acc.id,
                          label: `${holderName} • ${book?.nome ?? acc.nome}`,
                        }
                      })}
                      value={accountIdPuntaB}
                      onChange={setAccountIdPuntaB}
                      disabled={!holderIdPuntaB || accountsPuntaB.length === 0}
                      allowEmpty={false}
                      size="sm"
                      className="w-full"
                      portalContainer={dropdownPortalEl}
                    />
                    {holderIdPuntaB && accountsPuntaB.length === 0 && (
                      <p className="rounded-md bg-amber-500/10 px-3 py-2 text-xs text-amber-600 dark:text-amber-400">
                        Nessun conto punta disponibile per questo intestatario. Aggiungine uno in
                        Profit Tracker → Conti.
                      </p>
                    )}
                  </div>
                </div>

                {showSummary && (
                  <div className="rounded-md bg-muted/30 p-3 text-xs text-muted-foreground">
                    <p className="font-medium text-foreground">Riepilogo importi</p>
                    <p className="mt-1">
                      Punta 1: <span className="font-mono">{puntataEffettivaA.toFixed(2)} €</span> a
                      quota <span className="font-mono">{quotaANum?.toFixed(2)}</span>
                    </p>
                    <p>
                      Punta 2 (copertura):{' '}
                      <span className="font-mono">{(stakeB ?? 0).toFixed(2)} €</span> a quota{' '}
                      <span className="font-mono">{quotaBNum?.toFixed(2)}</span>.
                    </p>
                    {guadagnoMinimo != null && (
                      <p>
                        Guadagno minimo:{' '}
                        <span className="font-mono">{formatSigned(guadagnoMinimo)} €</span>
                      </p>
                    )}
                  </div>
                )}

                {holderModalError && (
                  <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    {holderModalError}
                  </div>
                )}
              </div>

              <div className="flex flex-col-reverse justify-end gap-2 border-t border-border bg-muted/20 px-6 py-4 sm:flex-row">
                <Button
                  variant="outline"
                  className="sm:min-w-[100px]"
                  onClick={() => setHolderModalOpen(false)}
                  disabled={isSaving}
                >
                  <X className="mr-2 h-4 w-4" />
                  Annulla
                </Button>
                <Button
                  variant="success"
                  className="sm:min-w-[120px]"
                  onClick={() => void handleSendToProfitTracker()}
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
    </div>
  )
}
