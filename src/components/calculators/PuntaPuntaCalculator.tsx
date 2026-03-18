'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ChevronDown, Loader2, Send, X } from 'lucide-react'
import { equalProfit, ratingPercent, stakeBFromStakeA } from '@/lib/calculators/punta-punta'
import { useProfitTrackerStore } from '@/stores/profit-tracker-store'
import type { Account } from '@/types/profit-tracker'
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

export function PuntaPuntaCalculator() {
  const allAccounts = useProfitTrackerStore((s) => s.allAccounts)
  const books = useProfitTrackerStore((s) => s.books)
  const holders = useProfitTrackerStore((s) => s.holders)
  const fetchHolders = useProfitTrackerStore((s) => s.fetchHolders)
  const fetchAllAccounts = useProfitTrackerStore((s) => s.fetchAllAccounts)
  const saveOngoingBetFromCalculator = useProfitTrackerStore((s) => s.saveOngoingBetFromCalculator)

  const [tipologia, setTipologia] = useState<(typeof TIPOLOGIE)[number]>('NORMALE')
  const [puntataA, setPuntataA] = useState('100')
  const [quotaA, setQuotaA] = useState('2.3')
  const [quotaB, setQuotaB] = useState('2.5')
  const [bonus, setBonus] = useState('')
  const [holderModalOpen, setHolderModalOpen] = useState(false)
  const [accountIdPuntaA, setAccountIdPuntaA] = useState('')
  const [accountIdPuntaB, setAccountIdPuntaB] = useState('')
  const [eventoData, setEventoData] = useState(() => defaultEventoData())
  const [eventoNome, setEventoNome] = useState('')
  const [mercatoPuntaA, setMercatoPuntaA] = useState('')
  const [mercatoPuntaB, setMercatoPuntaB] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [holderModalError, setHolderModalError] = useState<string | null>(null)
  const [savedBetId, setSavedBetId] = useState<string | null>(null)

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

  const loadAccounts = useCallback(async () => {
    if (holders.length === 0) await fetchHolders()
    await fetchAllAccounts()
  }, [holders.length, fetchHolders, fetchAllAccounts])

  useEffect(() => {
    if (holderModalOpen && !savedBetId) {
      void loadAccounts()
    }
  }, [holderModalOpen, savedBetId, loadAccounts])

  const handleOpenModal = () => {
    setHolderModalError(null)
    setSavedBetId(null)
    setEventoData(defaultEventoData())
    setHolderModalOpen(true)
  }

  const handleSendToProfitTracker = async () => {
    if (!accountIdPuntaA || !accountIdPuntaB) {
      setHolderModalError('Seleziona il conto per entrambe le puntate.')
      return
    }
    if (
      puntataEffettivaA <= 0 ||
      quotaANum == null ||
      quotaBNum == null ||
      stakeB == null ||
      guadagnoMinimo == null
    )
      return
    const eventoDataIso = new Date(eventoData).toISOString()
    const eventoNomeVal = eventoNome.trim() || 'Punta-Punta'
    const competizione = ''
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
      const legsPayload = [
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

  const resolveAccountLabel = (acc: Account) => {
    const book = books.find((b) => b.id === acc.bookId)
    const holder = holders.find((h) => h.id === acc.holderId)
    const bookName = book?.nome ?? ''
    const holderName = holder?.nome ?? acc.nome
    return bookName ? `${bookName} (${holderName})` : holderName
  }

  const realOutlay = (puntataANum ?? 0) + (stakeB ?? 0)
  const profitIfAWins =
    quotaANum != null && stakeB != null ? puntataEffettivaA * quotaANum - realOutlay : null
  const profitIfBWins = stakeB != null && quotaBNum != null ? stakeB * quotaBNum - realOutlay : null
  const returnA = quotaANum != null ? puntataEffettivaA * quotaANum : null
  const returnB = stakeB != null && quotaBNum != null ? stakeB * quotaBNum : null

  return (
    <div className="mx-auto max-w-2xl rounded-lg border border-white/10 bg-white/5 p-0 shadow-xl backdrop-blur-md">
      {/* Barra superiore */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 bg-white/5 px-3 py-2 backdrop-blur-sm">
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
      <div className="border-b border-white/10 bg-primary/5 p-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="puntata-a">Puntata A</Label>
            <div className="flex items-center gap-2">
              <Input
                id="puntata-a"
                type="number"
                inputMode="decimal"
                placeholder="0"
                value={puntataA}
                onChange={(e) => setPuntataA(e.target.value)}
                className="flex-1"
              />
              <span className="text-muted-foreground">€</span>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="quota-a">Quota Punta A</Label>
            <div className="flex items-center gap-2">
              <Input
                id="quota-a"
                type="number"
                inputMode="decimal"
                step="0.01"
                placeholder="0"
                value={quotaA}
                onChange={(e) => setQuotaA(e.target.value)}
                className="flex-1"
              />
              <span className="text-muted-foreground">@</span>
            </div>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="quota-b">Quota Punta B</Label>
            <div className="flex items-center gap-2">
              <Input
                id="quota-b"
                type="number"
                inputMode="decimal"
                step="0.01"
                placeholder="0"
                value={quotaB}
                onChange={(e) => setQuotaB(e.target.value)}
                className="flex-1"
              />
              <span className="text-muted-foreground">@</span>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="bonus">Saldo bonus (opz.)</Label>
            <div className="flex items-center gap-2">
              <Input
                id="bonus"
                type="number"
                inputMode="decimal"
                placeholder="0"
                value={bonus}
                onChange={(e) => setBonus(e.target.value)}
                className="flex-1"
              />
              <span className="text-muted-foreground">€</span>
            </div>
          </div>
        </div>
      </div>

      {/* Riepilogo */}
      {showSummary && (
        <div className="border-b border-white/10 bg-white/5">
          <div className="border-b border-white/10 bg-muted px-4 py-2 text-center text-sm font-medium text-foreground">
            Riepilogo
          </div>
          <div className="space-y-2 p-4 text-sm">
            {rating != null && <p>Rating: {rating.toFixed(2)}%</p>}
            <p>
              Punta{' '}
              <span className="font-medium text-primary">{formatNum(puntataEffettivaA)} €</span>
              {bonusNum > 0 && (
                <span className="text-muted-foreground">
                  {' '}
                  (di cui {formatNum(bonusNum)} € bonus)
                </span>
              )}{' '}
              a quota {formatNum(quotaANum)} sul Book A.
            </p>
            <p>
              Punta <span className="font-medium text-primary">{formatNum(stakeB)} €</span> a quota{' '}
              {formatNum(quotaBNum)} sul Book B.
            </p>
            <p>
              Il guadagno minimo sarà{' '}
              <span className={cn(guadagnoMinimo >= 0 ? 'text-primary' : 'text-destructive')}>
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
          <div className="border-b border-white/10 bg-white/5">
            <div className="border-b border-white/10 bg-muted px-4 py-2 text-center text-sm font-medium text-foreground">
              Tabella dei profitti
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-muted-foreground">
                    <th className="p-3 text-left font-normal"></th>
                    <th className="p-3 text-right font-normal">Book A</th>
                    <th className="p-3 text-right font-normal">Book B</th>
                    <th className="p-3 text-right font-normal">Totale</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-white/10 bg-primary/10">
                    <td className="p-3">Se vinci sul Book A:</td>
                    <td className="p-3 text-right text-primary">
                      {formatSigned(
                        bonusNum > 0 ? returnA - (puntataANum ?? 0) : returnA - puntataEffettivaA,
                      )}
                    </td>
                    <td className="p-3 text-right text-destructive">
                      {formatSigned(-(stakeB ?? 0))}
                    </td>
                    <td className="p-3 text-right">
                      <span
                        className={cn(profitIfAWins >= 0 ? 'text-primary' : 'text-destructive')}
                      >
                        = {formatSigned(profitIfAWins)} €
                      </span>
                    </td>
                  </tr>
                  <tr className="bg-primary/10">
                    <td className="p-3">Se vinci sul Book B:</td>
                    <td className="p-3 text-right text-destructive">
                      {formatSigned(bonusNum > 0 ? -(puntataANum ?? 0) : -puntataEffettivaA)}
                    </td>
                    <td className="p-3 text-right text-primary">
                      {formatSigned((returnB ?? 0) - (stakeB ?? 0))}
                    </td>
                    <td className="p-3 text-right">
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
          if (!open) setSavedBetId(null)
        }}
      >
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
                  Assegna intestatari e dati evento
                </DialogTitle>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  Inserisci i dati dell&apos;evento e scegli il conto per la puntata e per la
                  copertura.
                </p>
              </div>

              <div className="grid gap-4 px-6 py-5">
                <div className="space-y-2">
                  <Label htmlFor="pp-modal-data">Data evento</Label>
                  <Input
                    id="pp-modal-data"
                    type="datetime-local"
                    value={eventoData}
                    onChange={(e) => setEventoData(e.target.value)}
                    className="h-10"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pp-modal-evento">Evento</Label>
                  <Input
                    id="pp-modal-evento"
                    type="text"
                    placeholder="Es. Milan vs Inter"
                    value={eventoNome}
                    onChange={(e) => setEventoNome(e.target.value)}
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
                  <Label className="text-xs font-medium uppercase tracking-wide text-primary">
                    Intestatario Punta 1
                  </Label>
                  <div className="relative">
                    <select
                      value={accountIdPuntaA}
                      onChange={(e) => setAccountIdPuntaA(e.target.value)}
                      className="flex h-10 w-full appearance-none rounded-lg border border-input bg-background pl-3 pr-9 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 [&>option]:bg-background"
                    >
                      <option value="">Seleziona intestatario</option>
                      {allAccounts.map((acc) => (
                        <option key={acc.id} value={acc.id}>
                          {resolveAccountLabel(acc)}
                        </option>
                      ))}
                    </select>
                    <span
                      className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                      aria-hidden
                    >
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
                    </span>
                  </div>
                </div>
                <div className="space-y-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
                  <Label className="text-xs font-medium uppercase tracking-wide text-primary">
                    Intestatario Punta 2 (copertura)
                  </Label>
                  <div className="relative">
                    <select
                      value={accountIdPuntaB}
                      onChange={(e) => setAccountIdPuntaB(e.target.value)}
                      className="flex h-10 w-full appearance-none rounded-lg border border-input bg-background pl-3 pr-9 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 [&>option]:bg-background"
                    >
                      <option value="">Seleziona intestatario</option>
                      {allAccounts.map((acc) => (
                        <option key={acc.id} value={acc.id}>
                          {resolveAccountLabel(acc)}
                        </option>
                      ))}
                    </select>
                    <span
                      className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                      aria-hidden
                    >
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
                    </span>
                  </div>
                </div>
              </div>

              {holderModalError && (
                <div className="mx-6 mb-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2">
                  <p className="text-sm text-destructive">{holderModalError}</p>
                </div>
              )}

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
                  variant="default"
                  className="sm:min-w-[120px]"
                  onClick={handleSendToProfitTracker}
                  disabled={isSaving || !accountIdPuntaA || !accountIdPuntaB}
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                      Salvataggio...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Invia
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
