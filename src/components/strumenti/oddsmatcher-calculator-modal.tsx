'use client'

import Image from 'next/image'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  layStakeRimborso,
  layStakeWithImbalance,
  liability,
  minGain,
} from '@/lib/calculators/punta-banca'
import type { TipologiaCalcolo } from '@/stores/agenda-store'
import { getAccounts } from '@/services/api/profit-tracker-client'
import type { Account } from '@/types/profit-tracker'
import { useProfitTrackerStore } from '@/stores/profit-tracker-store'
import { VisuallyHidden } from '@radix-ui/react-visually-hidden'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ODDSMATCHER_BOOKS } from '@/lib/oddsmatcher-books'
import type { OddsmatcherRow } from '@/types/oddsmatcher'
import { Calendar, Loader2, Send, X } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

const TIPOLOGIE: TipologiaCalcolo[] = ['NORMALE', 'RIMBORSO (CR%)']

function formatModalDate(date: string, hour: string): string {
  const [y, m, d] = date.split('-')
  return `${d}/${m}/${y} - ${hour}`
}

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

function getBookName(id: string): string {
  return ODDSMATCHER_BOOKS.find((b) => b.id === id)?.name ?? '—'
}

/** Match Oddsmatcher book name (e.g. "Bet365") to Profit Tracker book (e.g. "Bet365.it") */
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

export interface OddsmatcherCalculatorModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  row: OddsmatcherRow | null
}

export function OddsmatcherCalculatorModal({
  open,
  onOpenChange,
  row,
}: OddsmatcherCalculatorModalProps) {
  const books = useProfitTrackerStore((s) => s.books)
  const holders = useProfitTrackerStore((s) => s.holders)
  const fetchBooks = useProfitTrackerStore((s) => s.fetchBooks)
  const fetchHolders = useProfitTrackerStore((s) => s.fetchHolders)
  const saveOngoingBetFromCalculator = useProfitTrackerStore((s) => s.saveOngoingBetFromCalculator)

  const [tipologia, setTipologia] = useState<TipologiaCalcolo>('NORMALE')
  const [commissione, setCommissione] = useState('3')
  const [rimborso, setRimborso] = useState('')
  const [bonus, setBonus] = useState('')
  const [puntata, setPuntata] = useState('')
  const [quotaPunta, setQuotaPunta] = useState('')
  const [quotaBanca, setQuotaBanca] = useState('')
  const [agendaMessage, setAgendaMessage] = useState<string | null>(null)

  const [holderModalOpen, setHolderModalOpen] = useState(false)
  const [accountsPunta, setAccountsPunta] = useState<Account[]>([])
  const [accountsBanca, setAccountsBanca] = useState<Account[]>([])
  const [accountIdPunta, setAccountIdPunta] = useState<string>('')
  const [accountIdBanca, setAccountIdBanca] = useState<string>('')
  const [isSaving, setIsSaving] = useState(false)
  const [holderModalError, setHolderModalError] = useState<string | null>(null)
  const [savedBetId, setSavedBetId] = useState<string | null>(null)
  const wasOpenRef = useRef(false)

  useEffect(() => {
    if (open && row) {
      const back = row.back_odd
      const lay = row.lay_odd
      queueMicrotask(() => {
        setQuotaPunta(back)
        setQuotaBanca(lay)
      })
    }
  }, [open, row])

  useEffect(() => {
    if (wasOpenRef.current && !open) {
      setTipologia('NORMALE')
      setCommissione('3')
      setRimborso('')
      setBonus('')
      setPuntata('')
      setQuotaPunta('')
      setQuotaBanca('')
      setAgendaMessage(null)
      setAccountIdPunta('')
      setAccountIdBanca('')
      setHolderModalOpen(false)
    }
    wasOpenRef.current = open
  }, [open])

  const bookNamePunta = row ? getBookName(row.id_book_1) : ''
  const bookNameBanca = row ? getBookName(row.id_book_2) : ''

  const loadHolderOptions = useCallback(async () => {
    if (!row) return
    if (holders.length === 0) {
      await fetchHolders()
    }
    let resolvedBooks = books
    if (resolvedBooks.length === 0) {
      await fetchBooks()
      resolvedBooks = useProfitTrackerStore.getState().books
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
    setAccountIdPunta('')
    setAccountIdBanca('')
    setHolderModalError(null)
    setSavedBetId(null)
  }, [row, bookNamePunta, bookNameBanca, books, fetchBooks, holders.length, fetchHolders])

  useEffect(() => {
    if (holderModalOpen && row) {
      void loadHolderOptions()
    }
  }, [holderModalOpen, row, loadHolderOptions])

  const puntataNum = parseNum(puntata)
  const bonusNum = parseNum(bonus) ?? 0
  const rimborsoNum = parseNum(rimborso) ?? 0
  const puntataEffettiva = (puntataNum ?? 0) + bonusNum
  const quotaPuntaNum = parseNum(quotaPunta)
  const commissioneNum = parseNum(commissione) ?? 0
  const quotaBancaNum = parseNum(quotaBanca)

  const layStakeValue = useMemo(() => {
    if (tipologia === 'RIMBORSO (CR%)') {
      if (puntataNum == null || puntataNum <= 0 || quotaPuntaNum == null || quotaBancaNum == null)
        return null
      return layStakeRimborso(puntataNum, quotaPuntaNum, rimborsoNum, quotaBancaNum, commissioneNum)
    }
    if (quotaPuntaNum == null || quotaBancaNum == null) return null
    if (tipologia === 'NORMALE' && bonusNum > 0) {
      const backStakeTotale = (puntataNum ?? 0) + bonusNum
      if (backStakeTotale <= 0) return null
      return layStakeWithImbalance(backStakeTotale, quotaPuntaNum, quotaBancaNum, commissioneNum, 0)
    }
    // NORMALE senza bonus: bancata sulla sola puntata
    if (puntataNum == null || puntataNum <= 0) return null
    return layStakeWithImbalance(puntataNum, quotaPuntaNum, quotaBancaNum, commissioneNum, 0)
  }, [tipologia, puntataNum, bonusNum, rimborsoNum, quotaPuntaNum, quotaBancaNum, commissioneNum])

  /** Bancata arrotondata a 2 decimali: usata per responsabilità e totali tabella PROFITTI (come nel calcolatore di riferimento). */
  const layStakeRounded = useMemo(() => {
    if (layStakeValue == null || !Number.isFinite(layStakeValue)) return null
    return Math.round(layStakeValue * 100) / 100
  }, [layStakeValue])

  const responsabilita = useMemo(() => {
    if (layStakeRounded == null || quotaBancaNum == null) return null
    return liability(layStakeRounded, quotaBancaNum)
  }, [layStakeRounded, quotaBancaNum])

  const effectiveExchangeProfit = useMemo(() => {
    if (layStakeValue == null) return null
    return layStakeValue * (1 - commissioneNum / 100)
  }, [layStakeValue, commissioneNum])

  /** Profitto exchange arrotondato a 2 decimali (per totali tabella: "se vinci la bancata" = -puntata + questo). */
  const effectiveExchangeProfitRounded = useMemo(() => {
    if (layStakeRounded == null) return null
    const raw = layStakeRounded * (1 - commissioneNum / 100)
    return Math.round(raw * 100) / 100
  }, [layStakeRounded, commissioneNum])

  const baseMinGain = useMemo(() => {
    if (puntataNum == null || puntataNum <= 0 || quotaPuntaNum == null || responsabilita == null)
      return null
    return minGain(puntataNum, quotaPuntaNum, responsabilita)
  }, [puntataNum, quotaPuntaNum, responsabilita])

  const totalSeVinciPuntata = useMemo(() => {
    if (tipologia === 'RIMBORSO (CR%)') {
      if (puntataNum == null || quotaPuntaNum == null || responsabilita == null) return null
      return puntataNum * (quotaPuntaNum - 1) - responsabilita
    }
    if (responsabilita == null || quotaPuntaNum == null) return null
    if (tipologia === 'NORMALE' && bonusNum > 0) {
      const ritorno = ((puntataNum ?? 0) + bonusNum) * quotaPuntaNum
      return ritorno - (puntataNum ?? 0) - responsabilita
    }
    if (baseMinGain == null) return null
    return baseMinGain
  }, [tipologia, puntataNum, quotaPuntaNum, responsabilita, baseMinGain, bonusNum])

  const totalSeVinciBancata = useMemo(() => {
    if (tipologia === 'RIMBORSO (CR%)') {
      if (effectiveExchangeProfit == null) return null
      return -(puntataNum ?? 0) + effectiveExchangeProfit + rimborsoNum
    }
    const profit = effectiveExchangeProfitRounded ?? effectiveExchangeProfit
    if (profit == null) return null
    if (tipologia === 'NORMALE' && bonusNum > 0) {
      return -(puntataNum ?? 0) + profit
    }
    return -(puntataNum ?? 0) + profit
  }, [
    tipologia,
    puntataNum,
    bonusNum,
    rimborsoNum,
    effectiveExchangeProfit,
    effectiveExchangeProfitRounded,
  ])

  const guadagnoMinimo = useMemo(() => {
    if (totalSeVinciPuntata == null || totalSeVinciBancata == null) return null
    const v = Math.min(totalSeVinciPuntata, totalSeVinciBancata)
    return Number.isFinite(v) ? v : null
  }, [totalSeVinciPuntata, totalSeVinciBancata])

  const ratingSeVinciPuntata = useMemo(() => {
    if (puntataEffettiva <= 0 || totalSeVinciPuntata == null) return null
    const num = totalSeVinciPuntata + (puntataNum ?? 0)
    const pct = (num / puntataEffettiva) * 100
    return Number.isFinite(pct) ? pct : null
  }, [puntataEffettiva, totalSeVinciPuntata, puntataNum])

  const ratingSeVinciBancata = useMemo(() => {
    if (puntataEffettiva <= 0 || layStakeValue == null) return null
    const exchangeProfit = layStakeValue * (1 - commissioneNum / 100)
    const pct = (exchangeProfit / puntataEffettiva) * 100
    return Number.isFinite(pct) ? pct : null
  }, [puntataEffettiva, layStakeValue, commissioneNum])

  const showSummary =
    tipologia === 'RIMBORSO (CR%)'
      ? puntataNum != null &&
        puntataNum > 0 &&
        quotaPuntaNum != null &&
        quotaBancaNum != null &&
        layStakeValue != null &&
        responsabilita != null
      : puntataEffettiva > 0 &&
        quotaPuntaNum != null &&
        quotaBancaNum != null &&
        layStakeValue != null &&
        responsabilita != null

  const handleOpenHolderModal = () => {
    setHolderModalOpen(true)
  }

  const eventoDataIso =
    row && row.date && row.hour
      ? new Date(`${row.date}T${row.hour.replace('.', ':')}:00`).toISOString()
      : new Date().toISOString()
  const eventoNome = row ? `${row.home} vs ${row.away}` : ''
  const competizione = row?.competition ?? ''
  const mercato = row?.market ?? row?.selection ?? ''

  const tipoBonus = tipologia === 'RIMBORSO (CR%)' ? 'rimborso' : 'none'

  const handleSendToProfitTracker = async () => {
    if (!row || !accountIdPunta || !accountIdBanca) return
    if (
      puntataEffettiva <= 0 ||
      quotaPuntaNum == null ||
      quotaBancaNum == null ||
      layStakeValue == null ||
      responsabilita == null ||
      guadagnoMinimo == null
    ) {
      return
    }
    setIsSaving(true)
    setHolderModalError(null)
    try {
      const betPayload = {
        eventoData: eventoDataIso,
        sport: 'calcio' as const,
        eventoNome,
        modalitaSaldo: 'reale' as const,
        accountId: accountIdPunta,
        tag: undefined as string | undefined,
        nota: undefined as string | undefined,
      }
      const legsPayload = [
        {
          eventoData: eventoDataIso,
          sport: 'calcio',
          eventoNome,
          competizione,
          mercato,
          metodo: 'punta' as const,
          tipoBonus,
          accountId: accountIdPunta,
          stake: puntataEffettiva,
          quota: quotaPuntaNum,
          rischio: 0,
          bonusValore: undefined,
          rimborsoValore: tipologia === 'RIMBORSO (CR%)' ? rimborsoNum : undefined,
          commissionePercentuale: commissioneNum,
          movimento: guadagnoMinimo,
          statoEvento: 'in_corso',
          tag: undefined as string | undefined,
        },
        {
          eventoData: eventoDataIso,
          sport: 'calcio',
          eventoNome,
          competizione,
          mercato,
          metodo: 'banca' as const,
          tipoBonus,
          accountId: accountIdBanca,
          stake: layStakeValue,
          quota: quotaBancaNum,
          rischio: responsabilita,
          bonusValore: undefined,
          rimborsoValore: undefined,
          commissionePercentuale: commissioneNum,
          movimento: guadagnoMinimo,
          statoEvento: 'in_corso',
          tag: undefined as string | undefined,
        },
      ]
      const bet = await saveOngoingBetFromCalculator(betPayload, legsPayload)
      if (process.env.NODE_ENV !== 'production') {
        await new Promise((r) => setTimeout(r, 1000))
      }
      setSavedBetId(bet.id)
      setAgendaMessage('Giocata salvata nel Profit Tracker.')
      setTimeout(() => setAgendaMessage(null), 3000)
    } catch (err) {
      setHolderModalError(err instanceof Error ? err.message : 'Errore nel salvataggio')
    } finally {
      setIsSaving(false)
    }
  }

  if (!row) return null

  const bookName = getBookName(row.id_book_1)
  const exchangeName = getBookName(row.id_book_2)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto p-0" showClose={true}>
        <DialogTitle asChild>
          <VisuallyHidden>Calcolatore Punta-Banca</VisuallyHidden>
        </DialogTitle>

        <div className="flex flex-col">
          {/* Evento: barra compatta e leggibile */}
          <div className="border-b border-border bg-muted/30 px-5 py-3">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
              <span className="rounded bg-muted px-2 py-0.5 font-medium text-foreground">
                {row.competition}
              </span>
              <span className="font-medium text-foreground">
                {row.home} <span className="text-muted-foreground">vs</span> {row.away}
              </span>
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <Calendar className="h-3.5 w-3.5 shrink-0" />
                {formatModalDate(row.date, row.hour)}
              </span>
            </div>
          </div>

          <div className="space-y-5 p-5">
            {/* Tipo: segment control + commissione — labels allineati sulla stessa riga */}
            <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-[1fr_auto] sm:items-start">
              <div className="flex flex-col gap-2">
                <span className="block h-5 text-xs font-medium uppercase leading-5 tracking-wide text-muted-foreground">
                  Tipo calcolo
                </span>
                <div className="flex rounded-lg border border-border bg-muted/20 p-0.5">
                  {TIPOLOGIE.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTipologia(t)}
                      className={cn(
                        'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                        tipologia === t
                          ? 'bg-background text-foreground shadow-sm'
                          : 'text-muted-foreground hover:text-foreground',
                      )}
                    >
                      {t === 'RIMBORSO (CR%)' ? 'Rimborso' : t}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <label
                  htmlFor="modal-commissione"
                  className="block h-5 text-xs font-medium uppercase leading-5 tracking-wide text-muted-foreground"
                >
                  Commissione
                </label>
                <div className="flex flex-wrap items-center gap-3">
                  {tipologia === 'RIMBORSO (CR%)' && (
                    <div className="flex items-center gap-2">
                      <Label htmlFor="modal-rimborso" className="text-sm text-muted-foreground">
                        € rimborso
                      </Label>
                      <Input
                        id="modal-rimborso"
                        type="number"
                        inputMode="decimal"
                        placeholder="0"
                        value={rimborso}
                        onChange={(e) => setRimborso(e.target.value)}
                        className="h-8 w-24"
                      />
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Input
                      id="modal-commissione"
                      type="number"
                      inputMode="decimal"
                      placeholder="3"
                      value={commissione}
                      onChange={(e) => setCommissione(e.target.value)}
                      className="h-8 w-14"
                    />
                    <span className="text-sm text-muted-foreground">%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* PUNTA e BANCA: card con quota in evidenza */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-primary">
                  Punta
                </p>
                <p className="mb-3 text-sm text-muted-foreground">{row.selection}</p>
                <Input
                  type="number"
                  inputMode="decimal"
                  placeholder="0"
                  value={quotaPunta}
                  onChange={(e) => setQuotaPunta(e.target.value)}
                  className="mb-3 h-10 text-lg font-semibold"
                />
                <div className="flex items-center gap-2 rounded-md bg-background/60 px-2 py-1.5">
                  <Image
                    src={`/loghi_book/${row.id_book_1}.png`}
                    alt=""
                    width={80}
                    height={24}
                    className="h-6 w-auto max-w-[80px] object-contain"
                  />
                  <span className="text-xs text-muted-foreground">{bookName}</span>
                </div>
              </div>
              <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4">
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-destructive">
                  Banca
                </p>
                <p className="mb-3 text-sm text-muted-foreground">{row.selection}</p>
                <Input
                  type="number"
                  inputMode="decimal"
                  placeholder="0"
                  value={quotaBanca}
                  onChange={(e) => setQuotaBanca(e.target.value)}
                  className="mb-3 h-10 text-lg font-semibold"
                />
                <div className="flex items-center gap-2 rounded-md bg-background/60 px-2 py-1.5">
                  <Image
                    src={`/loghi_book/${row.id_book_2}.png`}
                    alt=""
                    width={80}
                    height={24}
                    className="h-6 w-auto max-w-[80px] object-contain"
                  />
                  <span className="text-xs text-muted-foreground">{exchangeName}</span>
                </div>
              </div>
            </div>

            {/* Importi e risultati: sezione unica e ordinata */}
            <div className="rounded-xl border border-border bg-muted/10 p-4">
              <p className="mb-4 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Importi e risultati
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="modal-puntata" className="text-sm">
                    Puntata €
                  </Label>
                  <div className="flex items-baseline gap-2">
                    <Input
                      id="modal-puntata"
                      type="number"
                      inputMode="decimal"
                      placeholder="0"
                      value={puntata}
                      onChange={(e) => setPuntata(e.target.value)}
                      className="h-9 w-28"
                    />
                    <span className="text-xs text-muted-foreground">
                      a quota {formatNum(quotaPuntaNum)}
                    </span>
                  </div>
                </div>
                {tipologia === 'NORMALE' && (
                  <div className="space-y-1.5">
                    <Label htmlFor="modal-bonus" className="text-sm">
                      Bonus € (opz.)
                    </Label>
                    <Input
                      id="modal-bonus"
                      type="number"
                      inputMode="decimal"
                      placeholder="0"
                      value={bonus}
                      onChange={(e) => setBonus(e.target.value)}
                      className="h-9 w-24"
                    />
                  </div>
                )}
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-sm">Bancata €</Label>
                  <p className="flex items-baseline gap-2">
                    <span className="font-mono text-base font-semibold text-foreground">
                      {layStakeValue != null ? formatNum(layStakeValue) : '0.00'}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      a quota {formatNum(quotaBancaNum)}
                    </span>
                  </p>
                </div>
                <div className="flex flex-wrap gap-6 sm:gap-8">
                  <div>
                    <p className="text-xs text-muted-foreground">Responsabilità</p>
                    <p className="font-mono text-sm font-semibold">
                      € {responsabilita != null ? formatNum(responsabilita) : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Guadagno minimo</p>
                    <p
                      className={cn(
                        'font-mono text-sm font-semibold',
                        guadagnoMinimo != null && guadagnoMinimo >= 0
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : guadagnoMinimo != null && guadagnoMinimo < 0
                            ? 'text-destructive'
                            : 'text-foreground',
                      )}
                    >
                      € {guadagnoMinimo != null ? formatNum(guadagnoMinimo) : '—'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Tabella PROFITTI */}
            {showSummary && guadagnoMinimo != null && (
              <div className="overflow-hidden rounded-xl border border-border">
                <div className="bg-muted/30 px-4 py-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Profitti
                  </p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/20">
                        <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground" />
                        <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">
                          {bookName}
                        </th>
                        <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">
                          {exchangeName}
                        </th>
                        {tipologia === 'RIMBORSO (CR%)' && (
                          <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">
                            Rimborso
                          </th>
                        )}
                        <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">
                          Totale
                        </th>
                        <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">
                          Rating
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-border/50 bg-primary/5">
                        <td className="px-4 py-2.5 text-muted-foreground">
                          se vinci la puntata su {bookName}
                        </td>
                        <td className="px-4 py-2.5 text-right font-medium text-primary">
                          {formatSigned(
                            tipologia === 'NORMALE' && bonusNum > 0
                              ? ((puntataNum ?? 0) + bonusNum) * (quotaPuntaNum ?? 0) -
                                  (puntataNum ?? 0)
                              : (puntataNum ?? 0) * ((quotaPuntaNum ?? 0) - 1),
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-right font-medium text-destructive">
                          {formatSigned(-(responsabilita ?? 0))}
                        </td>
                        {tipologia === 'RIMBORSO (CR%)' && (
                          <td className="px-4 py-2.5 text-right text-muted-foreground">—</td>
                        )}
                        <td className="px-4 py-2.5 text-right font-semibold">
                          {totalSeVinciPuntata != null ? formatSigned(totalSeVinciPuntata) : '—'} €
                        </td>
                        <td className="px-4 py-2.5 text-right text-muted-foreground">
                          {ratingSeVinciPuntata != null
                            ? `${formatNum(ratingSeVinciPuntata)}%`
                            : '—'}
                        </td>
                      </tr>
                      <tr className="bg-destructive/5">
                        <td className="px-4 py-2.5 text-muted-foreground">
                          se vinci la bancata su {exchangeName}
                        </td>
                        <td className="px-4 py-2.5 text-right font-medium text-destructive">
                          {formatSigned(-(puntataNum ?? 0))}
                        </td>
                        <td className="px-4 py-2.5 text-right font-medium text-primary">
                          {(effectiveExchangeProfitRounded ?? effectiveExchangeProfit) != null
                            ? formatSigned(
                                effectiveExchangeProfitRounded ?? effectiveExchangeProfit ?? 0,
                              )
                            : '—'}
                        </td>
                        {tipologia === 'RIMBORSO (CR%)' && (
                          <td className="px-4 py-2.5 text-right font-medium text-primary">
                            {formatSigned(rimborsoNum)}
                          </td>
                        )}
                        <td className="px-4 py-2.5 text-right font-semibold">
                          {totalSeVinciBancata != null ? formatSigned(totalSeVinciBancata) : '—'} €
                        </td>
                        <td className="px-4 py-2.5 text-right text-muted-foreground">
                          {ratingSeVinciBancata != null
                            ? `${formatNum(ratingSeVinciBancata)}%`
                            : '—'}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Footer: unico bottone full-width */}
            <div className="border-t border-border pt-4">
              <Button
                variant="success"
                className="w-full"
                onClick={handleOpenHolderModal}
                disabled={
                  puntataEffettiva <= 0 ||
                  quotaPuntaNum == null ||
                  quotaBancaNum == null ||
                  layStakeValue == null
                }
              >
                Invia scommessa al Profit Tracker
              </Button>
            </div>
            {agendaMessage && (
              <p className="mt-2 text-sm font-medium text-emerald-600 dark:text-emerald-400">
                {agendaMessage}
              </p>
            )}
          </div>
        </div>
      </DialogContent>

      {/* Sub-modale: Assegna intestatari punta e banca */}
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
                  Scegli l&apos;intestatario per la puntata (book) e per la bancata (exchange).
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Potrai aggiungere altre puntate o bancate dalla pagina dettaglio della giocata.
                </p>
              </div>

              <div className="grid gap-4 px-6 py-5">
                {/* Card Punta */}
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
                  {accountsPunta.length === 0 && bookNamePunta && (
                    <p className="rounded-md bg-amber-500/10 px-3 py-2 text-xs text-amber-600 dark:text-amber-400">
                      Nessun conto con {bookNamePunta}. Aggiungine uno in Profit Tracker → Conti.
                    </p>
                  )}
                </div>

                {/* Card Banca */}
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
                  {accountsBanca.length === 0 && bookNameBanca && (
                    <p className="rounded-md bg-amber-500/10 px-3 py-2 text-xs text-amber-600 dark:text-amber-400">
                      Nessun conto con {bookNameBanca}. Aggiungine uno in Profit Tracker → Conti.
                    </p>
                  )}
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
                  variant="success"
                  className="sm:min-w-[120px]"
                  onClick={handleSendToProfitTracker}
                  disabled={isSaving || !accountIdPunta || !accountIdBanca}
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
    </Dialog>
  )
}
